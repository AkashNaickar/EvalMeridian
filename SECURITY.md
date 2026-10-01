# Security Policy

## Supported versions

Only the latest commit on `main` is supported. There are no tagged releases yet.

## Reporting a vulnerability

Please do **not** open a public GitHub issue for security vulnerabilities.

Report privately via [GitHub Security Advisories](https://github.com/Akash-Naickar/EvalMeridian/security/advisories/new) ("Report a vulnerability"). Include a description, reproduction steps, and affected routes/components if known.

You can expect an initial response within 7 days.

## Scope

- The Next.js application in this repository (routes, middleware, client code)
- Supabase schema, RLS policies, and storage bucket configuration in `supabase/migrations/`

Out of scope: the Supabase/Vercel platforms themselves — report those to the respective vendors.

## Notes for deployments

- Never commit real credentials. `.env.example` documents the required variables.
- All data access is governed by Supabase Row Level Security; changes to RLS policies should be reviewed with the same care as application code.
