import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent
} from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus, Filter, Search, LayoutGrid, List } from 'lucide-react'
import { Card, Button, Input, Badge, Select } from '@/components/ui'
import { TaskCard } from '@/components/widgets/TaskCard'
import { AddTaskModal } from '@/components/widgets/AddTaskModal'
import { useTasks, useFocusTimer } from '@/hooks'
import { CATEGORY_META, PRIORITY_META } from '@/utils'
import type { TaskCategory, TaskPriority, TaskStatus } from '@/types'

type ViewMode = 'list' | 'board'

const STATUS_COLUMNS: { status: TaskStatus; label: string; color: string }[] = [
  { status: 'pending',     label: 'To Do',       color: 'text-gray-400' },
  { status: 'in_progress', label: 'In Progress',  color: 'text-gold-400' },
  { status: 'completed',   label: 'Done',         color: 'text-emerald-400' },
]

export const Tasks = () => {
  const [addOpen,    setAddOpen]    = useState(false)
  const [search,     setSearch]     = useState('')
  const [filterCat,  setFilterCat]  = useState<TaskCategory | 'all'>('all')
  const [filterPri,  setFilterPri]  = useState<TaskPriority | 'all'>('all')
  const [viewMode,   setViewMode]   = useState<ViewMode>('list')

  const { tasks, createTask, updateTask, updateStatus, deleteTask } = useTasks()
  const { start: startFocus } = useFocusTimer()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const filteredTasks = useMemo(() => {
    return tasks
      .filter((t) => t.status !== 'cancelled')
      .filter((t) => !search || t.title.toLowerCase().includes(search.toLowerCase()))
      .filter((t) => filterCat === 'all' || t.category === filterCat)
      .filter((t) => filterPri === 'all' || t.priority === filterPri)
      .sort((a, b) => b.priority_score - a.priority_score)
  }, [tasks, search, filterCat, filterPri])

  const tasksByStatus = useMemo(() => {
    const map: Record<TaskStatus, typeof filteredTasks> = {
      pending: [], in_progress: [], completed: [], deferred: [], cancelled: []
    }
    filteredTasks.forEach((t) => { map[t.status]?.push(t) })
    return map
  }, [filteredTasks])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    // Reorder logic — update priority_score based on new order
    const oldIdx = filteredTasks.findIndex((t) => t.id === active.id)
    const newIdx = filteredTasks.findIndex((t) => t.id === over.id)
    const scoreAbove = filteredTasks[newIdx - 1]?.priority_score ?? 100
    const scoreBelow = filteredTasks[newIdx + 1]?.priority_score ?? 0
    const newScore   = Math.round((scoreAbove + scoreBelow) / 2)
    updateTask({ id: String(active.id), updates: { priority_score: newScore } })
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-light text-white">Task Board</h1>
          <p className="text-sm text-gray-600 mt-0.5">{filteredTasks.length} tasks</p>
        </div>
        <Button variant="gold" icon={<Plus size={15} />} onClick={() => setAddOpen(true)}>
          New Task
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-48">
            <Input
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<Search size={14} />}
            />
          </div>

          <Select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value as TaskCategory | 'all')}
            className="w-36"
          >
            <option value="all">All Categories</option>
            {(Object.entries(CATEGORY_META) as [TaskCategory, typeof CATEGORY_META[TaskCategory]][]).map(([k, v]) => (
              <option key={k} value={k}>{v.icon} {v.label}</option>
            ))}
          </Select>

          <Select
            value={filterPri}
            onChange={(e) => setFilterPri(e.target.value as TaskPriority | 'all')}
            className="w-32"
          >
            <option value="all">All Priorities</option>
            {(Object.entries(PRIORITY_META) as [TaskPriority, typeof PRIORITY_META[TaskPriority]][]).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </Select>

          <div className="flex items-center gap-1 bg-white/[0.03] p-1 rounded-xl border border-white/[0.06]">
            {(['list', 'board'] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                className={`p-1.5 rounded-lg transition-colors ${viewMode === v ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
              >
                {v === 'list' ? <List size={14} /> : <LayoutGrid size={14} />}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* View */}
      <AnimatePresence mode="wait">
        {viewMode === 'list' ? (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={filteredTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {filteredTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      draggable
                      onComplete={(id) => updateStatus({ id, status: 'completed' })}
                      onStart={(id) => updateStatus({ id, status: 'in_progress' })}
                      onDelete={(id) => deleteTask(id)}
                      onFocus={(t) => startFocus(t.id, t.title, t.estimated_minutes)}
                    />
                  ))}
                  {filteredTasks.length === 0 && (
                    <Card className="p-12 text-center">
                      <p className="text-gray-500">No tasks match your filters.</p>
                    </Card>
                  )}
                </div>
              </SortableContext>
            </DndContext>
          </motion.div>
        ) : (
          <motion.div key="board" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {STATUS_COLUMNS.map(({ status, label, color }) => (
                <div key={status}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-xs uppercase tracking-widest font-mono ${color}`}>{label}</span>
                    <Badge>{tasksByStatus[status]?.length ?? 0}</Badge>
                  </div>
                  <div className="space-y-2">
                    {tasksByStatus[status]?.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onComplete={(id) => updateStatus({ id, status: 'completed' })}
                        onDelete={(id) => deleteTask(id)}
                        onFocus={(t) => startFocus(t.id, t.title, t.estimated_minutes)}
                      />
                    ))}
                    {tasksByStatus[status]?.length === 0 && (
                      <div className="border border-dashed border-white/[0.05] rounded-xl p-6 text-center">
                        <p className="text-xs text-gray-700">Empty</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AddTaskModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={(task) => createTask(task as any)}
      />
    </motion.div>
  )
}
