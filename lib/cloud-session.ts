import { createHmac } from "node:crypto";

import { getCloudUserById } from "@/lib/cloud-store";

type SessionPayload = {
  sub: string;
  email: string;
  exp: number;
  iat: number;
};

const DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function getSessionSecret() {
  return process.env.CLOUD_SYNC_JWT_SECRET || "dev-local-session-secret-change-me";
}

function sign(payload: string) {
  return createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");
}

export function createCloudSessionToken(user: { id: string; email: string }) {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    sub: user.id,
    email: user.email,
    iat: now,
    exp: now + DEFAULT_SESSION_TTL_SECONDS,
  };

  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(`${header}.${encodedPayload}`);

  return `${header}.${encodedPayload}.${signature}`;
}

export async function verifyCloudSessionToken(token: string) {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  const [header, encodedPayload, signature] = parts;
  const expected = sign(`${header}.${encodedPayload}`);
  if (expected !== signature) {
    return null;
  }

  let payload: SessionPayload;
  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload)) as SessionPayload;
  } catch {
    return null;
  }

  if (payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  const user = await getCloudUserById(payload.sub);
  return user;
}

export async function requireCloudUser(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    return null;
  }

  return verifyCloudSessionToken(token);
}
