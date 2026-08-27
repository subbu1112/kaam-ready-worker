export default function Toast({ msg }) {
  return (
    <div style={{ position:'fixed', bottom:86, left:'50%', transform:'translateX(-50%)',
      background:'#1A1A1A', color:'#fff', padding:'12px 22px', borderRadius:12,
      fontSize:13, fontWeight:600, zIndex:9999, boxShadow:'0 8px 24px rgba(16,24,40,.28)',
      animation:'slideUp .3s ease', maxWidth:'88%', textAlign:'center' }}>{msg}</div>
  )
}
