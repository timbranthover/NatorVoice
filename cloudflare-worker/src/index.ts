
interface KVNamespace {
  get(key: string): Promise<string | null>;
  get<T>(key: string, type: "json"): Promise<T | null>;
  put(key: string, value: string): Promise<void>;
}

export interface Env {
  NATOR_KV: KVNamespace;
  ELEVENLABS_API_KEY?: string;
  DEEPGRAM_API_KEY?: string;
  TTS_PROVIDER?: string;
  ELEVENLABS_BASE_URL?: string;
  DEEPGRAM_BASE_URL?: string;
  ELEVENLABS_MODEL_ID?: string;
  SESSION_SECRET: string;
  DAILY_CHAR_LIMIT?: string;
  ANON_DAILY_CHAR_LIMIT?: string;
  ALLOWED_ORIGIN?: string;
}

type VoiceLike = {
  voice_id?: unknown;
  name?: unknown;
  category?: unknown;
  labels?: unknown;
  preview_url?: unknown;
};

type PublicVoice = {
  id: string;
  name: string;
  category: string;
  accent: string | null;
  gender: string | null;
  age: string | null;
  previewUrl: string | null;
};

type TtsProvider = "elevenlabs" | "deepgram";

type UserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
};

type ClipRecord = {
  id: string;
  text: string;
  voiceId: string;
  voiceName: string;
  chars: number;
  createdAt: string;
};

type TtsBody = {
  text?: unknown;
  voiceId?: unknown;
  modelId?: unknown;
  voiceSettings?: unknown;
};

type VoiceSettingsBody = {
  stability?: unknown;
  similarityBoost?: unknown;
  style?: unknown;
  speed?: unknown;
  useSpeakerBoost?: unknown;
};

const MAX_TEXT_LENGTH = 1200;
const USER_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const PBKDF2_ITERATIONS = 100_000;

const DEEPGRAM_VOICE_CATALOG: PublicVoice[] = [
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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function json(response: unknown, status: number, origin: string) {
  return new Response(JSON.stringify(response), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin),
    },
  });
}

function corsHeaders(origin: string) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

function allowedOrigin(request: Request, env: Env) {
  const configured = env.ALLOWED_ORIGIN?.trim() || "*";
  if (configured === "*") {
    return "*";
  }

  const requestOrigin = request.headers.get("origin") ?? "";
  return requestOrigin === configured ? configured : configured;
}

function parseErrorMessage(payload: unknown) {
  if (payload && typeof payload === "object" && "error" in payload) {
    const candidate = (payload as { error?: unknown }).error;
    if (typeof candidate === "string" && candidate.length > 0) {
      return candidate;
    }
  }

  if (payload && typeof payload === "object" && "message" in payload) {
    const candidate = (payload as { message?: unknown }).message;
    if (typeof candidate === "string" && candidate.length > 0) {
      return candidate;
    }
  }

  if (payload && typeof payload === "object" && "detail" in payload) {
    const detail = (payload as { detail?: unknown }).detail;
    if (detail && typeof detail === "object" && "message" in detail) {
      const message = (detail as { message?: unknown }).message;
      if (typeof message === "string" && message.length > 0) {
        return message;
      }
    }

    if (typeof detail === "string" && detail.length > 0) {
      return detail;
    }
  }

  return "";
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

const BASE64_TABLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function bytesToBase64(bytes: Uint8Array) {
  let output = "";

  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i] ?? 0;
    const b = bytes[i + 1] ?? 0;
    const c = bytes[i + 2] ?? 0;
    const triple = (a << 16) | (b << 8) | c;

    output += BASE64_TABLE[(triple >> 18) & 63];
    output += BASE64_TABLE[(triple >> 12) & 63];
    output += i + 1 < bytes.length ? BASE64_TABLE[(triple >> 6) & 63] : "=";
    output += i + 2 < bytes.length ? BASE64_TABLE[triple & 63] : "=";
  }

  return output;
}

function base64ToBytes(base64: string) {
  const clean = base64.replace(/[^A-Za-z0-9+/=]/g, "");
  const bytes: number[] = [];

  for (let i = 0; i < clean.length; i += 4) {
    const c1 = BASE64_TABLE.indexOf(clean[i] ?? "");
    const c2 = BASE64_TABLE.indexOf(clean[i + 1] ?? "");
    const c3 = clean[i + 2] === "=" ? -1 : BASE64_TABLE.indexOf(clean[i + 2] ?? "");
    const c4 = clean[i + 3] === "=" ? -1 : BASE64_TABLE.indexOf(clean[i + 3] ?? "");

    if (c1 < 0 || c2 < 0 || c3 < -1 || c4 < -1) {
      throw new Error("Invalid base64 input.");
    }

    const triple = (c1 << 18) | (c2 << 12) | ((c3 > -1 ? c3 : 0) << 6) | (c4 > -1 ? c4 : 0);
    bytes.push((triple >> 16) & 255);

    if (c3 > -1) {
      bytes.push((triple >> 8) & 255);
    }

    if (c4 > -1) {
      bytes.push(triple & 255);
    }
  }

  return new Uint8Array(bytes);
}

function base64UrlEncodeUtf8(input: string) {
  const encoded = bytesToBase64(new TextEncoder().encode(input));
  return encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecodeUtf8(input: string) {
  const padded = `${input}${"=".repeat((4 - (input.length % 4)) % 4)}`
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  return new TextDecoder().decode(base64ToBytes(padded));
}

async function hmacSha256(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return bytesToBase64(new Uint8Array(signature))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToHex(new Uint8Array(digest));
}

async function hashPassword(password: string, salt: string) {
  const imported = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );

  const derived = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: new TextEncoder().encode(salt),
      iterations: PBKDF2_ITERATIONS,
    },
    imported,
    256,
  );

  return bytesToHex(new Uint8Array(derived));
}

function randomHex(bytes: number) {
  const out = new Uint8Array(bytes);
  crypto.getRandomValues(out);
  return bytesToHex(out);
}

function createId() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return randomHex(16);
}

async function createSessionToken(user: { id: string; email: string }, env: Env) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: user.id,
    email: user.email,
    iat: now,
    exp: now + USER_SESSION_TTL_SECONDS,
  };

  const header = base64UrlEncodeUtf8(JSON.stringify({ typ: "JWT", alg: "HS256" }));
  const encodedPayload = base64UrlEncodeUtf8(JSON.stringify(payload));
  const signature = await hmacSha256(`${header}.${encodedPayload}`, env.SESSION_SECRET);
  return `${header}.${encodedPayload}.${signature}`;
}

async function verifySessionToken(token: string, env: Env) {
  const pieces = token.split(".");
  if (pieces.length !== 3) {
    return null;
  }

  const [header, payload, signature] = pieces;
  const expected = await hmacSha256(`${header}.${payload}`, env.SESSION_SECRET);
  if (expected !== signature) {
    return null;
  }

  let parsed: { sub?: unknown; exp?: unknown };
  try {
    parsed = JSON.parse(base64UrlDecodeUtf8(payload)) as { sub?: unknown; exp?: unknown };
  } catch {
    return null;
  }

  if (typeof parsed.sub !== "string" || typeof parsed.exp !== "number") {
    return null;
  }

  if (parsed.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return parsed.sub;
}

async function requireUser(request: Request, env: Env) {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return null;
  }

  const token = auth.slice("Bearer ".length).trim();
  if (!token) {
    return null;
  }

  const userId = await verifySessionToken(token, env);
  if (!userId) {
    return null;
  }

  return getUserById(env, userId);
}

function sanitizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function dayLimit(env: Env) {
  const parsed = Number(env.DAILY_CHAR_LIMIT || "5500");
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 5500;
}

function anonDayLimit(env: Env) {
  const parsed = Number(env.ANON_DAILY_CHAR_LIMIT || "1400");
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1400;
}

function normalizeProvider(value: string | undefined): TtsProvider | null {
  const candidate = value?.trim().toLowerCase();
  if (candidate === "elevenlabs" || candidate === "deepgram") {
    return candidate;
  }

  return null;
}

function resolveProvider(env: Env): TtsProvider {
  const hasDeepgram = Boolean(env.DEEPGRAM_API_KEY);
  const hasElevenLabs = Boolean(env.ELEVENLABS_API_KEY);
  const configured = normalizeProvider(env.TTS_PROVIDER);

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

function elevenLabsEndpointBase(env: Env) {
  return env.ELEVENLABS_BASE_URL?.replace(/\/$/, "") || "https://api.elevenlabs.io";
}

function deepgramEndpointBase(env: Env) {
  return env.DEEPGRAM_BASE_URL?.replace(/\/$/, "") || "https://api.deepgram.com";
}

function parseVoices(payload: unknown) {
  if (Array.isArray(payload)) {
    return payload as VoiceLike[];
  }

  if (payload && typeof payload === "object" && "voices" in payload) {
    const nested = (payload as { voices?: unknown }).voices;
    return Array.isArray(nested) ? (nested as VoiceLike[]) : [];
  }

  return [];
}

function toPublicVoice(voice: VoiceLike): PublicVoice | null {
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

function parseVoiceSettings(input: unknown) {
  const settings = input && typeof input === "object" ? (input as VoiceSettingsBody) : {};

  return {
    stability:
      typeof settings.stability === "number" && Number.isFinite(settings.stability)
        ? clamp(settings.stability, 0, 1)
        : 0.45,
    similarity_boost:
      typeof settings.similarityBoost === "number" && Number.isFinite(settings.similarityBoost)
        ? clamp(settings.similarityBoost, 0, 1)
        : 0.75,
    style:
      typeof settings.style === "number" && Number.isFinite(settings.style)
        ? clamp(settings.style, 0, 1)
        : 0.25,
    speed:
      typeof settings.speed === "number" && Number.isFinite(settings.speed)
        ? clamp(settings.speed, 0.7, 1.2)
        : 1,
    use_speaker_boost:
      typeof settings.useSpeakerBoost === "boolean" ? settings.useSpeakerBoost : true,
  };
}

async function getUserByEmail(env: Env, email: string) {
  return env.NATOR_KV.get<UserRecord>(`user:email:${sanitizeEmail(email)}`, "json");
}

async function getUserById(env: Env, id: string) {
  return env.NATOR_KV.get<UserRecord>(`user:id:${id}`, "json");
}

async function saveUser(env: Env, user: UserRecord) {
  await Promise.all([
    env.NATOR_KV.put(`user:id:${user.id}`, JSON.stringify(user)),
    env.NATOR_KV.put(`user:email:${user.email}`, JSON.stringify(user)),
  ]);
}

async function getClips(env: Env, userId: string) {
  const clips = await env.NATOR_KV.get<ClipRecord[]>(`clips:${userId}`, "json");
  return Array.isArray(clips) ? clips : [];
}

async function setClips(env: Env, userId: string, clips: ClipRecord[]) {
  await env.NATOR_KV.put(`clips:${userId}`, JSON.stringify(clips));
}

async function getUsage(env: Env, identity: string, day: string) {
  const value = await env.NATOR_KV.get(`usage:${identity}:${day}`);
  const parsed = Number(value ?? "0");
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

async function setUsage(env: Env, identity: string, day: string, used: number) {
  await env.NATOR_KV.put(`usage:${identity}:${day}`, String(used));
}

async function handleVoices(_request: Request, env: Env, origin: string) {
  const provider = resolveProvider(env);

  if (provider === "deepgram") {
    if (!env.DEEPGRAM_API_KEY) {
      return json({ error: "Missing DEEPGRAM_API_KEY secret in worker." }, 500, origin);
    }

    const voices = [...DEEPGRAM_VOICE_CATALOG].sort((a, b) => a.name.localeCompare(b.name));
    return json(
      {
        provider,
        capabilities: {
          modelSelection: false,
          voiceSettings: false,
        },
        voices,
      },
      200,
      origin,
    );
  }

  if (!env.ELEVENLABS_API_KEY) {
    return json({ error: "Missing ELEVENLABS_API_KEY secret in worker." }, 500, origin);
  }

  const candidatePaths = [
    "/v2/voices?page_size=100&include_total_count=false",
    "/v1/voices?show_legacy=true",
    "/v1/voices/search?page_size=100",
  ];

  let lastResponse: Response | null = null;

  for (const path of candidatePaths) {
    const response = await fetch(`${elevenLabsEndpointBase(env)}${path}`, {
      method: "GET",
      headers: {
        "xi-api-key": env.ELEVENLABS_API_KEY,
        Accept: "application/json",
      },
    }).catch(() => null);

    if (!response) {
      continue;
    }

    if (response.ok) {
      const payload = (await response.json()) as unknown;
      const voices = parseVoices(payload)
        .map(toPublicVoice)
        .filter((voice): voice is PublicVoice => voice !== null)
        .sort((a, b) => a.name.localeCompare(b.name));

      return json(
        {
          provider,
          capabilities: {
            modelSelection: true,
            voiceSettings: true,
          },
          voices,
        },
        200,
        origin,
      );
    }

    lastResponse = response;
    if (response.status === 401 || response.status === 403 || response.status === 429) {
      break;
    }
  }

  if (lastResponse?.status === 401 || lastResponse?.status === 403) {
    return json({ error: "ElevenLabs authentication failed." }, 401, origin);
  }

  if (lastResponse?.status === 429) {
    return json({ error: "Rate limited by ElevenLabs." }, 429, origin);
  }

  return json({ error: "Unable to load voices." }, 502, origin);
}

async function handleRegister(request: Request, env: Env, origin: string) {
  const body = (await request.json().catch(() => ({}))) as { email?: unknown; password?: unknown };
  const email = typeof body.email === "string" ? sanitizeEmail(body.email) : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: "A valid email is required." }, 400, origin);
  }

  if (password.length < 8 || password.length > 72) {
    return json({ error: "Password must be 8-72 characters." }, 400, origin);
  }

  try {
    const existing = await getUserByEmail(env, email);
    if (existing) {
      return json({ error: "An account with this email already exists." }, 400, origin);
    }

    const salt = randomHex(16);
    const passwordHash = await hashPassword(password, salt);
    const user: UserRecord = {
      id: createId(),
      email,
      salt,
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    await saveUser(env, user);

    const token = await createSessionToken(user, env);
    return json(
      {
        token,
        user: {
          id: user.id,
          email: user.email,
        },
      },
      200,
      origin,
    );
  } catch (error) {
    console.error("register_failed", error);
    const reason = error instanceof Error ? error.message : "unknown register failure";
    return json(
      {
        error:
          "Registration is temporarily unavailable. You can still generate clips anonymously.",
        reason,
      },
      503,
      origin,
    );
  }
}

async function handleLogin(request: Request, env: Env, origin: string) {
  const body = (await request.json().catch(() => ({}))) as { email?: unknown; password?: unknown };
  const email = typeof body.email === "string" ? sanitizeEmail(body.email) : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return json({ error: "Email and password are required." }, 400, origin);
  }

  const user = await getUserByEmail(env, email);
  if (!user) {
    return json({ error: "Invalid email or password." }, 401, origin);
  }

  const attempted = await hashPassword(password, user.salt);
  if (attempted !== user.passwordHash) {
    return json({ error: "Invalid email or password." }, 401, origin);
  }

  const token = await createSessionToken(user, env);
  return json(
    {
      token,
      user: {
        id: user.id,
        email: user.email,
      },
    },
    200,
    origin,
  );
}

async function handleMe(request: Request, env: Env, origin: string) {
  const user = await requireUser(request, env);
  if (!user) {
    return json({ error: "Unauthorized." }, 401, origin);
  }

  return json({ user: { id: user.id, email: user.email } }, 200, origin);
}

async function handleClips(request: Request, env: Env, origin: string) {
  const user = await requireUser(request, env);
  if (!user) {
    return json({ error: "Unauthorized." }, 401, origin);
  }

  if (request.method === "GET") {
    const clips = await getClips(env, user.id);
    return json({ clips }, 200, origin);
  }

  if (request.method === "POST") {
    const body = (await request.json().catch(() => ({}))) as {
      text?: unknown;
      voiceId?: unknown;
      voiceName?: unknown;
      chars?: unknown;
    };

    const text = typeof body.text === "string" ? body.text.trim() : "";
    const voiceId = typeof body.voiceId === "string" ? body.voiceId.trim() : "";
    const voiceName = typeof body.voiceName === "string" ? body.voiceName.trim() : "";
    const chars = typeof body.chars === "number" ? body.chars : NaN;

    if (!text || !voiceId || !voiceName || !Number.isFinite(chars)) {
      return json(
        { error: "text, voiceId, voiceName, and chars are required." },
        400,
        origin,
      );
    }

    const existing = await getClips(env, user.id);
    const next: ClipRecord = {
      id: createId(),
      text: text.slice(0, MAX_TEXT_LENGTH),
      voiceId: voiceId.slice(0, 120),
      voiceName: voiceName.slice(0, 120),
      chars: Math.max(0, Math.min(MAX_TEXT_LENGTH, Math.floor(chars))),
      createdAt: new Date().toISOString(),
    };

    const deduped = existing.filter(
      (entry) => !(entry.text === next.text && entry.voiceId === next.voiceId),
    );

    await setClips(env, user.id, [next, ...deduped].slice(0, 30));
    return json({ ok: true }, 200, origin);
  }

  return json({ error: "Method not allowed." }, 405, origin);
}

async function handleUsage(request: Request, env: Env, origin: string) {
  const user = await requireUser(request, env);
  if (!user) {
    return json({ error: "Unauthorized." }, 401, origin);
  }

  const day = todayKey();
  const used = await getUsage(env, `user:${user.id}`, day);
  return json(
    {
      usage: {
        day,
        used,
        limit: dayLimit(env),
      },
    },
    200,
    origin,
  );
}

async function handleTts(request: Request, env: Env, origin: string) {
  const provider = resolveProvider(env);

  if (provider === "deepgram" && !env.DEEPGRAM_API_KEY) {
    return json({ error: "Missing DEEPGRAM_API_KEY secret in worker." }, 500, origin);
  }

  if (provider === "elevenlabs" && !env.ELEVENLABS_API_KEY) {
    return json({ error: "Missing ELEVENLABS_API_KEY secret in worker." }, 500, origin);
  }

  const body = (await request.json().catch(() => ({}))) as TtsBody;
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const voiceId = typeof body.voiceId === "string" ? body.voiceId.trim() : "";
  const modelId =
    typeof body.modelId === "string" && body.modelId.trim().length > 0
      ? body.modelId.trim()
      : env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2";

  if (!text) {
    return json({ error: "Text is required." }, 400, origin);
  }

  if (text.length > MAX_TEXT_LENGTH) {
    return json({ error: `Text must be ${MAX_TEXT_LENGTH} characters or fewer.` }, 400, origin);
  }

  if (!voiceId) {
    return json({ error: "Voice selection is required." }, 400, origin);
  }

  const day = todayKey();
  const user = await requireUser(request, env);

  const identity = user
    ? `user:${user.id}`
    : `anon:${await sha256Hex(
        request.headers.get("CF-Connecting-IP") || request.headers.get("x-forwarded-for") || "anon",
      )}`;

  const limit = user ? dayLimit(env) : anonDayLimit(env);
  const usedBefore = await getUsage(env, identity, day);
  if (usedBefore + text.length > limit) {
    return json(
      { error: `Daily character limit reached (${usedBefore}/${limit}).` },
      429,
      origin,
    );
  }

  const upstream =
    provider === "deepgram"
      ? await fetch(
          `${deepgramEndpointBase(env)}/v1/speak?model=${encodeURIComponent(
            voiceId,
          )}&encoding=mp3&sample_rate=44100`,
          {
            method: "POST",
            headers: {
              Authorization: `Token ${env.DEEPGRAM_API_KEY as string}`,
              "Content-Type": "application/json",
              Accept: "audio/mpeg",
            },
            body: JSON.stringify({
              text,
            }),
          },
        ).catch(() => null)
      : await fetch(
          `${elevenLabsEndpointBase(env)}/v1/text-to-speech/${encodeURIComponent(
            voiceId,
          )}?output_format=mp3_44100_128`,
          {
            method: "POST",
            headers: {
              "xi-api-key": env.ELEVENLABS_API_KEY as string,
              "Content-Type": "application/json",
              Accept: "audio/mpeg",
            },
            body: JSON.stringify({
              text,
              model_id: modelId,
              voice_settings: parseVoiceSettings(body.voiceSettings),
            }),
          },
        ).catch(() => null);

  if (!upstream) {
    return json(
      {
        error:
          provider === "deepgram"
            ? "Network issue while reaching Deepgram."
            : "Network issue while reaching ElevenLabs.",
      },
      502,
      origin,
    );
  }

  if (!upstream.ok) {
    const payload = (await upstream.json().catch(() => ({}))) as unknown;
    const upstreamError = parseErrorMessage(payload);

    if (upstream.status === 429) {
      return json(
        {
          error:
            provider === "deepgram"
              ? "Rate limited by Deepgram. Try again shortly."
              : "Rate limited by ElevenLabs. Try again shortly.",
        },
        429,
        origin,
      );
    }

    if (upstream.status === 401 || upstream.status === 403) {
      return json(
        {
          error:
            upstreamError ||
            (provider === "deepgram"
              ? "Deepgram authentication failed. Refresh DEEPGRAM_API_KEY in Worker secrets."
              : "ElevenLabs authentication failed. Refresh ELEVENLABS_API_KEY in Worker secrets."),
        },
        401,
        origin,
      );
    }

    return json({ error: upstreamError || "TTS generation failed." }, 400, origin);
  }

  const audioBuffer = await upstream.arrayBuffer().catch(() => null);
  if (!audioBuffer || audioBuffer.byteLength === 0) {
    return json(
      {
        error:
          provider === "deepgram"
            ? "Deepgram returned empty audio."
            : "ElevenLabs returned empty audio.",
      },
      502,
      origin,
    );
  }

  const usedAfter = usedBefore + text.length;
  await setUsage(env, identity, day, usedAfter);

  const filename = `voice-clip-${new Date().toISOString().replaceAll(":", "-")}.mp3`;
  const headers = new Headers({
    "Content-Type": upstream.headers.get("content-type") || "audio/mpeg",
    "Content-Length": String(audioBuffer.byteLength),
    "Cache-Control": "no-store",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "X-Usage-Used": String(usedAfter),
    "X-Usage-Limit": String(limit),
    ...corsHeaders(origin),
  });

  return new Response(audioBuffer, {
    status: 200,
    headers,
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = allowedOrigin(request, env);
    const provider = resolveProvider(env);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin),
      });
    }

    const url = new URL(request.url);
    const pathname = url.pathname;

    try {
      if (request.method === "GET" && pathname === "/api/health") {
        return json(
          {
            ok: true,
            provider,
            hasElevenLabsKey: !!env.ELEVENLABS_API_KEY,
            hasDeepgramKey: !!env.DEEPGRAM_API_KEY,
            hasSessionSecret: !!env.SESSION_SECRET,
            hasKvBinding: typeof env.NATOR_KV?.get === "function",
          },
          200,
          origin,
        );
      }

      if (!env.SESSION_SECRET && pathname.startsWith("/api/auth")) {
        return json({ error: "Missing SESSION_SECRET secret in worker." }, 500, origin);
      }

      if (request.method === "GET" && pathname === "/api/voices") {
        return await handleVoices(request, env, origin);
      }

      if (request.method === "POST" && pathname === "/api/tts") {
        return await handleTts(request, env, origin);
      }

      if (request.method === "POST" && pathname === "/api/auth/register") {
        return await handleRegister(request, env, origin);
      }

      if (request.method === "POST" && pathname === "/api/auth/login") {
        return await handleLogin(request, env, origin);
      }

      if (request.method === "GET" && pathname === "/api/auth/me") {
        return await handleMe(request, env, origin);
      }

      if ((request.method === "GET" || request.method === "POST") && pathname === "/api/clips") {
        return await handleClips(request, env, origin);
      }

      if (request.method === "GET" && pathname === "/api/usage") {
        return await handleUsage(request, env, origin);
      }

      return json({ error: "Not found." }, 404, origin);
    } catch (error) {
      console.error("worker_unhandled_error", pathname, error);
      const reason =
        error instanceof Error && error.message ? error.message : "unexpected runtime exception";
      return json({ error: "Internal worker error.", reason }, 500, origin);
    }
  },
};
