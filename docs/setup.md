# Local Development Setup

## Prerequisites

- **Node.js** 18.x or later ([Download](https://nodejs.org/))
- **npm** (comes with Node.js)
- A **Supabase** project ([Create one](https://supabase.com/dashboard))

## 1. Clone and Install

```bash
git clone https://github.com/Akash-Naickar/EvalMeridian.git
cd EvalMeridian
npm install
```

## 2. Environment Variables

Copy the template and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

| Variable | Where to Find It |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API → `anon` `public` key |

Both variables are prefixed with `NEXT_PUBLIC_` because the Supabase client runs in the browser. The anon key is safe to expose client-side — it is scoped by Row Level Security policies.

## 3. Database Setup

### Apply Migrations

Run the SQL files in `supabase/migrations/` against your Supabase project's SQL Editor, in filename order:

1. `20260312_student_mapping.sql`
2. `20260313_enhanced_mapping.sql`
3. `20260313_operations_workflow.sql`
4. `20260313_production_security_audit.sql`
5. `20260313_student_auth_extension.sql`
6. `20260313_teacher_resource_fix.sql`

These migrations create the required tables, constraints, RLS policies, and functions.

### Required Tables

After running migrations, your database should have:

- `profiles` — extends Supabase auth with `role`, `name`, `email`
- `exam_sessions` — exam session definitions
- `scripts` — individual answer scripts with evaluation data
- `students` — student master roster
- `resources` — question papers and marking schemes
- `exams` — exam definitions

### Seed Data (Optional)

For local testing, the scripts in `docs/sql/` can help set up test accounts:

- `seed_evaluators.sql` — creates test evaluator accounts (`*@test.com` / `password123`)
- `restore_roles.sql` — resets role assignments if they get changed during testing
- `fix_script_status.sql` — updates the status constraint to include newer statuses

> **Warning:** These scripts are for development only. Do not run them against a production database.

## 4. Supabase Storage

Create a storage bucket named **`eval_documents`** in your Supabase dashboard (Storage → New Bucket).

This bucket stores:
- Uploaded answer script PDFs
- Question paper PDFs
- Marking scheme PDFs

The application uses **signed URLs** (1-hour expiry) to serve these documents to the evaluator canvas.

## 5. Create User Accounts

Users are created through Supabase Auth (Dashboard → Authentication → Users). After creating a user, insert a corresponding row in the `profiles` table with the desired `role`:

```sql
INSERT INTO public.profiles (id, email, name, role)
VALUES ('<user-uuid>', 'user@example.com', 'User Name', 'admin');
```

Valid roles: `admin`, `teacher`, `evaluator`, `student`.

## 6. Run the Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with a configured account.

## Troubleshooting

| Issue | Solution |
|---|---|
| "Invalid login credentials" | Check that the user exists in Supabase Auth AND has a `profiles` row |
| PDF not loading in canvas | Verify the `eval_documents` bucket exists and the file path matches |
| "Database error querying schema" | Run the migration files — the required tables are probably missing |
| Blank page after login | Check browser console for `profiles` query errors — the role might be null |
