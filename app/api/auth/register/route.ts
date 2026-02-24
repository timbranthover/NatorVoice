import { NextResponse } from "next/server";

import { createCloudSessionToken } from "@/lib/cloud-session";
import { registerCloudUser } from "@/lib/cloud-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RegisterBody = {
  email?: unknown;
  password?: unknown;
};

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  let body: RegisterBody;
  try {
    body = (await request.json()) as RegisterBody;
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!validateEmail(email)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }

  if (password.length < 8 || password.length > 72) {
    return NextResponse.json({ error: "Password must be 8-72 characters." }, { status: 400 });
  }

  try {
    const user = await registerCloudUser(email, password);
    const token = createCloudSessionToken(user);
    return NextResponse.json({ token, user }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Could not create account right now. Please try again.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
