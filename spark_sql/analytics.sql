-- UrbanTransit IQ — standalone Spark SQL analytics (SRS Steps 8-11, 17, 27, 32)
-- Run inside spark-sql or via spark.sql(...) after registering the temp views
-- (see spark_jobs/03_join_features.py for view registration).

-- 1. Highest / lowest demand routes (Step 8)
SELECT route_id, SUM(boarded) AS total_boarded, COUNT(*) AS trips
FROM feat GROUP BY route_id ORDER BY total_boarded DESC;

-- 2. Peak travel periods from actual demand, not fixed slots (Step 11)
SELECT dep_hour, is_weekend, SUM(boarded) AS demand
FROM feat GROUP BY dep_hour, is_weekend ORDER BY is_weekend, dep_hour;

-- 3. Origin-destination flows between hub stops (Step 9-10)
SELECT o.stop_id AS origin_stop, d.stop_id AS dest_stop,
       COUNT(*) AS passenger_flows
FROM boardings o
JOIN alightings d ON d.ticket_id = o.ticket_id
GROUP BY o.stop_id, d.stop_id
ORDER BY passenger_flows DESC LIMIT 100;

-- 4. Route-wise delay profile with P90 (Step 17)
SELECT route_id,
       ROUND(AVG(delay_min), 1)                          AS avg_delay,
       ROUND(percentile_approx(delay_min, 0.9), 1)       AS p90_delay,
       COUNT(CASE WHEN delay_min > 10 THEN 1 END)        AS major_incidents
FROM feat GROUP BY route_id ORDER BY avg_delay DESC;

-- 5. Persistent overcrowding: repeated overload in the same window (Step 13)
SELECT route_id, direction, dep_hour,
       COUNT(*)                                          AS overload_events,
       COUNT(DISTINCT service_date)                      AS days_affected
FROM feat
WHERE occupancy_pct > 100
GROUP BY route_id, direction, dep_hour
HAVING COUNT(DISTINCT service_date) >= 5
ORDER BY overload_events DESC;

-- 6. Underutilized services (Step 14)
SELECT route_id, ROUND(AVG(occupancy_pct), 1) AS avg_occ, COUNT(*) AS trips
FROM feat
GROUP BY route_id
HAVING AVG(occupancy_pct) < 40 AND COUNT(*) > 500
ORDER BY avg_occ;

-- 7. Headway / bunching detection (Steps 32-33): consecutive vehicles on the
--    same route+direction closer than 25% of scheduled headway
WITH seq AS (
  SELECT route_id, direction, sched_departure, scheduled_headway_min,
         (unix_timestamp(sched_departure)
          - unix_timestamp(LAG(sched_departure) OVER
              (PARTITION BY route_id, direction, service_date
               ORDER BY sched_departure))) / 60.0 AS headway_min
  FROM feat)
SELECT route_id, COUNT(*) AS bunching_events
FROM seq
WHERE headway_min IS NOT NULL AND headway_min < scheduled_headway_min * 0.25
GROUP BY route_id ORDER BY bunching_events DESC;

-- 8. Travel-time analysis: scheduled vs actual by peak flag (Step 29)
SELECT route_id, is_peak,
       ROUND(AVG(sched_travel_min), 1)  AS sched_avg,
       ROUND(AVG(actual_travel_min), 1) AS actual_avg
FROM feat GROUP BY route_id, is_peak;
