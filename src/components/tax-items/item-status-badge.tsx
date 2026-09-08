import { Badge } from "~/components/ui/badge";
import { itemStatusLabels, type ItemStatus } from "~/domain/tax-item";
import { cn } from "~/lib/utils";

const styles: Record<ItemStatus, string> = {
  planned: "border-slate-200 bg-slate-50 text-slate-700",
  in_progress: "border-amber-200 bg-amber-50 text-amber-800",
  complete: "border-emerald-200 bg-emerald-50 text-emerald-800",
};

export function ItemStatusBadge({
  status,
  className,
}: {
  status: ItemStatus;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn(styles[status], className)}>
      {itemStatusLabels[status]}
    </Badge>
  );
}
