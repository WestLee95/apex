import type { NotificationType } from '@/types'

// ─── Permission & Registration ─────────────────────────────────────────────
export const notificationService = {
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false
    if (Notification.permission === 'granted') return true
    const result = await Notification.requestPermission()
    return result === 'granted'
  },

  async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) return null
    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      return reg
    } catch (err) {
      console.error('SW registration failed:', err)
      return null
    }
  },

  // ── Show browser notification ───────────────────────────────────────────
  async show(type: NotificationType, title: string, body: string, taskId?: string): Promise<void> {
    if (Notification.permission !== 'granted') return

    const icons: Record<NotificationType, string> = {
      task_start:           '▶️',
      running_behind:       '⏰',
      deadline_approaching: '🚨',
      focus_reminder:       '🧠',
      midday_check:         '☀️',
      end_of_day_review:    '📊',
      overload_warning:     '⚠️',
      streak_celebration:   '🏆',
    }

    const notification = new Notification(`${icons[type]} ${title}`, {
      body,
      icon: '/pwa-192x192.png',
      badge: '/badge-72x72.png',
      tag: type,
      requireInteraction: type === 'deadline_approaching' || type === 'overload_warning',
      data: { taskId, url: taskId ? `/tasks?highlight=${taskId}` : '/' },
    })

    notification.onclick = () => {
      window.focus()
      if (taskId) window.location.href = `/tasks?highlight=${taskId}`
      notification.close()
    }
  },

  // ── Schedule reminder ───────────────────────────────────────────────────
  scheduleReminder(type: NotificationType, title: string, body: string, delayMs: number, taskId?: string): ReturnType<typeof setTimeout> {
    return setTimeout(() => {
      this.show(type, title, body, taskId)
    }, delayMs)
  },

  // ── Daily notification schedule ────────────────────────────────────────
  scheduleDailyNotifications(workStart: string, workEnd: string): void {
    const now = new Date()
    const [startH, startM] = workStart.split(':').map(Number)
    const [endH, endM]     = workEnd.split(':').map(Number)

    const startTime = new Date(now)
    startTime.setHours(startH, startM, 0, 0)

    const middayTime = new Date(now)
    middayTime.setHours(12, 0, 0, 0)

    const endTime = new Date(now)
    endTime.setHours(endH - 1, endM, 0, 0)

    const msUntil = (d: Date) => Math.max(0, d.getTime() - now.getTime())

    // Morning kickoff
    if (msUntil(startTime) > 0) {
      this.scheduleReminder('task_start', 'Good Morning', 'Your APEX briefing is ready. Time to execute.', msUntil(startTime))
    }

    // Midday check
    if (msUntil(middayTime) > 0) {
      this.scheduleReminder('midday_check', 'Midday Check-In', 'How is your morning tracking? Review your progress.', msUntil(middayTime))
    }

    // End of day
    if (msUntil(endTime) > 0) {
      this.scheduleReminder('end_of_day_review', 'Day Wind-Down', 'Time to wrap up and capture tomorrow\'s priorities.', msUntil(endTime))
    }
  },

  // ── Task-specific reminders ────────────────────────────────────────────
  scheduleTaskReminder(taskTitle: string, taskId: string, startTime: string): void {
    const [h, m] = startTime.split(':').map(Number)
    const target = new Date()
    target.setHours(h, m - 5, 0, 0) // 5 minutes before

    const delay = target.getTime() - Date.now()
    if (delay > 0) {
      this.scheduleReminder(
        'task_start',
        'Next Task Starting',
        `"${taskTitle}" begins in 5 minutes.`,
        delay,
        taskId
      )
    }
  },
}
