import { useEffect } from 'react'

const Y = '#F5C000'
const DARK = '#1A1A1A'

function PhoneMockup() {
  return (
    <div style={{ position:'relative', width:200, height:360, margin:'0 auto', flexShrink:0 }}>
      <div style={{ width:200, height:360, background:'#FFFFFF', borderRadius:36,
        boxShadow:'0 32px 80px rgba(0,0,0,.25)', border:'7px solid #333',
        display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ height:26, background:'#111', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ width:50, height:10, background:'#333', borderRadius:5 }} />
        </div>
        <div style={{ flex:1, background:'#FAFAFA', padding:'10px 10px 8px', display:'flex', flexDirection:'column', gap:6 }}>
          <div style={{ background:DARK, borderRadius:10, padding:'7px 10px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:10, fontWeight:800, color:'#FFF' }}>🟢 Online</span>
            <span style={{ fontSize:9, color:Y, fontWeight:700 }}>₹840 earned</span>
          </div>
          <div style={{ background:'#FFF', borderRadius:10, padding:'9px 10px', border:'2px solid '+Y }}>
            <p style={{ fontSize:10, fontWeight:900, color:DARK, margin:'0 0 2px' }}>🔔 New Job Alert!</p>
            <p style={{ fontSize:9, color:'#6B7280', margin:'0 0 5px' }}>⚡ Electrician · 1.2km · ₹400+</p>
            <div style={{ background:Y, borderRadius:6, padding:'3px 10px', textAlign:'center' }}>
              <span style={{ fontSize:9, fontWeight:900, color:DARK }}>✓ Accept Job</span>
            </div>
          </div>
          <div style={{ display:'flex', gap:5 }}>
            {[['₹840','Today'],['3','Jobs'],['4.9★','Rating']].map(([v,l]) => (
              <div key={l} style={{ flex:1, background:'#FFF', borderRadius:8, padding:'6px 3px', textAlign:'center' }}>
                <p style={{ fontSize:9, fontWeight:900, color:DARK, margin:0 }}>{v}</p>
                <p style={{ fontSize:7, color:'#9CA3AF', margin:0 }}>{l}</p>
              </div>
            ))}
          </div>
          <div style={{ marginTop:'auto', background:'#FFF', borderRadius:10, padding:'5px 0', display:'flex', justifyContent:'space-around' }}>
            {['🏠','💰','👤'].map(t => <span key={t} style={{ fontSize:17 }}>{t}</span>)}
          </div>
        </div>
      </div>
      <div style={{ position:'absolute', bottom:-24, left:'50%', transform:'translateX(-50%)',
        width:150, height:24, background:'rgba(245,192,0,.5)', borderRadius:'50%', filter:'blur(14px)' }} />
    </div>
  )
}

export default function LandingScreen({ setScreen }) {
  useEffect(() => {
    const style = document.createElement('style')
    style.id = 'kr-wlanding'
    style.textContent = `
      .krw-nav-inner { max-width:1200px; margin:0 auto; display:flex; justify-content:space-between; align-items:center; }
      .krw-hero-inner { max-width:1200px; margin:0 auto; display:flex; flex-direction:column; align-items:center; gap:40px; }
      .krw-hero-text { text-align:center; }
      .krw-hero-h1 { font-size:36px; }
      .krw-stats-inner { max-width:1200px; margin:0 auto; display:flex; justify-content:space-around; }
      .krw-section-inner { max-width:1200px; margin:0 auto; }
      .krw-perks-grid { display:flex; flex-direction:column; gap:12px; }
      .krw-steps { display:flex; flex-direction:column; gap:0; }
      .krw-bottom { display:grid; grid-template-columns:1fr; gap:20px; }
      @media(min-width:768px){
        .krw-hero-inner { flex-direction:row; align-items:center; text-align:left; padding:60px 40px; gap:60px; }
        .krw-hero-text { text-align:left; flex:1; }
        .krw-hero-h1 { font-size:52px !important; }
        .krw-hero-btns { justify-content:flex-start !important; }
        .krw-perks-grid { display:grid; grid-template-columns:1fr 1fr; }
        .krw-steps { flex-direction:row; gap:24px; }
        .krw-bottom { grid-template-columns:1fr 1fr; }
        .krw-nav-inner { padding:0 40px; }
        .krw-stats-inner { padding:0 40px; }
        .krw-section-inner { padding:48px 40px !important; }
        .krw-footer-inner { max-width:1200px; margin:0 auto; display:flex; justify-content:space-between; align-items:flex-start; }
        .krw-footer-links { display:flex; gap:24px; align-items:center; }
      }
      @media(max-width:767px){
        .krw-footer-inner { display:flex; flex-direction:column; gap:16px; }
        .krw-footer-links { display:flex; flex-direction:column; gap:10px; }
      }
    `
    document.head.appendChild(style)
    return () => document.getElementById('kr-wlanding')?.remove()
  }, [])

  return (
    <div style={{ height:'100dvh', overflowY:'auto', WebkitOverflowScrolling:'touch',
      background:'#FFFFFF', fontFamily:'Inter, system-ui, sans-serif' }}>

      {/* NAV */}
      <nav style={{ position:'sticky', top:0, zIndex:50, background:'rgba(255,255,255,.95)',
        backdropFilter:'blur(12px)', borderBottom:'1px solid #F0F0F0', padding:'14px 20px' }}>
        <div className="krw-nav-inner">
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:36, height:36, background:Y, borderRadius:11,
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🏠</div>
            <div>
              <span style={{ fontWeight:900, fontSize:20, color:DARK, letterSpacing:'-0.5px' }}>Kaam Ready</span>
              <span style={{ fontSize:11, color:'#9CA3AF', display:'block', marginTop:-2 }}>For Workers</span>
            </div>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={() => setScreen('login')}
              style={{ background:'none', border:'1.5px solid #E5E7EB', borderRadius:10, padding:'8px 16px',
                fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit', color:'#6B7280' }}>
              Sign Up
            </button>
            <button onClick={() => setScreen('login')}
              style={{ background:DARK, border:'none', borderRadius:10, padding:'9px 18px',
                fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit', color:Y }}>
              Login
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ background:`linear-gradient(150deg,${Y} 0%,#FFD740 55%,#FFC800 100%)`,
        padding:'44px 24px 52px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-60, right:-60, width:280, height:280,
          background:'rgba(0,0,0,.07)', borderRadius:'50%' }} />
        <div style={{ position:'absolute', bottom:-80, left:-40, width:240, height:240,
          background:'rgba(0,0,0,.04)', borderRadius:'50%' }} />
        <div className="krw-hero-inner" style={{ position:'relative', zIndex:1, padding:'0' }}>
          <div className="krw-hero-text">
            <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(0,0,0,.1)',
              borderRadius:20, padding:'5px 14px', marginBottom:20 }}>
              <span style={{ width:6, height:6, background:DARK, borderRadius:'50%', display:'inline-block' }} />
              <span style={{ fontSize:11, fontWeight:700, color:DARK, letterSpacing:1 }}>500+ WORKERS EARNING DAILY</span>
            </div>
            <h1 className="krw-hero-h1" style={{ fontWeight:900, color:DARK, lineHeight:1.1,
              letterSpacing:'-2px', margin:'0 0 16px' }}>
              Your Skills,<br/>
              <span style={{ background:DARK, color:Y, padding:'2px 12px', borderRadius:10, display:'inline-block' }}>
                Your Income
              </span>
            </h1>
            <p style={{ fontSize:16, color:'#5C4000', margin:'0 0 32px', lineHeight:1.7, maxWidth:420 }}>
              Get verified home service jobs near you. Earn ₹500–₹2000/day with weekly UPI payouts. Free to join.
            </p>
            <div className="krw-hero-btns" style={{ display:'flex', gap:12, flexWrap:'wrap', justifyContent:'center' }}>
              <button onClick={() => setScreen('login')}
                style={{ background:DARK, color:Y, border:'none', borderRadius:14,
                  padding:'15px 32px', fontWeight:900, fontSize:16, cursor:'pointer',
                  fontFamily:'inherit', boxShadow:'0 6px 24px rgba(0,0,0,.2)', letterSpacing:'-0.3px' }}>
                Start Earning →
              </button>
              <button onClick={() => setScreen('login')}
                style={{ background:'rgba(0,0,0,.1)', color:DARK, border:'1.5px solid rgba(0,0,0,.15)',
                  borderRadius:14, padding:'15px 24px', fontWeight:700, fontSize:15, cursor:'pointer',
                  fontFamily:'inherit' }}>
                Learn More
              </button>
            </div>
          </div>
          <div><PhoneMockup /></div>
        </div>
      </section>

      {/* STATS */}
      <section style={{ background:DARK, padding:'20px 24px' }}>
        <div className="krw-stats-inner">
          {[['₹500–2000','Per Day'],['Weekly','UPI Payout'],['5 km','Job Radius'],['Free','To Join']].map(([v,l]) => (
            <div key={l} style={{ textAlign:'center' }}>
              <p style={{ fontWeight:900, fontSize:18, color:Y, margin:0, letterSpacing:'-0.3px' }}>{v}</p>
              <p style={{ fontSize:11, fontWeight:600, color:'#6B7280', margin:'3px 0 0' }}>{l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PERKS */}
      <section style={{ padding:'32px 24px' }}>
        <div className="krw-section-inner" style={{ padding:0 }}>
          <p style={{ fontSize:12, fontWeight:700, color:'#9CA3AF', letterSpacing:1, textTransform:'uppercase', marginBottom:6 }}>Why join us</p>
          <h2 style={{ fontSize:26, fontWeight:900, color:DARK, margin:'0 0 20px', letterSpacing:'-0.5px' }}>Built for Workers</h2>
          <div className="krw-perks-grid">
            {[
              { ico:'⚡', title:'Instant Job Alerts',   desc:'Get notified the moment a job appears near you — accept in one tap' },
              { ico:'💰', title:'Weekly Payouts',        desc:'Earnings credited to your UPI every Friday — no delays' },
              { ico:'📍', title:'Jobs Near You',         desc:'All jobs dispatched within 5 km — no long commutes' },
              { ico:'🛡️', title:'Platform Protected',   desc:'Every booking verified — no fraud, disputes handled by us' },
            ].map(p => (
              <div key={p.title} style={{ display:'flex', gap:14, alignItems:'flex-start',
                background:'#F5F5F8', borderRadius:16, padding:'18px' }}>
                <span style={{ fontSize:28, flexShrink:0 }}>{p.ico}</span>
                <div>
                  <p style={{ fontWeight:800, fontSize:15, color:DARK, margin:'0 0 4px' }}>{p.title}</p>
                  <p style={{ fontSize:13, color:'#6B7280', margin:0, lineHeight:1.5 }}>{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ background:'#F5F5F8', padding:'32px 24px' }}>
        <div className="krw-section-inner" style={{ padding:0 }}>
          <p style={{ fontSize:12, fontWeight:700, color:'#9CA3AF', letterSpacing:1, textTransform:'uppercase', marginBottom:6 }}>Getting started</p>
          <h2 style={{ fontSize:26, fontWeight:900, color:DARK, margin:'0 0 24px', letterSpacing:'-0.5px' }}>3 Steps to Earn</h2>
          <div className="krw-steps">
            {[
              { ico:'📝', title:'Create Profile',     desc:'Enter your skill, city & upload Aadhaar — 2-minute signup' },
              { ico:'🟢', title:'Go Online',           desc:'Toggle online — job alerts arrive instantly on your phone' },
              { ico:'💸', title:'Complete & Get Paid', desc:'Finish the job, admin verifies, wallet credited same day' },
            ].map((s, i) => (
              <div key={i} style={{ flex:1, background:'#FFF', borderRadius:18, padding:'24px 20px',
                display:'flex', flexDirection:'column', gap:10, border:'1px solid #EBEBEB' }}>
                <div style={{ width:48, height:48, borderRadius:14, background:Y,
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>{s.ico}</div>
                <p style={{ fontSize:13, fontWeight:700, color:'#9CA3AF', margin:0 }}>0{i+1}</p>
                <p style={{ fontWeight:800, fontSize:16, color:DARK, margin:0 }}>{s.title}</p>
                <p style={{ fontSize:13, color:'#6B7280', margin:0, lineHeight:1.6 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BOTTOM */}
      <section style={{ padding:'32px 24px' }}>
        <div className="krw-section-inner krw-bottom" style={{ padding:0 }}>
          <div style={{ background:`linear-gradient(135deg,${Y},#FFD740)`, borderRadius:22, padding:'32px 28px' }}>
            <p style={{ fontSize:32, margin:'0 0 10px' }}>💸</p>
            <p style={{ fontWeight:900, fontSize:22, color:DARK, margin:'0 0 8px' }}>Ready to earn?</p>
            <p style={{ fontSize:14, color:'#7A5800', margin:'0 0 20px', lineHeight:1.6 }}>Free to join. No monthly fees. Start getting jobs today.</p>
            <button onClick={() => setScreen('login')}
              style={{ background:DARK, color:Y, border:'none', borderRadius:13, padding:'14px 28px',
                fontWeight:900, fontSize:15, cursor:'pointer', fontFamily:'inherit', width:'100%' }}>
              Create Your Profile →
            </button>
          </div>
          <div style={{ background:DARK, borderRadius:22, padding:'32px 28px', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:-20, right:-20, width:100, height:100,
              background:'rgba(245,192,0,.1)', borderRadius:'50%' }} />
            <p style={{ fontSize:32, margin:'0 0 10px' }}>🏠</p>
            <p style={{ fontWeight:900, fontSize:22, color:'#FFF', margin:'0 0 8px' }}>Need home services?</p>
            <p style={{ fontSize:14, color:'#9CA3AF', margin:'0 0 20px', lineHeight:1.6 }}>Book verified workers on the customer app</p>
            <a href="https://thekaamready.in" target="_blank" rel="noreferrer"
              style={{ display:'block', background:Y, color:DARK, textDecoration:'none', borderRadius:13,
                padding:'14px 28px', fontWeight:900, fontSize:15, textAlign:'center' }}>
              Open Customer App →
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop:'1px solid #F0F0F0', padding:'28px 24px 48px' }}>
        <div className="krw-footer-inner">
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
              <div style={{ width:30, height:30, background:Y, borderRadius:9,
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:15 }}>🏠</div>
              <span style={{ fontWeight:900, fontSize:17, color:DARK }}>Kaam Ready · Workers</span>
            </div>
            <p style={{ fontSize:13, color:'#9CA3AF', maxWidth:340, lineHeight:1.6, margin:0 }}>
              Connecting skilled workers with homes across Karnataka
            </p>
          </div>
          <div className="krw-footer-links">
            <a href="/privacy.html"             style={{ color:'#6B7280', textDecoration:'none', fontSize:13 }}>Privacy Policy</a>
            <a href="/terms.html"               style={{ color:'#6B7280', textDecoration:'none', fontSize:13 }}>Terms</a>
            <a href="mailto:admin@kaamready.in" style={{ color:'#6B7280', textDecoration:'none', fontSize:13 }}>Contact</a>
            <p style={{ fontSize:12, color:'#D1D5DB', margin:0 }}>© 2026 Kaam Ready</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
