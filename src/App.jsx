import { useState, useEffect, lazy, Suspense, Component } from 'react'
import { sb } from './lib/supabase'
import TabBar  from './components/TabBar'
import NotificationBell from './components/NotificationBell'
import Toast   from './components/Toast'
import TermsModal, { termsAccepted, acceptTerms } from './components/TermsModal'

const LoginScreen      = lazy(() => import('./screens/LoginScreen'))
const OTPScreen        = lazy(() => import('./screens/OTPScreen'))
const OnboardScreen    = lazy(() => import('./screens/OnboardScreen'))
const HomeScreen       = lazy(() => import('./screens/HomeScreen'))
const EarningsScreen   = lazy(() => import('./screens/EarningsScreen'))
const ProfileScreen    = lazy(() => import('./screens/ProfileScreen'))
const JobHistoryScreen = lazy(() => import('./screens/JobHistoryScreen'))
const SettingsScreen   = lazy(() => import('./screens/SettingsScreen'))
const HelpScreen       = lazy(() => import('./screens/HelpScreen'))
const LegalScreen      = lazy(() => import('./screens/LegalScreen'))
const ReportScreen     = lazy(() => import('./screens/ReportScreen'))

const OVERLAYS = ['help','legal','report']

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

function PageLoader() {
  return (
    <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#111' }}>
      <div style={{ width:36, height:36, border:'3px solid #333', borderTop:'3px solid #F5C000', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

export default function App() {
  const [screen,    setScreen]    = useState('login')
  const [overlay,   setOverlay]   = useState(null)
  const [tab,       setTab]       = useState('home')
  const [user,      setUser]      = useState(null)
  const [profile,   setProfile]   = useState(null)
  const [toast,     setToast]     = useState(null)
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
    const { data } = await sb.from('workers')
      .select('id,name,phone,city,address,skill,skills,email,alternate_phone,kyc_status,onboarding_done,upi_id,account_status,is_online,rating,total_jobs,trust_score,wallet_balance,avatar_url,aadhar_submitted,aadhar_verified,aadhar_front_url,aadhar_back_url,pan_submitted,pan_verified,pan_front_url,pan_number,aadhaar_number,service_radius_km,working_hours_start,working_hours_end,referral_code,credit_balance,price_min,bank_account,bank_ifsc,bank_name')
      .eq('id', uid).single()
    if (data) {
      setProfile(data)
      setScreen(data.onboarding_done ? 'main' : 'onboard')
      if (!termsAccepted()) setShowTerms(true)
    } else {
      setScreen('onboard')
    }
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 2600) }

  function navigate(s) {
    if (OVERLAYS.includes(s)) { setOverlay(s) }
    else { setScreen(s) }
  }

  const ctx = { user, profile, setProfile, setScreen, setTab, showToast, navigate, reloadProfile: () => user && loadProfile(user.id) }

  const overlayStyle = { position:'absolute', inset:0, zIndex:100, background:'#111', display:'flex', flexDirection:'column' }

  return (
    <Suspense fallback={<PageLoader />}>
      {screen === 'login'   && <><LoginScreen   {...ctx} />{toast && <Toast msg={toast} />}</>}
      {screen === 'otp'     && <><OTPScreen     {...ctx} />{toast && <Toast msg={toast} />}</>}
      {screen === 'onboard' && <><OnboardScreen {...ctx} />{toast && <Toast msg={toast} />}</>}
      {screen === 'main'    && (
        <div style={{
          height:'100vh', display:'flex', flexDirection:'column',
          background:'#111', maxWidth:430, margin:'0 auto',
          overflow:'hidden', position:'relative',
        }}>
          {showTerms && <TermsModal onAccept={() => { acceptTerms(); setShowTerms(false) }} />}
          {/* Notification bell — floats top-right on main screens */}
          {!overlay && (
            <div style={{ position:'absolute', top:8, right:12, zIndex:90 }}>
              <NotificationBell user={user} />
            </div>
          )}
          <TabErrorBoundary>
            {tab === 'home'     && <HomeScreen       {...ctx} />}
            {tab === 'earnings' && <EarningsScreen   {...ctx} />}
            {tab === 'history'  && <JobHistoryScreen {...ctx} />}
            {tab === 'settings' && <SettingsScreen   {...ctx} />}
            {tab === 'profile'  && <ProfileScreen    {...ctx} />}
          </TabErrorBoundary>
          <TabBar tab={tab} setTab={t => { setOverlay(null); setTab(t) }} />
          {overlay === 'help'   && <div style={overlayStyle}><HelpScreen   {...ctx} onBack={() => setOverlay(null)} /></div>}
          {overlay === 'legal'  && <div style={overlayStyle}><LegalScreen  {...ctx} onBack={() => setOverlay(null)} /></div>}
          {overlay === 'report' && <div style={overlayStyle}><ReportScreen {...ctx} onBack={() => setOverlay(null)} /></div>}
          {toast && <Toast msg={toast} />}
        </div>
      )}
    </Suspense>
  )
}
