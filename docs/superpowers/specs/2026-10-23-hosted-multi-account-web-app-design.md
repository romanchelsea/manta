# Hosted multi-account Dota 2 web app — design

Date: 2026-10-23
Status: draft, awaiting approval

## Intent

Many Dota 2 players own several accounts. Today, to see how they are doing across all of them, they look up each account ID one at a time on OpenDota, STRATZ or Dotabuff. None of those sites combine several accounts into one view.

The existing single-file panel (`index.html` + `tools/stratz-proxy.mjs` in this folder) already does that combining, but only on the owner's machine. This project turns it into a public, free website any player can use, rebuilt in React (Next.js) and hosted on Vercel.

Two things set it apart:
1. **Combined stats across your accounts.** This is the core.
2. **Private accounts.** Accounts with "Expose Public Match Data" turned off are invisible on OpenDota. If the player pastes a STRATZ API token generated while logged in as that account, the site can fetch that account's own matches, and only that player sees them.

Monetization later (ads, paid extras), not in v1.

## Goals (v1)

- A public English-language website.
- No sign-up. A visitor adds account IDs and immediately sees combined data.
- Three views, ported from the existing panel:
  - **Overview:** combined KPIs (matches, win rate, KDA, etc.), per-account comparison, position distribution, solo vs party, most played heroes.
  - **Matches:** one combined match list across the selected accounts. Clicking a match opens its details: both teams, items, gold/XP advantage graphs. For private accounts, details come from STRATZ so the player is not shown as anonymous.
  - **Activity:** last-year calendar heatmap, weekday × hour heatmap, win rate by "Nth game of the day".
- **Account management:** add/remove account IDs (Steam64, Steam32 or profile URL, same parsing as today), toggle which accounts count toward stats, optionally attach a STRATZ token per account.
- **Filters:** time range and account selection. (Builder's call / my guess; the user did not ask for more in v1.)
- Running cost close to zero at launch.

## Non-goals (v1)

- Heroes, Teammates and Trends pages (exist in the current panel; later versions).
- Hero / position / game mode / lobby / party / result filters (later).
- User accounts, login, cross-device sync, cloud-stored match data (later, likely the paid tier).
- Ads, payments.
- Chinese UI (later; English first).

## Anti-goals

- **Never store a user's STRATZ token on our servers** (no database, no logs). Leaking someone's private match history would kill trust in the product.
- **No device fingerprinting** to recognize users. Privacy-hostile, blocked by browsers, and a GDPR problem.
- Do not become a general-purpose open proxy to STRATZ.

## Architecture (decided)

"Local-first": almost everything runs in the visitor's browser; the server is a thin, stateless relay.

- **Next.js (App Router) + TypeScript, deployed on Vercel.** User's choice.
- **Pages are client components.** They read IndexedDB and call OpenDota directly from the browser. OpenDota allows CORS, so each visitor's requests come from their own IP and count against their own rate limit rather than a shared server quota.
- **STRATZ goes through a Next.js Route Handler**, because STRATZ requires the `User-Agent: STRATZ_API` header, which browsers are not allowed to set (verified by `tools/stratz-probe.mjs`). The handler adds the header and the token, forwards to `https://api.stratz.com/graphql`, and returns the response. It stores nothing.

### Where data lives (decided)

| What | Where | Why |
|---|---|---|
| STRATZ tokens | **Encrypted ("sealed") HttpOnly, Secure, SameSite=Strict cookie**, one per account, scoped to `Path=/api`. The server encrypts the token with a secret kept in a Vercel environment variable before setting the cookie, and decrypts it when relaying. | Page JavaScript (including future ad scripts or injected scripts) cannot read it; a leaked cookie is useless without the server secret; our server never stores the token. |
| Account list, selection, settings | localStorage | Small; only needed in this browser. |
| Match data | IndexedDB | Large; localStorage is ~5 MB per origin. |

### Token flow

1. User pastes a STRATZ token on the account settings screen.
2. Browser POSTs it to `/api/stratz/token` with the account ID. The handler checks the token works (one small STRATZ call), then responds with `Set-Cookie: stratz_<accountId>=<token>; HttpOnly; Secure; SameSite=Strict; Path=/api`. Never logged.
3. `GET /api/stratz/accounts` returns which account IDs have a token cookie (the page cannot read the cookies itself).
4. `POST /api/stratz/graphql?account=<id>` reads that account's cookie and forwards.
5. `DELETE /api/stratz/token?account=<id>` clears the cookie (remove token / remove account).

Guards on the relay:
- Accept only POST with `Content-Type: application/json` (with SameSite=Strict this blocks cross-site use).
- **Allowlist the queries**: the client sends a query name (e.g. `playerMatches`, `matchDetail`) plus variables; the server holds the GraphQL text. This keeps the relay from being a generic STRATZ proxy.
- Body size limit; retry on STRATZ 429 with backoff as the current proxy does.
- Rate limiting (my call): there is no server-owned STRATZ token, so the relay only ever spends the caller's own token quota. v1 therefore needs no shared store: pace requests on the client (~4 req/s per token, like the current proxy) plus a best-effort per-instance limit in the handler. Add a shared counter (e.g. Upstash free tier, IP counters only, never tokens) only if abuse of Vercel invocations shows up.

Cookie lifetime (my call): persistent, `Max-Age` 400 days (the browser maximum), matching the user's original idea of keeping tokens in localStorage. Removed by "remove token" / "remove account". When STRATZ answers 401/403 for an account, mark its token as expired in the UI and ask the user to paste a new one.

Note: an account whose cookie holds a token does not need to be "proven" as the user's. The token itself only unlocks private data for the account it was generated with. Public accounts are public anyway.

### Storage tiers in IndexedDB (decided by the user)

Three tiers per account:
- **Lifetime minimal records** for **every match the account ever played**: match ID, start time, win/loss (and nothing else). Tens of bytes each, so even 10,000 matches is well under 1 MB. They power the **Activity** page (calendar heatmap, weekday × hour heatmap and "Nth game of the day" all need only start time + result), which can therefore cover the account's whole history, not just one year. For OpenDota this is one cheap call using the `project` parameter (e.g. `project=start_time&project=radiant_win&project=player_slot`); for STRATZ it means paging through the full history on first load (show progress).
- **Match summaries** (time, hero, result, K/D/A, GPM, position, party, mode…, the row shape the current panel already builds) for **the last 365 days**. They power **Overview** and the **Matches** list, so the time-range filter for those pages goes back at most one year. Older summaries are dropped.
- **Match details** (all 10 players, items, graphs) cached for matches from **the last 3 months**; older details are dropped. A match outside that window is fetched on click and not kept.
- Cache freshness and incremental refresh work as today: no refetch within 6 hours; "Refresh" fetches only new matches.

### Security headers

Content Security Policy set in `next.config` headers (or middleware), roughly:
- `script-src 'self'` (plus whatever Next.js needs, e.g. nonces)
- `connect-src 'self' https://api.opendota.com`
- `img-src 'self' https://cdn.cloudflare.steamstatic.com` (hero/item images)
- `frame-ancestors 'none'`
Ads, when added later, go in sandboxed iframes and get their own CSP entries then.

## Libraries (my call; the user is not a frontend developer and asked for the simplest, most conventional choices)

Guiding rule: as few libraries and concepts as possible, each a mainstream default with plenty of docs and examples. Don't add a library unless a v1 feature needs it.

- **Tailwind CSS + shadcn/ui** for styling and ready-made components (buttons, dialogs, tables, tabs), with dark mode.
- **ECharts** (via `echarts-for-react`) for every chart: one library covers the calendar heatmap, weekday × hour heatmap, bar/line charts and the gold/XP graphs. Import only the chart types used, and load it only on pages with charts.
- **Dexie + `useLiveQuery`** for IndexedDB: Dexie is the source of truth for stored data. The UI reads straight from it and re-renders by itself when new matches are written (also across open tabs).
- **TanStack Query for network requests only** (sync jobs, opening a match detail): loading/error state, de-duplication, retry with backoff on 429. Its in-memory cache is not the persistence layer; anything kept goes into Dexie.
- **Sync is user-driven, never a background timer:** it runs when the page opens and the cache is older than 6 hours, or when the user clicks "Refresh".
- **`iron-session`** (or equivalent AES-GCM sealing) for the token cookie; see below.

## Reuse from the existing panel

`index.html` is the reference implementation and should keep working until the new app matches it. Port, don't reinvent:
- Account ID parsing (Steam64 → Steam32 via `76561197960265728`).
- OpenDota calls: `/heroes`, `/constants/items`, `/players/{id}`, `/players/{id}/matches`, `/matches/{id}`.
- STRATZ queries `Q_MATCHES` and `Q_MATCH`, and `stratzToRaw` / `stratzDetail`, which convert STRATZ responses into the same shape as OpenDota rows so the views don't care where data came from.
- Position estimate from lane + farm for OpenDota rows (exact position from STRATZ).
- Optional OpenDota API key setting.

## Phases (decided)

- **Phase 1:** OpenDota only. OpenDota needs no token and allows CORS, so phase 1 needs no server code at all: three views, account management, the storage tiers, CSP.
- **Phase 2:** private accounts via STRATZ (token cookie, relay, token UI). STRATZ requires a token even for public accounts, which is another reason it waits. Starts only after the STRATZ terms check below.

## Open source and user trust (decided)

The code is public on GitHub (user agreed). License: MIT (my call). Never commit tokens or secrets: keep `tools/stratz-tokens.json` and `.env*` in `.gitignore`.

Trust measures for phase 2, so users believe we don't abuse their token:
- A plain-language privacy page: what is stored, where, who can see it. The site footer links to the repo and shows the deployed commit.
- The relay code is small and easy to audit: no storage, no logging, only the allowlisted queries.
- State clearly what a STRATZ token can and cannot do (confirm with STRATZ first: read-only data access, no Steam login or account changes) and how to revoke it on STRATZ.
- "Remove token" button; the token is optional; public accounts never need one.
- No ads or third-party scripts on the token entry screen.

## Constraints and known risks

- **STRATZ terms of use** (checked 2026-10-23 on https://stratz.com/api): nothing explicitly forbids a site relaying a user's own token, but nothing explicitly allows it either. Default Tokens are described as for "casual users, personal projects"; the tier meant for web apps is the Individual Token (application + 1,000 referrals/month); per-user tokens for many users are the Multi-Token (application + 5,000 referrals/month, aimed at desktop apps). Every request must send `User-Agent: STRATZ_API`; Default Token limits are 20/s, 250/min, 2,000/h, 10,000/day. Apps that violate the Steam Subscriber Agreement or harm Dota 2's integrity can lose access. A site-owned token cannot unlock users' private matches, so phase 2 needs users' own tokens either way. Before phase 2: ask STRATZ (Discord) whether this use is allowed or which token type they want, and add "Powered by STRATZ" links back to stratz.com. Build in two phases (my call): **phase 1** ships an OpenDota-only app (all three views, account management, storage tiers); **phase 2** adds the STRATZ token flow and relay, started only after the terms check. If the terms say no, phase 2 is rethought with the user before any work.
- **Vercel Hobby plan is non-commercial only.** Fine for an ad-free v1; moving to Pro (~$20/month) or another host is required before ads or payments.
- **Rate limits:** OpenDota free tier ~60 requests/min per IP (per visitor, since calls are client-side). STRATZ limits are per token; the relay should pace like the current proxy (~4 req/s) and back off on 429.
- **Smurf positioning:** Valve bans smurf accounts in Dota 2. Market it as "track all your accounts", not as a smurfing tool.
- First load for a new account pulls a full year of history; show progress.

## Left to the builder

- Folder layout. Suggested: a new Next.js app in `web/` in this folder, leaving `index.html` and `tools/` as they are.
- Routes, component breakdown, exact UI layout (follow the current panel's information layout).
- Exact CSP string, rate-limit implementation, test setup.
- How "time range" filter options are presented.
