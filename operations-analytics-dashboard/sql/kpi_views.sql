-- kpi_views.sql — SQL views for the three headline KPIs.
-- These views are the contract between the warehouse and the BI layer: Power BI
-- (or the Plotly dashboard) reads from them so KPI logic lives in one place.

-- Throughput: completed orders + units, per day.
DROP VIEW IF EXISTS v_throughput_daily;
CREATE VIEW v_throughput_daily AS
SELECT completed_date_key            AS day,
       COUNT(*)                      AS orders_completed,
       SUM(units)                    AS units_completed
FROM   fact_orders
WHERE  is_completed = 1
GROUP  BY completed_date_key;

-- Cycle time: distribution-aware summary per month and region.
-- Mean is reported alongside median because cycle time is right-skewed.
DROP VIEW IF EXISTS v_cycle_time_monthly;
CREATE VIEW v_cycle_time_monthly AS
SELECT substr(completed_date_key, 1, 7) AS year_month,
       region,
       COUNT(*)                         AS n_orders,
       AVG(cycle_time_h)                AS avg_cycle_h,
       MIN(cycle_time_h)                AS min_cycle_h,
       MAX(cycle_time_h)                AS max_cycle_h
FROM   fact_orders
WHERE  is_completed = 1 AND cycle_time_h IS NOT NULL
GROUP  BY year_month, region;

-- Cost: total and per-unit cost per month, sliced by product category.
DROP VIEW IF EXISTS v_cost_monthly;
CREATE VIEW v_cost_monthly AS
SELECT substr(f.completed_date_key, 1, 7) AS year_month,
       p.product_category                 AS category,
       SUM(f.total_cost)                  AS total_cost,
       SUM(f.units)                       AS total_units,
       SUM(f.total_cost) / NULLIF(SUM(f.units), 0) AS cost_per_unit
FROM   fact_orders f
JOIN   dim_product p ON f.product_id = p.product_id
WHERE  f.is_completed = 1
GROUP  BY year_month, category;

-- Headline scorecard: single-row KPI snapshot.
DROP VIEW IF EXISTS v_kpi_scorecard;
CREATE VIEW v_kpi_scorecard AS
SELECT (SELECT COUNT(*) FROM fact_orders WHERE is_completed = 1)            AS total_orders_completed,
       (SELECT SUM(units) FROM fact_orders WHERE is_completed = 1)          AS total_units_completed,
       (SELECT AVG(cycle_time_h) FROM fact_orders WHERE is_completed = 1)   AS avg_cycle_time_h,
       (SELECT SUM(total_cost) FROM fact_orders WHERE is_completed = 1)     AS total_cost,
       (SELECT SUM(total_cost) / NULLIF(SUM(units), 0)
        FROM fact_orders WHERE is_completed = 1)                            AS cost_per_unit;
