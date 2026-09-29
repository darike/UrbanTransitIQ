# Phase 6 — Overcrowding, Underutilization, Route Performance & Classification
**Maps to SRS:** Step 12 (Overcrowding Detection), Step 13 (Persistent Overcrowding), Step 14 (Underutilization), Step 15 (Route Performance Scoring), Step 16 (Tricky Route Cases)
**Folder:** `spark_jobs/`, `route_clustering/` (shared with Phase 8)

## Goal
Correctly detect crowding (single-event vs persistent), find underused services, score every route on a composite metric, classify routes into categories, and correctly handle the "tricky" edge cases the SRS explicitly warns about.

## Prerequisites
- Phase 5 complete.

## ⚠️ Originality Requirement (applies to this phase — 0% plagiarism target)
This phase's code must be checked for originality before committing:
- Do NOT paste boilerplate copied verbatim from tutorials, Stack Overflow, GitHub repos, or other teams' code. Codex-generated code is fine to use, but it must be adapted to THIS project's own schema (real column/table names from Phase 1), real config values from `config/config.yaml`, and real thresholds/logic decided for UrbanTransit IQ — not generic placeholder examples.
- Rename generic variables/functions to match this project's own naming (e.g. `route_id`, `trip_id`, `occupancy_pct`, not `data1`/`x`/`foo`).
- Add at least one project-specific comment per file explaining the logic in your own words — this both lowers plagiarism-similarity scores (project-specific code naturally does not match any other submission) and proves the team understands the code (needed for the Anti-Shortcut oral-explanation requirement).
- Declaring Codex/AI usage in `AI_USAGE.md` (Phase 15) is still mandatory and does NOT count as plagiarism — undeclared copying from another source is what plagiarism checkers and the SRS integrity rules actually penalize.

## Steps

### 6.1 Overcrowding Detection (single-trip level)
Create `spark_jobs/08_overcrowding_detection.py`:
- Compute occupancy % per trip per stop-segment (already have this from Phase 4 features).
- Categorize occupancy into: Low / Moderate / High / Overcrowded / Critical, using thresholds from `config/config.yaml` (make them configurable, not hardcoded — the SRS explicitly requires configurable thresholds later for delay severity, apply the same discipline here).
- Track duration of overcrowding (how many consecutive stops/minutes a trip stays overcrowded) and consecutive overloaded stops.

### 6.2 Persistent Overcrowding (route level)
Create `spark_jobs/09_persistent_overcrowding.py`. A SINGLE overloaded trip must NOT classify a route as overcrowded. Require:
- Repeated overload (e.g. overcrowded on ≥ N% of trips in a rolling window)
- Time-period consistency (same time slot repeatedly overcrowded)
- Route direction awareness (check each direction separately)
- Stop sequence awareness (is it the whole route or just certain stops?)
- Day-of-week frequency (is it every weekday, or a one-off?)
Output a `route_id, direction, is_persistently_overcrowded (bool), evidence {...}` table.

### 6.3 Underutilized Service Detection
Create `spark_jobs/10_underutilization.py`, considering: occupancy, number of trips, operating frequency, route length, time period, day, passenger demand. A route/service is flagged underutilized only when LOW on multiple of these dimensions together (not occupancy alone — respects the "profitable but necessary low-occupancy route" tricky case below).

### 6.4 Route Performance Scoring
Create `spark_jobs/11_route_performance_score.py`. Composite score (0-100) combining, with documented weights (e.g. in `config/config.yaml`):
- Demand (normalized)
- Occupancy (target-band based, not "higher is always better")
- Punctuality
- Delay frequency
- Travel time consistency
- Reliability
- Passenger load
- Underutilization penalty
- Overcrowding penalty

### 6.5 Route Classification
Classify every route into one of:
- High Performing
- High Demand, but Unreliable
- Reliable, but Underutilized
- Overcrowded
- Low Performing

### 6.6 Tricky Route Cases — Explicit Handling
Your logic MUST correctly resolve each of these (write a short comment in code + a line in `documentation/tricky_cases.md` for each, explaining how your rules handle it):
1. High-demand route with poor punctuality → classify as "High Demand, but Unreliable", not simply "High Performing".
2. Low-demand route with excellent punctuality → "Reliable, but Underutilized", not penalized as failing.
3. Profitable/necessary route with low occupancy (e.g. a social-service or feeder route) → flag but don't auto-recommend cancellation; require occupancy trend + frequency both to confirm.
4. Route overcrowded only in one direction → must be evaluated per-direction, not as one blended average.
5. Route overcrowded only at specific stops → flag stop-level, not route-wide.
6. High passenger count from ONE major event → must be excluded/flagged separately by your special-event detection (Phase 9) so it doesn't distort the "normal" score — cross-reference with Step 38 logic.
7. Delay caused by one abnormal day → use rolling/median-based metrics, not single-day averages, to avoid one outlier skewing the score.
8. Route good on weekdays, poor on weekends → score AND classify separately by day-type, then present both.
9. High demand but excess frequency (already well-served, more buses wouldn't help) → distinguish "needs more capacity" vs "needs bigger vehicles" vs "already fine".
10. Low demand due to schedule mismatch (route is fine, timing is wrong) → correlate low ridership with schedule-demand misalignment before blaming the route itself.

## Deliverables Checklist
- [ ] `spark_jobs/08_overcrowding_detection.py`
- [ ] `spark_jobs/09_persistent_overcrowding.py`
- [ ] `spark_jobs/10_underutilization.py`
- [ ] `spark_jobs/11_route_performance_score.py`
- [ ] `documentation/tricky_cases.md` (all 10 cases addressed)
- [ ] `parquet_data/analytics/route_scores.parquet`
- [ ] Development log entry

## Acceptance Criteria
- Persistent overcrowding output differs from raw single-trip overcrowding count (proves the "repeated" logic actually filters one-offs).
- Route classification output is 5 clean categories, every route gets exactly one, with a documented tie-break rule.
- Each of the 10 tricky cases has a corresponding automated test in Phase 13 (note this down now).

Next: **07-delay-analysis-prediction.md**
