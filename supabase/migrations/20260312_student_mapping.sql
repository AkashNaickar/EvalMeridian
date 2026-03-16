-- Phase 11: Production Student Mapping & Anonymization

-- 1. Create Students Table
CREATE TABLE IF NOT EXISTS public.students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  roll_number TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  stream TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Modify Scripts Table
ALTER TABLE public.scripts
ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS roll_number TEXT,
ADD COLUMN IF NOT EXISTS mapping_status TEXT DEFAULT 'unmapped' CHECK (mapping_status IN ('unmapped', 'mapped', 'ambiguous', 'manually_mapped', 'mapping_error')),
ADD COLUMN IF NOT EXISTS mapped_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS mapped_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS mapping_source TEXT;

-- 3. Indexes for Lookup & Join Performance
CREATE INDEX IF NOT EXISTS idx_students_roll_number ON public.students(roll_number);
CREATE INDEX IF NOT EXISTS idx_scripts_student_id ON public.scripts(student_id);
CREATE INDEX IF NOT EXISTS idx_scripts_roll_number ON public.scripts(roll_number);

-- 4. RLS Configuration for Students
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage students" ON public.students;
CREATE POLICY "Admins can manage students" ON public.students
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- 5. Tightening Scripts RLS (Defense in Depth against Evaluators accessing identity)
DROP POLICY IF EXISTS "Public Read Access" ON public.scripts;
DROP POLICY IF EXISTS "Authenticated Insert" ON public.scripts;
DROP POLICY IF EXISTS "Authenticated Update" ON public.scripts;
DROP POLICY IF EXISTS "Evaluators can read assigned scripts" ON public.scripts;
DROP POLICY IF EXISTS "Evaluators can update assigned scripts" ON public.scripts;
DROP POLICY IF EXISTS "Admins and teachers can insert scripts" ON public.scripts;

-- Admins: FULL ACCESS
CREATE POLICY "Admins can manage all scripts" ON public.scripts
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Teachers: READ & INSERT (Assumes teachers might assign scripts depending on business logic)
CREATE POLICY "Teachers can read all scripts" ON public.scripts
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher'));

CREATE POLICY "Teachers can insert scripts" ON public.scripts
  FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher'));

-- Evaluators: READ & UPDATE ONLY ASSIGNED (No access to students table by default due to its RLS)
CREATE POLICY "Evaluators can read assigned scripts" ON public.scripts
  FOR SELECT
  USING (
    evaluator_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
  );

CREATE POLICY "Evaluators can update assigned scripts" ON public.scripts
  FOR UPDATE
  USING (
    evaluator_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
  );
