import { jwtVerify, SignJWT } from "npm:jose@^6.2.10";
import { response } from "./response.ts";

const ALGORITHM = "HS256";
export const ACCESS_TOKEN_TTL_SECONDS = 60 * 60 * 24; // 1 day
export const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 1 month

export type TokenType = "access" | "refresh";

export interface TokenClaims {
  sub: string;
  email: string;
  type: TokenType;
}

function getSigningKey(): Uint8Array {
  const secret = Deno.env.get("JWT_SIGNING_KEY");
  if (!secret) {
    throw new Error("JWT_SIGNING_KEY env is not set");
  }
  return new TextEncoder().encode(secret);
}

function signToken(
  claims: TokenClaims,
  expiresInSeconds: number,
): Promise<string> {
  return new SignJWT({ email: claims.email, type: claims.type })
    .setProtectedHeader({ alg: ALGORITHM })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + expiresInSeconds)
    .sign(getSigningKey());
}

export function signAccessToken(
  userId: string,
  email: string,
): Promise<string> {
  return signToken(
    { sub: userId, email, type: "access" },
    ACCESS_TOKEN_TTL_SECONDS,
  );
}

export function signRefreshToken(
  userId: string,
  email: string,
): Promise<string> {
  return signToken(
    { sub: userId, email, type: "refresh" },
    REFRESH_TOKEN_TTL_SECONDS,
  );
}

export async function verifyToken(
  token: string,
  expectedType?: TokenType,
): Promise<TokenClaims> {
  const { payload } = await jwtVerify(token, getSigningKey(), {
    algorithms: [ALGORITHM],
  });
  const claims = payload as unknown as TokenClaims;
  if (expectedType && claims.type !== expectedType) {
    throw new Error(`Expected ${expectedType} token`);
  }
  return claims;
}

export function getBearerToken(req: Request): string | null {
  const authHeader = req.headers.get("authorization");
  return authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
}

export async function requireTokenClaims(
  req: Request,
  expectedType: TokenType = "access",
): Promise<TokenClaims | Response> {
  const token = getBearerToken(req);

  if (!token) {
    return response(401, { error: "Missing access token" }, "UNAUTHORIZED", req);
  }

  try {
    return await verifyToken(token, expectedType);
  } catch {
    return response(
      401,
      { error: "Invalid or expired token" },
      "UNAUTHORIZED",
      req,
    );
  }
}

export async function requireAccessTokenSubject(
  req: Request,
): Promise<string | Response> {
  const claims = await requireTokenClaims(req, "access");
  return claims instanceof Response ? claims : claims.sub;
}
