# NatorVoice

Mobile-first ElevenLabs TTS app with a polished sharing workflow for iPhone/iMessage.

## What is implemented

- Text to speech generation with ElevenLabs (server-side only, API key never exposed to browser).
- Searchable voice picker + model selection.
- Advanced generation controls with presets:
  - Stability
  - Similarity
  - Style
  - Speed
  - Speaker boost
- Inline audio preview, waveform display, trim-silence export, reset-to-original.
- Share flow optimized for iOS:
  - Web Share API file share when supported
  - Download fallback when file share is unsupported
  - `Open Messages` helper action
- Usage safeguards:
  - Daily char usage meter
  - 70%/90% warning states
  - Hard block when request exceeds daily cap
- Recent scripts:
  - Local persistence
  - Optional cloud sync across devices
- Optional account auth for cloud sync (email + password) with token sessions.

## Exact local setup (VS Code PowerShell)

1. Open terminal in VS Code.
2. Run:

```powershell
cd c:\Users\mpbra\OneDrive\Tim\Voice_PRJ\web
```

3. Install deps:

```powershell
npm install
```

4. Create env file (if needed):

```powershell
Copy-Item .env.example .env.local -Force
```

5. Put your ElevenLabs key in `.env.local`:

```env
ELEVENLABS_API_KEY=your_key_here
ELEVENLABS_MODEL_ID=eleven_multilingual_v2
DAILY_CHAR_LIMIT=5500
NEXT_PUBLIC_ENABLE_CLOUD_SYNC=false
```

6. Start dev server:

```powershell
npm run dev
```

7. Open:

```text
http://localhost:3000
```

8. Stop server:

```text
Ctrl + C
```

## Why this needs a server (not a static local HTML file)

This app must call ElevenLabs with a secret API key. If you run as static HTML/JS only, the key would be exposed client-side. Server routes (Next API routes or Cloudflare Worker endpoints) keep the key private.

## Cloudflare Worker path (fully functional)

Yes. This repo includes `cloudflare-worker/` that supports:

- `/api/voices`
- `/api/tts`
- `/api/auth/register`
- `/api/auth/login`
- `/api/auth/me`
- `/api/clips`
- `/api/usage`

### Deploy Worker

```powershell
cd c:\Users\mpbra\OneDrive\Tim\Voice_PRJ\web\cloudflare-worker
npm install
```

Create KV namespaces:

```powershell
npx wrangler kv namespace create NATOR_KV
npx wrangler kv namespace create NATOR_KV --preview
```

Copy resulting IDs into `cloudflare-worker/wrangler.toml` for:

- `id`
- `preview_id`

Set required secrets:

```powershell
npx wrangler secret put ELEVENLABS_API_KEY
npx wrangler secret put SESSION_SECRET
```

Optional secrets/vars:

- `DAILY_CHAR_LIMIT`
- `ANON_DAILY_CHAR_LIMIT`
- `ELEVENLABS_MODEL_ID`
- `ALLOWED_ORIGIN`

Deploy:

```powershell
npx wrangler deploy
```

You will get a Worker URL like:

```text
https://natorvoice-api.<subdomain>.workers.dev
```

### Point Next frontend at Worker

In `web/.env.local`:

```env
NEXT_PUBLIC_ENABLE_CLOUD_SYNC=true
NEXT_PUBLIC_API_BASE_URL=https://natorvoice-api.<subdomain>.workers.dev
```

Then restart `npm run dev`.

## Vercel deployment

If deploying Next frontend to Vercel, set env vars in Vercel project:

- `ELEVENLABS_API_KEY`
- `ELEVENLABS_MODEL_ID`
- `DAILY_CHAR_LIMIT`
- `NEXT_PUBLIC_ENABLE_CLOUD_SYNC`
- `NEXT_PUBLIC_API_BASE_URL` (set this to Worker URL when using Cloudflare backend)

## Security

- `.env.local` is gitignored.
- No API key should be committed.
- Rotate keys immediately if they were ever exposed in plaintext in chats, commits, screenshots, or logs.

## Product limitations (real platform constraints)

- Mobile web cannot reliably copy binary audio to iOS clipboard for paste into iMessage.
- Reliable path remains: Share Sheet file share, or Download then attach from Files in Messages.

## Architecture

- Frontend: Next.js App Router + TypeScript + Tailwind + Framer Motion.
- Local backend: Next API routes for ElevenLabs proxy, auth, clips, and usage.
- Cloud backend option: Cloudflare Worker + KV for auth/clips/usage persistence.
- Storage:
  - Local history + local usage in browser localStorage
  - Cloud history + usage in KV when cloud mode is enabled
