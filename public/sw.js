const APP_VERSION = 'v2'
const STATIC_CACHE = `invoid-static-${APP_VERSION}`
const PAGE_CACHE = `invoid-pages-${APP_VERSION}`
const RUNTIME_CACHE = `invoid-runtime-${APP_VERSION}`
const CACHE_PREFIX = 'invoid-'
const APP_SHELL = [
  '/',
  '/index.html',
  '/offline.html',
  '/favicon.svg',
  '/pwa-192.png',
  '/pwa-512.png',
  '/manifest.webmanifest',
]

const shouldCacheResponse = (response) => {
  return response && response.ok && response.type !== 'opaque'
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(APP_SHELL)
    }),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && ![STATIC_CACHE, PAGE_CACHE, RUNTIME_CACHE].includes(key))
          .map((key) => {
            return caches.delete(key)
          }),
      )
    }),
  )
  self.clients.claim()
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

const staleWhileRevalidate = async (request, cacheName) => {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)

  const networkPromise = fetch(request)
    .then((response) => {
      if (shouldCacheResponse(response)) {
        cache.put(request, response.clone())
      }
      return response
    })
    .catch(() => undefined)

  if (cached) {
    return cached
  }

  const networkResponse = await networkPromise
  if (networkResponse) {
    return networkResponse
  }

  return new Response('Offline resource unavailable.', { status: 503, statusText: 'Service Unavailable' })
}

const networkFirstPage = async (request) => {
  const pageCache = await caches.open(PAGE_CACHE)

  try {
    const response = await fetch(request)
    if (shouldCacheResponse(response)) {
      pageCache.put(request, response.clone())
    }
    return response
  } catch {
    const cachedPage = await pageCache.match(request)
    if (cachedPage) {
      return cachedPage
    }

    const appShell = await caches.match('/index.html')
    if (appShell) {
      return appShell
    }

    const offlinePage = await caches.match('/offline.html')
    if (offlinePage) {
      return offlinePage
    }

    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' })
  }
}

const networkFirstRuntime = async (request) => {
  const runtimeCache = await caches.open(RUNTIME_CACHE)

  try {
    const response = await fetch(request)
    if (shouldCacheResponse(response)) {
      runtimeCache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await runtimeCache.match(request)
    if (cached) {
      return cached
    }

    return new Response('Offline resource unavailable.', { status: 503, statusText: 'Service Unavailable' })
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') {
    return
  }

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) {
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstPage(request))
    return
  }

  if (['script', 'style', 'image', 'font'].includes(request.destination)) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE))
    return
  }

  event.respondWith(networkFirstRuntime(request))
})
