import { Badge } from "~/components/ui/badge";
import {
  taxDocumentStatusLabels,
  type TaxDocumentStatus,
} from "~/domain/tax-document";

const styles: Record<TaxDocumentStatus, string> = {
  expected: "border-slate-200 bg-slate-50 text-slate-700",
  received: "border-amber-200 bg-amber-50 text-amber-800",
  ready: "border-emerald-200 bg-emerald-50 text-emerald-800",
  used: "border-blue-200 bg-blue-50 text-blue-800",
};

export function TaxDocumentStatusBadge({
  status,
}: {
  status: TaxDocumentStatus;
}) {
  return (
    <Badge variant="outline" className={styles[status]}>
      {taxDocumentStatusLabels[status]}
    </Badge>
  );
}
