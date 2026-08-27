import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'
const Y = '#F5C000', YD = '#B8900A', YL = '#FFF7DA', BK = '#1A1A1A', GREEN = '#0FA958'

const STATUS_COLORS = {
  completed: { bg: '#D1FAE5', c: '#065F46', label: '✓ Completed' },
  cancelled:  { bg: '#FEE2E2', c: '#991B1B', label: '✕ Cancelled' },
  assigned:   { bg: '#DBEAFE', c: '#1E40AF', label: '🔵 Active' },
  priced:     { bg: '#FEF3C7', c: '#92400E', label: '💳 Priced' },
  searching:  { bg: '#F3F4F6', c: '#374151', label: '🔍 Searching' },
}

export default function JobHistoryScreen({ user, onBack }) {
  const [jobs, setJobs]       = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('all')  // all | completed | cancelled | active
  const [selected, setSelected] = useState(null)

  useEffect(() => { load() }, [user?.id])

  async function load() {
    if (!user?.id) return
    setLoading(true)
    const { data } = await sb.from('bookings')
      .select('*')
      .eq('worker_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100)
    setJobs(data || [])
    setLoading(false)
  }

  const filtered = jobs.filter(j => {
    if (filter === 'completed') return j.status === 'completed'
    if (filter === 'cancelled') return j.status === 'cancelled'
    if (filter === 'active')    return ['assigned', 'priced', 'searching'].includes(j.status)
    return true
  })

  const totals = {
    earned: jobs.filter(j => j.status === 'completed').reduce((s, j) => s + (j.amount || 0), 0),
    jobs: jobs.filter(j => j.status === 'completed').length,
    cancelled: jobs.filter(j => j.status === 'cancelled').length,
  }

  if (selected) {
    const st = STATUS_COLORS[selected.status] || STATUS_COLORS.searching
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#F4F5F6' }}>
        <div style={{ background: '#FFFFFF', borderBottom: '1px solid #E9E9EB', padding: '18px 20px 16px', flexShrink: 0 }}>
          <button onClick={() => setSelected(null)}
            style={{ background: '#F1F1F3', border: 'none', borderRadius: 10, padding: '6px 14px', color:'#1A1A1A', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
            ← Back
          </button>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 800, color: '#1A1A1A' }}>{selected.service}</h1>
              <p style={{ fontSize: 12, color: '#6B6B70', marginTop: 4 }}>
                {new Date(selected.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <span style={{ background: st.bg, color: st.c, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8 }}>{st.label}</span>
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: '#FFFFFF', borderRadius: 16, padding: 16, border: '1px solid #E9E9EB' }}>
            {[
              ['Customer', selected.customer_name || '—'],
              ['Address',  selected.address || selected.city || '—'],
              ['Description', selected.description || '—'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid #E9E9EB' }}>
                <span style={{ fontSize: 12, color: '#6B6B70', flexShrink: 0, marginRight: 12 }}>{k}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color:'#1A1A1A', textAlign: 'right', maxWidth: '65%' }}>{v}</span>
              </div>
            ))}
            {selected.amount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
                <span style={{ fontSize: 12, color: '#6B6B70' }}>Amount Earned</span>
                <span style={{ fontSize: 22, fontWeight: 800, color: GREEN }}>₹{Math.round((selected.amount || 0) * 0.9)}</span>
              </div>
            )}
            {selected.price_note && (
              <div style={{ background: '#F4F5F6', borderRadius: 10, padding: '10px 12px', marginTop: 4 }}>
                <p style={{ fontSize: 11, color: '#6B6B70', marginBottom: 4 }}>JOB NOTE</p>
                <p style={{ fontSize: 13, color:'#1A1A1A' }}>{selected.price_note}</p>
              </div>
            )}
          </div>

          {(selected.photo_before_url || selected.photo_after_url) && (
            <div style={{ background: '#FFFFFF', borderRadius: 16, padding: 16, border: '1px solid #E9E9EB' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#6B6B70', marginBottom: 10 }}>JOB PHOTOS</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[['Before', selected.photo_before_url], ['After', selected.photo_after_url]].map(([lb, url]) => url && (
                  <div key={lb}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: '#6B6B70', marginBottom: 4 }}>{lb.toUpperCase()}</p>
                    <img src={url} alt={lb} style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 10 }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {selected.rating && (
            <div style={{ background: '#FFFFFF', borderRadius: 16, padding: 16, border: '1px solid #E9E9EB', textAlign: 'center' }}>
              <p style={{ fontSize: 12, color: '#6B6B70', marginBottom: 6 }}>CUSTOMER RATING</p>
              <p style={{ fontSize: 28 }}>{'⭐'.repeat(selected.rating)}{'☆'.repeat(5 - selected.rating)}</p>
              <p style={{ color: '#B8900A', fontSize: 16, fontWeight: 800, marginTop: 4 }}>{selected.rating} / 5</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#F4F5F6' }}>
      {/* Header */}
      <div style={{ background: '#FFFFFF', borderBottom: '1px solid #E9E9EB', padding: '18px 20px 16px', flexShrink: 0 }}>
        <button onClick={onBack}
          style={{ background: '#F1F1F3', border: 'none', borderRadius: 10, padding: '6px 14px', color:'#1A1A1A', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
          ← Back
        </button>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1A1A1A' }}>📋 Job History</h1>

        {/* Summary stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 14 }}>
          {[
            ['₹' + Math.round(totals.earned * 0.9).toLocaleString('en-IN'), 'Total Earned'],
            [totals.jobs, 'Completed'],
            [totals.cancelled, 'Cancelled'],
          ].map(([v, l]) => (
            <div key={l} style={{ background: '#F4F5F6', borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#1A1A1A' }}>{v}</div>
              <div style={{ fontSize: 10, color: '#9A9AA0', marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, padding: '10px 16px', background: '#F4F5F6', flexShrink: 0 }}>
        {[['all', 'All'], ['completed', '✓ Done'], ['active', '🔵 Active'], ['cancelled', '✕ Cancelled']].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)}
            style={{ padding: '6px 12px', borderRadius: 20, border: '1.5px solid ' + (filter === v ? Y : '#E9E9EB'),
              background: filter === v ? Y : '#F4F5F6', fontSize: 11, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'inherit', color: filter === v ? BK : '#6B6B70', flexShrink: 0 }}>
            {l}
          </button>
        ))}
      </div>

      {/* List */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '8px 16px 16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <p style={{ color: '#9A9AA0' }}>Loading job history...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>📋</div>
            <p style={{ fontWeight: 700, color:'#1A1A1A', fontSize: 16 }}>No jobs found</p>
            <p style={{ color: '#9A9AA0', fontSize: 13, marginTop: 6 }}>
              {filter === 'all' ? 'Go online to start accepting jobs' : `No ${filter} jobs yet`}
            </p>
          </div>
        ) : (
          <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #E9E9EB', overflow: 'hidden' }}>
            {filtered.map((j, i) => {
              const st = STATUS_COLORS[j.status] || STATUS_COLORS.searching
              return (
                <div key={j.id} onClick={() => setSelected(j)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                    borderBottom: i < filtered.length - 1 ? '1px solid #E9E9EB' : 'none', cursor: 'pointer' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: 14, color:'#1A1A1A', marginBottom: 2 }}>{j.service}</p>
                    <p style={{ fontSize: 11, color: '#9A9AA0' }}>
                      {new Date(j.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      {j.customer_name ? ' · ' + j.customer_name : ''}
                    </p>
                    {j.rating > 0 && <p style={{ fontSize: 11, color: '#f59e0b', marginTop: 2 }}>{'⭐'.repeat(j.rating)}</p>}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {j.amount > 0 && (
                      <p style={{ fontWeight: 800, fontSize: 15, color: YD }}>₹{Math.round((j.amount || 0) * 0.9)}</p>
                    )}
                    <span style={{ background: st.bg, color: st.c, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6 }}>{st.label}</span>
                  </div>
                  <span style={{ color: '#C6C6C9', fontSize: 16 }}>›</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
