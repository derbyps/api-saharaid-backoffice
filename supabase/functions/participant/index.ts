import { requireAccessTokenSubject } from "../_shared/auth.ts";
import { optionsResponse, response } from "../_shared/response.ts";
import { supabase } from "../_shared/supabase.ts";

type ParticipantPayload = {
  name: string;
  identity_number: string;
  gender: string;
  phone_number: string;
  email: string;
  date_of_birth: string;
  religion: string;
  address: string;
  job_position: string;
  job_company: string;
  education: string;
  cr_number: string;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function validateParticipantPayload(payload: unknown): ParticipantPayload | string {
  if (!payload || typeof payload !== "object") {
    return "Request body must be a JSON object";
  }

  const participant = payload as Record<string, unknown>;

  return {
    name: String(participant.name).trim(),
    identity_number: String(participant.identity_number).trim(),
    gender: String(participant.gender).trim(),
    phone_number: String(participant.phone_number).trim(),
    email: String(participant.email).trim().toLowerCase(),
    date_of_birth: String(participant.date_of_birth),
    religion: String(participant.religion).trim(),
    address: String(participant.address).trim(),
    job_position: String(participant.job_position).trim(),
    job_company: String(participant.job_company).trim(),
    education: String(participant.education).trim(),
    cr_number: String(participant.cr_number).trim(),
    tax_number: String(participant.tax_number).trim(),
  };
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

        const { data: participant, error } = await supabase
          .from("participants")
          .select("*")
          .eq("id", idParam)
          .eq("is_deleted", false)
          .maybeSingle();

        if (error) {
          return response(500, { error: error.message }, "DATABASE_ERROR");
        }

        if (!participant) {
          return response(404, { error: "Participant not found" }, "NOT_FOUND");
        }

        return response(200, { participant });
      }

      const { data: participants, error } = await supabase
        .from("participants")
        .select("*")
        .eq("is_deleted", false)
        .order("created_at", { ascending: true });

      if (error) {
        return response(500, { error: error.message }, "DATABASE_ERROR");
      }

      return response(200, {
        participants: (participants ?? []).map((participant, index) => ({
          index: index + 1,
          ...participant,
        })),
      });
    }

    if (req.method === "POST") {
      const payload = validateParticipantPayload(await req.json());

      if (typeof payload === "string") {
        return response(400, { error: payload }, "INVALID_REQUEST");
      }

      const { data: participant, error } = await supabase
        .from("participants")
        .insert({
          ...payload,
          created_by: accessTokenSubject,
          created_at: new Date().toISOString(),
        })
        .select("*")
        .single();

      if (error) {
        const status = error.code === "23505" ? 409 : 500;
        const errCode = error.code === "23505" ? "PARTICIPANT_ALREADY_EXISTS" : "DATABASE_ERROR";
        return response(status, { error: error.message }, errCode);
      }

      return response(201, { participant });
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

      const { data: participant, error } = await supabase
        .from("participants")
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

      if (!participant) {
        return response(404, { error: "Participant not found" }, "NOT_FOUND");
      }

      return response(200, { participant });
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

      const payload = validateParticipantPayload(await req.json());

      if (typeof payload === "string") {
        return response(400, { error: payload }, "INVALID_REQUEST");
      }

      const { data: participant, error } = await supabase
        .from("participants")
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

      if (!participant) {
        return response(404, { error: "Participant not found" }, "NOT_FOUND");
      }

      return response(200, { participant });
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
