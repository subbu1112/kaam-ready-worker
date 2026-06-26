import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/react'
import App from './App'
import './index.css'

// Auto-recover from stale lazy-loaded chunks after a new deploy.
window.addEventListener('vite:preloadError', () => {
  if (!sessionStorage.getItem('kr_reloaded_stale')) {
    sessionStorage.setItem('kr_reloaded_stale', '1')
    window.location.reload()
  }
})

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [Sentry.browserTracingIntegration()],
  tracesSampleRate: 0.2,
  environment: import.meta.env.MODE,
})

ReactDOM.createRoot(document.getElementById('root')).render(<App />)

// Self-heal: unregister any previously-deployed custom service worker (/sw.js)
// and clear its caches. A caching SW could break navigation for returning
// visitors.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then((regs) => regs.forEach((r) => {
      const url = (r.active && r.active.scriptURL) || ''
      if (url.endsWith('/sw.js')) r.unregister()
    }))
    .catch(() => {})
  if (window.caches) {
    caches.keys().then((ks) => ks.forEach((k) => { if (k.startsWith('kr-') || k.startsWith('kaam-ready')) caches.delete(k) })).catch(() => {})
  }
}
