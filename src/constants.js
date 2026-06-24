export const PRICING = {
  elec:   { min: 300, top: 800,  lbl: 'Electrician'  },
  plumb:  { min: 250, top: 700,  lbl: 'Plumber'      },
  clean:  { min: 500, top: 1500, lbl: 'Cleaner'      },
  carpen: { min: 400, top: 1000, lbl: 'Carpenter'    },
  paint:  { min: 800, top: 3000, lbl: 'Painter'      },
  pest:   { min: 600, top: 2000, lbl: 'Pest Control' },
  mech:   { min: 400, top: 1200, lbl: 'Mechanic'     },
  labor:  { min: 300, top: 600,  lbl: 'Labourer'     },
  emerg:  { min: 500, top: 2000, lbl: 'Emergency'    },
}
export const floorFor = id => PRICING[id]?.min ?? 300
export const topFor   = id => PRICING[id]?.top ?? 1000
export const maxAllowedFor = id => topFor(id) * 2
export const COMMISSION = 0.10
export const workerShare = amount => Math.round((amount || 0) * (1 - COMMISSION))
export const commissionOn = amount => Math.round((amount || 0) * COMMISSION)
export const TIERS = [
  { id:'bronze',   name:'Bronze',   ico:'🥉', color:'#CD7F32', minJobs:0,   minRating:0,   perk:'Standard job visibility' },
  { id:'silver',   name:'Silver',   ico:'🥈', color:'#9CA3AF', minJobs:25,  minRating:4.0, perk:'Priority in job matching' },
  { id:'gold',     name:'Gold',     ico:'🥇', color:'#F5C000', minJobs:75,  minRating:4.3, perk:'Top placement + featured badge' },
  { id:'platinum', name:'Platinum', ico:'💎', color:'#67E8F9', minJobs:200, minRating:4.6, perk:'Max visibility + premium jobs' },
]
export function tierFor(jobs = 0, rating = 5) {
  let earned = TIERS[0]
  for (const tier of TIERS) { if (jobs >= tier.minJobs && rating >= tier.minRating) earned = tier }
  return earned
}
export function nextTier(jobs = 0, rating = 5) {
  const current = tierFor(jobs, rating)
  const idx = TIERS.findIndex(t => t.id === current.id)
  const next = TIERS[idx + 1] || null
  if (!next) return { current, next: null, jobsToGo: 0, progress: 1 }
  const jobsToGo = Math.max(0, next.minJobs - jobs)
  const span = next.minJobs - current.minJobs || 1
  const progress = Math.min(1, Math.max(0, (jobs - current.minJobs) / span))
  return { current, next, jobsToGo, progress }
}
export const EMPTY_BREAKDOWN = { labor: '', material: '', additional: '', note: '' }
export function breakdownTotal({ labor, material, additional }) {
  const n = v => parseInt(v, 10) || 0
  return n(labor) + n(material) + n(additional)
}
