-- Phase 15: Production Exam Operations Workflow Schema

-- 1. Create exam_sessions table
CREATE TABLE IF NOT EXISTS public.exam_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    exam_type TEXT,
    academic_year TEXT,
    semester TEXT,
    status TEXT DEFAULT 'Setup' CHECK (status IN ('Setup', 'Ready for Evaluation', 'Evaluation in Progress', 'Completed', 'Archived')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create script_batches table
CREATE TABLE IF NOT EXISTS public.script_batches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    exam_session_id UUID REFERENCES public.exam_sessions(id) ON DELETE CASCADE NOT NULL,
    paper_code TEXT NOT NULL,
    batch_code TEXT NOT NULL,
    uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    total_scripts INTEGER DEFAULT 0,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Uploaded', 'Mapped', 'Ready for Evaluation')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enhance scripts table
-- (evaluator_id already exists in public.scripts)
ALTER TABLE public.scripts
ADD COLUMN IF NOT EXISTS exam_session_id UUID REFERENCES public.exam_sessions(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES public.script_batches(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS anonymous_code TEXT UNIQUE;

-- 4. Enhance students table
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS section TEXT,
ADD COLUMN IF NOT EXISTS semester TEXT;

-- 5. Enable RLS Explicitly on New Tables
ALTER TABLE public.exam_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.script_batches ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for New Tables
-- Admins have full access
CREATE POLICY "Admins have full access to exam_sessions" 
ON public.exam_sessions FOR ALL 
TO authenticated 
USING (auth.jwt() ->> 'role' = 'admin' OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins have full access to script_batches" 
ON public.script_batches FOR ALL 
TO authenticated 
USING (auth.jwt() ->> 'role' = 'admin' OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 7. Add updated_at triggers
CREATE TRIGGER update_exam_sessions_updated_at BEFORE UPDATE ON public.exam_sessions
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_script_batches_updated_at BEFORE UPDATE ON public.script_batches
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
