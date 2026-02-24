# NatorVoice Cloudflare Worker API

## Routes

- `GET /api/health`
- `GET /api/voices`
- `POST /api/tts`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/clips`
- `POST /api/clips`
- `GET /api/usage`

## Provider Support

- `TTS_PROVIDER=deepgram` (default)
- `TTS_PROVIDER=elevenlabs`

If `TTS_PROVIDER` is omitted, Worker uses:
- Deepgram when `DEEPGRAM_API_KEY` exists
- otherwise ElevenLabs

## Required Secrets

- `SESSION_SECRET`
- `DEEPGRAM_API_KEY` when using Deepgram
- `ELEVENLABS_API_KEY` when using ElevenLabs

## Optional Vars

- `TTS_PROVIDER` (default in `wrangler.toml`: `deepgram`)
- `DAILY_CHAR_LIMIT` (default `5500`)
- `ANON_DAILY_CHAR_LIMIT` (default `1400`)
- `ELEVENLABS_MODEL_ID` (default `eleven_multilingual_v2`)
- `ALLOWED_ORIGIN` (default `*`)

## Deploy

```bash
npm install
npx wrangler login
npx wrangler kv namespace create NATOR_KV
npx wrangler kv namespace create NATOR_KV --preview
# Update wrangler.toml with returned IDs
npx wrangler secret put DEEPGRAM_API_KEY
npx wrangler secret put SESSION_SECRET
# Optional
npx wrangler secret put ELEVENLABS_API_KEY
npx wrangler deploy
```
