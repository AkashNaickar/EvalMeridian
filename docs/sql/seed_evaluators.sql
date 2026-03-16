-- UNIVERSAL REPAIR SCRIPT: Fixes Existing Broken Evaluators
-- Run this in your Supabase SQL Editor to fix "Database querying error" and "Invalid Credential"

-- 1. Enable pgcrypto (Required for passwords)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Repair auth.users and auth.identities
DO $$
DECLARE
    u_rec RECORD;
    new_identity_id UUID;
BEGIN
    -- Loop through all users ending in @test.com
    FOR u_rec IN SELECT id, email FROM auth.users WHERE email LIKE '%@test.com'
    LOOP
        -- A. Fix mandatory Auth columns (Prevent Database Error Querying Schema)
        UPDATE auth.users 
        SET 
            encrypted_password = crypt('password123', gen_salt('bf')), -- Reset to password123
            aud = 'authenticated',
            role = 'authenticated',
            email_confirmed_at = COALESCE(email_confirmed_at, now()),
            last_sign_in_at = COALESCE(last_sign_in_at, now()),
            created_at = COALESCE(created_at, now()),
            updated_at = now(),
            confirmation_token = '',
            recovery_token = '',
            email_change_token_new = '',
            email_change = ''
        WHERE id = u_rec.id;

        -- B. Fix Identities (Prevents Invalid Credential)
        -- Only insert if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = u_rec.id) THEN
            INSERT INTO auth.identities (
                id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
            ) VALUES (
                gen_random_uuid(), 
                u_rec.id, 
                u_rec.id::text, 
                format('{"sub":"%s","email":"%s"}', u_rec.id::text, u_rec.email)::jsonb, 
                'email', 
                now(), 
                now(), 
                now()
            );
        END IF;
    END LOOP;
END $$;

-- 3. Link them to Public Profiles
INSERT INTO public.profiles (id, email, name, role)
SELECT id, email, COALESCE((raw_user_meta_data->>'full_name'), email), 'evaluator'
FROM auth.users
WHERE email LIKE '%@test.com'
ON CONFLICT (id) DO UPDATE 
SET role = 'evaluator',
    email = EXCLUDED.email,
    name = EXCLUDED.name;
