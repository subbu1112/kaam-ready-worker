// Capture install prompt before anything else mounts
window.__pwaPrompt = null
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  window.__pwaPrompt = e
})

import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/react'
import OneSignal from 'react-onesignal'
import App from './App'
import './index.css'

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [Sentry.browserTracingIntegration()],
  tracesSampleRate: 1.0,
})

OneSignal.init({
  appId: import.meta.env.VITE_ONESIGNAL_APP_ID,
  allowLocalhostAsSecureOrigin: true,
}).catch(console.error)

ReactDOM.createRoot(document.getElementById('root')).render(<App />)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'))
}
