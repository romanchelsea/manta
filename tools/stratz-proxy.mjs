#!/usr/bin/env node
// Local proxy for the STRATZ API. Serves index.html and forwards GraphQL requests with the
// right per-account token and the "User-Agent: STRATZ_API" header (which browsers cannot set).
// Tokens stay in tools/stratz-tokens.json on this machine and are never sent to the page.
//
// Usage (Node 18+):
//   cp tools/stratz-tokens.example.json tools/stratz-tokens.json   # then fill in your tokens
//   node tools/stratz-proxy.mjs
//   open http://127.0.0.1:8787

import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const STRATZ = process.env.STRATZ_URL || 'https://api.stratz.com/graphql';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TOKENS_FILE = path.join(ROOT, 'tools', 'stratz-tokens.json');
const PORT = Number(process.env.PORT) || 8787;
const MIN_GAP_MS = 250;           // at most ~4 requests/second to STRATZ
const MAX_BODY = 64 * 1024;
const STEAM64_BASE = 76561197960265728n;

function toAccountId(s) {
  const m = String(s).match(/\d{6,17}/);
  if (!m) return null;
  const n = BigInt(m[0]);
  return (n > STEAM64_BASE ? n - STEAM64_BASE : n).toString();
}

let tokens;
try {
  const parsed = JSON.parse(await readFile(TOKENS_FILE, 'utf8'));
  tokens = {};
  for (const [k, v] of Object.entries(parsed)) {
    if (typeof v !== 'string' || !v.trim() || v.includes('paste-')) continue;
    const key = k === 'default' ? 'default' : toAccountId(k);
    if (key) tokens[key] = v.trim();
  }
} catch (e) {
  console.error(`Could not read ${TOKENS_FILE}: ${e.message}`);
  console.error('Copy tools/stratz-tokens.example.json to tools/stratz-tokens.json and add your tokens.');
  process.exit(1);
}
const accounts = Object.keys(tokens).filter(k => k !== 'default');
if (!accounts.length && !tokens.default) {
  console.error('No tokens found in tools/stratz-tokens.json.');
  process.exit(1);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
let nextSlot = 0;
async function throttle() {
  const now = Date.now();
  const wait = Math.max(0, nextSlot - now);
  nextSlot = Math.max(now, nextSlot) + MIN_GAP_MS;
  if (wait) await sleep(wait);
}

async function forward(token, body) {
  for (let attempt = 0; ; attempt++) {
    await throttle();
    const r = await fetch(STRATZ, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'STRATZ_API', Authorization: `Bearer ${token}` },
      body,
    });
    if (r.status === 429 && attempt < 4) { await sleep(2000 * (attempt + 1)); continue; }
    return { status: r.status, text: await r.text() };
  }
}

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > MAX_BODY) { reject(new Error('body too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const ALLOWED_HOSTS = new Set([`127.0.0.1:${PORT}`, `localhost:${PORT}`]);

http.createServer(async (req, res) => {
  try {
    // Only answer requests addressed to this machine (blocks DNS-rebinding tricks from other sites).
    if (!ALLOWED_HOSTS.has(req.headers.host)) return send(res, 403, { error: 'forbidden host' });
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
      return send(res, 200, await readFile(path.join(ROOT, 'index.html'), 'utf8'), 'text/html; charset=utf-8');
    }
    if (req.method === 'GET' && url.pathname === '/stratz/accounts') {
      return send(res, 200, { accounts });
    }
    if (req.method === 'POST' && url.pathname === '/stratz/graphql') {
      if (!String(req.headers['content-type']).startsWith('application/json')) return send(res, 415, { error: 'expected JSON' });
      const id = toAccountId(url.searchParams.get('account') ?? '');
      const token = (id && tokens[id]) || tokens.default;
      if (!token) return send(res, 403, { error: `no STRATZ token for account ${id}` });
      const r = await forward(token, await readBody(req));
      return send(res, r.status, r.text);
    }
    send(res, 404, { error: 'not found' });
  } catch (e) {
    send(res, 502, { error: e.message });
  }
}).listen(PORT, '127.0.0.1', () => {
  console.log(`STRATZ proxy running: http://127.0.0.1:${PORT}`);
  console.log(`Accounts with tokens: ${accounts.join(', ') || '(none)'}${tokens.default ? ' + default token' : ''}`);
});
