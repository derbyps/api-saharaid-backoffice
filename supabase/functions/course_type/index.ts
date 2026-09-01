import { requireAccessTokenSubject } from "../_shared/auth.ts";
import { optionsResponse, response } from "../_shared/response.ts";
import { supabase } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return optionsResponse(req);
  }

  if (req.method !== "GET") {
    return response(
      405,
      { error: "Method not allowed" },
      "METHOD_NOT_ALLOWED",
      req,
    );
  }

  try {
    const accessTokenSubject = await requireAccessTokenSubject(req);
    if (accessTokenSubject instanceof Response) {
      return accessTokenSubject;
    }

    const { data: courseTypes, error } = await supabase
      .from("course_type")
      .select("id, name, code")
      .order("name", { ascending: true });

    if (error) {
      return response(500, { error: error.message }, "DATABASE_ERROR", req);
    }

    return response(200, { courseTypes }, undefined, req);
  } catch (err) {
    return response(
      500,
      {
        error: err instanceof Error ? err.message : "Internal server error",
      },
      "INTERNAL_SERVER_ERROR",
      req,
    );
  }
});
