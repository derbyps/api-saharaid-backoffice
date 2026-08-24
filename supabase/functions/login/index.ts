import { optionsResponse, response } from "../_shared/response.ts";
import { supabase } from "../_shared/supabase.ts";
import { hashPassword } from "../_shared/crypto.ts";
import { signAccessToken, signRefreshToken } from "../_shared/auth.ts";

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
    const { email, password } = await req.json();

    if (!email || !password) {
      return response(
        400,
        { error: "email, password are required" },
        "INVALID_REQUEST",
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    const { data: user, error } = await supabase
      .from("users")
      .select("id, name, email, password_hash, salt")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (error) {
      return response(
        500,
        { error: error.message },
        "DATABASE_ERROR",
      );
    }

    // Don't reveal whether the email exists
    const passwordHash = user
      ? await hashPassword(password, user.salt)
      : null;

    if (!user || passwordHash !== user.password_hash) {
      return response(
        401,
        { error: "Invalid email or password" },
        "INVALID_CREDENTIALS",
      );
    }

    const [token, refreshToken] = await Promise.all([
      signAccessToken(user.id, user.email),
      signRefreshToken(user.id, user.email),
    ]);

    return response(200, {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      token,
      refreshToken,
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