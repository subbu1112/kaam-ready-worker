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

  async function googleAuth() {
    setBusy(true)
    try {
      const { sb } = await import('../lib/supabase')
      const { error } = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      })
      if (error) showToast(error.message)
    } catch (e) { showToast('Error: ' + e.message) }
    finally { setBusy(false) }
  }

  const inp = (val, set, placeholder, type='text') => (
    <input value={val} onChange={e => set(e.target.value)} placeholder={placeholder} type={type}
      style={{ width:'100%', border:'1.5px solid #E9E9EB', borderRadius:12, padding:'13px 14px',
        fontSize:14, outline:'none', fontFamily:'inherit', background:'#FAFAFA', color:'#1A1A1A',
        marginBottom:12, boxSizing:'border-box' }} />
  )

  return (
    <div style={{ minHeight:'100dvh', background:'#F4F5F6', display:'flex', flexDirection:'column', maxWidth:430, margin:'0 auto', width:'100%', overflowY:'auto' }}>
      <div style={{ background:Y, padding:'18px 20px 28px', textAlign:'center', position:'relative' }}>
        {setScreen && (
          <button onClick={() => setScreen('landing')}
            style={{ position:'absolute', left:14, top:14, background:'rgba(0,0,0,.10)', border:'none',
              borderRadius:9, padding:'7px 13px', fontSize:12.5, fontWeight:700, cursor:'pointer',
              fontFamily:'inherit', color:'#1A1A1A' }}>
            ← Back
          </button>
        )}
        <img src="/icon-192.png" alt="Kaam Ready" style={{ width:72, height:72, borderRadius:16, marginBottom:10, boxShadow:'0 4px 14px rgba(0,0,0,.2)' }} />
        <h1 style={{ fontSize:28, fontWeight:800 }}>Kaam Ready</h1>
        <p style={{ fontSize:13, color:'rgba(0,0,0,.6)', marginTop:4 }}>Worker Dashboard</p>
      </div>

      <div style={{ display:'flex', margin:'20px 20px 0', background:'#FFFFFF', border:'1px solid #E9E9EB', borderRadius:12, padding:4, gap:4 }}>
        {[['phone','📱 Phone OTP'],['email','✉️ Email']].map(([t,l]) => (
          <button key={t} onClick={() => { setTab(t); setResetMode(false); setResetSent(false) }}
            style={{ flex:1, padding:'10px 0', borderRadius:9, border:'none', fontWeight:700, fontSize:13,
              background:tab===t?Y:'transparent', color:tab===t?'#000':'#9A9AA0',
              cursor:'pointer', fontFamily:'inherit' }}>
            {l}
          </button>
        ))}
      </div>

      <div style={{ padding:20, display:'flex', flexDirection:'column', gap:14, flex:1 }}>
        {tab === 'phone' ? (
          <div style={{ background:'#FFFFFF', borderRadius:20, padding:20, border:'1px solid #E9E9EB', boxShadow:'0 1px 3px rgba(16,24,40,.06)' }}>
            <p style={{ fontWeight:800, fontSize:16, color:'#1A1A1A', marginBottom:4 }}>Sign in with Phone</p>
            <p style={{ fontSize:13, color:'#9A9AA0', marginBottom:16 }}>We'll send a 6-digit OTP via SMS</p>
            <div style={{ display:'flex', gap:8, marginBottom:14 }}>
              <div style={{ background:'#FAFAFA', borderRadius:12, padding:'13px 14px', fontWeight:700, fontSize:14, color:'#1A1A1A', border:'1.5px solid #E9E9EB' }}>🇮🇳 +91</div>
              <input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g,'').slice(0,10))}
                placeholder="98765 43210" type="tel"
                style={{ flex:1, border:'1.5px solid #E9E9EB', borderRadius:12, padding:'13px 14px',
                  fontSize:14, outline:'none', fontFamily:'inherit', background:'#FAFAFA', color:'#1A1A1A' }} />
            </div>
            <button onClick={sendOTP} disabled={busy}
              style={{ width:'100%', background:Y, border:'none', borderRadius:14, padding:16, fontSize:15, fontWeight:800, cursor:'pointer', fontFamily:'inherit', opacity:busy?0.6:1 }}>
              {busy ? 'Sending...' : 'Send OTP →'}
            </button>
          </div>
        ) : resetMode ? (
          <div style={{ background:'#FFFFFF', borderRadius:20, padding:20, border:'1px solid #E9E9EB', boxShadow:'0 1px 3px rgba(16,24,40,.06)' }}>
            {resetSent ? (
              <>
                <div style={{ textAlign:'center', padding:'8px 0 16px' }}>
                  <div style={{ fontSize:44, marginBottom:12 }}>📧</div>
                  <p style={{ fontWeight:800, fontSize:16, color:'#1A1A1A' }}>Reset link sent!</p>
                  <p style={{ fontSize:13, color:'#9A9AA0', marginTop:6 }}>Check your email and follow the link to reset your password.</p>
                </div>
                <button onClick={() => { setResetMode(false); setResetSent(false) }}
                  style={{ width:'100%', background:Y, border:'none', borderRadius:14, padding:16, fontSize:15, fontWeight:800, cursor:'pointer', fontFamily:'inherit' }}>
                  Back to Sign In
                </button>
              </>
            ) : (
              <>
                <p style={{ fontWeight:800, fontSize:16, color:'#1A1A1A', marginBottom:4 }}>Forgot Password</p>
                <p style={{ fontSize:13, color:'#9A9AA0', marginBottom:16 }}>Enter your email to receive a reset link</p>
                {inp(email, setEmail, 'you@example.com', 'email')}
                <button onClick={sendReset} disabled={busy}
                  style={{ width:'100%', background:Y, border:'none', borderRadius:14, padding:16, fontSize:15, fontWeight:800, cursor:'pointer', fontFamily:'inherit', opacity:busy?0.6:1 }}>
                  {busy ? 'Sending...' : 'Send Reset Link →'}
                </button>
                <button onClick={() => setResetMode(false)}
                  style={{ display:'block', width:'100%', marginTop:10, background:'none', border:'none', color:'#9A9AA0', fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
                  Back to Sign In
                </button>
              </>
            )}
          </div>
        ) : (
          <div style={{ background:'#FFFFFF', borderRadius:20, padding:20, border:'1px solid #E9E9EB', boxShadow:'0 1px 3px rgba(16,24,40,.06)' }}>
            <div style={{ display:'flex', marginBottom:16, borderBottom:'1px solid #E9E9EB' }}>
              {[['Sign In', false],['Sign Up', true]].map(([l,r]) => (
                <button key={l} onClick={() => setIsReg(r)}
                  style={{ flex:1, padding:'8px 0', border:'none', borderBottom:'2px solid '+(isReg===r?'#1A1A1A':'transparent'),
                    background:'none', fontWeight:700, fontSize:13, color:isReg===r?'#1A1A1A':'#9A9AA0', cursor:'pointer', fontFamily:'inherit' }}>
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
                style={{ display:'block', width:'100%', marginTop:10, background:'none', border:'none', color:'#9A9AA0', fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
                Forgot password?
              </button>
            )}
          </div>
        )}

        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ flex:1, height:1, background:'#E4E4E7' }} />
          <span style={{ fontSize:12, color:'#9A9AA0' }}>or</span>
          <div style={{ flex:1, height:1, background:'#E4E4E7' }} />
        </div>
        <button onClick={googleAuth} disabled={busy}
          style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, width:'100%',
            background:'#FFFFFF', border:'1.5px solid #E9E9EB', borderRadius:14, padding:'14px', fontSize:14, fontWeight:700,
            cursor:'pointer', fontFamily:'inherit', color:'#1A1A1A', opacity:busy?0.6:1 }}>
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.2-.1-2.3-.4-3.5z"/>
            <path fill="#FF3D00" d="M3.3 12.7l6.6 4.8C11.5 14 17.3 10 24 10c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 4.1 29.6 2 24 2 15.3 2 7.8 6.9 3.3 12.7z"/>
            <path fill="#4CAF50" d="M24 46c5.5 0 10.4-2.1 14.1-5.5l-6.5-5.5C29.6 36.8 26.9 38 24 38c-5.2 0-9.6-3.3-11.2-8l-6.6 5C9.7 41 16.3 46 24 46z"/>
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.5 5.5C40.9 36.3 45 31 45 24c0-1.2-.1-2.3-.4-3.5z"/>
          </svg>
          Continue with Google
        </button>
      </div>
    </div>
  )
}
