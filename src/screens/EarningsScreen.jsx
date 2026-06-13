import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'

const Y = '#F5C000', YD = '#B8900A', YL = '#2C2600'

const PERIODS = ['Today', 'This Week', 'This Month']

function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{
      flex: 1,
      background: accent ? 'linear-gradient(135deg,#2C2600,#1A1700)' : '#18181C',
      borderRadius: 16,
      padding: '14px 12px',
      border: `1px solid ${accent ? '#3D3400' : '#222228'}`,
      minWidth: 0,
    }}>
      <p style={{ color: accent ? Y : '#555', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>{label}</p>
      <p style={{ color: accent ? Y : '#fff', fontSize: 20, fontWeight: 900, marginTop: 4 }}>{value}</p>
      {sub && <p style={{ color: '#444', fontSize: 11, marginTop: 3 }}>{sub}</p>}
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
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0A0A0C' }}>

      {/* Header */}
      <div style={{ padding: '28px 20px 0', flexShrink: 0 }}>
        <p style={{ color: '#555', fontSize: 12, fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase' }}>
          {period}
        </p>
        <p style={{ color: Y, fontSize: 40, fontWeight: 900, lineHeight: 1.1, marginTop: 4 }}>
          ₹{myEarn.toLocaleString('en-IN')}
        </p>
        <p style={{ color: '#444', fontSize: 13, marginTop: 4 }}>Your net earnings after 10% platform fee</p>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <StatCard label="Jobs Done"   value={bookings.length} accent />
          <StatCard label="Avg/Job"     value={bookings.length ? `₹${avgJob.toLocaleString('en-IN')}` : '—'} />
          <StatCard label="Platform Fee" value={`₹${fee.toLocaleString('en-IN')}`} />
        </div>

        {/* Period chips */}
        <div style={{ display: 'flex', gap: 8, marginTop: 16, marginBottom: 4 }}>
          {PERIODS.map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              style={{
                padding: '7px 16px',
                borderRadius: 20,
                border: 'none',
                background: period === p ? Y : '#18181C',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
                color: period === p ? '#000' : '#555',
                transition: 'all 0.2s',
              }}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Job list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px 20px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ height: 68, background: '#18181C', borderRadius: 14, opacity: 0.5 }} />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 60 }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>💰</div>
            <p style={{ fontWeight: 800, color: '#fff', fontSize: 17 }}>No earnings yet</p>
            <p style={{ fontSize: 13, color: '#444', marginTop: 6 }}>Go online to start accepting jobs</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {bookings.map(b => {
              const earned = Math.round((b.amount || 0) * 0.9)
              const date   = new Date(b.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
              return (
                <div key={b.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '13px 14px',
                  background: '#111114',
                  borderRadius: 14,
                  border: '1px solid #1E1E24',
                }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 12,
                    background: YL,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                    flexShrink: 0,
                  }}>
                    🔧
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: 14, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {b.service}
                    </p>
                    <p style={{ fontSize: 12, color: '#444', marginTop: 2 }}>{date} · {b.city || 'Karnataka'}</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontWeight: 800, fontSize: 15, color: Y }}>+₹{earned.toLocaleString('en-IN')}</p>
                    <span style={{
                      background: '#052e16', color: '#4ade80',
                      fontSize: 10, fontWeight: 700,
                      padding: '2px 7px', borderRadius: 6,
                    }}>
                      Paid
                    </span>
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
