// Distance helpers for the worker's job cards.
//
// The worker decides whether to accept a job largely on how far it is, so the
// number has to be on the card itself — not one Google Maps round-trip away.

const R_KM = 6371

export function haversineKm(lat1, lng1, lat2, lng2) {
  const n = v => (v === null || v === undefined || v === '' ? NaN : Number(v))
  const a1 = n(lat1), o1 = n(lng1), a2 = n(lat2), o2 = n(lng2)
  if ([a1, o1, a2, o2].some(v => !Number.isFinite(v))) return null
  const dLat = (a2 - a1) * Math.PI / 180
  const dLng = (o2 - o1) * Math.PI / 180
  const h = Math.sin(dLat / 2) ** 2 +
            Math.cos(a1 * Math.PI / 180) * Math.cos(a2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R_KM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

// "750 m away" reads better than "0.8 km away" at short range.
export function formatDistance(km) {
  if (km === null || km === undefined || !Number.isFinite(km)) return null
  if (km < 1) return `${Math.max(10, Math.round((km * 1000) / 10) * 10)} m`
  if (km < 10) return `${km.toFixed(1)} km`
  return `${Math.round(km)} km`
}

// Rough road-travel estimate for city riding (~22 km/h average including
// traffic and turns), padded by a minute of getting going. Deliberately
// labelled "approx" in the UI — it is a sanity check, not a routed ETA.
export function estimateMinutes(km) {
  if (km === null || km === undefined || !Number.isFinite(km)) return null
  return Math.max(3, Math.round((km / 22) * 60) + 2)
}

// One call the UI can lean on: distance text + travel text, or nulls.
export function travelInfo(fromLat, fromLng, toLat, toLng) {
  const km = haversineKm(fromLat, fromLng, toLat, toLng)
  if (km === null) return { km: null, distance: null, minutes: null, travel: null }
  const minutes = estimateMinutes(km)
  return { km, distance: formatDistance(km), minutes, travel: `~${minutes} min ride` }
}

// Best-effort current position, resolved (never rejected) so a denied
// permission degrades to "distance unavailable" instead of a broken screen.
export function currentPosition(timeout = 8000) {
  return new Promise(res => {
    if (!navigator.geolocation) return res(null)
    navigator.geolocation.getCurrentPosition(
      pos => res({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      ()  => res(null),
      { enableHighAccuracy: true, timeout, maximumAge: 30000 })
  })
}
