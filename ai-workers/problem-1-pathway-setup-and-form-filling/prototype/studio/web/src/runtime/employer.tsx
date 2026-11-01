// C11.5 (P-106, BR-13; stand-in SI-10): "Relies on an employer case", offered only when a Retail combination's released
// forms read employer facts. The words come from the server's rule (engine/runtime/employer.ts); this only shows them.
import { Info } from "lucide-react";
import { useApi } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

export type EmployerLink = { offered: boolean; reason: string; facts: string[] };

const TIP = "Only for employer-specific work permits. The worker's case reads the employer's name, address and LMIA or offer number from a Corporate case, read-only.";

export function EmployerLinkLine({ link, loading, error }: { link?: EmployerLink; loading?: boolean; error?: string }) {
  return (
    <div className="text-sm" data-testid="employer-link">
      <p className="flex items-center gap-1 font-medium">Relies on an employer case<span title={TIP} aria-label={TIP} role="img" className="inline-flex text-text-muted"><Info className="size-3.5" aria-hidden /></span></p>
      {loading ? <Skeleton className="mt-1 h-4 w-2/3" /> : error ? <p className="text-xs text-danger">{error}</p> : link ? <p className="text-xs text-text-muted">{link.reason}</p> : null}
    </div>
  );
}

/** The "Open a case" line for the chosen combination (its newest release). */
export function EmployerLinkFor({ combinationId }: { combinationId?: string }) {
  const q = useApi<EmployerLink>(["runtime", "employer-link", combinationId ?? ""], combinationId ? `/runtime/combinations/${combinationId}/employer-link` : null);
  if (!combinationId) return null;
  return <EmployerLinkLine link={q.data} loading={q.isLoading} error={q.isError ? (q.error as Error).message : undefined} />;
}
