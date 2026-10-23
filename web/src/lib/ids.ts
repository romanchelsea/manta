import type { AccountId } from './types';

const STEAM64_BASE = BigInt('76561197960265728');

export function parseAccountId(input: string): AccountId | null {
  const m = input.match(/\d{6,17}/);
  if (!m) return null;
  let n = BigInt(m[0]);
  if (n > STEAM64_BASE) n -= STEAM64_BASE;
  return n.toString();
}
