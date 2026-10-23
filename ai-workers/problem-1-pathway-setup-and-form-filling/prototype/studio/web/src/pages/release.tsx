// Review and release (P-23): one shared draft, one release for everything. Lists every combination whose draft differs
// from what firms use, what is held back and why, and releases the rest as the next release. A different person from
// every author releases (BR-14); the server enforces it, the screen says so before anyone tries.
import * as React from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { api, useActorId, useApi, useToast } from "@/lib/api";
import { Button, Notice, Table } from "@/components/ui/controls";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { fmtDate } from "@/components/status";

export function ReleasePage() {
  const qc = useQueryClient(); const toast = useToast();
  const actorId = useActorId();
  const session = useApi<any>(["session", actorId], "/session");
  const d = useApi<any>(["draft"], "/draft");
  const [busy, setBusy] = React.useState(false), [err, setErr] = React.useState<string | null>(null), [done, setDone] = React.useState<any>(null);
  const canApprove = (session.data?.actor?.duties ?? []).includes("approve");
  const release = async () => {
    setBusy(true); setErr(null);
    try {
      const r = await api("/pack/release", { method: "POST", json: { expectedChanges: d.data.changes } });
      setDone(r); toast.push({ tone: "ok", text: `Release ${r.pack} published: ${r.rows.length} combination${r.rows.length === 1 ? "" : "s"}` });
      void qc.invalidateQueries();
    } catch (e) { setErr((e as Error).message); void d.refetch(); } finally { setBusy(false); }
  };
  if (d.isLoading) return <Spinner label="Loading the shared draft" />;
  if (d.isError) return <Notice tone="danger" title="The draft could not be loaded">{(d.error as Error).message}</Notice>;
  const x = d.data;
  const ok = x.rows.filter((r: any) => !r.held), held = x.rows.filter((r: any) => r.held);
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <nav aria-label="Breadcrumb" className="text-xs text-text-muted"><Link to="/" className="hover:underline">Programs</Link> › Review and release</nav>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Review and release</h1>
        <p className="mt-1 text-sm text-text-muted">Everyone's changes are in one shared draft. Releasing publishes them together as the next release; firms keep what was approved until then. {x.last ? `Last release: Release ${x.last.version}, ${fmtDate(x.last.at)}.` : "Nothing released yet."}</p>
      </div>
      {done ? <Notice tone="ok" title={`Release ${done.pack} published`}>{done.rows.map((r: any) => r.label).join(", ")}.{done.held.length ? ` Held back: ${done.held.map((h: any) => h.label).join(", ")}.` : ""} <Link className="text-text-link underline" to="/">Back to Programs</Link></Notice> : null}
      {!x.rows.length ? <EmptyState title="Nothing to release" description="The shared draft has no changes since the last release. Changes appear here as soon as someone edits a combination." action={<Button asChild variant="secondary"><Link to="/">Back to Programs</Link></Button>} /> : (
        <>
          <p className="rounded-lg border border-border bg-surface-raised px-4 py-3 text-sm" aria-live="polite"><b>{x.changes} draft change{x.changes === 1 ? "" : "s"}</b> across <b>{x.rows.length} combination{x.rows.length === 1 ? "" : "s"}</b>. The list below shows each combination's count and whether it can be released.</p>
          <Table head={["Combination", "Changes", "In this release"]}>
            {x.rows.map((r: any) => (
              <tr key={r.combinationId}>
                <td><Link className="font-medium text-text-link hover:underline" to={`/c/${r.combinationId}/review`}>{r.label}</Link><p className="text-xs text-text-muted">{r.path.join(" › ")}{r.released ? "" : " · first release"}</p></td>
                <td className="tabular-nums">{r.changes}</td>
                <td>{r.held ? <span className="text-text-danger">Held back: {r.why}</span> : <span className="text-text-ok">Will be released</span>}</td>
              </tr>
            ))}
          </Table>
          {held.length ? <Notice tone="warn" title={`${held.length} held back`}>A combination whose draft has a problem stays at its last release until the problem is fixed.</Notice> : null}
          {err ? <Notice tone="danger" title="Not released">{err}</Notice> : null}
          <div className="flex flex-wrap items-center justify-end gap-3">
            {!canApprove ? <p className="text-sm text-text-muted">A different person releases. Switch to the Approver (simulated) to release.</p> : <p className="text-sm text-text-muted">You can release only changes you did not make yourself.</p>}
            <Button disabled={!canApprove || !ok.length || busy} busy={busy} onClick={() => void release()}>Release {ok.length} combination{ok.length === 1 ? "" : "s"} as Release {x.next}</Button>
          </div>
        </>
      )}
    </div>
  );
}
