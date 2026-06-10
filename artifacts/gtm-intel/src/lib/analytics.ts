let initialised = false;
let captureFn: ((event: string, props?: Record<string, unknown>) => void) | null = null;

export function init(): void {
  const key = import.meta.env.VITE_POSTHOG_KEY;
  if (!key) return;

  void import("posthog-js")
    .then(({ default: posthog }) => {
      posthog.init(key, {
        api_host: import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com",
        capture_pageview: true,
      });
      captureFn = (event, props) => posthog.capture(event, props);
      initialised = true;
    })
    .catch(() => {
      // Analytics is optional — never block the app if PostHog fails to load.
    });
}

export function track(event: string, props?: Record<string, unknown>): void {
  if (!initialised || !captureFn) return;
  captureFn(event, props);
}
