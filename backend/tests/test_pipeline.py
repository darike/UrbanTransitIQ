"""Data-quality + pipeline output tests (run from repo root: pytest backend/tests)."""

import json
import os

import pandas as pd
import pytest

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PQ = os.path.join(ROOT, "parquet_data")
REPORTS = os.path.join(ROOT, "reports")


@pytest.fixture(scope="module")
def dq():
    with open(os.path.join(REPORTS, "data_quality_report.json")) as f:
        return json.load(f)


def test_srs_dataset_minimums():
    with open(os.path.join(REPORTS, "dataset_stats.json")) as f:
        s = json.load(f)
    assert s["tickets"] >= 2_000_000
    assert s["trips"] >= 500_000
    assert s["delays"] >= 250_000
    assert s["routes"] >= 100 and s["stops"] >= 500
    assert s["vehicles"] >= 250 and s["passengers"] >= 50_000


def test_quality_checks_found_planted_defects(dq):
    c = dq["checks"]
    # every planted defect class must be detected (non-zero)
    for key in ["Q1_missing_or_unknown_route_id", "Q2_duplicate_ticket_scans",
                "Q3_duplicate_trips", "Q4_invalid_timestamps",
                "Q5_departure_after_arrival", "Q6_negative_passenger_counts",
                "Q7_unknown_vehicle_ids"]:
        assert c[key] > 0, f"{key} not detected"


def test_overcrowding_kept_not_cleaned(dq):
    assert dq["checks"]["Q8_capacity_violations_kept"] > 10_000
    rules = {r[0]: r for r in dq["cleaning_rules"]}
    assert "KEPT" in rules["R7"][3]


def test_enriched_has_no_duplicate_trips():
    df = pd.read_parquet(os.path.join(PQ, "trips_enriched.parquet"),
                         columns=["trip_id"])
    assert not df["trip_id"].duplicated().any()


def test_route_stats_classification_complete():
    rs = pd.read_parquet(os.path.join(PQ, "route_stats.parquet"))
    assert len(rs) == 100
    assert rs["classification"].notna().all()
    assert {"Overcrowded", "Reliable, Underutilized"} <= set(rs["classification"])


def test_forecast_beats_naive_baseline():
    with open(os.path.join(REPORTS, "model_metrics.json")) as f:
        m = json.load(f)["demand_forecast"]
    assert m["model"]["MAE"] < m["naive_seasonal_baseline"]["MAE"], \
        "SRS: forecaster must outperform the documented naive baseline"


def test_dual_pipeline_comparison_has_120_cases():
    with open(os.path.join(REPORTS, "dual_pipeline_comparison.json")) as f:
        c = json.load(f)
    assert c["summary"]["cases"] >= 100
    assert 0 < c["summary"]["agreement_pct"] <= 100
