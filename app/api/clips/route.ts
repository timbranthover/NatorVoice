import { NextResponse } from "next/server";

import { requireCloudUser } from "@/lib/cloud-session";
import { getCloudClips, upsertCloudClip } from "@/lib/cloud-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ClipBody = {
  text?: unknown;
  voiceId?: unknown;
  voiceName?: unknown;
  chars?: unknown;
};

export async function GET(request: Request) {
  const user = await requireCloudUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const clips = await getCloudClips(user.id);
  return NextResponse.json({ clips }, { status: 200 });
}

export async function POST(request: Request) {
  const user = await requireCloudUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: ClipBody;
  try {
    body = (await request.json()) as ClipBody;
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  const voiceId = typeof body.voiceId === "string" ? body.voiceId.trim() : "";
  const voiceName = typeof body.voiceName === "string" ? body.voiceName.trim() : "";
  const chars = typeof body.chars === "number" ? body.chars : NaN;

  if (!text || !voiceId || !voiceName || !Number.isFinite(chars)) {
    return NextResponse.json(
      { error: "text, voiceId, voiceName, and chars are required." },
      { status: 400 },
    );
  }

  await upsertCloudClip(user.id, {
    text: text.slice(0, 1200),
    voiceId: voiceId.slice(0, 120),
    voiceName: voiceName.slice(0, 120),
    chars: Math.max(0, Math.min(1200, Math.floor(chars))),
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}
