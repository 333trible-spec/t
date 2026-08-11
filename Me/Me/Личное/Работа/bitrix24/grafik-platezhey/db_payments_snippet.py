# Схема и функции хранения графика платежей — извлечено из timereport/db.py.
# Справочно, отдельно не запускается — зависит от get_conn()/get_db() и остальной db.py.

            CREATE TABLE IF NOT EXISTS payment_schedules (
                deal_id     INTEGER PRIMARY KEY,
                kind        TEXT,      -- 'equal' | 'full' | 'custom'
                total       REAL,      -- зафиксированная сумма на момент создания
                advance     REAL,
                count       INTEGER,
                freq_months INTEGER,   -- 1 | 3 | N
                first_date  TEXT,      -- 'YYYY-MM-DD'
                created_at  TEXT,
                updated_at  TEXT
            );

            -- Строки графика: платёж = один стандартный счёт (invoice_id — наш созданный счёт)
            CREATE TABLE IF NOT EXISTS payment_schedule_items (
                deal_id    INTEGER,
                seq        INTEGER,    -- порядковый номер строки (1..N)
                due_date   TEXT,       -- срок оплаты 'YYYY-MM-DD'
                amount     REAL,
                invoice_id INTEGER,    -- id созданного счёта (NULL, пока не создан)
                PRIMARY KEY (deal_id, seq)
            );
        """)

# ──────────────────────────── График платежей ────────────────────────────

def get_payment_schedule(deal_id):
    """Сохранённый график по сделке: {params..., items: [{seq, due_date, amount, invoice_id}]}
    или None, если графика ещё нет."""
    with get_conn() as conn:
        head = conn.execute(
            "SELECT * FROM payment_schedules WHERE deal_id=?", (deal_id,)
        ).fetchone()
        if not head:
            return None
        items = conn.execute(
            "SELECT seq, due_date, amount, invoice_id FROM payment_schedule_items "
            "WHERE deal_id=? ORDER BY seq", (deal_id,)
        ).fetchall()
        result = dict(head)
        result["items"] = [dict(r) for r in items]
        return result


def save_payment_schedule(deal_id, kind, total, items,
                          advance=None, count=None, freq_months=None, first_date=None):
    """Перезаписывает график сделки целиком.
    items: [{seq, due_date, amount, invoice_id}] — invoice_id может быть None."""
    from datetime import datetime
    now = datetime.now().isoformat()
    with get_conn() as conn:
        existing = conn.execute(
            "SELECT created_at FROM payment_schedules WHERE deal_id=?", (deal_id,)
        ).fetchone()
        created_at = existing["created_at"] if existing else now
        conn.execute("""
            INSERT OR REPLACE INTO payment_schedules
                (deal_id, kind, total, advance, count, freq_months, first_date, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (deal_id, kind, total, advance, count, freq_months, first_date, created_at, now))
        conn.execute("DELETE FROM payment_schedule_items WHERE deal_id=?", (deal_id,))
        conn.executemany("""
            INSERT INTO payment_schedule_items (deal_id, seq, due_date, amount, invoice_id)
            VALUES (?, ?, ?, ?, ?)
        """, [(deal_id, it["seq"], it["due_date"], it["amount"], it.get("invoice_id"))
              for it in items])


def get_schedule_invoice_ids(deal_id):
    """Список id счетов, которые создал наш график (не NULL)."""
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT invoice_id FROM payment_schedule_items "
            "WHERE deal_id=? AND invoice_id IS NOT NULL", (deal_id,)
        ).fetchall()
        return [r["invoice_id"] for r in rows]
