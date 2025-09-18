let trackedDowntimeMs = 0;

export function recordDowntime(durationMs: number) {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return;
  }

  trackedDowntimeMs += durationMs;
}

export function resetDowntime() {
  trackedDowntimeMs = 0;
}

export function getUptimeSummary(windowMinutes = 1_440): {
  percent: number;
  downtimeMinutes: number;
  since: string;
  windowMinutes: number;
} {
  const windowMs = Math.max(windowMinutes, 1) * 60_000;
  const uptimeSeconds = process.uptime();
  const uptimeMs = Math.max(0, uptimeSeconds * 1_000);
  const downtimeMs = Math.min(trackedDowntimeMs, windowMs);
  const effectiveUptime = Math.max(0, Math.min(windowMs, uptimeMs - downtimeMs));
  const percent = windowMs > 0 ? (effectiveUptime / windowMs) * 100 : 100;

  return {
    percent: Number(Math.min(100, Math.max(0, percent)).toFixed(3)),
    downtimeMinutes: Number((downtimeMs / 60_000).toFixed(1)),
    since: new Date(Date.now() - uptimeMs).toISOString(),
    windowMinutes,
  };
}
