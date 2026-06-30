# Operations Analytics Dashboard

End-to-end operations analytics: an ETL/ELT pipeline that ingests an operations
dataset into SQL, transforms it with Python/Pandas, models it into a star schema, and
serves **throughput, cycle-time, and cost** KPIs through an interactive dashboard with
a single repeatable-refresh entry point.

**Stack:** Python · Pandas · SQL (SQLite) · Power BI *(+ a Plotly parity dashboard so the project runs and demos on any OS)*

---

## Architecture

```
Operations dataset (CSV)
      │  EXTRACT      src/generate_data.py   (or drop in a real public CSV)
      ▼
SQLite — stg_orders_raw (raw, untouched)     src/extract_load.py   ← load raw first
      │  TRANSFORM    src/transform.py        (Pandas: clean, type-cast, derive KPIs)
      ▼
SQLite — star schema: fact_orders + dim_date/product/region/facility
      │  KPI VIEWS    sql/kpi_views.sql        (throughput / cycle-time / cost)
      ▼
Dashboard            src/build_dashboard.py → output/dashboard.html   (Plotly)
                     powerbi/ → real Power BI build on the same tables
```

`src/run_pipeline.py` runs all of it as one idempotent refresh.

## Quickstart

```bash
pip install -r requirements.txt
python src/run_pipeline.py          # full refresh; open output/dashboard.html
python src/run_pipeline.py --regen  # regenerate the source dataset first
```

Outputs land in `output/`: `ops.db` (the SQL warehouse) and `dashboard.html`
(the interactive dashboard). Connect Power BI to `output/ops.db` per
`powerbi/POWERBI_SETUP.md`.

## The data

`generate_data.py` produces a realistic **simulated** operations dataset — one row per
work order with created/started/completed timestamps, units, region/facility/priority,
and cost components — and deliberately injects real-world mess (missing completion
times, inconsistent category casing, duplicate rows, negative/zero cost anomalies,
outlier "stuck" orders) so the transform step does genuine cleaning.

> **Using real public data:** drop a CSV at `data/raw/operations_raw.csv` and, if the
> columns differ, adjust `COLUMN_MAP` in `extract_load.py`. Good public fits: the
> Olist Brazilian E-Commerce orders dataset (has purchase/approved/delivered
> timestamps → cycle & lead time, plus price/freight → cost).

## KPI definitions

| KPI | Definition | Notes |
|-----|------------|-------|
| **Throughput** | Completed orders & units per day | Counts completions, not arrivals |
| **Cycle time** | `completed_at − started_at` (active processing) | Reported as **median & P90**, not just mean (right-skewed). Distinct from **lead time** = `completed_at − created_at` |
| **Cost** | `units·unit_cost + labor + shipping`; also cost/unit | Sliced by month & product category |

## Data model (star schema)

- **`fact_orders`** — grain: **one row per work order**. Measures (`units`, costs,
  `cycle_time_h`, `lead_time_h`, `total_cost`) + foreign keys + `is_completed` flag.
- **`dim_date`** (marked date table), **`dim_product`**, **`dim_region`**,
  **`dim_facility`**.

## Repo layout

```
src/generate_data.py   Acquire/simulate the raw dataset (EXTRACT)
src/extract_load.py    Load raw CSV -> SQLite staging (LOAD)
src/transform.py       Pandas clean + derive KPIs + build star schema (TRANSFORM/MODEL)
sql/kpi_views.sql      KPI SQL views (throughput / cycle-time / cost / scorecard)
src/build_dashboard.py Interactive Plotly dashboard (SERVE)
src/run_pipeline.py    One-command repeatable refresh (orchestrator)
powerbi/MEASURES.dax   DAX measures mirroring the SQL views
powerbi/POWERBI_SETUP.md  Step-by-step Power BI build on the same tables
```

## Notes for interview defense

- **ETL vs ELT:** raw is loaded into SQL first, then transformed → leans **ELT**; the
  staging-then-clean pattern is the point either way.
- **Why SQL + Pandas:** SQL is the durable, queryable source of truth; Pandas handles
  flexible row-level cleaning and metric derivation. Right tool per step.
- **Why median for cycle time:** a few stuck orders skew the mean; median/P90 tell the
  truth.
- **Repeatable refresh:** `run_pipeline.py` is idempotent — re-run rebuilds everything
  identically; in production a scheduler (cron / Power BI Gateway) invokes it.

See `../interview-prep/operations-analytics-dashboard.md` for the full Q&A prep.
