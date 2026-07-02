import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/react'
import OneSignal from 'react-onesignal'
import App from './App'
import './index.css'

// Swallow expected rejections from optional browser features (push prompts,
// service-worker registration) so they don't surface as unhandled rejections.
// Some Android WebViews and privacy modes deny access to localStorage /
// sessionStorage (throwing "Access is denied for this document"), and old tabs
// can request chunk hashes that no longer exist after a deploy. Both are benign.
const krBenign = (msg) => {
  const m = String(msg || '').toLowerCase()
  return (
    m.includes('dynamically imported module') ||
    m.includes('module script failed') ||
    m.includes('access is denied for this document') ||
    ((m.includes('localstorage') || m.includes('sessionstorage')) && m.includes('denied'))
  )
}

// Reload exactly once to pick up the fresh build. Uses a URL flag (not storage)
// so it still works — and can't loop — when storage access is blocked.
const krReloadOnce = () => {
  try {
    const url = new URL(window.location.href)
    if (url.searchParams.get('kr_r') === '1') return
    url.searchParams.set('kr_r', '1')
    window.location.replace(url.toString())
  } catch { /* ignore */ }
}

window.addEventListener('unhandledrejection', (e) => {
  const msg = String((e.reason && (e.reason.message || e.reason)) || '')
  const m = msg.toLowerCase()
  if (msg === 'Rejected' || m.includes('serviceworker')) { e.preventDefault(); return }
  if (m.includes('dynamically imported module') || m.includes('module script failed')) {
    e.preventDefault()
    krReloadOnce()
  }
})

window.addEventListener('vite:preloadError', (e) => {
  if (e && e.preventDefault) e.preventDefault()
  krReloadOnce()
})

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [Sentry.browserTracingIntegration()],
  tracesSampleRate: 0.2,
  environment: import.meta.env.MODE,
  beforeSend(event, hint) {
    const raw = (hint && hint.originalException) || ''
    const msg =
      (raw && (raw.message || raw)) ||
      (event.exception && event.exception.values && event.exception.values[0] && event.exception.values[0].value) ||
      ''
    if (krBenign(msg)) return null
    return event
  },
})

// Web push (OneSignal). The App ID is a public client identifier — safe to embed.
// The init promise is exposed so App.jsx can wait for it before calling
// OneSignal.login / addTags after the worker signs in.
window.krPushReady = OneSignal.init({
  appId: '75b6ff8a-1d09-43d6-be4f-c97c42cfdd82', // "kaamready worker" app
  allowLocalhostAsSecureOrigin: true,
}).catch(console.error)

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
