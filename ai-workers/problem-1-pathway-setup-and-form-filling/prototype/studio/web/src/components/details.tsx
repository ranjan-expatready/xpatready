// UX-A part 4 (P-273; UX baseline 2 Nov finding 4; EXPERIENCE §5: "no hashes, IDs, decision numbers, model names or file
// paths on the main path ('Details' drawer for admins)"): one collapsed "Details" disclosure, closed by default, that holds
// the internal identifiers an admin may need (a shared field's key, the AI model, a saved run's file, a job id, budget
// lines). The main path names things by form, person and date instead. The shared fold-out (BK-2, components/fold-out.tsx):
// native details and summary, so keyboard and screen readers work without script, and the arrow shows there is more.
import * as React from "react";
import { cn } from "@/lib/utils";
import { FoldOut } from "@/components/fold-out";

export function AdminDetails({ items, className }: { items: [string, React.ReactNode][]; className?: string }) {
  const shown = items.filter(([, v]) => v !== null && v !== undefined && v !== "");
  if (!shown.length) return null;
  return (
    <FoldOut className={cn("text-xs text-text-muted", className)} data-admin-details summaryClassName="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-primary" summary="Details (for admins)">
      <dl className="mt-1 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5">
        {shown.map(([k, v]) => <React.Fragment key={k}><dt>{k}</dt><dd className="mono break-words [overflow-wrap:anywhere]">{v}</dd></React.Fragment>)}
      </dl>
    </FoldOut>
  );
}
