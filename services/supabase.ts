import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/database.types";
import { config, isSupabaseConfigured } from "../constants/config";

/**
 * Typed Supabase client.
 *
 * If the environment is not configured (missing EXPO_PUBLIC_SUPABASE_URL or
 * EXPO_PUBLIC_SUPABASE_ANON_KEY) we still create a client so the app boots,
 * but all requests will fail. Consumers must check `isSupabaseConfigured()`
 * and render an appropriate state instead of showing raw errors.
 */
export const supabase = createClient<Database>(
  config.supabaseUrl || "https://placeholder.supabase.co",
  config.supabaseAnonKey || "public-anon-placeholder",
);

export { isSupabaseConfigured };
