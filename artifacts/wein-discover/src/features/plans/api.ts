import {
  createPlan,
  getPlanWorkspace,
  listPlans,
  setBaseUrl,
  type CreatePlanRequest,
  type PlanStatus,
} from "@workspace/api-client-react";

setBaseUrl(import.meta.env?.VITE_PLANS_API_URL || null);
const ACTOR_KEY = "wein-plans-actor";
let sessionActor: string | undefined;

/** Keep the API's temporary actor identity stable across requests and reloads. */
export function getPlansActor(): string {
  if (sessionActor) return sessionActor;
  try {
    const stored = window.localStorage.getItem(ACTOR_KEY);
    if (stored && /^browser-[a-f0-9-]{36}$/.test(stored))
      return (sessionActor = stored);
    sessionActor = `browser-${crypto.randomUUID()}`;
    window.localStorage.setItem(ACTOR_KEY, sessionActor);
  } catch {
    sessionActor ??= `browser-${crypto.randomUUID()}`;
  }
  return sessionActor;
}

function options(actor: string, signal?: AbortSignal) {
  return {
    responseType: "json" as const,
    headers: { "X-User-Id": actor },
    signal: AbortSignal.any([
      AbortSignal.timeout(15000),
      ...(signal ? [signal] : []),
    ]),
  };
}

export const plansApi = {
  list: async (actor: string, status?: PlanStatus, signal?: AbortSignal) => {
    const result = await listPlans(
      status ? { status } : undefined,
      options(actor, signal),
    );
    if (!Array.isArray(result?.plans))
      throw new Error("Invalid Plans API response");
    return result;
  },
  create: (actor: string, data: CreatePlanRequest) =>
    createPlan(data, options(actor)),
  detail: (actor: string, id: string, signal?: AbortSignal) =>
    getPlanWorkspace(id, options(actor, signal)),
};

export function planErrorMessage(error: unknown): string {
  const status = (error as { status?: number } | null)?.status;
  if (status === 401)
    return "Your profile could not be recognized. Reload and try again.";
  if (status === 403) return "You do not have access to this plan.";
  if (status === 404) return "This plan could not be found.";
  if (status === 400) return "Check your plan details and try again.";
  return "We could not connect to your plans. Please try again.";
}

export function buildPlanInput(
  name: string,
  description: string,
  privacy: "private" | "public",
): CreatePlanRequest {
  const trimmedName = name.trim();
  const trimmedDescription = description.trim();
  if (
    !trimmedName ||
    trimmedName.length > 120 ||
    trimmedDescription.length > 2000
  ) {
    throw new Error(
      "Give your plan a name of 1–120 characters and a description of up to 2,000 characters.",
    );
  }
  return {
    name: trimmedName,
    ...(trimmedDescription ? { description: trimmedDescription } : {}),
    privacy,
  };
}

export const planKeys = {
  lists: (actor: string) => ["plans", actor, "list"] as const,
  list: (actor: string, status?: PlanStatus) =>
    ["plans", actor, "list", status ?? "all"] as const,
  detail: (actor: string, id: string) =>
    ["plans", actor, "detail", id] as const,
};
