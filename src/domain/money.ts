export function formatCad(cents: number | null) {
  if (cents === null) return "—";
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function dollarsToCents(value: string): number | null {
  const normalized = value.trim().replaceAll(",", "");
  if (normalized === "") return null;
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * 100);
}

export function centsToDollars(value: number | null) {
  return value === null ? "" : (value / 100).toFixed(2);
}
