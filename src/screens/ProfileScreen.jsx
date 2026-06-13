import { useState } from 'react'
import { sb } from '../lib/supabase'
import AvatarUpload from '../components/AvatarUpload'
import { floorFor } from '../constants'
import { getLang, setLang } from '../i18n'

const Y = '#F5C000', YD = '#C8A000', GREEN = '#25D366'

const ACHIEVEMENTS = [
  { id: 'first_job',   ico: '🎯', title: 'First Job',      desc: 'Completed your first job',      threshold: j => j >= 1        },
  { id: 'five_jobs',   ico: '⭐', title: 'Rising Star',    desc: 'Completed 5 jobs',              threshold: j => j >= 5        },
  { id: 'ten_jobs',    ico: '🔥', title: 'On Fire',        desc: 'Completed 10 jobs',             threshold: j => j >= 10       },
  { id: 'fifty_jobs',  ico: '💎', title: 'Diamond Worker', desc: 'Completed 50 jobs',             threshold: j => j >= 50       },
  { id: 'hundred',     ico: '🏆', title: 'Century',        desc: 'Completed 100 jobs',            threshold: j => j >= 100      },
  { id: 'top_rated',   ico: '👑', title: 'Top Rated',      desc: 'Maintained 4.5+ rating',        threshold: (j,r) => r >= 4.5  },
  { id: 'trust_score', ico: '🛡️', title: 'Trusted Pro',    desc: 'Trust score above 80',          threshold: (j,r,t) => t >= 80 },
]

function Modal({ onClose, children }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:999,
      display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
      <div style={{ background:'#FFFFFF', borderRadius:'24px 24px 0 0', width:'100%', maxWidth:430,
        padding:'22px 20px 44px', maxHeight:'85vh', overflowY:'auto' }}>
        {children}
      </div>
    </div>
  )
}

function ModalHeader({ title, onClose }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
      <p style={{ fontWeight:800, fontSize:18, color:'#212121' }}>{title}</p>
      <button onClick={onClose} style={{ background:'#F5F5F5', border:'none', borderRadius:10,
        padding:'6px 13px', color:'#757575', cursor:'pointer', fontFamily:'Inter, sans-serif', fontWeight:600, fontSize:13 }}>
        Close
      </button>
    </div>
  )
}

function AchievementsModal({ profile, onClose }) {
  const jobs   = profile?.total_jobs  || 0
  const rating = profile?.rating      || 5.0
  const trust  = profile?.trust_score || 60
  return (
    <Modal onClose={onClose}>
      <ModalHeader title="🏆 Achievements" onClose={onClose} />
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {ACHIEVEMENTS.map(a => {
          const earned = a.threshold(jobs, rating, trust)
          return (
            <div key={a.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 14px',
              background: earned ? '#FFF8CC' : '#F9F9F9', borderRadius:14,
              border: '1px solid ' + (earned ? Y : '#EEEEEE'),
              opacity: earned ? 1 : 0.5 }}>
              <div style={{ width:44, height:44, borderRadius:12, flexShrink:0,
                background: earned ? '#FFF3AA' : '#EEEEEE',
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>
                {a.ico}
              </div>
              <div style={{ flex:1 }}>
                <p style={{ fontWeight:700, fontSize:14, color: earned ? '#412402' : '#9E9E9E' }}>{a.title}</p>
                <p style={{ fontSize:12, color:'#9E9E9E', marginTop:2 }}>{a.desc}</p>
              </div>
              {earned && (
                <span style={{ background:'#E8F5E9', color:'#2E7D32', fontSize:11,
                  fontWeight:700, padding:'3px 8px', borderRadius:6, flexShrink:0 }}>
                  Earned
                </span>
              )}
            </div>
          )
        })}
      </div>
      <div style={{ background:'#FFF8CC', borderRadius:14, padding:'14px 16px', marginTop:16, textAlign:'center',
        border:'1px solid ' + Y }}>
        <p style={{ color:'#412402', fontWeight:900, fontSize:22 }}>
          {ACHIEVEMENTS.filter(a => a.threshold(jobs, rating, trust)).length} / {ACHIEVEMENTS.length}
        </p>
        <p style={{ color:'#9E7A00', fontSize:12, marginTop:4 }}>Achievements unlocked</p>
      </div>
    </Modal>
  )
}

function BankModal({ profile, onClose, showToast }) {
  const [upi, setUpi] = useState(profile?.upi_id || '')
  const [saving, setSaving] = useState(false)
  const floor = floorFor(profile?.skill) || profile?.price_min || 300

  async function save() {
    if (!upi.includes('@')) { showToast('Enter a valid UPI ID (e.g. name@upi)'); return }
    setSaving(true)
    const { error } = await sb.from('workers')
      .update({ upi_id: upi.trim(), price_min: floor })
      .eq('id', profile.id)
    if (error) showToast('Save failed: ' + error.message)
    else showToast('Payment settings saved ✓')
    setSaving(false)
    onClose()
  }

  return (
    <Modal onClose={onClose}>
      <ModalHeader title="💳 Payments & Pricing" onClose={onClose} />
      <div style={{ background:'#F5F5F5', borderRadius:14, padding:'14px 16px', marginBottom:16,
        border:'1px solid #EEEEEE' }}>
        <p style={{ color:'#9E9E9E', fontSize:12, fontWeight:600, letterSpacing:0.5, textTransform:'uppercase' }}>
          Your UPI ID
        </p>
        <p style={{ color:'#757575', fontSize:13, marginTop:6, lineHeight:1.5 }}>
          Customers pay the platform first. You receive your earnings (90%) via your UPI ID after job completion.
        </p>
      </div>
      <input value={upi} onChange={e => setUpi(e.target.value)}
        placeholder="yourname@upi"
        style={{ width:'100%', border:'1.5px solid #E0E0E0', borderRadius:13, padding:'14px 16px',
          fontSize:15, outline:'none', fontFamily:'Inter, sans-serif', background:'#fff',
          color:'#212121', boxSizing:'border-box', marginBottom:10 }} />
      <p style={{ color:'#9E9E9E', fontSize:13, marginBottom:16 }}>
        Job minimum for <strong style={{ color:'#412402' }}>{profile?.skill}</strong> is fixed at Rs.{floor}
      </p>
      <button onClick={save} disabled={saving}
        style={{ width:'100%', background: saving ? '#E0E0E0' : Y, border:'none', borderRadius:14,
          padding:16, fontSize:15, fontWeight:800, cursor:'pointer', fontFamily:'Inter, sans-serif',
          color: saving ? '#9E9E9E' : '#412402' }}>
        {saving ? 'Saving…' : 'Save Settings →'}
      </button>
    </Modal>
  )
}

export default function ProfileScreen({ profile, showToast }) {
  const [modal,     setModal]     = useState(null)
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || null)
  const jobs   = profile?.total_jobs  || 0
  const rating = profile?.rating      || 5.0
  const trust  = profile?.trust_score || 60
  const earned = ACHIEVEMENTS.filter(a => a.threshold(jobs, rating, trust)).length

  function toggleLang() {
    setLang(getLang() === 'kn' ? 'en' : 'kn')
    window.location.reload()
  }
  function copyReferral() {
    const code = profile?.referral_code || ('KR' + (profile?.phone || '').slice(-4))
    navigator.clipboard?.writeText(code)
    showToast('Referral code copied: ' + code + ' — friend enters it at signup, you earn Rs.100 after their 5th job!')
  }

  const menus = [
    { ico:'🌐', label: getLang()==='kn' ? 'Language: ಕನ್ನಡ' : 'Language: English',
      badge: getLang()==='kn' ? 'Switch to EN' : 'Switch to ಕನ್ನಡ', fn: toggleLang },
    { ico:'🎁', label: 'Refer & Earn Rs.100',
      badge: profile?.referral_code || ('KR'+(profile?.phone||'').slice(-4)), fn: copyReferral },
    { ico:'🏆', label: 'Achievements',
      badge: earned + ' earned', fn: () => setModal('achievements') },
    { ico:'💳', label: 'Payments & Pricing',
      badge: profile?.upi_id ? '✓ Set' : 'Add UPI', fn: () => setModal('bank') },
    { ico:'📞', label: 'Support',
      badge: '1800-KR-HELP', fn: () => showToast('Call 1800-KR-HELP for help') },
  ]

  const trustColor = trust >= 80 ? '#25D366' : trust >= 60 ? Y : '#EF4444'

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:'#FAFAFA' }}>
      {modal==='achievements' && <AchievementsModal profile={profile} onClose={() => setModal(null)} />}
      {modal==='bank'         && <BankModal profile={profile} onClose={() => setModal(null)} showToast={showToast} />}

      <div style={{ flexShrink:0, overflowY:'auto', flex:1 }}>

        {/* Hero section — white card */}
        <div style={{ background:'#FFFFFF', padding:'24px 20px 20px', borderBottom:'1px solid #F0F0F0' }}>
          <div style={{ display:'flex', alignItems:'flex-start', gap:16 }}>
            <AvatarUpload userId={profile?.id} currentUrl={avatarUrl} table="workers"
              onUploaded={url => setAvatarUrl(url)} />
            <div style={{ flex:1, minWidth:0 }}>
              <h2 style={{ color:'#212121', fontWeight:900, fontSize:20, marginBottom:4 }}>
                {profile?.name || 'Worker'}
              </h2>
              <p style={{ color:'#9E9E9E', fontSize:13 }}>{profile?.phone}</p>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:8 }}>
                <span style={{ background:'#FFF8CC', color:'#412402', fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:8, border:'1px solid ' + Y }}>
                  {profile?.skill}
                </span>
                <span style={{ background:'#E8F5E9', color:'#2E7D32', fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:8 }}>
                  ✓ Verified
                </span>
                <span style={{ background:'#F5F5F5', color:'#412402', fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:8 }}>
                  🏆 {earned} badges
                </span>
              </div>
            </div>
          </div>

          {/* Trust score bar */}
          <div style={{ background:'#F9F9F9', borderRadius:14, padding:'12px 16px', marginTop:16,
            border:'1px solid #EEEEEE' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <p style={{ color:'#9E9E9E', fontSize:12, fontWeight:600 }}>Trust Score</p>
              <p style={{ color:trustColor, fontSize:13, fontWeight:800 }}>{trust} / 100</p>
            </div>
            <div style={{ background:'#EEEEEE', borderRadius:20, height:7, overflow:'hidden' }}>
              <div style={{ width: trust + '%', height:'100%', background:trustColor,
                borderRadius:20, transition:'width 1s ease' }} />
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, padding:'12px 16px 0' }}>
          {[
            [jobs,               'Jobs Done'],
            [rating + ' ★',     'Rating'],
            [profile?.city||'—', 'City'],
          ].map(([v, l]) => (
            <div key={l} style={{ background:'#FFFFFF', borderRadius:14, padding:'12px 10px',
              textAlign:'center', border:'1px solid #F0F0F0', boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
              <div style={{ fontSize:16, fontWeight:900, color:'#212121' }}>{v}</div>
              <div style={{ fontSize:10, color:'#9E9E9E', marginTop:3, fontWeight:600,
                textTransform:'uppercase', letterSpacing:0.4 }}>{l}</div>
            </div>
          ))}
        </div>

        {/* Menu */}
        <div style={{ padding:'12px 16px 8px', display:'flex', flexDirection:'column', gap:8 }}>
          <div style={{ background:'#FFFFFF', borderRadius:18, border:'1px solid #F0F0F0', overflow:'hidden',
            boxShadow:'0 2px 8px rgba(0,0,0,.04)' }}>
            {menus.map((m, i) => (
              <button key={m.label} onClick={m.fn}
                style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'14px 16px',
                  background:'none', border:'none',
                  borderBottom: i < menus.length - 1 ? '1px solid #F5F5F5' : 'none',
                  cursor:'pointer', fontFamily:'Inter, sans-serif', textAlign:'left' }}>
                <div style={{ width:38, height:38, borderRadius:12, background:'#FFF8CC', flexShrink:0,
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, border:'1px solid #F5C000' }}>
                  {m.ico}
                </div>
                <span style={{ fontSize:15, fontWeight:600, color:'#212121', flex:1 }}>{m.label}</span>
                {m.badge && (
                  <span style={{ fontSize:11, color:'#9E9E9E', marginRight:4, maxWidth:80,
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {m.badge}
                  </span>
                )}
                <span style={{ color:'#CCCCCC', fontSize:18 }}>›</span>
              </button>
            ))}
          </div>

          <button onClick={() => sb.auth.signOut()}
            style={{ width:'100%', background:'transparent', border:'1.5px solid #FFCDD2',
              borderRadius:14, padding:15, color:'#EF4444', fontWeight:800, fontSize:14,
              cursor:'pointer', fontFamily:'Inter, sans-serif', marginTop:4 }}>
            Sign Out
          </button>
          <p style={{ textAlign:'center', fontSize:12, color:'#D0D0D0', paddingBottom:12 }}>
            Kaam Ready Worker v1.0 · Karnataka 🇮🇳
          </p>
        </div>
      </div>
    </div>
  )
}
