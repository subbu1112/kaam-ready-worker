import { useState, useEffect, useRef } from 'react'
import { sb } from '../lib/supabase'
import MapView from '../components/MapView'
import { floorFor, EMPTY_BREAKDOWN, breakdownTotal, workerShare } from '../constants'
import { t } from '../i18n'
import { C, card, scroller, btnPrimary, btnGreen, input, label } from '../theme'
import { Pill } from '../components/UI'

export default function HomeScreen({ user, profile, showToast, setTab }) {
  const [online,    setOnline]    = useState(() => { try { return localStorage.getItem('kr_worker_online') === 'true' } catch { return false } })
  const [jobAlert,  setJobAlert]  = useState(null)
  const [activeJob, setActiveJob] = useState(null)
  const [todayEarn, setTodayEarn] = useState(0)
  const [todayJobs, setTodayJobs] = useState(0)
  const [otpOpen,   setOtpOpen]   = useState(false)   // customer-OTP entry panel open
  const [otpInput,  setOtpInput]  = useState('')
  const [bd,        setBd]        = useState(EMPTY_BREAKDOWN) // labor/material/additional/note
  const [busy,      setBusy]      = useState(false)
  const [upcoming,  setUpcoming]  = useState([])
  const [schedAvail,setSchedAvail]= useState([])
  const [photoBusy, setPhotoBusy] = useState(null)
  const [demand,    setDemand]    = useState(false)   // "high demand areas" hint
  const timer=useRef(null), chan=useRef(null), jobChan=useRef(null)

  useEffect(() => { if(profile) loadTodayStats() }, [profile])

  // Set offline when page closes
  useEffect(() => {
    const setOffline = () => {
      if (user?.id) sb.from('workers').update({ is_online: false }).eq('id', user.id).then(() => {})
    }
    window.addEventListener('beforeunload', setOffline)
    return () => window.removeEventListener('beforeunload', setOffline)
  }, [user?.id])

  // Restore an in-progress job after refresh
  useEffect(() => {
    if (!user?.id) return
    sb.from('bookings').select('*').eq('worker_id', user.id)
      .in('status', ['assigned','otp_verified','priced']).order('created_at', { ascending:false }).limit(3)
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
    try { localStorage.setItem('kr_worker_online', online) } catch { /* storage blocked */ }
  }, [online, user?.id])

  // Watch active job for payment status changes
  useEffect(() => {
    if (jobChan.current) { sb.removeChannel(jobChan.current); jobChan.current = null }
    if (!activeJob?.id) return
    jobChan.current = sb.channel('job-'+activeJob.id)
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'bookings',filter:'id=eq.'+activeJob.id},payload=>{
        setActiveJob(prev => prev ? { ...prev, ...payload.new } : prev)
        const ps = payload.new.payment_status
        if (ps==='pending_verification') showToast('Customer submitted payment — awaiting admin verification 🔍')
        if (ps==='verified') {
          showToast('Payment verified by admin ✅ Earnings credited!')
          loadTodayStats()
          setTimeout(() => setActiveJob(null), 2000)
        }
      }).subscribe()
    return () => { if (jobChan.current) sb.removeChannel(jobChan.current) }
  }, [activeJob?.id])

  // Ring + vibrate for 3 seconds whenever a new job request arrives, so the
  // worker notices even if the phone is in their pocket.
  useEffect(() => {
    if (!jobAlert?.id) return
    let ctx, iv, to, closed = false
    const closeCtx = () => {
      if (closed || !ctx) return
      closed = true
      try { if (ctx.state !== 'closed') ctx.close() } catch { /* already closed */ }
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext
      if (AC) {
        ctx = new AC()
        ctx.resume?.()
        const beep = () => {
          ;[1046, 1318].forEach((freq, i) => {           // two-tone "ding-dong"
            const o = ctx.createOscillator(), g = ctx.createGain()
            o.type = 'sine'; o.frequency.value = freq
            o.connect(g); g.connect(ctx.destination)
            const tm = ctx.currentTime + i * 0.18
            g.gain.setValueAtTime(0.0001, tm)
            g.gain.exponentialRampToValueAtTime(0.5, tm + 0.02)
            g.gain.exponentialRampToValueAtTime(0.0001, tm + 0.16)
            o.start(tm); o.stop(tm + 0.18)
          })
        }
        beep()
        iv = setInterval(beep, 700)
      }
      if (navigator.vibrate) navigator.vibrate([400, 200, 400, 200, 400])
      to = setTimeout(() => { clearInterval(iv); closeCtx() }, 3000)
    } catch { /* audio unavailable — ignore */ }
    return () => { clearInterval(iv); clearTimeout(to); closeCtx() }
  }, [jobAlert?.id])

  async function loadTodayStats() {
    if(!user) return
    const today=new Date().toISOString().slice(0,10)
    const { data } = await sb.from('bookings').select('amount,payment_status')
      .eq('worker_id',user.id)
      .in('payment_status',['verified','paid'])
      .gte('created_at',today)
    if(data) { setTodayJobs(data.length); setTodayEarn(data.reduce((s,b)=>s+(b.amount||0),0)) }
  }

  function kmBetween(lat1,lng1,lat2,lng2) {
    if (!lat1||!lng1||!lat2||!lng2) return null
    const Rk=6371, dLat=(lat2-lat1)*Math.PI/180, dLng=(lng2-lng1)*Math.PI/180
    const a=Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2
    return Rk*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))
  }

  // The worker's trade(s): primary skill + any extra skills (multi-skilled).
  function mySkillIds() {
    const set = new Set()
    if (profile?.skill) set.add(profile.skill)
    ;(profile?.skills || []).forEach(s => s && set.add(s))
    return [...set]
  }
  // Emergency jobs are urgent and broadcast to EVERY worker, regardless of trade.
  const isEmergency = b => b?.service_id === 'emerg'
  function matchesSkill(b) {
    if (isEmergency(b)) return true     // 🚨 emergency → reaches every worker
    const ids = mySkillIds()
    if (!ids.length) return true        // no skills on file → don't hard-block
    if (!b?.service_id) return true     // legacy booking without service_id → allow
    return ids.includes(b.service_id)
  }

  function offerJob(b) {
    if (b.city !== profile?.city) return
    if (!matchesSkill(b)) return        // electrician won't get plumber jobs, etc.
    let delay = 0
    if (isEmergency(b)) delay = 0       // 🚨 emergency → alert every worker instantly
    else if (b.preferred_worker_id && b.preferred_worker_id !== user.id) delay = 60000
    else if (b.preferred_worker_id === user.id) delay = 0
    else {
      const d = kmBetween(profile?.lat, profile?.lng, b.address_lat, b.address_lng)
      if (d !== null) delay = d <= 5 ? 0 : d <= 10 ? 20000 : 45000
    }
    const show = async () => {
      if (delay > 0) {
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
    const ids = mySkillIds()
    let q = sb.from('bookings').select('*').eq('status','searching').eq('city', profile?.city)
      .gte('created_at', new Date(Date.now()-3*60*1000).toISOString())
      .order('created_at',{ascending:false}).limit(1)
    if (ids.length) q = q.in('service_id', [...new Set([...ids, 'emerg'])])  // emergencies reach everyone
    q.then(({ data }) => { if (data?.[0]) offerJob(data[0]) })
    loadScheduled()
  }

  async function loadScheduled() {
    const ids = mySkillIds()
    let availQ = sb.from('bookings').select('*').eq('status','scheduled').is('worker_id', null).eq('city', profile?.city).gte('scheduled_at', new Date().toISOString()).order('scheduled_at').limit(5)
    if (ids.length) availQ = availQ.in('service_id', ids)
    const [avail, mine] = await Promise.all([
      availQ,
      sb.from('bookings').select('*').eq('worker_id', user.id).eq('is_scheduled', true).eq('status','assigned').gte('scheduled_at', new Date(Date.now()-30*60*1000).toISOString()).order('scheduled_at').limit(5),
    ])
    setSchedAvail(avail.data || [])
    setUpcoming(mine.data || [])
  }

  async function acceptScheduled(b) {
    const { error } = await sb.from('bookings').update({ worker_id: user.id, status:'assigned', worker:{ id:user.id, name:profile?.name, phone:profile?.phone, skill:profile?.skill, rating:profile?.rating, ico:'👷' } }).eq('id', b.id).is('worker_id', null)
    if (error) { showToast(error.message); return }
    showToast('Scheduled job is yours ✓ 📅')
    loadScheduled()
  }

  async function uploadJobPhoto(which, file) {
    if (!activeJob || !file) return
    setPhotoBusy(which)
    // Unique name per upload: storage's upsert path is rejected by RLS, and
    // unique names also avoid stale CDN caches on re-taken photos.
    const path = `${activeJob.id}/${which}-${Date.now()}.jpg`
    const { error } = await sb.storage.from('job-photos').upload(path, file)
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
    if(!jobAlert || busy) return
    setBusy(true)
    const pos = await getPosition()
    if (pos) sb.from('workers').update({ lat: pos.lat, lng: pos.lng }).eq('id', user.id).then(()=>{})
    // phone travels inside the customer's own booking row (RLS-protected)
    const w={id:user.id,name:profile?.name,phone:profile?.phone,skill:profile?.skill,rating:profile?.rating,jobs:profile?.total_jobs,ico:'👷',eta:'8 min',dist:'1.0 km',lat:pos?.lat,lng:pos?.lng}
    // Atomic claim: only succeeds if still open AND this worker is allowed (RLS).
    const { data, error } = await sb.from('bookings')
      .update({ status:'assigned', worker_id:user.id, worker:w })
      .eq('id', jobAlert.id).eq('status','searching').is('worker_id', null)
      .select().single()
    setBusy(false)
    if (error || !data) {
      setJobAlert(null)
      showToast('Could not accept — it may already be taken, or your KYC isn\'t approved yet')
      return
    }
    setActiveJob(data); setJobAlert(null); showToast('Job accepted! Navigate to customer 🗺️')
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

  // STEP 1 — Customer OTP verification.
  async function verifyOtp() {
    if (!activeJob || busy) return
    const entered = otpInput.replace(/\D/g, '').trim()
    if (entered.length < 4) { showToast('Enter the 4-digit code the customer shows you'); return }
    setBusy(true)
    const { data } = await sb.from('bookings').select('completion_otp').eq('id', activeJob.id).single()
    setBusy(false)
    const real = (data?.completion_otp ?? '').toString().trim()
    if (!real) { showToast('No OTP on file — ask the customer to refresh their app'); return }
    if (entered !== real) { showToast('OTP does not match. Re-check with the customer.'); return }
    const ts = new Date().toISOString()
    const { error } = await sb.from('bookings').update({ status:'otp_verified', otp_verified_at: ts }).eq('id', activeJob.id)
    if (error) { showToast(error.message); return }
    setActiveJob(prev => ({ ...prev, status:'otp_verified', otp_verified_at: ts }))
    setOtpOpen(false); setOtpInput('')
    showToast('OTP verified ✓ Job complete — now set your final price')
  }

  // STEP 2 — Detailed price quotation.
  async function submitQuote() {
    if (!activeJob || busy) return
    const labor = parseInt(bd.labor, 10) || 0
    const total = breakdownTotal(bd)
    const floor = jobFloor(activeJob)
    if (!labor) { showToast('Enter the labour charge'); return }
    if (total < floor) { showToast(`Total can't be below the ₹${floor} minimum`); return }
    setBusy(true)
    const { error } = await sb.from('bookings').update({
      status:'priced', amount: total,
      labor_charge: labor,
      material_cost: parseInt(bd.material, 10) || 0,
      additional_charge: parseInt(bd.additional, 10) || 0,
      price_note: bd.note.trim() || null,
      priced_at: new Date().toISOString(),
    }).eq('id', activeJob.id)
    setBusy(false)
    if (error) { showToast(error.message); return }
    setActiveJob(prev => ({ ...prev, status:'priced', amount: total }))
    setBd(EMPTY_BREAKDOWN)
    showToast('Quotation sent — waiting for customer to accept & pay 💳')
  }

  function toggleOnline() { const next=!online; setOnline(next); showToast(next?'You are now On Duty 🟢':'You are now Off Duty') }

  const bookingRef = activeJob?.id ? '#KR-' + activeJob.id.slice(0,8).toUpperCase() : null
  // 'pending' = booking created, worker not yet priced — treat same as no payment
  const paymentStarted = ps => ps && ps !== 'pending'

  const KV = ({ k, v }) => (
    <div style={{ display:'flex', justifyContent:'space-between', gap:12, padding:'9px 0', borderBottom:`1px solid ${C.lineSoft}` }}>
      <span style={{ fontSize:13, color:C.text3, flexShrink:0 }}>{k}</span>
      <span style={{ fontSize:13, fontWeight:600, color:C.text, maxWidth:'62%', textAlign:'right' }}>{v}</span>
    </div>
  )

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:C.page }}>

      {/* ── Black duty bar: ON/OFF DUTY pill, like the reference ── */}
      <div style={{ background:C.nav, padding:'12px 14px', display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
        <img src="/icon-192.png" alt="" style={{ width:28, height:28, borderRadius:8 }} />
        <div onClick={toggleOnline}
          style={{ display:'flex', alignItems:'center', gap:9, background:'#fff', borderRadius:999,
            padding:'5px 12px 5px 8px', cursor:'pointer', flexShrink:0 }}>
          <span style={{ width:34, height:19, borderRadius:999, background: online ? C.green : '#C9C9CE',
            position:'relative', transition:'background .2s', flexShrink:0, display:'inline-block' }}>
            <span style={{ position:'absolute', top:2.5, left: online ? 17.5 : 2.5, width:14, height:14,
              borderRadius:'50%', background:'#fff', transition:'left .2s' }} />
          </span>
          <span style={{ fontSize:11.5, fontWeight:800, letterSpacing:.4, color: online ? C.green : C.text2 }}>
            {online ? 'ON DUTY' : 'OFF DUTY'}
          </span>
        </div>
        <div style={{ flex:1 }} />
        <span onClick={() => setTab && setTab('notifications')} style={{ fontSize:17, cursor:'pointer' }}>🔔</span>
      </div>

      {/* ── Today's earnings strip ── */}
      <div onClick={() => setTab && setTab('earnings')}
        style={{ background:C.navSoft, padding:'11px 16px', display:'flex', alignItems:'center',
          justifyContent:'space-between', cursor:'pointer', flexShrink:0 }}>
        <span style={{ color:C.onDark2, fontSize:12, fontWeight:600 }}>Today's Earnings</span>
        <span style={{ color:'#fff', fontSize:15, fontWeight:800 }}>
          ₹{Math.round(todayEarn * 0.9).toLocaleString('en-IN')}
          <span style={{ fontSize:11, fontWeight:600, color:C.onDark2, marginLeft:6 }}>▾</span>
        </span>
      </div>

      <div style={{ ...scroller, padding:14, display:'flex', flexDirection:'column', gap:12 }}>

        {/* ── Map + high-demand toggle (when no active job) ── */}
        {!activeJob && (
          <div style={{ ...card, overflow:'hidden' }}>
            <MapView workerLat={profile?.lat} workerLng={profile?.lng}
              customerLat={profile?.lat} customerLng={profile?.lng}
              style={{ height:190, borderRadius:0 }} />
            <div style={{ padding:'12px 14px', display:'flex', alignItems:'center', gap:12, borderTop:`1px solid ${C.line}` }}>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:13.5, fontWeight:700, color:C.text }}>High demand areas</p>
                <p style={{ fontSize:11.5, color:C.text3, marginTop:2 }}>Turn on to see where jobs are booking now</p>
              </div>
              <div onClick={() => { setDemand(v => !v); showToast(demand ? 'Demand view off' : 'Showing high demand areas 🔥') }}
                style={{ width:44, height:25, borderRadius:999, background: demand ? C.green : '#D6D6D9',
                  position:'relative', cursor:'pointer', transition:'background .2s', flexShrink:0 }}>
                <div style={{ width:19, height:19, background:'#fff', borderRadius:'50%', position:'absolute',
                  top:3, left: demand ? 22 : 3, transition:'left .2s', boxShadow:'0 1px 3px rgba(0,0,0,.2)' }} />
              </div>
            </div>
            {demand && (
              <div style={{ background:C.amberL, padding:'10px 14px', borderTop:`1px solid ${C.line}` }}>
                <p style={{ fontSize:12, color:'#92400E', fontWeight:600 }}>
                  🔥 {profile?.city || 'Your city'} — most bookings come in between 9–11 AM and 6–9 PM.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Duty status card ── */}
        {!online && !activeJob && (
          <div style={{ ...card, padding:'26px 22px', textAlign:'center' }}>
            <div style={{ fontSize:40, marginBottom:10 }}>😴</div>
            <p style={{ fontWeight:800, fontSize:16, color:C.text }}>{t('You are Offline')}</p>
            <p style={{ fontSize:13, color:C.text3, margin:'6px 0 16px' }}>{t('Toggle the switch above to start receiving jobs')}</p>
            <button onClick={toggleOnline} style={{ ...btnPrimary, width:'auto', padding:'13px 26px' }}>{t('Go Online Now')}</button>
          </div>
        )}
        {online && !jobAlert && !activeJob && (
          <div style={{ ...card, padding:'26px 22px', textAlign:'center', border:`1.5px solid ${C.green}` }}>
            <div style={{ fontSize:40, marginBottom:10 }}>🟢</div>
            <p style={{ fontWeight:800, fontSize:16, color:C.text }}>{t('Waiting for jobs...')}</p>
            <p style={{ fontSize:13, color:C.text3, marginTop:6 }}>{t("You'll be notified instantly when a job matches")}</p>
          </div>
        )}

        {/* ── Scheduled work ── */}
        {online && upcoming.length>0 && (
          <div style={{ ...card, padding:14 }}>
            <p style={{ color:C.purple, fontWeight:800, fontSize:13.5, marginBottom:6 }}>📅 {t('Upcoming Jobs')}</p>
            {upcoming.map(b => (
              <div key={b.id} style={{ borderTop:`1px solid ${C.lineSoft}`, padding:'11px 0',
                display:'flex', justifyContent:'space-between', alignItems:'center', gap:10 }}>
                <div style={{ minWidth:0 }}>
                  <p style={{ color:C.text, fontSize:13.5, fontWeight:700 }}>{b.service} · {b.customer_name||''}</p>
                  <p style={{ color:C.text3, fontSize:11.5, marginTop:2 }}>{new Date(b.scheduled_at).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})} · {b.address}</p>
                </div>
                <button onClick={() => setActiveJob(b)}
                  style={{ ...btnPrimary, width:'auto', padding:'9px 15px', fontSize:12.5, flexShrink:0 }}>{t('Start Job')}</button>
              </div>
            ))}
          </div>
        )}
        {online && !activeJob && schedAvail.length>0 && (
          <div style={{ ...card, padding:14, border:`1.5px dashed ${C.purple}` }}>
            <p style={{ color:C.purple, fontWeight:800, fontSize:13.5, marginBottom:6 }}>📅 {t('Scheduled Jobs Available')}</p>
            {schedAvail.map(b => (
              <div key={b.id} style={{ borderTop:`1px solid ${C.lineSoft}`, padding:'11px 0',
                display:'flex', justifyContent:'space-between', alignItems:'center', gap:10 }}>
                <div style={{ minWidth:0 }}>
                  <p style={{ color:C.text, fontSize:13.5, fontWeight:700 }}>{b.service}</p>
                  <p style={{ color:C.text3, fontSize:11.5, marginTop:2 }}>{new Date(b.scheduled_at).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</p>
                </div>
                <button onClick={() => acceptScheduled(b)}
                  style={{ ...btnGreen, width:'auto', padding:'9px 15px', fontSize:12.5, flexShrink:0 }}>✓ {t('Accept')}</button>
              </div>
            ))}
          </div>
        )}

        {/* ── Incoming job request ── */}
        {jobAlert && (
          <div style={{ ...card, padding:16, border:`2px solid ${C.yellow}` }}>
            <h3 style={{ color:C.text, fontWeight:800, fontSize:15, marginBottom:10 }}>🔔 {t('New Job Request!')}</h3>
            <KV k="Service" v={jobAlert.service} />
            <KV k="Address" v={jobAlert.address} />
            <KV k="City"    v={jobAlert.city} />
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 0 14px' }}>
              <span style={{ color:C.text3, fontSize:12.5 }}>{t('Starting price')}</span>
              <span style={{ color:C.green, fontSize:19, fontWeight:900 }}>from ₹{jobFloor(jobAlert)}</span>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={acceptJob} style={{ ...btnGreen, flex:1 }}>✓ {t('Accept')}</button>
              <button onClick={() => setJobAlert(null)}
                style={{ ...btnPrimary, flex:1, background:C.card, color:C.red, border:`1.5px solid ${C.red}` }}>✕ {t('Decline')}</button>
            </div>
          </div>
        )}

        {/* ── Active job ── */}
        {activeJob && (
          <div style={{ ...card, padding:16, border:`1.5px solid ${C.green}` }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:3, gap:8 }}>
              <p style={{ fontWeight:800, fontSize:14.5, color:C.text }}>🔧 {t('Active Job')}</p>
              {activeJob.payment_status==='verified'
                ? <Pill bg={C.greenL} color={C.green}>✅ Verified</Pill>
                : activeJob.payment_status==='pending_verification'
                ? <Pill bg={C.blueL} color={C.blue}>🔍 Under Review</Pill>
                : <Pill>{activeJob.status==='priced' ? t('Awaiting Payment') : activeJob.status==='otp_verified' ? '✅ Completed' : t('In Progress')}</Pill>}
            </div>
            {bookingRef && <p style={{ color:C.text3, fontSize:11, fontFamily:'monospace', marginBottom:8 }}>{bookingRef}</p>}
            <KV k="Customer" v={activeJob.customer_name||'—'} />
            <KV k="Service"  v={activeJob.service} />
            <KV k="Address"  v={activeJob.address} />

            {/* Map + actions only while the job is in progress */}
            {!paymentStarted(activeJob.payment_status) && <>
              <MapView
                customerLat={activeJob.address_lat} customerLng={activeJob.address_lng}
                workerLat={activeJob.worker?.lat || profile?.lat} workerLng={activeJob.worker?.lng || profile?.lng}
                style={{ borderRadius:12, height:160, overflow:'hidden', marginTop:12, border:`1px solid ${C.line}` }} />
              <div style={{ display:'flex', gap:8, marginTop:10 }}>
                <button onClick={navigateToCustomer}
                  style={{ ...btnPrimary, flex:1, background:C.cardAlt, color:C.text, border:`1.5px solid ${C.line}`, padding:12, fontSize:13 }}>🗺️ {t('Directions')}</button>
                {activeJob.customer_phone
                  ? <a href={'tel:+91'+activeJob.customer_phone}
                      style={{ ...btnPrimary, flex:1, padding:12, fontSize:13, textAlign:'center', textDecoration:'none', display:'block' }}>📞 {t('Call Customer')}</a>
                  : <button onClick={() => showToast('Customer phone not available')}
                      style={{ ...btnPrimary, flex:1, padding:12, fontSize:13 }}>📞 Call</button>}
              </div>
            </>}

            {/* Before / after photos — only before the price is sent */}
            {!paymentStarted(activeJob.payment_status) && activeJob.status!=='priced' && (
              <div style={{ display:'flex', gap:8, marginTop:10 }}>
                {[['before', activeJob.photo_before_url],['after', activeJob.photo_after_url]].map(([which, url]) => (
                  <label key={which} style={{ flex:1, background: url ? C.greenL : C.cardAlt,
                    border:`1.5px solid ${url ? C.green : C.line}`, borderRadius:12, padding:11, textAlign:'center',
                    cursor:'pointer', fontSize:12.5, fontWeight:700, color: url ? C.green : C.text2 }}>
                    {photoBusy===which ? '...' : (url ? '✓ ' : '📷 ')+t(which==='before'?'Before':'After')}
                    <input type="file" accept="image/*" capture="environment" style={{ display:'none' }}
                      onChange={e => uploadJobPhoto(which, e.target.files[0])} />
                  </label>
                ))}
              </div>
            )}

            {/* STEP 1 — Work done → verify customer OTP */}
            {activeJob.status!=='priced' && !paymentStarted(activeJob.payment_status) && !activeJob.otp_verified_at && !otpOpen && (
              <button onClick={() => { setOtpInput(''); setOtpOpen(true) }}
                style={{ ...btnGreen, marginTop:10 }}>✅ Work Done — Verify Customer OTP</button>
            )}
            {activeJob.status!=='priced' && !paymentStarted(activeJob.payment_status) && !activeJob.otp_verified_at && otpOpen && (
              <div style={{ background:C.cardAlt, borderRadius:14, padding:14, marginTop:10, border:`1px solid ${C.line}` }}>
                <p style={{ color:C.text, fontWeight:800, fontSize:13.5, marginBottom:4 }}>🔐 Customer Verification</p>
                <p style={{ color:C.text3, fontSize:11.5, marginBottom:10 }}>Ask the customer for the 4-digit code in their app, then enter it to confirm the job is done.</p>
                <input value={otpInput} onChange={e => setOtpInput(e.target.value.replace(/\D/g,'').slice(0,6))}
                  type="tel" inputMode="numeric" placeholder="• • • •"
                  style={{ ...input, fontSize:22, fontWeight:800, letterSpacing:8, textAlign:'center', marginBottom:10 }} />
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={() => { setOtpOpen(false); setOtpInput('') }}
                    style={{ ...btnPrimary, flex:1, background:C.card, color:C.text2, border:`1.5px solid ${C.line}`, padding:12, fontSize:13 }}>{t('Cancel')}</button>
                  <button onClick={verifyOtp} disabled={busy}
                    style={{ ...btnGreen, flex:2, padding:12, fontSize:13, opacity:busy?.6:1 }}>{busy?'...':'Verify & Complete ✓'}</button>
                </div>
              </div>
            )}

            {/* STEP 2 — OTP verified → price breakdown quotation */}
            {activeJob.status!=='priced' && !paymentStarted(activeJob.payment_status) && activeJob.otp_verified_at && (
              <div style={{ background:C.cardAlt, borderRadius:14, padding:14, marginTop:10, border:`1px solid ${C.line}` }}>
                <p style={{ color:C.text, fontWeight:800, fontSize:13.5, marginBottom:2 }}>🧾 Final Quotation</p>
                <p style={{ color:C.text3, fontSize:11.5, marginBottom:12 }}>Minimum total: ₹{jobFloor(activeJob)} · 10% platform fee applies on payment</p>
                {[
                  ['labor',      'Labour charge ₹ *',   'e.g. 400'],
                  ['material',   'Material cost ₹',     'e.g. 250 (optional)'],
                  ['additional', 'Additional charges ₹','e.g. 100 (optional)'],
                ].map(([key, lb, ph]) => (
                  <div key={key} style={{ marginBottom:9 }}>
                    <label style={{ ...label, fontSize:10 }}>{lb}</label>
                    <input value={bd[key]} onChange={e => setBd(prev => ({ ...prev, [key]: e.target.value.replace(/\D/g,'').slice(0,6) }))}
                      type="tel" inputMode="numeric" placeholder={ph}
                      style={{ ...input, padding:11, fontSize:14, fontWeight:700 }} />
                  </div>
                ))}
                <textarea value={bd.note} onChange={e => setBd(prev => ({ ...prev, note: e.target.value.slice(0,160) }))}
                  placeholder="Work notes — what you did, parts replaced, etc." rows={2}
                  style={{ ...input, padding:11, fontSize:13, resize:'none', marginBottom:10 }} />
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                  background:C.card, border:`1px solid ${C.line}`, borderRadius:12, padding:'11px 14px', marginBottom:10 }}>
                  <div>
                    <p style={{ color:C.text3, fontSize:11 }}>Total to customer</p>
                    <p style={{ color:C.text, fontSize:22, fontWeight:900 }}>₹{breakdownTotal(bd).toLocaleString('en-IN')}</p>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <p style={{ color:C.text3, fontSize:11 }}>You earn (90%)</p>
                    <p style={{ color:C.green, fontSize:16, fontWeight:800 }}>₹{workerShare(breakdownTotal(bd)).toLocaleString('en-IN')}</p>
                  </div>
                </div>
                <button onClick={submitQuote} disabled={busy}
                  style={{ ...btnPrimary, opacity:busy?.6:1 }}>{busy?'...':'Send Quotation to Customer →'}</button>
              </div>
            )}

            {/* Awaiting payment */}
            {activeJob.status==='priced' && !paymentStarted(activeJob.payment_status) && (
              <div style={{ background:C.cardAlt, border:`1px solid ${C.line}`, borderRadius:14, padding:16, marginTop:10, textAlign:'center' }}>
                <div style={{ fontSize:28, marginBottom:8 }}>⏳</div>
                <p style={{ color:C.text, fontWeight:800, fontSize:15 }}>₹{activeJob.amount} sent to customer</p>
                <p style={{ color:C.text3, fontSize:12, marginTop:4 }}>Waiting for them to pay via UPI to KaamReady...</p>
              </div>
            )}
            {/* Paid — awaiting admin verification */}
            {activeJob.payment_status==='pending_verification' && (
              <div style={{ background:C.blueL, border:`1px solid ${C.blue}`, borderRadius:14, padding:16, marginTop:10, textAlign:'center' }}>
                <div style={{ fontSize:28, marginBottom:8 }}>🔍</div>
                <p style={{ color:C.text, fontWeight:800, fontSize:15 }}>Customer paid ₹{activeJob.amount}</p>
                <p style={{ color:C.text2, fontSize:12, marginTop:4 }}>KaamReady admin is verifying the payment. Your earnings will be credited once verified.</p>
              </div>
            )}
            {/* Verified */}
            {activeJob.payment_status==='verified' && (
              <div style={{ background:C.greenL, border:`1px solid ${C.green}`, borderRadius:14, padding:16, marginTop:10, textAlign:'center' }}>
                <div style={{ fontSize:28, marginBottom:8 }}>✅</div>
                <p style={{ color:C.text, fontWeight:800, fontSize:15 }}>{t('Payment verified!')}</p>
                <p style={{ color:C.green, fontSize:13, marginTop:4, fontWeight:600 }}>₹{Math.round((activeJob.amount||0)*0.9)} credited to your wallet 💰</p>
                <button onClick={() => { setActiveJob(null); setBd(EMPTY_BREAKDOWN); setOtpInput(''); setOtpOpen(false) }}
                  style={{ ...btnGreen, width:'auto', marginTop:12, padding:'10px 22px', fontSize:13 }}>Done ✓</button>
              </div>
            )}
          </div>
        )}

        {/* ── Today summary tiles ── */}
        <div style={{ ...card, overflow:'hidden', display:'grid', gridTemplateColumns:'repeat(3,1fr)' }}>
          {[
            ['₹'+Math.round(todayEarn*0.9).toLocaleString('en-IN'), t('Today'), C.green],
            [todayJobs, t('Jobs done'), C.text],
            [(profile?.rating||5.0)+'★', t('Rating'), C.yellowD],
          ].map(([v,l,c], i) => (
            <div key={l} style={{ padding:'14px 8px', textAlign:'center', borderRight: i < 2 ? `1px solid ${C.line}` : 'none' }}>
              <div style={{ fontSize:17, fontWeight:800, color:c }}>{v}</div>
              <div style={{ fontSize:11, color:C.text3, marginTop:3 }}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{ height:8 }} />
      </div>
    </div>
  )
}
