import { useState, useEffect, Component } from 'react'
import { sb } from './lib/supabase'
import OneSignal from 'react-onesignal'
import LoginScreen    from './screens/LoginScreen'
import OTPScreen      from './screens/OTPScreen'
import OnboardScreen  from './screens/OnboardScreen'
import HomeScreen     from './screens/HomeScreen'
import EarningsScreen from './screens/EarningsScreen'
import ProfileScreen  from './screens/ProfileScreen'
import TabBar         from './components/TabBar'
import Toast          from './components/Toast'
import TermsModal, { termsAccepted, acceptTerms } from './components/TermsModal'

// Catches any JS crash inside a tab so the whole app doesn't go blank
class TabErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error, info) { console.error('Tab crash:', error, info) }
  render() {
    if (this.state.error) {
      return (
        <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:32 }}>
          <p style={{ fontSize:32, marginBottom:12 }}>⚠️</p>
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
      try {
        await OneSignal.sendTags({ city: data.city || '', worker_id: uid, skill: data.skill || '' })
        await OneSignal.setExternalUserId(uid)
      } 