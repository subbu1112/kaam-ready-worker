// ─────────────────────────────────────────────────────────────
// Kaam Ready — Worker app design tokens (light "partner app" theme)
// White surfaces, black nav, green success, yellow primary CTA.
// Every screen imports from here so the look stays consistent.
// ─────────────────────────────────────────────────────────────
export const C = {
  // surfaces
  page:      '#F4F5F6',   // app background behind cards
  card:      '#FFFFFF',   // card / sheet surface
  cardAlt:   '#FAFAFA',   // subtle inset surface
  nav:       '#1A1A1A',   // black top/bottom bars
  navSoft:   '#2A2A2A',

  // text
  text:      '#1A1A1A',
  text2:     '#6B6B70',
  text3:     '#9A9AA0',
  onDark:    '#FFFFFF',
  onDark2:   'rgba(255,255,255,.62)',

  // lines
  line:      '#E9E9EB',
  lineSoft:  '#F2F2F4',

  // brand
  yellow:    '#F5C000',
  yellowD:   '#B8900A',
  yellowL:   '#FFF7DA',

  // semantic
  green:     '#0FA958',
  greenL:    '#E7F7EE',
  red:       '#E5484D',
  redL:      '#FDECEC',
  amber:     '#F59E0B',
  amberL:    '#FFF4E0',
  blue:      '#2563EB',
  blueL:     '#E8F0FE',
  purple:    '#6D46C8',
  purpleL:   '#F0EAFB',
}

export const SHADOW = {
  card:  '0 1px 2px rgba(16,24,40,.05), 0 1px 3px rgba(16,24,40,.06)',
  raise: '0 4px 16px rgba(16,24,40,.10)',
  sheet: '0 -8px 32px rgba(16,24,40,.18)',
}

export const R = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 }

// ── Reusable style objects ──────────────────────────────────
export const card = {
  background: C.card,
  borderRadius: R.lg,
  border: `1px solid ${C.line}`,
  boxShadow: SHADOW.card,
  // Screens stack cards in a flex column; without this they squash to fit
  // instead of scrolling.
  flexShrink: 0,
}

export const screen = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  background: C.page,
}

export const scroller = {
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  WebkitOverflowScrolling: 'touch',
}

export const input = {
  width: '100%',
  background: C.card,
  border: `1.5px solid ${C.line}`,
  borderRadius: R.md,
  padding: '13px 14px',
  fontSize: 15,
  color: C.text,
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
}

export const label = {
  fontSize: 11,
  fontWeight: 700,
  color: C.text3,
  display: 'block',
  marginBottom: 6,
  textTransform: 'uppercase',
  letterSpacing: .5,
}

export const btnPrimary = {
  width: '100%',
  background: C.yellow,
  color: C.text,
  border: 'none',
  borderRadius: R.md,
  padding: '15px 18px',
  fontSize: 15,
  fontWeight: 800,
  cursor: 'pointer',
  fontFamily: 'inherit',
}

export const btnDark = { ...btnPrimary, background: C.nav, color: C.onDark }

export const btnGhost = {
  ...btnPrimary,
  background: C.card,
  color: C.text,
  border: `1.5px solid ${C.line}`,
  fontWeight: 700,
}

export const btnGreen = { ...btnPrimary, background: C.green, color: '#fff' }

// Top app bar used on every secondary screen (back arrow + title)
export function barStyle() {
  return {
    background: C.card,
    borderBottom: `1px solid ${C.line}`,
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexShrink: 0,
  }
}

export const fmtINR = n => '₹' + (Number(n) || 0).toLocaleString('en-IN')
