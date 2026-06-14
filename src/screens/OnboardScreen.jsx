import { useState } from 'react'
import { sb } from '../lib/supabase'
import { floorFor } from '../constants'
const Y='#F5C000', YL='#FFF8D6'

const SKILLS=[
  {id:'elec',ico:'⚡',lbl:'Electrician'},{id:'plumb',ico:'🔧',lbl:'Plumber'},
  {id:'clean',ico:'🧹',lbl:'Cleaner'},{id:'carpen',ico:'🪚',lbl:'Carpenter'},
  {id:'paint',ico:'🎨',lbl:'Painter'},{id:'mech',ico:'🔩',lbl:'Mechanic'},
  {id:'pest',ico:'🐛',lbl:'Pest Control'},{id:'labor',ico:'👷',lbl:'Labourer'},
]
const CITIES=['Bengaluru','Mysuru','Mangaluru','Hubballi','Belagavi','Tumakuru','Shivamogga','Davangere']
const STEPS=['Personal Details','Your Skills','Pricing & UPI','Aadhaar KYC','PAN Card']

export default function OnboardScreen({ user, setProfile, setScreen, showToast }) {
  const [step,     setStep]     = useState(0)
  // Step 0
  const [name,     setName]     = useState('')
  const [phone,    setPhone]    = useState('')
  const [email,    setEmail]    = useState('')
  const [city,     setCity]     = useState('')
  const [address,  setAddress]  = useState('')
  const [refCode,  setRefCode]  = useState('')
  // Step 1
  const [skills,   setSkills]   = useState([])
  const [primary,  setPrimary]  = useState('')
  // Step 2
  const [upiId,    setUpiId]    = useState('')
  // Step 3 — Aadhaar
  const [aaFront,  setAaFront]  = useState(null)
  const [aaBack,   setAaBack]   = useState(null)
  const [aaPreF,   setAaPreF]   = useState(null)
  const [aaPreB,   setAaPreB]   = useState(null)
  const [aaNum,    setAaNum]    = useState('')
  // Step 4 — PAN
  const [panFront, setPanFront] = useState(null)
  const [panPreF,  setPanPreF]  = useState(null)
  const [panNum,   setPanNum]   = useState('')
  const [busy,     setBusy]     = useState(false)

  function toggleSkill(id) {
    setSkills(prev => {
      const next = prev.includes(id) ? prev.filter(s=>s!==id) : [...prev, id]
      if (!primary && next.length===1) setPrimary(id)
      return next
    })
  }

  function pickFile(e, setFile, setPreview) {
    const f = e.target.files[0]; if (!f) return
    setFile(f); setPreview(URL.createObjectURL(f))
  }

  async function uploadDoc(uid, file, path) {
    const { error } = await sb.storage.from('kyc').upload(`${uid}/${path}`, file, { upsert:true })
    if (error) return null
    const { data:{ publicUrl } } = sb.storage.from('kyc').getPublicUrl(`${uid}/${path}`)
    return publicUrl
  }

  async function finish() {
    setBusy(true)
    try {
      const sk = primary || skills[0]
      const updates = {
        id: user.id, name, phone, city, address,
        email: email.trim()||null,
        skill: sk, skills,
        onboarding_done: true, trust_score: 60,
        upi_id: upiId.trim(),
        price_min: floorFor(sk),
        referral_code: 'KR'+phone.slice(-4)+Math.floor(10+Math.random()*89),
        referred_by: refCode.trim()||null,
        aadhar_submitted: false, aadhar_verified: false,
        pan_submitted: false, pan_verified: false,
      }

      // Upload Aadhaar
      if (aaFront) {
        const url = await uploadDoc(user.id, aaFront, 'aadhaar-front.jpg')
        if (url) { updates.aadhar_front_url = url; updates.aadhar_submitted = true }
      }
      if (aaBack) {
        const url = await uploadDoc(user.id, aaBack, 'aadhaar-back.jpg')
        if (url) updates.aadhar_back_url = url
      }
      if (aaNum.trim()) updates.aadhaar_number = aaNum.trim()

      // Upload PAN (optional step)
      if (panFront) {
        const url = await uploadDoc(user.id, panFront, 'pan-front.jpg')
        if (url) { updates.pan_front_url = url; updates.pan_submitted = true }
      }
      if (panNum.trim()) updates.pan_number = panNum.trim()

      const { data, error } = await sb.from('workers').upsert(updates).select().single()
      if (error) { showToast(error.message); return }
      setProfile(data)
      setScreen('main')
      showToast('Welcome to Kaam Ready! 👷 Your documents are under review.')
    } catch(e) { showToast('Error: '+e.message) }
    finally { setBusy(false) }
  }

  function nextStep() {
    if (step===0) {
      if (!name||!phone||!city) { showToast('Fill in name, phone and city'); return }
      if (phone.length<10) { showToast('Enter a valid 10-digit phone number'); return }
    }
    if (step===1 && skills.length===0) { showToast('Select at least one skill'); return }
    if (step===2 && !upiId.includes('@')) { showToast('Enter a valid UPI ID (e.g. name@upi)'); return }
    if (step===3 && (!aaFront || !aaBack)) { showToast('Please upload both sides of Aadhaar'); return }
    if (step===4) { finish(); return }
    setStep(s=>s+1)
  }

  const UploadBox = ({ label, preview, onPick }) => (
    <div style={{ marginBottom:14 }}>
      <label style={{ fontSize:12, fontWeight:700, color:'#555', display:'block', marginBottom:8 }}>{label.toUpperCase()}</label>
      {preview ? (
        <div style={{ position:'relative' }}>
          <img src={preview} style={{ width:'100%', height:140, objectFit:'cover', borderRadius:12, border:'2px solid #22c55e' }} />
          <label style={{ position:'absolute', top:8, right:8, background:'rgba(0,0,0,.6)', borderRadius:8, color:'#fff', padding:'4px 10px', cursor:'pointer', fontSize:12 }}>
            Change <input type="file" accept="image/*" capture="environment" style={{ display:'none' }} onChange={onPick} />
          </label>
        </div>
      ) : (
        <label style={{ display:'block', border:'2px dashed #E5E5EA', borderRadius:12, padding:'24px', textAlign:'center', cursor:'pointer', background:'#fafafa' }}>
          <div style={{ fontSize:30, marginBottom:8 }}>📷</div>
          <p style={{ fontSize:13, fontWeight:600, color:'#555' }}>Tap to upload</p>
          <input type="file" accept="image/*" capture="environment" style={{ display:'none' }} onChange={onPick} />
        </label>
      )}
    </div>
  )

  return (
    <div style={{ height:'100vh', background:'#F2F2F7', maxWidth:430, margin:'0 auto', width:'100%', display:'flex', flexDirection:'column' }}>
      {/* Header */}
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
            {[
              ['Full Name *','text',name,setName,'e.g. Raju Kumar'],
              ['Phone Number *','tel',phone,v=>setPhone(v.replace(/\D/g,'').slice(0,10)),'98765 43210'],
              ['Email Address (optional)','email',email,setEmail,'you@gmail.com'],
            ].map(([label,type,val,set,ph])=>(
              <div key={label} style={{ marginBottom:14 }}>
                <label style={{ fontSize:12,fontWeight:700,color:'#555',display:'block',marginBottom:6 }}>{label.toUpperCase()}</label>
                <input value={val} onChange={e=>set(e.target.value)} type={type} placeholder={ph}
                  style={{ width:'100%',border:'1.5px solid #E5E5EA',borderRadius:12,padding:'13px',fontSize:14,outline:'none',fontFamily:'inherit' }} />
              </div>
            ))}
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12,fontWeight:700,color:'#555',display:'block',marginBottom:6 }}>YOUR CITY *</label>
              <select value={city} onChange={e=>setCity(e.target.value)}
                style={{ width:'100%',border:'1.5px solid #E5E5EA',borderRadius:12,padding:'13px',fontSize:14,outline:'none',fontFamily:'inherit',background:'#fff' }}>
                <option value="">Select city</option>
                {CITIES.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12,fontWeight:700,color:'#555',display:'block',marginBottom:6 }}>HOME ADDRESS (OPTIONAL)</label>
              <input value={address} onChange={e=>setAddress(e.target.value)} placeholder="12, MG Road, Bengaluru"
                style={{ width:'100%',border:'1.5px solid #E5E5EA',borderRadius:12,padding:'13px',fontSize:14,outline:'none',fontFamily:'inherit' }} />
            </div>
            <div>
              <label style={{ fontSize:12,fontWeight:700,color:'#555',display:'block',marginBottom:6 }}>REFERRAL CODE (OPTIONAL)</label>
              <input value={refCode} onChange={e=>setRefCode(e.target.value.toUpperCase())} placeholder="Got a code from a friend?"
                style={{ width:'100%',border:'1.5px solid #E5E5EA',borderRadius:12,padding:'13px',fontSize:14,outline:'none',fontFamily:'inherit' }} />
            </div>
          </div>
        )}

        {/* Step 1 — Skills */}
        {step===1 && (
          <div style={{ background:'#fff', borderRadius:20, padding:20, border:'1px solid #eee' }}>
            <p style={{ fontWeight:800, fontSize:17, marginBottom:16 }}>Select Your Skills</p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:16 }}>
              {SKILLS.map(s=>(
                <div key={s.id} onClick={()=>toggleSkill(s.id)}
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
                  {skills.map(id=>{ const s=SKILLS.find(x=>x.id===id); return (
                    <button key={id} onClick={()=>setPrimary(id)}
                      style={{ background:primary===id?Y:'#f9f9f9', border:'2px solid '+(primary===id?Y:'#eee'), borderRadius:10, padding:'7px 14px', fontWeight:700, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
                      {s?.ico} {s?.lbl}
                    </button>
                  )})}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2 — UPI */}
        {step===2 && (
          <div style={{ background:'#fff', borderRadius:20, padding:20, border:'1px solid #eee' }}>
            <p style={{ fontWeight:800, fontSize:17, marginBottom:6 }}>💰 Pricing & UPI</p>
            <p style={{ fontSize:13, color:'#888', marginBottom:16 }}>Customers pay you directly via UPI after each job.</p>
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, fontWeight:700, color:'#555', display:'block', marginBottom:6 }}>YOUR UPI ID *</label>
              <input value={upiId} onChange={e=>setUpiId(e.target.value)} placeholder="yourname@upi"
                style={{ width:'100%', border:'1.5px solid #E5E5EA', borderRadius:12, padding:13, fontSize:14, outline:'none', fontFamily:'inherit' }} />
            </div>
            <div style={{ background:YL, borderRadius:12, padding:'10px 14px', display:'flex', gap:8 }}>
              <span>ℹ️</span>
              <p style={{ fontSize:12, color:'#666', flex:1 }}>
                Minimum charge for your skill: <b>₹{floorFor(primary||skills[0])}</b>. You set the final price after completing the job.
              </p>
            </div>
          </div>
        )}

        {/* Step 3 — Aadhaar */}
        {step===3 && (
          <div style={{ background:'#fff', borderRadius:20, padding:20, border:'1px solid #eee' }}>
            <p style={{ fontWeight:800, fontSize:17, marginBottom:4 }}>🛡️ Aadhaar Verification</p>
            <p style={{ fontSize:13, color:'#888', marginBottom:16 }}>Required for worker identity verification.</p>
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, fontWeight:700, color:'#555', display:'block', marginBottom:6 }}>AADHAAR NUMBER (OPTIONAL)</label>
              <input value={aaNum} onChange={e=>setAaNum(e.target.value.replace(/\D/g,'').slice(0,12))} placeholder="XXXX XXXX XXXX"
                style={{ width:'100%', border:'1.5px solid #E5E5EA', borderRadius:12, padding:13, fontSize:14, outline:'none', fontFamily:'inherit' }} />
            </div>
            <UploadBox label="Aadhaar Front *" preview={aaPreF} onPick={e=>pickFile(e,setAaFront,setAaPreF)} />
            <UploadBox label="Aadhaar Back *"  preview={aaPreB} onPick={e=>pickFile(e,setAaBack,setAaPreB)} />
            <div style={{ background:YL, borderRadius:12, padding:'10px 14px', display:'flex', gap:8 }}>
              <span>🔒</span>
              <p style={{ fontSize:11, color:'#666', flex:1 }}>Your Aadhaar is encrypted and only reviewed by the Kaam Ready admin team. Verification takes up to 24 hours.</p>
            </div>
          </div>
        )}

        {/* Step 