import { useState } from 'react'
import { motion } from 'framer-motion'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Check, Clock, Play, MoreHorizontal, Trash2, ChevronRight, GripVertical } from 'lucide-react'
import { cn, CATEGORY_META, PRIORITY_META, formatDuration, dueDateLabel } from '@/utils'
import { Badge, Button } from '@/components/ui'
import type { Task } from '@/types'

interface TaskCardProps {
  task: Task
  onComplete?: (id: string) => void
  onStart?: (id: string) => void
  onDelete?: (id: string) => void
  onFocus?: (task: Task) => void
  onEdit?: (task: Task) => void
  compact?: boolean
  draggable?: boolean
}

export const TaskCard = ({
  task, onComplete, onStart, onDelete, onFocus, onEdit, compact, draggable
}: TaskCardProps) => {
  const [showActions, setShowActions] = useState(false)

  const sortable = useSortable({ id: task.id, disabled: !draggable })
  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  }

  const cat  = CATEGORY_META[task.category]
  const pri  = PRIORITY_META[task.priority]
  const isCompleted = task.status === 'completed'
  const isInProgress = task.status === 'in_progress'

  return (
    <motion.div
      ref={draggable ? sortable.setNodeRef : undefined}
      style={draggable ? style : undefined}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={cn(
        'group relative bg-white/[0.03] border rounded-xl transition-all duration-200',
        isCompleted
          ? 'border-white/[0.04] opacity-50'
          : isInProgress
            ? 'border-gold-500/30 bg-gold-500/[0.03] shadow-gold'
            : 'border-white/[0.06] hover:border-white/10 hover:bg-white/[0.05]',
        compact ? 'p-3' : 'p-4'
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Drag handle */}
      {draggable && (
        <div
          {...sortable.listeners}
          {...sortable.attributes}
          className="absolute left-0 inset-y-0 w-6 flex items-center justify-center cursor-grab active:cursor-grabbing text-white/10 hover:text-white/30 transition-colors"
        >
          <GripVertical size={14} />
        </div>
      )}

      <div className={cn('flex items-start gap-3', draggable && 'pl-4')}>
        {/* Complete button */}
        <button
          onClick={() => !isCompleted && onComplete?.(task.id)}
          className={cn(
            'mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200',
            isCompleted
              ? 'bg-emerald-500 border-emerald-500'
              : 'border-white/20 hover:border-emerald-400 hover:bg-emerald-400/10'
          )}
        >
          {isCompleted && <Check size={10} className="text-white" strokeWidth={3} />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={cn(
              'text-sm font-medium leading-snug',
              isCompleted ? 'line-through text-gray-600' : 'text-white'
            )}>
              {task.title}
            </p>

            {/* Actions (visible on hover) */}
            <div className={cn('flex items-center gap-1 flex-shrink-0 transition-opacity duration-200', showActions ? 'opacity-100' : 'opacity-0')}>
              {!isCompleted && onStart && task.status === 'pending' && (
                <button
                  onClick={() => onStart(task.id)}
                  className="p-1 text-gray-500 hover:text-emerald-400 transition-colors"
                  title="Start task"
                >
                  <Play size={13} />
                </button>
              )}
              {onFocus && !isCompleted && (
                <button
                  onClick={() => onFocus(task)}
                  className="p-1 text-gray-500 hover:text-gold-400 transition-colors"
                  title="Focus timer"
                >
                  <Clock size={13} />
                </button>
              )}
              {onEdit && (
                <button
                  onClick={() => onEdit(task)}
                  className="p-1 text-gray-500 hover:text-white transition-colors"
                  title="Edit"
                >
                  <ChevronRight size={13} />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(task.id)}
                  className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                  title="Delete"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Meta row */}
          {!compact && (
            <div className="flex items-center flex-wrap gap-1.5 mt-2">
              {/* Category */}
              <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs border border-transparent', cat.color)}>
                <span>{cat.icon}</span>
                {cat.label}
              </span>

              {/* Priority dot */}
              <span className="flex items-center gap-1.5 text-xs text-gray-600">
                <span className={cn('w-1.5 h-1.5 rounded-full', pri.dot)} />
                <span className={pri.color}>{pri.label}</span>
              </span>

              {/* Duration */}
              <span className="flex items-center gap-1 text-xs text-gray-600">
                <Clock size={10} />
                {formatDuration(task.estimated_minutes)}
              </span>

              {/* Due date */}
              {task.due_date && (
                <span className={cn(
                  'text-xs',
                  new Date(task.due_date) < new Date() ? 'text-red-400' : 'text-gray-600'
                )}>
                  {dueDateLabel(task.due_date)}
                </span>
              )}

              {/* Score badge */}
              <span className="ml-auto font-mono text-[10px] text-gray-700">
                {task.priority_score}
              </span>
            </div>
          )}

          {task.description && !compact && (
            <p className="mt-1.5 text-xs text-gray-600 line-clamp-2">{task.description}</p>
          )}
        </div>
      </div>

      {/* In-progress indicator */}
      {isInProgress && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-gold-500/0 via-gold-500 to-gold-500/0 rounded-t-xl" />
      )}
    </motion.div>
  )
}
