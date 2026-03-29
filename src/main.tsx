import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').then((registration) => {
      let hasReloaded = false

      const askForUpdate = () => {
        const shouldUpdate = window.confirm('A new version of Invoid is available. Update now?')
        if (shouldUpdate) {
          registration.waiting?.postMessage({ type: 'SKIP_WAITING' })
        }
      }

      if (registration.waiting) {
        askForUpdate()
      }

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (!newWorker) {
          return
        }

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            askForUpdate()
          }
        })
      })

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (hasReloaded) {
          return
        }
        hasReloaded = true
        window.location.reload()
      })
    })
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
