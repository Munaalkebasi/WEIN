import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { fileURLToPath } from "node:url";
import * as schema from "./schema";

/** Embedded PostgreSQL for local development and isolated integration tests. */
export async function createLocalDatabase(dataDir?: string) {
  const client = new PGlite(dataDir);
  const db = drizzle(client, { schema });
  try {
    await migrate(db, {
      migrationsFolder: fileURLToPath(
        new URL("../migrations", import.meta.url),
      ),
    });
    return { db, close: () => client.close() };
  } catch (error) {
    await client.close();
    throw error;
  }
}
