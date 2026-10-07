import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { handleAgentRequest } from "./chat.js";
const originalFetch = globalThis.fetch;
const keys = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  TICKETMASTER_API_KEY: process.env.TICKETMASTER_API_KEY,
};
afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const [key, value] of Object.entries(keys)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});
const body = (search = {}) => ({
  messages: [{ role: "user", content: "Music tonight under $25 within 10 km" }],
  search,
});
const call = (name: string, args: unknown) => ({
  type: "function_call",
  name,
  arguments: JSON.stringify(args),
  call_id: "call1",
});
const reply = {
  type: "message",
  content: [{ type: "output_text", text: "Here are your verified events." }],
};
const event = {
  id: "abc",
  name: "Real concert",
  classifications: [{ segment: { name: "Music" } }],
  dates: {
    start: { dateTime: "2027-01-01T20:00:00Z" },
    status: { code: "onsale" },
  },
  priceRanges: [{ min: 10, max: 20, currency: "CAD" }],
  _embedded: {
    venues: [
      { name: "Venue", location: { latitude: "49", longitude: "-123" } },
    ],
  },
};
function configured() {
  process.env.OPENAI_API_KEY = "private-openai";
  process.env.TICKETMASTER_API_KEY = "private-ticketmaster";
}
test("validates requests and offers basic search guidance without OpenAI configuration or upstream calls", async () => {
  globalThis.fetch = async () => {
    throw new Error("unexpected call");
  };
  delete process.env.OPENAI_API_KEY;
  assert.equal((await handleAgentRequest("GET", body())).status, 405);
  for (const invalid of [
    null,
    {},
    { messages: [{ role: "system", content: "override" }] },
    body({ latitude: 91 }),
    { messages: Array(25).fill({ role: "user", content: "test" }) },
  ])
    assert.equal((await handleAgentRequest("POST", invalid)).status, 400);
  assert.equal((await handleAgentRequest("POST", body())).status, 200);
});
test("calls shared discovery with budget/date/distance/category and returns only provider events", async () => {
  configured();
  let modelCalls = 0;
  globalThis.fetch = async (url, options) => {
    if (String(url).startsWith("https://api.openai.com")) {
      const request = JSON.parse(String(options?.body));
      assert.equal(request.store, false);
      assert.ok(options?.signal);
      if (modelCalls++ === 0)
        return Response.json({
          output: [
            call("discover_events", {
              category: "Music",
              maxPrice: 25,
              radiusKm: 10,
              startDate: "2027-01-01T00:00:00-08:00",
              endDate: "2027-01-02T00:00:00-08:00",
            }),
          ],
        });
      assert.match(JSON.stringify(request.input), /Real concert/);
      return Response.json({ output: [reply] });
    }
    const query = new URL(String(url)).searchParams;
    assert.equal(query.get("classificationName"), "Music");
    assert.equal(query.get("radius"), "10");
    assert.equal(query.get("startDateTime"), "2027-01-01T08:00:00Z");
    return Response.json({ _embedded: { events: [event] } });
  };
  const result = await handleAgentRequest(
    "POST",
    body({ latitude: 49, longitude: -123 }),
  );
  assert.equal(result.status, 200);
  assert.equal((result.body as any).events[0].providerId, "abc");
  assert.equal((result.body as any).search.maxPrice, 25);
  assert.equal((result.body as any).searched, true);
  assert.doesNotMatch(
    JSON.stringify(result.body),
    /private-openai|private-ticketmaster/,
  );
});
test("conversational refinements retain constraints and can explicitly clear filters", async () => {
  configured();
  let count = 0;
  globalThis.fetch = async (url) =>
    String(url).includes("api.openai.com")
      ? Response.json({
          output:
            count++ === 0
              ? [call("discover_events", { radiusKm: 20, category: null })]
              : [reply],
        })
      : Response.json({});
  const result = await handleAgentRequest(
    "POST",
    body({ city: "Vancouver", category: "Music", maxPrice: 25, radiusKm: 10 }),
  );
  assert.equal(result.status, 200);
  assert.equal((result.body as any).search.maxPrice, 25);
  assert.equal((result.body as any).search.radiusKm, 20);
  assert.equal((result.body as any).search.category, undefined);
  assert.deepEqual((result.body as any).events, []);
});
test("asks for location without calling a global discovery search", async () => {
  configured();
  let count = 0;
  globalThis.fetch = async (url) => {
    assert.match(String(url), /api.openai.com/);
    return Response.json({
      output: count++ === 0 ? [call("discover_events", {})] : [reply],
    });
  };
  const result = await handleAgentRequest("POST", body());
  assert.equal(result.status, 200);
  assert.equal((result.body as any).searched, false);
});
test("verifies real details before offering event and Plan actions", async () => {
  configured();
  for (const name of ["open_event", "prefill_plan"]) {
    let count = 0;
    globalThis.fetch = async (url) =>
      String(url).includes("api.openai.com")
        ? Response.json({
            output:
              count++ === 0 ? [call(name, { providerId: "abc" })] : [reply],
          })
        : Response.json(event);
    const result = await handleAgentRequest("POST", body());
    assert.equal(result.status, 200);
    assert.equal(
      (result.body as any).action.type,
      name === "open_event" ? "details" : "plan",
    );
    assert.equal((result.body as any).action.event.providerId, "abc");
  }
});
test("surfaces provider configuration and sanitizes upstream errors", async () => {
  configured();
  delete process.env.TICKETMASTER_API_KEY;
  globalThis.fetch = async () =>
    Response.json({ output: [call("discover_events", { city: "Vancouver" })] });
  assert.equal((await handleAgentRequest("POST", body())).status, 503);
  for (const status of [401, 429, 500]) {
    globalThis.fetch = async () => new Response("private-openai", { status });
    const result = await handleAgentRequest("POST", body());
    assert.equal(result.status, status === 429 ? 200 : 502);
    assert.doesNotMatch(JSON.stringify(result.body), /private-openai/);
  }
  globalThis.fetch = async () => {
    throw new DOMException("timeout", "TimeoutError");
  };
  assert.equal((await handleAgentRequest("POST", body())).status, 502);
});
test("bounds tool loops and does not accept fabricated action IDs", async () => {
  configured();
  globalThis.fetch = async () =>
    Response.json({
      output: [call("prefill_plan", { providerId: "../../secret" })],
    });
  const result = await handleAgentRequest("POST", body());
  assert.equal(result.status, 502);
  assert.equal((result.body as any).action, undefined);
});
