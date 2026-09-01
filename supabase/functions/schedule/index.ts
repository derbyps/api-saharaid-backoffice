import { requireAccessTokenSubject } from "../_shared/auth.ts";
import { optionsResponse, response } from "../_shared/response.ts";
import { supabase } from "../_shared/supabase.ts";

type SchedulePayload = {
  course_id: string;
  start_date: string;
  end_date: string;
  location: string;
  course_mode_id: string;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function isDate(value: string): boolean {
  return DATE_PATTERN.test(value) && !Number.isNaN(Date.parse(value));
}

function validateSchedulePayload(payload: unknown): SchedulePayload | string {
  if (!payload || typeof payload !== "object") {
    return "Request body must be a JSON object";
  }

  const schedule = payload as Record<string, unknown>;
  const normalized = {
    course_id: String(schedule.course_id).trim(),
    start_date: String(schedule.start_date).trim(),
    end_date: String(schedule.end_date).trim(),
    location: String(schedule.location).trim(),
    course_mode_id: String(schedule.course_mode_id).trim(),
  };

  if (!normalized.course_id || !normalized.start_date || !normalized.end_date ||
    !normalized.location || !normalized.course_mode_id) {
    return "course_id, start_date, end_date, location, and course_mode_id are required";
  }

  if (!isUuid(normalized.course_id) || !isUuid(normalized.course_mode_id)) {
    return "course_id and course_mode_id must be UUIDs";
  }

  if (!isDate(normalized.start_date) || !isDate(normalized.end_date)) {
    return "start_date and end_date must use YYYY-MM-DD format";
  }

  if (normalized.end_date < normalized.start_date) {
    return "end_date must be greater than or equal to start_date";
  }

  return normalized;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return optionsResponse(req);
  }

  try {
    const accessTokenSubject = await requireAccessTokenSubject(req);
    if (accessTokenSubject instanceof Response) {
      return accessTokenSubject;
    }

    if (req.method === "GET") {
      const url = new URL(req.url);
      const idParam = url.searchParams.get("id");

      if (idParam) {
        if (!isUuid(idParam)) {
          return response(400, { error: "id must be a UUID" }, "INVALID_REQUEST");
        }

        const { data: schedule, error } = await supabase
          .from("schedule")
          .select("*")
          .eq("id", idParam)
          .eq("is_deleted", false)
          .maybeSingle();

        if (error) {
          return response(500, { error: error.message }, "DATABASE_ERROR");
        }

        if (!schedule) {
          return response(404, { error: "Schedule not found" }, "NOT_FOUND");
        }

        return response(200, { schedule });
      }

      const { data: schedules, error } = await supabase
        .from("schedule")
        .select("*")
        .eq("is_deleted", false)
        .order("start_date", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) {
        return response(500, { error: error.message }, "DATABASE_ERROR");
      }

      return response(200, { schedules: schedules ?? [] });
    }

    if (req.method === "POST") {
      const payload = validateSchedulePayload(await req.json());

      if (typeof payload === "string") {
        return response(400, { error: payload }, "INVALID_REQUEST");
      }

      const { data: schedule, error } = await supabase
        .from("schedule")
        .insert({
          ...payload,
          created_by: accessTokenSubject,
          created_at: new Date().toISOString(),
        })
        .select("*")
        .single();

      if (error) {
        return response(500, { error: error.message }, "DATABASE_ERROR");
      }

      return response(201, { schedule });
    }

    if (req.method === "PUT") {
      const url = new URL(req.url);
      const idParam = url.searchParams.get("id");

      if (!idParam) {
        return response(400, { error: "id is required" }, "INVALID_REQUEST");
      }

      if (!isUuid(idParam)) {
        return response(400, { error: "id must be a UUID" }, "INVALID_REQUEST");
      }

      const payload = validateSchedulePayload(await req.json());

      if (typeof payload === "string") {
        return response(400, { error: payload }, "INVALID_REQUEST");
      }

      const { data: schedule, error } = await supabase
        .from("schedule")
        .update({
          ...payload,
          updated_at: new Date().toISOString(),
          updated_by: accessTokenSubject,
        })
        .eq("id", idParam)
        .eq("is_deleted", false)
        .select("*")
        .maybeSingle();

      if (error) {
        return response(500, { error: error.message }, "DATABASE_ERROR");
      }

      if (!schedule) {
        return response(404, { error: "Schedule not found" }, "NOT_FOUND");
      }

      return response(200, { schedule });
    }

    if (req.method === "DELETE") {
      const url = new URL(req.url);
      const idParam = url.searchParams.get("id");

      if (!idParam) {
        return response(400, { error: "id is required" }, "INVALID_REQUEST");
      }

      if (!isUuid(idParam)) {
        return response(400, { error: "id must be a UUID" }, "INVALID_REQUEST");
      }

      const { data: schedule, error } = await supabase
        .from("schedule")
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: accessTokenSubject,
        })
        .eq("id", idParam)
        .eq("is_deleted", false)
        .select("*")
        .maybeSingle();

      if (error) {
        return response(500, { error: error.message }, "DATABASE_ERROR");
      }

      if (!schedule) {
        return response(404, { error: "Schedule not found" }, "NOT_FOUND");
      }

      return response(200, { schedule });
    }

    return response(405, { error: "Method not allowed" }, "METHOD_NOT_ALLOWED");
  } catch (err) {
    return response(
      500,
      {
        error: err instanceof Error ? err.message : "Internal server error",
      },
      "INTERNAL_SERVER_ERROR",
    );
  }
});
