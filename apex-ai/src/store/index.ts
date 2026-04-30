import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { AppState, Task, ChatMessage, FocusSession, Notification, Schedule, UserProfile } from '@/types'

interface AppStore extends AppState {
  // Setters
  setUser: (user: UserProfile | null) => void
  setTasks: (tasks: Task[]) => void
  addTask: (task: Task) => void
  updateTask: (id: string, updates: Partial<Task>) => void
  deleteTask: (id: string) => void
  setTodaySchedule: (schedule: Schedule | null) => void
  addChatMessage: (message: ChatMessage) => void
  clearChat: () => void
  setFocusSession: (session: FocusSession | null) => void
  tickFocusSession: () => void
  addNotification: (notification: Notification) => void
  markNotificationOpened: (id: string) => void
  setStreak: (streak: number) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // ── Initial State ──────────────────────────────────────────────────
      user: null,
      tasks: [],
      todaySchedule: null,
      notifications: [],
      chatHistory: [],
      focusSession: null,
      streak: 0,
      isLoading: false,
      error: null,

      // ── User ───────────────────────────────────────────────────────────
      setUser: (user) => set({ user }),

      // ── Tasks ──────────────────────────────────────────────────────────
      setTasks: (tasks) => set({ tasks }),
      addTask: (task) => set((s) => ({ tasks: [task, ...s.tasks] })),
      updateTask: (id, updates) =>
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)) })),
      deleteTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

      // ── Schedule ───────────────────────────────────────────────────────
      setTodaySchedule: (schedule) => set({ todaySchedule: schedule }),

      // ── Chat ───────────────────────────────────────────────────────────
      addChatMessage: (message) =>
        set((s) => ({ chatHistory: [...s.chatHistory.slice(-99), message] })),
      clearChat: () => set({ chatHistory: [] }),

      // ── Focus Session ──────────────────────────────────────────────────
      setFocusSession: (session) => set({ focusSession: session }),
      tickFocusSession: () =>
        set((s) => {
          if (!s.focusSession || s.focusSession.is_paused) return s
          return {
            focusSession: { ...s.focusSession, elapsed_seconds: s.focusSession.elapsed_seconds + 1 },
          }
        }),

      // ── Notifications ──────────────────────────────────────────────────
      addNotification: (n) =>
        set((s) => ({ notifications: [n, ...s.notifications].slice(0, 50) })),
      markNotificationOpened: (id) =>
        set((s) => ({
          notifications: s.notifications.map((n) => (n.id === id ? { ...n, opened: true } : n)),
        })),

      // ── Misc ───────────────────────────────────────────────────────────
      setStreak: (streak) => set({ streak }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
    }),
    {
      name: 'apex-app-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        user: s.user,
        chatHistory: s.chatHistory,
        streak: s.streak,
      }),
    }
  )
)

// ── Selectors ──────────────────────────────────────────────────────────────
export const selectTodayTasks = (state: AppStore) => {
  const today = new Date().toDateString()
  return state.tasks.filter(
    (t) =>
      t.status !== 'cancelled' &&
      (!t.due_date || new Date(t.due_date).toDateString() === today || t.scheduled_start)
  )
}

export const selectPendingCount = (state: AppStore) =>
  state.tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress').length

export const selectUnreadNotifications = (state: AppStore) =>
  state.notifications.filter((n) => !n.opened).length
