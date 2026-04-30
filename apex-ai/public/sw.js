// APEX Executive Assistant — Service Worker
// Handles push notifications and offline caching

const CACHE_NAME = 'apex-v1'
const STATIC_ASSETS = ['/', '/index.html', '/manifest.json']

// ── Install ───────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

// ── Activate ──────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// ── Fetch (network-first for API, cache-first for assets) ─────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Skip non-GET and cross-origin Supabase calls
  if (event.request.method !== 'GET' || url.hostname.includes('supabase')) return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        return response
      })
      .catch(() => caches.match(event.request))
  )
})

// ── Push Notifications ───────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'APEX', body: event.data.text(), type: 'general' }
  }

  const iconMap = {
    task_start:           '▶️',
    running_behind:       '⏰',
    deadline_approaching: '🚨',
    focus_reminder:       '🧠',
    midday_check:         '☀️',
    end_of_day_review:    '📊',
    overload_warning:     '⚠️',
    streak_celebration:   '🏆',
  }

  const icon = iconMap[payload.type] ?? '⚡'

  event.waitUntil(
    self.registration.showNotification(`${icon} ${payload.title}`, {
      body:    payload.body,
      icon:    '/pwa-192x192.png',
      badge:   '/badge-72x72.png',
      tag:     payload.type ?? 'apex-notif',
      data:    { url: payload.actionUrl ?? '/', taskId: payload.taskId },
      requireInteraction: ['deadline_approaching', 'overload_warning'].includes(payload.type),
      actions: payload.taskId
        ? [
            { action: 'start',   title: '▶ Start Task' },
            { action: 'dismiss', title: '✕ Dismiss'   },
          ]
        : [],
    })
  )
})

// ── Notification click ────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const { url, taskId } = event.notification.data ?? {}
  const target = event.action === 'start' && taskId
    ? `/tasks?focus=${taskId}`
    : url ?? '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(self.location.origin))
      if (existing) {
        existing.focus()
        existing.navigate(target)
      } else {
        self.clients.openWindow(target)
      }
    })
  )
})

// ── Background sync (defer task updates when offline) ────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-tasks') {
    event.waitUntil(
      // Tasks queued while offline will be flushed here
      self.clients.matchAll().then((clients) =>
        clients.forEach((c) => c.postMessage({ type: 'SYNC_TASKS' }))
      )
    )
  }
})
