"""
generate_data.py — Acquire the raw operations dataset (EXTRACT, source step).

The pipeline is built around a fulfillment/manufacturing operations dataset with
one row per work order: when it was created, when processing started and finished,
how many units, and the cost components.

By default this generates a realistic *simulated* operations dataset so the whole
pipeline runs offline and reproducibly (fixed seed). To use a real public dataset
instead, drop a CSV at data/raw/operations_raw.csv with the same columns (or adapt
the column map in extract_load.py) and skip this step.

Intentional, realistic data-quality issues are injected so the transform step has
genuine cleaning to do:
  - missing completed_at for in-progress / cancelled orders
  - inconsistent category casing and stray whitespace
  - a handful of duplicate rows
  - a few negative/zero cost anomalies
  - some outlier cycle times (stuck orders)
"""
from __future__ import annotations

import os
import numpy as np
import pandas as pd

SEED = 42
N_ORDERS = 25_000
START = pd.Timestamp("2025-01-01")
END = pd.Timestamp("2026-06-15")

RAW_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "raw", "operations_raw.csv")

REGIONS = ["North", "South", "East", "West", "Central"]
FACILITIES = {
    "North": ["NOR-1", "NOR-2"],
    "South": ["SOU-1"],
    "East": ["EAS-1", "EAS-2"],
    "West": ["WES-1"],
    "Central": ["CEN-1", "CEN-2", "CEN-3"],
}
PRODUCTS = [
    # (product_id, name, category, base_unit_cost, base_proc_hours)
    ("P-100", "Standard Widget", "Widgets", 12.0, 6),
    ("P-101", "Premium Widget", "Widgets", 22.0, 9),
    ("P-200", "Gear Assembly", "Assemblies", 48.0, 18),
    ("P-201", "Drive Assembly", "Assemblies", 65.0, 26),
    ("P-300", "Control Module", "Electronics", 90.0, 14),
    ("P-301", "Sensor Pack", "Electronics", 35.0, 8),
    ("P-400", "Bulk Fastener Kit", "Hardware", 6.0, 3),
]
PRIORITIES = ["Low", "Standard", "High", "Rush"]


def generate() -> pd.DataFrame:
    rng = np.random.default_rng(SEED)

    span_hours = int((END - START) / pd.Timedelta(hours=1))
    created = START + pd.to_timedelta(rng.integers(0, span_hours, N_ORDERS), unit="h")

    prod_idx = rng.integers(0, len(PRODUCTS), N_ORDERS)
    region = rng.choice(REGIONS, N_ORDERS, p=[0.22, 0.15, 0.23, 0.15, 0.25])
    priority = rng.choice(PRIORITIES, N_ORDERS, p=[0.25, 0.45, 0.22, 0.08])
    units = rng.integers(1, 60, N_ORDERS)

    rows = []
    for i in range(N_ORDERS):
        pid, pname, pcat, base_cost, base_hours = PRODUCTS[prod_idx[i]]
        fac = rng.choice(FACILITIES[region[i]])

        # Queue wait before processing starts (depends on priority).
        prio_wait = {"Rush": 0.5, "High": 2.0, "Standard": 8.0, "Low": 20.0}[priority[i]]
        queue_h = max(0.0, rng.normal(prio_wait, prio_wait * 0.5))
        started = created[i] + pd.Timedelta(hours=queue_h)

        # Processing time scales with units, with noise and occasional stuck orders.
        proc_h = base_hours * (0.6 + 0.04 * units[i]) * rng.normal(1.0, 0.25)
        proc_h = max(0.5, proc_h)
        if rng.random() < 0.015:  # ~1.5% stuck/outlier orders
            proc_h *= rng.uniform(4, 9)

        # Status: most complete, some in-progress (recent), a few cancelled.
        roll = rng.random()
        completed = started + pd.Timedelta(hours=proc_h)
        if completed > END:
            status, completed = "in_progress", pd.NaT
        elif roll < 0.04:
            status, completed = "cancelled", pd.NaT
        else:
            status = "completed"

        # Costs.
        unit_cost = base_cost * rng.normal(1.0, 0.08)
        labor_cost = proc_h * rng.uniform(18, 28)
        shipping_cost = units[i] * rng.uniform(0.4, 1.2) + rng.uniform(5, 15)

        # Inject messy categories (casing + whitespace) on a fraction of rows.
        cat = pcat
        if rng.random() < 0.10:
            cat = rng.choice([pcat.upper(), pcat.lower(), f"  {pcat} "])

        rows.append({
            "order_id": f"ORD-{i:06d}",
            "product_id": pid,
            "product_name": pname,
            "product_category": cat,
            "region": region[i],
            "facility": fac,
            "priority": priority[i],
            "units": int(units[i]),
            "created_at": created[i].isoformat(),
            "started_at": started.isoformat(),
            "completed_at": completed.isoformat() if completed is not pd.NaT else "",
            "status": status,
            "unit_cost": round(unit_cost, 2),
            "labor_cost": round(labor_cost, 2),
            "shipping_cost": round(shipping_cost, 2),
        })

    df = pd.DataFrame(rows)

    # Inject a few duplicate rows.
    dupes = df.sample(n=120, random_state=SEED)
    df = pd.concat([df, dupes], ignore_index=True)

    # Inject a few cost anomalies (negative / zero) to clean later.
    anomalies = rng.choice(df.index, size=80, replace=False)
    df.loc[anomalies[:40], "labor_cost"] = -1 * df.loc[anomalies[:40], "labor_cost"].abs()
    df.loc[anomalies[40:], "unit_cost"] = 0.0

    # Shuffle so duplicates/anomalies aren't all at the end.
    df = df.sample(frac=1.0, random_state=SEED).reset_index(drop=True)
    return df


def main():
    os.makedirs(os.path.dirname(RAW_PATH), exist_ok=True)
    df = generate()
    df.to_csv(RAW_PATH, index=False)
    print(f"[generate_data] wrote {len(df):,} rows -> {os.path.relpath(RAW_PATH)}")


if __name__ == "__main__":
    main()
