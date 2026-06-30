# Interview Prep — Operations Analytics Dashboard

**Stack:** Python · Pandas · SQL · Power BI
**Resume bullet:**
> Built an ETL pipeline ingesting a public operations dataset into SQL and transforming it with Python/Pandas. Designed an interactive Power BI dashboard surfacing throughput, cycle-time, and cost KPIs with a repeatable refresh process.

> ⚠️ **Golden rule:** Only claim what you can defend. Read this whole doc, then decide which specifics you're comfortable saying out loud. If you didn't actually do something here, either go do a quick version of it before the interview or soften the claim. Interviewers probe the *seams* between tools — that's where this guide is densest.

---

## 1. The 30-second pitch (memorize this)

"I built an end-to-end operations analytics solution. I took a public operations dataset, loaded the raw data into a SQL database as my staging layer, then used Python and Pandas to clean and transform it — handling missing values, fixing types, deriving metrics like cycle time. I modeled the cleaned data into fact and dimension tables, and built a Power BI dashboard on top that tracks three things operations leaders care about: throughput, cycle time, and cost. The whole thing has a repeatable refresh, so when new data lands the dashboard updates without me rebuilding anything."

Then **stop talking** and let them pick a thread.

---

## 2. Architecture & data flow (be able to draw this)

```
Public dataset (CSV/API)
        │  EXTRACT  (Python: requests / pd.read_csv)
        ▼
   SQL database — raw / staging table   ← "load raw first, transform later" (ELT-ish)
        │  TRANSFORM (Python + Pandas: clean, type-cast, derive KPIs)
        ▼
   SQL — clean fact + dimension tables (star schema)
        │  REFRESH  (Power BI connects to SQL)
        ▼
   Power BI dashboard — throughput / cycle-time / cost KPIs
```

**Key talking point — why SQL first, then Pandas?**
- SQL is the durable store and single source of truth; raw data is preserved so transforms are reproducible and auditable.
- Pandas is where the flexible, row-level cleaning and metric derivation happens — easier to express in Python than in pure SQL.
- This is technically closer to **ELT** (load raw, then transform) than classic ETL. If asked "is this ETL or ELT?", say: "I loaded raw into SQL first then transformed, so it leans ELT, but the staging-then-clean pattern is the point either way." That answer signals you actually understand the distinction.

---

## 3. KPI definitions — THE most likely deep-dive

If you blank on what your own KPIs mean, the interview is over. Own these cold.

### Throughput
- **Definition:** Number of units/orders/tickets completed per unit of time (per hour/day/week).
- **How computed:** `COUNT` of completed items grouped by time bucket. In Pandas: `df.groupby(df['completed_at'].dt.date).size()`.
- **Why it matters:** Measures capacity and flow — how much work the operation actually clears.
- **Gotcha:** Throughput counts *completions*, not arrivals. Distinguish from **demand/arrival rate**.

### Cycle time
- **Definition:** Elapsed time from when a unit *starts* (or enters the process) to when it's *completed*. `cycle_time = completed_at − started_at`.
- **How computed in Pandas:**
  ```python
  df['cycle_time'] = (df['completed_at'] - df['started_at']).dt.total_seconds() / 3600  # hours
  ```
- **Report it as median/percentiles, not just mean** — cycle time is right-skewed (a few slow outliers drag the average). P50/P90 are more honest. Mention this; it shows analytical maturity.
- **Lead time vs. cycle time (classic trap):** Lead time = customer request → delivery (the whole wait). Cycle time = work-start → work-done (active processing). Know which one you actually measured.

### Cost
- **Definition:** Cost per unit, or total operational cost over a period. Could be cost-per-order, cost-per-unit-throughput, etc.
- **How computed:** Aggregate cost fields (labor, processing, materials) ÷ units, sliced by dimension (region, product, team).
- **Why it matters:** Throughput and speed are worthless if cost runs away. Cost is the efficiency counterweight.

**Tie them together (great closing line):** "These three are intentionally in tension — you can buy throughput by spending more, or cut cost by slowing down. The dashboard lets an ops manager see all three at once so they're not optimizing one at the expense of the others."

---

## 4. ETL / pipeline questions

**Q: Walk me through your pipeline step by step.**
1. **Extract** — pulled the public dataset (CSV download / API call) using Python (`requests`, `pd.read_csv`).
2. **Load raw** — wrote it untouched into a SQL staging table (`to_sql` / bulk insert) so I always have the original.
3. **Transform** — Pandas: dropped/handled nulls, cast types (dates, numerics), deduped, standardized categories, derived cycle time and other metrics.
4. **Model** — split into a fact table (one row per event/order with measures) and dimension tables (date, product, region, etc.) — a star schema.
5. **Serve** — Power BI connects to the clean tables and visualizes.

**Q: What does "repeatable refresh" actually mean?**
"The pipeline is a script I can re-run on new data without manual edits — it's idempotent. Extract → load → transform runs the same way every time, and Power BI's refresh re-pulls from the updated SQL tables. So a refresh is: run the script, hit refresh in Power BI." *(If you used Power BI scheduled refresh / a gateway, say so. If it was manual, say "manual but scripted, and the next step would be scheduling it via a Power BI Gateway or a cron job.")*

**Q: How do you handle the pipeline failing / bad data?**
- Validation checks after load (row counts, null thresholds, type checks).
- Raw layer is preserved, so I can re-run transforms without re-extracting.
- Log what was dropped/changed so transformations are auditable.

**Q: Incremental vs. full refresh?**
"This was a full refresh given the dataset size. For larger/production data I'd move to incremental — only pull rows newer than the last load watermark — to cut refresh time and DB load." *(Strong, forward-looking answer.)*

---

## 5. SQL questions

**Q: Why use SQL at all if you're transforming in Pandas?**
Durable storage, a queryable source of truth, handles data bigger than memory, lets Power BI connect directly, and SQL is better than Pandas for set-based joins/aggregations at scale.

**Q: What does your schema look like?**
Star schema: a central **fact** table (grain = one row per order/event, with measures like cost and timestamps + foreign keys) and **dimension** tables (date, product, region/team). Be ready to name the grain — "what does one row represent?" is the #1 data-modeling question.

**Q: Write a query for daily throughput.**
```sql
SELECT CAST(completed_at AS DATE) AS day,
       COUNT(*) AS throughput
FROM   fact_orders
WHERE  status = 'completed'
GROUP  BY CAST(completed_at AS DATE)
ORDER  BY day;
```

**Q: Average cycle time by region.**
```sql
SELECT d.region,
       AVG(DATEDIFF(HOUR, f.started_at, f.completed_at)) AS avg_cycle_hours
FROM   fact_orders f
JOIN   dim_region d ON f.region_id = d.region_id
WHERE  f.completed_at IS NOT NULL
GROUP  BY d.region;
```
Be ready to discuss: `JOIN` types (INNER vs LEFT), `GROUP BY`, `WHERE` vs `HAVING`, window functions (`ROW_NUMBER`, running totals), and indexing the columns you filter/join on.

**Q: WHERE vs HAVING?** WHERE filters rows before aggregation; HAVING filters after (on aggregates).

---

## 6. Python / Pandas questions

**Q: What cleaning did you do?**
- Missing values: drop vs. fill depending on column importance.
- Type casting: `pd.to_datetime`, `pd.to_numeric(errors='coerce')`.
- Dedup: `df.drop_duplicates()`.
- Standardize categories (trim, lowercase, map variants).
- Derive metrics (cycle time).

**Q: Show me deriving and aggregating a metric.**
```python
df['started_at']   = pd.to_datetime(df['started_at'])
df['completed_at'] = pd.to_datetime(df['completed_at'])
df['cycle_time_h'] = (df['completed_at'] - df['started_at']).dt.total_seconds() / 3600

# throughput per day
daily = df[df['status'] == 'completed'].groupby(df['completed_at'].dt.date).size()

# median cycle time by region
cyc = df.groupby('region')['cycle_time_h'].median()
```

**Q: Key Pandas concepts to know:** `groupby` + agg, `merge` (and how it maps to SQL joins), `apply` vs vectorized ops (prefer vectorized for speed), handling NaN, `to_sql`/`read_sql`.

**Q: Why Pandas over doing it all in SQL?** Faster to iterate on messy data, richer datetime/string handling, easy to express row-level derivations. For pure heavy aggregation, SQL wins — it's about the right tool per step.

---

## 7. Power BI questions

**Q: Walk me through the dashboard.**
"Top row: three KPI cards — throughput, median cycle time, cost — with trend vs. prior period. Below: a time-series of throughput, a distribution/box of cycle time, and cost broken down by dimension. Slicers for date range, region, and product so a manager can drill into a problem area."

**Q: Power BI concepts to be ready for:**
- **Data model / relationships** — fact-to-dimension relationships (one-to-many), star schema in the model view.
- **DAX measures** — e.g. throughput count, average cycle time, cost. Know a basic measure:
  ```DAX
  Throughput = CALCULATE(COUNTROWS(fact_orders), fact_orders[status] = "completed")
  Avg Cycle Time = AVERAGE(fact_orders[cycle_time_h])
  ```
- **Measures vs. calculated columns** — measures compute at query time in the filter context (use for aggregations); calculated columns compute per-row at refresh (use sparingly). Common interview question.
- **Power Query (M)** — where transforms can happen inside Power BI; you can say you did heavy lifting in Pandas and light shaping in Power Query.
- **Refresh** — DirectQuery (live) vs. Import (cached, faster). You likely used **Import** with scheduled/manual refresh. A **Gateway** is needed for scheduled refresh against an on-prem/local SQL source.
- **Slicers, drill-through, tooltips** — interactivity features.

**Q: DirectQuery vs Import?** Import caches data in Power BI (fast, needs refresh); DirectQuery queries the source live (always current, slower, pushes load to DB). You chose Import for performance.

---

## 8. Challenges & lessons (have 2–3 ready — interviewers love these)

1. **Messy timestamps / missing completion times** → some rows had nulls or bad formats; I coerced types and decided per-column whether to drop or impute, and documented it. *Lesson:* validate assumptions about the data before trusting any metric.
2. **Cycle-time outliers skewing the average** → switched the headline metric to median/P90 so a few stuck orders didn't distort the picture. *Lesson:* pick the statistic that tells the truth, not just the easy one.
3. **Making refresh repeatable** → first version had manual cleanup steps; I scripted the whole transform so a refresh is one re-run. *Lesson:* automate the boring path early.

---

## 9. STAR story (behavioral — "tell me about a project")

- **S (Situation):** I wanted to demonstrate end-to-end analytics skills, so I took a public operations dataset and built a full pipeline-to-dashboard solution.
- **T (Task):** Turn raw, messy operational data into a self-serve dashboard tracking the KPIs an ops manager actually uses — throughput, cycle time, cost — with a refresh that didn't require rebuilding.
- **A (Action):** Extracted with Python, loaded raw into SQL as a staging layer, cleaned and derived metrics in Pandas, modeled a star schema, and built an interactive Power BI dashboard with DAX measures and slicers. Scripted the transforms so refresh is one re-run.
- **R (Result):** A working dashboard where the three KPIs update on refresh, surfacing where cycle time and cost spike by region/product — exactly the slices an ops lead needs to act.
- **Reflection:** Biggest lesson was that data modeling (the star schema and choosing the right grain) mattered more than any single fancy chart — get the model right and the dashboard almost builds itself.

---

## 10. Rapid-fire likely questions (one-line answers)

- **Where's the data from?** A public operations dataset *(name the actual source — Kaggle/gov portal/etc. Know it!)*.
- **How big was it?** *(Know your rough row count — e.g. "tens of thousands of rows.")*
- **What SQL engine?** *(PostgreSQL / SQL Server / MySQL / SQLite — say which you used.)*
- **How long did it take?** *(Have an honest answer.)*
- **Solo or team?** Solo / personal project. *(Be honest.)*
- **What would you improve?** Scheduled incremental refresh, data-quality tests, alerting on KPI thresholds, CI for the pipeline.
- **Who's the user?** An operations manager who needs to monitor flow and cost without writing SQL.
- **How do you know the numbers are right?** Row-count checks, spot-checking against the raw data, reconciling totals between SQL and Power BI.

---

## 11. Traps & how to dodge them

- **Don't oversell.** If pressed on something you skimmed, say "I used a basic version of that; here's how I'd extend it" — far better than bluffing.
- **Know your grain.** "What does one row in your fact table represent?" — answer instantly.
- **Mean vs. median for cycle time** — bring this up yourself; it scores points.
- **ETL vs ELT** — you load-then-transform, so lean ELT; don't get caught misusing the term.
- **Measures vs calculated columns in Power BI** — know the difference.
- **If you don't know something**, be honest and reason out loud. Interviewers test *how you think*, not just recall.

---

## 12. Pre-interview checklist

- [ ] Fill in the real specifics: dataset name/source, SQL engine, row count, time taken.
- [ ] Re-derive each KPI definition in your own words without notes.
- [ ] Be able to write the throughput + cycle-time-by-region SQL from scratch.
- [ ] Be able to draw the architecture diagram on a whiteboard.
- [ ] Pick your 2 challenge stories and say them out loud once.
- [ ] Open the actual dashboard before the call so visuals are fresh (if you have it).
