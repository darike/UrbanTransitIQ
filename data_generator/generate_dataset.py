"""
UrbanTransit IQ — Phase 1: synthetic public-transport dataset generator.

Generates the full interconnected dataset the SRS demands (2M+ ticketing
records, 500k+ trip-level passenger records, 100 routes, 500 stops, 250
vehicles, 50k passengers, 12 months, 250k+ delay records) with realistic
structure: AM/PM commuter peaks, weekday/weekend split, seasonal drift,
direction imbalance, special-event spikes, overcrowded and underutilized
routes, bottleneck stops, a chronically late vehicle — plus deliberately
planted data-quality defects (duplicates, negative counts, invalid
timestamps, unknown vehicles) that Phase 3 must detect and clean.

Run:  python data_generator/generate_dataset.py [--scale 1.0]
Deterministic for a given seed (config/config.yaml).
"""

import argparse
import json
import os
import sys
import time

import numpy as np
import pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "raw_data")
REPORTS = os.path.join(ROOT, "reports")

SEED = 20260928
START = pd.Timestamp("2025-10-01")
END = pd.Timestamp("2026-09-28")

N_ROUTES = 100
N_STOPS = 500
N_VEHICLES = 250
N_PASSENGERS = 50_000
TARGET_TICKETS = 2_050_000     # > 2M SRS minimum
TARGET_TRIPS = 510_000         # > 500k trip-level records

rng = np.random.default_rng(SEED)


# --------------------------------------------------------------------------
# static entity tables
# --------------------------------------------------------------------------
def make_routes():
    ids = [f"R{i:03d}" for i in range(1, N_ROUTES + 1)]
    areas = ["Central", "Harbor", "North", "Airport", "University", "Industrial",
             "Riverside", "Hillside", "Lakeview", "Suburb East", "Suburb West", "Old City"]
    a = rng.choice(areas, N_ROUTES)
    b = rng.choice(areas, N_ROUTES)
    # base demand is log-normal: a few heavy commuter spines, a long tail
    base_demand = np.round(np.exp(rng.normal(6.1, 0.75, N_ROUTES))).astype(int)  # trips/day-ish weight
    # planted archetypes used later by trips/counts generation
    archetype = rng.choice(
        ["high_performing", "overcrowded", "unreliable", "underutilized", "low_performing"],
        N_ROUTES, p=[0.34, 0.10, 0.18, 0.22, 0.16])
    return pd.DataFrame({
        "route_id": ids,
        "route_name": [f"{x} – {y} Line {i+1}" if x != y else f"{x} Loop {i+1}"
                       for i, (x, y) in enumerate(zip(a, b))],
        "origin_area": a,
        "destination_area": b,
        "distance_km": np.round(rng.uniform(6, 38, N_ROUTES), 1),
        "n_stops": rng.integers(10, 34, N_ROUTES),
        "scheduled_headway_min": rng.choice([6, 8, 10, 12, 15, 20], N_ROUTES),
        "base_demand": base_demand,
        "archetype": archetype,
        "status": "active",
    })


def make_stops(routes):
    ids = [f"S{i:03d}" for i in range(1, N_STOPS + 1)]
    # cluster stops around a city center (synthetic lat/lon near Karachi scale)
    lat = 24.86 + rng.normal(0, 0.045, N_STOPS)
    lon = 67.05 + rng.normal(0, 0.06, N_STOPS)
    zone = rng.choice(["Central", "North", "South", "East", "West", "Airport"], N_STOPS,
                      p=[0.28, 0.16, 0.16, 0.16, 0.16, 0.08])
    df = pd.DataFrame({
        "stop_id": ids, "stop_name": [f"Stop {i:03d}" for i in range(1, N_STOPS + 1)],
        "zone": zone, "lat": np.round(lat, 6), "lon": np.round(lon, 6),
        "has_shelter": rng.random(N_STOPS) < 0.62,
    })
    # name the 20 biggest hubs recognisably
    hub_names = ["Central Station", "Airport T1", "Tech Park Gate", "University Sq", "Harbor Point",
                 "North Terminal", "City Mall", "Industrial Zone A", "Stadium East", "Medical District",
                 "Riverside Walk", "Suburb West Hub", "Business Bay", "Convention Center", "Lakeview Pier",
                 "Old City Gate", "Green Belt Park", "Metro Link Xchg", "Hillside Top", "Suburb East Hub"]
    df.loc[:19, "stop_name"] = hub_names
    return df


def make_route_stops(routes, stops):
    rows = []
    stop_ids = stops["stop_id"].to_numpy()
    for r in routes.itertuples():
        n = int(r.n_stops)
        # hubs (first 20 stops) appear on many routes — creates bottleneck load
        n_hubs = rng.integers(1, 4)
        hubs = rng.choice(stop_ids[:20], n_hubs, replace=False)
        rest = rng.choice(stop_ids[20:], n - n_hubs, replace=False)
        seq = np.concatenate([hubs, rest])
        rng.shuffle(seq)
        for order, sid in enumerate(seq, start=1):
            rows.append((r.route_id, sid, order))
    return pd.DataFrame(rows, columns=["route_id", "stop_id", "stop_sequence"])


def make_vehicles():
    ids = [f"V{i:03d}" for i in range(1, N_VEHICLES + 1)]
    vtype = rng.choice(["standard_bus", "articulated_bus", "minibus"], N_VEHICLES, p=[0.62, 0.22, 0.16])
    cap = np.select([vtype == "standard_bus", vtype == "articulated_bus"], [60, 85], default=32)
    return pd.DataFrame({
        "vehicle_id": ids, "vehicle_type": vtype, "capacity": cap,
        "in_service_since": pd.to_datetime("2018-01-01")
        + pd.to_timedelta(rng.integers(0, 2500, N_VEHICLES), unit="D"),
        "status": np.where(rng.random(N_VEHICLES) < 0.94, "operational", "maintenance"),
    })


def make_passengers():
    ids = np.array([f"P{i:06d}" for i in range(1, N_PASSENGERS + 1)])
    segment = rng.choice(
        ["daily_commuter", "peak_traveller", "occasional", "weekend", "long_distance"],
        N_PASSENGERS, p=[0.38, 0.21, 0.18, 0.13, 0.10])
    return pd.DataFrame({
        "passenger_id": ids,
        "segment": segment,
        "home_zone": rng.choice(["Central", "North", "South", "East", "West", "Airport"], N_PASSENGERS),
        "card_type": rng.choice(["monthly_pass", "stored_value", "single"], N_PASSENGERS, p=[0.31, 0.47, 0.22]),
        "signup_date": START - pd.to_timedelta(rng.integers(0, 1400, N_PASSENGERS), unit="D"),
    })


def make_service_calendar():
    days = pd.date_range(START, END, freq="D")
    df = pd.DataFrame({"service_date": days})
    df["day_of_week"] = df["service_date"].dt.dayofweek
    df["is_weekend"] = df["day_of_week"] >= 5
    holidays = pd.to_datetime([
        "2025-12-25", "2026-01-01", "2026-03-23", "2026-03-30", "2026-03-31",
        "2026-05-01", "2026-06-07", "2026-08-14",
    ])
    events = pd.to_datetime(["2025-11-15", "2026-02-21", "2026-04-18", "2026-09-26"])
    df["is_holiday"] = df["service_date"].isin(holidays)
    df["special_event"] = np.where(df["service_date"].isin(events), "stadium_event", "")
    return df


# --------------------------------------------------------------------------
# trips (trip-level records) — the operational backbone
# --------------------------------------------------------------------------
HOUR_W_WEEKDAY = np.array([  # relative departure weight per hour 0..23
    0.2, 0.1, 0.1, 0.2, 0.8, 2.2, 4.5, 7.5, 8.5, 5.0, 3.4, 3.2,
    3.4, 3.3, 3.4, 4.2, 6.0, 8.0, 7.2, 4.6, 3.0, 2.0, 1.2, 0.6])
HOUR_W_WEEKEND = np.array([
    0.3, 0.2, 0.1, 0.1, 0.3, 0.8, 1.5, 2.2, 3.0, 3.8, 4.4, 4.8,
    4.9, 4.8, 4.6, 4.4, 4.2, 4.0, 3.8, 3.2, 2.6, 1.9, 1.2, 0.7])


def make_trips(routes, vehicles, calendar):
    """Vectorised: allocate TARGET_TRIPS trips across route×day by demand weight."""
    cal = calendar.copy()
    n_days = len(cal)
    r = routes.set_index("route_id")
    route_ids = r.index.to_numpy()

    # route weight × day weight -> expected trips matrix
    route_w = r["base_demand"].to_numpy(float)
    route_w = route_w / route_w.sum()
    day_w = np.where(cal["is_weekend"], 0.62, 1.0) * np.where(cal["is_holiday"], 0.45, 1.0)
    seasonal = 1 + 0.14 * np.sin(np.linspace(0, 2 * np.pi, n_days))          # seasonality
    growth = np.linspace(0.88, 1.26, n_days)                                  # strong ridership growth
    payday = np.where(cal["service_date"].dt.day <= 3, 1.09, 1.0)             # start-of-month spike
    event = np.where(cal["special_event"] != "", 1.22, 1.0)                   # stadium events
    day_w = day_w * seasonal * growth * payday * event
    day_w = day_w / day_w.sum()

    counts = rng.multinomial(TARGET_TRIPS, np.outer(route_w, day_w).ravel())
    idx = np.nonzero(counts)[0]
    reps = counts[idx]
    route_idx = idx // n_days
    day_idx = idx % n_days

    route_rep = np.repeat(route_ids[route_idx], reps)
    date_rep = np.repeat(cal["service_date"].to_numpy()[day_idx], reps)
    weekend_rep = np.repeat(cal["is_weekend"].to_numpy()[day_idx], reps)

    n = len(route_rep)
    hour_w = np.where(weekend_rep[:, None], HOUR_W_WEEKEND, HOUR_W_WEEKDAY)
    hour = (hour_w.cumsum(1) / hour_w.sum(1, keepdims=True) > rng.random(n)[:, None]).argmax(1)
    minute = rng.integers(0, 60, n)

    arche = np.repeat(r["archetype"].to_numpy()[route_idx], reps)
    dist = np.repeat(r["distance_km"].to_numpy()[route_idx], reps)
    sched_travel = np.round(dist * rng.uniform(1.8, 2.4, n) + 8)

    # ---- delay model: strongly conditioned on route × hour × day (realistic:
    #      congestion patterns, not coin flips, create delays) + moderate noise
    dow = pd.DatetimeIndex(date_rep).dayofweek
    congestion = (1.0
                  + 2.7 * np.exp(-((hour - 8.3) ** 2) / 2.2)
                  + 3.2 * np.exp(-((hour - 17.8) ** 2) / 2.6))
    congestion = np.where(weekend_rep, 0.8, congestion)
    dow_factor = np.where(dow == 4, 1.35, np.where(dow == 0, 1.12, 1.0))
    arche_factor = np.select(
        [arche == "unreliable", arche == "low_performing", arche == "overcrowded"],
        [2.6, 2.1, 1.6], default=0.8)
    # stable per-route idiosyncrasy (same route always a bit better/worse)
    route_noise = rng.uniform(0.7, 1.4, len(route_ids))
    route_factor = np.repeat(route_noise[route_idx], reps)

    mean_delay = 1.1 * congestion * dow_factor * arche_factor * route_factor
    delay_min = np.round(mean_delay * np.exp(rng.normal(0, 0.15, n)), 1)
    early = rng.random(n) < 0.05
    delay_min = np.where(early, -np.round(rng.uniform(0.5, 3, n), 1), delay_min)

    veh_pool = vehicles["vehicle_id"].to_numpy()
    vehicle = veh_pool[rng.integers(0, len(veh_pool), n)]
    delay_min = np.where(vehicle == "V118", delay_min + 6.8, delay_min)        # chronically late vehicle

    direction = np.where(rng.random(n) < 0.5, "inbound", "outbound")
    cancelled = rng.random(n) < 0.012

    dep_sched = pd.DatetimeIndex(date_rep) + pd.to_timedelta(hour * 60 + minute, unit="m")
    dep_actual = dep_sched + pd.to_timedelta((delay_min * 0.4).round(1), unit="m")
    arr_sched = dep_sched + pd.to_timedelta(sched_travel, unit="m")
    arr_actual = arr_sched + pd.to_timedelta(delay_min, unit="m")

    trips = pd.DataFrame({
        "trip_id": [f"T{i:07d}" for i in range(1, n + 1)],
        "route_id": route_rep,
        "vehicle_id": vehicle,
        "direction": direction,
        "service_date": pd.DatetimeIndex(date_rep).date,
        "sched_departure": dep_sched,
        "actual_departure": dep_actual,
        "sched_arrival": arr_sched,
        "actual_arrival": arr_actual,
        "sched_travel_min": sched_travel,
        "delay_min": delay_min,
        "status": np.where(cancelled, "cancelled", "completed"),
    })
    return trips


def plant_trip_defects(trips):
    """Deliberate defects Phase 3 must catch (fractions from config)."""
    n = len(trips)
    # invalid timestamps
    bad_ts = rng.choice(n, int(n * 0.0012), replace=False)
    trips.loc[bad_ts, "actual_arrival"] = pd.NaT
    # departure recorded after arrival (swapped)
    swap = rng.choice(n, int(n * 0.0010), replace=False)
    trips.loc[swap, ["actual_departure", "actual_arrival"]] = \
        trips.loc[swap, ["actual_arrival", "actual_departure"]].to_numpy()
    # unknown vehicles
    ghost = rng.choice(n, int(n * 0.0002), replace=False)
    trips.loc[ghost, "vehicle_id"] = "V999"
    # duplicate trips
    dup = trips.sample(int(n * 0.001), random_state=SEED)
    return pd.concat([trips, dup], ignore_index=True)


# --------------------------------------------------------------------------
# passenger counts per trip (occupancy) + tickets + delays + gps
# --------------------------------------------------------------------------
def make_passenger_counts(trips, routes, vehicles):
    t = trips[trips["status"] == "completed"].copy()
    r = routes.set_index("route_id")
    v = vehicles.set_index("vehicle_id")["capacity"]

    arche = r["archetype"].reindex(t["route_id"]).to_numpy()
    cap = v.reindex(t["vehicle_id"]).fillna(60).to_numpy()

    hour = pd.DatetimeIndex(t["sched_departure"]).hour
    weekend = pd.DatetimeIndex(t["sched_departure"]).dayofweek >= 5
    peak = ((hour >= 7) & (hour <= 9)) | ((hour >= 17) & (hour <= 19))

    base_occ = rng.normal(0.55, 0.16, len(t))
    base_occ *= np.select(
        [arche == "overcrowded", arche == "high_performing", arche == "underutilized", arche == "low_performing"],
        [1.75, 1.25, 0.55, 0.6], default=1.0)
    base_occ *= np.where(peak & ~weekend, 1.45, 1.0)
    base_occ *= np.where(weekend, 0.72, 1.0)
    # direction imbalance: inbound heavier in AM, outbound in PM
    inbound = (t["direction"] == "inbound").to_numpy()
    base_occ *= np.where(inbound & (hour < 12), 1.18, 1.0)
    base_occ *= np.where(~inbound & (hour >= 15), 1.18, 1.0)
    occ = np.clip(base_occ, 0.03, 1.45)                      # >1.0 = genuine overcrowding (kept)

    boarded = np.maximum((occ * cap).round(), 1).astype(int)
    alighted = np.round(boarded * rng.uniform(0.92, 1.0, len(t))).astype(int)

    pc = pd.DataFrame({
        "count_id": [f"C{i:07d}" for i in range(1, len(t) + 1)],
        "trip_id": t["trip_id"].to_numpy(),
        "boarded": boarded,
        "alighted": alighted,
        "peak_load": boarded,
        "capacity": cap.astype(int),
        "occupancy_pct": np.round(occ * 100, 1),
    })
    # defect: negative counts
    neg = rng.choice(len(pc), int(len(pc) * 0.0004), replace=False)
    pc.loc[neg, "boarded"] = -pc.loc[neg, "boarded"]
    return pc


def make_tickets(trips, pc, passengers, calendar, out_path):
    """~2.05M ticket rows, written in chunks to keep memory flat."""
    t = trips[trips["status"] == "completed"][["trip_id", "route_id", "sched_departure"]].merge(
        pc[["trip_id", "boarded"]], on="trip_id", how="inner")
    # scale boarded so total tickets ≈ TARGET_TICKETS
    factor = TARGET_TICKETS / t["boarded"].clip(lower=0).sum()
    t["n_tix"] = np.maximum((t["boarded"].clip(lower=0) * factor).round(), 0).astype(int)
    total = int(t["n_tix"].sum())

    pax = passengers["passenger_id"].to_numpy()
    fares = np.array([30, 40, 50, 65, 80])

    header = True
    written = 0
    tid0 = 1
    CH = 60  # chunks of trip-groups
    groups = np.array_split(t.index.to_numpy(), CH)
    for g in groups:
        sub = t.loc[g]
        reps = sub["n_tix"].to_numpy()
        n = int(reps.sum())
        if n == 0:
            continue
        trip_rep = np.repeat(sub["trip_id"].to_numpy(), reps)
        route_rep = np.repeat(sub["route_id"].to_numpy(), reps)
        dep_rep = np.repeat(sub["sched_departure"].to_numpy(), reps)
        offs = rng.integers(-15, 4, n)  # ticket scan around departure
        ts = pd.DatetimeIndex(dep_rep) + pd.to_timedelta(offs, unit="m")
        df = pd.DataFrame({
            "ticket_id": [f"K{i:08d}" for i in range(tid0, tid0 + n)],
            "passenger_id": pax[rng.integers(0, len(pax), n)],
            "trip_id": trip_rep,
            "route_id": route_rep,
            "scan_time": ts,
            "fare": fares[rng.integers(0, len(fares), n)],
            "channel": rng.choice(["card_tap", "mobile_app", "counter"], n, p=[0.58, 0.3, 0.12]),
        })
        # defects: missing route ids + duplicate scans
        miss = rng.choice(n, max(int(n * 0.002), 1), replace=False)
        df.loc[miss, "route_id"] = ""
        dup = df.sample(max(int(n * 0.004), 1), random_state=SEED + tid0)
        dup = dup.assign(scan_time=dup["scan_time"] + pd.Timedelta(seconds=45))
        df = pd.concat([df, dup], ignore_index=True)

        df.to_csv(out_path, mode="a" if not header else "w", header=header, index=False)
        header = False
        written += len(df)
        tid0 += n
    return written


def make_delays(trips):
    d = trips[(trips["delay_min"] > 2) & (trips["status"] == "completed")].copy()
    reasons = np.array(["traffic_congestion", "signal_issue", "boarding_surge",
                        "vehicle_issue", "road_blockage", "weather"])
    p = np.array([0.42, 0.14, 0.2, 0.1, 0.08, 0.06])
    return pd.DataFrame({
        "delay_id": [f"D{i:07d}" for i in range(1, len(d) + 1)],
        "trip_id": d["trip_id"].to_numpy(),
        "route_id": d["route_id"].to_numpy(),
        "delay_min": d["delay_min"].to_numpy(),
        "reason": reasons[rng.choice(len(reasons), len(d), p=p)],
        "recorded_at": d["actual_arrival"].to_numpy(),
    })


def make_gps_sample(trips):
    """A sample of AVL pings (full stream would be huge; sample is representative)."""
    t = trips.sample(min(40_000, len(trips)), random_state=SEED)
    n = len(t)
    return pd.DataFrame({
        "event_id": [f"G{i:07d}" for i in range(1, n + 1)],
        "trip_id": t["trip_id"].to_numpy(),
        "vehicle_id": t["vehicle_id"].to_numpy(),
        "ts": t["sched_departure"].to_numpy(),
        "lat": np.round(24.86 + rng.normal(0, 0.05, n), 6),
        "lon": np.round(67.05 + rng.normal(0, 0.065, n), 6),
        "speed_kmh": np.round(np.clip(rng.normal(26, 9, n), 0, 70), 1),
    })


# --------------------------------------------------------------------------
def main(scale: float):
    global TARGET_TICKETS, TARGET_TRIPS
    TARGET_TICKETS = int(TARGET_TICKETS * scale)
    TARGET_TRIPS = int(TARGET_TRIPS * scale)
    os.makedirs(RAW, exist_ok=True)
    os.makedirs(REPORTS, exist_ok=True)
    t0 = time.time()
    log = {}

    routes = make_routes();            routes.to_csv(f"{RAW}/routes.csv", index=False)
    stops = make_stops(routes);        stops.to_csv(f"{RAW}/stops.csv", index=False)
    rs = make_route_stops(routes, stops); rs.to_csv(f"{RAW}/route_stops.csv", index=False)
    vehicles = make_vehicles();        vehicles.to_csv(f"{RAW}/vehicles.csv", index=False)
    passengers = make_passengers();    passengers.to_csv(f"{RAW}/passengers.csv", index=False)
    calendar = make_service_calendar(); calendar.to_csv(f"{RAW}/service_calendar.csv", index=False)
    print(f"[gen] entities done {time.time()-t0:.0f}s")

    trips = make_trips(routes, vehicles, calendar)
    trips = plant_trip_defects(trips)
    trips.to_csv(f"{RAW}/trips.csv", index=False)
    log["trips"] = len(trips)
    print(f"[gen] trips {len(trips):,} {time.time()-t0:.0f}s")

    pc = make_passenger_counts(trips, routes, vehicles)
    pc.to_csv(f"{RAW}/passenger_counts.csv", index=False)
    log["passenger_counts"] = len(pc)
    print(f"[gen] passenger_counts {len(pc):,} {time.time()-t0:.0f}s")

    n_tix = make_tickets(trips, pc, passengers, calendar, f"{RAW}/tickets.csv")
    log["tickets"] = n_tix
    print(f"[gen] tickets {n_tix:,} {time.time()-t0:.0f}s")

    delays = make_delays(trips)
    delays.to_json(f"{RAW}/delays.json", orient="records", lines=True, date_format="iso")
    log["delays"] = len(delays)

    gps = make_gps_sample(trips)
    gps.to_csv(f"{RAW}/gps_events.csv", index=False)

    # schedules: one row per route×weekday summary (headway plan)
    sched = routes[["route_id", "scheduled_headway_min"]].copy()
    sched["first_departure"] = "05:30"
    sched["last_departure"] = "23:30"
    sched.to_csv(f"{RAW}/schedules.csv", index=False)

    log.update({"routes": len(routes), "stops": len(stops), "vehicles": len(vehicles),
                "passengers": len(passengers), "days": len(calendar),
                "elapsed_sec": round(time.time() - t0, 1)})
    with open(f"{REPORTS}/dataset_stats.json", "w") as f:
        json.dump(log, f, indent=2)
    print("[gen] DONE", json.dumps(log, indent=2))


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--scale", type=float, default=1.0,
                    help="record-count multiplier (1.0 = full SRS scale)")
    main(ap.parse_args().scale)
