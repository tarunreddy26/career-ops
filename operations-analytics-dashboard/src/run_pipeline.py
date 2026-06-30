"""
run_pipeline.py — Orchestrates the full ETL + dashboard as one repeatable refresh.

This is the "repeatable refresh process": a single idempotent entry point. Re-running
it rebuilds everything from the raw source — extract/load, transform, KPI views, and
the dashboard — producing the same result every time. In production this would be the
script a scheduler (cron / Power BI Gateway / Airflow) invokes.

Usage:
    python src/run_pipeline.py            # full refresh (regenerates data if missing)
    python src/run_pipeline.py --regen    # force-regenerate the raw dataset first
"""
from __future__ import annotations

import os
import sqlite3
import sys
import time

import generate_data
import extract_load
import transform
import build_dashboard

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "output", "ops.db")
VIEWS_SQL = os.path.join(os.path.dirname(__file__), "..", "sql", "kpi_views.sql")
RAW_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "raw", "operations_raw.csv")


def apply_views():
    with open(VIEWS_SQL) as f:
        script = f.read()
    con = sqlite3.connect(DB_PATH)
    try:
        con.executescript(script)
        con.commit()
        views = con.execute(
            "SELECT name FROM sqlite_master WHERE type='view' ORDER BY name"
        ).fetchall()
    finally:
        con.close()
    print(f"[run_pipeline] created KPI views: {', '.join(v[0] for v in views)}")


def main():
    t0 = time.time()
    regen = "--regen" in sys.argv

    print("=" * 64)
    print("Operations Analytics Dashboard — full refresh")
    print("=" * 64)

    if regen or not os.path.exists(RAW_PATH):
        generate_data.main()       # EXTRACT (source)
    else:
        print(f"[run_pipeline] using existing raw dataset ({os.path.relpath(RAW_PATH)})")

    extract_load.main()            # LOAD raw -> SQLite staging
    transform.main()               # TRANSFORM + MODEL (star schema)
    apply_views()                  # KPI SQL views
    build_dashboard.main()         # SERVE (interactive dashboard)

    print("-" * 64)
    print(f"Refresh complete in {time.time() - t0:.1f}s. "
          f"Open output/dashboard.html or connect Power BI to output/ops.db.")


if __name__ == "__main__":
    main()
