import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createCaller } from "~/server/api/root";
import * as schema from "~/server/db/schema";

const migrationsDirectory = new URL("../../../../drizzle/", import.meta.url);
const migration = readdirSync(migrationsDirectory)
  .filter((file) => file.endsWith(".sql"))
  .sort()
  .map((file) => readFileSync(new URL(file, migrationsDirectory), "utf8"))
  .join("\n")
  .replaceAll("--> statement-breakpoint", "");

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
      taxLineReference: "10100",
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
      taxLineReference: "20800",
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
    expect((await caller.taxItem.list()).items[0]).toMatchObject({
      taxLineReference: "20800",
    });

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
        taxLineReference: null,
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
      taxLineReference: null,
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
      taxLineReference: null,
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
      taxLineReference: "Schedule 1",
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
      taxLineReference: "Schedule 1",
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

  it("tracks paycheques and keeps employment Tax Items synchronized", async () => {
    await caller.setup.initialize({
      householdName: "Example household",
      people: ["Person A", "Person B"],
      year: 2026,
    });
    const [personA, personB] = (await caller.settings.get()).people;
    const current = await caller.employment.create({
      personId: personA!.id,
      employerName: "Employer A",
      payFrequency: "biweekly",
      status: "active",
      endDate: null,
      typicalGrossOverrideCents: null,
    });
    const previous = await caller.employment.create({
      personId: personB!.id,
      employerName: "Employer B",
      payFrequency: "monthly",
      status: "ended",
      endDate: "2026-03-31",
      typicalGrossOverrideCents: null,
    });

    const first = await caller.paycheque.create({
      employmentId: current!.id,
      payDate: "2026-06-05",
      grossPayCents: 100_000,
      incomeTaxCents: 20_000,
      cppCents: 5_000,
      cpp2Cents: 0,
      eiCents: 2_000,
      otherDeductionsCents: 3_000,
      netPayCents: 70_000,
    });
    const second = await caller.paycheque.create({
      employmentId: current!.id,
      payDate: "2026-06-19",
      grossPayCents: 120_000,
      incomeTaxCents: 24_000,
      cppCents: 6_000,
      cpp2Cents: 500,
      eiCents: 2_400,
      otherDeductionsCents: 3_000,
      netPayCents: 84_100,
    });
    await caller.paycheque.create({
      employmentId: previous!.id,
      payDate: "2026-03-31",
      grossPayCents: 90_000,
      incomeTaxCents: 18_000,
      cppCents: 4_500,
      cpp2Cents: 0,
      eiCents: 1_800,
      otherDeductionsCents: 0,
      netPayCents: 65_700,
    });

    let employmentList = await caller.employment.list();
    expect(employmentList.items).toHaveLength(2);
    expect(employmentList.items.find((item) => item.id === current!.id)?.projection).toMatchObject({
      actualGrossCents: 220_000,
      averageGrossCents: 110_000,
    });
    expect(employmentList.items.find((item) => item.id === previous!.id)?.projection).toMatchObject({
      actualGrossCents: 90_000,
      projectedGrossCents: 90_000,
      remainingPaycheques: 0,
    });

    let items = (await caller.taxItem.list()).items;
    const currentItem = items.find((item) => item.name === "Employment income — Employer A")!;
    expect(currentItem).toMatchObject({
      actualAmountCents: 220_000,
      ownerKind: "person",
      personId: personA!.id,
      taxLineReference: "10100",
      valueSource: "paycheques",
    });
    await expect(
      caller.taxItem.delete({ id: currentItem.id }),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    await caller.paycheque.update({
      id: second!.id,
      employmentId: current!.id,
      payDate: "2026-06-19",
      grossPayCents: 140_000,
      incomeTaxCents: 28_000,
      cppCents: 7_000,
      cpp2Cents: 700,
      eiCents: 2_800,
      otherDeductionsCents: 3_000,
      netPayCents: 98_500,
    });
    items = (await caller.taxItem.list()).items;
    expect(items.find((item) => item.id === currentItem.id)?.actualAmountCents).toBe(240_000);

    await caller.paycheque.delete({ id: first!.id });
    employmentList = await caller.employment.list();
    expect(employmentList.items.find((item) => item.id === current!.id)?.projection?.actualGrossCents).toBe(140_000);

    await caller.employment.delete({ id: previous!.id });
    expect((await caller.paycheque.list()).items).toHaveLength(1);
    expect((await caller.taxItem.list()).items).toHaveLength(1);
  });

  it("keeps employment and paycheque data inside the active tax year", async () => {
    await caller.setup.initialize({
      householdName: "Example household",
      people: ["Person A"],
      year: 2026,
    });
    const person = (await caller.settings.get()).people[0]!;
    const employment = await caller.employment.create({
      personId: person.id,
      employerName: "Employer A",
      payFrequency: "weekly",
      status: "active",
      endDate: null,
      typicalGrossOverrideCents: null,
    });
    await expect(
      caller.paycheque.create({
        employmentId: employment!.id,
        payDate: "2025-12-31",
        grossPayCents: 100_000,
        incomeTaxCents: 0,
        cppCents: 0,
        cpp2Cents: 0,
        eiCents: 0,
        otherDeductionsCents: 0,
        netPayCents: 100_000,
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await caller.taxYear.create({ year: 2027 });
    expect((await caller.employment.list()).items).toHaveLength(0);
    expect((await caller.paycheque.list()).items).toHaveLength(0);
  });
});
