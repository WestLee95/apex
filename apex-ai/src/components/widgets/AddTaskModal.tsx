import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { Sparkles } from 'lucide-react'
import { Modal, Input, Textarea, Select, Button } from '@/components/ui'
import { parseNaturalTask, computePriorityScore, CATEGORY_META } from '@/utils'
import type { Task, TaskCategory, TaskPriority, EnergyLevel } from '@/types'

interface AddTaskModalProps {
  open: boolean
  onClose: () => void
  onAdd: (task: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'priority_score'>) => void
}

const defaultForm = {
  title: '',
  description: '',
  category: 'other' as TaskCategory,
  priority: 'medium' as TaskPriority,
  estimated_minutes: 30,
  energy_required: 'medium' as EnergyLevel,
  due_date: '',
  notes: '',
  recurring: false,
  tags: [] as string[],
}

export const AddTaskModal = ({ open, onClose, onAdd }: AddTaskModalProps) => {
  const [form, setForm] = useState(defaultForm)
  const [naturalInput, setNaturalInput] = useState('')
  const [mode, setMode] = useState<'natural' | 'form'>('natural')

  const handleNaturalParse = () => {
    if (!naturalInput.trim()) return
    const parsed = parseNaturalTask(naturalInput)
    setForm((f) => ({ ...f, ...parsed }))
    setMode('form')
    toast.success('Task parsed — review and confirm')
  }

  const handleSubmit = () => {
    if (!form.title.trim()) return toast.error('Task title is required')
    const payload = {
      ...form,
      status: 'pending' as const,
      due_date: form.due_date || undefined,
      scheduled_start: undefined,
      actual_minutes: undefined,
      recurrence_rule: undefined,
    }
    onAdd(payload)
    setForm(defaultForm)
    setNaturalInput('')
    setMode('natural')
    onClose()
    toast.success('Task created')
  }

  const handleClose = () => {
    setForm(defaultForm)
    setNaturalInput('')
    setMode('natural')
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="New Task" size="md">
      <div className="space-y-4">
        {/* Mode toggle */}
        <div className="flex items-center gap-1 bg-white/[0.03] p-1 rounded-xl">
          {(['natural', 'form'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-1.5 text-xs rounded-lg transition-all font-medium ${
                mode === m ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {m === 'natural' ? '✨ Natural Language' : '📋 Manual Form'}
            </button>
          ))}
        </div>

        {mode === 'natural' ? (
          <div className="space-y-3">
            <Input
              label="Describe your task"
              placeholder="e.g. Call John at 3pm for 30 minutes about the Q1 budget report"
              value={naturalInput}
              onChange={(e) => setNaturalInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleNaturalParse()}
            />
            <p className="text-xs text-gray-600">
              Include time, duration, and priority hints. APEX will parse and categorize automatically.
            </p>
            <Button
              variant="gold"
              icon={<Sparkles size={13} />}
              onClick={handleNaturalParse}
              disabled={!naturalInput.trim()}
              className="w-full justify-center"
            >
              Parse Task
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Input
              label="Task Title *"
              placeholder="What needs to be done?"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Category"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as TaskCategory }))}
              >
                {(Object.entries(CATEGORY_META) as [TaskCategory, typeof CATEGORY_META[TaskCategory]][]).map(([k, v]) => (
                  <option key={k} value={k}>{v.icon} {v.label}</option>
                ))}
              </Select>

              <Select
                label="Priority"
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as TaskPriority }))}
              >
                <option value="critical">🔴 Critical</option>
                <option value="high">🟠 High</option>
                <option value="medium">🟡 Medium</option>
                <option value="low">⚪ Low</option>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Estimated Minutes"
                type="number"
                min={5}
                max={480}
                value={form.estimated_minutes}
                onChange={(e) => setForm((f) => ({ ...f, estimated_minutes: parseInt(e.target.value) || 30 }))}
              />
              <Input
                label="Due Date"
                type="date"
                value={form.due_date}
                onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
              />
            </div>

            <Select
              label="Energy Required"
              value={form.energy_required}
              onChange={(e) => setForm((f) => ({ ...f, energy_required: e.target.value as EnergyLevel }))}
            >
              <option value="high">⚡ High Energy</option>
              <option value="medium">🌤 Medium Energy</option>
              <option value="low">🌙 Low Energy</option>
            </Select>

            <Textarea
              label="Notes (optional)"
              placeholder="Additional context..."
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />

            <div className="flex items-center gap-3 pt-1">
              <Button variant="secondary" onClick={handleClose} className="flex-1 justify-center">
                Cancel
              </Button>
              <Button variant="gold" onClick={handleSubmit} className="flex-1 justify-center">
                Add Task
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
