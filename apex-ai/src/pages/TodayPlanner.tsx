import { useState } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, Clock, AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { Card, Button, Badge } from '@/components/ui'
import { TaskCard } from '@/components/widgets/TaskCard'
import { useTasks, useSchedule, useFocusTimer } from '@/hooks'
import { useAppStore } from '@/store'
import { formatDuration } from '@/utils'
import type { ScheduledBlock } from '@/types'

const BlockTypeColors: Record<string, string> = {
  task:   'bg-white/5 border-white/10',
  break:  'bg-emerald-500/5 border-emerald-500/20',
  review: 'bg-gold-500/5 border-gold-500/20',
  buffer: 'bg-blue-500/5 border-blue-500/10',
}

const BlockTypeDot: Record<string, string> = {
  task:   'bg-white/50',
  break:  'bg-emerald-400',
  review: 'bg-gold-400',
  buffer: 'bg-blue-400',
}

const TimelineBlock = ({ block, onStart }: { block: ScheduledBlock; onStart?: () => void }) => {
  const [h, m] = block.start_time.split(':').map(Number)
  const [eh, em] = block.end_time.split(':').map(Number)
  const duration = (eh * 60 + em) - (h * 60 + m)

  const now = new Date()
  const currentMin = now.getHours() * 60 + now.getMinutes()
  const blockStart = h * 60 + m
  const blockEnd   = eh * 60 + em
  const isActive   = currentMin >= blockStart && currentMin < blockEnd
  const isPast     = currentMin >= blockEnd

  return (
    <div className={`flex gap-4 ${isPast ? 'opacity-40' : ''}`}>
      {/* Time axis */}
      <div className="flex flex-col items-center gap-1 w-14 flex-shrink-0">
        <span className="text-xs font-mono text-gray-500">{block.start_time}</span>
        <div className={`w-0.5 flex-1 min-h-6 ${isActive ? 'bg-gold-400' : 'bg-white/5'}`} />
      </div>

      {/* Block */}
      <div className={`flex-1 mb-2 border rounded-xl p-3 transition-all duration-200 ${BlockTypeColors[block.block_type]} ${isActive ? 'border-gold-500/40 bg-gold-500/5 shadow-gold' : ''}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${BlockTypeDot[block.block_type]} ${isActive ? 'animate-pulse-gold' : ''}`} />
            <span className={`text-sm truncate ${block.block_type === 'break' ? 'text-gray-500 italic' : 'text-white'}`}>
              {block.task_title}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!block.energy_match && block.block_type === 'task' && (
              <span title="Energy mismatch"><AlertTriangle size={12} className="text-orange-400" /></span>
            )}
            <span className="text-xs text-gray-600 font-mono">{formatDuration(duration)}</span>
            {isActive && block.block_type === 'task' && onStart && (
              <Button variant="gold" size="sm" onClick={onStart}>
                Start
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export const TodayPlanner = () => {
  const { user } = useAppStore()
  const { tasks, updateStatus } = useTasks()
  const { schedule, regenerate } = useSchedule(tasks, user?.preferences ?? {} as any)
  const { start: startFocus } = useFocusTimer()
  const [isRegenerating, setIsRegenerating] = useState(false)

  const handleRegenerate = async () => {
    setIsRegenerating(true)
    await regenerate()
    setIsRegenerating(false)
  }

  const pending   = tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress')
  const completed = tasks.filter((t) => t.status === 'completed')
  const totalMins = schedule?.total_focus_minutes ?? 0

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-600 uppercase tracking-widest font-mono mb-1">
            {format(new Date(), 'EEEE, d MMMM yyyy')}
          </p>
          <h1 className="font-display text-3xl font-light text-white">Today's Planner</h1>
        </div>
        <Button
          variant="secondary"
          size="sm"
          icon={<RefreshCw size={13} className={isRegenerating ? 'animate-spin' : ''} />}
          onClick={handleRegenerate}
          loading={isRegenerating}
        >
          Regenerate
        </Button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Focus Time', value: formatDuration(totalMins), icon: <Clock size={14} className="text-blue-400" /> },
          { label: 'Tasks Done', value: `${completed.length}/${tasks.length}`, icon: <CheckCircle2 size={14} className="text-emerald-400" /> },
          { label: 'Remaining', value: String(pending.length), icon: <ChevronRight size={14} className="text-gray-400" /> },
        ].map((s) => (
          <Card key={s.label} className="p-3 flex items-center gap-2">
            {s.icon}
            <div>
              <p className="text-xs text-gray-600">{s.label}</p>
              <p className="text-base font-bold font-mono text-white">{s.value}</p>
            </div>
          </Card>
        ))}
      </div>

      {schedule?.overload_warning && (
        <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-3">
          <AlertTriangle size={15} className="text-orange-400 flex-shrink-0" />
          <p className="text-sm text-orange-300">
            Your schedule exceeds capacity. Consider deferring low-priority tasks to tomorrow.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline */}
        <div className="lg:col-span-2">
          <Card className="p-5">
            <h2 className="font-display text-lg font-light text-white mb-5">Schedule Timeline</h2>
            {schedule ? (
              <div className="space-y-0">
                {schedule.generated_plan_json.map((block, i) => (
                  <TimelineBlock
                    key={i}
                    block={block}
                    onStart={block.task_id && block.task_id.startsWith('system') ? undefined : () => {
                      const task = tasks.find((t) => t.id === block.task_id)
                      if (task) {
                        updateStatus({ id: task.id, status: 'in_progress' })
                        startFocus(task.id, task.title, task.estimated_minutes)
                      }
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500 text-sm mb-4">No schedule generated yet</p>
                <Button variant="gold" onClick={handleRegenerate}>Generate Today's Plan</Button>
              </div>
            )}
          </Card>
        </div>

        {/* Unscheduled tasks */}
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-base font-light text-white">Pending Tasks</h3>
              <Badge>{pending.length}</Badge>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto custom-scroll">
              {pending.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  compact
                  onComplete={(id) => updateStatus({ id, status: 'completed' })}
                  onFocus={(t) => startFocus(t.id, t.title, t.estimated_minutes)}
                />
              ))}
              {pending.length === 0 && (
                <p className="text-xs text-gray-600 text-center py-4">All done for today.</p>
              )}
            </div>
          </Card>

          {completed.length > 0 && (
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 size={13} className="text-emerald-400" />
                <h3 className="text-sm font-medium text-white">Completed Today</h3>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scroll">
                {completed.map((task) => (
                  <div key={task.id} className="flex items-center gap-2 text-xs text-gray-500 py-0.5">
                    <CheckCircle2 size={10} className="text-emerald-400 flex-shrink-0" />
                    <span className="line-through truncate">{task.title}</span>
                    <span className="ml-auto text-gray-700 font-mono">{formatDuration(task.actual_minutes ?? task.estimated_minutes)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </motion.div>
  )
}
