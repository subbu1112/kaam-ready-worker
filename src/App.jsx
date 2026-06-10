import { useState, useEffect } from 'react'
import { sb } from './lib/supabase'
import LoginScreen    from './screens/LoginScreen'
import OTPScreen      from './screens/OTPScreen'
import OnboardScreen  from './screens/OnboardScreen'
import HomeScreen     from './screens/HomeScreen'
import EarningsScreen from './screens/EarningsScreen'
import ProfileScreen  from './screens/ProfileScreen'
import TabBar         from './components/TabBar'
import Toast          from './components/Toast'

export default function App() {
  const [screen,  setScreen]  = useState('login')
  const [tab,     setTab]     = useState('home')
  const [user,    setUser]    = useState(null)
  const [profile, setProfile] = useState(null)
  const [toast,   setToast]   = useState(null)

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => {
      if (data.session?.user) { setUser(data.session.user); loadProfile(data.session.user.id) }
    })
    sb.auth.onAuthStateChange((_e, session) => {
      if (session?.user) { setUser(session.user); loadProfile(session.user.id) }
      else { setUser(null); setProfile(null); setScreen('login') }
    })
  }, [])

  async function loadProfile(uid) {
    const { data } = await sb.from('workers').select('*').eq('id', uid).single()
    if (data) { setProfile(data); setScreen(data.onboarding_done?'main':'onboard') }
    else setScreen('onboard')
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 2600) }

  const ctx = { user, profile, setProfile, showToast, setScreen, setTab, loadProfile }

  if (screen==='login')   return <><LoginScreen   {...ctx} />{toast && <Toast msg={toast} />}</>
  if (screen==='otp')     return <><OTPScreen     {...ctx} />{toast && <Toast msg={toast} />}</>
  if (screen==='onboard') return <><OnboardScreen {...ctx} />{toast && <Toast msg={toast} />}</>

  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', background:'#0A0A0A', maxWidth:430, margin:'0 auto', overflow:'hidden', position:'relative' }}>
      {tab==='home'     && <HomeScreen     {...ctx} />}
      {tab==='earnings' && <EarningsScreen {...ctx} />}
      {tab==='profile'  && <ProfileScreen  {...ctx} />}
      <TabBar tab={tab} setTab={setTab} />
      {toast && <Toast msg={toast} />}
    </div>
  )
}
