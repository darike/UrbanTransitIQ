"""
Phase 2/3 — Spark ingestion of the raw transport dataset.

Demonstrates (SRS Step 3): multiple-file ingestion, explicit schema definition,
schema inference (for comparison), data-type validation, large-file loading,
partition handling, HDFS + Parquet reading.

Run:  spark-submit spark_jobs/01_ingest.py
"""

import time

from pyspark.sql import functions as F
from pyspark.sql.types import (DoubleType, IntegerType, StringType,
                               StructField, StructType, TimestampType)

from utiq_spark import get_spark, path

spark = get_spark("ingest")
t0 = time.time()

# ---- explicit schemas (tickets is the 2M+ table — never infer in production)
TICKETS_SCHEMA = StructType([
    StructField("ticket_id", StringType(), False),
    StructField("passenger_id", StringType(), True),
    StructField("trip_id", StringType(), True),
    StructField("route_id", StringType(), True),
    StructField("scan_time", TimestampType(), True),
    StructField("fare", IntegerType(), True),
    StructField("channel", StringType(), True),
])

TRIPS_SCHEMA = StructType([
    StructField("trip_id", StringType(), False),
    StructField("route_id", StringType(), True),
    StructField("vehicle_id", StringType(), True),
    StructField("direction", StringType(), True),
    StructField("service_date", StringType(), True),
    StructField("sched_departure", TimestampType(), True),
    StructField("actual_departure", TimestampType(), True),
    StructField("sched_arrival", TimestampType(), True),
    StructField("actual_arrival", TimestampType(), True),
    StructField("sched_travel_min", DoubleType(), True),
    StructField("delay_min", DoubleType(), True),
    StructField("status", StringType(), True),
])

tickets = spark.read.csv(path("raw_data", "tickets.csv"), header=True, schema=TICKETS_SCHEMA)
trips = spark.read.csv(path("raw_data", "trips.csv"), header=True, schema=TRIPS_SCHEMA)

# schema inference demo on a small master table (compare with explicit above)
routes_inferred = spark.read.csv(path("raw_data", "routes.csv"), header=True, inferSchema=True)
counts = spark.read.csv(path("raw_data", "passenger_counts.csv"), header=True, inferSchema=True)
delays = spark.read.json(path("raw_data", "delays.json"))

# ---- data-type validation: reject rows whose types failed to parse
bad_scan = tickets.filter(F.col("scan_time").isNull() & F.col("ticket_id").isNotNull()).count()
print(f"[ingest] tickets rows={tickets.count():,} unparseable scan_time={bad_scan:,}")
print(f"[ingest] trips rows={trips.count():,}")
print(f"[ingest] routes inferred schema: {routes_inferred.schema.simpleString()}")

# ---- partition handling: write the raw big table partitioned by month
tickets = tickets.withColumn("month", F.date_format("scan_time", "yyyy-MM"))
(tickets
 .repartition("month")
 .write.mode("overwrite")
 .partitionBy("month")
 .parquet(path("parquet_data", "tickets_by_month")))

trips.write.mode("overwrite").parquet(path("parquet_data", "trips_raw"))
counts.write.mode("overwrite").parquet(path("parquet_data", "passenger_counts_raw"))
delays.write.mode("overwrite").parquet(path("parquet_data", "delays_raw"))

# ---- read back Parquet to prove HDFS/Parquet reading
back = spark.read.parquet(path("parquet_data", "tickets_by_month"))
print(f"[ingest] parquet read-back rows={back.count():,} partitions={back.rdd.getNumPartitions()}")
print(f"[ingest] DONE in {time.time()-t0:.1f}s")
spark.stop()
