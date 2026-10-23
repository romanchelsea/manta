# Phase 1: OpenDota Multi-Account Web App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public English website that combines the match data of several Dota 2 accounts from OpenDota into three views: Overview, Matches (with match details) and Activity. All data is stored locally in the visitor's browser.

**Architecture:** A Next.js App Router app in `web/`, deployed on Vercel. Every page is a client component. The browser calls OpenDota directly, which allows cross-origin requests, so phase 1 has no server code. A sync engine writes three tiers of data into IndexedDB through Dexie:
- lifetime minimal records;
- match summaries for the last 365 days;
- match details for the last 90 days.

The UI reads those tables with `useLiveQuery`. TanStack Query handles network jobs: running a sync and loading a match detail.

**Tech Stack:** Next.js (App Router) + TypeScript, Tailwind CSS + shadcn/ui, Dexie + dexie-react-hooks, TanStack Query, ECharts via echarts-for-react, and Vitest + Testing Library + fake-indexeddb.

**Spec:** `docs/superpowers/specs/2026-10-23-hosted-multi-account-web-app-design.md`. The existing `index.html` is the reference implementation of every computation ported here.

## Global Constraints

- The UI is in English only.
- Phase 1 talks only to OpenDota (`https://api.opendota.com/api`). No STRATZ code, no Route Handlers and no server-side storage.
- Sync runs only on page open (when the account was last synced more than **6 hours** ago) and on the "Refresh" button. It never runs on a background timer.
- Storage tiers:
  - lifetime records (match ID, start time, duration, win);
  - summaries for the last **365 days**;
  - details for the last **90 days**. The spec says "3 months"; 90 days is my call.
- The Overview and Matches time filter reaches back at most 365 days. The Activity page can show the whole history.
- v1 filters are only the time range and the account selection.
- OpenDota client: at most **3** concurrent requests. On HTTP 429 it retries up to **4** times, waiting `1500 ms × (attempt + 1)` before each retry. An optional OpenDota API key, entered in Settings, is sent as the `api_key` query parameter.
- Settings (account list, selected accounts, API key) live in localStorage. Match data lives in IndexedDB. Nothing is sent anywhere except OpenDota.
- Images come only from `https://cdn.cloudflare.steamstatic.com` (heroes and items) and `https://avatars.steamstatic.com` (avatars).
- The repo is public under the MIT license. Never commit secrets. `.gitignore` covers `.env*`, `node_modules`, `.next`, `tools/stratz-tokens.json` and `stratz-probe-output.json`.
- Keep the library count minimal. Add nothing beyond the Tech Stack line without a v1 feature that needs it.
- `index.html` and `tools/` stay untouched.

## Review Focus

1. **An account with no public data** (OpenDota returns no `profile`, or no matches at all) must show a clear message on that account, with no spinner that never ends and no crash. This is tested in Task 5 (`private account`) and Task 8 (`shows private message`).
2. **OpenDota rate limit or network failure during a sync** must not lose data. Retries happen first. After that the account shows an error, the cached data stays visible, and the next page open tries again. This is tested in Task 3 (`retries 429`, `gives up`) and Task 5 (`failed sync keeps data`).
3. **The same account entered twice in different forms** (Steam64 ID, Steam32 ID, profile URL) must appear only once. A vanity URL (`/id/<name>`) is rejected with a message, never silently dropped. This is tested in Task 2 and Task 8 (`dedupes accounts`).
4. **Old or unparsed matches with missing fields** (`gold_per_min`, `lane_role` or `party_size` is null) must not produce NaN. Averages skip nulls, the position becomes "Unknown" and the party status becomes "Unknown". This is tested in Task 4 and Task 6.
5. **Matches played around midnight** must be grouped by the visitor's local day, not by the UTC day. This affects the calendar, the "Nth game of the day" chart and the weekday × hour grid. Tests run with `TZ=Asia/Shanghai`. This is tested in Task 7.

---

### Task 1: Repository and app scaffold

**Files:**
- Create: `.gitignore` (modify the existing one), `LICENSE`, `web/` (generated), `web/vitest.config.ts`, `web/src/test/setup.ts`, `web/src/lib/smoke.test.ts`

**Interfaces:**
- Produces: `npm test` (Vitest, jsdom, `TZ=Asia/Shanghai`, fake-indexeddb auto-loaded) and `npm run build` in `web/`; the `@/*` import alias pointing at `web/src/*`.

- [ ] **Step 1: Initialize git at the repo root.** Run `git init -b main`. Add `.env*`, `node_modules/` and `.next/` to the existing `.gitignore`, which keeps its two current lines. Add an MIT `LICENSE` with the copyright holder "dota2-multi-account-panel contributors" and the year 2026. Commit the existing files with the message `chore: initial import of single-file panel and design docs`.
- [ ] **Step 2: Scaffold the app.** From the repo root, run `npx create-next-app@latest web`. Choose TypeScript, ESLint, Tailwind, App Router, `src/` directory, import alias `@/*` and npm. Then, in `web/`, run `npx shadcn@latest init` with the defaults.
- [ ] **Step 3: Install dependencies.** Run `npm i dexie dexie-react-hooks @tanstack/react-query echarts echarts-for-react` and `npm i -D vitest @vitejs/plugin-react vite-tsconfig-paths jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event fake-indexeddb`.
- [ ] **Step 4: Configure Vitest.**
  - In `web/vitest.config.ts`: set `process.env.TZ = 'Asia/Shanghai'` at the very top of the file, use the plugins `react()` and `tsconfigPaths()`, and set `test: { environment: 'jsdom', setupFiles: ['./src/test/setup.ts'] }`.
  - `src/test/setup.ts` imports `@testing-library/jest-dom/vitest` and `fake-indexeddb/auto`, and clears `localStorage` in `afterEach`.
  - Add the script `"test": "vitest run"` to `package.json`.
- [ ] **Step 5: Write a smoke test.** In `src/lib/smoke.test.ts`, assert `new Date(Date.UTC(2026, 2, 2, 16, 30)).getDate() === 3`. This proves the TZ setting works.
- [ ] **Step 6: Verify.** `cd web && npm test` should pass with 1 test, and `npm run build` should succeed.
- [ ] **Step 7: Commit** with the message `chore: scaffold Next.js app in web/ with Tailwind, shadcn/ui and Vitest`.

---

### Task 2: Account IDs, types and Dota constants

**Files:**
- Create: `web/src/lib/types.ts`, `web/src/lib/ids.ts`, `web/src/lib/dota.ts`
- Test: `web/src/lib/ids.test.ts`, `web/src/lib/dota.test.ts`

**Interfaces:**
- Produces:
  - In `types.ts`:
    ```ts
    export type AccountId = string;            // Steam32 account id as decimal string
    export type Position = 0 | 1 | 2 | 3 | 4 | 5;  // 0 = unknown
    export interface MatchRecord { key: string; accountId: AccountId; matchId: number; startTime: number; duration: number; win: boolean } // key = `${accountId}:${matchId}`, times in unix seconds
    export interface MatchSummary extends MatchRecord { heroId: number; kills: number; deaths: number; assists: number; gameMode: number; lobbyType: number; partySize: number | null; position: Position; gpm: number | null; xpm: number | null; lastHits: number | null; heroDamage: number | null; towerDamage: number | null }
    export interface PlayerDetail { accountId: number | null; name: string | null; rankTier: number | null; heroId: number; isRadiant: boolean; level: number | null; kills: number; deaths: number; assists: number; lastHits: number | null; denies: number | null; gpm: number | null; xpm: number | null; netWorth: number | null; heroDamage: number | null; towerDamage: number | null; heroHealing: number | null; items: number[]; neutralItem: number | null } // items: 6 slots, 0 = empty
    export interface MatchDetail { matchId: number; startTime: number; duration: number; radiantWin: boolean; gameMode: number; lobbyType: number; radiantScore: number; direScore: number; radiantGoldAdv: number[] | null; radiantXpAdv: number[] | null; players: PlayerDetail[] }
    export interface AccountProfile { accountId: AccountId; name: string | null; avatar: string | null; rankTier: number | null }
    export interface HeroInfo { id: number; name: string; short: string }   // short = npc name without "npc_dota_hero_"
    export interface ItemInfo { id: number; name: string; img: string }      // img = CDN path from OpenDota constants
    ```
  - In `ids.ts`: `parseAccountId(input: string): AccountId | null`.
  - In `dota.ts`: `MODE_NAMES: Record<number, string>`, `LOBBY_NAMES: Record<number, string>`, `POSITION_NAMES: Record<Position, string>`, `rankName(rankTier: number | null | undefined): string`, `heroImageUrl(short: string): string`, `itemImageUrl(img: string): string`, `kda(k: number, d: number, a: number): number`.

- [ ] **Step 1: Write the failing tests.**

```ts
// ids.test.ts
test.each([
  ['76561198000000000', '39734272'],
  ['https://steamcommunity.com/profiles/76561198000000000/', '39734272'],
  ['https://www.opendota.com/players/123456789', '123456789'],
  ['  39734272 ', '39734272'],
])('parseAccountId(%s)', (input, out) => expect(parseAccountId(input)).toBe(out));
test.each(['12345', 'abc', '', 'https://steamcommunity.com/id/somename'])('rejects %s', i => expect(parseAccountId(i)).toBeNull());

// dota.test.ts
expect(rankName(null)).toBe('Unranked');
expect(rankName(45)).toBe('Legend 5');
expect(rankName(80)).toBe('Immortal');
expect(rankName(81)).toBe('Immortal');
expect(POSITION_NAMES[0]).toBe('Unknown');
expect(POSITION_NAMES[1]).toBe('Pos 1 · Carry');
expect(heroImageUrl('antimage')).toBe('https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/antimage.png');
expect(itemImageUrl('/apps/dota2/images/dota_react/items/blink.png?t=1')).toBe('https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/items/blink.png?t=1');
expect(kda(10, 0, 5)).toBe(15);
expect(MODE_NAMES[22]).toBe('All Pick');
expect(LOBBY_NAMES[7]).toBe('Ranked');
```

- [ ] **Step 2: Run the tests to verify they fail.** Run `npx vitest run src/lib/ids.test.ts src/lib/dota.test.ts`. Expected: FAIL (module not found).
- [ ] **Step 3: Implement the module.**
  - `parseAccountId`: take the first run of 6–17 digits. If it is above `76561197960265728n`, subtract that value (use BigInt). Return `null` when there is no such run. A `/id/<vanity>` URL contains no digit run, so it yields `null`.
  - `rankName`: medals `['', 'Herald', 'Guardian', 'Crusader', 'Archon', 'Legend', 'Ancient', 'Divine', 'Immortal']`. Format `"<Medal> <star>"`. Immortal (tier 8) never shows a star. A missing or zero tier is `'Unranked'`.
  - `POSITION_NAMES`: 1 `Pos 1 · Carry`, 2 `Pos 2 · Mid`, 3 `Pos 3 · Offlane`, 4 `Pos 4 · Soft Support`, 5 `Pos 5 · Hard Support`, 0 `Unknown`.
  - `MODE_NAMES` and `LOBBY_NAMES`: English versions of `MODE_ZH` and `LOBBY_ZH` in `index.html:261-266`, using the same ids.
  - `kda`: `(k + a) / Math.max(1, d)`.
- [ ] **Step 4: Run the tests to verify they pass.** Same command. Expected: PASS.
- [ ] **Step 5: Commit** with the message `feat: account id parsing, shared types and Dota constants`.

---

### Task 3: OpenDota client

**Files:**
- Create: `web/src/lib/opendota.ts`
- Test: `web/src/lib/opendota.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type Params = Record<string, string | number | (string | number)[] | undefined>;
  export interface OpenDotaClient { get<T>(path: string, params?: Params): Promise<T> }
  export class OpenDotaError extends Error { constructor(public status: number, message: string) }
  export function createOpenDotaClient(opts?: { apiKey?: string; fetch?: typeof fetch; maxConcurrent?: number; retryDelayMs?: number; maxRetries?: number }): OpenDotaClient
  export const RATE_LIMIT_MESSAGE = 'OpenDota rate limit reached. Try again in a minute, or add an OpenDota API key in Settings.';
  ```
  The defaults are `maxConcurrent` 3, `retryDelayMs` 1500 and `maxRetries` 4.

- [ ] **Step 1: Write the failing tests.** Use a `vi.fn()` fetch and `retryDelayMs: 1`.
  - `builds url`: `get('/players/1/matches', { project: ['a', 'b'], date: 3, x: undefined })` with `apiKey: 'K'` requests `https://api.opendota.com/api/players/1/matches?project=a&project=b&date=3&api_key=K`.
  - `retries 429`: the mock returns 429, 429, then 200 `{ok: 1}`. The call resolves to `{ok: 1}` after 3 fetches.
  - `gives up`: the mock always returns 429. The call rejects with `OpenDotaError` with status 429 and the message `RATE_LIMIT_MESSAGE` after 5 fetches.
  - `non-429 error`: a 500 response rejects immediately with status 500 after 1 fetch.
  - `concurrency`: start 5 calls against a fetch that resolves only when released. At most 3 are pending at once.
  - `dedupes`: two simultaneous `get` calls with the same URL make 1 fetch.
- [ ] **Step 2: Run the tests to verify they fail.** Run `npx vitest run src/lib/opendota.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement `createOpenDotaClient`.** Port `limited`/`pump`/`api` from `index.html:317-355`. Keep the in-flight memo only until the promise settles; persistence is Dexie's job.
- [ ] **Step 4: Run the tests to verify they pass.** Expected: PASS.
- [ ] **Step 5: Commit** with the message `feat: OpenDota client with concurrency limit and 429 retry`.

---

### Task 4: Normalizing OpenDota responses

**Files:**
- Create: `web/src/lib/normalize.ts`
- Test: `web/src/lib/normalize.test.ts`

**Interfaces:**
- Consumes: the types from Task 2.
- Produces:
  ```ts
  export interface OdPlayerMatch { match_id: number; player_slot: number; radiant_win: boolean; start_time: number; duration: number; hero_id?: number; kills?: number; deaths?: number; assists?: number; game_mode?: number; lobby_type?: number; party_size?: number | null; lane_role?: number | null; is_roaming?: boolean | null; gold_per_min?: number | null; xp_per_min?: number | null; last_hits?: number | null; hero_damage?: number | null; tower_damage?: number | null }
  export const RECORD_FIELDS = ['match_id', 'player_slot', 'radiant_win', 'start_time', 'duration'];
  export const SUMMARY_FIELDS: string[]; // RECORD_FIELDS + hero_id kills deaths assists game_mode lobby_type party_size lane_role is_roaming gold_per_min xp_per_min last_hits hero_damage tower_damage
  export function estimatePosition(m: OdPlayerMatch): Position
  export function toRecord(m: OdPlayerMatch, accountId: AccountId): MatchRecord
  export function toSummary(m: OdPlayerMatch, accountId: AccountId): MatchSummary
  export function toDetail(raw: any): MatchDetail      // raw = OpenDota /matches/{id}
  export function toProfile(raw: any, accountId: AccountId): AccountProfile | null // null when raw.profile is missing
  export function toHeroes(raw: any[]): Record<number, HeroInfo>
  export function toItems(raw: Record<string, any>): Record<number, ItemInfo>
  ```
  `toRecord` sets `win` to `(player_slot < 128) === radiant_win`.

- [ ] **Step 1: Write the failing tests.**
  - `estimatePosition` uses `duration: 2400`, so `last_hits: 200` gives a core and `last_hits: 40` gives a support:
    - `lane_role` null gives 0;
    - `is_roaming: true` with `lane_role: 1` gives 4;
    - `lane_role: 1` gives 1 for the core and 5 for the support;
    - `lane_role: 2` gives 2;
    - `lane_role: 3` gives 3 for the core and 4 for the support;
    - `lane_role: 4` gives 1 for the core and 4 for the support.
  - `toRecord`: `player_slot: 5` with `radiant_win: true` gives `win: true`. `player_slot: 130` with `radiant_win: true` gives `win: false`. The key is `'42:7001'` for account `'42'` and match `7001`.
  - `toSummary` with `gold_per_min`, `party_size` and `lane_role` all null gives `gpm: null`, `partySize: null` and `position: 0`. Kills, deaths and assists default to 0 when missing.
  - `toDetail` with a minimal OpenDota match (2 players: slot 0 and slot 128, `radiant_gold_adv: [0, 100]`) maps `isRadiant` from `player_slot < 128`. `items` is `[item_0..item_5]`. `radiantScore` comes from `radiant_score`. A missing `radiant_gold_adv` gives `null`.
  - `toProfile({ profile: { personaname: 'A', avatarfull: 'u' }, rank_tier: 45 }, '1')` gives `{ accountId: '1', name: 'A', avatar: 'u', rankTier: 45 }`. `toProfile({}, '1')` gives `null`.
  - `toHeroes([{ id: 1, localized_name: 'Anti-Mage', name: 'npc_dota_hero_antimage' }])[1].short` is `'antimage'`.
- [ ] **Step 2: Run the tests to verify they fail.** Run `npx vitest run src/lib/normalize.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement the module.** Port `estPos` from `index.html:382-395`; it treats a lane as core when `last_hits / max(1, duration/60) >= 3`. `toItems` keeps entries that have a numeric `id` (`index.html:521`).
- [ ] **Step 4: Run the tests to verify they pass.** Expected: PASS.
- [ ] **Step 5: Commit** with the message `feat: normalize OpenDota matches, details, profiles and constants`.

---

### Task 5: Local database and sync engine

**Files:**
- Create: `web/src/lib/db.ts`, `web/src/lib/sync.ts`
- Test: `web/src/lib/sync.test.ts`

**Interfaces:**
- Consumes: `OpenDotaClient` and `OpenDotaError` (Task 3); `toRecord`, `toSummary`, `toProfile`, `toHeroes`, `toItems`, `RECORD_FIELDS` and `SUMMARY_FIELDS` (Task 4).
- Produces:
  ```ts
  // db.ts
  export interface SyncState { accountId: AccountId; lastSyncAt: number /* ms, 0 = never */; status: 'ok' | 'private' | 'error'; error?: string; profile: AccountProfile | null }
  export interface StoredDetail extends MatchDetail { fetchedAt: number }
  export class D2Db extends Dexie { records: Table<MatchRecord, string>; summaries: Table<MatchSummary, string>; details: Table<StoredDetail, number>; syncState: Table<SyncState, string>; constants: Table<{ key: 'heroes' | 'items'; data: unknown; fetchedAt: number }, string> }
  // stores: records & summaries 'key, accountId, startTime, [accountId+startTime]'; details 'matchId, startTime'; syncState 'accountId'; constants 'key'
  export function createDb(name?: string): D2Db   // default name 'd2web'
  export const db: D2Db
  // sync.ts
  export const SYNC_TTL_MS = 6 * 3600 * 1000, SUMMARY_DAYS = 365, DETAIL_DAYS = 90, DAY = 86400;
  export const PRIVATE_MESSAGE = 'No public match data. This account may have "Expose Public Match Data" turned off in Dota 2. Private accounts are coming in a later version.';
  export type SyncStage = 'profile' | 'records' | 'summaries' | 'done';
  export async function syncAccount(accountId: AccountId, deps: { client: OpenDotaClient; db: D2Db; now?: () => number; force?: boolean; onStage?: (s: SyncStage) => void }): Promise<SyncState>
  export async function removeAccountData(db: D2Db, accountId: AccountId): Promise<void>
  export async function loadConstants(deps: { client: OpenDotaClient; db: D2Db; now?: () => number }): Promise<{ heroes: Record<number, HeroInfo>; items: Record<number, ItemInfo> }> // refetch when older than 7 days
  ```
  The sync order is:
  1. Skip if fresh: when not forced, `status === 'ok'` and `now - lastSyncAt < SYNC_TTL_MS`, return the stored state and make no calls.
  2. Load the profile with `GET /players/{id}`. A missing profile means `status: 'private'`.
  3. Load lifetime records with `GET /players/{id}/matches`, `significant=0`, `project=RECORD_FIELDS`, plus `date=ceil((nowSec - newestRecord.startTime)/DAY)+1` once records exist.
  4. Load summaries with the same endpoint and `project=SUMMARY_FIELDS`, `date=min(365, ceil((nowSec - newestSummary.startTime)/DAY)+1)`, or `365` when there are none yet.
  5. Upsert everything with `bulkPut`.
  6. Prune summaries with `startTime < nowSec - 365*DAY` and details with `startTime < nowSec - 90*DAY`.
  7. Save `status: 'ok'`.

  An account that ends with zero records also gets `status: 'private'` and `PRIVATE_MESSAGE`. If a call throws, save `status: 'error'` with the error message, keep the previous `lastSyncAt` and leave all stored rows untouched.

- [ ] **Step 1: Write the failing tests.** Use `createDb('test-' + crypto.randomUUID())`, a fixed `now` and a fake client keyed by path and params.
  - `first sync`: the records call has no `date` and includes `project` `duration`. The summaries call has `date=365`. The rows are stored, `status` is `'ok'` and `lastSyncAt` equals `now()`.
  - `fresh skip`: a second sync 1 hour later without `force` makes 0 client calls.
  - `incremental`: with the newest record 2 days old and the sync 7 hours later, the records call gets `date=3`.
  - `prune`: a summary 400 days old is deleted, a detail 100 days old is deleted and a detail 30 days old is kept.
  - `private account`: when the profile response is `{}`, the status is `'private'`, the error is `PRIVATE_MESSAGE` and the call resolves (no throw).
  - `failed sync keeps data`: with existing rows, the summaries call rejects with `new OpenDotaError(429, RATE_LIMIT_MESSAGE)`. The status is `'error'`, the error is `RATE_LIMIT_MESSAGE`, `lastSyncAt` is unchanged and the row count is unchanged.
  - `removeAccountData`: deletes that account's records, summaries and syncState, and leaves the other accounts alone.
- [ ] **Step 2: Run the tests to verify they fail.** Run `npx vitest run src/lib/sync.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement `db.ts` and `sync.ts`** as specified above.
- [ ] **Step 4: Run the tests to verify they pass.** Expected: PASS.
- [ ] **Step 5: Commit** with the message `feat: Dexie storage tiers and incremental OpenDota sync`.

---

### Task 6: Overview statistics and time filter

**Files:**
- Create: `web/src/lib/stats.ts`, `web/src/lib/filters.ts`
- Test: `web/src/lib/stats.test.ts`, `web/src/lib/filters.test.ts`

**Interfaces:**
- Consumes: `MatchSummary`, `kda` and `DAY`.
- Produces:
  ```ts
  // stats.ts
  export interface Summary { games: number; wins: number; winRate: number; kda: number; avgKills: number; avgDeaths: number; avgAssists: number; avgGpm: number | null; avgXpm: number | null; avgDuration: number }
  export function summarize(rows: MatchSummary[]): Summary
  export function groupBy<T, K>(rows: T[], fn: (r: T) => K): Map<K, T[]>
  export function positionBreakdown(rows: MatchSummary[]): { position: Position; summary: Summary }[]  // order 1,2,3,4,5,0; only positions present
  export function partyBreakdown(rows: MatchSummary[]): { solo: Summary; party: Summary; unknown: Summary }
  export function topHeroes(rows: MatchSummary[], limit?: number): { heroId: number; summary: Summary }[] // default 12; games desc, then heroId asc
  export function perAccount(rows: MatchSummary[], accountIds: AccountId[]): { accountId: AccountId; summary: Summary; topHero: { heroId: number; games: number }; lastPlayed: number }[] // order of accountIds, accounts without rows skipped
  // filters.ts
  export type TimeRange = { kind: 'preset'; days: 7 | 30 | 90 | 180 | 365 } | { kind: 'custom'; from: string; to: string } // YYYY-MM-DD, local dates
  export const DEFAULT_RANGE: TimeRange = { kind: 'preset', days: 365 };
  export function timeBounds(range: TimeRange, nowSec: number): [number, number]
  export function filterRows<T extends { accountId: AccountId; startTime: number }>(rows: T[], f: { selected: Set<AccountId>; from: number; to: number }): T[] // startTime desc
  ```

- [ ] **Step 1: Write the failing tests.**
  - `summarize` on two rows (`10/2/5` win with gpm 600, xpm 500; `2/8/10` loss with gpm null, xpm null) gives games 2, wins 1, winRate 0.5, kda 2.7, avgGpm 600 and avgXpm 500 (the nulls are skipped). An empty input gives games 0, winRate 0 and avgGpm null.
  - `positionBreakdown` on rows with positions [2, 0, 1, 2] gives the order [1, 2, 0], and position 2 has 2 games.
  - `partyBreakdown`: partySize 1 is solo, 3 is party and null is unknown.
  - `topHeroes`: ties are ordered by heroId ascending, and `limit` is respected.
  - `perAccount(rows, ['b', 'a', 'c'])`, where c has no rows, gives the order b, a. `lastPlayed` is the max startTime.
  - `timeBounds({kind:'preset', days:30}, now)` gives `[now - 30*86400, now + 86400]`.
  - A custom range `from '2000-01-01'` is clamped to `now - 365*86400`. `to '2026-03-02'` ends at local `2026-03-02T23:59:59`.
  - `filterRows` drops unselected accounts and rows outside the bounds, and sorts by startTime descending.
- [ ] **Step 2: Run the tests to verify they fail.** Run `npx vitest run src/lib/stats.test.ts src/lib/filters.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement the modules.** Port `summarize`, `groupBy` and `timeBounds` from `index.html:597-654`.
- [ ] **Step 4: Run the tests to verify they pass.** Expected: PASS.
- [ ] **Step 5: Commit** with the message `feat: overview statistics and time range filter`.

---

### Task 7: Activity computations

**Files:**
- Create: `web/src/lib/activity.ts`
- Test: `web/src/lib/activity.test.ts`

**Interfaces:**
- Consumes: `MatchRecord`.
- Produces:
  ```ts
  export type ActivityWindow = { kind: 'last12' } | { kind: 'year'; year: number } | { kind: 'all' };
  export function windowBounds(w: ActivityWindow, now: Date): [number, number]   // unix seconds; 'all' = [0, now]
  export function calendarEnd(w: ActivityWindow, now: Date): Date                 // 'year' → Dec 31 of that year (or today if current year); else today
  export function availableYears(records: MatchRecord[]): number[]                // local years with data, desc
  export interface CalendarDay { date: string /* YYYY-MM-DD local */; week: number; weekday: number /* Mon=0 */; games: number; wins: number }
  export function calendar(records: MatchRecord[], end: Date): { weeks: number; days: CalendarDay[] } // 52 full weeks + the week containing `end`, starting on a Monday
  export function weekdayHourGrid(records: MatchRecord[]): { games: number; wins: number }[][]       // [7][24], Mon=0, local time
  export function nthGameOfDay(records: MatchRecord[]): { n: number; games: number; wins: number }[]  // n = 1..8, 8 means "8+"; per account per local day, by startTime asc
  export function activityKpis(records: MatchRecord[]): { activeDays: number; gamesPerActiveDay: number; gamesPerWeek: number; totalSeconds: number }
  ```

- [ ] **Step 1: Write the failing tests.** They run under `TZ=Asia/Shanghai`. Let `a = Date.UTC(2026,2,2,15,30)/1000`, which is local Mon 2026-03-02 23:30, and `b = Date.UTC(2026,2,2,16,30)/1000`, which is local Tue 2026-03-03 00:30.
  - `nthGameOfDay` for account `'1'` with matches at a and b gives n=1 with 2 games and n=2 with 0 games. A UTC-day implementation would wrongly produce n=2.
  - `nthGameOfDay` with three matches by account `'1'` on the same local day, plus one by account `'2'`, gives n=1 with 2 games, n=2 with 1 and n=3 with 1. Ten matches in one day put 3 games in bucket n=8.
  - `weekdayHourGrid`: match a lands at `[0][23]` and match b at `[1][0]`.
  - `calendar(records, new Date(2026,2,3))`: `days.length` is 366, `days[0].date` is `'2025-03-03'` with weekday 0, the last date is `'2026-03-03'` and `weeks` is 53.
  - `activityKpis` for a and b (each 1800 s long): activeDays 2, gamesPerActiveDay 1, totalSeconds 3600.
  - `windowBounds({kind:'year', year:2025}, now)` covers local 2025-01-01 00:00:00 through 2025-12-31 23:59:59.
  - `availableYears` returns the years in descending order.
- [ ] **Step 2: Run the tests to verify they fail.** Run `npx vitest run src/lib/activity.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement the module.** Port from `index.html:1100-1166`. All day and hour bucketing uses local `Date` getters. `gamesPerWeek` is `games / max(1, spanDays/7)`, where `spanDays = (newest - oldest)/DAY + 1`.
- [ ] **Step 4: Run the tests to verify they pass.** Expected: PASS.
- [ ] **Step 5: Commit** with the message `feat: activity calendar, weekday-hour grid and nth-game stats`.

---

### Task 8: App shell, settings, account management and sync UI

**Files:**
- Create:
  - `web/src/lib/settings.ts`
  - `web/src/app/providers.tsx`
  - `web/src/components/AppShell.tsx`
  - `web/src/components/AccountBar.tsx`
  - `web/src/components/AccountsDialog.tsx`
  - `web/src/components/TimeRangeSelect.tsx`
  - `web/src/hooks/useSync.ts`
  - `web/src/hooks/useData.ts`
- Modify: `web/src/app/layout.tsx`, `web/src/app/page.tsx` (temporary placeholder)
- Test: `web/src/lib/settings.test.ts`, `web/src/components/AccountsDialog.test.tsx`, `web/src/components/AccountBar.test.tsx`

**Interfaces:**
- Consumes: `parseAccountId`, `syncAccount`, `removeAccountData`, `loadConstants`, `db`, `createOpenDotaClient`, `SyncState`, `TimeRange`, `DEFAULT_RANGE`, `timeBounds` and `filterRows`.
- Produces:
  ```ts
  // settings.ts — localStorage keys 'd2web.accounts', 'd2web.selected', 'd2web.apiKey', 'd2web.range'
  export interface Settings { accounts: AccountId[]; selected: AccountId[]; apiKey: string; range: TimeRange }
  export function loadSettings(): Settings          // bad/missing JSON → defaults (empty lists, '', DEFAULT_RANGE)
  export function addAccounts(s: Settings, inputs: string[]): { settings: Settings; added: AccountId[]; invalid: string[] } // dedupes, new accounts selected
  export function useSettings(): { settings: Settings; update(next: Settings): void } // persists + notifies all subscribers
  // useSync.ts
  export function useSync(): { syncAll(force: boolean): Promise<void>; running: boolean; states: Record<AccountId, SyncState | undefined>; stage: Record<AccountId, SyncStage | undefined> }
  // useData.ts (all via useLiveQuery)
  export function useSummaries(): MatchSummary[]            // selected accounts within the current TimeRange, startTime desc
  export function useRecords(): MatchRecord[]               // selected accounts, all time
  export function useProfiles(): Record<AccountId, SyncState>
  export function useConstants(): { heroes: Record<number, HeroInfo>; items: Record<number, ItemInfo> } | undefined
  export function accountColor(index: number): string      // 8-color palette, cycles
  ```
  - **Layout.** `AppShell` holds the header and the page content. The header contains the site name "Dota 2 Multi-Account Tracker", the nav (Overview `/`, Matches `/matches`, Activity `/activity`), a `TimeRangeSelect` (presets 7/30/90/180/365 days plus custom dates), a "Refresh" button and a "Manage accounts" button that opens `AccountsDialog`. Below the header sits the `AccountBar`, then the page content.
  - **Account bar.** It shows one chip per account: color dot, avatar, name or ID, and rank. Clicking a chip toggles whether that account is selected. The chip shows a spinner and the current stage while that account syncs, and the error or `PRIVATE_MESSAGE` under it when there is one.
  - **Accounts dialog.** It has a textarea taking one ID or URL per line, an "Add" button, a list of accounts each with a "Remove" button, and an OpenDota API key field. Invalid lines are listed as `Could not read: <line>` with the hint `Use a Steam64 ID, Steam32 ID, or a steamcommunity.com/profiles/… / opendota.com/players/… link. Vanity URLs (/id/name) are not supported.` "Remove" calls `removeAccountData`.
  - **Sync triggers.** `syncAll(false)` runs on first mount and after accounts are added. "Refresh" calls `syncAll(true)`. `loadConstants` runs before the first sync.
  - **Empty states.** With no accounts the page shows `Add your Dota 2 accounts to get started.` and a button that opens the dialog. With accounts but none selected it shows `Select at least one account.`

- [ ] **Step 1: Write the failing tests.**
  - `settings.test.ts`, `dedupes accounts`: calling `addAccounts` with `['76561198000000000', '39734272', 'https://www.opendota.com/players/39734272', 'https://steamcommunity.com/id/x']` gives `added` = `['39734272']` and `invalid` = `['https://steamcommunity.com/id/x']`, and the new account is in `selected`. If localStorage holds `'not json'`, `loadSettings` returns the defaults.
  - `AccountsDialog.test.tsx`: typing two valid lines and one vanity URL, then clicking Add, shows the 2 accounts in the list and the `Could not read: …` line. Clicking Remove on one leaves 1 account. Mock `useSync` and `removeAccountData`.
  - `AccountBar.test.tsx`, `shows private message`: given a state `{ status: 'private', error: PRIVATE_MESSAGE }`, the chip shows that text. Clicking a chip toggles `aria-pressed`.
- [ ] **Step 2: Run the tests to verify they fail.** Run `npx vitest run src/lib/settings.test.ts src/components`. Expected: FAIL.
- [ ] **Step 3: Implement the settings, hooks and components.** Build the UI from shadcn/ui primitives (`button`, `dialog`, `textarea`, `input`, `select`, `badge`, `tooltip`), adding each with `npx shadcn@latest add <name>`. `providers.tsx` wraps the app in `QueryClientProvider`, and `useSync` drives `syncAll` through `useMutation`. The client is created with the API key from settings. Accounts sync one after another; the client limiter handles request concurrency.
- [ ] **Step 4: Run the tests to verify they pass.** Run `npm test`. Expected: all tests pass.
- [ ] **Step 5: Manual check.** Run `npm run dev` and add a real public account, for example `https://www.opendota.com/players/<any public id>`. The chip should show sync stages and then the name and rank. Reloading within 6 hours should make no OpenDota requests (check the DevTools Network tab).
- [ ] **Step 6: Commit** with the message `feat: app shell, account management and user-driven sync`.

---

### Task 9: Overview page

**Files:**
- Create: `web/src/components/overview/*` (KpiRow, AccountTable, PositionBars, PartyTable, RecentStrip, HeroGrid)
- Modify: `web/src/app/page.tsx`
- Test: `web/src/app/overview.test.tsx`

**Interfaces:**
- Consumes: `useSummaries`, `useProfiles`, `useConstants`, `useSettings`, `summarize`, `positionBreakdown`, `partyBreakdown`, `topHeroes`, `perAccount`, `rankName`, `heroImageUrl`, `POSITION_NAMES` and `accountColor`.
- Produces: the `/` route. The content mirrors `index.html:890-940`, translated to English:
  - KPIs: Matches, Win rate, W / L, KDA, Avg K/D/A, GPM, XPM, Avg duration, Heroes played.
  - A per-account table: Account, Rank, Matches, Win rate, KDA, GPM, Most played, Last played.
  - Position bars, with the note "Positions are estimated from lane and last hits; unparsed matches show as Unknown".
  - A Solo / Party / Unknown table.
  - A "Last 40 matches" W/L strip with tooltips.
  - Top 12 heroes. Hero cards are not clickable in v1.
  - With no matches in range it shows `No matches in this time range.`

- [ ] **Step 1: Write the failing test.** Seed `db` with 3 summaries for 2 selected accounts (2 wins, 1 loss) plus constants. Render the page inside providers and assert:
  - the text `66.7%` appears;
  - `2 / 1` appears;
  - both account names appear in the table;
  - a row whose `gpm` is null does not render `NaN` anywhere (`expect(container.textContent).not.toMatch(/NaN/)`).
- [ ] **Step 2: Run the test to verify it fails.** Run `npx vitest run src/app/overview.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement the page and its components.**
- [ ] **Step 4: Run the test to verify it passes.** Expected: PASS.
- [ ] **Step 5: Commit** with the message `feat: overview page`.

---

### Task 10: Matches page and match details

**Files:**
- Create: `web/src/app/matches/page.tsx`, `web/src/components/matches/MatchTable.tsx`, `web/src/components/matches/MatchDetailView.tsx`, `web/src/hooks/useMatchDetail.ts`, `web/src/components/charts/EChart.tsx`
- Test: `web/src/hooks/useMatchDetail.test.tsx`, `web/src/components/matches/MatchTable.test.tsx`

**Interfaces:**
- Consumes: `useSummaries`, `useConstants`, `useSettings`, `db`, `createOpenDotaClient`, `toDetail`, `DETAIL_DAYS`, `MODE_NAMES`, `LOBBY_NAMES`, `rankName`, `heroImageUrl` and `itemImageUrl`.
- Produces:
  ```ts
  export function useMatchDetail(matchId: number | null): { data?: MatchDetail; isLoading: boolean; error: Error | null }
  // queryKey ['match', matchId]; reads db.details first; otherwise GET /matches/{id} → toDetail; stores in db.details only if players.length > 0 AND startTime >= now - DETAIL_DAYS*DAY
  export function EChart(props: { option: echarts.EChartsCoreOption; height: number }): JSX.Element
  // loaded with next/dynamic { ssr: false }; registers only LineChart, HeatmapChart, CalendarComponent, GridComponent, TooltipComponent, LegendComponent, VisualMapComponent, CanvasRenderer via echarts/core
  ```
  - **Match table.** Columns: Time, Account (color dot and name), Hero, Result, K/D/A, Duration, Mode, Lobby, Position, Party, GPM, XPM, Damage. It sorts by Time, K/D/A, Duration, GPM, XPM or Damage, defaulting to Time descending, and shows 50 rows per page. Clicking a row expands its detail below it; clicking again collapses it.
  - **Match detail.** It mirrors `index.html:1320-1358`: score line, result, duration, mode, lobby and time; Radiant and Dire tables with player, hero, level, K/D/A, LH/DN, GPM/XPM, net worth, hero damage, tower damage, healing and items; links to OpenDota, STRATZ and Dotabuff; and the gold/XP advantage line chart when `radiantGoldAdv` has more than one point. Rows of the user's own accounts are highlighted. A player with no account id shows "Anonymous".

- [ ] **Step 1: Write the failing tests.**
  - `useMatchDetail`: (a) with a cached detail in `db`, it makes no fetch. (b) A match from 10 days ago is fetched once and then stored. (c) A match from 200 days ago is fetched but not stored. (d) A fetch error surfaces as `error`.
  - `MatchTable`: with 120 rows, page 1 shows 50 rows and "1 / 3". Clicking the Duration header sorts in descending order. Clicking a row renders the detail region, with `MatchDetailView` mocked.
  - Mock `EChart` in these tests with `vi.mock`.
- [ ] **Step 2: Run the tests to verify they fail.** Run `npx vitest run src/hooks src/components/matches`. Expected: FAIL.
- [ ] **Step 3: Implement the hook, the components and the page.**
- [ ] **Step 4: Run the tests to verify they pass.** Expected: PASS.
- [ ] **Step 5: Commit** with the message `feat: combined match list with match details`.

---

### Task 11: Activity page

**Files:**
- Create: `web/src/app/activity/page.tsx`, `web/src/components/activity/*` (CalendarHeatmap, WeekHourHeatmap, WeekdayTable, NthGameChart, ActivityWindowSelect)
- Test: `web/src/app/activity.test.tsx`

**Interfaces:**
- Consumes: `useRecords`, `useSettings`, `windowBounds`, `calendarEnd`, `availableYears`, `calendar`, `weekdayHourGrid`, `nthGameOfDay`, `activityKpis` and `EChart`.
- Produces: the `/activity` route.
  - **Window selector.** It has its own selector, "Last 12 months" (the default), one entry per year from `availableYears`, and "All time". The header's time range does not apply here; the page says so in a subtitle.
  - **KPIs.** Active days, Games per active day, Games per week, Total playtime (h:mm).
  - **Calendar heatmap.** It uses the ECharts `calendar` coordinate system over `calendar(records, calendarEnd(window))`. The tooltip shows date, games and W/L. For "All time" it shows the last 12 months and is labeled that way.
  - **Weekday × hour heatmap.** The tooltip shows games and win rate.
  - **Weekday table.** Columns: Games and Win rate.
  - **Nth game of the day.** A line chart of win rate for game 1..8+ with a 50% reference line and the y-axis fixed to 30–70%.

- [ ] **Step 1: Write the failing test.** Seed `db.records` with matches across 2025 and 2026, then render the page with `EChart` mocked to print its `option` as JSON.
  - The window selector lists `2026`, `2025` and `All time`.
  - Choosing `2025` changes the active-days KPI to the 2025 count.
  - The calendar option's `range` covers 2025.
- [ ] **Step 2: Run the test to verify it fails.** Run `npx vitest run src/app/activity.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement the page and its components.**
- [ ] **Step 4: Run the test to verify it passes.** Expected: PASS.
- [ ] **Step 5: Commit** with the message `feat: activity page with lifetime history`.

---

### Task 12: Security headers, production check and deploy notes

**Files:**
- Create: `web/src/middleware.ts` (or the file name your Next.js version uses for middleware/proxy), `web/README.md`
- Modify: `web/next.config.ts`, `web/src/app/layout.tsx`, root `README.md` (add a "Web app" section pointing to `web/`)

**Interfaces:**
- Produces: a nonce-based CSP. Follow the official Next.js "Content Security Policy" guide for the installed version, and read the nonce in `layout.tsx`. The policy:
  ```
  default-src 'self';
  script-src 'self' 'nonce-<n>' 'strict-dynamic';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https://cdn.cloudflare.steamstatic.com https://avatars.steamstatic.com;
  connect-src 'self' https://api.opendota.com;
  font-src 'self';
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  ```
  In development only, `script-src` additionally gets `'unsafe-eval'`. The response also carries `Referrer-Policy: strict-origin-when-cross-origin` and `X-Content-Type-Options: nosniff`.

- [ ] **Step 1: Implement the CSP and the extra headers.**
- [ ] **Step 2: Verify.** Run `npm run build && npm start`, then `curl -sI http://localhost:3000/ | grep -i content-security-policy`. The output should show the policy with a nonce.
- [ ] **Step 3: Check that the CSP blocks nothing.** Open http://localhost:3000, add a public account and visit all three pages. The browser console must show no CSP violations. Hero, item and avatar images must load, and the charts must render.
- [ ] **Step 4: Write `web/README.md`** in English. Cover:
  - what the app does;
  - `npm install`, `npm run dev` and `npm test`;
  - the privacy statement: "Phase 1 has no server-side storage; your account list and match cache live only in your browser";
  - deploy steps: create a public GitHub repo, import it in Vercel with **Root Directory `web`**, and note that the Hobby plan is non-commercial only.
- [ ] **Step 5: Run the full suite.** `npm test` and `npm run lint` must both pass.
- [ ] **Step 6: Commit** with the message `feat: CSP and security headers; deploy docs`.
- [ ] **Step 7: Hand off the steps only the user can do.** Creating the public GitHub repo, pushing, and linking the Vercel project need the user's own accounts. Present the exact commands and clicks to the user; do not run them.
