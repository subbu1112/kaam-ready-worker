const Y = '#F5C000'

const PERKS = [
  { ico:'💰', title:'Earn ₹500–₹2000/day', desc:'Get paid per job — weekly payouts to your UPI' },
  { ico:'📍', title:'Work Near You',        desc:'Jobs dispatched within 5 km of your location' },
  { ico:'⚡', title:'Instant Job Alerts',   desc:'Get notified the moment a nearby job is posted' },
  { ico:'🛡️', title:'Platform Backed',     desc:'Every booking is verified — no fraud, no disputes' },
]

const STEPS = [
  { n:'1', title:'Sign Up',        desc:'Create your profile with your skill, city & Aadhaar' },
  { n:'2', title:'Go Online',      desc:'Toggle online — job alerts arrive instantly on your phone' },
  { n:'3', title:'Accept & Earn',  desc:'Complete the job, we verify payment, weekly payout to your UPI' },
]

export default function LandingScreen({ setScreen }) {
  return (
    <div style={{ minHeight:'100dvh', background:'#FAFAFA', fontFamily:'Inter, system-ui, sans-serif',
      maxWidth:430, margin:'0 auto', overflowX:'hidden' }}>

      {/* Nav */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
        padding:'20px 24px 14px', background:'#FFF', borderBottom:'1px solid #F0F0F0',
        position:'sticky', top:0, zIndex:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:34, height:34, background: Y, borderRadius:10,
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🏠</div>
          <div>
            <span style={{ fontWeight:900, fontSize:18, color:'#1A1A1A', letterSpacing:'-0.5px' }}>Kaam Ready</span>
            <span style={{ fontSize:11, color:'#9CA3AF', display:'block', marginTop:-2 }}>For Workers</span>
          </div>
        </div>
        <button onClick={() => setScreen('login')}
          style={{ background:'#F5F5F5', border:'none', borderRadius:10, padding:'9px 18px',
            fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit', color:'#1A1A1A' }}>
          Login
        </button>
      </div>

      {/* Hero */}
      <div style={{ background:`linear-gradient(160deg, #1A1A1A 0%, #2D2D2D 100%)`,
        padding:'48px 24px 44px', textAlign:'center', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-20, right:-20, width:140, height:140,
          background:'rgba(245,192,0,.1)', borderRadius:'50%' }} />
        <div style={{ position:'absolute', bottom:-40, left:-30, width:120, height:120,
          background:'rgba(245,192,0,.06)', borderRadius:'50%' }} />
        <div style={{ display:'inline-block', background:'rgba(245,192,0,.15)', borderRadius:12,
          padding:'6px 14px', marginBottom:16 }}>
          <span style={{ fontSize:12, fontWeight:700, color: Y, letterSpacing:1, textTransform:'uppercase' }}>
            Join 1000+ Workers
          </span>
        </div>
        <h1 style={{ fontSize:34, fontWeight:900, color:'#FFFFFF', lineHeight:1.15,
          letterSpacing:'-1px', margin:'0 0 16px' }}>
          Your Skills,<br/><span style={{ color: Y }}>Your Income</span>
        </h1>
        <p style={{ fontSize:15, color:'#9CA3AF', maxWidth:300, margin:'0 auto 28px', lineHeight:1.5 }}>
          Get verified home service jobs near you — electrician, plumber, carpenter & more
        </p>
        <button onClick={() => setScreen('login')}
          style={{ background: Y, color:'#1A1A1A', border:'none', borderRadius:16,
            padding:'16px 40px', fontWeight:900, fontSize:17, cursor:'pointer',
            fontFamily:'inherit', boxShadow:'0 8px 24px rgba(245,192,0,.4)', letterSpacing:'-0.3px' }}>
          Start Earning →
        </button>
        <p style={{ fontSize:12, color:'#6B7280', marginTop:12 }}>Free to join · Weekly payouts</p>
      </div>

      {/* Earn bar */}
      <div style={{ background: Y, padding:'14px 20px', display:'flex', justifyContent:'space-around' }}>
        {[['₹500–2000','per day'],['30 min','avg. job time'],['Weekly','UPI payouts']].map(([v,l]) => (
          <div key={l} style={{ textAlign:'center' }}>
            <p style={{ fontWeight:900, fontSize:16, color:'#1A1A1A', margin:0 }}>{v}</p>
            <p style={{ fontSize:11, fontWeight:600, color:'#7A5800', margin:'1px 0 0' }}>{l}</p>
          </div>
        ))}
      </div>

      {/* Perks */}
      <div style={{ padding:'28px 20px 0' }}>
        <h2 style={{ fontSize:20, fontWeight:800, color:'#1A1A1A', marginBottom:16, letterSpacing:'-0.5px' }}>
          Why Kaam Ready?
        </h2>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {PERKS.map(p => (
            <div key={p.title} style={{ background:'#FFF', borderRadius:16,
              padding:'16px', display:'flex', gap:14, alignItems:'flex-start',
              boxShadow:'0 1px 4px rgba(0,0,0,.05)', border:'1px solid #F0F0F2' }}>
              <div style={{ fontSize:28, flexShrink:0 }}>{p.ico}</div>
              <div>
                <p style={{ fontWeight:800, fontSize:14, color:'#1A1A1A', margin:'0 0 3px' }}>{p.title}</p>
                <p style={{ fontSize:12, color:'#6B7280', margin:0, lineHeight:1.5 }}>{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div style={{ padding:'32px 20px 0' }}>
        <h2 style={{ fontSize:20, fontWeight:800, color:'#1A1A1A', marginBottom:20, letterSpacing:'-0.5px' }}>
          How it works
        </h2>
        {STEPS.map((s, i) => (
          <div key={s.n} style={{ display:'flex', gap:0, position:'relative' }}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginRight:16 }}>
              <div style={{ width:40, height:40, borderRadius:12, background: Y,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontWeight:900, fontSize:16, color:'#1A1A1A', flexShrink:0 }}>{s.n}</div>
              {i < STEPS.length-1 && <div style={{ width:2, flex:1, background:'#F0F0F0', minHeight:28, margin:'4px 0' }} />}
            </div>
            <div style={{ paddingBottom: i < STEPS.length-1 ? 20 : 0 }}>
              <p style={{ fontWeight:800, fontSize:15, color:'#1A1A1A', margin:'8px 0 4px' }}>{s.title}</p>
              <p style={{ fontSize:13, color:'#6B7280', margin:0, lineHeight:1.5 }}>{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA block */}
      <div style={{ margin:'32px 20px 0', background:`linear-gradient(135deg, ${Y} 0%, #FFD740 100%)`,
        borderRadius:20, padding:'28px 24px', textAlign:'center' }}>
        <p style={{ fontWeight:900, fontSize:22, color:'#1A1A1A', margin:'0 0 8px', letterSpacing:'-0.5px' }}>
          Ready to earn?
        </p>
        <p style={{ fontSize:14, color:'#7A5800', margin:'0 0 20px', lineHeight:1.5 }}>
          Sign up takes 2 minutes — start getting jobs today
        </p>
        <button onClick={() => setScreen('login')}
          style={{ background:'#1A1A1A', color: Y, border:'none', borderRadius:14,
            padding:'15px 40px', fontWeight:900, fontSize:16, cursor:'pointer',
            fontFamily:'inherit', width:'100%', boxShadow:'0 6px 20px rgba(0,0,0,.2)' }}>
          Create Your Profile →
        </button>
      </div>

      {/* Customer CTA */}
      <div style={{ margin:'20px 20px 0', background:'#F5F5F8', borderRadius:16, padding:'18px 20px',
        display:'flex', alignItems:'center', gap:14 }}>
        <span style={{ fontSize:28 }}>🏠</span>
        <div style={{ flex:1 }}>
          <p style={{ fontWeight:700, fontSize:14, color:'#1A1A1A', margin:'0 0 2px' }}>Need home services?</p>
          <p style={{ fontSize:12, color:'#9CA3AF', margin:0 }}>Book on the customer app</p>
        </div>
        <a href="https://kaam-ready-customer.vercel.app" target="_blank" rel="noreferrer"
          style={{ background:'#1A1A1A', color:'#FFF', textDecoration:'none',
            borderRadius:10, padding:'8px 14px', fontWeight:700, fontSize:12, flexShrink:0 }}>
          Open →
        </a>
      </div>

      {/* Footer */}
      <div style={{ padding:'28px 20px 40px', textAlign:'center' }}>
        <p style={{ fontSize:12, color:'#9CA3AF', marginBottom:10 }}>
          © 2026 Kaam Ready · Mysuru, Karnataka
        </p>
        <div style={{ display:'flex', justifyContent:'center', gap:20, fontSize:12, color:'#9CA3AF' }}>
          <a href="/privacy.html" style={{ color:'#9CA3AF', textDecoration:'none' }}>Privacy</a>
          <a href="/terms.html"   style={{ color:'#9CA3AF', textDecoration:'none' }}>Terms</a>
          <a href="mailto:admin@kaamready.in" style={{ color:'#9CA3AF', textDecoration:'none' }}>Contact</a>
        </div>
      </div>
    </div>
  )
}
