import { SignJWT, jwtVerify } from "jose";

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

async function signToken(
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
  return signToken({ sub: userId, email, type: "access" }, ACCESS_TOKEN_TTL_SECONDS);
}

export function signRefreshToken(
  userId: string,
  email: string,
): Promise<string> {
  return signToken({ sub: userId, email, type: "refresh" }, REFRESH_TOKEN_TTL_SECONDS);
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