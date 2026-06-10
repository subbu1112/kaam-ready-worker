const Y='#F5C000'
const TABS = [
  { id:'home',     ico:'🏠', lbl:'Home'     },
  { id:'earnings', ico:'💰', lbl:'Earnings' },
  { id:'profile',  ico:'👤', lbl:'Profile'  },
]
export default function TabBar({ tab, setTab }) {
  return (
    <div style={{ background:'#1C1C1E', borderTop:'1px solid #2C2C2E', display:'flex', padding:'8px 0 12px', flexShrink:0 }}>
      {TABS.map(t => (
        <button key={t.id} onClick={() => setTab(t.id)}
          style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3, background:'none', border:'none', cursor:'pointer', padding:'4px 0' }}>
          <span style={{ fontSize:22 }}>{t.ico}</span>
          <span style={{ fontSize:10, fontWeight:700, color:tab===t.id?Y:'#636366' }}>{t.lbl}</span>
        </button>
      ))}
    </div>
  )
}
