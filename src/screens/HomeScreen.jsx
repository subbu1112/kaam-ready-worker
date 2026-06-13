import { useState, useEffect, useRef } from 'react'
import { sb } from '../lib/supabase'
import MapView from '../components/MapView'
import { floorFor, COMMISSION } from '../constants'
import { t } from '../i18n'

const Y = '#F5C000', YD = '#B8900A', YL = '#2C2600'
const GREEN = '#22c55e', RED = '#ef4444'

/* ─── small helpers ─── */
function Row({ label, value, accent }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
      padding:'9px 0', borderBottom:'1px solid #1E1E24' }}>
      <span style={{ fontSize:13, color:'#555' }}>{label}</span>
      <span style={{ fontSize:13, fontWeight:700, color: accent ? Y : '#fff',
        maxWidth:'60%', textAlign:'right' }}>{value}</span>
    </div>
  )
}

function Chip({ children, color='#2C2600', text='#F5C000' }) {
  return (
    <span style={{ background:color, color:text, fontSize:11, fontWeight:700,
      padding:'4px 10px', borderRadius:8, flexShrink:0 }}>
      {children}
    </span>
  )
}

export default function HomeScreen({ user, profile, showToast }) {
  const [online,      setOnline]      = useState(() => localStorage.getItem('kr_worker_online') === 'true')
  const [jobAlert,    setJobAlert]    = useState(null)
  const [activeJob,   setActiveJob]   = useState(null)
  const [todayEarn,   setTodayEarn]   = useState(0)
  const [todayJobs,   setTodayJobs]   = useState(0)
  const [showPrice,   setShowPrice]   = useState(false)
  const [price,       setPrice]       = useState('')
  const [note,        setNote]        = useState('')
  const [busy,        setBusy]        = useState(false)
  const [upcoming,    setUpcoming]    = useState([])
  const [schedAvail,  setSchedAvail]  = useState([])
  const [photoBusy,   setPhotoBusy]   = useState(null)

  const timer   = useRef(null)
  const chan     = useRef(null)
  const jobChan  = useRef(null)

  useEffect(() => { if (profile) loadTodayStats() }, [profile])

  // Restore in-progress job after refresh
  useEffect(() => {
    if (!user?.id) return
    sb.from('bookings').select('*').eq('worker_id', user.id)
      .in('status', ['assigned','priced']).order('created_at', { ascending:false }).limit(3)
      .then(({ data }) => {
        const j = (data||[]).find(b =>
          !(b.is_scheduled && b.scheduled_at && new Date(b.scheduled_at) > new Date(Date.now() + 15*60*1000)))
        if (j) setActiveJob(prev => prev || j)
      })
  }, [user?.id])

  useEffect(() => {
    if (online) subscribeToJobs()
    else {
      if (chan.current) sb.removeChannel(chan.current)
      clearTimeout(timer.current)
      setJobAlert(null)
    }
    return () => { if (chan.current) sb.removeChannel(chan.current) }
  }, [online])

  useEffect(() => {
    if (!user?.id) return
    sb.from('workers').update({ is_online: online }).eq('id', user.id).then(() => {})
    localStorage.setItem('kr_worker_online', online)
  }, [online, user?.id])

  // Watch active job for payment events
  useEffect(() => {
    if (jobChan.current) { sb.removeChannel(jobChan.current); jobChan.current = null }
    if (!activeJob?.id) return
    jobChan.current = sb.channel('job-' + activeJob.id)
      .on('postgres_changes', { event:'UPDATE', schema:'public', table:'bookings', filter:'id=eq.'+activeJob.id }, payload => {
        setActiveJob(prev => prev ? { ...prev, ...payload.new } : prev)
        if (payload.new.payment_status === 'claimed') showToast('Customer says payment sent — please confirm 💸')
      }).subscribe()
    return () => { if (jobChan.current) sb.removeChannel(jobChan.current) }
  }, [activeJob?.id])

  async function loadTodayStats() {
    if (!user) return
    const today = new Date().toISOString().slice(0, 10)
    const { data } = await sb.from('bookings').select('amount')
      .eq('worker_id', user.id).eq('status', 'completed').gte('created_at', today)
    if (data) { setTodayJobs(data.length); setTodayEarn(data.reduce((s,b) => s + (b.amount||0), 0)) }
  }

  function kmBetween(lat1, lng1, lat2, lng2) {
    if (!lat1||!lng1||!lat2||!lng2) return null
    const R=6371, dLat=(lat2-lat1)*Math.PI/180, dLng=(lng2-lng1)*Math.PI/180
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  }

  function offerJob(b) {
    if (b.city !== profile?.city) return
    let delay = 0
    if (b.preferred_worker_id && b.preferred_worker_id !== user.id) delay = 60000
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
      showToast(b.preferred_worker_id === user.id ? 'A customer requested YOU! ⭐' : 'New job request! 🔔')
    }
    delay === 0 ? show() : setTimeout(show, delay)
  }

  function subscribeToJobs() {
    chan.current = sb.channel('new-jobs-' + profile?.city)
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'bookings', filter:'status=eq.searching' }, payload => offerJob(payload.new))
      .subscribe()
    sb.from('bookings').select('*').eq('status', 'searching').eq('city', profile?.city)
      .gte('created_at', new Date(Date.now()-3*60*1000).toISOString())
      .order('created_at', { ascending:false }).limit(1)
      .then(({ data }) => { if (data?.[0]) offerJob(data[0]) })
    loadScheduled()
  }

  async function loadScheduled() {
    const [avail, mine] = await Promise.all([
      sb.from('bookings').select('*').eq('status','scheduled').is('worker_id', null).eq('city', profile?.city)
        .gte('scheduled_at', new Date().toISOString()).order('scheduled_at').limit(5),
      sb.from('bookings').select('*').eq('worker_id', user.id).eq('is_scheduled', true).eq('status','assigned')
        .gte('scheduled_at', new Date(Date.now()-30*60*1000).toISOString()).order('scheduled_at').limit(5),
    ])
    setSchedAvail(avail.data || [])
    setUpcoming(mine.data || [])
  }

  async function acceptScheduled(b) {
    const { error } = await sb.from('bookings').update({
      worker_id: user.id, status:'assigned',
      worker: { id:user.id, name:profile?.name, skill:profile?.skill, rating:profile?.rating, ico:'👷' }
    }).eq('id', b.id).is('worker_id', null)
    if (error) { showToast(error.message); return }
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
      const col = which === 'before' ? 'photo_before_url' : 'photo_after_url'
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
    if (!jobAlert) return
    const pos = await getPosition()
    if (pos) sb.from('workers').update({ lat: pos.lat, lng: pos.lng }).eq('id', user.id).then(() => {})
    const w = { id:user.id, name:profile?.name, skill:profile?.skill, rating:profile?.rating,
      jobs:profile?.total_jobs, ico:'👷', eta:'8 min', dist:'1.0 km', lat:pos?.lat, lng:pos?.lng }
    await sb.from('bookings').update({ status:'assigned', worker_id:user.id, worker:w }).eq('id', jobAlert.id)
    setActiveJob({ ...jobAlert, status:'assigned', worker:w })
    setJobAlert(null)
    showToast('Job accepted! Navigate to customer 🗺️')
  }

  function navigateToCustomer() {
    const j = activeJob
    if (j?.address_lat && j?.address_lng)
      window.open('https://www.google.com/maps/dir/?api=1&destination=' + j.address_lat + ',' + j.address_lng, '_blank')
    else {
      const q = encodeURIComponent(j?.address || j?.city || 'Karnataka')
      window.open('https://www.google.com/maps/dir/?api=1&destination=' + q, '_blank')
    }
  }

  function jobFloor(job) { return floorFor(job?.service_id) }

  async function submitPrice() {
    if (!activeJob || busy) return
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
    if (!activeJob || busy) return
    setBusy(true)
    const amt = activeJob.amount || 0
    const fee = Math.round(amt * COMMISSION)
    const { error } = await sb.from('bookings').update({
      payment_status:'paid', payment_method:'upi', status:'completed',
      payment_confirmed_at: new Date().toISOString(), completed_at: new Date().toISOString(),
    }).eq('id', activeJob.id)
    if (!error) {
      await sb.from('workers').update({
        wallet_balance: (profile?.wallet_balance||0) + amt - fee,
        commission_due: (profile?.commission_due||0) + fee,
        total_jobs:     (profile?.total_jobs||0) + 1,
      }).eq('id', user.id)
      setTodayEarn(e => e + amt)
      setTodayJobs(j => j + 1)
      setActiveJob(null); setPrice(''); setNote('')
      showToast('₹' + (amt - fee).toLocaleString('en-IN') + ' received (₹' + fee + ' platform fee) 💰')
    } else { showToast(error.message) }
    setBusy(false)
  }

  function toggleOnline() {
    const next = !online
    setOnline(next)
    showToast(next ? 'You are now Online 🟢' : 'You are now Offline')
  }

  const jobStatus = activeJob
    ? activeJob.payment_status === 'claimed' ? 'payment_claimed'
      : activeJob.status === 'priced' ? 'awaiting_payment'
      : 'in_progress'
    : null

  /* ──────────────────── RENDER ──────────────────── */
  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:'#0A0A0C' }}>

      {/* ── Header ── */}
      <div style={{ padding:'20px 20px 16px', flexShrink:0,
        background: online ? 'linear-gradient(135deg,#0A1F0A,#0A0A0C)' : 'linear-gradient(135deg,#131318,#0A0A0C)',
        borderBottom:'1px solid #1E1E24' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <p style={{ color:Y, fontSize:20, fontWeight:900, letterSpacing:-0.5 }}>
              Kaam Ready ⚡
            </p>
            <p style={{ color:'#444', fontSize:12, marginTop:2 }}>
              {profile?.skill} · {profile?.city}
            </p>
          </div>

          {/* Online toggle */}
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ color: online ? '#4ade80' : '#555', fontSize:12, fontWeight:700 }}>
              {online ? '● ONLINE' : '● OFFLINE'}
            </span>
            <div onClick={toggleOnline}
              style={{ width:52, height:28, borderRadius:20,
                background: online ? GREEN : '#2a2a2a',
                position:'relative', cursor:'pointer', transition:'background .25s',
                boxShadow: online ? '0 0 12px rgba(34,197,94,.35)' : 'none' }}>
              <div style={{ width:22, height:22, background:'#fff', borderRadius:'50%',
                position:'absolute', top:3, left: online ? 27 : 3,
                transition:'left .25s', boxShadow:'0 1px 4px rgba(0,0,0,.4)' }} />
            </div>
          </div>
        </div>

        {/* Today stats */}
        <div style={{ display:'flex', gap:8, marginTop:14 }}>
          {[
            { label:'Today\'s Earnings', value:'₹'+todayEarn.toLocaleString('en-IN'), accent:true },
            { label:'Jobs Done', value:todayJobs },
            { label:'Rating', value:(profile?.rating||5.0)+'⭐' },
          ].map(s => (
            <div key={s.label} style={{ flex:1, background:'#111114',
              borderRadius:13, padding:'10px 8px', border:'1px solid #1E1E24', textAlign:'center' }}>
              <p style={{ fontSize: s.accent ? 15 : 17, fontWeight:900,
                color: s.accent ? Y : '#fff' }}>{s.value}</p>
              <p style={{ fontSize:10, color:'#444', marginTop:3, fontWeight:600,
                textTransform:'uppercase', letterSpacing:0.3 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Scroll body ── */}
      <div style={{ flex:1, overflowY:'auto', padding:16, display:'flex', flexDirection:'column', gap:12 }}>

        {/* ── Offline state ── */}
        {!online && !activeJob && (
          <div style={{ background:'#111114', borderRadius:22, padding:'36px 24px',
            textAlign:'center', border:'1.5px dashed #2a2a2a' }}>
            <div style={{ fontSize:52, marginBottom:12 }}>😴</div>
            <p style={{ fontWeight:900, fontSize:17, color:'#fff' }}>{t('You are Offline')}</p>
            <p style={{ fontSize:13, color:'#444', margin:'8px 0 20px' }}>
              Toggle the switch above to start receiving jobs
            </p>
            <button onClick={toggleOnline}
              style={{ background:Y, border:'none', borderRadius:14, padding:'14px 32px',
                fontWeight:900, fontSize:14, cursor:'pointer', fontFamily:'Inter, sans-serif',
                color:'#000', boxShadow:'0 4px 14px rgba(245,192,0,.35)' }}>
              {t('Go Online Now')}
            </button>
          </div>
        )}

        {/* ── Waiting state ── */}
        {online && !jobAlert && !activeJob && (
          <div style={{ background:'linear-gradient(135deg,#0A1F0A,#111114)',
            border:'1.5px solid #1A3A1A', borderRadius:22, padding:'36px 24px', textAlign:'center' }}>
            <div style={{ fontSize:52, marginBottom:12, animation:'float 1.5s ease-in-out infinite' }}>🟢</div>
            <p style={{ fontWeight:900, fontSize:17, color:'#fff' }}>{t('Waiting for jobs…')}</p>
            <p style={{ fontSize:13, color:'#444', marginTop:6 }}>
              You'll be notified instantly when a job matches
            </p>
          </div>
        )}

        {/* ── My upcoming scheduled jobs ── */}
        {online && upcoming.length > 0 && (
          <div style={{ background:'#111114', borderRadius:18, border:'1.5px solid #2D1F5E', overflow:'hidden' }}>
            <div style={{ padding:'13px 16px', borderBottom:'1px solid #1E1E24',
              display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:16 }}>📅</span>
              <p style={{ color:'#a78bfa', fontWeight:800, fontSize:14 }}>{t('My Upcoming Jobs')}</p>
            </div>
            {upcoming.map(b => (
              <div key={b.id} style={{ padding:'13px 16px', borderBottom:'1px solid #1E1E24',
                display:'flex', justifyContent:'space-between', alignItems:'center', gap:12 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ color:'#fff', fontSize:13, fontWeight:700,
                    whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {b.service} · {b.customer_name || ''}
                  </p>
                  <p style={{ color:'#555', fontSize:11, marginTop:2 }}>
                    {new Date(b.scheduled_at).toLocaleString('en-IN',
                      { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })} · {b.address}
                  </p>
                </div>
                <button onClick={() => setActiveJob(b)}
                  style={{ background:Y, border:'none', borderRadius:10, padding:'8px 14px',
                    fontWeight:800, fontSize:12, cursor:'pointer', fontFamily:'Inter, sans-serif',
                    flexShrink:0, color:'#000' }}>
                  {t('Start Job')}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Available scheduled jobs ── */}
        {online && !activeJob && schedAvail.length > 0 && (
          <div style={{ background:'#111114', borderRadius:18, border:'1.5px dashed #2D1F5E', overflow:'hidden' }}>
            <div style={{ padding:'13px 16px', borderBottom:'1px solid #1E1E24',
              display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:16 }}>📅</span>
              <p style={{ color:'#a78bfa', fontWeight:800, fontSize:14 }}>{t('Scheduled Jobs Available')}</p>
            </div>
            {schedAvail.map(b => (
              <div key={b.id} style={{ padding:'13px 16px', borderBottom:'1px solid #1E1E24',
                display:'flex', justifyContent:'space-between', alignItems:'center', gap:12 }}>
                <div style={{ flex:1 }}>
                  <p style={{ color:'#fff', fontSize:13, fontWeight:700 }}>{b.service}</p>
                  <p style={{ color:'#555', fontSize:11, marginTop:2 }}>
                    {new Date(b.scheduled_at).toLocaleString('en-IN',
                      { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                  </p>
                </div>
                <button onClick={() => acceptScheduled(b)}
                  style={{ background:'#052e16', color:'#4ade80', border:'1px solid #166534',
                    borderRadius:10, padding:'8px 14px', fontWeight:800, fontSize:12,
                    cursor:'pointer', fontFamily:'Inter, sans-serif', flexShrink:0 }}>
                  ✓ {t('Accept')}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── New job alert ── */}
        {jobAlert && (
          <div style={{ background:'#111114', borderRadius:22, overflow:'hidden',
            border:'2px solid ' + Y, boxShadow:'0 0 24px rgba(245,192,0,.2)',
            animation:'popIn .3s ease' }}>
            <div style={{ background:'linear-gradient(135deg,#2C2600,#1A1700)',
              padding:'14px 18px', display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:20 }}>🔔</span>
              <p style={{ color:Y, fontWeight:900, fontSize:16 }}>{t('New Job Request!')}</p>
              {jobAlert.preferred_worker_id === user?.id && (
                <Chip color='#2C2600' text={Y}>⭐ Requested You</Chip>
              )}
            </div>
            <div style={{ padding:'14px 18px' }}>
              <Row label="Service" value={jobAlert.service} />
              <Row label="Address" value={jobAlert.address} />
              <Row label="City"    value={jobAlert.city} />
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                padding:'12px 0', marginBottom:4 }}>
                <span style={{ fontSize:13, color:'#555' }}>Starting price</span>
                <span style={{ color:Y, fontSize:20, fontWeight:900 }}>from ₹{jobFloor(jobAlert)}</span>
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={acceptJob}
                  style={{ flex:1, background:'#052e16', color:'#4ade80',
                    border:'1.5px solid #166534', borderRadius:14, padding:14,
                    fontWeight:800, fontSize:14, cursor:'pointer', fontFamily:'Inter, sans-serif' }}>
                  ✓ {t('Accept')}
                </button>
                <button onClick={() => setJobAlert(null)}
                  style={{ flex:1, background:'#1f0707', color:'#f87171',
                    border:'1.5px solid #7f1d1d', borderRadius:14, padding:14,
                    fontWeight:800, fontSize:14, cursor:'pointer', fontFamily:'Inter, sans-serif' }}>
                  ✕ {t('Decline')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Active Job ── */}
        {activeJob && (
          <div style={{ background:'#111114', borderRadius:22, overflow:'hidden',
            border:'1.5px solid ' + GREEN, boxShadow:'0 0 20px rgba(34,197,94,.1)' }}>

            {/* Job header */}
            <div style={{ background:'linear-gradient(135deg,#052e16,#0A0A0C)',
              padding:'13px 18px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:18 }}>🔧</span>
                <p style={{ fontWeight:800, fontSize:15, color:'#fff' }}>{t('Active Job')}</p>
              </div>
              <Chip
                color={jobStatus==='payment_claimed' ? '#052e16' : jobStatus==='awaiting_payment' ? '#2C2600' : '#0c1a2e'}
                text={jobStatus==='payment_claimed' ? '#4ade80' : jobStatus==='awaiting_payment' ? Y : '#60a5fa'}>
                {jobStatus==='payment_claimed' ? '💸 Payment Sent'
                  : jobStatus==='awaiting_payment' ? '⏳ Awaiting Payment'
                  : '⚡ In Progress'}
              </Chip>
            </div>

            <div style={{ padding:'0 18px 18px' }}>
              {/* Details */}
              <div style={{ paddingTop:4 }}>
                <Row label="Customer" value={activeJob.customer_name || '—'} />
                <Row label="Service"  value={activeJob.service} />
                <Row label="Address"  value={activeJob.address} />
                {activeJob.amount && <Row label="Price" value={'₹' + activeJob.amount} accent />}
              </div>

              {/* Map + nav + call — only show in 'in_progress' */}
              {jobStatus === 'in_progress' && (
                <>
                  <div style={{ marginTop:14 }}>
                    <MapView
                      customerLat={activeJob.address_lat}
                      customerLng={activeJob.address_lng}
                      workerLat={activeJob.worker?.lat || profile?.lat}
                      workerLng={activeJob.worker?.lng || profile?.lng}
                      height={175}
                    />
                  </div>
                  <div style={{ display:'flex', gap:8, marginTop:10 }}>
                    <button onClick={navigateToCustomer}
                      style={{ flex:1, background:'#18181C', color:'#fff',
                        border:'1px solid #2a2a2a', borderRadius:13, padding:12,
                        fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'Inter, sans-serif' }}>
                      🗺️ {t('Directions')}
                    </button>
                    {activeJob.customer_phone
                      ? <a href={'tel:+91' + activeJob.customer_phone}
                          style={{ flex:1, background:YL, border:'1px solid #3D3400',
                            borderRadius:13, padding:12, fontWeight:700, fontSize:13,
                            cursor:'pointer', textAlign:'center', textDecoration:'none', color:Y }}>
                          📞 {t('Call Customer')}
                        </a>
                      : <button onClick={() => showToast('Customer phone not available')}
                          style={{ flex:1, background:YL, border:'1px solid #3D3400',
                            borderRadius:13, padding:12, fontWeight:700, fontSize:13,
                            cursor:'pointer', fontFamily:'Inter, sans-serif', color:Y }}>
                          📞 Call
                        </button>}
                  </div>

                  {/* Photo uploads */}
                  <div style={{ display:'flex', gap:8, marginTop:10 }}>
                    {[['before', activeJob.photo_before_url], ['after', activeJob.photo_after_url]].map(([which, url]) => (
                      <label key={which}
                        style={{ flex:1, background: url ? '#052e16' : '#18181C',
                          border:'1px solid ' + (url ? '#166534' : '#2a2a2a'),
                          borderRadius:13, padding:12, textAlign:'center',
                          cursor:'pointer', fontSize:12, fontWeight:700,
                          color: url ? '#4ade80' : '#555' }}>
                        {photoBusy === which ? '…' : (url ? '✓ ' : '📷 ') + t(which === 'before' ? 'Before' : 'After')}
                        <input type="file" accept="image/*" capture="environment" style={{ display:'none' }}
                          onChange={e => uploadJobPhoto(which, e.target.files[0])} />
                      </label>
                    ))}
                  </div>

                  {/* Set price button */}
                  {!showPrice && (
                    <button onClick={() => { setPrice(''); setNote(''); setShowPrice(true) }}
                      style={{ width:'100%', background:Y, border:'none', borderRadius:14, padding:15,
                        fontWeight:900, fontSize:14, cursor:'pointer', fontFamily:'Inter, sans-serif',
                        marginTop:12, color:'#000',
                        boxShadow:'0 4px 14px rgba(245,192,0,.35)' }}>
                      {t('Work Done — Set Final Price ₹')}
                    </button>
                  )}
                </>
              )}

              {/* Price form */}
              {jobStatus === 'in_progress' && showPrice && (
                <div style={{ background:'#18181C', borderRadius:16, padding:16, marginTop:12,
                  border:'1px solid #2a2a2a' }}>
                  <p style={{ color:Y, fontWeight:800, fontSize:14, marginBottom:4 }}>Set Final Price</p>
                  <p style={{ color:'#444', fontSize:12, marginBottom:12 }}>
                    Minimum: ₹{jobFloor(activeJob)} — price fairly, customer approves before paying
                  </p>
                  <input value={price}
                    onChange={e => setPrice(e.target.value.replace(/\D/g,'').slice(0,5))}
                    type="tel" placeholder="₹ amount"
                    style={{ width:'100%', background:'#111114', border:'1.5px solid #2a2a2a',
                      borderRadius:12, padding:'13px 14px', fontSize:18, fontWeight:800,
                      color:Y, outline:'none', fontFamily:'Inter, sans-serif',
                      marginBottom:10, boxSizing:'border-box' }} />
                  <input value={note} onChange={e => setNote(e.target.value.slice(0,120))}
                    placeholder="Why this price? e.g. extra wiring replaced"
                    style={{ width:'100%', background:'#111114', border:'1.5px solid #2a2a2a',
                      borderRadius:12, padding:'12px 14px', fontSize:13, color:'#ccc',
                      outline:'none', fontFamily:'Inter, sans-serif',
                      marginBottom:12, boxSizing:'border-box' }} />
                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={() => setShowPrice(false)}
                      style={{ flex:1, background:'#18181C', color:'#555',
                        border:'1px solid #2a2a2a', borderRadius:12, padding:12,
                        fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'Inter, sans-serif' }}>
                      Cancel
                    </button>
                    <button onClick={submitPrice} disabled={busy}
                      style={{ flex:2, background: busy ? '#555' : Y, border:'none', borderRadius:12,
                        padding:12, fontWeight:800, fontSize:14, cursor:'pointer',
                        fontFamily:'Inter, sans-serif', color: busy ? '#888' : '#000',
                        opacity: busy ? 0.7 : 1 }}>
                      {busy ? '…' : t('Send to Customer →')}
                    </button>
                  </div>
                </div>
              )}

              {/* Awaiting payment */}
              {jobStatus === 'awaiting_payment' && (
                <div style={{ background:'#18181C', borderRadius:16, padding:'20px 16px',
                  marginTop:12, textAlign:'center', border:'1px solid #2C2600' }}>
                  <div style={{ fontSize:36, marginBottom:10 }}>⏳</div>
                  <p style={{ color:'#fff', fontWeight:800, fontSize:16 }}>
                    ₹{activeJob.amount} sent to customer
                  </p>
                  <p style={{ color:'#444', fontSize:13, marginTop:6 }}>
                    Waiting for them to approve and pay via UPI…
                  </p>
                  <button onClick={() => {
                    setPrice(String(activeJob.amount || ''))
                    setNote(activeJob.price_note || '')
                    setActiveJob(p => ({ ...p, status:'assigned' }))
                    setShowPrice(true)
                  }} style={{ marginTop:14, background:'none', border:'1px solid #2a2a2a',
                    borderRadius:10, color:'#555', padding:'8px 18px', fontSize:12,
                    cursor:'pointer', fontFamily:'Inter, sans-serif' }}>
                    Edit price
                  </button>
                </div>
              )}

              {/* Payment claimed */}
              {jobStatus === 'payment_claimed' && (
                <div style={{ background:'#052e16', border:'1.5px solid #166534',
                  borderRadius:16, padding:'20px 16px', marginTop:12, textAlign:'center',
                  boxShadow:'0 0 16px rgba(34,197,94,.15)' }}>
                  <div style={{ fontSize:40, marginBottom:10 }}>💸</div>
                  <p style={{ color:'#fff', fontWeight:900, fontSize:17 }}>
                    Customer paid ₹{activeJob.amount} via UPI
                  </p>
                  <p style={{ color:'#4ade80', fontSize:13, margin:'6px 0 16px' }}>
                    Check your UPI app, then confirm below
                  </p>
                  <button onClick={confirmPayment} disabled={busy}
                    style={{ width:'100%', background: busy ? '#1a4a2a' : GREEN,
                      color:'#fff', border:'none', borderRadius:13, padding:16,
                      fontWeight:900, fontSize:15, cursor:'pointer', fontFamily:'Inter, sans-serif',
                      opacity: busy ? 0.7 : 1,
                      boxShadow: busy ? 'none' : '0 4px 14px rgba(34,197,94,.35)' }}>
                    {busy ? '…' : t('✓ Confirm Payment Received')}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
