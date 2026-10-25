// Studio page "Browser extension" (forms lane F2d; S-3; Lead decision Q1): get a one-time code to connect the
// extension (shown once, 5 minutes), see and disconnect this person's extension sessions, and, for the content team,
// the "Re-capture needed" tasks the extension opened when a portal screen differed from its approved version.
import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError, useActorId, useApi } from "@/lib/api";
import { Button, Notice, Pill, Table } from "@/components/ui/controls";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";

type Code = { code: string; expires_at: string; modes: string[]; message: string };
type Session = { id: string; modes: string[]; created_at: string; expires_at: string; state: string };
type Task = { id: string; edition: string; screen: string; kind: string; status: string; times: number; updated_at: string; differences: { input: string; change: string; approved_label: string | null }[]; affected: { open_cases?: number; combinations?: number } };
const when = (iso: string) => new Date(iso).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" });
/** The panel's words for a change (review m3): never a key or a raw change code. */
const CHANGE_WORDS: Record<string, string> = { reworded: "reworded", options: "choices changed", added: "added", removed: "removed", type: "kind of input changed", required: "now required or no longer required", rules: "length or format changed" };
const MODE_WORDS: Record<string, string> = { capture: "Capture", fill: "Fill" };

export function ExtensionPage() {
  const actor = useActorId();
  const qc = useQueryClient();
  const sessions = useApi<Session[]>(["extension-sessions", actor], "/extension/sessions");
  const tasks = useApi<Task[]>(["recapture-tasks", actor], "/extension/recapture-tasks", { retry: false });
  const [code, setCode] = React.useState<Code | null>(null);
  const [left, setLeft] = React.useState(0);
  React.useEffect(() => { setCode(null); }, [actor]);
  React.useEffect(() => {
    if (!code) return;
    const tick = () => setLeft(Math.max(0, Math.round((new Date(code.expires_at).getTime() - Date.now()) / 1000)));
    tick(); const t = setInterval(tick, 1000); return () => clearInterval(t);
  }, [code]);
  const pair = useMutation({ mutationFn: () => api<Code>("/extension/pairings", { method: "POST", json: {} }), onSuccess: (c) => setCode(c) });
  const revoke = useMutation({ mutationFn: (id: string) => api(`/extension/sessions/${id}`, { method: "DELETE" }), onSuccess: () => qc.invalidateQueries({ queryKey: ["extension-sessions"] }) });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Browser extension</h1>
        <p className="mt-1 text-sm text-text-muted">The ExpatReady extension captures a portal screen's structure (the capture duty) and fills one open portal screen from a case's confirmed answers (the case duty). It never submits. Sample: the portal hosts it runs on wait for the immigration expert. Unconfirmed: no counsel on using automation on IRCC or ESDC portals.</p>
      </div>

      <section aria-labelledby="connect" className="space-y-3 rounded-lg border border-border bg-surface-raised p-4">
        <h2 id="connect" className="text-base font-semibold">Connect the browser extension</h2>
        {pair.isError && <Notice tone="danger">{(pair.error as ApiError).message}</Notice>}
        {code && left > 0 ? (
          <div className="space-y-2" aria-live="polite">
            <p className="text-sm">{code.message}</p>
            <p className="font-mono text-3xl tracking-[0.3em]" aria-label={`Code ${code.code.split("").join(" ")}`}>{code.code}</p>
            <p className="text-sm text-text-muted">For {code.modes.map((m) => MODE_WORDS[m] ?? m).join(" and ")} · ends in {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}. Shown once: it is not kept.</p>
          </div>
        ) : code ? <Notice tone="warn">That code has ended. Get a new one.</Notice> : null}
        <Button onClick={() => pair.mutate()} busy={pair.isPending}>{code ? "Get a new code" : "Get a code"}</Button>
      </section>

      <section aria-labelledby="sessions" className="space-y-3">
        <h2 id="sessions" className="text-base font-semibold">Your extension sessions</h2>
        {sessions.isLoading ? <Spinner label="Loading" /> : sessions.isError ? <Notice tone="danger">{(sessions.error as Error).message}</Notice> : !sessions.data?.length ? <EmptyState title="No extension connected yet" /> : (
          <Table head={["Connected", "Mode", "Ends", "State", ""]}>
            {sessions.data.map((s) => <tr key={s.id}><td>{when(s.created_at)}</td><td>{s.modes.map((m) => MODE_WORDS[m] ?? m).join(", ")}</td><td>{when(s.expires_at)}</td><td><Pill tone={s.state === "connected" ? "ok" : "neutral"}>{s.state}</Pill></td>
              <td className="text-right">{s.state === "connected" && <Button variant="outline" size="sm" onClick={() => revoke.mutate(s.id)} busy={revoke.isPending && revoke.variables === s.id}>Disconnect</Button>}</td></tr>)}
          </Table>
        )}
      </section>

      {tasks.data && (
        <section aria-labelledby="tasks" className="space-y-3">
          <h2 id="tasks" className="text-base font-semibold">Re-capture needed</h2>
          <p className="text-sm text-text-muted">Opened by the extension when a portal screen differed from its approved online version, or was not in it. Capture the screen again; approving the capture closes the task.</p>
          {!tasks.data.length ? <EmptyState title="No screen to capture again" /> : (
            <Table head={["Screen", "Online version", "What differs", "Open cases", "Seen", "State"]}>
              {tasks.data.map((t) => <tr key={t.id}><td>{t.screen}</td><td>{t.edition}</td>
                <td>{t.kind === "not_captured" ? `Not in the approved version: capture it (${t.differences.length} question${t.differences.length === 1 ? "" : "s"})` : t.differences.map((d) => `${d.approved_label ?? d.input}: ${CHANGE_WORDS[d.change] ?? "changed"}`).join("; ")}</td>
                <td>{t.affected.open_cases ?? 0}</td><td>{t.times} × · {when(t.updated_at)}</td><td><Pill tone={t.status === "OPEN" ? "warn" : "ok"}>{t.status === "OPEN" ? "Open" : "Done"}</Pill></td></tr>)}
            </Table>
          )}
        </section>
      )}
    </div>
  );
}
