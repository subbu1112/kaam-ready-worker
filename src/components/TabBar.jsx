const Y = '#F5C000'
const MUTED = '#9E9E9E'
const DARK = '#212121'

const ICONS = {
  jobs: ({ active }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="7" width="18" height="14" rx="3"
        fill={active ? '#FFF8CC' : 'none'}
        stroke={active ? '#B8900A' : MUTED}
        strokeWidth="1.8"/>
      <path d="M8 7V5C8 3.89543 8.89543 3 10 3H14C15.1046 3 16 3.89543 16 5V7"
        stroke={active ? '#B8900A' : MUTED} strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M3 12H21" stroke={active ? Y : MUTED} strokeWidth="1.5"/>
      {active && <circle cx="12" cy="12" r="2.5" fill={Y} stroke="#B8900A" strokeWidth="1"/>}
    </svg>
  ),
  earnings: ({ active }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="5" width="20" height="14" rx="3"
        fill={active ? '#FFF8CC' : 'none'}
        stroke={active ? '#B8900A' : MUTED}
        strokeWidth="1.8"/>
      <circle cx="12" cy="12" r="3.5"
        fill={active ? Y : 'none'}
        stroke={active ? '#B8900A' : MUTED}
        strokeWidth="1.6"/>
      <path d="M6 12H6.01M18 12H18.01" stroke={active ? '#B8900A' : MUTED} strokeWidth="2" strokeLinecap="round"/>
      {active && <text x="10.2" y="15.5" fontSize="6" fontWeight="900" fill="#412402">₹</text>}
    </svg>
  ),
  profile: ({ active }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="8" r="4"
        fill={active ? Y : 'none'}
        stroke={active ? '#B8900A' : MUTED}
        strokeWidth="1.8"/>
      <path d="M4 20C4 16.134 7.58172 13 12 13C16.4183 13 20 16.134 20 20"
        stroke={active ? '#B8900A' : MUTED}
        strokeWidth="1.8" strokeLinecap="round"/>
      {active && (
        <path d="M4 20C4 16.134 7.58172 13 12 13C16.4183 13 20 16.134 20 20"
          stroke={Y} strokeWidth="3.5" strokeLinecap="round" opacity="0.3"/>
      )}
    </svg>
  ),
}

const TABS = [
  { id: 'home',     Icon: ICONS.jobs,     lbl: 'Jobs'     },
  { id: 'earnings', Icon: ICONS.earnings, lbl: 'Earnings' },
  { id: 'profile',  Icon: ICONS.profile,  lbl: 'Profile'  },
]

export default function TabBar({ tab, setTab }) {
  return (
    <div style={{
      background: '#FFFFFF',
      borderTop: '1px solid rgba(0,0,0,.06)',
      display: 'flex',
      padding: '8px 8px calc(16px + env(safe-area-inset-bottom)) 8px',
      flexShrink: 0,
      boxShadow: '0 -8px 32px rgba(0,0,0,.07)',
      gap: 6,
    }}>
      {TABS.map(({ id, Icon, lbl }) => {
        const active = tab === id
        return (
          <button key={id} onClick={() => setTab(id)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              background: active ? '#FFF8CC' : 'none',
              border: active ? '1.5px solid rgba(245,192,0,.4)' : '1.5px solid transparent',
              borderRadius: 16,
              cursor: 'pointer',
              padding: '8px 4px 6px',
              transition: 'all .25s cubic-bezier(.34,1.56,.64,1)',
              transform: active ? 'translateY(-2px) scale(1.04)' : 'scale(1)',
              boxShadow: active ? '0 6px 18px rgba(245,192,0,.3)' : 'none',
              WebkitTapHighlightColor: 'transparent',
              outline: 'none',
            }}
            onPointerDown={e => { e.currentTarget.style.transform = 'scale(.88)'; e.currentTarget.style.transition = 'transform .08s' }}
            onPointerUp={e => { e.currentTarget.style.transform = active ? 'translateY(-2px) scale(1.04)' : 'scale(1)'; e.currentTarget.style.transition = 'transform .35s cubic-bezier(.34,1.56,.64,1)' }}
            onPointerLeave={e => { e.currentTarget.style.transform = active ? 'translateY(-2px) scale(1.04)' : 'scale(1)'; e.currentTarget.style.transition = 'transform .3s cubic-bezier(.34,1.56,.64,1)' }}>
            <div style={{
              transition: 'transform .25s cubic-bezier(.34,1.56,.64,1)',
              transform: active ? 'scale(1.08)' : 'scale(1)',
            }}>
              <Icon active={active} />
            </div>
            <span style={{
              fontSize: 10,
              fontWeight: active ? 800 : 600,
              color: active ? '#412402' : MUTED,
              fontFamily: 'Inter, system-ui, sans-serif',
              transition: 'color .15s',
              letterSpacing: active ? '0.2px' : 0,
            }}>{lbl}</span>
          </button>
        )
      })}
    </div>
  )
}
