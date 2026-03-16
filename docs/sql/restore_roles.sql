-- SCRIPT TO RESTORE CORE ROLES
-- Run this in your Supabase SQL Editor if your admin or teacher accounts got converted to evaluators

DO $$
BEGIN
    -- 1. Restore Admin Role
    UPDATE public.profiles 
    SET role = 'admin', name = 'Admin User'
    WHERE email = 'admin@test.com';

    -- 2. Restore Teacher Role
    UPDATE public.profiles 
    SET role = 'teacher', name = 'Teacher User'
    WHERE email = 'teacher@test.com';

    -- 3. Ensure Evaluator Role (for the default evaluator account)
    UPDATE public.profiles 
    SET role = 'evaluator', name = 'Default Evaluator'
    WHERE email = 'evaluator@test.com';

    -- NOTE: Their passwords are all currently 'password123' 
    -- because the previous repair script reset all '%@test.com' emails.
END $$;
