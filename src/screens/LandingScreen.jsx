import { useEffect, useState } from 'react'

const Y = '#F5C000'
const DARK = '#1A1A1A'

function WorkerPhoneMockup() {
  return (
    <div className="wr-phone-wrap">
      <div className="wr-phone-frame">
        <div style={{ height:26, background:'#111', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ width:50, height:10, background:'#333', borderRadius:5 }} />
        </div>
        <div style={{ flex:1, background:DARK, padding:'10px', display:'flex', flexDirection:'column', gap:8 }}>
          <div style={{ background:'#222', borderRadius:10, padding:'8px 10px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:11, fontWeight:900, color:Y }}>👷 Kaam Ready Worker</span>
            <span style={{ fontSize:9, color:'#4ADE80', fontWeight:700 }}>● ONLINE</span>
          </div>
          <div style={{ background:'#FFD700', borderRadius:12, padding:'10px', border:'2px solid rgba(255,255,255,.2)' }}>
            <p style={{ fontSize:10, fontWeight:900, color:DARK, margin:'0 0 4px' }}>🔔 New Job Alert!</p>
            <p style={{ fontSize:9, color:DARK, margin:'0 0 6px', lineHeight:1.4 }}>Plumber • 2.1 km<br/>Vijayanagar, Mysuru</p>
            <div style={{ display:'flex', gap:5 }}>
              <div style={{ flex:1, background:DARK, borderRadius:6, padding:'4px 0', textAlign:'center' }}>
                <span style={{ fontSize:9, fontWeight:800, color:Y }}>✓ Accept</span>
              </div>
              <div style={{ flex:1, background:'rgba(0,0,0,.2)', borderRadius:6, padding:'4px 0', textAlign:'center' }}>
                <span style={{ fontSize:9, color:DARK }}>Decline</span>
              </div>
            </div>
          </div>
          <div style={{ background:'#1E1E1E', borderRadius:10, padding:'8px 10px' }}>
            <p style={{ fontSize:9, color:'#9CA3AF', margin:'0 0 3px' }}>Today's Earnings</p>
            <p style={{ fontSize:18, fontWeight:900, color:Y, margin:'0 0 2px' }}>₹1,840</p>
            <p style={{ fontSize:9, color:'#4ADE80', margin:0 }}>↑ 3 jobs completed</p>
          </div>
          <div style={{ marginTop:'auto', background:'#1E1E1E', borderRadius:10, padding:'5px 0', display:'flex', justifyContent:'space-around' }}>
            {['🏠','💼','👤'].map(t => <span key={t} style={{ fontSize:17 }}>{t}</span>)}
          </div>
        </div>
      </div>
      <div className="wr-phone-glow" />
    </div>
  )
}

function StatCounter({ value, label, light }) {
  const [display, setDisplay] = useState('0')
  useEffect(() => {
    const num = parseFloat(value.replace(/[^0-9.]/g,''))
    const prefix = value.match(/^[^0-9]*/)?.[0] || ''
    const suffix = value.match(/[^0-9.]+$/)?.[0] || ''
    const duration = 1200; const steps = 40; let i = 0
    const interval = setInterval(() => {
      i++
      const eased = 1 - Math.pow(1 - i/steps, 3)
      const cur = Math.round(eased * num * 10) / 10
      setDisplay(prefix + (Number.isInteger(num) ? Math.round(cur) : cur.toFixed(1)) + suffix)
      if (i >= steps) clearInterval(interval)
    }, duration / steps)
    return () => clearInterval(interval)
  }, [value])
  return (
    <div style={{ textAlign:'center' }}>
      <p style={{ fontWeight:900, fontSize:20, color: light ? DARK : '#FFF', margin:0, letterSpacing:'-0.5px' }}>{display}</p>
      <p style={{ fontSize:11, fontWeight:700, color: light ? '#7A5800' : 'rgba(255,255,255,.7)', margin:'3px 0 0', letterSpacing:0.3 }}>{label}</p>
    </div>
  )
}

export default function WorkerLandingScreen({ setScreen }) {
  const [installed, setInstalled] = useState(window.matchMedia('(display-mode: standalone)').matches)
  const [showInstallModal, setShowInstallModal] = useState(false)
  const [statsVisible, setStatsVisible] = useState(false)

  useEffect(() => {
    window.addEventListener('appinstalled', () => { setInstalled(true); setShowInstallModal(false) })
  }, [])

  async function handleInstall() {
    const prompt = window.__pwaPrompt
    if (prompt) {
      prompt.prompt()
      const { outcome } = await prompt.userChoice
      if (outcome === 'accepted') { setInstalled(true); window.__pwaPrompt = null }
    } else setShowInstallModal(true)
  }

  useEffect(() => {
    const style = document.createElement('style')
    style.id = 'wr-landing'
    style.textContent = `
      .wr-nav-inner,.wr-stats-inner,.wr-section-inner,.wr-footer-inner { max-width:1200px; margin:0 auto; }
      .wr-hero-inner { max-width:1200px; margin:0 auto; display:flex; flex-direction:column; align-items:center; gap:40px; }
      .wr-hero-text { text-align:center; }
      .wr-perks-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
      .wr-bottom { display:grid; grid-template-columns:1fr; gap:20px; }

      @keyframes wr-float { 0%,100%{transform:translateY(0) rotate(1deg)} 50%{transform:translateY(-16px) rotate(-1deg)} }
      @keyframes wr-glow-y { 0%,100%{box-shadow:0 0 30px rgba(245,192,0,.4),0 32px 80px rgba(0,0,0,.5)} 50%{box-shadow:0 0 70px rgba(245,192,0,.8),0 32px 80px rgba(0,0,0,.5)} }
      @keyframes wr-reveal-up { from{opacity:0;transform:translateY(40px)} to{opacity:1;transform:translateY(0)} }
      @keyframes wr-reveal-scale { from{opacity:0;transform:scale(.88)} to{opacity:1;transform:scale(1)} }
      @keyframes wr-gradient { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
      @keyframes wr-ripple { to{transform:scale(4);opacity:0} }
      @keyframes wr-orb1 { 0%,100%{transform:translate(0,0) scale(1)} 40%{transform:translate(25px,-20px) scale(1.1)} 70%{transform:translate(-15px,15px) scale(.9)} }
      @keyframes wr-orb2 { 0%,100%{transform:translate(0,0) scale(1)} 40%{transform:translate(-20px,15px) scale(.9)} 70%{transform:translate(18px,-12px) scale(1.1)} }
      @keyframes wr-badge-in { from{opacity:0;transform:scale(.5) translateY(-10px)} to{opacity:1;transform:scale(1) translateY(0)} }
      @keyframes wr-job-bounce { 0%{transform:translateY(0) scale(1)} 20%{transform:translateY(-12px) scale(1.04)} 40%{transform:translateY(0) scale(1)} 60%{transform:translateY(-6px) scale(1.02)} 80%{transform:translateY(0) scale(1)} 100%{transform:translateY(0) scale(1)} }
      @keyframes wr-pulse-ring { 0%{transform:scale(1);opacity:.5} 100%{transform:scale(1.7);opacity:0} }
      @keyframes wr-shimmer { from{background-position:-200% 0} to{background-position:200% 0} }

      .wr-phone-wrap { position:relative; width:200px; height:360px; margin:0 auto; flex-shrink:0; animation:wr-float 4.5s ease-in-out infinite; }
      .wr-phone-frame { width:200px; height:360px; background:#111; border-radius:36px; border:7px solid #333; display:flex; flex-direction:column; overflow:hidden; animation:wr-glow-y 3s ease-in-out infinite; }
      .wr-phone-glow { position:absolute; bottom:-28px; left:50%; transform:translateX(-50%); width:160px; height:28px; background:rgba(245,192,0,.6); border-radius:50%; filter:blur(16px); }

      .wr-hero-section { background:linear-gradient(135deg,#F5C000,#FFD740,#F0B800,#FFC000,#F5C000); background-size:400% 400%; animation:wr-gradient 8s ease infinite; }
      .wr-hero-badge { animation:wr-badge-in .6s cubic-bezier(.34,1.56,.64,1) .2s both; }
      .wr-hero-orb1 { animation:wr-orb1 10s ease-in-out infinite; }
      .wr-hero-orb2 { animation:wr-orb2 12s ease-in-out infinite; }

      .wr-reveal { opacity:0; }
      .wr-reveal.visible { animation:wr-reveal-up .7s cubic-bezier(.22,1,.36,1) forwards; }
      .wr-reveal.visible-scale { animation:wr-reveal-scale .6s cubic-bezier(.22,1,.36,1) forwards; }
      .wr-reveal.d1{animation-delay:.05s} .wr-reveal.d2{animation-delay:.1s}
      .wr-reveal.d3{animation-delay:.15s} .wr-reveal.d4{animation-delay:.2s}

      .wr-perk-card { transition:transform .25s cubic-bezier(.22,1,.36,1),box-shadow .25s,border-color .25s; cursor:default; }
      .wr-perk-card:hover { transform:translateY(-5px) scale(1.03); box-shadow:0 12px 32px rgba(245,192,0,.25) !important; border-color:${Y} !important; }

      .wr-step-card { transition:transform .25s,box-shadow .25s; }
      .wr-step-card:hover { transform:translateY(-4px); box-shadow:0 12px 32px rgba(0,0,0,.15) !important; }

      .wr-btn-primary { position:relative; overflow:hidden; transition:transform .15s,box-shadow .15s; }
      .wr-btn-primary:hover { transform:translateY(-2px) scale(1.02); box-shadow:0 10px 32px rgba(0,0,0,.4) !important; }
      .wr-btn-primary:active { transform:scale(.97); }
      .wr-btn-secondary { transition:transform .15s,background .15s; }
      .wr-btn-secondary:hover { transform:translateY(-2px); }
      .wr-ripple-el { position:absolute; border-radius:50%; background:rgba(255,255,255,.35); width:10px; height:10px; transform:scale(0); animation:wr-ripple .6s linear forwards; pointer-events:none; }

      .wr-cta-join { transition:transform .2s,box-shadow .2s; }
      .wr-cta-join:hover { transform:translateY(-3px) scale(1.01); box-shadow:0 20px 50px rgba(0,0,0,.25) !important; }
      .wr-cta-customer { transition:transform .2s,box-shadow .2s; }
      .wr-cta-customer:hover { transform:translateY(-3px) scale(1.01); box-shadow:0 20px 50px rgba(245,192,0,.4) !important; }

      @media(min-width:768px){
        .wr-hero-inner { flex-direction:row-reverse; align-items:center; text-align:left; padding:60px 40px; gap:60px; }
        .wr-hero-text { text-align:left; flex:1; }
        .wr-hero-h1 { font-size:54px !important; }
        .wr-hero-btns { justify-content:flex-start !important; }
        .wr-perks-grid { grid-template-columns:1fr 1fr; }
        .wr-steps { flex-direction:row !important; }
        .wr-bottom { grid-template-columns:1fr 1fr; }
        .wr-nav-inner,.wr-stats-inner { padding:0 40px; }
        .wr-section-inner { padding:52px 40px !important; }
        .wr-footer-inner { display:flex; justify-content:space-between; align-items:flex-start; }
        .wr-footer-links { display:flex; gap:24px; align-items:center; }
      }
      @media(max-width:767px){
        .wr-footer-inner { display:flex; flex-direction:column; gap:16px; }
        .wr-footer-links { display:flex; flex-direction:column; gap:10px; }
      }
    `
    document.head.appendChild(style)

    const io = new IntersectionObserver((entries) => {
      entries.forEach(el => {
        if (el.isIntersecting) { el.target.classList.add('visible'); io.unobserve(el.target) }
      })
    }, { threshold: 0.12 })
    setTimeout(() => document.querySelectorAll('.wr-reveal').forEach(el => io.observe(el)), 100)

    const statsEl = document.getElementById('wr-stats-section')
    if (statsEl) {
      const sio = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) { setStatsVisible(true); sio.disconnect() }
      }, { threshold: 0.5 })
      sio.observe(statsEl)
    }

    function addRipple(e) {
      const btn = e.currentTarget
      const r = document.createElement('span'); r.className = 'wr-ripple-el'
      const rect = btn.getBoundingClientRect()
      r.style.left = (e.clientX - rect.left - 5) + 'px'
      r.style.top  = (e.clientY - rect.top  - 5) + 'px'
      btn.appendChild(r); setTimeout(() => r.remove(), 700)
    }
    document.querySelectorAll('.wr-btn-primary').forEach(b => b.addEventListener('click', addRipple))

    return () => { document.getElementById('wr-landing')?.remove(); io.disconnect() }
  }, [])

  return (
    <div style={{ height:'100dvh', overflowY:'auto', WebkitOverflowScrolling:'touch', background:DARK, fontFamily:'Inter, system-ui, sans-serif' }}>

      {/* NAV */}
      <nav style={{ position:'sticky', top:0, zIndex:50, background:'rgba(26,26,26,.92)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(255,255,255,.06)', padding:'14px 20px' }}>
        <div className="wr-nav-inner" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:36, height:36, background:Y, borderRadius:11, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, boxShadow:'0 4px 12px rgba(245,192,0,.4)' }}>👷</div>
            <div>
              <span style={{ fontWeight:900, fontSize:17, color:'#FFF' }}>Kaam Ready</span>
              <span style={{ fontSize:10, fontWeight:600, color:Y, display:'block', marginTop:-2 }}>For Workers</span>
            </div>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            {!installed && (
              <button onClick={handleInstall} className="wr-btn-secondary"
                style={{ background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,255,255,.12)', borderRadius:10, padding:'8px 14px', fontWeight:700, fontSize:12, cursor:'pointer', fontFamily:'inherit', color:'#FFF' }}>
                ⬇️ Download
              </button>
            )}
            <button onClick={() => setScreen('login')} className="wr-btn-primary"
              style={{ background:Y, border:'none', borderRadius:10, padding:'9px 16px', fontWeight:800, fontSize:12, cursor:'pointer', fontFamily:'inherit', color:DARK }}>
              Join Now →
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="wr-hero-section" style={{ padding:'44px 24px 52px', position:'relative', overflow:'hidden' }}>
        <div className="wr-hero-orb1" style={{ position:'absolute', top:-60, left:-60, width:280, height:280, background:'rgba(0,0,0,.15)', borderRadius:'50%' }} />
        <div className="wr-hero-orb2" style={{ position:'absolute', bottom:-80, right:-40, width:240, height:240, background:'rgba(0,0,0,.1)', borderRadius:'50%' }} />
        <div className="wr-hero-inner" style={{ position:'relative', zIndex:1, padding:0 }}>
          <div className="wr-hero-text">
            <div className="wr-hero-badge" style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(0,0,0,.2)', borderRadius:20, padding:'5px 14px', marginBottom:20 }}>
              <span style={{ width:6, height:6, background:DARK, borderRadius:'50%', display:'inline-block', opacity:.8 }} />
              <span style={{ fontSize:11, fontWeight:700, color:DARK, letterSpacing:1, opacity:.8 }}>₹500 – ₹2000 PER DAY</span>
            </div>
            <h1 className="wr-hero-h1" style={{ fontWeight:900, color:DARK, lineHeight:1.1, letterSpacing:'-2px', margin:'0 0 16px', fontSize:36 }}>
              Your Skills,<br/>Your Income.
            </h1>
            <p style={{ fontSize:16, color:'rgba(0,0,0,.65)', margin:'0 0 32px', lineHeight:1.7, maxWidth:400 }}>
              Turn your trade into daily earnings. Set your hours, take jobs near you, get paid on time.
            </p>
            <div className="wr-hero-btns" style={{ display:'flex', gap:12, flexWrap:'wrap', justifyContent:'center' }}>
              <button onClick={() => setScreen('login')} className="wr-btn-primary"
                style={{ background:DARK, color:Y, border:'none', borderRadius:14, padding:'15px 32px', fontWeight:900, fontSize:16, cursor:'pointer', fontFamily:'inherit', boxShadow:'0 6px 28px rgba(0,0,0,.3)', letterSpacing:'-0.3px' }}>
                Start Earning →
              </button>
              <button onClick={() => setScreen('login')} className="wr-btn-secondary"
                style={{ background:'rgba(0,0,0,.15)', color:DARK, border:'1.5px solid rgba(0,0,0,.2)', borderRadius:14, padding:'15px 24px', fontWeight:700, fontSize:15, cursor:'pointer', fontFamily:'inherit' }}>
                How it works
              </button>
              {!installed && (
                <button onClick={handleInstall} className="wr-btn-secondary"
                  style={{ background:'rgba(0,0,0,.12)', color:DARK, border:'1.5px solid rgba(0,0,0,.15)', borderRadius:14, padding:'15px 20px', fontWeight:700, fontSize:14, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:8 }}>
                  ⬇️ Install App
                </button>
              )}
            </div>
          </div>
          <WorkerPhoneMockup />
        </div>
      </section>

      {/* STATS */}
      <section id="wr-stats-section" style={{ background:'#111', padding:'20px 24px', borderTop:'1px solid rgba(255,255,255,.06)' }}>
        <div className="wr-stats-inner" style={{ display:'flex', justifyContent:'space-around' }}>
          {statsVisible ? (
            [['500+','Workers Earning'],['₹1500','Avg Daily Pay'],['60min','Avg Response'],['4.8★','Worker Rating']].map(([v,l]) => (
              <StatCounter key={l} value={v} label={l} />
            ))
          ) : (
            [['500+','Workers Earning'],['₹1500','Avg Daily Pay'],['60min','Avg Response'],['4.8★','Worker Rating']].map(([v,l]) => (
              <div key={l} style={{ textAlign:'center' }}>
                <p style={{ fontWeight:900, fontSize:20, color:'#FFF', margin:0 }}>—</p>
                <p style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,.5)', margin:'3px 0 0' }}>{l}</p>
              </div>
            ))
          )}
        </div>
      </section>

      {/* PERKS */}
      <section style={{ padding:'36px 24px', background:'#141414' }}>
        <div className="wr-section-inner" style={{ padding:0 }}>
          <p className="wr-reveal" style={{ fontSize:12, fontWeight:700, color:'rgba(255,255,255,.3)', letterSpacing:1, textTransform:'uppercase', marginBottom:6 }}>Why join us</p>
          <h2 className="wr-reveal d1" style={{ fontSize:26, fontWeight:900, color:'#FFF', margin:'0 0 24px', letterSpacing:'-0.5px' }}>Built for Workers</h2>
          <div className="wr-perks-grid">
            {[
              { ico:'📍', title:'Jobs Near You',     desc:'Only get alerted for jobs within your preferred radius' },
              { ico:'⏰', title:'Your Hours',         desc:'Go online when you want, offline when you need a break' },
              { ico:'💳', title:'Weekly Payouts',     desc:'Earnings credited to your bank every week, on time' },
              { ico:'📈', title:'Grow Your Rate',     desc:'Top-rated workers unlock higher-paying priority jobs' },
            ].map((p, i) => (
              <div key={p.title} className={`wr-perk-card wr-reveal d${i+1}`}
                style={{ background:'#1E1E1E', borderRadius:18, padding:'22px 18px', border:'1px solid rgba(255,255,255,.06)', display:'flex', flexDirection:'column', gap:10 }}>
                <span style={{ fontSize:28 }}>{p.ico}</span>
                <p style={{ fontWeight:800, fontSize:15, color:'#FFF', margin:0 }}>{p.title}</p>
                <p style={{ fontSize:13, color:'#9CA3AF', margin:0, lineHeight:1.6 }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ padding:'36px 24px', background:DARK }}>
        <div className="wr-section-inner" style={{ padding:0 }}>
          <p className="wr-reveal" style={{ fontSize:12, fontWeight:700, color:'rgba(255,255,255,.3)', letterSpacing:1, textTransform:'uppercase', marginBottom:6 }}>Getting started</p>
          <h2 className="wr-reveal d1" style={{ fontSize:26, fontWeight:900, color:'#FFF', margin:'0 0 24px', letterSpacing:'-0.5px' }}>Start in 3 Steps</h2>
          <div className="wr-steps" style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {[
              { ico:'📝', title:'Sign Up',       desc:'Enter your name, phone, trade skill & Aadhaar for verification' },
              { ico:'🟢', title:'Go Online',     desc:'Tap "Online" — jobs near you start appearing immediately' },
              { ico:'💰', title:'Accept & Earn', desc:'Accept jobs, complete the work, and get your weekly payout' },
            ].map((s, i) => (
              <div key={i} className={`wr-step-card wr-reveal d${i+1}`}
                style={{ flex:1, background:'#1E1E1E', borderRadius:18, padding:'22px 18px', display:'flex', gap:14, alignItems:'flex-start', border:'1px solid rgba(255,255,255,.06)' }}>
                <div style={{ width:44, height:44, borderRadius:13, background:Y, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0, boxShadow:'0 4px 12px rgba(245,192,0,.4)' }}>{s.ico}</div>
                <div>
                  <p style={{ fontSize:12, fontWeight:700, color:'rgba(255,255,255,.35)', margin:'0 0 3px' }}>Step 0{i+1}</p>
                  <p style={{ fontWeight:800, fontSize:16, color:'#FFF', margin:'0 0 5px' }}>{s.title}</p>
                  <p style={{ fontSize:13, color:'#9CA3AF', margin:0, lineHeight:1.6 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BOTTOM CTAs */}
      <section style={{ padding:'0 24px 40px', background:'#141414' }}>
        <div className="wr-section-inner wr-bottom" style={{ padding:0 }}>
          <div className="wr-cta-join wr-reveal d1" style={{ background:`linear-gradient(135deg,${Y},#FFD740)`, borderRadius:22, padding:'32px 28px' }}>
            <p style={{ fontSize:32, margin:'0 0 10px' }}>💰</p>
            <p style={{ fontWeight:900, fontSize:22, color:DARK, margin:'0 0 8px' }}>Ready to earn?</p>
            <p style={{ fontSize:14, color:'#7A5800', margin:'0 0 20px', lineHeight:1.6 }}>Join 500+ workers making ₹500–₹2000/day</p>
            <button onClick={() => setScreen('login')} className="wr-btn-primary"
              style={{ background:DARK, color:Y, border:'none', borderRadius:13, padding:'14px 28px', fontWeight:900, fontSize:15, cursor:'pointer', fontFamily:'inherit', width:'100%', boxShadow:'0 6px 20px rgba(0,0,0,.3)' }}>
              Join as Worker →
            </button>
          </div>
          <div className="wr-cta-customer wr-reveal d2" style={{ background:'#1E1E1E', borderRadius:22, padding:'32px 28px', border:'1px solid rgba(255,255,255,.06)' }}>
            <p style={{ fontSize:32, margin:'0 0 10px' }}>🏠</p>
            <p style={{ fontWeight:900, fontSize:22, color:'#FFF', margin:'0 0 8px' }}>Looking for services?</p>
            <p style={{ fontSize:14, color:'#9CA3AF', margin:'0 0 20px', lineHeight:1.6 }}>Book verified workers for your home services</p>
            <a href="https://thekaamready.in" target="_blank" rel="noreferrer" className="wr-btn-primary"
              style={{ display:'block', background:Y, color:DARK, textDecoration:'none', borderRadius:13, padding:'14px 28px', fontWeight:900, fontSize:15, textAlign:'center', boxShadow:'0 6px 20px rgba(245,192,0,.4)' }}>
              Book a Service →
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop:'1px solid rgba(255,255,255,.06)', padding:'28px 24px 48px', background:DARK }}>
        <div className="wr-footer-inner">
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
              <div style={{ width:30, height:30, background:Y, borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, boxShadow:'0 4px 10px rgba(245,192,0,.35)' }}>👷</div>
              <span style={{ fontWeight:900, fontSize:17, color:'#FFF' }}>Kaam Ready Worker</span>
            </div>
            <p style={{ fontSize:13, color:'rgba(255,255,255,.35)', maxWidth:320, lineHeight:1.6, margin:0 }}>Connecting skilled workers with homes across Karnataka</p>
          </div>
          <div className="wr-footer-links">
            <a href="/privacy.html" style={{ color:'rgba(255,255,255,.4)', textDecoration:'none', fontSize:13 }}>Privacy</a>
            <a href="/terms.html"   style={{ color:'rgba(255,255,255,.4)', textDecoration:'none', fontSize:13 }}>Terms</a>
            <a href="mailto:admin@kaamready.in" style={{ color:'rgba(255,255,255,.4)', textDecoration:'none', fontSize:13 }}>Contact</a>
            <p style={{ fontSize:12, color:'rgba(255,255,255,.2)', margin:0 }}>© 2026 Kaam Ready</p>
          </div>
        </div>
      </footer>

      {/* INSTALL MODAL */}
      {showInstallModal && (
        <div onClick={() => setShowInstallModal(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.7)', zIndex:200, display:'flex', alignItems:'flex-end', justifyContent:'center', backdropFilter:'blur(4px)' }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'#1E1E1E', borderRadius:'24px 24px 0 0', width:'100%', maxWidth:480, padding:'24px 24px 40px', border:'1px solid rgba(255,255,255,.1)' }}>
            <div style={{ width:48, height:4, background:'rgba(255,255,255,.15)', borderRadius:4, margin:'0 auto 20px' }} />
            <p style={{ fontWeight:900, fontSize:20, color:'#FFF', margin:'0 0 6px' }}>Install Kaam Ready Worker</p>
            <p style={{ fontSize:13, color:'rgba(255,255,255,.4)', margin:'0 0 24px' }}>Add to your home screen</p>
            {[{ico:'🌐',t:'Open in Chrome browser'},{ico:'⋮',t:'Tap the menu (⋮) top right'},{ico:'➕',t:'Tap "Add to Home screen"'},{ico:'✅',t:'Tap "Add" — done!'}].map((s,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:14, marginBottom:16 }}>
                <div style={{ width:38, height:38, borderRadius:12, background:Y, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:15, color:DARK, flexShrink:0 }}>{s.ico}</div>
                <p style={{ fontSize:14, color:'#FFF', margin:0, fontWeight: i===1||i===2 ? 700 : 400 }}>{s.t}</p>
              </div>
            ))}
            <button onClick={() => setShowInstallModal(false)} className="wr-btn-primary"
              style={{ width:'100%', background:Y, color:DARK, border:'none', borderRadius:14, padding:15, fontWeight:800, fontSize:15, cursor:'pointer', fontFamily:'inherit', marginTop:8 }}>
              Got it ✓
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
