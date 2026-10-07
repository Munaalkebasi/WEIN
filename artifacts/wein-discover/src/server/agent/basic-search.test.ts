import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { handleAgentRequest } from "./chat.js";

const fetchOriginal = globalThis.fetch;
const keys = { OPENAI_API_KEY: process.env.OPENAI_API_KEY, TICKETMASTER_API_KEY: process.env.TICKETMASTER_API_KEY };
afterEach(() => {
  globalThis.fetch = fetchOriginal;
  for (const [name, value] of Object.entries(keys)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});
const request = (content: string, search: object = { latitude: 49, longitude: -123 }) => ({ messages: [{ role: "user", content }], search });
const event = (id: string, price?: number, latitude = "49") => ({ id, name: id, priceRanges: price === undefined ? [] : [{ min: price, max: price, currency: "CAD" }], _embedded: { venues: [{ location: { latitude, longitude: "-123" } }] } });

test("missing AI key searches real events with the screenshot budget and radius, excludes unknown prices and distant events", async () => {
  delete process.env.OPENAI_API_KEY;
  process.env.TICKETMASTER_API_KEY = "test-ticketmaster";
  globalThis.fetch = async url => {
    assert.match(String(url), /app.ticketmaster.com/);
    assert.equal(new URL(String(url)).searchParams.get("radius"), "10");
    return Response.json({ _embedded: { events: [event("match", 15), event("expensive", 30), event("unknown"), event("far", 10, "50")] } });
  };
  const result = await handleAgentRequest("POST", request("20 dollars within 10km"));
  assert.equal(result.status, 200);
  const data = result.body as any;
  assert.equal(data.mode, "basic");
  assert.equal(data.search.maxPrice, 20);
  assert.equal(data.search.radiusKm, 10);
  assert.deepEqual(data.events.map((e: any) => e.providerId), ["match"]);
  assert.doesNotMatch(JSON.stringify(data), /test-ticketmaster/);
});

test("429 switches to basic search and preserves previous constraints", async () => {
  process.env.OPENAI_API_KEY = "test-openai";
  process.env.TICKETMASTER_API_KEY = "test-ticketmaster";
  let calls = 0;
  globalThis.fetch = async url => {
    calls++;
    return String(url).includes("api.openai.com") ? Response.json({ error: { code: "insufficient_quota" } }, { status: 429 }) : Response.json({});
  };
  const result = await handleAgentRequest("POST", request("within 20 km", { latitude: 49, longitude: -123, maxPrice: 20, category: "Music" }));
  assert.equal(calls, 2);
  assert.equal(result.status, 200);
  const data = result.body as any;
  assert.equal(data.search.maxPrice, 20);
  assert.equal(data.search.category, "Music");
  assert.equal(data.search.radiusKm, 20);
  assert.equal(data.searched, true);
  assert.deepEqual(data.events, []);
});

test("unsupported dates, invalid filters and absent map locations ask for clarification without searching", async () => {
  delete process.env.OPENAI_API_KEY;
  globalThis.fetch = async () => { throw new Error("must not search"); };
  for (const [text, location] of [["20 dollars tomorrow", {city:"Vancouver"}], ["within 10km", {}], ["within 10km", {city:"Vancouver"}], ["within 1001km", {latitude:49,longitude:-123}]] as const) {
    const result = await handleAgentRequest("POST", request(text, location));
    assert.equal(result.status, 200);
    assert.equal((result.body as any).searched, false);
  }
});

test("failed provider keeps an error response without exposing upstream secrets", async () => {
  delete process.env.OPENAI_API_KEY;
  process.env.TICKETMASTER_API_KEY = "test-ticketmaster";
  globalThis.fetch = async () => new Response("test-ticketmaster", { status: 500 });
  const result = await handleAgentRequest("POST", request("20 dollars"));
  assert.equal(result.status, 503);
  assert.doesNotMatch(JSON.stringify(result.body), /test-ticketmaster/);
});
