# Phase 11 — Recommendation Engine & What-If Scenario Analysis
**Maps to SRS:** Step 45-47 (Recommendation Engine/Evidence/Priority), Step 48-49 (What-If + Scenario Impact)
**Folder:** `recommendation_engine/`

## Goal
Turn all prior analysis into actionable, evidence-backed operational recommendations with priority levels, plus an interactive what-if simulator.

## Prerequisites
- Phases 6-9 complete (route scores, delay patterns, capacity gaps, bunching, underutilization all available).

## ⚠️ Originality Requirement (applies to this phase — 0% plagiarism target)
This phase's code must be checked for originality before committing:
- Do NOT paste boilerplate copied verbatim from tutorials, Stack Overflow, GitHub repos, or other teams' code. Codex-generated code is fine to use, but it must be adapted to THIS project's own schema (real column/table names from Phase 1), real config values from `config/config.yaml`, and real thresholds/logic decided for UrbanTransit IQ — not generic placeholder examples.
- Rename generic variables/functions to match this project's own naming (e.g. `route_id`, `trip_id`, `occupancy_pct`, not `data1`/`x`/`foo`).
- Add at least one project-specific comment per file explaining the logic in your own words — this both lowers plagiarism-similarity scores (project-specific code naturally does not match any other submission) and proves the team understands the code (needed for the Anti-Shortcut oral-explanation requirement).
- Declaring Codex/AI usage in `AI_USAGE.md` (Phase 15) is still mandatory and does NOT count as plagiarism — undeclared copying from another source is what plagiarism checkers and the SRS integrity rules actually penalize.

## Steps

### 11.1 Recommendation Rule Engine
Create `recommendation_engine/01_rules.py` — a rule-based engine (NOT a black box) that scans the analytics outputs and generates recommendations such as:
- Increase frequency on overloaded route/time-window (trigger: persistent overcrowding from Phase 6.2)
- Reduce underutilized trips (trigger: underutilization flag from Phase 6.3)
- Modify schedule around recurrent delays (trigger: delay pattern from Phase 7.2)
- Allocate higher-capacity vehicle (trigger: capacity optimization from Phase 9.10)
- Investigate bottleneck stop (trigger: bottleneck score from Phase 9.2)
- Adjust departure time (trigger: schedule-mismatch tricky case from Phase 6.6 #10)
- Improve spacing between vehicles (trigger: bunching events from Phase 9.7)

### 11.2 Recommendation Evidence
Every recommendation record MUST include the supporting numbers, following this exact shape (from the SRS example):
```json
{
  "recommendation_id": "REC-0001",
  "action": "Increase Route R12 frequency between 08:00 and 09:00",
  "reason": {
    "average_occupancy_pct": 94,
    "critical_occupancy_events": 18,
    "passenger_demand_growth_pct": 21,
    "average_headway_min": 17,
    "pattern": "Repeated overload observed on weekdays"
  },
  "priority": "High",
  "route_id": "R12",
  "generated_on": "2026-09-23"
}
```
Never output a recommendation without a populated `reason` object.

### 11.3 Recommendation Priority
Create `recommendation_engine/02_priority.py` — assign Low / Medium / High / Critical based on passenger impact (e.g. # passengers affected) × operational severity (e.g. how far occupancy/delay exceeds threshold). Document the exact scoring formula in `documentation/recommendation_priority_logic.md`.

### 11.4 What-If Scenario Analysis
Create `recommendation_engine/03_whatif_simulator.py` — a function-based simulator (this will be wired to the web UI in Phase 12) supporting:
- Increase/decrease route frequency
- Add a vehicle
- Change vehicle capacity
- Shift trip start time
- Remove a low-demand trip
- Add a new stop
- Increase predicted demand (manual override for scenario testing)

### 11.5 Scenario Impact Analysis
Create `recommendation_engine/04_scenario_impact.py` — given a what-if input, estimate the effect on: occupancy, passenger load, waiting time, route capacity, demand coverage, overcrowding risk. Every output must be clearly labeled as an **ESTIMATE** (e.g. prefix all simulated fields with `estimated_` and show a disclaimer string in the returned object/UI).

## Deliverables Checklist
- [ ] `recommendation_engine/01_rules.py` generating evidence-backed recommendations
- [ ] `recommendation_engine/02_priority.py`
- [ ] `recommendation_engine/03_whatif_simulator.py`
- [ ] `recommendation_engine/04_scenario_impact.py`
- [ ] `documentation/recommendation_priority_logic.md`
- [ ] `reports/recommendations.json` (sample output, ≥20 recommendations across categories)
- [ ] Development log entry

## Acceptance Criteria
- 100% of generated recommendations have a non-empty `reason` with real numbers pulled from the analytics tables (no placeholder/fabricated values — this is an explicit disqualification risk per the SRS).
- What-if simulator returns different impact estimates for different inputs (not a static canned response).
- Every simulated/estimated value is visibly labeled as an estimate.

Next: **12-database-setup.md**
