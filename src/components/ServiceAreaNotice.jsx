import { useEffect, useState } from 'react'
import { SERVICE_STATE, whereIsVisitor, visitorPlace } from '../lib/serviceArea'

const Y = '#F5C000', BK = '#1A1A1A'

/**
 * Shown to visitors outside Karnataka.
 *
 * Deliberately a banner and not a wall: someone from Pune should still be able
 * to read the site, and a Bengaluru customer travelling for work must never be
 * locked out of an existing booking by an IP lookup. The hard rule lives at the
 * point it actually matters — you cannot confirm a service location outside
 * the state.
 */
export default function ServiceAreaNotice({ compact = false }) {
  const [geo,     setGeo]     = useState(null)
  const [dismiss, setDismiss] = useState(false)

  useEffect(() => {
    let alive = true
    whereIsVisitor().then(g => { if (alive) setGeo(g) })
    return () => { alive = false }
  }, [])

  if (dismiss || !geo || geo.served) return null

  const place = visitorPlace(geo)

  return (
    <div style={{ background: BK, color: '#fff', padding: compact ? '10px 14px' : '12px 16px' }}>
      <div className="kr-container" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 0 }}>
        <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>📍</span>
        <p style={{ flex: 1, fontSize: 13, lineHeight: 1.55, margin: 0 }}>
          <strong style={{ color: Y }}>We're in {SERVICE_STATE} only right now.</strong>{' '}
          {place ? `It looks like you're browsing from ${place}. ` : ''}
          You're welcome to look around — bookings open when we reach your city.
          Tell us where to go next at{' '}
          <a href="mailto:support@kaamready.in?subject=Bring%20KaamReady%20to%20my%20city"
            style={{ color: Y, fontWeight: 700, textDecoration: 'underline' }}>
            support@kaamready.in
          </a>.
        </p>
        <button onClick={() => setDismiss(true)} aria-label="Dismiss"
          style={{ background: 'rgba(255,255,255,.12)', border: 'none', color: '#fff', borderRadius: 8,
            padding: '5px 10px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
          ✕
        </button>
      </div>
    </div>
  )
}
