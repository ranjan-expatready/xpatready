// S5 Questionnaires tab (W1-08, P-119, walkthrough v2 S5), slice 1: "Who can be in this application" edited at the top
// (it decides each person's questions; challenge M3, M4), then the questions by section, the rules and the checks this
// combination uses (slice 2 rebuilds these per person with coverage). People pick from the shared library's person roles;
// a new kind of person is added there (S6), never here.
import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Undo2, X } from "lucide-react";
import type { PeopleLine, PeopleView } from "../../../../contracts/workspace";
import { api, ApiError, useSessionView, useToast } from "@/lib/api";
import { Button, Dialog, Input, Notice, Pill, Select } from "@/components/ui/controls";
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

export function QuestionnairesTab({ id, people }: { id: string; people: PeopleView }) {
  return (
    <div className="space-y-6">
      <WhoCanBe id={id} v={people} />
      <ConfigArea id={id} areas={["questions", "rules", "checks"]} />
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
  React.useEffect(() => { if (!editing) setLines(toLines(v)); }, [v, editing]);
  const role = (k: string) => v.roles.find((r) => r.key === k);
  const offered = v.roles.filter((r) => r.takesPartInCase && !r.retired && !lines.some((l) => l.role === r.key));
  const set = (i: number, p: Partial<Line>) => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const refresh = () => { for (const k of [["combination", id], ["combination-summary", id], ["config", id], ["catalogue"], ["draft"]]) void qc.invalidateQueries({ queryKey: k }); };
  const save = async (confirmRemove = false) => {
    setBusy(true); setErrors({});
    try {
      await api(`/combinations/${id}/people`, { method: "PATCH", json: { participants: lines.map(({ label: _l, ...x }) => x), version: v.version, confirmRemove } });
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
        {canAuthor && !editing ? <div className="flex gap-2">{v.canUndo ? <Button size="sm" variant="ghost" onClick={() => void undo()} busy={busy}><Undo2 /> Undo last change</Button> : null}<Button size="sm" variant="secondary" onClick={() => { setLines(toLines(v)); setEditing(true); }}>Edit</Button></div> : null}
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
                <td className="max-w-72 py-2 pr-3 text-xs text-text-muted">{l.quote ? `"${l.quote}"` : l.origin === "AI_PROPOSAL" ? "" : "—"}{l.origin === "AI_PROPOSAL" ? <Pill tone="ai" className="ml-1">AI</Pill> : null}</td>
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
      {confirm ? <Dialog open onOpenChange={(o) => !o && setConfirm(null)} title="Remove a person that forms name?" description={confirm.text} footer={<><Button variant="ghost" onClick={() => { const back = toLines(v).filter((l) => confirm.roles.includes(l.role) && !lines.some((x) => x.role === l.role)); setLines((ls) => [...ls, ...back]); setConfirm(null); }}>Keep the person</Button><Button variant="destructive" onClick={() => void save(true)} busy={busy}>Save anyway</Button></>}><p className="text-sm text-text-muted">Those forms stay in the combination but name nobody until you add the person back or change whose form it is.</p></Dialog> : null}
    </section>
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
