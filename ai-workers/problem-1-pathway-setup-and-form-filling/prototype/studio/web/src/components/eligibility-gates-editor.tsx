// B106 (row A4, C6.9; concept product/screens/M3-A4/concept.md BR-1…BR-9, approved by the tech lead on #1172): the
// eligibility rules of one combination, by screen. A section at the end of the Smart questionnaire (SQR) tab reads the
// draft's gates, officer's-judgement lines and disclaimer, each gate marked against the newest release from the same
// change list the reviewer signs (draft.changes, kind "Eligibility"), with the release check's problems under their
// gate. An author edits the whole set in one dialog and saves it once, at the version read (PUT
// /combinations/:id/eligibility-gates); the content reviewer signs it and the approver releases it on Review and
// release (unchanged). The server decides who may save and says why. No model call (US$0).
import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import type { CombinationView, ProblemLine } from "../../../contracts/programs";
import { api, ApiError, useApi, useSessionView, useToast } from "@/lib/api";
import { ConditionBuilder, plainCondition, type Tree } from "@/components/conditions";
import { Button, Dialog, Field, Input, Notice, Pill, Textarea } from "@/components/ui/controls";
import { useLibraryFields } from "@/pages/configuration";
import { Tip } from "@/components/status";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

/** contracts/eligibility.ts EligibilityGatesView, as the web reads it (that module's type imports reach engine files
 *  that need Node, which the web build cannot type-check). */
type Gate = { key: string; label: string; condition: Record<string, unknown>; whenNotMet?: "needs_review" };
type EligibilityGatesView = { gates: Gate[]; judgement: string[]; disclaimer: string | null; version: number; savedBy: string | null; savedAt: string | null; released?: { gates: Gate[]; judgement: string[]; disclaimer: string; release: number } | null };
type Change = { kind: string; key: string; change: "added" | "changed" | "removed"; label?: string };
type Combo = CombinationView & { draft: CombinationView["draft"] & { changes?: Change[] } };
type Errors = Record<string, string>;

export const TIP = "Checked per person against the answers on file when a case officer runs Eligibility: Met, Not met or Not answered. Never a guarantee: an IRCC officer decides.";
const WAITING = "A submission is waiting for review: saving changes the draft, so it must be submitted again.";
const NOT_MET: Record<"not_eligible" | "needs_review", string> = { not_eligible: "Not eligible", needs_review: "The representative reviews it (Possibly eligible)" };
const MARK: Record<Change["change"] | "released", [string, string, string]> = {
  added: ["info", "New in draft", "Added in the draft: cases read it once the draft is reviewed and released."],
  changed: ["warn", "Changed in draft", "Changed in the draft: cases keep the released version until the draft is reviewed and released."],
  removed: ["danger", "Removed in draft", "Removed in the draft: cases opened before the next release keep it."],
  released: ["ok", "Released", "In the newest release: cases opened on it are checked against it."],
};
const KEY_MAX = 80;

/** BR-4 (Q3, m9): a new gate's key, made from its label at its first save and never changed after; `gate.rule_<n>`
 *  when the label has no Latin letter or digit. Taken: a key in the draft or in the newest release. */
export function keyFor(label: string, taken: Set<string>): string {
  const words = label.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, KEY_MAX - 12).replace(/_+$/, "");
  let n = 1, key = words ? `gate.${words}` : `gate.rule_${n}`;
  while (taken.has(key)) { n += 1; key = words ? `gate.${words}_${n}` : `gate.rule_${n}`; }
  return key;
}

/** The section on the Smart questionnaire (SQR) tab (Q2: one mount line in pages/combination.tsx). */
export function EligibilityGatesSection({ id }: { id: string }) {
  const g = useApi<EligibilityGatesView>(["combination", id, "eligibility-gates"], `/combinations/${id}/eligibility-gates`);
  const o = useApi<Combo>(["combination", id], `/combinations/${id}`);
  const sum = useApi<{ row?: { retired?: boolean } | null }>(["combination-summary", id], `/combinations/${id}/summary`);
  const { canAuthor } = useSessionView(); // m8: the author duty itself, never the answer-key flags (author or expert)
  const fields = useLibraryFields();
  const [open, setOpen] = React.useState(false);
  const editRef = React.useRef<HTMLButtonElement>(null);
  const head = <h2 id="eligibility-head" className="flex items-center gap-2 font-semibold">Eligibility rules (staff check) <Tip tip={TIP} focusable><span aria-label={TIP} role="img" className="inline-flex size-4 cursor-help items-center justify-center rounded-full border border-border-strong text-[10px] text-text-muted">i</span></Tip></h2>;
  const box = "space-y-3 rounded-xl border border-border bg-surface-raised p-5 shadow-sm";
  if (g.isLoading || o.isLoading) return <section aria-labelledby="eligibility-head" className={box} data-eligibility-gates="loading">{head}<div className="h-4 w-2/3 animate-pulse rounded bg-text/10" /><div className="h-4 w-1/2 animate-pulse rounded bg-text/10" /></section>;
  if (g.isError || !g.data) return <section aria-labelledby="eligibility-head" className={box} data-eligibility-gates="error">{head}<Notice tone="danger" title="The eligibility rules could not be loaded" action={<Button size="sm" variant="ghost" onClick={() => void g.refetch()}>Try again</Button>}>{(g.error as Error | null)?.message ?? "No answer from the studio."}</Notice></section>;
  const v = g.data, d = o.data;
  const retired = !!sum.data?.row?.retired;
  const changes = (d?.draft.changes ?? []).filter((c) => c.kind === "Eligibility");
  const changeOf = new Map(changes.map((c) => [c.key, c]));
  const problems = (d?.draft.problems ?? []).filter((p: ProblemLine) => p.where === "Eligibility");
  const release = d?.releases?.[0]?.release; // m2: the header's number (the pack version), not the combination's own
  const waiting = d?.submission?.status === "SUBMITTED";
  const removed = (v.released?.gates ?? []).filter((x) => changeOf.get(x.key)?.change === "removed");
  const empty = !v.gates.length && !v.judgement.length;
  const words = (c: Tree) => plainCondition(c, fields.name).replace(/^For [^:]*: /, "");
  // Edit waits until the summary says whether the combination is retired (never offered, then taken away).
  const action = sum.isLoading ? null : retired ? <p className="text-xs text-text-muted" data-eligibility-readonly="retired">Retired: restore it on Structure to change its eligibility rules.</p>
    : !canAuthor ? <p className="text-xs text-text-muted" data-eligibility-readonly="duty">An author changes these; you can read them.</p>
    : <Button ref={editRef} size="sm" variant={empty ? "default" : "outline"} onClick={() => setOpen(true)} data-eligibility-edit>{empty ? "Add eligibility rules" : "Edit"}</Button>;
  return (
    <section aria-labelledby="eligibility-head" className={box} data-eligibility-gates>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>{head}<p className="text-xs text-text-muted">Rules the answers settle, per person</p></div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
          <span data-eligibility-count={changes.length}>{changes.length ? `Draft: ${changes.length} change${changes.length === 1 ? "" : "s"}` : release !== undefined ? "Draft matches the release" : null}</span>
          <span data-eligibility-release={release ?? ""}>{release !== undefined && v.released ? `Released in Release ${release}` : "Not released yet"}</span>
          {action}
        </div>
      </div>
      {empty ? <p className="text-sm text-text-muted" data-eligibility-empty>No eligibility rules yet. Add the rules the answers can settle, such as a passport on file; anything only an officer can weigh goes under Officer's judgement. A case check is refused until a release carries at least one.</p> : null}
      {v.gates.length || removed.length ? (
        <ul className="divide-y divide-border rounded-lg border border-border" aria-label="Gates">
          {v.gates.map((x) => {
            const c = changeOf.get(x.key), mark = c ? MARK[c.change] : v.released?.gates.some((r) => r.key === x.key) ? MARK.released : null;
            const mine = problems.filter((p) => p.item === x.key);
            return (
              <li key={x.key} className="space-y-1 px-3 py-2" data-gate={x.key}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="min-w-0 text-sm font-medium">{x.label}</p>
                  {mark ? <Pill tone={mark[0]} title={mark[2]}>{mark[1]}</Pill> : null}
                </div>
                <p className="text-xs text-text-muted"><span className="font-medium text-text">Met when:</span> {words(x.condition)} · <span className="font-medium text-text">If not met:</span> {NOT_MET[x.whenNotMet ?? "not_eligible"]}</p>
                {mine.map((p, i) => <p key={i} className="text-xs text-text-warn" data-gate-problem>⚠ {p.message}</p>)}
              </li>
            );
          })}
          {removed.map((x) => <li key={x.key} className="flex flex-wrap items-start justify-between gap-2 px-3 py-2" data-gate={x.key} data-gate-removed><p className="text-sm text-text-muted line-through">{x.label}</p><Pill tone="danger" title={MARK.removed[2]}>Removed in draft</Pill></li>)}
        </ul>
      ) : null}
      {problems.filter((p) => !v.gates.some((x) => x.key === p.item)).map((p, i) => <p key={i} className="text-xs text-text-warn" data-gate-problem>⚠ {p.message}</p>)}
      {v.judgement.length ? <div className="text-sm"><p className="font-medium">Officer's judgement, not checked by rules</p><ul className="ml-5 list-disc text-text-muted">{v.judgement.map((l) => <li key={l}>{l}</li>)}</ul></div> : null}
      {!empty ? <p className="text-xs text-text-muted"><span className="font-medium text-text">Disclaimer:</span> {v.disclaimer ?? (v.released?.disclaimer && !changeOf.has("disclaimer") ? `${v.released.disclaimer} (Sample default)` : "the Sample default goes into the release")}</p> : null}
      {v.savedBy || waiting ? <p className="text-xs text-text-muted">{v.savedBy ? `Saved by ${v.savedBy}${v.savedAt ? `, ${new Date(v.savedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : ""}. ` : ""}{waiting ? <span data-eligibility-waiting>{WAITING}</span> : changes.length ? <>Submit it on <Link className="text-text-link underline" to={`/c/${id}/review`}>Review and release</Link>; a content reviewer signs it and an approver releases it.</> : null}</p> : null}
      {open ? <GatesEditor id={id} taken={new Set((v.released?.gates ?? []).map((x) => x.key))} waiting={waiting} close={() => { setOpen(false); setTimeout(() => editRef.current?.focus(), 0); }} /> : null}
    </section>
  );
}

/** The dialog reads the newest saved set first (the version a save names), never a list read earlier. */
function GatesEditor({ id, taken, waiting, close }: { id: string; taken: Set<string>; waiting: boolean; close: () => void }) {
  const g = useApi<EligibilityGatesView>(["combination", id, "eligibility-gates"], `/combinations/${id}/eligibility-gates`, { refetchOnMount: "always" });
  const [gen, setGen] = React.useState(0);
  if (g.isError) return <Dialog open wide onOpenChange={(o) => { if (!o) close(); }} title="Edit the eligibility rules"><Notice tone="danger" title="Not loaded">{(g.error as Error).message}</Notice></Dialog>;
  if (!g.data || !g.isFetchedAfterMount) return <Dialog open wide onOpenChange={(o) => { if (!o) close(); }} title="Edit the eligibility rules"><p className="text-sm text-text-muted">Reading the latest saved rules…</p></Dialog>;
  return <GatesForm key={gen} id={id} read={g.data} taken={taken} waiting={waiting} close={close} reload={() => void g.refetch().then(() => setGen((n) => n + 1))} />;
}

type Row = { uid: number; key?: string; label: string; condition: Tree | null; whenNotMet: "not_eligible" | "needs_review"; confirm?: boolean };
type Line = { uid: number; text: string };
let uidSeq = 0;
const uid = () => ++uidSeq;

function GatesForm({ id, read, taken, waiting, close, reload }: { id: string; read: EligibilityGatesView; taken: Set<string>; waiting: boolean; close: () => void; reload: () => void }) {
  const qc = useQueryClient(), toast = useToast(), fields = useLibraryFields();
  const [rows, setRows] = React.useState<Row[]>(() => read.gates.length ? read.gates.map((x: Gate) => ({ uid: uid(), key: x.key, label: x.label, condition: x.condition, whenNotMet: x.whenNotMet ?? "not_eligible" })) : [{ uid: uid(), label: "", condition: null, whenNotMet: "not_eligible" }]);
  const [lines, setLines] = React.useState<Line[]>(() => read.judgement.map((text) => ({ uid: uid(), text })));
  const [disclaimer, setDisclaimer] = React.useState(read.disclaimer ?? ""); // m5: a saved disclaimer is sent back as read
  const [errors, setErrors] = React.useState<Errors>({}), [top, setTop] = React.useState<string | null>(null), [stale, setStale] = React.useState<string | null>(null), [busy, setBusy] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  React.useEffect(() => { if (!dirty) return; const ask = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; }; window.addEventListener("beforeunload", ask); return () => window.removeEventListener("beforeunload", ask); }, [dirty]);
  const addRef = React.useRef<HTMLButtonElement>(null);
  const focusAdd = () => setTimeout(() => addRef.current?.focus(), 0);
  const set = (u: number, p: Partial<Row>) => { setDirty(true); setRows((rs) => rs.map((r) => (r.uid === u ? { ...r, ...p } : r))); };
  const save = async () => {
    if (busy) return;
    // BR-4: keys of saved gates are kept; a new gate's key is made now, from its label.
    const used = new Set([...taken, ...rows.flatMap((r) => (r.key ? [r.key] : []))]);
    const gates = rows.map((r) => { const key = r.key ?? keyFor(r.label, used); used.add(key); return { key, label: r.label, condition: r.condition ?? {}, ...(r.whenNotMet === "needs_review" ? { whenNotMet: "needs_review" } : {}) }; });
    const body = { gates, judgement: lines.map((l) => l.text), disclaimer: disclaimer.trim() ? disclaimer : null, ...(read.version ? { version: read.version } : {}) };
    setBusy(true); setTop(null); setStale(null); setErrors({});
    try {
      await api(`/combinations/${id}/eligibility-gates`, { method: "PUT", json: body });
      void qc.invalidateQueries({ queryKey: ["combination", id] }); void qc.invalidateQueries({ queryKey: ["combination-summary", id] });
      toast.push({ tone: "ok", text: `Eligibility rules saved to the draft. They reach cases once the draft is reviewed and released.${waiting ? ` ${WAITING}` : ""}` });
      setDirty(false); close();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && e.problem.title === "Changed by someone else") setStale(e.message);
      else if (e instanceof ApiError && e.status === 400 && e.problem.errors?.length) {
        const f: Errors = {};
        for (const x of e.problem.errors) f[x.field] = f[x.field] ? `${f[x.field]} ${x.message}` : x.message;
        setErrors(f);
      } else setTop((e as Error).message);
    } finally { setBusy(false); }
  };
  const shown = (f: string) => /^gates\.\d+\.(label|condition|whenNotMet)$/.test(f) || /^judgement\.\d+$/.test(f) || f === "disclaimer";
  const others = Object.entries(errors).filter(([f]) => !shown(f)).map(([, m]) => m);
  return (
    <Dialog open wide guard onOpenChange={(o) => { if (!o) close(); }} title="Edit the eligibility rules"
      description="Gates are rules the answers on file settle, checked for each person. Anything only an officer can weigh (money, health, ties, leaving Canada) goes under Officer's judgement. Saving changes the draft; a content reviewer signs it and an approver releases it."
      footer={<><Button variant="ghost" onClick={() => { if (!dirty || window.confirm("Discard your unsaved changes?")) close(); }}>Cancel</Button><Button busy={busy} onClick={() => void save()} data-eligibility-save>Save the eligibility rules</Button></>}>
      <form className="space-y-5" aria-label="Eligibility rules" onChangeCapture={() => setDirty(true)} onSubmit={(e) => e.preventDefault() /* break B1: a button inside (Add a comparison, a bin, Add a gate) never saves; only Save does */} data-editor="eligibility">
        {stale ? <Notice tone="warn" title="Changed by someone else" action={<Button size="sm" variant="outline" onClick={reload}>Reload</Button>}>{stale}</Notice> : null}
        {top ? <Notice tone="danger" title="Not saved">{top}</Notice> : null}
        {Object.keys(errors).length ? <Notice tone="danger" title="Some details need fixing">{others.length ? others.join(" ") : "Each one is said under its field."}</Notice> : null}
        {waiting ? <Notice tone="info">{WAITING}</Notice> : null}
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold">Gates</legend>
          {rows.map((r, i) => (
            <div key={r.uid} className="space-y-2 rounded-lg border border-border p-3" data-gate-row={i}>
              <Field label={`Gate ${i + 1}: label`} hint="What a person reads beside its result" error={errors[`gates.${i}.label`]}>
                <Input value={r.label} onChange={(e) => set(r.uid, { label: e.target.value })} aria-invalid={!!errors[`gates.${i}.label`] || undefined} />
              </Field>
              <div>
                <p className="mb-1 text-xs font-medium">Rule: met when</p>
                <ConditionBuilder only="person-questions" value={r.condition} onChange={(c) => set(r.uid, { condition: c })} fields={fields.list} />
                {errors[`gates.${i}.condition`] ? <p className="mt-1 text-xs text-text-danger" role="alert">{errors[`gates.${i}.condition`]}</p> : null}
              </div>
              <fieldset className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <legend className="mb-1 text-xs font-medium">If not met</legend>
                {(["not_eligible", "needs_review"] as const).map((w) => <label key={w} className="flex items-center gap-1.5"><input type="radio" name={`not-met-${r.uid}`} checked={r.whenNotMet === w} onChange={() => set(r.uid, { whenNotMet: w })} />{NOT_MET[w]}</label>)}
                {errors[`gates.${i}.whenNotMet`] ? <p className="text-xs text-text-danger">{errors[`gates.${i}.whenNotMet`]}</p> : null}
              </fieldset>
              {r.key ? <details className="text-xs text-text-muted"><summary className="cursor-pointer">Details</summary>Key: <span className="mono">{r.key}</span> (kept when the label changes; tests and earlier checks name it)</details> : null}
              {r.confirm ? (
                <div className="flex flex-wrap items-center gap-2 rounded-md bg-danger/10 px-3 py-2 text-xs" role="group" aria-label={`Remove ${r.label || `gate ${i + 1}`}?`} data-gate-confirm>
                  <span>Remove "{r.label || `gate ${i + 1}`}"? Cases already open keep it; cases opened after this change is released do not. A test that expects this gate fails until its expected values change.</span>
                  <Button size="sm" variant="destructive" onClick={() => { setDirty(true); setErrors({}); setRows((rs) => rs.filter((x) => x.uid !== r.uid)); focusAdd(); }}>Remove</Button>
                  <Button size="sm" variant="ghost" autoFocus onClick={() => set(r.uid, { confirm: false })}>Keep</Button>
                </div>
              ) : <Button size="sm" variant="ghost" onClick={() => (r.key ? set(r.uid, { confirm: true }) : (setErrors({}), setRows((rs) => rs.filter((x) => x.uid !== r.uid)), focusAdd()))} aria-label={`Remove the gate ${r.label || i + 1}`}><Trash2 /> Remove</Button>}
            </div>
          ))}
          <Button ref={addRef} size="sm" variant="outline" onClick={() => { setDirty(true); setRows((rs) => [...rs, { uid: uid(), label: "", condition: null, whenNotMet: "not_eligible" }]); }} data-gate-add><Plus /> Add a gate</Button>
        </fieldset>
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">Officer's judgement, not checked by rules</legend>
          <p className="text-xs text-text-muted">One line each; shown on every check, never changes its result.</p>
          {lines.map((l, i) => (
            <div key={l.uid} className="flex items-start gap-2">
              <Field className="flex-1" label={`Line ${i + 1}`} error={errors[`judgement.${i}`]}><Input value={l.text} onChange={(e) => { setDirty(true); setLines((ls) => ls.map((x) => (x.uid === l.uid ? { ...x, text: e.target.value } : x))); }} /></Field>
              <Button className="mt-6" size="icon" variant="ghost" aria-label={`Remove line ${i + 1}${l.text ? `: ${l.text}` : ""}`} onClick={() => { setDirty(true); setLines((ls) => ls.filter((x) => x.uid !== l.uid)); }}><Trash2 /></Button>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={() => { setDirty(true); setLines((ls) => [...ls, { uid: uid(), text: "" }]); }} data-judgement-add><Plus /> Add a line</Button>
        </fieldset>
        <Field label="Disclaimer" hint="Shown on every check, never dismissible. Leave it empty to use the Sample default." error={errors.disclaimer}>
          <Textarea value={disclaimer} onChange={(e) => { setDirty(true); setDisclaimer(e.target.value); }} placeholder="Empty: the Sample default disclaimer goes into the release" />
        </Field>
      </form>
    </Dialog>
  );
}
