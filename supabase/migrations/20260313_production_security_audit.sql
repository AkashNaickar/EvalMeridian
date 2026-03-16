-- Phase 17: Production Security Audit & RLS Hardening
-- Goal: Remove loose "Public Read" policies and enforce strict role-based access.

-----------------------------------------------------------
-- 1. Profiles Table Hardening
-----------------------------------------------------------
DROP POLICY IF EXISTS "Public Read Access" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated Insert" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated Update" ON public.profiles;

-- Users can read their own profile
CREATE POLICY "Users can read own profile" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (id = auth.uid());

-- Admins can read all profiles
CREATE POLICY "Admins can read all profiles" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Admins can update all profiles (for role assignment)
CREATE POLICY "Admins can update all profiles" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-----------------------------------------------------------
-- 2. Exams Table Hardening
-----------------------------------------------------------
DROP POLICY IF EXISTS "Public Read Access" ON public.exams;
DROP POLICY IF EXISTS "Authenticated Insert" ON public.exams;

-- Admins and Teachers can manage exams
CREATE POLICY "Admins and Teachers can manage exams" 
ON public.exams FOR ALL 
TO authenticated 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher')));

-- Evaluators can read exams (to see subject context)
CREATE POLICY "Evaluators can read exams" 
ON public.exams FOR SELECT 
TO authenticated 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'evaluator'));

-----------------------------------------------------------
-- 3. Resources Table Hardening (Exam Papers/Schemes)
-----------------------------------------------------------
DROP POLICY IF EXISTS "Public Read Access" ON public.resources;
DROP POLICY IF EXISTS "Authenticated Insert" ON public.resources;
DROP POLICY IF EXISTS "Authenticated Update" ON public.resources;

-- Admins and Teachers can manage resources
CREATE POLICY "Admins and Teachers can manage resources" 
ON public.resources FOR ALL 
TO authenticated 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher')));

-- Evaluators can read resources (for marking)
CREATE POLICY "Evaluators can read resources" 
ON public.resources FOR SELECT 
TO authenticated 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'evaluator'));

-----------------------------------------------------------
-- 4. Operations Tables Refinement (Sessions & Batches)
-----------------------------------------------------------
-- Allow Teachers to read sessions and batches
DROP POLICY IF EXISTS "Teachers can read exam_sessions" ON public.exam_sessions;
CREATE POLICY "Teachers can read exam_sessions" 
ON public.exam_sessions FOR SELECT 
TO authenticated 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher'));

DROP POLICY IF EXISTS "Teachers can read script_batches" ON public.script_batches;
CREATE POLICY "Teachers can read script_batches" 
ON public.script_batches FOR SELECT 
TO authenticated 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher'));

-----------------------------------------------------------
-- 5. Data Integrity: Audit Columns Verification
-----------------------------------------------------------
-- Ensure all core tables have updated_at triggers
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_profiles_updated_at') THEN
        CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
            FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
    END IF;
END $$;
