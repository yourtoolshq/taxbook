import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createCaller } from "~/server/api/root";
import * as schema from "~/server/db/schema";

const migration = readFileSync(
  new URL("../../../../drizzle/0000_hesitant_earthquake.sql", import.meta.url),
  "utf8",
).replaceAll("--> statement-breakpoint", "");

describe("Tax Book API", () => {
  let client: Client;
  let caller: ReturnType<typeof createCaller>;
  let testDirectory: string;

  beforeEach(async () => {
    testDirectory = mkdtempSync(join(tmpdir(), "taxbook-test-"));
    client = createClient({ url: `file:${join(testDirectory, "test.db")}` });
    await client.executeMultiple(migration);
    const db = drizzle(client, { schema });
    caller = createCaller({ db, headers: new Headers() });
  });

  afterEach(() => {
    client.close();
    rmSync(testDirectory, { recursive: true, force: true });
  });

  it("initializes exactly once with fictional household data", async () => {
    expect(await caller.setup.state()).toEqual({ initialized: false });
    await caller.setup.initialize({
      householdName: "Example household",
      people: ["Person A", "Person B"],
      year: 2026,
    });
    expect(await caller.setup.state()).toEqual({ initialized: true });
    await expect(
      caller.setup.initialize({
        householdName: "Another household",
        people: ["Person C"],
        year: 2027,
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("creates items, aggregates the overview, and isolates tax years", async () => {
    await caller.setup.initialize({
      householdName: "Example household",
      people: ["Person A", "Person B"],
      year: 2026,
    });
    const settings = await caller.settings.get();
    const person = settings.people[0]!;
    await caller.taxItem.create({
      name: "Example employment income",
      type: "income",
      ownerKind: "person",
      personId: person.id,
      expectedAmountCents: 5000000,
      actualAmountCents: 1250000,
      status: "in_progress",
      notes: null,
    });
    await caller.taxItem.create({
      name: "Example contribution",
      type: "deduction_contribution",
      ownerKind: "household",
      personId: null,
      expectedAmountCents: 200000,
      actualAmountCents: null,
      status: "planned",
      notes: "Fictional test note",
    });

    const overview = await caller.taxItem.overview();
    expect(overview.amounts.income.actualAmountCents).toBe(1250000);
    expect(overview.amounts.deduction_contribution.expectedAmountCents).toBe(200000);
    expect(overview.statuses).toMatchObject({ planned: 1, in_progress: 1 });

    const originalYear = (await caller.taxYear.list()).find((year) => year.isActive)!;
    await caller.taxYear.create({ year: 2027 });
    expect((await caller.taxItem.list()).items).toHaveLength(0);
    await caller.taxYear.setActive({ id: originalYear.id });
    expect((await caller.taxItem.list()).items).toHaveLength(2);
  });

  it("validates ownership and protects referenced or final people", async () => {
    await caller.setup.initialize({
      householdName: "Example household",
      people: ["Person A", "Person B"],
      year: 2026,
    });
    const settings = await caller.settings.get();
    const [personA, personB] = settings.people;
    await expect(
      caller.taxItem.create({
        name: "Invalid owner",
        type: "other",
        ownerKind: "person",
        personId: null,
        expectedAmountCents: null,
        actualAmountCents: null,
        status: "planned",
        notes: null,
      }),
    ).rejects.toBeDefined();
    await caller.taxItem.create({
      name: "Owned item",
      type: "other",
      ownerKind: "person",
      personId: personA!.id,
      expectedAmountCents: 0,
      actualAmountCents: null,
      status: "complete",
      notes: null,
    });
    await expect(caller.settings.deletePerson({ id: personA!.id })).rejects.toMatchObject({ code: "CONFLICT" });
    await caller.settings.deletePerson({ id: personB!.id });
    await expect(caller.settings.deletePerson({ id: personA!.id })).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("updates and deletes items while preserving a recorded zero", async () => {
    await caller.setup.initialize({
      householdName: "Example household",
      people: ["Person A"],
      year: 2026,
    });
    const created = await caller.taxItem.create({
      name: "Example item",
      type: "other",
      ownerKind: "household",
      personId: null,
      expectedAmountCents: null,
      actualAmountCents: null,
      status: "planned",
      notes: null,
    });
    await caller.taxItem.update({
      id: created!.id,
      name: "Updated example item",
      type: "other",
      ownerKind: "household",
      personId: null,
      expectedAmountCents: null,
      actualAmountCents: 0,
      status: "complete",
      notes: null,
    });
    expect((await caller.taxItem.list()).items[0]).toMatchObject({
      name: "Updated example item",
      actualAmountCents: 0,
      status: "complete",
    });
    await caller.taxItem.delete({ id: created!.id });
    expect((await caller.taxItem.list()).items).toHaveLength(0);
  });

  it("manages household and unreferenced people", async () => {
    await caller.setup.initialize({
      householdName: "Example household",
      people: ["Person A"],
      year: 2026,
    });
    await caller.settings.renameHousehold({ name: "Renamed example household" });
    const added = await caller.settings.addPerson({ name: "Person B" });
    await caller.settings.renamePerson({ id: added!.id, name: "Person C" });
    let settings = await caller.settings.get();
    expect(settings.household.name).toBe("Renamed example household");
    expect(settings.people.map((person) => person.name)).toEqual(["Person A", "Person C"]);
    await caller.settings.deletePerson({ id: added!.id });
    settings = await caller.settings.get();
    expect(settings.people.map((person) => person.name)).toEqual(["Person A"]);
  });
});
