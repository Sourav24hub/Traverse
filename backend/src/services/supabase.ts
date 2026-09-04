/**
 * Supabase client — initialized from env vars.
 * Uses the same injectable-factory pattern as gemini.ts so tests can mock it.
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";

/** Factory that returns a Supabase client; replaced in tests with a mock factory */
export let getSupabaseClient: () => SupabaseClient = () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY must be set in environment variables.");
  }
  return createClient(url, key);
};

/** Allow tests to inject a mock Supabase client factory */
export function setSupabaseClientFactory(factory: () => SupabaseClient): void {
  getSupabaseClient = factory;
}
