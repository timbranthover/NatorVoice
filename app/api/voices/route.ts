import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ELEVENLABS_BASE_URL =
  process.env.ELEVENLABS_BASE_URL?.replace(/\/$/, "") ?? "https://api.elevenlabs.io";

type VoiceLike = {
  voice_id?: unknown;
  name?: unknown;
  category?: unknown;
  labels?: unknown;
  preview_url?: unknown;
};

type ClientVoice = {
  id: string;
  name: string;
  category: string;
  accent: string | null;
  gender: string | null;
  age: string | null;
  previewUrl: string | null;
};

function parseVoices(payload: unknown): VoiceLike[] {
  if (Array.isArray(payload)) {
    return payload as VoiceLike[];
  }

  if (payload && typeof payload === "object" && "voices" in payload) {
    const nestedVoices = (payload as { voices?: unknown }).voices;
    return Array.isArray(nestedVoices) ? (nestedVoices as VoiceLike[]) : [];
  }

  return [];
}

function asClientVoice(voice: VoiceLike): ClientVoice | null {
  const id = typeof voice.voice_id === "string" ? voice.voice_id : null;
  const name = typeof voice.name === "string" ? voice.name : null;

  if (!id || !name) {
    return null;
  }

  const labels = voice.labels && typeof voice.labels === "object" ? voice.labels : {};
  const labelMap = labels as Record<string, unknown>;

  return {
    id,
    name,
    category: typeof voice.category === "string" ? voice.category : "general",
    accent: typeof labelMap.accent === "string" ? labelMap.accent : null,
    gender: typeof labelMap.gender === "string" ? labelMap.gender : null,
    age: typeof labelMap.age === "string" ? labelMap.age : null,
    previewUrl: typeof voice.preview_url === "string" ? voice.preview_url : null,
  };
}

async function fetchVoicesFromEndpoint(apiKey: string, path: string) {
  const response = await fetch(`${ELEVENLABS_BASE_URL}${path}`, {
    method: "GET",
    headers: {
      "xi-api-key": apiKey,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  return response;
}

export async function GET() {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Server is missing ELEVENLABS_API_KEY." },
      { status: 500 },
    );
  }

  const candidatePaths = [
    "/v2/voices?page_size=100&include_total_count=false",
    "/v1/voices?show_legacy=true",
    "/v1/voices/search?page_size=100",
  ];
  let lastResponse: Response | null = null;
  let hadNetworkFailure = false;

  for (const path of candidatePaths) {
    let response: Response;
    try {
      response = await fetchVoicesFromEndpoint(apiKey, path);
    } catch {
      hadNetworkFailure = true;
      continue;
    }

    if (response.ok) {
      const payload = (await response.json()) as unknown;
      const voices = parseVoices(payload)
        .map(asClientVoice)
        .filter((voice): voice is ClientVoice => voice !== null)
        .sort((a, b) => a.name.localeCompare(b.name));

      return NextResponse.json({ voices }, { status: 200 });
    }

    if (response.status === 401 || response.status === 403 || response.status === 429) {
      lastResponse = response;
      break;
    }

    lastResponse = response;
  }

  if (lastResponse?.status === 401 || lastResponse?.status === 403) {
    return NextResponse.json(
      { error: "ElevenLabs rejected authentication. Check your API key." },
      { status: 401 },
    );
  }

  if (lastResponse?.status === 429) {
    return NextResponse.json(
      { error: "Rate limited by ElevenLabs. Try again in a moment." },
      { status: 429 },
    );
  }

  if (hadNetworkFailure) {
    return NextResponse.json(
      { error: "Network issue while reaching ElevenLabs. Try again." },
      { status: 502 },
    );
  }

  return NextResponse.json(
    { error: "Unable to load voices from ElevenLabs right now." },
    { status: 502 },
  );
}
