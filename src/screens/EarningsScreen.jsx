import { useState, useEffect, useCallback } from 'react'
import { sb } from '../lib/supabase'
const Y='#F5C000', YD='#B8900A', YL='#FFF8D6', GREEN='#22c55e', BK='#1C1C1E'

const PERIODS = ['Today', 'This Week', 'This Month', 'All Time']

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ background:'#1a1a1a', borderRadius:14, padding:'14px 16px', border:'1px solid #2a2a2a' }}>
      <p style={{ color:'#636366', fontSize:11, fontWeight:600, marginBottom:6 }}>{label}</p>
      <p style={{ color: color || '#fff', fontSize:22, fontWeight:900 }}>{value}</p>
      {sub && <p style={{ color:'#444', fontSize:11, marginTop:3 }}>{sub}</p>}
    </div>
  )
}

export default function EarningsScreen({ user, profile }) {
  const [period,   setPeriod]   = useState('This Month')
  const [bookings, setBookings] = useState([])
  const [payouts,  setPayouts]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState('earnings')

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const now = new Date()
    const from = new Date()
    if (period === 'Today')      { from.setHours(0,0,0,0) }
    if (period === 'This Week')  { from.setDate(now.getDate() - 7) }
    if (period === 'This Month') { from.setDate(1); from.setHours(0,0,0,0) }
    if (period === 'All Time')   { from.setFullYear(2020) }

    const bQuery = sb.from('bookings')
      .select('id,service,amount,status,created_at,completed_at,payment_status,customer_name,city')
      .eq('worker_id', user.id)
      .gte('created_at', from.toISOString())
      .order('created_at', { ascending: false })

    const pQuery = sb.from('payouts')
      .select('id,amount,status,paid_at,created_at,utr,week_start,gross_amount,commission_amount,notes')
      .eq('worker_id', user.id)
      .gte('created_at', from.toISOString())
      .order('created_at', { ascending: false })

    const [{ data: bData }, { data: pData }] = await Promise.all([bQuery, pQuery])
    setBookings(bData || [])
    setPayouts(pData || [])
    setLoading(false)
  }, [user, period])

  useEffect(() => { load() }, [load])

  const completed  = bookings.filter(b => b.status === 'completed')
  const totalGross = completed.reduce((s, b) => s + (b.amount || 0), 0)
  const myEarnings = Math.round(totalGross * 0.90)

  const pendingPayouts   = payouts.filter(p => p.status === 'pending')
  const completedPayouts = payouts.filter(p => p.status === 'paid')
  const pendingTotal     = pendingPayouts.reduce((s, p) => s + (p.amount || 0), 0)
  const paidTotal        = completedPayouts.reduce((s, p) => s + (p.amount || 0), 0)

  function downloadCSV() {
    const rows = [
      ['Date', 'Service', 'Customer', 'City', 'Gross Amount', 'Your Earnings (90%)', 'Status'],
      ...completed.map(b => [
        new Date(b.created_at).toLocaleDateString('en-IN'),
        b.service, b.customer_name || '', b.city || '',
        b.amount || 0, Math.round((b.amount || 0) * 0.9), b.status,
      ])
    ]
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `earnings_${period.replace(/ /g,'_')}.csv`
    a.click()
  }

  const fmt = n => '₹' + (n || 0).toLocaleString('en-IN')
  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—'

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      {/* Header */}
      <div style={{ background:BK, padding:'28px 20px 16px', flexShrink:0 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:900, color:Y }}>💰 Earnings</h1>
            <p style={{ fontSize:12, color:'#555', marginTop:2 }}>
              Wallet: <span style={{ color:GREEN, fontWeight:700 }}>{fmt(profile?.wallet_balance)}</span>
            </p>
          </div>
          <button onClick={downloadCSV}
            style={{ background:Y, border:'none', borderRadius:10, padding:'8px 14px', fontWeight:700, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
            ⬇ CSV
          </button>
        </div>
        {/* Period filter */}
        <div style={{ display:'flex', gap:6, marginTop:14, overflowX:'auto', paddingBottom:2 }}>
          {PERIODS.map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              style={{ padding:'6px 14px', borderRadius:20, border:'1.5px solid '+(period===p?Y:'#2a2a2a'),
                background:period===p?Y:'#1a1a1a', fontSize:11, fontWeight:700, cursor:'pointer',
                fontFamily:'inherit', color:period===p?BK:'#888', whiteSpace:'nowrap', flexShrink:0 }}>
              {p}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:16, display:'flex', flexDirection:'column', gap:12 }}>
        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:40 }}>
            <div style={{ width:32, height:32, border:'3px solid #333', borderTop:'3px solid '+Y, borderRadius:'50%', animation:'spin .8s linear infinite' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : (
          <>
            {/* Stat cards */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <StatCard label="Jobs Done" value={completed.length} sub={period} color={Y} />
              <StatCard label="My Earnings (90%)" value={fmt(myEarnings)} sub={'Gross: '+fmt(totalGross)} color={GREEN} />
              <StatCard label="Pending Payout" value={fmt(pendingTotal)} sub={pendingPayouts.length+' payout(s)'} color="#f59e0b" />
              <StatCard label="Total Paid Out" value={fmt(paidTotal)} sub={completedPayouts.length+' payment(s)'} color="#60a5fa" />
            </div>

            {/* Sub tabs */}
            <div style={{ display:'flex', gap:8 }}>
              {[['earnings','📋 Jobs'],['payouts','💸 Payouts']].map(([v,l]) => (
                <button key={v} onClick={() => setTab(v)}
                  style={{ flex:1, padding:'10px', borderRadius:12, border:'1.5px solid '+(tab===v?Y:'#2a2a2a'),
                    background:tab===v?Y:'#1a1a1a', fontWeight:700, fontSize:13, cursor:'pointer',
                    fontFamily:'inherit', color:tab===v?BK:'#888' }}>
                  {l}
                </button>
              ))}
            </div>

            {/* Jobs list */}
            {tab === 'earnings' && (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {completed.length === 0 && (
                  <div style={{ background:'#1a1a1a', borderRadius:14, padding:28, textAlign:'center' }}>
                    <p style={{ fontSize:32, marginBottom:8 }}>📭</p>
                    <p style={{ color:'#555', fontSize:13 }}>No completed jobs in this period</p>
                  </div>
                )}
                {completed.map(b => (
                  <div key={b.id} style={{ background:'#1a1a1a', borderRadius:14, padding:'14px 16px', border:'1px solid #2a2a2a' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                      <div>
                        <p style={{ fontWeight:700, color:'#fff', fontSize:14 }}>{b.service || 'Service'}</p>
                        <p style={{ fontSize:11, color:'#555', marginTop:3 }}>{b.customer_name || 'Customer'} • {b.city || '—'}</p>
                        <p style={{ fontSize:11, color:'#444', marginTop:2 }}>{fmtDate(b.created_at)}</p>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <p style={{ fontWeight:900, color:GREEN, fontSize:16 }}>{fmt(Math.round((b.amount||0)*0.9))}</p>
                        <p style={{ fontSize:10, color:'#444', marginTop:2 }}>gross {fmt(b.amount)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Payouts list */}
            {tab === 'payouts' && (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {pendingPayouts.length > 0 && (
                  <div style={{ background:'#2d1a00', borderRadius:14, padding:'12px 16px', border:'1px solid #f59e0b' }}>
                    <p style={{ color:'#f59e0b', fontWeight:800, fontSize:13, marginBottom:4 }}>⏳ Pending Payouts</p>
                    <p style={{ color:'#f59e0b', fontSize:22, fontWeight:900 }}>{fmt(pendingTotal)}</p>
                    <p style={{ color:'#a16207', fontSize:11, marginTop:4 }}>Will be processed on next payout cycle</p>
                  </div>
                )}
                {payouts.length === 0 && (
                  <div style={{ background:'#1a1a1a', borderRadius:14, padding:28, textAlign:'center' }}>
                    <p style={{ fontSize:32, marginBottom:8 }}>💳</p>
                    <p style={{ color:'#555', fontSize:13 }}>No payouts in this period</p>
                  </div>
                )}
                {payouts.map(p => (
                  <div key={p.id} style={{ background:'#1a1a1a', borderRadius:14, padding:'14px 16px', border:'1px solid #2a2a2a' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                      <div>
                        <p style={{ fontWeight:700, color:'#fff', fontSize:14 }}>
                          {p.status === 'paid' ? '✅ Paid' : '⏳ Pending'}
                        </p>
                        {p.week_start && <p style={{ fontSize:11, color:'#555', marginTop:3 }}>Week of {fmtDate(p.week_start)}</p>}
                        {p.utr && <p style={{ fontSize:10, color:'#444', marginTop:2 }}>UTR: {p.utr}</p>}
                        {p.paid_at && <p style={{ fontSize:10, color:'#444', marginTop:2 }}>Paid: {fmtDate(p.paid_at)}</p>}
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <p style={{ fontWeight:900, color: p.status==='paid' ? GREEN : '#f59e0b', fontSize:16 }}>{fmt(p.amount)}</p>
                        {p.commission_amount && <p style={{ fontSize:10, color:'#555', marginTop:2 }}>Commission: {fmt(p.commission_amount)}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        <div style={{ height:16 }} />
      </div>
    </div>
  )
}
