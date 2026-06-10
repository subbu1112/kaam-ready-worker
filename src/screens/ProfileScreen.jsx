import { sb } from '../lib/supabase'
const Y='#F5C000',YL='#FFF8D6'
export default function ProfileScreen({ profile, showToast }) {
  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <div style={{ background:'#1C1C1E', padding:'32px 20px 24px', textAlign:'center', flexShrink:0 }}>
        <div style={{ width:72, height:72, borderRadius:22, background:YL, display:'flex', alignItems:'center', justifyContent:'center', fontSize:38, margin:'0 auto 14px' }}>⚡</div>
        <p style={{ color:'#fff', fontWeight:800, fontSize:20 }}>{profile?.name||'Worker'}</p>
        <p style={{ color:'#636366', fontSize:13, marginTop:4 }}>{profile?.phone}</p>
        <div style={{ display:'flex', gap:8, justifyContent:'center', marginTop:12 }}>
          <span style={{ background:YL, color:'#B8900A', fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:8 }}>{profile?.skill}</span>
          <span style={{ background:'#D1FAE5', color:'#065F46', fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:8 }}>✓ Verified</span>
        </div>
        <div style={{ background:'#1a1a1a', borderRadius:12, padding:'12px 16px', marginTop:14 }}>
          <p style={{ color:'#636366', fontSize:11, marginBottom:6 }}>Trust Score</p>
          <div style={{ background:'#333', borderRadius:20, height:6, overflow:'hidden' }}>
            <div style={{ width:(profile?.trust_score||60)+'%', height:'100%', background:Y, borderRadius:20 }} />
          </div>
          <p style={{ color:Y, fontSize:12, fontWeight:800, marginTop:6 }}>{profile?.trust_score||60} / 100</p>
        </div>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:16, display:'flex', flexDirection:'column', gap:12 }}>
        <div style={{ background:'#111', borderRadius:16, border:'1px solid #1a1a1a', overflow:'hidden' }}>
          {[['📋','Job History'],['🏆','Achievements'],['💳','Bank Account'],['📞','Support'],['⚙️','Settings']].map(([ico,lb]) => (
            <button key={lb} onClick={() => showToast(lb+' — coming soon!')}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'14px 16px', background:'none', border:'none', borderBottom:'1px solid #1a1a1a', cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}>
              <div style={{ width:36, height:36, borderRadius:10, background:YL, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>{ico}</div>
              <span style={{ fontSize:15, fontWeight:500, color:'#fff', flex:1 }}>{lb}</span>
              <span style={{ color:'#2a2a2a', fontSize:18 }}>›</span>
            </button>
          ))}
        </div>
        <button onClick={() => sb.auth.signOut()}
          style={{ width:'100%', background:'transparent', border:'2px solid #fecaca', borderRadius:14, padding:16, color:'#ef4444', fontWeight:800, fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>
          Sign Out
        </button>
        <p style={{ textAlign:'center', fontSize:12, color:'#333', paddingBottom:8 }}>Kaam Ready Worker v1.0 · Karnataka 🇮🇳</p>
      </div>
    </div>
  )
}
