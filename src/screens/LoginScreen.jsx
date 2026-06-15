import { useState } from 'react'

const Y = '#F5C000'
const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY

export default function LoginScreen({ setScreen, showToast }) {
  const [tab,       setTab]       = useState('phone')
  const [phone,     setPhone]     = useState('')
  const [email,     setEmail]     = useState('')
  const [pass,      setPass]      = useState('')
  const [isReg,     setIsReg]     = useState(false)
  const [busy,      setBusy]      = useState(false)
  const [resetMode, setResetMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  async function sendOTP() {
    if (phone.length < 10) { showToast('Enter a valid 10-digit number'); return }
    setBusy(true)
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON },
        body: JSON.stringify({ phone }),
      })
      const data = await res.json()
      if (!res.ok) { showToast(data.error || 'Failed to send OTP'); return }
      sessionStorage.setItem('kr_worker_phone', phone)
      setScreen('otp')
      showToast('OTP sent via SMS!')
    } catch { showToast('Network error — try again') }
    finally { setBusy(false) }
  }

  async function emailAuth() {
    if (!email.includes('@') || pass.length < 6) { showToast('Enter valid email and password (min 6 chars)'); return }
    setBusy(true)
    try {
      const { sb } = await import('../lib/supabase')
      if (isReg) {
        const { error } = await sb.auth.signUp({ email, password: pass })
        if (error) { showToast(error.message); return }
        showToast('Account created! Check your email to verify.')
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password: pass })
        if (error) { showToast(error.message); return }
      }
    } catch (e) { showToast('Error: ' + e.message) }
    finally { setBusy(false) }
  }

  async function sendReset() {
    if (!email.includes('@')) { showToast('Enter your email address'); return }
    setBusy(true)
    try {
      const { sb } = await import('../lib/supabase')
      const { error } = await sb.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin + '/?reset=1',
      })
      if (error) { showToast(error.message); return }
      setResetSent(true)
    } catch (e) { showToast('Error: ' + e.message) }
    finally { setBusy(false) }
  }

  const inp = (val, set, placeholder, type='text') => (
    <input value={val} onChange={e => set(e.target.value)} placeholder={placeholder} type={type}
      style={{ width:'100%', border:'1.5px solid #2a2a2a', borderRadius:12, padding:'13px 14px',
        fontSize:14, outline:'none', fontFamily:'inherit', background:'#1a1a1a', color:'#fff',
        marginBottom:12, boxSizing:'border-box' }} />
  )

  return (
    <div style={{ height:'100vh', background:'#0A0A0A', display:'flex', flexDirection:'column', maxWidth:430, margin:'0 auto', width:'100%' }}>
      <div style={{ background:Y, padding:'40px 24px 28px', textAlign:'center' }}>
        <div style={{ fontSize:56, marginBottom:10 }}>⚡</div>
        <h1 style={{ fontSize:28, fontWeight:800 }}>Kaam Ready</h1>
        <p style={{ fontSize:13, color:'rgba(0,0,0,.6)', marginTop:4 }}>Worker Dashboard</p>
      </div>

      <div style={{ display:'flex', margin:'20px 20px 0', background:'#111', borderRadius:12, padding:4, gap:4 }}>
        {[['phone','📱 Phone OTP'],['email','✉️ Email']].map(([t,l]) => (
          <button key={t} onClick={() => { setTab(t); setResetMode(false); setResetSent(false) }}
            style={{ flex:1, padding:'10px 0', borderRadius:9, border:'none', fontWeight:700, fontSize:13,
              background:tab===t?Y:'transparent', color:tab===t?'#000':'#555',
              cursor:'pointer', fontFamily:'inherit' }}>
            {l}
          </button>
        ))}
      </div>

      <div style={{ padding:20, display:'flex', flexDirection:'column', gap:14, flex:1 }}>
        {tab === 'phone' ? (
          <div style={{ background:'#111', borderRadius:20, padding:20, border:'1px solid #222' }}>
            <p style={{ fontWeight:800, fontSize:16, color:'#fff', marginBottom:4 }}>Sign in with Phone</p>
            <p style={{ fontSize:13, color:'#555', marginBottom:16 }}>We'll send a 6-digit OTP via SMS</p>
            <div style={{ display:'flex', gap:8, marginBottom:14 }}>
              <div style={{ background:'#1a1a1a', borderRadius:12, padding:'13px 14px', fontWeight:700, fontSize:14, color:'#fff', border:'1.5px solid #2a2a2a' }}>🇮🇳 +91</div>
              <input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g,'').slice(0,10))}
                placeholder="98765 43210" type="tel"
                style={{ flex:1, border:'1.5px solid #2a2a2a', borderRadius:12, padding:'13px 14px',
                  fontSize:14, outline:'none', fontFamily:'inherit', background:'#1a1a1a', color:'#fff' }} />
            </div>
            <button onClick={sendOTP} disabled={busy}
              style={{ width:'100%', background:Y, border:'none', borderRadius:14, padding:16, fontSize:15, fontWeight:800, cursor:'pointer', fontFamily:'inherit', opacity:busy?0.6:1 }}>
              {busy ? 'Sending...' : 'Send OTP →'}
            </button>
          </div>
        ) : resetMode ? (
          <div style={{ background:'#111', borderRadius:20, padding:20, border:'1px solid #222' }}>
            {resetSent ? (
              <>
                <div style={{ textAlign:'center', padding:'8px 0 16px' }}>
                  <div style={{ fontSize:44, marginBottom:12 }}>📧</div>
                  <p style={{ fontWeight:800, fontSize:16, color:'#fff' }}>Reset link sent!</p>
                  <p style={{ fontSize:13, color:'#555', marginTop:6 }}>Check your email and follow the link to reset your password.</p>
                </div>
                <button onClick={() => { setResetMode(false); setResetSent(false) }}
                  style={{ width:'100%', background:Y, border:'none', borderRadius:14, padding:16, fontSize:15, fontWeight:800, cursor:'pointer', fontFamily:'inherit' }}>
                  Back to Sign In
                </button>
              </>
            ) : (
              <>
                <p style={{ fontWeight:800, fontSize:16, color:'#fff', marginBottom:4 }}>Forgot Password</p>
                <p style={{ fontSize:13, color:'#555', marginBottom:16 }}>Enter your email to receive a reset link</p>
                {inp(email, setEmail, 'you@example.com', 'email')}
                <button onClick={sendReset} disabled={busy}
                  style={{ width:'100%', background:Y, border:'none', borderRadius:14, padding:16, fontSize:15, fontWeight:800, cursor:'pointer', fontFamily:'inherit', opacity:busy?0.6:1 }}>
                  {busy ? 'Sending...' : 'Send Reset Link →'}
                </button>
                <button onClick={() => setResetMode(false)}
                  style={{ display:'block', width:'100%', marginTop:10, background:'none', border:'none', color:'#555', fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
                  Back to Sign In
                </button>
              </>
            )}
          </div>
        ) : (
          <div style={{ background:'#111', borderRadius:20, padding:20, border:'1px solid #222' }}>
            <div style={{ display:'flex', marginBottom:16, borderBottom:'1px solid #222' }}>
              {[['Sign In', false],['Sign Up', true]].map(([l,r]) => (
                <button key={l} onClick={() => setIsReg(r)}
                  style={{ flex:1, padding:'8px 0', border:'none', borderBottom:'2px solid '+(isReg===r?Y:'transparent'),
                    background:'none', fontWeight:700, fontSize:13, color:isReg===r?Y:'#555', cursor:'pointer', fontFamily:'inherit' }}>
                  {l}
                </button>
              ))}
            </div>
            {inp(email, setEmail, 'you@example.com', 'email')}
            {inp(pass, setPass, 'Password (min 6 chars)', 'password')}
            <button onClick={emailAuth} disabled={busy}
              style={{ width:'100%', background:Y, border:'none', borderRadius:14, padding:16, fontSize:15, fontWeight:800, cursor:'pointer', fontFamily:'inherit', opacity:busy?0.6:1 }}>
              {busy ? '...' : isReg ? 'Create Account →' : 'Sign In →'}
            </button>
            {!isReg && (
              <button onClick={() => setResetMode(true)}
                style={{ display:'block', width:'100%', marginTop:10, background:'none', border:'none', color:'#555', fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
                Forgot password?
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
