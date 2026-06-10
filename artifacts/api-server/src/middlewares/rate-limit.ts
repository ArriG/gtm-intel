import type { NextFunction, Request, Response } from "express";

const ONE_HOUR_MS = 60 * 60 * 1000;

const AI_PATH_MARKERS = [
  "account-brief",
  "account-map",
  "signals/scan",
  "signal-opener",
  "next-touch",
  "suggest-profile",
  "suggest-reasoning",
  "talk-track",
  "cold-email",
] as const;

const ipTimestamps = new Map<string, number[]>();
let globalBucket = { dateKey: utcDateKey(), count: 0 };

function utcDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function perHourLimit(): number {
  const raw = process.env.RATE_LIMIT_PER_HOUR?.trim();
  if (raw) {
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isNaN(parsed) && parsed > 0) return parsed;
  }
  return 15;
}

function globalDailyLimit(): number {
  const raw = process.env.RATE_LIMIT_GLOBAL_PER_DAY?.trim();
  if (raw) {
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isNaN(parsed) && parsed > 0) return parsed;
  }
  return 200;
}

function isAiCall(req: Request): boolean {
  if (req.method !== "POST") return false;
  const path = req.path.toLowerCase();
  return AI_PATH_MARKERS.some((marker) => path.includes(marker));
}

function clientIp(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? "unknown";
}

function pruneHourWindow(timestamps: number[], now: number): number[] {
  const cutoff = now - ONE_HOUR_MS;
  return timestamps.filter((timestamp) => timestamp > cutoff);
}

function currentGlobalCount(): number {
  const today = utcDateKey();
  if (globalBucket.dateKey !== today) {
    globalBucket = { dateKey: today, count: 0 };
  }
  return globalBucket.count;
}

function recordAiCall(ip: string, now: number): void {
  const recent = pruneHourWindow(ipTimestamps.get(ip) ?? [], now);
  recent.push(now);
  ipTimestamps.set(ip, recent);

  const today = utcDateKey();
  if (globalBucket.dateKey !== today) {
    globalBucket = { dateKey: today, count: 0 };
  }
  globalBucket.count += 1;
}

export function rateLimit(req: Request, res: Response, next: NextFunction): void {
  if (!isAiCall(req)) {
    next();
    return;
  }

  const now = Date.now();
  const ip = clientIp(req);
  const recent = pruneHourWindow(ipTimestamps.get(ip) ?? [], now);
  ipTimestamps.set(ip, recent);

  const hourlyCap = perHourLimit();
  if (recent.length >= hourlyCap) {
    req.log.warn({ ip, path: req.path, limit: hourlyCap }, "Per-IP rate limit reached");
    res.status(429).json({ error: "Rate limit reached — try again in a while." });
    return;
  }

  const dailyCap = globalDailyLimit();
  if (currentGlobalCount() >= dailyCap) {
    req.log.warn({ ip, path: req.path, limit: dailyCap }, "Global daily rate limit reached");
    res.status(429).json({ error: "The beta has hit today's research budget — back tomorrow." });
    return;
  }

  recordAiCall(ip, now);
  next();
}
