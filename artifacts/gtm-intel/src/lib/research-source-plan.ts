import { useEffect, useState } from "react";
import type { ResearchSourcePlan } from "@workspace/api-client-react";

const STORAGE_KEY = "gtm_research_source_plan_v1";
const CHANGE_EVENT = "gtm:research-source-plan-changed";

export type { ResearchSourcePlan };

export function loadResearchSourcePlan(): ResearchSourcePlan | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ResearchSourcePlan;
    if (!Array.isArray(parsed.sources) || parsed.sources.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveResearchSourcePlan(plan: ResearchSourcePlan) {
  try {
    const next: ResearchSourcePlan = {
      ...plan,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    /* localStorage unavailable */
  }
}

export function clearResearchSourcePlan() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    /* ignore */
  }
}

export function isResearchSourcePlanConfigured(plan: ResearchSourcePlan | null | undefined): boolean {
  if (!plan?.sources?.length) return false;
  return plan.sources.filter(source => source.enabled).length >= 3;
}

export function researchSourcePlanForRequest(
  plan?: ResearchSourcePlan | null,
): ResearchSourcePlan | undefined {
  const data = plan ?? loadResearchSourcePlan();
  if (!isResearchSourcePlanConfigured(data)) return undefined;
  return {
    ...data!,
    sources: data!.sources
      .filter(source => source.enabled)
      .sort((a, b) => a.priority - b.priority)
      .map((source, index) => ({ ...source, priority: index + 1 })),
  };
}

export function useResearchSourcePlan(): ResearchSourcePlan | null {
  const [plan, setPlan] = useState<ResearchSourcePlan | null>(() => loadResearchSourcePlan());
  useEffect(() => {
    const onChange = () => setPlan(loadResearchSourcePlan());
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => window.removeEventListener(CHANGE_EVENT, onChange);
  }, []);
  return plan;
}

export function useIsResearchSourcePlanConfigured(): boolean {
  const plan = useResearchSourcePlan();
  return isResearchSourcePlanConfigured(plan);
}

export const SOURCE_TYPE_LABELS: Record<string, string> = {
  web: "Website",
  registry: "Registry",
  jobs: "Jobs",
  linkedin: "LinkedIn",
  press: "Press",
  other: "Other",
};
