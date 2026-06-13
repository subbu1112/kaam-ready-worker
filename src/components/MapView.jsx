import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const WORKER_ICON = L.divIcon({
  html: '<div style="background:#F5C000;border:2.5px solid #000;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-size:17px;box-shadow:0 2px 8px rgba(0,0,0,.35)">👷</div>',
  iconSize: [34, 34], iconAnchor: [17, 17], className: ''
})

const HOME_ICON = L.divIcon({
  html: '<div style="background:#22c55e;border:2.5px solid #fff;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-size:17px;box-shadow:0 2px 8px rgba(0,0,0,.35)">📍</div>',
  iconSize: [34, 34], iconAnchor: [17, 17], className: ''
})

export default function MapView({ workerLat, workerLng, customerLat, customerLng, height = 170, style = {} }) {
  const mapRef         = useRef(null)
  const mapInstanceRef = useRef(null)
  const workerMarkerRef = useRef(null)

  // Default to Bengaluru if no coords
  const cLat = customerLat || 12.9716
  const cLng = customerLng || 77.5946
  const wLat = workerLat  || (cLat + 0.008)
  const wLng = workerLng  || (cLng + 0.006)

  useEffect(() => {
    if (mapInstanceRef.current) return
    // IMPORTANT: mapRef.current must NOT have overflow:hidden — the outer wrapper handles clipping
    const map = L.map(mapRef.current, { zoomControl: false, attributionControl: false }).setView([cLat, cLng], 14)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map)
    L.marker([cLat, cLng], { icon: HOME_ICON }).addTo(map).bindPopup('Customer')
    workerMarkerRef.current = L.marker([wLat, wLng], { icon: WORKER_ICON }).addTo(map).bindPopup('You')
    L.polyline([[cLat, cLng], [wLat, wLng]], { color: '#F5C000', weight: 3, dashArray: '6,6', opacity: 0.85 }).addTo(map)
    mapInstanceRef.current = map

    // Multiple invalidateSize calls to handle async layout settling
    const timers = [
      setTimeout(() => map.invalidateSize(), 100),
      setTimeout(() => map.invalidateSize(), 400),
      setTimeout(() => map.invalidateSize(), 900),
    ]
    const onResize = () => map.invalidateSize()
    window.addEventListener('resize', onResize)
    return () => {
      timers.forEach(clearTimeout)
      window.removeEventListener('resize', onResize)
      map.remove()
      mapInstanceRef.current = null
    }
  }, [])

  // Update worker position when it changes
  useEffect(() => {
    if (workerMarkerRef.current && workerLat && workerLng) {
      workerMarkerRef.current.setLatLng([workerLat, workerLng])
    }
  }, [workerLat, workerLng])

  // Outer div handles borderRadius + clipping; inner mapRef div has NO overflow:hidden
  // (overflow:hidden on the Leaflet container prevents tiles from rendering)
  return (
    <div style={{ borderRadius: 16, overflow: 'hidden', height, ...style }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}
