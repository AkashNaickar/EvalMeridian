-- SCRIPT FIX: ALLOWING NEW STATUSES
-- Run this in your Supabase SQL Editor if "UFM" or "Draft" crashing the viewer

-- 1. Remove the strict constraint if it exists (some older schema versions had this)
ALTER TABLE public.scripts DROP CONSTRAINT IF EXISTS scripts_status_check;

-- 2. Safely add a new constraint that includes our new statuses
ALTER TABLE public.scripts 
ADD CONSTRAINT scripts_status_check 
CHECK (status IN ('pending', 'evaluated', 'flagged_ufm', 'draft'));

-- 3. Notify the API to reload the schema
NOTIFY pgrst, 'reload schema';
