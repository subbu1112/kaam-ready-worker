import { useState } from 'react'
import { sb } from '../lib/supabase'
const Y='#F5C000'
export default function OTPScreen({ setScreen, showToast }) {
  const [otp,  setOtp]  = useState(['','','','','',''])
  const [busy, setBusy] = useState(false)
  function handleKey(i, val) {
    val = val.replace(/\D/g,'').slice(-1)
    const n=[...otp]; n[i]=val; setOtp(n)
    if (val && i < 5) document.getElementById('wo'+(i+1))?.focus()
  }
  async function verify() {
    const code = otp.join('')
    if (code.length < 6) { showToast('Enter all 6 digits'); return }
    setBusy(true)
    const email = localStorage.getItem('kr_worker_email')||''
    const { error } = await sb.auth.verifyOtp({ email, token:code, type:'email' })
    setBusy(false)
    if (error) { showToast('Invalid OTP'); return }
  }
  return (
    <div style={{ height:'100vh', background:'#0A0A0A', maxWidth:430, margin:'0 auto', width:'100%', display:'flex', flexDirection:'column' }}>
      <div style={{ background:Y, padding:'16px 24px 20px' }}>
        <button onClick={() => setScreen('login')} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer' }}>←</button>
        <h2 style={{ fontWeight:800, fontSize:20, marginTop:8 }}>Check your email</h2>
        <p style={{ fontSize:13, color:'rgba(0,0,0,.6)' }}>6-digit code sent</p>
      </div>
      <div style={{ padding:24, flex:1 }}>
        <div style={{ background:'#111', borderRadius:20, padding:20, border:'1px solid #222' }}>
          <div style={{ display:'flex', gap:8, justifyContent:'center', margin:'8px 0 16px' }}>
            {otp.map((v,i) => (
              <input key={i} id={'wo'+i} maxLength={1} inputMode="numeric" value={v} onChange={e => handleKey(i,e.target.value)}
                style={{ width:46, height:54, border:'2px solid #2a2a2a', borderRadius:12, textAlign:'center', fontSize:22, fontWeight:700, outline:'none', fontFamily:'inherit', background:'#1a1a1a', color:'#fff' }} />
            ))}
          </div>
          <button onClick={verify} disabled={busy}
            style={{ width:'100%', background:Y, border:'none', borderRadius:14, padding:16, fontSize:15, fontWeight:800, cursor:'pointer', fontFamily:'inherit', opacity:busy?0.6:1 }}>
            {busy?'Verifying...':'Verify & Enter →'}
          </button>
        </div>
      </div>
    </div>
  )
}
