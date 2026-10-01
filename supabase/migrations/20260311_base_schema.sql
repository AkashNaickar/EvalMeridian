-- Base schema for EvalMeridian.
--
-- The Phase 11-17 migrations (20260312-20260313) alter `profiles`, `exams`,
-- `scripts` and `resources`, but never create them. This migration recreates
-- that core schema so a fresh Supabase project can apply the full migration
-- set in filename order and a clean checkout can be provisioned end to end.
--
-- Column set is derived from the queries and inserts used by the application;
-- later migrations layer mapping, operations and auth extensions on top.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Shared updated_at trigger helper used by several later migrations.
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- profiles: app-side account metadata, keyed by the Supabase auth user id.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'evaluator' CHECK (role IN ('admin', 'teacher', 'evaluator')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- exams: examination definitions.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.exams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT,
  date DATE,
  status TEXT DEFAULT 'Upcoming' CHECK (status IN ('Upcoming', 'In Progress', 'Completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- resources: question papers and marking schemes, either per exam or per
-- operations session (exam_session_id is added in a later migration).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.resources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
  question_paper_url TEXT,
  marking_scheme_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- scripts: individual answer scripts and their evaluation state.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scripts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
  evaluator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  file_url TEXT,
  file_path TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'evaluated', 'flagged_ufm', 'draft')),
  question_marks JSONB DEFAULT '{}'::jsonb,
  total_marks INTEGER DEFAULT 0,
  comments TEXT,
  annotations JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_exams_updated_at ON public.exams;
CREATE TRIGGER update_exams_updated_at
  BEFORE UPDATE ON public.exams
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_resources_updated_at ON public.resources;
CREATE TRIGGER update_resources_updated_at
  BEFORE UPDATE ON public.resources
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_scripts_updated_at ON public.scripts;
CREATE TRIGGER update_scripts_updated_at
  BEFORE UPDATE ON public.scripts
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Row Level Security. Policies are intentionally added by the later hardening
-- migrations; enable RLS here so nothing is exposed before they run.
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Realtime: the monitoring and reconciliation panels subscribe to changes on
-- the scripts table.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'scripts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.scripts;
  END IF;
END
$$;
