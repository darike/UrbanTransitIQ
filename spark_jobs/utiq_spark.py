"""Shared Spark session + path helpers for all UrbanTransit IQ Spark jobs.

Set UTIQ_USE_HDFS=1 to read/write hdfs:///urbantransit/...; otherwise the jobs
use the identical local layout (raw_data/, processed_data/, parquet_data/).
"""

import os

from pyspark.sql import SparkSession

USE_HDFS = os.environ.get("UTIQ_USE_HDFS") == "1"
# explicit namenode host:port — a pip-installed PySpark has no core-site.xml,
# so schemeless hdfs:/// URIs would fail with "no host"
HDFS_BASE = os.environ.get("UTIQ_HDFS_URI", "hdfs://localhost:9000") + "/urbantransit"


def get_spark(app_name: str) -> SparkSession:
    return (
        SparkSession.builder
        .appName(f"UrbanTransitIQ::{app_name}")
        .config("spark.sql.shuffle.partitions", "64")
        .config("spark.sql.session.timeZone", "UTC")
        .getOrCreate()
    )


def path(zone: str, name: str = "") -> str:
    """zone ∈ raw_data|processed_data|parquet_data|quarantine"""
    base = f"{HDFS_BASE}/{zone}" if USE_HDFS else zone
    return f"{base}/{name}" if name else base
