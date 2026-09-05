import { useState, useEffect, lazy, Suspense, Component } from 'react'
import OneSignal from 'react-onesignal'
import { sb } from './lib/supabase'
import TabBar  from './components/TabBar'
import { C } from './theme'
import Toast   from './components/Toast'
import TermsModal, { termsAccepted, acceptTerms } from './components/TermsModal'
import { entryScreen } from './lib/installed'

const LandingScreen    = lazy(() => import('./screens/LandingScreen'))
const LoginScreen      = lazy(() => import('./screens/LoginScreen'))
const OTPScreen        = lazy(() => import('./screens/OTPScreen'))
const OnboardScreen    = lazy(() => import('./screens/OnboardScreen'))
const HomeScreen       = lazy(() => import('./screens/HomeScreen'))
const EarningsScreen   = lazy(() => import('./screens/EarningsScreen'))
const ProfileScreen    = lazy(() => import('./screens/ProfileScreen'))
const JobHistoryScreen = lazy(() => import('./screens/JobHistoryScreen'))
const SettingsScreen   = lazy(() => import('./screens/SettingsScreen'))
const WalletScreen        = lazy(() => import('./screens/WalletScreen'))
const RewardsScreen       = lazy(() => import('./screens/RewardsScreen'))
const NotificationsScreen = lazy(() => import('./screens/NotificationsScreen'))

// Tie this device's push subscription to the worker's account and tag it with
// city + skill, so booking alerts reach the right workers. Safe to call on
// every login; failures are non-blocking.
async function registerPush(uid, prof) {
  try {
    await (window.krPushReady || Promise.resolve())
    await OneSignal.login(uid)
    await OneSignal.User.addTags({
      role:  'worker',
      city:  prof?.city  || '',
      skill: prof?.skill || '',
    })
    try { await OneSignal.Slidedown.promptPush() }
    catch { try { await OneSignal.Notifications.requestPermission() } catch { /* denied */ } }
  } catch (e) {
    console.warn('Push setup skipped:', e?.message || e)
  }
}

class TabErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error, info) { console.error('Tab crash:', error, info) }
  render() {
    if (this.state.error) {
      return (
        <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:32, background:C.page }}>
          <p style={{ fontSize:32, marginBottom:12 }}>⚠️</p>
          <p style={{ color:C.text, fontWeight:800, fontSize:16, marginBottom:8, textAlign:'center' }}>Something went wrong</p>
          <p style={{ color:C.text3, fontSize:12, textAlign:'center', marginBottom:20 }}>{this.state.error?.message || 'Unknown error'}</p>
          <button onClick={() => this.setState({ error: null })}
            style={{ background:C.yellow, border:'none', borderRadius:12, padding:'12px 24px', fontWeight:800, cursor:'pointer', fontFamily:'inherit' }}>
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
    <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:C.page }}>
      <div style={{ width:36, height:36, border:'3px solid '+C.line, borderTop:'3px solid '+C.yellow, borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

export default function App() {
  // Web visitors get the public home page; the installed app goes straight to
  // sign-in, because someone who already installed it does not need the pitch.
  const [screen,    setScreen]    = useState(entryScreen)
  const [tab,       setTab]       = useState('home')
  const [user,      setUser]      = useState(null)
  const [profile,   setProfile]   = useState(null)
  const [toast,     setToast]     = useState(null)
  const [showTerms, setShowTerms] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    const failsafe = setTimeout(() => setAuthChecked(true), 6000)
    sb.auth.getSession().then(({ data }) => {
      if (data.session?.user) { setUser(data.session.user); loadProfile(data.session.user.id) }
      else setAuthChecked(true)
    }).catch(() => setAuthChecked(true)).finally(() => clearTimeout(failsafe))
    const { data: { subscription } } = sb.auth.onAuthStateChange((_e, session) => {
      if (session?.user) { setUser(session.user); loadProfile(session.user.id) }
      // Signing out returns to the public page, not to a bare login form.
      else { setUser(null); setProfile(null); setScreen(entryScreen()); setAuthChecked(true) }
    })
    return () => subscription.unsubscribe()
  }, [])

  // The signed-in shell is a fixed, non-scrolling phone layout; the landing
  // page is a normal scrolling document. Only lock the page for the former.
  useEffect(() => {
    const locked = screen === 'main'
    document.documentElement.classList.toggle('kr-app-locked', locked)
    return () => document.documentElement.classList.remove('kr-app-locked')
  }, [screen])

  async function logConsentOnce(uid) {
    try {
      if (localStorage.getItem('kr_consent_logged') === uid) return
      await sb.from('consent_logs').insert({
        user_id: uid, role: 'worker',
        consented_to: 'terms_and_privacy', consent_version: '2025-06',
        user_agent: navigator.userAgent,
      })
      localStorage.setItem('kr_consent_logged', uid)
    } catch { /* non-blocking */ }
  }

  async function loadProfile(uid) {
    logConsentOnce(uid)
    const { data } = await sb.from('workers')
      .select(`id,name,phone,city,address,skill,skills,email,alternate_phone,
               kyc_status,onboarding_done,upi_id,account_status,is_online,
               rating,total_jobs,trust_score,wallet_balance,avatar_url,
               aadhar_submitted,aadhar_verified,aadhar_front_url,aadhar_back_url,
               aadhaar_front_url,aadhaar_back_url,selfie_video_url,
               aadhaar_front_path,aadhaar_back_path,selfie_video_path,
               aadhaar_front_submitted_at,aadhaar_back_submitted_at,selfie_video_submitted_at,
               verification_submitted_at,kyc_rejection_reason,kyc_reviewed_at,kyc_resubmission_requested,
               pan_submitted,pan_verified,pan_front_url,pan_number,aadhaar_number,
               service_radius_km,working_hours_start,working_hours_end,
               referral_code,credit_balance,price_min,bank_account,bank_ifsc,bank_name,payout_method`)
      .eq('id', uid).single()
    if (data) {
      setProfile(data)
      setScreen(data.onboarding_done ? 'main' : 'onboard')
      if (!termsAccepted()) setShowTerms(true)
      registerPush(uid, data) // fire-and-forget: enable booking push alerts
    } else {
      setScreen('onboard')
    }
    setAuthChecked(true)
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 2600) }

  const ctx = { user, profile, setProfile, setScreen, setTab, showToast, reloadProfile: () => user && loadProfile(user.id) }

  // Hold the loader until we know whether there is a session, so a signed-in
  // worker never sees the marketing page flash before their jobs screen.
  if (!authChecked) return <PageLoader />

  return (
    <Suspense fallback={<PageLoader />}>
      {screen === 'landing' && <><LandingScreen setScreen={setScreen} />{toast && <Toast msg={toast} />}</>}
      {screen === 'login'   && <><LoginScreen   {...ctx} />{toast && <Toast msg={toast} />}</>}
      {screen === 'otp'     && <><OTPScreen     {...ctx} />{toast && <Toast msg={toast} />}</>}
      {screen === 'onboard' && <><OnboardScreen {...ctx} />{toast && <Toast msg={toast} />}</>}
      {screen === 'main'    && (
        <div className="kr-app-shell">
          {showTerms && <TermsModal onAccept={() => { acceptTerms(); setShowTerms(false) }} />}
          <TabErrorBoundary>
            {tab === 'home'          && <HomeScreen          {...ctx} />}
            {tab === 'earnings'      && <EarningsScreen      {...ctx} />}
            {tab === 'wallet'        && <WalletScreen        {...ctx} />}
            {tab === 'rewards'       && <RewardsScreen       {...ctx} />}
            {tab === 'notifications' && <NotificationsScreen {...ctx} />}
            {tab === 'history'       && <JobHistoryScreen    {...ctx} />}
            {tab === 'settings'      && <SettingsScreen      {...ctx} onBack={() => setTab('profile')} />}
            {tab === 'profile'       && <ProfileScreen       {...ctx} />}
          </TabErrorBoundary>
          <TabBar tab={tab} setTab={setTab} />
          {toast && <Toast msg={toast} />}
        </div>
      )}
    </Suspense>
  )
}
