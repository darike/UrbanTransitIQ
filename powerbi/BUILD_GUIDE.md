# Power BI report — 10-minute build guide

Everything is pre-built: clean star-schema CSVs in `powerbi/data/` and DAX in
`powerbi/measures.dax`. You only click. (SRS lists Power BI as a visualization tool.)

## 0. Install (once)
Power BI Desktop — free: https://aka.ms/pbidesktop (or Microsoft Store → "Power BI Desktop").
A free Microsoft account is needed only for the final "Publish" step.

## 1. Load the data (2 min)
1. Open Power BI Desktop → **Home → Get data → Text/CSV**.
2. Import all six files from `powerbi/data/`:
   `fact_trips.csv`, `dim_route.csv`, `dim_stop.csv`, `dim_vehicle.csv`,
   `dim_date.csv`, `fact_forecast.csv`. (Load each; click **Load**.)

## 2. Relationships (1 min)
Go to **Model view**. Draw these (drag field → field) if not auto-created:
- `fact_trips[route_id]` → `dim_route[route_id]`
- `fact_trips[vehicle_id]` → `dim_vehicle[vehicle_id]`
- `fact_trips[date]` → `dim_date[date]`
All are many-to-one (fact → dimension). Single direction is fine.

## 3. Measures (2 min)
Select **fact_trips** → **Modeling → New measure** → paste each block from
`powerbi/measures.dax` (one measure at a time): Total Passengers, Total Trips,
Avg Occupancy %, Avg Delay (min), On-Time %, Overcrowded Trips, Peak Passengers.

## 4. Build the page (4 min) — a clean "Transit Overview"
Add these visuals from the Visualizations pane:

| Visual | Field wells |
|---|---|
| **5 Card visuals** (top row) | one measure each: Total Passengers, Total Trips, Avg Occupancy %, Avg Delay (min), On-Time % |
| **Clustered column** — demand by hour | Axis `fact_trips[dep_hour]`, Values `Total Passengers` |
| **Line chart** — actual vs forecast | Axis `fact_forecast[service_date]`, Values `value`, Legend `kind` |
| **Bar chart** — top routes | Axis `dim_route[route_name]`, Values `dim_route[demand]`, filter Top N = 10 |
| **Donut** — occupancy bands | Legend `fact_trips[occ_band]`, Values `Total Trips` |
| **Map** — stops | Location `dim_stop[stop_name]` (or lat/lon if present), Size `dim_stop[boardings]` |
| **Slicer** — date | Field `dim_date[month_name]` |

Theme: **View → Themes → pick a dark theme** to match the app.

## 5. Publish & embed (1 min)
1. **Home → Publish** → sign in → pick "My workspace".
2. In the browser (app.powerbi.com) open the report →
   **File → Embed report → Publish to web (public)** → copy the link.
3. In UrbanTransit IQ: sign in → **Power BI** page → paste the link →
   **Embed report**. Done — it renders inside the app and the link is saved.

> If your org blocks "Publish to web", use **File → Embed report → Website or
> portal** (secure embed) instead; the app's iframe still displays it for signed-in
> viewers. Either way, screenshot the report for the submission `screenshots/`.

## Data recap (already generated for you)
fact_trips 120,000 rows · dim_route 100 · dim_stop 497 · dim_vehicle 250 ·
dim_date 363 · fact_forecast 84 — all from the real pipeline output.
