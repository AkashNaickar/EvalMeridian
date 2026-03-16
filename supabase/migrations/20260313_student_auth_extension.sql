-- Phase 17: Student Authentication & Results Visibility Extension

-- 1. Extend the profiles role constraint
-- First, drop the existing constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add the new constraint including 'student'
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'teacher', 'evaluator', 'student'));

-- 2. Link students table to profiles (auth-backed ownership)
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 3. Add release status to scripts
-- We add 'is_released' to explicitly control student visibility
-- This allows admins to release results batch-by-batch
ALTER TABLE public.scripts ADD COLUMN IF NOT EXISTS is_released BOOLEAN DEFAULT FALSE;

-- 4. RLS Policies for Students
-- Ensure students table has RLS enabled
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Students can read only their own master record
DROP POLICY IF EXISTS "Students can view own profile" ON public.students;
CREATE POLICY "Students can view own profile" 
ON public.students FOR SELECT 
TO authenticated 
USING (profile_id = auth.uid());

-- 5. RLS Policies for Scripts (Results)
-- Students can read only their OWN results AND only if they are RELEASED
DROP POLICY IF EXISTS "Students can view own released results" ON public.scripts;
CREATE POLICY "Students can view own released results" 
ON public.scripts FOR SELECT 
TO authenticated 
USING (
    student_id IN (SELECT id FROM public.students WHERE profile_id = auth.uid()) 
    AND is_released = TRUE
);

-- 6. RLS Policies for Profiles
-- Ensure role-based access for students
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (id = auth.uid());
