import { describe, expect, test, vi } from 'vitest';
import { createOpenDotaClient, OpenDotaError, RATE_LIMIT_MESSAGE } from '@/lib/opendota';

const res = (status: number, body: unknown = {}) =>
  ({ status, ok: status >= 200 && status < 300, json: async () => body }) as Response;

describe('opendota client', () => {
  test('builds url', async () => {
    const f = vi.fn().mockResolvedValue(res(200, {}));
    const c = createOpenDotaClient({ apiKey: 'K', fetch: f, retryDelayMs: 1 });
    await c.get('/players/1/matches', { project: ['a', 'b'], date: 3, x: undefined });
    expect(f.mock.calls[0][0]).toBe(
      'https://api.opendota.com/api/players/1/matches?project=a&project=b&date=3&api_key=K',
    );
  });
  test('retries 429', async () => {
    const f = vi.fn()
      .mockResolvedValueOnce(res(429)).mockResolvedValueOnce(res(429)).mockResolvedValueOnce(res(200, { ok: 1 }));
    const c = createOpenDotaClient({ fetch: f, retryDelayMs: 1 });
    await expect(c.get('/x')).resolves.toEqual({ ok: 1 });
    expect(f).toHaveBeenCalledTimes(3);
  });
  test('gives up', async () => {
    const f = vi.fn().mockResolvedValue(res(429));
    const c = createOpenDotaClient({ fetch: f, retryDelayMs: 1 });
    const err = (await c.get('/x').catch((e) => e)) as OpenDotaError;
    expect(err).toBeInstanceOf(OpenDotaError);
    expect(err.status).toBe(429);
    expect(err.message).toBe(RATE_LIMIT_MESSAGE);
    expect(f).toHaveBeenCalledTimes(5);
  });
  test('non-429 error', async () => {
    const f = vi.fn().mockResolvedValue(res(500));
    const c = createOpenDotaClient({ fetch: f, retryDelayMs: 1 });
    const err = (await c.get('/x').catch((e) => e)) as OpenDotaError;
    expect(err.status).toBe(500);
    expect(f).toHaveBeenCalledTimes(1);
  });
  test('concurrency', async () => {
    let pending = 0, max = 0;
    const releases: (() => void)[] = [];
    const f = vi.fn(() => new Promise<Response>((r) => {
      pending++; max = Math.max(max, pending);
      releases.push(() => { pending--; r(res(200, {})); });
    }));
    const c = createOpenDotaClient({ fetch: f as unknown as typeof fetch, retryDelayMs: 1 });
    const ps = [1, 2, 3, 4, 5].map((i) => c.get('/x' + i));
    let done = 0;
    while (done < 5) {
      await new Promise((r) => setTimeout(r, 0));
      expect(pending).toBeLessThanOrEqual(3);
      releases.splice(0).forEach((r) => { r(); done++; });
    }
    await Promise.all(ps);
    expect(max).toBe(3);
  });
  test('dedupes', async () => {
    const f = vi.fn().mockResolvedValue(res(200, { a: 1 }));
    const c = createOpenDotaClient({ fetch: f, retryDelayMs: 1 });
    await Promise.all([c.get('/x', { a: 1 }), c.get('/x', { a: 1 })]);
    expect(f).toHaveBeenCalledTimes(1);
  });
});
