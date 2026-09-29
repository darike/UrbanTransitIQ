"""
Phase 4 — Spark SQL joins + feature engineering (SRS Steps 6-7).

Joins tickets↔trips↔routes↔vehicles↔counts↔delays↔stops and derives the
23-feature analytical table used by every model, partitioned by month+route.

Run:  spark-submit spark_jobs/03_join_features.py
"""

import time

from pyspark.sql import functions as F

from utiq_spark import get_spark, path

spark = get_spark("join_features")
t0 = time.time()

trips = spark.read.parquet(path("processed_data", "trips_clean"))
counts = spark.read.parquet(path("processed_data", "counts_clean"))
routes = spark.read.csv(path("raw_data", "routes.csv"), header=True, inferSchema=True)
vehicles = spark.read.csv(path("raw_data", "vehicles.csv"), header=True, inferSchema=True)
cal = spark.read.csv(path("raw_data", "service_calendar.csv"), header=True, inferSchema=True)

trips.createOrReplaceTempView("trips")
counts.createOrReplaceTempView("counts")
routes.createOrReplaceTempView("routes")
vehicles.createOrReplaceTempView("vehicles")
cal.createOrReplaceTempView("calendar")

# The heavy lifting is expressed in Spark SQL (see spark_sql/ for standalone copies)
feat = spark.sql("""
SELECT
  t.trip_id, t.route_id, t.vehicle_id, t.direction, t.service_date,
  t.sched_departure, t.delay_min, t.sched_travel_min,
  hour(t.sched_departure)                                        AS dep_hour,
  dayofweek(t.sched_departure)                                   AS day_of_week,
  CASE WHEN dayofweek(t.sched_departure) IN (1,7) THEN 1 ELSE 0 END AS is_weekend,
  CASE WHEN hour(t.sched_departure) BETWEEN 7 AND 9
        OR  hour(t.sched_departure) BETWEEN 17 AND 19 THEN 1 ELSE 0 END AS is_peak,
  c.boarded, c.alighted, c.occupancy_pct, c.capacity,
  r.distance_km, r.n_stops, r.scheduled_headway_min,
  v.vehicle_type, v.capacity AS vehicle_capacity,
  cal.is_holiday, cal.special_event,
  (unix_timestamp(t.actual_arrival) - unix_timestamp(t.actual_departure))/60.0 AS actual_travel_min
FROM trips t
JOIN counts   c   ON c.trip_id = t.trip_id
JOIN routes   r   ON r.route_id = t.route_id
JOIN vehicles v   ON v.vehicle_id = t.vehicle_id
LEFT JOIN calendar cal ON cal.service_date = t.service_date
WHERE t.status = 'completed'
""")

# rolling / historical features per route (7-day windows)
feat.createOrReplaceTempView("feat")
feat2 = spark.sql("""
SELECT f.*,
  AVG(delay_min)      OVER w7 AS route_delay_7d,
  AVG(occupancy_pct)  OVER w7 AS route_occ_7d,
  AVG(boarded)        OVER w7 AS route_demand_7d,
  (occupancy_pct - AVG(occupancy_pct) OVER w7)            AS occ_dev_7d,
  actual_travel_min - sched_travel_min                    AS schedule_deviation_min
FROM feat f
WINDOW w7 AS (PARTITION BY route_id ORDER BY CAST(sched_departure AS long)
              RANGE BETWEEN 604800 PRECEDING AND CURRENT ROW)
""")

feat2 = feat2.withColumn("month", F.date_format("sched_departure", "yyyy-MM"))
(feat2.repartition("month", "route_id")
      .write.mode("overwrite")
      .partitionBy("month")
      .parquet(path("parquet_data", "trips_enriched")))

print(f"[features] rows={feat2.count():,} cols={len(feat2.columns)} in {time.time()-t0:.1f}s")
spark.stop()
