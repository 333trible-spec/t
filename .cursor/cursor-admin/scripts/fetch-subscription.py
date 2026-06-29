#!/usr/bin/env python3
"""Читает подписку Cursor: локальный state.vscdb + api2.cursor.sh (без сохранения токена)."""

from __future__ import annotations

import json
import os
import sqlite3
import sys
import urllib.error
import urllib.request
from datetime import date, datetime, timedelta
from pathlib import Path

API_BASE = "https://api2.cursor.sh"
PLAN_LABELS = {
    "free": "Hobby (Free)",
    "pro": "Pro",
    "pro_plus": "Pro+",
    "ultra": "Ultra",
    "enterprise": "Enterprise",
    "free_trial": "Pro Trial",
}
STATUS_LABELS = {
    "active": "активна",
    "canceled": "отменена",
    "past_due": "просрочена",
    "trialing": "пробный период",
    "unpaid": "не оплачена",
}


def state_db_path() -> Path:
    appdata = os.environ.get("APPDATA")
    if not appdata:
        raise FileNotFoundError("APPDATA не найден (нужен Windows или задайте путь вручную)")
    return Path(appdata) / "Cursor" / "User" / "globalStorage" / "state.vscdb"


def read_storage_keys(db: Path) -> dict[str, str]:
    if not db.is_file():
        raise FileNotFoundError(f"База Cursor не найдена: {db}")

    conn = sqlite3.connect(f"file:{db}?mode=ro", uri=True)
    try:
        cur = conn.cursor()
        keys = (
            "cursorAuth/accessToken",
            "cursorAuth/stripeMembershipType",
            "cursorAuth/stripeSubscriptionStatus",
            "cursorAuth/cachedEmail",
        )
        placeholders = ",".join("?" for _ in keys)
        cur.execute(
            f"SELECT key, value FROM ItemTable WHERE key IN ({placeholders})",
            keys,
        )
        return {row[0]: row[1] for row in cur.fetchall()}
    finally:
        conn.close()


def api_get(path: str, token: str) -> dict | None:
    req = urllib.request.Request(
        f"{API_BASE}{path}",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method="GET",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        return {"_error": f"HTTP {e.code}", "_path": path}
    except Exception as e:  # noqa: BLE001
        return {"_error": str(e), "_path": path}


def end_of_month(d: date) -> date:
    if d.month == 12:
        return date(d.year, 12, 31)
    return date(d.year, d.month + 1, 1) - timedelta(days=1)


def parse_period_end(profile: dict, usage: dict | None) -> str | None:
    for key in (
        "currentPeriodEnd",
        "periodEnd",
        "billingCycleEnd",
        "subscriptionEnd",
        "trialEnd",
    ):
        val = profile.get(key)
        if val:
            return str(val)

    start = (usage or {}).get("startOfMonth")
    if start:
        try:
            if "T" in start:
                start_d = datetime.fromisoformat(start.replace("Z", "+00:00")).date()
            else:
                start_d = date.fromisoformat(start[:10])
            end_d = end_of_month(start_d)
            return end_d.isoformat()
        except ValueError:
            pass
    return None


def days_until(iso_date: str | None) -> int | None:
    if not iso_date:
        return None
    try:
        if "T" in iso_date:
            end = datetime.fromisoformat(iso_date.replace("Z", "+00:00")).date()
        else:
            end = date.fromisoformat(iso_date[:10])
        return (end - date.today()).days
    except ValueError:
        return None


def build_result(storage: dict[str, str]) -> dict:
    membership = storage.get("cursorAuth/stripeMembershipType", "unknown")
    status = storage.get("cursorAuth/stripeSubscriptionStatus", "unknown")
    email = storage.get("cursorAuth/cachedEmail", "")
    token = storage.get("cursorAuth/accessToken", "")

    result: dict = {
        "fetchedAt": datetime.now().isoformat(timespec="seconds"),
        "source": "local_db",
        "email": email,
        "membershipType": membership,
        "planLabel": PLAN_LABELS.get(membership, membership),
        "subscriptionStatus": status,
        "statusLabel": STATUS_LABELS.get(status, status),
        "isActive": status == "active" and membership not in ("free",),
    }

    if token:
        profile = api_get("/auth/full_stripe_profile", token)
        usage = api_get("/auth/usage", token)

        if profile and "_error" not in profile:
            result["source"] = "local_db+api"
            result["membershipType"] = profile.get("membershipType", membership)
            result["planLabel"] = PLAN_LABELS.get(result["membershipType"], result["membershipType"])
            result["subscriptionStatus"] = profile.get("subscriptionStatus", status)
            result["statusLabel"] = STATUS_LABELS.get(result["subscriptionStatus"], result["subscriptionStatus"])
            result["isActive"] = result["subscriptionStatus"] == "active" and result["membershipType"] not in ("free",)
            result["isTeamMember"] = profile.get("isTeamMember", False)
            result["isOnStudentPlan"] = profile.get("isOnStudentPlan", False)
            result["lastPaymentFailed"] = profile.get("lastPaymentFailed", False)
            period_end = parse_period_end(profile, usage if usage and "_error" not in usage else None)
            result["periodEnd"] = period_end
            result["daysUntilPeriodEnd"] = days_until(period_end)
            # без чувствительных полей
            result["profileFields"] = sorted(k for k in profile if k not in ("paymentId",))

        if usage and "_error" not in usage:
            gpt4 = usage.get("gpt-4") or usage.get("gpt-4o") or {}
            result["usage"] = {
                "startOfMonth": usage.get("startOfMonth"),
                "fastRequestsUsed": gpt4.get("numRequests"),
                "fastRequestsLimit": gpt4.get("maxRequestUsage"),
            }
            if result.get("fastRequestsUsed") is not None and result["usage"].get("fastRequestsLimit"):
                lim = result["usage"]["fastRequestsLimit"]
                used = result["usage"]["fastRequestsUsed"] or 0
                result["usage"]["fastRequestsRemaining"] = max(0, lim - used)

        if profile and "_error" in profile:
            result["apiError"] = profile["_error"]
    else:
        result["warning"] = "Нет accessToken — войдите в Cursor. Данные только из локального кэша."

    return result


def main() -> int:
    script_dir = Path(__file__).resolve().parent
    out_path = script_dir.parent / "subscription.json"

    try:
        storage = read_storage_keys(state_db_path())
        result = build_result(storage)
        out_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0
    except FileNotFoundError as e:
        err = {"error": str(e), "fetchedAt": datetime.now().isoformat(timespec="seconds")}
        out_path.write_text(json.dumps(err, ensure_ascii=False, indent=2), encoding="utf-8")
        print(json.dumps(err, ensure_ascii=False, indent=2), file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
