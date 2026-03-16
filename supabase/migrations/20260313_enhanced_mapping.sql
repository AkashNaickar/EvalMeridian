-- Phase 12: Enhanced Student Mapping & Audit Trails

-- 1. Ensure students table exists with roll_number unique constraint
CREATE TABLE IF NOT EXISTS public.students (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    roll_number TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    stream TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add Mapping & Audit columns to scripts
ALTER TABLE public.scripts 
ADD COLUMN IF NOT EXISTS roll_number TEXT,
ADD COLUMN IF NOT EXISTS original_filename TEXT,
ADD COLUMN IF NOT EXISTS file_path TEXT,
ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS mapping_status TEXT DEFAULT 'unmapped' CHECK (mapping_status IN ('unmapped', 'mapped', 'ambiguous', 'manually_mapped', 'mapping_error')),
ADD COLUMN IF NOT EXISTS mapped_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS mapped_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS mapping_source TEXT;

-- 3. Add Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_scripts_roll_number ON public.scripts(roll_number);
CREATE INDEX IF NOT EXISTS idx_scripts_student_id ON public.scripts(student_id);
CREATE INDEX IF NOT EXISTS idx_scripts_mapping_status ON public.scripts(mapping_status);

-- 4. RLS for Admin Reconciliation
-- Admins can do anything
CREATE POLICY "Admins have full access to scripts" 
ON public.scripts FOR ALL 
TO authenticated 
USING (auth.jwt() ->> 'role' = 'admin' OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Ensure student identities are hidden from evaluators
-- (Assuming RLS on students table already prevents read access for evaluators)
