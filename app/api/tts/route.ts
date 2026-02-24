import { NextResponse } from "next/server";

import { requireCloudUser } from "@/lib/cloud-session";
import { getCloudUsageWithLimit, incrementCloudUsage } from "@/lib/cloud-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TtsProvider = "elevenlabs" | "deepgram";

const ELEVENLABS_BASE_URL =
  process.env.ELEVENLABS_BASE_URL?.replace(/\/$/, "") ?? "https://api.elevenlabs.io";
const DEEPGRAM_BASE_URL =
  process.env.DEEPGRAM_BASE_URL?.replace(/\/$/, "") ?? "https://api.deepgram.com";
const DEFAULT_ELEVENLABS_MODEL_ID = process.env.ELEVENLABS_MODEL_ID ?? "eleven_multilingual_v2";
const MAX_TEXT_LENGTH = 1200;
const DEFAULT_DAILY_LIMIT = 5500;

type TtsBody = {
  text?: unknown;
  voiceId?: unknown;
  modelId?: unknown;
  voiceSettings?: unknown;
};

type VoiceSettingsInput = {
  stability?: unknown;
  similarityBoost?: unknown;
  style?: unknown;
  speed?: unknown;
  useSpeakerBoost?: unknown;
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

function parseProviderMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const map = payload as Record<string, unknown>;

  if (typeof map.error === "string" && map.error.trim().length > 0) {
    return map.error;
  }

  if (typeof map.message === "string" && map.message.trim().length > 0) {
    return map.message;
  }

  if (map.detail && typeof map.detail === "object") {
    const detail = map.detail as Record<string, unknown>;
    if (typeof detail.message === "string" && detail.message.trim().length > 0) {
      return detail.message;
    }
  }

  if (typeof map.detail === "string" && map.detail.trim().length > 0) {
    return map.detail;
  }

  return null;
}

function normalizeClientError(provider: TtsProvider, status: number, upstreamMessage: string | null) {
  if (provider === "deepgram") {
    if (status === 401 || status === 403) {
      return {
        status: 401,
        message:
          upstreamMessage || "Deepgram authentication failed. Check DEEPGRAM_API_KEY and retry.",
      };
    }

    if (status === 429) {
      return { status: 429, message: "Deepgram rate limit reached. Try again shortly." };
    }

    if (status >= 400 && status < 500) {
      return {
        status: 400,
        message:
          upstreamMessage ||
          "Invalid request for speech generation. Adjust text or voice and retry.",
      };
    }

    return {
      status: 502,
      message: "Deepgram could not generate audio right now.",
    };
  }

  if (status === 401 || status === 403) {
    return {
      status: 401,
      message:
        upstreamMessage || "ElevenLabs authentication failed. Check your API key and retry.",
    };
  }

  if (status === 429) {
    return { status: 429, message: "ElevenLabs rate limit reached. Try again shortly." };
  }

  if (status >= 400 && status < 500) {
    return {
      status: 400,
      message:
        upstreamMessage ||
        "Invalid request for speech generation. Adjust text or voice and retry.",
    };
  }

  return { status: 502, message: "ElevenLabs could not generate audio right now." };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function parseVoiceSettings(raw: unknown) {
  const input = raw && typeof raw === "object" ? (raw as VoiceSettingsInput) : {};

  const stability =
    typeof input.stability === "number" && Number.isFinite(input.stability)
      ? clamp(input.stability, 0, 1)
      : 0.45;

  const similarityBoost =
    typeof input.similarityBoost === "number" && Number.isFinite(input.similarityBoost)
      ? clamp(input.similarityBoost, 0, 1)
      : 0.75;

  const style =
    typeof input.style === "number" && Number.isFinite(input.style)
      ? clamp(input.style, 0, 1)
      : 0.25;

  const speed =
    typeof input.speed === "number" && Number.isFinite(input.speed)
      ? clamp(input.speed, 0.7, 1.2)
      : 1;

  const useSpeakerBoost =
    typeof input.useSpeakerBoost === "boolean" ? input.useSpeakerBoost : true;

  return {
    stability,
    similarity_boost: similarityBoost,
    style,
    speed,
    use_speaker_boost: useSpeakerBoost,
  };
}

function currentDayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getDailyLimit() {
  const parsed = Number(process.env.DAILY_CHAR_LIMIT ?? DEFAULT_DAILY_LIMIT);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : DEFAULT_DAILY_LIMIT;
}

async function requestElevenLabs(
  apiKey: string,
  text: string,
  voiceId: string,
  modelId: string,
  voiceSettings: ReturnType<typeof parseVoiceSettings>,
) {
  const endpoint = `${ELEVENLABS_BASE_URL}/v1/text-to-speech/${encodeURIComponent(
    voiceId,
  )}?output_format=mp3_44100_128`;

  return fetch(endpoint, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: voiceSettings,
    }),
    cache: "no-store",
  });
}

async function requestDeepgram(apiKey: string, text: string, voiceId: string) {
  const endpoint = new URL(`${DEEPGRAM_BASE_URL}/v1/speak`);
  endpoint.searchParams.set("model", voiceId);
  endpoint.searchParams.set("encoding", "mp3");
  endpoint.searchParams.set("sample_rate", "44100");

  return fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({ text }),
    cache: "no-store",
  });
}

export async function POST(request: Request) {
  const provider = resolveProvider();
  const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
  const deepgramApiKey = process.env.DEEPGRAM_API_KEY;

  if (provider === "elevenlabs" && !elevenLabsApiKey) {
    return NextResponse.json(
      { error: "Server is missing ELEVENLABS_API_KEY." },
      { status: 500 },
    );
  }

  if (provider === "deepgram" && !deepgramApiKey) {
    return NextResponse.json(
      { error: "Server is missing DEEPGRAM_API_KEY." },
      { status: 500 },
    );
  }

  let payload: TtsBody;
  try {
    payload = (await request.json()) as TtsBody;
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const text = typeof payload.text === "string" ? payload.text.trim() : "";
  const voiceId = typeof payload.voiceId === "string" ? payload.voiceId.trim() : "";
  const modelId =
    typeof payload.modelId === "string" && payload.modelId.trim().length > 0
      ? payload.modelId.trim()
      : DEFAULT_ELEVENLABS_MODEL_ID;
  const voiceSettings = parseVoiceSettings(payload.voiceSettings);

  if (!text) {
    return NextResponse.json({ error: "Text is required." }, { status: 400 });
  }

  if (text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json(
      { error: `Text must be ${MAX_TEXT_LENGTH} characters or fewer.` },
      { status: 400 },
    );
  }

  if (!voiceId) {
    return NextResponse.json({ error: "Voice selection is required." }, { status: 400 });
  }

  const cloudUser = await requireCloudUser(request);
  const dailyLimit = getDailyLimit();
  const day = currentDayKey();

  let usageBefore = 0;
  if (cloudUser) {
    const usage = await getCloudUsageWithLimit(cloudUser.id, dailyLimit, day);
    usageBefore = usage.used;

    if (usage.used + text.length > dailyLimit) {
      return NextResponse.json(
        {
          error: `Daily character limit reached (${usage.used}/${dailyLimit}). Try again tomorrow.`,
        },
        { status: 429 },
      );
    }
  }

  let upstream: Response;
  try {
    upstream =
      provider === "deepgram"
        ? await requestDeepgram(deepgramApiKey as string, text, voiceId)
        : await requestElevenLabs(
            elevenLabsApiKey as string,
            text,
            voiceId,
            modelId,
            voiceSettings,
          );
  } catch {
    return NextResponse.json(
      {
        error:
          provider === "deepgram"
            ? "Network issue while reaching Deepgram. Try again."
            : "Network issue while reaching ElevenLabs. Try again.",
      },
      { status: 502 },
    );
  }

  if (!upstream.ok) {
    const upstreamPayload = (await upstream.json().catch(() => null)) as unknown;
    const upstreamMessage = parseProviderMessage(upstreamPayload);
    const { status, message } = normalizeClientError(provider, upstream.status, upstreamMessage);
    return NextResponse.json({ error: message }, { status });
  }

  let audioBuffer: ArrayBuffer;
  try {
    audioBuffer = await upstream.arrayBuffer();
  } catch {
    return NextResponse.json(
      {
        error:
          provider === "deepgram"
            ? "Deepgram returned an unreadable audio response."
            : "ElevenLabs returned an unreadable audio response.",
      },
      { status: 502 },
    );
  }

  if (!audioBuffer.byteLength) {
    return NextResponse.json(
      {
        error:
          provider === "deepgram"
            ? "Deepgram returned empty audio for this request."
            : "ElevenLabs returned empty audio for this request.",
      },
      { status: 502 },
    );
  }

  const now = new Date();
  const filename = `voice-clip-${now.toISOString().replaceAll(":", "-")}.mp3`;

  let usageAfter = usageBefore;
  if (cloudUser) {
    usageAfter = await incrementCloudUsage(cloudUser.id, day, text.length);
  }

  return new NextResponse(audioBuffer, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "audio/mpeg",
      "Content-Length": String(audioBuffer.byteLength),
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="${filename}"`,
      ...(cloudUser
        ? {
            "X-Usage-Used": String(usageAfter),
            "X-Usage-Limit": String(dailyLimit),
          }
        : {}),
    },
  });
}
