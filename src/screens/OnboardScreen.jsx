import { useState } from 'react'
import { sb } from '../lib/supabase'
const Y='#F5C000', YL='#FFF8D6', BK='#1C1C1E'
const SKILLS=[{id:'elec',lbl:'Electrician',ico:'⚡'},{id:'plumb',lbl:'Plumber',ico:'🔧'},{id:'clean',lbl:'Cleaner',ico:'🧹'},{id:'carpen',lbl:'Carpenter',ico:'🪚'},{id:'paint',lbl:'Painter',ico:'🖌️'},{id:'mech',lbl:'Mechanic',ico:'🔩'},{id:'pest',lbl:'Pest Control',ico:'🐛'},{id:'labor',lbl:'Labourer',ico:'💪'}]
const CITIES=['Bengaluru','Mysuru','Mangaluru','Hubballi','Belagavi','Tumakuru','Shivamogga','Davangere','Kalaburagi','Udupi']
const inp={width:'100%',background:'#111',border:'1.5px solid #2a2a2a',borderRadius:12,padding:12,fontSize:15,outline:'none',fontFamily:'inherit',color:'#fff',boxSizing:'border-box'}
const lbl={fontSize:11,fontWeight:700,color:'#636366',display:'block',marginBottom:6,textTransform:'uppercase',letterSpacing:.5}

async function uploadDoc(uid, file, path) {
  if (!file) return null
  const { error } = await sb.storage.from('kyc').upload(`${uid}/${path}`, file, { upsert:true })
  if (error) return null
  const { data:{ publicUrl } } = sb.storage.from('kyc').getPublicUrl(`${uid}/${path}`)
  return publicUrl
}

export default function OnboardScreen({ user, showToast, setScreen, setProfile }) {
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState(user?.phone?.replace('+91','') || '')
  const [city, setCity] = useState('')
  const [address, setAddress] = useState('')
  const [refCode, setRefCode] = useState('')
  const [skill, setSkill] = useState('')
  const [skills, setSkills] = useState([])
  const [upiId, setUpiId] = useState('')
  const [priceMin, setPriceMin] = useState('200')
  const [aadharFront, setAadharFront] = useState(null)
  const [aadharBack, setAadharBack] = useState(null)
  const [aadhaarNumber, setAadhaarNumber] = useState('')
  const [panFront, setPanFront] = useState(null)
  const [panNumber, setPanNumber] = useState('')

  function nextStep() {
    if (step===0) { if (!name.trim()) { showToast('Enter your name'); return } if (!city) { showToast('Select your city'); return } }
    if (step===1) { if (!skill) { showToast('Select your primary skill'); return } }
    if (step===2) { if (!upiId.includes('@')) { showToast('Enter valid UPI ID (e.g. name@paytm)'); return } }
    if (step===3) { if (!aadharFront||!aadharBack) { showToast('Upload both sides of Aadhaar'); return } if (!aadhaarNumber.trim()) { showToast('Enter Aadhaar number'); return } }
    if (step < 4) setStep(s => s+1); else finish()
  }

  async function finish() {
    setSaving(true)
    const uid = user.id
    const [frontUrl, backUrl, panUrl] = await Promise.all([
      uploadDoc(uid, aadharFront, 'aadhaar-front.jpg'),
      uploadDoc(uid, aadharBack, 'aadhaar-back.jpg'),
      uploadDoc(uid, panFront, 'pan-front.jpg'),
    ])
    const payload = { id:uid, name:name.trim(), email:email.trim()||null, phone:phone||user?.phone, city, address:address.trim()||null, skill, skills:skills.length?skills:[skill], upi_id:upiId.trim(), price_min:Number(priceMin)||200, referral_code:refCode.trim()||null, aadhar_submitted:true, aadhar_front_url:frontUrl, aadhar_back_url:backUrl, aadhaar_number:aadhaarNumber.trim(), pan_submitted:!!panUrl, pan_front_url:panUrl||null, pan_number:panNumber.trim()||null, onboarding_done:true, kyc_status:'pending', account_status:'active', is_online:false, rating:5.0, total_jobs:0, wallet_balance:0, trust_score:100, service_radius_km:10, working_hours_start:'08:00', working_hours_end:'20:00' }
    const { data, error } = await sb.from('workers').upsert(payload).select().single()
    if (error) { showToast('Registration failed: '+error.message); setSaving(false); return }
    setProfile(data); setScreen('main'); showToast('Welcome to Kaam Ready! 🎉')
    setSaving(false)
  }

  const stepLabels = ['Personal','Skills','Pricing','Aadhaar','PAN']
  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', background:'#111', overflowY:'auto' }}>
      <div style={{ background:BK, padding:'48px 20px 20px', flexShrink:0 }}>
        <h1 style={{ fontSize:24, fontWeight:900, color:Y, marginBottom:4 }}>👷 Join Kaam Ready</h1>
        <p style={{ fontSize:13, color:'#555' }}>Step {step+1} of 5 — {stepLabels[step]}</p>
        <div style={{ marginTop:12, background:'#2a2a2a', borderRadius:8, height:6 }}>
          <div style={{ background:Y, height:6, borderRadius:8, width:(step/4*100)+'%', transition:'width .3s' }} />
        </div>
      </div>
      <div style={{ flex:1, padding:'20px 20px 40px', display:'flex', flexDirection:'column', gap:14 }}>
        {step===0 && (<>
          <div><label style={lbl}>Full Name *</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="Raju Kumar" style={inp} /></div>
          <div><label style={lbl}>Email (Optional)</label><input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="raju@gmail.com" style={inp} /></div>
          <div><label style={lbl}>Phone Number</label><input value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,'').slice(0,10))} type="tel" placeholder="98765 43210" style={inp} /></div>
          <div><label style={lbl}>City *</label><select value={city} onChange={e=>setCity(e.target.value)} style={inp}><option value="">Select your city</option>{CITIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
          <div><label style={lbl}>Home Address (Optional)</label><input value={address} onChange={e=>setAddress(e.target.value)} placeholder="123, Main Street..." style={inp} /></div>
          <div><label style={lbl}>Referral Code (Optional)</label><input value={refCode} onChange={e=>setRefCode(e.target.value.toUpperCase())} placeholder="KAAM1234" style={inp} /></div>
        </>)}
        {step===1 && (<>
          <p style={{ color:'#888', fontSize:13 }}>Select your primary skill and any additional skills.</p>
          <div><label style={lbl}>Primary Skill *</label>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {SKILLS.map(s=><button key={s.id} onClick={()=>setSkill(s.id)} style={{ padding:'12px 8px', borderRadius:12, border:'1.5px solid '+(skill===s.id?Y:'#2a2a2a'), background:skill===s.id?YL:'#1a1a1a', cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight:700, color:skill===s.id?BK:'#888', display:'flex', alignItems:'center', gap:6, justifyContent:'center' }}>{s.ico} {s.lbl}</button>)}
            </div>
          </div>
          <div><label style={lbl}>Additional Skills</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {SKILLS.filter(s=>s.id!==skill).map(s=><button key={s.id} onClick={()=>setSkills(prev=>prev.includes(s.id)?prev.filter(x=>x!==s.id):[...prev,s.id])} style={{ padding:'8px 14px', borderRadius:20, border:'1.5px solid '+(skills.includes(s.id)?Y:'#2a2a2a'), background:skills.includes(s.id)?YL:'#1a1a1a', cursor:'pointer', fontFamily:'inherit', fontSize:12, fontWeight:600, color:skills.includes(s.id)?BK:'#888' }}>{s.ico} {s.lbl}</button>)}
            </div>
          </div>
        </>)}
        {step===2 && (<>
          <div><label style={lbl}>UPI ID * (for receiving payments)</label><input value={upiId} onChange={e=>setUpiId(e.target.value)} placeholder="yourname@paytm" style={inp} /><p style={{ fontSize:11, color:'#555', marginTop:6 }}>Example: raju@paytm, raju@gpay, raju@ybl</p></div>
          <div><label style={lbl}>Minimum Price per Job (₹)</label><input value={priceMin} onChange={e=>setPriceMin(e.target.value.replace(/\D/g,''))} type="number" placeholder="200" style={inp} /></div>
          <div style={{ background:'#1a1a1a', borderRadius:12, padding:'12px 14px', border:'1px solid #2a2a2a' }}><p style={{ color:'#555', fontSize:12, lineHeight:1.6 }}>💡 Kaam Ready takes 10% commission. You keep 90% of every booking.</p></div>
        </>)}
        {step===3 && (<>
          <div style={{ background:'#1a2e1a', borderRadius:12, padding:'12px 14px', border:'1px solid #16a34a' }}><p style={{ color:'#4ade80', fontSize:12, lineHeight:1.6 }}>🔒 KYC required to receive payments. Documents securely stored and only reviewed by admins.</p></div>
          {[['Aadhaar Front *', aadharFront, setAadharFront],['Aadhaar Back *', aadharBack, setAadharBack]].map(([l,v,s])=>(
            <div key={l}><label style={lbl}>{l}</label><input type="file" accept="image/*" onChange={e=>s(e.target.files[0])} style={{ color:'#aaa', fontSize:13, width:'100%' }} />{v&&<p style={{ fontSize:11, color:'#22c55e', marginTop:4 }}>✓ {v.name}</p>}</div>
          ))}
          <div><label style={lbl}>Aadhaar Number *</label><input value={aadhaarNumber} onChange={e=>setAadhaarNumber(e.target.value.replace(/\D/g,'').slice(0,12))} placeholder="XXXX XXXX XXXX" style={inp} /></div>
        </>)}
        {step===4 && (<>
          <div style={{ background:'#1a1a2e', borderRadius:12, padding:'12px 14px', border:'1px solid #6366f1' }}><p style={{ color:'#a5b4fc', fontSize:12, lineHeight:1.6 }}>📄 PAN card optional but required for earnings above ₹50,000/year.</p></div>
          <div><label style={lbl}>PAN Card Photo (Optional)</label><input type="file" accept="image/*" onChange={e=>setPanFront(e.target.files[0])} style={{ color:'#aaa', fontSize:13, width:'100%' }} />{panFront&&<p style={{ fontSize:11, color:'#22c55e', marginTop:4 }}>✓ {panFront.name}</p>}</div>
          <div><label style={lbl}>PAN Number (Optional)</label><input value={panNumber} onChange={e=>setPanNumber(e.target.value.toUpperCase().slice(0,10))} placeholder="ABCDE1234F" style={inp} /></div>
        </>)}
        <div style={{ display:'flex', gap:10, marginTop:8 }}>
          {step>0 && <button onClick={()=>setStep(s=>s-1)} style={{ flex:1, background:'#1a1a1a', border:'1.5px solid #2a2a2a', borderRadius:14, padding:15, fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:'inherit', color:'#fff' }}>← Back</button>}
          {step===4 && <button onClick={()=>finish()} style={{ background:'transparent', border:'1.5px solid #444', borderRadius:14, padding:'15px 20px', fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:'#666' }}>Skip PAN</button>}
          <button onClick={nextStep} disabled={saving} style={{ flex:2, background:Y, border:'none', borderRadius:14, padding:15, fontSize:15, fontWeight:800, cursor:'pointer', fontFamily:'inherit', opacity:saving?.6:1 }}>
            {saving ? 'Submitting...' : step===4 ? 'Complete Registration ✓' : 'Continue →'}
          </button>
        </div>
      </div>
    </div>
  )
}
