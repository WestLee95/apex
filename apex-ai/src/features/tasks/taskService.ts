import { supabase } from '@/lib/supabase'
import { computePriorityScore } from '@/utils'
import type { Task, TaskStatus } from '@/types'

export const taskService = {
  // ── Fetch all tasks for user ───────────────────────────────────────────
  async getAll(userId: string): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .neq('status', 'cancelled')
      .order('priority_score', { ascending: false })
    if (error) throw error
    return data as Task[]
  },

  // ── Get today's tasks ─────────────────────────────────────────────────
  async getToday(userId: string): Promise<Task[]> {
    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .or(`due_date.eq.${today},scheduled_start.gte.${today}T00:00:00,status.eq.in_progress`)
      .neq('status', 'cancelled')
      .neq('status', 'completed')
      .order('priority_score', { ascending: false })
    if (error) throw error
    return data as Task[]
  },

  // ── Create task ───────────────────────────────────────────────────────
  async create(userId: string, task: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'priority_score'>): Promise<Task> {
    const priority_score = computePriorityScore(task)
    const { data, error } = await supabase
      .from('tasks')
      .insert({ ...task, user_id: userId, priority_score })
      .select()
      .single()
    if (error) throw error
    return data as Task
  },

  // ── Update task ───────────────────────────────────────────────────────
  async update(id: string, updates: Partial<Task>): Promise<Task> {
    if (updates.priority || updates.due_date || updates.category) {
      // Recompute priority score
      const { data: existing } = await supabase.from('tasks').select('*').eq('id', id).single()
      const merged = { ...existing, ...updates }
      updates.priority_score = computePriorityScore(merged)
    }
    const { data, error } = await supabase
      .from('tasks')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as Task
  },

  // ── Update status ─────────────────────────────────────────────────────
  async updateStatus(id: string, status: TaskStatus, actual_minutes?: number): Promise<void> {
    const updates: Partial<Task> = { status, updated_at: new Date().toISOString() }
    if (actual_minutes) updates.actual_minutes = actual_minutes
    const { error } = await supabase.from('tasks').update(updates).eq('id', id)
    if (error) throw error
  },

  // ── Delete (soft) task ─────────────────────────────────────────────────
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  },

  // ── Get recurring tasks ───────────────────────────────────────────────
  async getRecurring(userId: string): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('recurring', true)
    if (error) throw error
    return data as Task[]
  },

  // ── Get productivity stats ────────────────────────────────────────────
  async getCompletionStats(userId: string, days = 7) {
    const since = new Date(Date.now() - days * 86400000).toISOString()
    const { data, error } = await supabase
      .from('tasks')
      .select('status, category, actual_minutes, estimated_minutes, due_date, updated_at')
      .eq('user_id', userId)
      .gte('updated_at', since)
    if (error) throw error
    return data
  },
}
