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
      init.headers = {
        ...(init.headers as Record<string, string>),
        "x-beta-code": code,
      };
    }
  }
  return originalFetch(input, init);
};

const base = import.meta.env.BASE_URL.replace(/\/$/, "");
if (base) setBaseUrl(base);

initAnalytics();

createRoot(document.getElementById("root")!).render(<App />);
