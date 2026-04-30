import type { ChatMessage, Task, UserPreferences, AssistantAction } from '@/types'
import { formatDuration } from '@/utils'

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY as string

interface AIResponse {
  message: string
  actions: AssistantAction[]
}

const buildSystemPrompt = (tasks: Task[], preferences: UserPreferences): string => {
  const pendingTasks = tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress')
  const taskSummary = pendingTasks
    .slice(0, 15)
    .map((t) => `- [${t.priority.toUpperCase()}] "${t.title}" | ${formatDuration(t.estimated_minutes)} | ${t.category}`)
    .join('\n')

  const now = new Date()
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const dateStr = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  return `You are APEX, a world-class AI Executive Chief of Staff — intelligent, direct, and razor-sharp. You help the user manage their time, prioritize tasks, and operate like a high-performance executive.

Current date/time: ${dateStr}, ${timeStr}
Work hours: ${preferences.work_start} – ${preferences.work_end}

PENDING TASKS (${pendingTasks.length} total):
${taskSummary || 'No pending tasks.'}

YOUR CAPABILITIES:
- Plan and optimize daily schedules
- Reprioritize tasks with reasoning
- Estimate realistic time requirements
- Identify procrastination patterns
- Suggest next best actions
- Move tasks to tomorrow or defer them
- Provide weekly performance insights
- Detect workload overload

RESPONSE RULES:
1. Be direct and decisive — no fluff, no hedging
2. When creating tasks, structure your response to include action JSON
3. When rescheduling, provide clear reasoning
4. Keep responses concise but intelligent
5. If the user is overloaded, say so plainly
6. Use the user's task data to give specific, personalized advice

When you need to trigger an action, append a JSON block at the end of your message like:
\`\`\`action
{"type": "create_task", "label": "Add task", "payload": {"title": "...", "priority": "high", "estimated_minutes": 30}}
\`\`\`

Available action types: create_task, update_schedule, defer_tasks, set_focus, view_analytics`
}

export const aiService = {
  async chat(
    userMessage: string,
    history: ChatMessage[],
    tasks: Task[],
    preferences: UserPreferences
  ): Promise<AIResponse> {
    if (!OPENAI_API_KEY) {
      // Fallback: intelligent rule-based responses when no API key
      return fallbackResponse(userMessage, tasks)
    }

    const messages = [
      { role: 'system' as const, content: buildSystemPrompt(tasks, preferences) },
      ...history.slice(-10).map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: userMessage },
    ]

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        temperature: 0.7,
        max_tokens: 800,
      }),
    })

    if (!res.ok) throw new Error(`OpenAI error: ${res.statusText}`)

    const data = await res.json()
    const rawContent: string = data.choices[0].message.content

    // Parse actions from response
    const actions: AssistantAction[] = []
    const actionMatches = rawContent.matchAll(/```action\n([\s\S]*?)```/g)
    for (const match of actionMatches) {
      try {
        const action = JSON.parse(match[1])
        actions.push(action)
      } catch { /* ignore malformed */ }
    }

    const cleanMessage = rawContent.replace(/```action[\s\S]*?```/g, '').trim()

    return { message: cleanMessage, actions }
  },

  async generateWeeklySummary(tasks: Task[]): Promise<string> {
    const completed = tasks.filter((t) => t.status === 'completed')
    const overdue   = tasks.filter((t) => t.status === 'pending' && t.due_date && new Date(t.due_date) < new Date())

    if (!OPENAI_API_KEY) {
      return `This week you completed ${completed.length} tasks with ${overdue.length} items still outstanding. Focus on clearing your backlog before adding new commitments.`
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{
          role: 'user',
          content: `Generate a concise weekly performance summary for an executive. Completed: ${completed.length} tasks. Overdue: ${overdue.length}. Top categories: ${[...new Set(completed.map((t) => t.category))].slice(0, 3).join(', ')}. Be direct and actionable in 3-4 sentences.`,
        }],
        max_tokens: 200,
      }),
    })
    const data = await res.json()
    return data.choices[0].message.content
  },
}

// ── Rule-based fallback (no OpenAI key needed) ─────────────────────────────
function fallbackResponse(input: string, tasks: Task[]): AIResponse {
  const lower = input.toLowerCase()
  const pending = tasks.filter((t) => t.status === 'pending')
  const critical = pending.filter((t) => t.priority === 'critical')
  const actions: AssistantAction[] = []

  if (lower.includes('next') || lower.includes('what should')) {
    const nextTask = pending.sort((a, b) => b.priority_score - a.priority_score)[0]
    if (nextTask) {
      actions.push({ type: 'set_focus', label: `Focus: ${nextTask.title}`, payload: { task_id: nextTask.id } })
      return { message: `Your highest-priority item is **"${nextTask.title}"** — ${formatDuration(nextTask.estimated_minutes)} of ${nextTask.category} work. Start immediately.`, actions }
    }
    return { message: 'Your slate is clear. Use this time to plan tomorrow or do deep strategic thinking.', actions: [] }
  }

  if (lower.includes('overload') || lower.includes('too much')) {
    const totalTime = pending.reduce((acc, t) => acc + t.estimated_minutes, 0)
    return { message: `You have ${pending.length} pending tasks totalling ${formatDuration(totalTime)}. That is ${totalTime > 480 ? 'significantly more than a days work — you need to defer or delegate' : 'manageable if you stay disciplined'}. ${critical.length > 0 ? `Address your ${critical.length} critical items first.` : ''}`, actions }
  }

  if (lower.includes('plan my day') || lower.includes('schedule')) {
    actions.push({ type: 'update_schedule', label: 'Regenerate Schedule', payload: {} })
    return { message: `Generating your optimized schedule now. You have ${pending.length} tasks to work through. I'll sequence them by priority and energy requirements.`, actions }
  }

  if (lower.includes('defer') || lower.includes('tomorrow')) {
    const low = pending.filter((t) => t.priority === 'low')
    actions.push({ type: 'defer_tasks', label: `Defer ${low.length} low-priority tasks`, payload: { task_ids: low.map((t) => t.id) } })
    return { message: `I can defer ${low.length} low-priority tasks to tomorrow, clearing your day for what actually matters. Shall I proceed?`, actions }
  }

  return {
    message: `I'm APEX, your executive assistant. I can help you plan your day, prioritize tasks, analyze your productivity, or suggest your next action. What do you need?`,
    actions: [],
  }
}
