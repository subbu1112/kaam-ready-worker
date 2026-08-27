import { t as tr } from '../i18n'
import { C } from '../theme'

const TABS = [
  { id:'home',     ico:'🏠', lbl:'Home'     },
  { id:'earnings', ico:'💰', lbl:'Earnings' },
  { id:'wallet',   ico:'👛', lbl:'Wallet'   },
  { id:'rewards',  ico:'🏆', lbl:'Rewards'  },
  { id:'profile',  ico:'👤', lbl:'Profile'  },
]
// Tabs that should highlight 'Profile' while active (reached from the Profile menu).
const PROFILE_GROUP = ['profile', 'settings', 'notifications', 'history']

export default function TabBar({ tab, setTab }) {
  return (
    <div style={{ background:C.card, borderTop:`1px solid ${C.line}`, display:'flex',
      padding:'6px 0 10px', flexShrink:0, boxShadow:'0 -2px 12px rgba(16,24,40,.05)' }}>
      {TABS.map(tb => {
        const active = tab === tb.id || (tb.id === 'profile' && PROFILE_GROUP.includes(tab))
        return (
          <button key={tb.id} onClick={() => setTab(tb.id)}
            style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3,
              background:'none', border:'none', cursor:'pointer', padding:'6px 0' }}>
            <span style={{ fontSize:21, filter: active ? 'none' : 'grayscale(1)', opacity: active ? 1 : .55 }}>{tb.ico}</span>
            <span style={{ fontSize:10, fontWeight:700, color: active ? C.text : C.text3 }}>{tr(tb.lbl)}</span>
          </button>
        )
      })}
    </div>
  )
}
