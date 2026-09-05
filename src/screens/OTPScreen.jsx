import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'
const Y = '#F5C000'
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY

export default function OTPScreen({ setScreen, showToast }) {
  const [otp,       setOtp]       = useState(['','','','','',''])
  const [busy,      setBusy]      = useState(false)
  const [resending, setResending] = useState(false)
  const [cooldown,  setCooldown]  = useState(30)

  useEffect(() => {
    const id = setInterval(() => {
      setCooldown(c => { if (c <= 1) { clearInterval(id); return 0 } return c - 1 })
    }, 1000)
    return () => clearInterval(id)
  }, [])

  function handleKey(i, val) {
    val = val.replace(/\D/g,'').slice(-1)
    const n=[...otp]; n[i]=val; setOtp(n)
    if (val && i < 5) document.getElementById('wo'+(i+1))?.focus()
  }

  async function verify() {
    const code = otp.join('')
    if (code.length < 6) { showToast('Enter all 6 digits'); return }
    setBusy(true)
    const phone = sessionStorage.getItem('kr_worker_phone') || ''
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON },
        body: JSON.stringify({ phone, otp: code }),
      })
      const data = await res.json()
      if (!res.ok) { showToast(data.error || 'Invalid OTP'); return }

      const { error } = await sb.auth.verifyOtp({
        token_hash: data.token_hash,
        type: 'email',
      })
      if (error) { showToast('Auth error: ' + error.message); return }
      sessionStorage.removeItem('kr_worker_phone')
    } catch {
      showToast('Network error — try again')
    } finally {
      setBusy(false)
    }
  }

  async function resendOTP() {
    const phone = sessionStorage.getItem('kr_worker_phone') || ''
    if (!phone) { showToast('Phone not found — go back and try again'); return }
    setResending(true)
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON },
        body: JSON.stringify({ phone }),
      })
      const data = await res.json()
      if (!res.ok) { showToast(data.error || 'Failed to resend OTP'); return }
      showToast('New OTP sent!')
      setOtp(['','','','','',''])
      document.getElementById('wo0')?.focus()
      setCooldown(30)
      const id = setInterval(() => {
        setCooldown(c => { if (c <= 1) { clearInterval(id); return 0 } return c - 1 })
      }, 1000)
    } catch { showToast('Network error — try again') }
    finally { setResending(false) }
  }

  return (
    <div style={{ minHeight:'100dvh', background:'#F4F5F6', maxWidth:430, margin:'0 auto', width:'100%', display:'flex', flexDirection:'column', overflowY:'auto' }}>
      <div style={{ background:Y, padding:'16px 24px 20px' }}>
        <button onClick={() => setScreen('login')} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer' }}>←</button>
        <h2 style={{ fontWeight:800, fontSize:20, marginTop:8 }}>Enter OTP</h2>
        <p style={{ fontSize:13, color:'rgba(0,0,0,.6)' }}>6-digit code sent to +91 {sessionStorage.getItem('kr_worker_phone') || '••••••••••'}</p>
      </div>
      <div style={{ padding:24, flex:1 }}>
        <div style={{ background:'#FFFFFF', borderRadius:20, padding:20, border:'1px solid #E9E9EB', boxShadow:'0 1px 3px rgba(16,24,40,.06)' }}>
          <div style={{ display:'flex', gap:8, justifyContent:'center', margin:'8px 0 16px' }}>
            {otp.map((v,i) => (
              <input key={i} id={'wo'+i} maxLength={1} inputMode="numeric" value={v}
                onChange={e => handleKey(i, e.target.value)}
                onKeyDown={e => { if (e.key==='Backspace' && !v && i>0) document.getElementById('wo'+(i-1))?.focus() }}
                style={{ width:46, height:54, border:'2px solid #E9E9EB', borderRadius:12,
                  textAlign:'center', fontSize:22, fontWeight:700, outline:'none',
                  fontFamily:'inherit', background:'#FAFAFA', color:'#1A1A1A' }} />
            ))}
          </div>
          <button onClick={verify} disabled={busy}
            style={{ width:'100%', background:Y, border:'none', borderRadius:14, padding:16, fontSize:15, fontWeight:800, cursor:'pointer', fontFamily:'inherit', opacity:busy?0.6:1 }}>
            {busy ? 'Verifying...' : 'Verify & Enter →'}
          </button>
          <div style={{ textAlign:'center', marginTop:14 }}>
            {cooldown > 0
              ? <p style={{ fontSize:13, color:'#9A9AA0' }}>Resend OTP in {cooldown}s</p>
              : <button onClick={resendOTP} disabled={resending}
                  style={{ background:'none', border:'none', color:'#B8900A', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                  {resending ? 'Sending...' : 'Resend OTP'}
                </button>
            }
          </div>
        </div>
      </div>
    </div>
  )
}
