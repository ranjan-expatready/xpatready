// C6.9 part 3 (M3-D, concept screens/C6.9/concept.md §4–§5, BR-15, BR-16; stand-in SI-1): the staff page "Case check
// from confirmed facts" (P-236, B148; /cases/:id/eligibility) and its card on the case page. Each traveller's latest check: the outcome, every rule with the
// values it read, what is missing, the officer's judgement lines, the disclaimer, who ran it and when; out of date when a
// fact changed since. Run again needs a reason; an override sits beside the result (the engine's outcome stays visible);
// Mark reviewed stamps "Reviewed by" (licensed representative) or "Seen by" (P-229 (2)). Drawers, never modals. Staff only:
// a client sees no card and no page. Rules only, no AI (US$0).
import * as React from "react";
import { Link, useParams } from "react-router-dom";
import { Check, CircleHelp, History, X } from "lucide-react";
import { api, ApiError, useAction, useActorId, useApi } from "@/lib/api";
import { useWhere } from "@/components/frame"; // BK-3: one "where am I" line
import { Button, Field, Input, Notice, Panel, Pill, Textarea } from "@/components/ui/controls";
import { Skeleton } from "@/components/ui/skeleton";
import { StandIn } from "@/components/stand-in";
import { Tip, TipProvider } from "@/components/status";
import { cn } from "@/lib/utils";
import { caseWords, lineId, noRetryOnRefusal, useCaseView, type CasePerson } from "./questionnaire";
import { useFirm } from "./team";
import { restingOn, restingWords } from "./eligibility-unconfirmed";
import { CASE_CHECK, CASE_CHECK_SHORT, OUTCOME_WORDS, outcomeWord } from "../../../contracts/case-check-words";
import { FoldOut } from "@/components/fold-out";

type Gate = { key: string; label: string; state: "met" | "not_met" | "not_answered"; facts: string[]; values: Record<string, unknown>; missing: string[]; whenNotMet?: "not_eligible" | "needs_review"; unconfirmed?: string[]; restsOn?: string[] };
type Result = { programKey: string; programLabel: string; outcome: string; score: number | null; maxScore?: number | null; failedGates: string[]; missingInputs: string[]; reviewGates?: string[]; gates: Gate[]; judgement: string[] };
type Override = { id: string; programKey: string; fromOutcome: string; label: string; reason: string; by: string; name?: string; duty?: string; at: string; outOfDate?: boolean };
export type Assessment = {
  id: string; person: string; releaseId: string; packVersion: number; rulesAsOfByProgram: Record<string, string>; disclaimerText: string;
  createdBy: string; createdAt: string; runType: "MANUAL" | "RERUN"; reason: string | null; results: Result[]; inputs?: { fact: string; about: string }[];
  out_of_date: boolean; changed: { fact: string; about: string; was: unknown; now: unknown }[]; release_changed: boolean; not_travelling?: boolean;
  overrides: Override[]; reviewedBy: string | null; reviewedAt: string | null; reviewNote: string | null; reviewStamp?: { name?: string; stamp?: "Reviewed" | "Seen"; duty?: string };
};
type List = { stand_in: string; stand_in_words: string; has_rules?: boolean; assessments: Assessment[] };

/** Simulated case people (api/src/core.ts RUNTIME_ACTORS), for "Run by". */
const NAMES: Record<string, string> = { "user-O": "Case officer", "user-R": "Representative", "user-T": "Second representative", "user-S": "Solo representative" };
const STAFF = new Set(Object.keys(NAMES));
const nameOf = (id: string | null | undefined) => (id ? NAMES[id] ?? "Someone else" : "");
const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const day = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
/** A fact key in words: "person.passport_number" → "Passport number". */
export const factWords = (f: string) => { const w = f.replace(/^[a-z]+\./, "").replace(/_/g, " "); return w.charAt(0).toUpperCase() + w.slice(1); };
/** P-407 (BIC-19): a date value reads like the rest of the page ("9 May 2029"), never in ISO form. */
const shown = (v: unknown) => (v === null || v === undefined || v === "" ? "not answered" : v === true ? "Yes" : v === false ? "No" : typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? day(v) : typeof v === "object" ? JSON.stringify(v) : String(v));
/** P-407 (BIC-08): each traveller's role in the case page's own words (cases.tsx roleOf; that file imports this one). */
const ROLE_WORDS: Record<string, string> = { principal: "Principal applicant", spouse_or_partner: "Spouse or partner", child: "Child" };
const roleOf = (p: CasePerson) => ROLE_WORDS[p.role] ?? p.role_label ?? p.role.replace(/_/g, " ");
/** Label suggestions on the override drawer (concept §4); any label up to 80 characters is accepted. */
const OVERRIDE_LABELS = ["Refer to the representative", "Not advisable in practice", "Borderline: worth exploring"] as const;
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

export function outcomeWords(r: Result | undefined): { text: string; tone: "ok" | "warn" | "danger" | "neutral"; short: string } {
  if (!r) return { text: "Not run", tone: "neutral", short: "Not run" };
  // B124 (P-393): while a deciding fact is unconfirmed, the outcome says so, with the count; the line naming them is below.
  const n = restingOn(r).length, few = n ? ` · ${n} not yet confirmed` : "";
  // B148 (P-236): the team's three words, Qualifies · Can't tell yet · Does not qualify (contracts/case-check-words.ts).
  if (r.outcome === "LIKELY_ELIGIBLE") return { text: `${OUTCOME_WORDS.LIKELY_ELIGIBLE}${restingWords(n)}`, tone: "ok", short: `${OUTCOME_WORDS.LIKELY_ELIGIBLE}${few}` };
  if (r.outcome === "POSSIBLY_ELIGIBLE") {
    // P-230 (1): a rule whose "when not met" is needs review asks for the representative, never a hard Does not qualify.
    const parts = [r.missingInputs.length ? `needs ${plural(r.missingInputs.length, "fact")}` : "", r.reviewGates?.length ? "the representative reviews this" : ""].filter(Boolean);
    return { text: `${OUTCOME_WORDS.POSSIBLY_ELIGIBLE} — ${parts.join("; ")}`, tone: "warn", short: OUTCOME_WORDS.POSSIBLY_ELIGIBLE };
  }
  if (r.outcome === "NOT_ELIGIBLE") return { text: `${OUTCOME_WORDS.NOT_ELIGIBLE} on this application's rules as written${restingWords(n)}`, tone: "danger", short: `${OUTCOME_WORDS.NOT_ELIGIBLE}${few}` };
  // Review m3 (B148): any other code (P-236 drops below the cut-off) in words, never the raw code.
  return { text: outcomeWord(r.outcome), tone: "neutral", short: outcomeWord(r.outcome) };
}

/** P-407 (BIC-14): what an outcome means, in one line, from the same parts as outcomeWords (a tooltip and the
 *  people list's accessible name). */
export function outcomeTip(r: Result | undefined): string {
  if (!r) return "No case check has run for this person yet.";
  const n = restingOn(r).length, few = n ? ` It rests on ${plural(n, "answer")} not yet confirmed.` : "";
  if (r.outcome === "LIKELY_ELIGIBLE") return `${OUTCOME_WORDS.LIKELY_ELIGIBLE}: every rule is met on the answers on file.${few}`;
  if (r.outcome === "POSSIBLY_ELIGIBLE") {
    const parts = [r.missingInputs.length ? `${plural(r.missingInputs.length, "fact")} not answered yet` : "", r.reviewGates?.length ? "a rule the representative reviews is not met" : ""].filter(Boolean);
    return `${OUTCOME_WORDS.POSSIBLY_ELIGIBLE}: no rule that disqualifies failed, but ${parts.join(" and ")}.`;
  }
  if (r.outcome === "NOT_ELIGIBLE") return `${OUTCOME_WORDS.NOT_ELIGIBLE}: a rule is not met on this application's rules as written; the representative reviews this, and IRCC decides.${few}`;
  return outcomeWord(r.outcome);
}
const OUT_OF_DATE_TIP = "A fact this check read has changed since it ran.";
/** A pill with help on keyboard focus: a focusable span (the shared Pill passes no tabIndex) and its own provider, as
 *  StandIn does (the case page has none above the card). */
const Help = ({ tip, children }: { tip: string; children: React.ReactElement }) => <TipProvider><Tip focusable tip={tip}><span data-help className="inline-flex rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">{children}</span></Tip></TipProvider>;

/** Review M1 on 2572b9b0 (WCAG 2.4.3): after an action, focus goes back to the button that started it, or to the
 *  result's heading when that button is gone or switched off (Run case check becomes Run again; Mark reviewed
 *  is off once marked). */
function focusBack(el: HTMLElement | null) {
  if (el && el.isConnected && !(el as HTMLButtonElement).disabled) { el.focus(); return; }
  document.getElementById("result")?.focus();
}
const useAssessments = (caseId: string) => {
  const actor = useActorId();
  return useApi<List>(["runtime", "assessments", caseId, actor], STAFF.has(actor) ? `/runtime/cases/${caseId}/assessments` : null, { retry: noRetryOnRefusal });
};
const latestOf = (list: Assessment[] | undefined, person: string) => (list ?? []).find((a) => a.person === person);

// ------------------------------------------------------------------ the card on the case page

/** "Case check from confirmed facts (staff only)": one line per traveller, under People on this case. Shows nothing to a client. */
export function EligibilityCard({ caseId, people }: { caseId: string; people: CasePerson[] }) {
  const actor = useActorId();
  const q = useAssessments(caseId);
  if (!STAFF.has(actor)) return null;
  const travellers = people.filter((p) => p.role !== "case" && p.applies);
  return (
    <section aria-labelledby="eligibility" className="rounded-xl border border-border bg-surface-raised">
      <header className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        <h2 id="eligibility" className="text-base font-semibold">{CASE_CHECK} (staff only)</h2>
        <StandIn id="SI-1" today="our own checks on this application's rules, three outcomes and no score" later="the team's AG-03 Qualifier fills this page and adds scores, cut-offs and advice" />
        <span className="flex-1" />
        <Link to={`/cases/${caseId}/eligibility`} className="text-[13px] font-medium text-text-link hover:underline">Open {CASE_CHECK_SHORT}</Link>
      </header>
      {q.isLoading ? <div className="px-4 py-3" aria-busy="true"><Skeleton className="h-5 w-1/2" /></div> : q.isError ? <p className="px-4 py-3 text-sm text-text-danger">{(q.error as Error).message}</p> : (
        <ul className="divide-y divide-border">
          {travellers.map((p) => {
            const a = latestOf(q.data?.assessments, p.subject_id), o = outcomeWords(a?.results[0]);
            return <li key={p.subject_id} className="flex min-h-10 flex-wrap items-center gap-2 px-4 py-2 text-sm"><span className="min-w-0 font-medium [overflow-wrap:anywhere]">{p.label}</span><Help tip={outcomeTip(a?.results[0])}><Pill tone={o.tone}>{o.short}</Pill></Help>{a?.out_of_date ? <Help tip={OUT_OF_DATE_TIP}><Pill tone="warn">Out of date</Pill></Help> : null}</li>;
          })}
        </ul>
      )}
    </section>
  );
}

// ------------------------------------------------------------------ the page

export function EligibilityPage() {
  const { id } = useParams();
  const actor = useActorId();
  const view = useCaseView(id!, "agent");
  const q = useAssessments(id!);
  useWhere(view.data ? [{ label: "Cases", to: "/cases" }, { label: caseWords(view.data.case), to: `/cases/${id}` }, { label: CASE_CHECK }] : null); // BK-3
  const [chosen, setChosen] = React.useState<string | null>(null);
  const [drawer, setDrawerState] = React.useState<"run" | "override" | "review" | "history" | null>(null);
  // Break m3 on 2572b9b0 (WCAG 2.4.3): a drawer gives focus back to the button that opened it.
  const opener = React.useRef<HTMLElement | null>(null);
  const setDrawer = (d: "run" | "override" | "review" | "history" | null) => {
    if (d) opener.current = document.activeElement as HTMLElement | null;
    setDrawerState(d);
    // After the dialog library has put focus back itself on unmount (it does so on the next tick).
    if (!d) setTimeout(() => focusBack(opener.current), 60);
  };
  const [runError, setRunError] = React.useState<string | null>(null);
  const listRef = React.useRef<HTMLUListElement>(null);
  if (!STAFF.has(actor)) return <Notice title="This page is for the firm's staff">Case checks are seen by the firm's staff only.</Notice>;
  if (view.isLoading || q.isLoading) return <div className="space-y-3" aria-busy="true"><Skeleton className="h-8 w-1/3" /><Skeleton className="h-40 w-full" /></div>;
  if (view.isError) return <Notice tone="danger" title="This case could not be opened">{(view.error as Error).message}</Notice>;
  if (q.isError) return <Notice tone="danger" title="The case checks could not be read">{(q.error as Error).message}</Notice>;
  const c = view.data!.case, travellers = c.people.filter((p) => p.role !== "case" && p.applies);
  const person = travellers.find((p) => p.subject_id === chosen) ?? travellers[0];
  const runs = (q.data?.assessments ?? []).filter((a) => a.person === person?.subject_id);
  const latest = runs[0], result = latest?.results[0];
  const move = (e: React.KeyboardEvent) => {
    const i = travellers.findIndex((p) => p.subject_id === person?.subject_id);
    const next = e.key === "ArrowDown" ? i + 1 : e.key === "ArrowUp" ? i - 1 : -1;
    if (next < 0 || next >= travellers.length) return;
    e.preventDefault(); setChosen(travellers[next].subject_id); setRunError(null);
    requestAnimationFrame(() => (listRef.current?.querySelectorAll<HTMLElement>("[role=option]")[next])?.focus());
  };
  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold [overflow-wrap:anywhere]">{CASE_CHECK} · {caseWords(c)}<StandIn id="SI-1" today="our own checks on this application's rules, three outcomes and no score" later="the team's AG-03 Qualifier fills this page and adds scores, cut-offs and advice" /></h1>
          <p className="mt-1 text-sm text-text-muted">{(q.data?.assessments ?? []).find((a) => a.results[0])?.results[0].programLabel ?? "This application"} · release {c.pin.release_version}{latest ? ` · rules as at ${day(Object.values(latest.rulesAsOfByProgram)[0])}` : ""} · staff only: the client never sees a verdict</p>
        </div>
        {person && q.data?.has_rules !== false ? <RunButton caseId={c.id} person={person} first={!runs.length} onAgain={() => setDrawer("run")} onError={setRunError} /> : null}
      </div>
      {!travellers.length ? <Notice title="Nobody travels on this case yet">Add the people travelling on the case page first.</Notice> : (
        <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
          <section aria-labelledby="travellers" className="rounded-xl border border-border bg-surface-raised">
            <h2 id="travellers" className="border-b border-border px-4 py-3 text-base font-semibold">People</h2>
            <ul ref={listRef} role="listbox" aria-labelledby="travellers" className="p-1" onKeyDown={move}>
              {travellers.map((p) => {
                const a = latestOf(q.data?.assessments, p.subject_id), o = outcomeWords(a?.results[0]), on = p.subject_id === person?.subject_id;
                return (
                  <li key={p.subject_id} role="option" aria-selected={on} aria-describedby={`help-${p.subject_id}`} tabIndex={on ? 0 : -1} onClick={() => { setChosen(p.subject_id); setRunError(null); }}
                    className={cn("flex min-h-11 cursor-pointer flex-col justify-center rounded-lg px-3 py-1.5 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50", on ? "bg-primary/10" : "hover:bg-text/5")}>
                    <span className="flex flex-wrap items-center gap-2"><span className="min-w-0 font-medium [overflow-wrap:anywhere]">{p.label}</span><Pill tone={o.tone}>{o.short}</Pill>{a?.out_of_date ? <Pill tone="warn">Out of date</Pill> : null}</span>
                    <span className="text-xs text-text-muted" data-role>{roleOf(p)}</span>
                    <span id={`help-${p.subject_id}`} hidden>{outcomeTip(a?.results[0])}{a?.out_of_date ? ` ${OUT_OF_DATE_TIP}` : ""}</span>
                    {a?.results[0]?.missingInputs.length ? <span className="text-xs text-text-muted">needs {a.results[0].missingInputs.map(factWords).join(", ")}</span> : null}
                  </li>
                );
              })}
            </ul>
          </section>
          <section aria-labelledby="result" className="min-w-0 rounded-xl border border-border bg-surface-raised">
            <h2 id="result" tabIndex={-1} className="border-b border-border px-4 py-3 text-base font-semibold outline-none [overflow-wrap:anywhere] focus-visible:ring-[3px] focus-visible:ring-ring/50">{person!.label} — {result?.programLabel ?? "this application"}</h2>
            <div className="space-y-4 px-4 py-4">
              {runError ? <Notice tone="danger" title="Nothing was run">{runError}</Notice> : null}
              {q.data?.has_rules === false && !latest ? <Notice title="No eligibility rules yet">This application's release has no eligibility rules yet. An author adds them and a reviewer releases them.</Notice>
                : !latest ? <p className="text-sm">No case check yet for {person!.label}. It reads the answers on file against this application's rules; nothing is sent anywhere.</p>
                : <Result caseId={c.id} caseSubject={c.people.find((p) => p.role === "case")?.subject_id ?? ""} asked={new Set((view.data?.sections ?? []).flatMap((s) => s.questions.map((x) => `${x.subjectId}|${x.fact}`)))} a={latest} r={result!} runs={runs.length} open={setDrawer} />}
            </div>
          </section>
        </div>
      )}
      {person && drawer === "run" ? <RunAgainDrawer caseId={c.id} person={person} close={() => setDrawer(null)} /> : null}
      {latest && result && drawer === "override" ? <OverrideDrawer a={latest} r={result} close={() => setDrawer(null)} /> : null}
      {latest && drawer === "review" ? <ReviewDrawer a={latest} actor={actor} close={() => setDrawer(null)} /> : null}
      {person && drawer === "history" ? <HistoryDrawer person={person} runs={runs} close={() => setDrawer(null)} /> : null}
    </div>
  );
}

function RunButton({ caseId, person, first, onAgain, onError }: { caseId: string; person: CasePerson; first: boolean; onAgain: () => void; onError: (m: string | null) => void }) {
  const run = useAction(() => api(`/runtime/cases/${caseId}/assessments`, { method: "POST", json: { person: person.subject_id } }), { success: "Case check run", invalidate: [["runtime", "assessments", caseId]], onDone: () => { onError(null); setTimeout(() => focusBack(null), 50); } });
  if (!first) return <Button onClick={onAgain}>Run again</Button>;
  return <Button busy={run.isPending} onClick={() => { if (!run.isPending) run.mutate(undefined, { onError: (e) => onError(e.message) }); }}>Run {CASE_CHECK_SHORT}</Button>;
}

function Result({ caseId, caseSubject, asked, a, r, runs, open }: { caseId: string; caseSubject: string; asked: Set<string>; a: Assessment; r: Result; runs: number; open: (d: "override" | "review" | "history") => void }) {
  const o = outcomeWords(r), labels = new Map(r.gates.map((g) => [g.key, g.label])), resting = restingOn(r);
  const stamp = a.reviewStamp?.stamp === "Seen" ? "Seen by" : "Reviewed by";
  return (
    <>
      {a.out_of_date ? (
        <div role="status" className="rounded-lg border border-warn bg-warn/15 px-3 py-2 text-sm text-text-warn">
          <p className="font-medium">Out of date: {[...a.changed.map((x) => `${factWords(x.fact)} changed from ${shown(x.was)} to ${shown(x.now)}`), ...(a.not_travelling ? ["this person no longer travels on this application"] : []), ...(a.release_changed ? ["the case now uses another release"] : [])].join("; ")}, after this check.</p>
          <p>Run again to see today's result. This result stays readable.</p>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <span data-outcome className="contents"><Help tip={outcomeTip(r)}><Pill tone={o.tone} className="px-2 py-1 text-sm">{o.text}</Pill></Help></span>
      </div>
      <FoldOut data-how className="text-sm" summaryClassName="text-text-link" summary="How this result is worked out">
        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-text-muted">
          <li>Every rule must be met. When a rule that disqualifies is not met, the result is “{OUTCOME_WORDS.NOT_ELIGIBLE}”, even if facts are still missing.</li>
          <li>A fact not answered, or a rule for the representative's review that is not met, gives “{OUTCOME_WORDS.POSSIBLY_ELIGIBLE}”. A rule for the representative's review never gives “{OUTCOME_WORDS.NOT_ELIGIBLE}” on its own.</li>
          <li>When the result rests on answers not yet confirmed, it says so.</li>
          {r.judgement.length ? <li>The lines under Officer's judgement never change the result.</li> : null}
          <li data-score>{r.score === null || r.score === undefined ? "No points score on this application." : `Score: ${r.score}${r.maxScore ? ` of ${r.maxScore}` : ""}.`}</li>
        </ul>
      </FoldOut>
      {resting.length ? (
        <p className="text-sm" data-resting-on={resting.join(" ")}>
          “{r.outcome === "LIKELY_ELIGIBLE" ? OUTCOME_WORDS.LIKELY_ELIGIBLE : OUTCOME_WORDS.NOT_ELIGIBLE}” rests on {resting.length === 1 ? "an answer" : "answers"} not yet confirmed:{" "}
          {resting.map((f, i) => <React.Fragment key={f}>{i ? ", " : ""}<Link to={`/cases/${caseId}#${lineId((a.inputs ?? []).find((i) => i.fact === f)?.about === "case" ? caseSubject : a.person, f)}`} className="text-text-link underline" title={`Open ${factWords(f)} in the Agent view, where its section is confirmed`}>{factWords(f)}</Link></React.Fragment>)}.
          {" "}Confirm {resting.length === 1 ? "it" : "them"} in the Agent view; this line goes once every deciding answer is confirmed.
        </p>
      ) : null}
      {r.outcome === "NOT_ELIGIBLE" ? <p className="text-sm">Fails: {r.failedGates.map((k) => labels.get(k) ?? k).join("; ")}{r.missingInputs.length ? `; also needs: ${r.missingInputs.map(factWords).join(", ")}` : ""}. The representative reviews this, and IRCC decides.</p> : null}
      {r.reviewGates?.length ? <p className="text-sm">For the representative's review, a rule not met: {r.reviewGates.map((k) => labels.get(k) ?? k).join("; ")}. A rule like this never gives “{OUTCOME_WORDS.NOT_ELIGIBLE}” on its own; the representative reviews it, and IRCC decides.</p> : null}
      {a.overrides.map((x) => <p key={x.id} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm [overflow-wrap:anywhere]"><span className="font-medium">Officer's override: {x.label}</span> — {x.reason} <span className="text-xs text-text-muted">({x.name ?? nameOf(x.by)}, {when(x.at)}; the result above is the rules' own)</span></p>)}
      <div>
        <h3 className="mb-1 text-sm font-semibold">Rules checked</h3>
        <ul className="divide-y divide-border rounded-lg border border-border">
          {r.gates.map((g) => (
            <li key={g.key} className="grid min-h-10 grid-cols-[8.5rem_minmax(0,1fr)] gap-2 px-3 py-2 text-sm">
              <span className={cn("inline-flex items-center gap-1 font-medium", g.state === "met" ? "text-text-ok" : g.state === "not_met" ? "text-text-danger" : "text-text-warn")}>
                {g.state === "met" ? <Check className="size-4" aria-hidden /> : g.state === "not_met" ? <X className="size-4" aria-hidden /> : <CircleHelp className="size-4" aria-hidden />}
                {g.state === "met" ? "Met" : g.state === "not_met" ? "Not met" : "Not answered"}
                {g.state === "not_met" && g.whenNotMet === "needs_review" ? <span className="sr-only">: for the representative's review</span> : null}
              </span>
              <span className="min-w-0">
                <span className="block [overflow-wrap:anywhere]">{g.label}</span>
                <span className="block text-xs text-text-muted [overflow-wrap:anywhere]">{g.facts.map((f) => `${factWords(f)}: ${shown(g.values[f])}${g.unconfirmed?.includes(f) ? " (not confirmed yet)" : ""}`).join(" · ")}</span>
                {g.state === "not_met" && g.whenNotMet === "needs_review" ? <span className="block text-xs font-medium text-text-warn">The representative reviews this: never “{OUTCOME_WORDS.NOT_ELIGIBLE}” on its own</span> : null}
                {g.missing.length ? <span className="block text-xs">{g.missing.map((f, k) => {
                  // P-407 (BIC-02): one link per missing fact, to that person's question; a fact the Agent view does not
                  // ask (no form or rule reads it there) opens the Agent view and says so, never a dead anchor.
                  const who = (a.inputs ?? []).find((i) => i.fact === f)?.about === "case" || f.startsWith("case.") ? caseSubject : a.person;
                  const there = asked.has(`${who}|${f}`);
                  return <React.Fragment key={f}>{k ? ", " : ""}<Link to={`/cases/${caseId}#${there ? lineId(who, f) : "agent-view"}`} data-missing-link={there ? "line" : "agent-view"} className="text-text-link underline">{factWords(f)}</Link>{there ? null : <span className="text-text-muted"> (not asked in the Agent view yet)</span>}</React.Fragment>;
                })} → Answer in the Agent view</span> : null}
              </span>
            </li>
          ))}
        </ul>
      </div>
      {r.judgement.length ? (
        <div>
          <h3 className="text-sm font-semibold">Officer's judgement, not checked by rules</h3>
          <p className="mb-1 text-xs text-text-muted">IRCC's officer decides these; they never change the result.</p>
          <ul className="list-disc space-y-0.5 pl-5 text-sm">{r.judgement.map((j) => <li key={j}>{j}</li>)}</ul>
        </div>
      ) : null}
      <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-text-muted"><p className="font-medium text-text">Disclaimer</p><p>{a.disclaimerText}</p></div>
      <p className="whitespace-pre-line text-xs text-text-muted [overflow-wrap:anywhere]">Run by {nameOf(a.createdBy)} · {when(a.createdAt)} · release {a.packVersion}{a.reason ? ` · reason: ${a.reason}` : ""}{a.reviewedAt ? ` · ${stamp} ${a.reviewStamp?.name ?? nameOf(a.reviewedBy)}, ${when(a.reviewedAt)}${a.reviewNote ? `: ${a.reviewNote}` : ""}` : ""}</p>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => open("override")}>Override result…</Button>
        <Button variant="secondary" size="sm" disabled={!!a.reviewedAt} onClick={() => open("review")}>Mark reviewed…</Button>{a.reviewedAt ? <span className="text-xs text-text-muted">Already marked reviewed</span> : null}
        <span className="flex-1" />
        <Button variant="ghost" size="sm" onClick={() => open("history")}><History aria-hidden />History ({plural(runs, "run")})</Button>
      </div>
    </>
  );
}

function RunAgainDrawer({ caseId, person, close }: { caseId: string; person: CasePerson; close: () => void }) {
  const [reason, setReason] = React.useState(""), [error, setError] = React.useState<string | null>(null);
  const run = useAction(() => api(`/runtime/cases/${caseId}/assessments`, { method: "POST", json: { person: person.subject_id, reason } }), { success: "Case check run again", invalidate: [["runtime", "assessments", caseId]], onDone: close });
  const submit = () => { if (!run.isPending) run.mutate(undefined, { onError: (e) => setError(e instanceof ApiError ? e.field("reason") ?? e.message : e.message) }); };
  return (
    <Panel open onOpenChange={(o) => { if (!o) close(); }} title={`Run again for ${person.label}`} description="The earlier checks stay as they were; this one reads today's answers." footer={<><Button variant="ghost" onClick={close}>Cancel</Button><Button busy={run.isPending} onClick={submit}>Run again</Button></>}>
      <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <Field label="Reason" hint="Required, for example 'Passport renewed'." error={error}><Input value={reason} onChange={(e) => { setReason(e.target.value); setError(null); }} maxLength={300} /></Field>
        <button type="submit" hidden />
      </form>
    </Panel>
  );
}

function OverrideDrawer({ a, r, close }: { a: Assessment; r: Result; close: () => void }) {
  const [label, setLabel] = React.useState<string>(""), [reason, setReason] = React.useState("");
  const [errors, setErrors] = React.useState<{ label?: string | null; reason?: string | null; other?: string | null }>({});
  const go = useAction(() => api(`/runtime/assessments/${a.id}/override`, { method: "POST", json: { programKey: r.programKey, fromOutcome: r.outcome, label, reason } }), { success: "Override kept beside the result", invalidate: [["runtime", "assessments"]], onDone: close });
  const submit = () => !go.isPending && go.mutate(undefined, { onError: (e) => setErrors(e instanceof ApiError ? { label: e.field("label"), reason: e.field("reason"), other: e.field("label") || e.field("reason") ? null : e.message } : { other: e.message }) });
  return (
    <Panel open onOpenChange={(o) => { if (!o) close(); }} title="Override the result" description="The rules' result stays visible; your label and reason sit beside it, with your name." footer={<><Button variant="ghost" onClick={close}>Cancel</Button><Button busy={go.isPending} onClick={submit}>Keep the override</Button></>}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        {errors.other ? <Notice tone="danger">{errors.other}</Notice> : null}
        {a.out_of_date ? <Notice tone="warn">This check is out of date; the override records that.</Notice> : null}
        <Field label="Result being overridden"><Input value={outcomeWords(r).text} readOnly /></Field>
        <Field label="Label" hint="Up to 80 characters." error={errors.label}><Input list="override-labels" value={label} onChange={(e) => { setLabel(e.target.value); setErrors({}); }} maxLength={80} /></Field>
        <datalist id="override-labels">{OVERRIDE_LABELS.map((l) => <option key={l} value={l} />)}</datalist>
        <Field label="Reason" hint="Required." error={errors.reason}><Textarea value={reason} onChange={(e) => { setReason(e.target.value.replace(/[\r\n]+/g, " ")); setErrors({}); }} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } }} maxLength={500} /></Field>
        <button type="submit" hidden />
      </form>
    </Panel>
  );
}

function ReviewDrawer({ a, actor, close }: { a: Assessment; actor: string; close: () => void }) {
  const [note, setNote] = React.useState(""), [error, setError] = React.useState<string | null>(null);
  // The preview only: the server decides the stamp from the firm's record (samples/firms.json, P-229 (2)).
  const me = useFirm().data?.users.find((u) => u.id === actor), licensed = !!(me?.duties.includes("represent") && me.licence?.number);
  const go = useAction(() => api(`/runtime/assessments/${a.id}/review`, { method: "POST", json: note ? { note } : {} }), { success: (x: { stamp: string }) => `${x.stamp === "Seen" ? "Seen" : "Reviewed"}: stamped on the check`, invalidate: [["runtime", "assessments"]], onDone: close });
  const [other, setOther] = React.useState<string | null>(null);
  const submit = () => { if (!go.isPending) go.mutate(undefined, { onError: (e) => { const f = e instanceof ApiError ? e.field("note") : null; setError(f); setOther(f ? null : e.message); } }); };
  return (
    <Panel open onOpenChange={(o) => { if (!o) close(); }} title="Mark reviewed" description="Once per check. The stamp names you, your duty and your licence." footer={<><Button variant="ghost" onClick={close}>Cancel</Button><Button busy={go.isPending} onClick={submit}>Mark reviewed</Button></>}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        {other ? <Notice tone="danger">{other}</Notice> : null}
        <p className="text-sm">The stamp will read <span className="font-medium">"{licensed ? "Reviewed by" : "Seen by"} {me?.name ?? nameOf(actor)}"</span>{licensed ? " (a licensed representative)" : " (no licence: a case officer's stamp)"}.</p>
        <Field label="Note" hint="Optional." error={error}><Textarea value={note} onChange={(e) => { setNote(e.target.value); setError(null); }} maxLength={500} /></Field>
      </form>
    </Panel>
  );
}

function HistoryDrawer({ person, runs, close }: { person: CasePerson; runs: Assessment[]; close: () => void }) {
  return (
    <Panel open onOpenChange={(o) => { if (!o) close(); }} title={`History for ${person.label}`} description="Every check, newest first; none is ever changed." bodyLabel="Earlier checks">
      <ol className="space-y-2">
        {runs.map((a) => { const o = outcomeWords(a.results[0]); return (
          <li key={a.id} className="rounded-lg border border-border px-3 py-2 text-sm">
            <span className="flex flex-wrap items-center gap-2"><Pill tone={o.tone}>{o.short}</Pill>{a.out_of_date ? <Pill tone="warn">Out of date</Pill> : null}{a.overrides.length ? <Pill>Overridden</Pill> : null}{a.reviewedAt ? <Pill tone="info">{a.reviewStamp?.stamp === "Seen" ? "Seen" : "Reviewed"}</Pill> : null}</span>
            <span className="mt-0.5 block text-xs text-text-muted">{nameOf(a.createdBy)} · {when(a.createdAt)}{a.reason ? ` · ${a.reason}` : ""}</span>
          </li>
        ); })}
      </ol>
    </Panel>
  );
}
