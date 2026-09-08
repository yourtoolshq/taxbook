"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { centsToDollars, dollarsToCents } from "~/domain/money";
import { api, type RouterOutputs } from "~/trpc/react";

type Employment = RouterOutputs["employment"]["list"]["items"][number];
type Paycheque = RouterOutputs["paycheque"]["list"]["items"][number];

const amountFields = [
  ["grossPayCents", "Gross pay"],
  ["incomeTaxCents", "Income tax withheld"],
  ["cppCents", "CPP"],
  ["cpp2Cents", "CPP2"],
  ["eiCents", "EI"],
  ["otherDeductionsCents", "Other deductions"],
  ["netPayCents", "Net pay"],
] as const;

type AmountField = (typeof amountFields)[number][0];

export function PaychequeFormSheet({
  paycheque,
  employments,
  initialEmploymentId,
  year,
  open,
  onOpenChange,
}: {
  paycheque: Paycheque | null;
  employments: Employment[];
  initialEmploymentId: number | null;
  year: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const utils = api.useUtils();
  const [employmentId, setEmploymentId] = useState(
    String(paycheque?.employmentId ?? initialEmploymentId ?? employments[0]?.id ?? ""),
  );
  const [payDate, setPayDate] = useState(paycheque?.payDate ?? "");
  const [amounts, setAmounts] = useState<Record<AmountField, string>>(() =>
    Object.fromEntries(
      amountFields.map(([field]) => [
        field,
        centsToDollars(paycheque?.[field] ?? (field === "grossPayCents" || field === "netPayCents" ? null : 0)),
      ]),
    ) as Record<AmountField, string>,
  );

  const finish = async (message: string) => {
    await Promise.all([
      utils.paycheque.list.invalidate(),
      utils.employment.list.invalidate(),
      utils.taxItem.list.invalidate(),
      utils.taxItem.overview.invalidate(),
    ]);
    toast.success(message);
    onOpenChange(false);
  };
  const create = api.paycheque.create.useMutation({
    onSuccess: () => finish("Paycheque added."),
    onError: (error) => toast.error(error.message),
  });
  const update = api.paycheque.update.useMutation({
    onSuccess: () => finish("Paycheque updated."),
    onError: (error) => toast.error(error.message),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = Object.fromEntries(
      amountFields.map(([field]) => [field, dollarsToCents(amounts[field])]),
    ) as Record<AmountField, number | null>;
    const invalid = amountFields.find(([field]) => parsed[field] === null);
    if (invalid) {
      toast.error(`${invalid[1]} must be zero or a positive dollar value.`);
      return;
    }
    const values = {
      employmentId: Number(employmentId),
      payDate,
      ...(parsed as Record<AmountField, number>),
    };
    if (paycheque) update.mutate({ id: paycheque.id, ...values });
    else create.mutate(values);
  }

  const pending = create.isPending || update.isPending;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <form className="flex min-h-full flex-col" onSubmit={submit}>
          <SheetHeader>
            <SheetTitle>{paycheque ? "Edit paycheque" : "Add paycheque"}</SheetTitle>
            <SheetDescription>Enter the amounts shown on the pay statement.</SheetDescription>
          </SheetHeader>
          <div className="flex-1 space-y-6 px-4 py-6">
            <div className="space-y-2">
              <Label>Employment</Label>
              <Select value={employmentId} onValueChange={setEmploymentId}>
                <SelectTrigger aria-label="Employment"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {employments.map((employment) => (
                    <SelectItem key={employment.id} value={String(employment.id)}>
                      {employment.personName} — {employment.employerName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay-date">Pay date</Label>
              <Input id="pay-date" type="date" min={`${year}-01-01`} max={`${year}-12-31`} value={payDate} onChange={(event) => setPayDate(event.target.value)} required />
              <p className="text-xs text-muted-foreground">The pay date determines the tax year.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {amountFields.map(([field, label]) => (
                <div key={field} className={`space-y-2 ${field === "grossPayCents" || field === "netPayCents" ? "sm:col-span-2" : ""}`}>
                  <Label htmlFor={field}>{label}</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-sm text-muted-foreground">$</span>
                    <Input
                      id={field}
                      className="pl-7 tabular-nums"
                      inputMode="decimal"
                      value={amounts[field]}
                      onChange={(event) => setAmounts((current) => ({ ...current, [field]: event.target.value }))}
                      required
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button disabled={pending}>{pending ? "Saving…" : paycheque ? "Save changes" : "Add paycheque"}</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
