# Phase 14 — Reports, Data Export, Testing, Diagrams, Data Dictionary
**Maps to SRS:** Step 59-65 (Search/Reports/Export/DB/Model Tracking/Audit/Error Handling — cross-check), Deliverables #1, #9; Functional Req lxiv-lxvi
**Folder:** `reports/`, `tests/`, `documentation/`

## Goal
Produce every downloadable report the SRS requires, a full automated test suite covering every layer, and finish the formal documentation (diagrams, data dictionary) needed for the Project Report deliverable.

## Prerequisites
- Phases 1-13 complete.

## ⚠️ Originality Requirement (applies to this phase — 0% plagiarism target)
This phase's code must be checked for originality before committing:
- Do NOT paste boilerplate copied verbatim from tutorials, Stack Overflow, GitHub repos, or other teams' code. Codex-generated code is fine to use, but it must be adapted to THIS project's own schema (real column/table names from Phase 1), real config values from `config/config.yaml`, and real thresholds/logic decided for UrbanTransit IQ — not generic placeholder examples.
- Rename generic variables/functions to match this project's own naming (e.g. `route_id`, `trip_id`, `occupancy_pct`, not `data1`/`x`/`foo`).
- Add at least one project-specific comment per file explaining the logic in your own words — this both lowers plagiarism-similarity scores (project-specific code naturally does not match any other submission) and proves the team understands the code (needed for the Anti-Shortcut oral-explanation requirement).
- Declaring Codex/AI usage in `AI_USAGE.md` (Phase 15) is still mandatory and does NOT count as plagiarism — undeclared copying from another source is what plagiarism checkers and the SRS integrity rules actually penalize.

## Steps

### 13.1 Downloadable Reports & Export (Step 58, Functional Req lxv-lxvi)
Backend: create `backend/src/routers/reports.py` with endpoints like `GET /api/reports/{report_type}?format=csv|pdf` that return a `StreamingResponse`/`FileResponse` (CSV via `pandas.to_csv()` into an in-memory buffer, PDF via `reportlab`/`fpdf`). Frontend: `frontend/src/pages/ReportsExport.jsx` — a page listing all report types with format-choice buttons that trigger a file download (`axios` with `responseType: 'blob'`, then create an object URL). Cover CSV/PDF export of:
- Passenger demand report
- Route performance report
- Delay report
- Occupancy report
- Stop performance report
- Forecasting report
- Route clustering report
- Recommendations report
- Spark vs Python comparison report
Use `pandas.DataFrame.to_csv()` for CSV and a simple `reportlab`/`fpdf` or `pdfkit` export for PDF versions.

### 13.2 Transport Intelligence Report (Deliverable #8)
Assemble `reports/transport_intelligence_report.md` — busiest routes, low-performing routes, overcrowded routes, underutilized routes, peak periods, most delayed/reliable routes, passenger-flow patterns, bottleneck stops, demand forecasts, crowding risk, route clusters, service gaps, schedule recommendations. This is a synthesis document pulling from every earlier phase's output — mostly assembling what already exists, formatted for a non-technical reader (transport authority stakeholder).

### 13.3 Full Test Suite (`tests/`, pytest)
Write tests covering EVERY category the SRS lists — do not skip any:
- `test_functional.py` — key app flows (login, page loads per role)
- `test_integration.py` — end-to-end: raw data → cleaned → featured → scored, on a small sample
- `test_bigdata_ingestion.py` — schema match, row counts, Parquet round-trip
- `test_schema.py` — explicit schema validation catches a deliberately malformed row
- `test_data_quality.py` — each of the 15 quality-issue detectors fires on a crafted bad-data fixture
- `test_spark_jobs.py` — smoke-test each Spark job runs on a tiny sample without error
- `test_spark_sql.py` — each join/view returns expected row counts on a fixture
- `test_models.py` — both Spark and Python models load and predict on a sample input
- `test_forecast.py` — forecast evaluation metrics computed correctly on known synthetic series
- `test_delay.py` — delay severity classification thresholds work correctly at boundary values
- `test_occupancy.py` — occupancy categorization (Low/Moderate/High/Overcrowded/Critical) correct at boundaries
- `test_route.py` — route classification logic, including all 10 tricky cases from Phase 6.6 as individual test cases
- `test_stop.py` — bottleneck/stop performance calculations on fixture data
- `test_dual_pipeline.py` — comparison report generates ≥ expected row count, agreement % computed correctly
- `test_anomaly.py` — injected synthetic anomaly is detected
- `test_hidden_data_readiness.py` — pipeline doesn't crash when given a CSV with an unexpected new route_id/stop_id/vehicle_id it hasn't seen (important — evaluators WILL feed hidden data with new entities per Step 6/7 of Competition Integrity)
- `test_security.py` — unauthenticated access to protected pages is blocked; role restrictions enforced
- `test_boundary.py` — edge cases (0 passengers, max capacity exactly, delay = 0, empty date range filters)

Run: `pytest tests/ -v --tb=short > reports/test_results.txt`

### 13.4 Diagrams (Project Report requirement)
Create in `documentation/diagrams/` (Mermaid syntax is fine, exported to PNG or kept as .md with mermaid blocks):
- Entity Relationship Diagram (all 12+ tables, PK/FK)
- Data Flow Diagram (raw data → HDFS → Spark → Parquet → analytics → dashboards)
- Use Case Diagram (Admin/Operator/Analyst/Evaluator × system functions)
- Activity Diagram (e.g. "generate recommendation" end-to-end flow)
- Sequence Diagram (e.g. user requests dashboard → app queries DB/Parquet → renders)

### 13.5 Finalize Data Dictionary
Update `documentation/data_dictionary.md` (started in Phase 1) with every derived/feature column from Phase 4 onward — not just raw tables.

## Deliverables Checklist
- [ ] `backend/src/routers/reports.py` + `frontend/src/pages/ReportsExport.jsx` — all 9 report types exportable (CSV + PDF)
- [ ] `reports/transport_intelligence_report.md`
- [ ] Full `tests/` suite (18 files above), `reports/test_results.txt`
- [ ] `documentation/diagrams/` (ERD, DFD, Use Case, Activity, Sequence)
- [ ] `documentation/data_dictionary.md` finalized
- [ ] Development log entry

## Acceptance Criteria
- `pytest tests/` passes (or failures are understood, documented, and being actively fixed — not silently ignored).
- Every one of the 10 tricky route cases (Phase 6.6) has a passing test.
- `test_hidden_data_readiness.py` specifically proves your pipeline won't crash on Day-of-evaluation hidden data with new IDs.

Next: **15-deployment-docs-submission.md**
