import { z } from "zod";

export const itemTypes = [
  "income",
  "deduction_contribution",
  "eligible_expense",
  "credit_benefit",
  "other",
] as const;
export const itemStatuses = ["planned", "in_progress", "complete"] as const;
export const ownerKinds = ["household", "person"] as const;
export const valueSources = ["manual", "paycheques"] as const;

export type ItemType = (typeof itemTypes)[number];
export type ItemStatus = (typeof itemStatuses)[number];
export type ValueSource = (typeof valueSources)[number];

export const itemTypeLabels: Record<ItemType, string> = {
  income: "Income",
  deduction_contribution: "Deduction / contribution",
  eligible_expense: "Eligible expense",
  credit_benefit: "Credit / benefit",
  other: "Other",
};

export const itemStatusLabels: Record<ItemStatus, string> = {
  planned: "Planned",
  in_progress: "In progress",
  complete: "Complete",
};

const name = z.string().trim().min(1).max(100);

export const setupInput = z.object({
  householdName: name,
  people: z.array(name).min(1).max(12),
  year: z.number().int().min(2000).max(2100),
});

export const taxItemInput = z
  .object({
    name,
    taxLineReference: z.string().trim().max(50).nullable(),
    type: z.enum(itemTypes),
    ownerKind: z.enum(ownerKinds),
    personId: z.number().int().positive().nullable(),
    expectedAmountCents: z.number().int().nonnegative().nullable(),
    actualAmountCents: z.number().int().nonnegative().nullable(),
    status: z.enum(itemStatuses),
    notes: z.string().trim().max(4000).nullable(),
  })
  .superRefine((value, context) => {
    const valid =
      (value.ownerKind === "household" && value.personId === null) ||
      (value.ownerKind === "person" && value.personId !== null);
    if (!valid) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["personId"],
        message: "Choose a person for person-owned items.",
      });
    }
  });

export type TaxItemInput = z.infer<typeof taxItemInput>;
export const taxItemUpdateInput = z.intersection(
  taxItemInput,
  z.object({ id: z.number().int().positive() }),
);
