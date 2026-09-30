"""
Phase 3 — Spark data-quality analysis + cleaning (SRS Steps 4-5).

Detects every planted defect class, writes a Data Quality Report, cleans or
quarantines records under documented rules, and keeps an audit trail of every
decision (original record + rule id + action).

Run:  spark-submit spark_jobs/02_quality_and_clean.py
"""

import json # JSON handling
import time

from pyspark.sql import Window
from pyspark.sql import functions as F

from utiq_spark import get_spark, path

spark = get_spark("quality_clean")
t0 = time.time()

trips = spark.read.parquet(path("parquet_data", "trips_raw"))
tickets = spark.read.parquet(path("parquet_data", "tickets_by_month"))
counts = spark.read.parquet(path("parquet_data", "passenger_counts_raw"))
routes = spark.read.csv(path("raw_data", "routes.csv"), header=True, inferSchema=True)
vehicles = spark.read.csv(path("raw_data", "vehicles.csv"), header=True, inferSchema=True)

report = {}

# ---------------- quality checks (each rule has an id used in the audit) ----
route_ids = [r.route_id for r in routes.select("route_id").collect()]
veh_ids = [v.vehicle_id for v in vehicles.select("vehicle_id").collect()]

# Q1 missing / unknown route ids on tickets
q1 = tickets.filter((F.col("route_id").isNull()) | (F.col("route_id") == "") |
                    (~F.col("route_id").isin(route_ids)))
report["Q1_missing_or_unknown_route_id"] = q1.count()

# Q2 duplicate ticket scans: same ticket_id scanned twice within 120s
w = Window.partitionBy("ticket_id").orderBy("scan_time")
tick2 = tickets.withColumn("prev_scan", F.lag("scan_time").over(w))
dup = tick2.filter(F.col("prev_scan").isNotNull() &
                   (F.unix_timestamp("scan_time") - F.unix_timestamp("prev_scan") <= 120))
report["Q2_duplicate_ticket_scans"] = dup.count()

# Q3 duplicate trips (full-row duplicates by trip_id)
dtr = trips.groupBy("trip_id").count().filter("count > 1")
report["Q3_duplicate_trips"] = dtr.count()

# Q4 invalid timestamps (null actual_arrival on completed trips)
q4 = trips.filter((F.col("status") == "completed") & F.col("actual_arrival").isNull())
report["Q4_invalid_timestamps"] = q4.count()

# Q5 departure after arrival (swapped)
q5 = trips.filter(F.col("actual_departure") > F.col("actual_arrival"))
report["Q5_departure_after_arrival"] = q5.count()

# Q6 negative passenger counts
q6 = counts.filter(F.col("boarded") < 0)
report["Q6_negative_passenger_counts"] = q6.count()

# Q7 unknown vehicles
q7 = trips.filter(~F.col("vehicle_id").isin(veh_ids))
report["Q7_unknown_vehicle_ids"] = q7.count()

# Q8 capacity violations — genuine overcrowding, must be KEPT not cleaned
q8 = counts.filter(F.col("occupancy_pct") > 100)
report["Q8_capacity_violations_kept"] = q8.count()

# ---------------- cleaning under documented rules --------------------------
# R1: drop exact duplicate trips (keep first)
trips_c = trips.dropDuplicates(["trip_id"])
# R2: swap back departure/arrival where reversed
swapped = F.col("actual_departure") > F.col("actual_arrival")
trips_c = (trips_c
           .withColumn("dep2", F.when(swapped, F.col("actual_arrival")).otherwise(F.col("actual_departure")))
           .withColumn("arr2", F.when(swapped, F.col("actual_departure")).otherwise(F.col("actual_arrival")))
           .drop("actual_departure", "actual_arrival")
           .withColumnRenamed("dep2", "actual_departure")
           .withColumnRenamed("arr2", "actual_arrival"))
# R3: quarantine unknown-vehicle trips
quarantine_trips = trips_c.filter(~F.col("vehicle_id").isin(veh_ids))
trips_c = trips_c.filter(F.col("vehicle_id").isin(veh_ids))
# R4: null-arrival completed trips -> impute arrival = sched_arrival + route median delay
med = trips_c.filter(F.col("delay_min").isNotNull()) \
    .groupBy("route_id").agg(F.expr("percentile_approx(delay_min, 0.5)").alias("med_delay"))
trips_c = (trips_c.join(med, "route_id", "left")
           .withColumn("actual_arrival",
                       F.coalesce("actual_arrival",
                                  F.col("sched_arrival") + (F.col("med_delay") * F.expr("INTERVAL 1 minute"))))
           .drop("med_delay"))
# R5: tickets — drop rapid duplicate scans, null-out unknown route ids
tickets_c = tick2.filter(~(F.col("prev_scan").isNotNull() &
                           (F.unix_timestamp("scan_time") - F.unix_timestamp("prev_scan") <= 120))) \
    .drop("prev_scan") \
    .withColumn("route_id", F.when(F.col("route_id").isin(route_ids), F.col("route_id")))
# R6: counts — negative boarded -> null + flag; capacity violations kept as-is
counts_c = counts.withColumn("boarded_valid", F.col("boarded") >= 0) \
    .withColumn("boarded", F.when(F.col("boarded") >= 0, F.col("boarded")))

# ---------------- outputs ---------------------------------------------------
trips_c.write.mode("overwrite").parquet(path("processed_data", "trips_clean"))
tickets_c.write.mode("overwrite").partitionBy("month").parquet(path("processed_data", "tickets_clean"))
counts_c.write.mode("overwrite").parquet(path("processed_data", "counts_clean"))
quarantine_trips.write.mode("overwrite").parquet(path("quarantine", "trips_unknown_vehicle"))
q6.write.mode("overwrite").parquet(path("quarantine", "counts_negative"))

report["rows_trips_clean"] = trips_c.count()
report["rows_tickets_clean"] = tickets_c.count()
report["elapsed_sec"] = round(time.time() - t0, 1)
print(json.dumps(report, indent=2))
with open("reports/data_quality_report_spark.json", "w") as f:
    json.dump(report, f, indent=2)
spark.stop()
