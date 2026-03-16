# EvalMeridian

An on-screen evaluation system for academic institutions. Digitizes the physical exam marking workflow — from scanning answer scripts to assigning evaluators to releasing results — into a single web application.

## Why This Exists

University exam evaluation still runs on physical paper bundles, manual assignment registers, and spreadsheet-based tabulation. EvalMeridian replaces that with a browser-based workflow where administrators upload scanned scripts, evaluators mark them on-screen with annotation tools, and students can view released results.

## Features

### Admin Operations
- **Exam session management** — create sessions scoped by academic year, semester, and exam type
- **Roster import** — bulk import student records from CSV
- **Batch script upload** — upload scanned answer scripts (PDFs) in batches, organized by paper code
- **Automated reconciliation** — match uploaded scripts to student records using roll number extraction
- **Manual exception handling** — resolve unmapped or ambiguous scripts
- **Evaluator assignment** — distribute scripts to evaluators and track progress
- **Real-time monitoring** — live dashboard showing evaluation throughput across the session

### Evaluator Canvas
- **PDF viewer with annotations** — view scanned scripts with zoom, pan, and page navigation
- **Marking tools** — tick, cross, circle, underline, freehand pen, and text comment annotations
- **Keyboard shortcuts** — `C` (correct), `X` (incorrect), `V` (cursor), `T` (text), `P` (pen), `M` (focus mode)
- **Split view** — side-by-side display of student script alongside question paper or marking scheme
- **Auto-save** — debounced draft saves every 2 seconds with sync status indicator
- **Question-wise scoring** — input marks per question with running total
- **UFM flagging** — flag scripts for Unfair Means with a separate review queue
- **Auto-advance** — automatically loads the next pending script after submission

### Teacher Dashboard
- Course overview with KPI cards
- Resource management (question papers, marking schemes)
- Assessment result visibility

### Student Portal
- View released evaluation results
- Track evaluation status (pending vs. released)
- Institutional information and verification status

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org/) (App Router, React Compiler) |
| Language | TypeScript |
| Styling | [Tailwind CSS 4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) |
| Backend | [Supabase](https://supabase.com/) (PostgreSQL, Auth, Storage, Realtime) |
| PDF Rendering | [react-pdf](https://github.com/wojtekmaj/react-pdf) + pdfjs-dist |
| CSV Parsing | [PapaParse](https://www.papaparse.com/) |
| Icons | [Lucide React](https://lucide.dev/) |
| Notifications | [Sonner](https://sonner.emilkowal.dev/) |

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/          # Authenticated routes (layout with sidebar)
│   │   ├── admin/            # Admin pages: overview, operations, scripts, students, results
│   │   ├── evaluator/        # Evaluator dashboard + canvas/[id] marking workspace
│   │   ├── teacher/          # Teacher dashboard, resources, results
│   │   └── student/          # Student dashboard + results
│   ├── api/                  # API routes (PDF proxy)
│   ├── login/                # Authentication page
│   └── layout.tsx            # Root layout (AuthProvider, theme, fonts)
├── components/
│   ├── admin/                # Admin-specific: BatchUploadPanel, MappingRunner, etc.
│   ├── dashboard/            # Shared dashboard components: AnnotatablePDFViewer, ResultsTable
│   ├── layout/               # Sidebar, Header, MobileDrawer
│   ├── shared/               # Reusable: DataTable, Breadcrumbs, SessionCard
│   └── ui/                   # shadcn/ui primitives
├── context/                  # AuthContext (session + role), NavContext (sidebar state)
├── types/                    # TypeScript interfaces: operations, roster, student
├── utils/
│   ├── supabase/client.ts    # Supabase client initialization
│   ├── rosterCsv.ts          # CSV parsing and validation for roster import
│   └── studentMapping.ts     # Roll number matching logic
└── lib/
    └── utils.ts              # cn() utility for className merging
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18.x or later
- A [Supabase](https://supabase.com/) project with Auth, Database, and Storage configured

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Akash-Naickar/EvalMeridian.git
   cd EvalMeridian
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` with your Supabase project credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

4. **Set up the database**

   Run the migration files in `supabase/migrations/` against your Supabase project in chronological order. These create the required tables (`profiles`, `exam_sessions`, `scripts`, `students`, `resources`, `exams`) and RLS policies.

5. **Configure Supabase Storage**

   Create a storage bucket named `eval_documents` in your Supabase dashboard. This bucket stores uploaded answer scripts, question papers, and marking schemes.

6. **Start the dev server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

For detailed setup instructions, see [docs/setup.md](docs/setup.md).

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |

## Authentication & Roles

Authentication is handled by Supabase Auth (email/password). On sign-in, the app queries the `profiles` table for the user's `role` field and routes them to the corresponding dashboard:

| Role | Route | Access |
|---|---|---|
| `admin` | `/admin` | Full system — sessions, scripts, assignments, monitoring |
| `evaluator` | `/evaluator` | Assigned scripts, evaluation canvas |
| `teacher` | `/teacher` | Course overview, resource management, results |
| `student` | `/student` | Personal results, evaluation status |

Unauthenticated users are redirected to `/login`. Route protection is handled at the dashboard layout level via `AuthContext`.

## Database

The application uses Supabase PostgreSQL with the following core tables:

- `profiles` — user accounts with role assignment
- `exam_sessions` — exam session metadata (year, semester, type, status)
- `scripts` — individual answer scripts with evaluation state, marks, annotations
- `students` — student master roster
- `resources` — question papers and marking schemes linked to sessions
- `exams` — exam definitions with subject information

Schema migrations are in `supabase/migrations/`. Ad-hoc repair scripts (for development use) are in `docs/sql/`.

## Architecture

See [docs/architecture.md](docs/architecture.md) for detailed diagrams covering auth flow, role-based routing, and the evaluation workflow.

## Current Status

This is an active development project. Known limitations:

- Teacher and Student dashboards have limited dynamic data (some KPI values are static placeholders)
- No middleware-level route protection (auth guarding is client-side)
- No automated test suite
- Admin dashboard KPIs use static demo data
- No pagination on large data tables

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on branch naming, commit conventions, and the pull request process.

## License

License not yet specified. Contact the repository owner for usage terms.
