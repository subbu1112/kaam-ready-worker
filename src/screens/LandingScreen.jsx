const Y = '#F5C000'
const DARK = '#1A1A1A'

function PhoneMockup() {
  return (
    <div style={{ position:'relative', width:160, height:280, margin:'0 auto' }}>
      <div style={{ width:160, height:280, background:'#FFFFFF', borderRadius:28,
        boxShadow:'0 24px 60px rgba(0,0,0,.3)', border:'6px solid #333',
        display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ height:22, background:'#111', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ width:40, height:8, background:'#333', borderRadius:4 }} />
        </div>
        <div style={{ flex:1, background:'#FAFAFA', padding:'8px 8px 6px', display:'flex', flexDirection:'column', gap:5 }}>
          {/* Online toggle */}
          <div style={{ background:DARK, borderRadius:8, padding:'6px 8px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:8, fontWeight:800, color:'#FFF' }}>🟢 Online</span>
            <span style={{ fontSize:7, color:Y, fontWeight:700 }}>Earnings ₹840</span>
          </div>
          {/* Job alert */}
          <div style={{ background:'#FFF', borderRadius:8, padding:'7px 8px', border:'2px solid '+Y }}>
            <p style={{ fontSize:8, fontWeight:900, color:DARK, margin:'0 0 1px' }}>🔔 New Job Alert!</p>
            <p style={{ fontSize:7, color:'#6B7280', margin:'0 0 4px' }}>⚡ Electrician · 1.2km · ₹400+</p>
            <div style={{ background:Y, borderRadius:5, padding:'3px 8px', textAlign:'center' }}>
              <span style={{ fontSize:8, fontWeight:900, color:DARK }}>✓ Accept Job</span>
            </div>
          </div>
          {/* Stats row */}
          <div style={{ display:'flex', gap:4 }}>
            {[['₹840','Today'],['3','Jobs'],['4.9★','Rating']].map(([v,l]) => (
              <div key={l} style={{ flex:1, background:'#FFF', borderRadius:7, padding:'5px 3px', textAlign:'center' }}>
                <p style={{ fontSize:8, fontWeight:900, color:DARK, margin:0 }}>{v}</p>
                <p style={{ fontSize:6, color:'#9CA3AF', margin:0 }}>{l}</p>
              </div>
            ))}
          </div>
          {/* Nav */}
          <div style={{ marginTop:'auto', background:'#FFF', borderRadius:8, padding:'4px 0', display:'flex', justifyContent:'space-around' }}>
            {['🏠','💰','👤'].map(t => <span key={t} style={{ fontSize:13 }}>{t}</span>)}
          </div>
        </div>
      </div>
      <div style={{ position:'absolute', bottom:-20, left:'50%', transform:'translateX(-50%)',
        width:120, height:20, background:'rgba(245,192,0,.4)', borderRadius:'50%', filter:'blur(10px)' }} />
    </div>
  )
}

export default function LandingScreen({ setScreen }) {
  return (
    <div style={{ height:'100dvh', overflowY:'auto', WebkitOverflowScrolling:'touch',
      background:'#FFFFFF', fontFamily:'Inter, system-ui, sans-serif', maxWidth:430, margin:'0 auto' }}>

      {/* ── NAV ── */}
      <nav style={{ position:'sticky', top:0, zIndex:50, background:'rgba(255,255,255,.95)',
        backdropFilter:'blur(12px)', borderBottom:'1px solid #F0F0F0',
        display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 20px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:32, height:32, background:Y, borderRadius:10,
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>🏠</div>
          <div>
            <span style={{ fontWeight:900, fontSize:18, color:DARK, letterSpacing:'-0.5px' }}>Kaam Ready</span>
            <span style={{ fontSize:10, color:'#9CA3AF', display:'block', marginTop:-2 }}>For Workers</span>
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => setScreen('login')}
            style={{ background:'none', border:'1.5px solid #E5E7EB', borderRadius:9, padding:'7px 13px',
              fontWeight:700, fontSize:12, cursor:'pointer', fontFamily:'inherit', color:'#6B7280' }}>
            Sign Up
          </button>
          <button onClick={() => setScreen('login')}
            style={{ background:DARK, border:'none', borderRadius:9, padding:'8px 14px',
              fontWeight:700, fontSize:12, cursor:'pointer', fontFamily:'inherit', color:Y }}>
            Login
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ background:`linear-gradient(150deg, ${Y} 0%, #FFD740 55%, #FFC800 100%)`,
        padding:'44px 24px 52px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-50, right:-50, width:200, height:200,
          background:'rgba(0,0,0,.06)', borderRadius:'50%' }} />
        <div style={{ position:'absolute', bottom:-60, left:-30, width:180, height:180,
          background:'rgba(0,0,0,.04)', borderRadius:'50%' }} />
        <div style={{ position:'relative', zIndex:1 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(0,0,0,.1)',
            borderRadius:20, padding:'5px 12px', marginBottom:18 }}>
            <span style={{ width:6, height:6, background:DARK, borderRadius:'50%', display:'inline-block' }} />
            <span style={{ fontSize:11, fontWeight:700, color:DARK, letterSpacing:0.8 }}>500+ WORKERS EARNING DAILY</span>
          </div>
          <h1 style={{ fontSize:36, fontWeight:900, color:DARK, lineHeight:1.1,
            letterSpacing:'-1.5px', margin:'0 0 14px' }}>
            Your Skills,<br/>Your <span style={{ background:DARK, color:Y,
              padding:'0 8px', borderRadius:8, display:'inline-block' }}>Income</span>
          </h1>
          <p style={{ fontSize:14, color:'#5C4000', margin:'0 0 28px', lineHeight:1.6, maxWidth:280 }}>
            Get verified home service jobs near you. Earn ₹500–₹2000/day with weekly UPI payouts
          </p>
          <div style={{ display:'flex', gap:10, marginBottom:40 }}>
            <button onClick={() => setScreen('login')}
              style={{ background:DARK, color:Y, border:'none', borderRadius:13,
                padding:'14px 24px', fontWeight:900, fontSize:15, cursor:'pointer',
                fontFamily:'inherit', boxShadow:'0 6px 24px rgba(0,0,0,.2)', letterSpacing:'-0.3px' }}>
              Start Earning →
            </button>
            <button onClick={() => setScreen('login')}
              style={{ background:'rgba(0,0,0,.1)', color:DARK, border:'1.5px solid rgba(0,0,0,.15)',
                borderRadius:13, padding:'14px 18px', fontWeight:700, fontSize:13, cursor:'pointer',
                fontFamily:'inherit' }}>
              Learn More
            </button>
          </div>
          <PhoneMockup />
        </div>
      </section>

      {/* ── EARN STATS ── */}
      <section style={{ background:DARK, padding:'18px 12px' }}>
        <div style={{ display:'flex', justifyContent:'space-around' }}>
          {[['₹500–2000','Per Day'],['Weekly','UPI Payout'],['5 km','Job Radius'],['Free','To Join']].map(([v,l]) => (
            <div key={l} style={{ textAlign:'center' }}>
              <p style={{ fontWeight:900, fontSize:15, color:Y, margin:0, letterSpacing:'-0.3px' }}>{v}</p>
              <p style={{ fontSize:10, fontWeight:600, color:'#6B7280', margin:'2px 0 0' }}>{l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── PERKS ── */}
      <section style={{ padding:'28px 20px' }}>
        <p style={{ fontSize:12, fontWeight:700, color:'#9CA3AF', letterSpacing:1, textTransform:'uppercase', marginBottom:6 }}>
          Why join us
        </p>
        <h2 style={{ fontSize:22, fontWeight:900, color:DARK, margin:'0 0 18px', letterSpacing:'-0.5px' }}>
          Built for Workers
        </h2>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {[
            { ico:'⚡', title:'Instant Job Alerts',    desc:'Get notified the moment a job appears near you — accept in one tap' },
            { ico:'💰', title:'Weekly Payouts',         desc:'Earnings accumulated all week, paid to your UPI every Friday' },
            { ico:'📍', title:'Jobs Near You',          desc:'All jobs dispatched within 5 km — no long commutes' },
            { ico:'🛡️', title:'Platform Protected',    desc:'Every booking is verified — no scams, disputes handled by us' },
          ].map(p => (
            <div key={p.title} style={{ display:'flex', gap:14, alignItems:'flex-start',
              background:'#F5F5F8', borderRadius:14, padding:'14px' }}>
              <span style={{ fontSize:24, flexShrink:0 }}>{p.ico}</span>
              <div>
                <p style={{ fontWeight:800, fontSize:14, color:DARK, margin:'0 0 3px' }}>{p.title}</p>
                <p style={{ fontSize:12, color:'#6B7280', margin:0, lineHeight:1.5 }}>{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ background:'#F5F5F8', padding:'28px 20px' }}>
        <p style={{ fontSize:12, fontWeight:700, color:'#9CA3AF', letterSpacing:1, textTransform:'uppercase', marginBottom:6 }}>
          Getting started
        </p>
        <h2 style={{ fontSize:22, fontWeight:900, color:DARK, margin:'0 0 20px', letterSpacing:'-0.5px' }}>
          3 Steps to Earn
        </h2>
        {[
          { n:'01', ico:'📝', title:'Create Profile',    desc:'Enter your skill, city & upload Aadhaar — 2-minute signup' },
          { n:'02', ico:'🟢', title:'Go Online',          desc:'Toggle online — job alerts arrive instantly on your phone' },
          { n:'03', ico:'💸', title:'Complete & Get Paid', desc:'Finish the job, admin verifies, wallet credited same day' },
        ].map((s, i) => (
          <div key={s.n} style={{ display:'flex', gap:14, marginBottom: i < 2 ? 20 : 0 }}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
              <div style={{ width:44, height:44, borderRadius:14, background:Y,
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
                {s.ico}
              </div>
              {i < 2 && <div style={{ width:2, flex:1, background:'#E5E7EB', marginTop:6, minHeight:20 }} />}
            </div>
            <div style={{ paddingTop:6 }}>
              <p style={{ fontSize:11, fontWeight:700, color:'#9CA3AF', margin:'0 0 3px', letterSpacing:0.5 }}>{s.n}</p>
              <p style={{ fontWeight:800, fontSize:15, color:DARK, margin:'0 0 4px' }}>{s.title}</p>
              <p style={{ fontSize:13, color:'#6B7280', margin:0, lineHeight:1.5 }}>{s.desc}</p>
            </div>
          </div>
        ))}
      </section>

      {/* ── CTA BLOCK ── */}
      <section style={{ margin:'28px 20px', background:`linear-gradient(135deg, ${Y} 0%, #FFD740 100%)`,
        borderRadius:22, padding:'28px 22px', textAlign:'center', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-20, right:-20, width:100, height:100,
          background:'rgba(0,0,0,.06)', borderRadius:'50%' }} />
        <p style={{ fontWeight:900, fontSize:22, color:DARK, margin:'0 0 8px', letterSpacing:'-0.5px' }}>
          Ready to start?
        </p>
        <p style={{ fontSize:13, color:'#7A5800', margin:'0 0 20px', lineHeight:1.5 }}>
          Free to join. No monthly fees. Start earning today.
        </p>
        <button onClick={() => setScreen('login')}
          style={{ background:DARK, color:Y, border:'none', borderRadius:14,
            padding:'15px 40px', fontWeight:900, fontSize:16, cursor:'pointer',
            fontFamily:'inherit', width:'100%', boxShadow:'0 6px 20px rgba(0,0,0,.2)' }}>
          Create Your Profile →
        </button>
      </section>

      {/* ── CUSTOMER LINK ── */}
      <section style={{ margin:'0 20px 28px', background:'#F5F5F8', borderRadius:16,
        padding:'16px 18px', display:'flex', alignItems:'center', gap:14 }}>
        <span style={{ fontSize:26 }}>🏠</span>
        <div style={{ flex:1 }}>
          <p style={{ fontWeight:700, fontSize:13, color:DARK, margin:'0 0 2px' }}>Need home services?</p>
          <p style={{ fontSize:11, color:'#9CA3AF', margin:0 }}>Use the customer app</p>
        </div>
        <a href="https://kaam-ready-customer.vercel.app" target="_blank" rel="noreferrer"
          style={{ background:DARK, color:'#FFF', textDecoration:'none', borderRadius:10,
            padding:'8px 14px', fontWeight:700, fontSize:12, flexShrink:0 }}>
          Open →
        </a>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop:'1px solid #F0F0F0', padding:'24px 20px 44px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
          <div style={{ width:28, height:28, background:Y, borderRadius:8,
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>🏠</div>
          <span style={{ fontWeight:900, fontSize:16, color:DARK }}>Kaam Ready</span>
        </div>
        <p style={{ fontSize:12, color:'#9CA3AF', marginBottom:14, lineHeight:1.6 }}>
          Connecting skilled workers with homes across Karnataka
        </p>
        <div style={{ display:'flex', gap:16, fontSize:12 }}>
          <a href="/privacy.html"            style={{ color:'#6B7280', textDecoration:'none' }}>Privacy</a>
          <a href="/terms.html"              style={{ color:'#6B7280', textDecoration:'none' }}>Terms</a>
          <a href="mailto:admin@kaamready.in" style={{ color:'#6B7280', textDecoration:'none' }}>Contact</a>
        </div>
        <p style={{ fontSize:11, color:'#D1D5DB', marginTop:14 }}>© 2026 Kaam Ready · Mysuru, Karnataka</p>
      </footer>
    </div>
  )
}
