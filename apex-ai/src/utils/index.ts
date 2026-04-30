import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, isToday, isTomorrow, isPast } from 'date-fns'
import type { Task, TaskPriority, TaskCategory, EnergyLevel } from '@/types'

// ─── className utility ─────────────────────────────────────────────────────
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))

// ─── Date formatting ───────────────────────────────────────────────────────
export const formatDate = (date: string | Date) => format(new Date(date), 'EEE, d MMM')
export const formatTime = (date: string | Date) => format(new Date(date), 'HH:mm')
export const formatRelative = (date: string | Date) => formatDistanceToNow(new Date(date), { addSuffix: true })
export const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

export const dueDateLabel = (dateStr?: string): string => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isToday(d)) return 'Today'
  if (isTomorrow(d)) return 'Tomorrow'
  if (isPast(d)) return `Overdue · ${formatDate(d)}`
  return formatDate(d)
}

// ─── Priority scoring engine ───────────────────────────────────────────────
export const computePriorityScore = (task: Partial<Task>): number => {
  let score = 0

  // Urgency from priority label (0–40)
  const urgencyMap: Record<TaskPriority, number> = { critical: 40, high: 30, medium: 20, low: 10 }
  score += urgencyMap[task.priority ?? 'medium']

  // Due date proximity (0–30)
  if (task.due_date) {
    const daysUntil = Math.max(0, (new Date(task.due_date).getTime() - Date.now()) / 86400000)
    if (daysUntil === 0) score += 30
    else if (daysUntil <= 1) score += 25
    else if (daysUntil <= 3) score += 18
    else if (daysUntil <= 7) score += 10
    else score += 3
  }

  // Category weight (0–15)
  const categoryWeight: Record<TaskCategory, number> = {
    deep_work: 15, meetings: 13, planning: 12, finance: 11, communications: 10,
    admin: 8, health: 8, errands: 5, personal: 4, other: 2,
  }
  score += categoryWeight[task.category ?? 'other']

  // Overdue penalty (+15 bonus urgency)
  if (task.due_date && isPast(new Date(task.due_date))) score += 15

  return Math.min(100, score)
}

// ─── Category metadata ─────────────────────────────────────────────────────
export const CATEGORY_META: Record<TaskCategory, { label: string; color: string; icon: string }> = {
  deep_work:      { label: 'Deep Work',      color: 'text-violet-400 bg-violet-400/10',  icon: '🧠' },
  meetings:       { label: 'Meetings',        color: 'text-blue-400 bg-blue-400/10',      icon: '🤝' },
  admin:          { label: 'Admin',           color: 'text-slate-400 bg-slate-400/10',    icon: '📋' },
  communications: { label: 'Comms',          color: 'text-cyan-400 bg-cyan-400/10',      icon: '✉️' },
  planning:       { label: 'Planning',        color: 'text-emerald-400 bg-emerald-400/10',icon: '🗺️' },
  errands:        { label: 'Errands',         color: 'text-orange-400 bg-orange-400/10',  icon: '🏃' },
  health:         { label: 'Health',          color: 'text-rose-400 bg-rose-400/10',      icon: '💪' },
  finance:        { label: 'Finance',         color: 'text-gold-400 bg-gold-400/10',      icon: '💰' },
  personal:       { label: 'Personal',        color: 'text-pink-400 bg-pink-400/10',      icon: '🌿' },
  other:          { label: 'Other',           color: 'text-gray-400 bg-gray-400/10',      icon: '📌' },
}

export const PRIORITY_META: Record<TaskPriority, { label: string; color: string; dot: string }> = {
  critical: { label: 'Critical', color: 'text-red-400',    dot: 'bg-red-400' },
  high:     { label: 'High',     color: 'text-orange-400', dot: 'bg-orange-400' },
  medium:   { label: 'Medium',   color: 'text-yellow-400', dot: 'bg-yellow-400' },
  low:      { label: 'Low',      color: 'text-slate-400',  dot: 'bg-slate-500' },
}

export const ENERGY_META: Record<EnergyLevel, { label: string; color: string }> = {
  high:   { label: 'High Energy',   color: 'text-emerald-400' },
  medium: { label: 'Medium Energy', color: 'text-yellow-400' },
  low:    { label: 'Low Energy',    color: 'text-blue-400' },
}

// ─── Natural language task parser ─────────────────────────────────────────
export const parseNaturalTask = (input: string): Partial<Task> => {
  const lower = input.toLowerCase()

  // Time extraction: "at 3pm", "at 14:00"
  const timeMatch = input.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i)
  let scheduledStart: string | undefined
  if (timeMatch) {
    let h = parseInt(timeMatch[1])
    const m = parseInt(timeMatch[2] ?? '0')
    if (timeMatch[3]?.toLowerCase() === 'pm' && h < 12) h += 12
    if (timeMatch[3]?.toLowerCase() === 'am' && h === 12) h = 0
    const today = new Date()
    today.setHours(h, m, 0, 0)
    scheduledStart = today.toISOString()
  }

  // Duration extraction: "for 30 minutes", "for 2 hours"
  const durMatch = input.match(/for\s+(\d+)\s*(hour|hr|minute|min)/i)
  let estimated_minutes = 30
  if (durMatch) {
    const n = parseInt(durMatch[1])
    estimated_minutes = durMatch[2].startsWith('h') ? n * 60 : n
  }

  // Priority detection
  let priority: TaskPriority = 'medium'
  if (/urgent|asap|critical|immediately/i.test(lower)) priority = 'critical'
  else if (/important|high priority/i.test(lower)) priority = 'high'
  else if (/low priority|when possible|eventually/i.test(lower)) priority = 'low'

  // Category detection
  let category: TaskCategory = 'other'
  if (/call|meet|zoom|standup|interview/i.test(lower)) category = 'meetings'
  else if (/write|code|design|build|review|research|analyze/i.test(lower)) category = 'deep_work'
  else if (/email|reply|message|send|respond/i.test(lower)) category = 'communications'
  else if (/plan|strategy|roadmap|agenda/i.test(lower)) category = 'planning'
  else if (/invoice|payment|budget|expense|finance/i.test(lower)) category = 'finance'
  else if (/gym|exercise|workout|doctor|health/i.test(lower)) category = 'health'
  else if (/grocery|pick up|buy|errand/i.test(lower)) category = 'errands'
  else if (/report|form|file|admin|document/i.test(lower)) category = 'admin'

  // Clean title (remove time expressions)
  const title = input.replace(/\bat\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?/i, '')
                     .replace(/\bfor\s+\d+\s*(?:hour|hr|minute|min)s?\b/i, '')
                     .replace(/\b(urgent|asap|critical|important|low priority)\b/i, '')
                     .trim()
                     .replace(/\s+/g, ' ')

  return { title, priority, category, estimated_minutes, scheduled_start: scheduledStart }
}

// ─── Productivity score ────────────────────────────────────────────────────
export const computeDayScore = (completed: number, total: number, focusMinutes: number): number => {
  if (total === 0) return 0
  const completionComponent = (completed / total) * 60
  const focusComponent = Math.min(focusMinutes / 240, 1) * 40
  return Math.round(completionComponent + focusComponent)
}

// ─── Color for score ───────────────────────────────────────────────────────
export const scoreColor = (score: number): string => {
  if (score >= 80) return 'text-emerald-400'
  if (score >= 60) return 'text-gold-400'
  if (score >= 40) return 'text-orange-400'
  return 'text-red-400'
}
