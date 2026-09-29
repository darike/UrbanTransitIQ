/* Geographic layer for the live network map.
   Coordinates approximate a Karachi-scale metro area; in production these
   come from the Stops/Routes tables (lat/lon) via GET /api/dashboards/route-map. */

export const MAP_CENTER = [24.878, 67.06]
export const MAP_ZOOM = 12

export const geoStops = [
  { id: 'S001', name: 'Central Station', pos: [24.86, 67.01], size: 3, delay: 12.4, demand: 96000, boarding: 96000 },
  { id: 'S002', name: 'Airport T1', pos: [24.9, 67.155], size: 2, delay: 4.2, demand: 61000 },
  { id: 'S003', name: 'Tech Park Gate', pos: [24.851, 67.038], size: 2, delay: 10.9, demand: 72000 },
  { id: 'S004', name: 'University Sq', pos: [24.937, 67.12], size: 2, delay: 5.5, demand: 54000 },
  { id: 'S005', name: 'Harbor Point', pos: [24.846, 66.976], size: 2, delay: 8.1, demand: 38000 },
  { id: 'S006', name: 'North Terminal', pos: [24.936, 67.036], size: 2, delay: 9.7, demand: 47000 },
  { id: 'S007', name: 'City Mall', pos: [24.893, 67.028], size: 1, delay: 6.8, demand: 43000 },
  { id: 'S008', name: 'Industrial Zone A', pos: [24.848, 67.176], size: 1, delay: 7.2, demand: 29000 },
  { id: 'S009', name: 'Stadium East', pos: [24.892, 67.079], size: 1, delay: 3.9, demand: 31000 },
  { id: 'S010', name: 'Medical District', pos: [24.822, 67.045], size: 1, delay: 3.1, demand: 26000 },
  { id: 'S011', name: 'Business Bay', pos: [24.813, 67.03], size: 1, delay: 5.9, demand: 35000 },
  { id: 'S012', name: 'Suburb West Hub', pos: [24.87, 66.94], size: 1, delay: 4.4, demand: 22000 },
  { id: 'S013', name: 'Old City Gate', pos: [24.852, 67.01], size: 1, delay: 6.1, demand: 30000 },
  { id: 'S014', name: 'Lakeview Pier', pos: [24.802, 67.062], size: 1, delay: 2.8, demand: 15000 },
  { id: 'S015', name: 'Hillside Top', pos: [24.913, 67.098], size: 1, delay: 8.8, demand: 14000 },
  { id: 'S016', name: 'Malir Junction', pos: [24.893, 67.19], size: 1, delay: 6.4, demand: 19000 },
]

const S = Object.fromEntries(geoStops.map((s) => [s.id, s.pos]))

/* Each route: ordered coordinates (stops + shaping waypoints), load 0-1, color slot */
export const geoRoutes = [
  {
    id: 'R12', name: 'Central Station – Industrial Zone', load: 0.94, occupancy: 94,
    path: [S.S001, [24.856, 67.024], S.S003, [24.845, 67.09], [24.842, 67.13], S.S008],
  },
  {
    id: 'R01', name: 'Central Station – Airport Express', load: 0.86, occupancy: 88,
    path: [S.S001, [24.868, 67.03], [24.878, 67.06], [24.885, 67.1], [24.893, 67.13], S.S002],
  },
  {
    id: 'R07', name: 'Harbor Line – University', load: 0.88, occupancy: 91,
    path: [S.S005, [24.85, 66.995], S.S013, [24.87, 67.02], S.S007, [24.912, 67.03], S.S006, [24.94, 67.08], S.S004],
  },
  {
    id: 'R04', name: 'Old City – Tech Park', load: 0.58, occupancy: 76,
    path: [S.S013, [24.851, 67.025], S.S003],
  },
  {
    id: 'R24', name: 'City Loop Clockwise', load: 0.83, occupancy: 83,
    path: [S.S001, [24.875, 67.005], [24.9, 67.015], S.S006, [24.925, 67.07], S.S015, [24.9, 67.085], S.S009, [24.87, 67.06], [24.858, 67.03], S.S001],
  },
  {
    id: 'R09', name: 'North Terminal – Mall Circuit', load: 0.52, occupancy: 71,
    path: [S.S006, [24.915, 67.032], S.S007, [24.885, 67.055], S.S009],
  },
  {
    id: 'R18', name: 'Riverside – Medical District', load: 0.42, occupancy: 49,
    path: [S.S001, [24.84, 67.02], S.S010, [24.81, 67.055], S.S014],
  },
  {
    id: 'R21', name: 'Metro Link – Suburb West', load: 0.55, occupancy: 66,
    path: [S.S012, [24.9, 66.97], [24.925, 67.0], S.S006, [24.94, 67.08], S.S004],
  },
  {
    id: 'R15', name: 'Green Belt – Stadium', load: 0.38, occupancy: 58,
    path: [S.S007, [24.895, 67.055], S.S009, [24.88, 67.12], [24.86, 67.15], S.S008],
  },
  {
    id: 'R31', name: 'Hillside – Convention Center', load: 0.4, occupancy: 41,
    path: [S.S015, [24.9, 67.13], S.S016, [24.9, 67.17], S.S002],
  },
  {
    id: 'R27', name: 'Suburb East – Business Bay', load: 0.6, occupancy: 62,
    path: [S.S016, [24.87, 67.16], [24.85, 67.12], [24.83, 67.08], S.S011],
  },
  {
    id: 'R35', name: 'Lakeview – Central Station', load: 0.32, occupancy: 38,
    path: [S.S014, [24.815, 67.045], S.S011, [24.83, 67.02], [24.845, 67.012], S.S001],
  },
]

/* live vehicles: which route they run, speed (fraction of path per tick) */
export const liveVehicles = [
  { id: 'V-034', route: 'R12', t: 0.1, speed: 0.004, occ: 96 },
  { id: 'V-051', route: 'R12', t: 0.55, speed: 0.0038, occ: 88 },
  { id: 'V-008', route: 'R01', t: 0.3, speed: 0.0035, occ: 74 },
  { id: 'V-102', route: 'R07', t: 0.7, speed: 0.0032, occ: 91 },
  { id: 'V-063', route: 'R07', t: 0.25, speed: 0.0033, occ: 68 },
  { id: 'V-077', route: 'R24', t: 0.45, speed: 0.003, occ: 81 },
  { id: 'V-120', route: 'R24', t: 0.9, speed: 0.003, occ: 62 },
  { id: 'V-045', route: 'R09', t: 0.6, speed: 0.0042, occ: 55 },
  { id: 'V-018', route: 'R18', t: 0.35, speed: 0.0036, occ: 41 },
  { id: 'V-095', route: 'R21', t: 0.15, speed: 0.0034, occ: 58 },
  { id: 'V-118', route: 'R27', t: 0.5, speed: 0.0026, occ: 52, late: true },
  { id: 'V-029', route: 'R35', t: 0.8, speed: 0.0038, occ: 30 },
]
