
"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  AudioLines,
  CheckCircle2,
  Cloud,
  Download,
  Loader2,
  LogOut,
  MessageCircleMore,
  RotateCcw,
  Scissors,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
  WandSparkles,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { buildApiUrl, cloudSyncConfigured } from "@/lib/api-client";
import { analyzeAudioWaveform, trimSilence } from "@/lib/audio-processing";
import { cn } from "@/lib/utils";

type Voice = {
  id: string;
  name: string;
  category: string;
  accent: string | null;
  gender: string | null;
  age: string | null;
  previewUrl: string | null;
};

type RecentClip = {
  id: string;
  text: string;
  voiceId: string;
  voiceName: string;
  chars: number;
  createdAt: string;
};

type VoiceSettings = {
  stability: number;
  similarityBoost: number;
  style: number;
  speed: number;
  useSpeakerBoost: boolean;
};

type VoicePreset = {
  id: string;
  label: string;
  description: string;
  settings: VoiceSettings;
};

type UsageState = {
  day: string;
  used: number;
  limit: number;
};

type CloudUser = {
  id: string;
  email: string;
};

type CloudAuthResponse = {
  token: string;
  user: CloudUser;
};

const MAX_TEXT_LENGTH = 1200;
const MAX_HISTORY_ITEMS = 8;
const HISTORY_STORAGE_KEY = "voice-prj-recent-clips";
const LOCAL_USAGE_STORAGE_KEY = "voice-prj-local-usage";
const CLOUD_TOKEN_STORAGE_KEY = "voice-prj-cloud-token";
const LOCAL_DAILY_LIMIT = 5500;
const MAX_CLOUD_PASSWORD_LENGTH = 72;

const MODEL_OPTIONS = [
  { id: "eleven_multilingual_v2", label: "Multilingual v2" },
  { id: "eleven_turbo_v2_5", label: "Turbo v2.5" },
  { id: "eleven_monolingual_v1", label: "Monolingual v1" },
];

const PRESETS: VoicePreset[] = [
  {
    id: "balanced",
    label: "Balanced",
    description: "Natural delivery with good clarity.",
    settings: {
      stability: 0.45,
      similarityBoost: 0.75,
      style: 0.22,
      speed: 1,
      useSpeakerBoost: true,
    },
  },
  {
    id: "expressive",
    label: "Expressive",
    description: "More emotion and color for playful clips.",
    settings: {
      stability: 0.32,
      similarityBoost: 0.65,
      style: 0.55,
      speed: 1,
      useSpeakerBoost: true,
    },
  },
  {
    id: "announcer",
    label: "Announcer",
    description: "Steady, clear, and slightly faster pacing.",
    settings: {
      stability: 0.62,
      similarityBoost: 0.8,
      style: 0.18,
      speed: 1.06,
      useSpeakerBoost: true,
    },
  },
];

const DEFAULT_SETTINGS = PRESETS[0].settings;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatWhen(timestamp: string) {
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function currentDayKey() {
  return new Date().toISOString().slice(0, 10);
}

function parseErrorMessage(payload: unknown): string {
  if (payload && typeof payload === "object" && "error" in payload) {
    const maybeError = (payload as { error?: unknown }).error;
    if (typeof maybeError === "string" && maybeError.trim().length > 0) {
      return maybeError;
    }
  }

  return "Something went wrong. Please try again.";
}

function parseFilename(contentDisposition: string | null) {
  if (!contentDisposition) {
    return `voice-clip-${Date.now()}.mp3`;
  }

  const match = contentDisposition.match(/filename\*=UTF-8''([^;]+)|filename="([^"]+)"/i);
  const rawName = match?.[1] ?? match?.[2];

  if (!rawName) {
    return `voice-clip-${Date.now()}.mp3`;
  }

  try {
    return decodeURIComponent(rawName);
  } catch {
    return rawName;
  }
}

function sanitizeHistory(input: unknown): RecentClip[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .filter((item): item is RecentClip => {
      if (!item || typeof item !== "object") {
        return false;
      }

      const candidate = item as Partial<RecentClip>;
      return (
        typeof candidate.id === "string" &&
        typeof candidate.text === "string" &&
        typeof candidate.voiceId === "string" &&
        typeof candidate.voiceName === "string" &&
        typeof candidate.chars === "number" &&
        typeof candidate.createdAt === "string"
      );
    })
    .slice(0, MAX_HISTORY_ITEMS);
}

function newId() {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

async function jsonRequest<T>(path: string, init?: RequestInit, token?: string): Promise<T> {
  const headers = new Headers(init?.headers ?? {});
  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(buildApiUrl(path), {
    ...init,
    headers,
  });

  const payload = (await response.json().catch(() => ({}))) as unknown;
  if (!response.ok) {
    throw new Error(parseErrorMessage(payload));
  }

  return payload as T;
}

function SliderControl({
  id,
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="space-y-1.5" htmlFor={id}>
      <div className="flex items-center justify-between text-xs text-stone-600">
        <span>{label}</span>
        <span>{value.toFixed(2)}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-stone-900/10 accent-amber-500"
      />
    </label>
  );
}

export function TtsStudio() {
  const cloudEnabled = cloudSyncConfigured();

  const [text, setText] = useState("");
  const [voiceSearch, setVoiceSearch] = useState("");
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState("");
  const [selectedModelId, setSelectedModelId] = useState(
    MODEL_OPTIONS[0]?.id ?? "eleven_multilingual_v2",
  );
  const [voicesLoading, setVoicesLoading] = useState(true);
  const [voicesError, setVoicesError] = useState("");

  const [settings, setSettings] = useState<VoiceSettings>(DEFAULT_SETTINGS);
  const [activePresetId, setActivePresetId] = useState(PRESETS[0]?.id ?? "balanced");

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isTrimming, setIsTrimming] = useState(false);
  const [statusMessage, setStatusMessage] = useState(
    "Write a script, pick a voice, and generate your clip.",
  );
  const [errorMessage, setErrorMessage] = useState("");

  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [activeFile, setActiveFile] = useState<File | null>(null);
  const [activeAudioUrl, setActiveAudioUrl] = useState<string | null>(null);
  const [waveformBars, setWaveformBars] = useState<number[]>([]);
  const [trimmedInfo, setTrimmedInfo] = useState<{
    leadingMs: number;
    trailingMs: number;
    durationMs: number;
  } | null>(null);

  const [history, setHistory] = useState<RecentClip[]>([]);
  const [historyReady, setHistoryReady] = useState(false);

  const [localUsage, setLocalUsage] = useState<UsageState>({
    day: currentDayKey(),
    used: 0,
    limit: LOCAL_DAILY_LIMIT,
  });

  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [cloudToken, setCloudToken] = useState("");
  const [cloudUser, setCloudUser] = useState<CloudUser | null>(null);
  const [cloudClips, setCloudClips] = useState<RecentClip[]>([]);
  const [cloudUsage, setCloudUsage] = useState<UsageState | null>(null);
  const [cloudError, setCloudError] = useState("");

  const mountedRef = useRef(false);

  const filteredVoices = useMemo(() => {
    const query = voiceSearch.trim().toLowerCase();
    if (!query) {
      return voices;
    }

    return voices.filter((voice) =>
      [voice.name, voice.category, voice.accent, voice.gender]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [voiceSearch, voices]);

  const selectedVoice = useMemo(
    () => voices.find((voice) => voice.id === selectedVoiceId) ?? null,
    [voices, selectedVoiceId],
  );

  const activeUsage = cloudUsage ?? localUsage;
  const charsRemaining = MAX_TEXT_LENGTH - text.length;
  const usageRemaining = Math.max(activeUsage.limit - activeUsage.used, 0);
  const usageAfterRequest = activeUsage.used + text.trim().length;
  const usagePct = clamp((activeUsage.used / activeUsage.limit) * 100, 0, 100);
  const overLimit = usageAfterRequest > activeUsage.limit;

  const canGenerate =
    text.trim().length > 0 &&
    text.length <= MAX_TEXT_LENGTH &&
    !!selectedVoiceId &&
    !overLimit;

  const updateUsageAfterGenerate = (chars: number, response: Response) => {
    const usedHeader = response.headers.get("x-usage-used");
    const limitHeader = response.headers.get("x-usage-limit");

    if (usedHeader && limitHeader) {
      const used = Number(usedHeader);
      const limit = Number(limitHeader);
      if (Number.isFinite(used) && Number.isFinite(limit) && cloudUser) {
        setCloudUsage({
          day: currentDayKey(),
          used,
          limit,
        });
        return;
      }
    }

    setLocalUsage((current) => {
      const day = currentDayKey();
      const baseUsed = current.day === day ? current.used : 0;
      return {
        day,
        used: baseUsed + chars,
        limit: current.limit,
      };
    });
  };

  const addToLocalHistory = (item: Omit<RecentClip, "id" | "createdAt">) => {
    setHistory((previous) => {
      const nextItem: RecentClip = {
        id: newId(),
        createdAt: new Date().toISOString(),
        ...item,
      };

      const deduped = previous.filter(
        (entry) => !(entry.text === item.text && entry.voiceId === item.voiceId),
      );

      return [nextItem, ...deduped].slice(0, MAX_HISTORY_ITEMS);
    });
  };

  const runDownload = () => {
    if (!activeAudioUrl || !activeFile) {
      return;
    }

    const link = document.createElement("a");
    link.href = activeAudioUrl;
    link.download = activeFile.name;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const setActiveAudioFromBlob = async (blob: Blob, filename: string, markOriginal: boolean) => {
    const file = new File([blob], filename, { type: blob.type || "audio/mpeg" });
    const nextUrl = URL.createObjectURL(blob);

    setActiveAudioUrl((previous) => {
      if (previous) {
        URL.revokeObjectURL(previous);
      }
      return nextUrl;
    });

    setActiveFile(file);
    if (markOriginal) {
      setOriginalFile(file);
    }

    try {
      const waveform = await analyzeAudioWaveform(blob, 52);
      setWaveformBars(waveform.bars);
    } catch {
      setWaveformBars([]);
    }
  };

  const refreshCloudState = async (token: string) => {
    const [meResponse, clipsResponse, usageResponse] = await Promise.all([
      jsonRequest<{ user: CloudUser }>("/api/auth/me", { method: "GET" }, token),
      jsonRequest<{ clips: RecentClip[] }>("/api/clips", { method: "GET" }, token),
      jsonRequest<{ usage: UsageState }>("/api/usage", { method: "GET" }, token),
    ]);

    setCloudUser(meResponse.user);
    setCloudClips(sanitizeHistory(clipsResponse.clips));
    setCloudUsage(usageResponse.usage);
  };

  const upsertCloudClip = async (token: string, clip: Omit<RecentClip, "id" | "createdAt">) => {
    await jsonRequest<{ ok: boolean }>(
      "/api/clips",
      {
        method: "POST",
        body: JSON.stringify(clip),
      },
      token,
    );

    const clipsResponse = await jsonRequest<{ clips: RecentClip[] }>(
      "/api/clips",
      { method: "GET" },
      token,
    );
    setCloudClips(sanitizeHistory(clipsResponse.clips));
  };

  const handleApplyPreset = (preset: VoicePreset) => {
    setActivePresetId(preset.id);
    setSettings(preset.settings);
  };

  const handleGenerate = async () => {
    if (!canGenerate || isGenerating) {
      return;
    }

    const trimmedText = text.trim();
    setErrorMessage("");
    setStatusMessage("Generating your clip...");
    setIsGenerating(true);

    try {
      const headers = new Headers({
        "Content-Type": "application/json",
      });

      if (cloudToken) {
        headers.set("Authorization", `Bearer ${cloudToken}`);
      }

      const response = await fetch(buildApiUrl("/api/tts"), {
        method: "POST",
        headers,
        body: JSON.stringify({
          text: trimmedText,
          voiceId: selectedVoiceId,
          modelId: selectedModelId,
          voiceSettings: settings,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as unknown;
        throw new Error(parseErrorMessage(payload));
      }

      const filename = parseFilename(response.headers.get("content-disposition"));
      const blob = await response.blob();
      await setActiveAudioFromBlob(blob, filename, true);
      setTrimmedInfo(null);

      updateUsageAfterGenerate(trimmedText.length, response);

      const historyPayload = {
        text: trimmedText,
        voiceId: selectedVoiceId,
        voiceName: selectedVoice?.name ?? "Voice",
        chars: trimmedText.length,
      };

      addToLocalHistory(historyPayload);

      if (cloudToken) {
        try {
          await upsertCloudClip(cloudToken, historyPayload);
        } catch {
          setCloudError("Generated successfully, but cloud clip sync failed.");
        }
      }

      setStatusMessage("Clip ready. Share to Messages or download and attach from Files.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not generate audio.";
      setErrorMessage(message);
      setStatusMessage("Generation failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTrimSilence = async () => {
    if (!originalFile || isTrimming) {
      return;
    }

    setIsTrimming(true);
    setErrorMessage("");

    try {
      const trimmed = await trimSilence(originalFile, {
        threshold: 0.014,
        minDurationMs: 180,
      });

      const baseName = originalFile.name.replace(/\.[^.]+$/, "") || `voice-clip-${Date.now()}`;
      const fileName = `${baseName}-trimmed.wav`;

      await setActiveAudioFromBlob(trimmed.blob, fileName, false);
      setTrimmedInfo({
        leadingMs: trimmed.trimmedLeadingMs,
        trailingMs: trimmed.trimmedTrailingMs,
        durationMs: trimmed.durationMs,
      });

      if (trimmed.didTrim) {
        setStatusMessage(
          `Silence trimmed. Removed ${trimmed.trimmedLeadingMs + trimmed.trimmedTrailingMs}ms total.`,
        );
      } else {
        setStatusMessage("No major silence detected. Exported a cleaned WAV copy anyway.");
      }
    } catch {
      setErrorMessage("Could not trim audio in this browser. You can still share/download original clip.");
    } finally {
      setIsTrimming(false);
    }
  };

  const handleResetTrim = async () => {
    if (!originalFile) {
      return;
    }

    await setActiveAudioFromBlob(originalFile, originalFile.name, false);
    setTrimmedInfo(null);
    setStatusMessage("Restored original audio.");
  };

  const handleShare = async () => {
    if (!activeFile || !activeAudioUrl || isSharing) {
      return;
    }

    setErrorMessage("");
    setIsSharing(true);

    const browserNavigator = navigator as Navigator & {
      canShare?: (data?: ShareData) => boolean;
    };

    try {
      if (typeof browserNavigator.share !== "function") {
        runDownload();
        setStatusMessage(
          "Direct file sharing is not supported here. Clip downloaded for attachment in Messages.",
        );
        return;
      }

      const shareData: ShareData = {
        title: "Voice clip",
        text: "Made with NatorVoice",
        files: [activeFile],
      };

      const canShareFiles = browserNavigator.canShare?.({ files: [activeFile] });
      if (canShareFiles === false) {
        runDownload();
        setStatusMessage(
          "This browser cannot share audio files directly. Downloaded so you can attach from Files.",
        );
        return;
      }

      await browserNavigator.share(shareData);
      setStatusMessage("Shared. Pick Messages in the iOS share sheet.");
    } catch (error) {
      const isAbort = error instanceof DOMException && error.name === "AbortError";
      if (!isAbort) {
        runDownload();
        setStatusMessage("Sharing failed on this browser. Downloaded for manual attach.");
      }
    } finally {
      setIsSharing(false);
    }
  };

  const handleOpenMessages = () => {
    const body = encodeURIComponent(
      "Voice clip ready. If file did not attach automatically, tap Download and attach from Files.",
    );

    window.location.href = `sms:&body=${body}`;
  };

  const handleCloudAuth = async () => {
    if (!cloudEnabled || authBusy) {
      return;
    }

    const email = authEmail.trim().toLowerCase();
    const password = authPassword;

    if (!email || !email.includes("@")) {
      setCloudError("Enter a valid email address.");
      return;
    }

    if (password.length < 8 || password.length > MAX_CLOUD_PASSWORD_LENGTH) {
      setCloudError("Password must be 8-72 characters.");
      return;
    }

    setAuthBusy(true);
    setCloudError("");

    try {
      const endpoint = authMode === "register" ? "/api/auth/register" : "/api/auth/login";
      const authResponse = await jsonRequest<CloudAuthResponse>(endpoint, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      setCloudToken(authResponse.token);
      setCloudUser(authResponse.user);
      localStorage.setItem(CLOUD_TOKEN_STORAGE_KEY, authResponse.token);

      await refreshCloudState(authResponse.token);
      setStatusMessage("Cloud sync connected. Recent scripts will sync across devices.");
    } catch (error) {
      setCloudError(error instanceof Error ? error.message : "Cloud authentication failed.");
    } finally {
      setAuthBusy(false);
    }
  };

  const handleCloudLogout = () => {
    setCloudToken("");
    setCloudUser(null);
    setCloudUsage(null);
    setCloudClips([]);
    localStorage.removeItem(CLOUD_TOKEN_STORAGE_KEY);
    setStatusMessage("Cloud session disconnected.");
  };

  useEffect(() => {
    let isActive = true;
    const controller = new AbortController();

    const loadVoices = async () => {
      setVoicesLoading(true);
      setVoicesError("");

      try {
        const response = await fetch(buildApiUrl("/api/voices"), {
          method: "GET",
          signal: controller.signal,
        });
        const payload = (await response.json()) as unknown;

        if (!response.ok) {
          throw new Error(parseErrorMessage(payload));
        }

        const nextVoices =
          payload && typeof payload === "object" && "voices" in payload
            ? (((payload as { voices?: unknown }).voices as Voice[] | undefined) ?? [])
            : [];

        if (!isActive) {
          return;
        }

        setVoices(nextVoices);
        setSelectedVoiceId((current) => current || nextVoices[0]?.id || "");
      } catch (error) {
        if (!isActive) {
          return;
        }

        setVoicesError(error instanceof Error ? error.message : "Could not load voices.");
      } finally {
        if (isActive) {
          setVoicesLoading(false);
        }
      }
    };

    void loadVoices();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (mountedRef.current) {
      return;
    }

    mountedRef.current = true;

    try {
      const rawHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (rawHistory) {
        const parsed = JSON.parse(rawHistory) as unknown;
        setHistory(sanitizeHistory(parsed));
      }

      const usageRaw = localStorage.getItem(LOCAL_USAGE_STORAGE_KEY);
      if (usageRaw) {
        const parsed = JSON.parse(usageRaw) as Partial<UsageState>;
        if (
          typeof parsed.day === "string" &&
          typeof parsed.used === "number" &&
          typeof parsed.limit === "number"
        ) {
          setLocalUsage({
            day: parsed.day,
            used: parsed.day === currentDayKey() ? parsed.used : 0,
            limit: parsed.limit,
          });
        }
      }

      const savedToken = localStorage.getItem(CLOUD_TOKEN_STORAGE_KEY) ?? "";
      if (savedToken) {
        setCloudToken(savedToken);
      }
    } catch {
      localStorage.removeItem(HISTORY_STORAGE_KEY);
      localStorage.removeItem(LOCAL_USAGE_STORAGE_KEY);
    } finally {
      setHistoryReady(true);
    }
  }, []);

  useEffect(() => {
    if (!historyReady) {
      return;
    }

    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  }, [history, historyReady]);

  useEffect(() => {
    localStorage.setItem(LOCAL_USAGE_STORAGE_KEY, JSON.stringify(localUsage));
  }, [localUsage]);

  useEffect(() => {
    if (!cloudEnabled || !cloudToken) {
      return;
    }

    let active = true;

    const loadCloud = async () => {
      try {
        await refreshCloudState(cloudToken);
      } catch {
        if (!active) {
          return;
        }

        setCloudError("Cloud session expired. Please sign in again.");
        setCloudToken("");
        setCloudUser(null);
        setCloudClips([]);
        setCloudUsage(null);
        localStorage.removeItem(CLOUD_TOKEN_STORAGE_KEY);
      }
    };

    void loadCloud();

    return () => {
      active = false;
    };
  }, [cloudEnabled, cloudToken]);

  useEffect(() => {
    return () => {
      if (activeAudioUrl) {
        URL.revokeObjectURL(activeAudioUrl);
      }
    };
  }, [activeAudioUrl]);

  const usageBadgeVariant =
    usagePct >= 90 ? "danger" : usagePct >= 70 ? "default" : "success";

  const mergedRecent = cloudUser ? [...cloudClips, ...history] : history;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_12%_2%,rgba(251,191,36,0.32),transparent_35%),radial-gradient(circle_at_90%_5%,rgba(245,158,11,0.2),transparent_38%),linear-gradient(180deg,#fff8ea_0%,#fffdf9_48%,#ffffff_100%)] px-4 pb-16 pt-6 text-stone-900">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(251,191,36,0.08),transparent_38%,rgba(251,191,36,0.06))]" />

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="relative mx-auto flex w-full max-w-xl flex-col gap-4"
      >
        <header className="space-y-2 px-1">
          <div className="flex items-center gap-2">
            <Badge className="w-fit" variant="default">
              Mobile-first TTS
            </Badge>
            <Badge variant={usageBadgeVariant}>
              {activeUsage.used}/{activeUsage.limit} chars today
            </Badge>
          </div>
          <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            NatorVoice Studio
          </h1>
          <p className="max-w-md text-sm text-stone-600">
            Fast script to voice workflow with sharing optimized for iPhone and Messages.
          </p>

          <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-900/10">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                usagePct >= 90 ? "bg-red-500" : usagePct >= 70 ? "bg-amber-500" : "bg-emerald-500",
              )}
              style={{ width: `${usagePct}%` }}
            />
          </div>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Create Clip</CardTitle>
            <CardDescription>
              Guardrails are active to keep latency and spend predictable.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="script" className="text-sm font-medium text-stone-800">
                  Script
                </label>
                <span
                  className={cn(
                    "text-xs",
                    charsRemaining < 0
                      ? "text-red-600"
                      : charsRemaining < 140
                        ? "text-amber-700"
                        : "text-stone-500",
                  )}
                >
                  {text.length}/{MAX_TEXT_LENGTH}
                </span>
              </div>
              <Textarea
                id="script"
                placeholder="Type your voice message..."
                maxLength={MAX_TEXT_LENGTH}
                value={text}
                onChange={(event) => setText(event.target.value)}
              />
              {overLimit && (
                <p className="text-xs text-red-700">
                  This request exceeds your daily limit. Remaining today: {usageRemaining} chars.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="voice-search" className="text-sm font-medium text-stone-800">
                Voice
              </label>
              <Input
                id="voice-search"
                placeholder="Search by name, accent, style"
                value={voiceSearch}
                onChange={(event) => setVoiceSearch(event.target.value)}
                disabled={voicesLoading || !!voicesError}
              />
              <select
                aria-label="Select voice"
                className="h-11 w-full rounded-xl border border-stone-900/10 bg-white/95 px-3 text-sm text-stone-900 outline-none transition focus-visible:ring-2 focus-visible:ring-amber-400/60 disabled:cursor-not-allowed disabled:opacity-60"
                value={selectedVoiceId}
                onChange={(event) => setSelectedVoiceId(event.target.value)}
                disabled={voicesLoading || !!voicesError || filteredVoices.length === 0}
              >
                {filteredVoices.map((voice) => (
                  <option key={voice.id} value={voice.id}>
                    {voice.name} {voice.accent ? `- ${voice.accent}` : ""}
                  </option>
                ))}
                {!filteredVoices.length && <option value="">No voices found</option>}
              </select>
              {selectedVoice && (
                <div className="flex flex-wrap gap-2 pt-1">
                  <Badge variant="neutral">{selectedVoice.category}</Badge>
                  {selectedVoice.accent && <Badge variant="neutral">{selectedVoice.accent}</Badge>}
                  {selectedVoice.gender && <Badge variant="neutral">{selectedVoice.gender}</Badge>}
                  {selectedVoice.age && <Badge variant="neutral">{selectedVoice.age}</Badge>}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-stone-900/10 bg-white/70 p-3">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-stone-800">Voice Controls</h3>
                <Badge variant="neutral">V2</Badge>
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      className={cn(
                        "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                        activePresetId === preset.id
                          ? "bg-amber-500 text-stone-950"
                          : "bg-stone-900/8 text-stone-700 hover:bg-stone-900/14",
                      )}
                      onClick={() => handleApplyPreset(preset)}
                      title={preset.description}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <label className="space-y-1.5" htmlFor="model-select">
                  <span className="text-xs text-stone-600">Model</span>
                  <select
                    id="model-select"
                    className="h-10 w-full rounded-xl border border-stone-900/10 bg-white/95 px-3 text-sm text-stone-900 outline-none transition focus-visible:ring-2 focus-visible:ring-amber-400/60"
                    value={selectedModelId}
                    onChange={(event) => setSelectedModelId(event.target.value)}
                  >
                    {MODEL_OPTIONS.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.label}
                      </option>
                    ))}
                  </select>
                </label>

                <SliderControl
                  id="stability"
                  label="Stability"
                  min={0}
                  max={1}
                  step={0.01}
                  value={settings.stability}
                  onChange={(value) => setSettings((current) => ({ ...current, stability: value }))}
                />

                <SliderControl
                  id="similarity"
                  label="Similarity"
                  min={0}
                  max={1}
                  step={0.01}
                  value={settings.similarityBoost}
                  onChange={(value) =>
                    setSettings((current) => ({ ...current, similarityBoost: value }))
                  }
                />

                <SliderControl
                  id="style"
                  label="Style"
                  min={0}
                  max={1}
                  step={0.01}
                  value={settings.style}
                  onChange={(value) => setSettings((current) => ({ ...current, style: value }))}
                />

                <SliderControl
                  id="speed"
                  label="Speed"
                  min={0.7}
                  max={1.2}
                  step={0.01}
                  value={settings.speed}
                  onChange={(value) => setSettings((current) => ({ ...current, speed: value }))}
                />

                <label className="flex items-center justify-between rounded-xl border border-stone-900/10 bg-white/85 px-3 py-2 text-sm">
                  <span className="text-stone-700">Speaker boost</span>
                  <input
                    type="checkbox"
                    checked={settings.useSpeakerBoost}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        useSpeakerBoost: event.target.checked,
                      }))
                    }
                    className="size-4 rounded accent-amber-500"
                  />
                </label>
              </div>
            </div>

            <motion.div whileTap={{ scale: 0.98 }}>
              <Button
                size="lg"
                className="w-full"
                onClick={() => void handleGenerate()}
                disabled={!canGenerate || isGenerating || voicesLoading || !!voicesError}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <WandSparkles className="size-4" />
                    Generate Clip
                  </>
                )}
              </Button>
            </motion.div>

            <AnimatePresence mode="wait">
              <motion.div
                key={statusMessage}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="flex items-start gap-2 text-sm text-stone-600"
              >
                <Sparkles className="mt-0.5 size-4 shrink-0 text-amber-600" />
                <p>{statusMessage}</p>
              </motion.div>
            </AnimatePresence>

            {voicesLoading && (
              <div className="flex items-center gap-2 text-sm text-stone-600">
                <Loader2 className="size-4 animate-spin text-amber-600" />
                Loading voices...
              </div>
            )}

            {voicesError && (
              <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <p>{voicesError}</p>
              </div>
            )}

            {errorMessage && (
              <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <p>{errorMessage}</p>
              </div>
            )}

            {usagePct >= 90 && (
              <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
                <ShieldAlert className="mt-0.5 size-4 shrink-0" />
                <p>Daily usage is above 90%. Keep scripts short or wait for tomorrow&apos;s reset.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="size-4 text-amber-600" />
              Cloud Sync
            </CardTitle>
            <CardDescription>
              Optional account sync for recent scripts and usage tracking across devices.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!cloudEnabled && (
              <div className="rounded-xl border border-stone-900/10 bg-stone-50 p-3 text-sm text-stone-600">
                Cloud sync is disabled. Set `NEXT_PUBLIC_ENABLE_CLOUD_SYNC=true` and configure a
                Cloudflare Worker API base URL.
              </div>
            )}

            {cloudEnabled && !cloudUser && (
              <div className="space-y-3">
                <div className="flex rounded-xl bg-stone-900/8 p-1">
                  <button
                    type="button"
                    className={cn(
                      "flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition",
                      authMode === "login" ? "bg-white text-stone-900" : "text-stone-600",
                    )}
                    onClick={() => setAuthMode("login")}
                  >
                    Sign in
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition",
                      authMode === "register" ? "bg-white text-stone-900" : "text-stone-600",
                    )}
                    onClick={() => setAuthMode("register")}
                  >
                    Create account
                  </button>
                </div>

                <Input
                  type="email"
                  placeholder="Email"
                  value={authEmail}
                  onChange={(event) => setAuthEmail(event.target.value)}
                />
                <Input
                  type="password"
                  placeholder="Password (8+ chars)"
                  value={authPassword}
                  onChange={(event) => setAuthPassword(event.target.value)}
                />
                <Button className="w-full" onClick={() => void handleCloudAuth()} disabled={authBusy}>
                  {authBusy ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Connecting...
                    </>
                  ) : authMode === "login" ? (
                    "Sign in"
                  ) : (
                    "Create account"
                  )}
                </Button>
                {cloudError && <p className="text-xs text-red-700">{cloudError}</p>}
              </div>
            )}

            {cloudEnabled && cloudUser && (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-stone-900/10 bg-white/90 p-3">
                  <div className="flex items-center gap-2">
                    <UserRoundCheck className="size-4 text-emerald-600" />
                    <div>
                      <p className="text-sm font-semibold text-stone-800">{cloudUser.email}</p>
                      <p className="text-xs text-stone-500">Cloud sync is active.</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleCloudLogout}>
                    <LogOut className="size-4" />
                    Logout
                  </Button>
                </div>

                {cloudUsage && (
                  <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">
                    <ShieldCheck className="size-4 shrink-0" />
                    <p>
                      Cloud usage today: {cloudUsage.used}/{cloudUsage.limit} chars.
                    </p>
                  </div>
                )}

                {cloudError && <p className="text-xs text-red-700">{cloudError}</p>}
              </div>
            )}
          </CardContent>
        </Card>

        <AnimatePresence>
          {activeAudioUrl && activeFile && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AudioLines className="size-4 text-amber-600" />
                    Clip Ready
                  </CardTitle>
                  <CardDescription>
                    Best iPhone flow: Share to Messages. Fallback is Download then attach from Files.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <audio controls className="w-full" src={activeAudioUrl} />

                  {waveformBars.length > 0 && (
                    <div className="flex h-16 items-end gap-1 rounded-xl border border-stone-900/8 bg-white/90 px-2 py-1">
                      {waveformBars.map((bar, index) => (
                        <span
                          key={`${bar}-${index}`}
                          className="w-full rounded-full bg-amber-500/85"
                          style={{ height: `${Math.max(6, Math.round(bar * 52))}px` }}
                        />
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="secondary"
                      className="w-full"
                      onClick={() => void handleShare()}
                      disabled={isSharing}
                    >
                      {isSharing ? <Loader2 className="size-4 animate-spin" /> : <Share2 className="size-4" />}
                      Share
                    </Button>
                    <Button variant="secondary" className="w-full" onClick={runDownload}>
                      <Download className="size-4" />
                      Download
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="secondary"
                      className="w-full"
                      onClick={() => void handleTrimSilence()}
                      disabled={isTrimming || !originalFile}
                    >
                      {isTrimming ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Scissors className="size-4" />
                      )}
                      Trim Silence
                    </Button>
                    <Button
                      variant="secondary"
                      className="w-full"
                      onClick={() => void handleResetTrim()}
                      disabled={!trimmedInfo}
                    >
                      <RotateCcw className="size-4" />
                      Reset Audio
                    </Button>
                  </div>

                  <Button variant="ghost" className="w-full" onClick={handleOpenMessages}>
                    <MessageCircleMore className="size-4" />
                    Open Messages
                  </Button>

                  {trimmedInfo && (
                    <div className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">
                      Trimmed leading {trimmedInfo.leadingMs}ms and trailing {trimmedInfo.trailingMs}ms.
                      New duration: {Math.max(1, Math.round(trimmedInfo.durationMs / 1000))}s.
                    </div>
                  )}

                  <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                    <p>
                      Mobile web cannot reliably copy audio into iOS clipboard for direct paste into
                      iMessage. Share sheet and file attach are the reliable path.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <Card>
          <CardHeader>
            <CardTitle>Recent Scripts</CardTitle>
            <CardDescription>
              Local recents plus cloud-synced scripts when authenticated.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {mergedRecent.length === 0 ? (
              <p className="text-sm text-stone-600">
                No recent clips yet. Your generated scripts will appear here.
              </p>
            ) : (
              <ul className="space-y-2">
                {mergedRecent.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-2xl border border-stone-900/10 bg-white/90 p-3"
                  >
                    <p className="max-h-10 overflow-hidden text-sm text-stone-800">{item.text}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <p className="text-xs text-stone-500">
                        {item.voiceName} - {item.chars} chars - {formatWhen(item.createdAt)}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setText(item.text);
                          setSelectedVoiceId(item.voiceId);
                          setStatusMessage("Loaded from recent scripts.");
                        }}
                      >
                        Reuse
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </main>
  );
}
