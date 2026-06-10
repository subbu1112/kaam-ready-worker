import { useState, useEffect, useRef } from 'react'
import { sb } from '../lib/supabase'
const Y='#F5C000',YL='#FFF8D6',GREEN='#22c55e',RED='#ef4444'
export default function HomeScreen({ user, profile, showToast }) {
  const [online,    setOnline]    = useState(false)
  const [jobAlert,  setJobAlert]  = useState(null)
  const [activeJob, setActiveJob] = useState(null)
  const [todayEarn, setTodayEarn] = useState(0)
  const [todayJobs, setTodayJobs] = useState(0)
  const timer=useRef(null), chan=useRef(null)
  useEffect(() => { if(profile) loadTodayStats() }, [profile])
  useEffect(() => {
    if(online) subscribeToJobs()
    else { if(chan.current) sb.removeChannel(chan.current); clearTimeout(timer.current); setJobAlert(null) }
    return () => { if(chan.current) sb.removeChannel(chan.current) }
  }, [online])
  async function loadTodayStats() {
    if(!user) return
    const today=new Date().toISOString().slice(0,10)
    const { data } = await sb.from('bookings').select('amount').eq('worker_id',user.id).eq('status','completed').gte('created_at',today)
    if(data) { setTodayJobs(data.length); setTodayEarn(data.reduce((s,b)=>s+(b.amount||0),0)) }
  }
  function subscribeToJobs() {
    chan.current = sb.channel('new-jobs-'+profile?.city)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'bookings',filter:'status=eq.searching'},payload=>{
        if(payload.new.city===profile?.city) { setJobAlert(payload.new); showToast('New job request! 🔔') }
      }).subscribe()
  }
  async function acceptJob() {
    if(!jobAlert) return
    const w={id:user.id,name:profile?.name,skill:profile?.skill,rating:profile?.rating,jobs:profile?.total_jobs,ico:'👷',eta:'8 min',dist:'1.0 km'}
    await sb.from('bookings').update({status:'assigned',worker_id:user.id,worker:w}).eq('id',jobAlert.id)
    setActiveJob({...jobAlert,worker:w}); setJobAlert(null); showToast('Job accepted! Navigate to customer 🗺️')
  }
  async function completeJob() {
    if(!activeJob) return
    const amt=[350,400,450,500][Math.floor(Math.random()*4)]
    await sb.from('bookings').update({status:'completed',amount:amt}).eq('id',activeJob.id)
    setTodayEarn(e=>e+Math.round(amt*0.9)); setTodayJobs(j=>j+1); setActiveJob(null)
    showToast('₹'+Math.round(amt*0.9)+' added to wallet 💰')
  }
  function toggleOnline() { const next=!online; setOnline(next); showToast(next?'You are now Online 🟢':'You are now Offline') }
  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <div style={{ background:online?GREEN:'#1C1C1E', padding:'10px 20px 6px', display:'flex', justifyContent:'space-between', transition:'background .3s' }}>
        <span style={{ color:'#fff', fontSize:12, fontWeight:700 }}>Kaam Ready</span>
        <span style={{ color:'#fff', fontSize:11, fontWeight:800 }}>{online?'● ONLINE':'● OFFLINE'}</span>
        <span style={{ color:'#fff', fontSize:12 }}>📶 🔋</span>
      </div>
      <div style={{ background:'#1C1C1E', padding:'10px 20px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
        <div>
          <h1 style={{ color:Y, fontSize:20, fontWeight:800 }}>Kaam Ready ⚡</h1>
          <p style={{ color:'#636366', fontSize:12 }}>{profile?.skill} · {profile?.city}</p>
        </div>
        <div onClick={toggleOnline} style={{ width:52, height:28, borderRadius:20, background:online?GREEN:'#3A3A3C', position:'relative', cursor:'pointer', transition:'background .2s' }}>
          <div style={{ width:22, height:22, background:'#fff', borderRadius:'50%', position:'absolute', top:3, left:online?27:3, transition:'left .2s', boxShadow:'0 1px 4px rgba(0,0,0,.3)' }} />
        </div>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:16, display:'flex', flexDirection:'column', gap:12 }}>
        {!online && !activeJob && (
          <div style={{ background:'#111', borderRadius:20, padding:'28px 24px', textAlign:'center', border:'1.5px dashed #2a2a2a' }}>
            <div style={{ fontSize:44, marginBottom:12 }}>😴</div>
            <p style={{ fontWeight:800, fontSize:16, color:'#fff' }}>You are Offline</p>
            <p style={{ fontSize:13, color:'#555', margin:'6px 0 18px' }}>Toggle the switch above to start receiving jobs</p>
            <button onClick={toggleOnline} style={{ background:Y, border:'none', borderRadius:14, padding:'14px 28px', fontWeight:800, fontSize:14, cursor:'pointer' }}>Go Online Now</button>
          </div>
        )}
        {online && !jobAlert && !activeJob && (
          <div style={{ background:'#111', border:'1.5px solid '+Y, borderRadius:20, padding:'28px 24px', textAlign:'center' }}>
            <div style={{ fontSize:44, marginBottom:12, animation:'float 1.5s ease-in-out infinite' }}>🟢</div>
            <p style={{ fontWeight:800, fontSize:16, color:'#fff' }}>Waiting for jobs...</p>
            <p style={{ fontSize:13, color:'#636366', marginTop:6 }}>You'll be notified instantly when a job matches</p>
          </div>
        )}
        {jobAlert && (
          <div style={{ background:'#1C1C1E', borderRadius:20, padding:16, border:'2px solid '+Y, animation:'popIn .3s ease' }}>
            <h3 style={{ color:Y, fontWeight:800, fontSize:15, marginBottom:12 }}>🔔 New Job Request!</h3>
            {[['Service',jobAlert.service],['Address',jobAlert.address],['City',jobAlert.city]].map(([k,v]) => (
              <div key={k} style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                <span style={{ color:'#636366', fontSize:12 }}>{k}</span>
                <span style={{ color:'#fff', fontSize:13, fontWeight:600, maxWidth:'60%', textAlign:'right' }}>{v}</span>
              </div>
            ))}
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
              <span style={{ color:'#636366', fontSize:12 }}>Est. pay</span>
              <span style={{ color:Y, fontSize:18, fontWeight:800 }}>₹{Math.round(450*0.9)}</span>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={acceptJob} style={{ flex:1, background:GREEN, color:'#fff', border:'none', borderRadius:12, padding:14, fontWeight:800, fontSize:14, cursor:'pointer' }}>✓ Accept</button>
              <button onClick={() => setJobAlert(null)} style={{ flex:1, background:RED, color:'#fff', border:'none', borderRadius:12, padding:14, fontWeight:800, fontSize:14, cursor:'pointer' }}>✕ Decline</button>
            </div>
          </div>
        )}
        {activeJob && (
          <div style={{ background:'#111', borderRadius:20, padding:16, border:'2px solid '+GREEN }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <p style={{ fontWeight:800, fontSize:14, color:'#fff' }}>🔧 Active Job</p>
              <span style={{ background:'#D1FAE5', color:'#065F46', fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:8 }}>In Progress</span>
            </div>
            {[['Service',activeJob.service],['Address',activeJob.address]].map(([k,v]) => (
              <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #1a1a1a' }}>
                <span style={{ fontSize:13, color:'#636366' }}>{k}</span>
                <span style={{ fontSize:13, fontWeight:600, color:'#fff', maxWidth:'60%', textAlign:'right' }}>{v}</span>
              </div>
            ))}
            <div style={{ display:'flex', gap:8, marginTop:12 }}>
              <button onClick={() => showToast('🗺️ Opening Maps...')} style={{ flex:1, background:'#2a2a2a', color:'#fff', border:'none', borderRadius:12, padding:11, fontWeight:700, fontSize:13, cursor:'pointer' }}>🗺️ Navigate</button>
              <button onClick={() => showToast('📞 Calling...')} style={{ flex:1, background:Y, border:'none', borderRadius:12, padding:11, fontWeight:700, fontSize:13, cursor:'pointer' }}>📞 Call</button>
            </div>
            <button onClick={completeJob} style={{ width:'100%', background:GREEN, color:'#fff', border:'none', borderRadius:14, padding:15, fontWeight:800, fontSize:14, cursor:'pointer', marginTop:10 }}>Mark as Completed ✓</button>
          </div>
        )}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
          {[['₹'+todayEarn.toLocaleString('en-IN'),'Today'],[todayJobs,'Jobs done'],[(profile?.rating||5.0)+'⭐','Rating']].map(([v,l]) => (
            <div key={l} style={{ background:YL, borderRadius:12, padding:'10px 8px', textAlign:'center' }}>
              <div style={{ fontSize:17, fontWeight:800 }}>{v}</div>
              <div style={{ fontSize:10, color:'#888', marginTop:2 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
