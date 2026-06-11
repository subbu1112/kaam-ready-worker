import { useState } from 'react'
import { sb } from '../lib/supabase'
import { floorFor } from '../constants'
const Y='#F5C000', YL='#FFF8D6'
const SKILLS=[{id:'elec',ico:'⚡',lbl:'Electrician'},{id:'plumb',ico:'🔧',lbl:'Plumber'},{id:'clean',ico:'🧹',lbl:'Cleaner'},{id:'carpen',ico:'🪚',lbl:'Carpenter'},{id:'paint',ico:'🎨',lbl:'Painter'},{id:'mech',ico:'🔩',lbl:'Mechanic'},{id:'pest',ico:'🐛',lbl:'Pest Control'},{id:'labor',ico:'👷',lbl:'Labourer'}]
const CITIES=['Bengaluru','Mysuru','Mangaluru','Hubballi','Belagavi','Tumakuru']

export default function OnboardScreen({ user, setProfile, setScreen, showToast }) {
  const [step,     setStep]     = useState(0)
  const [name,     setName]     = useState('')
  const [phone,    setPhone]    = useState('')
  const [city,     setCity]     = useState('')
  const [address,  setAddress]  = useState('')
  const [skills,   setSkills]   = useState([])
  const [primary,  setPrimary]  = useState('')
  const [upiId,    setUpiId]    = useState('')
  const [aaFront,  setAaFront]  = useState(null)  // File object
  const [aaBack,   setAaBack]   = useState(null)
  const [aaPreF,   setAaPreF]   = useState(null)  // Preview URL
  const [aaPreB,   setAaPreB]   = useState(null)
  const [busy,     setBusy]     = useState(false)

  function toggleSkill(id) {
    setSkills(prev => {
      const next = prev.includes(id) ? prev.filter(s=>s!==id) : [...prev, id]
      if (!primary && next.length===1) setPrimary(id)
      return next
    })
  }

  function pickFile(e, setFile, setPreview) {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  async function uploadKYC(uid) {
    const uploads = []
    if (aaFront) {
      const { data, error } = await sb.storage.from('kyc').upload(`${uid}/aadhaar-front.jpg`, aaFront, { upsert: true })
      if (!error) uploads.push('front')
    }
    if (aaBack) {
      const { data, error } = await sb.storage.from('kyc').upload(`${uid}/aadhaar-back.jpg`, aaBack, { upsert: true })
      if (!error) uploads.push('back')
    }
    return uploads.length > 0
  }

  function validatePricing() {
    if (!upiId.includes('@')) { showToast('Enter a valid UPI ID (e.g. name@upi)'); return false }
    return true
  }

  async function finish() {
    if (!name || !phone || !city || skills.length===0) { showToast('Fill in all required fields'); return }
    if (!aaFront || !aaBack) { showToast('Please upload both sides of Aadhaar'); return }
    setBusy(true)
    try {
      // Upload Aadhaar first
      const kycDone = await uploadKYC(user.id)
      const sk = primary || skills[0]
      const { data, error } = await sb.from('workers').upsert({
        id: user.id, name, phone, city, address, skill: sk, skills,
        onboarding_done: true, trust_score: 60,
        aadhar_submitted: kycDone, aadhar_verified: false,
        upi_id: upiId.trim(), price_min: floorFor(sk),
      }).select().single()
      if (error) { showToast(error.message); return }
      setProfile(data)
      setScreen('main')
      showToast('Welcome to Kaam Ready! 👷 Your Aadhaar is under review.')
    } catch(e) {
      showToast('Error: ' + e.message)
    } finally {
      setBusy(false)
    }
  }

  const STEPS = ['Personal Details', 'Your Skills', 'Pricing & UPI', 'Aadhaar KYC']

  return (
    <div style={{ height:'100vh', background:'#F2F2F7', maxWidth:430, margin:'0 auto', width:'100%', display:'flex', flexDirection:'column' }}>
      <div style={{ background:'#1C1C1E', padding:'48px 20px 20px' }}>
        <h2 style={{ fontSize:22, fontWeight:800, color:Y }}>Worker Onboarding</h2>
        <p style={{ fontSize:13, color:'#555', marginTop:4 }}>Step {step+1} of {STEPS.length} — {STEPS[step]}</p>
        <div style={{ display:'flex', gap:6, marginTop:10 }}>
          {STEPS.map((_,i) => <div key={i} style={{ height:4, borderRadius:4, flex:1, background:step>=i?Y:'#2a2a2a', transition:'.2s' }} />)}
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:16, display:'flex', flexDirection:'column', gap:12 }}>

        {/* Step 0 — Personal Details */}
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
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, fontWeight:700, color:'#555', display:'block', marginBottom:6 }}>YOUR CITY</label>
              <select value={city} onChange={e => setCity(e.target.value)}
                style={{ width:'100%', border:'1.5px solid #E5E5EA', borderRadius:12, padding:'13px', fontSize:14, outline:'none', fontFamily:'inherit', background:'#fff' }}>
                <option value="">Select city</option>
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:700, color:'#555', display:'block', marginBottom:6 }}>HOME ADDRESS</label>
              <input value={address} onChange={e => setAddress(e.target.value)}
                placeholder="e.g. 12, MG Road, Bengaluru"
                style={{ width:'100%', border:'1.5px solid #E5E5EA', borderRadius:12, padding:'13px', fontSize:14, outline:'none', fontFamily:'inherit' }} />
            </div>
          </div>
        )}

        {/* Step 1 — Skills */}
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

        {/* Step 2 — Pricing & UPI */}
        {step===2 && (() => {
          const sk = primary || skills[0]
          const floor = floorFor(sk)
          return (
          <div style={{ background:'#fff', borderRadius:20, padding:20, border:'1px solid #eee' }}>
            <p style={{ fontWeight:800, fontSize:17, marginBottom:6 }}>💰 Pricing & UPI</p>
            <p style={{ fontSize:13, color:'#888', marginBottom:16 }}>Customers pay you directly via UPI after each job.</p>
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, fontWeight:700, color:'#555', display:'block', marginBottom:6 }}>YOUR UPI ID</label>
              <input value={upiId} onChange={e => setUpiId(e.target.value)} placeholder="yourname@upi"
                style={{ width:'100%', border:'1.5px solid #E5E5EA', borderRadius:12, padding:13, fontSize:14, outline:'none', fontFamily:'inherit' }} />
            </div>
            <div style={{ background:YL, borderRadius:12, padding:'10px 14px', display:'flex', gap:8, alignItems:'flex-start' }}>
              <span style={{ fontSize:16 }}>ℹ️</span>
              <p style={{ fontSize:12, color:'#666', flex:1 }}>
                Minimum charge for your skill is fixed at <b>₹{floor}</b> — the job price can never go lower. You set the final price after the work is done and the customer approves it before paying.
              </p>
            </div>
          </div>
          )
        })()}

        {/* Step 3 — Aadhaar KYC */}
        {step===3 && (
          <div style={{ background:'#fff', borderRadius:20, padding:20, border:'1px solid #eee' }}>
            <p style={{ fontWeight:800, fontSize:17, marginBottom:6 }}>🛡️ Aadhaar Verification</p>
            <p style={{ fontSize:13, color:'#888', marginBottom:16 }}>Required for worker safety. Your Aadhaar is encrypted and only reviewed by our admin team.</p>

            {[['Front Side', aaFront, aaPreF, f => setAaFront(f), p => setAaPreF(p)],
              ['Back Side',  aaBack,  aaPreB, f => setAaBack(f),  p => setAaPreB(p)]].map(([label, file, prev, setFile, setPrev]) => (
              <div key={label} style={{ marginBottom:16 }}>
                <label style={{ fontSize:12, fontWeight:700, color:'#555', display:'block', marginBottom:8 }}>AADHAAR {label.toUpperCase()}</label>
                {prev ? (
                  <div style={{ position:'relative' }}>
                    <img src={prev} alt={label} style={{ width:'100%', height:160, objectFit:'cover', borderRadius:12, border:'2px solid #22c55e' }} />
                    <button onClick={() => { setFile(null); setPrev(null) }}
                      style={{ position:'absolute', top:8, right:8, background:'rgba(0,0,0,.6)', border:'none', borderRadius:8, color:'#fff', padding:'4px 8px', cursor:'pointer', fontSize:12 }}>
                      Change
                    </button>
                  </div>
                ) : (
                  <label style={{ display:'block', border:'2px dashed #E5E5EA', borderRadius:12, padding:'28px 20px', textAlign:'center', cursor:'pointer', background:'#fafafa' }}>
                    <div style={{ fontSize:32, marginBottom:8 }}>📷</div>
                    <p style={{ fontSize:13, fontWeight:600, color:'#555' }}>Tap to take photo or upload</p>
                    <p style={{ fontSize:11, color:'#aaa', marginTop:4 }}>{label} of Aadhaar card</p>
                    <input type="file" accept="image/*" capture="environment" style={{ display:'none' }}
                      onChange={e => pickFile(e, setFile, setPrev)} />
                  </label>
                )}
              </div>
            ))}
            <div style={{ background:'#FFF8D6', borderRadius:12, padding:'10px 14px', display:'flex', gap:8, alignItems:'flex-start' }}>
              <span style={{ fontSize:16 }}>🔒</span>
              <p style={{ fontSize:12, color:'#666', flex:1 }}>Your Aadhaar details are stored securely and never shared publicly. Verification takes 24 hours.</p>
            </div>
          </div>
        )}

        <div style={{ display:'flex', gap:10 }}>
          {step>0 && <button onClick={() => setStep(s=>s-1)} style={{ flex:1, background:'#f0f0f0', border:'none', borderRadius:14, padding:15, fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>← Back</button>}
          <button
            onClick={
              step===0 ? () => { if(!name||!phone||!city){showToast('Fill in all fields');return} setStep(1) }
              : step===1 ? () => { if(skills.length===0){showToast('Select at least one skill');return} setStep(2) }
              : step===2 ? () => { if(validatePricing()) setStep(3) }
              : finish
            }
            disabled={busy}
            style={{ flex:2, background:Y, border:'none', borderRadius:14, padding:15, fontSize:15, fontWeight:800, cursor:'pointer', fontFamily:'inherit', opacity:busy?0.6:1 }}>
            {busy ? 'Saving...' : step<3 ? 'Next →' : 'Finish & Start Working ✓'}
          </button>
        </div>
      </div>
    </div>
  )
}
