// Review and release (P-23): one shared draft, one release for everything. Lists every combination whose draft differs
// from what firms use, what is held back and why, and releases the rest as the next release. A combination is released
// only after its own review (submitted, unchanged since, expert changes signed; QA-1), and by a different person from
// every author and submitter (BR-14); the server enforces both, the screen says so before anyone tries.
import * as React from "react";
import type { LibraryChangeView } from "../../../contracts/screen02";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { api, useActorId, useApi, useToast } from "@/lib/api";
import { Button, Notice, Pill, Table } from "@/components/ui/controls";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { fmtDate } from "@/components/status";
import { NearLine, ownReason, type NearView } from "@/components/near-line";
import { HandOff, holderOf, theName } from "@/components/hand-off";

/** C11.13 (P-120): a library change on the Release page: approved ones are released; ones still waiting for a second
 *  person are listed, never released; a near duplicate says what it is close to and why it is not the same. */
type ReleaseLibraryRow = LibraryChangeView & { will_release: boolean; near: NearView | null };
/** QA-421 (P-498, EXPERIENCE §2.5): a row held back only because its review has not started (never submitted, returned,
 *  or changed after it was submitted) waits for the author's Submit. The words are the server's gate (gateOf in
 *  api/src/studio.ts): each tells the author to submit it on its Review and release tab; check_qa421 guards the match. */
const needsSubmit = (r: { held?: boolean; why?: string | null }) => !!r.held && /submit it( again)? on its Review and release tab/.test(r.why ?? "");
const changeCell = (l: ReleaseLibraryRow) => { const own = ownReason(l); return <td><b className="font-medium">{l.action_word} {l.kind_word} "{l.label}"</b>{own ? <p className="text-xs text-text-muted">{own}</p> : null}<NearLine near={l.near} /></td>; };

export function ReleasePage() {
  const qc = useQueryClient(); const toast = useToast();
  const actorId = useActorId();
  const session = useApi<any>(["session", actorId], "/session");
  const d = useApi<any>(["draft", actorId], "/draft"); // per person: your own changes are held back for you (BR-14)
  const [busy, setBusy] = React.useState(false), [err, setErr] = React.useState<string | null>(null), [done, setDone] = React.useState<any>(null);
  const canApprove = (session.data?.actor?.duties ?? []).includes("approve");
  const canSubmit = (session.data?.actor?.duties ?? []).includes("author"); // only the author duty submits (audit D-2)
  const release = async () => {
    setBusy(true); setErr(null);
    try {
      const r = await api("/pack/release", { method: "POST", json: { expectedChanges: d.data.changes } });
      setDone(r); toast.push({ tone: "ok", text: `Release ${r.pack} published: ${r.rows.length} combination${r.rows.length === 1 ? "" : "s"}${r.library?.length ? ` and ${r.library.length} library change${r.library.length === 1 ? "" : "s"}` : ""}` });
      void qc.invalidateQueries();
    } catch (e) { setErr((e as Error).message); void d.refetch(); } finally { setBusy(false); }
  };
  if (d.isLoading) return <Spinner label="Loading the shared draft" />;
  if (d.isError) return <Notice tone="danger" title="The draft could not be loaded">{(d.error as Error).message}</Notice>;
  const x = d.data;
  const ok = x.rows.filter((r: any) => !r.held), held = x.rows.filter((r: any) => r.held);
  const all: ReleaseLibraryRow[] = x.library ?? [];
  const lib = all.filter((l) => l.will_release !== false), waiting = all.filter((l) => l.will_release === false);
  // QA-421: while a change the author can submit is not submitted, that Submit is the page's one next step; the hand-off
  // to the Approver waits, or the release would go out without it.
  const toSubmit = canSubmit ? x.rows.filter(needsSubmit) : [];
  const what = [ok.length ? `${ok.length} combination${ok.length === 1 ? "" : "s"}` : null, lib.length ? `${lib.length} library change${lib.length === 1 ? "" : "s"}` : null].filter(Boolean).join(" and ");
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Review and release</h1>
        <p className="mt-1 text-sm text-text-muted">Everyone's changes are in one shared draft. Releasing publishes together every combination that has passed its review (submitted, and signed by the content reviewer where an expert must sign); firms keep what was approved until then. {x.last ? `Last release: Release ${x.last.version}, ${fmtDate(x.last.at)}.` : "Nothing released yet."}</p>
      </div>
      {done ? <Notice tone="ok" title={`Release ${done.pack} published`}>{[...done.rows.map((r: any) => r.label), ...((done.library ?? []) as { label: string; action: string }[]).map((l) => `${l.label} (${l.action.toLowerCase()})`)].join(", ")}.{done.held.length ? ` Held back: ${done.held.map((h: any) => h.label).join(", ")}.` : ""} <Link className="text-text-link underline" to="/">Back to Immigration programs</Link></Notice> : null}
      {!x.rows.length && !all.length ? <EmptyState title="Nothing to release" description="The shared draft has no changes since the last release. Changes appear here as soon as someone edits a combination." action={<Button asChild variant="secondary"><Link to="/">Back to Immigration programs</Link></Button>} /> : (
        <>
          {toSubmit.length ? (
            <div data-next-step="submit" className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm">
              <p className="min-w-0">Next: submit <b>{(toSubmit[0].path ?? [toSubmit[0].label]).join(" › ")}</b> for review{toSubmit.length > 1 ? <> (and {toSubmit.length - 1} more to submit)</> : null}. Until it is submitted and its review is done, a release leaves it out.</p>
              <Button asChild size="sm"><Link to={`/c/${toSubmit[0].combinationId}/review`}>Submit {toSubmit[0].label} for review →</Link></Button>
            </div>
          ) : null}
          <p className="rounded-lg border border-border bg-surface-raised px-4 py-3 text-sm" aria-live="polite"><b>{x.changes} draft change{x.changes === 1 ? "" : "s"}</b> across <b>{x.rows.length} combination{x.rows.length === 1 ? "" : "s"}</b>{lib.length ? <> and <b>{lib.length} library change{lib.length === 1 ? "" : "s"}</b></> : null}{waiting.length ? <>; {waiting.length} more library change{waiting.length === 1 ? "" : "s"} still wait{waiting.length === 1 ? "s" : ""} for a second person</> : null}. The list below shows each one and whether it can be released.</p>
          {x.rows.length ? <Table head={["Combination", "Changes", "In this release"]}>
            {x.rows.map((r: any) => (
              <tr key={r.combinationId}>
                <td><Link className="font-medium text-text-link hover:underline" to={`/c/${r.combinationId}/review`}>{r.label}</Link>{r.demo ? <> <span data-demo-release><Pill tone="warn" title="Sample content: a demo release, never counted as a real publish.">Demo release</Pill></span></> : null}<p className="text-xs text-text-muted">{r.path.join(" › ")}{r.released ? "" : " · first release"}</p></td>
                <td className="tabular-nums">{r.changes}</td>
                <td>{r.held ? <span className="text-text-danger">Held back: {r.why}</span> : <span className="text-text-ok">Will be released</span>}</td>
              </tr>
            ))}
          </Table> : null}
          {lib.length ? (
            <section aria-labelledby="lib-changes" className="space-y-2">
              <h2 id="lib-changes" className="text-base font-semibold">Library changes</h2>
              <p className="text-sm text-text-muted">Approved by a second person on To review. They reach every combination that uses them in this release.</p>
              <Table head={["Change", "Approved by", "In this release"]}>
                {lib.map((l) => <tr key={l.id} data-library-change={l.key}>{changeCell(l)}<td className="text-sm">{l.decided_by}</td><td><span className="text-text-ok">Will be released</span></td></tr>)}
              </Table>
            </section>
          ) : null}
          {waiting.length ? (
            <section aria-labelledby="lib-waiting" className="space-y-2" data-library-waiting>
              <h2 id="lib-waiting" className="text-base font-semibold">Library changes waiting for a second person</h2>
              <p className="text-sm text-text-muted">Not in this release: a different person from the one who asked approves or returns each on <Link className="text-text-link underline" to="/review">To review</Link>. A combination that uses one is held back until then.</p>
              <Table head={["Change", "Asked by", "In this release"]}>
                {waiting.map((l) => <tr key={l.id} data-library-change={l.key} data-waiting>{changeCell(l)}<td className="text-sm">{l.proposed_by}</td><td><span className="text-text-warn">Waiting for a second person</span></td></tr>)}
              </Table>
            </section>
          ) : null}
          {held.length ? <Notice tone="warn" title={`${held.length} held back`}>A held-back combination stays at its last release until its problem is fixed and its review is done. Open it to submit it or see what is waiting.</Notice> : null}
          {err ? <Notice tone="danger" title="Not released">{err}</Notice> : null}
          {/* BK-4b (BR-2, BR-3): the release is the approve duty's, never yours here: one button hands it over, only while
              something would be released (review M1: with every row held back, the next step is the author's, not the Approver's)
              and nothing waits for the author's Submit (QA-421). Only the person's one live step is a filled button (P-473). */}
          {!canApprove && !toSubmit.length && session.data && (ok.length || lib.length) ? (() => { const to = holderOf(session.data.actors, "approve", [actorId]); return <HandOff id="approver" next={<>{to ? theName(to) : "a second person"} releases what passed its review.</>} to={to} noOne="No one in this workspace holds the approve duty, so nobody can release." />; })() : null}
          <div className="flex flex-wrap items-center justify-end gap-3">
            {!canApprove ? <p className="text-sm text-text-muted">A different person releases.</p> : <p className="text-sm text-text-muted">You can release only changes you did not make or submit yourself.</p>}
            <Button variant={canApprove ? "default" : "secondary"} disabled={!canApprove || !what || busy} busy={busy} onClick={() => void release()}>{what ? `Release ${what} as Release ${x.next}` : "Nothing ready to release"}</Button>
          </div>
        </>
      )}
    </div>
  );
}
