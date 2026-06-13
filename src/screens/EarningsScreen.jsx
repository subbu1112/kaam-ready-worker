import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'

const Y = '#F5C000', GREEN = '#25D366'

const PERIODS = ['Today', 'This Week', 'This Month']

function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{
      flex: 1,
      background: accent ? '#FFF8CC' : '#F5F5F5',
      borderRadius: 14,
      padding: '14px 12px',
      border: accent ? '1px solid ' + Y : '1px solid #EEEEEE',
      minWidth: 0,
    }}>
      <p style={{ color: accent ? '#9E7A00' : '#9E9E9E', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>{label}</p>
      <p style={{ color: accent ? '#412402' : '#212121', fontSize: 20, fontWeight: 900, marginTop: 4 }}>{value}</p>
      {sub && <p style={{ color: '#9E9E9E', fontSize: 11, marginTop: 3 }}>{sub}</p>}
    </div>
  )
}

export default function EarningsScreen({ user }) {
  const [period,   setPeriod]   = useState('This Month')
  const [bookings, setBookings] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => { load() }, [period])

  async function load() {
    if (!user) return
    setLoading(true)
    const now = new Date(), from = new Date()
    if (period === 'Today')      from.setHours(0, 0, 0, 0)
    if (period === 'This Week')  from.setDate(now.getDate() - 7)
    if (period === 'This Month') from.setDate(1)
    const { data } = await sb.from('bookings')
      .select('*')
      .eq('worker_id', user.id)
      .eq('status', 'completed')
      .gte('created_at', from.toISOString())
      .order('created_at', { ascending: false })
    setBookings(data || [])
    setLoading(false)
  }

  const total   = bookings.reduce((s, b) => s + (b.amount || 0), 0)
  const myEarn  = Math.round(total * 0.9)
  const fee     = Math.round(total * 0.1)
  const avgJob  = bookings.length ? Math.round(myEarn / bookings.length) : 0

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#FAFAFA' }}>

      {/* Header */}
      <div style={{ padding: '24px 20px 0', flexShrink: 0, background: '#FFFFFF', borderBottom: '1px solid #F0F0F0', paddingBottom: 16 }}>
        <p style={{ color: '#9E9E9E', fontSize: 12, fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase' }}>
          {period}
        </p>
        <p style={{ color: '#412402', fontSize: 36, fontWeight: 900, lineHeight: 1.1, marginTop: 4 }}>
          Rs.{myEarn.toLocaleString('en-IN')}
        </p>
        <p style={{ color: '#9E9E9E', fontSize: 13, marginTop: 4 }}>Your net earnings after 10% platform fee</p>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <StatCard label="Jobs Done"    value={bookings.length} accent />
          <StatCard label="Avg/Job"      value={bookings.length ? 'Rs.' + avgJob.toLocaleString('en-IN') : '—'} />
          <StatCard label="Platform Fee" value={'Rs.' + fee.toLocaleString('en-IN')} />
        </div>

        {/* Period chips */}
        <div style={{ display: 'flex', gap: 8, marginTop: 16, marginBottom: 4 }}>
          {PERIODS.map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              style={{
                padding: '7px 16px',
                borderRadius: 20,
                border: p === period ? '1.5px solid ' + Y : '1px solid #EEEEEE',
                background: p === period ? '#FFF8CC' : '#F5F5F5',
                color: p === period ? '#412402' : '#757575',
                fontWeight: p === period ? 800 : 600,
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
                transition: 'all .15s',
              }}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Job list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {loading && (
          <p style={{ color: '#9E9E9E', textAlign: 'center', paddingTop: 40, fontSize: 14 }}>Loading…</p>
        )}
        {!loading && bookings.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: 48 }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>💼</div>
            <p style={{ fontWeight: 800, fontSize: 17, color: '#212121' }}>No jobs yet this period</p>
            <p style={{ fontSize: 13, color: '#9E9E9E', marginTop: 6 }}>Completed jobs will appear here</p>
          </div>
        )}
        {!loading && bookings.length > 0 && (
          <div style={{ background: '#FFFFFF', borderRadius: 18, overflow: 'hidden', border: '1px solid #F0F0F0', boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}>
            {bookings.map((b, i) => {
              const earned = Math.round((b.amount || 0) * 0.9)
              return (
                <div key={b.id} style={{
                  padding: '14px 16px',
                  borderBottom: i < bookings.length - 1 ? '1px solid #F5F5F5' : 'none',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: '#212121', fontWeight: 700, fontSize: 14, margin: 0, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {b.service}
                    </p>
                    <p style={{ color: '#9E9E9E', fontSize: 12, marginTop: 3 }}>
                      {b.customer_name || 'Customer'} · {new Date(b.completed_at || b.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ color: '#412402', fontWeight: 800, fontSize: 15, margin: 0 }}>+Rs.{earned.toLocaleString('en-IN')}</p>
                    {b.amount && <p style={{ color: '#9E9E9E', fontSize: 11, marginTop: 2 }}>Total Rs.{b.amount}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
