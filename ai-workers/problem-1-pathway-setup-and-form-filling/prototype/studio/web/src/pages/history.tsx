import { Link } from "react-router-dom";
import { useApi } from "@/lib/api";
import { Notice, Pill, Table } from "@/components/ui/controls";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";

export function ReleasesPage() {
  const r = useApi<any[]>(["releases"], "/releases");
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div><h1 className="text-xl font-semibold">Releases</h1><p className="mt-1 text-sm text-text-muted">Frozen, fingerprinted configuration versions. Case work only ever uses a released version.</p></div>
      {r.isLoading ? <Spinner label="Loading" /> : !r.data?.length ? <EmptyState title="Nothing released yet" /> : <Table head={["Combination", "Version", "Fingerprint", "Author / submitter / approver", "Released", "Basis"]}>{r.data.map((x) => <tr key={x.id}><td><Link className="text-text-link hover:underline" to={`/c/${x.combination_id}/review`}>{x.combination}</Link></td><td>v{x.version} {x.status === "SUPERSEDED" ? <Pill>superseded</Pill> : <Pill tone="ok">current</Pill>}</td><td className="mono text-xs">{x.sha256.slice(0, 16)}</td><td className="text-xs">{x.author} / {x.submitter} / {x.approver}</td><td className="text-xs">{new Date(x.released_at).toLocaleString()}</td><td className="max-w-md text-xs text-text-muted">{x.basis}</td></tr>)}</Table>}
    </div>
  );
}

export function ActivityPage() {
  const a = useApi<any[]>(["activity"], "/activity", { refetchInterval: 5000 });
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div><h1 className="text-xl font-semibold">Activity</h1><p className="mt-1 text-sm text-text-muted">Every create, change, AI step, decision, release, fill and reset in this demo workspace, newest first.</p></div>
      {a.isError ? <Notice tone="danger" title="Activity could not be loaded">{(a.error as Error).message}</Notice> : null}
      {a.isLoading ? <Spinner label="Loading" /> : !a.data?.length ? <EmptyState title="No activity yet" /> : <Table dense head={["When", "Who", "What", "Item"]}>{a.data.map((x) => <tr key={x.id}><td className="whitespace-nowrap text-xs">{new Date(x.at).toLocaleString()}</td><td className="text-xs">{x.actor}</td><td className="max-w-3xl text-sm">{x.summary}</td><td className="text-xs"><Pill>{x.entity}</Pill></td></tr>)}</Table>}
    </div>
  );
}
