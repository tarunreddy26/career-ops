"""
transform.py — TRANSFORM + MODEL.

Reads the raw staging table, cleans it with Pandas, derives operational metrics
(cycle time, total cost), and models the result into a star schema written back to
SQLite:

  fact_orders   — grain: ONE ROW PER WORK ORDER. Measures + foreign keys.
  dim_date      — calendar attributes for the completion date.
  dim_product   — product / category attributes.
  dim_region    — region attributes.
  dim_facility  — facility attributes.

Every cleaning decision is logged and the row-level impact is printed as a small
data-quality report so the transformation is auditable.
"""
from __future__ import annotations

import os
import sqlite3
import numpy as np
import pandas as pd

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "output", "ops.db")


def log(msg: str):
    print(f"[transform] {msg}")


def clean(df: pd.DataFrame) -> pd.DataFrame:
    n0 = len(df)

    # 1. Drop exact duplicate rows.
    df = df.drop_duplicates()
    log(f"dropped {n0 - len(df):,} duplicate rows")

    # 2. Type casting. Coerce bad values to NaN/NaT rather than crashing.
    for col in ("created_at", "started_at", "completed_at"):
        df[col] = pd.to_datetime(df[col].replace("", np.nan), errors="coerce")
    for col in ("units", "unit_cost", "labor_cost", "shipping_cost"):
        df[col] = pd.to_numeric(df[col], errors="coerce")

    # 3. Standardize categorical text (trim + title-case the messy category field).
    df["product_category"] = df["product_category"].str.strip().str.title()
    df["status"] = df["status"].str.strip().str.lower()

    # 4. Fix cost anomalies: negatives -> absolute value, zero unit_cost -> NaN then
    #    backfill from the product's median (a defensible, documented choice).
    neg = (df["labor_cost"] < 0).sum()
    df["labor_cost"] = df["labor_cost"].abs()
    log(f"corrected {neg:,} negative labor_cost values (took absolute value)")

    zero_uc = (df["unit_cost"] == 0).sum()
    df.loc[df["unit_cost"] == 0, "unit_cost"] = np.nan
    prod_median = df.groupby("product_id")["unit_cost"].transform("median")
    df["unit_cost"] = df["unit_cost"].fillna(prod_median)
    log(f"imputed {zero_uc:,} zero unit_cost values from per-product median")

    # 5. Derive metrics.
    #    cycle_time_h: started -> completed (active processing time).
    #    lead_time_h:  created -> completed (total time the order was in the system).
    df["cycle_time_h"] = (df["completed_at"] - df["started_at"]).dt.total_seconds() / 3600
    df["lead_time_h"] = (df["completed_at"] - df["created_at"]).dt.total_seconds() / 3600
    df["total_cost"] = df["units"] * df["unit_cost"] + df["labor_cost"] + df["shipping_cost"]

    # 6. Guard against impossible cycle times (completed before started).
    bad = (df["cycle_time_h"] < 0).sum()
    df.loc[df["cycle_time_h"] < 0, ["cycle_time_h", "lead_time_h"]] = np.nan
    if bad:
        log(f"nulled {bad:,} rows with completed_at before started_at")

    # 7. is_completed flag — throughput & cycle-time KPIs use completed orders only.
    df["is_completed"] = (df["status"] == "completed") & df["completed_at"].notna()

    log(f"clean dataset: {len(df):,} rows, {df['is_completed'].sum():,} completed")
    return df


def build_dimensions(df: pd.DataFrame):
    dim_product = (
        df[["product_id", "product_name", "product_category"]]
        .drop_duplicates()
        .sort_values("product_id")
        .reset_index(drop=True)
    )
    dim_region = (
        pd.DataFrame({"region": sorted(df["region"].dropna().unique())})
        .reset_index(drop=True)
    )
    dim_facility = (
        df[["facility", "region"]].drop_duplicates().sort_values("facility").reset_index(drop=True)
    )

    # dim_date over the span of completion dates.
    completed = df["completed_at"].dropna()
    dim_date = pd.DataFrame()
    if not completed.empty:
        dates = pd.date_range(completed.min().normalize(), completed.max().normalize(), freq="D")
        dim_date = pd.DataFrame({"date": dates})
        dim_date["date_key"] = dim_date["date"].dt.strftime("%Y-%m-%d")
        dim_date["year"] = dim_date["date"].dt.year
        dim_date["quarter"] = "Q" + dim_date["date"].dt.quarter.astype(str)
        dim_date["month"] = dim_date["date"].dt.month
        dim_date["month_name"] = dim_date["date"].dt.strftime("%b")
        dim_date["year_month"] = dim_date["date"].dt.strftime("%Y-%m")
        dim_date["day_of_week"] = dim_date["date"].dt.strftime("%a")
        dim_date["is_weekend"] = dim_date["date"].dt.dayofweek >= 5
        dim_date["date"] = dim_date["date"].dt.strftime("%Y-%m-%d")

    return dim_product, dim_region, dim_facility, dim_date


def build_fact(df: pd.DataFrame) -> pd.DataFrame:
    fact = df.copy()
    fact["completed_date_key"] = fact["completed_at"].dt.strftime("%Y-%m-%d")
    cols = [
        "order_id", "product_id", "region", "facility", "priority", "status",
        "units", "unit_cost", "labor_cost", "shipping_cost", "total_cost",
        "created_at", "started_at", "completed_at", "completed_date_key",
        "cycle_time_h", "lead_time_h", "is_completed",
    ]
    fact = fact[cols]
    # Serialize timestamps as ISO strings for SQLite.
    for c in ("created_at", "started_at", "completed_at"):
        fact[c] = fact[c].dt.strftime("%Y-%m-%d %H:%M:%S")
    fact["is_completed"] = fact["is_completed"].astype(int)
    return fact


def main():
    con = sqlite3.connect(DB_PATH)
    try:
        raw = pd.read_sql("SELECT * FROM stg_orders_raw", con)
        log(f"read {len(raw):,} raw rows from staging")

        clean_df = clean(raw)
        dim_product, dim_region, dim_facility, dim_date = build_dimensions(clean_df)
        fact = build_fact(clean_df)

        fact.to_sql("fact_orders", con, if_exists="replace", index=False)
        dim_product.to_sql("dim_product", con, if_exists="replace", index=False)
        dim_region.to_sql("dim_region", con, if_exists="replace", index=False)
        dim_facility.to_sql("dim_facility", con, if_exists="replace", index=False)
        dim_date.to_sql("dim_date", con, if_exists="replace", index=False)

        # Helpful indexes for join/filter performance.
        cur = con.cursor()
        cur.execute("CREATE INDEX IF NOT EXISTS ix_fact_date ON fact_orders(completed_date_key)")
        cur.execute("CREATE INDEX IF NOT EXISTS ix_fact_region ON fact_orders(region)")
        cur.execute("CREATE INDEX IF NOT EXISTS ix_fact_product ON fact_orders(product_id)")
        con.commit()

        log(f"wrote star schema: fact_orders({len(fact):,}), "
            f"dim_product({len(dim_product)}), dim_region({len(dim_region)}), "
            f"dim_facility({len(dim_facility)}), dim_date({len(dim_date)})")
    finally:
        con.close()


if __name__ == "__main__":
    main()
