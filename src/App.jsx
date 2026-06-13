import { useState, useEffect } from 'react'
import { sb } from './lib/supabase'
import OneSignal from 'react-onesignal'
import LandingScreen  from './screens/LandingScreen'
import LoginScreen    from './screens/LoginScreen'
import OTPScreen      from './screens/OTPScreen'
import OnboardScreen  from './screens/OnboardScreen'
import HomeScreen     from './screens/HomeScreen'
import EarningsScreen from './screens/EarningsScreen'
import ProfileScreen  from './screens/ProfileScreen'
import TabBar         from './components/TabBar'
import Toast          from './components/Toast'
import TermsModal, { termsAccepted, acceptTerms } from './components/TermsModal'

export default function App() {
  const [screen,  setScreen]  = useState('landing')
  const [tab,     setTab]     = useState('home')
  const [user,    setUser]    = useState(null)
  const [profile, setProfile] = useState(null)
  const [toast,   setToast]   = useState(null)
  const [showTerms, setShowTerms] = useState(false)

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
    if (data) {
      setProfile(data)
      setScreen(data.onboarding_done ? 'main' : 'onboard')
      if (!termsAccepted()) setShowTerms(true)
      // Set OneSignal tags so push notifications can target this worker by city
      try {
        await OneSignal.sendTags({ city: data.city || '', worker_id: uid, skill: data.skill || '' })
        await OneSignal.setExternalUserId(uid)
      } catch(e) { console.warn('OneSignal tag error:', e) }
    } else setScreen('onboard')
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 2600) }

  const ctx = { user, profile, setProfile, showToast, setScreen, setTab, loadProfile }

  if (screen==='landing') return <LandingScreen setScreen={setScreen} />
  if (screen==='login')   return <><LoginScreen   {...ctx} />{toast && <Toast msg={toast} />}</>
  if (screen==='otp')     return <><OTPScreen     {...ctx} />{toast && <Toast msg={toast} />}</>
  if (screen==='onboard') return <><OnboardScreen {...ctx} />{toast && <Toast msg={toast} />}</>

  return (
    <div style={{ height:'100dvh', minHeight:'-webkit-fill-available', display:'flex', flexDirection:'column', background:'#FAFAFA', maxWidth:430, margin:'0 auto', overflow:'hidden', position:'relative' }}>
      {tab==='home'     && <HomeScreen     {...ctx} />}
      {tab==='earnings' && <EarningsScreen {...ctx} />}
      {tab==='profile'  && <ProfileScreen  {...ctx} />}
      <TabBar tab={tab} setTab={setTab} />
      {showTerms && <TermsModal dark onAccept={() => { acceptTerms(); setShowTerms(false) }} />}
      {toast && <Toast msg={toast} />}
    </div>
  )
}
