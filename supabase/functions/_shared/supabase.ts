import { createClient } from "@supabase/supabase-js";

const supabaseUrl = Deno.env.get("PROJECT_URL") ?? Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("PROJECT_SERVICE_ROLE_KEY") ??
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

export const supabase = createClient(
    supabaseUrl!,
    serviceRoleKey!,
);
