# NatorVoice

Mobile-first TTS app for quick voice clips and easy iPhone sharing.

## Current Provider Strategy

- Default provider: **Deepgram Aura** (more reliable fallback right now).
- Preserved provider: **ElevenLabs** (kept in code; switchable by env var).
- Provider switching is runtime-only. No code changes required.

## Features

- Script input with character guardrails.
- Searchable voice picker.
- Generate + inline preview + waveform + trim silence.
- iPhone-first sharing flow:
  - Web Share API when supported
  - Download fallback
  - Open Messages helper
- Recent clip history + optional cloud sync (Worker KV).

## Why A Server Is Required

TTS providers require secret API keys. A static HTML-only site cannot keep those secrets private.  
This app uses server endpoints (Next API routes locally, Cloudflare Worker in production) so keys stay off the client.

## Local Setup (VS Code PowerShell)

```powershell
cd c:\Users\mpbra\OneDrive\Tim\Voice_PRJ\web
npm install
Copy-Item .env.example .env.local -Force
```

Set `.env.local`:

```env
TTS_PROVIDER=deepgram
DEEPGRAM_API_KEY=your_deepgram_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key
ELEVENLABS_MODEL_ID=eleven_multilingual_v2
DAILY_CHAR_LIMIT=5500
NEXT_PUBLIC_ENABLE_CLOUD_SYNC=false
```

Run:

```powershell
npm run dev
```

Open:

```text
http://localhost:3000
```

## Provider Switching

`.env.local` or Worker var:

- `TTS_PROVIDER=deepgram` -> uses `DEEPGRAM_API_KEY`
- `TTS_PROVIDER=elevenlabs` -> uses `ELEVENLABS_API_KEY`

Auto mode behavior (if `TTS_PROVIDER` not set):
- Uses Deepgram if `DEEPGRAM_API_KEY` exists, else ElevenLabs.

## Cloudflare Worker (Production API)

Worker path: `web/cloudflare-worker`

### 1) Install and login

```powershell
cd c:\Users\mpbra\OneDrive\Tim\Voice_PRJ\web\cloudflare-worker
npm install
npx wrangler login
```

### 2) KV namespaces

```powershell
npx wrangler kv namespace create NATOR_KV
npx wrangler kv namespace create NATOR_KV --preview
```

Put returned IDs into `cloudflare-worker/wrangler.toml` (`id` + `preview_id`).

### 3) Required Worker secrets

```powershell
npx wrangler secret put DEEPGRAM_API_KEY
npx wrangler secret put SESSION_SECRET
```

Optional (if keeping ElevenLabs path available in prod):

```powershell
npx wrangler secret put ELEVENLABS_API_KEY
```

### 4) Deploy

```powershell
npx wrangler deploy
```

### 5) Verify health

```text
https://natorvoice-api.<your-subdomain>.workers.dev/api/health
```

You should see JSON with `ok: true`, `provider`, and key flags.

## GitHub Pages Frontend

The repo includes a Pages workflow that exports static frontend and calls your Worker API.

Current live URL pattern:

```text
https://timbranthover.github.io/NatorVoice/
```

The workflow uses:

- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_ENABLE_CLOUD_SYNC`

## Security

- Never commit `.env.local`.
- Never commit provider keys.
- Use `wrangler secret put ...` for Cloudflare secrets.
- Rotate any key that was ever shared in plaintext.

## Known Platform Limits

- iOS mobile web cannot reliably do “copy audio file to clipboard and paste into iMessage”.
- Reliable flow remains:
  - Share sheet -> Messages
  - or Download -> attach from Files in Messages
