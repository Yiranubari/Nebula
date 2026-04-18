import { env } from "./env";

/**
 * Parses `CLIENT_URL` as either:
 *   - a single origin (`https://app.example.com`),
 *   - a comma-separated allowlist (`https://app.example.com,https://staging.example.com`),
 *   - or the wildcard `*` (dev only — never do this in production).
 *
 * Entries starting with `/` and ending with `/` are treated as regex strings,
 * so you can whitelist every Vercel preview with one line, e.g.
 *   CLIENT_URL=https://my-app.vercel.app,/^https:\/\/my-app-.*\.vercel\.app$/
 */
const raw = env.CLIENT_URL.trim();
const entries = raw.split(",").map((s) => s.trim()).filter(Boolean);

const literals = new Set<string>();
const patterns: RegExp[] = [];

for (const entry of entries) {
  if (entry === "*") {
    patterns.push(/.*/);
    continue;
  }
  if (entry.startsWith("/") && entry.endsWith("/") && entry.length >= 2) {
    try {
      patterns.push(new RegExp(entry.slice(1, -1)));
      continue;
    } catch {
      // Fall through to literal match if the regex is malformed.
    }
  }
  literals.add(entry);
}

export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true; // same-origin / non-browser clients (curl, server-to-server)
  if (literals.has(origin)) return true;
  return patterns.some((r) => r.test(origin));
}

/** First literal entry — used as the canonical "primary" client origin. */
export const primaryClientOrigin = entries[0] ?? "";
