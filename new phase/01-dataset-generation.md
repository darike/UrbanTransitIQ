# Phase 1 — Synthetic Transport Dataset Generation
**Maps to SRS:** Step 1 (Transport Dataset Creation), Hint section (dataset minimums)
**Folder:** `data_generator/`, output → `raw_data/`

## Goal
Generate your OWN large-scale, interconnected, realistic public transport dataset. Downloading a ready-made dataset without heavy transformation/augmentation is NOT acceptable and will fail evaluation.

## Prerequisites
- Phase 0 environment ready (Python venv, `faker` installed).

## Minimum Dataset Sizes (hard requirements — do not go below these)
- ≥ 2,000,000 ticketing/passenger movement records
- ≥ 500,000 trip-level passenger records
- ≥ 100 routes
- ≥ 500 stops
- ≥ 250 vehicles
- ≥ 50,000 unique passengers
- ≥ 12 months of historical operation
- ≥ 250,000 delay records
- Multiple service calendars/schedules

## Tables to Generate (each as its own CSV in `raw_data/`)
1. `passengers.csv` — passenger_id (PK), name/anon-id, registration_date, passenger_type
2. `tickets.csv` — ticket_id (PK), passenger_id (FK), trip_id (FK), fare, purchase_time, ticket_type
3. `routes.csv` — route_id (PK), route_name, direction, distance_km, status
4. `stops.csv` — stop_id (PK), stop_name, latitude, longitude
5. `route_stops.csv` — route_id (FK), stop_id (FK), stop_sequence
6. `trips.csv` — trip_id (PK), route_id (FK), vehicle_id (FK), service_id (FK), scheduled_start, scheduled_end
7. `schedules.csv` — schedule_id, route_id, stop_id, scheduled_arrival, scheduled_departure
8. `vehicles.csv` — vehicle_id (PK), type, capacity, status
9. `passenger_counts.csv` — trip_id (FK), stop_id (FK), boarding_count, alighting_count, occupancy
10. `delays.csv` — delay_id, trip_id (FK), stop_id (FK), scheduled_time, actual_time, delay_minutes, reason
11. `gps_events.csv` — event_id, vehicle_id (FK), trip_id (FK), timestamp, latitude, longitude
12. `service_calendar.csv` — service_id (PK), day_of_week flags, start_date, end_date, holiday_flag

## Realistic "Dirty Data" Injection (mandatory — inject deliberately, then log it)
Inject and TRACK counts of each of these so Phase 3 has real problems to solve:
- Missing values (nulls in non-critical fields) — ~1-2% of rows
- Duplicate ticket transactions — ~0.5%
- Invalid timestamps (e.g. arrival before scheduled departure) — ~0.3%
- Trip cancellations — a % of trips flagged cancelled with no passenger counts
- Early arrivals as well as delays (not just late)
- Vehicle changes mid-schedule
- Seasonal demand curve (higher in certain months)
- Weekday vs weekend demand difference
- Peak-hour demand bump (7-9am, 5-7pm)
- Direction-based demand asymmetry
- 3-5 simulated "special events" causing demand spikes on specific dates/routes
- Overcrowded services on some routes (occupancy > 100%)
- Low-demand/underutilized services on others
- Irregular headways on a subset of routes
- Vehicle bunching events (2+ vehicles same route close together) — inject explicitly on 1-2% of trips
- Stop bottlenecks (a handful of stops with abnormally long dwell/boarding times)
- Passenger spikes on random days

## ⚠️ MANDATORY Performance Rules (read before writing any generator code)
The minimums above (2,000,000 tickets, 500,000 trip-level records, 250,000 delays, etc.) are **hard requirements — they must be met in full, no shortcuts, no "sample and scale later."** But generating millions of rows the WRONG way (row-by-row Python loops calling `Faker` for every single row) can take hours or crash the machine. Tell Codex explicitly to follow these rules:

1. **NEVER generate large tables with a plain `for` loop + Faker per row.** Faker is only for small, genuinely need-unique-text fields (e.g. a handful of route names) — and even there, generate a small pool (e.g. 200 unique names) and reuse/sample from it instead of calling Faker millions of times.
2. **Use vectorized NumPy/Pandas generation for every large table** (tickets, passenger_counts, delays, gps_events, schedules):
   - IDs: `np.arange(n)` or `np.random.randint(...)` — not string-formatted in a loop.
   - Random categorical choices: `np.random.choice(route_ids, size=n, p=weights)` — not `random.choice()` called n times.
   - Timestamps: build with `pd.date_range` + `np.random.randint` offsets, not `datetime` objects looped one at a time.
   - Build each table as NumPy arrays / dict-of-arrays first, then `pd.DataFrame(that_dict)` ONCE — not `df.append()` in a loop (append-in-loop is extremely slow and must never be used).
3. **Generate and write in CHUNKS to control memory** — do not try to hold all 2,000,000+ rows of every table in RAM at once if the machine is low-spec:
   ```python
   CHUNK_SIZE = 200_000
   total_rows = 2_000_000
   first_chunk = True
   for start in range(0, total_rows, CHUNK_SIZE):
       n = min(CHUNK_SIZE, total_rows - start)
       chunk_df = generate_tickets_chunk(n, start_id=start)  # vectorized, returns a DataFrame of n rows
       chunk_df.to_csv("raw_data/tickets.csv", mode="a", header=first_chunk, index=False)
       first_chunk = False
       print(f"Written {start + n:,} / {total_rows:,} rows to tickets.csv")
   ```
4. **Always test at small scale first.** Before running the full 2,000,000-row generation, run the same script with `total_rows = 1000` (or a `--test` flag / `SMALL_SCALE=True` config toggle) to confirm the logic, foreign keys, and file writing all work correctly. Only after that passes, run the full-scale version.
5. **Expected realistic timing** if done correctly (vectorized + chunked): the full dataset (all 12 tables, meeting every minimum) should take roughly **10–20 minutes total** on a normal laptop, with `tickets.csv` (2M rows) alone taking about 1–3 minutes. If any single table is taking much longer than that, the code is not vectorized correctly — stop and fix it rather than letting it run for hours.
6. **Do not reduce the minimums to make generation "easier."** If performance is a problem, fix the generation method (vectorize it) — never lower row counts below the hard minimums in the table above. The 2,000,000 ticket minimum, 500,000 trip-level minimum, 250,000 delay minimum, etc. are non-negotiable competition requirements.

## ⚠️ Originality Requirement (applies to this phase — 0% plagiarism target)
This phase's code must be checked for originality before committing:
- Do NOT paste boilerplate copied verbatim from tutorials, Stack Overflow, GitHub repos, or other teams' code. Codex-generated code is fine to use, but it must be adapted to THIS project's own schema (real column/table names from Phase 1), real config values from `config/config.yaml`, and real thresholds/logic decided for UrbanTransit IQ — not generic placeholder examples.
- Rename generic variables/functions to match this project's own naming (e.g. `route_id`, `trip_id`, `occupancy_pct`, not `data1`/`x`/`foo`).
- Add at least one project-specific comment per file explaining the logic in your own words — this both lowers plagiarism-similarity scores (project-specific code naturally does not match any other submission) and proves the team understands the code (needed for the Anti-Shortcut oral-explanation requirement).
- Declaring Codex/AI usage in `AI_USAGE.md` (Phase 15) is still mandatory and does NOT count as plagiarism — undeclared copying from another source is what plagiarism checkers and the SRS integrity rules actually penalize.

## Steps
1. Create `data_generator/config_gen.py` — central constants (num_routes=120, num_stops=550, num_vehicles=280, num_passengers=60000, months=14, etc. — all above minimums with buffer).
2. Create `data_generator/generate_core_entities.py` — generates routes, stops, route_stops (with proper sequential stop ordering per route), vehicles, service_calendar.
3. Create `data_generator/generate_trips_schedules.py` — generates trips + schedules per route per service_id, spread across 12+ months, respecting weekday/weekend/holiday calendars.
4. Create `data_generator/generate_passengers_tickets.py` — generates passengers and tickets linked to trips, with realistic fare logic and peak-hour weighting.
5. Create `data_generator/generate_passenger_counts.py` — generates boarding/alighting per trip per stop, occupancy = running total vs vehicle capacity, injecting overcrowding/underutilization patterns.
6. Create `data_generator/generate_delays_gps.py` — generates delay records and GPS events, injecting the dirty-data patterns above.
7. Create `data_generator/inject_noise.py` — a dedicated script that takes clean generated data and deliberately corrupts a controlled % (with a manifest of what/where was corrupted, saved to `raw_data/injection_manifest.json` — you will need this in Phase 3 to prove your cleaning worked).
8. Create `data_generator/run_all.py` — orchestrates all the above in order, prints row counts per table at the end, and asserts they meet the minimums (fail loudly if not).
9. Run: `python data_generator/run_all.py` — output CSVs land in `raw_data/`.
10. Create `documentation/data_dictionary.md` — one section per table: column name, data type, description, PK/FK, example value. (Also required later in Phase 13/deliverables — start it now.)

## Deliverables Checklist
- [ ] 12 CSV files in `raw_data/`, all above minimum row counts
- [ ] `raw_data/injection_manifest.json` documenting every deliberate data-quality issue injected (type, table, row count)
- [ ] `documentation/data_dictionary.md` (draft, all 12 tables)
- [ ] All generator scripts in `data_generator/`, runnable via `python data_generator/run_all.py`
- [ ] Entry in `documentation/development_log.md`

## Acceptance Criteria
- Running `run_all.py` from a clean checkout reproduces the dataset (scripts must be deterministic-seedable — use a fixed `random.seed()` / `Faker.seed()`).
- Row counts printed at the end of the run meet/exceed every minimum in the table above.
- Foreign keys are valid (every trip_id in tickets exists in trips, etc.) — write a quick `data_generator/validate_fk_integrity.py` sanity check and run it.
- No single CSV is hand-crafted/pasted — everything is procedurally generated.
- Generation completes in a reasonable time (see timing guidance above) — if it doesn't, the code must be fixed (vectorized), not the requirement lowered.

## 🔒 Final Row-Count Lock Check (run this before moving to Phase 2 — do not skip)
Create `data_generator/verify_minimums.py` that reads every CSV in `raw_data/` with `pd.read_csv(..., usecols=[id_column])` (fast, low-memory) or `wc -l`/`len(df)`, and prints a PASS/FAIL table against the exact minimums:

```python
import pandas as pd

CHECKS = {
    "tickets.csv": 2_000_000,
    "passenger_counts.csv": 500_000,   # trip-level passenger records
    "routes.csv": 100,
    "stops.csv": 500,
    "vehicles.csv": 250,
    "passengers.csv": 50_000,
    "delays.csv": 250_000,
}

all_pass = True
for filename, minimum in CHECKS.items():
    count = sum(1 for _ in open(f"raw_data/{filename}")) - 1  # minus header
    status = "PASS" if count >= minimum else "FAIL"
    if status == "FAIL":
        all_pass = False
    print(f"{filename:25s} required>={minimum:>10,}  actual={count:>10,}  [{status}]")

print("\nOVERALL:", "ALL MINIMUMS MET ✅" if all_pass else "MINIMUMS NOT MET ❌ — DO NOT PROCEED TO PHASE 2")
```
Run: `python data_generator/verify_minimums.py`. **If it prints any FAIL, go back and fix the generator for that table before touching Phase 2 — do not move forward with an incomplete dataset.**

Next: **02-bigdata-storage-ingestion.md**
