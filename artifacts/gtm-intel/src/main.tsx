import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
import { getBetaCode } from "@/lib/beta-code";
import { init as initAnalytics } from "@/lib/analytics";
import App from "./App";
import "./index.css";

const originalFetch = window.fetch.bind(window);
window.fetch = (input, init = {}) => {
  const url =
    typeof input === "string"
      ? input
      : input instanceof Request
        ? input.url
        : String(input);
  if (url.includes("/api")) {
    const code = getBetaCode();
    if (code) {
      // Build from existing headers via the Headers constructor — spreading a
      // Headers instance yields {} and silently drops content-type.
      const headers = new Headers(
        init.headers ?? (input instanceof Request ? input.headers : undefined),
      );
      headers.set("x-beta-code", code);
      init = { ...init, headers };
    }
  }
  return originalFetch(input, init);
};

const base = import.meta.env.BASE_URL.replace(/\/$/, "");
if (base) setBaseUrl(base);

initAnalytics();

createRoot(document.getElementById("root")!).render(<App />);
