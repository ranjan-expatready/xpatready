// Screen 02 slice 2: the pages a To review row opens (board views 7–9 and the new shared field; views 5 and 6, screen
// maps and portal captures, are parked with the browser extension, W1-02). Each says what is
// waiting, who made it and what a decision does; the person who made it sees it read-only (the server refuses their
// decision too, BR-9). Every decision returns to To review with a toast.
import * as React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, ApiError, useAction, useActorId, useApi } from "@/lib/api";
import { ChangePreview, useChangeCheck } from "@/ChangePreview";
import { Button, Input, Notice, Panel, Pill, Textarea } from "@/components/ui/controls";
import { Spinner } from "@/components/ui/spinner";
import { ErrorState } from "@/components/ui/error-state";
import { fmtWhen } from "@/components/status";
import { cn } from "@/lib/utils";
import { UsesList, type Uses } from "@/pages/library-forms";
import { ToReviewPage } from "@/pages/to-review";
import { FormFieldDecisions } from "@/pages/job";
import type { SessionView } from "../../../contracts/programs";
import type { HeldFileView, ImpactAccepted, ImpactChange, ImpactComponentKind, ImpactDrafted, ImpactReview, LibraryChangeDetail, LibraryChangeView, MergeSide, MergeView } from "../../../contracts/screen02";
import { RECHECK, SAY } from "../../../contracts/lifecycle";

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
function Decide({ yes, no, onYes, onNo, busy, noNeedsReason = true, disabledWhy, onlyNo }: { yes: string; no: string; onYes: () => void; onNo: (note: string) => void; busy: boolean; noNeedsReason?: boolean; disabledWhy?: string | null; /** The yes would be refused: the reason is filled in and the no is the main action. */ onlyNo?: string }) {
  const [note, setNote] = React.useState(onlyNo ?? "");
  if (onlyNo) return (
    <div className="space-y-2 rounded-lg border border-border bg-surface-raised p-4">
      <label className="block text-sm font-medium" htmlFor="decide-note">Reason (needed to {no.toLowerCase()})</label>
      <Textarea id="decide-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="What the other person should know" />
      <div className="flex flex-wrap justify-end gap-2"><Button busy={busy} disabled={note.trim().length < 3} onClick={() => onNo(note.trim())}>{no}</Button></div>
    </div>
  );
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
  // P-116 words for a delete, retire or restore (contracts/lifecycle.ts); S4: what IRCC accepts is applied, and a form delete that could not be applied says why.
  const act = useAction((v: { d: "approve" | "return"; note?: string }) => api<LibraryChangeView>(`/library/changes/${id}/${v.d}`, { method: "POST", json: { note: v.note } }), { success: (r) => (r.status === "RELEASED" ? (r.action === "DELETE" ? SAY.approvedDeleted(r.label) : `"${r.label}" approved and applied`) : r.status === "RETURNED" && /^Not /.test(r.decision_note ?? "") ? `"${r.label}" could not be applied: ${r.decision_note}` : r.status === "APPROVED" ? (r.action === "RETIRE" || r.action === "RESTORE" ? SAY.approvedWaits(r.action, r.label) : SAY.approvedNow(r.label)) : SAY.returned(r.label, r.proposed_by)), invalidate: [...inv, ["library-change", id]], onDone: () => nav("/review") });
  if (c.isLoading) return <Spinner label="Loading the change" />;
  if (c.isError) return <ErrorState title="This change could not be opened" description={(c.error as Error).message} action={<Link className="text-text-link underline" to="/review">Back to To review</Link>} />;
  const x = c.data!, mine = x.proposed_by_id === me.id;
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Crumbs here={x.label} />
      {x.kind === "library_form" ? <FormUses code={x.key} changeId={x.id} /> : null}
      <Head title={x.accepts ? `What IRCC accepts for ${x.accepts.form}` : `${x.action_word} ${x.kind_word}: ${x.label}`} chip={x.status === "WAITING" ? (mine ? "Waiting for a second person" : "Needs you") : x.status === "RETURNED" ? "Returned" : x.status === "APPROVED" ? "Approved · in the next release" : "Released"} tone={x.status === "WAITING" && !mine ? "warn" : "neutral"} sub={<>Proposed by {x.proposed_by}, {fmtWhen(x.proposed_at)}</>} />
      {x.accepts ? (
        <dl className="grid grid-cols-[10rem_1fr] gap-x-4 gap-y-2 rounded-lg border border-border bg-surface-raised p-4 text-sm" data-change-accepts>
          <dt className="text-text-muted">Form</dt><dd className="font-semibold">{x.accepts.form}{x.accepts.edition ? ` · ${x.accepts.edition}` : ""}</dd>
          <dt className="text-text-muted">When proposed</dt><dd>{x.accepts.before}{x.accepts.before !== "Not set yet" ? " (Sample)" : ""}</dd>
          <dt className="text-text-muted">Proposed</dt><dd className="font-semibold">{x.accepts.after}</dd>
          <dt className="text-text-muted">{x.accepts.quote ? "IRCC's words" : "Reason"}</dt><dd>{x.accepts.quote ? `“${x.accepts.quote}”` : x.accepts.reason}</dd>
          <dt className="text-text-muted">Compare with</dt><dd>{x.accepts.form_page ? <a className="text-text-link underline" href={x.accepts.form_page} target="_blank" rel="noreferrer">The form's page on canada.ca</a> : "No canada.ca page recorded"} · <Link className="text-text-link underline" to="/library/forms">Shared library › Forms</Link></dd>
          <dd className="col-span-2 text-xs text-text-muted">Approving applies it to the form's current edition, marked "Set by a person · Sample" until the immigration expert confirms.</dd>
        </dl>
      ) : null}
      {x.rename ? <RenameChange change={x} /> : null}
      {x.supplies ? (
        // C4.5: what the second person compares before approving: the facts before → after, each with its official words.
        <div className="space-y-2 rounded-lg border border-border bg-surface-raised p-4 text-sm" data-change-supplies>
          <dl className="grid grid-cols-[10rem_1fr] gap-x-4 gap-y-2">
            <dt className="text-text-muted">Document type</dt><dd className="font-semibold">{x.supplies.document}</dd>
            <dt className="text-text-muted">Supplies now</dt><dd>{x.supplies.before.length ? x.supplies.before.join(" · ") : "No fact: filed as is"}</dd>
            <dt className="text-text-muted">Proposed</dt><dd className="font-semibold">{x.supplies.after.length ? `${x.supplies.after.length} fact${x.supplies.after.length === 1 ? "" : "s"}` : "No fact"}{x.supplies.removed.length ? ` · removes ${x.supplies.removed.join(", ")}` : ""}</dd>
            <dt className="text-text-muted">Used by</dt><dd>{x.supplies.uses} combination{x.supplies.uses === 1 ? "" : "s"}: their drafts and Preview change at approval</dd>
          </dl>
          {x.supplies.cites.length ? <ul className="space-y-1.5 border-t border-border pt-2" aria-label="Each fact and the official words">{x.supplies.cites.map((c) => (
            <li key={c.fact} data-supply-cite={c.fact} className="[overflow-wrap:anywhere]"><span className="font-medium">{c.label}</span>{c.about !== "holder" ? <span className="text-text-muted"> · about {c.about === "holder.spouse" ? "the holder's spouse or partner" : "the holder's parent"}</span> : null}<br /><span className="text-xs text-text-muted">{c.source} · read {c.readOn}: </span><span className="text-xs">“{c.quote}”</span></li>
          ))}</ul> : null}
          <p className="text-xs text-text-muted">Sample until the immigration expert confirms. Approving makes a draft of the document type; it goes out with each combination's next release.</p>
        </div>
      ) : null}
      {x.field ? (
        <dl className="grid grid-cols-[10rem_1fr] gap-x-4 gap-y-2 rounded-lg border border-border bg-surface-raised p-4 text-sm" data-change-field>
          <dt className="text-text-muted">Name</dt><dd className="font-semibold">{x.field.label}</dd>
          <dt className="text-text-muted">Meaning</dt><dd>{x.field.meaning}</dd>
          <dt className="text-text-muted">Kind of value</dt><dd>{x.field.value_type}</dd>
          {x.field.answer_list?.values.length ? <><dt className="text-text-muted">Answer values</dt><dd data-answer-values><p className="text-xs text-text-muted">{x.field.answer_list.values.length} values · {x.field.answer_list.status === "DRAFT" ? "a new list, approved with this field" : "a released list"}</p><ul tabIndex={0} aria-label="Answer values" className="mt-1 max-h-48 list-disc overflow-auto rounded pl-5 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">{x.field.answer_list.values.map((v) => <li key={v.code}>{v.label}</li>)}</ul></dd></> : null}
          <dt className="text-text-muted">Group</dt><dd>{x.field.group}</dd>
        </dl>
      ) : null}
      <div className="space-y-1 text-sm">
        {x.reason && !x.accepts ? <p><b>Reason:</b> {x.reason}</p> : null}
        {x.ai_verdict ? <p><b>Advisory check:</b> {x.ai_verdict}</p> : null}
        {x.goes_with?.length ? <div data-goes-with><p><b>These go with it</b> ({x.goes_with.length}; none is used):</p><ul className="ml-5 list-disc">{x.goes_with.map((g, i) => <li key={i}>{g}</li>)}</ul></div> : null}
        {x.with_combination ? <p data-with-combination><b>Its combination</b> is {x.action === "RESTORE" ? "restored" : "retired"} with it, in the same release.</p> : null}
        {x.kind === "field" && (x.matches ?? []).length ? <p className="text-text-muted">Closest library fields: {x.matches.map((m) => `${m.key} (${Math.round(m.score * 100)}%)`).join(", ")}</p> : null}
        {x.status === "RETURNED" ? <Notice tone="warn" title={`Returned by ${x.decided_by}`}>{x.decision_note}</Notice> : null}
      </div>
      <details className="text-xs text-text-muted"><summary className="cursor-pointer">Details</summary><p className="mt-1">Key: <span className="mono">{x.key}</span>{x.kind === "field" ? " (generated from the group and the name)" : ""}</p></details>
      {x.status === "RETURNED" && !mine ? <p className="text-sm text-text-muted" data-withdraw-not-mine>Only {x.proposed_by ?? "the person who proposed it"} can {LIFECYCLE_KINDS.includes(x.kind) ? "send it again" : "correct it"} or withdraw it.</p>
        : x.status === "RETURNED" ? (x.supplies ? <><Notice title="Propose it again">A returned change of the facts a document supplies is not sent again from here: withdraw it, then propose the facts again with "Change the facts it supplies…" on its document type (Documents tab or Shared library › Document types).</Notice><Withdraw id={x.id} label="Withdraw it" /></> : x.action === "RENAME" ? <><Notice title="Rename it again">A returned rename is not sent again from here: rename it again on its page, where the check runs again; or withdraw it.</Notice><Withdraw id={x.id} /></> : LIFECYCLE_KINDS.includes(x.kind) ? <SendAgain change={x} /> : <Correct change={x} />) : x.status !== "WAITING" ? null : mine || !me.has("review")
        ? <Notice title={mine ? "You proposed this" : "A content publisher decides"}>{mine ? "A different person approves it or returns it with a reason. Until then, a combination that uses it is not released." : "Switch to the Content reviewer or the Approver (simulated) to decide."}</Notice>
        : <>
          {/* ReviewCard (P-116 amended): the approval re-check, run now and said before the click. */}
          {/* Break M5: approving what IRCC accepts names every combination it leaves with a line filed in a refused way. */}
          {x.accepts_impact?.length ? <div data-accepts-impact><Notice tone="warn" title={`Approving this breaks ${x.accepts_impact.length} combination${x.accepts_impact.length === 1 ? "" : "s"} in use`}>
            <ul className="mt-1 list-disc space-y-1 pl-5">{x.accepts_impact.map((i) => <li key={i.combination}><b className="font-medium">{i.label}</b>: {i.words}</li>)}</ul>
            <p className="mt-1">Each one shows this as a problem and cannot be released until its line is chosen again. Return the change if that is not intended.</p>
          </Notice></div> : null}
          {x.recheck ? (x.recheck.ok
            ? <p className="text-sm" data-recheck="ok">{RECHECK.clear}{x.recheck.kept.length ? <span className="text-text-muted"> Kept: {x.recheck.kept.join(" · ")}.</span> : null}</p>
            : <div data-recheck="refused"><Notice tone="danger" title="Can't approve">{x.recheck.text} Return it with that reason.</Notice></div>) : null}
          <Decide yes="Approve" no="Return" busy={act.isPending} onYes={() => act.mutate({ d: "approve" })} onNo={(note) => act.mutate({ d: "return", note })} onlyNo={x.recheck && !x.recheck.ok ? x.recheck.text : undefined} />
        </>}
      {x.status === "WAITING" && mine && me.has("author") && (x.action === "ADD" || x.action === "RENAME") ? <Withdraw id={x.id} /> : null}
    </div>
  );
}

/** G-CORE B2 (P-266): a rename waiting for a second person: the name before and after, and what it touches (checked now). */
function RenameChange({ change }: { change: LibraryChangeDetail }) {
  const r = change.rename!;
  const check = useChangeCheck([{ action: "rename", kind: change.kind as "field" | "section", key: change.key, name: r.after ?? "" }], change.status === "WAITING" && !!r.after);
  return (
    <div className="space-y-3" data-change-rename>
      <dl className="grid grid-cols-[10rem_1fr] gap-x-4 gap-y-2 rounded-lg border border-border bg-surface-raised p-4 text-sm">
        <dt className="text-text-muted">Name now</dt><dd className="break-words">{r.before}</dd>
        <dt className="text-text-muted">{r.undo ? "Back to" : "Proposed name"}</dt><dd className="break-words font-semibold">{r.after}</dd>
        <dd className="col-span-2 text-xs text-text-muted">A released combination uses it, so a second person approves the new name. Approving checks it again and makes a draft version; releases already made do not change.</dd>
      </dl>
      {change.status === "WAITING" ? <ChangePreview check={check} /> : null}
    </div>
  );
}

/** P-116 (Lead 28 Oct, carried should): Where used shows before any action, on the second person's page too. */
function FormUses({ code, changeId }: { code: string; changeId: string }) {
  const uses = useApi<Uses>(["form-uses", code], `/library/forms/${encodeURIComponent(code)}/uses`);
  // This page is that open change: it is not listed as a use of the form.
  const others = uses.data ? { ...uses.data, uses: uses.data.uses.filter((u) => u.href !== `/review/change/${changeId}`) } : undefined;
  return (
    <section aria-labelledby="change-uses" className="space-y-2 rounded-lg border border-border bg-surface-raised p-4 text-sm" data-change-uses>
      <h2 id="change-uses" className="font-semibold">Where it is used</h2>
      {uses.isLoading ? <Spinner label="Loading where it is used" /> : uses.isError ? <p className="text-text-muted">Where it is used could not be read: {(uses.error as Error).message}</p> : <UsesList uses={others} />}
    </section>
  );
}

/** QA-68: a returned delete, retire or restore is sent again with what changed only (no name or meaning to edit), or withdrawn. */
const LIFECYCLE_KINDS = ["structure_node", "combination", "library_form"];
function SendAgain({ change }: { change: LibraryChangeDetail }) {
  const nav = useNavigate();
  const [reason, setReason] = React.useState(""), [why, setWhy] = React.useState(""), [withdrawing, setWithdrawing] = React.useState(false);
  const kind = change.action as "DELETE" | "RETIRE" | "RESTORE";
  const send = useAction(() => api<LibraryChangeView>(`/library/changes/${change.id}/resubmit`, { method: "POST", json: { reason } }), { success: () => SAY.sentAgain(kind, change.label), invalidate: [...inv, ["library-change", change.id]], onDone: () => nav("/review") });
  const withdraw = useAction(() => api(`/library/changes/${change.id}/withdraw`, { method: "POST", json: { note: why } }), { success: () => SAY.withdrawn(change.label), invalidate: [...inv, ["library-change", change.id]], onDone: () => nav("/review") });
  return (
    <section aria-labelledby="again-h" className="space-y-3 rounded-lg border border-border bg-surface-raised p-4" data-send-again>
      <h2 id="again-h" className="font-semibold">Send it again</h2>
      <label className="block text-sm">What you corrected<Textarea className="mt-1" value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} placeholder="So the second person can check it" /></label>
      <div className="flex justify-end"><Button busy={send.isPending} disabled={reason.trim().length < 3} onClick={() => send.mutate(undefined)}>Send again</Button></div>
      {withdrawing ? (
        <div className="flex flex-wrap items-end gap-2 border-t border-border pt-3" data-withdraw>
          <label className="flex-1 text-sm">Why withdraw it<Input className="mt-1" value={why} maxLength={300} onChange={(e) => setWhy(e.target.value)} /></label>
          <Button variant="destructive" busy={withdraw.isPending} disabled={why.trim().length < 3} onClick={() => withdraw.mutate(undefined)}>Withdraw it</Button>
        </div>
      ) : <div className="flex justify-end"><Button variant="ghost" onClick={() => setWithdrawing(true)}>Withdraw it instead…</Button></div>}
    </section>
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
function Withdraw({ id, label = "Withdraw the new field" }: { id: string; label?: string }) {
  const nav = useNavigate();
  const [open, setOpen] = React.useState(false), [why, setWhy] = React.useState("");
  const go = useAction(() => api<{ form_fields_reopened?: number }>(`/library/changes/${id}/withdraw`, { method: "POST", json: { note: why } }), { success: (r) => (typeof r.form_fields_reopened === "number" ? `Withdrawn: ${r.form_fields_reopened} form field${r.form_fields_reopened === 1 ? "" : "s"} back to "no decision"` : "Withdrawn: nothing in the library changed"), invalidate: [...inv, ["library-change", id]], onDone: () => nav("/review") });
  return open ? (
    <div className="flex flex-wrap items-end gap-2 border-t border-border pt-3" data-withdraw>
      <label className="flex-1 text-sm">Why withdraw it<Input className="mt-1" value={why} maxLength={300} onChange={(e) => setWhy(e.target.value)} /></label>
      <Button variant="destructive" busy={go.isPending} disabled={why.trim().length < 3} onClick={() => go.mutate(undefined)}>{label}</Button>
    </div>
  ) : <div className="flex justify-end"><Button variant="ghost" onClick={() => setOpen(true)}>Withdraw it instead…</Button></div>;
}

// ───────────────────────────────────────────── board view 8: merge two shared fields (right panel over To review, P-48)
export function MergeReviewPage() {
  const { id } = useParams(); const nav = useNavigate(); const me = useMe();
  const m = useApi<MergeView>(["merge", id], `/library/merges/${id}`);
  const x = m.data, mine = x?.proposed_by_id === me.id;
  // G-CORE B2 (BR-2, BR-3): the approver sees what the merge touches, checked again now; approving sends its fingerprint.
  const check = useChangeCheck(x ? [{ action: "merge", kind: "field", key: x.goes.key, into: x.stays.key }] : [], x?.status === "PROPOSED");
  const [stale, setStale] = React.useState(false);
  const approve = useAction((note?: string) => api(`/library/merges/${id}/approve`, { method: "POST", json: { ...(note ? { note } : {}), expected: check.data?.fingerprint } }), { success: "Merged: the field that goes away now redirects", invalidate: [...inv, ["merge", id]], onDone: () => nav("/review") });
  const reject = useAction((note: string) => api(`/library/merges/${id}/reject`, { method: "POST", json: { note } }), { success: "Merge rejected", invalidate: [...inv, ["merge", id]], onDone: () => nav("/review") });
  React.useEffect(() => { if (approve.error instanceof ApiError && approve.error.problem.title === "Look again") { setStale(true); void check.refetch(); } }, [approve.error]);
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
            {x.status === "PROPOSED" ? <ChangePreview check={check} stale={stale} /> : null}
            {x.status !== "PROPOSED" ? null : mine || !me.has("review")
              ? <Notice title={mine ? "You proposed this merge" : "A content publisher decides"}>{mine ? "A different person approves or rejects it." : "Switch to the Content reviewer or the Approver (simulated) to decide."}</Notice>
              : <Decide yes="Approve the merge" no="Reject" busy={approve.isPending || reject.isPending} disabledWhy={check.isFetching || !check.data ? "Checking what the merge touches…" : null} onYes={() => { setStale(false); approve.mutate(undefined); }} onNo={(n) => reject.mutate(n)} onlyNo={check.data && !check.data.ok ? "The checks refuse this merge now (listed above): reject it with that reason." : undefined} />}
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
      {/* QA-80: the uploader who still has to record the IRCC page is the one who acts next. */}
      <Head title={h.edition ?? h.code ?? h.file} chip={mine && !h.irccPage && !h.cannotApprove ? "Needs you: record the IRCC page" : mine ? "Waiting for a second person" : "Needs you"} tone={mine && (h.irccPage || h.cannotApprove) ? "neutral" : "warn"} sub={<>{h.file} · uploaded {fmtWhen(h.at)}</>} />
      <dl className="grid grid-cols-[9rem_1fr] gap-x-4 gap-y-1 rounded-lg border border-border bg-surface-raised p-4 text-sm" data-held-read>
        <dt className="text-text-muted">Read from the file</dt><dd>{h.code ? `${h.code}${h.title ? ` · ${h.title}` : ""}` : "No form code could be read"}</dd>
        <dt className="text-text-muted">Edition</dt><dd>{h.edition ?? "Not read"}</dd>
        <dt className="text-text-muted">The file</dt><dd>{h.stored ? <a className="text-text-link underline" href={`/api/intake/held/${h.id}/file`} target="_blank" rel="noreferrer">Open the held PDF</a> : "Not stored"} <span className="text-xs text-text-muted">· checksum {h.sha256.slice(0, 12)}…</span></dd>
      </dl>
      {h.cannotApprove ? <Notice tone="warn" title="This copy cannot be approved">{h.cannotApprove} It was not read into the library, attached or sent to AI.</Notice> : <><Notice tone="warn" title="Not on the approved source list">It was not read into the library, attached or sent to AI. A second person compares it with the IRCC page it came from; approved, its checksum joins the approved list and the file goes through the intake again.</Notice>
      <section aria-labelledby="held-page" className="space-y-2 rounded-lg border border-border bg-surface-raised p-4 text-sm">
        <h2 id="held-page" className="font-semibold">IRCC page it came from</h2>
        {h.irccPage ? <p><a className="break-all text-text-link underline" href={h.irccPage} target="_blank" rel="noreferrer">{h.irccPage}</a></p>
          : mine ? <div className="flex flex-wrap items-end gap-2"><label className="flex-1 text-sm">Paste the canada.ca page<input className="mt-1 h-9 w-full rounded-lg border border-border-strong bg-surface-raised px-3" value={page} onChange={(e) => setPage(e.target.value)} placeholder="https://www.canada.ca/…" /></label><Button busy={record.isPending} onClick={() => record.mutate(undefined)}>Record the page</Button></div>
          : <p className="text-text-muted">The person who uploaded it records the page first.</p>}
      </section></>}
      {mine || !me.has("review")
        ? <Notice title={mine ? "You uploaded this file" : "A content publisher decides"}>{mine ? (h.cannotApprove ? "A different person rejects it. Upload the official PDF from canada.ca instead." : "A different person compares it with the IRCC page and approves or rejects it.") : "Switch to the Content reviewer or the Approver (simulated) to decide."}</Notice>
        : h.cannotApprove
          ? <Decide yes="Approve as an official source" no="Reject" onlyNo={h.cannotApprove.split(":")[0].slice(0, 300)} busy={reject.isPending} onYes={() => undefined} onNo={(n) => reject.mutate(n)} />
          : <Decide yes="Approve as an official source" no="Reject" busy={approve.isPending || reject.isPending} disabledWhy={h.irccPage ? null : "Waiting for the uploader to record the IRCC page."} onYes={() => approve.mutate(undefined)} onNo={(n) => reject.mutate(n)} />}
    </div>
  );
}

// ───────────────────────────────────────────── board view 7: new edition impact (P-32, C9.1)
const COMPONENTS: [ImpactComponentKind, string][] = [["sections", "Sections"], ["document_types", "Document types"], ["rules", "Rules"], ["checks", "Checks"]];
export function EditionImpactPage() {
  const { id } = useParams(); const nav = useNavigate(); const me = useMe();
  const r = useApi<ImpactReview>(["impact", id], `/intake/held/${id}/impact`);
  const [tab, setTab] = React.useState<"comparison" | "library" | "components" | "combinations">("comparison");
  // C9.1 P-138: Saved replays at US$0; a live click carries the worst case the person saw (the server refuses another).
  const draftAi = useAction((mode: "replay" | "live") => api<ImpactDrafted>(`/intake/held/${id}/impact/draft`, { method: "POST", json: mode === "live" ? { mode, expected_worst_usd: r.data?.ai.offer.at_most_usd } : { mode } }),
    { success: (d) => d.message, invalidate: [...inv, ["impact", id]] });
  // Review minor: after Use the saved AI run the button is gone; focus moves to the result, never to the page body.
  const draftedRef = React.useRef<HTMLParagraphElement>(null);
  const wasDrafted = React.useRef(false);
  React.useEffect(() => { const now = !!r.data?.ai.drafted; if (now && !wasDrafted.current && draftAi.isSuccess) draftedRef.current?.focus(); wasDrafted.current = now; }, [r.data?.ai.drafted, draftAi.isSuccess]);
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
      {x.previous_accepted_words ? <div data-accepted-until><Notice tone={/has passed/.test(x.previous_accepted_words) ? "warn" : "info"} title={`Previous edition accepted until ${x.previous_accepted_until}`}>
        {x.previous_accepted_words}{x.previous_accepted_source ? <> IRCC: “{x.previous_accepted_source.quote}”{x.previous_accepted_source.url ? <> (<a className="text-text-link underline" href={x.previous_accepted_source.url} target="_blank" rel="noreferrer">form page</a>, saved {x.previous_accepted_source.saved})</> : null}</> : null}</Notice></div> : null}
      <section aria-labelledby="impact-ai" className="space-y-2 rounded-lg border border-border bg-surface-raised p-4" data-impact-ai>
        <div className="flex flex-wrap items-center gap-2"><h2 id="impact-ai" className="text-base font-semibold">AI for the new and reworded form fields</h2>{x.ai.saved ? <Pill tone="success">Saved</Pill> : null}{x.ai.drafted ? <Pill tone="info">Drafted</Pill> : null}</div>
        {x.ai.drafted ? null : <p className="text-sm" data-offer>{x.ai.offer.words}</p>}
        {x.ai.saved_words && !x.ai.drafted ? <p className="text-sm text-text-muted" data-saved-words>{x.ai.saved_words}</p> : null}
        {x.ai.drafted ? <p className="text-sm" data-drafted tabIndex={-1} ref={draftedRef}>{x.ai.drafted.message} <Link className="text-text-link underline" to="/review">{x.ai.drafted.waiting} waiting on To review</Link></p>
          : x.ai.offer.boxes && me.has("author") ? <div className="flex flex-wrap items-center gap-2">
            {x.ai.saved ? <Button busy={draftAi.isPending} onClick={() => draftAi.mutate("replay")} data-use-saved>Use the saved AI run (US$0)</Button> : null}
            {x.ai.saved ? null : <Button variant="default" disabled={!x.ai.live.open || draftAi.isPending} title={x.ai.live.why ?? undefined} aria-describedby={x.ai.live.open ? undefined : "impact-ai-why"} onClick={() => draftAi.mutate("live")} data-priced>{`Draft with AI (about US$${x.ai.offer.about_usd.toFixed(2)} · at most US$${x.ai.offer.at_most_usd.toFixed(2)})`}</Button>}
            {x.ai.live.why && !x.ai.saved ? <p id="impact-ai-why" className="w-full text-xs text-text-muted">{x.ai.live.why}</p> : null}
          </div> : null}
      </section>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" data-counts>{([["unchanged", "Unchanged"], ["reworded", "Reworded"], ["new", "New"], ["removed", "Removed"]] as const).map(([k, w]) => <div key={k} className="rounded-lg border border-border bg-surface-raised p-3"><p className="text-2xl font-bold tabular-nums">{x.counts[k]}</p><p className="text-sm text-text-muted">{w} form fields</p></div>)}</div>
      <div role="tablist" aria-label="Impact" className="flex flex-wrap gap-1 border-b border-border">
        {([["comparison", "Comparison"], ["library", `Impact on library (${x.library.length})`], ["components", `Components touched (${COMPONENTS.reduce((t, [k]) => t + x.components[k].length, 0)})`], ["combinations", `Combinations (${x.combinations.length})`]] as const).map(([k, w]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cn("border-b-2 px-3 py-2 text-sm", tab === k ? "border-primary font-medium" : "border-transparent text-text-muted")}>{w}</button>)}
      </div>
      <div role="tabpanel" className="overflow-x-auto rounded-lg border border-border bg-surface-raised">
        {tab === "comparison" ? <table className="w-full min-w-[640px] text-sm"><thead><tr className="border-b border-border text-left text-text-muted"><th className="px-4 py-2">Form field</th><th className="px-4 py-2">Change</th><th className="px-4 py-2">Shared field today</th><th className="px-4 py-2">AI proposal</th></tr></thead>
          <tbody>{x.rows.filter((row) => row.change !== "unchanged").slice(0, 200).map((row) => <tr key={row.dataPath + row.change} className="border-b border-border last:border-b-0"><td className="px-4 py-2">{row.caption}{row.was ? <p className="text-xs text-text-muted">was: {row.was}</p> : null}</td><td className="px-4 py-2"><Pill tone={CH[row.change][0]}>{CH[row.change][1]}</Pill></td><td className="px-4 py-2 text-text-muted">{row.field ?? "—"}</td><td className="px-4 py-2" data-box-ai={row.dataPath}>{row.change === "removed" || row.change === "unchanged" ? <span className="text-text-muted">—</span> : x.ai.drafted?.boxes[row.dataPath]?.length ? <Link className="text-text-link underline" to="/review">{x.ai.drafted.boxes[row.dataPath].length} on To review</Link> : <span className="text-text-muted">{x.ai.drafted ? "None proposed: a person maps it" : "Waiting for Draft with AI or a person"}</span>}</td></tr>)}
            <tr><td colSpan={4} className="px-4 py-2 text-text-muted">{x.counts.unchanged} unchanged form fields keep their map.</td></tr></tbody></table>
          : tab === "components" ? <div className="divide-y divide-border text-sm" data-components>{COMPONENTS.map(([k, w]) => <div key={k} className="px-4 py-3"><h3 className="font-medium">{w} ({x.components[k].length})</h3>
            {x.components[k].length ? <ul className="mt-1 space-y-1">{x.components[k].map((c) => <li key={`${c.key}|${c.field}|${c.combination_id}`}><b className="font-medium">{c.label}</b> · <Link className="text-text-link underline" to={`/c/${c.combination_id}`}>{c.combination}</Link><p className="text-text-muted">{c.why}</p></li>)}</ul> : <p className="text-text-muted">None touched.</p>}</div>)}</div>
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
