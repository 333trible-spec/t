# Роуты /schedule* — извлечено из timereport/app.py (строки 519-611).
# Справочно, отдельно не запускается — зависит от app, payments, _is_admin() и т.п. из app.py.

# ──────────────────────────── График платежей ────────────────────────────

@app.route("/schedule")
def schedule_page():
    """Страница-вкладка «График платежей» в карточке сделки."""
    deal_id = request.values.get("deal")
    if not deal_id:
        raw = request.values.get("placement_options") or request.values.get("PLACEMENT_OPTIONS")
        if raw:
            try:
                deal_id = str(json.loads(raw).get("ID") or "")
            except (ValueError, TypeError):
                deal_id = ""
    with open(os.path.join(app.static_folder, "schedule.html"), encoding="utf-8") as f:
        html = f.read()
    inject = f"<script>window.DEAL_ID={json.dumps(deal_id or '')};</script>"
    return html.replace("</head>", inject + "</head>", 1)


@app.route("/api/schedule")
def schedule_get():
    """Текущий график сделки + сумма сделки + флаги оплаты."""
    deal_id = request.args.get("deal")
    if not deal_id or not deal_id.isdigit():
        return jsonify({"ok": False, "error": "Не указан id сделки (?deal=850)"}), 400
    try:
        return jsonify({"ok": True, **payments.get_state(int(deal_id))})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/schedule/preview", methods=["POST"])
def schedule_preview():
    """Что будет создано/изменено/удалено — без записи (для подтверждения)."""
    data = request.get_json(silent=True) or {}
    deal_id = data.get("deal")
    rows = data.get("rows") or []
    if not deal_id:
        return jsonify({"ok": False, "error": "Не указан deal"}), 400
    err = payments.validate_rows(rows, data.get("total"))
    if err:
        return jsonify({"ok": False, "error": err}), 400
    try:
        return jsonify({"ok": True, **payments.preview_schedule(int(deal_id), rows)})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/schedule/apply", methods=["POST"])
def schedule_apply():
    """Создать/обновить/удалить счета по графику и сохранить снимок."""
    if not _is_admin():
        return jsonify({"ok": False, "error": "Недостаточно прав"}), 403
    data = request.get_json(silent=True) or {}
    deal_id = data.get("deal")
    rows = data.get("rows") or []
    total = data.get("total")
    if not deal_id:
        return jsonify({"ok": False, "error": "Не указан deal"}), 400
    err = payments.validate_rows(rows, total)
    if err:
        return jsonify({"ok": False, "error": err}), 400
    params = {
        "advance": data.get("advance"),
        "count": data.get("count"),
        "freq_months": data.get("freq_months"),
        "first_date": data.get("first_date"),
    }
    try:
        res = payments.apply_schedule(int(deal_id), data.get("kind") or "custom",
                                      round(float(total), 2), rows, params)
        return jsonify({"ok": True, **res})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/schedule/document", methods=["POST"])
def schedule_document():
    """Сформировать документ «График платежей» и прикрепить к сделке."""
    if not _is_admin():
        return jsonify({"ok": False, "error": "Недостаточно прав"}), 403
    data = request.get_json(silent=True) or {}
    deal_id = data.get("deal")
    rows = data.get("rows") or []
    total = data.get("total")
    if not deal_id:
        return jsonify({"ok": False, "error": "Не указан deal"}), 400
    try:
        res = payments.generate_document(int(deal_id), rows, round(float(total or 0), 2))
        return jsonify({"ok": True, **res})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500

