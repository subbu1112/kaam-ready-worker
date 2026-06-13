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
      boxShadow: '0 -4px 20px rgba(0,0,0,.05)',
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
              transition: 'all .25s cubic-bezier(.34,1.56,.64,1)',
              transform: active ? 'translateY(-2px) scale(1.04)' : 'scale(1)',
              boxShadow: active ? '0 4px 14px rgba(245,192,0,.3)' : 'none',
            }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(.88)'}
            onMouseUp={e => e.currentTarget.style.transform = active ? 'translateY(-2px) scale(1.04)' : 'scale(1)'}
            onTouchStart={e => e.currentTarget.style.transform = 'scale(.88)'}
            onTouchEnd={e => e.currentTarget.style.transform = active ? 'translateY(-2px) scale(1.04)' : 'scale(1)'}>
            <span style={{
              fontSize: active ? 22 : 20,
              lineHeight: 1,
              transition: 'font-size .2s cubic-bezier(.34,1.56,.64,1)',
              filter: active ? 'none' : 'grayscale(0.5) opacity(0.7)',
            }}>
              {tb.ico}
            </span>
            <span style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: 0.2,
              color: active ? '#412402' : '#9E9E9E',
              fontFamily: 'Inter, sans-serif',
              transition: 'color .15s',
            }}>
              {tb.lbl}
            </span>
          </button>
        )
      })}
    </div>
  )
}
