"""
build_dashboard.py — SERVE (interactive dashboard).

Power BI .pbix files can't be authored on Linux, so this builds an equivalent
self-contained interactive dashboard with Plotly (output/dashboard.html) that
mirrors the Power BI layout: a KPI scorecard row + throughput, cycle-time, and
cost visuals. The real Power BI build is documented in powerbi/POWERBI_SETUP.md
and uses the same SQL views, so the two stay in sync.

Median cycle time (the honest headline statistic for a right-skewed metric) is
computed here in Pandas, since SQLite has no native percentile function.
"""
from __future__ import annotations

import os
import sqlite3
import numpy as np
import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import plotly.io as pio

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "output", "ops.db")
OUT_PATH = os.path.join(os.path.dirname(__file__), "..", "output", "dashboard.html")

ACCENT = "#2E5BFF"
PALETTE = ["#2E5BFF", "#00C2A8", "#FF8A00", "#8E44AD", "#E74C3C"]


def fmt(n, money=False):
    if n is None or (isinstance(n, float) and np.isnan(n)):
        return "—"
    if money:
        return f"${n:,.0f}"
    return f"{n:,.0f}"


def main():
    con = sqlite3.connect(DB_PATH)
    try:
        scorecard = pd.read_sql("SELECT * FROM v_kpi_scorecard", con).iloc[0]
        thru = pd.read_sql("SELECT * FROM v_throughput_daily ORDER BY day", con)
        cost = pd.read_sql("SELECT * FROM v_cost_monthly ORDER BY year_month", con)
        fact = pd.read_sql(
            "SELECT region, completed_date_key, cycle_time_h "
            "FROM fact_orders WHERE is_completed = 1 AND cycle_time_h IS NOT NULL", con
        )
    finally:
        con.close()

    thru["day"] = pd.to_datetime(thru["day"])
    thru_7d = thru.set_index("day")["orders_completed"].rolling(7, min_periods=1).mean()

    fact["year_month"] = fact["completed_date_key"].str.slice(0, 7)
    median_overall = fact["cycle_time_h"].median()
    p90_overall = fact["cycle_time_h"].quantile(0.90)
    cyc_median = (
        fact.groupby("year_month")["cycle_time_h"]
        .agg(median="median", p90=lambda s: s.quantile(0.90))
        .reset_index()
    )

    # ---- Build figure: 2 rows x 2 cols of charts under a KPI header. ----
    fig = make_subplots(
        rows=2, cols=2,
        subplot_titles=(
            "Throughput — orders completed per day (7-day avg)",
            "Cycle time — monthly median vs. P90 (hours)",
            "Cost per unit by month & category ($)",
            "Cycle-time distribution (hours, completed orders)",
        ),
        vertical_spacing=0.14, horizontal_spacing=0.09,
    )

    # Throughput
    fig.add_trace(go.Scatter(
        x=thru["day"], y=thru["orders_completed"], mode="lines",
        line=dict(color="#C8D2F0", width=1), name="Daily", showlegend=False,
    ), row=1, col=1)
    fig.add_trace(go.Scatter(
        x=thru_7d.index, y=thru_7d.values, mode="lines",
        line=dict(color=ACCENT, width=2.5), name="7-day avg", showlegend=False,
    ), row=1, col=1)

    # Cycle time median vs p90
    fig.add_trace(go.Scatter(
        x=cyc_median["year_month"], y=cyc_median["median"], mode="lines+markers",
        line=dict(color="#00C2A8", width=2.5), name="Median", showlegend=True,
    ), row=1, col=2)
    fig.add_trace(go.Scatter(
        x=cyc_median["year_month"], y=cyc_median["p90"], mode="lines+markers",
        line=dict(color="#FF8A00", width=2, dash="dot"), name="P90", showlegend=True,
    ), row=1, col=2)

    # Cost per unit by category (one line per category)
    for i, (cat, g) in enumerate(cost.groupby("category")):
        fig.add_trace(go.Scatter(
            x=g["year_month"], y=g["cost_per_unit"], mode="lines",
            line=dict(color=PALETTE[i % len(PALETTE)], width=2), name=cat, showlegend=True,
        ), row=2, col=1)

    # Cycle-time distribution (clip extreme tail for readability)
    clip = fact["cycle_time_h"].quantile(0.99)
    fig.add_trace(go.Histogram(
        x=fact.loc[fact["cycle_time_h"] <= clip, "cycle_time_h"],
        marker_color=ACCENT, nbinsx=50, showlegend=False,
    ), row=2, col=2)

    fig.update_layout(
        template="plotly_white",
        font=dict(family="Segoe UI, Helvetica, Arial", size=12, color="#2B2F36"),
        legend=dict(orientation="h", yanchor="bottom", y=-0.08, xanchor="center", x=0.5),
        margin=dict(t=70, l=60, r=40, b=60),
        height=820,
    )

    chart_html = pio.to_html(fig, full_html=False, include_plotlyjs="cdn",
                             config={"displayModeBar": False})

    cards = [
        ("Orders Completed", fmt(scorecard["total_orders_completed"])),
        ("Units Completed", fmt(scorecard["total_units_completed"])),
        ("Avg Cycle Time", f"{scorecard['avg_cycle_time_h']:.1f} h"),
        ("Median Cycle Time", f"{median_overall:.1f} h"),
        ("P90 Cycle Time", f"{p90_overall:.1f} h"),
        ("Total Cost", fmt(scorecard["total_cost"], money=True)),
        ("Cost / Unit", f"${scorecard['cost_per_unit']:.2f}"),
    ]
    card_html = "".join(
        f'<div class="card"><div class="card-label">{label}</div>'
        f'<div class="card-value">{value}</div></div>'
        for label, value in cards
    )

    page = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Operations Analytics Dashboard</title>
<style>
  body {{ margin:0; background:#F4F6FB; font-family:'Segoe UI',Helvetica,Arial,sans-serif; color:#2B2F36; }}
  .wrap {{ max-width:1180px; margin:0 auto; padding:28px 24px 48px; }}
  header h1 {{ margin:0 0 2px; font-size:24px; }}
  header p {{ margin:0 0 22px; color:#6B7280; font-size:14px; }}
  .cards {{ display:grid; grid-template-columns:repeat(7,1fr); gap:12px; margin-bottom:22px; }}
  .card {{ background:#fff; border:1px solid #E6E9F0; border-radius:10px; padding:14px 12px;
           box-shadow:0 1px 2px rgba(16,24,40,.04); }}
  .card-label {{ font-size:11px; text-transform:uppercase; letter-spacing:.04em; color:#8A90A0; }}
  .card-value {{ font-size:20px; font-weight:600; margin-top:6px; color:#1A2233; }}
  .panel {{ background:#fff; border:1px solid #E6E9F0; border-radius:12px; padding:10px 8px; }}
  @media (max-width:900px) {{ .cards {{ grid-template-columns:repeat(2,1fr); }} }}
</style></head>
<body><div class="wrap">
  <header>
    <h1>Operations Analytics Dashboard</h1>
    <p>Throughput · Cycle time · Cost — completed work orders. Built with Python · Pandas · SQL · Plotly (Power BI parity build in /powerbi).</p>
  </header>
  <div class="cards">{card_html}</div>
  <div class="panel">{chart_html}</div>
</div></body></html>"""

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w") as f:
        f.write(page)
    print(f"[build_dashboard] wrote dashboard -> {os.path.relpath(OUT_PATH)}")


if __name__ == "__main__":
    main()
