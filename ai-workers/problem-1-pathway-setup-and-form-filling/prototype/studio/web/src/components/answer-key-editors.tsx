// G4 (forms lane, C5.7; concept screens/G4-answer-keys/concept.md §3–§5, challenge M5 b): the Tests tab's editors,
// slice 2. Families: the author writes a made-up family (BR-1: people with library roles, facts on library fields, the
// "none apply" groups), Sample until the expert signs. The Expected editor (BR-2, BR-4; STANDARDS §3.2 pick, don't
// type): every mapped box of the form, per person of the family (a form can apply to one who stays home), in the form's order, with its caption and whose fact it
// reads; a choice box picks from the form's own options ("label (code)"); empty = stays blank. It never offers "fill
// from a run": the key must not copy the product's output. Boxes a person fills (signature, oath) are not offered.
// The server decides who may save (author for families; author or expert for keys) and says why on 403. US$0, no AI.
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import type { BoxesView, FamilyView, FieldsView, GateState, KeyView, LibraryField, Outcome, TestItem } from "../../../contracts/answer-keys";
import { OUTCOME_WORDS as CASE_CHECK_WORDS } from "../../../contracts/case-check-words";
import { api, ApiError, useApi, useSessionView, useToast } from "@/lib/api";
import { Button, Dialog, Field, Input, Notice, Pill, Select, Textarea, type ButtonProps } from "@/components/ui/controls";
import { PERSON } from "@/pages/job";

type Errors = Record<string, string>;

/** Review Major 1 (EXPERIENCE §4 read-only, §2.8 prevent errors): what this person may do on the Tests tab, by duty,
 *  with the reason a greyed control gives. The server still decides (a race keeps its sentence in the dialog). */
export const WHY = {
  family: "Only the configuration author writes test families.",
  key: "Only the configuration author or the immigration expert writes expected values.",
  run: "Only the configuration author or the immigration expert runs a test.",
  sign: "Only the immigration expert signs expected values.",
} as const;
export function useDuties() {
  const { session } = useSessionView();
  const d = (session.data?.actor?.duties ?? []) as readonly string[];
  const author = d.includes("author"), expert = d.includes("sme");
  return { family: author, key: author || expert, run: author || expert, sign: expert, readOnly: !!session.data?.actor && !author && !expert };
}
/** A greyed control that keeps focus and says why (aria-disabled, the reason as its title and description). */
export function Gated({ allowed, why, onClick, title, ...props }: ButtonProps & { allowed: boolean; why: string }) {
  const id = React.useId();
  return <>{/* the reason is read with the button */}<Button {...props} aria-disabled={!allowed || undefined} title={!allowed ? why : title} aria-describedby={!allowed ? id : undefined} onClick={allowed ? onClick : (e) => e.preventDefault()} />{!allowed ? <span id={id} className="sr-only">{why}</span> : null}</>;
}
const RELATIONS = [["parent_1", "first parent"], ["parent_2", "second parent"], ["sibling", "sibling"]] as const;
// B148 (P-236): the case check's own words (contracts/case-check-words.ts), so a key reads like the page it tests.
export const OUTCOME_WORDS: Record<Outcome, string> = CASE_CHECK_WORDS;
const GATE_WORDS: Record<GateState, string> = { met: "Met", not_met: "Not met", not_answered: "Not answered" };
export const SAMPLE_TIP = "Sample until the immigration expert signs the expected values (P-240).";

/** A refused save in words: 400 → each message on its field (the rest above the form); 403 and 409 → the server's own
 *  sentence (who may write; who saved last). */
function errorsOf(e: Error): { fields: Errors; top: string | null } {
  if (!(e instanceof ApiError)) return { fields: {}, top: e.message };
  if (e.status === 409) return { fields: {}, top: `Changed by someone else: ${e.message}` };
  if (e.status !== 400 || !e.problem.errors?.length) return { fields: {}, top: e.message };
  const fields: Errors = {};
  for (const x of e.problem.errors) fields[x.field] = fields[x.field] ? `${fields[x.field]} ${x.message}` : x.message;
  return { fields, top: null };
}
/** Messages on fields the form does not show (e.g. "people", "facts") are said above it, so none is lost. */
const rest = (fields: Errors, shown: (f: string) => boolean) => Object.entries(fields).filter(([f]) => !shown(f)).map(([, m]) => m);
/** A save whose refusal is said inside the dialog, on its fields (useAction would also toast it, over the footer). */
function useSave<V>(fn: (v: V) => Promise<unknown>, opts: { success: string; invalidate: unknown[][]; onDone: () => void }) {
  const qc = useQueryClient(), toast = useToast();
  return useMutation<unknown, Error, V>({ mutationFn: fn, onSuccess: () => { for (const k of opts.invalidate) void qc.invalidateQueries({ queryKey: k }); toast.push({ tone: "ok", text: opts.success }); opts.onDone(); } });
}
/** Break m7: while an editor holds unsaved changes, reloading or leaving the page asks first (the Dialog's own guard
 *  covers Escape, the X and the overlay). */
function useLeaveGuard(dirty: boolean) {
  React.useEffect(() => {
    if (!dirty) return;
    const ask = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", ask);
    return () => window.removeEventListener("beforeunload", ask);
  }, [dirty]);
}
/** Break P2-M2: what an editor shows while it reads the latest saved version (it never seeds from a stale list). */
function Reading({ title, close, problem }: { title: string; close: () => void; problem?: string | null }) {
  return <Dialog open wide onOpenChange={(o) => { if (!o) close(); }} title={title} footer={<Button variant="ghost" onClick={close}>Close</Button>}>{problem ? <Notice tone="danger" title="Cannot open">{problem}</Notice> : <p className="text-sm text-text-muted">Loading the latest saved version…</p>}</Dialog>;
}
/** A 409 in words (the server's sentence already says to reload): the button does it, and says what it drops. */
const Stale = ({ text, reload }: { text: string; reload: () => void }) => <Notice tone="danger" title="Not saved" action={<Button type="button" size="sm" variant="outline" onClick={reload}>Load their version</Button>}>{text} Loading it drops your changes here.</Notice>;
const Err = ({ id, text }: { id: string; text?: string }) => (text ? <p id={id} role="alert" className="mt-0.5 text-xs text-text-danger">{text}</p> : null);

// ------------------------------------------------------------------------------------------------ families (BR-1)
type Kind = "choice" | "yesno" | "date" | "number" | "json" | "text";
/** Break m1: a fact's control is chosen once, from its field (and, for a stored object such as a phone, from the value),
 *  never from the text being typed, so it does not change under the cursor. */
const kindOf = (f: LibraryField | undefined, json: boolean): Kind =>
  json || f?.parts ? "json" : f?.values?.length ? "choice" : f?.value_type === "yes_no" ? "yesno" : f?.value_type === "date" ? "date" : f?.value_type === "number" ? "number" : "text";
type FactRow = { about: string; fact: string; row: string; raw: string; json: boolean };
const rawOf = (v: unknown) => (v === undefined || v === null ? "" : typeof v === "object" ? JSON.stringify(v, null, 1) : String(v));
function valueOf(kind: Kind, raw: string): { value: unknown; bad?: string } {
  if (raw.trim() === "") return { value: "" };
  if (kind === "yesno") return { value: raw === "true" };
  if (kind === "number") return Number.isFinite(Number(raw)) ? { value: Number(raw) } : { value: raw, bad: "Write a number." };
  if (kind === "json") { try { return { value: JSON.parse(raw) }; } catch { return { value: raw, bad: "Write the parts as JSON, for example {\"city\": \"TORONTO\", \"country\": \"Canada\"}." }; } }
  return { value: raw };
}

function FactValue({ kind, field, raw, set, label, error, noteId }: { kind: Kind; field?: LibraryField; raw: string; set: (v: string) => void; label: string; error?: string; noteId: string }) {
  const common = { "aria-label": label, "aria-invalid": error ? true : undefined, "aria-describedby": error ? noteId : undefined };
  if (kind === "choice") {
    const vals = field?.values ?? [];
    return <Select {...common} value={raw} onChange={(e) => set(e.target.value)}><option value="">(choose)</option>{vals.map((v) => <option key={v.key} value={v.key}>{v.label}</option>)}{raw && !vals.some((v) => v.key === raw) ? <option value={raw}>{raw} (not in the list)</option> : null}</Select>;
  }
  if (kind === "yesno") return <Select {...common} value={raw} onChange={(e) => set(e.target.value)}><option value="">(choose)</option><option value="true">Yes</option><option value="false">No</option></Select>;
  if (kind === "json") return <Textarea {...common} className="min-h-16 font-mono text-xs" value={raw} onChange={(e) => set(e.target.value)} />;
  return <Input {...common} type={kind === "date" ? "date" : kind === "number" ? "number" : "text"} value={raw} onChange={(e) => set(e.target.value)} maxLength={500} />;
}

/** Write or change one family. `signedKeys`: keys of this family signed in this combination (a change then needs a
 *  reason, BR-7); the server also asks for one when a key elsewhere is signed, and the field then appears. */
export function FamilyEditor({ combinationId, family, signedKeys, close }: { combinationId: string; family: FamilyView | null; signedKeys: number; close: () => void }) {
  const roles = useApi<Role[]>(["library", "roles"], "/library/roles");
  const fieldsQ = useApi<FieldsView>(["answer-keys", "fields"], "/answer-keys/fields");
  const sections = useApi<Section[]>(["library", "sections"], "/library/sections");
  // Break P2-M2: the family is read again when the editor opens, and after a 409, so it never edits a stale copy.
  const fams = useApi<{ families: FamilyView[] }>(["answer-key-families"], "/answer-keys/families", { refetchOnMount: "always" });
  const qc = useQueryClient();
  const [gen, setGen] = React.useState(0);
  const title = family ? `Change the family "${family.key}"` : "Write a test family";
  const failed = roles.isError || fieldsQ.isError || sections.isError || (family && fams.isError) ? "The library or the family could not be loaded. Try again in a moment." : null;
  if (failed) return <Reading title={title} close={close} problem={failed} />;
  if (!roles.data || !fieldsQ.data || !sections.data || (family && !fams.isFetchedAfterMount)) return <Reading title={title} close={close} />;
  const fresh = family ? fams.data?.families.find((f) => f.id === family.id) ?? null : null;
  if (family && !fresh) return <Reading title={title} close={close} problem="This family no longer exists (it may have been removed by a reset)." />;
  const reload = () => { void qc.invalidateQueries({ queryKey: ["combination", combinationId, "answer-keys"] }); void fams.refetch().then(() => setGen((g) => g + 1)); };
  return <FamilyForm key={gen} combinationId={combinationId} family={fresh} signedKeys={signedKeys} close={close} roles={roles.data} fields={fieldsQ.data.fields} sections={sections.data} reload={reload} />;
}
type Role = { key: string; label: string; retired: boolean };
type Section = { key: string; title: string; retired: boolean };

function FamilyForm({ combinationId, family: latest, signedKeys, close, roles, fields, sections, reload }: { combinationId: string; family: FamilyView | null; signedKeys: number; close: () => void; roles: Role[]; fields: LibraryField[]; sections: Section[]; reload: () => void }) {
  const qc = useQueryClient();
  // The version read when the form opened: a refetch after a 409 must never move it (that would overwrite their change).
  const [family] = React.useState(latest);
  const fieldOf = React.useMemo(() => new Map(fields.map((f) => [f.id, f])), [fields]);
  const [dirty, setDirty] = React.useState(false), [stale, setStale] = React.useState<string | null>(null);
  useLeaveGuard(dirty);
  const [key, setKey] = React.useState(""), [label, setLabel] = React.useState(family?.label ?? ""), [ref, setRef] = React.useState(family?.reference_date ?? "");
  const [people, setPeople] = React.useState(family?.people ?? [{ id: "principal", role: "principal", label: "", applies: true }]);
  const [facts, setFacts] = React.useState<FactRow[]>((family?.facts ?? []).map((f) => ({ about: f.about, fact: f.fact, row: f.row === null || f.row === undefined ? "" : String(f.row), raw: rawOf(f.value), json: f.value !== null && typeof f.value === "object" })));
  const [none, setNone] = React.useState(family?.none_apply ?? []);
  const [reason, setReason] = React.useState(""), [askReason, setAskReason] = React.useState(signedKeys > 0);
  const [errors, setErrors] = React.useState<Errors>({}), [top, setTop] = React.useState<string | null>(null);
  const kinds = facts.map((f) => kindOf(fieldOf.get(f.fact), f.json));
  const save = useSave((body: unknown) => (family ? api(`/answer-keys/families/${family.id}`, { method: "PUT", json: body }) : api("/answer-keys/families", { method: "POST", json: body })),
    { success: family ? "Family saved (Sample)" : "Family written (Sample)", invalidate: [["answer-key-families"], ["combination", combinationId, "answer-keys"], ["answer-key"]], onDone: close });
  const submit = () => {
    if (save.isPending) return;
    const local: Errors = {};
    const out = facts.map((f, i) => { const v = valueOf(kinds[i], f.raw); if (v.bad) local[`facts[${i}].value`] = v.bad; return { about: f.about, fact: f.fact, ...(f.row.trim() !== "" ? { row: Number(f.row) } : {}), value: v.value }; });
    if (Object.keys(local).length) { setErrors(local); setTop(null); return; }
    const body = { ...(family ? { version: family.version } : { key }), label, reference_date: ref, people, facts: out, none_apply: none, ...(askReason && reason.trim() ? { reason } : {}) };
    save.mutate(body, { onError: (e) => {
      const r = errorsOf(e); setErrors(r.fields); setTop(e instanceof ApiError && e.status === 409 ? null : r.top); if (r.fields.reason) setAskReason(true);
      if (e instanceof ApiError && e.status === 409) { setStale(r.top); void qc.invalidateQueries({ queryKey: ["answer-key-families"] }); void qc.invalidateQueries({ queryKey: ["combination", combinationId, "answer-keys"] }); } else setStale(null);
    } });
  };
  const abouts = [...people.map((p) => p.id).filter(Boolean).map((id) => [id, people.find((p) => p.id === id)?.label || id] as const), ["case", "the application"] as const,
    ...people.map((p) => p.id).filter(Boolean).flatMap((id) => RELATIONS.map(([r, w]) => [`${id}/${r}`, `${people.find((p) => p.id === id)?.label || id}: ${w}`] as const))];
  const shown = (f: string) => ["key", "label", "reference_date", "reason"].includes(f) || /^(people|facts|none_apply)\[\d+\]/.test(f);
  const others = rest(errors, shown);
  const setPerson = (i: number, patch: Partial<FamilyView["people"][number]>) => setPeople((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  /** Devin review: a person goes with their facts (and their relatives': "<id>/parent_1", …) and "none apply" groups,
   *  which the server would otherwise refuse as about nobody; a confirm names how many. */
  const removePerson = (i: number) => {
    const id = people[i].id, mine = (about: string) => about === id || about.startsWith(`${id}/`);
    const nf = facts.filter((f) => mine(f.about)).length, nn = none.filter((n) => n.about === id).length;
    if ((nf || nn) && !window.confirm(`Remove ${people[i].label || id}? This also removes ${nf} fact${nf === 1 ? "" : "s"} about them${nn ? ` and ${nn} "none apply" group${nn === 1 ? "" : "s"}` : ""}.`)) return;
    setPeople((ps) => ps.filter((_, j) => j !== i)); setFacts((fs) => fs.filter((f) => !mine(f.about))); setNone((ns) => ns.filter((n) => n.about !== id)); setDirty(true);
  };
  const setFact = (i: number, patch: Partial<FactRow>) => setFacts((fs) => fs.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  return (
    <Dialog open wide guard onOpenChange={(o) => { if (!o) close(); }} title={family ? `Change the family "${family.key}"` : "Write a test family"}
      description="A made-up family, never a real client (no client data). It reads Sample until the immigration expert signs the expected values."
      footer={<><Button variant="ghost" onClick={close}>Cancel</Button><Button busy={save.isPending} onClick={submit}>{family ? "Save the family" : "Write the family"}</Button></>}>
      <form className="space-y-4" aria-label="Test family" onChangeCapture={() => setDirty(true)} onSubmit={(e) => { e.preventDefault(); submit(); }} data-editor="family">
        {stale ? <Stale text={stale} reload={reload} /> : null}
        {top ? <Notice tone="danger" title="Not saved">{top}</Notice> : null}
        {others.length ? <Notice tone="danger" title="Some details need fixing">{others.join(" ")}</Notice> : null}
        <div className="grid gap-3 sm:grid-cols-3">
          {!family ? <Field label="Key" hint="Lower-case letters, digits, - or _; it cannot change later." error={errors.key}><Input value={key} onChange={(e) => setKey(e.target.value)} maxLength={40} /></Field> : null}
          <Field label="Name" hint="Say it is made up, e.g. '… (Sample)'." error={errors.label} className={family ? "sm:col-span-2" : undefined}><Input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={120} /></Field>
          <Field label="Reference date" hint="Ages are worked out on it." error={errors.reference_date}><Input type="date" value={ref} onChange={(e) => setRef(e.target.value)} /></Field>
        </div>

        <fieldset className="min-w-0 space-y-2"><legend className="text-sm font-semibold">People</legend>
          {people.map((p, i) => (
            <div key={i} className="grid items-start gap-2 sm:grid-cols-[minmax(0,8rem)_minmax(0,10rem)_minmax(0,1fr)_minmax(0,7rem)_auto] [&>*]:min-w-0" data-person-row={i}>
              <div><Input aria-label={`Person ${i + 1}: id`} value={p.id} onChange={(e) => setPerson(i, { id: e.target.value })} maxLength={24} aria-invalid={errors[`people[${i}].id`] ? true : undefined} aria-describedby={errors[`people[${i}].id`] ? `pid-${i}` : undefined} /><Err id={`pid-${i}`} text={errors[`people[${i}].id`]} /></div>
              <div><Select aria-label={`Person ${i + 1}: role`} value={p.role} onChange={(e) => setPerson(i, { role: e.target.value })} aria-invalid={errors[`people[${i}].role`] ? true : undefined}>{roles.filter((r) => !r.retired || r.key === p.role).map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}</Select><Err id={`prole-${i}`} text={errors[`people[${i}].role`]} /></div>
              <div><Input aria-label={`Person ${i + 1}: made-up name`} placeholder="EXAMPLE NAME (Sample)" value={p.label} onChange={(e) => setPerson(i, { label: e.target.value })} maxLength={120} aria-invalid={errors[`people[${i}].label`] ? true : undefined} /><Err id={`plabel-${i}`} text={errors[`people[${i}].label`]} /></div>
              <Select aria-label={`Person ${i + 1}: travelling`} value={p.applies ? "yes" : "no"} onChange={(e) => setPerson(i, { applies: e.target.value === "yes" })}><option value="yes">Travelling</option><option value="no">Stays home</option></Select>
              <Button type="button" size="sm" variant="ghost" disabled={people.length < 2} onClick={() => removePerson(i)}>Remove</Button>
            </div>
          ))}
          <Button type="button" size="sm" variant="outline" onClick={() => setPeople((ps) => [...ps, { id: `person_${ps.length + 1}`, role: "spouse_or_partner", label: "", applies: true }])}>Add a person</Button>
        </fieldset>

        <fieldset className="min-w-0 space-y-2"><legend className="text-sm font-semibold">Facts</legend>
          <p className="text-xs text-text-muted">Each fact is a library field about a person, the application, or a relative a form describes. Rows count from 0 for repeating answers (education, travel). An address or a phone is written as its parts in JSON (a small text area for now).</p>
          {facts.map((f, i) => {
            const fe = (k: string) => errors[`facts[${i}].${k}`], field = fieldOf.get(f.fact);
            return (
              <div key={i} className="grid items-start gap-2 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)_minmax(0,4.5rem)_minmax(0,1fr)_auto] [&>*]:min-w-0" data-fact-row={i}>
                <div><Select aria-label={`Fact ${i + 1}: about`} value={f.about} onChange={(e) => setFact(i, { about: e.target.value })} aria-invalid={fe("about") ? true : undefined}><option value="">(choose)</option>{abouts.map(([v, w]) => <option key={v} value={v}>{w}</option>)}{f.about && !abouts.some(([v]) => v === f.about) ? <option value={f.about}>{f.about}</option> : null}</Select><Err id={`fa-${i}`} text={fe("about")} /></div>
                <div><Select aria-label={`Fact ${i + 1}: field`} value={f.fact} onChange={(e) => setFact(i, { fact: e.target.value, raw: "", json: false })} aria-invalid={fe("fact") ? true : undefined}><option value="">(choose a field)</option>{fields.map((x) => <option key={x.id} value={x.id} title={x.id}>{x.label.length > 70 ? `${x.label.slice(0, 69)}…` : x.label}</option>)}{f.fact && !field ? <option value={f.fact}>{f.fact} (not in the library)</option> : null}</Select>
                  {field ? <p className="mt-0.5 truncate text-xs text-text-muted" title={field.label}>{field.id}</p> : null}<Err id={`ff-${i}`} text={fe("fact") ?? errors[`facts[${i}]`]} /></div>
                <div><Input aria-label={`Fact ${i + 1}: row`} type="number" min={0} max={49} placeholder="—" value={f.row} onChange={(e) => setFact(i, { row: e.target.value })} aria-invalid={fe("row") ? true : undefined} /><Err id={`fr-${i}`} text={fe("row")} /></div>
                <div><FactValue kind={kinds[i]} field={field} raw={f.raw} set={(v) => setFact(i, { raw: v })} label={`Fact ${i + 1}: value`} error={fe("value")} noteId={`fv-${i}`} /><Err id={`fv-${i}`} text={fe("value")} /></div>
                <Button type="button" size="sm" variant="ghost" onClick={() => setFacts((fs) => fs.filter((_, j) => j !== i))}>Remove</Button>
              </div>
            );
          })}
          <Button type="button" size="sm" variant="outline" onClick={() => setFacts((fs) => [...fs, { about: people[0]?.id ?? "", fact: "", row: "", raw: "", json: false }])}>Add a fact</Button>
        </fieldset>

        <fieldset className="min-w-0 space-y-2"><legend className="text-sm font-semibold">"None apply"</legend>
          <p className="text-xs text-text-muted">A repeating group the person confirmed has nothing to list (the form's "N" answers).</p>
          {none.map((n, i) => (
            <div key={i} className="grid items-start gap-2 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)_auto] [&>*]:min-w-0" data-none-row={i}>
              <Select aria-label={`None apply ${i + 1}: person`} value={n.about} onChange={(e) => setNone((ns) => ns.map((x, j) => (j === i ? { ...x, about: e.target.value } : x)))}>{people.map((p) => <option key={p.id} value={p.id}>{p.label || p.id}</option>)}</Select>
              <div><Select aria-label={`None apply ${i + 1}: group`} value={n.group} onChange={(e) => setNone((ns) => ns.map((x, j) => (j === i ? { ...x, group: e.target.value } : x)))} aria-invalid={errors[`none_apply[${i}].group`] || errors[`none_apply[${i}]`] ? true : undefined}><option value="">(choose)</option>{sections.filter((s) => !s.retired || s.key === n.group).map((s) => <option key={s.key} value={s.key}>{s.title}</option>)}</Select><Err id={`ng-${i}`} text={errors[`none_apply[${i}].group`] ?? errors[`none_apply[${i}].about`] ?? errors[`none_apply[${i}]`]} /></div>
              <Button type="button" size="sm" variant="ghost" onClick={() => setNone((ns) => ns.filter((_, j) => j !== i))}>Remove</Button>
            </div>
          ))}
          <Button type="button" size="sm" variant="outline" onClick={() => setNone((ns) => [...ns, { about: people[0]?.id ?? "", group: "" }])}>Add a "none apply" group</Button>
        </fieldset>

        {family && askReason ? <Field label="Reason for the change" hint="A signed key uses this family: it goes back to Draft for the expert to sign again." error={errors.reason}><Input value={reason} onChange={(e) => setReason(e.target.value.replace(/[\r\n]+/g, " "))} maxLength={300} /></Field> : null}
        <button type="submit" hidden />
      </form>
    </Dialog>
  );
}

/** The Families section (concept §4 top): each family with its Sample badge, people and facts counts, and Edit. */
export function FamiliesSection({ combinationId, keys }: { combinationId: string; keys: KeyView[] }) {
  const q = useApi<{ sample: string; families: FamilyView[] }>(["answer-key-families"], "/answer-keys/families");
  const [open, setOpen] = React.useState<FamilyView | "new" | null>(null);
  const fams = q.data?.families ?? [], may = useDuties();
  return (
    <section aria-label="Families" className="space-y-2">
      <div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold">Families</h3><span className="flex-1" /><Gated size="sm" variant="outline" allowed={may.family} why={WHY.family} onClick={() => setOpen("new")}>Write a family</Gated></div>
      {q.isLoading ? <p className="text-sm text-text-muted">Loading the families…</p> : q.isError ? <Notice tone="danger" title="The families could not be loaded">Try again in a moment.</Notice>
        : !fams.length ? <p className="text-sm text-text-muted">No test families yet. Write a made-up family: never a real client.</p>
        : <ul className="space-y-1">{fams.map((f) => (
          <li key={f.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm" data-family={f.key}>
            <span className="min-w-0 font-medium [overflow-wrap:anywhere]">{f.label}</span><Pill tone="warn" title={SAMPLE_TIP}>Sample</Pill>
            <span className="text-xs text-text-muted">{f.people.length} {f.people.length === 1 ? "person" : "people"} · {f.facts.length} facts · read on {f.reference_date}</span>
            <span className="flex-1" /><Gated size="sm" variant="ghost" aria-label={`Edit the family ${f.label}`} allowed={may.family} why={WHY.family} onClick={() => setOpen(f)}>Edit</Gated>
          </li>))}</ul>}
      {open ? <FamilyEditor combinationId={combinationId} family={open === "new" ? null : open} signedKeys={open === "new" ? 0 : keys.filter((k) => k.family.id === open.id && k.state === "SIGNED").length} close={() => setOpen(null)} /> : null}
    </section>
  );
}

// ------------------------------------------------------------------------------------------------ expected values (BR-2, BR-4)
type MapPeople = Record<string, Record<string, string>>;
type RulePeople = Record<string, { outcome: Outcome | ""; gates: Record<string, GateState | ""> }>;

/** The Expected editor for one family and item: write (no key yet) or Change (a key). */
export function KeyEditor({ combinationId, item, family, existing, close }: { combinationId: string; item: TestItem; family: FamilyView; existing: KeyView | null; close: () => void }) {
  // Break P2-M2: a key is read again when the editor opens and after a 409 (its values, version and state).
  const k = useApi<KeyView>(["answer-key", existing?.id ?? "none"], existing ? `/answer-keys/${existing.id}` : null, { refetchOnMount: "always" });
  const [gen, setGen] = React.useState(0);
  const title = `${existing ? "Change" : "Write"} the expected values: ${family.label}`;
  if (existing && k.isError) return <Reading title={title} close={close} problem={(k.error as Error).message} />;
  if (existing && (!k.data || !k.isFetchedAfterMount)) return <Reading title={title} close={close} />;
  return <KeyForm key={gen} combinationId={combinationId} item={item} family={family} existing={existing ? k.data! : null} close={close} reload={() => void k.refetch().then(() => setGen((g) => g + 1))} />;
}

function KeyForm({ combinationId, item, family, existing: latest, close, reload }: { combinationId: string; item: TestItem; family: FamilyView; existing: KeyView | null; close: () => void; reload: () => void }) {
  const qc = useQueryClient(), author = useDuties().family;
  const [existing] = React.useState(latest); // the version read when the form opened (see FamilyForm)
  const [dirty, setDirty] = React.useState(false), [stale, setStale] = React.useState<string | null>(null);
  useLeaveGuard(dirty);
  const map = item.item_kind === "field_map";
  // G2 (Devin on #568): the boxes of this item's own edition (a combination may hold several editions of a form).
  const boxes = useApi<BoxesView>(["answer-key-boxes", combinationId, item.item_ref, item.edition ?? ""], map ? `/combinations/${combinationId}/answer-keys/boxes?form=${encodeURIComponent(item.item_ref)}${item.edition ? `&edition=${encodeURIComponent(item.edition)}` : ""}` : null);
  const gates = useApi<{ gates: { key: string; label: string }[] }>(["combination", combinationId, "eligibility-gates"], map ? null : `/combinations/${combinationId}/eligibility-gates`);
  // Devin review: a form can apply to a person who stays home (a spouse's own form, "each person"), so a field map offers
  // every person of the family; eligibility is for the people who travel (C6.9 BR-7). A person left empty is not sent.
  const travelling = map ? family.people : family.people.filter((p) => p.applies);
  const had = (existing?.expected.people ?? {}) as Record<string, unknown>;
  const [values, setValues] = React.useState<MapPeople>(() => Object.fromEntries(travelling.map((p) => [p.id, { ...((map ? had[p.id] : null) as Record<string, string> | null ?? {}) }])));
  const [rules, setRules] = React.useState<RulePeople>(() => Object.fromEntries(travelling.map((p) => { const h = (!map ? had[p.id] : null) as { outcome?: Outcome; gates?: Record<string, GateState> } | null; return [p.id, { outcome: h?.outcome ?? "", gates: { ...(h?.gates ?? {}) } }]; })));
  const [reason, setReason] = React.useState(""), [errors, setErrors] = React.useState<Errors>({}), [top, setTop] = React.useState<string | null>(null);
  // Break P2-M1: a key signed while it is being changed asks for the reason as soon as the server says so.
  const [signed, setSigned] = React.useState(existing?.state === "SIGNED");
  const dropped = Object.keys(had).filter((id) => !travelling.some((p) => p.id === id));
  const inv = [["combination", combinationId, "answer-keys"], ...(existing ? [["answer-key", existing.id]] : [])];
  const save = useSave((body: unknown) => (existing ? api(`/answer-keys/${existing.id}`, { method: "PUT", json: body }) : api(`/combinations/${combinationId}/answer-keys`, { method: "POST", json: body })),
    { success: `Expected values saved for ${family.label} (Draft, Sample)`, invalidate: inv, onDone: close });
  const submit = () => {
    if (save.isPending) return;
    const people = map
      ? Object.fromEntries(Object.entries(values).map(([id, v]) => [id, Object.fromEntries(Object.entries(v).filter(([b, x]) => x !== "" && (!moving || known.has(b))))]).filter(([, v]) => Object.keys(v as object).length))
      : Object.fromEntries(Object.entries(rules).filter(([, r]) => r.outcome).map(([id, r]) => [id, { outcome: r.outcome, ...(Object.values(r.gates).some(Boolean) ? { gates: Object.fromEntries(Object.entries(r.gates).filter(([, g]) => g)) } : {}) }]));
    const expected = { ...(current ? { edition: current } : {}), people };
    const body = existing ? { expected, version: existing.version, ...(signed ? { reason } : {}) } : { family_id: family.id, item_kind: item.item_kind, item_ref: item.item_ref, expected };
    save.mutate(body, { onError: (e) => {
      const r = errorsOf(e), conflict = e instanceof ApiError && e.status === 409;
      setErrors(r.fields); setTop(conflict ? null : r.top); setStale(conflict ? r.top : null);
      if (r.fields.reason) setSigned(true);
      if (existing && e instanceof ApiError && (e.status === 400 || conflict)) {
        for (const q of inv) void qc.invalidateQueries({ queryKey: q });
        void api<KeyView>(`/answer-keys/${existing.id}`).then((now) => { if (now.state === "SIGNED") setSigned(true); }).catch(() => undefined);
      }
    } });
  };
  // Devin review: a key written for another edition is moved to the map's edition by a save (it is said first).
  const current = map ? boxes.data?.edition ?? item.edition ?? null : null, stored = map ? existing?.expected.edition ?? null : null;
  const offered = (boxes.data?.boxes ?? []).filter((b) => !b.by_a_person), byPerson = (boxes.data?.boxes ?? []).length - offered.length;
  // Devin review (2nd pass): moving to the map's edition keeps only the boxes that edition has; the rest are said, then
  // dropped on save (the server would refuse them). Without an edition change nothing is dropped here.
  const moving = !!(stored && current && stored !== current && boxes.data), known = new Set(offered.map((b) => b.data_path));
  const lost = moving ? Object.entries(values).flatMap(([id, v]) => Object.entries(v).filter(([b, x]) => x !== "" && !known.has(b)).map(([b]) => `${boxes.data?.captions[b] ?? "a form field no longer on the form"} (${family.people.find((x) => x.id === id)?.label ?? id})`)) : [];
  const shown = (f: string) => f === "reason" || /^expected\.people\.[^.]+\./.test(f);
  const others = rest(errors, shown);
  const loading = map ? boxes.isLoading : gates.isLoading;
  return (
    <Dialog open wide guard onOpenChange={(o) => { if (!o) close(); }} title={`${existing ? "Change" : "Write"} the expected values: ${family.label}`}
      description={map ? `${item.label} (${boxes.data?.edition ?? item.edition ?? ""}). What each form field must hold, as written in it (codes, "N", the year form fields). Leave a form field empty when it must stay blank.` : "What the eligibility rules must give each travelling person."}
      footer={<><Button variant="ghost" onClick={close}>Cancel</Button><Button busy={save.isPending} disabled={loading} onClick={submit}>Save the expected values</Button></>}>
      <form className="space-y-4" aria-label="Expected values" onChangeCapture={() => setDirty(true)} onSubmit={(e) => { e.preventDefault(); submit(); }} data-editor="expected">
        {stale ? <Stale text={stale} reload={reload} /> : null}
        {top ? <Notice tone="danger" title="Not saved">{top}</Notice> : null}
        {others.length ? <Notice tone="danger" title="Some details need fixing">{others.join(" ")}</Notice> : null}
        {dropped.length ? <Notice tone="warn" title={map ? "Values for someone not in the family" : "Values for someone not travelling"}>The key has expected values for {dropped.join(", ")}, who {dropped.length === 1 ? "is" : "are"} not {map ? "a person" : "a travelling person"} of this family now. Saving removes them; Cancel keeps them, and the next run fails naming {dropped.length === 1 ? "that person" : "them"}.</Notice> : null}
        {stored && current && stored !== current ? <Notice tone="warn" title="Another edition">Written for {stored}; the map is now {current}: saving moves it to {current}. Check every value against the new edition first.{lost.length ? ` ${lost.length} value${lost.length === 1 ? "" : "s"} for form fields the new edition no longer has will be dropped: ${lost.join(", ")}.` : ""}</Notice> : null}
        <p className="text-xs text-text-muted">Write what the {map ? "form should hold" : "rules should give"} for this family from the {map ? "form" : "rules"} and the facts, never from a run: a key copied from the product's output proves nothing. <Pill tone="warn" title={SAMPLE_TIP}>Sample</Pill></p>
        {loading ? <p className="text-sm text-text-muted">Loading the {map ? "form's fields" : "eligibility rules"}…</p> : null}
        {map && boxes.isError ? <Notice tone="danger" title="The form's fields could not be loaded">{(boxes.error as Error).message}</Notice> : null}
        {map && byPerson ? <p className="text-xs text-text-muted">{byPerson} form field{byPerson === 1 ? "" : "s"} a person fills (a signature, the oath) {byPerson === 1 ? "is" : "are"} not offered: the product never writes {byPerson === 1 ? "it" : "them"}.</p> : null}
        {!travelling.length ? <Notice tone="warn">{map ? "This family has nobody in it." : "Nobody in this family travels: there is nothing to expect."}</Notice> : null}
        {travelling.map((p) => (
          <section key={p.id} aria-label={`Expected for ${p.label}`} className="space-y-1" data-person={p.id}>
            <h4 className="text-sm font-semibold">{p.label}{!p.applies ? <span className="ml-2 font-normal text-text-muted">not travelling: give values only if {item.item_ref} applies to them</span> : null}</h4>
            {map ? (
              <div className="divide-y divide-border rounded-lg border border-border">
                {offered.map((b) => {
                  const v = values[p.id]?.[b.data_path] ?? "", err = errors[`expected.people.${p.id}.${b.data_path}`], nid = `e-${p.id}-${b.data_path}`;
                  const set = (x: string) => setValues((all) => ({ ...all, [p.id]: { ...all[p.id], [b.data_path]: x } }));
                  const name = `${b.caption} (${p.label})`;
                  return (
                    <div key={b.data_path} className="grid items-start gap-2 px-3 py-1.5 sm:grid-cols-[1fr_16rem]" data-box={b.data_path}>
                      <div className="min-w-0 text-sm"><span className="[overflow-wrap:anywhere]" title={author ? b.data_path : undefined}>{b.caption}</span>
                        <span className="block text-xs text-text-muted [overflow-wrap:anywhere]">{PERSON[b.whose] ?? b.whose.replace(/_/g, " ")}</span></div>
                      <div>
                        {b.options.length ? (
                          <Select aria-label={name} value={v} onChange={(e) => set(e.target.value)} aria-invalid={err ? true : undefined} aria-describedby={err ? nid : undefined}>
                            <option value="">(stays blank)</option>{b.options.map((o) => <option key={o.code} value={o.code}>{o.label === o.code ? o.code : `${o.label} (${o.code})`}</option>)}
                            {v && !b.options.some((o) => o.code === v) ? <option value={v}>{v} (not an option of the form)</option> : null}
                          </Select>
                        ) : <Input aria-label={name} placeholder="(stays blank)" value={v} onChange={(e) => set(e.target.value)} maxLength={500} aria-invalid={err ? true : undefined} aria-describedby={err ? nid : undefined} />}
                        <Err id={nid} text={err} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                <Field label={`Outcome for ${p.label}`} error={errors[`expected.people.${p.id}.outcome`] ?? errors[`expected.people.${p.id}`]}>
                  <Select value={rules[p.id]?.outcome ?? ""} onChange={(e) => setRules((all) => ({ ...all, [p.id]: { ...all[p.id], outcome: e.target.value as Outcome | "" } }))}><option value="">(choose)</option>{(Object.keys(OUTCOME_WORDS) as Outcome[]).map((o) => <option key={o} value={o}>{OUTCOME_WORDS[o]}</option>)}</Select>
                </Field>
                {(gates.data?.gates ?? []).map((g) => (
                  <Field key={g.key} label={`${g.label}: ${p.label}`} hint="Optional" error={errors[`expected.people.${p.id}.gates.${g.key}`]}>
                    <Select value={rules[p.id]?.gates[g.key] ?? ""} onChange={(e) => setRules((all) => ({ ...all, [p.id]: { ...all[p.id], gates: { ...all[p.id].gates, [g.key]: e.target.value as GateState | "" } } }))}><option value="">(not checked)</option>{(Object.keys(GATE_WORDS) as GateState[]).map((s) => <option key={s} value={s}>{GATE_WORDS[s]}</option>)}</Select>
                  </Field>
                ))}
              </div>
            )}
          </section>
        ))}
        {signed ? <Field label="Reason for the change" hint="These values are signed: the change returns them to Draft for the expert to sign again." error={errors.reason}><Input value={reason} onChange={(e) => setReason(e.target.value.replace(/[\r\n]+/g, " "))} maxLength={300} /></Field> : null}
        <button type="submit" hidden />
      </form>
    </Dialog>
  );
}

/** Under each item: pick a family that has no key for it yet and write its expected values. */
export function WriteKey({ combinationId, item, families, keys }: { combinationId: string; item: TestItem; families: FamilyView[]; keys: KeyView[] }) {
  const free = families.filter((f) => !keys.some((k) => k.family.id === f.id));
  const [pick, setPick] = React.useState(""), [open, setOpen] = React.useState(false);
  const fam = free.find((f) => f.id === pick) ?? free[0], may = useDuties();
  if (!free.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select aria-label={`Family for ${item.label}`} className="w-auto max-w-sm" value={fam?.id ?? ""} onChange={(e) => setPick(e.target.value)}>{free.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}</Select>
      <Gated size="sm" variant="outline" allowed={may.key} why={WHY.key} onClick={() => setOpen(true)}>Write expected values</Gated>
      {open && fam ? <KeyEditor combinationId={combinationId} item={item} family={fam} existing={null} close={() => setOpen(false)} /> : null}
    </div>
  );
}
