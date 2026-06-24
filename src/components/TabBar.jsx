import { t as tr } from '../i18n'
const Y='#F5C000'
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
    <div style={{ background:'#1C1C1E', borderTop:'1px solid #2C2C2E', display:'flex', padding:'8px 0 12px', flexShrink:0 }}>
      {TABS.map(tb => {
        const active = tab === tb.id || (tb.id === 'profile' && PROFILE_GROUP.includes(tab))
        return (
          <button key={tb.id} onClick={() => setTab(tb.id)}
            style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3, background:'none', border:'none', cursor:'pointer', padding:'4px 0' }}>
            <span style={{ fontSize:22 }}>{tb.ico}</span>
            <span style={{ fontSize:10, fontWeight:700, color:active?Y:'#636366' }}>{tr(tb.lbl)}</span>
          </button>
        )
      })}
    </div>
  )
}
