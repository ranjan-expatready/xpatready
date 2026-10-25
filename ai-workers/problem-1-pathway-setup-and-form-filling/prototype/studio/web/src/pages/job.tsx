import * as React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CheckCheck, ChevronRight, CornerUpLeft, GitMerge, Plus, Sparkles } from "lucide-react";
import { api, useAction, useApi } from "@/lib/api";
import { Button, Dialog, Field, Input, Notice, Pill, Select, Stat, Textarea } from "@/components/ui/controls";
import { Spinner } from "@/components/ui/spinner";
import { ErrorState } from "@/components/ui/error-state";
import { ModePill, StatusPill } from "@/pages/combination";
import { cn } from "@/lib/utils";

export const PERSON: Record<string, string> = { form_subject: "the form's subject", subject_spouse_or_partner: "the subject's spouse or partner", subject_parent_1: "the subject's first parent", subject_parent_2: "the subject's second parent", subject_child: "the subject's child", subject_sibling: "the subject's sibling", representative: "the representative", none: "the application" };
const OUTCOME: Record<string, [string, string]> = { REUSE: ["ok", "Reuse existing"], NEW: ["info", "New definition"], AMBIGUOUS: ["warn", "Ambiguous"], CONFLICT: ["danger", "Conflict"] };
const FILTERS = [["decide", "Needs a decision"], ["new", "New"], ["reuse", "Reuse"], ["decided", "Decided"], ["all", "All"]] as const;

export function JobPage() {
  const { id, jobId } = useParams();
  const nav = useNavigate();
  const j = useApi<any>(["job", jobId], `/jobs/${jobId}`, { refetchInterval: (q: any) => (q.state.data?.status === "RUNNING" || q.state.data?.status === "QUEUED" ? 3000 : false) });
  const [filter, setFilter] = React.useState<(typeof FILTERS)[number][0]>("decide");
  const [applyOpen, setApplyOpen] = React.useState(false);
  const recompare = useAction(() => api(`/jobs/${jobId}/recompare`, { method: "POST" }), { success: (r: any) => `Compared again with the current library (no AI call): ${r.detail?.recompared?.kept ?? 0} decisions kept, ${r.detail?.recompared?.reopened ?? 0} to decide again`, invalidate: [["job", jobId]] });
  const clean = useAction((outcome: "REUSE" | "NEW") => api(`/jobs/${jobId}/accept-clean`, { method: "POST", json: { outcome } }), { success: (r: any) => `${r.accepted} ${r.outcome === "REUSE" ? "exact reuse matches" : "new definitions"} accepted`, invalidate: [["job", jobId]] });
  if (j.isLoading) return <Spinner label="Loading the AI draft" />;
  if (j.isError) return <ErrorState title="This AI draft could not be opened" description={(j.error as Error).message} />;
  const job = j.data;
  const items = job.items as any[];
  const c = job.detail?.counts;
  const pending = items.filter((i) => i.decision === "PENDING");
  const shown = items.filter((i) => filter === "all" ? true : filter === "decided" ? i.decision !== "PENDING" : filter === "decide" ? ["AMBIGUOUS", "CONFLICT"].includes(i.outcome) && i.decision === "PENDING" : filter === "new" ? i.outcome === "NEW" : i.outcome === "REUSE");
  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-24">
      <nav className="flex items-center gap-1 text-xs text-text-muted"><Link to={`/c/${id}/sources`} className="hover:underline">Sources and forms</Link><ChevronRight className="size-3" /><span>AI field-map draft</span></nav>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold"><Sparkles className="size-5 text-[#7c3aed]" /> {job.attachment?.edition ?? "Form"}: AI-proposed field map</h1>
          <div className="mt-2 flex flex-wrap items-center gap-1.5"><ModePill mode={job.mode} /><StatusPill status={job.status} />{job.runId ? <Pill title="Run record">{job.runId}</Pill> : null}{job.costUsd !== null && job.costUsd !== undefined ? <Pill>US${Number(job.costUsd).toFixed(2)}</Pill> : null}<Pill>{job.elapsed_s}s</Pill></div>
          <p className="mt-2 max-w-3xl text-xs text-text-muted">{job.detail?.label ?? "AI-drafted under a prototype-only exception to the AI-processing rule; not the product's provider route"}. {job.mode === "REPLAY" ? "This is a replay of a saved real run: no model was called now." : ""} The AI saw only the public list of the form's fields; it never saw the library, a family or an answer key. The comparison with the library below is deterministic.</p>
        </div>
      </div>
      {job.status === "RUNNING" || job.status === "QUEUED" ? <Notice tone="ai" title="The AI is drafting" action={<Spinner label="Running" />}>{job.message} Steps so far: {(job.detail?.steps ?? []).map((s: any) => `${s.step} (exit ${s.exit})`).join(", ") || "starting"}. This page updates by itself.</Notice> : null}
      {job.status === "BLOCKED" || job.status === "FAILED" ? <Notice tone={job.status === "BLOCKED" ? "warn" : "danger"} title={job.status === "BLOCKED" ? "Blocked: nothing was drafted" : "The draft failed"} action={<Button size="sm" variant="secondary" asChild><Link to={`/c/${id}/sources`}>Back to sources</Link></Button>}>{job.message}</Notice> : null}
      {job.status === "COMPLETED" ? <Notice tone="info" title="Compared with the library as it was when the draft was read" action={<Button size="sm" variant="secondary" onClick={() => recompare.mutate(undefined)} busy={recompare.isPending}>Compare again (no AI call)</Button>}>{job.detail?.library_revision ? `Library revision ${String(job.detail.library_revision.sha256).slice(0, 10)} (${job.detail.library_revision.fields} definition rows). ` : ""}If the shared library changes before you apply, applying is refused as stale; comparing again keeps every decision that still holds and reopens the rest.{job.detail?.recompared ? ` Last compared again by ${job.detail.recompared.by}: ${job.detail.recompared.kept} kept, ${job.detail.recompared.reopened} reopened.` : ""}</Notice> : null}
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
            <div role="tablist" className="flex gap-1">{FILTERS.map(([k, l]) => { const n = k === "all" ? items.length : k === "decided" ? items.length - pending.length : k === "decide" ? items.filter((i) => ["AMBIGUOUS", "CONFLICT"].includes(i.outcome) && i.decision === "PENDING").length : items.filter((i) => i.outcome === (k === "new" ? "NEW" : "REUSE")).length; return <button key={k} role="tab" aria-selected={filter === k} onClick={() => setFilter(k)} className={cn("rounded-lg px-3 py-1.5 text-sm", filter === k ? "bg-primary/10 font-medium text-text-link" : "text-text-muted hover:bg-text/5")}>{l} <span className="text-xs">({n})</span></button>; })}</div>
            {job.status === "COMPLETED" ? <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => clean.mutate("REUSE")} busy={clean.isPending && clean.variables === "REUSE"} disabled={!items.some((i) => i.outcome === "REUSE" && i.decision === "PENDING")}><CheckCheck /> Accept exact reuse ({items.filter((i) => i.outcome === "REUSE" && i.decision === "PENDING").length})</Button>
              <Button variant="secondary" onClick={() => clean.mutate("NEW")} busy={clean.isPending && clean.variables === "NEW"} disabled={!items.some((i) => i.outcome === "NEW" && i.decision === "PENDING" && !i.candidates.some((c: any) => c.score >= 0.55))} title="New definitions with no similar library field; anything close to an existing field needs its own decision"><CheckCheck /> Accept clean new definitions ({items.filter((i) => i.outcome === "NEW" && i.decision === "PENDING" && !i.candidates.some((c: any) => c.score >= 0.55)).length})</Button>
            </div> : null}
          </div>
          <div className="space-y-3">{shown.map((i) => <ItemCard key={i.id} item={i} jobId={jobId!} locked={job.status !== "COMPLETED"} />)}{!shown.length ? <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-text-muted">Nothing in this view.</p> : null}</div>
        </>
      ) : null}
      {job.status === "COMPLETED" || job.status === "APPLIED" ? (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface-raised/95 px-6 py-3 backdrop-blur md:left-56">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <p className="text-sm">{job.status === "APPLIED" ? "Applied to the draft. Next: preview the effect, then submit for review." : pending.length ? <><b>{pending.length}</b> proposal{pending.length > 1 ? "s" : ""} still to decide. Every proposal needs a decision before it reaches the draft.</> : "All proposals decided. Apply them to the combination's draft configuration."}</p>
            {job.status === "APPLIED" ? <Button onClick={() => nav(`/c/${id}/preview?view=studio`)}>Preview the draft</Button> : <Button disabled={!!pending.length} onClick={() => setApplyOpen(true)}><GitMerge /> Apply to draft</Button>}
          </div>
        </div>
      ) : null}
      {applyOpen ? <ApplyDialog job={job} onClose={() => setApplyOpen(false)} onDone={() => nav(`/c/${id}/preview?view=studio`)} /> : null}
    </div>
  );
}

function ItemCard({ item, jobId, locked }: { item: any; jobId: string; locked: boolean }) {
  const [mode, setMode] = React.useState<null | "other" | "new" | "return">(null);
  const [key, setKey] = React.useState(item.candidates?.[0]?.key ?? item.proposedKey), [meaning, setMeaning] = React.useState(item.proposedMeaning), [type, setType] = React.useState(item.proposedType), [note, setNote] = React.useState("");
  const decide = useAction((b: any) => api(`/jobs/${jobId}/items/${item.id}`, { method: "POST", json: b }), { invalidate: [["job", jobId]], onDone: () => setMode(null) });
  const [tone, label] = OUTCOME[item.outcome];
  const rec = item.evidence?.recommendation;
  const dep = (k: string) => item.affected?.[k];
  const decided = item.decision !== "PENDING";
  return (
    <article className={cn("rounded-xl border bg-surface-raised p-4 shadow-sm", decided ? "border-border opacity-90" : item.outcome === "CONFLICT" ? "border-danger/40" : item.outcome === "AMBIGUOUS" ? "border-warn/50" : "border-border")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><Pill tone={tone}>{label}</Pill><code className="mono font-semibold">{item.proposedKey}</code><Pill>{item.proposedType}</Pill>{item.matchedKey && item.matchedKey !== item.proposedKey ? <span className="text-xs text-text-muted">closest: <code className="mono">{item.matchedKey}</code></span> : null}</div>
          <p className="mt-1 text-sm">{item.proposedMeaning}</p>
          <p className="mt-1 text-xs text-text-muted">{item.reason}</p>
          {!decided && item.decisionNote ? <p className="mt-1 text-xs font-medium text-text-warn">{item.decisionNote}</p> : null}
        </div>
        {decided ? <div className="text-right text-xs"><Pill tone={item.decision === "RETURNED" ? "warn" : "ok"}>{item.decision === "ACCEPTED" ? "Accepted" : item.decision === "CHANGED" ? "Changed" : "Returned"}</Pill><p className="mt-1">{item.decidedKey ? <>uses <code className="mono">{item.decidedKey}</code></> : item.decisionNote}</p><p className="text-text-muted">by {item.decidedBy}</p>{!locked ? <button className="mt-1 text-text-link underline" onClick={() => decide.mutate({ decision: "PENDING" })}>undo</button> : null}</div> : null}
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-3">
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
          <Button size="sm" onClick={() => decide.mutate({ decision: "ACCEPTED" })} busy={decide.isPending && !mode}>{rec?.action === "reuse" ? <GitMerge /> : <Plus />} {rec?.text ?? "Accept"}</Button>
          <Button size="sm" variant="secondary" onClick={() => setMode(mode === "other" ? null : "other")}>Use another library field</Button>
          {rec?.action !== "create_new" ? <Button size="sm" variant="secondary" onClick={() => setMode(mode === "new" ? null : "new")}>Create a new definition</Button> : <Button size="sm" variant="secondary" onClick={() => setMode(mode === "new" ? null : "new")}>Edit before creating</Button>}
          <Button size="sm" variant="ghost" onClick={() => setMode(mode === "return" ? null : "return")}><CornerUpLeft /> Return</Button>
        </div>
      ) : null}
      {mode === "other" ? <div className="mt-3 flex flex-wrap items-end gap-2"><Field label="Library field key" className="w-96"><Input className="mono" value={key} onChange={(e) => setKey(e.target.value)} list={`c-${item.id}`} /></Field><datalist id={`c-${item.id}`}>{item.candidates.map((cd: any) => <option key={cd.key} value={cd.key}>{cd.meaning}</option>)}</datalist><Button size="sm" onClick={() => decide.mutate({ decision: "CHANGED", key })} busy={decide.isPending}>Use this field</Button></div> : null}
      {mode === "new" ? <div className="mt-3 grid gap-2 md:grid-cols-[1fr_2fr_auto_auto] md:items-end"><Field label="New key"><Input className="mono" value={key === item.candidates?.[0]?.key ? item.proposedKey : key} onChange={(e) => setKey(e.target.value)} /></Field><Field label="Meaning"><Input value={meaning} onChange={(e) => setMeaning(e.target.value)} /></Field><Field label="Type"><Select value={type} onChange={(e) => setType(e.target.value)}>{["text", "date", "yes_no", "code", "country", "number", "address", "phone", "email"].map((t) => <option key={t}>{t}</option>)}</Select></Field><Button size="sm" onClick={() => decide.mutate({ decision: "CHANGED", key: key === item.candidates?.[0]?.key ? item.proposedKey : key, meaning, valueType: type })} busy={decide.isPending}>Create</Button></div> : null}
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
