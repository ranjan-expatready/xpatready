// C7.5 part 1 Review findings (runtime lane, M3-E; r5c BR-19, board frame 13; AG-11-69, -70, -71): the case officer's
// list of a case's findings, in the team's words (CRITICAL · MAJOR · MINOR · INFO; Rules · AI · Added by hand; Open →
// Acknowledged → Resolved, Waived for CRITICAL only, Dismissed). The rules cross-checks run on every read (US$0); a fixed
// fact resolves its finding by itself. Every move needs a reason. Findings warn; they never block "Ready to file"
// (P-71, P-168). The AI review (part 2) is replayed from its saved run; until then the chip says what runs today.
import * as React from "react";
import { Link } from "react-router-dom";
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
/** The fact in the case's own question words; its key in words only when the case no longer asks it. */
const factWords = (f: Finding) => f.fact_label ?? (f.field ? (f.field.split(".").pop() ?? f.field).replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()) : null);
type Move = { f: Finding; to: "acknowledge" | "dismiss" | "waive" };
const MOVE_WORDS: Record<Move["to"], { title: string; button: string; done: string; hint: string }> = {
  acknowledge: { title: "Acknowledge this finding", button: "Acknowledge", done: "Finding acknowledged", hint: "Say what you checked. It stays listed as Acknowledged and resolves itself when its facts are fixed." },
  dismiss: { title: "Dismiss this finding", button: "Dismiss", done: "Finding dismissed", hint: "Say why it does not apply. It does not come back for the same facts; a changed fact is a new finding." },
  waive: { title: "Waive this CRITICAL finding", button: "Waive", done: "Finding waived", hint: "As the representative of record, say why it may go ahead. It resolves itself when its facts are fixed." },
};

/** The case's findings. Under the questionnaire view's query key, so an answer change re-runs the rules. On the case page
 *  (`openLink`): per person, with a link to the Review page. On the Review page (`filings`, C7.5 part 2, BR-19): per
 *  filing, then person; a finding read before Prepare made the filings is listed under "Not on a filing yet". */
export function FindingsPanel({ caseId, people, filings, title = "Review", openLink, onShow, shownId }: { caseId: string; people: CasePerson[]; filings?: { id: string; label: string }[]; title?: string; openLink?: string;
  /** The Review page's "Show on the form" (Source + proposals): the AI finding whose quoted line the source panel highlights. */
  onShow?: (f: Finding) => void; shownId?: string | null }) {
  const q = useApi<Findings>(["runtime", "view", caseId, "findings"], `/runtime/cases/${caseId}/findings`, { retry: noRetryOnRefusal });
  const [all, setAll] = React.useState(false);
  const [move, setMove] = React.useState<Move | null>(null);
  const [adding, setAdding] = React.useState(false);
  // Breaker m6: a closed dialog gives focus back to the button that opened it (or the panel's heading when that row moved).
  const back = React.useRef<HTMLElement | null>(null);
  const done = () => { setMove(null); setAdding(false); requestAnimationFrame(() => { const el = back.current; (el?.isConnected ? el : document.getElementById("review-h"))?.focus(); }); };
  // Reviewer M1, M3 (concept BR-19: findings per filing and person): one group per person in the case's order (the
  // application's own facts first); in a group, open and acknowledged first, then by severity, then oldest: never random.
  // C7.5 part 2 (BIC-06): an AI finding the two rounds did not agree on (Low) needs a person's look first.
  const fs = [...(q.data?.findings ?? [])].sort((a, b) => Number(LIVE.has(b.state)) - Number(LIVE.has(a.state)) || Number(b.agreement === "low") - Number(a.agreement === "low") || SEV_ORDER[a.severity] - SEV_ORDER[b.severity]
    || a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
  const shown = all ? fs : fs.filter((f) => LIVE.has(f.state));
  const byPerson = (rows: Finding[]) => people.map((p) => ({ p, rows: rows.filter((f) => f.subject === p.subject_id) })).filter((g) => g.rows.length);
  const groups = byPerson(shown);
  const known = new Set((filings ?? []).map((x) => x.id));
  const byFiling = filings ? [...filings.map((x) => ({ key: x.id, label: x.label, rows: shown.filter((f) => f.filing === x.id) })), { key: "none", label: "Not on a filing yet", rows: shown.filter((f) => !f.filing || !known.has(f.filing)) }].filter((g) => g.rows.length) : null;
  const personGroups = (gs: ReturnType<typeof byPerson>, level: "h3" | "h4") => gs.map(({ p, rows }) => {
    const H = level;
    return (
      <section key={p.subject_id} aria-labelledby={`review-${level}-${rows[0].id}`} data-findings-person={p.label}>
        <H id={`review-${level}-${rows[0].id}`} className="border-b border-border bg-surface px-4 py-2 text-[13px] font-semibold [overflow-wrap:anywhere]">{p.label}<span className="ml-2 font-normal text-text-muted">{p.role === "case" ? "the application's own facts, on the principal's filing" : `${rows.length} finding${rows.length === 1 ? "" : "s"}`}</span></H>
        <ul>{rows.map((f) => <FindingRow key={f.id} f={f} mayWaive={q.data!.may_waive} onMove={(to, from) => { back.current = from; setMove({ f, to }); }} onShow={onShow} shown={shownId === f.id} />)}</ul>
      </section>);
  });
  const c = q.data?.counts;
  return (
    <section aria-labelledby="review-h" className="rounded-xl border border-border bg-surface-raised" data-findings>
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-4 py-3">
        <h2 id="review-h" tabIndex={-1} className="text-base font-semibold outline-none">{title}</h2>
        <StandIn id="SI-6" today="rules checks on every form (US$0); the AI review runs live on the Visitor visa forms only and is replayed elsewhere." later="other form families one at a time (team AG-11 AI Doers)." />
        <p className="min-w-0 flex-1 text-[13px] text-text-muted">Checks across the facts and forms. Each finding is a warning: decide it here, or pass it with a reason on Ready to file.</p>
        {openLink ? <Link to={openLink} className="text-[13px] font-medium text-text-link hover:underline" data-open-review>Open Review</Link> : null}
        <Button size="sm" variant="secondary" onClick={(e) => { back.current = e.currentTarget; setAdding(true); }}><Plus aria-hidden />Add finding</Button>
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
              : <TipProvider><div className="mt-2 border-t border-border">{byFiling ? byFiling.map((g) => (
                  <section key={g.key} aria-labelledby={`review-filing-${g.key}`} data-findings-filing={g.label}>
                    <h3 id={`review-filing-${g.key}`} className="border-b border-border px-4 py-2 text-sm font-semibold [overflow-wrap:anywhere]">{g.label}<span className="ml-2 font-normal text-text-muted">{g.rows.length} finding{g.rows.length === 1 ? "" : "s"}</span></h3>
                    {personGroups(byPerson(g.rows), "h4")}
                  </section>)) : personGroups(groups, "h3")}</div></TipProvider>}
          </>}
      {move ? <MoveDialog caseId={caseId} move={move} close={done} /> : null}
      {adding ? <AddDialog caseId={caseId} people={people} close={done} /> : null}
    </section>
  );
}

function FindingRow({ f, mayWaive, onMove, onShow, shown }: { f: Finding; mayWaive: boolean; onMove: (to: Move["to"], from: HTMLElement) => void; onShow?: (f: Finding) => void; shown?: boolean }) {
  const where = [f.form, factWords(f)].filter(Boolean).join(" · ");
  return (
    <li className={`flex flex-wrap items-start gap-x-4 gap-y-2 border-b border-border px-4 py-3 last:border-b-0${shown ? " bg-warn/10" : ""}`} data-finding={f.id} data-finding-state={f.state} data-finding-shown={shown ? "true" : undefined}>
      <div className="flex w-40 shrink-0 flex-wrap items-center gap-1.5">
        <Pill tone={SEV_TONE[f.severity]}>{f.severity}</Pill>
        {f.rule ? <Tip focusable tip={<>Rule (Sample): {f.rule}<br /><span className="text-text-muted">The rule and its severity are Sample until the immigration expert confirms them</span></>}><span><Pill>{SOURCE_WORDS[f.source]}</Pill></span></Tip> : <Pill tone={f.source === "ai" ? "ai" : "neutral"}>{SOURCE_WORDS[f.source]}</Pill>}
        {f.replayed ? <Pill tone="ai">Replayed</Pill> : null}
        {f.agreement === "high" ? <Tip focusable tip="Both AI rounds raised it with the same severity, and the rules found its quote on the form"><span><Pill tone="ok">High</Pill></span></Tip>
          : f.agreement === "low" ? <Tip focusable tip="The two AI rounds did not agree: a person decides, with both rounds' reasons"><span><Pill tone="warn">Low</Pill></span></Tip> : null}
      </div>
      <div className="min-w-0 flex-1 basis-80">
        {f.source === "ai" ? <>
          <p className="text-sm">{f.agreement === "low" ? "The two AI rounds disagree; a person decides:" : "Both AI rounds raised it, and the rules found its quote:"}</p>
          <ul className="mt-0.5 list-disc pl-5 text-sm" data-finding-reasons>{f.reasons.map((x, i) => <li key={i} className="[overflow-wrap:anywhere]">{x}</li>)}</ul>
          <p className="mt-0.5 text-[13px] [overflow-wrap:anywhere]" data-finding-quote>The form says “{f.quote}”{onShow && f.form ? <Button size="sm" variant="ghost" className="ml-1 h-6 px-1.5" aria-pressed={!!shown} onClick={() => onShow(f)}>Show on the form</Button> : null}</p>
        </> : <p className="text-sm [overflow-wrap:anywhere]">{f.quote}</p>}
        <p className="mt-0.5 text-[12px] text-text-muted [overflow-wrap:anywhere]">{where || "\u00a0"}</p>
        {f.state_reason && f.state_at ? <p className="mt-1 text-[12px] text-text-muted [overflow-wrap:anywhere]">{STATE_WORDS[f.state === "resolved" ? (f.severity === "CRITICAL" ? "waived" : "acknowledged") : f.state]} by {f.state_by_name} on {when(f.state_at)}: “{f.state_reason}”</p> : null}
        {f.state === "resolved" && f.resolved_at ? <p className="mt-1 text-[12px] text-text-muted">Resolved by {f.resolved_by_name} on {when(f.resolved_at)}{f.resolved_by === "rules" ? ": the facts it quoted changed" : ""}</p> : null}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Pill tone={STATE_TONE[f.state]}>{STATE_WORDS[f.state]}</Pill>
        {f.state !== "open" ? null
          : f.severity !== "CRITICAL" ? <>
            <Button size="sm" variant="secondary" onClick={(e) => onMove("acknowledge", e.currentTarget)}>Acknowledge…</Button>
            <Button size="sm" variant="ghost" onClick={(e) => onMove("dismiss", e.currentTarget)}>Dismiss…</Button>
          </>
          : mayWaive ? <Button size="sm" variant="secondary" onClick={(e) => onMove("waive", e.currentTarget)}>Waive…</Button>
          : <span className="text-[12px] text-text-muted">Only the representative of record waives it</span>}
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
  const key = React.useMemo(() => crypto.randomUUID(), []); // reviewer M2: one finding per dialog, however often Add is pressed
  const add = useAction(() => api(`/runtime/cases/${caseId}/findings`, { method: "POST", json: { subject: f.subject, severity: f.severity, note: f.note, form: f.form.trim() || null, idempotencyKey: key } }), { success: "Finding added", invalidate: [["runtime", "view", caseId, "findings"]], onDone: close });
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
