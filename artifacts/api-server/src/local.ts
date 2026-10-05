import { createLocalDatabase } from "@workspace/db/local";
import { createApp } from "./app";
import type { PlansDatabase } from "./routes/plans";
import { resolve } from "node:path";
import { mkdir } from "node:fs/promises";

const directory = resolve(process.env.WEIN_LOCAL_DB_PATH || ".local/plans-db");
await mkdir(directory, { recursive: true });
const database = await createLocalDatabase(directory);
// Both adapters implement the same Drizzle PostgreSQL queries; their result HKT differs.
const app = createApp(database.db as unknown as PlansDatabase);
const port = Number(process.env.PLANS_PORT || 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error("Invalid PLANS_PORT");
const server = app.listen(port, "127.0.0.1", () => {
  console.log(
    `Local WEIN Plans API: http://127.0.0.1:${port} (data: ${directory})`,
  );
});
async function shutdown() {
  server.close(async () => {
    await database.close();
    process.exit(0);
  });
}
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
