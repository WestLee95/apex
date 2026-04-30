import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Zap, Trash2, RefreshCw, Sparkles } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { format } from 'date-fns'
import { Card, Button, Input, Spinner } from '@/components/ui'
import { useAppStore } from '@/store'
import { useTasks } from '@/hooks'
import { aiService } from '@/services/aiService'
import type { ChatMessage, AssistantAction } from '@/types'
import { cn } from '@/utils'

const QUICK_PROMPTS = [
  'What should I work on next?',
  'Plan my day from now',
  'Am I overloaded today?',
  'Move low priority tasks to tomorrow',
  'Give me a weekly summary',
  'What am I procrastinating on?',
]

const MessageBubble = ({ message, onAction }: { message: ChatMessage; onAction: (action: AssistantAction) => void }) => {
  const isUser = message.role === 'user'
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8 }}
      className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}
    >
      {/* Avatar */}
      <div className={cn(
        'w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-bold mt-0.5',
        isUser
          ? 'bg-white/10 text-white'
          : 'bg-gradient-to-br from-gold-500/30 to-violet-500/20 border border-gold-500/20 text-gold-400'
      )}>
        {isUser ? '👤' : <Zap size={13} />}
      </div>

      {/* Bubble */}
      <div className={cn('max-w-[80%] space-y-2', isUser ? 'items-end' : 'items-start')}>
        <div className={cn(
          'rounded-2xl px-4 py-3 text-sm leading-relaxed',
          isUser
            ? 'bg-white/10 text-white rounded-tr-sm'
            : 'bg-white/[0.03] border border-white/[0.06] text-gray-200 rounded-tl-sm'
        )}>
          {/* Render markdown-ish bold and code */}
          {message.content.split('\n').map((line, i) => (
            <p key={i} className={i > 0 ? 'mt-1' : ''}>
              {line.split(/(\*\*[^*]+\*\*|`[^`]+`)/).map((part, j) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                  return <strong key={j} className="text-white font-semibold">{part.slice(2, -2)}</strong>
                }
                if (part.startsWith('`') && part.endsWith('`')) {
                  return <code key={j} className="bg-white/10 px-1.5 py-0.5 rounded text-gold-400 font-mono text-xs">{part.slice(1, -1)}</code>
                }
                return part
              })}
            </p>
          ))}
        </div>

        {/* Action buttons */}
        {!isUser && message.actions && message.actions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {message.actions.map((action, i) => (
              <button
                key={i}
                onClick={() => onAction(action)}
                className="flex items-center gap-1.5 text-xs bg-gold-500/10 hover:bg-gold-500/20 border border-gold-500/20 text-gold-400 px-3 py-1.5 rounded-lg transition-all"
              >
                <Sparkles size={10} />
                {action.label}
              </button>
            ))}
          </div>
        )}

        <p className="text-[10px] text-gray-700 px-1">
          {format(new Date(message.timestamp), 'HH:mm')}
        </p>
      </div>
    </motion.div>
  )
}

export const AssistantChat = () => {
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef         = useRef<HTMLDivElement>(null)

  const { user, chatHistory, addChatMessage, clearChat } = useAppStore()
  const { tasks, createTask, updateStatus } = useTasks()

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  useEffect(scrollToBottom, [chatHistory])

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return
    setInput('')
    setLoading(true)

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
      actions: [],
    }
    addChatMessage(userMsg)

    try {
      const response = await aiService.chat(
        text,
        chatHistory,
        tasks,
        user?.preferences ?? {} as any
      )
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date().toISOString(),
        actions: response.actions,
      }
      addChatMessage(assistantMsg)
    } catch (err) {
      toast.error('Assistant unavailable — check your API key')
      const errMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'I encountered an error. Please verify your OpenAI API key in Settings.',
        timestamp: new Date().toISOString(),
        actions: [],
      }
      addChatMessage(errMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (action: AssistantAction) => {
    try {
      switch (action.type) {
        case 'create_task':
          await createTask(action.payload as any)
          toast.success(`Task created: "${(action.payload as any).title}"`)
          break
        case 'defer_tasks': {
          const ids: string[] = (action.payload as any).task_ids ?? []
          const tomorrow = new Date()
          tomorrow.setDate(tomorrow.getDate() + 1)
          for (const id of ids) {
            await updateStatus({ id, status: 'deferred' })
          }
          toast.success(`${ids.length} tasks deferred to tomorrow`)
          break
        }
        case 'update_schedule':
          toast.success('Regenerating your schedule…')
          break
        default:
          break
      }
    } catch {
      toast.error('Action failed')
    }
  }

  const isEmpty = chatHistory.length === 0

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-400 font-mono uppercase tracking-widest">Online</span>
          </div>
          <h1 className="font-display text-3xl font-light text-white">APEX Assistant</h1>
        </div>
        <Button variant="ghost" size="sm" icon={<Trash2 size={13} />} onClick={() => { clearChat(); toast.success('Conversation cleared') }}>
          Clear
        </Button>
      </motion.div>

      {/* Messages area */}
      <Card className="flex-1 overflow-y-auto p-5 min-h-0 custom-scroll">
        {isEmpty ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="h-full flex flex-col items-center justify-center text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold-500/20 to-violet-500/10 border border-gold-500/20 flex items-center justify-center mb-4">
              <Zap size={28} className="text-gold-400" />
            </div>
            <h2 className="font-display text-2xl font-light text-white mb-2">Your Chief of Staff</h2>
            <p className="text-sm text-gray-500 max-w-sm leading-relaxed mb-6">
              Ask me to plan your day, prioritize your backlog, analyze your output, or figure out why you keep postponing that one admin task.
            </p>

            {/* Quick prompts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="text-left px-3 py-2.5 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/10 rounded-xl text-xs text-gray-400 hover:text-white transition-all"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {chatHistory.map((msg) => (
                <MessageBubble key={msg.id} message={msg} onAction={handleAction} />
              ))}
            </AnimatePresence>
            {loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gold-500/30 to-violet-500/20 border border-gold-500/20 flex items-center justify-center flex-shrink-0">
                  <Zap size={13} className="text-gold-400" />
                </div>
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1 items-center">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-gold-400/60"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1, delay: i * 0.2, repeat: Infinity }}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </Card>

      {/* Quick prompts (when chat has messages) */}
      {!isEmpty && (
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1 flex-shrink-0">
          {QUICK_PROMPTS.slice(0, 4).map((p) => (
            <button
              key={p}
              onClick={() => sendMessage(p)}
              className="flex-shrink-0 text-xs bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/10 text-gray-500 hover:text-gray-300 px-3 py-1.5 rounded-lg transition-all"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="mt-3 flex gap-2 flex-shrink-0">
        <div className="flex-1">
          <Input
            placeholder="Ask APEX anything about your tasks, schedule, or productivity…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
            disabled={loading}
          />
        </div>
        <Button
          variant="gold"
          icon={loading ? <Spinner size={14} /> : <Send size={14} />}
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || loading}
          className="flex-shrink-0"
        >
          Send
        </Button>
      </div>
    </div>
  )
}
