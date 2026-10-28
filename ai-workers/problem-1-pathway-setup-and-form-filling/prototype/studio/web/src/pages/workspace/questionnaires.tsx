// S5 Questionnaires tab (W1-08, P-119, walkthrough v2 S5): "Who can be in this application" edited at the top (it decides
// each person's questions; challenge M3, M4), then slice 2's questions per person: wording, who fills it, only if, the
// forms that need it, coverage (a gap blocks release), field codes only in a question's side panel (early-look fix 3);
// the rules and checks used here fold below (m4). People pick from the shared library's person roles; a new kind of
// person is added there (S6), never here.
import * as React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { BookOpen, Plus, Undo2, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { FILLED_BY, type PeopleLine, type PeoplePlan, type PeopleProposal, type PeopleView, type QuestionnaireQuestion, type QuestionnairesView } from "../../../../contracts/workspace";
import { api, ApiError, useAction, useSessionView, useToast } from "@/lib/api";
import { Button, Dialog, Input, Notice, Panel, Pill, Select, Table } from "@/components/ui/controls";
import { Tip } from "@/components/status";
import { ConfigArea } from "@/pages/configuration";
import { cn } from "@/lib/utils";

const TIPS = {
  card: "Sets which people a case may include and how many; each person marked as applicant gets their own forms, questions and documents.",
  many: "The fewest and the most of this person a case may have. 0 to 1 means optional.",
  applicant: "Files their own application: gets their own copy of every form set to \"Each applicant\" and their own questions. A sponsor or representative never is.",
  answered: "Who types this person's answers. The principal answers for a child under 18 (Sample age, P-78); an adult confirms their own answers.",
  words: "The line in IRCC's guide this comes from, when AI filled it.",
};

export function QuestionnairesTab({ id, people, questionnaire, available }: { id: string; people: PeopleView; questionnaire: QuestionnairesView | null; available: { key: string; title: string }[] }) {
  return (
    <div className="space-y-6">
      <WhoCanBe id={id} v={people} />
      <QuestionsByPerson id={id} q={questionnaire} available={available} />
      <ConfigArea id={id} areas={["rules", "checks"]} />
    </div>
  );
}

type Line = PeopleLine & { label: string };
const toLines = (v: PeopleView): Line[] => v.lines.map((l) => ({ role: l.role, label: l.label, min: l.min, max: l.max, applies: l.applies, preview: l.preview, quote: l.quote ?? null, origin: l.origin }));
const howMany = (l: { min: number; max: number }) => (l.min === l.max ? (l.min === 1 ? "exactly 1" : `exactly ${l.min}`) : `${l.min} to ${l.max}`);

function WhoCanBe({ id, v }: { id: string; v: PeopleView }) {
  const qc = useQueryClient(); const toast = useToast();
  const { canAuthor } = useSessionView();
  const [editing, setEditing] = React.useState(false);
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
    setLines((now) => [...(editing ? now : toLines(v)).filter((l) => !pr.people.some((x) => x.role === l.role)), ...pr.people.map((x): Line => ({ role: x.role, label: x.label, min: x.min, max: x.max, applies: x.applies, quote: x.quote, origin }))]);
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
  const shown = editing ? lines : toLines(v);
  return (
    <section aria-labelledby="who-can-be" className="rounded-xl border border-border bg-surface-raised p-5 shadow-sm" data-who-can-be>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="who-can-be" className="flex items-center gap-2 font-semibold">Who can be in this application <Tip tip={TIPS.card} focusable><span aria-label="What this sets" className="inline-flex size-4 cursor-help items-center justify-center rounded-full border border-border-strong text-[10px] text-text-muted">i</span></Tip></h2>
          <p className="mt-0.5 text-xs text-text-muted">{v.savedBy ? `Last changed by ${v.savedBy}${v.savedAt ? ` at ${new Date(v.savedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : ""}` : "As set when the combination was created"} · numbers Sample until the immigration expert confirms</p>
        </div>
        {canAuthor && !editing ? <div className="flex gap-2">{v.canUndo ? <Button size="sm" variant="ghost" onClick={() => void undo()} busy={busy}><Undo2 /> Undo last change</Button> : null}<Button size="sm" variant="ghost" onClick={() => setFilling(true)}><BookOpen /> Fill from the guide</Button><Button size="sm" variant="secondary" onClick={() => { setLines(toLines(v)); setEditing(true); }}>Edit</Button></div> : null}
      </div>
      {stale ? <Notice tone="warn" className="mt-3" title="Changed by someone else" action={<Button size="sm" variant="secondary" onClick={() => { setStale(null); setEditing(false); refresh(); }}>Reload their version</Button>}>{stale}</Notice> : null}
      <table className="mt-3 w-full text-sm">
        <thead><tr className="border-b border-border text-left text-xs text-text-muted">
          <th className="py-2 pr-3 font-medium">Person</th>
          <th className="py-2 pr-3 font-medium"><Tip tip={TIPS.many} focusable><span className="cursor-help underline decoration-dotted underline-offset-4">How many</span></Tip></th>
          <th className="py-2 pr-3 font-medium"><Tip tip={TIPS.applicant} focusable><span className="cursor-help underline decoration-dotted underline-offset-4">Applicant</span></Tip></th>
          <th className="py-2 pr-3 font-medium"><Tip tip={TIPS.answered} focusable><span className="cursor-help underline decoration-dotted underline-offset-4">Answered by</span></Tip></th>
          <th className="py-2 pr-3 font-medium"><Tip tip={TIPS.words} focusable><span className="cursor-help underline decoration-dotted underline-offset-4">IRCC's words</span></Tip></th>
          {editing ? <th className="py-2 font-medium"><span className="sr-only">Remove</span></th> : null}
        </tr></thead>
        <tbody>
          {shown.map((l, i) => {
            const r = role(l.role); const principal = l.role === "principal";
            return (
              <tr key={l.role} className="border-b border-border last:border-0 align-top" data-person={l.role}>
                <td className="py-2 pr-3"><span className="font-medium">{r?.label ?? l.label}</span>{r && !r.mayBeApplicant ? <p className="text-xs text-text-muted">never an applicant</p> : null}{err(i, "role") ? <p role="alert" className="text-xs text-text-danger">{err(i, "role")}</p> : null}</td>
                <td className="py-2 pr-3">{editing && !principal ? (
                  <span className="flex items-center gap-1.5"><Input aria-label={`Fewest ${r?.label ?? l.role}`} className="h-8 w-14" inputMode="numeric" value={String(l.min)} onChange={(e) => set(i, { min: Number(e.target.value.replace(/\D/g, "").slice(0, 1) || 0) })} /><span className="text-text-muted">to</span><Input aria-label={`Most ${r?.label ?? l.role}`} className="h-8 w-14" inputMode="numeric" value={String(l.max)} onChange={(e) => set(i, { max: Number(e.target.value.replace(/\D/g, "").slice(0, 1) || 0) })} /></span>
                ) : howMany(l)}{err(i, "max") || err(i, "min") ? <p role="alert" className="text-xs text-text-danger">{err(i, "max") ?? err(i, "min")}</p> : null}</td>
                <td className="py-2 pr-3">{editing && !principal && r?.mayBeApplicant ? <label className="flex items-center gap-2"><input type="checkbox" checked={l.applies} onChange={(e) => set(i, { applies: e.target.checked })} aria-label={`${r?.label ?? l.role} files their own application`} /> {l.applies ? "Yes" : "No"}</label> : l.applies ? "Yes" : <span className="text-text-muted">—</span>}{err(i, "applies") ? <p role="alert" className="text-xs text-text-danger">{err(i, "applies")}</p> : null}</td>
                <td className="py-2 pr-3 text-text-muted">{v.lines.find((x) => x.role === l.role)?.answeredBy ?? (l.role === "child" ? "Principal, under 18" : "Themselves")}</td>
                <td className="max-w-72 py-2 pr-3 text-xs text-text-muted">{l.quote ? `"${l.quote}"` : l.origin === "AI_PROPOSAL" || l.origin === "CODE_MATCH" ? "" : "—"}{l.origin === "AI_PROPOSAL" ? <Pill tone="ai" className="ml-1">AI</Pill> : l.origin === "CODE_MATCH" ? <Pill className="ml-1" data-origin-rules>Rules</Pill> : null}</td>
                {editing ? <td className="py-2">{principal ? null : <Button size="icon" variant="ghost" aria-label={`Remove ${r?.label ?? l.role}`} onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}><X /></Button>}</td> : null}
              </tr>
            );
          })}
        </tbody>
      </table>
      {errors.participants ? <p role="alert" className="mt-2 text-xs text-text-danger">{errors.participants}</p> : null}
      {editing ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
          <span className="flex flex-wrap items-center gap-2">
            {offered.length ? <AddPerson offered={offered} onAdd={(k) => { const r = role(k)!; setLines((ls) => [...ls, { role: k, label: r.label, min: 0, max: 1, applies: r.mayBeApplicant, origin: "HUMAN" }]); }} /> : <span className="text-xs text-text-muted">Every kind of person in the shared library is listed.</span>}
            <span className="text-xs text-text-muted">Picks from Shared library › Person roles. A new kind of person is added there.</span>
          </span>
          <span className="flex gap-2"><Button variant="ghost" onClick={() => { setEditing(false); setErrors({}); }}>Cancel</Button><Button onClick={() => void save()} busy={busy}>Save</Button></span>
        </div>
      ) : null}
      <p className={cn("mt-3 text-xs text-text-muted", editing ? "" : "sr-only")}>Rules check on Save: exactly one principal applicant · how many from 0 to 9, the fewest no more than the most · a sponsor or representative is never an applicant · removing a person a form names asks first.</p>
      {filling ? <FillFromGuide id={id} onClose={() => setFilling(false)} onUse={useProposal} /> : null}
      {confirm ? <Dialog open onOpenChange={(o) => !o && setConfirm(null)} title="Remove a person that forms name?" description={confirm.text} footer={<><Button variant="ghost" onClick={() => { const back = toLines(v).filter((l) => confirm.roles.includes(l.role) && !lines.some((x) => x.role === l.role)); setLines((ls) => [...ls, ...back]); setConfirm(null); }}>Keep the person</Button><Button variant="destructive" onClick={() => void save(true)} busy={busy}>Save anyway</Button></>}><p className="text-sm text-text-muted">Those forms stay in the combination but name nobody until you add the person back or change whose form it is.</p></Dialog> : null}
    </section>
  );
}

type FillMode = "rules" | "replay" | "live";
const FILL_MODES: [FillMode, string, string][] = [
  ["rules", "Rules only (US$0)", "No AI: rules find the guide's sentences that name each person. How many is a Sample default you check."],
  ["replay", "Use saved AI answers (US$0)", "Replays what AI answered for this exact guide before. Until a live trial records one, it says there is none."],
  ["live", "AI now (not approved yet)", "Two AI rounds read the guide. Waits for the founder's Go for a live trial (P-110); rules only or saved AI answers meanwhile."],
];
/** Lead check L2: AI now is greyed until the founder approves a live trial (the API refuses it too). */
const LIVE_OFF = true;

/** "Fill from the guide" (slice 3, P-121): the plan and its cost first, then the proposal with IRCC's words. */
function FillFromGuide({ id, onClose, onUse }: { id: string; onClose: () => void; onUse: (p: PeopleProposal) => void }) {
  const [mode, setMode] = React.useState<FillMode>("rules");
  const plan = useQuery<PeoplePlan, ApiError>({ queryKey: ["people-plan", id, mode], queryFn: () => api<PeoplePlan>(`/combinations/${id}/people/propose/plan`, { method: "POST", json: { mode } }), retry: false });
  const [result, setResult] = React.useState<PeopleProposal | null>(null);
  const [busy, setBusy] = React.useState(false), [error, setError] = React.useState<string | null>(null);
  const run = async () => {
    if (!plan.data) return;
    setBusy(true); setError(null);
    try { setResult(await api<PeopleProposal>(`/combinations/${id}/people/propose`, { method: "POST", json: { mode, planSha256: plan.data.plan_sha256 } })); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  const footer = result
    ? <><Button variant="ghost" onClick={() => setResult(null)}>Back</Button><Button onClick={() => onUse(result)} disabled={!result.people.length}>Use these lines</Button></>
    : <><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => void run()} busy={busy} disabled={!plan.data}><BookOpen /> Fill</Button></>;
  return (
    <Dialog open wide onOpenChange={(o) => { if (!o) onClose(); }} title="Fill who can be in this application from the guide" description={plan.data ? `From ${plan.data.guide.code}: ${plan.data.guide.title}. Nothing is saved until you use the lines and save. Sample until the immigration expert confirms.` : "From the IRCC guide linked to this combination."} footer={footer}>
      {result ? (
        <div className="space-y-3 text-sm" data-people-proposal>
          <p>{result.note}</p>
          {result.people.length ? <Table dense head={["Person", "How many", "Applicant", "IRCC's words"]}>{result.people.map((x) => <tr key={x.role} data-proposed={x.role}><td>{x.label}</td><td>{howMany(x)}</td><td>{x.applies ? "Yes" : "No"}</td><td className="max-w-md text-xs text-text-muted">"{x.quote}"{x.why ? <p className="mt-0.5">{x.why}</p> : null}</td></tr>)}</Table> : null}
          {result.to_decide.length ? <Notice tone="warn" title={`To decide (${result.to_decide.length})`}><ul className="space-y-0.5">{result.to_decide.map((x) => <li key={x.role}>{x.role.replace(/_/g, " ")}: first round {x.draft}, second round {x.check}. {x.why}</li>)}</ul></Notice> : null}
          {result.dropped.length ? <p className="text-xs text-text-muted">Not proposed: {result.dropped.map((x) => `${x.role.replace(/_/g, " ")} (${x.why})`).join(" · ")}</p> : null}
        </div>
      ) : (
        <div className="space-y-4" data-people-plan>
          <fieldset className="space-y-2"><legend className="text-xs font-medium">How to fill it</legend>
            {FILL_MODES.map(([m, label, hint]) => <label key={m} className={`flex gap-2 text-sm${m === "live" && LIVE_OFF ? " text-text-muted" : ""}`} data-fill-mode={m}><input type="radio" name="fill-mode" checked={mode === m} onChange={() => setMode(m)} disabled={m === "live" && LIVE_OFF} className="mt-1" /><span><span className="font-medium">{label}</span><br /><span className="text-xs text-text-muted">{hint}</span></span></label>)}
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
    <span className="flex items-center gap-2">
      <Select aria-label="Person to add" className="h-8 w-56" value={k} onChange={(e) => setK(e.target.value)}><option value="">Choose a person…</option>{offered.map((r) => <option key={r.key} value={r.key} title={r.meaning}>{r.label}</option>)}</Select>
      <Button size="sm" variant="secondary" disabled={!k} onClick={() => { onAdd(k); setK(""); }}><Plus /> Add a person</Button>
    </span>
  );
}

// ------------------------------------------------------------------ questions per person (slice 2, early-look fix 3)

const SOURCE_WORDS: Record<string, string> = { client_questionnaire: "The client answers it in the questionnaire", profile_record: "From the client's profile", verified_document: "The case officer takes it from a document", staff_working_view: "The case officer fills it", existing_record: "From an existing record" };
const TYPE_WORDS: Record<string, string> = { text: "Text", date: "Date", yes_no: "Yes or no", number: "Number", code: "A choice from a list", country: "A country", address: "An address", phone: "A phone number", email: "An email address" };

/** One person role's questions as a case asks them: wording first, who fills it, only if, the forms that need it;
 *  coverage on top (a gap blocks release). The field code shows only in a question's side panel (concept §7). */
function QuestionsByPerson({ id, q, available }: { id: string; q: QuestionnairesView | null; available: { key: string; title: string }[] }) {
  const [sp, setSp] = useSearchParams();
  const { canAuthor } = useSessionView();
  const [add, setAdd] = React.useState("");
  const [shown, setShown] = React.useState<QuestionnaireQuestion | null>(null);
  // Only the first section is open at first (146 questions on the work permit); each folds and "Open all" opens them all.
  const [openIds, setOpenIds] = React.useState<Set<string> | null>(null);
  const sel = useAction((b: { key: string; on: boolean }) => api(`/combinations/${id}/sections/${b.key}`, { method: b.on ? "POST" : "DELETE" }), { success: "Questionnaire sections updated", invalidate: [["combination", id], ["config", id], ["preview"]] });
  const addSection = canAuthor ? (
    <div className="flex flex-wrap items-center gap-2" data-add-section>
      <Select aria-label="Library section to add" className="h-8 w-72" value={add} onChange={(e) => setAdd(e.target.value)}><option value="">Add a library section…</option>{available.map((x) => <option key={x.key} value={x.key}>{x.title}</option>)}</Select>
      <Button size="sm" variant="secondary" disabled={!add} busy={sel.isPending} onClick={() => { sel.mutate({ key: add, on: true }); setAdd(""); }}><Plus /> Add section</Button>
    </div>
  ) : null;
  if (!q) return (
    <section className="rounded-xl border border-border bg-surface-raised p-5" data-questions-empty>
      <h2 className="font-semibold">No questions yet</h2>
      <p className="mt-1 text-sm text-text-muted">The questions each person needs come from the facts their forms read. Add forms on the Forms tab, or a library section here.</p>
      <div className="mt-3">{addSection}</div>
    </section>
  );
  const role = q.roles.find((r) => r.role === q.role);
  const opened = openIds ?? new Set(q.sections[0] ? [q.sections[0].id] : []);
  const allOpen = q.sections.every((s) => opened.has(s.id));
  const total = q.sections.reduce((n, s) => n + s.questions.length, 0);
  return (
    <section aria-labelledby="questions-head" className="space-y-4" data-questions>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="questions-head" className="font-semibold">Questions for each person</h2>
        <span className="flex flex-wrap items-center gap-2"><Button size="sm" variant="ghost" onClick={() => setOpenIds(allOpen ? new Set() : new Set(q.sections.map((s) => s.id)))}>{allOpen ? "Close all sections" : "Open all sections"}</Button>{addSection}</span>
      </div>
      <div role="group" aria-label="Person" className="flex flex-wrap gap-1.5">
        {q.roles.map((r) => <button key={r.role} type="button" aria-pressed={r.role === q.role} data-role-chip={r.role} onClick={() => { const n = new URLSearchParams(sp); n.set("role", r.role); setSp(n, { replace: true }); }}
          className={cn("min-h-9 rounded-full border px-3 py-1 text-sm", r.role === q.role ? "border-primary bg-primary/10 font-medium text-text-link" : "border-border bg-surface-raised text-text-muted hover:bg-text/5")}>{r.label} · {r.questions} question{r.questions === 1 ? "" : "s"}{r.gaps ? <span className="ml-1 rounded bg-danger/12 px-1 text-xs text-text-danger">{r.gaps} not asked</span> : null}</button>)}
      </div>
      <p className="text-sm" data-coverage><span className="font-medium">{role?.label}:</span> the forms need {q.coverage.needed} answer{q.coverage.needed === 1 ? "" : "s"} about this person · {q.coverage.client} asked of the client · {q.coverage.officer} filled by the case officer{q.coverage.gaps.length ? <span className="text-text-danger"> · {q.coverage.gaps.length} asked of nobody</span> : null}</p>
      {q.coverage.gaps.length ? (
        <Notice tone="danger" title={`${q.coverage.gaps.length} answer${q.coverage.gaps.length === 1 ? " is" : "s are"} needed but asked of nobody: release waits for ${q.coverage.gaps.length === 1 ? "it" : "them"}`}>
          <ul className="mt-1 space-y-0.5" data-gaps>{q.coverage.gaps.slice(0, 8).map((g) => <li key={g.fact}>"{g.meaning}", needed by {g.forms.join(", ")}</li>)}</ul>
          <p className="mt-1">Fix: add the library section that asks it, or have the case officer fill it (set once in the shared library).</p>
        </Notice>
      ) : null}
      {q.sections.map((s) => {
        const isOpen = opened.has(s.id);
        return (
          <div key={s.id} className="rounded-xl border border-border bg-surface-raised" data-section={s.id}>
            <div className="flex items-center justify-between gap-2 pr-2">
              <button className="flex-1 px-4 py-3 text-left" aria-expanded={isOpen} onClick={() => { const n = new Set(opened); if (n.has(s.id)) n.delete(s.id); else n.add(s.id); setOpenIds(n); }}>
                <span className="font-medium">{s.title}</span> <span className="text-xs text-text-muted">· {s.questions.length} question{s.questions.length === 1 ? "" : "s"} for {role?.label ?? "this person"}</span>
              </button>
              {canAuthor ? <Button size="sm" variant="ghost" onClick={() => sel.mutate({ key: s.id, on: false })} aria-label={`Remove from questionnaire: ${s.title}`}>Remove from questionnaire</Button> : null}
            </div>
            {isOpen ? (s.questions.length ? (
              <div className="border-t border-border px-4 py-3">
                <Table dense head={["Question", "Who fills it", "Only if", "Needed by", ""]}>
                  {s.questions.map((x) => (
                    <tr key={x.fact} data-question>
                      <td className="max-w-md"><span className="font-medium">{x.wording}</span>{x.group ? <span className="text-xs text-text-muted"> · asked for each entry</span> : null}{x.required ? null : <span className="text-xs text-text-muted"> (optional)</span>}</td>
                      <td><Pill tone={x.filledBy === "CLIENT" ? "info" : "neutral"}>{FILLED_BY[x.filledBy]}</Pill></td>
                      <td className="max-w-56 text-xs">{x.onlyIf ?? <span className="text-text-muted">Always</span>}</td>
                      <td className="text-xs">{x.neededBy.length ? x.neededBy.join(", ") : <span className="text-text-muted">No form (decides what applies)</span>}</td>
                      <td><Button size="sm" variant="ghost" aria-label={`Details of: ${x.wording}`} onClick={() => setShown(x)}>Details</Button></td>
                    </tr>
                  ))}
                </Table>
              </div>
            ) : <p className="border-t border-border px-4 py-3 text-sm text-text-muted">This section asks {role?.label ?? "this person"} nothing for this combination.</p>) : null}
          </div>
        );
      })}
      <p className="text-xs text-text-muted">{total} question{total === 1 ? "" : "s"} for {role?.label}, from the largest Sample family the combination allows. {q.notAsked ? `${q.notAsked} placed question${q.notAsked === 1 ? " is" : "s are"} not asked: no form reads ${q.notAsked === 1 ? "it" : "them"} and ${q.notAsked === 1 ? "it decides" : "they decide"} nothing.` : ""}</p>
      {shown ? (
        <Panel open onOpenChange={(o) => !o && setShown(null)} title={shown.wording} description={shown.meaning} footer={<><span /><Button variant="ghost" onClick={() => setShown(null)}>Close</Button></>}>
          <dl className="grid grid-cols-[10rem_1fr] gap-x-3 gap-y-2 text-sm" data-question-details>
            {shown.help ? <><dt className="text-text-muted">Note</dt><dd className="text-xs">{shown.help}</dd></> : null}
            <dt className="text-text-muted">Who fills it</dt><dd>{FILLED_BY[shown.filledBy]} · {SOURCE_WORDS[shown.collectedFrom ?? ""] ?? "Not placed"}<p className="text-xs text-text-muted">Set once in the shared library; a change needs a second person and reaches every combination that asks it.</p></dd>
            <dt className="text-text-muted">Kind of answer</dt><dd>{TYPE_WORDS[shown.answerType] ?? shown.answerType}</dd>
            <dt className="text-text-muted">Only if</dt><dd>{shown.onlyIf ?? "Always"}</dd>
            <dt className="text-text-muted">Needed by</dt><dd>{shown.neededBy.join(", ") || "No form: it decides what applies"}</dd>
            <dt className="text-text-muted">Used in</dt><dd>{shown.whereUsed} combination{shown.whereUsed === 1 ? "" : "s"}</dd>
            <dt className="text-text-muted">System name</dt><dd><Link className="mono text-text-link underline" to={`/library/fields/${encodeURIComponent(shown.fact)}`}>{shown.fact}</Link></dd>
          </dl>
        </Panel>
      ) : null}
    </section>
  );
}
