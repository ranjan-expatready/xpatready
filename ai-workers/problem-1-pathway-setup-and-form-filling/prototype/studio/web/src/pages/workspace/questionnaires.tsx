// S5 Questionnaires tab (W1-08, P-119, walkthrough v2 S5): "Who can be in this application" (it decides each person's
// questions; challenge M3, M4) is edited in Before forms on the Forms tab since slice C1 (P-161 (2)); this file keeps
// its card (WhoCanBe) and the tab links to it. Then slice 2's questions per person: wording, who fills it, only if, the
// forms that need it, coverage (a gap blocks release), field codes only in a question's side panel (early-look fix 3);
// the rules and checks used here fold below (m4). People pick from the shared library's person roles; a new kind of
// person is added there (S6), never here.
import * as React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, BookOpen, Plus, Undo2, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { type BulkSourceResult, type CountryPqrView, type FactSourceRow, type PeopleLine, type PeoplePlan, type PeopleProposal, type PeopleView, type QuestionnaireQuestion, type QuestionnairesView, stillAskedWords } from "../../../../contracts/workspace";
import { api, ApiError, useAction, useApi, useSessionView, useToast } from "@/lib/api";
import type { CombinationSummary } from "../../../../contracts/programs";
import { Button, Dialog, Input, Notice, Panel, Pill, Select, Table } from "@/components/ui/controls";
import { Tip } from "@/components/status";
import { BulkBar, FactDrawer, RowMenu, RowStatus, ComesFrom, PreQual, SAY, SourceChips, SourceStrip, useFactSources, useRefreshSources, useUndoToast, type Filter } from "@/pages/workspace/sources";
import { Lock } from "lucide-react";
import { ConfigArea } from "@/pages/configuration";
import { DoneSinceNotice, FOCUS_RING, useFocusItem } from "@/components/focus-item";
import { PartProblems } from "@/components/part-problems";
import { cn } from "@/lib/utils";
import { RunCard } from "@/components/run-card";
import { RuleFacts } from "@/components/rule-facts";
import { peopleWords } from "@/lib/people";
import { DraftPqrPicks } from "@/components/pqr-draft";
import { DraftQuestionsDocuments } from "@/components/qd-draft";
import { PlaceFromFormParts } from "@/components/place-from-form-parts";
import { OwnQuestionsLine } from "@/components/own-questions";
import { appliesOf, FILING_TIP, filingWarnings, filingWords, previewFilings } from "../../../../engine/filing-modes";
import type { LineMode } from "../../../../contracts/workspace";
import { APPLICATION_ROLE, personFactRows, personFactsWords } from "../../../../contracts/counts";
// QA-172: a fact answered without a question is named by its short name (as an unwritten question, QA-82), never its meaning.
import { factName } from "../../../../engine/fact-name";
import { FoldArrow } from "@/components/fold-out";

const TIPS = {
  card: "Sets which people a case may include and how many; each person marked as applicant gets their own forms, questions and documents.",
  many: "The fewest and the most of this person a case may have. 0 to 1 means optional.",
  // C11.12 (concept §5): the filing tip, word for word.
  filing: FILING_TIP,
  fees: "What this person's application pays, in words. Amounts are Sample until the immigration expert confirms; where IRCC's fees for this combination are not worked out yet, nothing is guessed.",
  answered: "Who types this person's answers. The principal answers for a child under 18 (Sample age, P-78); an adult confirms their own answers.",
  words: "The line in IRCC's guide this comes from, when AI filled it.",
};

export function QuestionnairesTab({ id, people, questionnaire, available }: { id: string; people: PeopleView; questionnaire: QuestionnairesView | null; available: { key: string; title: string }[] }) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-text-muted" data-who-can-be-moved>Who can be in this application ({peopleWords(people.lines, (l) => l.label) || "nobody yet"}) is set before the forms. <Link className="text-text-link underline" to={`/c/${id}/forms?focus=people%3Acard`}>Change on Forms</Link></p>
      <QuestionsByPerson id={id} q={questionnaire} available={available} />
      <ConfigArea id={id} areas={["rules", "checks"]} />
      <RuleFacts combinationId={id} />
    </div>
  );
}

type Line = PeopleLine & { label: string };
// C11.12 BR-8: the filing mode travels with the line, so a save, Undo, "Use these lines" and Add person never drop it.
const toLines = (v: PeopleView): Line[] => v.lines.map((l) => ({ role: l.role, label: l.label, min: l.min, max: l.max, applies: l.applies, preview: l.preview, filingMode: l.filingMode ?? null, quote: l.quote ?? null, origin: l.origin }));
/** The folded line's plain words (board P-161 (2), Lead C1 decision 4): "Principal applicant (always) · Dependent child,
 *  0–5 (optional)"; exact counts and who files their own application stay in Show and edit. A role whose most is 0
 *  cannot be in the application, so the folded line leaves it out (#139 review). */
const howMany = (l: { min: number; max: number }) => (l.min === l.max ? (l.min === 1 ? "exactly 1" : `exactly ${l.min}`) : `${l.min} to ${l.max}`);

/** C11.12 (board r2 frame 1): how one person's application is filed. Editing: the three choices for a role that may be
 *  an applicant, Files nothing or Files the sponsorship for one that never is; the principal always files their own. */
const MODE_WORDS: Record<LineMode, string> = { files_own: "Files own application", on_principal: "On the principal's application", declared_only: "Declared only (not accompanying)", co_files: "Files the sponsorship (sent with the principal's application)" };
function FilingCell({ l, i, editing, mayBeApplicant, name, words, warning, error, onMode }: { l: Line; i: number; editing: boolean; mayBeApplicant: boolean; name: string; words: ReturnType<typeof filingWords>; warning: string | null; error?: string; onMode: (m: LineMode | null) => void }) {
  const principal = l.role === "principal";
  const id = `filing-${i}`;
  // Review M2 (PR 3): only the sponsor co-files; the representative (and any other never-applicant role) files nothing.
  const choices: LineMode[] = mayBeApplicant ? ["files_own", "on_principal", "declared_only"] : l.role === "sponsor" ? ["co_files"] : [];
  return (
    <div className="min-w-0">
      {editing && !principal && choices.length ? (
        <Select id={id} aria-label={`Filing for ${name}`} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} className="h-8 max-w-64" value={l.filingMode ?? ""} onChange={(e) => onMode((e.target.value || null) as LineMode | null)}>
          <option value="">{mayBeApplicant ? "Choose how it is filed" : "Files nothing"}</option>
          {choices.map((m) => <option key={m} value={m}>{MODE_WORDS[m]}</option>)}
        </Select>
      ) : (
        <span className={cn("font-medium", words.filingWords === "Filing not set" && "text-text-warn")} data-filing-words>{words.filingWords === "Filing not set" ? "⚠ Filing not set" : words.filingWords}</span>
      )}
      {principal ? <p className="text-xs text-text-muted">Always, for the principal</p> : words.ifNotTravelling ? <p className="text-xs text-text-muted" data-if-not-travelling>{words.ifNotTravelling}</p> : null}
      {!mayBeApplicant && l.filingMode === "co_files" ? <p className="text-xs text-text-muted">Sent with the principal's application; never alone</p> : null}
      {warning ? <p className="mt-1 text-xs text-text-warn" data-filing-warning role="status">⚠ {warning.replace(/^[^:]+: [^.]+\. /, "")}{editing ? " You can still save." : ""}</p> : null}
      {error ? <p id={`${id}-error`} role="alert" className="text-xs text-text-danger">{error}</p> : null}
    </div>
  );
}

/** C11.12 "What a case gets" (board r2): the filings and how they are sent, for one case of each line's preview count,
 *  from the plan a case itself uses (engine/filing-modes.ts filingPlan). */
function WhatACaseGets({ gets }: { gets: ReturnType<typeof previewFilings> }) {
  const people = (f: (typeof gets.filings)[number]) => f.people > 1 ? `${f.people} people on it${f.declaredOnly ? `, ${f.declaredOnly} declared only (no fee)` : ""}` : f.kind === "co_filed" ? "Co-filed · cannot be sent alone" : "1 person · own number and decision";
  return (
    <section aria-labelledby="case-gets" className="mt-4 rounded-lg border border-border bg-surface p-4" data-case-gets>
      <h3 id="case-gets" className="text-sm font-semibold">What a case gets <span className="font-normal text-text-muted">(one of each person who may be on a case, Sample)</span></h3>
      {!gets.filings.length ? <p className="mt-1 text-sm text-text-muted">{gets.gets}</p> : (
        <>
          <p className="mt-1 text-sm" data-gets>{gets.submissions[0]?.splittable === false && gets.filings.length > 1 ? `${gets.gets} · cannot be split` : gets.gets}</p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {gets.filings.map((f) => <li key={f.id} className="rounded-md border border-border px-3 py-2" data-preview-filing={f.kind}><span className="font-medium">{f.words}</span><span className="block text-xs text-text-muted">{people(f)} · {f.fee}</span></li>)}
          </ul>
        </>
      )}
    </section>
  );
}

export function WhoCanBe({ id, v }: { id: string; v: PeopleView }) {
  const qc = useQueryClient(); const toast = useToast();
  const { canAuthor } = useSessionView();
  const [editing, setEditing] = React.useState(false);
  // Board v2 (P-147 §3): folded to one line by default; it is the first thing on the tab and changes rarely.
  const [unfolded, setUnfolded] = React.useState(false);
  const [lines, setLines] = React.useState<Line[]>(() => toLines(v));
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  const [confirm, setConfirm] = React.useState<{ text: string; roles: string[] } | null>(null);
  const [stale, setStale] = React.useState<string | null>(null);
  const [filling, setFilling] = React.useState(false);
  // Slice 3: a proposal from the guide goes into the editor; nothing is saved until the person saves it.
  // Lead check L8: it starts from the editor's lines, so unsaved edits stay; L3: rules-only lines are the rules', not AI's.
  const useProposal = (pr: PeopleProposal) => {
    const origin = pr.mode === "rules" ? "CODE_MATCH" : "AI_PROPOSAL";
    // C11.12 BR-8: the guide proposes people and counts, not filing modes, so each role keeps the mode it had.
    setLines((now) => { const base = editing ? now : toLines(v); const modeOf = (role: string) => base.find((l) => l.role === role)?.filingMode ?? null;
      return [...base.filter((l) => !pr.people.some((x) => x.role === l.role)), ...pr.people.map((x): Line => ({ role: x.role, label: x.label, min: x.min, max: x.max, applies: appliesOf(modeOf(x.role), x.applies), filingMode: modeOf(x.role), quote: x.quote, origin }))]; });
    setEditing(true); setFilling(false);
  };
  React.useEffect(() => { if (!editing) setLines(toLines(v)); }, [v, editing]);
  const role = (k: string) => v.roles.find((r) => r.key === k);
  const offered = v.roles.filter((r) => r.takesPartInCase && !r.retired && !lines.some((l) => l.role === r.key));
  const set = (i: number, p: Partial<Line>) => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const refresh = () => { for (const k of [["combination", id], ["combination-summary", id], ["config", id], ["catalogue"], ["draft"]]) void qc.invalidateQueries({ queryKey: k }); };
  const save = async (confirmRemove = false) => {
    setBusy(true); setErrors({});
    try {
      await api(`/combinations/${id}/people`, { method: "PATCH", json: { participants: lines, version: v.version, confirmRemove } });
      toast.push({ tone: "ok", text: "Who can be in this application saved to the draft" }); setEditing(false); setConfirm(null); setStale(null); refresh();
    } catch (e) {
      const err = e as ApiError;
      const conflict = err.problem as { confirm?: boolean; lines?: { roles: string[] }[] };
      if (err.status === 409 && conflict.confirm) setConfirm({ text: err.message, roles: [...new Set((conflict.lines ?? []).flatMap((l) => l.roles))] });
      else if (err.status === 409) setStale(err.message);
      else { const fe: Record<string, string> = {}; for (const x of err.problem?.errors ?? []) fe[x.field] = x.message; if (Object.keys(fe).length) setErrors(fe); else toast.push({ tone: "danger", text: err.message }); }
    } finally { setBusy(false); }
  };
  const undo = async () => {
    setBusy(true);
    try { await api(`/combinations/${id}/people/undo`, { method: "POST", json: { version: v.version } }); toast.push({ tone: "ok", text: "Last change undone" }); refresh(); }
    catch (e) { toast.push({ tone: "danger", text: (e as Error).message }); refresh(); } finally { setBusy(false); }
  };
  const err = (i: number, f: string) => errors[`participants[${i}].${f}`];
  // QA-77 (C11.12, L7): one name per person on the page, as the header and Overview say it: the combination's own label
  // (kept when typed on purpose), else the shared library's name.
  const nameOf = (l: { role: string; label?: string | null }) => l.label || role(l.role)?.label || l.role;
  const shown = editing ? lines : toLines(v);
  // C11.12 (P-233): the words, warnings and "What a case gets" are worked out here with the server's own pure functions
  // (engine/filing-modes.ts), so they follow each edit before Save and match what the save and a case will do.
  const words = (l: Line) => filingWords({ role: l.role, filingMode: l.filingMode ?? null, applies: l.applies }, !!role(l.role)?.mayBeApplicant, v.feesKnown, v.combinationLabel);
  const warnings = filingWarnings(v.combinationKey, shown.map((l) => ({ role: l.role, label: nameOf(l), filingMode: l.filingMode ?? null })));
  const warningOf = (r: string) => { const name = nameOf(shown.find((l) => l.role === r) ?? { role: r }); return warnings.find((w) => w.startsWith(`${name}:`)) ?? null; };
  const gets = previewFilings(shown.map((l) => ({ ...l, label: nameOf(l), filingMode: l.filingMode ?? null })), v.combinationLabel, v.feesKnown, (r) => v.defaults[r]);
  if (!unfolded && !editing && !filling) return (
    <section aria-labelledby="who-can-be" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface-raised px-5 py-3 shadow-sm" data-who-can-be data-folded>
      <p className="min-w-0 text-sm"><span id="who-can-be" className="font-semibold">Who can be in this application</span> <span className="text-text-muted" data-people-words>· {peopleWords(shown, nameOf)}</span></p>
      <Button size="sm" variant="ghost" onClick={() => setUnfolded(true)} aria-expanded={false}><FoldArrow /> {canAuthor ? "Show and edit" : "Show"}</Button>
    </section>
  );
  return (
    <section aria-labelledby="who-can-be" className="rounded-xl border border-border bg-surface-raised p-5 shadow-sm" data-who-can-be>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="who-can-be" className="flex items-center gap-2 font-semibold">Who can be in this application <Tip tip={TIPS.card} focusable><span aria-label="What this sets" className="inline-flex size-4 cursor-help items-center justify-center rounded-full border border-border-strong text-[10px] text-text-muted">i</span></Tip></h2>
          <p className="mt-0.5 text-xs text-text-muted">{v.savedBy ? `Last changed by ${v.savedBy}${v.savedAt ? ` at ${new Date(v.savedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : ""}` : "As set when the combination was created"} · numbers Sample until the immigration expert confirms</p>
        </div>
        {canAuthor && !editing ? <div className="flex flex-wrap gap-2">{v.canUndo ? <Button size="sm" variant="ghost" onClick={() => void undo()} busy={busy}><Undo2 /> Undo last change</Button> : null}<Button size="sm" variant="ghost" onClick={() => setFilling(true)}><BookOpen /> Fill from the guide</Button><Button size="sm" variant="secondary" onClick={() => { setLines(toLines(v)); setEditing(true); }}>Edit</Button></div> : null}
      </div>
      {stale ? <Notice tone="warn" className="mt-3" title="Changed by someone else" action={<Button size="sm" variant="secondary" onClick={() => { setStale(null); setEditing(false); refresh(); }}>Reload their version</Button>}>{stale}</Notice> : null}
      {/* Board r2: under 760 px (phone, 200 % zoom) each row becomes a card with its field names. */}
      <table className="mt-3 w-full text-sm max-[759px]:block max-[759px]:[&_thead]:hidden max-[759px]:[&_tbody]:block max-[759px]:[&_tr]:block max-[759px]:[&_tr]:py-2 max-[759px]:[&_td]:block max-[759px]:[&_td]:py-1 max-[759px]:[&_td]:max-w-none max-[759px]:[&_td[data-label]]:before:block max-[759px]:[&_td[data-label]]:before:text-xs max-[759px]:[&_td[data-label]]:before:text-text-muted max-[759px]:[&_td[data-label]]:before:content-[attr(data-label)] [&_td]:[overflow-wrap:anywhere]">
        <thead><tr className="border-b border-border text-left text-xs text-text-muted">
          <th className="py-2 pr-3 font-medium">Person</th>
          <th className="py-2 pr-3 font-medium"><Tip tip={TIPS.many} focusable><span className="cursor-help underline decoration-dotted underline-offset-4">How many</span></Tip></th>
          <th className="py-2 pr-3 font-medium"><Tip tip={TIPS.filing} focusable><span className="cursor-help underline decoration-dotted underline-offset-4">Filing</span></Tip></th>
          <th className="py-2 pr-3 font-medium"><Tip tip={TIPS.answered} focusable><span className="cursor-help underline decoration-dotted underline-offset-4">Answered by</span></Tip></th>
          <th className="py-2 pr-3 font-medium"><Tip tip={TIPS.fees} focusable><span className="cursor-help underline decoration-dotted underline-offset-4">Fees</span></Tip></th>
          <th className="py-2 pr-3 font-medium"><Tip tip={TIPS.words} focusable><span className="cursor-help underline decoration-dotted underline-offset-4">IRCC's words</span></Tip></th>
          {editing ? <th className="py-2 font-medium"><span className="sr-only">Remove</span></th> : null}
        </tr></thead>
        <tbody>
          {shown.map((l, i) => {
            const r = role(l.role); const principal = l.role === "principal";
            return (
              <tr key={l.role} className="border-b border-border last:border-0 align-top" data-person={l.role}>
                <td className="py-2 pr-3"><span className="font-medium">{nameOf(l)}</span>{r && r.label !== nameOf(l) ? <p className="text-xs text-text-muted" data-library-role>role: {r.label}</p> : null}{r && !r.mayBeApplicant ? <p className="text-xs text-text-muted">never an applicant</p> : null}{err(i, "role") ? <p role="alert" className="text-xs text-text-danger">{err(i, "role")}</p> : null}</td>
                <td className="py-2 pr-3" data-label="How many">{editing && !principal ? (
                  <span className="flex items-center gap-1.5"><Input aria-label={`Fewest ${nameOf(l)}`} className="h-8 w-14" inputMode="numeric" value={String(l.min)} onChange={(e) => set(i, { min: Number(e.target.value.replace(/\D/g, "").slice(0, 1) || 0) })} /><span className="text-text-muted">to</span><Input aria-label={`Most ${nameOf(l)}`} className="h-8 w-14" inputMode="numeric" value={String(l.max)} onChange={(e) => set(i, { max: Number(e.target.value.replace(/\D/g, "").slice(0, 1) || 0) })} /></span>
                ) : howMany(l)}{err(i, "max") || err(i, "min") ? <p role="alert" className="text-xs text-text-danger">{err(i, "max") ?? err(i, "min")}</p> : null}</td>
                <td className="py-2 pr-3" data-label="Filing" data-filing={l.filingMode ?? (principal ? "files_own" : "")}><FilingCell l={l} i={i} editing={editing} mayBeApplicant={!!r?.mayBeApplicant} name={nameOf(l)} words={words(l)} warning={warningOf(l.role)} error={err(i, "filingMode") ?? err(i, "applies")} onMode={(m) => set(i, { filingMode: m, applies: appliesOf(m, l.applies) && !!r?.mayBeApplicant })} /></td>
                <td className="py-2 pr-3 text-text-muted" data-label="Answered by">{v.lines.find((x) => x.role === l.role)?.answeredBy ?? (l.role === "child" ? "Principal, under 18" : "Themselves")}</td>
                <td className="max-w-56 py-2 pr-3 text-xs text-text-muted" data-label="Fees" data-fees>{words(l).fees ?? (r?.mayBeApplicant ? "—" : "No fee")}</td>
                <td className="max-w-72 py-2 pr-3 text-xs text-text-muted" data-label="IRCC's words">{l.quote ? `"${l.quote}"` : l.origin === "AI_PROPOSAL" || l.origin === "CODE_MATCH" ? "" : "—"}{l.origin === "AI_PROPOSAL" ? <Pill tone="ai" className="ml-1">AI</Pill> : l.origin === "CODE_MATCH" ? <span data-origin-rules><Pill className="ml-1" title="Found by rules in the guide's sentences; no AI">Rules</Pill></span> : null}</td>
                {editing ? <td className="py-2">{principal ? null : <Button size="icon" variant="ghost" aria-label={`Remove ${nameOf(l)}`} onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}><X /></Button>}</td> : null}
              </tr>
            );
          })}
        </tbody>
      </table>
      {errors.participants ? <p role="alert" className="mt-2 text-xs text-text-danger">{errors.participants}</p> : null}
      <WhatACaseGets gets={gets} />
      {editing ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
          <span className="flex min-w-0 flex-wrap items-center gap-2">
            {offered.length ? <AddPerson offered={offered} onAdd={(k) => { const r = role(k)!; setLines((ls) => [...ls, { role: k, label: r.label, min: 0, max: 1, applies: r.mayBeApplicant, filingMode: v.lines.find((x) => x.role === k)?.filingMode ?? null, origin: "HUMAN" }]); }} /> : <span className="text-xs text-text-muted">Every kind of person in the shared library is listed.</span>}
            <span className="text-xs text-text-muted">Picks from Shared library › Person roles. A new kind of person is added there.</span>
          </span>
          <span className="flex flex-wrap gap-2"><Button variant="ghost" onClick={() => setFilling(true)}><BookOpen /> Fill from the guide</Button><Button variant="ghost" onClick={() => { setEditing(false); setErrors({}); }}>Cancel</Button><Button onClick={() => void save()} busy={busy}>Save</Button></span>
        </div>
      ) : null}
      <p className={cn("mt-3 text-xs text-text-muted", editing ? "" : "sr-only")}>Rules check on Save: exactly one principal applicant, who files their own · how many from 0 to 9, the fewest no more than the most · a sponsor or representative is never an applicant · every applicant role needs a filing before release · removing a person a form names asks first.</p>
      {filling ? <FillFromGuide id={id} onClose={() => setFilling(false)} onUse={useProposal} /> : null}
      {confirm ? <Dialog open onOpenChange={(o) => !o && setConfirm(null)} title="Remove a person that forms name?" description={confirm.text} footer={<><Button variant="ghost" onClick={() => { const back = toLines(v).filter((l) => confirm.roles.includes(l.role) && !lines.some((x) => x.role === l.role)); setLines((ls) => [...ls, ...back]); setConfirm(null); }}>Keep the person</Button><Button variant="destructive" onClick={() => void save(true)} busy={busy}>Save anyway</Button></>}><p className="text-sm text-text-muted">Those forms stay in the combination but name nobody until you add the person back or change whose form it is.</p></Dialog> : null}
    </section>
  );
}

type FillMode = "rules" | "replay" | "live";
const FILL_MODES: [FillMode, string, string][] = [
  ["rules", "Rules only (US$0)", "No AI: rules find the guide's sentences that name each person. How many is a Sample default you check."],
  ["replay", "Saved", "Replays what AI answered for this exact guide before. Until a live trial records one, it says there is none."],
  ["live", "Live", "Two AI rounds read the guide; only lines both agree on, with their sentence in the guide, are proposed. The cost is shown below before it starts."],
];

/** "Fill from the guide" (slice 3, P-121): the plan and its cost first, then the proposal with IRCC's words. */
function FillFromGuide({ id, onClose, onUse }: { id: string; onClose: () => void; onUse: (p: PeopleProposal) => void }) {
  const [mode, setMode] = React.useState<FillMode>("rules");
  const plan = useQuery<PeoplePlan, ApiError>({ queryKey: ["people-plan", id, mode], queryFn: () => api<PeoplePlan>(`/combinations/${id}/people/propose/plan`, { method: "POST", json: { mode } }), retry: false });
  // Lead check L2 (Devin Review, PR #71): whether AI now may run is the server's answer (the rules plan carries it); the
  // choice stays greyed until that answer says approved, and the API refuses a live run either way.
  const rules = useQuery<PeoplePlan, ApiError>({ queryKey: ["people-plan", id, "rules"], queryFn: () => api<PeoplePlan>(`/combinations/${id}/people/propose/plan`, { method: "POST", json: { mode: "rules" } }), retry: false });
  const live = rules.data?.live ?? { approved: false, why: null };
  const [result, setResult] = React.useState<PeopleProposal | null>(null);
  const [busy, setBusy] = React.useState(false), [error, setError] = React.useState<string | null>(null);
  // QA-91 (C11.12, P-110): AI now answers with a run; its card shows each step and Stop, then the proposal is read.
  const [runId, setRunId] = React.useState<string | null>(null);
  const run = async () => {
    if (!plan.data) return;
    setBusy(true); setError(null);
    try {
      const r = await api<PeopleProposal | { runId: string }>(`/combinations/${id}/people/propose`, { method: "POST", json: { mode, planSha256: plan.data.plan_sha256 } });
      if ("runId" in r) setRunId(r.runId); else setResult(r);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  const ended = React.useCallback(async (v: { status: string; message: string | null }) => {
    if (v.status !== "done" && v.status !== "done_with_problems") { setError(v.message ?? "The run ended before AI proposed anything. Fill it again, or use rules only."); return; }
    try { setResult(await api<PeopleProposal>(`/combinations/${id}/people/runs/${runId}`)); setRunId(null); } catch (e) { setError((e as Error).message); }
  }, [id, runId]);
  const footer = runId && !result
    ? <><Button variant="ghost" onClick={() => { setRunId(null); setError(null); }}>Back</Button></>
    : result
    ? <><Button variant="ghost" onClick={() => setResult(null)}>Back</Button><Button onClick={() => onUse(result)} disabled={!result.people.length}>Use these lines</Button></>
    : <><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => void run()} busy={busy} disabled={!plan.data}><BookOpen /> Fill</Button></>;
  return (
    <Dialog open wide onOpenChange={(o) => { if (!o) onClose(); }} title="Fill who can be in this application from the guide" description={plan.data ? `From ${plan.data.guide.code}: ${plan.data.guide.title}. Nothing is saved until you use the lines and save. Sample until the immigration expert confirms.` : "From the IRCC guide linked to this combination."} footer={footer}>
      {runId && !result ? (
        <div className="space-y-3" data-people-run>
          <RunCard runId={runId} onEnded={(v) => void ended(v)} />
          {error ? <p role="alert" className="text-sm text-text-danger">{error}</p> : null}
        </div>
      ) : result ? (
        <div className="space-y-3 text-sm" data-people-proposal>
          <p>{result.note}</p>
          {result.people.length ? <Table dense head={["Person", "How many", "Applicant", "IRCC's words"]}>{result.people.map((x) => <tr key={x.role} data-proposed={x.role}><td>{x.label}</td><td>{howMany(x)}</td><td>{x.applies ? "Yes" : "No"}</td><td className="max-w-md text-xs text-text-muted">"{x.quote}"{x.why ? <p className="mt-0.5">{x.why}</p> : null}</td></tr>)}</Table> : null}
          {result.to_decide.length ? <Notice tone="warn" title={`To decide (${result.to_decide.length})`}><ul className="space-y-0.5">{result.to_decide.map((x) => <li key={x.role}>{x.role.replace(/_/g, " ")}: first round {x.draft}, second round {x.check}. {x.why}</li>)}</ul></Notice> : null}
          {result.dropped.length ? <p className="text-xs text-text-muted">Not proposed: {result.dropped.map((x) => `${x.role.replace(/_/g, " ")} (${x.why})`).join(" · ")}</p> : null}
        </div>
      ) : (
        <div className="space-y-4" data-people-plan>
          <fieldset className="space-y-2"><legend className="text-xs font-medium">How to fill it</legend>
            {FILL_MODES.map(([m, label, hint]) => { const off = m === "live" && !live.approved; return <label key={m} className={`flex gap-2 text-sm${off ? " text-text-muted" : ""}`} data-fill-mode={m}><input type="radio" name="fill-mode" checked={mode === m} onChange={() => setMode(m)} disabled={off} className="mt-1" /><span><span className="font-medium">{off ? "Live (not approved yet)" : label}</span><br /><span className="text-xs text-text-muted">{off ? live.why ?? "Checking whether AI now is approved…" : hint}</span></span></label>; })}
          </fieldset>
          {plan.isPending ? <p className="text-sm text-text-muted">Working out the steps and their cost…</p> : plan.error ? <Notice tone="warn" title="It cannot be filled yet">{plan.error.message}</Notice> : plan.data ? (
            <div className="rounded-lg border border-border p-3 text-sm">
              <ol className="list-decimal space-y-0.5 pl-5">{plan.data.steps.map((x) => <li key={x.n}>{x.label} {x.uses_ai ? <Pill tone="ai">AI</Pill> : <Pill>rules</Pill>}</li>)}</ol>
              <p className="mt-2 font-medium" data-people-cost>{mode === "live" ? `At most US$${plan.data.totals.worst_usd.toFixed(2)}, inside the AI spending cap (US$${plan.data.totals.remaining_usd.toFixed(2)} left).` : "Cost: US$0 (no AI call)."}</p>
              <p className="mt-1 text-xs text-text-muted">{plan.data.note}</p>
            </div>
          ) : null}
          {error ? <p role="alert" className="text-sm text-text-danger">{error}</p> : null}
        </div>
      )}
    </Dialog>
  );
}

function AddPerson({ offered, onAdd }: { offered: { key: string; label: string; meaning: string }[]; onAdd: (k: string) => void }) {
  const [k, setK] = React.useState("");
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-2">
      <Select aria-label="Person to add" className="h-8 w-56 max-w-full" value={k} onChange={(e) => setK(e.target.value)}><option value="">Choose a person…</option>{offered.map((r) => <option key={r.key} value={r.key} title={r.meaning}>{r.label}</option>)}</Select>
      <Button size="sm" variant="secondary" disabled={!k} onClick={() => { onAdd(k); setK(""); }}><Plus /> Add a person</Button>
    </span>
  );
}

// ------------------------------------------------------------------ PQR (M2 queue item 2; C4.2, C4.8; P-76, P-132)

/** The "Pre-qualification" chip's header: this person's PQR in this combination (the one per-combination record, P-132),
 *  how it is asked and confirmed, and the country PQR, a view of the released combinations, never a separate record. */
function PqrSet({ id, roleLabel, n }: { id: string; roleLabel: string; n: number }) {
  const country = useQuery<CountryPqrView, ApiError>({ queryKey: ["pqr-country", id], queryFn: () => api<CountryPqrView>(`/combinations/${id}/pqr/country`) });
  const [open, setOpen] = React.useState(false);
  const c = country.data;
  const pending = c ? c.thisCombination.draftAdds.length + c.thisCombination.draftRemoves.length : 0;
  const { canAuthor } = useSessionView();
  return (
    <section aria-label="Prospect questionnaire (PQR) questions" className="space-y-2 rounded-xl border border-border bg-surface-raised p-4" data-pqr-set>
      <p className="text-sm"><span className="font-medium">{roleLabel}: {n} Prospect questionnaire (PQR) question{n === 1 ? "" : "s"} in this combination.</span> <span className="text-text-muted">A prospect answers them before a case starts; the client questionnaire later shows each answer as "please confirm", and a document read that differs is a check, not an overwrite. A tick goes out with this combination's next release, checked with everything else in it.</span></p>
      {canAuthor ? <div className="flex items-center gap-2"><DraftPqrPicks id={id} /><span className="text-xs text-text-muted">Picks with a reason each go to To review, where you accept or remove each.</span></div> : null}
      {country.error ? <Notice tone="warn" title="The country Prospect questionnaire (PQR) could not load">{country.error.message} <button type="button" className="font-medium text-text-link underline" onClick={() => void country.refetch()}>Retry</button></Notice> : null}
      {c ? (
        <div className="text-sm" data-pqr-country>
          <p><span className="font-medium">Country Prospect questionnaire (PQR):</span> {c.lines.length} question{c.lines.length === 1 ? "" : "s"} from {c.combinations} of {c.released} released combination{c.released === 1 ? "" : "s"}. It is put together from each combination's newest release, so nothing is set there.{pending ? <span className="text-text-muted" data-pqr-pending> This combination's draft changes {pending} line{pending === 1 ? "" : "s"} at its next release.</span> : null}{" "}
            {c.lines.length ? <button type="button" className="font-medium text-text-link underline" aria-expanded={open} onClick={() => setOpen(!open)}><FoldArrow open={open} className="mr-0.5" />{open ? "Hide the list" : "Show the list"}</button> : null}</p>
          {open ? (
            <div className="mt-2">
              <Table dense head={["Question", "Person", "Asked by"]} label="Country Prospect questionnaire (PQR) questions">
                {c.lines.map((l) => <tr key={`${l.role}|${l.fact}`} data-pqr-line={`${l.role}|${l.fact}`}><td className="font-medium">{l.label}</td><td>{l.roleLabel}</td><td className="text-xs">{l.combinations.map((x) => `${x.label} (release ${x.release})`).join(" · ")}</td></tr>)}
              </Table>
              <p className="mt-1 text-xs text-text-muted">{c.basis}.</p>
            </div>
          ) : null}
        </div>
      ) : <div className="h-6 animate-pulse rounded bg-surface" aria-hidden />}
    </section>
  );
}

// ------------------------------------------------------------------ questions per person (W1-15 slice 2, P-147)

/** One person role's questions as a case asks them, each row five things: Question · Comes from · Pre-qualification ·
 *  Only if · Status (board v2 frames 1–2). The strip and the chips on top; ⋯ menu and the side drawer per row; the bulk
 *  bar while rows are ticked. Facts no question asks (from a document or the case officer) are listed after the sections. */
function QuestionsByPerson({ id, q, available }: { id: string; q: QuestionnairesView | null; available: { key: string; title: string }[] }) {
  const [sp, setSp] = useSearchParams();
  const { canAuthor } = useSessionView();
  const [add, setAdd] = React.useState("");
  const [shown, setShown] = React.useState<{ fact: string; q: QuestionnaireQuestion | null; section: string | null } | null>(null);
  const [filter, setFilter] = React.useState<Filter>("all");
  // X1 (slice C2): a ?focus= link from the setup checklist lands here (questionnaires:gaps, questionnaires:problems).
  // Review m3: the from-release notice waits for the summary, so nothing counts as gone before it is in.
  const sumForFocus = useApi<CombinationSummary>(["combination-summary", id], `/combinations/${id}/summary`);
  const doneSince = useFocusItem(sumForFocus.data ? [] : undefined, (k) => k.startsWith("questionnaires:") || k === "questions_documents:problems");
  const [picked, setPicked] = React.useState<Set<string>>(new Set());
  const [refused, setRefused] = React.useState<BulkSourceResult["refused"]>([]);
  const fs = useFactSources(id);
  const refresh = useRefreshSources(id);
  const undoToast = useUndoToast();
  // Only the first section is open at first (146 questions on the work permit); each folds and "Open all" opens them all.
  const [openIds, setOpenIds] = React.useState<Set<string> | null>(null);
  const [removing, setRemoving] = React.useState<{ key: string; title: string } | null>(null);
  const qc = useQueryClient();
  // C4.1 (P-216): the combination's own section order (the sections it chose); Move up / Move down on each header.
  const secOrder = useQuery({ queryKey: ["section-order", id], queryFn: () => api<{ order: { key: string; title: string }[] }>(`/combinations/${id}/section-order`) });
  const [moved, setMoved] = React.useState<string | null>(null);
  const [moveRefused, setMoveRefused] = React.useState<string | null>(null);
  const moving = React.useRef(false); // a double click sends one move, not a second one from the order before it
  const sel = useAction((b: { key: string; on: boolean }) => api(`/combinations/${id}/sections/${b.key}`, { method: b.on ? "POST" : "DELETE" }), { success: "Smart questionnaire (SQR) sections updated", invalidate: [["combination", id], ["combination-summary", id], ["config", id], ["catalogue"], ["draft"], ["preview"], ["fact-sources", id], ["section-order", id]] });
  React.useEffect(() => { setPicked(new Set()); setFilter("all"); }, [q?.role]);
  // QA-93 (P-116): removing a section asks first, says what goes for whom, then offers one Undo that puts it back in its place.
  // The draft bar and the header read draft, combination-summary and catalogue: refresh them too (review #348 M1).
  const reload = () => { for (const k of [["combination", id], ["combination-summary", id], ["config", id], ["catalogue"], ["draft"], ["preview"], ["fact-sources", id], ["section-order", id]]) void qc.invalidateQueries({ queryKey: k }); };
  const move = async (x: { key: string; title: string }, direction: "up" | "down", undo = false) => {
    if (moving.current) return;
    moving.current = true;
    try { await moveOnce(x, direction, undo); } finally { moving.current = false; }
  };
  const moveOnce = async (x: { key: string; title: string }, direction: "up" | "down", undo: boolean) => {
    const seen = (qc.getQueryData<{ order: { key: string }[] }>(["section-order", id])?.order ?? []).map((y) => y.key);
    let r: { position: number; of: number; order: { key: string; title: string }[] };
    try { r = await api(`/combinations/${id}/sections/${x.key}/move`, { method: "POST", json: { direction, seen } }); }
    catch (e) { setMoveRefused(`"${x.title}" was not moved: ${(e as Error).message.replace(/ Reload to see the order now, then move it again\.$/, " The order shown now is the current one; move it again if you still want to.")}`); reload(); return; }
    setMoveRefused(null);
    qc.setQueryData(["section-order", id], { order: r.order });
    setMoved(`${x.key}|${direction}`); reload();
    if (!undo) undoToast.show(`"${x.title}" moved ${direction}: now ${r.position} of ${r.of} sections, for every person`, () => move(x, direction === "up" ? "down" : "up", true));
  };
  // Keep the keyboard on the button that was pressed after the section changes place (React moves the node), once:
  // the next render belongs to whatever the author does next (review Major 1).
  React.useEffect(() => {
    if (!moved) return;
    const [key, dir] = moved.split("|");
    const b = document.querySelector<HTMLButtonElement>(`[data-section="${CSS.escape(key)}"] [data-move="${dir}"]`);
    if (b && !b.disabled) b.focus(); else document.querySelector<HTMLButtonElement>(`[data-section="${CSS.escape(key)}"] [data-move]:not(:disabled)`)?.focus();
    setMoved(null);
  }, [moved]);
  const remove = async (x: { key: string; title: string }) => {
    let r: { sectionOrder: number | null };
    try { r = await api<{ sectionOrder: number | null }>(`/combinations/${id}/sections/${x.key}`, { method: "DELETE" }); }
    catch (e) { setRemoving(null); setRefused([{ role: "", fact: "", label: "", message: `"${x.title}" was not removed: ${(e as Error).message}` }]); return; }
    setRemoving(null); reload();
    undoToast.show(`"${x.title}" removed from the questionnaire`, async () => { await api(`/combinations/${id}/sections/${x.key}`, { method: "POST", json: { sectionOrder: r.sectionOrder } }); reload(); });
  };
  const addSection = canAuthor ? (
    <div className="flex flex-wrap items-center gap-2" data-add-section>
      <Select aria-label="Library section to add" className="h-8 w-72" value={add} onChange={(e) => setAdd(e.target.value)}><option value="">Add a library section…</option>{available.map((x) => <option key={x.key} value={x.key}>{x.title}</option>)}</Select>
      <Button size="sm" variant="secondary" disabled={!add} busy={sel.isPending} onClick={() => { sel.mutate({ key: add, on: true }); setAdd(""); }}><Plus /> Add section</Button>
    </div>
  ) : null;
  if (!q) return (
    <section className={cn("rounded-xl border border-border bg-surface-raised p-5", FOCUS_RING)} data-questions-empty data-focus="questionnaires:gaps">
      <DoneSinceNotice shown={doneSince} />
      <h2 className="font-semibold">No questions yet</h2>
      <p className="mt-1 text-sm text-text-muted">The questions each person needs come from the facts their forms read. Add forms on the Forms tab, or a library section here.</p>
      <div className="mt-3">{addSection}</div>
    </section>
  );
  const role = q.roles.find((r) => r.role === q.role);
  // Facts about the case itself (the file number, the office) belong to no person: they show where their question sits,
  // and with the principal applicant when no question asks them.
  const placedFacts = new Set(q.sections.flatMap((s) => s.questions.map((x) => x.fact)));
  const rows = (fs.data?.facts ?? []).filter((f) => f.role === q.role || (f.role === "case" && (q.role === "principal" || placedFacts.has(f.fact))));
  const byFact = new Map<string, FactSourceRow>(); for (const f of rows) if (f.role === q.role || !byFact.has(f.fact)) byFact.set(f.fact, f);
  const checks = new Map<string, string>(); for (const p of fs.data?.problems ?? []) if ((p.role === q.role || (p.role === "case" && byFact.get(p.item)?.role === "case")) && p.level === "error" && !checks.has(p.item)) checks.set(p.item, p.message);
  const unasked = [...byFact.values()].filter((f) => !placedFacts.has(f.fact));
  const keep = (fact: string) => { const f = byFact.get(fact); return filter === "all" || (filter === "needs" ? checks.has(fact) : filter === "pqr" ? !!f?.prequalification : f?.source === filter); };
  const opened = openIds ?? new Set(q.sections[0] ? [q.sections[0].id] : []);
  const allOpen = q.sections.every((s) => opened.has(s.id));
  // UX-A part 1 (review m3): the footer says the chip's count (the one question count), never its own sum.
  const total = q.roles.find((r) => r.role === q.role)?.questions ?? 0;
  const pickedRows = [...byFact.values()].filter((f) => picked.has(f.fact));
  const mine = [...byFact.values()];
  // UX-A part 1 (review m3): the person's form facts by the one rule (contracts/counts.ts), as the Draft dialog counts them.
  const counted = personFactRows(fs.data?.facts ?? [], q.role);
  const count = (src: FactSourceRow["source"]) => counted.filter((f) => f.source === src).length;
  const toggle = (facts: string[], on: boolean) => setPicked((now) => { const n = new Set(now); for (const x of facts) if (on) n.add(x); else n.delete(x); return n; });
  const backToRules = async (f: FactSourceRow, label: string) => {
    try {
      await api(`/combinations/${id}/fact-sources/${encodeURIComponent(f.role)}/${encodeURIComponent(f.fact)}`, { method: "PUT", json: { source: f.ruleSource, documentTypeKey: f.ruleSource === "DOCUMENT" ? f.ruleDocument?.key ?? null : null, version: f.version } });
      refresh();
      undoToast.show(`"${label}" is back to the rules' default`, f.change?.status === "DRAFT" ? undefined : async () => { await api(`/combinations/${id}/fact-sources/${encodeURIComponent(f.role)}/${encodeURIComponent(f.fact)}`, { method: "DELETE", json: { version: f.version + 1 } }); refresh(); });
    } catch (e) { setRefused([{ role: f.role, fact: f.fact, label, message: (e as Error).message }]); }
  };
  const menu = (fact: string, label: string, x: QuestionnaireQuestion | null, section: string | null) => {
    const f = byFact.get(fact);
    const open = () => setShown({ fact, q: x, section });
    return <RowMenu name={label} items={[
      { label: "Open details", onSelect: open },
      { label: "Change where it comes from…", why: !canAuthor ? SAY.readOnly : !f ? "No form needs it, so it has no source to change." : f.clientOnly ? SAY.clientOnly : null, onSelect: open },
      { label: "Back to the rules' default", why: !canAuthor ? SAY.readOnly : !f || f.proposedBy === "Rules" ? SAY.atDefault : null, onSelect: () => f && void backToRules(f, label) },
      { label: "Change in the library…", href: `/library/fields/${encodeURIComponent(fact)}` },
      { label: "Move up or down", why: section ? SAY.order(section) : "No question asks it, so it has no place in a section." },
      { label: "Retire", why: SAY.retire },
    ]} />;
  };
  const row = (fact: string, label: string, x: QuestionnaireQuestion | null, section: string | null) => {
    const f = byFact.get(fact);
    return (
      <tr key={fact} data-question data-fact={fact} className={cn(picked.has(fact) ? "bg-primary/5" : "")}>
        {canAuthor ? <td className="w-8"><input type="checkbox" aria-label={`Select ${label}`} disabled={!f} checked={picked.has(fact)} onChange={(e) => toggle([fact], e.target.checked)} data-row-tick /></td> : null}
        <td className="max-w-md"><button type="button" className="text-left font-medium hover:text-text-link hover:underline" aria-label={`Details of: ${label}`} onClick={() => setShown({ fact, q: x, section })}>{label}</button>{x && x.asked === false ? <span className="ml-1.5 text-xs text-text-muted" data-no-question >No question written yet (the field's name is shown)</span> : null}{x?.group ? <span className="text-xs text-text-muted"> · asked for each entry</span> : null}{x && !x.required ? <span className="text-xs text-text-muted"> (optional)</span> : null}</td>
        <td><ComesFrom f={f} fallbackless={!!f && f.source === "DOCUMENT" && !f.placed} /></td>
        <td><PreQual f={f} /></td>
        <td className="max-w-56 text-xs">{x?.onlyIf ?? <span className="text-text-muted">{x ? "Always" : "—"}</span>}</td>
        <td><RowStatus f={f} check={checks.get(fact)} /></td>
        <td className="w-10">{menu(fact, label, x, section)}</td>
      </tr>
    );
  };
  const head = (facts: string[]) => {
    const pickable = facts.filter((x) => byFact.has(x)); const all = pickable.length > 0 && pickable.every((x) => picked.has(x));
    return [...(canAuthor ? [<input key="all" type="checkbox" aria-label="Select every row in this section" disabled={!pickable.length} checked={all} onChange={(e) => toggle(pickable, e.target.checked)} />] : []), "Question", "Comes from", "PQR", "Only if", "Status", <span key="a" className="sr-only">Actions</span>];
  };
  return (
    <section aria-labelledby="questions-head" className="space-y-4" data-questions>
      <SourceStrip v={fs.data} />
      <DoneSinceNotice shown={doneSince} />
      {fs.error ? <Notice tone="warn" title="Where each answer comes from could not load">{fs.error.message} <button type="button" className="font-medium text-text-link underline" onClick={() => void fs.refetch()}>Retry</button></Notice> : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="questions-head" className="font-semibold">Questions for each person</h2>
        <span className="flex flex-wrap items-center gap-2">{canAuthor ? <DraftQuestionsDocuments id={id} /> : null}<Button size="sm" variant="ghost" onClick={() => setOpenIds(allOpen ? new Set() : new Set(q.sections.map((s) => s.id)))}>{allOpen ? "Close all sections" : "Open all sections"}</Button>{addSection}</span>
      </div>
      <div role="group" aria-label="Person" className="flex flex-wrap gap-1.5">
        {q.roles.map((r) => <button key={r.role} type="button" aria-pressed={r.role === q.role} data-role-chip={r.role} onClick={() => { const n = new URLSearchParams(sp); n.set("role", r.role); setSp(n, { replace: true }); }}
          className={cn("min-h-9 rounded-full border px-3 py-1 text-sm", r.role === q.role ? "border-primary bg-primary/10 font-medium text-text-link" : "border-border bg-surface-raised text-text-muted hover:bg-text/5")}>{r.label} · {r.questions} question{r.questions === 1 ? "" : "s"}{r.gaps ? <span className="ml-1 rounded bg-danger/12 px-1 text-xs text-text-danger">{r.gaps} not asked</span> : null}</button>)}
      </div>
      <SourceChips rows={mine} needs={checks.size} value={filter} onChange={setFilter} />
      <PartProblems id={id} part="questions" />
      {filter === "pqr" ? <PqrSet id={id} roleLabel={role?.label ?? q.role} n={mine.filter((f) => f.prequalification).length} /> : null}
      {pickedRows.length && canAuthor ? <BulkBar id={id} picked={pickedRows} onClear={() => setPicked(new Set())} onDone={(r, undo) => { setRefused(r.refused); if (r.saved) { setPicked(new Set()); undoToast.show(`${r.what.charAt(0).toUpperCase()}${r.what.slice(1)} for ${r.saved} question${r.saved === 1 ? "" : "s"}`, undo); } }} /> : null}
      {refused.length ? <Notice tone="warn" title={`${refused.length} row${refused.length === 1 ? "" : "s"} not changed`} action={<Button size="sm" variant="ghost" onClick={() => setRefused([])}>Dismiss</Button>}><ul className="mt-1 space-y-0.5" data-bulk-refused>{refused.map((x, i) => <li key={i}>{x.label && !x.message.includes(x.label) ? <><span className="font-medium">{x.label}</span>: </> : null}{x.message}</li>)}</ul></Notice> : null}
      {moveRefused ? <Notice tone="warn" title="Section not moved" action={<Button size="sm" variant="ghost" onClick={() => setMoveRefused(null)}>Dismiss</Button>}><span data-move-refused>{moveRefused}</span></Notice> : null}
      {undoToast.link ? <p className="text-xs text-text-muted" data-undo-note>Last change on this tab{undoToast.link}</p> : null}
      {/* S2-1 (Lead, 29 Oct): the same sources and numbers as the chips and the strip (slice 1's rules), not the older
          placement count (client or case officer). */}
      <p className={cn("text-sm", FOCUS_RING)} data-coverage data-focus={q.coverage.gaps.length ? undefined : "questionnaires:gaps"}><span className="font-medium">{role?.label}:</span> {fs.data ? <>{personFactsWords(counted.length, counted.filter((f) => f.role === APPLICATION_ROLE).length)} · {count("DOCUMENT")} from documents · {count("CLIENT")} asked of the client · {count("AGENT")} entered by the case officer</> : "working out where each answer comes from…"}{q.coverage.gaps.length ? <span className="text-text-danger"> · {q.coverage.gaps.length} asked of nobody</span> : null}</p>
      {q.coverage.gaps.length ? (
        <div className={FOCUS_RING} data-focus="questionnaires:gaps"><Notice tone="danger" title={`${q.coverage.gaps.length} answer${q.coverage.gaps.length === 1 ? " is" : "s are"} needed but asked of nobody: release waits for ${q.coverage.gaps.length === 1 ? "it" : "them"}`}>
          <ul className="mt-1 space-y-0.5" data-gaps>{q.coverage.gaps.slice(0, 8).map((g) => <li key={g.fact}>"{g.meaning}", needed by {g.forms.join(", ")}</li>)}</ul>
          <p className="mt-1">Fix: ask them in the sections of their form fields (the step below), add the library section that asks it, or have the case officer fill it (set once in the shared library).</p>
        </Notice></div>
      ) : !q.sections.length ? (
        <Notice tone="info" title="No section asks anything yet">
          <p>Once the forms' field maps are applied and their sections drafted (Forms tab), ask each answer the forms need in the section of its form field (the step below).</p>
        </Notice>
      ) : null}
      {/* QA-144 part 1: offered while answers are asked of nobody or no section asks anything; it stays mounted, so its
          result (what no section groups, what a rule refused) stays readable once the gaps are gone. */}
      <OwnQuestionsLine combinationId={id} />
      <PlaceFromFormParts id={id} offer={q.coverage.gaps.length > 0 || q.coverage.conditionFacts > 0 || !q.sections.length} />
      {q.sections.map((s) => {
        const isOpen = opened.has(s.id) || filter !== "all";
        const lines = s.questions.filter((x) => keep(x.fact));
        const locked = s.questions.length > 0 && s.questions.every((x) => byFact.get(x.fact)?.clientOnly);
        if (filter !== "all" && !lines.length) return null;
        const fromDocs = s.questions.filter((x) => byFact.get(x.fact)?.source === "DOCUMENT").length;
        return (
          <div key={s.id} className="rounded-xl border border-border bg-surface-raised" data-section={s.id}>
            <div className="flex items-center justify-between gap-2 pr-2">
              <button className="flex-1 px-4 py-3 text-left" aria-expanded={isOpen} onClick={() => { const n = new Set(opened); if (n.has(s.id)) n.delete(s.id); else n.add(s.id); setOpenIds(n); }}>
                <FoldArrow open={isOpen} className="mr-1.5 text-text-muted" /><span className="font-medium">{s.title}</span>{locked ? <span className="ml-2 inline-flex items-center gap-1 text-xs text-text-muted" data-client-only><Lock className="size-3.5" aria-hidden /> Always the client</span> : null} <span className="text-xs text-text-muted">· {s.questions.length} question{s.questions.length === 1 ? "" : "s"} for {role?.label ?? "this person"}{fromDocs ? ` · ${fromDocs} from documents` : ""}</span>
              </button>
              {canAuthor ? <MoveButtons s={s} order={secOrder.data?.order ?? null} onMove={(d) => void move({ key: s.id, title: s.title }, d)} /> : null}
              {/* QA-93: a question the shared library places in a section is asked whether or not the section is chosen, so
                  removing it here would only move it to the end. Offered only where it changes something: a section that
                  asks this person nothing. */}
              {canAuthor && !s.stillAsked ? (s.questions.length
                ? <span className="max-w-64 text-right text-xs text-text-muted" data-remove-why>Remove from questionnaire: not here. Its {s.questions.length} question{s.questions.length === 1 ? " is" : "s are"} placed in it in the shared library and stay{s.questions.length === 1 ? "s" : ""} asked; change the placement there.</span>
                : <Button size="sm" variant="ghost" onClick={() => setRemoving({ key: s.id, title: s.title })} aria-label={`Remove from questionnaire: ${s.title}`}>Remove from questionnaire</Button>) : null}
            </div>
            {/* C4.2 (P-294 (B)): a section taken out (or never chosen) whose questions forms still need says so. */}
            {s.stillAsked ? <p className="border-t border-border px-4 py-2 text-sm text-text-muted" data-still-asked><span className="font-medium text-text">{stillAskedWords(s.stillAsked)}</span> The section is not chosen for this combination: add it from the library above to give its questions their own place.</p> : null}
            {isOpen ? (lines.length ? (
              <div className="border-t border-border px-4 py-3">
                <Table dense head={head(lines.map((x) => x.fact))} label={`${s.title}: questions`}>
                  {lines.map((x) => row(x.fact, x.wording, x, s.title))}
                </Table>
              </div>
            ) : <p className="border-t border-border px-4 py-3 text-sm text-text-muted">This section asks {role?.label ?? "this person"} nothing for this combination.</p>) : null}
          </div>
        );
      })}
      {unasked.filter((f) => keep(f.fact)).length ? (
        <div className="rounded-xl border border-border bg-surface-raised" data-section="unasked">
          <p className="px-4 pt-3 font-medium">Answered without a question <span className="text-xs font-normal text-text-muted">· {unasked.length} fact{unasked.length === 1 ? "" : "s"} for {role?.label}: read from a document or entered by the case officer</span></p>
          <div className="px-4 py-3">
            <Table dense head={head(unasked.filter((f) => keep(f.fact)).map((f) => f.fact))} label="Answered without a question">
              {unasked.filter((f) => keep(f.fact)).map((f) => row(f.fact, factName(f.fact), null, null))}
            </Table>
          </div>
        </div>
      ) : null}
      <p className="text-xs text-text-muted">{total} question{total === 1 ? "" : "s"} for {role?.label}, from the largest household the combination allows. {q.notAsked ? `${q.notAsked} placed question${q.notAsked === 1 ? " is" : "s are"} not asked: no form reads ${q.notAsked === 1 ? "it" : "them"} and ${q.notAsked === 1 ? "it decides" : "they decide"} nothing.` : ""}</p>
      {/* QA-92: a fact about the case is saved under its own role ("case"), not the person whose tab shows it. */}
      {shown ? <FactDrawer key={`${q.role}|${shown.fact}|${byFact.get(shown.fact)?.version ?? 0}`} id={id} role={byFact.get(shown.fact)?.role ?? q.role} roleLabel={byFact.get(shown.fact)?.role === "case" ? "The case (asked once)" : role?.label ?? q.role} section={shown.section} q={shown.q} f={byFact.get(shown.fact)} canAuthor={canAuthor} onClose={() => setShown(null)} onSaved={(t, u) => undoToast.show(t, u)} /> : null}
      {removing ? <Dialog open onOpenChange={(o) => !o && setRemoving(null)} title={`Remove "${removing.title}" from the questionnaire?`} description="The sections are chosen once for the whole combination."
        footer={<><Button variant="ghost" onClick={() => setRemoving(null)}>Keep the section</Button><Button variant="destructive" data-confirm-remove onClick={() => void remove(removing)}>Remove section</Button></>}>
        <p className="text-sm text-text-muted" data-remove-what>It asks {role?.label ?? "this person"} nothing in this combination, so it leaves this list. A question it asks someone else stays asked: the shared library places it there. You can undo straight after, or add the section back from the library.</p>
      </Dialog> : null}
      {undoToast.node}
    </section>
  );
}

/** C4.1 (P-216): Move up and Move down on a section header. Only a section this combination chose has a place of its
 *  own; a greyed button says why in words (first, last, or placed by the library). */
function MoveButtons({ s, order, onMove }: { s: { id: string; title: string }; order: { key: string; title: string }[] | null; onMove: (d: "up" | "down") => void }) {
  if (!order) return null;
  const at = order.findIndex((x) => x.key === s.id);
  const not = at < 0 ? "This section is not chosen for this combination: its questions follow the chosen sections. Add it to give it a place." : null;
  const why = { up: not ?? (at === 0 ? `"${s.title}" is already the first section.` : null), down: not ?? (at === order.length - 1 ? `"${s.title}" is already the last section.` : null) };
  return (
    <span className="flex items-center gap-0.5" data-move-buttons>
      {(["up", "down"] as const).map((d) => (
        // A disabled button shows no tooltip, so the reason sits on its wrapper (and in its name for screen readers).
        <span key={d} title={why[d] ?? `Move ${d}: ${s.title}`} data-move-why={why[d] ?? undefined}>
          <Button size="sm" variant="ghost" data-move={d} disabled={!!why[d]} aria-label={`Move ${d}: ${s.title}${why[d] ? ` (${why[d]})` : ""}`} onClick={() => onMove(d)}>
            {d === "up" ? <ArrowUp aria-hidden /> : <ArrowDown aria-hidden />}<span className="sr-only sm:not-sr-only">Move {d}</span>
          </Button>
        </span>
      ))}
    </span>
  );
}
