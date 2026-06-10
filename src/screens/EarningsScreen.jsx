import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'
const Y='#F5C000',YD='#B8900A'
export default function EarningsScreen({ user }) {
  const [period,   setPeriod]   = useState('This Month')
  const [bookings, setBookings] = useState([])
  const [loading,  setLoading]  = useState(true)
  useEffect(() => { load() }, [period])
  async function load() {
    if(!user) return
    setLoading(true)
    const now=new Date(), from=new Date()
    if(period==='Today') from.setHours(0,0,0,0)
    if(period==='This Week') from.setDate(now.getDate()-7)
    if(period==='This Month') from.setDate(1)
    const { data } = await sb.from('bookings').select('*').eq('worker_id',user.id).eq('status','completed').gte('created_at',from.toISOString()).order('created_at',{ascending:false})
    setBookings(data||[]); setLoading(false)
  }
  const total=bookings.reduce((s,b)=>s+(b.amount||0),0), myEarn=Math.round(total*0.9)
  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <div style={{ background:'#1C1C1E', padding:'24px 20px 20px', flexShrink:0 }}>
        <p style={{ color:'#636366', fontSize:13, marginBottom:4 }}>{period} earnings</p>
        <p style={{ color:Y, fontSize:36, fontWeight:900 }}>₹{myEarn.toLocaleString('en-IN')}</p>
        <div style={{ display:'flex', gap:24, marginTop:12 }}>
          {[['Jobs',bookings.length],['Platform fee','₹'+Math.round(total*.1).toLocaleString('en-IN')],['Wallet','₹'+myEarn.toLocaleString('en-IN')]].map(([k,v])=>(
            <div key={k}><p style={{ color:'#636366', fontSize:11 }}>{k}</p><p style={{ color:k==='Wallet'?Y:'#fff', fontWeight:800, fontSize:17 }}>{v}</p></div>
          ))}
        </div>
      </div>
      <div style={{ display:'flex', gap:8, padding:'12px 16px 4px', flexShrink:0 }}>
        {['Today','This Week','This Month'].map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            style={{ padding:'6px 14px', borderRadius:20, border:'1.5px solid '+(period===p?Y:'#2a2a2a'), background:period===p?Y:'#111', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', color:period===p?'#000':'#888' }}>
            {p}
          </button>
        ))}
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'8px 16px 16px' }}>
        <div style={{ background:'#111', borderRadius:16, border:'1px solid #1a1a1a', overflow:'hidden' }}>
          {loading ? <p style={{ textAlign:'center', padding:24, color:'#555' }}>Loading...</p>
          : bookings.length===0 ? (
            <div style={{ textAlign:'center', padding:40 }}>
              <div style={{ fontSize:40, marginBottom:12 }}>💰</div>
              <p style={{ fontWeight:700, color:'#fff' }}>No earnings yet</p>
              <p style={{ fontSize:13, color:'#555', marginTop:6 }}>Go online to start accepting jobs</p>
            </div>
          ) : bookings.map((b,i) => (
            <div key={b.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 16px', borderBottom:i<bookings.length-1?'1px solid #1a1a1a':'none' }}>
              <div>
                <p style={{ fontWeight:700, fontSize:14, color:'#fff' }}>{b.service}</p>
                <p style={{ fontSize:12, color:'#555', marginTop:2 }}>{new Date(b.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</p>
              </div>
              <div style={{ textAlign:'right' }}>
                <p style={{ fontWeight:800, fontSize:15, color:YD }}>₹{Math.round((b.amount||0)*.9).toLocaleString('en-IN')}</p>
                <span style={{ background:'#D1FAE5', color:'#065F46', fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:6 }}>Paid</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
