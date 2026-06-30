"""
extract_load.py — EXTRACT + LOAD RAW.

Reads the raw operations CSV and loads it untouched into a SQLite staging table
(stg_orders_raw). Loading raw-first means the original data is always preserved and
the transform step is fully reproducible (re-runnable against the same source).

Swapping in a real public dataset: point RAW_PATH at your CSV and, if its columns
differ, adjust COLUMN_MAP below.
"""
from __future__ import annotations

import os
import sqlite3
import pandas as pd

RAW_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "raw", "operations_raw.csv")
DB_PATH = os.path.join(os.path.dirname(__file__), "..", "output", "ops.db")

# Map source CSV columns -> canonical staging columns. Identity by default.
COLUMN_MAP = {
    "order_id": "order_id",
    "product_id": "product_id",
    "product_name": "product_name",
    "product_category": "product_category",
    "region": "region",
    "facility": "facility",
    "priority": "priority",
    "units": "units",
    "created_at": "created_at",
    "started_at": "started_at",
    "completed_at": "completed_at",
    "status": "status",
    "unit_cost": "unit_cost",
    "labor_cost": "labor_cost",
    "shipping_cost": "shipping_cost",
}


def main():
    if not os.path.exists(RAW_PATH):
        raise FileNotFoundError(
            f"Raw dataset not found at {RAW_PATH}. Run generate_data.py first "
            f"or drop a real public dataset there."
        )

    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

    # Read everything as strings — staging is a faithful copy of the source.
    df = pd.read_csv(RAW_PATH, dtype=str, keep_default_na=False)
    df = df.rename(columns=COLUMN_MAP)

    con = sqlite3.connect(DB_PATH)
    try:
        df.to_sql("stg_orders_raw", con, if_exists="replace", index=False)
        n = con.execute("SELECT COUNT(*) FROM stg_orders_raw").fetchone()[0]
    finally:
        con.close()

    print(f"[extract_load] loaded {n:,} raw rows -> stg_orders_raw in {os.path.relpath(DB_PATH)}")


if __name__ == "__main__":
    main()
