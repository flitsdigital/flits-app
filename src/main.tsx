import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'sonner/dist/styles.css'
import './index.css'
import App from './App'
import { applyPersistedAccent } from './store/useAppearanceStore'

applyPersistedAccent()

/** Remove legacy SW — it cached old /assets and blocked deploy updates (e.g. toast fixes). */
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  void navigator.serviceWorker.getRegistrations().then((regs) => {
    for (const reg of regs) void reg.unregister()
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
