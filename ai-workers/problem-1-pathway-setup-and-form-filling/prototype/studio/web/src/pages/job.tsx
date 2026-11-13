import * as React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CheckCheck, CornerUpLeft, GitMerge, Plus, Sparkles } from "lucide-react";
import { api, useAction, useApi } from "@/lib/api";
import { useWhere } from "@/components/frame";
import { Button, Dialog, Field, Input, Notice, Pill, Select, Stat, Textarea } from "@/components/ui/controls";
import { Spinner } from "@/components/ui/spinner";
import { ErrorState } from "@/components/ui/error-state";
import { ModePill, StatusPill } from "@/pages/combination";
import { cn } from "@/lib/utils";
import type { FormFieldsView } from "../../../contracts/screen02";
import { OwnQuestions } from "@/components/own-questions";

export const PERSON: Record<string, string> = { form_subject: "the form's subject", subject_spouse_or_partner: "the subject's spouse or partner", subject_parent_1: "the subject's first parent", subject_parent_2: "the subject's second parent", subject_child: "the subject's child", subject_sibling: "the subject's sibling", representative: "the representative", none: "the application" };
/** DV-d1-3 (QA-94): a role's system key written inside stored prose ("holding the role subject_spouse_or_partner") is
 *  shown in plain words ("holding the role of the subject's spouse or partner"); the stored text stays as it is. */
export const roleKeysInWords = (text: string) => text
  .replace(/\brole (form_subject|subject_[a-z0-9_]+)\b/g, (_, k: string) => `role of ${PERSON[k] ?? k.replace(/_/g, " ")}`)
  .replace(/\b(form_subject|subject_[a-z0-9_]+)\b/g, (k: string) => PERSON[k] ?? k.replace(/_/g, " "));
const OUTCOME: Record<string, [string, string]> = { REUSE: ["ok", "Reuse existing"], NEW: ["info", "New definition"], AMBIGUOUS: ["warn", "Ambiguous"], CONFLICT: ["danger", "Conflict"] };
/** What the bulk accept leaves for a person (C3.2, P-121): every waiting proposal but the High exact reuse matches. */
const needsOwn = (i: { outcome: string; decision: string; bulkWhy?: string | null }) => i.decision === "PENDING" && !(i.outcome === "REUSE" && !i.bulkWhy);
/** C3.2: what the form-field page's bulk accept answers (api/src/sources.ts acceptClean). */
type CleanResult = { accepted: number; batchId: string | null; undoSeconds: number; left: { id: string; key: string; why: string }[] };
const FILTERS = [["decide", "Needs a decision"], ["new", "New"], ["reuse", "Reuse"], ["decided", "Decided"], ["all", "All"]] as const;

/** QA-75: what a step of AI work did, in words, by its kind (a rules step is never called an AI field map). */
const STEP_NAME: Record<string, string> = { field_map: "AI-proposed field map", read_form: "Rules read the form's fields", checklist_draft: "proposed document requirements" };
/** QA-75: the form a step worked on, by its edition or file; null when no form is linked. */
const formName = (a: { edition?: string | null; fileName?: string | null } | null | undefined) => a?.edition?.trim() || a?.fileName?.trim() || null;
/** QA-75 (break m2): a step with no name of its own says whether AI or rules did it. */
const stepNameOf = (kind: string, mode: string) => STEP_NAME[kind] ?? (mode === "LOCAL" ? "A rules step" : "A step of AI work");
/** QA-75: the trail "<combination> › Forms › <step>", never the retired "Sources and forms". */
export function JobTrail({ id, combination, here }: { id: string; combination?: { id?: string; label: string } | null; here: string }) {
  // QA-75 (break m1, m3): the trail follows the job's own combination, not the address; a step of no combination goes back to AI work.
  // BK-3: shown on the frame's one "where am I" line.
  const cid = combination?.id ?? id;
  useWhere(!combination ? [{ label: "History" }, { label: "AI work", to: "/ai" }, { label: here }] : [{ label: combination.label, to: `/c/${cid}` }, { label: "Forms", to: `/c/${cid}/forms` }, { label: here }]);
  return null;
}

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
  // C3.2 (P-121): only High exact reuse matches are accepted together, and one Undo takes the whole batch back.
  const [batch, setBatch] = React.useState<{ id: string; n: number; seconds: number } | null>(null);
  React.useEffect(() => { if (!batch) return; const t = window.setTimeout(() => setBatch(null), batch.seconds * 1000); return () => window.clearTimeout(t); }, [batch]);
  const clean = useAction<void, CleanResult>(() => api(`/jobs/${jobId}/accept-clean`, { method: "POST", json: { outcome: "REUSE" } }), { success: (r) => `${r.accepted} High exact reuse match${r.accepted === 1 ? "" : "es"} accepted${r.left.length ? `; ${r.left.length} left to decide one by one` : ""}`, invalidate: [["job", jobId]], onDone: (r) => setBatch(r.batchId ? { id: r.batchId, n: r.accepted, seconds: r.undoSeconds } : null) });
  const undoBatch = useAction<void, { undone: number }>(() => api(`/review/proposals/undo/${batch?.id}`, { method: "POST" }), { success: (r) => `Undone: ${r.undone} proposal${r.undone === 1 ? "" : "s"} undecided again`, invalidate: [["job", jobId]], onDone: () => setBatch(null) });
  if (j.isLoading) return <Spinner label="Loading the AI draft" />;
  if (j.isError) return <ErrorState title="This step could not be opened" description={(j.error as Error).message} />;
  const job = j.data;
  if (job.kind === "checklist_draft") return <ChecklistJob job={job} combinationId={id!} />;
  const items = job.items as any[];
  const isMap = job.kind === "field_map", stepName = stepNameOf(job.kind, job.mode), form = formName(job.attachment);
  const cid: string = job.combination?.id ?? id!; // QA-75 (break m1): links follow the job's combination
  const c = job.detail?.counts;
  const pending = items.filter((i) => i.decision === "PENDING");
  const highReuse = pending.filter((i) => i.outcome === "REUSE" && !i.bulkWhy), lowReuse = pending.filter((i) => i.outcome === "REUSE" && i.bulkWhy);
  const shown = items.filter((i) => filter === "all" ? true : filter === "decided" ? i.decision !== "PENDING" : filter === "decide" ? needsOwn(i) : filter === "new" ? i.outcome === "NEW" : i.outcome === "REUSE");
  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-24">
      <JobTrail id={cid} combination={job.combination} here={isMap ? "AI field-map draft" : stepName} />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">{isMap ? <Sparkles className="size-5 shrink-0 text-[#7c3aed]" aria-hidden /> : null} {form ? `${form}: ${stepName}` : stepName}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-1.5"><ModePill mode={job.mode} /><StatusPill status={job.status} />{job.costUsd !== null && job.costUsd !== undefined ? <Pill>US${Number(job.costUsd).toFixed(2)}</Pill> : null}<Pill>{job.elapsed_s}s</Pill></div>
          {form ? null : <p className="mt-1 text-sm text-text-muted">No form is linked to this step.</p>}
          {isMap ? <p className="mt-2 max-w-3xl text-xs text-text-muted">{job.mode === "REPLAY" ? "Saved: no model was called now. " : job.mode === "LOCAL" ? "No AI was called for this step." : ""}{job.mode !== "LOCAL" ? "The AI sees only the public list of the form's fields; it never sees the library, a family or an answer key." : ""}{items.length ? " Rules, not AI, compare each proposal with the library below." : ""}</p>
            : <p className="mt-2 max-w-3xl text-xs text-text-muted">{job.mode === "LOCAL" ? "Rules did this step; no AI was called." : "A step of AI work."}</p>}
        </div>
      </div>
      {/* QA-75 (break M1): no step codes or exit numbers; a rules step is never "the AI"; a queued step has no spinner. */}
      {job.status === "RUNNING" || job.status === "QUEUED" ? <Notice tone={job.mode === "LOCAL" ? "info" : "ai"} title={job.status === "QUEUED" ? "Waiting to start" : job.mode === "LOCAL" ? "The rules are working" : "The AI is drafting"} action={job.status === "RUNNING" ? <Spinner label="Running" /> : undefined}>{job.message && !/^(Running|Queued)$/i.test(job.message) ? `${job.message} ` : ""}This page updates by itself.</Notice> : null}
      {["WAITING", "SKIPPED", "CANCELLED", "PARTIAL"].includes(job.status) && job.message ? <p className="text-sm text-text-muted" data-step-message>{job.message}</p> : null}
      {job.status === "NEEDS_PERSON" ? <Notice tone="warn" title="Waiting for you" action={<Button size="sm" variant="secondary" asChild><Link to={job.batchId ? `/ai/${job.batchId}` : `/c/${cid}/forms`}>{job.batchId ? "Open the AI work" : "Open the Forms tab"}</Link></Button>}>{job.message ?? "This step stopped for a person to choose."}</Notice> : null}
      {job.status === "BLOCKED" || job.status === "FAILED" ? <Notice tone={job.status === "BLOCKED" ? "warn" : "danger"} title={job.status === "BLOCKED" ? "Blocked: nothing was drafted" : isMap ? "The draft failed" : "This step failed"} action={<Button size="sm" variant="secondary" asChild><Link to={`/c/${cid}/forms`}>Open the Forms tab</Link></Button>}>{job.message}</Notice> : null}
      {isMap && job.status === "COMPLETED" ? <Notice tone="info" title="Compared with the library as it was when the draft was read" action={<Button size="sm" variant="secondary" onClick={() => recompare.mutate(undefined)} busy={recompare.isPending}>Compare again (no AI call)</Button>}>{job.detail?.library_revision ? `The library then had ${job.detail.library_revision.fields} shared field versions. ` : ""}If the shared library changes before you apply, applying is refused as stale; comparing again keeps every decision that still holds and reopens the rest.{job.detail?.recompared ? ` Last compared again by ${job.detail.recompared.by}: ${job.detail.recompared.kept} kept, ${job.detail.recompared.reopened} reopened.` : ""}</Notice> : null}
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
              {batch ? <Button variant="secondary" onClick={() => undoBatch.mutate(undefined)} busy={undoBatch.isPending}><CornerUpLeft /> Undo the {batch.n} accepted together</Button> : null}
              <Button variant="secondary" onClick={() => clean.mutate(undefined)} busy={clean.isPending} disabled={!highReuse.length} title={highReuse.length ? "Accepts every High exact reuse match (both AI rounds agree and the rules pass); each is checked again, and one Undo takes them all back." : lowReuse.length ? `None can be accepted together: ${lowReuse[0].bulkWhy}` : "No exact reuse match is waiting."}><CheckCheck /> Accept High exact reuse ({highReuse.length})</Button>
            </div> : null}
          </div>
          <p className="text-xs text-text-muted" data-keys>Keys: <kbd className="rounded border border-border px-1">J</kbd> / <kbd className="rounded border border-border px-1">K</kbd> next and previous proposal · <kbd className="rounded border border-border px-1">A</kbd> accept · <kbd className="rounded border border-border px-1">N</kbd> name it as a new shared field.</p>
          <div className="space-y-3">{shown.map((i) => <ItemCard key={i.id} item={i} jobId={jobId!} locked={job.status !== "COMPLETED"} />)}{!shown.length ? <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-text-muted">Nothing in this view.</p> : null}</div>
        </>
      ) : null}
      {isMap && (job.status === "COMPLETED" || job.status === "APPLIED") ? (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface-raised/95 px-6 py-3 backdrop-blur md:left-56">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <p className="text-sm">{job.status === "APPLIED" ? "Applied to the draft. Next: preview the effect, then submit for review." : pending.length ? <><b>{pending.length}</b> proposal{pending.length > 1 ? "s" : ""} still to decide. Every proposal needs a decision before it reaches the draft.</> : !items.length ? "Nothing was proposed, so there is nothing to apply." : "All proposals decided. Apply them to the combination's draft configuration."}</p>
            {job.status === "APPLIED" ? <Button onClick={() => nav(`/c/${id}/preview`)}>Preview the draft</Button> : <Button disabled={!!pending.length || !items.length} onClick={() => setApplyOpen(true)}><GitMerge /> Apply to draft</Button>}
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

/** C3.1 (IRCC-F07, P-162): what the form field's own PDF box says, in words, beside the proposal; read from the form, never the AI. */
type BoxFormat = { maxLength: number | null; choices: { label: string; code: string }[] | null; datePattern: string | null } | null | undefined;
function boxFormatWords(f: BoxFormat): string | null {
  if (!f) return null;
  if (f.choices) { const c = f.choices.filter((x) => x.label || x.code); return `The form's own choices (${c.length}): ${c.slice(0, 4).map((x) => x.code && x.code !== x.label ? `${x.label} (${x.code})` : x.label).join(", ")}${c.length > 4 ? `, and ${c.length - 4} more` : ""}`; }
  if (f.datePattern) return `Date, written ${f.datePattern} (from the form)`;
  if (f.maxLength) return `Text, at most ${f.maxLength} characters (from the form)`;
  return null;
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
          {/* BK-22 (#1695 C1): Field map review flags a step the form filler cannot run, before the map is accepted. */}
          {item.stepsNotRun ? <p className="mt-1 text-xs font-medium text-text-warn" data-steps-not-run>{item.stepsNotRun}</p> : null}
        </div>
        {decided ? <div className="text-right text-xs"><Pill tone={item.decision === "RETURNED" ? "warn" : "ok"}>{item.decision === "ACCEPTED" ? "Accepted" : item.decision === "CHANGED" ? "Changed" : item.decision === "NEW" ? "New shared field" : "Returned"}</Pill>{item.decision === "NEW" && item.payload?.label ? <p className="mt-1 font-medium">"{item.payload.label}" · a second person approves it on To review</p> : null}<p className="mt-1">{item.decidedKey ? <>uses <code className="mono">{item.decidedKey}</code></> : item.decisionNote}</p><p className="text-text-muted">by {item.decidedBy}</p>{!locked ? <button className="mt-1 text-text-link underline" onClick={() => decide.mutate({ decision: "PENDING" })}>undo</button> : null}</div> : null}
      </div>
      <div className="mt-3 grid min-w-0 gap-3 lg:grid-cols-3 [&>*]:min-w-0">
        <div className="rounded-lg bg-surface p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">Whose value the form fields read ({item.boxes.length} form field{item.boxes.length > 1 ? "s" : ""})</p>
          <div className="mt-1 flex flex-wrap gap-1">{item.persons.map((p: string) => <Pill key={p} tone="info">{PERSON[p] ?? p}</Pill>)}</div>
          <ul className="mt-2 space-y-1 text-xs">{item.boxes.slice(0, 4).map((b: any) => <li key={b.data_path}><span className="font-medium">{b.caption || b.data_path.split(".").slice(-2).join(".")}</span> · {PERSON[b.person] ?? b.person}{b.row !== null ? ` · row ${b.row + 1}` : ""} · {b.confidence}{b.evidence ? <span className="block truncate text-text-muted" title={b.evidence}>"{b.evidence}"</span> : null}{boxFormatWords(b.format) ? <span className="block text-text-muted" data-box-format>{boxFormatWords(b.format)}</span> : null}</li>)}{item.boxes.length > 4 ? <li className="text-text-muted">and {item.boxes.length - 4} more</li> : null}</ul>
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
        <Field label="Form title" hint="Kept from the Form library when it holds this form; needed when the form is new to the library."><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Application for Temporary Resident Visa" /></Field>
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
        <Field label="Kind of value"><Select value={type} onChange={(e) => setType(e.target.value)}>{["text", "date", "yes_no", "code", "country", "number", "address", "phone", "email", "long_text", "multi_choice", "person_name", "period_history", "declaration"].map((t) => <option key={t}>{t}</option>)}</Select></Field>
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
  // C3.8 [IRCC-F08] (Devin on #691): a Background question left as "not a fact" (decided before the rule, or so drafted)
  // is listed again, so the error it raises on Review and release can be cleared here.
  const unanswered = (f: { outcome: string; background?: boolean }) => !!f.background && (f.outcome === "not_a_fact" || f.outcome === "never_filled");
  const open_ = q.data.fields.filter((f) => f.outcome === "unresolved" || unanswered(f));
  const decided = q.data.fields.filter((f) => !unanswered(f) && (f.outcome === "by_hand" || (f.outcome === "not_a_fact" && f.status === "DRAFT")));
  return (
    <>
    <section aria-labelledby="ff-decide" className="space-y-3 rounded-xl border border-border bg-surface-raised p-4" data-form-field-decisions>
      <div><h2 id="ff-decide" ref={heading} tabIndex={-1} className="font-semibold outline-none">Form fields with no decision ({open_.length})</h2>
        <p className="text-sm text-text-muted">Each form field is mapped to a shared field, marked "not a fact" (nothing is filled from case facts), or "filled by hand" with a reason. {open_.some((f) => !f.carried) ? "Release waits until every new one is decided." : open_.length ? "These come from an earlier release: decide them when you can." : "Every form field has a decision."}</p></div>
      <ul className="divide-y divide-border text-sm">{open_.slice(0, 50).map((f) => (
        <li key={f.dataPath} className="py-2" data-form-field={f.dataPath}>
          <div className="flex flex-wrap items-center justify-between gap-2"><span><b className="font-medium">{f.caption || f.dataPath}</b>{f.heading ? <span className="text-text-muted"> · {f.heading}</span> : null}{f.carried ? <Pill className="ml-2">Not decided yet (from an earlier release)</Pill> : null}{unanswered(f) ? <Pill className="ml-2">Marked "not a fact": decide again</Pill> : null}{f.reason ? <span className="block text-xs text-text-muted">{f.reason}</span> : null}</span>
            {readOnly ? null : <Button size="sm" variant="secondary" aria-expanded={open === f.dataPath} onClick={() => { setOpen(open === f.dataPath ? null : f.dataPath); setReason(""); setKind(f.background ? "by_hand" : "not_a_fact"); }}>Decide</Button>}</div>
          {open === f.dataPath ? (
            <div className="mt-2 grid gap-2 md:grid-cols-[auto_1fr_auto] md:items-end">
              {/* C3.8 [IRCC-F08]: a Background information question must be answered, so "Not a fact" is not offered. */}
              {f.background ? <p className="text-xs text-text-muted md:col-span-3" data-background-note>A Background information question: IRCC returns an application with one unanswered, so it is never "not a fact". Map it to a shared field, or say who fills it by hand.</p> : null}
              <Field label="Decision"><Select value={kind} onChange={(e) => setKind(e.target.value === "by_hand" || f.background ? "by_hand" : "not_a_fact")}>{f.background ? null : <option value="not_a_fact">Not a fact</option>}<option value="by_hand">Filled by hand</option></Select></Field>
              <Field label="Reason"><Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder={kind === "by_hand" ? "Who fills it and why" : "Signature, office use, a document…"} /></Field>
              <Button size="sm" busy={decide.isPending} onClick={() => decide.mutate(f.dataPath)}>Save</Button>
            </div>
          ) : null}
        </li>))}</ul>
      {open_.length > 50 ? <p className="text-xs text-text-muted">Showing 50 of {open_.length}.</p> : null}
      {decided.length ? <p className="text-xs text-text-muted">{decided.length} decided in this draft.</p> : null}
    </section>
    <OwnQuestions editionId={q.data.edition.id} />
    </>
  );
}

/** K2 (Screen 02 slice 3): a checklist draft. Each proposal is a document requirement, or a document type the library
 *  lacks, with the checklist's own words beside it. C2.6 (QA-157, P-149 one door): they are decided one by one on To
 *  review, never here; this page shows what the draft proposed and where each one stands. */
type ChecklistItem = { id: string; kind: string; decision: string; proposedMeaning: string; sourceQuote: string | null; status?: string; confidence?: string; payload: { document_type?: string; who?: string; base_or_conditional?: string; condition_plain?: string; name?: string; proves?: string } | null };
type ChecklistJobView = { id: string; status: string; mode: string; costUsd: number | null; message: string | null; attachment?: { edition: string | null; fileName?: string | null } | null; combination?: { id?: string; label: string } | null; items: ChecklistItem[]; detail?: { applied?: { added: number; skipped: string[] } } | null };
const STANDS: Record<string, { word: string; tone: "ok" | "warn" | "info" }> = { waiting: { word: "Waiting on To review", tone: "info" }, accepted: { word: "Accepted", tone: "ok" }, edited: { word: "Edited and accepted", tone: "ok" }, rejected: { word: "Rejected", tone: "warn" }, undone: { word: "Undone", tone: "info" } };
function ChecklistJob({ job, combinationId }: { job: ChecklistJobView; combinationId: string }) {
  const items = job.items;
  const waiting = items.filter((i) => (i.status ?? "waiting") === "waiting").length;
  const queue = `/review/proposals?group=${encodeURIComponent(`combination:${combinationId}`)}`;
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <JobTrail id={combinationId} combination={job.combination} here="Checklist draft" />
      <div><h1 className="flex items-center gap-2 text-xl font-semibold"><Sparkles className="size-5 shrink-0 text-[#7c3aed]" aria-hidden /> {formName(job.attachment) ? `${formName(job.attachment)}: proposed document requirements` : "Proposed document requirements"}</h1>
        <div className="mt-2 flex flex-wrap gap-1.5"><ModePill mode={job.mode} /><StatusPill status={job.status} /><Pill>US${Number(job.costUsd ?? 0).toFixed(2)}</Pill></div>
        <p className="mt-2 max-w-3xl text-sm text-text-muted">{job.message}</p></div>
      {items.length && job.status !== "APPLIED" ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface-raised p-4" data-checklist-queue>
          <p className="text-sm">{waiting ? `${waiting} of ${items.length} still wait. Each one is decided on To review, where accepting a line writes it to the draft and a new document type waits for a second person.` : "Every proposal is decided."}</p>
          {waiting ? <Link to={queue} className="text-sm font-medium text-text-link underline">Decide them on To review</Link> : <Link to={`/c/${combinationId}`} className="text-sm text-text-link underline">Back to the combination</Link>}
        </div>) : null}
      {!items.length ? <Notice title="Nothing proposed">{job.mode === "REPLAY" ? "Every line of the saved reading is already on this combination, or was left out by the rules (listed above)." : "The stub pass proves the path only; a live draft proposes each document requirement with the checklist's words beside it."}</Notice> : (
        <ul className="space-y-3">{items.map((i) => { const p = i.payload ?? {}; const st = STANDS[i.status ?? "waiting"] ?? STANDS.waiting; const type = i.kind === "document_type"; return (
          <li key={i.id} className="rounded-xl border border-border bg-surface-raised p-4" data-checklist-item={i.kind}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><Pill tone="info">{type ? "new document type" : "document line"}</Pill> <b className="ml-1">{type ? p.name : String(p.document_type ?? i.proposedMeaning).replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()).replace(/\bUs\b/, "US")}</b>
                <p className="mt-1 text-sm">{type ? p.proves : <>{p.who ? `For ${String(p.who).replace(/_/g, " ")}` : null}{i.confidence === "decide" ? " · the visa office decides: a person says when" : p.base_or_conditional === "conditional" ? ` · ${p.condition_plain}` : " · always"}</>}</p></div>
              <Pill tone={st.tone}>{st.word}</Pill>
            </div>
            {i.sourceQuote ? <blockquote className="mt-2 border-l-2 border-border pl-3 text-sm text-text-muted">"{i.sourceQuote}"</blockquote> : null}
          </li>); })}</ul>
      )}
      {job.status === "APPLIED" && job.detail?.applied ? (
        <section aria-labelledby="ck-applied-h" className="space-y-2 rounded-xl border border-border bg-surface-raised p-4" data-checklist-applied>
          <h2 id="ck-applied-h" className="text-base font-semibold">Applied: {job.detail.applied.added} document requirement{job.detail.applied.added === 1 ? "" : "s"} added to the draft</h2>
          {job.detail.applied.skipped.length ? <><p className="text-sm">Not applied ({job.detail.applied.skipped.length}), each with its reason. Add these on the combination by hand if they are needed:</p>
            <ul className="list-disc space-y-1 pl-5 text-sm" data-checklist-skipped>{job.detail.applied.skipped.map((s) => <li key={s}>{s}</li>)}</ul></> : <p className="text-sm text-text-muted">Every accepted line was added.</p>}
          <Link to={`/c/${combinationId}`} className="text-sm text-text-link underline">Back to the combination</Link>
        </section>
      ) : null}
    </div>
  );
}
