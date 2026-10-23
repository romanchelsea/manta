# Dota 2 Multi-Account Tracker (web)

A Next.js app that combines match statistics from several Dota 2 accounts in one place, using the public [OpenDota](https://www.opendota.com) API. Add accounts by Steam/Dota ID, sync their matches, then browse:

- **Overview** (`/`): per-account and combined summary stats.
- **Matches** (`/matches`): one merged match list with match details.
- **Activity** (`/activity`): lifetime activity history and charts.

## Privacy

Phase 1 has no server-side storage; your account list and match cache live only in your browser (IndexedDB). Your browser talks to `api.opendota.com` directly.

## Development

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # Vitest
npm run lint
npm run build && npm start   # production check
```

## Security headers

`src/proxy.ts` sets a per-request nonce-based Content-Security-Policy plus `Referrer-Policy` and `X-Content-Type-Options`. Nonces need every page rendered per request, so `cacheComponents` / Partial Prerendering are off in `next.config.ts` (the Next.js CSP guide says PPR does not work with nonces).

## Deploy (GitHub + Vercel)

1. Create a **public** GitHub repository (e.g. `dota2-multi-account-panel`) without a README.
2. From the repository root, push the code:
   ```bash
   git remote add origin https://github.com/<you>/dota2-multi-account-panel.git
   git push -u origin main   # or the branch you want to deploy
   ```
3. In Vercel: **Add New... > Project**, import that repository.
4. Set **Root Directory** to `web` (framework preset Next.js is detected automatically; default build settings are fine). No environment variables are needed.
5. Click **Deploy**. After it finishes, open the URL and check the response headers include `content-security-policy`.

Note: Vercel's Hobby plan is for personal, non-commercial use only.
