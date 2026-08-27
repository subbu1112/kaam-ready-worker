import { useState, useEffect, useCallback } from 'react'
import { sb } from '../lib/supabase'
import { loadSettings, workerShareFraction } from '../lib/settings'
import { C, card, scroller, btnPrimary, btnGhost, input, label, fmtINR } from '../theme'
import { SegTabs, StatGrid, Sheet, CheckRow, Timeline, Empty, Spinner, Pill, TopBar } from '../components/UI'

const MIN_REDEEM = 100

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—'
const fmtTime = d => d ? new Date(d).toLocaleString('en-IN', { hour:'2-digit', minute:'2-digit', day:'2-digit', month:'short', year:'numeric' }) : '—'

const EARN_TYPES = ['Jobs', 'Referral', 'Tips', 'Refund', 'Bonus Incentive', 'Joining Bonus', 'Special Incentive']

export default function EarningsScreen({ user, profile, showToast, reloadProfile }) {
  const [tab,      setTab]      = useState('today')     // today | redeem | custom
  const [bookings, setBookings] = useState([])
  const [payouts,  setPayouts]  = useState([])
  const [redeems,  setRedeems]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [share,    setShare]    = useState(workerShareFraction())

  // detail views
  const [order,     setOrder]     = useState(null)   // order info page
  const [redeemRow, setRedeemRow] = useState(null)   // redeem info page

  // filter sheet
  const [filterOpen, setFilterOpen] = useState(false)
  const [fServices,  setFServices]  = useState([])   // [] = all
  const [fTypes,     setFTypes]     = useState(['Jobs'])

  // custom range
  const [from, setFrom] = useState(() => new Date(Date.now()-7*864e5).toISOString().slice(0,10))
  const [to,   setTo]   = useState(() => new Date().toISOString().slice(0,10))

  // redeem form
  const [redeemOpen, setRedeemOpen] = useState(false)
  const [rulesOpen,  setRulesOpen]  = useState(false)
  const [amount,     setAmount]     = useState('')
  const [upi,        setUpi]        = useState(profile?.upi_id || '')
  const [busy,       setBusy]       = useState(false)

  const sharePct = Math.round(share * 100)
  useEffect(() => { loadSettings().then(() => setShare(workerShareFraction())) }, [])
  useEffect(() => { setUpi(profile?.upi_id || '') }, [profile?.upi_id])

  // Window the "today" and "custom" tabs read from.
  function range() {
    if (tab === 'custom') {
      const f = new Date(from); f.setHours(0,0,0,0)
      const t2 = new Date(to);  t2.setHours(23,59,59,999)
      return [f, t2]
    }
    const f = new Date(); f.setHours(0,0,0,0)
    return [f, new Date(Date.now()+864e5)]
  }

  const load = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    const [f, t2] = range()
    const [b, p, w] = await Promise.all([
      sb.from('bookings')
        .select('id,service,service_id,amount,status,created_at,completed_at,payment_status,customer_name,city,address,rating,price_note,labor_charge,material_cost,additional_charge')
        .eq('worker_id', user.id)
        .gte('created_at', f.toISOString()).lte('created_at', t2.toISOString())
        .order('created_at', { ascending:false }),
      sb.from('payouts')
        .select('id,amount,status,paid_at,created_at,utr,week_start,gross_amount,commission_amount,notes')
        .eq('worker_id', user.id).order('created_at', { ascending:false }).limit(30),
      sb.from('withdrawals')
        .select('id,amount,upi_id,status,created_at,processed_at,utr')
        .eq('worker_id', user.id).order('created_at', { ascending:false }).limit(30),
    ])
    setBookings(b.data || [])
    setPayouts(p.error ? [] : (p.data || []))
    setRedeems(w.error ? [] : (w.data || []))
    setLoading(false)
  }, [user?.id, tab, from, to])

  useEffect(() => { load() }, [load])

  // ── Derived numbers ───────────────────────────────────────
  const completed  = bookings.filter(b => b.status === 'completed' || ['verified','paid'].includes(b.payment_status))
  const services   = [...new Set(bookings.map(b => b.service).filter(Boolean))]
  const visible    = completed.filter(b => !fServices.length || fServices.includes(b.service))

  const totalGross = visible.reduce((s, b) => s + (b.amount || 0), 0)
  const myEarnings = Math.round(totalGross * share)
  const cash       = visible.filter(b => b.payment_status === 'cash').reduce((s,b) => s + (b.amount||0), 0)
  const avgRating  = visible.filter(b => b.rating).length
    ? (visible.reduce((s,b) => s + (b.rating||0), 0) / visible.filter(b => b.rating).length)
    : Number(profile?.rating) || 5

  const pendingRedeem = redeems.filter(r => ['requested','pending'].includes(r.status))
    .reduce((s, r) => s + (Number(r.amount)||0), 0)
  const paidOut = payouts.filter(p => p.status === 'paid').reduce((s,p) => s + (p.amount||0), 0)
    + redeems.filter(r => r.status === 'paid').reduce((s,r) => s + (Number(r.amount)||0), 0)
  const balance   = Number(profile?.wallet_balance) || 0
  const available = Math.max(0, balance - pendingRedeem)

  async function submitRedeem() {
    const amt = parseInt(amount, 10) || 0
    if (amt < MIN_REDEEM)  { showToast(`Minimum amount to redeem is ${fmtINR(MIN_REDEEM)}`); return }
    if (amt > available)   { showToast(`Only ${fmtINR(available)} available after pending requests`); return }
    if (!upi.includes('@')) { showToast('Add a valid UPI ID (e.g. name@upi)'); return }
    setBusy(true)
    const { error } = await sb.from('withdrawals').insert({
      worker_id: user.id, amount: amt, upi_id: upi.trim(), status: 'requested',
    })
    setBusy(false)
    if (error) { showToast('Could not submit — please try again'); return }
    showToast('Redeem request submitted ✓')
    setRedeemOpen(false); setAmount('')
    reloadProfile?.()
    load()
  }

  function downloadCSV() {
    const rows = [
      ['Date','Service','Customer','City','Gross Amount',`Your Earnings (${sharePct}%)`,'Status'],
      ...visible.map(b => [
        fmtDate(b.created_at), b.service, b.customer_name || '', b.city || '',
        b.amount || 0, Math.round((b.amount||0)*share), b.status,
      ]),
    ]
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type:'text/csv' }))
    a.download = `earnings_${tab}.csv`
    a.click()
  }

  // ── Order info detail page (reference: "Order info") ──────
  if (order) {
    const mine = Math.round((order.amount||0) * share)
    return (
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:C.page }}>
        <TopBar title="Order info" onBack={() => setOrder(null)} />
        <div style={{ ...scroller, padding:14, display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ ...card, padding:16 }}>
            <p style={{ fontSize:12, color:C.text3 }}>{fmtTime(order.created_at)}</p>
            <p style={{ fontSize:12, color:C.text3, marginTop:2 }}>Order ID · #{String(order.id).slice(0,8).toUpperCase()}</p>
            <div style={{ display:'flex', marginTop:14, borderTop:`1px solid ${C.line}`, paddingTop:14 }}>
              <div style={{ flex:1, borderRight:`1px solid ${C.line}` }}>
                <p style={{ fontSize:18, fontWeight:800, color:C.text }}>{order.service || 'Service'}</p>
                <p style={{ fontSize:11.5, color:C.text3, marginTop:3 }}>Service</p>
              </div>
              <div style={{ flex:1, paddingLeft:16 }}>
                <p style={{ fontSize:18, fontWeight:800, color:C.green }}>{fmtINR(mine)}</p>
                <p style={{ fontSize:11.5, color:C.text3, marginTop:3 }}>You earned ({sharePct}%)</p>
              </div>
            </div>
          </div>

          <div style={{ ...card, padding:16 }}>
            <p style={{ fontSize:13.5, fontWeight:700, color:C.text, marginBottom:12 }}>Order details</p>
            {[
              ['Customer', order.customer_name || '—'],
              ['Address',  order.address || order.city || '—'],
              ['Gross amount', fmtINR(order.amount)],
              ['Platform fee', '− ' + fmtINR((order.amount||0) - mine)],
              ['Status', order.payment_status || order.status || '—'],
            ].map(([k,v], i, arr) => (
              <div key={k} style={{ display:'flex', justifyContent:'space-between', gap:12, padding:'10px 0',
                borderBottom: i === arr.length-1 ? 'none' : `1px solid ${C.lineSoft}` }}>
                <span style={{ fontSize:13, color:C.text3 }}>{k}</span>
                <span style={{ fontSize:13, fontWeight:600, color:C.text, textAlign:'right', maxWidth:'62%' }}>{v}</span>
              </div>
            ))}
          </div>

          {(order.labor_charge || order.material_cost || order.additional_charge) && (
            <div style={{ ...card, padding:16 }}>
              <p style={{ fontSize:13.5, fontWeight:700, color:C.text, marginBottom:12 }}>Price breakdown</p>
              {[['Labour', order.labor_charge], ['Material', order.material_cost], ['Additional', order.additional_charge]]
                .filter(([, v]) => v).map(([k,v]) => (
                <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0' }}>
                  <span style={{ fontSize:13, color:C.text3 }}>{k}</span>
                  <span style={{ fontSize:13, fontWeight:600, color:C.text }}>{fmtINR(v)}</span>
                </div>
              ))}
            </div>
          )}

          {order.price_note && (
            <div style={{ ...card, padding:16 }}>
              <p style={{ fontSize:11, color:C.text3, fontWeight:700, letterSpacing:.4 }}>JOB NOTE</p>
              <p style={{ fontSize:13.5, color:C.text, marginTop:6, lineHeight:1.5 }}>{order.price_note}</p>
            </div>
          )}
          <div style={{ height:8 }} />
        </div>
      </div>
    )
  }

  // ── Redeem info detail page (reference: "Redeem Info") ────
  if (redeemRow) {
    const r = redeemRow
    const paid = r.status === 'paid'
    const steps = [
      { title:'Redeem request started', at: fmtTime(r.created_at), done:true },
      { title:'Approved by KaamReady',  at: r.processed_at ? fmtTime(r.processed_at) : 'Usually within a few hours', done: r.status !== 'requested' && r.status !== 'pending' },
      { title:'Payment processed',      at: paid ? fmtTime(r.processed_at) : 'Pending', done: paid },
    ]
    return (
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:C.page }}>
        <TopBar title="Redeem Info" onBack={() => setRedeemRow(null)} />
        <div style={{ ...scroller, padding:14, display:'flex', flexDirection:'column', gap:12 }}>
          {paid ? (
            <div style={{ ...card, padding:16 }}>
              <p style={{ fontSize:16, fontWeight:800, color:C.green }}>Successfully added to your account</p>
              <div style={{ background:C.greenL, borderRadius:10, padding:'10px 12px', marginTop:10 }}>
                <p style={{ fontSize:12.5, color:'#0B6B39', fontWeight:600 }}>⚡ {fmtINR(r.amount)} credited to your UPI</p>
              </div>
            </div>
          ) : (
            <div style={{ ...card, padding:16 }}>
              <p style={{ fontSize:16, fontWeight:800, color:C.text }}>Redeem in progress</p>
              <div style={{ background:C.amberL, borderRadius:10, padding:'10px 12px', marginTop:10 }}>
                <p style={{ fontSize:12.5, color:'#92400E', fontWeight:600 }}>⏳ {fmtINR(r.amount)} is being processed</p>
              </div>
            </div>
          )}

          <div style={{ ...card, padding:16 }}>
            <p style={{ fontSize:11, color:C.text3, fontWeight:700, letterSpacing:.4, marginBottom:8 }}>PAYOUT INFO</p>
            <p style={{ fontSize:14, fontWeight:700, color:C.text }}>{profile?.name || 'Worker'}</p>
            <p style={{ fontSize:13, color:C.text2, marginTop:2 }}>{r.upi_id || profile?.upi_id || '—'}</p>
            {r.utr && <p style={{ fontSize:12, color:C.text3, marginTop:4, fontFamily:'monospace' }}>UTR: {r.utr}</p>}
            <p style={{ fontSize:26, fontWeight:900, color:C.text, marginTop:12 }}>{fmtINR(r.amount)}</p>
          </div>

          <div style={{ ...card, padding:16 }}>
            <Timeline steps={steps} />
          </div>
          <div style={{ height:8 }} />
        </div>
      </div>
    )
  }

  // ── Job list (shared by Today and Custom) ─────────────────
  const JobList = () => (
    <div style={{ ...card, overflow:'hidden' }}>
      {visible.length === 0 && (
        <div style={{ padding:'30px 20px', textAlign:'center' }}>
          <div style={{ fontSize:32, marginBottom:8 }}>📭</div>
          <p style={{ fontSize:14, fontWeight:700, color:C.text }}>No earnings in this period</p>
          <p style={{ fontSize:12, color:C.text3, marginTop:4 }}>Completed jobs will show up here.</p>
        </div>
      )}
      {visible.map((b, i) => (
        <div key={b.id} onClick={() => setOrder(b)}
          style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', cursor:'pointer',
            borderBottom: i < visible.length-1 ? `1px solid ${C.lineSoft}` : 'none' }}>
          <div style={{ width:34, height:34, borderRadius:10, background:C.greenL, flexShrink:0,
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:15 }}>🔧</div>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ fontSize:13.5, fontWeight:700, color:C.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{b.service || 'Job'}</p>
            <p style={{ fontSize:11.5, color:C.text3, marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {b.customer_name || 'Customer'} · {fmtDate(b.created_at)}
            </p>
          </div>
          <div style={{ textAlign:'right', flexShrink:0 }}>
            <p style={{ fontSize:14.5, fontWeight:800, color:C.green }}>{fmtINR(Math.round((b.amount||0)*share))}</p>
            <p style={{ fontSize:10.5, color:C.text3, marginTop:1 }}>gross {fmtINR(b.amount)}</p>
          </div>
          <span style={{ color:'#C6C6C9', fontSize:16 }}>›</span>
        </div>
      ))}
    </div>
  )

  const stats = [
    { label:'Jobs done',      value: visible.length },
    { label:'Your earnings',  value: fmtINR(myEarnings), color:C.green },
    { label:'Gross billed',   value: fmtINR(totalGross) },
    { label:'Avg rating',     value: avgRating.toFixed(1), color:C.yellowD },
    { label:'Pending redeem', value: fmtINR(pendingRedeem), color: pendingRedeem ? C.amber : C.text },
    { label:'Paid out',       value: fmtINR(paidOut), color:C.blue },
  ]

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:C.page }}>
      <SegTabs value={tab} onChange={setTab}
        tabs={[['today','Today'], ['redeem','Redeem'], ['custom','Custom']]} />

      {/* ── Filter sheet ── */}
      {filterOpen && (
        <Sheet title="Filters" onClose={() => setFilterOpen(false)}
          footer={
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => { setFServices([]); setFTypes(['Jobs']) }} style={{ ...btnGhost, flex:1 }}>Reset</button>
              <button onClick={() => setFilterOpen(false)} style={{ ...btnPrimary, flex:1 }}>Apply</button>
            </div>
          }>
          <p style={{ ...label, marginBottom:2 }}>Service type</p>
          {services.length === 0 && <p style={{ fontSize:13, color:C.text3, padding:'8px 0' }}>No services in this period yet.</p>}
          {services.map(s => (
            <CheckRow key={s} label={s} checked={fServices.includes(s)}
              onToggle={() => setFServices(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s])} />
          ))}
          <div style={{ height:8, borderTop:`1px solid ${C.line}`, margin:'10px 0' }} />
          <p style={{ ...label, marginBottom:2 }}>Earnings type</p>
          {EARN_TYPES.map(s => (
            <CheckRow key={s} label={s} checked={fTypes.includes(s)}
              onToggle={() => setFTypes(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s])} />
          ))}
        </Sheet>
      )}

      {/* ── Redeem request sheet ── */}
      {redeemOpen && (
        <Sheet title="Redeem earnings" onClose={() => setRedeemOpen(false)}
          footer={
            <button onClick={submitRedeem} disabled={busy} style={{ ...btnPrimary, opacity:busy?.6:1 }}>
              {busy ? 'Submitting…' : 'Submit redeem request'}
            </button>
          }>
          <p style={{ fontSize:13, color:C.text2, marginBottom:14 }}>
            Available to redeem: <strong style={{ color:C.text }}>{fmtINR(available)}</strong>
            {pendingRedeem > 0 && <> · {fmtINR(pendingRedeem)} already requested</>}
          </p>
          <label style={label}>Amount ₹</label>
          <input value={amount} onChange={e => setAmount(e.target.value.replace(/\D/g,'').slice(0,6))}
            type="tel" inputMode="numeric" placeholder={`Min ${fmtINR(MIN_REDEEM)}`}
            style={{ ...input, marginBottom:12, fontWeight:700 }} />
          <label style={label}>UPI ID</label>
          <input value={upi} onChange={e => setUpi(e.target.value.trim())} placeholder="yourname@upi"
            style={{ ...input, marginBottom:12 }} />
          <div style={{ display:'flex', gap:8 }}>
            {[...new Set([available, 500, 1000])].filter(v => v >= MIN_REDEEM && v <= available).map(v => (
              <button key={v} onClick={() => setAmount(String(Math.floor(v)))}
                style={{ ...btnGhost, flex:1, padding:'9px 0', fontSize:12 }}>
                {v === available ? 'All' : fmtINR(v)}
              </button>
            ))}
          </div>
        </Sheet>
      )}

      {/* ── Rules sheet ── */}
      {rulesOpen && (
        <Sheet title="Redeem rules" onClose={() => setRulesOpen(false)}
          footer={<button onClick={() => setRulesOpen(false)} style={btnPrimary}>Got it</button>}>
          {[
            `Minimum redeemable amount is ${fmtINR(MIN_REDEEM)}.`,
            'Only verified job earnings count towards your redeemable balance.',
            'Requests are reviewed by the KaamReady team and usually paid within 24 hours.',
            'Money is sent to the UPI ID saved on your profile — keep it up to date.',
            'A pending request holds that amount until it is paid or rejected.',
          ].map((r, i) => (
            <div key={i} style={{ display:'flex', gap:10, padding:'10px 0', borderBottom:`1px solid ${C.lineSoft}` }}>
              <span style={{ color:C.green, fontWeight:900 }}>•</span>
              <p style={{ fontSize:13.5, color:C.text2, lineHeight:1.5 }}>{r}</p>
            </div>
          ))}
        </Sheet>
      )}

      <div style={{ ...scroller, padding:14, display:'flex', flexDirection:'column', gap:12 }}>
        {loading ? <Spinner /> : (
          <>
            {/* ── TODAY / CUSTOM ── */}
            {tab !== 'redeem' && (
              <>
                {tab === 'custom' && (
                  <div style={{ ...card, padding:14, display:'flex', gap:10, alignItems:'flex-end' }}>
                    <div style={{ flex:1 }}>
                      <label style={label}>From</label>
                      <input type="date" value={from} max={to} onChange={e => setFrom(e.target.value)} style={{ ...input, padding:'11px 12px', fontSize:13 }} />
                    </div>
                    <div style={{ flex:1 }}>
                      <label style={label}>To</label>
                      <input type="date" value={to} min={from} onChange={e => setTo(e.target.value)} style={{ ...input, padding:'11px 12px', fontSize:13 }} />
                    </div>
                  </div>
                )}

                {/* Earnings hero */}
                <div style={{ ...card, overflow:'hidden' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12, padding:'18px 16px' }}>
                    <div style={{ flex:1 }}>
                      <p style={{ fontSize:28, fontWeight:900, color:C.text, lineHeight:1.1 }}>{fmtINR(myEarnings)}</p>
                      <p style={{ fontSize:12.5, color:C.text2, marginTop:4 }}>
                        {tab === 'today' ? "Today's earnings" : 'Earnings for selected range'}
                      </p>
                    </div>
                    <span style={{ color:'#C6C6C9', fontSize:20 }}>›</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', padding:'12px 16px',
                    borderTop:`1px solid ${C.line}`, background:C.cardAlt }}>
                    <span style={{ fontSize:13, color:C.text2 }}>Cash collected</span>
                    <span style={{ fontSize:13, fontWeight:700, color:C.text }}>{fmtINR(cash)}</span>
                  </div>
                </div>

                {/* Filter + export row */}
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <button onClick={() => setFilterOpen(true)}
                    style={{ ...btnGhost, width:'auto', padding:'9px 14px', fontSize:12.5 }}>⚙ Filter</button>
                  {fServices.length > 0 && <Pill bg={C.greenL} color={C.green}>{fServices.length} service filter</Pill>}
                  <div style={{ flex:1 }} />
                  <button onClick={downloadCSV}
                    style={{ ...btnGhost, width:'auto', padding:'9px 14px', fontSize:12.5 }}>⬇ CSV</button>
                </div>

                <StatGrid items={stats} />
                <JobList />
              </>
            )}

            {/* ── REDEEM ── */}
            {tab === 'redeem' && (
              <>
                <div style={{ ...card, overflow:'hidden' }}>
                  <div style={{ padding:'18px 16px' }}>
                    <p style={{ fontSize:30, fontWeight:900, color:C.text, lineHeight:1.1 }}>{fmtINR(available)}</p>
                    <p style={{ fontSize:12.5, color:C.text2, marginTop:4 }}>Balance available to redeem</p>
                  </div>
                  <div style={{ borderTop:`1px solid ${C.line}` }}>
                    {[
                      ['Wallet balance', fmtINR(balance)],
                      ['Earnings this period', fmtINR(myEarnings)],
                      ['Cash collected', fmtINR(cash)],
                      ...(pendingRedeem ? [['Redeem in progress', fmtINR(pendingRedeem)]] : []),
                    ].map(([k, v]) => (
                      <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'12px 16px',
                        borderBottom:`1px solid ${C.lineSoft}` }}>
                        <span style={{ fontSize:13, color:C.text2 }}>{k}</span>
                        <span style={{ fontSize:13, fontWeight:700, color:C.text }}>{v}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ padding:16 }}>
                    <p style={{ fontSize:12, color:C.text3, textAlign:'center', marginBottom:10 }}>
                      Minimum amount to redeem · {fmtINR(MIN_REDEEM)}
                    </p>
                    <button onClick={() => setRedeemOpen(true)} disabled={available < MIN_REDEEM}
                      style={{ ...btnPrimary, opacity: available < MIN_REDEEM ? .5 : 1,
                        cursor: available < MIN_REDEEM ? 'not-allowed' : 'pointer' }}>
                      Redeem
                    </button>
                    <button onClick={() => setRulesOpen(true)}
                      style={{ ...btnGhost, marginTop:8, background:'transparent', border:'none', color:C.text2, fontSize:13 }}>
                      Show Rules
                    </button>
                  </div>
                </div>

                <p style={{ fontSize:14, fontWeight:800, color:C.text, marginTop:2 }}>Redeem Requests</p>
                {redeems.length === 0 ? (
                  <Empty ico="💸" title="No redeem requests yet" sub="Your requests and their status will appear here." />
                ) : (
                  <div style={{ ...card, overflow:'hidden' }}>
                    {redeems.map((r, i) => {
                      const paid = r.status === 'paid'
                      const failed = ['failed','rejected'].includes(r.status)
                      return (
                        <div key={r.id} onClick={() => setRedeemRow(r)}
                          style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', cursor:'pointer',
                            borderBottom: i < redeems.length-1 ? `1px solid ${C.lineSoft}` : 'none' }}>
                          <div style={{ width:34, height:34, borderRadius:10, flexShrink:0,
                            background: paid ? C.greenL : failed ? C.redL : C.amberL,
                            display:'flex', alignItems:'center', justifyContent:'center', fontSize:15 }}>
                            {paid ? '✅' : failed ? '⚠️' : '⏳'}
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <p style={{ fontSize:13.5, fontWeight:700, color:C.text }}>{fmtINR(r.amount)}</p>
                            <p style={{ fontSize:11.5, color:C.text3, marginTop:2 }}>{fmtDate(r.created_at)} · {r.upi_id || 'UPI'}</p>
                          </div>
                          <Pill bg={paid ? C.greenL : failed ? C.redL : C.amberL}
                                color={paid ? C.green : failed ? C.red : '#92400E'}>
                            {paid ? 'Paid' : failed ? 'Failed' : 'In progress'}
                          </Pill>
                          <span style={{ color:'#C6C6C9', fontSize:16 }}>›</span>
                        </div>
                      )
                    })}
                  </div>
                )}

                {payouts.length > 0 && (
                  <>
                    <p style={{ fontSize:14, fontWeight:800, color:C.text, marginTop:2 }}>Weekly payouts</p>
                    <div style={{ ...card, overflow:'hidden' }}>
                      {payouts.map((p, i) => (
                        <div key={p.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px',
                          borderBottom: i < payouts.length-1 ? `1px solid ${C.lineSoft}` : 'none' }}>
                          <div style={{ flex:1, minWidth:0 }}>
                            <p style={{ fontSize:13.5, fontWeight:700, color:C.text }}>
                              {p.week_start ? 'Week of ' + fmtDate(p.week_start) : fmtDate(p.created_at)}
                            </p>
                            {p.utr && <p style={{ fontSize:11, color:C.text3, marginTop:2, fontFamily:'monospace' }}>UTR: {p.utr}</p>}
                          </div>
                          <div style={{ textAlign:'right' }}>
                            <p style={{ fontSize:14, fontWeight:800, color: p.status==='paid' ? C.green : C.amber }}>{fmtINR(p.amount)}</p>
                            <p style={{ fontSize:10.5, color:C.text3, textTransform:'capitalize' }}>{p.status}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}
        <div style={{ height:10 }} />
      </div>
    </div>
  )
}
