// ─── Core Domain Types ─────────────────────────────────────────────────────

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'deferred' | 'cancelled'
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low'
export type TaskCategory =
  | 'deep_work'
  | 'meetings'
  | 'admin'
  | 'communications'
  | 'planning'
  | 'errands'
  | 'health'
  | 'finance'
  | 'personal'
  | 'other'

export type EnergyLevel = 'high' | 'medium' | 'low'

export interface Task {
  id: string
  user_id: string
  title: string
  description?: string
  category: TaskCategory
  priority: TaskPriority
  priority_score: number          // 0–100 computed score
  estimated_minutes: number
  actual_minutes?: number
  due_date?: string               // ISO date string
  scheduled_start?: string        // ISO datetime
  status: TaskStatus
  recurring: boolean
  recurrence_rule?: string        // 'daily' | 'weekly:mon,wed' | 'monthly:1'
  energy_required: EnergyLevel
  tags: string[]
  notes?: string
  created_at: string
  updated_at: string
}

export interface Schedule {
  id: string
  user_id: string
  date: string
  generated_plan_json: ScheduledBlock[]
  work_start: string
  work_end: string
  total_focus_minutes: number
  overload_warning: boolean
  created_at: string
}

export interface ScheduledBlock {
  task_id: string
  task_title: string
  start_time: string             // 'HH:mm'
  end_time: string
  buffer_after_minutes: number
  block_type: 'task' | 'break' | 'buffer' | 'review'
  energy_match: boolean
}

export interface ProductivityLog {
  id: string
  user_id: string
  task_id: string
  started_at: string
  completed_at?: string
  focus_score: number            // 0–10
  interruptions: number
  actual_energy: EnergyLevel
  notes?: string
}

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string
  task_id?: string
  sent_at: string
  opened: boolean
  action_url?: string
}

export type NotificationType =
  | 'task_start'
  | 'running_behind'
  | 'deadline_approaching'
  | 'focus_reminder'
  | 'midday_check'
  | 'end_of_day_review'
  | 'overload_warning'
  | 'streak_celebration'

export interface UserProfile {
  id: string
  name: string
  email: string
  timezone: string
  avatar_url?: string
  preferences: UserPreferences
  created_at: string
}

export interface UserPreferences {
  work_start: string             // 'HH:mm'
  work_end: string
  peak_energy_hours: string[]    // ['09:00', '10:00', '11:00']
  break_duration_minutes: number
  focus_block_minutes: number
  notification_enabled: boolean
  notification_channels: ('browser' | 'push' | 'whatsapp')[]
  whatsapp_number?: string
  google_calendar_connected: boolean
  theme: 'dark' | 'light' | 'system'
  ai_personality: 'professional' | 'friendly' | 'direct'
  weekly_goal_hours: number
}

export interface DayStats {
  date: string
  tasks_completed: number
  tasks_total: number
  completion_rate: number
  focus_minutes: number
  planned_minutes: number
  productivity_score: number     // 0–100
  top_category: TaskCategory
  overruns: number
}

export interface WeeklyInsight {
  week_start: string
  productivity_trend: number[]   // 7 daily scores
  best_day: string
  worst_day: string
  completion_rate: number
  most_procrastinated_category: TaskCategory
  focus_hours: number
  recommendations: string[]
}

// ─── AI / Assistant Types ──────────────────────────────────────────────────

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  actions?: AssistantAction[]
}

export interface AssistantAction {
  type: 'create_task' | 'update_schedule' | 'defer_tasks' | 'set_focus' | 'view_analytics'
  label: string
  payload: Record<string, unknown>
}

export interface PlanRequest {
  start_time: string
  end_time: string
  date: string
  tasks: Task[]
  preferences: UserPreferences
  energy_forecast?: EnergyLevel[]
}

// ─── Store Types ───────────────────────────────────────────────────────────

export interface AppState {
  user: UserProfile | null
  tasks: Task[]
  todaySchedule: Schedule | null
  notifications: Notification[]
  chatHistory: ChatMessage[]
  focusSession: FocusSession | null
  streak: number
  isLoading: boolean
  error: string | null
}

export interface FocusSession {
  task_id: string
  task_title: string
  started_at: string
  duration_minutes: number
  elapsed_seconds: number
  is_paused: boolean
}
