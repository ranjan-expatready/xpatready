// C7.5 part 2 The Review page (runtime lane, M3-E; r5c BR-19, board frame 13; screens/C7.5/concept-part2.md; P-110, P-121,
// P-141, P-164 (2), P-227, P-71, P-168): /cases/:id/review. The run card first (cost first: Saved US$0.00 or why none
// exists, Live with its usual and worst cost or why it is not allowed; the SI-6 stand-in; the steps), then the case's
// findings per filing, then person, with each AI finding's agreement (High, or Low with both rounds' reasons) and the
// words it quotes from the form. Findings warn; none blocks Ready to file. Staff only.
import * as React from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Check, Circle, Loader2, Square } from "lucide-react";
import { api, ApiError, useAction, useActorId, useApi } from "@/lib/api";
import { Button, Field, Notice, Pill, Select } from "@/components/ui/controls";
import { Skeleton } from "@/components/ui/skeleton";
import { StandIn } from "@/components/stand-in";
import { cn } from "@/lib/utils";
import type { CaseForm } from "../../../contracts/runtime";
import type { ReviewRunPlan, ReviewRunResult } from "../../../api/src/review-run-shapes";
import { FindingsPanel } from "./findings";
import { noRetryOnRefusal, useCaseView, type CasePerson } from "./questionnaire";

/** The firm's staff (the simulated people of cases.tsx); a client never sees the review. */
const STAFF = new Set(["user-O", "user-R", "user-T", "user-S"]);
const isOfficer = (id: string) => STAFF.has(id);
const usd = (n: number) => `US$${n.toFixed(2)}`;
type Filing = { id: string; label: string };
type Phase = "idle" | "running" | "done";

/** The plan (run card) of one person's form: read again when the case's answers change (the "view" query key). */
function usePlan(caseId: string, subject: string | null, form: string | null) {
  return useQuery<ReviewRunPlan, Error>({
    queryKey: ["runtime", "view", caseId, "review-plan", subject, form],
    queryFn: () => api<ReviewRunPlan>(`/runtime/cases/${caseId}/review-runs/plan`, { method: "POST", json: { forms: [form], subject } }),
    enabled: !!subject && !!form, retry: noRetryOnRefusal,
  });
}

export function ReviewPage() {
  const { id } = useParams();
  const actor = useActorId();
  const view = useCaseView(id!, "agent");
  const forms = useApi<{ forms: CaseForm[] }>(["runtime", "view", id!, "forms", actor], isOfficer(actor) ? `/runtime/cases/${id}/forms` : null, { retry: noRetryOnRefusal });
  const prep = useApi<{ derived: boolean; filings?: Filing[] }>(["runtime", "view", id!, "prepare"], isOfficer(actor) ? `/runtime/cases/${id}/prepare` : null, { retry: noRetryOnRefusal });
  if (!isOfficer(actor)) return <Notice title="This page is for the case officer">The review of a case's forms is the firm's staff's work; a client never sees it.</Notice>;
  if (view.isLoading) return <div className="space-y-3" aria-busy="true"><Skeleton className="h-8 w-1/3" /><Skeleton className="h-40 w-full" /></div>;
  if (view.isError) return <Notice tone="danger" title="This case could not be opened">{(view.error as Error).message}</Notice>;
  const c = view.data!.case;
  const filings = prep.data?.derived ? (prep.data.filings ?? []).map((f) => ({ id: f.id, label: f.label })) : [];
  return (
    <div className="mx-auto max-w-7xl space-y-5" data-review-page>
      <nav aria-label="Path" className="flex items-center gap-1 text-[13px] text-text-muted"><Link to="/cases" className="inline-flex items-center gap-1 hover:underline"><ArrowLeft className="size-3.5" aria-hidden />Cases</Link><span aria-hidden>›</span><Link to={`/cases/${c.id}`} className="hover:underline">{c.reference}</Link><span aria-hidden>›</span><span className="text-text">Review</span></nav>
      <div>
        <h1 className="text-2xl font-semibold [overflow-wrap:anywhere]">Review · {c.reference}</h1>
        <p className="mt-1 text-sm text-text-muted">Before the forms go out: the rules' checks on every form, and an independent AI review of a filled form. Findings warn; none stops Ready to file. Staff only.</p>
      </div>
      <RunCard caseId={c.id} people={c.people} forms={forms.data?.forms ?? null} formsError={forms.isError ? (forms.error as Error).message : null} />
      <FindingsPanel caseId={c.id} people={c.people} filings={filings} title="Findings" />
    </div>
  );
}

function RunCard({ caseId, people, forms, formsError }: { caseId: string; people: CasePerson[]; forms: CaseForm[] | null; formsError: string | null }) {
  const persons = people.filter((p) => p.role !== "case");
  const [subject, setSubject] = React.useState<string | null>(null);
  const [formPick, setForm] = React.useState<string | null>(null);
  const person = persons.find((p) => p.subject_id === subject) ?? persons[0];
  // The person's PDF forms on the case, IMM 5257 first (the one with a live review today, SI-6).
  const mine = (forms ?? []).filter((f) => f.subject_id === person?.subject_id).map((f) => f.form).sort((a, b) => Number(b === "IMM 5257") - Number(a === "IMM 5257") || a.localeCompare(b));
  const form = formPick && mine.includes(formPick) ? formPick : mine[0] ?? null;
  const plan = usePlan(caseId, person?.subject_id ?? null, form);
  const p = plan.data;
  const [mode, setMode] = React.useState<"replay" | "live">("replay");
  const can = { replay: !!p?.replay_available, live: !!p?.live_allowed };
  const chosen: "replay" | "live" | null = can[mode] ? mode : can.replay ? "replay" : can.live ? "live" : null;
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [result, setResult] = React.useState<ReviewRunResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const runId = React.useRef<string | null>(null);
  const run = useAction(() => api<ReviewRunResult>(`/runtime/cases/${caseId}/review-runs`, { method: "POST", json: { forms: [form], subject: person!.subject_id, mode: chosen, planSha256: p!.plan_sha256, runId: runId.current } }),
    { invalidate: [["runtime", "view", caseId]], success: (r) => r.added ? `${r.added} new finding${r.added === 1 ? "" : "s"}` : "Review run: no new finding" });
  const start = () => {
    runId.current = crypto.randomUUID(); setPhase("running"); setResult(null); setError(null);
    run.mutate(undefined, { onSuccess: (r) => { setResult(r); setPhase("done"); }, onError: (e) => { setError(e instanceof ApiError ? e.message : e.message); setPhase("idle"); } });
  };
  const stop = useAction(() => api(`/runtime/review-runs/${runId.current}/stop`, { method: "POST", json: {} }), { success: "Stopping the review" });
  const reset = () => { setResult(null); setPhase("idle"); setError(null); };
  const stepState = (n: number): "done" | "running" | "waiting" => phase === "done" ? "done" : phase !== "running" ? "waiting" : n === 1 ? "done" : n === 2 || (chosen === "replay" && n === 3) ? "running" : "waiting";
  return (
    <section aria-labelledby="run-h" className="rounded-xl border border-border bg-surface-raised" data-run-card>
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-4 py-3">
        <h2 id="run-h" className="text-base font-semibold">AI review of a filled form</h2>
        <StandIn id="SI-6" today="the AI review runs live on the Visitor visa forms only (one trial, P-164 (2)) and is replayed from its saved run at US$0; severities are Sample until the immigration expert confirms them." later="other form families one at a time, each with its own prompt and tests (team AG-11 AI Doers)." />
        <p className="min-w-0 flex-1 text-[13px] text-text-muted">Two AI rounds read what the form would print; the rules keep only findings that quote it.</p>
      </header>
      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <div className="space-y-3">
          <Field label="Person"><Select value={person?.subject_id ?? ""} onChange={(e) => { setSubject(e.target.value); setForm(null); reset(); }} disabled={phase === "running"}>{persons.map((x) => <option key={x.subject_id} value={x.subject_id}>{x.label}</option>)}</Select></Field>
          <Field label="Form" hint={formsError ?? (forms && !mine.length ? `No form of ${person?.label ?? "this person"} is filled on this case yet.` : undefined)}>
            <Select value={form ?? ""} onChange={(e) => { setForm(e.target.value); reset(); }} disabled={phase === "running" || !mine.length}>{mine.map((f) => <option key={f} value={f}>{f}</option>)}</Select>
          </Field>
        </div>
        <div className="min-w-0 space-y-3" aria-busy={plan.isLoading}>
          {!form ? null : plan.isLoading ? <Skeleton className="h-28 w-full" />
            : plan.isError ? <Notice tone="warn" title={`${form} cannot be reviewed now`} action={<Button size="sm" variant="secondary" onClick={() => void plan.refetch()}>Retry</Button>}>{plan.error.message}</Notice>
            : p ? <>
              {p.made_up ? <Notice tone="warn" title="Made-up test runs">{p.made_up_words}</Notice> : null}
              <fieldset className="space-y-2" data-run-modes>
                <legend className="mb-1 text-[13px] font-medium">How to run it · cost first</legend>
                <ModeRow value="replay" chosen={chosen} on={setMode} disabled={!can.replay || phase === "running"} price="US$0.00" title="Saved"
                  words={can.replay ? `Replays the checked saved review of ${p.forms[0].edition} for exactly these answers (${p.forms[0].boxes} boxes). Nothing is sent.` : p.replay_why ?? ""} />
                <ModeRow value="live" chosen={chosen} on={setMode} disabled={!can.live || phase === "running"} price={`about ${usd(p.estimate.live_usd)}, at most ${usd(p.estimate.live_worst_usd)}`} title="Live"
                  words={can.live ? `Two AI rounds read the form now; the worst case stays under the job cap of ${usd(p.estimate.job_cap_usd)} and what is left of the AI budget (${usd(p.estimate.remaining_usd)}).` : p.live_why ?? ""} />
              </fieldset>
              <ol className="space-y-1 text-[13px]" aria-label="Steps" data-run-steps>
                {p.steps.map((s) => { const st = stepState(s.n); return (
                  <li key={s.n} className={cn("flex items-start gap-2", st === "waiting" && "text-text-muted")} data-step-state={st}>
                    {st === "done" ? <Check className="mt-0.5 size-3.5 text-text-ok" aria-hidden /> : st === "running" ? <Loader2 className="mt-0.5 size-3.5 animate-spin" aria-hidden /> : <Circle className="mt-0.5 size-3.5" aria-hidden />}
                    <span>{s.label}{s.uses_ai ? <span className="text-text-muted"> · AI</span> : null}<span className="sr-only"> ({st})</span></span>
                  </li>); })}
              </ol>
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={start} busy={phase === "running"} disabled={!chosen || phase === "running"} data-run-review>
                  {chosen === "live" ? `Run review (Live, at most ${usd(p.estimate.live_worst_usd)})` : `Run review (Saved, ${usd(0)})`}
                </Button>
                {phase === "running" && chosen === "live" ? <Button variant="secondary" onClick={() => stop.mutate(undefined)}><Square aria-hidden />Stop</Button> : null}
                {!chosen ? <span className="text-[12px] text-text-muted">Nothing can run for these answers now: see the reasons above.</span> : null}
              </div>
            </> : null}
          <div aria-live="polite" data-run-result>
            {error ? <Notice tone="danger" title="The review did not run">{error}</Notice> : null}
            {result ? <Notice tone={result.forms.some((f) => f.from) ? "ok" : "warn"} title={result.forms.some((f) => f.from) ? "Review run" : "The review did not finish"}>
              <p>{result.note}</p>
              {result.forms.flatMap((f) => f.dropped).length ? <details className="mt-1 text-[12px]"><summary className="cursor-pointer">{result.forms.flatMap((f) => f.dropped).length} AI finding(s) left out by the rules</summary>
                <ul className="mt-1 list-disc pl-5">{result.forms.flatMap((f) => f.dropped).map((d, i) => <li key={i} className="[overflow-wrap:anywhere]">{d.why}</li>)}</ul></details> : null}
            </Notice> : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function ModeRow({ value, chosen, on, disabled, price, title, words }: { value: "replay" | "live"; chosen: "replay" | "live" | null; on: (v: "replay" | "live") => void; disabled: boolean; price: string; title: string; words: string }) {
  const id = React.useId();
  return (
    <label htmlFor={id} className={cn("flex items-start gap-3 rounded-lg border border-border px-3 py-2", chosen === value && !disabled && "border-primary bg-primary/5", disabled && "opacity-80")} data-mode={value} data-mode-disabled={disabled ? "true" : "false"}>
      <input id={id} type="radio" name="review-mode" className="mt-1" checked={chosen === value && !disabled} disabled={disabled} onChange={() => on(value)} aria-describedby={`${id}-w`} />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2 text-sm font-medium">{title}<Pill tone={value === "replay" ? "ok" : "ai"}>{price}</Pill></span>
        <span id={`${id}-w`} className="mt-0.5 block text-[12px] text-text-muted [overflow-wrap:anywhere]">{words}</span>
      </span>
    </label>
  );
}
