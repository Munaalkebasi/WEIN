import { afterEach, expect, test, vi } from "vitest";
import { buildPlanInput, getPlansActor, planKeys } from "./api";

afterEach(() => vi.restoreAllMocks());
test("identity persists across reloads and remains stable when storage is unavailable", async () => {
  const actor = getPlansActor();
  expect(window.localStorage.getItem("wein-plans-actor")).toBe(actor);
  vi.resetModules();
  expect((await import("./api")).getPlansActor()).toBe(actor);
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("storage denied");
  });
  vi.resetModules();
  const api = await import("./api");
  expect(api.getPlansActor()).toBe(api.getPlansActor());
});
test("validates boundaries, omits an empty description, and scopes cache by actor", () => {
  expect(buildPlanInput(" A plan ", " ", "private")).toEqual({
    name: "A plan",
    privacy: "private",
  });
  expect(() => buildPlanInput("x".repeat(121), "", "private")).toThrow();
  expect(() => buildPlanInput("Plan", "x".repeat(2001), "private")).toThrow();
  expect(
    buildPlanInput("x".repeat(120), "x".repeat(2000), "public").name.length,
  ).toBe(120);
  expect(planKeys.list("one")).not.toEqual(planKeys.list("two"));
});
