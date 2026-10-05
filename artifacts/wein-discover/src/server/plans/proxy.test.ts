import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { proxyPlans } from "./proxy";
import { plansProxyPattern } from "../../../vite.config";

test("development proxy matches list queries and detail paths without intercepting other APIs", () => {
  const matcher = new RegExp(plansProxyPattern);
  for (const path of [
    "/api/plans",
    "/api/plans?status=completed",
    "/api/plans/some-id",
  ])
    assert.ok(matcher.test(path));
  for (const path of ["/plans", "/api/discovery/search", "/api/plans-extra"])
    assert.equal(matcher.test(path), false);
});

const fetchOriginal = globalThis.fetch;
const baseOriginal = process.env.PLANS_API_URL;
afterEach(() => {
  globalThis.fetch = fetchOriginal;
  if (baseOriginal === undefined) delete process.env.PLANS_API_URL;
  else process.env.PLANS_API_URL = baseOriginal;
});
function result() {
  const data = { code: 0, body: undefined as unknown };
  const response = {
    status(code: number) {
      data.code = code;
      return response;
    },
    json(body: unknown) {
      data.body = body;
      return body;
    },
  };
  return { data, response };
}
const request = { method: "GET", headers: { "x-user-id": "owner" } };

test("proxy rejects unsupported methods, invalid IDs, missing configuration and identity", async () => {
  const { data, response } = result();
  await proxyPlans({ ...request, method: "DELETE" }, response);
  assert.equal(data.code, 405);
  await proxyPlans(request, response, "bad-id");
  assert.equal(data.code, 400);
  delete process.env.PLANS_API_URL;
  await proxyPlans(request, response);
  assert.equal(data.code, 503);
  process.env.PLANS_API_URL = "https://plans.example";
  await proxyPlans({ ...request, headers: {} }, response);
  assert.equal(data.code, 401);
});

test("proxy forwards list status, actor, and a bounded request signal", async () => {
  process.env.PLANS_API_URL = "https://plans.example/";
  globalThis.fetch = async (url, options) => {
    assert.equal(
      String(url),
      "https://plans.example/api/plans?status=planning",
    );
    assert.equal(new Headers(options?.headers).get("x-user-id"), "owner");
    assert.ok(options?.signal);
    return Response.json({ plans: [] });
  };
  const { data, response } = result();
  await proxyPlans({ ...request, query: { status: "planning" } }, response);
  assert.equal(data.code, 200);
  assert.deepEqual(data.body, { plans: [] });
  await proxyPlans({ ...request, query: { status: ["planning"] } }, response);
  assert.equal(data.code, 400);
});

test("proxy preserves create payload and upstream validation status", async () => {
  process.env.PLANS_API_URL = "https://plans.example";
  globalThis.fetch = async (_url, options) => {
    assert.equal(options?.method, "POST");
    assert.deepEqual(JSON.parse(options?.body as string), { name: "Dinner" });
    return Response.json({ message: "Invalid details" }, { status: 400 });
  };
  const { data, response } = result();
  await proxyPlans(
    { ...request, method: "POST", body: { name: "Dinner" } },
    response,
  );
  assert.equal(data.code, 400);
  assert.deepEqual(data.body, { message: "Invalid details" });
});

test("proxy preserves forbidden and missing detail responses", async () => {
  process.env.PLANS_API_URL = "https://plans.example";
  const id = "11111111-1111-4111-8111-111111111111";
  const { data, response } = result();
  for (const status of [403, 404]) {
    globalThis.fetch = async (url) => {
      assert.equal(String(url), `https://plans.example/api/plans/${id}`);
      return Response.json({ message: "No access" }, { status });
    };
    await proxyPlans(request, response, id);
    assert.equal(data.code, status);
  }
});

test("proxy handles timeouts and non-JSON backend responses without exposing details", async () => {
  process.env.PLANS_API_URL = "https://plans.example";
  const { data, response } = result();
  globalThis.fetch = async () => {
    throw new DOMException("timeout", "TimeoutError");
  };
  await proxyPlans(request, response);
  assert.equal(data.code, 502);
  globalThis.fetch = async () =>
    new Response("<html>backend failure</html>", { status: 500 });
  await proxyPlans(request, response);
  assert.equal(data.code, 502);
  assert.equal(JSON.stringify(data.body).includes("backend failure"), false);
});
