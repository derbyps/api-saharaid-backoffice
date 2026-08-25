import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
    Deno.env.get("PROJECT_URL")!,
    Deno.env.get("PROJECT_SERVICE_ROLE_KEY")!,
);
