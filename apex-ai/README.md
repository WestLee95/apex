# ⚡ APEX — Executive AI Assistant

> *"Dangerous with time."*

A startup-grade, AI-powered personal executive assistant built with **Vite + React + TypeScript + Tailwind CSS v4 + Supabase**. APEX functions like a real Chief of Staff — learning your workflow, building optimised schedules, tracking productivity, and keeping you ruthlessly on track.

> 🤖 **Built with [Claude Sonnet 4.6](https://www.anthropic.com/) by Anthropic** — the AI pair programmer behind the architecture, logic, and every last semicolon that refused to cooperate.

---

## 🧠 What It Does

| Feature | Description |
|---|---|
| **Smart Daily Planner** | Builds an optimised schedule from your task list using priority scores, energy levels, and deadline proximity |
| **Natural Language Tasks** | Add tasks like *"Call John at 3pm for 30 minutes"* — APEX parses time, duration, category, and priority |
| **Focus Timer** | Pomodoro-style deep work sessions with live progress tracking |
| **AI Chat Assistant** | GPT-4o powered chief of staff — plans your day, defers tasks, detects overload, explains patterns |
| **Productivity Analytics** | 7-day trends, category distribution, estimation accuracy, completion rates, achievement badges |
| **Push Notifications** | Browser and PWA push alerts — task starts, deadlines, midday check-ins, EOD review |
| **Kanban + List Board** | Drag-and-drop task reordering with board or list view, multi-filter |
| **PWA Installable** | Works offline, installable on iOS/Android/desktop, home screen shortcuts |

---

## 🏗️ Architecture

```
src/
├── app/              → Router, QueryClient, Auth guard
├── components/
│   ├── ui/           → Button, Card, Badge, Input, Modal, Spinner, ProgressRing
│   ├── layout/       → Sidebar, Layout wrapper
│   └── widgets/      → TaskCard, FocusTimer, AddTaskModal
├── features/
│   ├── tasks/        → taskService (Supabase CRUD + priority scoring)
│   ├── schedule/     → scheduleEngine (AI planning algorithm)
│   └── notifications/→ notificationService (Web Push + SW)
├── hooks/            → useTasks, useSchedule, useFocusTimer, useProductivity
├── lib/              → Supabase client, auth helpers, realtime subscriptions
├── pages/            → Dashboard, TodayPlanner, Tasks, Analytics, AssistantChat, Settings, Auth
├── services/         → aiService (OpenAI GPT-4o + rule-based fallback)
├── store/            → Zustand global state with persistence
├── types/            → Full TypeScript domain types
├── utils/            → cn(), formatters, priority engine, NL parser, score helpers
└── styles/           → global.css (Tailwind v4 + custom scrollbar + animations)
```

---

## 🚀 Quick Start

### 1. Clone and install

```bash
git clone https://github.com/your-username/apex-ai.git
cd apex-ai
npm install
```

### 2. Set up Supabase

1. Go to [supabase.com](https://supabase.com) → Create new project
2. In **SQL Editor**, paste and run the full contents of `supabase/schema.sql`
3. In **Authentication → Providers**, enable **Email** and optionally **Google**
4. In **Authentication → URL Configuration**, set:
   - Site URL: `http://localhost:5173` (dev) or your production URL
   - Redirect URLs: `http://localhost:5173/auth/callback`

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:
```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_OPENAI_API_KEY=sk-proj-...   # Optional — app works without it
```

Your Supabase URL and anon key are in: **Project Settings → API**

### 4. Run

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## 🗄️ Database Schema

Five core tables, all with Row Level Security:

| Table | Purpose |
|---|---|
| `users` | Profile, timezone, all preferences (JSONB) |
| `tasks` | Full task model — priority score, energy level, recurring rules |
| `schedules` | Daily generated plan stored as JSONB blocks |
| `productivity_logs` | Per-session focus tracking, interruption count |
| `notifications` | Sent alerts with open-rate tracking |

Two convenience views:
- `today_tasks` — Active tasks due or scheduled today
- `overdue_tasks` — All tasks past their due date

---

## 🔐 Google Authentication

APEX supports sign-in via Google OAuth through Supabase.

> ⚠️ **Important — Whitelisted users only**
>
> Until the Google OAuth app is verified and published, sign-in is restricted to explicitly approved test accounts. Any Google account **not** on the whitelist will receive a `403: access_denied` error.
>
> **To add a test user:**
> 1. Go to [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services → OAuth consent screen**
> 2. Scroll to **Test users → + Add Users**
> 3. Add the Gmail address you intend to sign in with
> 4. Save

Once your app is verified by Google, this restriction is lifted and any Google account may sign in freely.

---

## 🤖 AI Assistant

APEX uses **GPT-4o** with a dynamic system prompt that includes:
- Your current task list (title, priority, category, duration)
- Work hours and preferences
- Current time and date context

**Without an OpenAI key**, the app falls back to an intelligent rule-based engine that handles the most common commands:
- *"What should I do next?"* → Returns highest priority pending task
- *"Plan my day"* → Triggers schedule regeneration
- *"Am I overloaded?"* → Calculates total pending minutes vs. available hours
- *"Defer low priority tasks"* → Moves all low-priority items to deferred status

---

## 📲 PWA & Notifications

### Enable push notifications
1. Open Settings → Notifications
2. Click **Request Permission**
3. Allow when prompted by browser

### Install as app (mobile)
- **iOS Safari**: Share → Add to Home Screen
- **Android Chrome**: Menu → Install App
- **Desktop Chrome**: Address bar → Install icon

### Daily notification schedule
APEX auto-schedules:
- **Morning kickoff** — at your `work_start` time
- **Midday check-in** — at 12:00
- **End of day review** — 1 hour before `work_end`
- **Task reminders** — 5 minutes before each scheduled task

---

## 🚢 Deployment

### Vercel (Recommended)
```bash
npm i -g vercel
vercel --prod
```
Set environment variables in Vercel Dashboard → Project → Settings → Environment Variables.

`vercel.json` is already configured with SPA rewrites, security headers, and asset caching.

### Netlify
```bash
npm run build
# Drag dist/ folder to Netlify dashboard
# Or: netlify deploy --prod --dir=dist
```
`netlify.toml` is already configured.

### Railway / Render
```bash
npm run build
# Serve the dist/ folder as a static site
# Set ROOT_DIR to dist/
```

---

## 🔐 Security

- **Supabase RLS** — every table has row-level security; users can only access their own data
- **No secrets client-side** — Supabase anon key is safe to expose (RLS enforces all access control)
- **OpenAI key** — stored in environment variables, never committed
- **Auth flows** — Supabase handles JWT refresh, session persistence, and OAuth callbacks
- **Input validation** — Zod schemas available in `src/utils` for extending form validation

---

## 📈 Priority Scoring Engine

Tasks are scored 0–100 using a weighted algorithm:

| Signal | Max Points |
|---|---|
| Priority label (critical/high/medium/low) | 40 |
| Due date proximity (today → far future) | 30 |
| Category weight (deep_work → other) | 15 |
| Overdue penalty | +15 |

This score determines task ordering in the daily planner, the "Up Next" recommendation, and the Kanban board default sort.

---

## 🗺️ Upgrade Roadmap

### Phase 2
- [ ] Google Calendar two-way sync (via Google APIs)
- [ ] WhatsApp reminders via Twilio / WhatsApp Business API
- [ ] Voice task input (Web Speech API)
- [ ] Habit tracker module

### Phase 3
- [ ] AI learns your actual completion patterns via `productivity_logs`
- [ ] Team delegation board (multi-user)
- [ ] Meeting planner with attendee scheduling
- [ ] Finance reminders and budget tracking
- [ ] Mobile native app (React Native / Expo)

### Phase 4
- [ ] Supabase Edge Functions for server-side scheduled push notifications
- [ ] LangChain agent for multi-step planning workflows
- [ ] Offline-first with IndexedDB sync
- [ ] Executive reporting PDF export

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vite 5, React 18, TypeScript, Tailwind CSS v4 |
| UI Animations | Framer Motion |
| Drag & Drop | @dnd-kit |
| Charts | Recharts |
| State | Zustand + TanStack Query |
| Backend | Supabase (PostgreSQL + Auth + Realtime) |
| AI | OpenAI GPT-4o (optional) |
| AI Development | Claude Sonnet 4.6 by Anthropic |
| PWA | vite-plugin-pwa + Workbox |
| Notifications | Web Push API + Service Workers |
| Deployment | Vercel / Netlify |

---

## 📜 Licence

MIT — build with it, ship with it, and for the love of productivity, use it.

---

*Built to make you dangerously efficient with time.*