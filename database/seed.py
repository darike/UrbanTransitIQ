"""Create tables and seed the four demo accounts + model registry.

Run:  python database/seed.py   (from the repo root)
"""

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import bcrypt

from database.models import (Base, ModelRegistry, SessionLocal, User, engine)


def hash_pw(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()

ACCOUNTS = [
    ("admin", "admin123", "Administrator"),
    ("operator", "operator123", "Operator"),
    ("analyst", "analyst123", "Analyst"),
    ("evaluator", "evaluator123", "Evaluator"),
]


def main():
    Base.metadata.create_all(engine)
    db = SessionLocal()
    try:
        if not db.query(User).count():
            for u, p, r in ACCOUNTS:
                db.add(User(username=u, password_hash=hash_pw(p), role=r,
                            email=f"{u}@urbantransit.iq",
                            display_name=u.capitalize(),
                            email_verified=True))   # demo accounts pre-verified
            print(f"[seed] {len(ACCOUNTS)} users created")

        mm_path = "reports/model_metrics.json"
        if os.path.exists(mm_path) and not db.query(ModelRegistry).count():
            with open(mm_path) as f:
                mm = json.load(f)
            clf = mm["delay_severity_classifier"]["algorithms_compared"]["XGBoost"]
            db.add_all([
                ModelRegistry(name="delay_severity_xgb", version="xgb_v1.0",
                              metric_name="test_accuracy", metric_value=str(clf["test_accuracy"]),
                              path="models/delay_severity_xgb.joblib"),
                ModelRegistry(name="delay_severity_rf", version="rf_v1.0",
                              metric_name="test_accuracy",
                              metric_value=str(mm["delay_severity_classifier"]["algorithms_compared"]["RandomForest"]["test_accuracy"]),
                              path="models/delay_severity_rf.joblib"),
                ModelRegistry(name="demand_forecast_xgb", version="forecast_v1.0",
                              metric_name="MAPE_pct",
                              metric_value=str(mm["demand_forecast"]["model"]["MAPE_pct"]),
                              path="models/demand_forecast_xgb.joblib"),
                ModelRegistry(name="crowding_risk_xgb", version="crowd_v1.0",
                              metric_name="test_auc",
                              metric_value=str(mm["crowding_risk"]["test_auc"]),
                              path="models/crowding_risk_xgb.joblib"),
            ])
            print("[seed] model registry populated from reports/model_metrics.json")
        db.commit()
    finally:
        db.close()
    print("[seed] done")


if __name__ == "__main__":
    main()
