import type { Task, ScheduledBlock, Schedule, UserPreferences, EnergyLevel } from '@/types'
import { computePriorityScore } from '@/utils'
import { supabase } from '@/lib/supabase'

// ── Energy curve modeling ──────────────────────────────────────────────────
const getEnergyAtHour = (hour: number): EnergyLevel => {
  if (hour >= 8 && hour <= 11) return 'high'
  if (hour === 12 || hour === 13) return 'low'   // post-lunch dip
  if (hour >= 14 && hour <= 16) return 'medium'
  if (hour >= 17 && hour <= 18) return 'high'    // second wind
  return 'low'
}

const energyToNumber = (e: EnergyLevel) => ({ high: 3, medium: 2, low: 1 }[e])
const timeToMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}
const minutesToTime = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

// ── Main scheduling algorithm ──────────────────────────────────────────────
export const generateDailySchedule = (
  tasks: Task[],
  preferences: UserPreferences,
  targetDate: string = new Date().toISOString().split('T')[0]
): Omit<Schedule, 'id' | 'user_id' | 'created_at'> => {
  const workStart = timeToMinutes(preferences.work_start ?? '08:00')
  const workEnd   = timeToMinutes(preferences.work_end   ?? '18:00')
  const breakDur  = preferences.break_duration_minutes   ?? 10

  // Filter actionable tasks
  const actionable = tasks
    .filter((t) => t.status === 'pending' || t.status === 'in_progress')
    .sort((a, b) => (b.priority_score ?? 0) - (a.priority_score ?? 0))

  const blocks: ScheduledBlock[] = []
  let cursor = workStart
  let totalFocusMinutes = 0

  // Morning review block
  blocks.push({
    task_id: 'system-review',
    task_title: '☀️ Morning Review & Planning',
    start_time: minutesToTime(cursor),
    end_time: minutesToTime(cursor + 15),
    buffer_after_minutes: 0,
    block_type: 'review',
    energy_match: true,
  })
  cursor += 15

  for (const task of actionable) {
    if (cursor >= workEnd) break

    const taskMinutes = task.estimated_minutes ?? 30
    const endTime = cursor + taskMinutes

    // Check if task fits within work hours
    if (endTime > workEnd) {
      // Task doesn't fit — skip or truncate
      if (endTime - cursor > workEnd - cursor + 30) continue
    }

    const taskHour = Math.floor(cursor / 60)
    const availableEnergy = getEnergyAtHour(taskHour)
    const requiredEnergy = task.energy_required ?? 'medium'
    const energyMatch = energyToNumber(availableEnergy) >= energyToNumber(requiredEnergy)

    // Insert lunch break around 13:00
    if (cursor <= 780 && cursor + taskMinutes > 780 && taskMinutes < 90) {
      blocks.push({
        task_id: 'system-lunch',
        task_title: '🍽️ Lunch Break',
        start_time: minutesToTime(780),
        end_time: minutesToTime(840),
        buffer_after_minutes: 0,
        block_type: 'break',
        energy_match: true,
      })
      cursor = 840
    }

    blocks.push({
      task_id: task.id,
      task_title: task.title,
      start_time: minutesToTime(cursor),
      end_time: minutesToTime(Math.min(cursor + taskMinutes, workEnd)),
      buffer_after_minutes: breakDur,
      block_type: 'task',
      energy_match: energyMatch,
    })

    totalFocusMinutes += taskMinutes
    cursor += taskMinutes + breakDur

    // Add micro-break every 90 minutes of focus
    if (totalFocusMinutes > 0 && totalFocusMinutes % 90 === 0) {
      blocks.push({
        task_id: `break-${cursor}`,
        task_title: '🧘 5-Minute Reset',
        start_time: minutesToTime(cursor),
        end_time: minutesToTime(cursor + 5),
        buffer_after_minutes: 0,
        block_type: 'break',
        energy_match: true,
      })
      cursor += 5
    }
  }

  // End-of-day review
  if (cursor < workEnd) {
    const reviewStart = Math.max(cursor, workEnd - 20)
    blocks.push({
      task_id: 'system-eod',
      task_title: '📊 End-of-Day Review',
      start_time: minutesToTime(reviewStart),
      end_time: minutesToTime(workEnd),
      buffer_after_minutes: 0,
      block_type: 'review',
      energy_match: true,
    })
  }

  const overloadWarning = totalFocusMinutes > (workEnd - workStart) * 0.85

  return {
    date: targetDate,
    generated_plan_json: blocks,
    work_start: preferences.work_start ?? '08:00',
    work_end: preferences.work_end ?? '18:00',
    total_focus_minutes: totalFocusMinutes,
    overload_warning: overloadWarning,
  }
}

// ── Persist schedule to Supabase ──────────────────────────────────────────
export const scheduleService = {
  async save(userId: string, schedule: Omit<Schedule, 'id' | 'user_id' | 'created_at'>): Promise<Schedule> {
    const { data, error } = await supabase
      .from('schedules')
      .upsert({ ...schedule, user_id: userId })
      .select()
      .single()
    if (error) throw error
    return data as Schedule
  },

  async getToday(userId: string): Promise<Schedule | null> {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('schedules')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single()
    return data as Schedule | null
  },

  async getProductivityHistory(userId: string, days = 30) {
    const since = new Date(Date.now() - days * 86400000).toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('schedules')
      .select('date, total_focus_minutes, overload_warning')
      .eq('user_id', userId)
      .gte('date', since)
      .order('date', { ascending: true })
    if (error) throw error
    return data
  },
}
