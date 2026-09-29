/* Role-Based Access Control matrix (SRS Functional Req ii).
   Enforced in THREE places: sidebar visibility, route guards (direct URLs),
   and server-side on the FastAPI endpoints (a blocked role gets HTTP 403 even
   with a hand-crafted request — the UI is never the only gate).

   Rationale per role:
   - Administrator: full control, including infrastructure + audit.
   - Operator: live operations (delays, occupancy, recommendations, what-if) —
     no data-science internals, no exports.
   - Analyst: all analytics + model lab + reports — no infrastructure/audit.
   - Evaluator: read-everything jury account (SRS requires evaluator access). */

export const ROLES = ['Administrator', 'Operator', 'Analyst', 'Evaluator']

const ALL = ROLES
const NO_OPERATOR = ['Administrator', 'Analyst', 'Evaluator']
const INFRA = ['Administrator', 'Evaluator']

export const PAGE_ACCESS = {
  '/': ALL,
  '/home': ALL,
  '/network-map': ALL,
  '/passenger-flow': ALL,
  '/routes': ALL,
  '/delays': ALL,
  '/occupancy': ALL,
  '/forecast': ALL,
  '/anomalies': ALL,
  '/recommendations': ALL,
  '/what-if': ALL,
  '/dual-pipeline': NO_OPERATOR,
  '/data-quality': NO_OPERATOR,
  '/reports': NO_OPERATOR,
  '/powerbi': NO_OPERATOR,
  '/bigdata': INFRA,
  '/users': ['Administrator'],
}

export function canAccess(role, path) {
  const allowed = PAGE_ACCESS[path]
  return !allowed || allowed.includes(role)
}
