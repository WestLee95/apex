import { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { format, subDays } from 'date-fns'
import { TrendingUp, Award, Target, Zap } from 'lucide-react'
import { Card, Badge } from '@/components/ui'
import { useTasks, useProductivity } from '@/hooks'
import { CATEGORY_META, computeDayScore, formatDuration, scoreColor } from '@/utils'

const CHART_COLORS = ['#d4a843', '#818cf8', '#34d399', '#60a5fa', '#f87171', '#a78bfa']

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0d0d1f] border border-white/10 rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-mono">{p.name}: {p.value}</p>
      ))}
    </div>
  )
}

export const Analytics = () => {
  const { tasks } = useTasks()
  const { data: productivity } = useProductivity()

  // ── Derived stats ──────────────────────────────────────────────────────
  const totalCompleted = tasks.filter((t) => t.status === 'completed').length
  const totalTasks     = tasks.length
  const completionRate = totalTasks ? Math.round((totalCompleted / totalTasks) * 100) : 0
  const totalFocus     = tasks
    .filter((t) => t.status === 'completed')
    .reduce((acc, t) => acc + (t.actual_minutes ?? t.estimated_minutes), 0)

  // Category breakdown
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {}
    tasks.filter((t) => t.status === 'completed').forEach((t) => {
      counts[t.category] = (counts[t.category] ?? 0) + 1
    })
    return Object.entries(counts)
      .map(([cat, count]) => ({
        name: CATEGORY_META[cat as keyof typeof CATEGORY_META]?.label ?? cat,
        value: count,
        emoji: CATEGORY_META[cat as keyof typeof CATEGORY_META]?.icon ?? '📌',
      }))
      .sort((a, b) => b.value - a.value)
  }, [tasks])

  // 7-day trend
  const weekTrend = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i)
      const dateStr = format(date, 'yyyy-MM-dd')
      const dayTasks = tasks.filter((t) => t.updated_at?.startsWith(dateStr))
      const done  = dayTasks.filter((t) => t.status === 'completed').length
      const total = dayTasks.length
      return {
        day: format(date, 'EEE'),
        completed: done,
        score: computeDayScore(done, total, done * 30),
        focus: done * 30, // estimate
      }
    })
  }, [tasks])

  // Estimation accuracy
  const estimationData = useMemo(() => {
    const completed = tasks.filter((t) => t.status === 'completed' && t.actual_minutes)
    return completed.slice(-20).map((t) => ({
      name: t.title.slice(0, 20),
      estimated: t.estimated_minutes,
      actual: t.actual_minutes ?? 0,
      variance: Math.round(((t.actual_minutes ?? 0) - t.estimated_minutes) / t.estimated_minutes * 100),
    }))
  }, [tasks])

  const avgVariance = estimationData.length
    ? Math.round(estimationData.reduce((a, b) => a + b.variance, 0) / estimationData.length)
    : 0

  const topCategory = categoryData[0]

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-light text-white">Analytics</h1>
        <p className="text-sm text-gray-600 mt-0.5">Your productivity intelligence dashboard</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Completion Rate', value: `${completionRate}%`, icon: <Target size={16} className="text-gold-400" />, sub: `${totalCompleted}/${totalTasks} tasks` },
          { label: 'Focus Time', value: formatDuration(totalFocus), icon: <Zap size={16} className="text-violet-400" />, sub: 'total recorded' },
          { label: 'Top Category', value: topCategory?.emoji ?? '—', icon: null, sub: topCategory?.name ?? 'N/A' },
          { label: 'Est. Accuracy', value: `${avgVariance > 0 ? '+' : ''}${avgVariance}%`, icon: <TrendingUp size={16} className="text-emerald-400" />, sub: 'time variance' },
        ].map((kpi) => (
          <Card key={kpi.label} className="p-4" hover>
            <div className="flex items-center gap-2 mb-2">
              {kpi.icon}
              <span className="text-xs text-gray-600 uppercase tracking-widest font-mono">{kpi.label}</span>
            </div>
            <p className="text-2xl font-bold font-mono text-white">{kpi.value}</p>
            <p className="text-xs text-gray-600 mt-0.5">{kpi.sub}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 7-Day Productivity Score */}
        <Card className="p-5">
          <h3 className="font-display text-base font-light text-white mb-4">7-Day Productivity</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={weekTrend}>
              <defs>
                <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#d4a843" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#d4a843" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="score" name="Score" stroke="#d4a843" strokeWidth={2} fill="url(#scoreGrad)" />
              <Area type="monotone" dataKey="completed" name="Tasks" stroke="#818cf8" strokeWidth={1.5} fill="none" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Category Distribution */}
        <Card className="p-5">
          <h3 className="font-display text-base font-light text-white mb-4">Work Distribution</h3>
          {categoryData.length > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={3} dataKey="value">
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {categoryData.slice(0, 5).map((item, i) => (
                  <div key={item.name} className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="text-gray-400 truncate">{item.emoji} {item.name}</span>
                    <span className="ml-auto font-mono text-gray-600">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-600 text-center py-8">Complete tasks to see distribution</p>
          )}
        </Card>

        {/* Estimation Accuracy */}
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-base font-light text-white">Time Estimation vs Actual</h3>
            <Badge variant={avgVariance > 20 ? 'red' : avgVariance > 0 ? 'gold' : 'green'}>
              {avgVariance > 0 ? `+${avgVariance}% over` : `${Math.abs(avgVariance)}% under`} estimate
            </Badge>
          </div>
          {estimationData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={estimationData.slice(-10)}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} unit="m" />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="estimated" name="Estimated" fill="#d4a843" opacity={0.6} radius={[4, 4, 0, 0]} />
                <Bar dataKey="actual" name="Actual" fill="#818cf8" opacity={0.8} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-600 text-center py-8">
              Log time on completed tasks to see accuracy trends
            </p>
          )}
        </Card>
      </div>

      {/* Streak & Awards */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Award size={16} className="text-gold-400" />
          <h3 className="font-display text-base font-light text-white">Achievements</h3>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'First Task', earned: totalCompleted >= 1, icon: '🎯' },
            { label: 'Deep Worker', earned: totalFocus >= 120, icon: '🧠' },
            { label: 'Prolific', earned: totalCompleted >= 10, icon: '🚀' },
            { label: 'Consistent', earned: completionRate >= 80, icon: '🏆' },
          ].map((a) => (
            <div key={a.label} className={`text-center p-3 rounded-xl border transition-all ${a.earned ? 'bg-gold-500/5 border-gold-500/20' : 'bg-white/[0.02] border-white/[0.04] opacity-40'}`}>
              <div className="text-2xl mb-1">{a.earned ? a.icon : '🔒'}</div>
              <p className="text-xs text-gray-400">{a.label}</p>
            </div>
          ))}
        </div>
      </Card>
    </motion.div>
  )
}
