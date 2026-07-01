import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'
import AvatarUpload from '../components/AvatarUpload'
import { loadSettings, SETTINGS_DEFAULTS } from '../lib/settings'
import { getLang, setLang, LANGS, t } from '../i18n'

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

  // KYC modal state
  const [aadharFront,   setAadharFront]   = useState(null)
  const [aadharBack,    setAadharBack]    = useState(null)
  const [panFront,      setPanFront]      = useState(null)
  const [aadhaarNumber, setAadhaarNumber] = useState(profile?.aadhaar_number || '')
  const [panNumber,     setPanNumber]     = useState(profile?.pan_number || '')
  const [kycSaving,     setKycSaving]     = useState(false)

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
    { ico:'👛', label:'Wallet & Withdrawals', bg:'#1a1a1a', action:() => setTab && setTab('wallet') },
    { ico:'🔔', label:'Notifications',      bg:'#1a1a1a', action:() => setTab && setTab('notifications') },
    { ico:'🏆', label:'Rewards & Tiers',    bg:'#2d1a00', action:() => setTab && setTab('rewards') },
    { ico:'📞', label:'Contact Info',      bg:'#1a3a1a', action:() => setModal('contact') },
    { ico:'🛡️', label:'KYC Documents',     bg:'#1a1a3a', action:() => setModal('kyc') },
    { ico:'💳', label:'Payment & Bank',    bg:'#1a1a1a', action:() => setModal('bank') },
    { ico:'⚙️', label:'Settings',          bg:'#1a1a1a', action:() => setTab && setTab('settings') },
    { ico:'⭐', label:'My Ratings',        bg:'#2d1a00', action:() => { setModal('ratings'); loadRatings() } },
    { ico:'❓', label:'Help & Support',    bg:'#1a1a1a', action:() => setModal('help') },
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
          <label style={{ fontSize:11, fontWeight:700, color:'#636366', display:'block', marginBottom:8, textTransform:'uppercase', letterSpacing:.5 }}>Preferred Payout Method *</label>
          <div style={{ display:'flex', gap:8, marginBottom:18 }}>
            {PAYOUT_OPTIONS.map(o => (
              <button key={o.code} onClick={() => setPayoutMethod(o.code)}
                style={{ flex:1, padding:'12px 4px', borderRadius:12, border:'1.5px solid '+(payoutMethod===o.code?Y:'#2a2a2a'),
                  background:payoutMethod===o.code?YL:'#111', color:payoutMethod===o.code?BK:'#888',
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
            <p style={{ color:'#999', fontSize:13, background:'#111', border:'1px solid #2a2a2a', borderRadius:12, padding:'12px 14px', marginBottom:14 }}>
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
          <p style={{ color:'#999', fontSize:13, marginBottom:16 }}>Our team is available 8 AM – 10 PM, 7 days a week.</p>
          {[
            ['📞', 'Call Support', supTel, 'tel:' + supTel],
            ['💬', 'WhatsApp', 'Chat with our team', 'https://wa.me/' + supWa + '?text=Hi+Kaam+Ready+Worker+Support'],
            ['📧', 'Email', supMail, 'mailto:' + supMail],
          ].map(([ico, label, sub, href]) => (
            <a key={label} href={href} target="_blank" rel="noopener noreferrer"
              style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', background:'#111', borderRadius:12, marginBottom:10, border:'1px solid #2a2a2a', textDecoration:'none' }}>
              <div style={{ width:40, height:40, borderRadius:12, background:'#2a2a2a', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>{ico}</div>
              <div style={{ flex:1 }}>
                <p style={{ fontWeight:700, fontSize:14, color:'#fff' }}>{label}</p>
                <p style={{ fontSize:12, color:'#777', marginTop:2 }}>{sub}</p>
              </div>
              <span style={{ color:'#444', fontSize:18 }}>›</span>
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
              <p style={{ fontSize:42, fontWeight:900, color:Y, lineHeight:1 }}>{avg.toFixed(1)}</p>
              <p style={{ fontSize:18, color:Y }}>{'★'.repeat(Math.round(avg))}{'☆'.repeat(5-Math.round(avg))}</p>
              <p style={{ fontSize:12, color:'#777', marginTop:4 }}>{count} rating{count!==1?'s':''} from customers</p>
            </div>
            <div style={{ marginBottom:16 }}>
              {dist.map(({s,n}) => (
                <div key={s} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
                  <span style={{ fontSize:12, color:'#aaa', width:28 }}>{s}★</span>
                  <div style={{ flex:1, height:8, background:'#2a2a2a', borderRadius:4, overflow:'hidden' }}>
                    <div style={{ width:(count? (n/count*100):0)+'%', height:'100%', background:Y }} />
                  </div>
                  <span style={{ fontSize:12, color:'#777', width:24, textAlign:'right' }}>{n}</span>
                </div>
              ))}
            </div>
            <p style={{ color:Y, fontWeight:700, fontSize:13, marginBottom:10 }}>Recent Reviews</p>
            {ratingsLoading ? (
              <p style={{ color:'#777', fontSize:13, textAlign:'center', padding:20 }}>Loading…</p>
            ) : ratings.length === 0 ? (
              <p style={{ color:'#777', fontSize:13, textAlign:'center', padding:20 }}>No ratings yet. Complete jobs to earn reviews ⭐</p>
            ) : ratings.map((r,i) => (
              <div key={i} style={{ background:'#111', borderRadius:12, padding:'12px 14px', marginBottom:8, border:'1px solid #2a2a2a' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ color:Y, fontSize:13 }}>{'★'.repeat(Math.round(r.rating))}{'☆'.repeat(5-Math.round(r.rating))}</span>
                  <span style={{ fontSize:11, color:'#555' }}>{r.completed_at || r.created_at ? new Date(r.completed_at||r.created_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short'}) : ''}</span>
                </div>
                {r.review && <p style={{ color:'#ccc', fontSize:13, marginTop:6 }}>"{r.review}"</p>}
                <p style={{ color:'#555', fontSize:11, marginTop:6 }}>{r.customer_name || 'Customer'} · {r.service || ''}</p>
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
              <p style={{ fontSize:32, fontWeight:900, color:Y }}>{earnedCount}/{badges.length}</p>
              <p style={{ fontSize:12, color:'#777' }}>badges earned</p>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {badges.map(b => (
                <div key={b.title} style={{ background: b.earned ? '#2d2400' : '#141414', borderRadius:14, padding:'14px 12px', border:'1px solid '+(b.earned?Y:'#2a2a2a'), textAlign:'center', opacity:b.earned?1:0.55 }}>
                  <div style={{ fontSize:30, marginBottom:6, filter: b.earned?'none':'grayscale(1)' }}>{b.ico}</div>
                  <p style={{ fontSize:13, fontWeight:800, color: b.earned?Y:'#888' }}>{b.title}</p>
                  <p style={{ fontSize:10, color:'#666', marginTop:3 }}>{b.desc}</p>
                  {b.earned && <p style={{ fontSize:10, color:GREEN, marginTop:6, fontWeight:700 }}>✓ Earned</p>}
                </div>
              ))}
            </div>
          </Modal>
        )
      })()}

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

      {/* Language */}
      <div style={{ background:'#1a1a1a', borderRadius:20, border:'1px solid #2a2a2a', padding:16 }}>
        <p style={{ color:Y, fontWeight:800, fontSize:14, marginBottom:12 }}>🌐 {t('Language')}</p>
        <div style={{ display:'flex', gap:8 }}>
          {LANGS.map(L => (
            <button key={L.code} onClick={() => changeLang(L.code)}
              style={{ flex:1, padding:'12px 0', borderRadius:12, border:'1.5px solid '+(lang===L.code?Y:'#2a2a2a'),
                background:lang===L.code?YL:'#111', color:lang===L.code?BK:'#888', fontWeight:700, fontSize:13,
                cursor:'pointer', fontFamily:'inherit' }}>
              {L.label}
            </button>
          ))}
        </div>
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
    </div>
  )
}
