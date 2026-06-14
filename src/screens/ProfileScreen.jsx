import { useState } from 'react'
import { sb } from '../lib/supabase'
import AvatarUpload from '../components/AvatarUpload'
import { floorFor } from '../constants'
import { getLang, setLang } from '../i18n'
import JobHistoryScreen from './JobHistoryScreen'
import SettingsScreen from './SettingsScreen'
const Y='#F5C000', YL='#FFF8D6', GREEN='#22c55e'

const ACHIEVEMENTS = [
  { id:'first_job',   ico:'🎯', title:'First Job',      desc:'Completed your first job',         threshold: j => j >= 1    },
  { id:'five_jobs',   ico:'⭐', title:'Rising Star',    desc:'Completed 5 jobs',                  threshold: j => j >= 5    },
  { id:'ten_jobs',    ico:'🔥', title:'On Fire',        desc:'Completed 10 jobs',                 threshold: j => j >= 10   },
  { id:'fifty_jobs',  ico:'💎', title:'Diamond Worker', desc:'Completed 50 jobs',                 threshold: j => j >= 50   },
  { id:'hundred',     ico:'🏆', title:'Century',        desc:'Completed 100 jobs',                threshold: j => j >= 100  },
  { id:'top_rated',   ico:'👑', title:'Top Rated',      desc:'Maintained 4.5+ rating',            threshold: (j,r) => r >= 4.5 },
  { id:'trust_score', ico:'🛡️', title:'Trusted Pro',    desc:'Trust score above 80',              threshold: (j,r,t) => t >= 80 },
]

function AchievementsModal({ profile, onClose }) {
  const jobs   = profile?.total_jobs   || 0
  const rating = profile?.rating       || 5.0
  const trust  = profile?.trust_score  || 60
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.85)', zIndex:999, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
      <div style={{ background:'#111', borderRadius:'24px 24px 0 0', width:'100%', maxWidth:430, padding:'20px 20px 40px', maxHeight:'80vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <p style={{ fontWeight:800, fontSize:18, color:'#fff' }}>🏆 Achievements</p>
          <button onClick={onClose} style={{ background:'#1a1a1a', border:'none', borderRadius:10, padding:'6px 12px', color:'#fff', cursor:'pointer', fontFamily:'inherit' }}>Close</button>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {ACHIEVEMENTS.map(a => {
            const earned = a.threshold(jobs, rating, trust)
            return (
              <div key={a.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:'#1a1a1a', borderRadius:14, border:`1.5px solid ${earned?Y:'#2a2a2a'}`, opacity:earned?1:0.5 }}>
                <div style={{ width:44, height:44, borderRadius:12, background:earned?YL:'#222', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>{a.ico}</div>
                <div style={{ flex:1 }}>
                  <p style={{ fontWeight:700, fontSize:14, color:earned?Y:'#555' }}>{a.title}</p>
                  <p style={{ fontSize:12, color:'#555', marginTop:2 }}>{a.desc}</p>
                </div>
                {earned && <span style={{ background:GREEN, color:'#fff', fontSize:11, fontWeight:700, padding:'3px 8px', borderRadius:6 }}>Earned</span>}
              </div>
            )
          })}
        </div>
        <div style={{ background:'#1a1a1a', borderRadius:14, padding:'12px 16px', marginTop:16, textAlign:'center' }}>
          <p style={{ color:Y, fontWeight:800, fontSize:18 }}>{ACHIEVEMENTS.filter(a=>a.threshold(jobs,rating,trust)).length} / {ACHIEVEMENTS.length}</p>
          <p style={{ color:'#555', fontSize:12, marginTop:4 }}>Achievements unlocked</p>
        </div>
      </div>
    </div>
  )
}

function BankModal({ profile, onClose, showToast }) {
  const [upi, setUpi] = useState(profile?.upi_id || '')
  const [saving, setSaving] = useState(false)
  const floor = floorFor(profile?.skill) || profile?.price_min || 300
  async function save() {
    if (!upi.includes('@')) { showToast('Enter a valid UPI ID (e.g. name@upi)'); return }
    setSaving(true)
    const { error } = await sb.from('workers').update({ upi_id: upi.trim(), price_min: floor }).eq('id', profile.id)
    if (error) showToast('Save failed: '+error.message)
    else showToast('Payment settings saved ✓')
    setSaving(false)
    onClose()
  }
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.85)', zIndex:999, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
      <div style={{ background:'#111', borderRadius:'24px 24px 0 0', width:'100%', maxWidth:430, padding:'20px 20px 40px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <p style={{ fontWeight:800, fontSize:18, color:'#fff' }}>💳 Payments & Pricing</p>
          <button onClick={onClose} style={{ background:'#1a1a1a', border:'none', borderRadius:10, padding:'6px 12px', color:'#fff', cursor:'pointer', fontFamily:'inherit' }}>Close</button>
        </div>
        <p style={{ color:'#555', fontSize:13, marginBottom:8 }}>Customers pay this UPI ID directly after each job</p>
        <input value={upi} onChange={e => setUpi(e.target.value)}
          placeholder="yourname@upi"
          style={{ width:'100%', border:'1.5px solid #2a2a2a', borderRadius:12, padding:'13px 14px',
            fontSize:14, outline:'none', fontFamily:'inherit', background:'#1a1a1a', color:'#fff', boxSizing:'border-box', marginBottom:14 }} />
        <p style={{ color:'#555', fontSize:13, marginBottom:14 }}>Job minimum for your skill is fixed at ₹{floor}</p>
        <button onClick={save} disabled={saving}
          style={{ width:'100%', background:Y, border:'none', borderRadius:14, padding:16, fontSize:15, fontWeight:800, cursor:'pointer', fontFamily:'inherit', opacity:saving?0.6:1 }}>
          {saving ? 'Saving...' : 'Save →'}
        </button>
      </div>
    </div>
  )
}

export default function ProfileScreen({ user, profile, showToast }) {
  const [modal,     setModal]    = useState(null)
  const [subscreen, setSubscreen] = useState(null) // null | 'history' | 'settings'
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || null)

  // Sub-screens (full takeover)
  if (subscreen === 'history')
    return <JobHistoryScreen user={user} profile={profile} onBack={() => setSubscreen(null)} showToast={showToast} />
  if (subscreen === 'settings')
    return <SettingsScreen user={user} profile={profile} onBack={() => setSubscreen(null)} showToast={showToast} />
  const jobs   = profile?.total_jobs  || 0
  const rating = profile?.rating      || 5.0
  const trust  = profile?.trust_score || 60
  const earned = ACHIEVEMENTS.filter(a => a.threshold(jobs, rating, trust)).length

  function toggleLang() {
    setLang(getLang()==='kn' ? 'en' : 'kn')
    window.location.reload()
  }
  function copyReferral() {
    const code = profile?.referral_code || ('KR'+(profile?.phone||'').slice(-4))
    navigator.clipboard?.writeText(code)
    showToast('Referral code copied: '+code+' — friend enters it at signup, you earn ₹100 after their 5th job!')
  }

  const menus = [
    ['🌐', getLang()==='kn' ? 'Language: ಕನ್ನಡ' : 'Language: English', getLang()==='kn' ? 'EN?' : 'ಕನ್ನಡ?', toggleLang],
    ['🎁','Refer & Earn ₹100', profile?.referral_code || ('KR'+(profile?.phone||'').slice(-4)), copyReferral],
    ['📋','Job History',    null,     () => setSubscreen('history')],
    ['🏆','Achievements',  earned+' earned', () => setModal('achievements')],
    ['💳','Payments & Pricing',  profile?.upi_id ? '✓ Set' : 'Add UPI', () => setModal('bank')],
    ['📞','Support',       null,     () => window.open('https://wa.me/918012345678?text=Hi+Kaam+Ready+I+need+help', '_blank')],
    ['⚙️','Settings',      null,     () => setSubscreen('settings')],
  ]

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      {modal==='achievements' && <AchievementsModal profile={profile} onClose={() => setModal(null)} />}
      {modal==='bank'         && <BankModal profile={profile} onClose={() => setModal(null)} showToast={showToast} />}

      <div style={{ background:'#1C1C1E', padding:'32px 20px 24px', textAlign:'center', flexShrink:0 }}>
        <div style={{ marginBottom:14 }}>
          <AvatarUpload userId={profile?.id} currentUrl={avatarUrl} table="workers" dark
            onUploaded={url => setAvatarUrl(url)} />
        </div>
        <p style={{ color:'#fff', fontWeight:800, fontSize:20 }}>{profile?.name||'Worker'}</p>
        <p style={{ color:'#636366', fontSize:13, marginTop:4 }}>{profile?.phone}</p>
        <div style={{ display:'flex', gap:8, justifyContent:'center', marginTop:12, flexWrap:'wrap' }}>
          <span style={{ background:YL, color:'#B8900A', fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:8 }}>{profile?.skill}</span>
          <span style={{ background:'#D1FAE5', color:'#065F46', fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:8 }}>✓ Verified</span>
          <span style={{ background:'#1a1a1a', color:Y, fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:8 }}>🏆 {earned} badges</span>
        </div>
        <div style={{ background:'#1a1a1a', borderRadius:12, padding:'12px 16px', marginTop:14 }}>
          <p style={{ color:'#636366', fontSize:11, marginBottom:6 }}>Trust Score</p>
          <div style={{ background:'#333', borderRadius:20, height:6, overflow:'hidden' }}>
            <div style={{ width:trust+'%', height:'100%', background:Y, borderRadius:20 }} />
          </div>
          <p style={{ color:Y, fontSize:12, fontWeight:800, marginTop:6 }}>{trust} / 100</p>
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:16, display:'flex', flexDirection:'column', gap:12 }}>
        {/* Stats row */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
          {[[jobs,'Jobs Done'],[(rating+'⭐'),'Rating'],[profile?.city||'—','City']].map(([v,l])=>(
            <div key={l} style={{ background:'#111', borderRadius:12, padding:'10px 8px', textAlign:'center', border:'1px solid #1a1a1a' }}>
              <div style={{ fontSize:16, fontWeight:800, color:'#fff' }}>{v}</div>
              <div style={{ fontSize:10, color:'#555', marginTop:2 }}>{l}</div>
            </div>
          ))}
        </div>

        <div style={{ background:'#111', borderRadius:16, border:'1px solid #1a1a1a', overflow:'hidden' }}>
          {menus.map(([ico,lb,badge,fn]) => (
            <button key={lb} onClick={fn}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'14px 16px', background:'none', border:'none', borderBottom:'1px solid #1a1a1a', cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}>
              <div style={{ width:36, height:36, borderRadius:10, background:YL, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>{ico}</div>
              <span style={{ fontSize:15, fontWeight:500, color:'#fff', flex:1 }}>{lb}</span>
              {badge && <span style={{ fontSize:11, color:'#888', marginRight:4 }}>{badge}</span>}
    