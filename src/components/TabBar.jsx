const Y = '#F5C000'

const TABS = [
  { id: 'home',     ico: '⚡', lbl: 'Jobs'     },
  { id: 'earnings', ico: '💰', lbl: 'Earnings' },
  { id: 'profile',  ico: '👤', lbl: 'Profile'  },
]

export default function TabBar({ tab, setTab }) {
  return (
    <div style={{
      background: '#FFFFFF',
      borderTop: '1px solid #F0F0F0',
      display: 'flex',
      padding: '6px 8px calc(16px + env(safe-area-inset-bottom))',
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
              background: active ? '#FFF8CC' : 'none',
              border: active ? '1px solid #F5C000' : '1px solid transparent',
              borderRadius: 14,
              cursor: 'pointer',
              padding: '8px 4px 6px',
              transition: 'background 0.15s',
            }}>
            <span style={{ fontSize: active ? 22 : 20, lineHeight: 1, filter: active ? 'none' : 'grayscale(0.5) opacity(0.7)' }}>
              {tb.ico}
            </span>
            <span style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: 0.2,
              color: active ? '#412402' : '#9E9E9E',
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
