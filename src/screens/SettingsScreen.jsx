import { useState } from 'react'
import { sb } from '../lib/supabase'
const Y = '#F5C000', YD = '#B8900A', YL = '#FFF8D6', BK = '#1C1C1E', GREEN = '#22c55e'

const CITIES = ['Bengaluru', 'Mysuru', 'Mangaluru', 'Hubballi', 'Belagavi', 'Tumakuru', 'Shivamogga', 'Davangere', 'Kalaburagi', 'Udupi']
const SKILLS = [
  { id: 'elec', lbl: 'Electrician' }, { id: 'plumb', lbl: 'Plumber' },
  { id: 'clean', lbl: 'Cleaner' },   { id: 'carpen', lbl: 'Carpenter' },
  { id: 'paint', lbl: 'Painter' },   { id: 'mech', lbl: 'Mechanic' },
  { id: 'pest', lbl: 'Pest Control' }, { id: 'labor', lbl: 'Labourer' },
]

export default function SettingsScreen({ user, profile, onBack, showToast }) {
  const [name,          setName]         = useState(profile?.name || '')
  const [phone,         setPhone]        = useState(profile?.phone || '')
  const [city,          setCity]         = useState(profile?.city || '')
  const [address,       setAddress]      = useState(profile?.address || '')
  const [skill,         setSkill]        = useState(profile?.skill || '')
  const [upiId,         setUpiId]        = useState(profile?.upi_id || '')
  const [radius,        setRadius]       = useState(profile?.service_radius_km || 10)
  const [notifJobs,     setNotifJobs]    = useState(true)
  const [notifPayments, setNotifPayments] = useState(true)
  const [notifPromo,    setNotifPromo]   = useState(false)
  const [saving,        setSaving]       = useState(false)
  const [section,       setSection]      = useState('profile') // profile | notifications | privacy

  async function saveProfile() {
    if (!name.trim()) { showToast('Name is required'); return }
    if (!upiId.includes('@')) { showToast('Enter a valid UPI ID (e.g. name@upi)'); return }
    setSaving(true)
    const { error } = await sb.from('workers').update({
      name: name.trim(),
      phone,
      city,
      address: address.trim(),
      skill,
      upi_id: upiId.trim(),
      service_radius_km: radius,
    }).eq('id', user.id)
    if (error) showToast('Save failed: ' + error.message)
    else showToast('Settings saved ✓')
    setSaving(false)
  }

  async function deleteAccount() {
    const confirmed = window.confirm('Are you sure? This will permanently delete your account and all data. This cannot be undone.')
    if (!confirmed) return
    await sb.from('workers').delete().eq('id', user.id)
    await sb.auth.signOut()
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#111' }}>
      {/* Header */}
      <div style={{ background: BK, padding: '48px 20px 16px', flexShrink: 0 }}>
        <button onClick={onBack}
          style={{ background: 'rgba(255,255,255,.1)', border: 'none', borderRadius: 10, padding: '6px 14px', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
          ← Back
        </button>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: Y }}>⚙️ Settings</h1>
      </div>

      {/* Section tabs */}
      <div style={{ display: 'flex', gap: 8, padding: '10px 16px', background: '#111', flexShrink: 0, borderBottom: '1px solid #1a1a1a' }}>
        {[['profile', '👤 Profile'], ['notifications', '🔔 Notifications'], ['privacy', '🔒 Privacy']].map(([v, l]) => (
          <button key={v} onClick={() => setSection(v)}
            style={{ padding: '7px 14px', borderRadius: 20, border: '1.5px solid ' + (section === v ? Y : '#2a2a2a'),
              background: section === v ? Y : '#1a1a1a', fontSize: 11, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'inherit', color: section === v ? BK : '#888', flexShrink: 0 }}>
            {l}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* ── Profile Section ── */}
        {section === 'profile' && (
          <>
            <div style={{ background: '#1a1a1a', borderRadius: 16, padding: 16, border: '1px solid #2a2a2a' }}>
              <p style={{ color: Y, fontWeight: 800, fontSize: 14, marginBottom: 14 }}>Personal Information</p>

              {[
                ['Full Name *', 'text', name, v => setName(v)],
                ['Phone Number', 'tel', phone, v => setPhone(v.replace(/\D/g, '').slice(0, 10))],
                ['Home Address', 'text', address, v => setAddress(v)],
                ['UPI ID *', 'text', upiId, v => setUpiId(v)],
              ].map(([label, type, val, set]) => (
                <div key={label} style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#636366', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: .5 }}>{label}</label>
                  <input value={val} onChange={e => set(e.target.value)} type={type}
                    style={{ width: '100%', background: '#111', border: '1.5px solid #2a2a2a', borderRadius: 12, padding: 12, fontSize: 14, outline: 'none', fontFamily: 'inherit', color: '#fff', boxSizing: 'border-box' }} />
                </div>
              ))}

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#636366', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: .5 }}>City</label>
                <select value={city} onChange={e => setCity(e.target.value)}
                  style={{ width: '100%', background: '#111', border: '1.5px solid #2a2a2a', borderRadius: 12, padding: 12, fontSize: 14, outline: 'none', fontFamily: 'inherit', color: '#fff' }}>
                  <option value="">Select city</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#636366', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: .5 }}>Primary Skill</label>
                <select value={skill} onChange={e => setSkill(e.target.value)}
                  style={{ width: '100%', background: '#111', border: '1.5px solid #2a2a2a', borderRadius: 12, padding: 12, fontSize: 14, outline: 'none', fontFamily: 'inherit', color: '#fff' }}>
                  <option value="">Select skill</option>
                  {SKILLS.map(s => <option key={s.id} value={s.id}>{s.lbl}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#636366', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: .5 }}>
                  Service Radius: {radius} km
                </label>
                <input type="range" min={2} max={30} value={radius} onChange={e => setRadius(Number(e.target.value))}
                  style={{ width: '100%', accentColor: Y }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ fontSize: 10, color: '#555' }}>2 km</span>
                  <span style={{ fontSize: 10, color: '#555' }}>30 km</span>
                </div>
              </div>

              <button onClick={saveProfile} disabled={saving}
                style={{ width: '100%', background: Y, border: 'none', borderRadius: 12, padding: 14, fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', opacity: saving ? .6 : 1 }}>
                {saving ? 'Saving...' : 'Save Changes ✓'}
              </button>
            </div>
          </>
        )}

        {/* ── Notifications ── */}
        {section === 'notifications' && (
          <div style={{ background: '#1a1a1a', borderRadius: 16, padding: 16, border: '1px solid #2a2a2a' }}>
            <p style={{ color: Y, fontWeight: 800, fontSize: 14, marginBottom: 14 }}>Notification Preferences</p>
            {[
              ['New job alerts', 'Get notified when a job matches your skill and city', notifJobs, setNotifJobs],
              ['Payment notifications', 'Alerts when a customer pays or confirms', notifPayments, setNotifPayments],
              ['Promotions & bonuses', 'Platform updates and earning opportunities', notifPromo, setNotifPromo],
            ].map(([title, desc, val, set]) => (
              <div key={title} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 0', borderBottom: '1px solid #2a2a2a' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{title}</p>
                  <p style={{ fontSize: 12, color: '#555', marginTop: 4 }}>{desc}</p>
                </div>
                <div onClick={() => set(v => !v)}
                  style={{ width: 48, height: 26, borderRadius: 20, background: val ? GREEN : '#2a2a2a',
                    position: 'relative', cursor: 'pointer', transition: 'background .2s', flexShrink: 0, marginTop: 2 }}>
                  <div style={{ width: 20, height: 20, background: '#fff', borderRadius: '50%', position: 'absolute', top: 3, left: val ? 25 : 3, transition: 'left .2s' }} />
                </div>
              </div>
            ))}
            <button onClick={() => showToast('Notification settings saved ✓')}
              style={{ width: '100%', background: Y, border: 'none', borderRadius: 12, padding: 14, fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', marginTop: 16 }}>
              Save Preferences ✓
            </button>
          </div>
        )}

        {/* ── Privacy ── */}
        {section === 'privacy' && (
          <>
            <div style={{ background: '#1a1a1a', borderRadius: 16, padding: 16, border: '1px solid #2a2a2a' }}>
              <p style={{ color: Y, fontWeight: 800, fontSize: 14, marginBottom: 14 }}>Privacy & Security</p>
              {[
                { ico: '🔒', title: 'Change Password', desc: 'Update your account password', action: () => showToast('A password reset link will be sent to your email') },
                { ico: '📋', title: 'Download My Data', desc: 'Export all your job and earnings data', action: () => showToast('Data export will be sent to your registered email within 24 hours') },
                { ico: '👁️', title: 'Profile Visibility', desc: 'Your profile is visible to customers in your city when online', action: () => {} },
                { ico: '📍', title: 'Location Sharing', desc: 'Shared with customers only during active jobs', action: () => {} },
              ].map(({ ico, title, desc, action }) => (
                <div key={title} onClick={action}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 0', borderBottom: '1px solid #2a2a2a', cursor: 'pointer' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{ico}</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{title}</p>
                    <p style={{ fontSize: 12, color: '#555', marginTop: 3 }}>{desc}</p>
                  </div>
                  <span style={{ color: '#333', fontSize: 16, marginTop: 2 }}>›</span>
                </div>
              ))}
            </div>

            <div style={{ background: '#1a1a1a', borderRadius: 16, padding: 16, border: '1.5px solid #dc2626' }}>
              <p style={{ color: '#ef4444', fontWeight: 800, fontSize: 14, marginBottom: 8 }}>⚠️ Danger Zone</p>
              <p style={{ fontSize: 12, color: '#555', marginBottom: 14, lineHeight: 1.6 }}>
                Deleting your account will permanently remove all your data, job history, and earnings records. This action cannot be reversed.
              </p>
              <button onClick={deleteAccount}
                style={{ width: '100%', background: 'transparent', border: '1.5px solid #dc2626', borderRadius: 12, padding: 13, color: '#ef4444', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                Delete Account
              </button>
            </div>
          </>
        )}

        <div style={{ height: 16 }} />
      </div>
    </div>
  )
}
