import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, StopCircle, Zap } from 'lucide-react'
import { ProgressRing, Card, Button } from '@/components/ui'
import { useFocusTimer } from '@/hooks'
import { formatDuration } from '@/utils'

export const FocusTimerWidget = () => {
  const { focusSession, pause, resume, stop, progress, remaining } = useFocusTimer()

  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60

  return (
    <AnimatePresence mode="wait">
      {focusSession ? (
        <motion.div
          key="active"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
        >
          <Card glow className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={14} className="text-gold-400 animate-pulse" />
              <span className="text-xs uppercase tracking-widest text-gold-400 font-mono">Focus Active</span>
            </div>

            <div className="flex items-center gap-5">
              <div className="relative flex-shrink-0">
                <ProgressRing value={progress * 100} size={84} strokeWidth={5} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-mono text-sm font-medium text-white">
                    {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
                  </span>
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 mb-1">Working on</p>
                <p className="text-sm font-medium text-white truncate">{focusSession.task_title}</p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {formatDuration(focusSession.duration_minutes)} session
                </p>

                <div className="flex items-center gap-2 mt-3">
                  <Button
                    variant="gold"
                    size="sm"
                    icon={focusSession.is_paused ? <Play size={12} /> : <Pause size={12} />}
                    onClick={focusSession.is_paused ? resume : pause}
                  >
                    {focusSession.is_paused ? 'Resume' : 'Pause'}
                  </Button>
                  <Button variant="ghost" size="sm" icon={<StopCircle size={12} />} onClick={stop}>
                    End
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      ) : (
        <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={14} className="text-gray-600" />
              <span className="text-xs uppercase tracking-widest text-gray-600 font-mono">Focus Mode</span>
            </div>
            <p className="text-xs text-gray-500">
              Select a task and start a focused session to enter deep work mode.
            </p>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
