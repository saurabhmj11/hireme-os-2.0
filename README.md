# Hire Me OS 2.0

## AI-Powered Autonomous 24/7 Job Search Command Center

[![Deploy on Render](https://img.shields.io/badge/Deploy-Render-46E3B7?logo=render&logoColor=white)](https://render.com)
[![Database: Supabase](https://img.shields.io/badge/Database-Supabase-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![Framework: Next.js 16](https://img.shields.io/badge/Framework-Next.js%2016-000?logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**Your AI-powered autonomous job search platform.** Scan portals, evaluate jobs, auto-apply, schedule follow-ups — all running 24/7 on autopilot.

[Getting Started](#getting-started) · [Features](#features) · [Architecture](#architecture) · [Deployment](#deployment) · [Chrome Extension](#chrome-extension)

---

## Overview

Hire Me OS 2.0 is a full-stack, self-hosted job search automation platform that uses AI to handle every step of your job hunt — from scanning job portals and evaluating fit scores, to auto-applying and sending follow-up emails. It runs as a web app you deploy yourself, with an optional Chrome extension for one-click apply on any job site.

The platform operates a **6-block evaluation engine** (Role Summary, CV Match, Level Strategy, Comp Research, Personalization, Interview Prep) with A-F grading and customizable dimension weights. The **Autopilot 24/7** mode runs a server-side scheduler that continuously scans, evaluates, and applies to matching jobs even when your browser is closed.

---

## Features

### Core Pipeline

| Feature | Description |
| ------- | ----------- |
| **Application Tracker** | Full CRUD pipeline with search, filters, status management, and scoring |
| **Kanban Board** | Visual drag-style board with columns: Wishlist → Applied → Screening → Interview → Offer → Rejected |
| **Auto-Pipeline** | Paste a job URL → automatically scrape, evaluate, and add to pipeline |
| **6-Block Evaluation** | Structured A-F grading with dimension scores (Culture Fit, Tech Match, Growth, Compensation, etc.) |
| **Batch Evaluation** | Evaluate multiple JDs at once, separated by `---` |
| **Reports Archive** | Browse, expand, and delete past evaluation reports |

### AI-Powered Tools

| Tool | Description |
| ---- | ----------- |
| **ATS Score Checker** | Analyze resume vs JD for keyword match, section scores, and ATS readiness |
| **Auto-Tailored Resume** | AI rewrites your resume for each specific job posting |
| **Cover Letter Generator** | Generate personalized cover letters with selectable tone |
| **CV Generator** | Generate ATS-optimized, printable CV in one click |
| **AI Assistant** | Multi-mode tool: Contact Letter, Deep Analysis, Training Plan, Project Ideas |
| **Job Scanner** | AI-powered web search across LinkedIn, Indeed, Glassdoor, Wellfound, Naukri |

### Autopilot 24/7

| Feature | Description |
| ------- | ----------- |
| **Server-Side Scheduler** | Runs cycles autonomously — no browser needed |
| **Configurable Scan Interval** | Set scan frequency from 5 minutes to 24 hours |
| **Auto-Evaluate** | Automatically evaluate new job matches against your CV |
| **Auto-Apply** | Automatically apply to jobs meeting your score/grade threshold |
| **Follow-Up Queue** | Auto-generate and schedule follow-up emails |
| **Real-Time SSE Progress** | Watch live cycle progress (Scanning → Evaluating → Applying → Follow-Ups) |
| **Email Notifications** | SMTP-based alerts for auto-applies, new matches, follow-ups, and errors |
| **Cycle History** | Full audit trail with activity charts and error logs |

### UX & Design

| Feature | Description |
| ------- | ----------- |
| **3-Step Onboarding** | Name → Resume → Job Preferences wizard for first-time users |
| **Command Palette** | `Cmd+K` / `Ctrl+K` to navigate anywhere instantly |
| **Dark/Light Theme** | Catppuccin Mocha dark mode with smooth transitions |
| **Responsive Sidebar** | Collapsible sidebar with grouped navigation and tooltips |
| **Notification Bell** | Real-time notification panel with unread count |
| **Getting Started Checklist** | Guided checklist to help new users activate all features |
| **Animated Dashboard** | Metrics with trends, pipeline funnel, activity timeline, weekly stats |
| **Health Check Banner** | Pipeline health monitoring with expandable issue details |

---

## Tech Stack

| Layer | Technology |
| ----- | ---------- |
| **Framework** | Next.js 16 (App Router, Turbopack, Standalone output) |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS 4 + shadcn/ui (Catppuccin Mocha) |
| **State** | Zustand 5 |
| **Database** | PostgreSQL (Supabase) via Prisma 6 ORM |
| **Auth** | Supabase SSR (`@supabase/ssr` + `@supabase/supabase-js`) |
| **Charts** | Recharts 2 |
| **Animations** | Framer Motion 12 |
| **AI** | GLM-4 + Gemini (configurable) |
| **Email** | Nodemailer 7 (SMTP) |
| **Icons** | Lucide React |
| **Deployment** | Render (Node + Docker) |

---

## Architecture

```text
hire-me-os/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Main UI (2750+ lines, all tabs & pages)
│   │   ├── layout.tsx            # Root layout with ThemeProvider + Toaster
│   │   ├── globals.css           # Global styles, Catppuccin Mocha theme
│   │   └── api/
│   │       ├── applications/     # CRUD for job applications
│   │       ├── auto-pipeline/    # Scrape → Evaluate → Add pipeline
│   │       ├── evaluate/         # 6-block evaluation engine
│   │       ├── ats-score/        # ATS resume analysis
│   │       ├── tailor-resume/    # AI resume tailoring
│   │       ├── cover-letter/     # Cover letter generation
│   │       ├── generate-cv/      # ATS-optimized CV generator
│   │       ├── scanner/          # AI job portal scanner
│   │       ├── batch/            # Batch evaluation
│   │       ├── ai-tool/          # Multi-mode AI assistant
│   │       ├── scheduler/        # Autopilot scheduler + SSE stream
│   │       ├── follow-up/        # Follow-up email queue
│   │       ├── notifications/    # Notification system
│   │       ├── stories/          # STAR+R story bank
│   │       ├── reports/          # Evaluation reports archive
│   │       ├── health-check/     # Pipeline health diagnostics
│   │       ├── tools/            # Data tools (dedup, merge, normalize)
│   │       ├── settings/         # User settings (CV, profile, portals)
│   │       ├── weights/          # Scoring dimension weights
│   │       ├── cycle-history/    # Autopilot cycle audit trail
│   │       ├── email-config/     # SMTP configuration
│   │       ├── seed/             # Demo data seeder
│   │       ├── setup/            # DB initialization
│   │       ├── health/           # Lightweight health check
│   │       └── cron/             # Serverless cron trigger
│   ├── components/
│   │   ├── ui/                   # 40+ shadcn/ui components
│   │   ├── tabs/                 # Tab components (Pipeline, Settings, etc.)
│   │   ├── shared/               # Shared components (MetricsCards, etc.)
│   │   └── dashboard/            # Dashboard-specific components
│   ├── lib/
│   │   ├── store.ts              # Zustand store (all app state)
│   │   ├── types.ts              # TypeScript interfaces + constants
│   │   ├── utils.ts              # Utility functions
│   │   ├── db.ts                 # Prisma client singleton
│   │   ├── scheduler-worker.ts   # Background worker scheduler
│   │   └── notify-email.ts       # Email notification sender
│   ├── hooks/                    # React hooks (use-mobile, use-toast)
│   ├── utils/supabase/           # Supabase SSR clients
│   └── middleware.ts             # Auth middleware with graceful fallback
├── prisma/
│   ├── schema.prisma             # Database schema (11 models)
│   └── migrations/               # Migration history
├── chrome-extension/             # Browser extension for one-click apply
├── render.yaml                   # Render deployment blueprint
├── Dockerfile                    # Multi-stage Docker build
├── docker-compose.yml            # Local development with Docker
└── public/
    └── logo.svg                  # App logo
```

### Database Schema (11 Models)

| Model | Purpose |
| ----- | ------- |
| `Application` | Job applications with status, score, URL, location, salary |
| `Setting` | Key-value settings (CV, profile, portals, proofs) |
| `EvaluationReport` | 6-block evaluation results with dimensions |
| `InterviewStory` | STAR+R interview story bank |
| `ScoringWeight` | Customizable dimension weights for evaluation |
| `SchedulerConfig` | Autopilot configuration (interval, auto-apply, notifications) |
| `FollowUp` | Follow-up email queue with status tracking |
| `Notification` | In-app notification system |
| `AutoApplyLog` | Auto-apply audit trail with attempt tracking |
| `CycleHistory` | Autopilot cycle history with metrics |
| `EmailConfig` | SMTP configuration for email sending |

---

## Getting Started

### Prerequisites

- Node.js 24+ (or Bun)
- PostgreSQL database (Supabase recommended)
- Render account (for deployment) or Docker (for self-hosting)

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/hire-me-os-2.0.git
cd hire-me-os-2.0
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the project root:

```env
# Supabase PostgreSQL — Connection Pooler (port 6543) for runtime
DATABASE_URL=postgresql://postgres.REF:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres

# Supabase PostgreSQL — Direct connection (port 5432) for migrations
DIRECT_URL=postgresql://postgres:PASSWORD@db.REF.supabase.co:5432/postgres

# Supabase (optional — for auth features)
NEXT_PUBLIC_SUPABASE_URL=https://REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-key

# Background worker
ENABLE_BACKGROUND_WORKER=true

# Cron secret (auto-generated on Render, or set manually)
CRON_SECRET=your-random-secret

# Public URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> **Important for Supabase:** You MUST use the **Connection Pooler URL** (port 6543) as `DATABASE_URL` for runtime queries, and the **Direct URL** (port 5432) as `DIRECT_URL` for Prisma migrations. This avoids connection refused errors with Supabase's architecture.

### 3. Initialize Database

```bash
npx prisma generate
npx prisma db push
```

Or use the built-in setup endpoint after starting the app:

```bash
curl http://localhost:3000/api/setup
```

### 4. Run Development Server

```bash
npm run dev
```

Open <http://localhost:3000> — the 3-step onboarding wizard will guide you through setting up your name, resume, and job preferences.

---

## Deployment

### Deploy on Render (Recommended)

1. **Fork or push** this repo to GitHub
2. **Create a new Web Service** on [Render](https://render.com) and connect your repo
3. **Set Build Command:** `npm run render-build`
4. **Set Start Command:** `npm run render-start`
5. **Add environment variables** in the Render dashboard (see `.env` template above)
6. Deploy! Render will build and start the app on port 10000

Or use the **render.yaml blueprint** — just connect your repo and Render auto-detects the configuration.

#### Setting Up the Cron Job on Render

Add a **Cron Job** service in Render:

- **Schedule:** `*/30 * * * *` (every 30 minutes, or your preferred interval)
- **Command:** `curl -sf -H "Authorization: Bearer $CRON_SECRET" https://your-app.onrender.com/api/cron`

This triggers the Autopilot scheduler for serverless scheduled execution.

### Deploy with Docker

```bash
# Build
docker build -t hire-me-os .

# Run
docker run -p 10000:10000 --env-file .env hire-me-os
```

The Dockerfile uses a multi-stage build with standalone output for minimal image size. It includes a health check on `/api/health`.

### Deploy on Vercel

```bash
npm i -g vercel
vercel
```

Note: The Autopilot background worker requires a persistent server. For Vercel, use the `/api/cron` endpoint with Vercel Cron Jobs instead.

---

## Chrome Extension

The included Chrome extension enables one-click apply and AI tools directly on job sites.

### Install

1. Open Chrome → `chrome://extensions/`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** → select the `chrome-extension/` folder
4. Click the extension icon → enter your app URL (e.g., `https://hireme-os-2-0.onrender.com`)
5. Click **Connect to App**

### Extension Features

- **Auto-Fill:** Detects job application forms and fills name, email, phone from your CV
- **Tailor CV:** Extracts the job description and opens the AI resume tailor
- **ATS Score:** Checks ATS compatibility of your resume vs the job posting
- **Cover Letter:** Generates a personalized cover letter for the job
- **Right-click menu:** Auto-fill and ATS check from context menu on job pages

### Supported Sites

- LinkedIn Jobs
- Indeed
- Glassdoor
- Wellfound (AngelList)
- Naukri

---

## API Reference

### Applications

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| `GET` | `/api/applications` | List all applications with metrics |
| `POST` | `/api/applications/create` | Create a new application |
| `PATCH` | `/api/applications/[number]` | Update application status |

### AI Tools

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| `POST` | `/api/evaluate` | 6-block evaluation from JD text |
| `POST` | `/api/auto-pipeline` | Scrape URL → Evaluate → Add to pipeline |
| `POST` | `/api/ats-score` | ATS score check (resume vs JD) |
| `POST` | `/api/tailor-resume` | AI-tailored resume for a specific job |
| `POST` | `/api/cover-letter` | Generate cover letter |
| `POST` | `/api/generate-cv` | Generate ATS-optimized CV HTML |
| `POST` | `/api/scan` | AI-powered job portal scanner |
| `POST` | `/api/batch` | Batch evaluate multiple JDs |
| `POST` | `/api/ai-tool` | Multi-mode AI assistant |

### Autopilot

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| `GET` | `/api/scheduler` | Get scheduler config + current progress |
| `PUT` | `/api/scheduler` | Update config or toggle enable/disable |
| `POST` | `/api/scheduler` | Trigger a manual cycle |
| `GET` | `/api/scheduler/stream` | SSE stream for real-time progress |
| `GET` | `/api/cycle-history` | Cycle history with metrics |
| `GET` | `/api/follow-up` | List follow-up queue |
| `POST` | `/api/follow-up` | Generate a follow-up email |
| `PATCH` | `/api/follow-up` | Mark follow-up as sent |
| `GET` | `/api/auto-apply` | Auto-apply logs |
| `GET` | `/api/notifications` | List notifications |
| `PATCH` | `/api/notifications` | Mark notifications as read |

### Configuration

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| `GET` | `/api/settings` | Get all settings (CV, profile, portals, proofs) |
| `POST` | `/api/settings` | Save settings |
| `GET` | `/api/weights` | Get scoring dimension weights |
| `PUT` | `/api/weights` | Update scoring weights |
| `GET` | `/api/email-config` | Get SMTP configuration |
| `PUT` | `/api/email-config` | Update SMTP + test connection |

### Data & Reports

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| `GET` | `/api/reports` | List evaluation reports |
| `DELETE` | `/api/reports/[id]` | Delete a report |
| `GET` | `/api/stories` | List interview stories |
| `POST` | `/api/stories` | Add a STAR+R story |
| `DELETE` | `/api/stories/[id]` | Delete a story |
| `POST` | `/api/tools/[tool]` | Run data tools (dedup, merge, normalize) |

### System

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| `GET` | `/api/health` | Lightweight health check |
| `GET` | `/api/health-check` | Pipeline health diagnostics |
| `GET` | `/api/setup` | Initialize database tables + seed defaults |
| `POST` | `/api/seed` | Seed demo applications |
| `GET` | `/api/cron` | Serverless cron trigger (requires `CRON_SECRET`) |

---

## Evaluation Engine

The 6-block evaluation system produces structured reports with:

### Blocks

1. **Role Summary** — Key responsibilities, team context, reporting structure
2. **CV Match Analysis** — How well your skills/experience align with the role
3. **Level Strategy** — Career level assessment and growth trajectory
4. **Comp Research** — Market-rate salary intelligence and negotiation range
5. **Personalization Notes** — Custom talking points and differentiators
6. **Interview Prep (STAR+R)** — Auto-generated STAR stories with reflection

### Scoring Dimensions (Customizable Weights)

| Dimension | Default Weight | Description |
| --------- | -------------- | ----------- |
| Technical Match | 15% | Skill alignment with JD requirements |
| Culture Fit | 12% | Values and work-style alignment |
| Compensation | 12% | Salary competitiveness and equity |
| Location Fit | 10% | Geography, remote policy, commute |
| Growth Potential | 10% | Career advancement opportunity |
| Product Impact | 10% | Influence on product outcomes |
| Learning Opportunity | 8% | New skills and technologies |
| Team Quality | 8% | Team caliber and mentorship |
| Work-Life Balance | 8% | Flexibility, hours, culture |
| Company Stability | 7% | Funding, market position, runway |

### Grade Scale

| Grade | Score Range | Color |
| ----- | ----------- | ----- |
| **A** | 4.5 – 5.0 | Emerald |
| **B** | 3.5 – 4.4 | Teal |
| **C** | 2.5 – 3.4 | Amber |
| **D** | 1.5 – 2.4 | Orange |
| **F** | 0.0 – 1.4 | Red |

---

## Autopilot 24/7 Deep Dive

### How It Works

1. **Scheduler** runs on the server (not in-browser) using a persistent Node.js worker
2. Each **cycle** goes through: Scan Portals → Evaluate Matches → Auto-Apply → Schedule Follow-Ups
3. Progress is streamed to the client via **Server-Sent Events (SSE)** at `/api/scheduler/stream`
4. Cycles can be triggered **manually** or **automatically** on a configurable interval
5. The `/api/cron` endpoint enables **serverless scheduled execution** via Render Cron Jobs

### Autopilot Configuration Options

| Setting | Default | Description |
| ------- | ------- | ----------- |
| Scan Interval | 60 min | Time between automatic cycles (min: 5 min) |
| Auto-Evaluate | On | Automatically evaluate new job matches |
| Auto-Apply | Off | Automatically apply to jobs meeting threshold |
| Min Score to Apply | 3.5/5.0 | Minimum score for auto-apply |
| Min Grade to Apply | B | Minimum grade for auto-apply |
| Follow-Up Interval | 7 days | Days before scheduling a follow-up |
| Portals | linkedin, indeed, glassdoor, wellfound | Job portals to scan |
| Search Queries | AI Engineer, ML Engineer, LLM Engineer | Search terms |
| Location Filter | (none) | Remote, city, or region filter |

### Email Notifications

Configure SMTP to receive email alerts for:

- Auto-applied jobs
- New high-scoring matches
- Due follow-ups
- Cycle completion summaries
- Error alerts

Supports instant (per-event) or daily digest delivery modes. Works with Gmail (app passwords), Outlook, SendGrid, and any standard SMTP server.

---

## Keyboard Shortcuts

| Shortcut | Action |
| -------- | ------ |
| `Cmd+K` / `Ctrl+K` | Open Command Palette |
| `Cmd+/` | Toggle sidebar (planned) |

---

## Troubleshooting

### Common Issues

| Issue | Solution |
| ----- | -------- |
| **502 Bad Gateway on Render** | Ensure `HOSTNAME=0.0.0.0` and `output: "standalone"` in next.config.ts |
| **Supabase DB connection refused** | Use Connection Pooler URL (port 6543) as `DATABASE_URL` and Direct URL (port 5432) as `DIRECT_URL` |
| **Middleware crash with missing env vars** | Middleware has graceful fallbacks — ensure `NEXT_PUBLIC_SUPABASE_URL` is set |
| **`prisma db push` fails during build** | Build script makes this non-fatal with `\|\| echo 'skipped'` |
| **TypeError: Cannot read properties of undefined (reading 'filter')** | All array access uses `\|\| []` fallbacks |

---

## License

MIT License — use it, fork it, ship it.

---

Built with Next.js 16 · Prisma · Supabase · Zustand · shadcn/ui · Framer Motion · Render
