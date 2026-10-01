import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

/**
 * Browser Supabase client backed by cookies instead of localStorage so the
 * session is visible to server components and middleware (see src/middleware.ts).
 *
 * Placeholder fallbacks keep static prerendering/builds from crashing when
 * env vars are absent (e.g. CI); auth calls will simply fail at runtime.
 */
export const supabase = createBrowserClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key"
);
