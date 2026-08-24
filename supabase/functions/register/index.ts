import { optionsResponse, response } from "../_shared/response.ts";
import { supabase } from "../_shared/supabase.ts";
import { generateSalt, hashPassword } from "../_shared/crypto.ts";

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

  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return response(
        400,
        { error: "name, email, password are required" },
        "INVALID_REQUEST",
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if email already exists
    const { data: existingUser, error: existingUserError } = await supabase
      .from("users")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existingUserError) {
      return response(
        500,
        { error: existingUserError.message },
        "DATABASE_ERROR",
      );
    }

    if (existingUser) {
      return response(
        409,
        { error: "Email already exists" },
        "EMAIL_ALREADY_EXISTS",
      );
    }

    const salt = generateSalt();
    const passwordHash = await hashPassword(password, salt);

    const { data: user, error } = await supabase
      .from("users")
      .insert({
        name,
        email: normalizedEmail,
        password_hash: passwordHash,
        salt,
      })
      .select("id, name, email")
      .single();

    if (error) {
      return response(
        500,
        { error: error.message },
        "DATABASE_ERROR",
      );
    }

    return response(201, {
      user,
    });
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
