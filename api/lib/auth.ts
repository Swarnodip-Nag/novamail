import * as jose from "jose";
import * as cookie from "cookie";
import { env } from "./env";
import { getSessionCookieOptions } from "./cookies";
import { Session } from "@contracts/constants";
import { Errors } from "@contracts/errors";
import { findUserById } from "../queries/users";

export type SessionPayload = {
  userId: number;
};

const JWT_ALG = "HS256";

function getSecret() {
  return new TextEncoder().encode(env.sessionSecret);
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new jose.SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt()
    .setExpirationTime("1 year")
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jose.jwtVerify(token, getSecret(), {
      algorithms: [JWT_ALG],
    });
    const userId = payload.userId as number;
    if (!userId) return null;
    return { userId };
  } catch {
    return null;
  }
}

export async function authenticateRequest(headers: Headers) {
  const cookies = cookie.parse(headers.get("cookie") || "");
  const token = cookies[Session.cookieName];
  if (!token) {
    throw Errors.forbidden("No session found. Please log in.");
  }
  const claim = await verifySessionToken(token);
  if (!claim) {
    throw Errors.forbidden("Invalid session. Please log in again.");
  }
  const user = await findUserById(claim.userId);
  if (!user) {
    throw Errors.forbidden("User not found. Please log in again.");
  }
  return user;
}

export function makeSessionCookie(c: { req: { raw: Request }; header: (name: string, value: string) => void }, token: string) {
  const cookieOpts = getSessionCookieOptions(c.req.raw.headers);
  const serialized = cookie.serialize(Session.cookieName, token, {
    ...cookieOpts,
    maxAge: Session.maxAgeMs / 1000,
  });
  c.header("set-cookie", serialized);
}
