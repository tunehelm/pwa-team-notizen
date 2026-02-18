import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? "") as string;
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? "") as string;

/** Fehlende ENV sofort erkennen; Auth-Hook zeigt dann klaren Fehler statt zu hängen. */
export const hasValidAuthConfig = Boolean(
  supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith("http")
);

export const supabase = createClient(
  supabaseUrl || "https://invalid.local",
  supabaseAnonKey || "",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
