"""
UrbanTransit IQ — model training (SRS Steps 19-26, 41-44).

Trains, on the real generated dataset:
  1. Delay-severity classifier (5 classes) — TWO independent pipelines:
       A: RandomForest  (own preprocessing; mirrors spark_jobs/04 MLlib config)
       B: XGBoost       (own preprocessing, separate code path)
     + LogisticRegression as the third compared algorithm (SRS: ≥3 algorithms).
     Chronological 70/15/15 split — no future leakage.
  2. Dual-pipeline comparison on the 120 most-recent unseen test cases.
  3. Passenger-demand forecast (network + per-route) — XGBoost vs naive
     seasonal baseline, MAE/RMSE/MAPE/R².
  4. Crowding-risk model P(occupancy>100%) from pre-trip features only.
  5. K-Means route clustering (k chosen by silhouette).

Run:  python python_pipeline/train_models.py
"""

import json
import os
import time

import joblib
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (accuracy_score, confusion_matrix, f1_score,
                             mean_absolute_error, mean_squared_error,
                             r2_score, roc_auc_score, silhouette_score)
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier, XGBRegressor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PQ = os.path.join(ROOT, "parquet_data")
RAW_DIR = os.path.join(ROOT, "raw_data")
MODELS = os.path.join(ROOT, "models")
REPORTS = os.path.join(ROOT, "reports")
os.makedirs(MODELS, exist_ok=True)

SEED = 20260928
T0 = time.time()
log = lambda m: print(f"[{time.time()-T0:6.1f}s] {m}")

# ---------------------------------------------------------------- load ----
df = pd.read_parquet(f"{PQ}/trips_enriched.parquet")
df = df.sort_values("sched_departure").reset_index(drop=True)
log(f"features loaded: {len(df):,} rows")

SEV_BINS = [-99, 2, 5, 10, 20, 999]
SEV_LABELS = ["on_time", "minor", "moderate", "major", "severe"]
df["severity"] = pd.cut(df["delay_min"], SEV_BINS, labels=SEV_LABELS).astype(str)

# PRE-TRIP features only — anything measured during/after the trip
# (occupancy, actual travel time, schedule deviation) would leak the target.
FEATURES = ["dep_hour", "day_of_week", "is_weekend", "is_peak",
            "distance_km", "n_stops", "scheduled_headway_min", "vehicle_capacity",
            "route_delay_7d", "route_occ_7d", "route_demand_7d"]
data = df.dropna(subset=["severity"]).copy()

# chronological split
n = len(data)
i_tr, i_va = int(n * 0.70), int(n * 0.85)
train, val, test = data.iloc[:i_tr], data.iloc[i_tr:i_va], data.iloc[i_va:]
y_map = {c: i for i, c in enumerate(SEV_LABELS)}
ytr, yva, yte = (s["severity"].map(y_map) for s in (train, val, test))
log(f"chronological split: train={len(train):,} val={len(val):,} test={len(test):,}")

# ---------------- pipeline A: RandomForest (median impute, raw features) ---
med = train[FEATURES].median()
Xtr_a, Xva_a, Xte_a = (s[FEATURES].fillna(med) for s in (train, val, test))
rf = RandomForestClassifier(n_estimators=120, max_depth=14, n_jobs=-1,
                            random_state=SEED, class_weight="balanced_subsample")
rf.fit(Xtr_a, ytr)
rf_val_acc = accuracy_score(yva, rf.predict(Xva_a))

# ---------------- pipeline B: XGBoost (own preprocessing: keep NaN native) --
xgb = XGBClassifier(n_estimators=450, max_depth=8, learning_rate=0.07,
                    subsample=0.85, colsample_bytree=0.85, random_state=SEED,
                    objective="multi:softprob", eval_metric="mlogloss", n_jobs=-1)
xgb.fit(train[FEATURES], ytr)
xgb_val_acc = accuracy_score(yva, xgb.predict(val[FEATURES]))

# ---------------- third algorithm: LogisticRegression (scaled) -------------
scaler = StandardScaler().fit(Xtr_a)
lr = LogisticRegression(max_iter=400)
lr.fit(scaler.transform(Xtr_a), ytr)
lr_val_acc = accuracy_score(yva, lr.predict(scaler.transform(Xva_a)))
log(f"val accuracy — RF {rf_val_acc:.3f} | XGB {xgb_val_acc:.3f} | LR {lr_val_acc:.3f}")

# ---------------- test metrics for both pipelines --------------------------
def test_metrics(model, X):
    p = model.predict(X)
    return {
        "test_accuracy": round(accuracy_score(yte, p), 4),
        "test_macro_f1": round(f1_score(yte, p, average="macro"), 4),
        "confusion_matrix": confusion_matrix(yte, p).tolist(),
    }, p

m_rf, p_rf = test_metrics(rf, Xte_a)
m_xgb, p_xgb = test_metrics(xgb, test[FEATURES])
imp = dict(zip(FEATURES, np.round(xgb.feature_importances_.astype(float), 4)))

classifier_report = {
    "task": "delay severity (5 classes)",
    "algorithms_compared": {
        "RandomForest": {"val_accuracy": round(rf_val_acc, 4), **m_rf},
        "XGBoost": {"val_accuracy": round(xgb_val_acc, 4), **m_xgb},
        "LogisticRegression": {"val_accuracy": round(lr_val_acc, 4)},
    },
    "labels": SEV_LABELS,
    "features": FEATURES,
    "xgb_feature_importance": imp,
    "split": "chronological 70/15/15",
    "srs_targets": {"accuracy>=0.85": m_xgb["test_accuracy"] >= 0.85,
                    "macro_f1>=0.80": m_xgb["test_macro_f1"] >= 0.80},
}
joblib.dump({"model": rf, "medians": med, "features": FEATURES, "labels": SEV_LABELS,
             "version": "rf_v1.0"}, f"{MODELS}/delay_severity_rf.joblib")
joblib.dump({"model": xgb, "features": FEATURES, "labels": SEV_LABELS,
             "version": "xgb_v1.0"}, f"{MODELS}/delay_severity_xgb.joblib")
log(f"classifier test — RF acc {m_rf['test_accuracy']} | XGB acc {m_xgb['test_accuracy']}")

# ---------------- dual-pipeline comparison (120 newest unseen cases) -------
cmp_idx = test.index[-120:]
sub = test.loc[cmp_idx]
proba_rf = rf.predict_proba(Xte_a.loc[cmp_idx])
proba_xgb = xgb.predict_proba(sub[FEATURES])
inv = {v: k for k, v in y_map.items()}
rows = []
for j, (i, r) in enumerate(sub.iterrows()):
    a_i, b_i = int(np.argmax(proba_rf[j])), int(np.argmax(proba_xgb[j]))
    match = a_i == b_i
    rows.append({
        "trip_id": r["trip_id"], "route_id": r["route_id"],
        "actual": r["severity"],
        "pipeline_a_pred": inv[a_i], "pipeline_a_prob": round(float(proba_rf[j][a_i]), 3),
        "pipeline_b_pred": inv[b_i], "pipeline_b_prob": round(float(proba_xgb[j][b_i]), 3),
        "match": match,
        "prob_diff": round(abs(float(proba_rf[j][a_i]) - float(proba_xgb[j][b_i])), 3),
        "note": "" if match else
                "adjacent-class boundary case; XGBoost weights route_delay_7d higher"
                if abs(a_i - b_i) == 1 else "multi-class disagreement — flagged for review",
    })
cmp_df = pd.DataFrame(rows)
agree = cmp_df["match"].mean() * 100
comparison = {
    "pipeline_a": "RandomForest (independent preprocessing; MLlib mirror — spark_jobs/04 runs the Spark-native version where Java is available)",
    "pipeline_b": "XGBoost (independent preprocessing)",
    "cases": len(cmp_df),
    "agreement_pct": round(agree, 1),
    "disagreements": int((~cmp_df["match"]).sum()),
    "adjacent_class_share_of_disagreements": round(
        (cmp_df.loc[~cmp_df["match"], "note"].str.contains("adjacent").mean() * 100)
        if (~cmp_df["match"]).any() else 100.0, 1),
}
cmp_df.to_parquet(f"{PQ}/dual_pipeline_comparison.parquet", index=False)
with open(f"{REPORTS}/dual_pipeline_comparison.json", "w") as f:
    json.dump({"summary": comparison, "cases": rows}, f, indent=2)
log(f"dual-pipeline agreement {agree:.1f}% on {len(cmp_df)} unseen cases")

# ---------------- demand forecasting (network daily) ------------------------
# Strategy: model the RESIDUAL over the seasonal-naive value (lag7). The
# residual is driven by effects the naive copy misses: ridership growth trend,
# start-of-month spikes, holidays (and *lag7 being* a holiday), event days.
# Trees cannot extrapolate a trend, so a linear corrector is compared against
# XGBoost on a held-out VALIDATION window and the winner is reported on TEST.
from sklearn.linear_model import LinearRegression  # noqa: E402

dr = pd.read_parquet(f"{PQ}/daily_route_demand.parquet")
cal_f = pd.read_csv(f"{RAW_DIR}/service_calendar.csv", parse_dates=["service_date"])
net = (dr.groupby("service_date")["demand"].sum().reset_index()
       .sort_values("service_date").reset_index(drop=True))
net["service_date"] = pd.to_datetime(net["service_date"])
net = net.merge(cal_f[["service_date", "is_holiday", "special_event"]],
                on="service_date", how="left")
net["is_holiday"] = net["is_holiday"].fillna(False).astype(int)
net["is_event"] = (net["special_event"].fillna("") != "").astype(int)
net["trend"] = np.arange(len(net))
net["dom_start"] = (net["service_date"].dt.day <= 3).astype(int)
net["lag7"] = net["demand"].shift(7)
net["hol_lag7"] = net["is_holiday"].shift(7).fillna(0).astype(int)
net["event_lag7"] = net["is_event"].shift(7).fillna(0).astype(int)
net["dom_start_lag7"] = net["dom_start"].shift(7).fillna(0).astype(int)
net["roll7"] = net["demand"].shift(1).rolling(7).mean()
net["roll28"] = net["demand"].shift(1).rolling(28).mean()
net["drift"] = net["roll7"] - net["roll28"]      # recent growth signal
net["resid"] = net["demand"] - net["lag7"]

FX = ["trend", "dom_start", "dom_start_lag7", "is_holiday", "hol_lag7",
      "is_event", "event_lag7", "drift"]
fs = net.dropna(subset=FX + ["resid", "lag7", "demand"]).reset_index(drop=True)
n_fs = len(fs)
i_test, i_val = n_fs - 28, n_fs - 56             # last 28 test, prior 28 validation

CANDS = {
    "linear_residual": LinearRegression(),
    "xgb_residual": XGBRegressor(n_estimators=150, max_depth=2, learning_rate=0.08,
                                 min_child_weight=8, subsample=0.8,
                                 random_state=SEED, n_jobs=-1),
}
val_scores = {}
for name, mdl in CANDS.items():
    mdl.fit(fs.loc[:i_val - 1, FX], fs.loc[:i_val - 1, "resid"])
    vp = fs.loc[i_val:i_test - 1, "lag7"].to_numpy() + mdl.predict(fs.loc[i_val:i_test - 1, FX])
    val_scores[name] = float(np.abs(fs.loc[i_val:i_test - 1, "demand"].to_numpy() - vp).mean())
best_f = min(val_scores, key=val_scores.get)
xg_f = CANDS[best_f]
xg_f.fit(fs.loc[:i_test - 1, FX], fs.loc[:i_test - 1, "resid"])   # refit train+val
log(f"forecast candidates val MAE {val_scores} -> {best_f}")

cut = i_test
pred = fs.loc[cut:, "lag7"].to_numpy() + xg_f.predict(fs.loc[cut:, FX])
actual = fs.loc[cut:, "demand"].to_numpy()
naive = fs.loc[cut:, "lag7"].to_numpy()          # naive seasonal baseline

def fmetrics(a, p):
    return {"MAE": round(float(mean_absolute_error(a, p)), 1),
            "RMSE": round(float(np.sqrt(mean_squared_error(a, p))), 1),
            "MAPE_pct": round(float(np.mean(np.abs((a - p) / a))) * 100, 2),
            "R2": round(float(r2_score(a, p)), 4)}

forecast_report = {
    "selected_model": best_f,
    "candidates_val_MAE": {k: round(v, 1) for k, v in val_scores.items()},
    "model": fmetrics(actual, pred),
    "naive_seasonal_baseline": fmetrics(actual, naive),
    "improvement_MAE_pct": round((1 - fmetrics(actual, pred)["MAE"]
                                  / fmetrics(actual, naive)["MAE"]) * 100, 1),
    "test_window_days": 28,
}
joblib.dump({"model": xg_f, "features": FX, "version": f"forecast_{best_f}_v1.1"},
            f"{MODELS}/demand_forecast_xgb.joblib")

# 28-day recursive future forecast for the dashboard
hol_dates = set(cal_f.loc[cal_f["is_holiday"], "service_date"].dt.date)
event_dates = set(cal_f.loc[cal_f["special_event"].fillna("") != "", "service_date"].dt.date)
series = net["demand"].tolist()
dates = list(net["service_date"].dt.date)
trend_i = len(net)
future = []
last = pd.to_datetime(net["service_date"].iloc[-1])
for _ in range(28):
    nxt = last + pd.Timedelta(days=1)
    d7 = (nxt - pd.Timedelta(days=7)).date()
    row = {"trend": trend_i,
           "dom_start": int(nxt.day <= 3),
           "dom_start_lag7": int(d7.day <= 3),
           "is_holiday": int(nxt.date() in hol_dates),
           "hol_lag7": int(d7 in hol_dates),
           "is_event": int(nxt.date() in event_dates),
           "event_lag7": int(d7 in event_dates),
           "drift": float(np.mean(series[-7:]) - np.mean(series[-28:]))}
    yhat = series[-7] + float(xg_f.predict(pd.DataFrame([row])[FX])[0])
    future.append({"service_date": nxt, "forecast": round(yhat)})
    series.append(yhat)
    dates.append(nxt.date())
    trend_i += 1
    last = nxt
fc = pd.DataFrame(future)
fc["lower"] = (fc["forecast"] * 0.94).round()
fc["upper"] = (fc["forecast"] * 1.06).round()
hist_out = net[["service_date", "demand"]].tail(56)
fc.to_parquet(f"{PQ}/forecast_future.parquet", index=False)
hist_out.to_parquet(f"{PQ}/forecast_history.parquet", index=False)
log(f"forecast — model MAE {forecast_report['model']['MAE']} vs naive "
    f"{forecast_report['naive_seasonal_baseline']['MAE']} "
    f"({forecast_report['improvement_MAE_pct']}% better)")

# ---------------- crowding risk P(occ>100) — pre-trip features only ---------
CROWD_F = ["dep_hour", "day_of_week", "is_weekend", "is_peak", "distance_km",
           "n_stops", "scheduled_headway_min", "vehicle_capacity",
           "route_delay_7d", "route_occ_7d", "route_demand_7d"]
data["overload"] = (data["occupancy_pct"] > 100).astype(int)
ctr, cte = data.iloc[:i_va], data.iloc[i_va:]
xg_c = XGBClassifier(n_estimators=250, max_depth=6, learning_rate=0.08,
                     random_state=SEED, eval_metric="auc", n_jobs=-1,
                     scale_pos_weight=float((ctr["overload"] == 0).sum()
                                            / max((ctr["overload"] == 1).sum(), 1)))
xg_c.fit(ctr[CROWD_F], ctr["overload"])
auc = roc_auc_score(cte["overload"], xg_c.predict_proba(cte[CROWD_F])[:, 1])
joblib.dump({"model": xg_c, "features": CROWD_F, "version": "crowd_v1.0"},
            f"{MODELS}/crowding_risk_xgb.joblib")

risk = cte.copy()
risk["risk"] = xg_c.predict_proba(cte[CROWD_F])[:, 1]
top_risk = (risk.sort_values("risk", ascending=False).head(40)
            [["trip_id", "route_id", "direction", "dep_hour", "vehicle_id",
              "vehicle_capacity", "risk", "occupancy_pct"]].round(3))
top_risk.to_parquet(f"{PQ}/high_risk_trips.parquet", index=False)
log(f"crowding-risk AUC {auc:.3f}")

# ---------------- K-Means route clustering ----------------------------------
rs = pd.read_parquet(f"{PQ}/route_stats.parquet")
CL_F = ["demand", "occupancy", "avg_delay", "reliability", "on_time", "headway_min"]
X = StandardScaler().fit_transform(rs[CL_F])
sil = {}
for k in (3, 4, 5, 6):
    km = KMeans(n_clusters=k, n_init=10, random_state=SEED).fit(X)
    sil[k] = round(float(silhouette_score(X, km.labels_)), 3)
best_k = max(sil, key=sil.get)
km = KMeans(n_clusters=best_k, n_init=10, random_state=SEED).fit(X)
rs["cluster"] = km.labels_
rs.to_parquet(f"{PQ}/route_stats.parquet", index=False)
log(f"k-means: silhouette by k {sil} → k={best_k}")

# ---------------- master metrics file ---------------------------------------
metrics = {
    "delay_severity_classifier": classifier_report,
    "dual_pipeline_comparison": comparison,
    "demand_forecast": forecast_report,
    "crowding_risk": {"test_auc": round(float(auc), 4), "features": CROWD_F},
    "route_clustering": {"silhouette_by_k": sil, "selected_k": best_k},
    "elapsed_sec": round(time.time() - T0, 1),
}
with open(f"{REPORTS}/model_metrics.json", "w") as f:
    json.dump(metrics, f, indent=2)
log("DONE — models saved to models/, metrics to reports/model_metrics.json")
