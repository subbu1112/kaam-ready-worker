import { useState, useEffect, Component } from 'react'
import { sb } from './lib/supabase'
import LoginScreen    from './screens/LoginScreen'
import OTPScreen      from './screens/OTPScreen'
import OnboardScreen  from './screens/OnboardScreen'
import HomeScreen     from './screens/HomeScreen'
import EarningsScreen from './screens/EarningsScreen'
import ProfileScreen  from './screens/ProfileScreen'
import JobHistoryScreen from './screens/JobHistoryScreen'
import SettingsScreen from './screens/SettingsScreen'
import TabBar         from './components/TabBar'
import Toast          from './components/Toast'
import TermsModal, { termsAccepted, acceptTerms } from './components/TermsModal'

class TabErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error, info) { console.error('Tab crash:', error, info) }
  render() {
    if (this.state.error) {
      return (
        <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:32 }}>
          <p style={{ fontSize:32, marginBottom:12 }}>!</p>
          <p style={{ color:'#fff', fontWeight:800, fontSize:16, marginBottom:8, textAlign:'center' }}>Something went wrong</p>
          <p style={{ color:'#555', fontSize:12, textAlign:'center', marginBottom:20 }}>{this.state.error?.message || 'Unknown error'}</p>
          <button onClick={() => this.setState({ error: null })}
            style={{ background:'#F5C000', border:'none', borderRadius:12, padding:'12px 24px', fontWeight:800, cursor:'pointer', fontFamily:'inherit' }}>
            Try Again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export default function App() {
  const [screen,  setScreen]  = useState('login')
  const [tab,     setTab]     = useState('home')
  const [user,    setUser]    = useState(null)
  const [profile, setProfile] = useState(null)
  const [toast,   setToast]   = useState(null)
  const [showTerms, setShowTerms] = useState(false)

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => {
      if (data.session?.user) { setUser(data.session.user); loadProfile(data.session.user.id) }
    })
    const { data: { subscription } } = sb.auth.onAuthStateChange((_e, session) => {
      if (session?.user) { setUser(session.user); loadProfile(session.user.id) }
      else { setUser(null); setProfile(null); setScreen('login') }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(uid) {
    const { data } = await sb.from('workers').select('*').eq('id', uid).single()
    if (data) {
      setProfile(data)
      setScreen(data.onboarding_done ? 'main' : 'onboard')
      if (!termsAccepted()) setShowTerms(true)
    } else {
      setScreen('onboard')
    }
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 2600) }

  const ctx = { user, profile, setProfile, setScreen, setTab, showToast }

  if (screen === 'login')  return <><LoginScreen  {...ctx} />{toast && <Toast msg={toast} />}</>
  if (screen === 'otp')    return <><OTPScreen    {...ctx} />{toast && <Toast msg={toast} />}</>
  if (screen === 'onboard') return <><OnboardScreen {...ctx} />{toast && <Toast msg={toast} />}</>

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      background: '#111', maxWidth: 430, margin: '0 auto',
      overflow: 'hidden', position: 'relative',
    }}>
      {showTerms && <TermsModal onAccept={() => { acceptTerms(); setShowTerms(false) }} />}
      <TabErrorBoundary>
        {tab === 'home'       && <HomeScreen     {...ctx} />}
        {tab === 'earnings'   && <EarningsScreen {...ctx} />}
        {tab === 'history'    && <JobHistoryScreen {...ctx} />}
        {tab === 'settings'   && <SettingsScreen  {...ctx} />}
        {tab === 'profile'    && <ProfileScreen   {...ctx} />}
      </TabErrorBoundary>
      <TabBar tab={tab} setTab={setTab} />
      {toast && <Toast msg={toast} />}
    </div>
  )
}
