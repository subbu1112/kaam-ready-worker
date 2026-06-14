import { useState } from 'react'
import { sb } from '../lib/supabase'
const Y='#F5C000', YD='#B8900A', YL='#FFF8D6', BK='#1C1C1E'

const FAQS = [
  { q:'How does commission work?', a:'Kaam Ready takes 10% of each completed booking. You receive 90% directly to your UPI account.' },
  { q:'When do I get paid?', a:'Payments are processed weekly. Completed job amounts accumulate in your wallet and are released every Monday.' },
  { q:'How do I update my UPI ID?', a:'Go to Profile → Payment & Bank → update your UPI ID. Payouts will go to the updated UPI.' },
  { q:'My KYC is still pending, what do I do?', a:'Go to Profile → KYC Documents and upload clear photos of your Aadhaar card (front & back). Admin reviews within 48 hours.' },
  { q:'Customer cancelled after I was en route, what happens?', a:'If you were already dispatched, a cancellation fee of ₹100–₹150 is charged to the customer and credited to you.' },
  { q:'How do I improve my rating?', a:'Complete jobs on time, communicate clearly, and clean up after the job. Customers rate you after each completed service.' },
]

function FAQ({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ background:'#1a1a1a', borderRadius:14, overflow:'hidden', border:'1px solid #2a2a2a' }}>
      <button onClick={()=>setOpen(o=>!o)} style={{ width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 16px', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}>
        <span style={{ fontSize:13, fontWeight:700, color:'#fff', flex:1, marginRight:10 }}>{q}</span>
        <span style={{ color:Y, fontSize:18, transform:open?'rotate(45deg)':'none', transition:'.2s', flexShrink:0 }}>+</span>
      </button>
      {open && <div style={{ padding:'0 16px 14px' }}><p style={{ fontSize:13, color:'#555', lineHeight:1.6 }}>{a}</p></div>}
    </div>
  )
}

export default function HelpScreen({ user, onBack, showToast }) {
  const [view, setView] = useState('menu')
  const [cat, setCat] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const CATS = ['Payout Issue','KYC Problem','App Bug','Booking Problem','Customer Complaint','Account Issue','Other']

  async function submitTicket() {
    if (!cat) { showToast('Select a category'); return }
    if (msg.trim().length < 10) { showToast('Describe the issue (min 10 characters)'); return }
    setBusy(true)
    await sb.from('support_tickets').insert({ user_id:user?.id, user_role:'worker', category:cat, message:msg.trim(), status:'open' }).catch(()=>{})
    setBusy(false); setView('done')
  }

  if (view === 'done') return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:32, gap:16, background:'#111' }}>
      <div style={{ fontSize:64 }}>🎫</div>
      <p style={{ fontSize:22, fontWeight:900, color:Y, textAlign:'center' }}>Ticket Raised!</p>
      <p style={{ fontSize:14, color:'#555', textAlign:'center', lineHeight:1.7 }}>Our team will contact you within 4 hours on your registered number.</p>
      <button onClick={onBack} style={{ background:Y, border:'none', borderRadius:14, padding:'14px 40px', fontWeight:800, fontSize:15, cursor:'pointer', fontFamily:'inherit' }}>Done</button>
    </div>
  )

  if (view === 'ticket') return (
    <div style={{ flex:1, overflowY:'auto', background:'#111' }}>
      <div style={{ background:BK, padding:'52px 20px 20px' }}>
        <button onClick={()=>setView('menu')} style={{ background:'rgba(255,255,255,.12)', border:'none', borderRadius:10, padding:'6px 14px', color:'#fff', cursor:'pointer', fontFamily:'inherit', fontWeight:600, fontSize:13, marginBottom:14 }}>← Back</button>
        <h1 style={{ fontSize:20, fontWeight:800, color:Y }}>🎫 Raise a Ticket</h1>
      </div>
      <div style={{ padding:16, display:'flex', flexDirection:'column', gap:12 }}>
        <div style={{ background:'#1a1a1a', borderRadius:14, padding:14, border:'1px solid #2a2a2a' }}>
          <p style={{ fontSize:11, fontWeight:700, color:'#636366', textTransform:'uppercase', marginBottom:12 }}>Category</p>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {CATS.map(c => (
              <button key={c} onClick={()=>setCat(c)} style={{ background:cat===c?Y:'#2a2a2a', border:'1.5px solid '+(cat===c?YD:'#333'), borderRadius:10, padding:'7px 12px', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', color:cat===c?BK:'#888' }}>{c}</button>
            ))}
          </div>
        </div>
        <div style={{ background:'#1a1a1a', borderRadius:14, padding:14, border:'1px solid #2a2a2a' }}>
          <p style={{ fontSize:11, fontWeight:700, color:'#636366', textTransform:'uppercase', marginBottom:10 }}>Describe your issue</p>
          <textarea value={msg} onChange={e=>setMsg(e.target.value.slice(0,500))} rows={5} placeholder="What happened? Include as much detail as possible..."
            style={{ width:'100%', background:'#111', border:'1.5px solid #2a2a2a', borderRadius:10, padding:11, fontSize:13, outline:'none', fontFamily:'inherit', resize:'none', color:'#fff', boxSizing:'border-box' }} />
          <p style={{ fontSize:10, color:'#444', textAlign:'right', marginTop:4 }}>{msg.length}/500</p>
        </div>
        <button onClick={submitTicket} disabled={busy} style={{ width:'100%', background:Y, border:'none', borderRadius:14, padding:15, fontWeight:800, fontSize:15, cursor:'pointer', fontFamily:'inherit', opacity:busy?0.6:1 }}>
          {busy?'Submitting...':'Submit Ticket 🎫'}
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ flex:1, overflowY:'auto', background:'#111' }}>
      <div style={{ background:BK, padding:'52px 20px 20px' }}>
        <button onClick={onBack} style={{ background:'rgba(255,255,255,.12)', border:'none', borderRadius:10, padding:'6px 14px', color:'#fff', cursor:'pointer', fontFamily:'inherit', fontWeight:600, fontSize:13, marginBottom:14 }}>← Back</button>
        <div style={{ fontSize:32 }}>🆘</div>
        <h1 style={{ fontSize:20, fontWeight:800, color:Y, marginTop:8 }}>Help & Support</h1>
        <p style={{ fontSize:13, color:'#555', marginTop:4 }}>We're here 8 AM–10 PM, Mon–Sun</p>
      </div>
      <div style={{ padding:16, display:'flex', flexDirection:'column', gap:10 }}>
        <div style={{ background:'#1a1a1a', borderRadius:16, overflow:'hidden', border:'1px solid #2a2a2a' }}>
          {[
            { ico:'🎫', lbl:'Raise a Ticket', sub:'Get help from our team within 4 hours', act:()=>setView('ticket'), hl:true },
            { ico:'📞', lbl:'Call Support', sub:'1800-KR-HELP (Toll Free)', act:()=>window.location.href='tel:18005747435' },
            { ico:'💬', lbl:'WhatsApp', sub:'Chat with us instantly', act:()=>window.open('https://wa.me/918012345678?text=Hi+Kaam+Ready+Worker+Support','_blank') },
          ].map(({ico,lbl,sub,act,hl}) => (
            <button key={lbl} onClick={act} style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'14px 16px', background:hl?YL:'none', border:'none', borderBottom:'1px solid #2a2a2a', cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}>
              <div style={{ width:40, height:40, borderRadius:12, background:hl?Y:'#2a2a2a', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>{ico}</div>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:14, fontWeight:700, color:hl?BK:'#fff' }}>{lbl}</p>
                <p style={{ fontSize:11, color:hl?YD:'#555', marginTop:2 }}>{sub}</p>
              </div>
              <span style={{ color:'#333', fontSize:18 }}>›</span>
            </button>
          ))}
        </div>
        <p style={{ fontSize:12, fontWeight:700, color:'#444', textTransform:'uppercase', marginTop:4 }}>Frequently Asked</p>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {FAQS.map(f => <FAQ key={f.q} {...f} />)}
        </div>
        <div style={{ height:16 }} />
      </div>
    </div>
  )
}
