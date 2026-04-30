import { useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'react-hot-toast'
import { Save, Bell, User, Zap, Link, Shield } from 'lucide-react'
import { Card, Button, Input, Select } from '@/components/ui'
import { useAppStore } from '@/store'
import { notificationService } from '@/features/notifications/notificationService'
import { supabase } from '@/lib/supabase'
import { cn } from '@/utils'
import type { UserPreferences } from '@/types'

const defaultPrefs: UserPreferences = {
  work_start: '08:00',
  work_end: '18:00',
  focus_block_minutes: 90,
  break_duration_minutes: 10,
  notification_enabled: true,
  whatsapp_number: '',
  theme: 'dark',
  weekly_goal_hours: 40,
  ai_personality: 'professional',
  peak_energy_hours: [],
  notification_channels: ['browser'],
  google_calendar_connected: false,
}

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'work', label: 'Work Hours', icon: Zap },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'integrations', label: 'Integrations', icon: Link },
  { id: 'security', label: 'Security', icon: Shield },
]

export const Settings = () => {
  const { user, setUser } = useAppStore()

  const [activeTab, setActiveTab] = useState('profile')
  const [saving, setSaving] = useState(false)

  const prefs: UserPreferences = {
    ...defaultPrefs,
    ...(user?.preferences ?? {}),
  }

  const [form, setForm] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    timezone: user?.timezone ?? 'Africa/Nairobi',
    work_start: prefs.work_start,
    work_end: prefs.work_end,
    focus_block_minutes: prefs.focus_block_minutes,
    break_duration_minutes: prefs.break_duration_minutes,
    notification_enabled: prefs.notification_enabled,
    whatsapp_number: prefs.whatsapp_number,
    openai_key: '',
    theme: prefs.theme,
    weekly_goal_hours: prefs.weekly_goal_hours,
    ai_personality: prefs.ai_personality,
  })

  const update = (key: string, value: unknown) =>
    setForm((f) => ({ ...f, [key]: value }))

  const handleSave = async () => {
    setSaving(true)

    try {
      const updatedPrefs: UserPreferences = {
        ...prefs,
        work_start: form.work_start,
        work_end: form.work_end,
        focus_block_minutes: form.focus_block_minutes,
        break_duration_minutes: form.break_duration_minutes,
        notification_enabled: form.notification_enabled,
        whatsapp_number: form.whatsapp_number,
        theme: form.theme,
        weekly_goal_hours: form.weekly_goal_hours,
        ai_personality: form.ai_personality,
      }

      const { error } = await supabase
        .from('users')
        .update({
          name: form.name,
          timezone: form.timezone,
          preferences: updatedPrefs,
        })
        .eq('id', user?.id)

      if (error) throw error

      if (user) {
        setUser({
          ...user,
          name: form.name,
          timezone: form.timezone,
          preferences: updatedPrefs,
        })
      }

      toast.success('Settings saved')
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  return <div>{/* keep your JSX exactly as it is below */}</div>
}