import { useState } from 'react'
import { sb } from '../lib/supabase'
import AvatarUpload from '../components/AvatarUpload'
import { floorFor } from '../constants'
import { getLang, setLang } from '../i18n'
import JobHistoryScreen from './JobHistoryScreen'
import SettingsScreen from './SettingsScreen'
const Y='#F5C000', YL='#FFF8D6', GREEN='#22c55e', RED='#ef4444', BK='#1C1C1E'

const ACHIEVEMENTS = [
  { id:'first_job',   ico:'🎯', title:'First Job',      desc:'Completed your first job',    threshold:(j)=>j>=1   },
  { id:'five_jobs',   ico:'⭐', title:'Rising Star',    desc:'Completed 5 jobs',             threshold:(j)=>j>=5   },
  { id:'ten_jobs',    ico:'🔥', title:'On Fire',        desc:'Completed 10 jobs',            threshold:(j)=>j>=10  },
  { id:'fifty_jobs',  ico:'💎', title:'Diamond Worker', desc:'Completed 50 jobs',            threshold:(j)=>j>=50  },
  { id:'hundred',     ico:'🏆', title:'Century',        desc:'Completed 100 jobs',           threshold:(j)=>j>=100 },
  { id:'top_rated',   ico:'👑', title:'Top Rated',      desc:'Maintained 4.5+ rating',       threshold:(j,r)=>r>=4.5 },
  { id:'trust_score', ico:'🛡️', title:'Trusted Pro',    desc:'Trust score above 80',         threshold:(j,r,t)=>t>=80 },
]

/* ── Achievements modal ─────────────────────────────────────── */
function AchievementsModal({ profile, onClose }) {
  const jobs=profile?.total_jobs||0, rating=profile?.rating||5, trust=profile?.trust_score||60
  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.85)',zIndex:999,display:'flex',alignItems:'flex-end',justifyContent:'center' }}>
      <div style={{ background:'#111',borderRadius:'24px 24px 0 0',width:'100%',maxWidth:430,padding:'20px 20px 40px',maxHeight:'80vh',overflowY:'auto' }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20 }}>
          <p style={{ fontWeight:800,fontSize:18,color:'#fff' }}>🏆 Achievements</p>
          <button onClick={onClose} style={{ background:'#1a1a1a',border:'none',borderRadius:10,padding:'6px 12px',color:'#fff',cursor:'pointer',fontFamily:'inherit' }}>Close</button>
        </div>
        {ACHIEVEMENTS.map(a => {
          const earned=a.threshold(jobs,rating,trust)
          return (
            <div key={a.id} style={{ display:'flex',alignItems:'center',gap:12,padding:'12px 14px',background:'#1a1a1a',borderRadius:14,border:`1.5px solid ${earned?Y:'#2a2a2a'}`,opacity:earned?1:0.5,marginBottom:8 }}>
              <div style={{ width:44,height:44,borderRadius:12,background:earned?YL:'#222',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22 }}>{a.ico}</div>
              <div style={{ flex:1 }}>
                <p style={{ fontWeight:700,fontSize:14,color:earned?Y:'#555' }}>{a.title}</p>
                <p style={{ fontSize:12,color:'#555',marginTop:2 }}>{a.desc}</p>
              </div>
              {earned && <span style={{ background:GREEN,color:'#fff',fontSize:11,fontWeight:700,padding:'3px 8px',borderRadius:6 }}>Earned</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Bank / UPI modal ───────────────────────────────────────── */
function BankModal({ profile, onClose, showToast }) {
  const [upi, setUpi] = useState(profile?.upi_id||'')
  const [saving, setSaving] = useState(false)
  const floor = floorFor(profile?.skill)||profile?.price_min||300
  async function save() {
    if (!upi.includes('@')) { showToast('Enter a valid UPI ID'); return }
    setSaving(true)
    const { error } = await sb.from('workers').update({ upi_id:upi.trim(), price_min:floor }).eq('id',profile.id)
    if (error) showToast('Save failed: '+error.message)
    else showToast('Payment settings saved ✓')
    setSaving(false); onClose()
  }
  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.85)',zIndex:999,display:'flex',alignItems:'flex-end',justifyContent:'center' }}>
      <div style={{ background:'#111',borderRadius:'24px 24px 0 0',width:'100%',maxWidth:430,padding:'20px 20px 40px' }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16 }}>
          <p style={{ fontWeight:800,fontSize:18,color:'#fff' }}>💳 Payments & Pricing</p>
          <button onClick={onClose} style={{ background:'#1a1a1a',border:'none',borderRadius:10,padding:'6px 12px',color:'#fff',cursor:'pointer',fontFamily:'inherit' }}>Close</button>
        </div>
        <p style={{ color:'#555',fontSize:13,marginBottom:8 }}>Customers pay this UPI ID after each job</p>
        <input value={upi} onChange={e=>setUpi(e.target.value)} placeholder="yourname@upi"
          style={{ width:'100%',border:'1.5px solid #2a2a2a',borderRadius:12,padding:'13px 14px',fontSize:14,outline:'none',fontFamily:'inherit',background:'#1a1a1a',color:'#fff',boxSizing:'border-box',marginBottom:12 }} />
        <p style={{ color:'#555',fontSize:13,marginBottom:14 }}>Job minimum for your skill: ₹{floor}</p>
        <button onClick={save} disabled={saving}
          style={{ width:'100%',background:Y,border:'none',borderRadius:14,padding:16,fontSize:15,fontWeight:800,cursor:'pointer',fontFamily:'inherit',opacity:saving?0.6:1 }}>
          {saving?'Saving...':'Save →'}
        </button>
      </div>
    </div>
  )
}

/* ── Contact Info modal ─────────────────────────────────────── */
function ContactModal({ profile, onClose, showToast, reloadProfile }) {
  const [email,     setEmail]     = useState(profile?.email||'')
  const [altPhone,  setAltPhone]  = useState(profile?.alternate_phone||'')
  const [address,   setAddress]   = useState(profile?.address||'')
  const [saving,    setSaving]    = useState(false)

  async function save() {
    setSaving(true)
    const { error } = await sb.from('workers').update({
      email: email.trim() || null,
      alternate_phone: altPhone.trim() || null,
      address: address.trim() || null,
    }).eq('id', profile.id)
    if (error) { showToast('Save failed: '+error.message); setSaving(false); return }
    showToast('Contact info saved ✓')
    if (reloadProfile) reloadProfile()
    setSaving(false); onClose()
  }

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.85)',zIndex:999,display:'flex',alignItems:'flex-end',justifyContent:'center' }}>
      <div style={{ background:'#111',borderRadius:'24px 24px 0 0',width:'100%',maxWidth:430,padding:'20px 20px 40px' }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16 }}>
          <p style={{ fontWeight:800,fontSize:18,color:'#fff' }}>📞 Contact Info</p>
          <button onClick={onClose} style={{ background:'#1a1a1a',border:'none',borderRadius:10,padding:'6px 12px',color:'#fff',cursor:'pointer',fontFamily:'inherit' }}>Close</button>
        </div>
        {[
          ['Email Address', 'email', email, setEmail, 'you@gmail.com'],
          ['Alternate Phone', 'tel', altPhone, v => setAltPhone(v.replace(/\D/g,'').slice(0,10)), '98765 43210'],
          ['Home Address', 'text', address, setAddress, '12, MG Road, Bengaluru'],
        ].map(([label, type, val, set, ph]) => (
          <div key={label} style={{ marginBottom:14 }}>
            <label style={{ fontSize:11,fontWeight:700,color:'#636366',display:'block',marginBottom:6,textTransform:'uppercase' }}>{label}</label>
            <input value={val} onChange={e=>set(e.target.value)} type={type} placeholder={ph}
              style={{ width:'100%',background:'#1a1a1a',border:'1.5px solid #2a2a2a',borderRadius:12,padding:'12px 14px',fontSize:14,outline:'none',fontFamily:'inherit',color:'#fff',boxSizing:'border-box' }} />
          </div>
        ))}
        <button onClick={save} disabled={saving}
          style={{ width:'100%',background:Y,border:'none',borderRadius:14,padding:16,fontSize:15,fontWeight:800,cursor:'pointer',fontFamily:'inherit',opacity:saving?0.6:1 }}>
          {saving?'Saving...':'Save Contact Info ✓'}
        </button>
      </div>
    </div>
  )
}

/* ── KYC Documents modal ────────────────────────────────────── */
function KYCModal({ profile, onClose, showToast, reloadProfile }) {
  const [aaFront,  setAaFront]  = useState(null)
  const [aaBack,   setAaBack]   = useState(null)
  const [aaPreF,   setAaPreF]   = useState(profile?.aadhar_front_url||null)
  const [aaPreB,   setAaPreB]   = useState(profile?.aadhar_back_url||null)
  const [panFront, setPanFront] = useState(null)
  const [panPreF,  setPanPreF]  = useState(profile?.pan_front_url||null)
  const [panNum,   setPanNum]   = useState(profile?.pan_number||'')
  const [aaNum,    setAaNum]    = useState(profile?.aadhaar_number||'')
  const [busy,     setBusy]     = useState(false)

  function pickFile(e, setFile, setPreview) {
    const f = e.target.files[0]; if (!f) return
    setFile(f); setPreview(URL.createObjectURL(f))
  }

  async function save() {
    setBusy(true)
    try {
      const updates = {}
      if (aaFront) {
        const { error } = await sb.storage.from('kyc').upload(`${profile.id}/aadhaar-front.jpg`, aaFront, { upsert:true })
        if (!error) { const { data:{ publicUrl } } = sb.storage.from('kyc').getPublicUrl(`${profile.id}/aadhaar-front.jpg`); updates.aadhar_front_url = publicUrl }
      }
      if (aaBack) {
        const { error } = await sb.storage.from('kyc').upload(`${profile.id}/aadhaar-back.jpg`, aaBack, { upsert:true })
        if (!error) { const { data:{ publicUrl } } = sb.storage.from('kyc').getPublicUrl(`${profile.id}/aadhaar-back.jpg`); updates.aadhar_back_url = publicUrl }
      }
      if (panFront) {
        const { error } = await sb.storage.from('kyc').upload(`${profile.id}/pan-front.jpg`, panFront, { upsert:true })
        if (!error) { const { data:{ publicUrl } } = sb.storage.from('kyc').getPublicUrl(`${profile.id}/pan-front.jpg`); updates.pan_front_url = publicUrl; updates.pan_submitted = true }
      }
      if (aaNum.trim()) updates.aadhaar_number = aaNum.trim()
      if (panNum.trim()) updates.pan_number = panNum.trim()
      if (aaFront || aaBack) updates.aadhar_submitted = true

      if (Object.keys(updates).length > 0) {
        const { error } = await sb.from('workers').update(updates).eq('id', profile.id)
        if (error) { showToast('Upload failed: '+error.message); setBusy(false); return }
      }
      showToast('KYC documents submitted ✓ Under review (24 hrs)')
      if (reloadProfile) reloadProfile()
      onClose()
    } catch(e) { showToast('Error: '+e.message) }
    finally { setBusy(false) }
  }

  const UploadSlot = ({ label, preview, onPick, verified }) => (
    <div style={{ marginBottom:14 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
        <label style={{ fontSize:11,fontWeight:700,color:'#636366',textTransform:'uppercase' }}>{lab