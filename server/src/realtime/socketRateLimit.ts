/**
 * Lightweight per-socket token bucket.
 *
 * A bucket is identified by (socketId, key). Each call to `consume()` removes
 * one token; tokens regenerate at `ratePerSec` up to `capacity`. Returns false
 * if the caller should be rejected.
 */

interface Bucket {
  tokens: number;
  updatedAt: number;
}

export interface Limit {
  capacity: number;
  ratePerSec: number;
}

const buckets = new Map<string, Bucket>();

export function consume(
  socketId: string,
  key: string,
  limit: Limit,
  now = Date.now()
): boolean {
  const id = `${socketId}:${key}`;
  let bucket = buckets.get(id);
  if (!bucket) {
    bucket = { tokens: limit.capacity, updatedAt: now };
    buckets.set(id, bucket);
  }

  const elapsedSec = (now - bucket.updatedAt) / 1000;
  bucket.tokens = Math.min(
    limit.capacity,
    bucket.tokens + elapsedSec * limit.ratePerSec
  );
  bucket.updatedAt = now;

  if (bucket.tokens < 1) return false;
  bucket.tokens -= 1;
  return true;
}

export function releaseSocket(socketId: string) {
  for (const id of buckets.keys()) {
    if (id.startsWith(`${socketId}:`)) buckets.delete(id);
  }
}
