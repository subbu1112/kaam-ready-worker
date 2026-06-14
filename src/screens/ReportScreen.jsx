import { useState } from 'react'
import { sb } from '../lib/supabase'
const Y='#F5C000', YD='#B8900A', YL='#FFF8D6', BK='#1C1C1E'

const TYPES = [
  { id:'customer_complaint',ico:'😠', label:'Customer Complaint',   desc:'Rude behaviour, threats or harassment' },
  { id:'worker_complaint',  ico:'🗣️', label:'Worker Self-Report',    desc:'Reporting an issue about your own account' },
  { id:'fake_booking',      ico:'🎭', label:'Fake Booking',          desc:'Fraudulent booking, no one home repeatedly' },
  { id:'payment_dispute',   ico:'💸', label:'Payment Dispute',       desc:'Customer refused to pay or paid wrong amount' },
  { id:'safety',            ico:'⚠️', label:'Safety Concern',        desc:'Felt unsafe at job site or during job' },
  { id:'service_quality',   ico:'👎', label:'Service Quality Issue', desc:'Job done poorly, need to report the quality' },
  { id:'app_bug',           ico:'🐛', label:'App Bug / Tech Issue',  desc:'App crashes, notifications, login issues' },
  { id:'other',             ico:'📝', label:'Other',                 desc:'Something else not listed above' },
]

export default function ReportScreen({ user, onBack, showToast }) {
  const [step, setStep] = useState(0)
  const [type, setType] = useState(null)
  const [bookingId, setBookingId] = useState('')
  const [desc, setDesc] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (desc.trim().length < 20) { showToast('Please describe the issue in more detail'); return }
    setBusy(true)
    await sb.from('reports').insert({ user_id:user?.id, reported_by_role:'worker', report_type:type, booking_id:bookingId.trim()||null, description:desc.trim(), status:'open' }).catch(()=>{})
    setBusy(false); setStep(2)
  }

  if (step === 2) return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:32, gap:16, background:'#111' }}>
      <div style={{ fontSize:64 }}>✅</div>
      <p style={{ fontSize:22, fontWeight:900, color:Y, textAlign:'center' }}>Report Submitted</p>
      <p style={{ fontSize:14, color:'#555', textAlign:'center', lineHeight:1.7 }}>Our team will review within 24 hours and contact you.</p>
      <button onClick={onBack} style={{ background:Y, border:'none', borderRadius:14, padding:'14px 40px', fontWeight:800, fontSize:15, cursor:'pointer', fontFamily:'inherit' }}>Done</button>
    </div>
  )

  if (step === 1) return (
    <div style={{ flex:1, overflowY:'auto', background:'#111' }}>
      <div style={{ background:BK, padding:'52px 20px 20px' }}>
        <button onClick={()=>setStep(0)} style={{ background:'rgba(255,255,255,.12)', border:'none', borderRadius:10, padding:'6px 14px', color:'#fff', cursor:'pointer', fontFamily:'inherit', fontWeight:600, fontSize:13, marginBottom:14 }}>← Back</button>
        <h1 style={{ fontSize:20, fontWeight:800, color:Y }}>{TYPES.find(t=>t.id===type)?.label}</h1>
      </div>
      <div style={{ padding:16, display:'flex', flexDirection:'column', gap:12 }}>
        {[['Booking ID (optional)', bookingId, setBookingId]].map(([l,v,set]) => (
          <div key={l} style={{ background:'#1a1a1a', borderRadius:14, padding:14, border:'1px solid #2a2a2a' }}>
            <label style={{ fontSize:11, fontWeight:700, color:'#636366', display:'block', marginBottom:6, textTransform:'uppercase' }}>{l}</label>
            <input value={v} onChange={e=>set(e.target.value)} placeholder="Booking reference..."
              style={{ width:'100%', background:'#111', border:'1.5px solid #2a2a2a', borderRadius:10, padding:11, fontSize:14, outline:'none', fontFamily:'inherit', color:'#fff', boxSizing:'border-box' }} />
          </div>
        ))}
        <div style={{ background:'#1a1a1a', borderRadius:14, padding:14, border:'1px solid #2a2a2a' }}>
          <label style={{ fontSize:11, fontWeight:700, color:'#636366', display:'block', marginBottom:6, textTransform:'uppercase' }}>Describe the Issue *</label>
          <textarea value={desc} onChange={e=>setDesc(e.target.value.slice(0,1000))} rows={5}
            placeholder="What happened? Include date, time, and any details..."
            style={{ width:'100%', background:'#111', border:'1.5px solid #2a2a2a', borderRadius:10, padding:11, fontSize:13, outline:'none', fontFamily:'inherit', resize:'none', color:'#fff', boxSizing:'border-box' }} />
          <p style={{ fontSize:10, color:'#444', textAlign:'right', marginTop:4 }}>{desc.length}/1000</p>
        </div>
        <button onClick={submit} disabled={busy}
          style={{ width:'100%', background:'#dc2626', border:'none', borderRadius:14, padding:15, color:'#fff', fontWeight:800, fontSize:15, cursor:'pointer', fontFamily:'inherit', opacity:busy?0.6:1 }}>
          {busy?'Submitting...':'🚨 Submit Report'}
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ flex:1, overflowY:'auto', background:'#111' }}>
      <div style={{ background:BK, padding:'52px 20px 20px' }}>
        <button onClick={onBack} style={{ background:'rgba(255,255,255,.12)', border:'none', borderRadius:10, padding:'6px 14px', color:'#fff', cursor:'pointer', fontFamily:'inherit', fontWeight:600, fontSize:13, marginBottom:14 }}>← Back</button>
        <div style={{ fontSize:32 }}>🚨</div>
        <h1 style={{ fontSize:20, fontWeight:800, color:Y, marginTop:8 }}>Report an Issue</h1>
        <p style={{ fontSize:13, color:'#555', marginTop:4 }}>Select the category that best fits your issue</p>
      </div>
      <div style={{ padding:16, display:'flex', flexDirection:'column', gap:10 }}>
        {TYPES.map(t => (
          <button key={t.id} onClick={()=>{ setType(t.id); setStep(1) }}
            style={{ background:'#1a1a1a', borderRadius:14, padding:'14px 16px', border:'1px solid #2a2a2a', cursor:'pointer', fontFamily:'inherit', textAlign:'left', display:'flex', gap:12, alignItems:'center' }}>
            <div style={{ width:44, height:44, borderRadius:12, background:'#2a2a2a', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, flexShrink:0 }}>{t.ico}</div>
            <div style={{ flex:1 }}>
              <p style={{ fontSize:14, fontWeight:700, color:'#fff' }}>{t.label}</p>
              <p style={{ fontSize:11, color:'#555', marginTop:2 }}>{t.desc}</p>
            </div>
            <span style={{ color:'#333', fontSize:18 }}>›</span>
          </button>
        ))}
      </div>
    </div>
  )
}
