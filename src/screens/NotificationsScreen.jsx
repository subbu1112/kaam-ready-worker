import { useState, useEffect, useCallback } from 'react'
import { sb } from '../lib/supabase'

const Y='#F5C000', GREEN='#22c55e', BK='#1C1C1E'

const ICONS = {
  job:      '🔔',
  payment:  '💰',
  approval: '✅',
  promo:    '🎁',
  support:  '💬',
  default:  '📩',
}
const fmtDate = d => {
  if (!d) return ''
  const diff = (Date.now() - new Date(d)) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return Math.floor(diff/60) + 'm ago'
  if (diff < 86400) return Math.floor(diff/3600) + 'h ago'
  return new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short' })
}

export default function NotificationsScreen({ user, showToast }) {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    const { data, error } = await sb.from('notifications')
      .select('id,type,title,body,read,created_at,role')
      .eq('user_id', user.id).eq('role', 'worker')
      .order('created_at', { ascending:false }).limit(60)
    setItems(error ? [] : (data || []))
    setLoading(false)
  }, [user?.id])

  useEffect(() => { load() }, [load])

  // Realtime: new notifications pop in instantly
  useEffect(() => {
    if (!user?.id) return
    const ch = sb.channel('notif-'+user.id)
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'notifications', filter:'user_id=eq.'+user.id },
        payload => { if (payload.new.role === 'worker') setItems(prev => [payload.new, ...prev]) })
      .subscribe()
    return () => { sb.removeChannel(ch) }
  }, [user?.id])

  async function markRead(id) {
    setItems(prev => prev.map(n => n.id === id ? { ...n, read:true } : n))
    await sb.from('notifications').update({ read:true }).eq('id', id)
  }
  async function markAll() {
    const unread = items.filter(n => !n.read).map(n => n.id)
    if (!unread.length) return
    setItems(prev => prev.map(n => ({ ...n, read:true })))
    await sb.from('notifications').update({ read:true }).in('id', unread)
    showToast?.('All marked as read ✓')
  }

  const unreadCount = items.filter(n => !n.read).length

  return (
    <div style={{ flex:1, minHeight:0, position:'relative' }}>
      <div style={{ position:'absolute', inset:0, overflowY:'auto', WebkitOverflowScrolling:'touch', padding:16, paddingBottom:32 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <h1 style={{ color:'#fff', fontSize:20, fontWeight:800 }}>🔔 Notifications</h1>
          {unreadCount > 0 && (
            <button onClick={markAll} style={{ background:'#2a2a2a', color:Y, border:'none', borderRadius:10, padding:'7px 12px', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              Mark all read
            </button>
          )}
        </div>

        {loading ? (
          <p style={{ color:'#777', fontSize:13, textAlign:'center', padding:24 }}>Loading…</p>
        ) : items.length === 0 ? (
          <div style={{ background:BK, borderRadius:16, padding:'36px 20px', textAlign:'center', border:'1px dashed #2a2a2a' }}>
            <div style={{ fontSize:40, marginBottom:10 }}>🔕</div>
            <p style={{ color:'#aaa', fontSize:15, fontWeight:700 }}>You're all caught up</p>
            <p style={{ color:'#555', fontSize:12, marginTop:5 }}>Job alerts, payments and updates will show here.</p>
          </div>
        ) : items.map(n => (
          <div key={n.id} onClick={() => !n.read && markRead(n.id)}
            style={{ display:'flex', gap:12, background: n.read ? BK : '#23200d', borderRadius:14, padding:'13px 14px', marginBottom:8, border:'1px solid '+(n.read?'#2a2a2a':Y), cursor:'pointer' }}>
            <div style={{ width:40, height:40, borderRadius:12, background:'#111', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
              {ICONS[n.type] || ICONS.default}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', justifyContent:'space-between', gap:8 }}>
                <p style={{ color:'#fff', fontSize:14, fontWeight:700 }}>{n.title || 'Update'}</p>
                {!n.read && <span style={{ width:8, height:8, borderRadius:'50%', background:Y, flexShrink:0, marginTop:5 }} />}
              </div>
              {n.body && <p style={{ color:'#9ca3af', fontSize:12, marginTop:3, lineHeight:1.4 }}>{n.body}</p>}
              <p style={{ color:'#555', fontSize:11, marginTop:5 }}>{fmtDate(n.created_at)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
