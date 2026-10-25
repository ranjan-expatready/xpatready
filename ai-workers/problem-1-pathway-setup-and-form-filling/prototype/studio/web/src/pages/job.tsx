import * as React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CheckCheck, ChevronRight, CornerUpLeft, GitMerge, Plus, Sparkles } from "lucide-react";
import { api, useAction, useApi } from "@/lib/api";
import { Button, Dialog, Field, Input, Notice, Pill, Select, Stat, Textarea } from "@/components/ui/controls";
import { Spinner } from "@/components/ui/spinner";
import { ErrorState } from "@/components/ui/error-state";
import { ModePill, StatusPill } from "@/pages/combination";
import { cn } from "@/lib/utils";
import type { FormFieldsView } from "../../../contracts/screen02";

export const PERSON: Record<string, string> = { form_subject: "the form's subject", subject_spouse_or_partner: "the subject's spouse or partner", subject_parent_1: "the subject's first parent", subject_parent_2: "the subject's second parent", subject_child: "the subject's child", subject_sibling: "the subject's sibling", representative: "the representative", none: "the application" };
const OUTCOME: Record<string, [string, string]> = { REUSE: ["ok", "Reuse existing"], NEW: ["info", "New definition"], AMBIGUOUS: ["warn", "Ambiguous"], CONFLICT: ["danger", "Conflict"] };
/** What "accept the clean ones" leaves for a person: ambiguous and conflicting proposals, and new fields a library field
 *  could fit (BR-7: they need a reason). */
const needsOwn = (i: { outcome: string; decision: string; candidates?: { score: number }[] | null }) => i.decision === "PENDING" && (["AMBIGUOUS", "CONFLICT"].includes(i.outcome) || (i.outcome === "NEW" && (i.candidates ?? []).some((c) => c.score >= 0.55)));
const FILTERS = [["decide", "Needs a decision"], ["new", "New"], ["reuse", "Reuse"], ["decided", "Decided"], ["all", "All"]] as const;

export function JobPage() {
  const { id, jobId } = useParams();
  const nav = useNavigate();
  const j = useApi<any>(["job", jobId], `/jobs/${jobId}`, { refetchInterval: (q: any) => (q.state.data?.status === "RUNNING" || q.state.data?.status === "QUEUED" ? 3000 : false) });
  const [filter, setFilter] = React.useState<(typeof FILTERS)[number][0]>("decide");
  const [applyOpen, setApplyOpen] = React.useState(false);
  const [focusDecisions, setFocusDecisions] = React.useState(false);
  const recompare = useAction(() => api(`/jobs/${jobId}/recompare`, { method: "POST" }), { success: (r: any) => `Compared again with the current library (no AI call): ${r.detail?.recompared?.kept ?? 0} decisions kept, ${r.detail?.recompared?.reopened ?? 0} to decide again`, invalidate: [["job", jobId]] });
  // Board view 4 keys: J / K move between proposals, A accepts the one in focus, N opens its new-field form.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey || (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable))) return;
      const cards = [...document.querySelectorAll<HTMLElement>("article[data-proposal]")];
      if (!cards.length) return;
      const at = cards.findIndex((c) => c.contains(document.activeElement));
      const k = e.key.toLowerCase();
      if (k === "j" || k === "k") { e.preventDefault(); cards[Math.max(0, Math.min(cards.length - 1, at < 0 ? 0 : at + (k === "j" ? 1 : -1)))].focus(); }
      else if ((k === "a" || k === "n") && at >= 0) { const b = cards[at].querySelector<HTMLButtonElement>(k === "a" ? "[data-accept]" : "[data-new]"); if (b && !b.disabled) { e.preventDefault(); b.click(); } }
    };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, []);
  const clean = useAction((outcome: "REUSE" | "NEW") => api(`/jobs/${jobId}/accept-clean`, { method: "POST", json: { outcome } }), { success: (r: any) => `${r.accepted} ${r.outcome === "REUSE" ? "exact reuse matches" : "new definitions"} accepted`, invalidate: [["job", jobId]] });
  if (j.isLoading) return <Spinner label="Loading the AI draft" />;
  if (j.isError) return <ErrorState title="This AI draft could not be opened" description={(j.error as Error).message} />;
  const job = j.data;
  if (job.kind === "checklist_draft") return <ChecklistJob job={job} combinationId={id!} />;
  const items = job.items as any[];
  const c = job.detail?.counts;
  const pending = items.filter((i) => i.decision === "PENDING");
  const shown = items.filter((i) => filter === "all" ? true : filter === "decided" ? i.decision !== "PENDING" : filter === "decide" ? needsOwn(i) : filter === "new" ? i.outcome === "NEW" : i.outcome === "REUSE");
  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-24">
      <nav className="flex items-center gap-1 text-xs text-text-muted"><Link to={`/c/${id}/sources`} className="hover:underline">Sources and forms</Link><ChevronRight className="size-3" /><span>AI field-map draft</span></nav>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold"><Sparkles className="size-5 text-[#7c3aed]" /> {job.attachment?.edition ?? "Form"}: AI-proposed field map</h1>
          <div className="mt-2 flex flex-wrap items-center gap-1.5"><ModePill mode={job.mode} /><StatusPill status={job.status} />{job.costUsd !== null && job.costUsd !== undefined ? <Pill>US${Number(job.costUsd).toFixed(2)}</Pill> : null}<Pill>{job.elapsed_s}s</Pill></div>
          <p className="mt-2 max-w-3xl text-xs text-text-muted">{job.detail?.label ?? "AI-drafted under a prototype-only exception to the AI-processing rule; not the product's provider route"}. {job.mode === "REPLAY" ? "This is a replay of a saved real run: no model was called now." : ""} The AI saw only the public list of the form's fields; it never saw the library, a family or an answer key. The comparison with the library below is deterministic.</p>
        </div>
      </div>
      {job.status === "RUNNING" || job.status === "QUEUED" ? <Notice tone="ai" title="The AI is drafting" action={<Spinner label="Running" />}>{job.message} Steps so far: {(job.detail?.steps ?? []).map((s: any) => `${s.step} (exit ${s.exit})`).join(", ") || "starting"}. This page updates by itself.</Notice> : null}
      {job.status === "BLOCKED" || job.status === "FAILED" ? <Notice tone={job.status === "BLOCKED" ? "warn" : "danger"} title={job.status === "BLOCKED" ? "Blocked: nothing was drafted" : "The draft failed"} action={<Button size="sm" variant="secondary" asChild><Link to={`/c/${id}/sources`}>Back to sources</Link></Button>}>{job.message}</Notice> : null}
      {job.status === "COMPLETED" ? <Notice tone="info" title="Compared with the library as it was when the draft was read" action={<Button size="sm" variant="secondary" onClick={() => recompare.mutate(undefined)} busy={recompare.isPending}>Compare again (no AI call)</Button>}>{job.detail?.library_revision ? `The library then had ${job.detail.library_revision.fields} shared field versions. ` : ""}If the shared library changes before you apply, applying is refused as stale; comparing again keeps every decision that still holds and reopens the rest.{job.detail?.recompared ? ` Last compared again by ${job.detail.recompared.by}: ${job.detail.recompared.kept} kept, ${job.detail.recompared.reopened} reopened.` : ""}</Notice> : null}
      {c ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
          <Stat label="Form fields" value={c.boxes} sub={`${c.mapped} mapped · ${c.unresolved} unresolved`} />
          <Stat label="Never filled" value={c.never_filled + c.not_a_fact} sub="signatures, office use, mechanics" />
          <Stat label="Reuse" value={c.reuse} tone="ok" sub="same library definition" />
          <Stat label="New" value={c.new} tone="info" sub="proposed definitions" />
          <Stat label="Ambiguous" value={c.ambiguous} tone="warn" sub="a person decides" />
          <Stat label="Conflict" value={c.conflict} tone="danger" sub="type clash" />
        </div>
      ) : null}
      {items.length ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div role="tablist" className="flex gap-1">{FILTERS.map(([k, l]) => { const n = k === "all" ? items.length : k === "decided" ? items.length - pending.length : k === "decide" ? items.filter(needsOwn).length : items.filter((i) => i.outcome === (k === "new" ? "NEW" : "REUSE")).length; return <button key={k} role="tab" aria-selected={filter === k} onClick={() => setFilter(k)} className={cn("rounded-lg px-3 py-1.5 text-sm", filter === k ? "bg-primary/10 font-medium text-text-link" : "text-text-muted hover:bg-text/5")}>{l} <span className="text-xs">({n})</span></button>; })}</div>
            {job.status === "COMPLETED" ? <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => clean.mutate("REUSE")} busy={clean.isPending && clean.variables === "REUSE"} disabled={!items.some((i) => i.outcome === "REUSE" && i.decision === "PENDING")}><CheckCheck /> Accept exact reuse ({items.filter((i) => i.outcome === "REUSE" && i.decision === "PENDING").length})</Button>
              <Button variant="secondary" onClick={() => clean.mutate("NEW")} busy={clean.isPending && clean.variables === "NEW"} disabled={!items.some((i) => i.outcome === "NEW" && i.decision === "PENDING" && !i.candidates.some((c: any) => c.score >= 0.55))} title="New definitions with no similar library field; anything close to an existing field needs its own decision"><CheckCheck /> Accept clean new definitions ({items.filter((i) => i.outcome === "NEW" && i.decision === "PENDING" && !i.candidates.some((c: any) => c.score >= 0.55)).length})</Button>
            </div> : null}
          </div>
          <p className="text-xs text-text-muted" data-keys>Keys: <kbd className="rounded border border-border px-1">J</kbd> / <kbd className="rounded border border-border px-1">K</kbd> next and previous proposal · <kbd className="rounded border border-border px-1">A</kbd> accept · <kbd className="rounded border border-border px-1">N</kbd> name it as a new shared field.</p>
          <div className="space-y-3">{shown.map((i) => <ItemCard key={i.id} item={i} jobId={jobId!} locked={job.status !== "COMPLETED"} />)}{!shown.length ? <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-text-muted">Nothing in this view.</p> : null}</div>
        </>
      ) : null}
      {job.status === "COMPLETED" || job.status === "APPLIED" ? (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface-raised/95 px-6 py-3 backdrop-blur md:left-56">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <p className="text-sm">{job.status === "APPLIED" ? "Applied to the draft. Next: preview the effect, then submit for review." : pending.length ? <><b>{pending.length}</b> proposal{pending.length > 1 ? "s" : ""} still to decide. Every proposal needs a decision before it reaches the draft.</> : "All proposals decided. Apply them to the combination's draft configuration."}</p>
            {job.status === "APPLIED" ? <Button onClick={() => nav(`/c/${id}/preview`)}>Preview the draft</Button> : <Button disabled={!!pending.length} onClick={() => setApplyOpen(true)}><GitMerge /> Apply to draft</Button>}
          </div>
        </div>
      ) : null}
      {job.status === "APPLIED" ? <FormFieldDecisions jobId={jobId!} focusOnLoad={focusDecisions} /> : null}
      {applyOpen ? <ApplyDialog job={job} onClose={() => setApplyOpen(false)} onDone={async () => {
        // Review Must 4: when form fields are left to decide, stay here where they are listed; otherwise preview.
        const ff = await api<FormFieldsView>(`/jobs/${jobId}/form-fields`).catch(() => null);
        if (ff?.fields.some((f) => f.outcome === "unresolved" && !f.carried)) setFocusDecisions(true);
        else nav(`/c/${id}/preview`);
      }} /> : null}
    </div>
  );
}

function ItemCard({ item, jobId, locked }: { item: any; jobId: string; locked: boolean }) {
  const [mode, setMode] = React.useState<null | "other" | "new" | "return" | "why">(null);
  // BR-7 (review Must 3): accepting makes a new shared field while a library field could fit, so it needs a reason.
  const near = item.outcome === "NEW" && item.evidence?.recommendation?.action !== "reuse" ? ((item.candidates ?? []) as { key: string; score: number }[]).filter((c) => c.score >= 0.55).sort((x, y) => y.score - x.score)[0] : null;
  const why = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => { if (mode === "why") why.current?.focus(); }, [mode]);
  const [key, setKey] = React.useState(item.candidates?.[0]?.key ?? item.proposedKey), [meaning, setMeaning] = React.useState(item.proposedMeaning), [type, setType] = React.useState(item.proposedType), [note, setNote] = React.useState("");
  const decide = useAction((b: any) => api(`/jobs/${jobId}/items/${item.id}`, { method: "POST", json: b }), { invalidate: [["job", jobId]], onDone: () => setMode(null) });
  const [tone, label] = OUTCOME[item.outcome];
  const rec = item.evidence?.recommendation;
  const dep = (k: string) => item.affected?.[k];
  const decided = item.decision !== "PENDING";
  return (
    <article data-proposal={item.id} tabIndex={0} aria-label={`${OUTCOME[item.outcome][1]}: ${item.proposedKey}`} className={cn("min-w-0 rounded-xl border bg-surface-raised p-4 shadow-sm [overflow-wrap:anywhere] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50", decided ? "border-border opacity-90" : item.outcome === "CONFLICT" ? "border-danger/40" : item.outcome === "AMBIGUOUS" ? "border-warn/50" : "border-border")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><Pill tone={tone}>{label}</Pill><code className="mono font-semibold">{item.proposedKey}</code><Pill>{item.proposedType}</Pill>{item.matchedKey && item.matchedKey !== item.proposedKey ? <span className="text-xs text-text-muted">closest: <code className="mono">{item.matchedKey}</code></span> : null}</div>
          <p className="mt-1 text-sm">{item.proposedMeaning}</p>
          <p className="mt-1 text-xs text-text-muted">{item.reason}</p>
          {!decided && item.decisionNote ? <p className="mt-1 text-xs font-medium text-text-warn">{item.decisionNote}</p> : null}
        </div>
        {decided ? <div className="text-right text-xs"><Pill tone={item.decision === "RETURNED" ? "warn" : "ok"}>{item.decision === "ACCEPTED" ? "Accepted" : item.decision === "CHANGED" ? "Changed" : item.decision === "NEW" ? "New shared field" : "Returned"}</Pill>{item.decision === "NEW" && item.payload?.label ? <p className="mt-1 font-medium">"{item.payload.label}" · a second person approves it on To review</p> : null}<p className="mt-1">{item.decidedKey ? <>uses <code className="mono">{item.decidedKey}</code></> : item.decisionNote}</p><p className="text-text-muted">by {item.decidedBy}</p>{!locked ? <button className="mt-1 text-text-link underline" onClick={() => decide.mutate({ decision: "PENDING" })}>undo</button> : null}</div> : null}
      </div>
      <div className="mt-3 grid min-w-0 gap-3 lg:grid-cols-3 [&>*]:min-w-0">
        <div className="rounded-lg bg-surface p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">Whose value the form fields read ({item.boxes.length} form field{item.boxes.length > 1 ? "s" : ""})</p>
          <div className="mt-1 flex flex-wrap gap-1">{item.persons.map((p: string) => <Pill key={p} tone="info">{PERSON[p] ?? p}</Pill>)}</div>
          <ul className="mt-2 space-y-1 text-xs">{item.boxes.slice(0, 4).map((b: any) => <li key={b.data_path}><span className="font-medium">{b.caption || b.data_path.split(".").slice(-2).join(".")}</span> · {PERSON[b.person] ?? b.person}{b.row !== null ? ` · row ${b.row + 1}` : ""} · {b.confidence}{b.evidence ? <span className="block truncate text-text-muted" title={b.evidence}>"{b.evidence}"</span> : null}</li>)}{item.boxes.length > 4 ? <li className="text-text-muted">and {item.boxes.length - 4} more</li> : null}</ul>
        </div>
        <div className="rounded-lg bg-surface p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">Library comparison</p>
          {!item.candidates.length && item.outcome === "REUSE" ? <p className="mt-1 text-xs">Exact key in the library.</p> : null}
          {!item.candidates.length && item.outcome === "NEW" ? <p className="mt-1 text-xs text-text-muted">No similar definition.</p> : null}
          <ul className="mt-1 space-y-1.5 text-xs">{item.candidates.map((cd: any) => <li key={cd.key}><code className="mono">{cd.key}</code> <span className="text-text-muted">({cd.score})</span><span className="block text-text-muted">{cd.meaning} · {cd.valueType}</span><span className="block text-text-muted">{cd.why}</span></li>)}</ul>
        </div>
        <div className="rounded-lg bg-surface p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">What already depends on {item.matchedKey ? <code className="mono normal-case">{item.matchedKey}</code> : "the closest field"}</p>
          {(() => { const k = item.matchedKey ?? item.candidates?.[0]?.key; const x = k ? dep(k) : null; if (!x) return <p className="mt-1 text-xs text-text-muted">Nothing: a new definition starts unused.</p>; return (
            <div className="mt-1 space-y-1 text-xs">
              <p>{Object.entries(x.boxes_by_form).map(([f, n]) => `${f}: ${n} form field${Number(n) > 1 ? "s" : ""}`).join(" · ") || "no form fields"}</p>
              <p className="text-text-muted">for {x.people.map((p: string) => PERSON[p] ?? p).join(", ") || "nobody yet"}</p>
              <p>{x.placement ? `Asked in "${x.placement.section}" (${x.placement.collected_from.replace(/_/g, " ")})` : "Not asked anywhere yet"}</p>
              {x.conditions.length ? <p className="text-text-muted">Conditions: {x.conditions.join("; ")}</p> : null}
            </div>); })()}
        </div>
      </div>
      {!decided && !locked ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <Button size="sm" data-accept aria-expanded={near ? mode === "why" : undefined} onClick={() => near ? setMode(mode === "why" ? null : "why") : decide.mutate({ decision: "ACCEPTED" })} busy={decide.isPending && !mode}>{rec?.action === "reuse" ? <GitMerge /> : <Plus />} {rec?.text ?? "Accept"}</Button>
          <Button size="sm" variant="secondary" onClick={() => setMode(mode === "other" ? null : "other")}>Use another library field</Button>
          <Button size="sm" variant="secondary" data-new onClick={() => setMode(mode === "new" ? null : "new")}>{rec?.action !== "create_new" ? "Create a new shared field" : "Name it as a new shared field"}</Button>
          <Button size="sm" variant="ghost" onClick={() => setMode(mode === "return" ? null : "return")}><CornerUpLeft /> Return</Button>
        </div>
      ) : null}
      {mode === "other" ? <div className="mt-3 flex flex-wrap items-end gap-2"><Field label="Library field key" className="w-96"><Input className="mono" value={key} onChange={(e) => setKey(e.target.value)} list={`c-${item.id}`} /></Field><datalist id={`c-${item.id}`}>{item.candidates.map((cd: any) => <option key={cd.key} value={cd.key}>{cd.meaning}</option>)}</datalist><Button size="sm" onClick={() => decide.mutate({ decision: "CHANGED", key })} busy={decide.isPending}>Use this field</Button></div> : null}
      {mode === "new" ? <NewFieldForm item={item} busy={decide.isPending} onSave={(b) => decide.mutate({ decision: "NEW", ...b })} error={decide.error?.message ?? null} /> : null}
      {mode === "why" && near ? <div className="mt-3 flex flex-wrap items-end gap-2" data-accept-reason><Field label={`Why is this not ${near.key}? (a library field that could fit)`} className="min-w-64 flex-1"><Input ref={why} value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} /></Field><Button size="sm" disabled={note.trim().length < 8} onClick={() => decide.mutate({ decision: "ACCEPTED", note })} busy={decide.isPending}>Accept with this reason</Button></div> : null}
      {mode === "return" ? <div className="mt-3 flex items-end gap-2"><Field label="Why it goes back (shown on its form fields as unresolved)" className="flex-1"><Textarea className="min-h-10" value={note} onChange={(e) => setNote(e.target.value)} /></Field><Button size="sm" variant="destructive" onClick={() => decide.mutate({ decision: "RETURNED", note })} busy={decide.isPending}>Return</Button></div> : null}
    </article>
  );
}

function ApplyDialog({ job, onClose, onDone }: { job: any; onClose: () => void; onDone: () => void }) {
  const [who, setWho] = React.useState("each_applicant"), [title, setTitle] = React.useState("");
  const apply = useAction(() => api(`/jobs/${job.id}/apply`, { method: "POST", json: { who, title } }), { success: (r: any) => `${r.edition} applied to the draft: ${r.boxes} form fields, ${r.new_fields} new fields`, invalidate: [["job", job.id], ["combination", job.combinationId], ["preview"]], onDone: () => { onClose(); onDone(); } });
  const n = job.items.filter((i: any) => i.decision !== "RETURNED" && i.decidedKey && i.outcome !== "REUSE").length;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title="Apply the decided proposals to the draft" description="Adds the form edition and its field map, the new field definitions and the form to this combination, all as draft. Nothing is released until review and approval."
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => apply.mutate(undefined)} busy={apply.isPending}><GitMerge /> Apply to draft</Button></>}>
      <div className="space-y-3">
        <p className="text-sm">{job.items.filter((i: any) => i.decision !== "RETURNED").length} fields decided ({n} new or re-pointed), {job.items.filter((i: any) => i.decision === "RETURNED").length} returned (their form fields become unresolved with the reason).</p>
        <Field label="Who files this form"><Select value={who} onChange={(e) => setWho(e.target.value)}><option value="each_applicant">Each applicant</option><option value="principal_applicant">The principal applicant only</option><option value="each_person">Each person</option></Select></Field>
        <Field label="Form title" hint="Optional; defaults to the official title."><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Application for Temporary Resident Visa" /></Field>
      </div>
    </Dialog>
  );
}

/** BR-7: a new shared field from a proposal. The person types its name and meaning (never a key: it is generated from
 *  the group and the name); a reason is needed when the library already has a field that could fit. */
function NewFieldForm({ item, busy, onSave, error }: { item: { proposedKey: string; proposedMeaning: string; proposedType: string; candidates?: { key: string; score: number }[] }; busy: boolean; onSave: (b: { label: string; meaning: string; valueType: string; reason: string }) => void; error: string | null }) {
  const guess = item.proposedKey.split(".").slice(-1)[0].replace(/_/g, " ");
  const [label, setLabel] = React.useState(guess.charAt(0).toUpperCase() + guess.slice(1)), [meaning, setMeaning] = React.useState(item.proposedMeaning), [type, setType] = React.useState(item.proposedType), [reason, setReason] = React.useState("");
  const close = (item.candidates ?? []).find((c) => c.score >= 0.55);
  return (
    <div className="mt-3 space-y-2 rounded-lg border border-border p-3" data-new-field>
      <div className="grid gap-2 md:grid-cols-[1fr_2fr_auto]">
        <Field label="Name"><Input autoFocus value={label} onChange={(e) => setLabel(e.target.value)} maxLength={120} /></Field>
        <Field label="Meaning"><Input value={meaning} onChange={(e) => setMeaning(e.target.value)} /></Field>
        <Field label="Kind of value"><Select value={type} onChange={(e) => setType(e.target.value)}>{["text", "date", "yes_no", "code", "country", "number", "address", "phone", "email"].map((t) => <option key={t}>{t}</option>)}</Select></Field>
      </div>
      <Field label={close ? `Why is this not "${close.key}"? (needed)` : "Reason (optional)"} hint={close ? "The library already has a field that could fit; say why this one means something else." : undefined}><Textarea className="min-h-10" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} /></Field>
      {error ? <p role="alert" className="text-sm text-text-danger">{error}</p> : null}
      <div className="flex items-center justify-between gap-2"><p className="text-xs text-text-muted">The key is made from the group and the name. A second person approves the new field on To review before any release carries it.</p><Button size="sm" busy={busy} onClick={() => onSave({ label, meaning, valueType: type, reason })}>Create the shared field</Button></div>
    </div>
  );
}

/** K1: after apply, every form field that no shared field fills needs a decision before release: "not a fact" or
 *  "filled by hand", each with a reason. Form fields carried from an earlier release only warn. */
export function FormFieldDecisions({ jobId, editionId, readOnly = false, focusOnLoad = false }: { jobId?: string; editionId?: string; readOnly?: boolean; focusOnLoad?: boolean }) {
  const cache = editionId ? ["edition-form-fields", editionId] : ["job-form-fields", jobId!];
  const q = useApi<FormFieldsView>(cache, editionId ? `/editions/${editionId}/form-fields` : `/jobs/${jobId}/form-fields`);
  const [open, setOpen] = React.useState<string | null>(null), [kind, setKind] = React.useState<"not_a_fact" | "by_hand">("not_a_fact"), [reason, setReason] = React.useState("");
  const decide = useAction((dataPath: string) => api<{ outcome: string }>(`/editions/${q.data?.edition?.id}/form-fields/decision`, { method: "POST", json: { dataPath, decision: kind, reason } }), { success: (r) => `Decided: ${r.outcome === "by_hand" ? "filled by hand" : "not a fact"}`, invalidate: [cache, ["combination"], ["draft"], ["catalogue"], ["review-queue"]], onDone: () => { setOpen(null); setReason(""); } });
  const heading = React.useRef<HTMLHeadingElement>(null);
  React.useEffect(() => { if (focusOnLoad && q.data?.edition) { heading.current?.focus(); heading.current?.scrollIntoView({ block: "start" }); } }, [focusOnLoad, q.data?.edition]);
  if (!q.data?.edition) return null;
  const open_ = q.data.fields.filter((f) => f.outcome === "unresolved");
  const decided = q.data.fields.filter((f) => f.outcome === "by_hand" || (f.outcome === "not_a_fact" && f.status === "DRAFT"));
  return (
    <section aria-labelledby="ff-decide" className="space-y-3 rounded-xl border border-border bg-surface-raised p-4" data-form-field-decisions>
      <div><h2 id="ff-decide" ref={heading} tabIndex={-1} className="font-semibold outline-none">Form fields with no decision ({open_.length})</h2>
        <p className="text-sm text-text-muted">Each form field is mapped to a shared field, marked "not a fact" (nothing is filled from case facts), or "filled by hand" with a reason. {open_.some((f) => !f.carried) ? "Release waits until every new one is decided." : open_.length ? "These come from an earlier release: decide them when you can." : "Every form field has a decision."}</p></div>
      <ul className="divide-y divide-border text-sm">{open_.slice(0, 50).map((f) => (
        <li key={f.dataPath} className="py-2" data-form-field={f.dataPath}>
          <div className="flex flex-wrap items-center justify-between gap-2"><span><b className="font-medium">{f.caption || f.dataPath}</b>{f.heading ? <span className="text-text-muted"> · {f.heading}</span> : null}{f.carried ? <Pill className="ml-2">Not decided yet (from an earlier release)</Pill> : null}{f.reason ? <span className="block text-xs text-text-muted">{f.reason}</span> : null}</span>
            {readOnly ? null : <Button size="sm" variant="secondary" aria-expanded={open === f.dataPath} onClick={() => { setOpen(open === f.dataPath ? null : f.dataPath); setReason(""); }}>Decide</Button>}</div>
          {open === f.dataPath ? (
            <div className="mt-2 grid gap-2 md:grid-cols-[auto_1fr_auto] md:items-end">
              <Field label="Decision"><Select value={kind} onChange={(e) => setKind(e.target.value === "by_hand" ? "by_hand" : "not_a_fact")}><option value="not_a_fact">Not a fact</option><option value="by_hand">Filled by hand</option></Select></Field>
              <Field label="Reason"><Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder={kind === "by_hand" ? "Who fills it and why" : "Signature, office use, a document…"} /></Field>
              <Button size="sm" busy={decide.isPending} onClick={() => decide.mutate(f.dataPath)}>Save</Button>
            </div>
          ) : null}
        </li>))}</ul>
      {open_.length > 50 ? <p className="text-xs text-text-muted">Showing 50 of {open_.length}.</p> : null}
      {decided.length ? <p className="text-xs text-text-muted">{decided.length} decided in this draft.</p> : null}
    </section>
  );
}

/** K2 (Screen 02 slice 3): a checklist draft. Each proposal is a document requirement (or a section, rule or check) with
 *  the checklist's own words beside it; a person accepts or returns each, then applies them to the draft. */
type ChecklistItem = { id: string; kind: string; decision: string; proposedMeaning: string; sourceQuote: string | null; payload: { document_type?: string; who?: string; base_or_conditional?: string; condition_plain?: string } | null };
type ChecklistJobView = { id: string; status: string; mode: string; costUsd: number | null; message: string | null; attachment?: { edition: string | null } | null; items: ChecklistItem[] };
function ChecklistJob({ job, combinationId }: { job: ChecklistJobView; combinationId: string }) {
  const nav = useNavigate();
  const items = job.items;
  const decide = useAction((v: { id: string; decision: string; note?: string }) => api(`/jobs/${job.id}/items/${v.id}`, { method: "POST", json: { decision: v.decision, note: v.note } }), { invalidate: [["job", job.id]] });
  const apply = useAction(() => api<{ added: number; skipped: string[] }>(`/jobs/${job.id}/apply-checklist`, { method: "POST" }), { success: (r) => `${r.added} document requirement${r.added === 1 ? "" : "s"} added to the draft${r.skipped.length ? `; not applied: ${r.skipped.length}` : ""}`, invalidate: [["job", job.id], ["combination"], ["draft"], ["catalogue"]], onDone: () => nav(`/c/${combinationId}`) });
  const pending = items.filter((i) => i.decision === "PENDING").length;
  const [back, setBack] = React.useState<string | null>(null), [note, setNote] = React.useState("");
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <nav className="flex items-center gap-1 text-xs text-text-muted"><Link to={`/c/${combinationId}`} className="hover:underline">Combination</Link><ChevronRight className="size-3" /><span>Checklist draft</span></nav>
      <div><h1 className="flex items-center gap-2 text-xl font-semibold"><Sparkles className="size-5 text-[#7c3aed]" /> {job.attachment?.edition ?? "Checklist"}: proposed document requirements</h1>
        <div className="mt-2 flex flex-wrap gap-1.5"><ModePill mode={job.mode} /><StatusPill status={job.status} /><Pill>US${Number(job.costUsd ?? 0).toFixed(2)}</Pill></div>
        <p className="mt-2 max-w-3xl text-sm text-text-muted">{job.message}</p></div>
      {!items.length ? <Notice title="Nothing proposed">The stub pass proves the path only; a live draft proposes each document requirement with the checklist's words beside it.</Notice> : (
        <ul className="space-y-3">{items.map((i) => { const p = i.payload ?? {}; return (
          <li key={i.id} className="rounded-xl border border-border bg-surface-raised p-4" data-checklist-item={i.kind}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><Pill tone="info">{i.kind.replace("_", " ")}</Pill> <b className="ml-1">{p.document_type ?? i.proposedMeaning}</b><p className="mt-1 text-sm">{p.who ? `For ${String(p.who).replace(/_/g, " ")}` : null}{p.base_or_conditional === "conditional" ? ` · when ${p.condition_plain}` : " · always"}</p></div>
              {i.decision !== "PENDING" ? <Pill tone={i.decision === "RETURNED" ? "warn" : "ok"}>{i.decision === "ACCEPTED" ? "Accepted" : "Returned"}</Pill> : job.status === "COMPLETED" ? <div className="flex gap-2"><Button size="sm" onClick={() => decide.mutate({ id: i.id, decision: "ACCEPTED" })}>Accept</Button><Button size="sm" variant="ghost" onClick={() => { setBack(back === i.id ? null : i.id); setNote(""); }}>Return</Button></div> : null}
            </div>
            {back === i.id ? <div className="mt-2 flex items-end gap-2"><Field label="Why it goes back" className="flex-1"><Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} /></Field><Button size="sm" variant="secondary" disabled={note.trim().length < 3} onClick={() => { decide.mutate({ id: i.id, decision: "RETURNED", note }); setBack(null); }}>Return it</Button></div> : null}
            {i.sourceQuote ? <blockquote className="mt-2 border-l-2 border-border pl-3 text-sm text-text-muted">"{i.sourceQuote}"</blockquote> : null}
          </li>); })}</ul>
      )}
      {job.status === "COMPLETED" && items.length ? <div className="flex items-center justify-end gap-3"><p className="text-sm text-text-muted">{pending ? `${pending} still to decide` : "Every proposal decided"}</p><Button disabled={!!pending} busy={apply.isPending} onClick={() => apply.mutate(undefined)}>Apply to the draft</Button></div> : null}
    </div>
  );
}
