import { NextResponse } from "next/server";

import { requireCloudUser } from "@/lib/cloud-session";
import { getCloudUsageWithLimit } from "@/lib/cloud-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getDailyLimit() {
  const raw = Number(process.env.DAILY_CHAR_LIMIT ?? "5500");
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 5500;
}

export async function GET(request: Request) {
  const user = await requireCloudUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const usage = await getCloudUsageWithLimit(user.id, getDailyLimit(), todayKey());
  return NextResponse.json({ usage }, { status: 200 });
}
