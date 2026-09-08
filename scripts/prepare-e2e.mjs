import { createClient } from "@libsql/client";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";

const databasePath = path.resolve(".data/e2e.db");
await Promise.all([
  rm(databasePath, { force: true }),
  rm(`${databasePath}-shm`, { force: true }),
  rm(`${databasePath}-wal`, { force: true }),
]);
const migration = (
  await readFile("drizzle/0000_hesitant_earthquake.sql", "utf8")
).replaceAll("--> statement-breakpoint", "");
const client = createClient({ url: `file:${databasePath}` });
await client.executeMultiple(migration);
client.close();
