import { useEffect, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '@/store'
import { taskService } from '@/features/tasks/taskService'
import { scheduleService, generateDailySchedule } from '@/features/schedule/scheduleEngine'
import type { Task, TaskStatus, UserPreferences } from '@/types'

// ─── useTasks ──────────────────────────────────────────────────────────────
export const useTasks = () => {
  const qc = useQueryClient()
  const { user, setTasks, addTask, updateTask, deleteTask } = useAppStore()

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', user?.id],
    queryFn: () => taskService.getAll(user!.id),
    enabled: !!user?.id,
    staleTime: 30_000,
  })

  useEffect(() => { if (tasks.length) setTasks(tasks) }, [tasks, setTasks])

  const createMutation = useMutation({
    mutationFn: (task: Parameters<typeof taskService.create>[1]) =>
      taskService.create(user!.id, task),
    onSuccess: (newTask) => {
      addTask(newTask)
      qc.invalidateQueries({ queryKey: ['tasks', user?.id] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Task> }) =>
      taskService.update(id, updates),
    onSuccess: (updated) => {
      updateTask(updated.id, updated)
      qc.invalidateQueries({ queryKey: ['tasks', user?.id] })
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status, minutes }: { id: string; status: TaskStatus; minutes?: number }) =>
      taskService.updateStatus(id, status, minutes),
    onSuccess: (_, { id, status, minutes }) => {
      updateTask(id, { status, actual_minutes: minutes })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => taskService.delete(id),
    onSuccess: (_, id) => {
      deleteTask(id)
      qc.invalidateQueries({ queryKey: ['tasks', user?.id] })
    },
  })

  return {
    tasks,
    isLoading,
    createTask: createMutation.mutate,
    updateTask: updateMutation.mutate,
    updateStatus: statusMutation.mutate,
    deleteTask: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  }
}

// ─── useSchedule ───────────────────────────────────────────────────────────
export const useSchedule = (tasks: Task[], preferences: UserPreferences) => {
  const { user, setTodaySchedule } = useAppStore()
  const qc = useQueryClient()

  const { data: schedule } = useQuery({
    queryKey: ['schedule-today', user?.id],
    queryFn: () => scheduleService.getToday(user!.id),
    enabled: !!user?.id,
    staleTime: 5 * 60_000,
  })

  useEffect(() => { if (schedule) setTodaySchedule(schedule) }, [schedule, setTodaySchedule])

  const regenerate = useCallback(async () => {
    if (!user?.id) return
    const plan = generateDailySchedule(tasks, preferences)
    const saved = await scheduleService.save(user.id, plan)
    setTodaySchedule(saved)
    qc.invalidateQueries({ queryKey: ['schedule-today', user.id] })
    return saved
  }, [user?.id, tasks, preferences, setTodaySchedule, qc])

  return { schedule, regenerate }
}

// ─── useFocusTimer ─────────────────────────────────────────────────────────
export const useFocusTimer = () => {
  const { focusSession, setFocusSession, tickFocusSession } = useAppStore()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (focusSession && !focusSession.is_paused) {
      intervalRef.current = setInterval(tickFocusSession, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [focusSession?.is_paused, tickFocusSession])

  const start = useCallback((taskId: string, taskTitle: string, durationMinutes: number) => {
    setFocusSession({
      task_id: taskId,
      task_title: taskTitle,
      started_at: new Date().toISOString(),
      duration_minutes: durationMinutes,
      elapsed_seconds: 0,
      is_paused: false,
    })
  }, [setFocusSession])

  const pause = useCallback(() => {
    if (!focusSession) return
    setFocusSession({ ...focusSession, is_paused: true })
  }, [focusSession, setFocusSession])

  const resume = useCallback(() => {
    if (!focusSession) return
    setFocusSession({ ...focusSession, is_paused: false })
  }, [focusSession, setFocusSession])

  const stop = useCallback(() => {
    setFocusSession(null)
  }, [setFocusSession])

  const progress = focusSession
    ? Math.min(1, focusSession.elapsed_seconds / (focusSession.duration_minutes * 60))
    : 0

  const remaining = focusSession
    ? Math.max(0, focusSession.duration_minutes * 60 - focusSession.elapsed_seconds)
    : 0

  return { focusSession, start, pause, resume, stop, progress, remaining }
}

// ─── useProductivity ───────────────────────────────────────────────────────
export const useProductivity = () => {
  const { user } = useAppStore()

  return useQuery({
    queryKey: ['productivity', user?.id],
    queryFn: async () => {
      const stats = await taskService.getCompletionStats(user!.id, 30)
      const historyData = await scheduleService.getProductivityHistory(user!.id, 30)
      return { stats, historyData }
    },
    enabled: !!user?.id,
    staleTime: 10 * 60_000,
  })
}
