import { NextResponse } from "next/server";

import { requireCloudUser } from "@/lib/cloud-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await requireCloudUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  return NextResponse.json({ user }, { status: 200 });
}
