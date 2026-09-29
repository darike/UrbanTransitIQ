"""
Phase 10 (Spark side) — Spark MLlib model development (SRS Steps 41, 43).

Trains and compares THREE MLlib algorithms for 5-class delay-severity
classification (RandomForest, GBT via one-vs-rest, LogisticRegression) with a
chronological train/validation/test split, then writes the selected model,
metrics, and predictions for the 120 held-out comparison cases consumed by
python_pipeline/compare_pipelines.py.

Run:  spark-submit spark_jobs/04_mllib_models.py
"""

import json
import time

from pyspark.ml import Pipeline
from pyspark.ml.classification import (LogisticRegression, OneVsRest,
                                       GBTClassifier, RandomForestClassifier)
from pyspark.ml.evaluation import MulticlassClassificationEvaluator
from pyspark.ml.feature import StringIndexer, VectorAssembler
from pyspark.sql import functions as F

from utiq_spark import get_spark, path

import os

spark = get_spark("mllib_models")
t0 = time.time()

df = spark.read.parquet(path("parquet_data", "trips_enriched"))

# Optional evidence-run sampling (UTIQ_SAMPLE=0.3): keeps the recorded demo run
# inside laptop time budgets; the full run uses the whole table. Chronological
# ordering is preserved because sampling is uniform over time.
_frac = float(os.environ.get("UTIQ_SAMPLE", "1.0"))
if _frac < 1.0:
    df = df.sample(fraction=_frac, seed=20260928)
    print(f"[mllib] evidence-run sample fraction={_frac}")

# delay severity label (thresholds from config/config.yaml)
df = df.withColumn("severity", F.when(F.col("delay_min") <= 2, "on_time")
                   .when(F.col("delay_min") <= 5, "minor")
                   .when(F.col("delay_min") <= 10, "moderate")
                   .when(F.col("delay_min") <= 20, "major")
                   .otherwise("severe"))

# PRE-TRIP features only — occupancy_pct / schedule_deviation_min are measured
# during the trip and leak the label (same rule as the Python pipeline).
FEATURES = ["dep_hour", "day_of_week", "is_weekend", "is_peak",
            "distance_km", "n_stops", "scheduled_headway_min", "vehicle_capacity",
            "route_delay_7d", "route_occ_7d", "route_demand_7d"]
df = df.dropna(subset=FEATURES + ["severity", "sched_departure"])

# ---- chronological split: 70 / 15 / 15 by departure time (no future leakage)
# approxQuantile rejects TimestampType, so split on epoch seconds
df = df.withColumn("dep_ts", F.unix_timestamp("sched_departure"))
t_train, t_val = df.approxQuantile("dep_ts", [0.70, 0.85], 0.001)
train = df.filter(F.col("dep_ts") <= t_train)
val = df.filter((F.col("dep_ts") > t_train) & (F.col("dep_ts") <= t_val))
test = df.filter(F.col("dep_ts") > t_val)

label = StringIndexer(inputCol="severity", outputCol="label").fit(df)
assembler = VectorAssembler(inputCols=FEATURES, outputCol="features")

CANDIDATES = {
    "RandomForest": RandomForestClassifier(numTrees=120, maxDepth=12, seed=20260928),
    "LogisticRegression": LogisticRegression(maxIter=60, regParam=0.01),
    "GBT_OneVsRest": OneVsRest(classifier=GBTClassifier(maxIter=40, maxDepth=6, seed=20260928)),
}

ev_acc = MulticlassClassificationEvaluator(metricName="accuracy")
ev_f1 = MulticlassClassificationEvaluator(metricName="f1")

results, models = {}, {}
for name, clf in CANDIDATES.items():
    pipe = Pipeline(stages=[label, assembler, clf]).fit(train)
    pv = pipe.transform(val)
    results[name] = {"val_accuracy": ev_acc.evaluate(pv), "val_f1": ev_f1.evaluate(pv)}
    models[name] = pipe
    print(f"[mllib] {name}: {results[name]}")

best = max(results, key=lambda k: results[k]["val_f1"])
pt = models[best].transform(test)
results[best]["test_accuracy"] = ev_acc.evaluate(pt)
results[best]["test_f1"] = ev_f1.evaluate(pt)
results["selected"] = best
print(f"[mllib] selected={best} test={results[best]}")

models[best].write().overwrite().save(path("parquet_data", "mllib_delay_model"))

# 120 unseen comparison cases (latest test rows) for the dual-pipeline report
cases = (pt.orderBy(F.col("sched_departure").desc()).limit(120)
         .select("trip_id", "route_id", "severity",
                 F.col("prediction").alias("spark_pred_idx"),
                 "probability"))
cases.write.mode("overwrite").parquet(path("parquet_data", "spark_comparison_cases"))

results["elapsed_sec"] = round(time.time() - t0, 1)
with open("reports/mllib_metrics.json", "w") as f:
    json.dump(results, f, indent=2, default=str)
spark.stop()
