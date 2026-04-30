import { useEffect, useState } from 'react'
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { Dashboard }     from '@/pages/Dashboard'
import { TodayPlanner }  from '@/pages/TodayPlanner'
import { Tasks }         from '@/pages/Tasks'
import { Analytics }     from '@/pages/Analytics'
import { AssistantChat } from '@/pages/AssistantChat'
import { Settings }      from '@/pages/Settings'
import { Auth }          from '@/pages/Auth'
import { useAppStore }   from '@/store'
import { supabase }      from '@/lib/supabase'
import { Spinner }       from '@/components/ui'
import type { UserProfile } from '@/types'
import '../styles/global.css'
import { AuthCallback } from '@/pages/AuthCallback'


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
})

// ── Auth Guard ─────────────────────────────────────────────────────────────
const AuthGuard = () => {
  const { user, setUser } = useAppStore()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        // Fetch user profile from DB
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (profile) {
          setUser(profile as UserProfile)
        } else {
          // Auto-create profile on first login
          const newProfile: Omit<UserProfile, 'created_at'> = {
            id:       session.user.id,
            name:     session.user.user_metadata?.name ?? session.user.email?.split('@')[0] ?? 'Executive',
            email:    session.user.email ?? '',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            preferences: {
              work_start:              '08:00',
              work_end:                '18:00',
              peak_energy_hours:       ['09:00', '10:00', '11:00'],
              break_duration_minutes:  10,
              focus_block_minutes:     90,
              notification_enabled:    true,
              notification_channels:   ['browser'],
              google_calendar_connected: false,
              theme:                   'dark',
              ai_personality:          'professional',
              weekly_goal_hours:       40,
            },
          }
          await supabase.from('users').insert(newProfile)
          setUser({ ...newProfile, created_at: new Date().toISOString() })
        }
      }
      setChecking(false)
    })

    // Auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null)
      } else if (event === 'SIGNED_IN' && session?.user) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()
        if (profile) setUser(profile as UserProfile)
      }
    })

    return () => subscription.unsubscribe()
  }, [setUser])

  if (checking) {
    return (
      <div className="min-h-screen bg-[#06060f] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gold-500/30 to-gold-600/10 border border-gold-500/30 flex items-center justify-center">
            <Spinner size={20} />
          </div>
          <p className="text-xs text-gray-600 font-mono uppercase tracking-widest">Loading APEX…</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/auth" replace />
  return <Outlet />
}

// ── Router definition ──────────────────────────────────────────────────────
const router = createBrowserRouter([
  {
    path: '/auth',
    element: <Auth />,
  },
  {
  path: '/auth/callback',
  element: <AuthCallback />,  // ✅
},
  {
    element: <AuthGuard />,
    children: [
      {
        element: <Layout />,
        children: [
          { path: '/',          element: <Dashboard />     },
          { path: '/today',     element: <TodayPlanner />  },
          { path: '/tasks',     element: <Tasks />         },
          { path: '/analytics', element: <Analytics />     },
          { path: '/assistant', element: <AssistantChat /> },
          { path: '/settings',  element: <Settings />      },
          { path: '*',          element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
])

// ── App Root ───────────────────────────────────────────────────────────────
export const App = () => (
  <QueryClientProvider client={queryClient}>
    
      <RouterProvider router={router} />
      <Toaster position="top-right" />
    
    
  </QueryClientProvider>
)
