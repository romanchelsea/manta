export type Params = Record<string, string | number | (string | number)[] | undefined>;
export interface OpenDotaClient {
  get<T>(path: string, params?: Params): Promise<T>;
}
export class OpenDotaError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'OpenDotaError';
  }
}
export const RATE_LIMIT_MESSAGE =
  'OpenDota rate limit reached. Try again in a minute, or add an OpenDota API key in Settings.';

const API = 'https://api.opendota.com/api';

export function createOpenDotaClient(
  opts: {
    apiKey?: string;
    fetch?: typeof fetch;
    maxConcurrent?: number;
    retryDelayMs?: number;
    maxRetries?: number;
  } = {},
): OpenDotaClient {
  const { apiKey, maxConcurrent = 3, retryDelayMs = 1500, maxRetries = 4 } = opts;
  const doFetch = opts.fetch ?? ((...a: Parameters<typeof fetch>) => fetch(...a));
  let inflight = 0;
  const queue: { fn: () => Promise<unknown>; res: (v: unknown) => void; rej: (e: unknown) => void }[] = [];
  const memo = new Map<string, Promise<unknown>>();

  function pump() {
    while (inflight < maxConcurrent && queue.length) {
      const { fn, res, rej } = queue.shift()!;
      inflight++;
      fn()
        .then(res, rej)
        .finally(() => {
          inflight--;
          pump();
        });
    }
  }
  function limited<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((res, rej) => {
      queue.push({ fn, res: res as (v: unknown) => void, rej });
      pump();
    });
  }

  return {
    get<T>(path: string, params: Params = {}): Promise<T> {
      const u = new URL(API + path);
      for (const [k, v] of Object.entries(params)) {
        if (v == null || v === '') continue;
        (Array.isArray(v) ? v : [v]).forEach((x) => u.searchParams.append(k, String(x)));
      }
      if (apiKey) u.searchParams.set('api_key', apiKey);
      const url = u.toString();
      const cached = memo.get(url);
      if (cached) return cached as Promise<T>;
      const p = limited(async () => {
        for (let attempt = 0; ; attempt++) {
          const r = await doFetch(url);
          if (r.status === 429) {
            if (attempt < maxRetries) {
              await new Promise((s) => setTimeout(s, retryDelayMs * (attempt + 1)));
              continue;
            }
            throw new OpenDotaError(429, RATE_LIMIT_MESSAGE);
          }
          if (!r.ok) throw new OpenDotaError(r.status, 'HTTP ' + r.status);
          return (await r.json()) as T;
        }
      });
      memo.set(url, p);
      const clear = () => memo.delete(url);
      p.then(clear, clear);
      return p;
    },
  };
}
