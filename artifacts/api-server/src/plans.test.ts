import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { once } from "node:events";
import { createLocalDatabase } from "@workspace/db/local";
import { createApp } from "./app";
import {
  CreatePlanResponse,
  GetPlanWorkspaceResponse,
  ListPlansResponse,
} from "@workspace/api-zod";
import { logger } from "./lib/logger";
import type { PlansDatabase } from "./routes/plans";
import type { Server } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";

let database: Awaited<ReturnType<typeof createLocalDatabase>>;
let server: Server;
let url: string;
let planId: string;
before(async () => {
  logger.level = "silent";
  database = await createLocalDatabase();
  server = createApp(database.db as unknown as PlansDatabase).listen(
    0,
    "127.0.0.1",
  );
  await once(server, "listening");
  url = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
after(async () => {
  server?.closeAllConnections();
  if (server)
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  await database?.close();
});

function request(path = "", actor: string | null = "owner", body?: unknown) {
  return fetch(`${url}/api/plans${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      ...(actor ? { "X-User-Id": actor } : {}),
      "Content-Type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

test("requires identity for list, create, and detail", async () => {
  assert.equal((await request("", null)).status, 401);
  assert.equal((await request("", null, { name: "No actor" })).status, 401);
  assert.equal(
    (await request("/00000000-0000-4000-8000-000000000001", null)).status,
    401,
  );
});

test("starts empty and rejects invalid create requests without storing a plan", async () => {
  assert.deepEqual(await (await request()).json(), { plans: [] });
  for (const body of [
    {},
    { name: "" },
    { name: "   " },
    { name: 42 },
    { name: "x".repeat(121) },
    { name: "Too long", description: "x".repeat(2001) },
    { name: "Bad privacy", privacy: "friends" },
  ]) {
    assert.equal((await request("", "owner", body)).status, 400);
  }
  assert.deepEqual(await (await request()).json(), { plans: [] });
});

test("creates a trimmed private plan with owner membership and attendance atomically", async () => {
  const response = await request("", "owner", {
    name: "  Friday night  ",
    description: "Dinner together",
  });
  assert.equal(response.status, 201);
  const plan = CreatePlanResponse.parse(await response.json());
  planId = plan.id;
  assert.equal(plan.name, "Friday night");
  assert.equal(plan.creatorUserId, "owner");
  assert.equal(plan.privacy, "private");
  assert.equal(plan.status, "planning");
  assert.ok(plan.createdAt);
  const detail = GetPlanWorkspaceResponse.parse(
    await (await request(`/${planId}`)).json(),
  );
  assert.equal(detail.plan.id, planId);
  assert.equal(detail.members.length, 1);
  assert.equal(detail.members[0].role, "owner");
  assert.equal(detail.members[0].canFinalize, true);
  assert.equal(detail.attendance[0].status, "going");
  for (const key of ["messages", "sharedItems", "polls", "media"] as const)
    assert.deepEqual(detail[key], []);
  assert.equal(detail.decision, null);
  assert.equal(detail.memory, null);
});

test("lists only member plans and filters by status", async () => {
  const list = ListPlansResponse.parse(await (await request()).json());
  assert.equal(list.plans.length, 1);
  assert.equal(list.plans[0].id, planId);
  assert.equal(
    ListPlansResponse.parse(await (await request("?status=planning")).json())
      .plans.length,
    1,
  );
  assert.deepEqual(await (await request("?status=completed")).json(), {
    plans: [],
  });
  assert.equal((await request("?status=unknown")).status, 400);
  assert.deepEqual(await (await request("", "other")).json(), { plans: [] });
});

test("preserves public visibility without granting nonmembers access", async () => {
  const response = await request("", "owner", {
    name: "Public outing",
    privacy: "public",
  });
  assert.equal(response.status, 201);
  const plan = CreatePlanResponse.parse(await response.json());
  assert.equal(plan.privacy, "public");
  assert.equal((await request(`/${plan.id}`, "other")).status, 403);
});

test("reports forbidden, missing, and malformed plan IDs correctly", async () => {
  assert.equal((await request(`/${planId}`, "other")).status, 403);
  assert.equal(
    (await request("/00000000-0000-4000-8000-000000000001")).status,
    404,
  );
  assert.equal((await request("/not-a-uuid")).status, 400);
});

test("rejects malformed JSON with 400 rather than a server error", async () => {
  const response = await fetch(`${url}/api/plans`, {
    method: "POST",
    headers: { "X-User-Id": "owner", "Content-Type": "application/json" },
    body: "{",
  });
  assert.equal(response.status, 400);
});

test("local database persists across restarts and migrations can run again", async () => {
  const directory = await mkdtemp(join(tmpdir(), "wein-plans-test-"));
  let local: Awaited<ReturnType<typeof createLocalDatabase>> | undefined;
  try {
    local = await createLocalDatabase(directory);
    const { plansTable } = await import("@workspace/db/schema");
    await local.db
      .insert(plansTable)
      .values({ creatorUserId: "persisted", name: "Saved outing" });
    await local.close();
    local = await createLocalDatabase(directory);
    const plans = await local.db.select().from(plansTable);
    assert.equal(plans.length, 1);
    assert.equal(plans[0].name, "Saved outing");
  } finally {
    await local?.close();
    if (!resolve(directory).startsWith(resolve(tmpdir()) + sep))
      throw new Error("Unexpected temporary directory");
    await rm(directory, { recursive: true, force: true });
  }
});
