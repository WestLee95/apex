import { useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'react-hot-toast'
import { Save, Bell, User, Zap, Link, Shield } from 'lucide-react'
import { Card, Button, Input, Select } from '@/components/ui'
import { useAppStore } from '@/store'
import { notificationService } from '@/features/notifications/notificationService'
import { supabase } from '@/lib/supabase'
import { cn } from '@/utils'

const TABS = [
  { id: 'profile',       label: 'Profile',        icon: User },
  { id: 'work',          label: 'Work Hours',      icon: Zap },
  { id: 'notifications', label: 'Notifications',   icon: Bell },
  { id: 'integrations',  label: 'Integrations',    icon: Link },
  { id: 'security',      label: 'Security',        icon: Shield },
]

export const Settings = () => {
  const { user, setUser } = useAppStore()
  const [activeTab, setActiveTab] = useState('profile')
  const [saving,    setSaving]    = useState(false)

  const prefs = user?.preferences ?? {}

  const [form, setForm] = useState({
    name:              user?.name ?? '',
    email:             user?.email ?? '',
    timezone:          user?.timezone ?? 'Africa/Nairobi',
    work_start:        prefs.work_start ?? '08:00',
    work_end:          prefs.work_end   ?? '18:00',
    focus_block_minutes:  prefs.focus_block_minutes  ?? 90,
    break_duration_minutes: prefs.break_duration_minutes ?? 10,
    notification_enabled: prefs.notification_enabled ?? true,
    whatsapp_number:   prefs.whatsapp_number ?? '',
    openai_key:        '',
    theme:             prefs.theme ?? 'dark',
    weekly_goal_hours: prefs.weekly_goal_hours ?? 40,
    ai_personality:    prefs.ai_personality ?? 'professional',
  })

  const update = (key: string, value: unknown) => setForm((f) => ({ ...f, [key]: value }))

  const handleSave = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('users')
        .update({
          name:     form.name,
          timezone: form.timezone,
          preferences: {
            ...prefs,
            work_start:             form.work_start,
            work_end:               form.work_end,
            focus_block_minutes:    form.focus_block_minutes,
            break_duration_minutes: form.break_duration_minutes,
            notification_enabled:   form.notification_enabled,
            whatsapp_number:        form.whatsapp_number,
            theme:                  form.theme,
            weekly_goal_hours:      form.weekly_goal_hours,
            ai_personality:         form.ai_personality,
          },
        })
        .eq('id', user?.id)

      if (error) throw error
      if (user) {
        setUser({ ...user, name: form.name, timezone: form.timezone, preferences: { ...prefs, ...form } })
      }
      toast.success('Settings saved')
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const requestNotificationPermission = async () => {
    const granted = await notificationService.requestPermission()
    if (granted) {
      notificationService.scheduleDailyNotifications(form.work_start, form.work_end)
      toast.success('Notifications enabled')
    } else {
      toast.error('Permission denied by browser')
    }
  }

  const testNotification = async () => {
    await notificationService.show('focus_reminder', 'APEX Test', 'Your notification system is working. Excellent.')
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-light text-white">Settings</h1>
          <p className="text-sm text-gray-600 mt-0.5">Configure your executive assistant</p>
        </div>
        <Button variant="gold" icon={<Save size={14} />} onClick={handleSave} loading={saving}>
          Save Changes
        </Button>
      </div>

      <div className="flex gap-6 flex-col lg:flex-row">
        {/* Tab sidebar */}
        <div className="lg:w-48 flex-shrink-0">
          <nav className="space-y-0.5">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left transition-all',
                  activeTab === id
                    ? 'bg-white/[0.07] text-white border border-white/[0.07]'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]'
                )}
              >
                <Icon size={15} className={activeTab === id ? 'text-gold-400' : ''} />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab content */}
        <div className="flex-1 min-w-0">
          <Card className="p-6 space-y-5">
            {activeTab === 'profile' && (
              <>
                <h2 className="font-display text-lg font-light text-white border-b border-white/[0.05] pb-3">Profile</h2>
                <Input label="Full Name" value={form.name} onChange={(e) => update('name', e.target.value)} />
                <Input label="Email" value={form.email} disabled />
                <Select label="Timezone" value={form.timezone} onChange={(e) => update('timezone', e.target.value)}>
                  <option value="Africa/Nairobi">Africa/Nairobi (EAT)</option>
                  <option value="Africa/Lagos">Africa/Lagos (WAT)</option>
                  <option value="Europe/London">Europe/London (GMT)</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                  <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                  <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                </Select>
                <Select label="AI Personality" value={form.ai_personality} onChange={(e) => update('ai_personality', e.target.value)}>
                  <option value="professional">Professional — Direct & concise</option>
                  <option value="friendly">Friendly — Warm & encouraging</option>
                  <option value="direct">Direct — Blunt, no fluff</option>
                </Select>
                <Select label="Theme" value={form.theme} onChange={(e) => update('theme', e.target.value)}>
                  <option value="dark">Dark (Default)</option>
                  <option value="light">Light</option>
                  <option value="system">System</option>
                </Select>
              </>
            )}

            {activeTab === 'work' && (
              <>
                <h2 className="font-display text-lg font-light text-white border-b border-white/[0.05] pb-3">Work Hours & Schedule</h2>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Work Start" type="time" value={form.work_start} onChange={(e) => update('work_start', e.target.value)} />
                  <Input label="Work End"   type="time" value={form.work_end}   onChange={(e) => update('work_end',   e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Focus Block (minutes)"
                    type="number"
                    min={25} max={120}
                    value={form.focus_block_minutes}
                    onChange={(e) => update('focus_block_minutes', parseInt(e.target.value))}
                  />
                  <Input
                    label="Break Duration (minutes)"
                    type="number"
                    min={5} max={30}
                    value={form.break_duration_minutes}
                    onChange={(e) => update('break_duration_minutes', parseInt(e.target.value))}
                  />
                </div>
                <Input
                  label="Weekly Hour Goal"
                  type="number"
                  min={10} max={80}
                  value={form.weekly_goal_hours}
                  onChange={(e) => update('weekly_goal_hours', parseInt(e.target.value))}
                />
                <div className="bg-gold-500/5 border border-gold-500/15 rounded-xl p-3 text-xs text-gray-500">
                  💡 APEX uses your work hours to build realistic schedules and avoid overloading your calendar.
                </div>
              </>
            )}

            {activeTab === 'notifications' && (
              <>
                <h2 className="font-display text-lg font-light text-white border-b border-white/[0.05] pb-3">Notifications</h2>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-white">Browser Notifications</p>
                    <p className="text-xs text-gray-500">Alerts for task starts, deadlines, check-ins</p>
                  </div>
                  <button
                    onClick={() => update('notification_enabled', !form.notification_enabled)}
                    className={cn('w-11 h-6 rounded-full transition-all relative', form.notification_enabled ? 'bg-gold-500' : 'bg-white/10')}
                  >
                    <span className={cn('absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform', form.notification_enabled ? 'translate-x-5' : '')} />
                  </button>
                </div>

                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={requestNotificationPermission}>
                    Request Permission
                  </Button>
                  <Button variant="ghost" size="sm" onClick={testNotification}>
                    Test Notification
                  </Button>
                </div>

                <Input
                  label="WhatsApp Number (with country code)"
                  placeholder="+254700000000"
                  value={form.whatsapp_number}
                  onChange={(e) => update('whatsapp_number', e.target.value)}
                />
                <div className="text-xs text-gray-600 bg-white/[0.02] rounded-xl p-3 border border-white/[0.04]">
                  WhatsApp reminders require the WhatsApp Business API integration. See documentation for setup.
                </div>
              </>
            )}

            {activeTab === 'integrations' && (
              <>
                <h2 className="font-display text-lg font-light text-white border-b border-white/[0.05] pb-3">Integrations</h2>
                <Input
                  label="OpenAI API Key"
                  type="password"
                  placeholder="sk-proj-..."
                  value={form.openai_key}
                  onChange={(e) => update('openai_key', e.target.value)}
                />
                <div className="text-xs text-gray-500 leading-relaxed">
                  Your API key is stored in your browser environment. Without it, APEX uses an intelligent rule-based fallback.
                  <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="text-gold-400 hover:underline ml-1">
                    Get your key →
                  </a>
                </div>

                <div className="space-y-2 pt-2">
                  {[
                    { name: 'Google Calendar', desc: 'Sync events and meetings automatically', connected: false },
                    { name: 'Slack',           desc: 'Get task reminders via Slack DM',         connected: false },
                    { name: 'Notion',          desc: 'Push completed tasks to your Notion DB',   connected: false },
                  ].map((integration) => (
                    <div key={integration.name} className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                      <div>
                        <p className="text-sm font-medium text-white">{integration.name}</p>
                        <p className="text-xs text-gray-500">{integration.desc}</p>
                      </div>
                      <Button variant={integration.connected ? 'secondary' : 'ghost'} size="sm">
                        {integration.connected ? 'Disconnect' : 'Connect'}
                      </Button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {activeTab === 'security' && (
              <>
                <h2 className="font-display text-lg font-light text-white border-b border-white/[0.05] pb-3">Security</h2>
                <div className="space-y-3">
                  <div className="p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                    <p className="text-sm font-medium text-white mb-0.5">Password</p>
                    <p className="text-xs text-gray-500 mb-3">Managed via Supabase Auth</p>
                    <Button variant="secondary" size="sm" onClick={async () => {
                      await supabase.auth.resetPasswordForEmail(user?.email ?? '')
                      toast.success('Reset email sent')
                    }}>
                      Send Reset Email
                    </Button>
                  </div>
                  <div className="p-3 bg-red-500/5 border border-red-500/15 rounded-xl">
                    <p className="text-sm font-medium text-white mb-0.5">Delete Account</p>
                    <p className="text-xs text-gray-500 mb-3">Permanently delete all your data. This cannot be undone.</p>
                    <Button variant="danger" size="sm">
                      Delete Account
                    </Button>
                  </div>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    </motion.div>
  )
}
