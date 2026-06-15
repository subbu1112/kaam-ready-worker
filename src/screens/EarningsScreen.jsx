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
            <h1 styl