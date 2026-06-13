const Y = '#F5C000'
const YL = '#2C2600'

const TABS = [
  { id: 'home',     ico: '⚡', lbl: 'Jobs'     },
  { id: 'earnings', ico: '💰', lbl: 'Earnings' },
  { id: 'profile',  ico: '👤', lbl: 'Profile'  },
]

export default function TabBar({ tab, setTab }) {
  return (
    <div style={{
      background: '#111114',
      borderTop: '1px solid #1E1E24',
      display: 'flex',
      padding: '6px 8px 16px',
      flexShrink: 0,
      gap: 4,
    }}>
      {TABS.map(tb => {
        const active = tab === tb.id
        return (
          <button key={tb.id} onClick={() => setTab(tb.id)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              background: active ? YL : 'none',
              border: 'none',
              borderRadius: 14,
              cursor: 'pointer',
              padding: '8px 4px 6px',
              transition: 'background 0.2s',
            }}>
            <span style={{ fontSize: active ? 22 : 20, lineHeight: 1, filter: active ? 'none' : 'grayscale(0.4)' }}>
              {tb.ico}
            </span>
            <span style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: 0.2,
              color: active ? Y : '#555',
              fontFamily: 'Inter, sans-serif',
            }}>
              {tb.lbl}
            </span>
          </button>
        )
      })}
    </div>
  )
}
