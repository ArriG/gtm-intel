import { useCallback, useEffect, useState, type FormEvent } from "react";
import { BearMark } from "@/components/bear-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { clearBetaCode, setBetaCode } from "@/lib/beta-code";

type GateState = "checking" | "locked" | "unlocked";

function betaCheckUrl(): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${base}/api/beta/check`;
}

export function BetaGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GateState>("checking");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const checkAccess = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch(betaCheckUrl());
      if (res.ok) {
        setState("unlocked");
        setError(null);
        return true;
      }
      if (res.status === 401) {
        setState("locked");
        return false;
      }
      setState("unlocked");
      return true;
    } catch {
      setState("unlocked");
      return true;
    }
  }, []);

  useEffect(() => {
    void checkAccess();
  }, [checkAccess]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = inviteCode.trim();
    if (!trimmed) return;

    setSubmitting(true);
    setError(null);
    setBetaCode(trimmed);

    try {
      const res = await fetch(betaCheckUrl());
      if (res.ok) {
        setState("unlocked");
        return;
      }
      if (res.status === 401) {
        clearBetaCode();
        setError("That code didn't work");
        return;
      }
      setState("unlocked");
    } catch {
      setState("unlocked");
    } finally {
      setSubmitting(false);
    }
  };

  if (state === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Checking access…</p>
      </div>
    );
  }

  if (state === "locked") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-sm text-center space-y-6">
          <div className="flex flex-col items-center gap-3">
            <BearMark size={40} />
            <div>
              <p className="text-lg font-semibold text-foreground">GTM Intel</p>
              <p className="text-sm text-muted-foreground mt-1">Private beta</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 text-left">
            <label htmlFor="invite-code" className="sr-only">
              Invite code
            </label>
            <Input
              id="invite-code"
              type="text"
              autoComplete="off"
              placeholder="Invite code"
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value)}
              disabled={submitting}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={submitting || !inviteCode.trim()}>
              Continue
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
