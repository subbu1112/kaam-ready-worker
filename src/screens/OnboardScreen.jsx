import { useState } from 'react'
import { sb } from '../lib/supabase'
const Y='#F5C000', YL='#FFF7DA', BK='#1A1A1A'

const SKILLS = [
  { id:'elec', lbl:'Electrician', ico:'⚡' },
  { id:'plumb', lbl:'Plumber', ico:'🔧' },
  { id:'clean', lbl:'Cleaner', ico:'🧹' },
  { id:'carpen', lbl:'Carpenter', ico:'🪚' },
  { id:'paint', lbl:'Painter', ico:'🖌️' },
  { id:'mech', lbl:'Mechanic', ico:'🔩' },
  { id:'pest', lbl:'Pest Control', ico:'🐛' },
  { id:'labor', lbl:'Labourer', ico:'💪' },
]

const CITIES = ['Bengaluru','Mysuru','Mangaluru','Hubballi','Belagavi','Tumakuru','Shivamogga','Davangere','Kalaburagi','Udupi']

const inp = { width:'100%', background:'#FFFFFF', border:'1.5px solid #E9E9EB', borderRadius:12, padding:12, fontSize:15, outline:'none', fontFamily:'inherit', color:'#1A1A1A', boxSizing:'border-box' }
const lbl = { fontSize:11, fontWeight:700, color:'#6B6B70', display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:.5 }

// Uploads one document and returns { path, url }.
//
// The PATH is what gets persisted: the KYC bucket is private, and this used to
// store a 1-hour signed URL, so by the time an admin opened the approval queue
// every document had already expired. Admin and worker now mint a fresh signed
// URL from the path whenever they need to look.
async function uploadDoc(uid, file, name) {
  if (!file) return null
  const uniquePath = `${uid}/${Date.now()}-${name}`
  const { error } = await sb.storage.from('kyc').upload(uniquePath, file, {
    contentType: file.type || undefined,
  })
  if (error) return null
  let url = null
  try {
    const { data } = await sb.storage.from('kyc').createSignedUrl(uniquePath, 60 * 60 * 24 * 7)
    url = data?.signedUrl || null
  } catch { /* the path alone is enough */ }
  return { path: uniquePath, url }
}

const MAX_IMAGE_BYTES = 8 * 1024 * 1024
const MAX_VIDEO_BYTES = 40 * 1024 * 1024

export default function OnboardScreen({ user, showToast, setScreen, setProfile }) {
  const [step,    setStep]    = useState(0)
  const [saving,  setSaving]  = useState(false)

  // Step 0 — Personal
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [phone,    setPhone]    = useState(user?.phone?.replace('+91','') || '')
  const [city,     setCity]     = useState('')
  const [address,  setAddress]  = useState('')
  const [refCode,  setRefCode]  = useState('')

  // Step 1 — Skills
  const [skill,   setSkill]   = useState('')
  const [skills,  setSkills]  = useState([])

  // Step 2 — Pricing & UPI
  const [upiId,    setUpiId]    = useState('')
  const [priceMin, setPriceMin] = useState('200')

  // Step 3 — Identity verification (Aadhaar front + back + selfie video)
  const [aadharFront,   setAadharFront]   = useState(null)
  const [aadharBack,    setAadharBack]    = useState(null)
  const [selfieVideo,   setSelfieVideo]   = useState(null)
  const [aadhaarNumber, setAadhaarNumber] = useState('')

  // Step 4 — PAN (optional)
  const [panFront,  setPanFront]  = useState(null)
  const [panNumber, setPanNumber] = useState('')

  function nextStep() {
    if (step === 0) {
      if (!name.trim()) { showToast('Enter your name'); return }
      if (!city) { showToast('Select your city'); return }
    }
    if (step === 1) {
      if (!skill) { showToast('Select your primary skill'); return }
    }
    if (step === 2) {
      if (!upiId.includes('@')) { showToast('Enter valid UPI ID (e.g. name@paytm)'); return }
    }
    if (step === 3) {
      if (!aadharFront || !aadharBack) { showToast('Upload both sides of Aadhaar'); return }
      if (!selfieVideo) { showToast('Record or upload your selfie video'); return }
      if (!aadhaarNumber.trim()) { showToast('Enter Aadhaar number'); return }
    }
    if (step < 4) setStep(s => s + 1)
    else finish()
  }

  async function finish() {
    setSaving(true)
    const uid = user.id

    const [front, back, selfie, pan] = await Promise.all([
      uploadDoc(uid, aadharFront, 'aadhaar-front.jpg'),
      uploadDoc(uid, aadharBack,  'aadhaar-back.jpg'),
      uploadDoc(uid, selfieVideo, 'selfie-video.mp4'),
      uploadDoc(uid, panFront,    'pan-front.jpg'),
    ])
    if (aadharFront && !front)  { showToast('Aadhaar front upload failed — please retry'); setSaving(false); return }
    if (aadharBack  && !back)   { showToast('Aadhaar back upload failed — please retry');  setSaving(false); return }
    if (selfieVideo && !selfie) { showToast('Selfie video upload failed — please retry');   setSaving(false); return }
    const now = new Date().toISOString()

    const payload = {
      id: uid,
      name: name.trim(),
      email: email.trim() || null,
      phone: phone || user?.phone,
      city,
      address: address.trim() || null,
      skill,
      skills: skills.length ? skills : [skill],
      upi_id: upiId.trim(),
      price_min: Number(priceMin) || 200,
      referral_code: refCode.trim() || null,
      aadhar_submitted: true,
      aadhaar_front_path: front?.path || null,
      aadhaar_back_path:  back?.path  || null,
      selfie_video_path:  selfie?.path || null,
      aadhar_front_url:  front?.url  || null,
      aadhar_back_url:   back?.url   || null,
      aadhaar_front_url: front?.url  || null,
      aadhaar_back_url:  back?.url   || null,
      selfie_video_url:  selfie?.url || null,
      aadhaar_front_submitted_at: front  ? now : null,
      aadhaar_back_submitted_at:  back   ? now : null,
      selfie_video_submitted_at:  selfie ? now : null,
      verification_submitted_at:  now,
      aadhaar_number: aadhaarNumber.trim(),
      pan_submitted: !!pan,
      pan_front_url: pan?.url || null,
      pan_number: panNumber.trim() || null,
      onboarding_done: true,
      // 'submitted' = documents are in and waiting on an admin. The insert
      // trigger forces 'pending' on create, so this is set right after.
      kyc_status: 'pending',
      account_status: 'active',
      is_online: false,
      rating: 5.0,
      total_jobs: 0,
      wallet_balance: 0,
      trust_score: 100,
      service_radius_km: 10,
      working_hours_start: '08:00',
      working_hours_end: '20:00',
    }

    const { data, error } = await sb.from('workers').upsert(payload).select().single()
    if (error) { showToast('Registration failed: ' + error.message); setSaving(false); return }

    // Documents are on file → move into the admin review queue.
    let saved = data
    if (front && back && selfie) {
      const { data: q } = await sb.from('workers')
        .update({ kyc_status: 'submitted' }).eq('id', uid).select().single()
      if (q) saved = q
    }
    setProfile(saved)
    setScreen('main')
    showToast('Welcome to Kaam Ready! 🎉')
    setSaving(false)
  }

  const stepLabels = ['Personal', 'Skills', 'Pricing', 'Verification', 'PAN']
  const progress = ((step) / 4) * 100

  return (
    <div style={{ minHeight:'100dvh', display:'flex', flexDirection:'column', background:'#F4F5F6', overflowY:'auto', maxWidth:560, margin:'0 auto', width:'100%' }}>
      {/* Header */}
      <div style={{ background:'#FFFFFF', borderBottom:'1px solid #E9E9EB', padding:'20px 20px 18px', flexShrink:0 }}>
        <h1 style={{ fontSize:24, fontWeight:900, color:'#1A1A1A', marginBottom:4 }}>👷 Join Kaam Ready</h1>
        <p style={{ fontSize:13, color:'#9A9AA0' }}>Step {step+1} of 5 — {stepLabels[step]}</p>
        <div style={{ marginTop:12, background:'#EFEFF1', borderRadius:8, height:6 }}>
          <div style={{ background:Y, height:6, borderRadius:8, width:progress+'%', transition:'width .3s' }} />
        </div>
        <div style={{ display:'flex', gap:6, marginTop:8 }}>
          {stepLabels.map((l, i) => (
            <div key={l} style={{ flex:1, textAlign:'center', fontSize:9, fontWeight:700, color: i<=step ? '#B8900A' : '#C6C6C9', textTransform:'uppercase' }}>{l}</div>
          ))}
        </div>
      </div>

      <div style={{ flex:1, padding:'20px 20px 40px', display:'flex', flexDirection:'column', gap:14 }}>

        {/* Step 0 — Personal Details */}
        {step === 0 && (
          <>
            <div>
              <label style={lbl}>Full Name *</label>
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="Raju Kumar" style={inp} />
            </div>
            <div>
              <label style={lbl}>Email (Optional)</label>
              <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="raju@gmail.com" style={inp} />
            </div>
            <div>
              <label style={lbl}>Phone Number</label>
              <input value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,'').slice(0,10))} type="tel" placeholder="98765 43210" style={inp} />
            </div>
            <div>
              <label style={lbl}>City *</label>
              <select value={city} onChange={e=>setCity(e.target.value)} style={inp}>
                <option value="">Select your city</option>
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Home Address (Optional)</label>
              <input value={address} onChange={e=>setAddress(e.target.value)} placeholder="123, Main Street..." style={inp} />
            </div>
            <div>
              <label style={lbl}>Referral Code (Optional)</label>
              <input value={refCode} onChange={e=>setRefCode(e.target.value.toUpperCase())} placeholder="KAAM1234" style={inp} />
            </div>
          </>
        )}

        {/* Step 1 — Skills */}
        {step === 1 && (
          <>
            <p style={{ color:'#6B6B70', fontSize:13 }}>Select your primary skill and any additional skills.</p>
            <div>
              <label style={lbl}>Primary Skill *</label>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {SKILLS.map(s => (
                  <button key={s.id} onClick={() => setSkill(s.id)}
                    style={{ padding:'12px 8px', borderRadius:12, border:'1.5px solid '+(skill===s.id?Y:'#E9E9EB'),
                      background:skill===s.id?YL:'#FAFAFA', cursor:'pointer', fontFamily:'inherit',
                      fontSize:13, fontWeight:700, color:skill===s.id?'#1A1A1A':'#6B6B70', display:'flex', alignItems:'center', gap:6, justifyContent:'center' }}>
                    {s.ico} {s.lbl}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={lbl}>Additional Skills</label>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                {SKILLS.filter(s => s.id !== skill).map(s => (
                  <button key={s.id} onClick={() => setSkills(prev => prev.includes(s.id) ? prev.filter(x=>x!==s.id) : [...prev,s.id])}
                    style={{ padding:'8px 14px', borderRadius:20, border:'1.5px solid '+(skills.includes(s.id)?Y:'#E9E9EB'),
                      background:skills.includes(s.id)?YL:'#FAFAFA', cursor:'pointer', fontFamily:'inherit',
                      fontSize:12, fontWeight:600, color:skills.includes(s.id)?'#1A1A1A':'#6B6B70' }}>
                    {s.ico} {s.lbl}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Step 2 — Pricing & UPI */}
        {step === 2 && (
          <>
            <div>
              <label style={lbl}>UPI ID * (for receiving payments)</label>
              <input value={upiId} onChange={e=>setUpiId(e.target.value)} placeholder="yourname@paytm" style={inp} />
              <p style={{ fontSize:11, color:'#9A9AA0', marginTop:6 }}>Example: raju@paytm, raju@gpay, raju@ybl</p>
            </div>
            <div>
              <label style={lbl}>Minimum Price per Job (₹)</label>
              <input value={priceMin} onChange={e=>setPriceMin(e.target.value.replace(/\D/g,''))} type="number" placeholder="200" style={inp} />
            </div>
            <div style={{ background:'#FAFAFA', borderRadius:12, padding:'12px 14px', border:'1px solid #E9E9EB' }}>
              <p style={{ color:'#9A9AA0', fontSize:12, lineHeight:1.6 }}>
                💡 Kaam Ready takes 10% commission on each job. You keep 90% of every booking.
              </p>
            </div>
          </>
        )}

        {/* Step 3 — Aadhaar KYC */}
        {step === 3 && (
          <>
            <div style={{ background:'#E7F7EE', borderRadius:12, padding:'12px 14px', border:'1px solid #0FA958' }}>
              <p style={{ color:'#0FA958', fontSize:12, lineHeight:1.6 }}>
                🔒 Identity verification is required before you can be assigned jobs or receive payments.
                Upload both sides of your Aadhaar and a short selfie video. Your documents are stored
                privately and are only ever seen by KaamReady admins — never by customers or other workers.
              </p>
              <p style={{ color:'#0B6B39', fontSize:11, lineHeight:1.6, marginTop:8 }}>
                📋 <strong>Data Storage Notice:</strong> We store your Aadhaar and PAN documents securely on encrypted servers. By uploading, you consent to our KYC policy — your ID documents are used solely for identity verification and payment compliance (Income Tax Act, 1961). We never share your documents with third parties without your consent.
              </p>
            </div>
            {[
              ['Aadhaar Card — Front Side *', aadharFront, setAadharFront, 'image/*', 'environment', MAX_IMAGE_BYTES, 'photo under 8 MB'],
              ['Aadhaar Card — Back Side *',  aadharBack,  setAadharBack,  'image/*', 'environment', MAX_IMAGE_BYTES, 'photo under 8 MB'],
              ['Selfie Video *',              selfieVideo, setSelfieVideo, 'video/*', 'user',        MAX_VIDEO_BYTES, 'video under 40 MB'],
            ].map(([label, val, set, accept, cap, max, limitHint]) => (
              <div key={label}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                  <label style={{ ...lbl, marginBottom:0 }}>{label}</label>
                  <span style={{ fontSize:10, fontWeight:800, padding:'3px 8px', borderRadius:6,
                    background: val ? '#E7F7EE' : '#F1F1F3', color: val ? '#0FA958' : '#9A9AA0' }}>
                    {val ? 'SUBMITTED' : 'NOT SUBMITTED'}
                  </span>
                </div>
                <input type="file" accept={accept} capture={cap}
                  onChange={e => {
                    const f = e.target.files?.[0]
                    if (!f) return
                    if (f.size > max) { showToast(`That file is too large — please use a ${limitHint}`); e.target.value=''; return }
                    set(f)
                  }}
                  style={{ color:'#6B6B70', fontSize:13, width:'100%' }} />
                {val && <p style={{ fontSize:11, color:'#0FA958', marginTop:4 }}>✓ {val.name}</p>}
              </div>
            ))}
            <div style={{ background:'#FFF4E0', borderRadius:12, padding:'11px 13px', border:'1px solid #F59E0B' }}>
              <p style={{ color:'#92400E', fontSize:11.5, lineHeight:1.6 }}>
                🎥 <strong>Selfie video:</strong> hold your phone at arm's length, look at the camera and
                say your full name. About ten seconds is enough. Good light, no cap or sunglasses —
                the admin compares this against your Aadhaar photo.
              </p>
            </div>
            <div>
              <label style={lbl}>Aadhaar Number *</label>
              <input value={aadhaarNumber} onChange={e=>setAadhaarNumber(e.target.value.replace(/\D/g,'').slice(0,12))} placeholder="XXXX XXXX XXXX" style={inp} />
            </div>
          </>
        )}

        {/* Step 4 — PAN (optional) */}
        {step === 4 && (
          <>
            <div style={{ background:'#E8F0FE', borderRadius:12, padding:'12px 14px', border:'1px solid #6366f1' }}>
              <p style={{ color:'#2563EB', fontSize:12, lineHeight:1.6 }}>
                📄 PAN card is optional but required for earnings above ₹50,000/year for tax purposes.
              </p>
            </div>
            <div>
              <label style={lbl}>PAN Card Photo (Optional)</label>
              <input type="file" accept="image/*" onChange={e=>setPanFront(e.target.files[0])}
                style={{ color:'#6B6B70', fontSize:13, width:'100%' }} />
              {panFront && <p style={{ fontSize:11, color:'#0FA958', marginTop:4 }}>✓ {panFront.name}</p>}
            </div>
            <div>
              <label style={lbl}>PAN Number (Optional)</label>
              <input value={panNumber} onChange={e=>setPanNumber(e.target.value.toUpperCase().slice(0,10))} placeholder="ABCDE1234F" style={inp} />
            </div>
          </>
        )}

        {/* Navigation buttons */}
        <div style={{ display:'flex', gap:10, marginTop:8 }}>
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)}
              style={{ flex:1, background:'#FFFFFF', border:'1.5px solid #E9E9EB', borderRadius:14, padding:15, fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:'inherit', color:'#1A1A1A' }}>
              ← Back
            </button>
          )}
          {step === 4 && (
            <button onClick={() => finish()}
              style={{ background:'transparent', border:'1.5px solid #9A9AA0', borderRadius:14, padding:'15px 20px', fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:'#6B6B70' }}>
              Skip PAN
            </button>
          )}
          <button onClick={nextStep} disabled={saving}
            style={{ flex:2, background:Y, border:'none', borderRadius:14, padding:15, fontSize:15, fontWeight:800, cursor:'pointer', fontFamily:'inherit', opacity:saving?0.6:1 }}>
            {saving ? 'Submitting...' : step === 4 ? 'Complete Registration ✓' : 'Continue →'}
          </button>
        </div>
      </div>
    </div>
  )
}
