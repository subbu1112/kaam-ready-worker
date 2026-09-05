import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'
import AvatarUpload from '../components/AvatarUpload'
import { loadSettings, SETTINGS_DEFAULTS } from '../lib/settings'
import { getLang, setLang, LANGS, t } from '../i18n'
import VerificationPanel from '../components/VerificationPanel'
import { isFullyVerified, allDocsSubmitted, KYC_STATUS_LABEL } from '../lib/kyc'

const Y='#F5C000', YD='#B8900A', YL='#FFF7DA', BK='#1A1A1A', GREEN='#0FA958'

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(16,24,40,.45)', zIndex:999, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
      <div style={{ background:'#FFFFFF', borderRadius:'24px 24px 0 0', width:'100%', maxWidth:430, padding:'20px 20px 40px', maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <p style={{ fontWeight:800, fontSize:17, color:'#1A1A1A' }}>{title}</p>
          <button onClick={onClose} style={{ background:'#E9E9EB', border:'none', borderRadius:10, padding:'6px 14px', cursor:'pointer', fontFamily:'inherit', fontWeight:600, color:'#1A1A1A' }}>Close</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type='text', placeholder='' }) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ fontSize:11, fontWeight:700, color:'#6B6B70', display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:.5 }}>{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} type={type} placeholder={placeholder}
        style={{ width:'100%', background:'#F4F5F6', border:'1.5px solid #E9E9EB', borderRadius:12, padding:12, fontSize:14, outline:'none', fontFamily:'inherit', color:'#1A1A1A', boxSizing:'border-box' }} />
    </div>
  )
}

export default function ProfileScreen({ user, profile, showToast, reloadProfile, setTab }) {
  const [modal,       setModal]       = useState(null)
  const [signingOut,  setSigningOut]  = useState(false)
  const [ratings,        setRatings]        = useState([])
  const [ratingsLoading, setRatingsLoading] = useState(false)
  const [cfg, setCfg] = useState(SETTINGS_DEFAULTS)
  const [lang, setLangState] = useState(getLang())

  function changeLang(code) {
    setLang(code); setLangState(code)
    showToast('Language updated')
    setTimeout(() => window.location.reload(), 400)
  }

  useEffect(() => { loadSettings().then(setCfg) }, [])
  const supTel = '+916362869636'
  const supWa  = '916362869636'
  const supMail= cfg.support_email || 'support@kaamready.in'

  async function loadRatings() {
    setRatingsLoading(true)
    const { data } = await sb.from('bookings')
      .select('rating,review,customer_name,service,completed_at,created_at')
      .eq('worker_id', user.id)
      .not('rating', 'is', null)
      .order('completed_at', { ascending: false, nullsFirst: false })
    setRatings(data || [])
    setRatingsLoading(false)
  }

  // Contact modal state
  const [contEmail,    setContEmail]    = useState(profile?.email || '')
  const [contAltPhone, setContAltPhone] = useState(profile?.alternate_phone || '')
  const [contAddress,  setContAddress]  = useState(profile?.address || '')
  const [contSaving,   setContSaving]   = useState(false)

  // Verification modal state. Document uploads live in VerificationPanel; only
  // the ID numbers are edited here.
  const [panFront,      setPanFront]      = useState(null)
  const [aadhaarNumber, setAadhaarNumber] = useState(profile?.aadhaar_number || '')
  const [panNumber,     setPanNumber]     = useState(profile?.pan_number || '')
  const [kycSaving,     setKycSaving]     = useState(false)
  const [kycLocal,      setKycLocal]      = useState({})   // optimistic doc state

  // Bank modal state
  const [upiId,        setUpiId]        = useState(profile?.upi_id || '')
  const [bankAcc,      setBankAcc]      = useState(profile?.bank_account || '')
  const [bankIfsc,     setBankIfsc]     = useState(profile?.bank_ifsc || '')
  const [bankName,     setBankName]     = useState(profile?.bank_name || '')
  const [payoutMethod, setPayoutMethod] = useState(profile?.payout_method || 'upi')
  const [bankSaving,   setBankSaving]   = useState(false)

  const PAYOUT_OPTIONS = [
    { code:'upi',  ico:'📱', label:'UPI' },
    { code:'bank', ico:'🏦', label:'Bank Transfer' },
    { code:'cash', ico:'💵', label:'Cash' },
  ]

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

  // The kyc bucket is private, so a public URL would simply 404 for the admin.
  // Store the path and hand out a signed URL for legacy readers.
  async function uploadDoc(file, name) {
    const uniquePath = `${user.id}/${Date.now()}-${name}`
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

  async function saveKYC() {
    if (!aadhaarNumber.trim()) { showToast('Enter Aadhaar number'); return }
    setKycSaving(true)
    const updates = { aadhaar_number: aadhaarNumber.trim() }
    if (panFront) {
      const pan = await uploadDoc(panFront, 'pan-front.jpg')
      if (pan) {
        updates.pan_submitted = true
        updates.pan_front_url = pan.url
        updates.pan_number = panNumber.trim() || null
      } else { showToast('PAN upload failed'); setKycSaving(false); return }
    } else if (panNumber.trim()) {
      updates.pan_number = panNumber.trim()
    }
    const { error } = await sb.from('workers').update(updates).eq('id', user.id)
    if (error) showToast('Save failed: ' + error.message)
    else { showToast('Details saved ✓'); reloadProfile?.(); setModal(null) }
    setKycSaving(false)
  }

  async function saveBank() {
    if (payoutMethod === 'upi' && !upiId.includes('@')) { showToast('Enter valid UPI ID'); return }
    if (payoutMethod === 'bank' && (!bankAcc.trim() || !bankIfsc.trim())) { showToast('Enter bank account & IFSC'); return }
    setBankSaving(true)
    const { error } = await sb.from('workers').update({
      payout_method: payoutMethod,
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
    { ico:'👛', label:'Wallet & Withdrawals', bg:'#F1F1F3', action:() => setTab && setTab('wallet') },
    { ico:'🔔', label:'Notifications',      bg:'#F1F1F3', action:() => setTab && setTab('notifications') },
    { ico:'🏆', label:'Rewards & Tiers',    bg:'#FFF7DA', action:() => setTab && setTab('rewards') },
    { ico:'📞', label:'Contact Info',      bg:'#E7F7EE', action:() => setModal('contact') },
    { ico:'🛡️', label:'Identity Verification',     bg:'#E8F0FE', action:() => setModal('kyc') },
    { ico:'💳', label:'Payment & Bank',    bg:'#F1F1F3', action:() => setModal('bank') },
    { ico:'⚙️', label:'Settings',          bg:'#F1F1F3', action:() => setTab && setTab('settings') },
    { ico:'⭐', label:'My Ratings',        bg:'#FFF7DA', action:() => { setModal('ratings'); loadRatings() } },
    { ico:'❓', label:'Help & Support',    bg:'#F1F1F3', action:() => setModal('help') },
  ]

  return (
    <div style={{ flex:1, minHeight:0, position:'relative' }}>
    <div style={{ position:'absolute', inset:0, overflowY:'auto', WebkitOverflowScrolling:'touch', padding:16, display:'flex', flexDirection:'column', gap:12 }}>

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

      {/* Identity verification modal */}
      {modal === 'kyc' && (
        <Modal title="🛡️ Identity Verification" onClose={() => { setModal(null); reloadProfile?.() }}>
          <VerificationPanel
            worker={{ ...(profile || {}), ...kycLocal, id: user?.id }}
            showToast={showToast}
            onChange={patch => setKycLocal(prev => ({ ...prev, ...patch }))}
            compact />

          <div style={{ height:16 }} />
          <Field label="Aadhaar Number" value={aadhaarNumber} onChange={setAadhaarNumber} placeholder="XXXX XXXX XXXX" />

          <p style={{ color:'#1A1A1A', fontWeight:700, fontSize:13, marginBottom:10, marginTop:6 }}>PAN Card (Optional)</p>
          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:11, fontWeight:700, color:'#6B6B70', display:'block', marginBottom:6, textTransform:'uppercase' }}>PAN Photo</label>
            <input type="file" accept="image/*" onChange={e => setPanFront(e.target.files[0])}
              style={{ width:'100%', color:'#6B6B70', fontSize:13 }} />
            {panFront && <p style={{ fontSize:11, color:GREEN, marginTop:4 }}>✓ {panFront.name}</p>}
          </div>
          <Field label="PAN Number" value={panNumber} onChange={setPanNumber} placeholder="ABCDE1234F" />

          <button onClick={saveKYC} disabled={kycSaving}
            style={{ width:'100%', background:Y, border:'none', borderRadius:14, padding:15, fontSize:15, fontWeight:800, cursor:'pointer', fontFamily:'inherit', opacity:kycSaving?0.6:1 }}>
            {kycSaving ? 'Saving...' : 'Save ID details ✓'}
          </button>
        </Modal>
      )}

      {/* Bank Modal */}
      {modal === 'bank' && (
        <Modal title="💳 Payment & Bank Info" onClose={() => setModal(null)}>
          <label style={{ fontSize:11, fontWeight:700, color:'#6B6B70', display:'block', marginBottom:8, textTransform:'uppercase', letterSpacing:.5 }}>Preferred Payout Method *</label>
          <div style={{ display:'flex', gap:8, marginBottom:18 }}>
            {PAYOUT_OPTIONS.map(o => (
              <button key={o.code} onClick={() => setPayoutMethod(o.code)}
                style={{ flex:1, padding:'12px 4px', borderRadius:12, border:'1.5px solid '+(payoutMethod===o.code?Y:'#E9E9EB'),
                  background:payoutMethod===o.code?YL:'#F4F5F6', color:payoutMethod===o.code?BK:'#6B6B70',
                  fontWeight:700, fontSize:12, cursor:'pointer', fontFamily:'inherit', display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                <span style={{ fontSize:20 }}>{o.ico}</span>{o.label}
              </button>
            ))}
          </div>

          {payoutMethod === 'upi' && (
            <Field label="UPI ID *" value={upiId} onChange={setUpiId} placeholder="yourname@upi" />
          )}
          {payoutMethod === 'bank' && (<>
            <Field label="Bank Account Number *" value={bankAcc} onChange={setBankAcc} placeholder="XXXXXXXXXX" />
            <Field label="IFSC Code *" value={bankIfsc} onChange={v => setBankIfsc(v.toUpperCase())} placeholder="HDFC0001234" />
            <Field label="Bank Name" value={bankName} onChange={setBankName} placeholder="HDFC Bank" />
          </>)}
          {payoutMethod === 'cash' && (
            <p style={{ color:'#6B6B70', fontSize:13, background:'#F4F5F6', border:'1px solid #E9E9EB', borderRadius:12, padding:'12px 14px', marginBottom:14 }}>
              💵 You'll collect your earnings in cash. No bank details needed.
            </p>
          )}

          <button onClick={saveBank} disabled={bankSaving}
            style={{ width:'100%', background:Y, border:'none', borderRadius:14, padding:15, fontSize:15, fontWeight:800, cursor:'pointer', fontFamily:'inherit', opacity:bankSaving?0.6:1 }}>
            {bankSaving ? 'Saving...' : 'Save Payment Info ✓'}
          </button>
        </Modal>
      )}

      {/* Help & Support Modal */}
      {modal === 'help' && (
        <Modal title="❓ Help & Support" onClose={() => setModal(null)}>
          <p style={{ color:'#6B6B70', fontSize:13, marginBottom:16 }}>Our team is available 8 AM – 10 PM, 7 days a week.</p>
          {[
            ['📞', 'Call Support', supTel, 'tel:' + supTel],
            ['💬', 'WhatsApp', 'Chat with our team', 'https://wa.me/' + supWa + '?text=Hi+Kaam+Ready+Worker+Support'],
            ['📧', 'Email', supMail, 'mailto:' + supMail],
          ].map(([ico, label, sub, href]) => (
            <a key={label} href={href} target="_blank" rel="noopener noreferrer"
              style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', background:'#F4F5F6', borderRadius:12, marginBottom:10, border:'1px solid #E9E9EB', textDecoration:'none' }}>
              <div style={{ width:40, height:40, borderRadius:12, background:'#E9E9EB', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>{ico}</div>
              <div style={{ flex:1 }}>
                <p style={{ fontWeight:700, fontSize:14, color:'#1A1A1A' }}>{label}</p>
                <p style={{ fontSize:12, color:'#6B6B70', marginTop:2 }}>{sub}</p>
              </div>
              <span style={{ color:'#9A9AA0', fontSize:18 }}>›</span>
            </a>
          ))}
        </Modal>
      )}

      {/* My Ratings Modal */}
      {modal === 'ratings' && (() => {
        const count = ratings.length
        const avg = count ? (ratings.reduce((a,r)=>a+(r.rating||0),0)/count) : (profile?.rating || 0)
        const dist = [5,4,3,2,1].map(s => ({ s, n: ratings.filter(r=>Math.round(r.rating)===s).length }))
        return (
          <Modal title="⭐ My Ratings" onClose={() => setModal(null)}>
            <div style={{ textAlign:'center', marginBottom:16 }}>
              <p style={{ fontSize:42, fontWeight:900, color:'#B8900A', lineHeight:1 }}>{avg.toFixed(1)}</p>
              <p style={{ fontSize:18, color:'#B8900A' }}>{'★'.repeat(Math.round(avg))}{'☆'.repeat(5-Math.round(avg))}</p>
              <p style={{ fontSize:12, color:'#6B6B70', marginTop:4 }}>{count} rating{count!==1?'s':''} from customers</p>
            </div>
            <div style={{ marginBottom:16 }}>
              {dist.map(({s,n}) => (
                <div key={s} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
                  <span style={{ fontSize:12, color:'#6B6B70', width:28 }}>{s}★</span>
                  <div style={{ flex:1, height:8, background:'#E9E9EB', borderRadius:4, overflow:'hidden' }}>
                    <div style={{ width:(count? (n/count*100):0)+'%', height:'100%', background:Y }} />
                  </div>
                  <span style={{ fontSize:12, color:'#6B6B70', width:24, textAlign:'right' }}>{n}</span>
                </div>
              ))}
            </div>
            <p style={{ color:'#1A1A1A', fontWeight:700, fontSize:13, marginBottom:10 }}>Recent Reviews</p>
            {ratingsLoading ? (
              <p style={{ color:'#6B6B70', fontSize:13, textAlign:'center', padding:20 }}>Loading…</p>
            ) : ratings.length === 0 ? (
              <p style={{ color:'#6B6B70', fontSize:13, textAlign:'center', padding:20 }}>No ratings yet. Complete jobs to earn reviews ⭐</p>
            ) : ratings.map((r,i) => (
              <div key={i} style={{ background:'#F4F5F6', borderRadius:12, padding:'12px 14px', marginBottom:8, border:'1px solid #E9E9EB' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ color:'#B8900A', fontSize:13 }}>{'★'.repeat(Math.round(r.rating))}{'☆'.repeat(5-Math.round(r.rating))}</span>
                  <span style={{ fontSize:11, color:'#9A9AA0' }}>{r.completed_at || r.created_at ? new Date(r.completed_at||r.created_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short'}) : ''}</span>
                </div>
                {r.review && <p style={{ color:'#3A3A3E', fontSize:13, marginTop:6 }}>"{r.review}"</p>}
                <p style={{ color:'#9A9AA0', fontSize:11, marginTop:6 }}>{r.customer_name || 'Customer'} · {r.service || ''}</p>
              </div>
            ))}
          </Modal>
        )
      })()}

      {/* Achievements Modal */}
      {modal === 'achievements' && (() => {
        const jobs = profile?.total_jobs || 0
        const rating = profile?.rating || 0
        const trust = profile?.trust_score ?? 100
        const badges = [
          { ico:'🎉', title:'First Job',      desc:'Complete your first job',        earned: jobs >= 1 },
          { ico:'🔟', title:'10 Jobs',        desc:'Complete 10 jobs',              earned: jobs >= 10 },
          { ico:'💪', title:'50 Jobs',        desc:'Complete 50 jobs',              earned: jobs >= 50 },
          { ico:'🏆', title:'Century',        desc:'Complete 100 jobs',             earned: jobs >= 100 },
          { ico:'⭐', title:'Top Rated',      desc:'Maintain a 4.5+ rating',        earned: rating >= 4.5 },
          { ico:'🛡️', title:'KYC Verified',   desc:'Complete Aadhaar verification', earned: !!(profile?.aadhar_verified || profile?.aadhaar_verified) },
          { ico:'🤝', title:'Trusted Pro',    desc:'Keep trust score above 90%',    earned: trust >= 90 },
          { ico:'💳', title:'Payout Ready',   desc:'Add your UPI / bank details',   earned: !!profile?.upi_id },
        ]
        const earnedCount = badges.filter(b=>b.earned).length
        return (
          <Modal title="🏆 Achievements" onClose={() => setModal(null)}>
            <div style={{ textAlign:'center', marginBottom:16 }}>
              <p style={{ fontSize:32, fontWeight:900, color:'#B8900A' }}>{earnedCount}/{badges.length}</p>
              <p style={{ fontSize:12, color:'#6B6B70' }}>badges earned</p>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {badges.map(b => (
                <div key={b.title} style={{ background: b.earned ? '#FFF7DA' : '#F4F5F6', borderRadius:14, padding:'14px 12px', border:'1px solid '+(b.earned?Y:'#E9E9EB'), textAlign:'center', opacity:b.earned?1:0.55 }}>
                  <div style={{ fontSize:30, marginBottom:6, filter: b.earned?'none':'grayscale(1)' }}>{b.ico}</div>
                  <p style={{ fontSize:13, fontWeight:800, color: b.earned?Y:'#6B6B70' }}>{b.title}</p>
                  <p style={{ fontSize:10, color:'#6B6B70', marginTop:3 }}>{b.desc}</p>
                  {b.earned && <p style={{ fontSize:10, color:GREEN, marginTop:6, fontWeight:700 }}>✓ Earned</p>}
                </div>
              ))}
            </div>
          </Modal>
        )
      })()}

      {/* Profile Header */}
      <div style={{ background:'#FFFFFF', borderRadius:20, padding:20, border:'1px solid #E9E9EB', textAlign:'center' }}>
        <AvatarUpload userId={user?.id} currentUrl={profile?.avatar_url} table="workers" onUploaded={() => reloadProfile?.()} />
        <p style={{ fontWeight:800, fontSize:18, color:'#1A1A1A', marginTop:10 }}>{profile?.name || 'Worker'}</p>
        <p style={{ fontSize:13, color:'#9A9AA0', marginTop:3 }}>{profile?.skill || 'Skilled Worker'} • {profile?.city || 'Karnataka'}</p>
        {profile?.phone && <p style={{ fontSize:13, color:'#9A9AA0', marginTop:2 }}>{profile.phone}</p>}
        {profile?.email && <p style={{ fontSize:12, color:'#9A9AA0', marginTop:1 }}>{profile.email}</p>}

        <div style={{ display:'flex', gap:8, justifyContent:'center', marginTop:14, flexWrap:'wrap' }}>
          <span style={{ background:YL, color:YD, fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:8 }}>
            ⭐ {profile?.rating || 5.0} Rating
          </span>
          <span style={{ background:'#E7F7EE', color:GREEN, fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:8 }}>
            {profile?.total_jobs || 0} Jobs
          </span>
          <span style={{ background: profile?.is_online ? '#E7F7EE' : '#E9E9EB', color: profile?.is_online ? GREEN : '#9A9AA0', fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:8 }}>
            {profile?.is_online ? '🟢 Online' : '⚫ Offline'}
          </span>
        </div>

        {/* Verification banner */}
        {(() => {
          const w = { ...(profile || {}), ...kycLocal }
          if (isFullyVerified(w)) {
            return (
              <div style={{ background:'#E7F7EE', borderRadius:10, padding:'10px 14px', marginTop:14, border:'1px solid '+GREEN }}>
                <p style={{ color:GREEN, fontWeight:700, fontSize:12 }}>✅ Verified — you can be assigned jobs</p>
              </div>
            )
          }
          const st = w.kyc_status || 'pending'
          const missing = !allDocsSubmitted(w)
          const msg = missing
            ? '⚠️ Verification incomplete — tap to upload Aadhaar & selfie video'
            : st === 'rejected'
              ? '✕ Verification rejected — tap to see why and resubmit'
              : st === 'resubmit_required'
                ? '↻ Admin asked you to resubmit — tap to fix'
                : '⏳ Documents submitted — waiting for admin approval'
          const tone = st === 'rejected' ? '#E5484D' : '#f59e0b'
          return (
            <div onClick={() => setModal('kyc')}
              style={{ background:'#FFF7DA', borderRadius:10, padding:'10px 14px', marginTop:14,
                border:'1px solid '+tone, cursor:'pointer' }}>
              <p style={{ color:tone, fontWeight:700, fontSize:12 }}>{msg}</p>
              {w.kyc_rejection_reason && (st === 'rejected' || st === 'resubmit_required') && (
                <p style={{ color:'#6B6B70', fontSize:11, marginTop:4 }}>{w.kyc_rejection_reason}</p>
              )}
            </div>
          )
        })()}
      </div>

      {/* Stats row */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
        {[['Wallet','₹'+(profile?.wallet_balance||0).toLocaleString('en-IN'),GREEN],
          ['Trust Score',(profile?.trust_score||100)+'%',Y],
          ['Credit','₹'+(profile?.credit_balance||0),('#2563EB')]].map(([l,v,c]) => (
          <div key={l} style={{ background:'#FFFFFF', borderRadius:14, padding:'12px 10px', border:'1px solid #E9E9EB', textAlign:'center' }}>
            <p style={{ color:c, fontWeight:900, fontSize:16 }}>{v}</p>
            <p style={{ color:'#9A9AA0', fontSize:10, marginTop:3 }}>{l}</p>
          </div>
        ))}
      </div>

      {/* Language */}
      <div style={{ background:'#FFFFFF', borderRadius:20, border:'1px solid #E9E9EB', padding:16 }}>
        <p style={{ color:'#1A1A1A', fontWeight:800, fontSize:14, marginBottom:12 }}>🌐 {t('Language')}</p>
        <div style={{ display:'flex', gap:8 }}>
          {LANGS.map(L => (
            <button key={L.code} onClick={() => changeLang(L.code)}
              style={{ flex:1, padding:'12px 0', borderRadius:12, border:'1.5px solid '+(lang===L.code?Y:'#E9E9EB'),
                background:lang===L.code?YL:'#F4F5F6', color:lang===L.code?BK:'#6B6B70', fontWeight:700, fontSize:13,
                cursor:'pointer', fontFamily:'inherit' }}>
              {L.label}
            </button>
          ))}
        </div>
      </div>

      {/* Menu */}
      <div style={{ background:'#FFFFFF', borderRadius:20, border:'1px solid #E9E9EB', overflow:'hidden' }}>
        {menus.map(({ ico, label, bg, action }) => (
          <div key={label} onClick={action}
            style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', borderBottom:'1px solid #F2F2F4', cursor:'pointer' }}>
            <div style={{ width:36, height:36, borderRadius:10, background:bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>{ico}</div>
            <span style={{ fontSize:15, fontWeight:500, flex:1, color:'#1A1A1A' }}>{label}</span>
            <span style={{ color:'#C6C6C9', fontSize:18 }}>›</span>
          </div>
        ))}
      </div>

      <button onClick={signOut} disabled={signingOut}
        style={{ width:'100%', background:'transparent', border:'1.5px solid #E5484D', borderRadius:14, padding:15, color:'#E5484D', fontWeight:700, fontSize:15, cursor:'pointer', fontFamily:'inherit', opacity:signingOut?0.6:1 }}>
        {signingOut ? 'Signing out...' : '🚪 Sign Out'}
      </button>
      <p style={{ textAlign:'center', fontSize:11, color:'#C6C6C9', paddingBottom:8 }}>Kaam Ready v2.0 — Karnataka 🇮🇳</p>
    </div>
    </div>
  )
}
