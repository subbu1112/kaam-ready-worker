// OpenStreetMap + Leaflet map — no API key required
import { useEffect, useRef } from 'react'

export default function JobMap({ customerLat, customerLng, workerLat, workerLng, customerAddress }) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)

  useEffect(() => {
    if (!customerLat || !customerLng) return
    if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null }

    // Dynamically load Leaflet CSS + JS
    function loadLeaflet() {
      return new Promise((resolve) => {
        if (window.L) { resolve(window.L); return }
        const css = document.createElement('link')
        css.rel = 'stylesheet'
        css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(css)
        const js = document.createElement('script')
        js.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
        js.onload = () => resolve(window.L)
        document.head.appendChild(js)
      })
    }

    loadLeaflet().then(L => {
      if (!mapRef.current) return
      const map = L.map(mapRef.current, { zoomControl: true, attributionControl: false })
      mapInstance.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(map)

      // Customer marker (red pin)
      const custIcon = L.divIcon({
        html: `<div style="background:#ef4444;width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35)"></div>`,
        iconSize:[32,32], iconAnchor:[16,32], className:''
      })
      const custMarker = L.marker([customerLat, customerLng], { icon: custIcon }).addTo(map)
      custMarker.bindPopup(`<b>📍 Customer</b><br>${customerAddress||'Customer location'}`)

      if (workerLat && workerLng) {
        // Worker marker (yellow)
        const wrkIcon = L.divIcon({
          html: `<div style="background:#F5C000;width:32px;height:32px;border-radius:50%;border:3px solid #1C1C1E;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font-size:16px">🔧</div>`,
          iconSize:[32,32], iconAnchor:[16,16], className:''
        })
        const wrkMarker = L.marker([workerLat, workerLng], { icon: wrkIcon }).addTo(map)
        wrkMarker.bindPopup('<b>🔧 Your Location</b>')

        // Draw dashed line between worker and customer
        L.polyline([[workerLat, workerLng],[customerLat, customerLng]], {
          color: '#F5C000', weight: 3, dashArray:'8,6', opacity: 0.8
        }).addTo(map)

        // Fit both in view
        map.fitBounds([[customerLat, customerLng],[workerLat, workerLng]], { padding:[40,40] })
      } else {
        map.setView([customerLat, customerLng], 15)
      }
    })

    return () => { if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null } }
  }, [customerLat, customerLng, workerLat, workerLng])

  if (!customerLat || !customerLng) return null

  const gmapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${customerLat},${customerLng}`

  return (
    <div style={{ borderRadius:16, overflow:'hidden', border:'1.5px solid #2a2a2a' }}>
      <div ref={mapRef} style={{ height:220, width:'100%', background:'#1a1a1a' }} />
      <a href={gmapsUrl} target="_blank" rel="noreferrer"
        style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, background:'#F5C000',
          padding:'11px 16px', color:'#1C1C1E', fontWeight:800, fontSize:14, textDecoration:'none', fontFamily:'inherit' }}>
        🗺️ Navigate in Google Maps
      </a>
    </div>
  )
}
