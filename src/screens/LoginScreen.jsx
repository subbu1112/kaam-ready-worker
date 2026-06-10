import { useState } from 'react'
import { sb } from '../lib/supabase'
const Y='#F5C000'
export default function LoginScreen({ setScreen, showToast }) {
  const [email, setEmail] = useState('')
  const [busy,  setBusy]  = useState(false)
  async function send() {
    if (!email.includes('@')) { showToast('Enter a valid email'); return }
    setBusy(true)
    const { error } = await sb.auth.signInWithOtp({ email })
    setBusy(false)
    if (error) { showToast(error.message); return }
    localStorage.setItem('kr_worker_email', email)
    setScreen('otp'); showToast('OTP sent to '+email)
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
          <p style={{ fontSize:13, color:'#555', marginBottom:16 }}>Sign in to start accepting jobs</p>
          <label style={{ fontSize:12, fontWeight:700, color:'#555', display:'block', marginBottom:6 }}>EMAIL ADDRESS</label>
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="you@example.com"
            style={{ width:'100%', border:'1.5px solid #2a2a2a', borderRadius:12, padding:'13px 14px', fontSize:14, outline:'none', fontFamily:'inherit', background:'#1a1a1a', color:'#fff', marginBottom:14 }} />
          <button onClick={send} disabled={busy}
            style={{ width:'100%', background:Y, border:'none', borderRadius:14, padding:16, fontSize:15, fontWeight:800, cursor:'pointer', fontFamily:'inherit', opacity:busy?0.6:1 }}>
            {busy?'Sending...':'Send OTP →'}
          </button>
        </div>
      </div>
    </div>
  )
}
