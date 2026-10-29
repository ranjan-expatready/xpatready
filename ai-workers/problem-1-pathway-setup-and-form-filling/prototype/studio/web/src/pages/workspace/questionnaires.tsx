// S5 Questionnaires tab (W1-08, P-119, walkthrough v2 S5): "Who can be in this application" edited at the top (it decides
// each person's questions; challenge M3, M4), then slice 2's questions per person: wording, who fills it, only if, the
// forms that need it, coverage (a gap blocks release), field codes only in a question's side panel (early-look fix 3);
// the rules and checks used here fold below (m4). People pick from the shared library's person roles; a new kind of
// person is added there (S6), never here.
import * as React from "react";
import { useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { BookOpen, ChevronDown, Plus, Undo2, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { type BulkSourceResult, type FactSourceRow, type PeopleLine, type PeoplePlan, type PeopleProposal, type PeopleView, type QuestionnaireQuestion, type QuestionnairesView } from "../../../../contracts/workspace";
import { api, ApiError, useAction, useSessionView, useToast } from "@/lib/api";
import { Button, Dialog, Input, Notice, Panel, Pill, Select, Table } from "@/components/ui/controls";
import { Tip } from "@/components/status";
import { BulkBar, FactDrawer, RowMenu, RowStatus, ComesFrom, PreQual, SAY, SourceChips, SourceStrip, useFactSources, useRefreshSources, useUndoToast, type Filter } from "@/pages/workspace/sources";
import { Lock } from "lucide-react";
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
  if (!unfolded && !editing && !filling) return (
    <section aria-labelledby="who-can-be" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface-raised px-5 py-3 shadow-sm" data-who-can-be data-folded>
      <p className="min-w-0 text-sm"><span id="who-can-be" className="font-semibold">Who can be in this application</span> <span className="text-text-muted">· {shown.map((l) => `${role(l.role)?.label ?? l.label} ${howMany(l)}`).join(" · ")}{shown.filter((l) => l.applies).length > 1 ? " · each applicant files their own application" : ""}</span></p>
      <Button size="sm" variant="ghost" onClick={() => setUnfolded(true)} aria-expanded={false}><ChevronDown /> {canAuthor ? "Show and edit" : "Show"}</Button>
    </section>
  );
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
                <td className="max-w-72 py-2 pr-3 text-xs text-text-muted">{l.quote ? `"${l.quote}"` : l.origin === "AI_PROPOSAL" || l.origin === "CODE_MATCH" ? "" : "—"}{l.origin === "AI_PROPOSAL" ? <Pill tone="ai" className="ml-1">AI</Pill> : l.origin === "CODE_MATCH" ? <span data-origin-rules><Pill className="ml-1" title="Found by rules in the guide's sentences; no AI">Rules</Pill></span> : null}</td>
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
          <span className="flex gap-2"><Button variant="ghost" onClick={() => setFilling(true)}><BookOpen /> Fill from the guide</Button><Button variant="ghost" onClick={() => { setEditing(false); setErrors({}); }}>Cancel</Button><Button onClick={() => void save()} busy={busy}>Save</Button></span>
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
  ["live", "AI now (cost shown below)", "Two AI rounds read the guide; only lines both agree on, with their sentence in the guide, are proposed."],
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
            {FILL_MODES.map(([m, label, hint]) => { const off = m === "live" && !live.approved; return <label key={m} className={`flex gap-2 text-sm${off ? " text-text-muted" : ""}`} data-fill-mode={m}><input type="radio" name="fill-mode" checked={mode === m} onChange={() => setMode(m)} disabled={off} className="mt-1" /><span><span className="font-medium">{off ? "AI now (not approved yet)" : label}</span><br /><span className="text-xs text-text-muted">{off ? live.why ?? "Checking whether AI now is approved…" : hint}</span></span></label>; })}
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

// ------------------------------------------------------------------ questions per person (W1-15 slice 2, P-147)

/** One person role's questions as a case asks them, each row five things: Question · Comes from · Pre-qualification ·
 *  Only if · Status (board v2 frames 1–2). The strip and the chips on top; ⋯ menu and the side drawer per row; the bulk
 *  bar while rows are ticked. Facts no question asks (from a document or the agent) are listed after the sections. */
function QuestionsByPerson({ id, q, available }: { id: string; q: QuestionnairesView | null; available: { key: string; title: string }[] }) {
  const [sp, setSp] = useSearchParams();
  const { canAuthor } = useSessionView();
  const [add, setAdd] = React.useState("");
  const [shown, setShown] = React.useState<{ fact: string; q: QuestionnaireQuestion | null; section: string | null } | null>(null);
  const [filter, setFilter] = React.useState<Filter>("all");
  const [picked, setPicked] = React.useState<Set<string>>(new Set());
  const [refused, setRefused] = React.useState<BulkSourceResult["refused"]>([]);
  const fs = useFactSources(id);
  const refresh = useRefreshSources(id);
  const undoToast = useUndoToast();
  // Only the first section is open at first (146 questions on the work permit); each folds and "Open all" opens them all.
  const [openIds, setOpenIds] = React.useState<Set<string> | null>(null);
  const sel = useAction((b: { key: string; on: boolean }) => api(`/combinations/${id}/sections/${b.key}`, { method: b.on ? "POST" : "DELETE" }), { success: "Questionnaire sections updated", invalidate: [["combination", id], ["config", id], ["preview"], ["fact-sources", id]] });
  React.useEffect(() => { setPicked(new Set()); setFilter("all"); }, [q?.role]);
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
  // Facts about the case itself (the file number, the office) belong to no person: they show where their question sits,
  // and with the principal applicant when no question asks them.
  const placedFacts = new Set(q.sections.flatMap((s) => s.questions.map((x) => x.fact)));
  const rows = (fs.data?.facts ?? []).filter((f) => f.role === q.role || (f.role === "case" && (q.role === "principal" || placedFacts.has(f.fact))));
  const byFact = new Map<string, FactSourceRow>(); for (const f of rows) if (f.role === q.role || !byFact.has(f.fact)) byFact.set(f.fact, f);
  const checks = new Map<string, string>(); for (const p of fs.data?.problems ?? []) if ((p.role === q.role || (p.role === "case" && byFact.get(p.item)?.role === "case")) && p.level === "error" && !checks.has(p.item)) checks.set(p.item, p.message);
  const unasked = [...byFact.values()].filter((f) => !placedFacts.has(f.fact));
  const keep = (fact: string) => { const f = byFact.get(fact); return filter === "all" || (filter === "needs" ? checks.has(fact) : f?.source === filter); };
  const opened = openIds ?? new Set(q.sections[0] ? [q.sections[0].id] : []);
  const allOpen = q.sections.every((s) => opened.has(s.id));
  const total = q.sections.reduce((n, s) => n + s.questions.length, 0);
  const pickedRows = [...byFact.values()].filter((f) => picked.has(f.fact));
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
        <td className="max-w-md"><button type="button" className="text-left font-medium hover:text-text-link hover:underline" aria-label={`Details of: ${label}`} onClick={() => setShown({ fact, q: x, section })}>{label}</button>{x?.group ? <span className="text-xs text-text-muted"> · asked for each entry</span> : null}{x && !x.required ? <span className="text-xs text-text-muted"> (optional)</span> : null}</td>
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
    return [...(canAuthor ? [<input key="all" type="checkbox" aria-label="Select every row in this section" disabled={!pickable.length} checked={all} onChange={(e) => toggle(pickable, e.target.checked)} />] : []), "Question", "Comes from", "Pre-qualification", "Only if", "Status", <span key="a" className="sr-only">Actions</span>];
  };
  return (
    <section aria-labelledby="questions-head" className="space-y-4" data-questions>
      <SourceStrip v={fs.data} />
      {fs.error ? <Notice tone="warn" title="Where each answer comes from could not load">{fs.error.message} <button type="button" className="font-medium text-text-link underline" onClick={() => void fs.refetch()}>Retry</button></Notice> : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="questions-head" className="font-semibold">Questions for each person</h2>
        <span className="flex flex-wrap items-center gap-2"><Button size="sm" variant="ghost" onClick={() => setOpenIds(allOpen ? new Set() : new Set(q.sections.map((s) => s.id)))}>{allOpen ? "Close all sections" : "Open all sections"}</Button>{addSection}</span>
      </div>
      <div role="group" aria-label="Person" className="flex flex-wrap gap-1.5">
        {q.roles.map((r) => <button key={r.role} type="button" aria-pressed={r.role === q.role} data-role-chip={r.role} onClick={() => { const n = new URLSearchParams(sp); n.set("role", r.role); setSp(n, { replace: true }); }}
          className={cn("min-h-9 rounded-full border px-3 py-1 text-sm", r.role === q.role ? "border-primary bg-primary/10 font-medium text-text-link" : "border-border bg-surface-raised text-text-muted hover:bg-text/5")}>{r.label} · {r.questions} question{r.questions === 1 ? "" : "s"}{r.gaps ? <span className="ml-1 rounded bg-danger/12 px-1 text-xs text-text-danger">{r.gaps} not asked</span> : null}</button>)}
      </div>
      <SourceChips rows={[...byFact.values()]} needs={checks.size} value={filter} onChange={setFilter} />
      {pickedRows.length && canAuthor ? <BulkBar id={id} picked={pickedRows} onClear={() => setPicked(new Set())} onDone={(r, undo) => { setRefused(r.refused); if (r.saved) { setPicked(new Set()); undoToast.show(`${r.what.charAt(0).toUpperCase()}${r.what.slice(1)} on ${r.saved} question${r.saved === 1 ? "" : "s"}`, undo); } }} /> : null}
      {refused.length ? <Notice tone="warn" title={`${refused.length} row${refused.length === 1 ? "" : "s"} not changed`} action={<Button size="sm" variant="ghost" onClick={() => setRefused([])}>Dismiss</Button>}><ul className="mt-1 space-y-0.5" data-bulk-refused>{refused.map((x, i) => <li key={i}>{x.label && !x.message.includes(x.label) ? <><span className="font-medium">{x.label}</span>: </> : null}{x.message}</li>)}</ul></Notice> : null}
      {undoToast.link ? <p className="text-xs text-text-muted" data-undo-note>Last change on this tab{undoToast.link}</p> : null}
      <p className="text-sm" data-coverage><span className="font-medium">{role?.label}:</span> the forms need {q.coverage.needed} answer{q.coverage.needed === 1 ? "" : "s"} about this person · {q.coverage.client} asked of the client · {q.coverage.officer} filled by the case officer{q.coverage.gaps.length ? <span className="text-text-danger"> · {q.coverage.gaps.length} asked of nobody</span> : null}</p>
      {q.coverage.gaps.length ? (
        <Notice tone="danger" title={`${q.coverage.gaps.length} answer${q.coverage.gaps.length === 1 ? " is" : "s are"} needed but asked of nobody: release waits for ${q.coverage.gaps.length === 1 ? "it" : "them"}`}>
          <ul className="mt-1 space-y-0.5" data-gaps>{q.coverage.gaps.slice(0, 8).map((g) => <li key={g.fact}>"{g.meaning}", needed by {g.forms.join(", ")}</li>)}</ul>
          <p className="mt-1">Fix: add the library section that asks it, or have the case officer fill it (set once in the shared library).</p>
        </Notice>
      ) : null}
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
                <span className="font-medium">{s.title}</span>{locked ? <span className="ml-2 inline-flex items-center gap-1 text-xs text-text-muted" data-client-only><Lock className="size-3.5" aria-hidden /> Always the client</span> : null} <span className="text-xs text-text-muted">· {s.questions.length} question{s.questions.length === 1 ? "" : "s"} for {role?.label ?? "this person"}{fromDocs ? ` · ${fromDocs} from documents` : ""}</span>
              </button>
              {canAuthor ? <Button size="sm" variant="ghost" onClick={() => sel.mutate({ key: s.id, on: false })} aria-label={`Remove from questionnaire: ${s.title}`}>Remove from questionnaire</Button> : null}
            </div>
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
          <p className="px-4 pt-3 font-medium">Answered without a question <span className="text-xs font-normal text-text-muted">· {unasked.length} fact{unasked.length === 1 ? "" : "s"} for {role?.label}: read from a document or entered by the agent</span></p>
          <div className="px-4 py-3">
            <Table dense head={head(unasked.filter((f) => keep(f.fact)).map((f) => f.fact))} label="Answered without a question">
              {unasked.filter((f) => keep(f.fact)).map((f) => row(f.fact, f.label, null, null))}
            </Table>
          </div>
        </div>
      ) : null}
      <p className="text-xs text-text-muted">{total} question{total === 1 ? "" : "s"} for {role?.label}, from the largest Sample family the combination allows. {q.notAsked ? `${q.notAsked} placed question${q.notAsked === 1 ? " is" : "s are"} not asked: no form reads ${q.notAsked === 1 ? "it" : "them"} and ${q.notAsked === 1 ? "it decides" : "they decide"} nothing.` : ""}</p>
      {shown ? <FactDrawer key={`${q.role}|${shown.fact}|${byFact.get(shown.fact)?.version ?? 0}`} id={id} role={q.role} roleLabel={role?.label ?? q.role} section={shown.section} q={shown.q} f={byFact.get(shown.fact)} canAuthor={canAuthor} onClose={() => setShown(null)} onSaved={(t, u) => undoToast.show(t, u)} /> : null}
      {undoToast.node}
    </section>
  );
}
