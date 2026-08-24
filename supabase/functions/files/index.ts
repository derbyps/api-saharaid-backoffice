import { verifyToken } from "../_shared/auth.ts";
import { optionsResponse, response } from "../_shared/response.ts";
import {
  createPresignedDownloadUrl,
  createPresignedUploadUrl,
} from "../_shared/r2.ts";

const UPLOAD_URL_TTL_SECONDS = 15 * 60;
const DOWNLOAD_URL_TTL_SECONDS = 60 * 60;

function sanitizeFilename(filename: string): string {
  const cleaned = filename
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/^_+|_+$/g, "");
  return cleaned.length > 0 ? cleaned.slice(0, 100) : "file";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return optionsResponse();
  }

  if (req.method !== "POST") {
    return response(
      405,
      { error: "Method not allowed" },
      "METHOD_NOT_ALLOWED",
    );
  }

  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return response(401, { error: "Missing access token" }, "UNAUTHORIZED");
  }

  try {
    await verifyToken(token, "access");
  } catch {
    return response(
      401,
      { error: "Invalid or expired token" },
      "UNAUTHORIZED",
    );
  }

  const action = new URL(req.url).pathname.split("/").filter(Boolean).pop();

  try {
    if (action === "presign-upload") {
      const { filename, contentType } = await req.json();

      if (typeof filename !== "string" || filename.trim() === "") {
        return response(
          400,
          { error: "filename is required" },
          "INVALID_REQUEST",
        );
      }

      const key = `uploads/${crypto.randomUUID()}-${
        sanitizeFilename(filename)
      }`;
      const uploadUrl = await createPresignedUploadUrl(key, contentType);

      return response(200, {
        key,
        uploadUrl,
        expiresIn: UPLOAD_URL_TTL_SECONDS,
      });
    }

    if (action === "presign-download") {
      const { key } = await req.json();

      if (typeof key !== "string" || key.trim() === "") {
        return response(
          400,
          { error: "key is required" },
          "INVALID_REQUEST",
        );
      }

      const downloadUrl = await createPresignedDownloadUrl(key);

      return response(200, {
        downloadUrl,
        expiresIn: DOWNLOAD_URL_TTL_SECONDS,
      });
    }

    return response(
      404,
      { error: "Unknown action, use presign-upload or presign-download" },
      "NOT_FOUND",
    );
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

// Set 4 env secrets in Supabase: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET (create token: R2 → Manage R2 API Tokens, "Object Read & Write").
