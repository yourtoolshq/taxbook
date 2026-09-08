import { createClient } from "@libsql/client";
import { readdir, readFile, rm } from "node:fs/promises";
import path from "node:path";

const databasePath = path.resolve(".data/e2e.db");
await Promise.all([
  rm(databasePath, { force: true }),
  rm(`${databasePath}-shm`, { force: true }),
  rm(`${databasePath}-wal`, { force: true }),
]);
const migrationFiles = (await readdir("drizzle"))
  .filter((file) => file.endsWith(".sql"))
  .sort();
const migration = (
  await Promise.all(
    migrationFiles.map((file) => readFile(path.join("drizzle", file), "utf8")),
  )
)
  .join("\n")
  .replaceAll("--> statement-breakpoint", "");
const client = createClient({ url: `file:${databasePath}` });
await client.executeMultiple(migration);
client.close();
