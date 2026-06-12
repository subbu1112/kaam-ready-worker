import { useState, useEffect, useRef } from 'react'
import { sb } from '../lib/supabase'
import MapView from '../components/MapView'
import { floorFor, COMMISSION } from '../constants'
import { t } from '../i18n'
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
  const [upcoming,  setUpcoming]  = useState([])   // my accepted scheduled jobs
  const [schedAvail,setSchedAvail]= useState([])   // scheduled jobs anyone can take
  const [photoBusy, setPhotoBusy] = useState(null)

  const timer=useRef(null), chan=useRef(null), jobChan=useRef(null)
  useEffect(() => { if(profile) loadTodayStats() }, [profile])
  // Restore an in-progress job after refresh
  useEffect(() => {
    if (!user?.id) return
    sb.from('bookings').select('*').eq('worker_id', user.id)
      .in('status', ['assigned','priced']).order('created_at', { ascending:false }).limit(3)
      .then(({ data }) => {
        const j = (data||[]).find(b => !(b.is_scheduled && b.scheduled_at && new Date(b.scheduled_at) > new Date(Date.now()+15*60*1000)))
        if (j) setActiveJob(prev => prev || j)
      })
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
        const b = payload.new
        if (b.status==='completed' && b.payment_status==='paid') {
          const amt = b.amount||0, fee = Math.round(amt*COMMISSION)
          setTodayEarn(e=>e+amt-fee); setTodayJobs(j=>j+1)
          setActiveJob(null); setPrice(''); setNote('')
          showToast('Payment verified ✓ ₹'+(amt-fee).toLocaleString('en-IN')+' added to your weekly payout 💰')
          return
        }
        setActiveJob(prev => prev ? { ...prev, ...b } : prev)
        if (b.payment_status==='claimed') showToast('Customer has paid Kaam Ready — being verified 💸')
      }).subscribe()
    return () => { if (jobChan.current) sb.removeChannel(jobChan.current) }
  }, [activeJob?.id])
  async function loadTodayStats() {
    if(!user) return
    const today=new Date().toISOString().slice(0,10)
    const { data } = await sb.from('bookings').select('amount').eq('worker_id',user.id).eq('status','completed').gte('created_at',today)
    if(data) { setTodayJobs(data.length); setTodayEarn(data.reduce((s,b)=>s+(b.amount||0),0)) }
  }
  function kmBetween(lat1,lng1,lat2,lng2) {
    if (!lat1||!lng1||!lat2||!lng2) return null
    const R=6371, dLat=(lat2-lat1)*Math.PI/180, dLng=(lng2-lng1)*Math.PI/180
    const a=Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2
    return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))
  }
  // Nearest workers get the alert first; farther workers see it only if still unclaimed
  function mySkills() {
    const sk = profile?.skills && profile.skills.length ? profile.skills : [profile?.skill]
    return sk.filter(Boolean)
  }
  function matchesSkill(b) {
    if (!b?.service_id || b.service_id === 'emerg') return true   // emergencies go to everyone
    return mySkills().includes(b.service_id)
  }
  function offerJob(b) {
    if (b.city !== profile?.city) return
    if (!matchesSkill(b)) return
    let delay = 0
    if (b.preferred_worker_id && b.preferred_worker_id !== user.id) delay = 60000  // preferred worker gets 60s head start
    else if (b.preferred_worker_id === user.id) delay = 0
    else {
      const d = kmBetween(profile?.lat, profile?.lng, b.address_lat, b.address_lng)
      if (d !== null) delay = d <= 5 ? 0 : d <= 10 ? 20000 : 45000
    }
    const show = async () => {
      if (delay > 0) {  // re-check it wasn't taken meanwhile
        const { data } = await sb.from('bookings').select('status').eq('id', b.id).single()
        if (data?.status !== 'searching') return
      }
      setJobAlert(prev => prev || b)
      showToast(b.preferred_worker_id===user.id ? 'A customer requested YOU! ⭐' : 'New job request! 🔔')
    }
    delay === 0 ? show() : setTimeout(show, delay)
  }
  function subscribeToJobs() {
    chan.current = sb.channel('new-jobs-'+profile?.city)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'bookings',filter:'status=eq.searching'},payload=>offerJob(payload.new))
      .subscribe()
    // Also pick up jobs that were already waiting before we came online
    sb.from('bookings').select('*').eq('status','searching').eq('city', profile?.city)
      .in('service_id', [...mySkills(), 'emerg'])
      .gte('created_at', new Date(Date.now()-3*60*1000).toISOString())
      .order('created_at',{ascending:false}).limit(1)
      .then(({ data }) => { if (data?.[0]) offerJob(data[0]) })
    loadScheduled()
  }
  async function loadScheduled() {
    const [avail, mine] = await Promise.all([
      sb.from('bookings').select('*').eq('status','scheduled').is('worker_id', null).eq('city', profile?.city).in('service_id', [...mySkills(), 'emerg']).gte('scheduled_at', new Date().toISOString()).order('scheduled_at').limit(5),
      sb.from('bookings').select('*').eq('worker_id', user.id).eq('is_scheduled', true).eq('status','assigned').gte('scheduled_at', new Date(Date.now()-30*60*1000).toISOString()).order('scheduled_at').limit(5),
    ])
    setSchedAvail(avail.data || [])
    setUpcoming(mine.data || [])
  }
  async function acceptScheduled(b) {
    const { data, error } = await sb.from('bookings').update({ worker_id: user.id, status:'assigned', worker:{ id:user.id, name:profile?.name, skill:profile?.skill, rating:profile?.rating, ico:'👷' } }).eq('id', b.id).is('worker_id', null).select()
    if (error) { showToast(error.message); return }
    if (!data || data.length===0) { showToast('Another worker already took this job'); loadScheduled(); return }
    showToast('Scheduled job is yours ✓ 📅')
    loadScheduled()
  }
  async function uploadJobPhoto(which, file) {
    if (!activeJob || !file) return
    setPhotoBusy(which)
    const path = `${activeJob.id}/${which}.jpg`
    const { error } = await sb.storage.from('job-photos').upload(path, file, { upsert: true })
    if (!error) {
      const { data: pub } = sb.storage.from('job-photos').getPublicUrl(path)
      const col = which==='before' ? 'photo_before_url' : 'photo_after_url'
      await sb.from('bookings').update({ [col]: pub.publicUrl }).eq('id', activeJob.id)
      setActiveJob(prev => ({ ...prev, [col]: pub.publicUrl }))
      showToast('Photo saved ✓')
    } else showToast(error.message)
    setPhotoBusy(null)
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
    const { data, error } = await sb.from('bookings')
      .update({status:'assigned',worker_id:user.id,worker:w})
      .eq('id',jobAlert.id).eq('status','searching').is('worker_id', null)
      .select()
    if (error) { showToast('Could not accept: '+error.message); return }
    if (!data || data.length===0) { showToast('Too late — another worker took this job'); setJobAlert(null); return }
    setActiveJob({...data[0],worker:w}); setJobAlert(null); showToast('Job accepted! Navigate to customer 🗺️')
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
  function toggleOnline() { const next=!online; setOnline(next); showToast(next?'You are now Online 🟢':'You are now Offline') }
  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <div style={{ background:online?GREEN:'#1C1C1E', padding:'10px 20px 6px', display:'flex', justifyContent:'space-between', transition:'background .3s' }}>
        <span style={{ color:'#fff', fontSize:12, fontWeight:700 }}>Kaam Ready</span>
        <span style={{ color:'#fff', fontSize:11, fontWeight:800 }}>{online?'● '+t('ONLINE'):'● '+t('OFFLINE')}</span>
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
            <p style={{ fontWeight:800, fontSize:16, color:'#fff' }}>{t('You are Offline')}</p>
            <p style={{ fontSize:13, color:'#555', margin:'6px 0 18px' }}>Toggle the switch above to start receiving jobs</p>
            <button onClick={toggleOnline} style={{ background:Y, border:'none', borderRadius:14, padding:'14px 28px', fontWeight:800, fontSize:14, cursor:'pointer' }}>{t('Go Online Now')}</button>
          </div>
        )}
        {online && !jobAlert && !activeJob && (
          <div style={{ background:'#111', border:'1.5px solid '+Y, borderRadius:20, padding:'28px 24px', textAlign:'center' }}>
            <div style={{ fontSize:44, marginBottom:12, animation:'float 1.5s ease-in-out infinite' }}>🟢</div>
            <p style={{ fontWeight:800, fontSize:16, color:'#fff' }}>{t('Waiting for jobs...')}</p>
            <p style={{ fontSize:13, color:'#636366', marginTop:6 }}>You'll be notified instantly when a job matches</p>
          </div>
        )}
        {online && upcoming.length>0 && (
          <div style={{ background:'#111', border:'1.5px solid #5B21B6', borderRadius:20, padding:16 }}>
            <p style={{ color:'#a78bfa', fontWeight:800, fontSize:14, marginBottom:10 }}>📅 {t('Upcoming Jobs')}</p>
            {upcoming.map(b => (
              <div key={b.id} style={{ borderTop:'1px solid #1a1a1a', padding:'10px 0' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <p style={{ color:'#fff', fontSize:13, fontWeight:700 }}>{b.service} · {b.customer_name||''}</p>
                    <p style={{ color:'#636366', fontSize:11, marginTop:2 }}>{new Date(b.scheduled_at).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})} · {b.address}</p>
                  </div>
                  <button onClick={() => setActiveJob(b)}
                    style={{ background:Y, border:'none', borderRadius:10, padding:'8px 14px', fontWeight:800, fontSize:12, cursor:'pointer', flexShrink:0 }}>{t('Start Job')}</button>
                </div>
              </div>
            ))}
          </div>
        )}
        {online && !activeJob && schedAvail.length>0 && (
          <div style={{ background:'#111', border:'1.5px dashed #5B21B6', borderRadius:20, padding:16 }}>
            <p style={{ color:'#a78bfa', fontWeight:800, fontSize:14, marginBottom:10 }}>📅 {t('Scheduled Jobs Available')}</p>
            {schedAvail.map(b => (
              <div key={b.id} style={{ borderTop:'1px solid #1a1a1a', padding:'10px 0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <p style={{ color:'#fff', fontSize:13, fontWeight:700 }}>{b.service}</p>
                  <p style={{ color:'#636366', fontSize:11, marginTop:2 }}>{new Date(b.scheduled_at).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</p>
                </div>
                <button onClick={() => acceptScheduled(b)}
                  style={{ background:'#22c55e', color:'#fff', border:'none', borderRadius:10, padding:'8px 14px', fontWeight:800, fontSize:12, cursor:'pointer', flexShrink:0 }}>✓ {t('Accept')}</button>
              </div>
            ))}
          </div>
        )}
        {jobAlert && (
          <div style={{ background:'#1C1C1E', borderRadius:20, padding:16, border:'2px solid '+Y, animation:'popIn .3s ease' }}>
            <h3 style={{ color:Y, fontWeight:800, fontSize:15, marginBottom:12 }}>🔔 {t('New Job Request!')}</h3>
            {[['Service',jobAlert.service],['Address',jobAlert.address],['City',jobAlert.city]].map(([k,v]) => (
              <div key={k} style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                <span style={{ color:'#636366', fontSize:12 }}>{k}</span>
                <span style={{ color:'#fff', fontSize:13, fontWeight:600, maxWidth:'60%', textAlign:'right' }}>{v}</span>
              </div>
            ))}
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
              <span style={{ color:'#636366', fontSize:12 }}>{t('Starting price')}</span>
              <span style={{ color:Y, fontSize:18, fontWeight:800 }}>from ₹{jobFloor(jobAlert)}</span>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={acceptJob} style={{ flex:1, background:GREEN, color:'#fff', border:'none', borderRadius:12, padding:14, fontWeight:800, fontSize:14, cursor:'pointer' }}>✓ {t('Accept')}</button>
              <button onClick={() => setJobAlert(null)} style={{ flex:1, background:RED, color:'#fff', border:'none', borderRadius:12, padding:14, fontWeight:800, fontSize:14, cursor:'pointer' }}>✕ {t('Decline')}</button>
            </div>
          </div>
        )}
        {activeJob && (
          <div style={{ background:'#111', borderRadius:20, padding:16, border:'2px solid '+GREEN }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <p style={{ fontWeight:800, fontSize:14, color:'#fff' }}>🔧 {t('Active Job')}</p>
              <span style={{ background:'#D1FAE5', color:'#065F46', fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:8 }}>
                {activeJob.payment_status==='claimed' ? t('Payment Sent') : activeJob.status==='priced' ? t('Awaiting Payment') : t('In Progress')}
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
                <button onClick={navigateToCustomer} style={{ flex:1, background:'#2a2a2a', color:'#fff', border:'none', borderRadius:12, padding:11, fontWeight:700, fontSize:13, cursor:'pointer' }}>🗺️ {t('Directions')}</button>
                {activeJob.customer_phone
                  ? <a href={'tel:+91'+activeJob.customer_phone} style={{ flex:1, background:Y, border:'none', borderRadius:12, padding:11, fontWeight:700, fontSize:13, cursor:'pointer', textAlign:'center', textDecoration:'none', color:'#000' }}>📞 {t('Call Customer')}</a>
                  : <button onClick={() => showToast('Customer phone not available for this booking')} style={{ flex:1, background:Y, border:'none', borderRadius:12, padding:11, fontWeight:700, fontSize:13, cursor:'pointer' }}>📞 Call</button>}
              </div>
            </>}
            {activeJob.status!=='priced' && !activeJob.payment_status && (
              <div style={{ display:'flex', gap:8, marginTop:10 }}>
                {[['before', activeJob.photo_before_url],['after', activeJob.photo_after_url]].map(([which, url]) => (
                  <label key={which} style={{ flex:1, background: url ? '#0d2818' : '#1C1C1E', border:'1px solid '+(url?GREEN:'#2a2a2a'), borderRadius:12, padding:10, textAlign:'center', cursor:'pointer', fontSize:12, fontWeight:700, color: url ? '#4ade80' : '#888' }}>
                    {photoBusy===which ? '...' : (url ? '✓ ' : '📷 ')+t(which==='before'?'Before':'After')}
                    <input type="file" accept="image/*" capture="environment" style={{ display:'none' }}
                      onChange={e => uploadJobPhoto(which, e.target.files[0])} />
                  </label>
                ))}
              </div>
            )}
            {activeJob.status!=='priced' && !showPrice && (
              <button onClick={() => { setPrice(''); setNote(''); setShowPrice(true) }} style={{ width:'100%', background:GREEN, color:'#fff', border:'none', borderRadius:14, padding:15, fontWeight:800, fontSize:14, cursor:'pointer', marginTop:10 }}>{t('Work Done — Set Final Price ₹')}</button>
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
                  <button onClick={submitPrice} disabled={busy} style={{ flex:2, background:Y, border:'none', borderRadius:10, padding:12, fontWeight:800, fontSize:13, cursor:'pointer', opacity:busy?.6:1 }}>{busy?'...':t('Send to Customer →')}</button>
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
                <p style={{ color:'#fff', fontWeight:800, fontSize:15 }}>Customer paid ₹{activeJob.amount} to Kaam Ready</p>
                <p style={{ color:'#9ca3af', fontSize:12, marginTop:4 }}>Being verified — your share ₹{(activeJob.amount||0) - Math.round((activeJob.amount||0)*COMMISSION)} (after 10% fee) joins your weekly payout. Paid every week to your UPI.</p>
              </div>
            )}
          </div>
        )}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
          {[['₹'+todayEarn.toLocaleString('en-IN'),t('Today')],[todayJobs,t('Jobs done')],[(profile?.rating||5.0)+'⭐',t('Rating')]].map(([v,l]) => (
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
