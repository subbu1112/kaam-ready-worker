// Platform pricing rules — min is the floor (worker can NEVER go below),
// top is the typical max; workers may set their own max up to 2× top.
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
