import { TIERS, tierFor, nextTier } from '../constants'

const Y='#F5C000', GREEN='#0FA958', BK='#FFFFFF'

export default function RewardsScreen({ profile }) {
  const jobs   = profile?.total_jobs || 0
  const rating = Number(profile?.rating) || 5
  const current = tierFor(jobs, rating)
  const { next, jobsToGo, progress } = nextTier(jobs, rating)

  const badges = [
    { ico:'🎉', title:'First Job',    desc:'Complete your first job',        earned: jobs >= 1 },
    { ico:'🔟', title:'10 Jobs',      desc:'Complete 10 jobs',               earned: jobs >= 10 },
    { ico:'💪', title:'50 Jobs',      desc:'Complete 50 jobs',               earned: jobs >= 50 },
    { ico:'🏆', title:'Century',      desc:'Complete 100 jobs',              earned: jobs >= 100 },
    { ico:'⭐', title:'Top Rated',    desc:'Maintain a 4.5+ rating',         earned: rating >= 4.5 },
    { ico:'🛡️', title:'KYC Verified', desc:'Verify your Aadhaar',            earned: !!(profile?.aadhar_verified || profile?.aadhaar_verified) },
    { ico:'🤝', title:'Trusted Pro',  desc:'Trust score above 90%',          earned: (profile?.trust_score ?? 0) >= 90 },
    { ico:'💳', title:'Payout Ready', desc:'Add your UPI / bank details',    earned: !!profile?.upi_id },
  ]
  const earnedCount = badges.filter(b => b.earned).length

  return (
    <div style={{ flex:1, minHeight:0, display:'flex', flexDirection:'column' }}>
      <div style={{ background:'#FFFFFF', borderBottom:'1px solid #E9E9EB', padding:'15px 16px', flexShrink:0 }}>
        <h1 style={{ color:'#1A1A1A', fontSize:16, fontWeight:700 }}>Rewards & Tiers</h1>
      </div>
      <div style={{ flex:1, minHeight:0, overflowY:'auto', WebkitOverflowScrolling:'touch', padding:16, paddingBottom:32, display:'flex', flexDirection:'column', gap:14 }}>

        {/* Current tier hero */}
        <div style={{ background:`linear-gradient(135deg, ${current.color}33 0%, #FFFFFF 100%)`, borderRadius:20, padding:'22px 20px', border:'1.5px solid '+current.color, textAlign:'center' }}>
          <div style={{ fontSize:50 }}>{current.ico}</div>
          <p style={{ color:current.color, fontSize:24, fontWeight:900, marginTop:4 }}>{current.name} Worker</p>
          <p style={{ color:'#6B6B70', fontSize:12, marginTop:4 }}>{current.perk}</p>
          <div style={{ display:'flex', justifyContent:'center', gap:16, marginTop:14 }}>
            <div><p style={{ color:'#1A1A1A', fontWeight:800, fontSize:18 }}>{jobs}</p><p style={{ color:'#6B6B70', fontSize:11 }}>jobs done</p></div>
            <div><p style={{ color:'#1A1A1A', fontWeight:800, fontSize:18 }}>{rating.toFixed(1)}⭐</p><p style={{ color:'#6B6B70', fontSize:11 }}>rating</p></div>
          </div>
        </div>

        {/* Progress to next tier */}
        {next ? (
          <div style={{ background:BK, borderRadius:16, padding:16, border:'1px solid #E9E9EB' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
              <span style={{ color:'#1A1A1A', fontSize:13, fontWeight:700 }}>Next: {next.ico} {next.name}</span>
              <span style={{ color:'#B8900A', fontSize:13, fontWeight:700 }}>{jobsToGo} jobs to go</span>
            </div>
            <div style={{ height:10, background:'#EFEFF1', borderRadius:6, overflow:'hidden' }}>
              <div style={{ width:(progress*100)+'%', height:'100%', background:`linear-gradient(90deg, ${current.color}, ${next.color})`, transition:'width .4s' }} />
            </div>
            <p style={{ color:'#6B6B70', fontSize:11, marginTop:8 }}>Reach {next.minJobs} jobs and keep a {next.minRating}+ rating to unlock: {next.perk}.</p>
          </div>
        ) : (
          <div style={{ background:'#E7F7EE', borderRadius:16, padding:16, border:'1px solid '+GREEN, textAlign:'center' }}>
            <p style={{ color:GREEN, fontSize:14, fontWeight:800 }}>💎 You've reached the top tier — Platinum!</p>
          </div>
        )}

        {/* All tiers ladder */}
        <div>
          <p style={{ color:'#1A1A1A', fontWeight:800, fontSize:15, marginBottom:8 }}>All Tiers</p>
          {TIERS.map(tier => {
            const isCurrent = tier.id === current.id
            const unlocked = jobs >= tier.minJobs && rating >= tier.minRating
            return (
              <div key={tier.id} style={{ display:'flex', alignItems:'center', gap:12, background:BK, borderRadius:14, padding:'12px 14px', marginBottom:8, border:'1px solid '+(isCurrent?tier.color:'#E9E9EB'), opacity: unlocked ? 1 : 0.6 }}>
                <div style={{ fontSize:28, filter: unlocked ? 'none' : 'grayscale(1)' }}>{tier.ico}</div>
                <div style={{ flex:1 }}>
                  <p style={{ color: unlocked ? tier.color : '#6B6B70', fontSize:14, fontWeight:800 }}>{tier.name}{isCurrent && <span style={{ color:GREEN, fontSize:11, marginLeft:8 }}>● You are here</span>}</p>
                  <p style={{ color:'#6B6B70', fontSize:11, marginTop:2 }}>{tier.minJobs}+ jobs · {tier.minRating}+ rating · {tier.perk}</p>
                </div>
                {unlocked && <span style={{ color:GREEN, fontSize:16 }}>✓</span>}
              </div>
            )
          })}
        </div>

        {/* Achievement badges */}
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:8 }}>
            <p style={{ color:'#1A1A1A', fontWeight:800, fontSize:15 }}>Achievements</p>
            <p style={{ color:'#B8900A', fontSize:13, fontWeight:700 }}>{earnedCount}/{badges.length}</p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {badges.map(b => (
              <div key={b.title} style={{ background: b.earned ? '#FFF7DA' : '#FAFAFA', borderRadius:14, padding:'14px 12px', border:'1px solid '+(b.earned?Y:'#E9E9EB'), textAlign:'center', opacity:b.earned?1:0.55 }}>
                <div style={{ fontSize:28, marginBottom:6, filter: b.earned?'none':'grayscale(1)' }}>{b.ico}</div>
                <p style={{ fontSize:13, fontWeight:800, color: b.earned?Y:'#6B6B70' }}>{b.title}</p>
                <p style={{ fontSize:10, color:'#6B6B70', marginTop:3 }}>{b.desc}</p>
                {b.earned && <p style={{ fontSize:10, color:GREEN, marginTop:6, fontWeight:700 }}>✓ Earned</p>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
