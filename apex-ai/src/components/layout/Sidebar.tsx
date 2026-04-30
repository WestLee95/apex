import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, Calendar, ListTodo, BarChart3,
  MessageSquare, Settings, Bell, Zap, LogOut
} from 'lucide-react'
import { cn } from '@/utils'
import { useAppStore, selectUnreadNotifications, selectPendingCount } from '@/store'
import { signOut } from '@/lib/supabase'

const NAV_ITEMS = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard'    },
  { to: '/today',     icon: Calendar,        label: 'Today'        },
  { to: '/tasks',     icon: ListTodo,        label: 'Tasks'        },
  { to: '/analytics', icon: BarChart3,       label: 'Analytics'   },
  { to: '/assistant', icon: MessageSquare,   label: 'APEX AI'      },
  { to: '/settings',  icon: Settings,        label: 'Settings'     },
]

export const Sidebar = () => {
  const { user } = useAppStore()
  const unread   = useAppStore(selectUnreadNotifications)
  const pending  = useAppStore(selectPendingCount)
  const loc      = useLocation()

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/auth'
  }

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-16 lg:w-60 flex flex-col bg-[#08080f]/95 border-r border-white/[0.05] backdrop-blur-xl z-40">
      {/* Logo */}
      <div className="h-16 flex items-center px-3 lg:px-5 border-b border-white/[0.05]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold-500/30 to-gold-600/10 border border-gold-500/30 flex items-center justify-center flex-shrink-0">
            <Zap size={14} className="text-gold-400" />
          </div>
          <span className="hidden lg:block font-display text-lg font-light text-white tracking-wide">
            APEX
          </span>
        </div>
        {unread > 0 && (
          <div className="hidden lg:flex ml-auto">
            <span className="flex items-center gap-1 text-xs bg-gold-500/15 text-gold-400 px-2 py-0.5 rounded-full border border-gold-500/20">
              <Bell size={10} />
              {unread}
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 space-y-0.5 px-2">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200',
                isActive
                  ? 'bg-white/[0.07] text-white border border-white/[0.07]'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]'
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className={cn('relative flex-shrink-0', isActive && 'text-gold-400')}>
                  <Icon size={17} />
                  {to === '/tasks' && pending > 0 && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-gold-500 text-black text-[8px] font-bold rounded-full flex items-center justify-center">
                      {pending > 9 ? '9+' : pending}
                    </span>
                  )}
                </div>
                <span className="hidden lg:block font-sans font-medium">{label}</span>
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="hidden lg:block ml-auto w-1 h-1 rounded-full bg-gold-400"
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="p-2 border-t border-white/[0.05]">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gold-500/20 to-violet-500/20 border border-white/10 flex items-center justify-center flex-shrink-0 text-xs font-bold text-gold-400">
            {user?.name?.[0]?.toUpperCase() ?? 'A'}
          </div>
          <div className="hidden lg:block flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{user?.name ?? 'Executive'}</p>
            <p className="text-[10px] text-gray-600 truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="hidden lg:flex text-gray-600 hover:text-red-400 transition-colors"
            title="Sign out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}
