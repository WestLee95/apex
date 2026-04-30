import React, { useEffect } from 'react'
import { cn } from '@/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

// ─── Button ────────────────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: React.ReactNode
}
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, icon, children, className, disabled, ...props }, ref) => {
    const variants = {
      primary:   'bg-white text-black hover:bg-gray-100 font-medium',
      secondary: 'bg-white/5 border border-white/10 hover:bg-white/10 text-white',
      ghost:     'hover:bg-white/5 text-gray-400 hover:text-white',
      danger:    'bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20',
      gold:      'bg-gold-500/10 border border-gold-500/30 text-gold-400 hover:bg-gold-500/20 shadow-gold',
    }
    const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-6 py-3 text-base' }
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center gap-2 rounded-lg transition-all duration-200 cursor-pointer select-none',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          variants[variant], sizes[size], className
        )}
        {...props}
      >
        {loading ? <Spinner /> : icon}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'

// ─── Card ──────────────────────────────────────────────────────────────────
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean
  glow?: boolean
}
export const Card = ({ children, className, hover, glow, ...props }: CardProps) => (
  <div
    className={cn(
      'bg-white/[0.03] border border-white/[0.06] rounded-2xl',
      'shadow-card backdrop-blur-sm',
      hover && 'hover:bg-white/[0.05] hover:border-white/10 hover:shadow-card-hover transition-all duration-300',
      glow && 'shadow-gold border-gold-500/20',
      className
    )}
    {...props}
  >
    {children}
  </div>
)

// ─── Badge ─────────────────────────────────────────────────────────────────
interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'gold' | 'red' | 'green' | 'blue'
}
export const Badge = ({ variant = 'default', children, className, ...props }: BadgeProps) => {
  const variants = {
    default: 'bg-white/5 text-gray-400 border-white/10',
    gold:    'bg-gold-400/10 text-gold-400 border-gold-400/20',
    red:     'bg-red-400/10 text-red-400 border-red-400/20',
    green:   'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
    blue:    'bg-blue-400/10 text-blue-400 border-blue-400/20',
  }
  return (
    <span
      className={cn('inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-md border font-mono', variants[variant], className)}
      {...props}
    >
      {children}
    </span>
  )
}

// ─── Input ─────────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: React.ReactNode
}
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className, ...props }, ref) => (
    <div className="space-y-1.5">
      {label && <label className="block text-xs text-gray-400 font-sans tracking-wide uppercase">{label}</label>}
      <div className="relative">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">{icon}</span>}
        <input
          ref={ref}
          className={cn(
            'w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5',
            'text-sm text-white placeholder-gray-600 font-sans',
            'focus:outline-none focus:border-gold-500/50 focus:bg-white/[0.06]',
            'transition-all duration-200',
            icon && 'pl-10',
            error && 'border-red-500/50',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
)
Input.displayName = 'Input'

// ─── Textarea ──────────────────────────────────────────────────────────────
export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }>(
  ({ label, className, ...props }, ref) => (
    <div className="space-y-1.5">
      {label && <label className="block text-xs text-gray-400 uppercase tracking-wide">{label}</label>}
      <textarea
        ref={ref}
        rows={3}
        className={cn(
          'w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 resize-none',
          'text-sm text-white placeholder-gray-600 font-sans',
          'focus:outline-none focus:border-gold-500/50 focus:bg-white/[0.06]',
          'transition-all duration-200', className
        )}
        {...props}
      />
    </div>
  )
)
Textarea.displayName = 'Textarea'

// ─── Select ────────────────────────────────────────────────────────────────
export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }>(
  ({ label, className, children, ...props }, ref) => (
    <div className="space-y-1.5">
      {label && <label className="block text-xs text-gray-400 uppercase tracking-wide">{label}</label>}
      <select
        ref={ref}
        className={cn(
          'w-full bg-[#0d0d1f] border border-white/10 rounded-xl px-4 py-2.5',
          'text-sm text-white font-sans cursor-pointer appearance-none',
          'focus:outline-none focus:border-gold-500/50',
          'transition-all duration-200', className
        )}
        {...props}
      >
        {children}
      </select>
    </div>
  )
)
Select.displayName = 'Select'

// ─── Modal ─────────────────────────────────────────────────────────────────
interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}
export const Modal = ({ open, onClose, title, children, size = 'md' }: ModalProps) => {
  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' }
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className={cn('relative w-full bg-[#0d0d1f] border border-white/10 rounded-2xl shadow-2xl', sizes[size])}
            initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
          >
            {title && (
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
                <h2 className="font-display text-lg font-medium text-white">{title}</h2>
                <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors"><X size={18} /></button>
              </div>
            )}
            <div className="p-6">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Spinner ───────────────────────────────────────────────────────────────
export const Spinner = ({ size = 16 }: { size?: number }) => (
  <svg className="animate-spin text-current" width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
)

// ─── Progress Ring ─────────────────────────────────────────────────────────
export const ProgressRing = ({ value, size = 80, strokeWidth = 6, color = '#d4a843' }: {
  value: number; size?: number; strokeWidth?: number; color?: string
}) => {
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (value / 100) * circ
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth} />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none" stroke={color}
        strokeWidth={strokeWidth} strokeDasharray={circ}
        strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
    </svg>
  )
}

