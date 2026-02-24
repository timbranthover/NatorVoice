import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ELEVENLABS_BASE_URL =
  process.env.ELEVENLABS_BASE_URL?.replace(/\/$/, "") ?? "https://api.elevenlabs.io";

type TtsProvider = "elevenlabs" | "deepgram";

const DEEPGRAM_VOICE_CATALOG: Array<{
  id: string;
  name: string;
  category: string;
  accent: string | null;
  gender: string | null;
  age: string | null;
  previewUrl: string | null;
}> = [
  {
    id: "aura-2-thalia-en",
    name: "Thalia",
    category: "English",
    accent: "American",
    gender: "feminine",
    age: "Adult",
    previewUrl: null,
  },
  {
    id: "aura-2-andromeda-en",
    name: "Andromeda",
    category: "English",
    accent: "American",
    gender: "feminine",
    age: "Adult",
    previewUrl: null,
  },
  {
    id: "aura-2-helena-en",
    name: "Helena",
    category: "English",
    accent: "American",
    gender: "feminine",
    age: "Adult",
    previewUrl: null,
  },
  {
    id: "aura-2-apollo-en",
    name: "Apollo",
    category: "English",
    accent: "American",
    gender: "masculine",
    age: "Adult",
    previewUrl: null,
  },
  {
    id: "aura-2-arcas-en",
    name: "Arcas",
    category: "English",
    accent: "American",
    gender: "masculine",
    age: "Adult",
    previewUrl: null,
  },
  {
    id: "aura-2-aries-en",
    name: "Aries",
    category: "English",
    accent: "American",
    gender: "masculine",
    age: "Adult",
    previewUrl: null,
  },
  {
    id: "aura-2-asteria-en",
    name: "Asteria",
    category: "English",
    accent: "American",
    gender: "feminine",
    age: "Adult",
    previewUrl: null,
  },
  {
    id: "aura-2-athena-en",
    name: "Athena",
    category: "English",
    accent: "American",
    gender: "feminine",
    age: "Mature",
    previewUrl: null,
  },
  {
    id: "aura-2-draco-en",
    name: "Draco",
    category: "English",
    accent: "British",
    gender: "masculine",
    age: "Adult",
    previewUrl: null,
  },
  {
    id: "aura-2-hyperion-en",
    name: "Hyperion",
    category: "English",
    accent: "Australian",
    gender: "masculine",
    age: "Adult",
    previewUrl: null,
  },
  {
    id: "aura-2-luna-en",
    name: "Luna",
    category: "English",
    accent: "American",
    gender: "feminine",
    age: "Young Adult",
    previewUrl: null,
  },
  {
    id: "aura-2-orion-en",
    name: "Orion",
    category: "English",
    accent: "American",
    gender: "masculine",
    age: "Adult",
    previewUrl: null,
  },
  {
    id: "aura-2-pandora-en",
    name: "Pandora",
    category: "English",
    accent: "British",
    gender: "feminine",
    age: "Adult",
    previewUrl: null,
  },
  {
    id: "aura-2-zeus-en",
    name: "Zeus",
    category: "English",
    accent: "American",
    gender: "masculine",
    age: "Adult",
    previewUrl: null,
  },
  {
    id: "aura-2-celeste-es",
    name: "Celeste",
    category: "Spanish",
    accent: "Colombian",
    gender: "feminine",
    age: "Young Adult",
    previewUrl: null,
  },
  {
    id: "aura-2-estrella-es",
    name: "Estrella",
    category: "Spanish",
    accent: "Mexican",
    gender: "feminine",
    age: "Mature",
    previewUrl: null,
  },
  {
    id: "aura-2-nestor-es",
    name: "Nestor",
    category: "Spanish",
    accent: "Peninsular",
    gender: "masculine",
    age: "Adult",
    previewUrl: null,
  },
  {
    id: "aura-2-javier-es",
    name: "Javier",
    category: "Spanish",
    accent: "Mexican",
    gender: "masculine",
    age: "Adult",
    previewUrl: null,
  },
  {
    id: "aura-2-rhea-nl",
    name: "Rhea",
    category: "Dutch",
    accent: "Dutch",
    gender: "feminine",
    age: "Adult",
    previewUrl: null,
  },
  {
    id: "aura-2-sander-nl",
    name: "Sander",
    category: "Dutch",
    accent: "Dutch",
    gender: "masculine",
    age: "Adult",
    previewUrl: null,
  },
  {
    id: "aura-2-agathe-fr",
    name: "Agathe",
    category: "French",
    accent: "French",
    gender: "feminine",
    age: "Adult",
    previewUrl: null,
  },
  {
    id: "aura-2-hector-fr",
    name: "Hector",
    category: "French",
    accent: "French",
    gender: "masculine",
    age: "Adult",
    previewUrl: null,
  },
  {
    id: "aura-2-julius-de",
    name: "Julius",
    category: "German",
    accent: "German",
    gender: "masculine",
    age: "Adult",
    previewUrl: null,
  },
  {
    id: "aura-2-viktoria-de",
    name: "Viktoria",
    category: "German",
    accent: "German",
    gender: "feminine",
    age: "Adult",
    previewUrl: null,
  },
  {
    id: "aura-2-livia-it",
    name: "Livia",
    category: "Italian",
    accent: "Italian",
    gender: "feminine",
    age: "Adult",
    previewUrl: null,
  },
  {
    id: "aura-2-dionisio-it",
    name: "Dionisio",
    category: "Italian",
    accent: "Italian",
    gender: "masculine",
    age: "Adult",
    previewUrl: null,
  },
  {
    id: "aura-2-fujin-ja",
    name: "Fujin",
    category: "Japanese",
    accent: "Japanese",
    gender: "masculine",
    age: "Adult",
    previewUrl: null,
  },
  {
    id: "aura-2-izanami-ja",
    name: "Izanami",
    category: "Japanese",
    accent: "Japanese",
    gender: "feminine",
    age: "Adult",
    previewUrl: null,
  },
];

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

function normalizeProvider(value: string | undefined): TtsProvider | null {
  const candidate = value?.trim().toLowerCase();
  if (candidate === "elevenlabs" || candidate === "deepgram") {
    return candidate;
  }

  return null;
}

function resolveProvider() {
  const hasDeepgram = Boolean(process.env.DEEPGRAM_API_KEY?.trim());
  const hasElevenLabs = Boolean(process.env.ELEVENLABS_API_KEY?.trim());
  const configured = normalizeProvider(process.env.TTS_PROVIDER);

  if (configured === "deepgram") {
    if (hasDeepgram) {
      return "deepgram";
    }

    return hasElevenLabs ? "elevenlabs" : "deepgram";
  }

  if (configured === "elevenlabs") {
    if (hasElevenLabs) {
      return "elevenlabs";
    }

    return hasDeepgram ? "deepgram" : "elevenlabs";
  }

  if (hasDeepgram) {
    return "deepgram";
  }

  return "elevenlabs";
}

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
  const provider = resolveProvider();

  if (provider === "deepgram") {
    if (!process.env.DEEPGRAM_API_KEY) {
      return NextResponse.json(
        { error: "Server is missing DEEPGRAM_API_KEY." },
        { status: 500 },
      );
    }

    const voices = [...DEEPGRAM_VOICE_CATALOG].sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json(
      {
        provider,
        capabilities: {
          modelSelection: false,
          voiceSettings: false,
        },
        voices,
      },
      { status: 200 },
    );
  }

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

      return NextResponse.json(
        {
          provider,
          capabilities: {
            modelSelection: true,
            voiceSettings: true,
          },
          voices,
        },
        { status: 200 },
      );
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
