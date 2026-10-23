#!/usr/bin/env node
// Probe the STRATZ API to check:
//   1. whether the token works (and whether the "User-Agent: STRATZ_API" header is required)
//   2. whether a browser page could call STRATZ directly (CORS preflight)
//   3. what STRATZ returns for each account (private or not), compared with OpenDota
//
// Usage (Node 18+):
//   STRATZ_TOKEN=xxxx node tools/stratz-probe.mjs <account> [account ...] [--raw]
// <account> can be a Steam32 ID, Steam64 ID or a profile URL.
// --raw also writes the full responses to stratz-probe-output.json (contains no token).
// The token is read from the environment only and is never printed.

const STRATZ = 'https://api.stratz.com/graphql';
const OPENDOTA = 'https://api.opendota.com/api';
const STEAM64_BASE = 76561197960265728n;
const TOKEN = process.env.STRATZ_TOKEN?.trim();
const args = process.argv.slice(2);
const RAW = args.includes('--raw');

function toAccountId(s) {
  const m = String(s).match(/\d{6,17}/);
  if (!m) return null;
  const n = BigInt(m[0]);
  return Number(n > STEAM64_BASE ? n - STEAM64_BASE : n);
}
const ids = [...new Set(args.filter(a => !a.startsWith('--')).map(toAccountId).filter(Boolean))];

if (!TOKEN || !ids.length) {
  console.error('Usage: STRATZ_TOKEN=xxxx node tools/stratz-probe.mjs <account> [account ...] [--raw]');
  process.exit(1);
}

const fmt = t => t ? new Date(t * 1000).toISOString().replace('T', ' ').slice(0, 16) + ' UTC' : '-';
const raw = { tests: {}, accounts: {} };

async function gql(query, variables = {}, { ua = true } = {}) {
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };
  if (ua) headers['User-Agent'] = 'STRATZ_API';
  const r = await fetch(STRATZ, { method: 'POST', headers, body: JSON.stringify({ query, variables }) });
  const text = await r.text();
  let json = null;
  try { json = JSON.parse(text); } catch { }
  return { status: r.status, challenge: r.headers.get('cf-mitigated'), json, body: json ? null : text.slice(0, 160).replace(/\s+/g, ' ') };
}
const describe = r => `HTTP ${r.status}${r.challenge ? ` (Cloudflare ${r.challenge})` : ''}${r.json?.errors ? ' GraphQL errors: ' + r.json.errors.map(e => e.message).join(' | ') : ''}${r.body ? ' body: ' + r.body : ''}`;
const ok = r => r.status === 200 && r.json && !r.json.errors;

// ---- 1. auth + User-Agent ----
console.log('== 1. Token / User-Agent check ==');
const ping = '{ __typename }';
const withUa = await gql(ping, {}, { ua: true });
const withoutUa = await gql(ping, {}, { ua: false });
console.log(`with "User-Agent: STRATZ_API": ${ok(withUa) ? 'OK' : 'FAILED'}  ${describe(withUa)}`);
console.log(`without that header:           ${ok(withoutUa) ? 'OK' : 'FAILED'}  ${describe(withoutUa)}`);
raw.tests.auth = { withUa, withoutUa };
const useUa = !ok(withoutUa);
if (!ok(withUa) && !ok(withoutUa)) {
  console.log('\nThe token could not make any request. Check the token and try again.');
  process.exit(2);
}

// ---- 2. CORS preflight (approximates what a browser does before calling STRATZ) ----
console.log('\n== 2. Browser access (CORS preflight) ==');
try {
  const r = await fetch(STRATZ, {
    method: 'OPTIONS',
    headers: { Origin: 'http://localhost:8765', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'authorization,content-type' },
  });
  const allowOrigin = r.headers.get('access-control-allow-origin');
  const allowHeaders = r.headers.get('access-control-allow-headers');
  console.log(`HTTP ${r.status}${r.headers.get('cf-mitigated') ? ' (Cloudflare challenge)' : ''}  allow-origin: ${allowOrigin ?? '(none)'}  allow-headers: ${allowHeaders ?? '(none)'}`);
  console.log(r.status < 300 && allowOrigin ? 'Looks like a browser page could call STRATZ directly.' : 'A browser page probably cannot call STRATZ directly; a local proxy would be needed.');
  if (useUa) console.log('Note: STRATZ needs the custom User-Agent header, which browsers cannot set, so a proxy is needed anyway.');
  raw.tests.cors = { status: r.status, allowOrigin, allowHeaders };
} catch (e) {
  console.log('Preflight request failed:', e.message);
}

// ---- 3. per-account data ----
const PLAYER_QUERY = `query ($id: Long!, $take: Int!) {
  player(steamAccountId: $id) {
    steamAccountId
    matchCount
    winCount
    firstMatchDate
    lastMatchDate
    steamAccount { id name isAnonymous }
    matches(request: { take: $take }) {
      id
      startDateTime
      durationSeconds
      gameMode
      lobbyType
      didRadiantWin
      players(steamAccountId: $id) { heroId position lane role isVictory kills deaths assists partyId }
    }
  }
}`;

async function introspect() {
  const q = `{ player: __type(name: "PlayerType") { fields { name } }
    req: __type(name: "PlayerMatchesRequestType") { inputFields { name } }
    mp: __type(name: "MatchPlayerType") { fields { name } } }`;
  const r = await gql(q, {}, { ua: useUa });
  if (!ok(r)) return console.log('  Schema lookup failed too:', describe(r));
  const names = t => t?.fields?.map(f => f.name).join(', ') ?? t?.inputFields?.map(f => f.name).join(', ') ?? '(not found)';
  console.log('  PlayerType fields:', names(r.json.data.player));
  console.log('  PlayerMatchesRequestType fields:', names(r.json.data.req));
  console.log('  MatchPlayerType fields:', names(r.json.data.mp));
  raw.tests.schema = r.json.data;
}

async function openDota(id) {
  try {
    const [p, ms] = await Promise.all([
      fetch(`${OPENDOTA}/players/${id}`).then(r => r.json()),
      fetch(`${OPENDOTA}/players/${id}/matches?limit=1&significant=0`).then(r => r.json()),
    ]);
    return { name: p?.profile?.personaname ?? null, visible: !!p?.profile, latest: Array.isArray(ms) ? ms[0]?.start_time : null };
  } catch (e) {
    return { error: e.message };
  }
}

console.log('\n== 3. Account data ==');
let schemaShown = false;
for (const id of ids) {
  console.log(`\n-- Account ${id} --`);
  const [r, od] = await Promise.all([gql(PLAYER_QUERY, { id, take: 20 }, { ua: useUa }), openDota(id)]);
  raw.accounts[id] = { stratz: r.json ?? r.body, opendota: od };
  const p = r.json?.data?.player;
  if (!p) {
    console.log(`STRATZ: no player data. ${describe(r)}`);
    if (r.json?.errors && !schemaShown) { schemaShown = true; console.log('  Looking up the schema so the query can be fixed:'); await introspect(); }
  } else {
    const ms = p.matches ?? [];
    const withPos = ms.filter(m => m.players?.[0]?.position).length;
    console.log(`STRATZ: name=${p.steamAccount?.name ?? '-'}  anonymous=${p.steamAccount?.isAnonymous ?? '-'}  matchCount=${p.matchCount ?? '-'}  wins=${p.winCount ?? '-'}`);
    console.log(`        first match ${fmt(p.firstMatchDate)}, last match ${fmt(p.lastMatchDate)}`);
    console.log(`        returned ${ms.length} recent matches, ${withPos} with a position`);
    for (const m of ms.slice(0, 5)) {
      const me = m.players?.[0] ?? {};
      console.log(`        ${fmt(m.startDateTime)}  match ${m.id}  hero ${me.heroId ?? '?'}  ${me.position ?? 'no position'}  ${me.isVictory == null ? '' : me.isVictory ? 'win' : 'loss'}  ${me.kills ?? '?'}/${me.deaths ?? '?'}/${me.assists ?? '?'}`);
    }
    if (r.json?.errors) console.log(`        (partial errors: ${r.json.errors.map(e => e.message).join(' | ')})`);
  }
  if (od.error) console.log(`OpenDota: request failed (${od.error})`);
  else console.log(`OpenDota: profile visible=${od.visible}  name=${od.name ?? '-'}  latest match ${fmt(od.latest)}`);
}

console.log(`
== What to compare ==
For each private account, check the time of its most recent game in the Dota 2 client's match history.
If STRATZ's "last match" is close to it while OpenDota's is older (or missing), STRATZ does show
private-period matches to the token's owner.`);

if (RAW) {
  const { writeFile } = await import('node:fs/promises');
  await writeFile('stratz-probe-output.json', JSON.stringify(raw, null, 2));
  console.log('\nFull responses written to stratz-probe-output.json');
}
