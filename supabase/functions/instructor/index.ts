import { requireAccessTokenSubject } from "../_shared/auth.ts";
import { optionsResponse, response } from "../_shared/response.ts";
import { supabase } from "../_shared/supabase.ts";

type InstructorPayload = {
  name: string;
  email: string;
  phone_number: string;
  course_theme_id: string;
  specialization: string;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function validateInstructorPayload(payload: unknown): InstructorPayload | string {
  if (!payload || typeof payload !== "object") {
    return "Request body must be a JSON object";
  }

  const instructor = payload as Record<string, unknown>;
  const normalized = {
    name: String(instructor.name).trim(),
    email: String(instructor.email).trim().toLowerCase(),
    phone_number: String(instructor.phone_number).trim(),
    course_theme_id: String(instructor.course_theme_id).trim(),
    specialization: String(instructor.specialization).trim(),
  };

  if (
    !normalized.name ||
    !normalized.email ||
    !normalized.phone_number ||
    !normalized.course_theme_id ||
    !normalized.specialization
  ) {
    return "name, email, phone_number, course_theme_id, and specialization are required";
  }

  if (!isUuid(normalized.course_theme_id)) {
    return "course_theme_id must be a UUID";
  }

  return normalized;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return optionsResponse(req);
  }

  if (req.method !== "POST") {
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

    const payload = validateInstructorPayload(await req.json());

    if (typeof payload === "string") {
      return response(400, { error: payload }, "INVALID_REQUEST", req);
    }

    const { data: courseTheme, error: courseThemeError } = await supabase
      .from("course_theme")
      .select("id")
      .eq("id", payload.course_theme_id)
      .maybeSingle();

    if (courseThemeError) {
      return response(500, { error: courseThemeError.message }, "DATABASE_ERROR", req);
    }

    if (!courseTheme) {
      return response(400, { error: "course_theme_id is invalid" }, "INVALID_REQUEST", req);
    }

    const { data: instructor, error } = await supabase
      .from("instructor")
      .insert(payload)
      .select("id, name, email, phone_number, course_theme_id, specialization")
      .single();

    if (error) {
      return response(500, { error: error.message }, "DATABASE_ERROR", req);
    }

    return response(201, { instructor }, undefined, req);
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
