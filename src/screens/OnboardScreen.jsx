import { useState } from 'react'
import { sb } from '../lib/supabase'
const Y='#F5C000',YL='#FFF8D6'
const SKILLS=[{id:'elec',ico:'⚡',lbl:'Electrician'},{id:'plumb',ico:'🔧',lbl:'Plumber'},{id:'clean',ico:'🧹',lbl:'Cleaner'},{id:'carpen',ico:'🪚',lbl:'Carpenter'},{id:'paint',ico:'🎨',lbl:'Painter'},{id:'mech',ico:'🔩',lbl:'Mechanic'},{id:'pest',ico:'🐛',lbl:'Pest Control'},{id:'labor',ico:'👷',lbl:'Labourer'}]
const CITIES=['Bengaluru','Mysuru','Mangaluru','Hubballi','Belagavi','Tumakuru']
export default function OnboardScreen({ user, setProfile, setScreen, showToast }) {
  const [step,    setStep]    = useState(0)
  const [name,    setName]    = useState('')
  const [phone,   setPhone]   = useState('')
  const [city,    setCity]    = useState('')
  const [skills,  setSkills]  = useState([])
  const [primary, setPrimary] = useState('')
  const [busy,    setBusy]    = useState(false)
  function toggleSkill(id) {
    setSkills(prev => { const next=prev.includes(id)?prev.filter(s=>s!==id):[...prev,id]; if(!primary&&next.length===1)setPrimary(id); return next })
  }
  async function finish() {
    if (!name||!phone||!city||skills.length===0) { showToast('Fill in all required fields'); return }
    setBusy(true)
    const { data, error } = await sb.from('workers').upsert({ id:user.id, name, phone, city, skill:primary||skills[0], skills, onboarding_done:true, trust_score:60 }).select().single()
    setBusy(false)
    if (error) { showToast(error.message); return }
    setProfile(data); setScreen('main'); showToast('Welcome to Kaam Ready! 👷')
  }
  return (
    <div style={{ height:'100vh', background:'#F2F2F7', maxWidth:430, margin:'0 auto', width:'100%', display:'flex', flexDirection:'column' }}>
      <div style={{ background:'#1C1C1E', padding:'48px 20px 20px' }}>
        <h2 style={{ fontSize:22, fontWeight:800, color:Y }}>Worker Onboarding</h2>
        <p style={{ fontSize:13, color:'#555', marginTop:4 }}>Step {step+1} of 2</p>
        <div style={{ display:'flex', gap:6, marginTop:10 }}>
          {[0,1].map(i => <div key={i} style={{ height:4, borderRadius:4, flex:1, background:step>=i?Y:'#2a2a2a', transition:'.2s' }} />)}
        </div>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:16, display:'flex', flexDirection:'column', gap:12 }}>
        {step===0 && (
          <div style={{ background:'#fff', borderRadius:20, padding:20, border:'1px solid #eee' }}>
            <p style={{ fontWeight:800, fontSize:17, marginBottom:16 }}>Personal Details</p>
            {[['Full name','text',name,setName,'e.g. Raju Kumar'],['Phone number','tel',phone,setPhone,'98765 43210']].map(([label,type,val,set,ph]) => (
              <div key={label} style={{ marginBottom:14 }}>
                <label style={{ fontSize:12, fontWeight:700, color:'#555', display:'block', marginBottom:6 }}>{label.toUpperCase()}</label>
                <input value={val} onChange={e => set(e.target.value.replace(type==='tel'?/\D/g:'','').slice(0,type==='tel'?10:100))}
                  type={type} placeholder={ph}
                  style={{ width:'100%', border:'1.5px solid #E5E5EA', borderRadius:12, padding:'13px', fontSize:14, outline:'none', fontFamily:'inherit' }} />
              </div>
            ))}
            <label style={{ fontSize:12, fontWeight:700, color:'#555', display:'block', marginBottom:6 }}>YOUR CITY</label>
            <select value={city} onChange={e => setCity(e.target.value)}
              style={{ width:'100%', border:'1.5px solid #E5E5EA', borderRadius:12, padding:'13px', fontSize:14, outline:'none', fontFamily:'inherit', background:'#fff' }}>
              <option value="">Select city</option>
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}
        {step===1 && (
          <div style={{ background:'#fff', borderRadius:20, padding:20, border:'1px solid #eee' }}>
            <p style={{ fontWeight:800, fontSize:17, marginBottom:16 }}>Select Your Skills</p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:16 }}>
              {SKILLS.map(s => (
                <div key={s.id} onClick={() => toggleSkill(s.id)}
                  style={{ background:skills.includes(s.id)?YL:'#f9f9f9', border:'2px solid '+(skills.includes(s.id)?Y:'transparent'), borderRadius:14, padding:'14px 8px', textAlign:'center', cursor:'pointer' }}>
                  <div style={{ fontSize:26, marginBottom:5 }}>{s.ico}</div>
                  <div style={{ fontSize:11, fontWeight:700 }}>{s.lbl}</div>
                </div>
              ))}
            </div>
            {skills.length>1 && (
              <div>
                <p style={{ fontSize:12, fontWeight:700, color:'#555', marginBottom:8 }}>PRIMARY SKILL</p>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {skills.map(id => { const s=SKILLS.find(x=>x.id===id); return (
                    <button key={id} onClick={() => setPrimary(id)}
                      style={{ background:primary===id?Y:'#f9f9f9', border:'2px solid '+(primary===id?Y:'#eee'), borderRadius:10, padding:'7px 14px', fontWeight:700, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
                      {s?.ico} {s?.lbl}
                    </button>
                  )})}
                </div>
              </div>
            )}
          </div>
        )}
        <div style={{ display:'flex', gap:10 }}>
          {step>0 && <button onClick={() => setStep(s=>s-1)} style={{ flex:1, background:'#f0f0f0', border:'none', borderRadius:14, padding:15, fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>← Back</button>}
          <button onClick={step===0?() => { if(!name||!phone||!city){showToast('Fill in all fields');return} setStep(1) }:finish} disabled={busy}
            style={{ flex:2, background:Y, border:'none', borderRadius:14, padding:15, fontSize:15, fontWeight:800, cursor:'pointer', fontFamily:'inherit', opacity:busy?0.6:1 }}>
            {busy?'Saving...':step===0?'Next →':'Finish & Start Working ✓'}
          </button>
        </div>
      </div>
    </div>
  )
}
