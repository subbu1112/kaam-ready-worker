import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'

const Y='#F5C000', BK='#1C1C1E'

export default function NotificationBell({ user }) {
  const [notifs, setNotifs] = useState([])
  const [open,   setOpen]   = useState(false)
  const unread = notifs.filter(n => !n.is_read).length

  useEffect(() => {
    if (!user?.id) return
    loadNotifs()
    // Real-time subscription
    const ch = sb.channel('notifs-'+user.id)
      .on('postgres_changes',{ event:'INSERT', schema:'public', table:'notifications', filter:'user_id=eq.'+user.id },
        payload => setNotifs(prev => [payload.new, ...prev].slice(0, 50)))
      .subscribe()
    return () => sb.removeChannel(ch)
  }, [user?.id])

  async function loadNotifs() {
    const { data } = await sb.from('notifications')
      .select('id,title,body,is_read,created_at,type')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30)
    setNotifs(data || [])
  }

  async function markAllRead() {
    if (unread === 0) return
    await sb.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false)
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const ico = type => ({ booking:'📋', payment:'💳', worker:'👷', system:'📢', alert:'🔔' })[type] || '🔔'
  const fmtTime = ts => {
    const d = new Date(ts), now = new Date()
    const diff = Math.floor((now - d) / 1000)
    if (diff < 60)   return 'just now'
    if (diff < 3600) return Math.floor(diff/60)+'m ago'
    if (diff < 86400) return Math.floor(diff/3600)+'h ago'
    return d.toLocaleDateString('en-IN',{day:'2-digit',month:'short'})
  }

  return (
    <div style={{ position:'relative' }}>
      <button onClick={()=>{ setOpen(o=>!o); if(!open) markAllRead() }}
        style={{ background:'transparent', border:'none', cursor:'pointer', padding:'4px 8px', position:'relative', lineHeight:1 }}>
        <span style={{ fontSize:22 }}>🔔</span>
        {unread > 0 && (
          <span style={{ position:'absolute', top:-2, right:0, background:'#ef4444', color:'#fff', fontSize:10, fontWeight:900, width:18, height:18, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid #fff' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div onClick={()=>setOpen(false)} style={{ position:'fixed', inset:0, zIndex:998 }} />
          <div style={{ position:'absolute', right:0, top:'110%', width:300, maxHeight:400, overflowY:'auto', background:'#fff', borderRadius:16, boxShadow:'0 8px 32px rgba(0,0,0,.18)', border:'1px solid #E5E5EA', zIndex:999 }}>
            <div style={{ padding:'12px 16px', borderBottom:'1px solid #F2F2F7', display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky', top:0, background:'#fff' }}>
              <span style={{ fontWeight:800, fontSize:14, color:BK }}>Notifications</span>
              {unread > 0 && <button onClick={markAllRead} style={{ background:'none', border:'none', color:Y, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Mark all read</button>}
            </div>
            {notifs.length === 0 ? (
              <div style={{ padding:'32px 16px', textAlign:'center' }}>
                <div style={{ fontSize:32, marginBottom:8 }}>🔔</div>
                <p style={{ color:'#8e8e93', fontSize:13 }}>No notifications yet</p>
              </div>
            ) : notifs.map(n => (
              <div key={n.id} style={{ padding:'12px 16px', borderBottom:'1px solid #F9F9F9', background:n.is_read?'#fff':'#FFFBEB', display:'flex', gap:10, alignItems:'flex-start' }}>
                <span style={{ fontSize:20, flexShrink:0 }}>{ico(n.type)}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:13, fontWeight:n.is_read?500:700, color:BK, marginBottom:2 }}>{n.title}</p>
                  <p style={{ fontSize:12, color:'#636366', lineHeight:1.4 }}>{n.body}</p>
                  <p style={{ fontSize:11, color:'#aeaeb2', marginTop:4 }}>{fmtTime(n.created_at)}</p>
                </div>
                {!n.is_read && <div style={{ width:8, height:8, borderRadius:'50%', background:Y, flexShrink:0, marginTop:4 }} />}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
