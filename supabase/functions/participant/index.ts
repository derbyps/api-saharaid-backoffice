import { verifyToken } from "../_shared/auth.ts";
import { optionsResponse, response } from "../_shared/response.ts";
import { supabase } from "../_shared/supabase.ts";

type ParticipantPayload = {
  id: number;
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
  passport_photo: string;
  identity_card: string;
  tax_number: string;
  curiculum_vitae: string;
  employment_certificate: string;
  medical_certificate: string;
  integrity_pact: string;
  degree_certificate: string;
};

const requiredFields: Array<keyof ParticipantPayload> = [
  "id",
  "name",
  "identity_number",
  "gender",
  "phone_number",
  "email",
  "date_of_birth",
  "religion",
  "address",
  "job_position",
  "job_company",
  "education",
  "cr_number",
  "passport_photo",
  "identity_card",
  "tax_number",
  "curiculum_vitae",
  "employment_certificate",
  "medical_certificate",
  "integrity_pact",
  "degree_certificate",
];

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function validateParticipantPayload(payload: unknown): ParticipantPayload | string {
  if (!payload || typeof payload !== "object") {
    return "Request body must be a JSON object";
  }

  const participant = payload as Record<string, unknown>;

  if (!Number.isInteger(participant.id)) {
    return "id must be an integer";
  }

  return {
    id: participant.id as number,
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
    passport_photo: String(participant.passport_photo).trim(),
    identity_card: String(participant.identity_card).trim(),
    tax_number: String(participant.tax_number).trim(),
    curiculum_vitae: String(participant.curiculum_vitae).trim(),
    employment_certificate: String(participant.employment_certificate).trim(),
    medical_certificate: String(participant.medical_certificate).trim(),
    integrity_pact: String(participant.integrity_pact).trim(),
    degree_certificate: String(participant.degree_certificate).trim(),
  };
}

async function getAccessTokenSubject(req: Request): Promise<string | Response> {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return response(401, { error: "Missing access token" }, "UNAUTHORIZED");
  }

  try {
    const claims = await verifyToken(token, "access");
    return claims.sub;
  } catch {
    return response(
      401,
      { error: "Invalid or expired token" },
      "UNAUTHORIZED",
    );
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return optionsResponse();
  }

  try {
    if (req.method === "GET") {
      const url = new URL(req.url);
      const idParam = url.searchParams.get("id");

      if (idParam) {
        const id = Number(idParam);

        if (!Number.isInteger(id)) {
          return response(400, { error: "id must be an integer" }, "INVALID_REQUEST");
        }

        const { data: participant, error } = await supabase
          .from("participants")
          .select("*")
          .eq("id", id)
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
        .order("id", { ascending: true });

      if (error) {
        return response(500, { error: error.message }, "DATABASE_ERROR");
      }

      return response(200, { participants });
    }

    if (req.method === "POST") {
      const createdBy = await getAccessTokenSubject(req);
      if (createdBy instanceof Response) {
        return createdBy;
      }

      const payload = validateParticipantPayload(await req.json());

      if (typeof payload === "string") {
        return response(400, { error: payload }, "INVALID_REQUEST");
      }

      const { data: participant, error } = await supabase
        .from("participants")
        .insert({
          ...payload,
          created_by: createdBy,
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
      const deletedBy = await getAccessTokenSubject(req);
      if (deletedBy instanceof Response) {
        return deletedBy;
      }

      const url = new URL(req.url);
      const idParam = url.searchParams.get("id");

      if (!idParam) {
        return response(400, { error: "id is required" }, "INVALID_REQUEST");
      }

      const id = Number(idParam);
      if (!Number.isInteger(id)) {
        return response(400, { error: "id must be an integer" }, "INVALID_REQUEST");
      }

      const { data: participant, error } = await supabase
        .from("participants")
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: deletedBy,
        })
        .eq("id", id)
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
      const updatedBy = await getAccessTokenSubject(req);
      if (updatedBy instanceof Response) {
        return updatedBy;
      }

      const url = new URL(req.url);
      const idParam = url.searchParams.get("id");

      if (!idParam) {
        return response(400, { error: "id is required" }, "INVALID_REQUEST");
      }

      const id = Number(idParam);
      if (!Number.isInteger(id)) {
        return response(400, { error: "id must be an integer" }, "INVALID_REQUEST");
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
          updated_by: updatedBy,
        })
        .eq("id", id)
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
