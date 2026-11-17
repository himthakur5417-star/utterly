// Simple in-memory sliding-window rate limiter (per process).
// Good enough for a single-instance deploy; swap for Redis in scale.

interface Bucket {
  timestamps: number[];
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterMs: number;
}

export function rateLimit(opts: {
  key: string;
  limit: number;
  windowMs: number;
}): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(opts.key) ?? { timestamps: [] };

  // drop expired timestamps
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < opts.windowMs);

  if (bucket.timestamps.length >= opts.limit) {
    const oldest = bucket.timestamps[0] ?? now;
    const retryAfterMs = Math.max(0, opts.windowMs - (now - oldest));
    return { allowed: false, limit: opts.limit, remaining: 0, retryAfterMs };
  }

  bucket.timestamps.push(now);
  buckets.set(opts.key, bucket);
  return {
    allowed: true,
    limit: opts.limit,
    remaining: opts.limit - bucket.timestamps.length,
    retryAfterMs: 0,
  };
}

export function clientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
