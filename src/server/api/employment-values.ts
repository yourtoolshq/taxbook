import { asc, eq } from "drizzle-orm";

import { calculateEmploymentProjection } from "~/domain/employment";
import {
  employments,
  paycheques,
  taxItems,
  taxYears,
} from "~/server/db/schema";
import type { Database } from "./helpers";

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
type DatabaseWriter = Database | Transaction;

export async function employmentProjection(
  db: DatabaseWriter,
  employmentId: number,
) {
  const [employment] = await db
    .select({
      taxItemId: employments.taxItemId,
      payFrequency: employments.payFrequency,
      status: employments.status,
      typicalGrossOverrideCents: employments.typicalGrossOverrideCents,
      year: taxYears.year,
    })
    .from(employments)
    .innerJoin(taxYears, eq(employments.taxYearId, taxYears.id))
    .where(eq(employments.id, employmentId));
  if (!employment) return null;

  const rows = await db
    .select({
      grossPayCents: paycheques.grossPayCents,
      payDate: paycheques.payDate,
    })
    .from(paycheques)
    .where(eq(paycheques.employmentId, employmentId))
    .orderBy(asc(paycheques.payDate), asc(paycheques.id));

  return {
    taxItemId: employment.taxItemId,
    ...calculateEmploymentProjection({
      year: employment.year,
      status: employment.status,
      payFrequency: employment.payFrequency,
      typicalGrossOverrideCents: employment.typicalGrossOverrideCents,
      grossPaysCents: rows.map((row) => row.grossPayCents),
      latestPayDate: rows.at(-1)?.payDate ?? null,
    }),
  };
}

export async function syncEmploymentTaxItem(
  db: DatabaseWriter,
  employmentId: number,
) {
  const projection = await employmentProjection(db, employmentId);
  if (!projection) return;
  await db
    .update(taxItems)
    .set({
      actualAmountCents: projection.actualGrossCents,
      expectedAmountCents: projection.projectedGrossCents,
    })
    .where(eq(taxItems.id, projection.taxItemId));
}
