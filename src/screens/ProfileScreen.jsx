import { useState } from 'react'
import { sb } from '../lib/supabase'
import AvatarUpload from '../components/AvatarUpload'

const Y='#F5C000', YD='#B8900A', YL='#FFF8D6', BK='#1C1C1E', GREEN='#22c55e'

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.85)', zIndex:999, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
      <div style={{ background:'#1a1a1a', borderRadius:'24px 24px 0 0', width:'100%', maxWidth:430, padding:'20px 20px 40px', maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <p style={{ fontWeight:800, fontSize:17, color:'#fff' }}>{title}</p>
          <button onClick={onClose} style={{ background:'#2a2a2a', border:'none', borderRadius:10, padding:'6px 14px', cursor:'pointer', fontFamily:'inherit', fontWeight:600, color:'#fff' }}>Close</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type='text', placeholder='' }) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ fontSize:11, fontWeight:700, color:'#636366', display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:.5 }}>{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} type={type} placeholder={placeholder}
        style={{ width:'100%', background:'#111', border:'1.5px solid #2a2a2a', borderRadius:12, padding:12, fontSize:14, outline:'none', fontFamily:'inherit', color:'#fff', boxSizing:'border-box' }} />
    </div>
  )
}

export default function ProfileScreen({ user, profile, showToast, reloadProfile }) {
  const [modal,       setModal]       = useState(null)
  const [signingOut,  setSigningOut]  = useState(false)

  // Contact modal state
  const [contEmail,    setContEmail]    = useState(profile?.email || '')
  const [contAltPhone, setContAltPhone] = useState(profile?.alternate_phone || '')
  const [contAddress,  setContAddress]  = useState(profile?.address || '')
  const [contSaving,   setContSaving]   = useState(false)

  // KYC modal state
  const [aadharFront,   setAadharFront]   = useState(null)
  const [aadharBack,    setAadharBack]    = useState(null)
  const [panFront,      setPanFront]      = useState(null)
  const [aadhaarNumber, setAadhaarNumber] = useState(profile?.aadhaar_number || '')
  const [panNumber,     setPanNumber]     = useState(profile?.pan_number || '')
  const [kycSaving,     setKycSaving]     = useState(false)

  // Bank modal state
  const [upiId,      setUpiId]      = useState(profile?.upi_id || '')
  const [bankAcc,    setBankAcc]    = useState(profile?.bank_account || '')
  const [bankIfsc,   setBankIfsc]   = useState(profile?.bank_ifsc || '')
  const [bankName,   setBankName]   = useState(profile?.bank_name || '')
  const [bankSaving, setBankSaving] = useState(false)

  async function saveContact() {
    setContSaving(true)
    const { error } = await sb.from('workers').update({
      email: contEmail.trim() || null,
      alternate_phone: contAltPhone.replace(/\D/g,'').slice(0,10) || null,
      address: contAddress.trim() || null,
    }).eq('id', user.id)
    if (error) showToast('Save failed')
    else { showToast('Contact info saved ✓'); reloadProfile?.(); setModal(null) }
    setContSaving(false)
  }

  async function uploadDoc(file, path) {
    const { data, error } = await sb.storage.from('kyc').upload(`${user.id}/${path}`, file, { upsert:true })
    if (error) return null
    const { data: { publicUrl } } = sb.storage.from('kyc').getPublicUrl(`${user.id}/${path}`)
    return publicUrl
  }

  async function saveKYC() {
    if (!aadharFront || !aadharBack) { showToast('Upload both Aadhaar sides'); return }
    if (!aadhaarNumber.trim()) { showToast('Enter Aadhaar number'); return }
    setKycSaving(true)
    const [frontUrl, backUrl, panUrl] = await Promise.all([
      uploadDoc(aadharFront, 'aadhaar-front.jpg'),
      uploadDoc(aadharBack, 'aadhaar-back.jpg'),
      panFront ? uploadDoc(panFront, 'pan-front.jpg') : Promise.resolve(null),
    ])
    const updates = {
      aadhar_submitted: true,
      aadhar_front_url: frontUrl,
      aadhar_back_url: backUrl,
      aadhaar_number: aadhaarNumber.trim(),
    }
    if (panUrl) {
      updates.pan_submitted = true
      updates.pan_front_url = panUrl
      updates.pan_number = panNumber.trim()
    }
    const { error } = await sb.from('workers').update(updates).eq('id', user.id)
    if (error) showToast('KYC save failed')
    else { showToast('KYC submitted ✓'); reloadProfile?.(); setModal(null) }
    setKycSaving(false)
  }

  async function saveBank() {
    if (!upiId.includes('@')) { showToast('Enter valid UPI ID'); return }
    setBankSaving(true)
    const { error } = await sb.from('workers').update({
      upi_id: upiId.trim(),
      bank_account: bankAcc.trim() || null,
      bank_ifsc: bankIfsc.trim() || null,
      bank_name: bankName.trim() || null,
    }).eq('id', user.id)
    if (error) showToast('Save failed')
    else { showToast('Payment info saved ✓'); reloadProfile?.(); setModal(null) }
    setBankSaving(false)
  }

  async function signOut() {
    setSigningOut(true)
    try { await sb.auth.signOut() }
    catch { showToast('Sign out failed'); setSigningOut(false) }
  }

  const menus = [
    { ico:'📞', label:'Contact Info',      bg:'#1a3a1a', action:() => setModal('contact') },
    { ico:'🛡️', label:'KYC Documents',     bg:'#1a1a3a', action:() => setModal('kyc') },
    { ico:'💳', label:'Payment & Bank',    bg:'#1a1a1a', action:() => setModal('bank') },
    { ico:'🏆', label:'Achievements',      bg:'#2d1a00', action:() => showToast('Coming soon!') },
    { ico:'⭐', label:'My Ratings',        bg:'#2d1a00', action:() => showToast('Coming soon!') },
    { ico:'❓', label:'Help & Support',    bg:'#1a1a1a', action:() => showToast('Call us: 1800-XXX-XXXX') },
  ]

  return (
    <div style={{ flex:1, overflowY:'auto', padding:16, display:'flex', flexDirection:'column', gap:12 }}>

      {/* Contact Modal */}
      {modal === 'contact' && (
        <Modal title="📞 Contact Info" onClose={() => setModal(null)}>
          <Field label="Email Address" value={contEmail} onChange={setContEmail} type="email" placeholder="you@gmail.com" />
          <Field label="Alternate Phone" value={contAltPhone} onChange={v => setContAltPhone(v.replace(/\D/g,'').slice(0,10))} type="tel" placeholder="98765 43210" />
          <Field label="Home Address" value={contAddress} onChange={setContAddress} placeholder="123, MG Road, Bengaluru" />
          <button onClick={saveContact} disabled={contSaving}
            style={{ width:'100%', background:Y, border:'none', borderRadius:14, padding:15, fontSize:15, fontWeight:800, cursor:'pointer', fontFamily:'inherit', opacity:contSaving?0.6:1 }}>
            {contSaving ? 'Saving...' : 'Save Contact Info ✓'}
          </button>
        </Modal>
      )}

      {/* KYC Modal */}
      {modal === 'kyc' && (
        <Modal title="🛡️ KYC Documents" onClose={() => setModal(null)}>
          {profile?.aadhar_verified && (
            <div style={{ background:'#052e16', borderRadius:10, padding:'10px 14px', marginBottom:14, border:'1px solid #16a34a' }}>
              <p style={{ color:'#4ade80', fontWeight:700, fontSize:13 }}>✅ Aadhaar Verified</p>
            </div>
          )}
          <p style={{ color:Y, fontWeight:700, fontSize:13, marginBottom:10 }}>Aadhaar Card *</p>
          {[['Front Side', aadharFront, setAadharFront], ['Back Side', aadharBack, setAadharBack]].map(([lbl, val, set]) => (
            <div key={lbl} style={{ marginBottom:12 }}>
              <label style={{ fontSize:11, fontWeight:700, color:'#636366', display:'block', marginBottom:6, textTransform:'uppercase' }}>{lbl}</label>
              <input type="file" accept="image/*" onChange={e => set(e.target.files[0])}
                style={{ width:'100%', color:'#aaa', fontSize:13 }} />
              {val && <p style={{ fontSize:11, color:GREEN, marginTop:4 }}>✓ {val.name}</p>}
            </div>
          ))}
          <Field label="Aadhaar Number" value={aadhaarNumber} onChange={setAadhaarNumber} placeholder="XXXX XXXX XXXX" />

          <p style={{ color:Y, fontWeight:700, fontSize:13, marginBottom:10, marginTop:6 }}>PAN Card (Optional)</p>
          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:11, fontWeight:700, color:'#636366', display:'block', marginBottom:6, textTransform:'uppercase' }}>PAN Photo</label>
            <input type="file" accept="image/*" onChange={e => setPanFront(e.target.files[0])}
              style={{ width:'100%', color:'#aaa', fontSize:13 }} />
            {panFront && <p style={{ fontSize:11, color:GREEN, marginTop:4 }}>✓ {panFront.name}</p>}
          </div>
          <Field label="PAN Number" value={panNumber} onChange={setPanNumber} placeholder="ABCDE1234F" />

          <button onClick={saveKYC} disabled={kycSaving}
            style={{ width:'100%', background:Y, border:'none', borderRadius:14, padding:15, fontSize:15, fontWeight:800, cursor:'pointer', fontFamily:'inherit', opacity:kycSaving?0.6:1 }}>
            {kycSaving ? 'Uploading...' : 'Submit KYC ✓'}
          </button>
        </Modal>
      )}

      {/* Bank Modal */}
      {modal === 'bank' && (
        <Modal title="💳 Payment & Bank Info" onClose={() => setModal(null)}>
          <Field label="UPI ID *" value={upiId} onChange={setUpiId} placeholder="yourname@upi" />
          <Field label="Bank Account Number" value={bankAcc} onChange={setBankAcc} placeholder="XXXXXXXXXX" />
          <Field label="IFSC Code" value={bankIfsc} onChange={v => setBankIfsc(v.toUpperCase())} placeholder="HDFC0001234" />
          <Field label="Bank Name" value={bankName} onChange={setBankName} placeholder="HDFC Bank" />
          <button onClick={saveBank} disabled={bankSaving}
            style={{ width:'100%', background:Y, border:'none', borderRadius:14, padding:15, fontSize:15, fontWeight:800, cursor:'pointer', fontFamily:'inherit', opacity:bankSaving?0.6:1 }}>
            {bankSaving ? 'Saving...' : 'Save Payment Info ✓'}
          </button>
        </Modal>
      )}

      {/* Profile Header */}
      <div style={{ background:'#1a1a1a', borderRadius:20, padding:20, border:'1px solid #2a2a2a', textAlign:'center' }}>
        <AvatarUpload userId={user?.id} currentUrl={profile?.avatar_url} table="workers" onUploaded={() => reloadProfile?.()} />
        <p style={{ fontWeight:800, fontSize:18, color:'#fff', marginTop:10 }}>{profile?.name || 'Worker'}</p>
        <p style={{ fontSize:13, color:'#555', marginTop:3 }}>{profile?.skill || 'Skilled Worker'} • {profile?.city || 'Karnataka'}</p>
        {profile?.phone && <p style={{ fontSize:13, color:'#444', marginTop:2 }}>{profile.phone}</p>}
        {profile?.email && <p style={{ fontSize:12, color:'#444', marginTop:1 }}>{profile.email}</p>}

        <div style={{ display:'flex', gap:8, justifyContent:'center', marginTop:14, flexWrap:'wrap' }}>
          <span style={{ background:YL, color:YD, fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:8 }}>
            ⭐ {profile?.rating || 5.0} Rating
          </span>
          <span style={{ background:'#1a2e1a', color:GREEN, fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:8 }}>
            {profile?.total_jobs || 0} Jobs
          </span>
          <span style={{ background: profile?.is_online ? '#1a2e1a' : '#2a2a2a', color: profile?.is_online ? GREEN : '#555', fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:8 }}>
            {profile?.is_online ? '🟢 Online' : '⚫ Offline'}
          </span>
        </div>

        {/* KYC warning */}
        {!profile?.aadhar_submitted && (
          <div style={{ background:'#2d1a00', borderRadius:10, padding:'10px 14px', marginTop:14, border:'1px solid #f59e0b' }}
            onClick={() => setModal('kyc')}>
            <p style={{ color:'#f59e0b', fontWeight:700, fontSize:12 }}>⚠️ KYC pending — tap to submit Aadhaar</p>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
        {[['Wallet','₹'+(profile?.wallet_balance||0).toLocaleString('en-IN'),GREEN],
          ['Trust Score',(profile?.trust_score||100)+'%',Y],
          ['Credit','₹'+(profile?.credit_balance||0),('#60a5fa')]].map(([l,v,c]) => (
          <div key={l} style={{ background:'#1a1a1a', borderRadius:14, padding:'12px 10px', border:'1px solid #2a2a2a', textAlign:'center' }}>
            <p style={{ color:c, fontWeight:900, fontSize:16 }}>{v}</p>
            <p style={{ color:'#555', fontSize:10, marginTop:3 }}>{l}</p>
          </div>
        ))}
      </div>

      {/* Menu */}
      <div style={{ background:'#1a1a1a', borderRadius:20, border:'1px solid #2a2a2a', overflow:'hidden' }}>
        {menus.map(({ ico, label, bg, action }) => (
          <div key={label} onClick={action}
            style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', borderBottom:'1px solid #222', cursor:'pointer' }}>
            <div style={{ width:36, height:36, borderRadius:10, background:bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>{ico}</div>
            <span style={{ fontSize:15, fontWeight:500, flex:1, color:'#fff' }}>{label}</span>
            <span style={{ color:'#333', fontSize:18 }}>›</span>
          </div>
        ))}
      </div>

      <button onClick={signOut} disabled={signingOut}
        style={{ width:'100%', background:'transparent', border:'1.5px solid #dc2626', borderRadius:14, padding:15, color:'#ef4444', fontWeight:700, fontSize:15, cursor:'pointer', fontFamily:'inherit', opacity:signingOut?0.6:1 }}>
        {signingOut ? 'Signing out...' : '🚪 Sign Out'}
      </button>
      <p style={{ textAlign:'center', fontSize:11, color:'#333', paddingBottom:8 }}>Kaam Ready v2.0 — Karnataka 🇮🇳</p>
    </div>
  )
}
