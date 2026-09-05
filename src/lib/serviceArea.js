// ─────────────────────────────────────────────────────────────────────────
// Service area — KaamReady operates in Karnataka only, for now.
//
// Two independent checks, because they answer different questions:
//   whereIsVisitor()      — "should I tell this visitor we're not in their
//                           state yet?"  Advisory, edge-header based.
//   withinServiceArea()   — "is this pin somewhere we can actually send a
//                           worker?"  Enforced, coordinate based.
//
// Both fail OPEN. A missing header or a failed request must never stop a real
// customer in Bengaluru from booking.
// ─────────────────────────────────────────────────────────────────────────

export const SERVICE_STATE = 'Karnataka'

// Generous bounding box around Karnataka. Deliberately loose — it exists to
// catch someone dropping a pin in Delhi or Dubai, not to police the border.
const BOUNDS = { minLat: 11.4, maxLat: 18.7, minLng: 73.8, maxLng: 78.8 }

export function withinServiceArea(lat, lng) {
  const la = Number(lat), ln = Number(lng)
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return true   // unknown → allow
  return la >= BOUNDS.minLat && la <= BOUNDS.maxLat &&
         ln >= BOUNDS.minLng && ln <= BOUNDS.maxLng
}

const CACHE_KEY = 'kr_geo_v1'

export async function whereIsVisitor() {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY)
    if (cached) return JSON.parse(cached)
  } catch { /* private mode — just ask again */ }

  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 4000)
    const res = await fetch('/api/geo', { signal: ctrl.signal })
    clearTimeout(t)
    if (!res.ok) return { served: true, known: false }
    const geo = await res.json()
    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(geo)) } catch { /* ignore */ }
    return geo
  } catch {
    return { served: true, known: false }   // fail open
  }
}

// Human-readable place name for the notice, when the edge gave us one.
export function visitorPlace(geo) {
  if (!geo?.known) return null
  if (geo.city && geo.country === 'IN') return geo.city
  if (geo.country && geo.country !== 'IN') return 'outside India'
  return null
}
