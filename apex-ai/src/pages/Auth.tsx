import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { Zap, Eye, EyeOff } from 'lucide-react'
import { Button, Input, Spinner } from '@/components/ui'
import { signInWithEmail, signUpWithEmail, signInWithGoogle } from '@/lib/supabase'

type Mode = 'login' | 'signup'

export const Auth = () => {
  const navigate = useNavigate()
  const [mode,    setMode]    = useState<Mode>('login')
  const [loading, setLoading] = useState(false)
  const [showPw,  setShowPw]  = useState(false)

  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [errors, setErrors] = useState<Partial<typeof form>>({})

  const update = (key: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const validate = (): boolean => {
    const errs: Partial<typeof form> = {}
    if (mode === 'signup' && !form.name.trim()) errs.name = 'Name is required'
    if (!form.email.includes('@'))              errs.email = 'Valid email required'
    if (form.password.length < 6)              errs.password = 'Minimum 6 characters'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      if (mode === 'login') {
        await signInWithEmail(form.email, form.password)
      } else {
        await signUpWithEmail(form.email, form.password, form.name)
        toast.success('Account created! Welcome to APEX.')
      }
      navigate('/')
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    try {
      await signInWithGoogle()
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? 'Google sign-in failed')
    }
  }

  

  return (
    <div className="min-h-screen bg-[#06060f] bg-grid-dark flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="fixed inset-0 bg-radial-gold pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-gold-500/30 to-gold-600/10 border border-gold-500/30 mb-4">
            <Zap size={24} className="text-gold-400" />
          </div>
          <h1 className="font-display text-3xl font-light text-white tracking-wide">APEX</h1>
          <p className="text-sm text-gray-600 mt-1 font-sans">Executive Intelligence Platform</p>
        </div>

        {/* Card */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-3xl p-8 backdrop-blur-sm shadow-card">
          {/* Mode toggle */}
          <div className="flex items-center gap-1 bg-white/[0.03] p-1 rounded-xl mb-6 border border-white/[0.04]">
            {(['login', 'signup'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setErrors({}) }}
                className={`flex-1 py-2 text-sm rounded-lg transition-all font-medium capitalize ${m === mode ? 'bg-white/[0.08] text-white' : 'text-gray-500 hover:text-gray-300'}`}
              >
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <AnimatePresence>
              {mode === 'signup' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Input
                    label="Full Name"
                    placeholder="Your name"
                    value={form.name}
                    onChange={(e) => update('name', e.target.value)}
                    error={errors.name}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              error={errors.email}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                error={errors.password}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 bottom-2.5 text-gray-500 hover:text-gray-300 transition-colors"
              >
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>

            <Button
              variant="gold"
              onClick={handleSubmit}
              loading={loading}
              disabled={loading}
              className="w-full justify-center py-3"
            >
              {mode === 'login' ? 'Sign In to APEX' : 'Create Account'}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/[0.06]" />
              </div>
              <div className="relative text-center">
                <span className="bg-[#0d0d1f] px-3 text-xs text-gray-600">or</span>
              </div>
            </div>

            <Button
              variant="secondary"
              onClick={handleGoogle}
              className="w-full justify-center"
              icon={
                <svg width="15" height="15" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              }
            >
              Continue with Google
            </Button>
          </div>

          {mode === 'login' && (
            <p className="text-center text-xs text-gray-700 mt-4">
              No account?{' '}
              <button onClick={() => setMode('signup')} className="text-gold-400 hover:underline">
                Create one
              </button>
            </p>
          )}
        </div>

        <p className="text-center text-xs text-gray-700 mt-4">
          Secured by Supabase Auth · Row-level security enabled
        </p>
      </motion.div>
    </div>
  )
}
