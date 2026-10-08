export const config = {
  appName: "NearDonor",
  defaultRadiusKm: 20,
  maxRadiusKm: 100,
  minRadiusKm: 5,
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
  googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
  expoProjectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? "",
} as const;

/**
 * Whether the Supabase environment is actually configured. When false the app
 * must degrade gracefully (e.g. show a "backend not configured" state)
 * instead of crashing or silently failing.
 */
export function isSupabaseConfigured(): boolean {
  return config.supabaseUrl.length > 0 && config.supabaseAnonKey.length > 0;
}
