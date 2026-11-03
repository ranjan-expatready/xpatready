// C7.5 part 1 Review findings (runtime lane, M3-E; r5c BR-19, board frame 13; AG-11-69, -70, -71): the case officer's
// list of a case's findings, in the team's words (CRITICAL · MAJOR · MINOR · INFO; Rules · AI · Added by hand; Open →
// Acknowledged → Resolved, Waived for CRITICAL only, Dismissed). The rules cross-checks run on every read (US$0); a fixed
// fact resolves its finding by itself. Every move needs a reason. Findings warn; they never block "Ready to file"
// (P-71, P-168). The AI review (part 2) is replayed from its saved run; until then the chip says what runs today.
import * as React from "react";
import { Plus } from "lucide-react";
import { api, ApiError, useAction, useApi } from "@/lib/api";
import { Button, Dialog, Field, Input, Notice, Pill, Select, Textarea } from "@/components/ui/controls";
import { Skeleton } from "@/components/ui/skeleton";
import { Tip, TipProvider } from "@/components/status";
import { StandIn } from "@/components/stand-in";
import { SEVERITY, SOURCE_WORDS, STATE_WORDS, type Finding, type FindingSeverity, type Findings } from "../../../contracts/findings";
import { noRetryOnRefusal, type CasePerson } from "./questionnaire";

const SEV_TONE: Record<FindingSeverity, string> = { CRITICAL: "danger", MAJOR: "warn", MINOR: "neutral", INFO: "info" };
const STATE_TONE: Record<Finding["state"], string> = { open: "warn", acknowledged: "info", resolved: "ok", waived: "neutral", dismissed: "neutral" };
const SEV_ORDER = Object.fromEntries(SEVERITY.map((s, i) => [s, i])) as Record<FindingSeverity, number>;
const LIVE = new Set<Finding["state"]>(["open", "acknowledged"]);
const when = (at: string) => new Date(at).toLocaleString("en-CA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
/** "person.passport_expiry_date" → "Passport expiry date": the fact in words, never its key alone. */
const factWords = (key: string | null) => key ? (key.split(".").pop() ?? key).replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()) : null;
type Move = { f: Finding; to: "acknowledge" | "dismiss" | "waive" };
const MOVE_WORDS: Record<Move["to"], { title: string; button: string; done: string; hint: string }> = {
  acknowledge: { title: "Acknowledge this finding", button: "Acknowledge", done: "Finding acknowledged", hint: "Say what you checked. It stays listed as Acknowledged and resolves itself when its facts are fixed." },
  dismiss: { title: "Dismiss this finding", button: "Dismiss", done: "Finding dismissed", hint: "Say why it does not apply. It does not come back for the same facts; a changed fact is a new finding." },
  waive: { title: "Waive this CRITICAL finding", button: "Waive", done: "Finding waived", hint: "Only the representative of record waives a CRITICAL finding, with a written reason." },
};

/** The case's findings. Under the questionnaire view's query key, so an answer change re-runs the rules. */
export function FindingsPanel({ caseId, people }: { caseId: string; people: CasePerson[] }) {
  const q = useApi<Findings>(["runtime", "view", caseId, "findings"], `/runtime/cases/${caseId}/findings`, { retry: noRetryOnRefusal });
  const [all, setAll] = React.useState(false);
  const [move, setMove] = React.useState<Move | null>(null);
  const [adding, setAdding] = React.useState(false);
  const fs = [...(q.data?.findings ?? [])].sort((a, b) => Number(LIVE.has(b.state)) - Number(LIVE.has(a.state)) || SEV_ORDER[a.severity] - SEV_ORDER[b.severity]);
  const shown = all ? fs : fs.filter((f) => LIVE.has(f.state));
  const c = q.data?.counts;
  return (
    <section aria-labelledby="review-h" className="rounded-xl border border-border bg-surface-raised" data-findings>
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-4 py-3">
        <h2 id="review-h" className="text-base font-semibold">Review</h2>
        <StandIn id="SI-6" today="rules checks on every form (US$0); the AI review runs live on the Visitor visa forms only and is replayed elsewhere." later="other form families one at a time (team AG-11 AI Doers)." />
        <p className="min-w-0 flex-1 text-[13px] text-text-muted">Checks across the facts and forms. Findings warn: they never stop Ready to file.</p>
        <Button size="sm" variant="secondary" onClick={() => setAdding(true)}><Plus aria-hidden />Add finding</Button>
      </header>
      {q.isLoading ? <div className="p-4"><Skeleton className="h-16 w-full" /></div>
        : q.isError ? <div className="p-4"><Notice tone="danger" title="The findings could not be loaded">{(q.error as Error).message}</Notice></div>
        : <>
            <div className="flex flex-wrap items-center gap-2 px-4 pt-3 text-[13px] text-text-muted" aria-live="polite">
              <span data-findings-counts>{c!.open} open · {c!.acknowledged} acknowledged · {c!.resolved} resolved{c!.waived ? ` · ${c!.waived} waived` : ""}{c!.dismissed ? ` · ${c!.dismissed} dismissed` : ""}</span>
              <span className="flex-1" />
              {fs.length > shown.length || all ? <Button size="sm" variant="ghost" aria-pressed={all} onClick={() => setAll(!all)}>{all ? "Show open and acknowledged only" : `Show all ${fs.length}`}</Button> : null}
            </div>
            <p className="px-4 pt-1 text-[12px] text-text-muted">{q.data!.ai.words}</p>
            {!shown.length ? <p className="px-4 py-3 text-sm text-text-muted">{fs.length ? "Nothing open: every finding is resolved, waived or dismissed." : "No findings: the facts and forms agree so far."}</p>
              : <TipProvider><ul className="mt-2 divide-y divide-border border-t border-border">{shown.map((f) => <FindingRow key={f.id} f={f} onMove={(to) => setMove({ f, to })} />)}</ul></TipProvider>}
          </>}
      {move ? <MoveDialog caseId={caseId} move={move} close={() => setMove(null)} /> : null}
      {adding ? <AddDialog caseId={caseId} people={people} close={() => setAdding(false)} /> : null}
    </section>
  );
}

function FindingRow({ f, onMove }: { f: Finding; onMove: (to: Move["to"]) => void }) {
  const where = [f.person, f.form, factWords(f.field)].filter(Boolean).join(" · ");
  return (
    <li className="flex flex-wrap items-start gap-x-4 gap-y-2 px-4 py-3" data-finding={f.id} data-finding-state={f.state}>
      <div className="flex w-40 shrink-0 flex-wrap items-center gap-1.5">
        <Pill tone={SEV_TONE[f.severity]}>{f.severity}</Pill>
        {f.rule ? <Tip focusable tip={<>Rule: {f.rule}<br /><span className="text-text-muted">Severity Sample (the immigration expert confirms)</span></>}><span><Pill>{SOURCE_WORDS[f.source]}</Pill></span></Tip> : <Pill tone={f.source === "ai" ? "ai" : "neutral"}>{SOURCE_WORDS[f.source]}</Pill>}
        {f.replayed ? <Pill tone="ai">Replayed</Pill> : null}
      </div>
      <div className="min-w-0 flex-1 basis-80">
        <p className="text-sm [overflow-wrap:anywhere]">{f.quote}</p>
        <p className="mt-0.5 text-[12px] text-text-muted [overflow-wrap:anywhere]">{where}</p>
        {f.state === "resolved" && f.state_at ? <p className="mt-1 text-[12px] text-text-muted [overflow-wrap:anywhere]">Resolved {f.state_by === "rules" ? "by the rules when the fact was fixed" : `by ${f.state_by_name}`} on {when(f.state_at)}{f.state_reason ? <> (acknowledged earlier: “{f.state_reason}”)</> : null}</p>
          : f.state_reason && f.state_at ? <p className="mt-1 text-[12px] text-text-muted [overflow-wrap:anywhere]">{STATE_WORDS[f.state]} by {f.state_by_name} on {when(f.state_at)}: “{f.state_reason}”</p> : null}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Pill tone={STATE_TONE[f.state]}>{STATE_WORDS[f.state]}</Pill>
        {f.state === "open" ? <>
          <Button size="sm" variant="secondary" onClick={() => onMove("acknowledge")}>Acknowledge…</Button>
          {f.severity === "CRITICAL" ? <Button size="sm" variant="ghost" onClick={() => onMove("waive")}>Waive…</Button> : <Button size="sm" variant="ghost" onClick={() => onMove("dismiss")}>Dismiss…</Button>}
        </> : null}
      </div>
    </li>
  );
}

function MoveDialog({ caseId, move, close }: { caseId: string; move: Move; close: () => void }) {
  const w = MOVE_WORDS[move.to];
  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const act = useAction(() => api(`/runtime/findings/${move.f.id}/${move.to}`, { method: "POST", json: { reason } }), { success: w.done, invalidate: [["runtime", "view", caseId, "findings"]], onDone: close });
  const submit = () => act.mutate(undefined, { onError: (e) => setError(e instanceof ApiError ? e.field("reason") ?? e.message : e.message) });
  return (
    <Dialog open onOpenChange={(o) => { if (!o) close(); }} title={w.title} description={<>{move.f.severity} · {SOURCE_WORDS[move.f.source]} · “{move.f.quote}”</>}
      footer={<><Button variant="ghost" onClick={close}>Cancel</Button><Button busy={act.isPending} onClick={submit}>{w.button}</Button></>}>
      <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <Field label="Reason" hint={w.hint} error={error}><Textarea value={reason} maxLength={1000} autoFocus onChange={(e) => { setReason(e.target.value); setError(null); }} /></Field>
        <button type="submit" hidden />
      </form>
    </Dialog>
  );
}

function AddDialog({ caseId, people, close }: { caseId: string; people: CasePerson[]; close: () => void }) {
  const persons = people.filter((p) => p.role !== "case");
  const [f, setF] = React.useState<{ subject: string; severity: FindingSeverity; note: string; form: string }>({ subject: persons[0]?.subject_id ?? "", severity: "MINOR", note: "", form: "" });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const add = useAction(() => api(`/runtime/cases/${caseId}/findings`, { method: "POST", json: { subject: f.subject, severity: f.severity, note: f.note, form: f.form.trim() || null } }), { success: "Finding added", invalidate: [["runtime", "view", caseId, "findings"]], onDone: close });
  const submit = () => add.mutate(undefined, { onError: (e) => { const p = e instanceof ApiError ? e.problem.errors ?? [] : []; setErrors(p.length ? Object.fromEntries(p.map((x) => [x.field.split(".")[0], x.message])) : { note: e.message }); } });
  return (
    <Dialog open onOpenChange={(o) => { if (!o) close(); }} title="Add a finding by hand" description="For something the checks cannot see, such as a photo to retake. It is listed as Added by hand."
      footer={<><Button variant="ghost" onClick={close}>Cancel</Button><Button busy={add.isPending} onClick={submit}>Add finding</Button></>}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <Field label="About" error={errors.subject}><Select value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })}>{persons.map((p) => <option key={p.subject_id} value={p.subject_id}>{p.label}</option>)}</Select></Field>
        <Field label="Severity" hint="CRITICAL is waived only by the representative of record" error={errors.severity}><Select value={f.severity} onChange={(e) => setF({ ...f, severity: e.target.value as FindingSeverity })}>{SEVERITY.map((s) => <option key={s} value={s}>{s}</option>)}</Select></Field>
        <Field label="Finding" hint="What is wrong, in a sentence" error={errors.note}><Textarea value={f.note} maxLength={1000} autoFocus onChange={(e) => { setF({ ...f, note: e.target.value }); setErrors({}); }} /></Field>
        <Field label="Form (optional)" hint="For example IMM 5257" error={errors.form}><Input value={f.form} maxLength={40} onChange={(e) => setF({ ...f, form: e.target.value })} /></Field>
        <button type="submit" hidden />
      </form>
    </Dialog>
  );
}
