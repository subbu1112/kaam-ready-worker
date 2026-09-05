import { useState, useEffect } from 'react'
import { C } from '../theme'
import ServiceAreaNotice from '../components/ServiceAreaNotice'

const Y = '#F5C000', YD = '#B8900A', YL = '#FFF7DA', BK = '#1A1A1A', GREEN = '#0FA958'

const TRADES = [
  { ico: '⚡', lbl: 'Electrician',  jobs: 'Wiring, switches, fans, lights' },
  { ico: '🔧', lbl: 'Plumber',      jobs: 'Pipes, taps, drainage, fitting' },
  { ico: '🧹', lbl: 'Cleaner',      jobs: 'Home deep-clean, office, sofa' },
  { ico: '🪚', lbl: 'Carpenter',    jobs: 'Furniture, doors, frames' },
  { ico: '🎨', lbl: 'Painter',      jobs: 'Interior, exterior, waterproofing' },
  { ico: '🐛', lbl: 'Pest Control', jobs: 'Cockroach, termite, mosquito' },
  { ico: '🔩', lbl: 'Mechanic',     jobs: 'Two-wheeler, home appliances' },
  { ico: '💪', lbl: 'Labourer',     jobs: 'Lifting, shifting, site help' },
  { ico: '🚨', lbl: 'Emergency',    jobs: '24×7 urgent call-outs' },
]

const STEPS = [
  { n: '1', ico: '📝', title: 'Register in minutes',
    desc: 'Your name, city and trade. Then upload your Aadhaar front and back and record a short selfie video.' },
  { n: '2', ico: '🛡️', title: 'Get verified',
    desc: 'Our team checks your documents. You will see the status in the app and be told straight away if anything needs redoing.' },
  { n: '3', ico: '🟢', title: 'Go on duty',
    desc: 'One switch. Job requests in your city and your trade start reaching your phone, with an alert you cannot miss.' },
  { n: '4', ico: '📍', title: 'See the distance, then decide',
    desc: 'Every request shows how far the customer is before you accept — 2.4 km, 750 m — so you never open Maps just to find out.' },
  { n: '5', ico: '💰', title: 'Finish and get paid',
    desc: 'Enter the customer code, send your bill, and your 90% lands in your wallet once the payment clears. Withdraw to UPI.' },
]

const BENEFITS = [
  { ico: '💰', title: 'Keep 90% of every job',   desc: 'A flat 10% platform fee, nothing else. No joining fee, no monthly charge, no commission on materials.' },
  { ico: '🕐', title: 'Work when you want',       desc: 'No shifts and no targets. Go on duty for two hours or ten — you decide, and you can decline any job.' },
  { ico: '📍', title: 'Distance before you accept',desc: 'The exact distance to the customer is on the request itself, so you never travel further than you meant to.' },
  { ico: '🧾', title: 'You set the final price',   desc: 'You quote after seeing the work — labour, materials and extras, itemised. The customer approves before paying.' },
  { ico: '📱', title: 'Everything on your phone',  desc: 'No office visits. Jobs, earnings, ratings and payouts all live in the app.' },
  { ico: '⭐', title: 'Build a rating that pays',  desc: 'Good ratings bring repeat customers, who can request you by name on their next booking.' },
]

const NEEDED = [
  { ico: '📱', t: 'An Android phone', d: 'With internet and location turned on.' },
  { ico: '🪪', t: 'Your Aadhaar card', d: 'Photos of the front and the back.' },
  { ico: '🎥', t: 'A selfie video',    d: 'Ten seconds, saying your name — we match it to your Aadhaar photo.' },
  { ico: '💳', t: 'A UPI ID',          d: 'Where your earnings get paid out.' },
]

const FAQS = [
  { q: 'Does it cost anything to join?',
    a: 'No. Registration is free and there is no monthly charge. KaamReady keeps 10% of each completed job — you keep the other 90%.' },
  { q: 'How long does verification take?',
    a: 'Usually within a day of submitting all three documents. You can see the status in the app, and if something is rejected you are told exactly why and can re-upload.' },
  { q: 'Do I have to accept every job?',
    a: 'No. Each request shows the service, the customer location, the distance and how many workers are needed. You can decline, and you can cancel with a reason after accepting if something genuinely goes wrong.' },
  { q: 'When do I get my money?',
    a: 'The customer pays KaamReady by UPI. Once that payment is verified, 90% is credited to your in-app wallet and you can request a withdrawal to your UPI ID.' },
  { q: 'Who decides the price?',
    a: 'You do. After the job you enter labour, materials and any additional charges. The customer sees the breakdown and approves it before paying.' },
  { q: 'Which cities is this in?',
    a: 'KaamReady operates across major Karnataka cities including Bengaluru and Mysuru. You pick your city during registration and only get jobs there.' },
  { q: 'Is my Aadhaar safe?',
    a: 'Your documents go to private storage that only KaamReady admins can open, and only to verify you. Customers and other workers never see them, and we only keep the last four digits of the number itself.' },
  { q: 'Can I work more than one trade?',
    a: 'Yes. Pick a primary skill and add any others during registration — you will get requests for all of them.' },
]

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ border: `1px solid ${C.line}`, borderRadius: 14, overflow: 'hidden', background: '#fff' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
          padding: '15px 17px', background: open ? YL : '#fff', border: 'none', cursor: 'pointer',
          fontFamily: 'inherit', textAlign: 'left' }}>
        <span style={{ fontSize: 14.5, fontWeight: 700, color: BK, flex: 1 }}>{q}</span>
        <span style={{ fontSize: 19, color: YD, flexShrink: 0, transition: '.2s', transform: open ? 'rotate(45deg)' : 'none' }}>+</span>
      </button>
      {open && (
        <div style={{ padding: '13px 17px 17px', background: '#FAFAFA', borderTop: `1px solid ${C.lineSoft}` }}>
          <p style={{ fontSize: 13.5, color: C.text2, lineHeight: 1.65 }}>{a}</p>
        </div>
      )}
    </div>
  )
}

function Card({ children, style = {} }) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${C.line}`, borderRadius: 16, padding: 18,
      boxShadow: '0 1px 2px rgba(16,24,40,.05)', ...style }}>{children}</div>
  )
}

/**
 * Public home page for worker.thekaamready.in.
 *
 * The worker app used to open straight on the sign-in form, so the domain had
 * no page explaining the offer — even though the site's own meta description
 * has always advertised one. This is that page: it works as a normal website
 * on a laptop and as a single column on a phone.
 */
export default function LandingScreen({ setScreen }) {
  const [navOpen,  setNavOpen]  = useState(false)
  const [deferred, setDeferred] = useState(null)   // PWA install prompt

  useEffect(() => {
    const onPrompt = e => { e.preventDefault(); setDeferred(e) }
    const onInstalled = () => setDeferred(null)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  async function installApp() {
    if (deferred) {
      deferred.prompt()
      try { await deferred.userChoice } catch { /* dismissed */ }
      setDeferred(null)
      return
    }
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
    alert(isIOS
      ? 'To install: tap the Share button, then "Add to Home Screen".'
      : 'To install: open your browser menu (⋮) and tap "Install app".')
  }

  function scrollTo(id) {
    setNavOpen(false)
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  const goJoin = () => setScreen('login')

  const primaryBtn = {
    background: Y, color: BK, border: 'none', borderRadius: 12, padding: '15px 26px',
    fontWeight: 800, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
  }
  const ghostBtn = {
    background: '#fff', color: BK, border: `1.5px solid ${C.line}`, borderRadius: 12, padding: '15px 26px',
    fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
  }
  const navLink = {
    background: 'none', border: 'none', fontSize: 14, fontWeight: 600, color: C.text2,
    cursor: 'pointer', padding: '6px 10px', fontFamily: 'inherit',
  }

  return (
    <div style={{ background: '#fff', minHeight: '100vh', color: BK }}>

      <ServiceAreaNotice />

      {/* ── Nav ───────────────────────────────────────────────────────── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(255,255,255,.96)',
        backdropFilter: 'blur(10px)', borderBottom: `1px solid ${C.line}` }}>
        <div className="kr-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 62 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <img src="/icon-192.png" alt="" style={{ width: 30, height: 30, borderRadius: 8 }} />
            <div>
              <span style={{ fontSize: 16, fontWeight: 900, letterSpacing: -.2 }}>Kaam Ready</span>
              <span style={{ fontSize: 10, fontWeight: 800, color: YD, background: YL, borderRadius: 5,
                padding: '2px 6px', marginLeft: 7, letterSpacing: .4 }}>WORKER</span>
            </div>
          </div>

          <div className="kr-desktop-only" style={{ alignItems: 'center', gap: 4 }}>
            <button style={navLink} onClick={() => scrollTo('how')}>How it works</button>
            <button style={navLink} onClick={() => scrollTo('trades')}>Trades</button>
            <button style={navLink} onClick={() => scrollTo('earnings')}>Earnings</button>
            <button style={navLink} onClick={() => scrollTo('faq')}>FAQ</button>
            <button onClick={goJoin} style={{ ...primaryBtn, padding: '9px 18px', fontSize: 13.5, marginLeft: 8 }}>
              Sign in / Join
            </button>
          </div>

          <div className="kr-mobile-only" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={goJoin} style={{ ...primaryBtn, padding: '9px 16px', fontSize: 13 }}>Join free</button>
            <button onClick={() => setNavOpen(o => !o)} aria-label="Menu"
              style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', lineHeight: 1, padding: 4 }}>
              {navOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {navOpen && (
          <div className="kr-mobile-only" style={{ borderTop: `1px solid ${C.line}`, background: '#fff', padding: '8px 20px 14px' }}>
            {[['how', 'How it works'], ['trades', 'Trades'], ['earnings', 'Earnings'], ['need', 'What you need'], ['faq', 'FAQ']].map(([id, lbl]) => (
              <button key={id} onClick={() => scrollTo(id)}
                style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none',
                  padding: '12px 2px', fontSize: 15, fontWeight: 600, color: BK, cursor: 'pointer',
                  fontFamily: 'inherit', borderBottom: `1px solid ${C.lineSoft}` }}>
                {lbl}
              </button>
            ))}
          </div>
        )}
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <header style={{ background: `linear-gradient(165deg, ${Y} 0%, #FFD940 100%)` }}>
        <div className="kr-container kr-section">
          <div className="kr-hero">
            <div>
              <span style={{ display: 'inline-block', background: 'rgba(0,0,0,.10)', borderRadius: 999,
                padding: '6px 14px', fontSize: 12.5, fontWeight: 800, marginBottom: 18 }}>
                Free to join · Karnataka
              </span>
              <h1 className="kr-h1">Jobs come to your phone.<br />You keep 90%.</h1>
              <p className="kr-lead" style={{ color: 'rgba(0,0,0,.72)', margin: '18px 0 26px', maxWidth: 520 }}>
                Plumbers, electricians, carpenters, painters, cleaners and more. Go on duty, see how far
                each job is before you accept, quote your own price, and get paid to your UPI.
              </p>
              <div className="kr-cta-row">
                <button onClick={goJoin} style={{ ...primaryBtn, background: BK, color: '#fff' }}>
                  Join free — takes 5 minutes
                </button>
                <button onClick={installApp} style={ghostBtn}>📲 Install the app</button>
              </div>
              <p style={{ fontSize: 12.5, color: 'rgba(0,0,0,.6)', marginTop: 14 }}>
                Already registered?{' '}
                <button onClick={goJoin} style={{ background: 'none', border: 'none', color: BK, fontWeight: 800,
                  cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, textDecoration: 'underline', padding: 0 }}>
                  Sign in
                </button>
              </p>
            </div>

            {/* A real job request, so the offer is concrete rather than described */}
            <div>
              <Card style={{ padding: 18, boxShadow: '0 20px 50px rgba(0,0,0,.16)' }}>
                <p style={{ fontSize: 12, fontWeight: 800, color: C.text3, letterSpacing: .5, marginBottom: 12 }}>
                  🔔 NEW JOB REQUEST
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: YL,
                  border: `1px solid ${Y}`, borderRadius: 14, padding: '12px 14px', marginBottom: 12 }}>
                  <div style={{ fontSize: 26, lineHeight: 1 }}>📍</div>
                  <div>
                    <p style={{ fontSize: 24, fontWeight: 900, lineHeight: 1.1 }}>
                      2.4 km <span style={{ fontSize: 14, fontWeight: 700, color: C.text2 }}>away</span>
                    </p>
                    <p style={{ fontSize: 12, color: C.text2, marginTop: 2 }}>~9 min ride (approx)</p>
                  </div>
                </div>
                {[['Service', 'Electrician'], ['Customer location', 'Indiranagar, Bengaluru'],
                  ['Workers required', '1 worker'], ['Starting price', 'from ₹300']].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12,
                    padding: '9px 0', borderBottom: `1px solid ${C.lineSoft}` }}>
                    <span style={{ fontSize: 13, color: C.text3 }}>{k}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, textAlign: 'right' }}>{v}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  <div style={{ flex: 1, background: GREEN, color: '#fff', borderRadius: 12, padding: '13px 0',
                    textAlign: 'center', fontWeight: 800, fontSize: 14 }}>✓ Accept</div>
                  <div style={{ flex: 1, background: '#fff', color: C.red, border: `1.5px solid ${C.red}`,
                    borderRadius: 12, padding: '13px 0', textAlign: 'center', fontWeight: 800, fontSize: 14 }}>✕ Decline</div>
                </div>
              </Card>
              <p style={{ fontSize: 11.5, color: 'rgba(0,0,0,.55)', textAlign: 'center', marginTop: 10 }}>
                What a job request looks like in the app.
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* ── Numbers ───────────────────────────────────────────────────── */}
      <section style={{ background: BK, color: '#fff' }}>
        <div className="kr-container" style={{ padding: '28px 20px' }}>
          <div className="kr-grid-4">
            {[['90%', 'of every job is yours'], ['₹0', 'to join, ever'],
              ['9', 'trades hiring now'], ['UPI', 'payouts to your account']].map(([v, l]) => (
              <div key={l} style={{ textAlign: 'center', padding: '6px 4px' }}>
                <p style={{ fontSize: 26, fontWeight: 900, color: Y }}>{v}</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,.68)', marginTop: 4, lineHeight: 1.4 }}>{l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────── */}
      <section id="how" style={{ background: C.page }}>
        <div className="kr-container kr-section">
          <h2 className="kr-h2">How it works</h2>
          <p className="kr-lead" style={{ color: C.text2, margin: '10px 0 28px', maxWidth: 640 }}>
            From signing up to getting paid, five steps — all inside the app.
          </p>
          <div className="kr-grid">
            {STEPS.map(s => (
              <Card key={s.n}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ width: 30, height: 30, borderRadius: 9, background: Y, color: BK, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 14 }}>{s.n}</span>
                  <span style={{ fontSize: 22 }}>{s.ico}</span>
                </div>
                <p style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>{s.title}</p>
                <p style={{ fontSize: 13.5, color: C.text2, lineHeight: 1.6 }}>{s.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trades ────────────────────────────────────────────────────── */}
      <section id="trades" style={{ background: '#fff' }}>
        <div className="kr-container kr-section">
          <h2 className="kr-h2">Trades we hire for</h2>
          <p className="kr-lead" style={{ color: C.text2, margin: '10px 0 28px', maxWidth: 640 }}>
            Pick a main trade and add any others — you will get requests for all of them.
          </p>
          <div className="kr-grid">
            {TRADES.map(t => (
              <Card key={t.lbl} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 46, height: 46, borderRadius: 13, background: YL, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 23 }}>{t.ico}</div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 15.5, fontWeight: 800 }}>{t.lbl}</p>
                  <p style={{ fontSize: 12.5, color: C.text3, marginTop: 2 }}>{t.jobs}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why join ──────────────────────────────────────────────────── */}
      <section id="earnings" style={{ background: C.page }}>
        <div className="kr-container kr-section">
          <h2 className="kr-h2">Why work with KaamReady</h2>
          <p className="kr-lead" style={{ color: C.text2, margin: '10px 0 28px', maxWidth: 640 }}>
            A flat 10% fee is the only thing we take. Everything else is built to waste less of your day.
          </p>
          <div className="kr-grid">
            {BENEFITS.map(b => (
              <Card key={b.title}>
                <div style={{ fontSize: 26, marginBottom: 10 }}>{b.ico}</div>
                <p style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>{b.title}</p>
                <p style={{ fontSize: 13.5, color: C.text2, lineHeight: 1.6 }}>{b.desc}</p>
              </Card>
            ))}
          </div>

          {/* Worked example — honest about the fee */}
          <Card style={{ marginTop: 22, padding: 22 }}>
            <p style={{ fontSize: 12, fontWeight: 800, color: C.text3, letterSpacing: .5, marginBottom: 14 }}>
              WHAT A ₹1,000 JOB PAYS YOU
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid ${C.lineSoft}` }}>
              <span style={{ fontSize: 14, color: C.text2 }}>Your quote to the customer</span>
              <span style={{ fontSize: 14, fontWeight: 700 }}>₹1,000</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid ${C.lineSoft}` }}>
              <span style={{ fontSize: 14, color: C.text2 }}>KaamReady platform fee (10%)</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.red }}>− ₹100</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 13, marginTop: 4 }}>
              <span style={{ fontSize: 16, fontWeight: 800 }}>Credited to your wallet</span>
              <span style={{ fontSize: 24, fontWeight: 900, color: GREEN }}>₹900</span>
            </div>
            <p style={{ fontSize: 12, color: C.text3, marginTop: 10, lineHeight: 1.6 }}>
              Credited once KaamReady verifies the customer's UPI payment. Withdraw to your UPI ID from the
              Wallet screen whenever you like.
            </p>
          </Card>
        </div>
      </section>

      {/* ── What you need ─────────────────────────────────────────────── */}
      <section id="need" style={{ background: '#fff' }}>
        <div className="kr-container kr-section">
          <h2 className="kr-h2">What you need to sign up</h2>
          <p className="kr-lead" style={{ color: C.text2, margin: '10px 0 28px', maxWidth: 640 }}>
            Four things. Keep them handy and registration takes about five minutes.
          </p>
          <div className="kr-grid-4">
            {NEEDED.map(n => (
              <Card key={n.t}>
                <div style={{ fontSize: 26, marginBottom: 10 }}>{n.ico}</div>
                <p style={{ fontSize: 15, fontWeight: 800, marginBottom: 5 }}>{n.t}</p>
                <p style={{ fontSize: 13, color: C.text2, lineHeight: 1.55 }}>{n.d}</p>
              </Card>
            ))}
          </div>
          <div style={{ background: C.greenL, border: `1px solid ${GREEN}`, borderRadius: 14, padding: '14px 16px', marginTop: 20 }}>
            <p style={{ fontSize: 13.5, color: '#0B6B39', lineHeight: 1.65 }}>
              🔒 Your Aadhaar images and selfie video go into private storage that only KaamReady admins can
              open, and only to verify who you are. Customers and other workers never see them, and we store
              just the last four digits of the number itself.
            </p>
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────── */}
      <section id="faq" style={{ background: C.page }}>
        <div className="kr-container kr-section">
          <h2 className="kr-h2">Questions workers ask</h2>
          <div className="kr-grid-2" style={{ marginTop: 24, alignItems: 'start' }}>
            {FAQS.map(f => <FAQItem key={f.q} {...f} />)}
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────── */}
      <section style={{ background: `linear-gradient(165deg, ${Y} 0%, #FFD940 100%)` }}>
        <div className="kr-container kr-section" style={{ textAlign: 'center' }}>
          <h2 className="kr-h2">Start getting jobs this week</h2>
          <p className="kr-lead" style={{ color: 'rgba(0,0,0,.72)', margin: '12px auto 26px', maxWidth: 560 }}>
            Free to join, no monthly fee, and you can go off duty whenever you want.
          </p>
          <div className="kr-cta-row" style={{ justifyContent: 'center' }}>
            <button onClick={goJoin} style={{ ...primaryBtn, background: BK, color: '#fff' }}>Join free →</button>
            <button onClick={goJoin} style={ghostBtn}>Sign in</button>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer style={{ background: BK, color: 'rgba(255,255,255,.72)' }}>
        <div className="kr-container" style={{ padding: '32px 20px' }}>
          <div className="kr-grid-2" style={{ alignItems: 'start', gap: 22 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
                <img src="/icon-192.png" alt="" style={{ width: 30, height: 30, borderRadius: 8 }} />
                <span style={{ fontSize: 16, fontWeight: 900, color: '#fff' }}>Kaam Ready</span>
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.65, maxWidth: 380 }}>
                Skilled work, booked in minutes. KaamReady connects verified independent workers with
                customers across Karnataka.
              </p>
            </div>
            <div>
              <p style={{ fontSize: 12, fontWeight: 800, color: '#fff', letterSpacing: .5, marginBottom: 10 }}>SUPPORT</p>
              <p style={{ fontSize: 13.5, marginBottom: 6 }}>
                <a href="tel:+916362869636" style={{ color: Y, fontWeight: 700 }}>+91 63628 69636</a>
              </p>
              <p style={{ fontSize: 13.5, marginBottom: 6 }}>
                <a href="mailto:support@kaamready.in" style={{ color: Y, fontWeight: 700 }}>support@kaamready.in</a>
              </p>
              <p style={{ fontSize: 13.5 }}>
                Looking to book a worker instead?{' '}
                <a href="https://thekaamready.in" style={{ color: Y, fontWeight: 700 }}>thekaamready.in</a>
              </p>
            </div>
          </div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', marginTop: 26,
            borderTop: '1px solid rgba(255,255,255,.12)', paddingTop: 16 }}>
            © {new Date().getFullYear()} KaamReady · Karnataka, India
          </p>
        </div>
      </footer>
    </div>
  )
}
