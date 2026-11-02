// UX-A part 4 (P-273; UX baseline 2 Nov finding 4; EXPERIENCE §5: "no hashes, IDs, decision numbers, model names or file
// paths on the main path ('Details' drawer for admins)"): one collapsed "Details" disclosure, closed by default, that holds
// the internal identifiers an admin may need (a shared field's key, the AI model, a saved run's file, a job id, budget
// lines). The main path names things by form, person and date instead. Native <details>: keyboard and screen readers
// work without script.
import * as React from "react";
import { cn } from "@/lib/utils";

export function AdminDetails({ items, className }: { items: [string, React.ReactNode][]; className?: string }) {
  const shown = items.filter(([, v]) => v !== null && v !== undefined && v !== "");
  if (!shown.length) return null;
  return (
    <details className={cn("text-xs text-text-muted", className)} data-admin-details>
      <summary className="cursor-pointer rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-primary">Details (for admins)</summary>
      <dl className="mt-1 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5">
        {shown.map(([k, v]) => <React.Fragment key={k}><dt>{k}</dt><dd className="mono break-words [overflow-wrap:anywhere]">{v}</dd></React.Fragment>)}
      </dl>
    </details>
  );
}
