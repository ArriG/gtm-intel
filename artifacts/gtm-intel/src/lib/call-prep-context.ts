import type { LinkedInPost } from "@workspace/api-client-react";

const key = (historyId: string) => `gtm_prep_ctx_${historyId}`;

export function savePrepContext(historyId: string, linkedinPosts: LinkedInPost[], ownIntel: string) {
  try {
    const posts = linkedinPosts.filter(p => p.content.trim());
    const intel = ownIntel.trim();
    if (posts.length === 0 && !intel) {
      sessionStorage.removeItem(key(historyId));
      return;
    }
    sessionStorage.setItem(key(historyId), JSON.stringify({ linkedinPosts: posts, ownIntel: intel }));
  } catch {
    /* sessionStorage unavailable */
  }
}

export function loadPrepContext(historyId: string): { linkedinPosts?: LinkedInPost[]; ownIntel?: string } {
  try {
    const raw = sessionStorage.getItem(key(historyId));
    if (!raw) return {};
    return JSON.parse(raw) as { linkedinPosts?: LinkedInPost[]; ownIntel?: string };
  } catch {
    return {};
  }
}
