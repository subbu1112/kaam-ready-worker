// Shared light-theme primitives used across the worker app.
import { C, R, SHADOW, card } from '../theme'

// Back arrow + title bar (matches the reference's simple white app bars).
export function TopBar({ title, onBack, right, sub }) {
  return (
    <div style={{ background:C.card, borderBottom:`1px solid ${C.line}`, padding:'14px 14px 12px',
      display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
      {onBack && (
        <button onClick={onBack} aria-label="Back"
          style={{ background:'none', border:'none', fontSize:22, lineHeight:1, color:C.text, cursor:'pointer', padding:'0 4px', fontFamily:'inherit' }}>
          ←
        </button>
      )}
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontSize:16, fontWeight:700, color:C.text }}>{title}</p>
        {sub && <p style={{ fontSize:11, color:C.text3, marginTop:2 }}>{sub}</p>}
      </div>
      {right}
    </div>
  )
}

// Black segmented tab strip with a yellow underline — the reference's
// Today / Redeem / Custom control.
export function SegTabs({ tabs, value, onChange }) {
  return (
    <div style={{ background:C.nav, display:'flex', flexShrink:0 }}>
      {tabs.map(([id, lbl]) => {
        const on = value === id
        return (
          <button key={id} onClick={() => onChange(id)}
            style={{ flex:1, background:'none', border:'none', padding:'14px 0 11px', cursor:'pointer',
              fontFamily:'inherit', fontSize:13, fontWeight: on ? 800 : 600,
              color: on ? C.yellow : C.onDark2,
              borderBottom:`3px solid ${on ? C.yellow : 'transparent'}` }}>
            {lbl}
          </button>
        )
      })}
    </div>
  )
}

// The 2-column bordered metric grid from the earnings screen.
export function StatGrid({ items }) {
  return (
    <div style={{ ...card, overflow:'hidden', display:'grid', gridTemplateColumns:'1fr 1fr' }}>
      {items.map((it, i) => (
        <div key={it.label} style={{
          padding:'18px 16px',
          borderRight: i % 2 === 0 ? `1px solid ${C.line}` : 'none',
          borderTop: i > 1 ? `1px solid ${C.line}` : 'none',
        }}>
          <p style={{ fontSize:24, fontWeight:800, color: it.color || C.text, lineHeight:1.1 }}>{it.value}</p>
          <p style={{ fontSize:12, color:C.text2, marginTop:5 }}>{it.label}</p>
          {it.sub && <p style={{ fontSize:11, color: it.subColor || C.text3, marginTop:3 }}>{it.sub}</p>}
        </div>
      ))}
    </div>
  )
}

// Small coloured status pill.
export function Pill({ children, bg = C.lineSoft, color = C.text2 }) {
  return (
    <span style={{ background:bg, color, fontSize:11, fontWeight:700,
      padding:'4px 9px', borderRadius:R.sm, whiteSpace:'nowrap' }}>{children}</span>
  )
}

// Rounded filter chip row item.
export function Chip({ active, children, onClick }) {
  return (
    <button onClick={onClick}
      style={{ padding:'7px 14px', borderRadius:R.pill, cursor:'pointer', fontFamily:'inherit',
        fontSize:12, fontWeight:700, whiteSpace:'nowrap', flexShrink:0,
        border:`1.5px solid ${active ? C.text : C.line}`,
        background: active ? C.text : C.card,
        color: active ? C.onDark : C.text2 }}>
      {children}
    </button>
  )
}

// Bottom sheet used for filters and detail forms.
export function Sheet({ title, onClose, children, footer }) {
  return (
    <div onClick={onClose}
      style={{ position:'fixed', inset:0, background:'rgba(16,24,40,.45)', zIndex:999,
        display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background:C.card, borderRadius:'20px 20px 0 0', width:'100%', maxWidth:430,
          maxHeight:'88vh', display:'flex', flexDirection:'column', boxShadow:SHADOW.sheet }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'16px 16px 12px', borderBottom:`1px solid ${C.line}` }}>
          <button onClick={onClose} aria-label="Close"
            style={{ background:'none', border:'none', fontSize:20, color:C.text, cursor:'pointer', fontFamily:'inherit', padding:0 }}>✕</button>
          <p style={{ flex:1, fontSize:16, fontWeight:700, color:C.text }}>{title}</p>
        </div>
        <div style={{ flex:1, minHeight:0, overflowY:'auto', padding:16 }}>{children}</div>
        {footer && <div style={{ borderTop:`1px solid ${C.line}`, padding:12 }}>{footer}</div>}
      </div>
    </div>
  )
}

// Checkbox row for the filter sheet.
export function CheckRow({ checked, label, onToggle }) {
  return (
    <div onClick={onToggle}
      style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 2px', cursor:'pointer' }}>
      <span style={{ width:19, height:19, borderRadius:4, flexShrink:0,
        border:`1.6px solid ${checked ? C.green : '#C6C6C9'}`,
        background: checked ? C.green : 'transparent',
        display:'flex', alignItems:'center', justifyContent:'center',
        color:'#fff', fontSize:12, fontWeight:900 }}>{checked ? '✓' : ''}</span>
      <span style={{ fontSize:14, color:C.text }}>{label}</span>
    </div>
  )
}

// Vertical timeline of completed steps (redeem request progress).
export function Timeline({ steps }) {
  return (
    <div>
      {steps.map((s, i) => (
        <div key={i} style={{ display:'flex', gap:12 }}>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
            <span style={{ width:20, height:20, borderRadius:'50%', flexShrink:0,
              background: s.done ? C.green : '#D6D6D9', color:'#fff',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:900 }}>
              {s.done ? '✓' : ''}
            </span>
            {i < steps.length - 1 && <span style={{ width:2, flex:1, minHeight:22, background: s.done ? C.green : C.line }} />}
          </div>
          <div style={{ paddingBottom:16 }}>
            <p style={{ fontSize:13, fontWeight:600, color: s.done ? C.text : C.text3 }}>{s.title}</p>
            {s.at && <p style={{ fontSize:11, color:C.text3, marginTop:2 }}>{s.at}</p>}
          </div>
        </div>
      ))}
    </div>
  )
}

export function Empty({ ico = '📭', title, sub }) {
  return (
    <div style={{ ...card, padding:'34px 20px', textAlign:'center' }}>
      <div style={{ fontSize:36, marginBottom:10 }}>{ico}</div>
      <p style={{ fontSize:15, fontWeight:700, color:C.text }}>{title}</p>
      {sub && <p style={{ fontSize:12.5, color:C.text3, marginTop:5 }}>{sub}</p>}
    </div>
  )
}

export function Spinner({ color = C.yellow }) {
  return (
    <div style={{ display:'flex', justifyContent:'center', padding:36 }}>
      <div style={{ width:30, height:30, border:`3px solid ${C.line}`, borderTop:`3px solid ${color}`,
        borderRadius:'50%', animation:'spin .8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// Row with a leading icon tile — used for help links and menu lists.
export function Row({ ico, iconBg = C.lineSoft, title, sub, right, onClick, last }) {
  return (
    <div onClick={onClick}
      style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px',
        borderBottom: last ? 'none' : `1px solid ${C.lineSoft}`, cursor: onClick ? 'pointer' : 'default' }}>
      {ico && (
        <div style={{ width:38, height:38, borderRadius:11, background:iconBg, flexShrink:0,
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>{ico}</div>
      )}
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontSize:14.5, fontWeight:600, color:C.text }}>{title}</p>
        {sub && <p style={{ fontSize:12, color:C.text3, marginTop:2 }}>{sub}</p>}
      </div>
      {right ?? (onClick && <span style={{ color:'#C6C6C9', fontSize:18 }}>›</span>)}
    </div>
  )
}
