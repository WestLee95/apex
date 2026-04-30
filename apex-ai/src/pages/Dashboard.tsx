import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, TrendingUp, Flame, CheckCircle2, Clock, AlertTriangle, RefreshCw, Zap } from 'lucide-react'
import { format } from 'date-fns'
import { Card, Button, ProgressRing, Badge, Spinner } from '@/components/ui'
import { TaskCard } from '@/components/widgets/TaskCard'
import { FocusTimerWidget } from '@/components/widgets/FocusTimer'
import { AddTaskModal } from '@/components/widgets/AddTaskModal'
import { useTasks, useSchedule, useFocusTimer } from '@/hooks'
import { useAppStore } from '@/store'
import { computeDayScore, scoreColor, formatDuration, CATEGORY_META } from '@/utils'

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } }
}
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }
}

export const Dashboard = () => {
  const [addOpen, setAddOpen] = useState(false)
  const { user, streak } = useAppStore()
  const { tasks, isLoading, createTask, updateStatus, deleteTask } = useTasks()
  const { schedule, regenerate } = useSchedule(tasks, user?.preferences ?? {} as any)
  const { start: startFocus } = useFocusTimer()

  const today = format(new Date(), 'EEEE, d MMMM')
  const hour  = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const todayTasks  = useMemo(() => tasks.filter((t) => t.status !== 'cancelled'), [tasks])
  const completed   = useMemo(() => todayTasks.filter((t) => t.status === 'completed'), [todayTasks])
  const pending     = useMemo(() => todayTasks.filter((t) => t.status === 'pending' || t.status === 'in_progress'), [todayTasks])
  const critical    = useMemo(() => pending.filter((t) => t.priority === 'critical'), [pending])
  const overdue     = useMemo(() => pending.filter((t) => t.due_date && new Date(t.due_date) < new Date()), [pending])
  const focusMinutes = useMemo(() => completed.reduce((a, t) => a + (t.actual_minutes ?? t.estimated_minutes), 0), [completed])

  const dayScore    = computeDayScore(completed.length, todayTasks.length, focusMinutes)
  const topCategory = useMemo(() => {
    const counts: Record<string, number> = {}
    pending.forEach((t) => { counts[t.category] = (counts[t.category] ?? 0) + 1 })
    return Object.entries(counts).sort(([,a],[,b]) => b - a)[0]?.[0]
  }, [pending])

  const nextTask    = pending.sort((a, b) => b.priority_score - a.priority_score)[0]

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Spinner size={32} />
    </div>
  )

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-600 uppercase tracking-widest font-mono mb-1">{today}</p>
          <h1 className="font-display text-3xl lg:text-4xl font-light text-white">
            {greeting}, <span className="text-gold-400 italic">{user?.name?.split(' ')[0] ?? 'Executive'}</span>
          </h1>
          {overdue.length > 0 && (
            <p className="mt-1 text-sm text-red-400 flex items-center gap-1.5">
              <AlertTriangle size={13} />
              {overdue.length} overdue {overdue.length === 1 ? 'task' : 'tasks'} require attention
            </p>
          )}
        </div>
        <Button variant="gold" icon={<Plus size={15} />} onClick={() => setAddOpen(true)}>
          New Task
        </Button>
      </motion.div>

      {/* KPI Strip */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: 'Day Score',
            value: `${dayScore}`,
            sub: '/100',
            icon: <ProgressRing value={dayScore} size={36} strokeWidth={4} />,
            color: scoreColor(dayScore),
          },
          {
            label: 'Completed',
            value: String(completed.length),
            sub: `of ${todayTasks.length}`,
            icon: <CheckCircle2 size={20} className="text-emerald-400" />,
            color: 'text-emerald-400',
          },
          {
            label: 'Focus Time',
            value: formatDuration(focusMinutes),
            sub: 'today',
            icon: <Clock size={20} className="text-blue-400" />,
            color: 'text-blue-400',
          },
          {
            label: 'Streak',
            value: String(streak),
            sub: 'days',
            icon: <Flame size={20} className="text-orange-400" />,
            color: 'text-orange-400',
          },
        ].map((kpi) => (
          <Card key={kpi.label} className="p-4 flex items-center gap-4" hover>
            {kpi.icon}
            <div>
              <p className="text-xs text-gray-600 uppercase tracking-widest font-mono">{kpi.label}</p>
              <p className={`text-xl font-bold font-mono ${kpi.color}`}>
                {kpi.value}<span className="text-sm font-normal text-gray-600">{kpi.sub}</span>
              </p>
            </div>
          </Card>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Priority Tasks (left 2/3) */}
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-4">
          {/* Next Up */}
          {nextTask && (
            <Card glow className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Zap size={14} className="text-gold-400" />
                  <span className="text-xs uppercase tracking-widest text-gold-400 font-mono">Up Next</span>
                </div>
                <Badge variant="gold">{CATEGORY_META[nextTask.category]?.label}</Badge>
              </div>
              <p className="text-lg font-display font-medium text-white mb-1">{nextTask.title}</p>
              <p className="text-xs text-gray-500 mb-4">{formatDuration(nextTask.estimated_minutes)} estimated</p>
              <div className="flex gap-2">
                <Button
                  variant="gold"
                  size="sm"
                  onClick={() => {
                    updateStatus({ id: nextTask.id, status: 'in_progress' })
                    startFocus(nextTask.id, nextTask.title, nextTask.estimated_minutes)
                  }}
                >
                  Start Focus Session
                </Button>
                <Button variant="secondary" size="sm" onClick={() => updateStatus({ id: nextTask.id, status: 'completed' })}>
                  Mark Done
                </Button>
              </div>
            </Card>
          )}

          {/* Task List */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-light text-white">Today's Tasks</h2>
              <Badge>{pending.length} pending</Badge>
            </div>

            {critical.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-red-400 uppercase tracking-widest font-mono mb-2">Critical</p>
                <div className="space-y-2">
                  {critical.slice(0, 3).map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onComplete={(id) => updateStatus({ id, status: 'completed' })}
                      onStart={(id) => updateStatus({ id, status: 'in_progress' })}
                      onDelete={(id) => deleteTask(id)}
                      onFocus={(t) => startFocus(t.id, t.title, t.estimated_minutes)}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              {pending.filter((t) => t.priority !== 'critical').slice(0, 5).map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  compact
                  onComplete={(id) => updateStatus({ id, status: 'completed' })}
                  onStart={(id) => updateStatus({ id, status: 'in_progress' })}
                  onDelete={(id) => deleteTask(id)}
                  onFocus={(t) => startFocus(t.id, t.title, t.estimated_minutes)}
                />
              ))}
            </div>

            {pending.length === 0 && (
              <div className="text-center py-8">
                <CheckCircle2 size={32} className="text-emerald-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">All tasks complete. Exceptional work.</p>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Right sidebar */}
        <motion.div variants={itemVariants} className="space-y-4">
          <FocusTimerWidget />

          {/* Schedule preview */}
          {schedule && (
            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-white">Today's Schedule</h3>
                <button onClick={() => regenerate()} className="text-gray-600 hover:text-gold-400 transition-colors">
                  <RefreshCw size={13} />
                </button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto custom-scroll">
                {schedule.generated_plan_json.slice(0, 6).map((block, i) => (
                  <div key={i} className={`flex items-center gap-2 text-xs py-1 ${block.block_type === 'break' ? 'opacity-40' : ''}`}>
                    <span className="font-mono text-gray-600 w-10 flex-shrink-0">{block.start_time}</span>
                    <span className={`text-gray-300 truncate ${!block.energy_match ? 'text-orange-400' : ''}`}>
                      {block.task_title}
                    </span>
                  </div>
                ))}
              </div>
              {schedule.overload_warning && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-orange-400">
                  <AlertTriangle size={11} />
                  Workload exceeds capacity
                </div>
              )}
            </Card>
          )}

          {/* AI suggestion */}
          {topCategory && (
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={13} className="text-violet-400" />
                <span className="text-xs uppercase tracking-widest text-violet-400 font-mono">Insight</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Your heaviest category today is{' '}
                <span className="text-white font-medium">{CATEGORY_META[topCategory as keyof typeof CATEGORY_META]?.label}</span>.
                {' '}Consider batching similar tasks for maximum efficiency.
              </p>
            </Card>
          )}
        </motion.div>
      </div>

      <AddTaskModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={(task) => createTask(task as any)}
      />
    </motion.div>
  )
}
