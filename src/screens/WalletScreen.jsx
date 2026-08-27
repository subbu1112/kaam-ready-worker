import { useState, useEffect, useCallback } from 'react'
import { sb } from '../lib/supabase'
import { workerShare } from '../constants'

const Y='#F5C000', YL='#FFF7DA', GREEN='#0FA958', RED='#E5484D', BK='#FFFFFF'
const MIN_WITHDRAW = 100

const fmt = n => '₹' + (Number(n) || 0).toLocaleString('en-IN')
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : '—'

// A single unified ledger row {type:'credit'|'debit', label, sub, amount, status, at}
function txColor(status) {
  if (status === 'paid' || status === 'verified') return GREEN
  if (status === 'failed' || status === 'rejected') return RED
  return Y
}

export default function WalletScreen({ user, profile, showToast, reloadProfile }) {
  const [credits,   setCredits]   = useState([])
  const [withdraws, setWithdraws] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [showForm,  setShowForm]  = useState(false)
  const [amount,    setAmount]    = useState('')
  const [upi,       setUpi]       = useState(profile?.upi_id || '')
  const [busy,      setBusy]      = useState(false)

  const balance = Number(profile?.wallet_balance) || 0

  const load = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    // Credits = verified job payments (worker keeps 90%)
    const cReq = sb.from('bookings')
      .select('id,service,amount,payment_status,completed_at,created_at,customer_name')
      .eq('worker_id', user.id).in('payment_status', ['verified','paid'])
      .order('created_at', { ascending:false }).limit(30)
    // Debits = withdrawal requests (graceful if table absent)
    const wReq = sb.from('withdrawals')
      .select('id,amount,upi_id,status,created_at,processed_at,utr')
      .eq('worker_id', user.id).order('created_at', { ascending:false }).limit(30)
    const [c, w] = await Promise.all([cReq, wReq])
    setCredits(c.data || [])
    setWithdraws(w.error ? [] : (w.data || []))
    setLoading(false)
  }, [user?.id])

  useEffect(() => { load() }, [load])
  useEffect(() => { setUpi(profile?.upi_id || '') }, [profile?.upi_id])

  async function requestWithdrawal() {
    const amt = parseInt(amount, 10) || 0
    // Pending requests "reserve" funds. We never write wallet_balance from the
    // worker app — a DB trigger blocks that, and the admin deducts on payout.
    const pendingNow = withdraws
      .filter(w => w.status === 'requested' || w.status === 'pending')
      .reduce((s, w) => s + (Number(w.amount) || 0), 0)
    const available = balance - pendingNow
    if (amt < MIN_WITHDRAW) { showToast(`Minimum withdrawal is ${fmt(MIN_WITHDRAW)}`); return }
    if (amt > available)    { showToast(`Only ${fmt(available)} available after pending requests`); return }
    if (!upi.includes('@')) { showToast('Enter a valid UPI ID (e.g. name@upi)'); return }
    setBusy(true)
    const { error } = await sb.from('withdrawals').insert({
      worker_id: user.id, amount: amt, upi_id: upi.trim(), status: 'requested',
    })
    setBusy(false)
    if (error) { showToast('Could not submit — please try again'); return }
    showToast('Withdrawal requested ✓ Admin will process it shortly')
    setShowForm(false); setAmount('')
    load()
  }

  const pendingWithdraw = withdraws.filter(w => w.status === 'requested' || w.status === 'pending')
    .reduce((s, w) => s + (Number(w.amount) || 0), 0)

  // Build unified transaction ledger
  const ledger = [
    ...credits.map(b => ({
      key: 'c'+b.id, type:'credit',
      label: (b.service || 'Job') + ' completed',
      sub: b.customer_name || 'Customer',
      amount: workerShare(b.amount), status: b.payment_status,
      at: b.completed_at || b.created_at,
    })),
    ...withdraws.map(w => ({
      key: 'w'+w.id, type:'debit',
      label: 'Withdrawal to UPI',
      sub: w.upi_id || '', amount: -(Number(w.amount) || 0),
      status: w.status, at: w.created_at,
    })),
  ].sort((a, b) => new Date(b.at) - new Date(a.at))

  return (
    <div style={{ flex:1, minHeight:0, display:'flex', flexDirection:'column' }}>
      <div style={{ background:'#FFFFFF', borderBottom:'1px solid #E9E9EB', padding:'15px 16px', flexShrink:0 }}>
        <h1 style={{ color:'#1A1A1A', fontSize:16, fontWeight:700 }}>Wallet</h1>
      </div>
      <div style={{ flex:1, minHeight:0, overflowY:'auto', WebkitOverflowScrolling:'touch', padding:16, paddingBottom:32, display:'flex', flexDirection:'column', gap:14 }}>

        {/* Balance card */}
        <div style={{ background:`linear-gradient(135deg, ${Y} 0%, #B8900A 100%)`, borderRadius:20, padding:'22px 20px', color:'#1A1A1A', boxShadow:'0 4px 16px rgba(245,192,0,.28)' }}>
          <p style={{ fontSize:12, fontWeight:700, opacity:.7 }}>Available to Withdraw</p>
          <p style={{ fontSize:38, fontWeight:900, lineHeight:1.1, marginTop:4 }}>{fmt(balance - pendingWithdraw)}</p>
          {pendingWithdraw > 0 && (
            <p style={{ fontSize:12, fontWeight:600, marginTop:6, opacity:.75 }}>⏳ {fmt(pendingWithdraw)} withdrawal in progress · wallet {fmt(balance)}</p>
          )}
          <button onClick={() => setShowForm(v => !v)}
            style={{ marginTop:16, width:'100%', background:'#1A1A1A', color:'#FFFFFF', border:'none', borderRadius:14, padding:14, fontWeight:800, fontSize:15, cursor:'pointer', fontFamily:'inherit' }}>
            {showForm ? 'Close' : '↓ Withdraw to UPI'}
          </button>
        </div>

        {/* Withdraw form */}
        {showForm && (
          <div style={{ background:BK, borderRadius:16, padding:16, border:'1px solid #E9E9EB' }}>
            <p style={{ color:'#1A1A1A', fontWeight:800, fontSize:14, marginBottom:10 }}>Request a Withdrawal</p>
            <label style={{ fontSize:10, fontWeight:700, color:'#6B6B70', display:'block', marginBottom:5, textTransform:'uppercase' }}>Amount ₹</label>
            <input value={amount} onChange={e => setAmount(e.target.value.replace(/\D/g,'').slice(0,6))} type="tel" inputMode="numeric" placeholder={`Min ${fmt(MIN_WITHDRAW)}`}
              style={{ width:'100%', background:'#F4F5F6', border:'1.5px solid #E9E9EB', borderRadius:10, padding:12, fontSize:16, fontWeight:700, color:'#1A1A1A', outline:'none', fontFamily:'inherit', boxSizing:'border-box', marginBottom:10 }} />
            <label style={{ fontSize:10, fontWeight:700, color:'#6B6B70', display:'block', marginBottom:5, textTransform:'uppercase' }}>UPI ID</label>
            <input value={upi} onChange={e => setUpi(e.target.value.trim())} placeholder="yourname@upi"
              style={{ width:'100%', background:'#F4F5F6', border:'1.5px solid #E9E9EB', borderRadius:10, padding:12, fontSize:14, color:'#1A1A1A', outline:'none', fontFamily:'inherit', boxSizing:'border-box', marginBottom:6 }} />
            <div style={{ display:'flex', gap:6, marginBottom:12 }}>
              {[balance - pendingWithdraw, 500, 1000].filter(v => v >= MIN_WITHDRAW && v <= (balance - pendingWithdraw)).map(v => (
                <button key={v} onClick={() => setAmount(String(Math.floor(v)))}
                  style={{ flex:1, background:'#F4F5F6', color:'#6B6B70', border:'1px solid #E9E9EB', borderRadius:8, padding:'7px 0', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                  {v === (balance - pendingWithdraw) ? 'All' : fmt(v)}
                </button>
              ))}
            </div>
            <button onClick={requestWithdrawal} disabled={busy}
              style={{ width:'100%', background:Y, border:'none', borderRadius:12, padding:14, fontWeight:800, fontSize:14, cursor:'pointer', opacity:busy?0.6:1, fontFamily:'inherit' }}>
              {busy ? 'Submitting…' : 'Submit Request ✓'}
            </button>
            <p style={{ color:'#9A9AA0', fontSize:11, marginTop:8, textAlign:'center' }}>Paid out by KaamReady admin, usually within 24 hours.</p>
          </div>
        )}

        {/* Transaction history */}
        <div>
          <p style={{ color:'#1A1A1A', fontWeight:800, fontSize:15, marginBottom:8 }}>Transaction History</p>
          {loading ? (
            <p style={{ color:'#6B6B70', fontSize:13, textAlign:'center', padding:24 }}>Loading…</p>
          ) : ledger.length === 0 ? (
            <div style={{ background:BK, borderRadius:16, padding:'28px 20px', textAlign:'center', border:'1px dashed #E9E9EB' }}>
              <div style={{ fontSize:36, marginBottom:8 }}>🧾</div>
              <p style={{ color:'#6B6B70', fontSize:14, fontWeight:700 }}>No transactions yet</p>
              <p style={{ color:'#9A9AA0', fontSize:12, marginTop:4 }}>Complete jobs to start earning.</p>
            </div>
          ) : ledger.map(tx => (
            <div key={tx.key} style={{ display:'flex', alignItems:'center', gap:12, background:BK, borderRadius:14, padding:'12px 14px', marginBottom:8, border:'1px solid #E9E9EB' }}>
              <div style={{ width:38, height:38, borderRadius:11, background: tx.type==='credit' ? '#E7F7EE' : '#FDECEC', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                {tx.type==='credit' ? '↓' : '↑'}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ color:'#1A1A1A', fontSize:13, fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{tx.label}</p>
                <p style={{ color:'#6B6B70', fontSize:11, marginTop:2 }}>{tx.sub} · {fmtDate(tx.at)}</p>
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <p style={{ color: tx.amount >= 0 ? GREEN : '#fff', fontSize:14, fontWeight:800 }}>
                  {tx.amount >= 0 ? '+' : '−'}{fmt(Math.abs(tx.amount))}
                </p>
                <p style={{ color: txColor(tx.status), fontSize:10, fontWeight:700, textTransform:'capitalize', marginTop:2 }}>{tx.status}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
