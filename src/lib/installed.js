// Is this the installed app, or the website in a browser?
//
// The landing page is marketing for web visitors. Someone who installed the
// app from Play (a TWA) or added it to their home screen expects the APP, not
// a page selling them the app they already have — so they go straight to
// sign-in and skip the landing page entirely.
export function isInstalledApp() {
  try {
    if (window.matchMedia?.('(display-mode: standalone)')?.matches) return true
    if (window.matchMedia?.('(display-mode: fullscreen)')?.matches) return true
    if (window.matchMedia?.('(display-mode: minimal-ui)')?.matches) return true
    if (window.navigator?.standalone === true) return true            // iOS home screen
    if (String(document.referrer || '').startsWith('android-app://')) return true  // TWA
  } catch { /* treat as web */ }
  return false
}

// Where the app should start, and where sign-out should return to.
export const entryScreen = () => (isInstalledApp() ? 'login' : 'landing')
