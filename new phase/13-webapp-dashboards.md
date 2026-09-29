# Phase 13 — Web Application (React Frontend + FastAPI Backend) & Dashboards
**Maps to SRS:** Step 50-58, Functional Req i-x, lvii-lxvi, lxx-lxxii
**Folder:** `backend/src/`, `frontend/src/`, `database/`

## Goal
Build a proper 2-tier web application: **FastAPI backend** exposing REST endpoints over all the Parquet analytics/model outputs and the database, and a **React frontend (SPA)** consuming those endpoints to render role-aware, filterable, exportable dashboards.

## Prerequisites
- Phases 1-11 complete: all Parquet analytics tables, model outputs, and recommendation JSON exist.
- **Phase 12 complete: PostgreSQL database running, `database/models.py` + Alembic migrations applied, 4 demo accounts seeded.**
- Phase 0 §4.1/4.3/4.4/4.4b done: `backend/` (FastAPI) and `frontend/` (React, via `create-react-app`) both scaffolded.

## Architecture
```
React (frontend/, port 3000)  --axios/fetch, JWT in header-->  FastAPI (backend/src, port 8000)
                                                                     |
                                                    reads Parquet (parquet_data/) + PostgreSQL (database/)
```
In development, React runs on its own dev server and calls FastAPI via full URL or a proxy (`frontend/package.json` → `"proxy": "http://localhost:8000"`). In production, either serve the React build as static files from FastAPI, or deploy them separately (Vercel for frontend, Render/Railway for backend) with CORS enabled.

## ⚠️ Originality Requirement (applies to this phase — 0% plagiarism target)
This phase's code must be checked for originality before committing:
- Do NOT paste boilerplate copied verbatim from tutorials, Stack Overflow, GitHub repos, or other teams' code. Codex-generated code is fine to use, but it must be adapted to THIS project's own schema (real column/table names from Phase 1), real config values from `config/config.yaml`, and real thresholds/logic decided for UrbanTransit IQ — not generic placeholder examples.
- Rename generic variables/functions to match this project's own naming (e.g. `route_id`, `trip_id`, `occupancy_pct`, not `data1`/`x`/`foo`).
- Add at least one project-specific comment per file explaining the logic in your own words — this both lowers plagiarism-similarity scores (project-specific code naturally does not match any other submission) and proves the team understands the code (needed for the Anti-Shortcut oral-explanation requirement).
- Declaring Codex/AI usage in `AI_USAGE.md` (Phase 15) is still mandatory and does NOT count as plagiarism — undeclared copying from another source is what plagiarism checkers and the SRS integrity rules actually penalize.

## Steps

### 13.1 FastAPI App Skeleton
Create `backend/src/main.py`:
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.routers import auth, routes, stops, vehicles, trips, dashboards, recommendations, whatif, reports, admin

app = FastAPI(title="UrbanTransit IQ API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "<your-deployed-frontend-url>"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(routes.router, prefix="/api/routes", tags=["routes"])
app.include_router(stops.router, prefix="/api/stops", tags=["stops"])
app.include_router(vehicles.router, prefix="/api/vehicles", tags=["vehicles"])
app.include_router(trips.router, prefix="/api/trips", tags=["trips"])
app.include_router(dashboards.router, prefix="/api/dashboards", tags=["dashboards"])
app.include_router(recommendations.router, prefix="/api/recommendations", tags=["recommendations"])
app.include_router(whatif.router, prefix="/api/whatif", tags=["whatif"])
app.include_router(reports.router, prefix="/api/reports", tags=["reports"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
```
Run with: `uvicorn src.main:app --reload --port 8000` (from `backend/`). Visit `http://localhost:8000/docs` — FastAPI auto-generates interactive API docs (Swagger UI), which is genuinely useful for the demo video and for evaluators.

### 13.2 Database (already set up in Phase 12 — just import it here)
The `users`, `audit_log`, `model_registry`, `recommendations`, and `saved_reports` tables already exist from Phase 12 (`database/models.py`, `database/db.py`, Alembic migrations applied, 4 accounts seeded). This phase's routers simply import `from database.db import get_db` and `from database.models import User, AuditLog, ...` and use them as a FastAPI dependency (`db: Session = Depends(get_db)`) — no new schema work needed here.

### 13.3 Authentication & Role-Based Access (Functional Req i-ii)
Backend: `backend/src/routers/auth.py` — `POST /api/auth/login` (verify password with `passlib`, issue a JWT with `python-jose` containing `{sub: username, role: ...}`), `GET /api/auth/me`. Add a `backend/src/dependencies.py` with a `get_current_user` + `require_role(["Admin", "Analyst"])` FastAPI dependency used to protect routes.

Frontend: `frontend/src/context/AuthContext.js` — stores JWT in memory/localStorage, provides `login()`, `logout()`, `user` to the whole app via React Context. `frontend/src/components/ProtectedRoute.js` — wraps routes, redirects to `/login` if not authenticated, hides/blocks admin-only routes based on `user.role`.

### 13.4 Core Entity Management Endpoints + Pages (Functional Req iii-x)
Backend: `backend/src/routers/routes.py`, `stops.py`, `vehicles.py`, `trips.py` — each exposing `GET /` (list, paginated, filterable via query params) and, for Admin/Operator roles, `POST`/`PUT`/`DELETE`. Data source: read from PostgreSQL if you loaded entity tables there, or from `parquet_data/` via Pandas for read-only browsing (simplest for a 5-day build — entities can be read-only from Parquet, only recommendations/users/audit need real DB writes).

Frontend: `frontend/src/pages/RouteManagement.jsx`, `StopManagement.jsx`, `VehicleManagement.jsx`, `TripManagement.jsx`, plus simple browse pages for Ticketing Data, Passenger Counts, Schedules, Delays — each a table component (`frontend/src/components/DataTable.jsx`, reusable) calling its matching endpoint.

### 13.5 The Six Dashboards (backend endpoint + React page, one pair per dashboard)
For each dashboard: one FastAPI endpoint returning pre-aggregated JSON (read from the relevant Parquet analytics file with Pandas, apply any filters from query params, `.to_dict(orient="records")`), and one React page rendering it with Recharts + a written insight line.

1. **Executive Dashboard** — `GET /api/dashboards/executive` → total passengers, total trips, average occupancy, average delay, on-time %, high-demand routes, overcrowded routes, underutilized routes, critical alerts. → `frontend/src/pages/ExecutiveDashboard.jsx`.
2. **Passenger Flow Dashboard** — `GET /api/dashboards/passenger-flow` (reads `od_matrix.parquet` from Phase 5) → boarding, alighting, OD flows, peak periods, route/stop demand. → `PassengerFlowDashboard.jsx`.
3. **Route Performance Dashboard** — `GET /api/dashboards/route-performance` (Phase 6 outputs) → ranking, score, delay, occupancy, reliability, demand. → `RoutePerformanceDashboard.jsx`.
4. **Delay Dashboard** — `GET /api/dashboards/delays` (Phase 7 outputs) → route/stop-wise delay, trends, severity, prediction. → `DelayDashboard.jsx`.
5. **Occupancy Dashboard** — `GET /api/dashboards/occupancy` (Phase 8 outputs) → current/historical occupancy, overcrowded routes, high-risk trips, capacity utilization. → `OccupancyDashboard.jsx`.
6. **Forecast Dashboard** — `GET /api/dashboards/forecast` (Phase 8 outputs) → historical vs forecast demand, error, future high-demand periods. → `ForecastDashboard.jsx`.

Every dashboard page must render at least one Recharts chart AND at least one written analytical conclusion/recommendation snippet returned by the backend (add an `"insight": "..."` string field to each endpoint's JSON) — SRS explicitly requires conclusions, not just charts.

### 13.6 Route Map Visualization (Step 56)
Backend: `GET /api/dashboards/route-map` → stops (lat/lon), routes, overcrowding markers, delay hotspots, flow lines, as GeoJSON-friendly JSON.
Frontend: `frontend/src/pages/RouteMap.jsx` using `react-leaflet` — `<MapContainer>`, `<Marker>` per stop (color-coded by severity), `<Polyline>` per route/flow.

### 13.7 Search & Filtering (Step 57)
Backend: every dashboard/list endpoint accepts consistent query params: `?date_from=&date_to=&route_id=&trip_id=&stop_id=&vehicle_id=&direction=&peak=&delay_level=&occupancy_level=`.
Frontend: one shared `frontend/src/components/FilterBar.jsx` component rendered on every dashboard page, whose state is lifted up and passed as query params on each API call (use `axios` with a params object, or React Query for caching).

### 13.8 What-If & Recommendation Pages
Backend: `backend/src/routers/whatif.py` → `POST /api/whatif/simulate` (body: scenario type + params) calling Phase 11's simulator functions, `backend/src/routers/recommendations.py` → `GET /api/recommendations?priority=&route_id=`.
Frontend: `WhatIfSimulator.jsx` (a form + "Run Scenario" button showing before/after estimated impact, clearly labeled "Estimated"), `Recommendations.jsx` (filterable card/table list showing full evidence per recommendation).

### 13.9 Model Comparison / Spark Job Monitoring / Audit Trail
Backend: `GET /api/dashboards/model-comparison` (Phase 10 comparison report), `GET /api/admin/spark-jobs` (parses `reports/ingestion_log.txt` and similar logs for last-run status/duration), `GET /api/admin/audit-log` (reads the `audit_log` DB table). Every admin action (recompute trigger, threshold change via API, user creation) must INSERT into `audit_log` server-side in FastAPI — never trust the frontend to log it.
Frontend: `ModelComparison.jsx`, `SparkJobStatus.jsx`, `AuditLog.jsx` (all Admin/Evaluator-role-gated via `ProtectedRoute`).

### 13.10 Error Handling (Functional Req lxx)
Backend: a global FastAPI exception handler (`@app.exception_handler(Exception)`) returning a clean JSON error `{detail: "..."}` with proper HTTP status codes, while logging the full traceback server-side to `reports/app_errors.log`.
Frontend: a global axios response interceptor (`frontend/src/api/client.js`) catching failed requests and showing a toast/banner error, never a raw crash/blank screen.

## Deliverables Checklist
- [ ] `backend/src/main.py` + all routers, runnable via `uvicorn src.main:app --reload`
- [ ] Auth (JWT) + RBAC working with ≥3 distinct roles, enforced on BOTH backend (dependency) and frontend (ProtectedRoute)
- [ ] All 8 entity-management endpoint+page pairs
- [ ] All 6 dashboard endpoint+page pairs, each with chart + written insight
- [ ] Route map page (React-Leaflet)
- [ ] Shared FilterBar component used across all dashboard pages, wired to backend query params
- [ ] What-if + Recommendations endpoint+page pairs
- [ ] Model comparison + Spark job status + audit log endpoint+page pairs
- [ ] Global error handling on both backend and frontend
- [ ] Development log entry

## Acceptance Criteria
- `uvicorn src.main:app --reload` (backend) and `npm start` (frontend) both run with no unhandled crashes on any page.
- `/docs` (FastAPI Swagger UI) lists and can successfully call every endpoint.
- Changing filters in the FilterBar actually changes the numbers shown on at least 3 dashboards (verified via Network tab — new request fired, new data rendered).
- A non-admin role genuinely cannot call admin-only endpoints (test with a direct API call using a non-admin JWT, not just by hiding the UI button) and cannot see admin-only pages in the UI.
- Dashboard endpoints respond within ~5 seconds once data is pre-aggregated (SRS performance NFR) — heavy computation must already be pre-aggregated into Parquet in earlier phases, not computed live per-request.

Next: **14-reports-testing-export.md**
