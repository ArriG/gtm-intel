# Anthropic SDK — bug report & cost-control notes

Where to file: https://github.com/anthropics/anthropic-sdk-typescript/issues

**Environment:** `@anthropic-ai/sdk@^0.96.0` · Node 26 · Express 5 · model `claude-haiku-4-5-20251001` · `web_search_20250305` tool.

---

## Issue 1 (bug) — `signal`/`timeout`/`maxRetries` in the request body are silently ignored

When an `AbortController` `signal` (or `timeout`/`maxRetries`) is placed inside the
**request body** object instead of the second `RequestOptions` argument, the SDK
silently ignores it — no TypeScript error, no runtime warning. With the `web_search`
tool enabled, a client-side `Promise.race` timeout appeared to "fire", but the
underlying request kept running to completion and billed in full (~$7 for one search).

**Expected:** a type error when `signal`/`timeout`/`maxRetries` appear in the body,
the SDK respecting them, or at minimum a dev-mode warning.

```ts
// ❌ silently ignored — request is NOT abortable, runs and bills to completion
await client.messages.create({
  model, max_tokens, system, messages,
  tools: [{ type: "web_search_20250305", name: "web_search" }],
  signal: controller.signal,
});

// ✅ correct — RequestOptions is the 2nd arg
await client.messages.create(
  { model, max_tokens, system, messages, tools: [...] },
  { timeout: 45_000, maxRetries: 0, signal: controller.signal },
);
```

## Issue 2 (bug / billing) — timed-out or aborted `web_search` requests still bill for partial work and return nothing

After fixing Issue 1 (timeout moved into RequestOptions, `maxRetries: 0`, `max_uses`
cap on `web_search`), the runaway is gone — but a request that hits the timeout now:

- returns **no usable result** (the call rejects with a timeout/abort error), **and**
- **still bills ~$0.60** for the searches + tokens consumed before the abort.

This suggests the client-side abort/timeout closes the HTTP connection but does **not
cancel Anthropic's server-side `web_search` execution** — so the user pays for work
they never receive. For interactive apps this is the worst case: pay-for-nothing.

**Expected / requests:**
- Server-side `web_search` work should stop when the client aborts the connection, or
- billing should reflect only fully-returned results, or
- at minimum, document clearly that an aborted/timed-out `web_search` call is still
  billed for partial usage so callers can budget for it.

## Issue 3 (footgun / feature request) — defaults make `web_search` easy to overspend

- `maxRetries` defaults to **2** with a long default timeout. For `web_search`, a
  stuck call can retry into 3× full-cost web-search runs before surfacing an error.
- `web_search` `max_uses` has **no default cap** — the model can run unbounded
  searches in one call, the dominant cost driver.

A sane default `max_uses`, a per-call cost guardrail, or a warning when `max_uses` is
omitted would prevent surprise bills.

---

## Workarounds we applied (and how well they worked)

| Change | Effect |
| --- | --- |
| Move `timeout` + `maxRetries: 0` into RequestOptions (2nd arg) | Request actually aborts at the deadline instead of hanging 3+ min |
| `maxRetries: 0` | Stops a failed call retrying into 3× full cost |
| `web_search` `max_uses` cap (6 structure pass / 5 people pass) | Bounds searches per call; killed the unlimited-search runaway |
| `MAP_STRUCTURE_ONLY=1` env switch (skip pass-2 leadership enrichment) | Cheapest possible run for smoke-testing — pass-1 only |
| Friendly mapping of SDK timeout/abort errors to a user message | Clean "Request timed out — please try again" UX |

**Net result:** catastrophic cost ($7/search, 3-min hangs) eliminated. Remaining gap:
a timed-out `web_search` call still costs ~$0.60 and returns nothing (Issue 2). The
practical mitigation is to size the timeout so the call actually *completes* (return a
partial-but-real result) rather than timing out, and/or lower `max_uses` so the run
finishes inside the window.
