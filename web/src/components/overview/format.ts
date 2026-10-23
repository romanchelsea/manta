export const pct = (n: number, d: number): string => (d ? `${((n / d) * 100).toFixed(1)}%` : '—');
export const fix = (v: number | null | undefined, digits = 1): string =>
  v == null || !Number.isFinite(v) ? '—' : v.toFixed(digits);
export function fmtDur(sec: number): string {
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
export function ago(startSec: number, nowMs = Date.now()): string {
  const d = Math.floor((nowMs / 1000 - startSec) / 86400);
  if (d <= 0) return 'Today';
  if (d < 30) return `${d}d ago`;
  if (d < 365) return `${Math.floor(d / 30)}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}
