import type { NextFunction, Request, Response } from "express";

function betaInviteCode(): string | undefined {
  const value = process.env.BETA_INVITE_CODE?.trim();
  return value || undefined;
}

function isExemptHealthCheck(req: Request): boolean {
  if (req.method !== "GET") return false;
  const path = req.path;
  return path === "/health" || path === "/healthz";
}

export function betaGate(req: Request, res: Response, next: NextFunction): void {
  const expected = betaInviteCode();
  if (!expected) {
    next();
    return;
  }

  if (isExemptHealthCheck(req)) {
    next();
    return;
  }

  const provided = req.header("x-beta-code")?.trim();
  if (provided !== expected) {
    res.status(401).json({ error: "Invite code required" });
    return;
  }

  next();
}
