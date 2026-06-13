import { useState, useEffect, useRef } from 'react'
import { sb } from '../lib/supabase'
import MapView from '../components/MapView'
import { floorFor, COMMISSION } from '../constants'
import { t } from '../i18n'

const Y = '#F5C000', YD = '#C8A000', GREEN = '#25D366', RED = '#EF4444'

/* ─── Rapido-style helpers ─── */

function Plate({ id }) {
  const num = 'KR#' + String(id || '').slice(-5).padStart(5, '0')
  return (
    <div style={{
      background: Y, border: '1.5px solid ' + YD, borderRadius: 4,
      padding: '3px 9px', fontFamily: 'monospace', fontSize: 12,
      fontWeight: 800, color: '#412402', letterSpacing: 0.8, display: 'inline-block'
    }}>{num}</div>
  )
}

function CallBtn({ phone, onMiss }) {
  const s = {
    width: 44, height: 44, borderRadius: '50%', background: GREEN,
    border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
    justifyContent: 'center', flexShrink: 0, textDecoration: 'none',
    fontSize: 20, boxShadow: '0 2px 8px rgba(37,211,102,.4)'
  }
  return phone
    ? <a href={'tel:+91' + phone} style={s}>📞</a>
    : <button onClick={onMiss} style={s}>📞</button>
}

function RouteDots({ from, to }) {
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 3, flexShrink: 0 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#00C853' }} />
        <div style={{ width: 0, height: 28, borderLeft: '1.5px dashed #D0D0D0', margin: '4px 0' }} />
        <div style={{ width: 10, height: 10, borderRadius: '50%', border: '2.5px solid #FF6B35', background: '#fff' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#212121', margin: '0 0 10px', lineHeight: 1.3 }}>{from}</p>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#757575', margin: 0, lineHeight: 1.3 }}>{to}</p>
      </div>
    </div>
  )
}

export default function HomeScreen({ user, profile, showToast }) {
  const [online,     setOnline]     = useState(() => localStorage.getItem('kr_worker_online') === 'true')
  const [jobAlert,   setJobAlert]   = useState(null)
  const [activeJob,  setActiveJob]  = useState(null)
  const [todayEarn,  setTodayEarn]  = useState(0)
  const [todayJobs,  setTodayJobs]  = useState(0)
  const [showPrice,  setShowPrice]  = useState(false)
  const [price,      setPrice]      = useState('')
  const [note,       setNote]       = useState('')
  const [busy,       setBusy]       = useState(false)
  const [upcoming,   setUpcoming]   = useState([])
  const [schedAvail, setSchedAvail] = useState([])
  const [photoBusy,  setPhotoBusy]  = useState(null)

  const timer  = useRef(null)
  const chan    = useRef(null)
  const jobChan = useRef(null)

  useEffect(() => { if (profile) loadTodayStats() }, [profile])

  useEffect(() => {
    if (!user?.id) return
    sb.from('bookings').select('*').eq('worker_id', user.id)
      .in('status', ['assigned', 'priced']).order('created_at', { ascending: false }).limit(3)
      .then(({ data }) => {
        const j = (data || []).find(b =>
          !(b.is_scheduled && b.scheduled_at && new Date(b.scheduled_at) > new Date(Date.now() + 15 * 60 * 1000)))
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

  useEffect(() => {
    if (jobChan.current) { sb.removeChannel(jobChan.current); jobChan.current = null }
    if (!activeJob?.id) return
    jobChan.current = sb.channel('job-' + activeJob.id)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bookings', filter: 'id=eq.' + activeJob.id }, payload => {
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
    if (data) { setTodayJobs(data.length); setTodayEarn(data.reduce((s, b) => s + (b.amount || 0), 0)) }
  }

  function kmBetween(lat1, lng1, lat2, lng2) {
    if (!lat1 || !lng1 || !lat2 || !lng2) return null
    const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
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
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bookings', filter: 'status=eq.searching' }, payload => offerJob(payload.new))
      .subscribe()
    sb.from('bookings').select('*').eq('status', 'searching').eq('city', profile?.city)
      .gte('created_at', new Date(Date.now() - 3 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false }).limit(1)
      .then(({ data }) => { if (data?.[0]) offerJob(data[0]) })
    loadScheduled()
  }

  async function loadScheduled() {
    const [avail, mine] = await Promise.all([
      sb.from('bookings').select('*').eq('status', 'scheduled').is('worker_id', null).eq('city', profile?.city)
        .gte('scheduled_at', new Date().toISOString()).order('scheduled_at').limit(5),
      sb.from('bookings').select('*').eq('worker_id', user.id).eq('is_scheduled', true).eq('status', 'assigned')
        .gte('scheduled_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()).order('scheduled_at').limit(5),
    ])
    setSchedAvail(avail.data || [])
    setUpcoming(mine.data || [])
  }

  async function acceptScheduled(b) {
    const { error } = await sb.from('bookings').update({
      worker_id: user.id, status: 'assigned',
      worker: { id: user.id, name: profile?.name, skill: profile?.skill, rating: profile?.rating, ico: '👷' }
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
        () => res(null), { enableHighAccuracy: true, timeout: 5000 })
    })
  }

  async function acceptJob() {
    if (!jobAlert) return
    const pos = await getPosition()
    if (pos) sb.from('workers').update({ lat: pos.lat, lng: pos.lng }).eq('id', user.id).then(() => {})
    const w = { id: user.id, name: profile?.name, skill: profile?.skill, rating: profile?.rating,
      jobs: profile?.total_jobs, ico: '👷', eta: '8 min', dist: '1.0 km', lat: pos?.lat, lng: pos?.lng }
    await sb.from('bookings').update({ status: 'assigned', worker_id: user.id, worker: w }).eq('id', jobAlert.id)
    setActiveJob({ ...jobAlert, status: 'assigned', worker: w })
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
    if (!p || p < floor) { showToast('Price cannot be below the minimum of Rs.' + floor); return }
    setBusy(true)
    const { data: updated, error } = await sb.from('bookings').update({
      status: 'priced', amount: p, price_note: note.trim() || null, priced_at: new Date().toISOString(),
    }).eq('id', activeJob.id).select('id')
    setBusy(false)
    if (error) { showToast(error.message); return }
    if (!updated || updated.length === 0) { showToast('Could not set price — check your connection and try again'); return }
    setActiveJob(prev => ({ ...prev, status: 'priced', amount: p, price_note: note.trim() || null }))
    setShowPrice(false)
    showToast('Price sent — waiting for customer to pay via UPI 💳')
  }

  async function confirmPayment() {
    if (!activeJob || busy) return
    setBusy(true)
    const amt = activeJob.amount || 0
    const fee = Math.round(amt * COMMISSION)
    const { error } = await sb.from('bookings').update({
      payment_status: 'paid', payment_method: 'upi', status: 'completed',
      payment_confirmed_at: new Date().toISOString(), completed_at: new Date().toISOString(),
    }).eq('id', activeJob.id)
    if (!error) {
      // Fetch fresh worker data to avoid stale wallet_balance from initial load
      const { data: fresh } = await sb.from('workers').select('wallet_balance, commission_due, total_jobs').eq('id', user.id).single()
      const base = fresh || {}
      await sb.from('workers').update({
        wallet_balance: (base.wallet_balance || 0) + amt - fee,
        commission_due: (base.commission_due || 0) + fee,
        total_jobs: (base.total_jobs || 0) + 1,
      }).eq('id', user.id)
      setTodayEarn(e => e + amt)
      setTodayJobs(j => j + 1)
      setActiveJob(null); setPrice(''); setNote('')
      showToast('Rs.' + (amt - fee).toLocaleString('en-IN') + ' received (Rs.' + fee + ' platform fee) 💰')
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
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#FAFAFA' }}>

      {/* ── Top bar — white, Rapido-style ── */}
      <div style={{ padding: '16px 18px 12px', flexShrink: 0, background: '#FFFFFF', borderBottom: '1px solid #F0F0F0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 18, fontWeight: 800, color: '#212121', letterSpacing: -0.3 }}>
              {profile?.name || 'Worker'} ⚡
            </p>
            <p style={{ fontSize: 12, color: '#9E9E9E', marginTop: 1 }}>
              {profile?.skill} · {profile?.city}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: online ? GREEN : '#9E9E9E' }}>
              {online ? 'Online' : 'Offline'}
            </span>
            <div onClick={toggleOnline}
              style={{ width: 52, height: 28, borderRadius: 20, background: online ? GREEN : '#E0E0E0', position: 'relative', cursor: 'pointer', transition: 'background .2s', boxShadow: online ? '0 0 10px rgba(37,211,102,.35)' : 'none' }}>
              <div style={{ width: 22, height: 22, background: '#fff', borderRadius: '50%', position: 'absolute', top: 3, left: online ? 27 : 3, transition: 'left .2s', boxShadow: '0 1px 4px rgba(0,0,0,.2)' }} />
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          {[
            { label: 'Earnings', value: 'Rs.' + todayEarn.toLocaleString('en-IN'), accent: true },
            { label: 'Jobs', value: String(todayJobs) },
            { label: 'Rating', value: '★ ' + (profile?.rating || 5.0) },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, borderRadius: 10, padding: '8px 6px', textAlign: 'center', background: s.accent ? '#FFF8CC' : '#F5F5F5', border: '1px solid ' + (s.accent ? Y : '#EEEEEE') }}>
              <p style={{ fontSize: 15, fontWeight: 800, color: s.accent ? '#412402' : '#212121' }}>{s.value}</p>
              <p style={{ fontSize: 10, color: '#9E9E9E', marginTop: 2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Scroll body ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* ── Offline state ── */}
        {!online && !activeJob && (
          <div style={{ background: '#FFFFFF', borderRadius: 20, padding: '36px 24px', textAlign: 'center', border: '1.5px dashed #E0E0E0', boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>😴</div>
            <p style={{ fontWeight: 800, fontSize: 17, color: '#212121' }}>{t('You are Offline')}</p>
            <p style={{ fontSize: 13, color: '#9E9E9E', margin: '8px 0 20px' }}>Toggle the switch above to start receiving jobs</p>
            <button onClick={toggleOnline}
              style={{ background: Y, border: 'none', borderRadius: 14, padding: '14px 32px', fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: 'Inter, sans-serif', color: '#412402', boxShadow: '0 4px 14px rgba(245,192,0,.35)' }}>
              {t('Go Online Now')}
            </button>
          </div>
        )}

        {/* ── Waiting state ── */}
        {online && !jobAlert && !activeJob && (
          <div style={{ background: '#FFFFFF', borderRadius: 20, padding: '36px 24px', textAlign: 'center', border: '1.5px solid #E8F5E9', boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>🟢</div>
            <p style={{ fontWeight: 800, fontSize: 17, color: '#212121' }}>{t('Waiting for jobs…')}</p>
            <p style={{ fontSize: 13, color: '#9E9E9E', marginTop: 6 }}>You will be notified instantly when a job matches</p>
          </div>
        )}

        {/* ── My upcoming scheduled jobs ── */}
        {online && upcoming.length > 0 && (
          <div style={{ background: '#FFFFFF', borderRadius: 18, overflow: 'hidden', border: '1.5px solid #EDE9FF', boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}>
            <div style={{ padding: '13px 16px', borderBottom: '1px solid #F5F5F5', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>📅</span>
              <p style={{ color: '#7C3AED', fontWeight: 800, fontSize: 14 }}>{t('My Upcoming Jobs')}</p>
            </div>
            {upcoming.map(b => (
              <div key={b.id} style={{ padding: '13px 16px', borderBottom: '1px solid #F5F5F5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: '#212121', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {b.service} · {b.customer_name || ''}
                  </p>
                  <p style={{ color: '#9E9E9E', fontSize: 11, marginTop: 2 }}>
                    {new Date(b.scheduled_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} · {b.address}
                  </p>
                </div>
                <button onClick={() => setActiveJob(b)}
                  style={{ background: Y, border: 'none', borderRadius: 10, padding: '8px 14px', fontWeight: 800, fontSize: 12, cursor: 'pointer', fontFamily: 'Inter, sans-serif', flexShrink: 0, color: '#412402' }}>
                  {t('Start Job')}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Available scheduled jobs ── */}
        {online && !activeJob && schedAvail.length > 0 && (
          <div style={{ background: '#FFFFFF', borderRadius: 18, overflow: 'hidden', border: '1.5px dashed #DDD6FE', boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}>
            <div style={{ padding: '13px 16px', borderBottom: '1px solid #F5F5F5', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>📅</span>
              <p style={{ color: '#7C3AED', fontWeight: 800, fontSize: 14 }}>{t('Scheduled Jobs Available')}</p>
            </div>
            {schedAvail.map(b => (
              <div key={b.id} style={{ padding: '13px 16px', borderBottom: '1px solid #F5F5F5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ color: '#212121', fontSize: 13, fontWeight: 700 }}>{b.service}</p>
                  <p style={{ color: '#9E9E9E', fontSize: 11, marginTop: 2 }}>
                    {new Date(b.scheduled_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <button onClick={() => acceptScheduled(b)}
                  style={{ background: '#E8F5E9', color: '#1B5E20', border: '1px solid #A5D6A7', borderRadius: 10, padding: '8px 14px', fontWeight: 800, fontSize: 12, cursor: 'pointer', fontFamily: 'Inter, sans-serif', flexShrink: 0 }}>
                  ✓ {t('Accept')}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── New job alert — Rapido style ── */}
        {jobAlert && (
          <div style={{ background: '#FFFFFF', borderRadius: 22, overflow: 'hidden', border: '2px solid ' + Y, boxShadow: '0 4px 20px rgba(245,192,0,.15)' }}>

            {/* Service + plate + starting price */}
            <div style={{ padding: '14px 18px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: '#FFF8CC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🔧</div>
                  <div>
                    <p style={{ fontSize: 13, color: '#9E9E9E', margin: '0 0 4px', lineHeight: 1.2 }}>{jobAlert.service}</p>
                    <Plate id={jobAlert.id} />
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 11, color: '#9E9E9E', margin: 0 }}>Starting from</p>
                  <p style={{ fontSize: 22, fontWeight: 900, color: '#212121', margin: 0, lineHeight: 1.1 }}>Rs.{jobFloor(jobAlert)}</p>
                </div>
              </div>
            </div>

            {/* Yellow separator */}
            <div style={{ height: 2, background: Y, margin: '12px 0 0' }} />

            {/* Customer */}
            <div style={{ padding: '12px 18px 0' }}>
              <p style={{ fontSize: 11, color: '#9E9E9E', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6, margin: '0 0 10px' }}>Customer</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#EEEEEE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#757575', flexShrink: 0 }}>
                  {(jobAlert.customer_name || 'C')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#212121', margin: 0, lineHeight: 1.2 }}>
                    {jobAlert.customer_name || 'Customer'}{jobAlert.preferred_worker_id === user?.id && ' ⭐'}
                  </p>
                  <p style={{ fontSize: 12, color: '#9E9E9E', margin: 0 }}>Kaam Ready Customer</p>
                </div>
                <CallBtn phone={null} onMiss={() => showToast('Accept the job first to call')} />
              </div>
            </div>

            <div style={{ height: 1, background: '#F5F5F5', margin: '12px 0' }} />

            {/* Journey details */}
            <div style={{ padding: '0 18px' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#212121', margin: '0 0 10px' }}>Job details</p>
              <RouteDots from={jobAlert.address || jobAlert.city} to={'On-site work · ' + (jobAlert.city || 'Mysuru')} />
            </div>

            <div style={{ height: 1, background: '#F5F5F5', margin: '12px 0' }} />

            {/* Payment row */}
            <div style={{ padding: '0 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16 }}>💵</div>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#212121', flex: 1 }}>Cash / UPI</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#212121' }}>Rs.{jobFloor(jobAlert)}+</span>
            </div>

            <div style={{ height: 4, background: '#F5F5F5', margin: '12px 0 0' }} />

            {/* Actions */}
            <div style={{ padding: '0 18px 16px' }}>
              <button onClick={acceptJob}
                style={{ width: '100%', background: Y, border: 'none', borderRadius: 10, padding: 15, fontWeight: 800, fontSize: 15, cursor: 'pointer', fontFamily: 'Inter, sans-serif', color: '#412402', marginTop: 12, boxShadow: '0 4px 12px rgba(245,192,0,.3)' }}>
                Accept Job
              </button>
              <p onClick={() => setJobAlert(null)}
                style={{ textAlign: 'center', fontSize: 13, color: RED, padding: '12px 0 0', cursor: 'pointer', margin: 0, fontWeight: 600 }}>
                Decline
              </p>
            </div>
          </div>
        )}

        {/* ── Active Job — Rapido style ── */}
        {activeJob && (
          <div style={{ background: '#FFFFFF', borderRadius: 22, overflow: 'hidden', border: '1.5px solid #E8F5E9', boxShadow: '0 4px 16px rgba(0,0,0,.06)' }}>

            {/* Service + plate + status */}
            <div style={{ padding: '14px 18px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: '#FFF8CC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🔧</div>
                  <div>
                    <p style={{ fontSize: 13, color: '#9E9E9E', margin: '0 0 4px', lineHeight: 1.2 }}>{activeJob.service}</p>
                    <Plate id={activeJob.id} />
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 11, color: '#9E9E9E', margin: 0 }}>Status</p>
                  <p style={{ fontSize: 13, fontWeight: 800, margin: 0, lineHeight: 1.1, color: jobStatus === 'payment_claimed' ? GREEN : jobStatus === 'awaiting_payment' ? '#F59E0B' : '#212121' }}>
                    {jobStatus === 'payment_claimed' ? '💸 Paid' : jobStatus === 'awaiting_payment' ? '⏳ Awaiting' : '⚡ Active'}
                  </p>
                </div>
              </div>
            </div>

            {/* Yellow separator */}
            <div style={{ height: 2, background: Y, margin: '12px 0 0' }} />

            {/* Customer */}
            <div style={{ padding: '12px 18px 0' }}>
              <p style={{ fontSize: 11, color: '#9E9E9E', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6, margin: '0 0 10px' }}>Customer</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#EEEEEE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#757575', flexShrink: 0 }}>
                  {(activeJob.customer_name || 'C')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#212121', margin: 0, lineHeight: 1.2 }}>{activeJob.customer_name || 'Customer'}</p>
                  <p style={{ fontSize: 12, color: '#9E9E9E', margin: 0 }}>Kaam Ready Customer</p>
                </div>
                <CallBtn phone={activeJob.customer_phone} onMiss={() => showToast('Customer phone not available')} />
              </div>
            </div>

            <div style={{ height: 1, background: '#F5F5F5', margin: '12px 0' }} />

            {/* Journey details */}
            <div style={{ padding: '0 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#212121', margin: 0 }}>Journey details</p>
                <button onClick={navigateToCustomer}
                  style={{ background: Y, border: 'none', borderRadius: 8, padding: '5px 12px', fontWeight: 700, fontSize: 11, color: '#412402', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                  Navigate
                </button>
              </div>
              <RouteDots from={activeJob.address || activeJob.city} to={'On-site work · ' + (activeJob.city || 'Mysuru')} />
            </div>

            {/* Map (in_progress only) */}
            {jobStatus === 'in_progress' && (
              <>
                <div style={{ margin: '12px 18px 0' }}>
                  <MapView
                    customerLat={activeJob.address_lat}
                    customerLng={activeJob.address_lng}
                    workerLat={activeJob.worker?.lat || profile?.lat}
                    workerLng={activeJob.worker?.lng || profile?.lng}
                    height={160}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8, margin: '10px 18px 0' }}>
                  {[['before', activeJob.photo_before_url], ['after', activeJob.photo_after_url]].map(([which, url]) => (
                    <label key={which}
                      style={{ flex: 1, background: url ? '#E8F5E9' : '#F5F5F5', border: '1px solid ' + (url ? '#A5D6A7' : '#E0E0E0'), borderRadius: 12, padding: 12, textAlign: 'center', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: url ? '#1B5E20' : '#9E9E9E' }}>
                      {photoBusy === which ? '…' : (url ? '✓ ' : '📷 ') + t(which === 'before' ? 'Before' : 'After')}
                      <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
                        onChange={e => uploadJobPhoto(which, e.target.files[0])} />
                    </label>
                  ))}
                </div>
              </>
            )}

            {/* Payment row */}
            <div style={{ height: 1, background: '#F5F5F5', margin: '12px 0' }} />
            <div style={{ padding: '0 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16 }}>💵</div>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#212121', flex: 1 }}>UPI · Platform collect</span>
              {activeJob.amount && <span style={{ fontSize: 15, fontWeight: 700, color: '#212121' }}>Rs.{activeJob.amount}</span>}
            </div>

            <div style={{ height: 4, background: '#F5F5F5', margin: '12px 0 0' }} />

            {/* Action area */}
            <div style={{ padding: '0 18px 16px' }}>

              {jobStatus === 'in_progress' && !showPrice && (
                <button onClick={() => { setPrice(''); setNote(''); setShowPrice(true) }}
                  style={{ width: '100%', background: Y, border: 'none', borderRadius: 10, padding: 15, fontWeight: 800, fontSize: 15, cursor: 'pointer', fontFamily: 'Inter, sans-serif', color: '#412402', marginTop: 12, boxShadow: '0 4px 12px rgba(245,192,0,.3)' }}>
                  {t('Work Done — Set Final Price ₹')}
                </button>
              )}

              {jobStatus === 'in_progress' && showPrice && (
                <div style={{ background: '#F9F9F9', borderRadius: 14, padding: 14, marginTop: 12, border: '1px solid #EEEEEE' }}>
                  <p style={{ color: '#412402', fontWeight: 800, fontSize: 14, marginBottom: 4 }}>Set Final Price</p>
                  <p style={{ color: '#9E9E9E', fontSize: 12, marginBottom: 12 }}>
                    Minimum: Rs.{jobFloor(activeJob)} — price fairly, customer approves before paying
                  </p>
                  <input value={price}
                    onChange={e => setPrice(e.target.value.replace(/\D/g, '').slice(0, 5))}
                    type="tel" placeholder="Rs. amount"
                    style={{ width: '100%', background: '#fff', border: '1.5px solid #E0E0E0', borderRadius: 10, padding: '13px 14px', fontSize: 20, fontWeight: 800, color: '#412402', outline: 'none', fontFamily: 'Inter, sans-serif', marginBottom: 10, boxSizing: 'border-box' }} />
                  <input value={note} onChange={e => setNote(e.target.value.slice(0, 120))}
                    placeholder="Why this price? e.g. extra wiring replaced"
                    style={{ width: '100%', background: '#fff', border: '1.5px solid #E0E0E0', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#757575', outline: 'none', fontFamily: 'Inter, sans-serif', marginBottom: 12, boxSizing: 'border-box' }} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setShowPrice(false)}
                      style={{ flex: 1, background: '#F5F5F5', color: '#9E9E9E', border: '1px solid #E0E0E0', borderRadius: 10, padding: 12, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                      Cancel
                    </button>
                    <button onClick={submitPrice} disabled={busy}
                      style={{ flex: 2, background: busy ? '#E0E0E0' : Y, border: 'none', borderRadius: 10, padding: 12, fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: 'Inter, sans-serif', color: busy ? '#9E9E9E' : '#412402', opacity: busy ? 0.7 : 1 }}>
                      {busy ? '…' : t('Send to Customer →')}
                    </button>
                  </div>
                </div>
              )}

              {jobStatus === 'awaiting_payment' && (
                <div style={{ background: '#FFFDE7', borderRadius: 14, padding: '18px 14px', marginTop: 12, textAlign: 'center', border: '1px solid #FFF176' }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>⏳</div>
                  <p style={{ color: '#212121', fontWeight: 800, fontSize: 16 }}>Rs.{activeJob.amount} sent to customer</p>
                  <p style={{ color: '#9E9E9E', fontSize: 13, marginTop: 6 }}>Waiting for them to approve and pay via UPI…</p>
                  <button onClick={() => {
                    setPrice(String(activeJob.amount || ''))
                    setNote(activeJob.price_note || '')
                    setActiveJob(p => ({ ...p, status: 'assigned' }))
                    setShowPrice(true)
                  }} style={{ marginTop: 14, background: 'none', border: '1px solid #E0E0E0', borderRadius: 10, color: '#9E9E9E', padding: '8px 18px', fontSize: 12, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                    Edit price
                  </button>
                </div>
              )}

              {jobStatus === 'payment_claimed' && (
                <div style={{ background: '#E8F5E9', border: '1.5px solid #A5D6A7', borderRadius: 14, padding: '20px 14px', marginTop: 12, textAlign: 'center', boxShadow: '0 0 14px rgba(37,211,102,.12)' }}>
                  <div style={{ fontSize: 40, marginBottom: 10 }}>💸</div>
                  <p style={{ color: '#212121', fontWeight: 900, fontSize: 17 }}>Customer paid Rs.{activeJob.amount} via UPI</p>
                  <p style={{ color: '#2E7D32', fontSize: 13, margin: '6px 0 16px' }}>Check your UPI app, then confirm below</p>
                  <button onClick={confirmPayment} disabled={busy}
                    style={{ width: '100%', background: busy ? '#E0E0E0' : GREEN, color: '#fff', border: 'none', borderRadius: 10, padding: 16, fontWeight: 900, fontSize: 15, cursor: 'pointer', fontFamily: 'Inter, sans-serif', opacity: busy ? 0.7 : 1, boxShadow: busy ? 'none' : '0 4px 12px rgba(37,211,102,.35)' }}>
                    {busy ? '…' : t('✓ Confirm Payment Received')}
                  </button>
                </div>
              )}

              {(jobStatus === 'in_progress' || jobStatus === 'awaiting_payment') && !showPrice && (
                <p style={{ textAlign: 'center', fontSize: 13, color: RED, padding: '10px 0 0', cursor: 'pointer', margin: 0, fontWeight: 600 }}>
                  Cancel job
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
