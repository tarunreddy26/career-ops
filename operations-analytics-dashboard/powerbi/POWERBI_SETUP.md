# Power BI build — step by step

A `.pbix` file is a Windows-only binary and can't be authored on Linux, so this
project ships the warehouse + a Plotly parity dashboard, and this guide to rebuild
the **real Power BI dashboard** on the same data in ~20 minutes. The KPI logic is
identical because Power BI reads the same `fact_orders` / `dim_*` tables and the
`MEASURES.dax` mirror the SQL views.

## 1. Get the data into Power BI

You have two equally valid options — pick one and be able to explain it:

**Option A — connect to the SQLite warehouse (recommended, mirrors production):**
1. Install the SQLite ODBC driver (http://www.ch-werner.de/sqliteodbc/).
2. Power BI Desktop → **Get Data → ODBC** → point it at `output/ops.db`.
3. Import these tables: `fact_orders`, `dim_product`, `dim_region`, `dim_facility`, `dim_date`.
4. Use **Import** mode (cached, fast) rather than DirectQuery for this dataset size.

**Option B — load the CSV the pipeline produces:**
1. Add an export step (or `pandas.to_csv`) for `fact_orders` and the dims, or just
   load `data/raw/operations_raw.csv` and replicate the transforms in **Power Query**.
2. Prefer Option A so the heavy cleaning stays in the documented Python step.

## 2. Model (star schema)

In **Model view**, create relationships (one-to-many, single direction, dim → fact):
- `dim_product[product_id]` → `fact_orders[product_id]`
- `dim_region[region]` → `fact_orders[region]`
- `dim_facility[facility]` → `fact_orders[facility]`
- `dim_date[date]` → `fact_orders[completed_date_key]`

Mark **`dim_date` as a date table** (Table tools → Mark as date table → `date`). This
enables the time-intelligence measures (`DATESINPERIOD`, `DATEADD`).

## 3. Measures

Modeling → **New measure**, paste each block from `MEASURES.dax`. Key ones:
`Orders Completed`, `Median Cycle Time (h)`, `P90 Cycle Time (h)`, `Total Cost`,
`Cost per Unit`, `Orders MoM %`.

## 4. Build the page (mirrors the Plotly layout)

- **KPI cards (top row):** Card visuals for `Orders Completed`, `Units Completed`,
  `Median Cycle Time (h)`, `Total Cost`, `Cost per Unit`. Add `Orders MoM %` as a
  trend indicator.
- **Throughput:** Line chart — axis `dim_date[date]`, value `Orders Completed`.
- **Cycle time:** Line chart — axis `dim_date[year_month]`, values
  `Median Cycle Time (h)` and `P90 Cycle Time (h)`.
- **Cost:** Clustered column/line — axis `year_month`, legend `dim_product[product_category]`,
  value `Cost per Unit`.
- **Distribution:** Histogram (or binned column) of `fact_orders[cycle_time_h]`.
- **Slicers:** `dim_date[date]` (range), `dim_region[region]`, `dim_product[product_category]`.
- Wire **drill-through** on region so a manager can click a region and see its detail.

## 5. Repeatable refresh

- **Manual:** re-run `python src/run_pipeline.py` to rebuild `ops.db`, then **Refresh**
  in Power BI.
- **Scheduled (production):** publish to the Power BI Service and configure an
  **On-premises Data Gateway** pointing at the SQL source, with a daily refresh
  schedule. For larger data, switch `fact_orders` to **incremental refresh** keyed on
  `completed_at` so only new rows reload.

## Interview soundbite

> "I kept the heavy transformation in Python/SQL and used Power BI purely as the
> semantic + visual layer — relationships, DAX measures, and visuals. That keeps KPI
> logic in one auditable place and makes the refresh a single re-run plus a Power BI
> refresh."
