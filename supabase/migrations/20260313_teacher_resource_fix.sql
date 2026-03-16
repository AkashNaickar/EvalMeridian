-- Phase 16: Teacher Resource Upload & Exam Sessions Integration

-- 1. Add exam_session_id to resources table
ALTER TABLE public.resources
ADD COLUMN IF NOT EXISTS exam_session_id UUID REFERENCES public.exam_sessions(id) ON DELETE CASCADE;

-- 2. Update RLS for exam_sessions to permit teachers
-- (Checking if policy exists first to avoid errors, though CREATE POLICY usually handles it if configured correctly)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'exam_sessions' AND policyname = 'Teachers can read exam_sessions'
    ) THEN
        CREATE POLICY "Teachers can read exam_sessions" 
        ON public.exam_sessions FOR SELECT 
        TO authenticated 
        USING (auth.jwt() ->> 'role' = 'teacher' OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher'));
    END IF;
END
$$;

-- 3. Update RLS for resources to permit teachers
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'resources' AND policyname = 'Teachers can manage resources'
    ) THEN
        CREATE POLICY "Teachers can manage resources" 
        ON public.resources FOR ALL 
        TO authenticated 
        USING (auth.jwt() ->> 'role' = 'teacher' OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher'))
        WITH CHECK (auth.jwt() ->> 'role' = 'teacher' OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher'));
    END IF;
END
$$;

-- 4. Ensure Storage bucket is usable by teachers (if not already via generic policies)
-- The 'eval_documents' bucket policy might already allow authenticated users to upload,
-- but let's ensure it covers teacher role specifically if strictly controlled.
