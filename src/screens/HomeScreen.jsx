import { useState, useEffect, useRef } from 'react'
import { sb } from '../lib/supabase'
import MapView from '../components/MapView'
import { floorFor, COMMISSION } from '../constants'
const Y='#F5C000',YL='#FFF8D6',GREEN='#22c55e',RED='#ef4444'
export default function HomeScreen({ user, profile, showToast }) {
  const [online,    setOnline]    = useState(() => localStorage.getItem('kr_worker_online') === 'true')
  const [jobAlert,  setJobAlert]  = useState(null)
  const [activeJob, setActiveJob] = useState(null)
  const [todayEarn, setTodayEarn] = useState(0)
  const [todayJobs, setTodayJobs] = useState(0)
  const [showPrice, setShowPrice] = useState(false)
  const [price,     setPrice]     = useState('')
  const [note,      setNote]      = useState('')
  const [busy,      setBusy]      = useState(false)
  const timer=useRef(null), chan=useRef(null), jobChan=useRef(null)
  useEffect(() => { if(profile) loadTodayStats() }, [profile])
  // Restore an in-progress job after refresh
  useEffect(() => {
    if (!user?.id) return
    sb.from('bookings').select('*').eq('worker_id', user.id)
      .in('status', ['assigned','priced']).order('created_at', { ascending:false }).limit(1)
      .then(({ data }) => { if (data?.[0]) setActiveJob(prev => prev || data[0]) })
  }, [user?.id])
  useEffect(() => {
    if(online) subscribeToJobs()
    else { if(chan.current) sb.removeChannel(chan.current); clearTimeout(timer.current); setJobAlert(null) }
    return () => { if(chan.current) sb.removeChannel(chan.current) }
  }, [online])
  useEffect(() => {
    if (!user?.id) return
    sb.from('workers').update({ is_online: online }).eq('id', user.id).then(() => {})
    localStorage.setItem('kr_worker_online', online)
  }, [online, user?.id])
  // Watch the active job for customer payment claims
  useEffect(() => {
    if (jobChan.current) { sb.removeChannel(jobChan.current); jobChan.current = null }
    if (!activeJob?.id) return
    jobChan.current = sb.channel('job-'+activeJob.id)
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'bookings',filter:'id=eq.'+activeJob.id},payload=>{
        setActiveJob(prev => prev ? { ...prev, ...payload.new } : prev)
        if (payload.new.payment_status==='claimed') showToast('Customer says payment sent — please confirm 💸')
      }).subscribe()
    return () => { if (jobChan.current) sb.removeChannel(jobChan.current) }
  }, [activeJob?.id])
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
    // Also pick up jobs that were already waiting before we came online
    sb.from('bookings').select('*').eq('status','searching').eq('city', profile?.city)
      .gte('created_at', new Date(Date.now()-3*60*1000).toISOString())
      .order('created_at',{ascending:false}).limit(1)
      .then(({ data }) => { if (data?.[0]) { setJobAlert(prev => prev || data[0]); showToast('A job is waiting! 🔔') } })
  }
  function getPosition() {
    return new Promise(res => {
      if (!navigator.geolocation) return res(null)
      navigator.geolocation.getCurrentPosition(
        pos => res({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        ()  => res(null), { enableHighAccuracy: true, timeout: 5000 })
    })
  }
  async function acceptJob() {
    if(!jobAlert) return
    const pos = await getPosition()
    if (pos) sb.from('workers').update({ lat: pos.lat, lng: pos.lng }).eq('id', user.id).then(()=>{})
    const w={id:user.id,name:profile?.name,skill:profile?.skill,rating:profile?.rating,jobs:profile?.total_jobs,ico:'👷',eta:'8 min',dist:'1.0 km',lat:pos?.lat,lng:pos?.lng}
    await sb.from('bookings').update({status:'assigned',worker_id:user.id,worker:w}).eq('id',jobAlert.id)
    setActiveJob({...jobAlert,status:'assigned',worker:w}); setJobAlert(null); showToast('Job accepted! Navigate to customer 🗺️')
  }
  function navigateToCustomer() {
    const j = activeJob
    if (j?.address_lat && j?.address_lng)
      window.open('https://www.google.com/maps/dir/?api=1&destination='+j.address_lat+','+j.address_lng, '_blank')
    else {
      const q = encodeURIComponent(j?.address || j?.city || 'Karnataka')
      window.open('https://www.google.com/maps/dir/?api=1&destination='+q, '_blank')
    }
  }
  function jobFloor(job) { return floorFor(job?.service_id) }
  async function submitPrice() {
    if(!activeJob || busy) return
    const p = parseInt(price, 10)
    const floor = jobFloor(activeJob)
    if (!p || p < floor) { showToast(`Price can't be below the ₹${floor} minimum`); return }
    setBusy(true)
    const { error } = await sb.from('bookings').update({
      status:'priced', amount:p, price_note:note.trim()||null, priced_at:new Date().toISOString(),
    }).eq('id', activeJob.id)
    setBusy(false)
    if (error) { showToast(error.message); return }
    setActiveJob(prev => ({ ...prev, status:'priced', amount:p, price_note:note.trim()||null }))
    setShowPrice(false)
    showToast('Price sent — waiting for customer to pay via UPI 💳')
  }
  async function confirmPayment() {
    if(!activeJob || busy) return
    setBusy(true)
    const amt = activeJob.amount || 0
    const fee = Math.round(amt * COMMISSION)
    const { error } = await sb.from('bookings').update({
      payment_status:'paid', payment_method:'upi', status:'completed',
      payment_confirmed_at:new Date().toISOString(), completed_at:new Date().toISOString(),
    }).eq('id', activeJob.id)
    if (!error) {
      await sb.from('workers').update({
        wallet_balance: (profile?.wallet_balance||0) + amt - fee,
        commission_due: (profile?.commission_due||0) + fee,
        total_jobs:     (profile?.total_jobs||0) + 1,
      }).eq('id', user.id)
      setTodayEarn(e=>e+amt); setTodayJobs(j=>j+1)
      setActiveJob(null); setPrice(''); setNote('')
      showToast('₹'+(amt-fee).toLocaleString('en-IN')+' received (₹'+fee+' platform fee) 💰')
    } else { showToast(error.message) }
    setBusy(false)
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
              <span style={{ color:'#636366', fontSize:12 }}>Starting price</span>
              <span style={{ color:Y, fontSize:18, fontWeight:800 }}>from ₹{jobFloor(jobAlert)}</span>
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
              <span style={{ background:'#D1FAE5', color:'#065F46', fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:8 }}>
                {activeJob.payment_status==='claimed' ? 'Payment Sent' : activeJob.status==='priced' ? 'Awaiting Payment' : 'In Progress'}
              </span>
            </div>
            {[['Customer',activeJob.customer_name||'—'],['Service',activeJob.service],['Address',activeJob.address]].map(([k,v]) => (
              <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #1a1a1a' }}>
                <span style={{ fontSize:13, color:'#636366' }}>{k}</span>
                <span style={{ fontSize:13, fontWeight:600, color:'#fff', maxWidth:'60%', textAlign:'right' }}>{v}</span>
              </div>
            ))}
            {activeJob.status!=='priced' && !activeJob.payment_status && <>
              <MapView
                customerLat={activeJob.address_lat} customerLng={activeJob.address_lng}
                workerLat={activeJob.worker?.lat || profile?.lat} workerLng={activeJob.worker?.lng || profile?.lng}
                style={{ borderRadius:12, height:160, overflow:'hidden', marginTop:10 }} />
              <div style={{ display:'flex', gap:8, marginTop:10 }}>
                <button onClick={navigateToCustomer} style={{ flex:1, background:'#2a2a2a', color:'#fff', border:'none', borderRadius:12, padding:11, fontWeight:700, fontSize:13, cursor:'pointer' }}>🗺️ Directions</button>
                {activeJob.customer_phone
                  ? <a href={'tel:+91'+activeJob.customer_phone} style={{ flex:1, background:Y, border:'none', borderRadius:12, padding:11, fontWeight:700, fontSize:13, cursor:'pointer', textAlign:'center', textDecoration:'none', color:'#000' }}>📞 Call Customer</a>
                  : <button onClick={() => showToast('Customer phone not available for this booking')} style={{ flex:1, background:Y, border:'none', borderRadius:12, padding:11, fontWeight:700, fontSize:13, cursor:'pointer' }}>📞 Call</button>}
              </div>
            </>}
            {activeJob.status!=='priced' && !showPrice && (
              <button onClick={() => { setPrice(''); setNote(''); setShowPrice(true) }} style={{ width:'100%', background:GREEN, color:'#fff', border:'none', borderRadius:14, padding:15, fontWeight:800, fontSize:14, cursor:'pointer', marginTop:10 }}>Work Done — Set Final Price ₹</button>
            )}
            {activeJob.status!=='priced' && showPrice && (
              <div style={{ background:'#1C1C1E', borderRadius:14, padding:14, marginTop:10 }}>
                <p style={{ color:Y, fontWeight:800, fontSize:13, marginBottom:4 }}>Final Price</p>
                <p style={{ color:'#636366', fontSize:11, marginBottom:10 }}>Minimum: ₹{jobFloor(activeJob)} — price the job fairly, the customer approves it before paying</p>
                <input value={price} onChange={e => setPrice(e.target.value.replace(/\D/g,'').slice(0,5))} type="tel" placeholder="₹ amount"
                  style={{ width:'100%', background:'#111', border:'1.5px solid #2a2a2a', borderRadius:10, padding:12, fontSize:15, fontWeight:700, color:'#fff', outline:'none', fontFamily:'inherit', marginBottom:8 }} />
                <input value={note} onChange={e => setNote(e.target.value.slice(0,120))} placeholder="Why this price? e.g. extra wiring replaced"
                  style={{ width:'100%', background:'#111', border:'1.5px solid #2a2a2a', borderRadius:10, padding:12, fontSize:13, color:'#fff', outline:'none', fontFamily:'inherit', marginBottom:10 }} />
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={() => setShowPrice(false)} style={{ flex:1, background:'#2a2a2a', color:'#fff', border:'none', borderRadius:10, padding:12, fontWeight:700, fontSize:13, cursor:'pointer' }}>Cancel</button>
                  <button onClick={submitPrice} disabled={busy} style={{ flex:2, background:Y, border:'none', borderRadius:10, padding:12, fontWeight:800, fontSize:13, cursor:'pointer', opacity:busy?.6:1 }}>{busy?'Sending...':'Send to Customer →'}</button>
                </div>
              </div>
            )}
            {activeJob.status==='priced' && activeJob.payment_status!=='claimed' && (
              <div style={{ background:'#1C1C1E', borderRadius:14, padding:16, marginTop:10, textAlign:'center' }}>
                <div style={{ fontSize:30, marginBottom:8 }}>⏳</div>
                <p style={{ color:'#fff', fontWeight:800, fontSize:15 }}>₹{activeJob.amount} sent to customer</p>
                <p style={{ color:'#636366', fontSize:12, marginTop:4 }}>Waiting for them to pay via UPI...</p>
                <button onClick={() => { setPrice(String(activeJob.amount||'')); setNote(activeJob.price_note||''); setActiveJob(p=>({...p,status:'assigned'})); setShowPrice(true) }}
                  style={{ marginTop:12, background:'none', border:'1px solid #2a2a2a', borderRadius:10, color:'#636366', padding:'8px 16px', fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>Edit price</button>
              </div>
            )}
            {activeJob.payment_status==='claimed' && (
              <div style={{ background:'#0d2818', border:'1px solid '+GREEN, borderRadius:14, padding:16, marginTop:10, textAlign:'center' }}>
                <div style={{ fontSize:30, marginBottom:8 }}>💸</div>
                <p style={{ color:'#fff', fontWeight:800, fontSize:15 }}>Customer paid ₹{activeJob.amount} via UPI</p>
                <p style={{ color:'#9ca3af', fontSize:12, margin:'4px 0 12px' }}>Check your UPI app, then confirm below</p>
                <button onClick={confirmPayment} disabled={busy} style={{ width:'100%', background:GREEN, color:'#fff', border:'none', borderRadius:12, padding:14, fontWeight:800, fontSize:14, cursor:'pointer', opacity:busy?.6:1 }}>
                  {busy?'Confirming...':'✓ Confirm Payment Received'}
                </button>
              </div>
            )}
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
