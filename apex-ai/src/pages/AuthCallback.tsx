// src/pages/AuthCallback.tsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Spinner } from '@/components/ui'

export const AuthCallback = () => {
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate('/', { replace: true })
      } else if (event === 'SIGNED_OUT' || !session) {
        navigate('/auth', { replace: true })
      }
    })
  }, [navigate])

  return (
    <div className="min-h-screen bg-[#06060f] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gold-500/30 to-gold-600/10 border border-gold-500/30 flex items-center justify-center">
          <Spinner size={20} />
        </div>
        <p className="text-xs text-gray-600 font-mono uppercase tracking-widest">
          Authenticating…
        </p>
      </div>
    </div>
  )
}