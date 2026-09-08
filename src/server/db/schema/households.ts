import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { timestamps } from "./shared";

export const households = sqliteTable("households", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  ...timestamps,
});
