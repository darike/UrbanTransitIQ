"""API tests: auth, RBAC enforcement (server-side), dashboards, filters, what-if."""

import os
import sys

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from backend.src.main import app  # noqa: E402

client = TestClient(app)


def token_for(user, pwd):
    r = client.post("/api/auth/login", json={"username": user, "password": pwd})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def admin_h():
    return {"Authorization": f"Bearer {token_for('admin', 'admin123')}"}


@pytest.fixture(scope="module")
def analyst_h():
    return {"Authorization": f"Bearer {token_for('analyst', 'analyst123')}"}


def test_health():
    assert client.get("/api/health").json()["status"] == "ok"


def test_login_rejects_bad_password():
    assert client.post("/api/auth/login",
                       json={"username": "admin", "password": "wrong"}).status_code == 401


def test_dashboard_requires_auth():
    assert client.get("/api/dashboards/executive").status_code == 401


def test_executive_kpis(analyst_h):
    r = client.get("/api/dashboards/executive", headers=analyst_h)
    assert r.status_code == 200
    k = r.json()["kpi"]
    assert k["total_passengers"] > 1_000_000
    assert 0 < k["avg_occupancy"] < 150
    assert "insight" in r.json()


def test_filters_change_numbers(analyst_h):
    all_ = client.get("/api/dashboards/executive", headers=analyst_h).json()["kpi"]
    one = client.get("/api/dashboards/executive?route_id=R001",
                     headers=analyst_h).json()["kpi"]
    assert one["total_passengers"] < all_["total_passengers"]


def test_rbac_blocks_non_admin_on_admin_api(analyst_h):
    # direct API call with a non-admin JWT — must be 403, not just hidden in UI
    assert client.get("/api/admin/audit-log", headers=analyst_h).status_code == 403


def test_admin_can_read_audit_log(admin_h):
    assert client.get("/api/admin/audit-log", headers=admin_h).status_code == 200


def test_whatif_is_labelled_estimate(analyst_h):
    r = client.post("/api/whatif/simulate", headers=analyst_h,
                    json={"route_id": "R001", "trips_per_hour": 8,
                          "vehicle_capacity": 85, "demand_change_pct": 10})
    assert r.status_code == 200
    assert r.json()["estimate"] is True


def test_recommendations_carry_evidence(analyst_h):
    r = client.get("/api/recommendations", headers=analyst_h).json()
    assert all(len(rec["evidence"]) >= 2 for rec in r["recommendations"])
