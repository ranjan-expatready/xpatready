// C7.5 part 2 The Review page (runtime lane, M3-E; r5c BR-19, board frame 13; screens/C7.5/concept-part2.md; P-110, P-121,
// P-141, P-164 (2), P-227, P-71, P-168): /cases/:id/review, EXPERIENCE §3 "Source + proposals". The run card first (cost
// first: Saved US$0.00 or why none exists, Live with its usual and worst cost or why it is not allowed; the SI-6 stand-in;
// the steps), then the source (what the chosen form prints, box by box: what the AI rounds read) beside the proposals (the
// case's findings per filing, then person, each AI finding with its agreement, both rounds' reasons and the words it
// quotes). "Show on the form" highlights the quoted line in both. Findings are warnings: decided here, or passed with a
// reason on Ready to file. Staff only.
import * as React from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Check, Circle, Loader2, Square } from "lucide-react";
import { api, ApiError, useAction, useActorId, useApi } from "@/lib/api";
import { useWhere } from "@/components/frame"; // BK-3: one "where am I" line
import { Button, Field, Notice, Pill, Select } from "@/components/ui/controls";
import { Skeleton } from "@/components/ui/skeleton";
import { StandIn } from "@/components/stand-in";
import { cn } from "@/lib/utils";
import type { CaseForm } from "../../../contracts/runtime";
import type { Finding } from "../../../contracts/findings";
import type { ReviewRunPlan, ReviewRunResult } from "../../../api/src/review-run-shapes";
import { FindingsPanel } from "./findings";
import { caseWords, noRetryOnRefusal, useCaseView, type CasePerson } from "./questionnaire";
import { FoldOut } from "@/components/fold-out";

/** The firm's staff (the simulated people of cases.tsx); a client never sees the review. */
const STAFF = new Set(["user-O", "user-R", "user-T", "user-S"]);
const isOfficer = (id: string) => STAFF.has(id);
/** "recorded on 8 Nov 2026", from a saved run's file name ("…-live-20261108t…"); nothing when it has none. */
const recordedOn = (file: string | undefined) => { const m = /-live-(\d{4})(\d{2})(\d{2})t/.exec(file ?? ""); return m ? `, recorded on ${new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).toLocaleDateString("en-CA", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })},` : ""; };
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
  useWhere(view.data ? [{ label: "Cases", to: "/cases" }, { label: caseWords(view.data.case), to: `/cases/${id}` }, { label: "Review" }] : null); // BK-3
  const forms = useApi<{ forms: CaseForm[] }>(["runtime", "view", id!, "forms", actor], isOfficer(actor) ? `/runtime/cases/${id}/forms` : null, { retry: noRetryOnRefusal });
  const prep = useApi<{ derived: boolean; filings?: Filing[] }>(["runtime", "view", id!, "prepare"], isOfficer(actor) ? `/runtime/cases/${id}/prepare` : null, { retry: noRetryOnRefusal });
  const [subject, setSubject] = React.useState<string | null>(null);
  const [formPick, setForm] = React.useState<string | null>(null);
  const [shown, setShown] = React.useState<Finding | null>(null);
  const people = view.data?.case.people ?? [];
  const persons = people.filter((p) => p.role !== "case");
  const person = persons.find((p) => p.subject_id === subject) ?? persons[0];
  // The person's PDF forms on the case, in the order the case's forms list gives them (GET …/forms); BK-14: any of them can
  // be reviewed, so none is put first by its number.
  const mine = [...new Set((forms.data?.forms ?? []).filter((f) => f.subject_id === person?.subject_id).map((f) => f.form))];
  const form = formPick && mine.includes(formPick) ? formPick : mine[0] ?? null;
  const plan = usePlan(id!, person?.subject_id ?? null, form);
  if (!isOfficer(actor)) return <Notice title="This page is for the case officer">The review of a case's forms is the firm's staff's work; a client never sees it.</Notice>;
  if (view.isLoading) return <div className="space-y-3" aria-busy="true"><Skeleton className="h-8 w-1/3" /><Skeleton className="h-40 w-full" /></div>;
  if (view.isError) return <Notice tone="danger" title="This case could not be opened">{(view.error as Error).message}</Notice>;
  const c = view.data!.case;
  const filings = prep.data?.derived ? (prep.data.filings ?? []).map((f) => ({ id: f.id, label: f.label })) : [];
  // "Show on the form": an AI finding about another person or form first chooses that person and form.
  const show = (f: Finding) => { setShown(f); if (f.subject !== person?.subject_id) setSubject(f.subject); if (f.form && f.form !== form) setForm(f.form); };
  return (
    <div className="mx-auto max-w-7xl space-y-5" data-review-page>
      <div>
        <h1 className="text-2xl font-semibold [overflow-wrap:anywhere]">Review · {caseWords(c)}</h1>
        <p className="mt-1 text-sm text-text-muted">Before the forms go out: the rules' checks on every form, and an independent AI review of a filled form. Each finding is a warning: decide it here, or pass it with a reason on Ready to file. Staff only.</p>
      </div>
      <RunCard caseId={c.id} persons={persons} person={person ?? null} forms={mine} formsLoaded={!!forms.data} formsError={forms.isError ? (forms.error as Error).message : null} form={form} plan={plan}
        onPerson={(x) => { setSubject(x); setForm(null); setShown(null); }} onForm={(x) => { setForm(x); setShown(null); }} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <SourcePanel person={person?.label ?? ""} form={form} plan={plan.data ?? null} loading={plan.isLoading} shown={shown && shown.subject === person?.subject_id && shown.form === form ? shown : null} />
        <FindingsPanel caseId={c.id} people={people} filings={filings} title="Findings" onShow={show} shownId={shown?.id ?? null} />
      </div>
    </div>
  );
}

/** The source: what the chosen form prints for the chosen person, box by box (what the two AI rounds read), with the line an
 *  AI finding quotes highlighted when the person asks "Show on the form". */
function SourcePanel({ person, form, plan, loading, shown }: { person: string; form: string | null; plan: ReviewRunPlan | null; loading: boolean; shown: Finding | null }) {
  const lines = plan?.forms[0]?.lines ?? [];
  const norm = (t: string) => t.replace(/\s+/g, " ").trim().toLowerCase();
  const hit = (l: { fact: string | null; value: string }) => !!shown && l.fact === shown.field && norm(l.value).includes(norm(shown.quote));
  const ref = React.useRef<HTMLLIElement | null>(null);
  React.useEffect(() => { ref.current?.scrollIntoView({ block: "nearest" }); }, [shown?.id]);
  let first = true;
  return (
    <section aria-labelledby="source-h" className="min-w-0 rounded-xl border border-border bg-surface-raised" data-source-panel>
      <header className="border-b border-border px-4 py-3">
        <h2 id="source-h" className="text-base font-semibold">What the form says</h2>
        <p className="text-[12px] text-text-muted">{form ? `${plan?.forms[0]?.edition ?? form} for ${person}: each form field as a copy prints it, which is what the AI rounds read. Contact details are not sent.` : "Choose a person and a form above."}</p>
      </header>
      {loading ? <div className="p-4"><Skeleton className="h-32 w-full" /></div>
        : !lines.length ? <p className="px-4 py-3 text-sm text-text-muted">{form ? "Nothing to show for this form yet." : ""}</p>
        : <ol tabIndex={0} className="max-h-[560px] overflow-y-auto py-1 text-[13px] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50" aria-label={`Form fields of ${form}`}>{lines.map((l) => {
            const on = hit(l), mark = on && first; if (on) first = false;
            return (
              <li key={l.box} ref={mark ? ref : undefined} className={cn("grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3 border-b border-border/60 px-4 py-1.5 last:border-b-0", on && "bg-warn/15 outline outline-2 -outline-offset-2 outline-warn")} data-source-line={l.fact ?? ""} data-source-shown={on ? "true" : undefined}>
                <span className="text-text-muted [overflow-wrap:anywhere]">{l.caption}</span>
                <span className="font-medium [overflow-wrap:anywhere]">{l.value}{on ? <span className="sr-only"> (quoted by the finding shown)</span> : null}</span>
              </li>);
          })}</ol>}
    </section>
  );
}

function RunCard({ caseId, persons, person, forms, formsLoaded, formsError, form, plan, onPerson, onForm }: { caseId: string; persons: CasePerson[]; person: CasePerson | null; forms: string[]; formsLoaded: boolean; formsError: string | null; form: string | null;
  plan: ReturnType<typeof usePlan>; onPerson: (x: string) => void; onForm: (x: string) => void }) {
  const p = plan.data;
  const [mode, setMode] = React.useState<"replay" | "live">("replay");
  const can = { replay: !!p?.replay_available, live: !!p?.live_allowed };
  const chosen: "replay" | "live" | null = can[mode] ? mode : can.replay ? "replay" : can.live ? "live" : null;
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [result, setResult] = React.useState<ReviewRunResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const runId = React.useRef<string | null>(null);
  // Break m: after a run (or a refusal) focus goes to its result, never back to the page body.
  const resultRef = React.useRef<HTMLDivElement | null>(null);
  const run = useAction(() => api<ReviewRunResult>(`/runtime/cases/${caseId}/review-runs`, { method: "POST", json: { forms: [form], subject: person!.subject_id, mode: chosen, planSha256: p!.plan_sha256, runId: runId.current } }),
    { invalidate: [["runtime", "view", caseId]], success: (r) => r.added ? `${r.added} new finding${r.added === 1 ? "" : "s"}` : "Review run: no new finding" });
  const start = () => {
    runId.current = crypto.randomUUID(); setPhase("running"); setResult(null); setError(null);
    run.mutate(undefined, { onSuccess: (r) => { setResult(r); setPhase("done"); requestAnimationFrame(() => resultRef.current?.focus()); }, onError: (e) => { setError(e instanceof ApiError ? e.message : e.message); setPhase("idle"); void plan.refetch(); requestAnimationFrame(() => resultRef.current?.focus()); } });
  };
  const stop = useAction(() => api(`/runtime/review-runs/${runId.current}/stop`, { method: "POST", json: {} }), { success: "Stopping the review" });
  React.useEffect(() => { setResult(null); setPhase("idle"); setError(null); }, [person?.subject_id, form]);
  // Review M2 (c): the steps say what the run reported when it ended, never a tick the page made up. While it runs, one
  // line says it is running (a Saved run ends in about a second; a Live one in a few minutes); when it ends, each step is
  // done or not by the result: the sheet read (1), both rounds read or replayed (2, 3), the rules applied (4).
  // Review n3: step 2 is done when the first round answered, step 3 when the checker did too, step 4 when the rules ran.
  const rounds = Math.max(0, ...(result?.forms ?? []).map((f) => f.rounds));
  const ran = !!result?.forms.some((f) => f.from);
  const stepState = (n: number): "done" | "not run" | "waiting" => phase !== "done" || !result ? "waiting" : n === 1 || (n === 2 && rounds >= 1) || (n === 3 && rounds >= 2) || (n === 4 && ran) ? "done" : "not run";
  const dropped = result?.forms.flatMap((f) => f.dropped) ?? [], unreadable = result?.forms.flatMap((f) => f.unreadable) ?? [];
  return (
    <section aria-labelledby="run-h" className="rounded-xl border border-border bg-surface-raised" data-run-card>
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-4 py-3">
        <h2 id="run-h" className="text-base font-semibold">AI review of a filled form</h2>
        <StandIn id="SI-6" today="the AI review reads any form the case's release names with its official text; Saved replays a review recorded for that form edition and these values at US$0; severities are Sample until the immigration expert confirms them." later="severities confirmed by the immigration expert (team AG-11 AI Doers)." />
        <p className="min-w-0 flex-1 text-[13px] text-text-muted">Two AI rounds read what the form prints; the rules keep only findings that quote it.</p>
      </header>
      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <div className="space-y-3">
          <Field label="Person"><Select value={person?.subject_id ?? ""} onChange={(e) => onPerson(e.target.value)} disabled={phase === "running"}>{persons.map((x) => <option key={x.subject_id} value={x.subject_id}>{x.label}</option>)}</Select></Field>
          <Field label="Form" hint={formsError ?? (formsLoaded && !forms.length ? `No form of ${person?.label ?? "this person"} is filled on this case yet.` : "Live reviews one form at a time.")}>
            <Select value={form ?? ""} onChange={(e) => onForm(e.target.value)} disabled={phase === "running" || !forms.length}>{forms.map((f) => <option key={f} value={f}>{f}</option>)}</Select>
          </Field>
        </div>
        <div className="min-w-0 space-y-3" aria-busy={plan.isLoading}>
          {!form ? null : plan.isLoading ? <Skeleton className="h-28 w-full" />
            : plan.isError ? <Notice tone="warn" title={`${form} cannot be reviewed now`} action={/Nothing is filled/.test(plan.error.message) ? <Link to={`/cases/${caseId}#agent-view`} className="text-[13px] font-medium text-text-link hover:underline">Open the Agent view</Link> : <Button size="sm" variant="secondary" onClick={() => void plan.refetch()}>Retry</Button>}>{plan.error.message}</Notice>
            : p ? <>
              {p.made_up ? <Notice tone="warn" title="Made-up test runs">{p.made_up_words}</Notice> : null}
              <fieldset className="space-y-2" data-run-modes>
                <legend className="mb-1 text-[13px] font-medium">How to run it · cost first</legend>
                <ModeRow value="replay" chosen={chosen} on={setMode} disabled={!can.replay || phase === "running"} price="US$0.00" title="Saved"
                  words={can.replay ? `Replays the checked saved review of ${p.forms[0].edition}${recordedOn(p.forms[0].saved.files[0])} for exactly these answers (${p.forms[0].boxes} form fields). Nothing is sent.` : p.replay_why ?? ""} />
                <ModeRow value="live" chosen={chosen} on={setMode} disabled={!can.live || phase === "running"} price={`about ${usd(p.estimate.live_usd)}, at most ${usd(p.estimate.live_worst_usd)}`} title="Live"
                  words={can.live ? `Two AI rounds read the form now; the worst case stays under the job cap of ${usd(p.estimate.job_cap_usd)} and what is left of the AI budget (${usd(p.estimate.remaining_usd)}).` : p.live_why ?? ""} />
              </fieldset>
              {phase === "running" ? <p className="flex items-center gap-2 text-[13px]" role="status" data-run-running><Loader2 className="size-3.5 animate-spin" aria-hidden />{chosen === "live" ? "Running live: the two AI rounds take a few minutes. Stop ends the round running now." : "Replaying the saved review: about a second."}</p> : null}
              <ol className="space-y-1 text-[13px]" aria-label="Steps" aria-live="polite" data-run-steps>
                {p.steps.map((s) => { const st = stepState(s.n); return (
                  <li key={s.n} className={cn("flex items-start gap-2", st === "waiting" && "text-text-muted")} data-step-state={st}>
                    {st === "done" ? <Check className="mt-0.5 size-3.5 text-text-ok" aria-hidden /> : <Circle className="mt-0.5 size-3.5" aria-hidden />}
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
          <div aria-live="polite" data-run-result ref={resultRef} tabIndex={-1} className="outline-none">
            {error ? <Notice tone="danger" title="The review did not run">{error}</Notice> : null}
            {result ? <Notice tone={result.forms.some((f) => f.from) ? "ok" : "warn"} title={result.forms.some((f) => f.from) ? "Review run" : "The review did not finish"}>
              <p>{result.note}</p>
              {dropped.length ? <FoldOut className="mt-2 text-[12px]" summaryClassName="inline-flex min-h-6 items-center py-1" summary={<>{dropped.length} AI finding{dropped.length === 1 ? "" : "s"} left out by the rules</>}>
                <ul className="mt-1 list-disc pl-5">{dropped.map((d, i) => <li key={i} className="[overflow-wrap:anywhere]">{d.why}</li>)}</ul></FoldOut> : null}
              {unreadable.length ? <FoldOut className="mt-2 text-[12px]" summaryClassName="inline-flex min-h-6 items-center py-1" summary={<>{unreadable.length} form field{unreadable.length === 1 ? "" : "s"} the AI could not judge (for a person)</>}>
                <ul className="mt-1 list-disc pl-5">{unreadable.map((u, i) => <li key={i} className="[overflow-wrap:anywhere]">{u.round}: {u.box}: {u.why}</li>)}</ul></FoldOut> : null}
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
