# UrbanTransit IQ: Turning 2 Million Transport Records into Service Decisions with Hadoop, Spark and Dual ML Pipelines

*Medium-ready draft (~2,300 words). Paste section by section. `[SCREENSHOT: …]`
markers show where to drop an image and what caption to give it. Code snippets
are trimmed for reading — full files are in the GitHub repo (link at the end).*

---

Every city bus network quietly produces millions of records — ticket scans,
passenger counts, timetables, GPS pings, delay reports. Almost none of it turns
into decisions. Schedules are planned on spreadsheets, overcrowding is "known"
anecdotally, and a route that runs empty at noon keeps running empty at noon.

For TechWiz 7 (Data Science Intelligence Arena, theme: TransitVerse
Intelligence), we built **UrbanTransit IQ**: a Big Data + Data Science platform
that ingests 2M+ transport records through Hadoop and Spark, cleans and joins
them, trains **two independent ML pipelines**, cross-checks their answers, and
serves everything to operators through a role-aware React dashboard with a live
network map.

This post walks through the whole build — including the three times our own
models fooled us, and how we caught them.

[SCREENSHOT: Executive Command Center dashboard — caption: "The Executive
Command Center: live KPIs, network map, service status and AI recommendations,
all computed from the real pipeline."]

## The problem, concretely

The SRS asked for far more than charts: peak-period detection from actual
demand (not fixed slots), persistent-overcrowding detection (one packed trip
must not condemn a route), delay-pattern mining, demand forecasting that must
**beat a documented naive baseline**, route clustering, evidence-backed
recommendations — and every predictive task solved by **both** Spark MLlib and
an independent Python pipeline, compared on 100+ unseen cases.

Minimum dataset: 2,000,000 ticketing records, 500,000 trip records, 100 routes,
500 stops, 250 vehicles, 50,000 passengers, 12 months of history, 250,000 delay
records. No ready-made dataset allowed.

## Step 1 — Generating a city that behaves like a city

We wrote a seeded generator (NumPy, vectorised) that produces 2,061,787 ticket
scans across 510,510 trips and 363 days. Realism came from structure, not
randomness: log-normal route demand (a few heavy commuter spines, a long tail),
AM/PM ridges, weekday/weekend split, seasonal drift, ridership growth, payday
spikes, stadium events — and delays driven by a congestion model rather than
coin flips:

```python
# delay = f(route archetype, hour-of-day congestion, weekday, vehicle) × noise
congestion = (1.0
              + 2.7 * np.exp(-((hour - 8.3) ** 2) / 2.2)     # AM ridge
              + 3.2 * np.exp(-((hour - 17.8) ** 2) / 2.6))   # PM ridge
congestion = np.where(weekend, 0.8, congestion)
mean_delay = 1.1 * congestion * dow_factor * archetype_factor * route_factor
delay_min  = mean_delay * np.exp(rng.normal(0, 0.15, n))
```

*Caption: Delays come from a congestion surface, so a model can genuinely learn
them — and a chronically late vehicle (V118) is planted for the anomaly layer.*

We also planted every defect class the SRS wants caught: duplicate ticket scans
within 120 seconds, duplicate trips, swapped departure/arrival timestamps,
negative passenger counts, unknown vehicle IDs, missing route IDs — and 81,000
genuine capacity violations that must **not** be cleaned away, because
overcrowding is the core signal.

## Step 2 — HDFS and Spark, for real

Our Windows dev machine had no Java, so the Big Data layer runs in WSL2 Ubuntu
on the same laptop: Java 17, Hadoop 3.4.1, PySpark 4.2.0. A single-node HDFS
(started with `hdfs --daemon start`, no ssh gymnastics) holds the raw zone:

```bash
$ hdfs dfs -du -h -s /urbantransit
344.6 M  /urbantransit
$ hdfs dfsadmin -report | head -3
Live datanodes (1):
Name: 127.0.0.1:9866 (localhost)
DFS Used: 347.76 MB
```

[SCREENSHOT: WSL terminal showing `hdfs dfs -ls -h /urbantransit/raw_data` —
caption: "The raw zone in real HDFS: 12 tables, 344.6 MB, replication 1 on a
single-node cluster."]

Spark ingestion uses **explicit schemas** for the big tables (schema inference
is demonstrated once, on a small master table, and never trusted with 2M rows),
then writes month-partitioned Parquet:

```python
tickets = spark.read.csv(path("raw_data", "tickets.csv"),
                         header=True, schema=TICKETS_SCHEMA)
(tickets
 .withColumn("month", F.date_format("scan_time", "yyyy-MM"))
 .repartition("month")
 .write.mode("overwrite")
 .partitionBy("month")
 .parquet(path("parquet_data", "tickets_by_month")))
```

*Caption: 2,061,787 tickets ingested in 139 s on a laptop; the same job runs
against `hdfs://localhost:9000` with one environment variable.*

## Step 3 — Data quality: 8 checks, 7 rules, 1 rule that keeps dirt in

The quality layer detects each planted defect class (Q1–Q8) and cleans under
documented rules with a full audit trail — original record, rule ID, action.
Two decisions mattered more than the code:

**Duplicate scans** are a window function, not a groupby — the same ticket ID
re-scanned within 120 s at a gate:

```python
w = Window.partitionBy("ticket_id").orderBy("scan_time")
dup = tickets.withColumn("prev", F.lag("scan_time").over(w)) \
    .filter(F.unix_timestamp("scan_time") - F.unix_timestamp("prev") <= 120)
```

**Rule R7 keeps capacity violations.** 81,145 records show occupancy above
100%. A naive cleaner would drop them as "impossible". They are the most
important rows in the dataset.

[SCREENSHOT: Data Quality dashboard page — caption: "Every cleaning decision is
recorded: counts per check, action taken, and a quarantine folder instead of
silent deletes."]

Because we implemented the pipeline twice (Spark, and a pandas/pyarrow engine
for machines without Java), we got cross-validation for free: **both engines
report identical Q1–Q8 counts** — 4,093 unknown route IDs, 8,181 duplicate
scans, 510 duplicate trips, 201 negative counts, 102 ghost vehicles.

## Step 4 — Features without time travel

The 23-feature analytical table joins nine tables and adds rolling context.
The subtle part: rolling features must never see the future — or even the
present. Each trip's `route_delay_7d` is computed from **previous-day** daily
aggregates only:

```python
roll = (daily.set_index("service_date").groupby("route_id")
        [["d_delay", "d_occ", "d_demand"]]
        .rolling("7D").mean()
        .groupby(level=0).shift(1))     # ← shift(1): yesterday's window
```

*Caption: `shift(1)` is the difference between a model and a leak.*

## Step 5 — The model that scored 99.9% (and why we deleted it)

Our first delay-severity classifier (5 classes: on-time → severe) hit **99.9%
accuracy**. In competition, that number is not a win — it's an alarm.

Two features were the culprits: `schedule_deviation_min` (actual minus planned
travel time) and `occupancy_pct` are measured **during** the trip. Predicting a
trip's delay from its own delay. We cut the feature set to pre-trip signals
only — hour, weekday, route geometry, headway, vehicle capacity, and the
7-day rolling route context — and the honest number appeared:

| Algorithm (chronological 70/15/15 split) | Test accuracy |
|---|---|
| XGBoost (Python pipeline) | **86.7%** |
| RandomForest — Spark MLlib | **86.1%** (F1 0.861) |
| RandomForest (Python) | 85.6% |
| GBT One-vs-Rest — Spark MLlib | 85.6% |
| LogisticRegression | 76–79% |

Both pipelines clear the SRS target (≥85%), independently, from separate code
paths — Spark predictions are never copied into the Python side.

[SCREENSHOT: Spark vs Python comparison page — caption: "120 newest unseen
cases: 99.2% agreement; every disagreement is an adjacent-class boundary case,
each with both models' probabilities."]

## Step 6 — The forecaster that lost to "same as last Tuesday"

Demand forecasting had a required humiliation built in: the SRS demands the
model beat a documented naive baseline. Our first XGBoost forecaster **lost to
lag-7 by 16%**. The fix was not more trees — it was framing:

1. **Model the residual over the baseline**, not the demand itself. The weekly
   cycle is the baseline; the model only learns corrections.
2. **Trees cannot extrapolate a trend.** Test-period trend values lie outside
   the training range, so a tree predicts a constant there. A linear residual
   corrector extrapolates; XGBoost was kept as a challenger and selected
   against on a held-out validation window.
3. **The best features encode why the baseline fails**: `hol_lag7` ("seven days
   ago was a holiday, so lag-7 under-counts today"), payday flags, event days,
   a drift term (`roll7 − roll28`).

```python
net["resid"]    = net["demand"] - net["lag7"]
net["hol_lag7"] = net["is_holiday"].shift(7)          # baseline's blind spot
FX = ["trend", "dom_start", "dom_start_lag7", "is_holiday",
      "hol_lag7", "is_event", "event_lag7", "drift"]
# candidates fit on train, selected on validation, reported on test:
# linear_residual val-MAE 1961  <  xgb_residual 4422  → linear selected
```

Final, on the untouched last 28 days: **MAE 2,190 vs naive 3,183 — 31.2%
better**, with MAPE 3-ish and R² reported alongside.

*Caption: We also found a classic pandas trap here — `dropna()` on a frame
whose `special_event` column is mostly NaN silently reduced training data to
4 rows. Subset your dropna.*

[SCREENSHOT: Demand Forecast dashboard — caption: "56 days of history, 28-day
forecast with interval band, and the baseline comparison shown honestly."]

## Step 7 — Crowding risk, clustering, recommendations

- **Crowding risk**: P(occupancy > 100%) from pre-trip features only —
  XGBoost, **AUC 0.935** — flags tomorrow's risky trips so capacity moves
  *before* the overload.
- **Route clustering**: K-Means on demand/occupancy/delay/reliability, k chosen
  by silhouette scan (k=5).
- **Recommendations**: every card carries its evidence, because the SRS forbids
  unexplained advice:

```json
{
  "action": "Increase R011 peak frequency (headway 12 → 8 min)",
  "evidence": [
    "Average occupancy: 96%",
    "Overload events (occ>100%): 4,313 in 12 months",
    "Overload repeats across weekdays in the same period+direction"
  ],
  "impact": "Est. peak occupancy → ~80%, waiting time −25–35%"
}
```

[SCREENSHOT: Recommendations page with one card expanded — caption:
"No unexplained recommendations: action, evidence numbers, estimated impact,
priority."]

## Step 8 — Serving it: FastAPI + React

The app is two-tier: FastAPI reads the Parquet analytics layer (cached
per-process) plus a SQLite/PostgreSQL app DB (users, audit log, model registry),
issues JWTs, and enforces roles **server-side** — a non-admin token gets a 403
from the API, not just a hidden button. Every dashboard endpoint honours shared
filters and returns a written `insight` string, because the SRS explicitly says
conclusions, not just charts.

```python
@router.get("/executive")
def executive(f: dict = Depends(_filters)):
    df = apply_filters(enriched(), **f)          # route/direction/peak/days
    kpi = {"total_passengers": int(df["boarded"].sum()),
           "on_time_pct": round(float((df["delay_min"] <= 5).mean() * 100), 1),
           ...}
    return {"kpi": kpi, "insight": build_insight(kpi, rs)}
```

The React front end (Vite, framer-motion, recharts, react-leaflet) renders 15
pages — executive, passenger flow with an OD matrix, route performance with a
per-route detail panel, delay heat-maps, occupancy, forecast, a **live network
map** on dark satellite tiles with moving vehicles and pulsing delay hotspots,
the dual-pipeline lab, data quality, HDFS/Spark job monitor, recommendations,
what-if simulator (all outputs labelled *estimates*), reports, and a Power BI
embed. If the backend is down, pages fall back to demo data and say so with a
visible badge — a graceful failure instead of a blank screen.

[SCREENSHOT: Live network map — caption: "Segment load in neon (red = >85%),
vehicles coloured by live occupancy, incident markers, hub demand labels."]

[SCREENSHOT: What-If simulator — caption: "Frequency/capacity/demand sliders;
every output is explicitly labelled an estimate, per the SRS."]

## What we'd tell any team doing this

1. **Treat great scores as bugs until proven otherwise.** Our 99.9% classifier
   and our first "fine" MLlib run (98.5%) were both leakage. The feature-set
   question to ask: *would the operator know this number before departure?*
2. **Make the baseline a first-class citizen.** Losing to lag-7 taught us more
   about our data than any hyper-parameter sweep. Residual modelling turned the
   baseline from an enemy into a foundation.
3. **Implement twice if you can.** The pandas engine wasn't just a Windows
   workaround — matching Q1–Q8 counts across two independent implementations is
   the cheapest correctness proof we've ever had.
4. **Keep the dirt you need.** Cleaning is a policy, not a reflex; the
   overcrowding "violations" were the product.
5. **Log your failures in the dev log.** Evaluators trust a project that shows
   its wrong turns and the fixes — ours are all in `development_log.md`.

## Numbers at a glance

2,061,787 tickets · 510,510 trips · 100 routes · 500 stops · 250 vehicles ·
12 months · 8 quality checks / 94,927 defects handled · 23 features ·
classifier **86.7% / 86.1%** (Python / Spark MLlib) · forecast **+31.2% vs
baseline** · crowding AUC **0.935** · dual-pipeline agreement **99.2%** ·
16/16 tests passing.

*Repo: [GitHub link] · Live demo: [deployment link] · Built for TechWiz 7 —
Aptech's World Tech Championship. AI-assisted development is declared in the
repo's AI_USAGE.md; every analytical result is produced by the project's own
pipelines and models.*
