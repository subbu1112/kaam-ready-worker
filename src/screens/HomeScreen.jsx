import { useState, useEffect, useRef } from 'react'
import { sb } from '../lib/supabase'
import MapView from '../components/MapView'
import { floorFor, EMPTY_BREAKDOWN, breakdownTotal, workerShare } from '../constants'
import { t } from '../i18n'
import { C, card, scroller, btnPrimary, btnGreen, input, label } from '../theme'
import { Pill } from '../components/UI'
import { haversineKm, travelInfo, currentPosition } from '../lib/geo'
import { WORKER_CANCEL_REASONS } from '../lib/cancelReasons'

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
  // The worker's own live coordinates — the origin for every distance shown.
  const [myPos,     setMyPos]     = useState(null)
  const [cancelOpen,setCancelOpen]= useState(false)
  const [cancelCode,setCancelCode]= useState('')
  const [cancelNote,setCancelNote]= useState('')
  const timer=useRef(null), chan=useRef(null), jobChan=useRef(null), posTimer=useRef(null)

  useEffect(() => { if(profile) loadTodayStats() }, [profile])

  // A stale position means a wrong distance on the job card, which is worse
  // than none. Refresh on mount, whenever duty is toggled on, and every two
  // minutes while on duty; mirror it to the workers row so the customer's
  // tracking map and the dispatch ordering see the same coordinates.
  useEffect(() => {
    let cancelled = false
    async function refresh() {
      const pos = await currentPosition()
      if (cancelled || !pos) return
      setMyPos(pos)
      if (user?.id) sb.from('workers').update({ lat: pos.lat, lng: pos.lng }).eq('id', user.id).then(()=>{})
    }
    refresh()
    if (posTimer.current) clearInterval(posTimer.current)
    if (online) posTimer.current = setInterval(refresh, 120000)
    return () => { cancelled = true; if (posTimer.current) { clearInterval(posTimer.current); posTimer.current = null } }
  }, [online, user?.id])

  // Fall back to the last position stored on the profile until GPS answers.
  const originLat = myPos?.lat ?? profile?.lat
  const originLng = myPos?.lng ?? profile?.lng

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

  const kmBetween = haversineKm

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
    if (b.worker_id === user?.id) return                       // already mine
    if (activeJob && activeJob.id === b.id) return
    // A multi-worker request stays open until it is fully staffed; stop
    // offering it once the last slot is taken.
    if ((b.workers_accepted || 0) >= Math.max(b.workers_required || 1, 1)) return
    let delay = 0
    if (isEmergency(b)) delay = 0       // 🚨 emergency → alert every worker instantly
    else if (b.preferred_worker_id && b.preferred_worker_id !== user.id) delay = 60000
    else if (b.preferred_worker_id === user.id) delay = 0
    else {
      const d = kmBetween(originLat, originLng, b.address_lat, b.address_lng)
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
    const { error } = await sb.rpc('accept_booking_as_worker', { p_booking_id: b.id })
    if (error) { showToast(error.message.replace(/^.*?:\s*/, '')); return }
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

  async function acceptJob(job) {
    const target = job || jobAlert
    if(!target || busy) return
    setBusy(true)
    const pos = await getPosition()
    if (pos) {
      setMyPos(pos)
      sb.from('workers').update({ lat: pos.lat, lng: pos.lng }).eq('id', user.id).then(()=>{})
    }
    // Claiming is done server-side: it takes a slot atomically, records this
    // worker on the booking, and only flips the booking to 'assigned' once the
    // requested number of workers is reached.
    const { data, error } = await sb.rpc('accept_booking_as_worker', { p_booking_id: target.id })
    setBusy(false)
    if (error || !data) {
      setJobAlert(null)
      showToast((error?.message || 'Could not accept this job').replace(/^.*?:\s*/, ''))
      return
    }
    setActiveJob(data); setJobAlert(null)
    const need = Math.max(data.workers_required || 1, 1)
    showToast(need > 1 && (data.workers_accepted || 0) < need
      ? `Accepted ✓ ${data.workers_accepted} of ${need} workers so far`
      : 'Job accepted! Navigate to customer 🗺️')
    loadScheduled()
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

  // A worker can hit an emergency or find the address unreachable after
  // accepting. Cancelling here releases the job, tells the customer why, and
  // (on a multi-worker booking) re-opens only the freed slot.
  async function cancelActiveJob() {
    if (!activeJob || busy) return
    if (!cancelCode) { showToast('Please select a reason'); return }
    if (cancelCode === 'other' && !cancelNote.trim()) { showToast('Please describe the reason'); return }
    setBusy(true)
    const r = WORKER_CANCEL_REASONS.find(x => x.code === cancelCode)
    const { error } = await sb.rpc('cancel_booking_worker', {
      p_booking_id: activeJob.id,
      p_reason_code: cancelCode,
      p_reason_label: r?.label || cancelCode,
      p_note: cancelNote.trim() || null,
    })
    setBusy(false)
    if (error) { showToast(error.message.replace(/^.*?:\s*/, '')); return }
    setCancelOpen(false); setCancelCode(''); setCancelNote('')
    setActiveJob(null); setOtpOpen(false); setOtpInput(''); setBd(EMPTY_BREAKDOWN)
    showToast('Job cancelled — the customer has been notified')
    loadScheduled()
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
                  <p style={{ color:C.text3, fontSize:11.5, marginTop:2 }}>
                    {new Date(b.scheduled_at).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}
                    {travelInfo(originLat, originLng, b.address_lat, b.address_lng).distance
                      ? ' · ' + travelInfo(originLat, originLng, b.address_lat, b.address_lng).distance + ' away' : ''}
                    {Math.max(b.workers_required || 1, 1) > 1 ? ` · ${b.workers_required} workers` : ''}
                  </p>
                </div>
                <button onClick={() => acceptScheduled(b)}
                  style={{ ...btnGreen, width:'auto', padding:'9px 15px', fontSize:12.5, flexShrink:0 }}>✓ {t('Accept')}</button>
              </div>
            ))}
          </div>
        )}

        {/* ── Incoming job request ── */}
        {jobAlert && (() => {
          const trip = travelInfo(originLat, originLng, jobAlert.address_lat, jobAlert.address_lng)
          const need = Math.max(jobAlert.workers_required || 1, 1)
          const have = jobAlert.workers_accepted || 0
          return (
            <div style={{ ...card, padding:16, border:`2px solid ${C.yellow}` }}>
              <h3 style={{ color:C.text, fontWeight:800, fontSize:15, marginBottom:12 }}>🔔 {t('New Job Request!')}</h3>

              {/* Distance first — it is the thing a worker actually decides on. */}
              <div style={{ display:'flex', alignItems:'center', gap:12, background:C.yellowL,
                border:`1px solid ${C.yellow}`, borderRadius:14, padding:'12px 14px', marginBottom:12 }}>
                <div style={{ fontSize:26, lineHeight:1 }}>📍</div>
                <div style={{ flex:1, minWidth:0 }}>
                  {trip.distance ? (
                    <>
                      <p style={{ fontSize:24, fontWeight:900, color:C.text, lineHeight:1.1 }}>
                        {trip.distance} <span style={{ fontSize:14, fontWeight:700, color:C.text2 }}>away</span>
                      </p>
                      <p style={{ fontSize:12, color:C.text2, marginTop:2 }}>{trip.travel} (approx)</p>
                    </>
                  ) : (
                    <>
                      <p style={{ fontSize:15, fontWeight:800, color:C.text }}>Distance unavailable</p>
                      <p style={{ fontSize:11.5, color:C.text3, marginTop:2 }}>
                        Turn on location access to see how far each job is.
                      </p>
                    </>
                  )}
                </div>
                {jobAlert.address_lat && jobAlert.address_lng && (
                  <button onClick={() => window.open(
                    'https://www.google.com/maps/dir/?api=1&destination=' + jobAlert.address_lat + ',' + jobAlert.address_lng, '_blank')}
                    style={{ background:C.card, border:`1px solid ${C.line}`, borderRadius:10, padding:'8px 10px',
                      fontSize:11.5, fontWeight:700, cursor:'pointer', fontFamily:'inherit', color:C.text, flexShrink:0 }}>
                    🗺️ Map
                  </button>
                )}
              </div>

              <KV k="Service" v={jobAlert.service} />
              <KV k="Customer location" v={jobAlert.address} />
              {jobAlert.landmark && <KV k="Landmark" v={jobAlert.landmark} />}
              <KV k="City"    v={jobAlert.city} />
              <KV k="Workers required" v={need > 1 ? `${need} workers · ${have} accepted so far` : '1 worker'} />
              {jobAlert.description && jobAlert.description !== '(No description)' &&
                <KV k="Details" v={jobAlert.description} />}
              {jobAlert.is_scheduled && jobAlert.scheduled_at &&
                <KV k="Scheduled for" v={new Date(jobAlert.scheduled_at).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})} />}

              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 0 14px' }}>
                <span style={{ color:C.text3, fontSize:12.5 }}>{t('Starting price')}</span>
                <span style={{ color:C.green, fontSize:19, fontWeight:900 }}>from ₹{jobFloor(jobAlert)}</span>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => acceptJob()} disabled={busy} style={{ ...btnGreen, flex:1, opacity:busy?.6:1 }}>✓ {t('Accept')}</button>
                <button onClick={() => setJobAlert(null)}
                  style={{ ...btnPrimary, flex:1, background:C.card, color:C.red, border:`1.5px solid ${C.red}` }}>✕ {t('Decline')}</button>
              </div>
            </div>
          )
        })()}

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
            <KV k="Customer location" v={activeJob.address} />
            {activeJob.landmark && <KV k="Landmark" v={activeJob.landmark} />}
            {Math.max(activeJob.workers_required || 1, 1) > 1 &&
              <KV k="Workers on this job" v={`${activeJob.workers_accepted || 1} of ${activeJob.workers_required}`} />}
            {(() => {
              const trip = travelInfo(originLat, originLng, activeJob.address_lat, activeJob.address_lng)
              return trip.distance
                ? <KV k="Distance" v={`${trip.distance} away · ${trip.travel}`} />
                : null
            })()}

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
            {/* Cancel after accepting — allowed until the customer has paid */}
            {!paymentStarted(activeJob.payment_status) && activeJob.status!=='priced' && !cancelOpen && (
              <button onClick={() => { setCancelCode(''); setCancelNote(''); setCancelOpen(true) }}
                style={{ ...btnPrimary, marginTop:10, background:C.card, color:C.red,
                  border:`1.5px solid ${C.red}`, fontSize:14 }}>
                Cancel Booking
              </button>
            )}
            {cancelOpen && (
              <div style={{ background:C.redL, borderRadius:14, padding:14, marginTop:10, border:`1px solid ${C.red}` }}>
                <p style={{ color:C.text, fontWeight:800, fontSize:13.5, marginBottom:2 }}>Why are you cancelling?</p>
                <p style={{ color:C.text2, fontSize:11.5, marginBottom:10 }}>
                  The customer is told straight away so they can rebook. Frequent cancellations affect your acceptance rate.
                </p>
                <div style={{ display:'flex', flexDirection:'column', gap:7, marginBottom:10 }}>
                  {WORKER_CANCEL_REASONS.map(r => (
                    <button key={r.code} onClick={() => setCancelCode(r.code)}
                      style={{ display:'flex', alignItems:'center', gap:10, textAlign:'left',
                        background: cancelCode===r.code ? C.card : 'rgba(255,255,255,.6)',
                        border:`1.5px solid ${cancelCode===r.code ? C.red : C.line}`,
                        borderRadius:11, padding:'11px 13px', fontSize:13.5, fontWeight:600,
                        color:C.text, cursor:'pointer', fontFamily:'inherit' }}>
                      <span style={{ width:17, height:17, borderRadius:'50%', flexShrink:0,
                        border:`2px solid ${cancelCode===r.code ? C.red : '#C6C6C9'}`,
                        background: cancelCode===r.code ? C.red : 'transparent' }} />
                      {r.label}
                    </button>
                  ))}
                </div>
                {cancelCode === 'other' && (
                  <textarea value={cancelNote} onChange={e => setCancelNote(e.target.value.slice(0,300))} rows={2}
                    placeholder="Tell the customer what happened…"
                    style={{ ...input, padding:11, fontSize:13, resize:'none', marginBottom:10 }} />
                )}
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={() => { setCancelOpen(false); setCancelCode(''); setCancelNote('') }}
                    style={{ ...btnPrimary, flex:1, background:C.card, color:C.text2,
                      border:`1.5px solid ${C.line}`, padding:12, fontSize:13 }}>Keep Job</button>
                  <button onClick={cancelActiveJob} disabled={busy || !cancelCode}
                    style={{ ...btnPrimary, flex:1, background:C.red, color:'#fff', padding:12, fontSize:13,
                      opacity:(busy || !cancelCode) ? .5 : 1 }}>
                    {busy ? '…' : 'Cancel Booking'}
                  </button>
                </div>
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
