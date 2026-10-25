// Screen 02 slice 2: the pages a To review row opens (board views 5–9 and the new shared field). Each says what is
// waiting, who made it and what a decision does; the person who made it sees it read-only (the server refuses their
// decision too, BR-9). Every decision returns to To review with a toast.
import * as React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, useAction, useActorId, useApi } from "@/lib/api";
import { Button, Input, Notice, Panel, Pill, Textarea } from "@/components/ui/controls";
import { Spinner } from "@/components/ui/spinner";
import { ErrorState } from "@/components/ui/error-state";
import { fmtWhen } from "@/components/status";
import { cn } from "@/lib/utils";
import { ToReviewPage } from "@/pages/to-review";
import { FormFieldDecisions } from "@/pages/job";
import type { SessionView } from "../../../contracts/programs";
import type { CaptureView, HeldFileView, ImpactAccepted, ImpactChange, ImpactReview, LibraryChangeDetail, LibraryChangeView, MergeSide, MergeView, ScreenMapView } from "../../../contracts/screen02";

const inv = [["review-queue"], ["draft"], ["catalogue"]];
function useMe() {
  const id = useActorId();
  const s = useApi<SessionView>(["session", id], "/session");
  const duties: readonly string[] = s.data?.actor?.duties ?? [];
  return { id, has: (d: string) => duties.includes(d), name: s.data?.actor?.name };
}
function Crumbs({ here }: { here: string }) {
  return <nav aria-label="Path" className="text-xs text-text-muted"><Link to="/review" className="hover:underline">To review</Link> › {here}</nav>;
}
function Head({ title, chip, tone = "warn", sub }: { title: string; chip: string; tone?: string; sub?: React.ReactNode }) {
  return <div><div className="flex flex-wrap items-center gap-3"><h1 className="text-2xl font-bold tracking-tight">{title}</h1><Pill tone={tone}>{chip}</Pill></div>{sub ? <p className="mt-1 text-sm text-text-muted">{sub}</p> : null}</div>;
}
/** Decide with an optional or required note: the primary step and the one that sends it back with a reason. */
function Decide({ yes, no, onYes, onNo, busy, noNeedsReason = true, disabledWhy }: { yes: string; no: string; onYes: () => void; onNo: (note: string) => void; busy: boolean; noNeedsReason?: boolean; disabledWhy?: string | null }) {
  const [note, setNote] = React.useState("");
  return (
    <div className="space-y-2 rounded-lg border border-border bg-surface-raised p-4">
      <label className="block text-sm font-medium" htmlFor="decide-note">Reason {noNeedsReason ? `(needed to ${no.toLowerCase()})` : "(optional)"}</label>
      <Textarea id="decide-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="What the other person should know" />
      {disabledWhy ? <p className="text-sm text-text-muted">{disabledWhy}</p> : null}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" disabled={busy || !!disabledWhy || (noNeedsReason && note.trim().length < 3)} onClick={() => onNo(note.trim())}>{no}</Button>
        <Button busy={busy} disabled={!!disabledWhy} onClick={onYes}>{yes}</Button>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────── a new shared field (P-53) and other library changes
export function LibraryChangePage() {
  const { id } = useParams(); const nav = useNavigate(); const me = useMe();
  const c = useApi<LibraryChangeDetail>(["library-change", id], `/library/changes/${id}`);
  const act = useAction((v: { d: "approve" | "return"; note?: string }) => api<LibraryChangeView>(`/library/changes/${id}/${v.d}`, { method: "POST", json: { note: v.note } }), { success: (r) => (r.status === "APPROVED" ? `"${r.label}" approved: it is released with the next release` : `"${r.label}" returned to ${r.proposed_by}`), invalidate: [...inv, ["library-change", id]], onDone: () => nav("/review") });
  if (c.isLoading) return <Spinner label="Loading the change" />;
  if (c.isError) return <ErrorState title="This change could not be opened" description={(c.error as Error).message} action={<Link className="text-text-link underline" to="/review">Back to To review</Link>} />;
  const x = c.data!, mine = x.proposed_by_id === me.id;
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Crumbs here={x.label} />
      <Head title={`${x.action_word} ${x.kind_word}: ${x.label}`} chip={x.status === "WAITING" ? (mine ? "Waiting for a second person" : "Needs you") : x.status === "RETURNED" ? "Returned" : x.status === "APPROVED" ? "Approved · in the next release" : "Released"} tone={x.status === "WAITING" && !mine ? "warn" : "neutral"} sub={<>Proposed by {x.proposed_by}, {fmtWhen(x.proposed_at)}</>} />
      {x.field ? (
        <dl className="grid grid-cols-[10rem_1fr] gap-x-4 gap-y-2 rounded-lg border border-border bg-surface-raised p-4 text-sm" data-change-field>
          <dt className="text-text-muted">Name</dt><dd className="font-semibold">{x.field.label}</dd>
          <dt className="text-text-muted">Meaning</dt><dd>{x.field.meaning}</dd>
          <dt className="text-text-muted">Kind of value</dt><dd>{x.field.value_type}</dd>
          <dt className="text-text-muted">Group</dt><dd>{x.field.group}</dd>
        </dl>
      ) : null}
      <div className="space-y-1 text-sm">
        {x.reason ? <p><b>Reason:</b> {x.reason}</p> : null}
        {x.ai_verdict ? <p><b>Advisory check:</b> {x.ai_verdict}</p> : null}
        {(x.matches ?? []).length ? <p className="text-text-muted">Closest library fields: {x.matches.map((m) => `${m.key} (${Math.round(m.score * 100)}%)`).join(", ")}</p> : null}
        {x.status === "RETURNED" ? <Notice tone="warn" title={`Returned by ${x.decided_by}`}>{x.decision_note}</Notice> : null}
      </div>
      <details className="text-xs text-text-muted"><summary className="cursor-pointer">Details</summary><p className="mt-1">Key: <span className="mono">{x.key}</span> (generated from the group and the name)</p></details>
      {x.status === "RETURNED" && (mine || me.has("author")) ? <Correct change={x} /> : x.status !== "WAITING" ? null : mine || !me.has("review")
        ? <Notice title={mine ? "You proposed this" : "A content publisher decides"}>{mine ? "A different person approves it or returns it with a reason. Until then, a combination that uses it is not released." : "Switch to the Content reviewer or the Approver (simulated) to decide."}</Notice>
        : <Decide yes="Approve" no="Return" busy={act.isPending} onYes={() => act.mutate({ d: "approve" })} onNo={(note) => act.mutate({ d: "return", note })} />}
      {x.status === "WAITING" && me.has("author") && x.action === "ADD" ? <Withdraw id={x.id} /> : null}
    </div>
  );
}

/** B1 (break B1): a returned new field is corrected and sent again, or withdrawn; it never freezes its combination. */
function Correct({ change }: { change: LibraryChangeDetail }) {
  const nav = useNavigate();
  const [label, setLabel] = React.useState(change.field?.label ?? change.label), [meaning, setMeaning] = React.useState(change.field?.meaning ?? ""), [reason, setReason] = React.useState("");
  const send = useAction(() => api<LibraryChangeView>(`/library/changes/${change.id}/resubmit`, { method: "POST", json: { label, meaning, reason } }), { success: (r) => `"${r.label}" sent to a second person again`, invalidate: [...inv, ["library-change", change.id]], onDone: () => nav("/review") });
  return (
    <section aria-labelledby="correct-h" className="space-y-3 rounded-lg border border-border bg-surface-raised p-4" data-correct>
      <h2 id="correct-h" className="font-semibold">Correct it and send it again</h2>
      <label className="block text-sm">Name<Input className="mt-1" value={label} maxLength={120} onChange={(e) => setLabel(e.target.value)} /></label>
      <label className="block text-sm">Meaning<Textarea className="mt-1" value={meaning} maxLength={500} onChange={(e) => setMeaning(e.target.value)} /></label>
      <label className="block text-sm">What you corrected<Textarea className="mt-1" value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} placeholder="So the second person can check it" /></label>
      <div className="flex justify-end"><Button busy={send.isPending} disabled={reason.trim().length < 8} onClick={() => send.mutate(undefined)}>Send again</Button></div>
      <Withdraw id={change.id} />
    </section>
  );
}
/** An author withdraws a new field: the form fields that read it go back to "no decision" (K1). */
function Withdraw({ id }: { id: string }) {
  const nav = useNavigate();
  const [open, setOpen] = React.useState(false), [why, setWhy] = React.useState("");
  const go = useAction(() => api<{ form_fields_reopened: number }>(`/library/changes/${id}/withdraw`, { method: "POST", json: { note: why } }), { success: (r) => `Withdrawn: ${r.form_fields_reopened} form field${r.form_fields_reopened === 1 ? "" : "s"} back to "no decision"`, invalidate: [...inv, ["library-change", id]], onDone: () => nav("/review") });
  return open ? (
    <div className="flex flex-wrap items-end gap-2 border-t border-border pt-3" data-withdraw>
      <label className="flex-1 text-sm">Why withdraw it<Input className="mt-1" value={why} maxLength={300} onChange={(e) => setWhy(e.target.value)} /></label>
      <Button variant="destructive" busy={go.isPending} disabled={why.trim().length < 3} onClick={() => go.mutate(undefined)}>Withdraw the new field</Button>
    </div>
  ) : <div className="flex justify-end"><Button variant="ghost" onClick={() => setOpen(true)}>Withdraw it instead…</Button></div>;
}

// ───────────────────────────────────────────── board view 6: portal capture review (P-66)
export function CaptureReviewPage() {
  const { id } = useParams(); const nav = useNavigate(); const me = useMe();
  const c = useApi<CaptureView>(["capture", id], `/captures/${id}`);
  const approve = useAction(() => api<{ edition?: { editionLabel?: string } }>(`/captures/${id}/approve`, { method: "POST" }), { success: (r) => `Approved: ${r.edition?.editionLabel ?? "the online version"} is in the library`, invalidate: [...inv, ["capture", id]], onDone: () => nav("/review") });
  const ret = useAction((note: string) => api(`/captures/${id}/return`, { method: "POST", json: { note } }), { success: "Returned to the person who captured it", invalidate: [...inv, ["capture", id]], onDone: () => nav("/review") });
  if (c.isLoading) return <Spinner label="Loading the capture" />;
  if (c.isError) return <ErrorState title="This capture could not be opened" description={(c.error as Error).message} action={<Link className="text-text-link underline" to="/review">Back to To review</Link>} />;
  const x = c.data!, mine = x.captured_by === me.id, diffs = Array.isArray(x.difference) ? x.difference : [];
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Crumbs here={`${x.form} online · portal capture`} />
      <Head title={`${x.form} online · ${x.title}`} chip={x.status === "HELD" ? (mine ? "Waiting for a second person" : "Needs you") : x.status === "APPROVED" ? "Approved" : x.status === "RETURNED" ? "Returned" : x.status} tone={x.status === "HELD" && !mine ? "warn" : "neutral"}
        sub={<>{x.portal_label} · captured by {x.captured_by_name} on {x.captured_on} from {x.way === "template" ? "the spreadsheet template" : "saved blank pages"} · {x.screens.length} screens, {x.questions} questions</>} />
      <p className="text-sm">{x.status_detail}</p>
      <div className="grid gap-4 md:grid-cols-2">
        <section aria-labelledby="cap-screens" className="rounded-lg border border-border bg-surface-raised p-4">
          <h2 id="cap-screens" className="mb-2 font-semibold">Screens in portal order</h2>
          <ol className="space-y-1 text-sm">{x.screens.map((s) => <li key={s.order}>{s.order}. {s.title} <span className="text-text-muted">· {s.questions} question{s.questions === 1 ? "" : "s"}</span></li>)}</ol>
        </section>
        <section aria-labelledby="cap-diff" className="rounded-lg border border-border bg-surface-raised p-4">
          <h2 id="cap-diff" className="mb-2 font-semibold">Differences from the approved version</h2>
          {x.changes_edition_id ? (diffs.length ? <ul className="space-y-1 text-sm">{diffs.slice(0, 30).map((d, i) => <li key={i}>{d.change ?? d.kind ?? "Changed"}: {d.label ?? d.input ?? d.screen ?? ""}</li>)}</ul> : <p className="text-sm text-text-muted">No differences.</p>) : <p className="text-sm text-text-muted">A new online version: nothing to compare with.</p>}
        </section>
      </div>
      {x.review_file ? <p className="text-sm"><a className="text-text-link underline" href={`/api/captures/${x.id}/review`} target="_blank" rel="noreferrer">Open the review document</a> (every screen and question, for the comparison with the portal)</p> : null}
      {x.status !== "HELD" ? null : mine || !me.has("review")
        ? <Notice title={mine ? "You captured this" : "A content publisher decides"}>{mine ? "A different person approves or returns it." : "Switch to the Content reviewer or the Approver (simulated) to decide."}</Notice>
        : <Decide yes="Approve" no="Return" busy={approve.isPending || ret.isPending} onYes={() => approve.mutate(undefined)} onNo={(n) => ret.mutate(n)} />}
    </div>
  );
}

// ───────────────────────────────────────────── board view 8: merge two shared fields (right panel over To review, P-48)
export function MergeReviewPage() {
  const { id } = useParams(); const nav = useNavigate(); const me = useMe();
  const m = useApi<MergeView>(["merge", id], `/library/merges/${id}`);
  const approve = useAction((note?: string) => api(`/library/merges/${id}/approve`, { method: "POST", json: note ? { note } : {} }), { success: "Merged: the field that goes away now redirects", invalidate: [...inv, ["merge", id]], onDone: () => nav("/review") });
  const reject = useAction((note: string) => api(`/library/merges/${id}/reject`, { method: "POST", json: { note } }), { success: "Merge rejected", invalidate: [...inv, ["merge", id]], onDone: () => nav("/review") });
  const x = m.data, mine = x?.proposed_by_id === me.id;
  const side = (f: MergeSide, word: string) => (
    <div className="flex-1 rounded-lg border border-border p-3 text-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{word}</p>
      <p className="mt-1 font-semibold">{f.label}</p><p className="text-text-muted">{f.meaning}</p>
      <p className="mt-2 text-xs">{f.value_type} · {f.form_fields} form field{f.form_fields === 1 ? "" : "s"} · {f.questions} question{f.questions === 1 ? "" : "s"}{f.aliases.length ? ` · also called ${f.aliases.slice(0, 3).join(", ")}` : ""}</p>
    </div>
  );
  return (
    <>
      <ToReviewPage />
      <Panel open onOpenChange={(o) => { if (!o) nav("/review"); }} title="Merge two shared fields" badge={x ? <Pill tone={x.status === "PROPOSED" && !mine ? "warn" : "neutral"}>{x.status === "PROPOSED" ? (mine ? "Waiting for a second person" : "Needs you") : x.status === "APPLIED" ? "Merged" : "Rejected"}</Pill> : null}
        description={x ? `Proposed by ${x.proposed_by}, ${fmtWhen(x.proposed_at)}` : undefined}
        footer={<Button variant="ghost" onClick={() => nav("/review")}>Close</Button>}>
        {m.isLoading ? <Spinner label="Loading the merge" /> : m.isError || !x ? <Notice tone="danger" title="This merge could not be opened">{(m.error as Error | null)?.message ?? "No answer from the studio."}</Notice> : (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row" data-merge>{side(x.goes, "Goes away")}{side(x.stays, "Stays")}</div>
            <p className="text-sm">What moves: {x.goes.form_fields} form field{x.goes.form_fields === 1 ? "" : "s"} and {x.goes.questions} question{x.goes.questions === 1 ? "" : "s"} move to "{x.stays.label}"; its name becomes an alias that redirects. Releases already made do not change.</p>
            <p className="text-sm"><b>Reason:</b> {x.reason}</p>
            {x.status !== "PROPOSED" ? null : mine || !me.has("review")
              ? <Notice title={mine ? "You proposed this merge" : "A content publisher decides"}>{mine ? "A different person approves or rejects it." : "Switch to the Content reviewer or the Approver (simulated) to decide."}</Notice>
              : <Decide yes="Approve the merge" no="Reject" busy={approve.isPending || reject.isPending} onYes={() => approve.mutate(undefined)} onNo={(n) => reject.mutate(n)} />}
          </div>
        )}
      </Panel>
    </>
  );
}

// ───────────────────────────────────────────── board view 9: held file (P-80)
export function HeldFilePage() {
  const { id } = useParams(); const nav = useNavigate(); const me = useMe();
  const list = useApi<HeldFileView[]>(["held"], "/intake/held");
  const [page, setPage] = React.useState("");
  const record = useAction(() => api(`/intake/held/${id}`, { method: "PATCH", json: { irccPage: page } }), { success: "IRCC page recorded", invalidate: [["held"], ...inv] });
  const approve = useAction(() => api<{ result?: { message: string } | null }>(`/intake/held/${id}/approve`, { method: "POST", json: { irccPage: list.data?.find((x) => x.id === id)?.irccPage ?? undefined } }), { success: (r) => `Approved as an official source${r.result ? `: ${r.result.message}` : ""}`, invalidate: [["held"], ...inv], onDone: () => nav("/review") });
  const reject = useAction((note: string) => api(`/intake/held/${id}/reject`, { method: "POST", json: { note } }), { success: "Rejected: the file is not used", invalidate: [["held"], ...inv], onDone: () => nav("/review") });
  if (list.isLoading) return <Spinner label="Loading the held file" />;
  const h = list.data?.find((x) => x.id === id);
  if (list.isError || !h) return <ErrorState title="This held file is not waiting any more" description={list.isError ? (list.error as Error).message : "Someone decided it, or the demo was reset."} action={<Link className="text-text-link underline" to="/review">Back to To review</Link>} />;
  const mine = h.uploadedBy === me.id;
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Crumbs here="Held file" />
      <Head title={h.edition ?? h.code ?? h.file} chip={mine ? "Waiting for a second person" : "Needs you"} tone={mine ? "neutral" : "warn"} sub={<>{h.file} · uploaded {fmtWhen(h.at)}</>} />
      <dl className="grid grid-cols-[9rem_1fr] gap-x-4 gap-y-1 rounded-lg border border-border bg-surface-raised p-4 text-sm" data-held-read>
        <dt className="text-text-muted">Read from the file</dt><dd>{h.code ? `${h.code}${h.title ? ` · ${h.title}` : ""}` : "No form code could be read"}</dd>
        <dt className="text-text-muted">Edition</dt><dd>{h.edition ?? "Not read"}</dd>
        <dt className="text-text-muted">The file</dt><dd>{h.stored ? <a className="text-text-link underline" href={`/api/intake/held/${h.id}/file`} target="_blank" rel="noreferrer">Open the held PDF</a> : "Not stored"} <span className="text-xs text-text-muted">· checksum {h.sha256.slice(0, 12)}…</span></dd>
      </dl>
      <Notice tone="warn" title="Not on the approved source list">It was not read into the library, attached or sent to AI. A second person compares it with the IRCC page it came from; approved, its checksum joins the approved list and the file goes through the intake again.</Notice>
      <section aria-labelledby="held-page" className="space-y-2 rounded-lg border border-border bg-surface-raised p-4 text-sm">
        <h2 id="held-page" className="font-semibold">IRCC page it came from</h2>
        {h.irccPage ? <p><a className="break-all text-text-link underline" href={h.irccPage} target="_blank" rel="noreferrer">{h.irccPage}</a></p>
          : mine ? <div className="flex flex-wrap items-end gap-2"><label className="flex-1 text-sm">Paste the canada.ca page<input className="mt-1 h-9 w-full rounded-lg border border-border-strong bg-surface-raised px-3" value={page} onChange={(e) => setPage(e.target.value)} placeholder="https://www.canada.ca/…" /></label><Button busy={record.isPending} onClick={() => record.mutate(undefined)}>Record the page</Button></div>
          : <p className="text-text-muted">The person who uploaded it records the page first.</p>}
      </section>
      {mine || !me.has("review")
        ? <Notice title={mine ? "You uploaded this file" : "A content publisher decides"}>{mine ? "A different person compares it with the IRCC page and approves or rejects it." : "Switch to the Content reviewer or the Approver (simulated) to decide."}</Notice>
        : <Decide yes="Approve as an official source" no="Reject" busy={approve.isPending || reject.isPending} disabledWhy={h.irccPage ? null : "Waiting for the uploader to record the IRCC page."} onYes={() => approve.mutate(undefined)} onNo={(n) => reject.mutate(n)} />}
    </div>
  );
}

// ───────────────────────────────────────────── board view 7: new edition impact (P-32, C9.1)
export function EditionImpactPage() {
  const { id } = useParams(); const nav = useNavigate(); const me = useMe();
  const r = useApi<ImpactReview>(["impact", id], `/intake/held/${id}/impact`);
  const [tab, setTab] = React.useState<"comparison" | "library" | "combinations">("comparison");
  const accept = useAction(() => api<ImpactAccepted>(`/intake/held/${id}/impact/accept`, { method: "POST", json: { expected: r.data?.counts.form_fields } }), { success: (x) => `${x.edition} accepted: ${x.carried} form fields carried, ${x.for_a_person} left for a person. The change is in the shared draft.`, invalidate: [...inv, ["impact", id]], onDone: () => nav("/review") });
  if (r.isLoading) return <Spinner label="Comparing the editions (no AI)" />;
  if (r.isError) return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Crumbs here="New edition" />
      <ErrorState title="The impact could not be shown" description={(r.error as Error).message} action={<Link className="text-text-link underline" to="/review">Back to To review</Link>} />
      {me.has("review") ? <SetAside id={id!} /> : null}
    </div>
  );
  const x = r.data!, CH: Record<string, [string, string]> = { new: ["info", "New"], reworded: ["warn", "Reworded"], removed: ["danger", "Removed"], unchanged: ["neutral", "Unchanged"] };
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Crumbs here={`${x.form} new edition`} />
      <Head title={`New edition: review impact`} chip="Needs you" sub={<>{x.form} {x.title ? `· ${x.title}` : ""} · {x.library_edition ?? "no earlier edition"} → {x.edition} · uploaded by {x.uploaded_by}, {fmtWhen(x.at)}</>} />
      <p className="rounded-lg border border-border bg-surface px-4 py-2 text-sm" data-ai-line>{x.ai.note} Cost US$0.</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" data-counts>{([["unchanged", "Unchanged"], ["reworded", "Reworded"], ["new", "New"], ["removed", "Removed"]] as const).map(([k, w]) => <div key={k} className="rounded-lg border border-border bg-surface-raised p-3"><p className="text-2xl font-bold tabular-nums">{x.counts[k]}</p><p className="text-sm text-text-muted">{w} form fields</p></div>)}</div>
      <div role="tablist" aria-label="Impact" className="flex gap-1 border-b border-border">
        {([["comparison", "Comparison"], ["library", `Impact on library (${x.library.length})`], ["combinations", `Combinations (${x.combinations.length})`]] as const).map(([k, w]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cn("border-b-2 px-3 py-2 text-sm", tab === k ? "border-primary font-medium" : "border-transparent text-text-muted")}>{w}</button>)}
      </div>
      <div role="tabpanel" className="overflow-x-auto rounded-lg border border-border bg-surface-raised">
        {tab === "comparison" ? <table className="w-full min-w-[640px] text-sm"><thead><tr className="border-b border-border text-left text-text-muted"><th className="px-4 py-2">Form field</th><th className="px-4 py-2">Change</th><th className="px-4 py-2">Shared field today</th></tr></thead>
          <tbody>{x.rows.filter((row) => row.change !== "unchanged").slice(0, 200).map((row) => <tr key={row.dataPath + row.change} className="border-b border-border last:border-b-0"><td className="px-4 py-2">{row.caption}{row.was ? <p className="text-xs text-text-muted">was: {row.was}</p> : null}</td><td className="px-4 py-2"><Pill tone={CH[row.change][0]}>{CH[row.change][1]}</Pill></td><td className="px-4 py-2 text-text-muted">{row.field ?? "—"}</td></tr>)}
            <tr><td colSpan={3} className="px-4 py-2 text-text-muted">{x.counts.unchanged} unchanged form fields keep their map.</td></tr></tbody></table>
          : tab === "library" ? (x.library.length ? <ul className="divide-y divide-border text-sm">{x.library.map((f) => <li key={f.key} className="px-4 py-2"><b>{f.label}</b> · {f.form_fields} form field{f.form_fields === 1 ? "" : "s"} reworded or removed<p className="text-text-muted">{f.meaning}</p></li>)}</ul> : <p className="p-4 text-sm text-text-muted">No shared field loses or changes a form field.</p>)
          : (x.combinations.length ? <ul className="divide-y divide-border text-sm">{x.combinations.map((c) => <li key={c.id} className="px-4 py-2"><Link className="text-text-link hover:underline" to={`/c/${c.id}`}>{c.label}</Link></li>)}<li className="px-4 py-2 text-text-muted">{x.open_cases} open case{x.open_cases === 1 ? "" : "s"} stay on the release they started on.</li></ul> : <p className="p-4 text-sm text-text-muted">No combination files this form yet.</p>)}
      </div>
      {me.has("author") ? <div className="flex justify-end"><Button busy={accept.isPending} onClick={() => accept.mutate(undefined)}>Accept into the shared draft</Button></div>
        : <Notice title="The configuration author accepts it">Accepting adds the new edition to the shared draft; nothing reaches firms until release.</Notice>}
    </div>
  );
}

/** Break M5: a held edition that cannot be compared is set aside with a reason, never left stuck on To review. */
function SetAside({ id }: { id: string }) {
  const nav = useNavigate();
  const go = useAction((note: string) => api(`/intake/held/${id}/reject`, { method: "POST", json: { note } }), { success: "Set aside: the edition is not used", invalidate: [["held"], ...inv], onDone: () => nav("/review") });
  return <Decide yes="Keep it held" no="Set it aside" busy={go.isPending} onYes={() => nav("/review")} onNo={(n) => go.mutate(n)} />;
}

// ───────────────────────────────────────────── board view 5: screen map of an online version (P-61 §3a, P-62 §8)
export function ScreenMapPage() {
  const { id } = useParams(); const me = useMe();
  const s = useApi<ScreenMapView>(["screen-map", id], `/online-versions/${id}/screen-map`);
  const draft = useAction(() => api<{ counts: { mapped: number; inputs: number } }>(`/online-versions/${id}/screen-map/draft`, { method: "POST" }), { success: (r) => `Drafted without AI: ${r.counts.mapped} of ${r.counts.inputs} inputs matched`, invalidate: [["screen-map", id], ...inv] });
  const accept = useAction(() => api<{ mapped: number; unresolved: number }>(`/online-versions/${id}/screen-map/accept`, { method: "POST", json: {} }), { success: (r) => `Accepted: ${r.mapped} mapped, ${r.unresolved} left for a person`, invalidate: [["screen-map", id], ...inv] });
  if (s.isLoading) return <Spinner label="Loading the screen map" />;
  if (s.isError) return <ErrorState title="This screen map could not be opened" description={(s.error as Error).message} action={<Link className="text-text-link underline" to="/review">Back to To review</Link>} />;
  const x = s.data!, c = x.counts ?? {}, FOUND: Record<string, string> = { same_path: "same element id", pdf_twin: "PDF twin", alias: "alias" };
  const open = x.inputs.filter((i) => i.outcome === "leftover" || i.outcome === "unresolved").length;
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Crumbs here={`Screen map · ${x.edition.label}`} />
      <Head title={`Screen map · ${x.edition.form} online`} chip={x.state === "accepted" ? (open ? `${open} left for a person` : "Accepted") : x.state === "drafted" ? "Needs you" : "Not drafted"} tone={x.state === "accepted" && !open ? "ok" : "warn"} sub={x.edition.label} />
      {x.state === "not_drafted" ? (me.has("author") ? <Notice title="Draft it first (no AI)" action={<Button busy={draft.isPending} onClick={() => draft.mutate(undefined)}>Draft the screen map</Button>}>The PDF twin's field map, earlier online versions and aliases are reused first; AI is never called here.</Notice>
        : <Notice title="The configuration author drafts it">Drafting reuses the PDF twin and the library first (no AI).</Notice>) : (
        <>
          {x.state === "drafted" ? <p className="text-sm">Drafted without AI{x.pdf_edition ? ` from the PDF twin ${x.pdf_edition}` : ""}: {c.mapped ?? 0} of {c.inputs ?? 0} inputs matched; {c.leftover ?? 0} left for a person or the AI; {c.not_a_fact ?? 0} not a fact.</p> : null}
          <div className="overflow-x-auto rounded-lg border border-border bg-surface-raised">
            <table className="w-full min-w-[680px] text-sm" aria-label="Inputs"><thead><tr className="border-b border-border text-left text-text-muted"><th className="px-4 py-2">Screen</th><th className="px-4 py-2">Input</th><th className="px-4 py-2">Shared field</th><th className="px-4 py-2">Found by</th></tr></thead>
              <tbody>{x.inputs.map((i) => <tr key={i.input} className="border-b border-border last:border-b-0" data-outcome={i.outcome}><td className="px-4 py-2 text-text-muted">{i.screen}</td><td className="px-4 py-2">{i.label}</td><td className="px-4 py-2">{i.field_label ?? (i.outcome === "not_a_fact" ? "Not a fact" : <span className="text-text-warn">Left for a person</span>)}</td><td className="px-4 py-2 text-xs text-text-muted">{FOUND[i.method ?? ""] ?? (i.outcome === "mapped" ? "accepted" : "—")}</td></tr>)}</tbody></table>
          </div>
          {x.state === "drafted" ? (me.has("review") ? <div className="flex justify-end"><Button busy={accept.isPending} onClick={() => accept.mutate(undefined)}>Accept the {c.mapped ?? 0} matches</Button></div> : <Notice title="A content publisher accepts it">Switch to a person with the review duty.</Notice>) : null}
        </>
      )}
    </div>
  );
}

/** K1 (review Musts 4, 5): one PDF edition's form fields, decided from To review whether they came from an AI draft or
 *  from a new edition's accepted impact. */
export function FormFieldsPage() {
  const { id } = useParams(); const me = useMe();
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Crumbs here="Form fields" />
      <Head title="Form fields with no decision" chip={me.has("review") ? "Needs you" : "A content publisher decides"} sub="Release of every combination that uses this form waits until each new form field has a decision." />
      {me.has("review") ? null : <Notice title="A content publisher decides">Switch to a person with the review duty to decide these.</Notice>}
      <FormFieldDecisions editionId={id!} readOnly={!me.has("review")} />
    </div>
  );
}
