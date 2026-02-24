# NatorVoice Cloudflare Worker API

This Worker provides a production backend for the NatorVoice frontend.

## Routes

- `GET /api/voices`
- `POST /api/tts`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/clips`
- `POST /api/clips`
- `GET /api/usage`

## Required secrets

- `ELEVENLABS_API_KEY`
- `SESSION_SECRET`

## Optional vars

- `DAILY_CHAR_LIMIT` (default `5500`)
- `ANON_DAILY_CHAR_LIMIT` (default `1400`)
- `ELEVENLABS_MODEL_ID` (default `eleven_multilingual_v2`)
- `ALLOWED_ORIGIN` (default `*`)

## Deploy

```bash
npm install
npx wrangler kv namespace create NATOR_KV
npx wrangler kv namespace create NATOR_KV --preview
# Update wrangler.toml with returned IDs
npx wrangler secret put ELEVENLABS_API_KEY
npx wrangler secret put SESSION_SECRET
npx wrangler deploy
```
