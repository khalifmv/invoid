import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const baseUrl = import.meta.env.BASE_URL
    const swUrl = `${baseUrl}sw.js`

    void navigator.serviceWorker.register(swUrl, { scope: baseUrl }).then((registration) => {
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
