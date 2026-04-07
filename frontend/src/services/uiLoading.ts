export function isProbablySlowNetwork(): boolean {
  if (typeof navigator === "undefined") return false;

  const anyNav = navigator as any;
  const conn =
    anyNav.connection || anyNav.mozConnection || anyNav.webkitConnection;

  const effectiveType =
    conn && typeof conn.effectiveType === "string" ? conn.effectiveType : "";
  const saveData = !!conn?.saveData;

  return saveData || effectiveType === "slow-2g" || effectiveType === "2g";
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

type RunWithDelayedSpinnerOptions<T> = {
  setLoading: (v: boolean) => void;
  fn: () => Promise<T> | T;
  showDelayMs?: number;
};

export async function runWithDelayedSpinner<T>({
  setLoading,
  fn,
  showDelayMs = 150,
}: RunWithDelayedSpinnerOptions<T>): Promise<T> {
  let showTimer: number | undefined;
  try {
    showTimer = window.setTimeout(() => setLoading(true), showDelayMs);
    return await fn();
  } finally {
    if (showTimer !== undefined) {
      window.clearTimeout(showTimer);
    }
    setLoading(false);
  }
}
