import { useState } from 'react'
const Y = '#F5C000'
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY

export default function LoginScreen({ setScreen, showToast }) {
  const [phone, setPhone] = useState('')
  const [busy,  setBusy]  = useState(false)

  async function send() {
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
      localStorage.setItem('kr_worker_phone', phone)
      setScreen('otp')
      showToast('OTP sent via SMS!')
    } catch {
      showToast('Network error — try again')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ height:'100vh', background:'#0A0A0A', display:'flex', flexDirection:'column', maxWidth:430, margin:'0 auto', width:'100%' }}>
      <div style={{ background:Y, padding:'40px 24px 28px', textAlign:'center' }}>
        <div style={{ fontSize:56, marginBottom:10 }}>⚡</div>
        <h1 style={{ fontSize:28, fontWeight:800 }}>Kaam Ready</h1>
        <p style={{ fontSize:13, color:'rgba(0,0,0,.6)', marginTop:4 }}>Worker Dashboard</p>
      </div>
      <div style={{ padding:24, display:'flex', flexDirection:'column', gap:14, flex:1 }}>
        <div style={{ background:'#111', borderRadius:20, padding:20, border:'1px solid #222' }}>
          <p style={{ fontWeight:800, fontSize:16, color:'#fff', marginBottom:4 }}>Welcome, Worker 👷</p>
          <p style={{ fontSize:13, color:'#555', marginBottom:16 }}>Enter your mobile number — we'll send an OTP</p>
          <div style={{ display:'flex', gap:8, marginBottom:14 }}>
            <div style={{ background:'#1a1a1a', borderRadius:12, padding:'13px 14px', fontWeight:700, fontSize:14, color:'#fff', border:'1.5px solid #2a2a2a' }}>🇮🇳 +91</div>
            <input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g,'').slice(0,10))}
              placeholder="98765 43210" type="tel"
              style={{ flex:1, border:'1.5px solid #2a2a2a', borderRadius:12, padding:'13px 14px',
                fontSize:14, outline:'none', fontFamily:'inherit', background:'#1a1a1a', color:'#fff' }} />
          </div>
          <button onClick={send} disabled={busy}
            style={{ width:'100%', background:Y, border:'none', borderRadius:14, padding:16, fontSize:15, fontWeight:800, cursor:'pointer', fontFamily:'inherit', opacity:busy?0.6:1 }}>
            {busy ? 'Sending...' : 'Send OTP →'}
          </button>
        </div>
      </div>
    </div>
  )
}
