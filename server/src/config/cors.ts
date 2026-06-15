import { env } from "./env";

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
    }
  }
  literals.add(entry);
}

export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  if (literals.has(origin)) return true;
  return patterns.some((r) => r.test(origin));
}

export const primaryClientOrigin = entries[0] ?? "";
