import * as React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useSourceUpload } from "@/pages/sources";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { api, useAction, useApi } from "@/lib/api";
import { Button, Dialog, Field, Input, Notice, Pill, Select, Table, Textarea } from "@/components/ui/controls";
import { Spinner } from "@/components/ui/spinner";
import { ConditionBuilder, plainCondition, type FieldInfo } from "@/components/conditions";
import { cn } from "@/lib/utils";

const WHO: [string, string][] = [["each_applicant", "Each applicant"], ["principal_applicant", "Principal applicant"], ["spouse_or_partner", "Spouse or partner"], ["couple_once", "Once per couple"], ["each_dependent_child", "Each child"], ["each_person", "Each person"], ["case", "The application (once)"], ["representative", "The representative"], ["sponsor", "The sponsor (Sample role)"]];
export const whoLabel = (w: string) => WHO.find(([v]) => v === w)?.[1] ?? w;
/** Revision tokens of the draft rows the editors open (sent back so a concurrent change is refused, not overwritten). */
const RevCtx = React.createContext<Record<string, string>>({});
const SUBS = [["forms", "Forms"], ["documents", "Documents"], ["rules", "Rules"], ["questions", "Questions and sections"], ["checks", "Checks"]] as const;

export function useLibraryFields() {
  const q = useApi<any[]>(["fields"], "/library/fields");
  const list: FieldInfo[] = (q.data ?? []).map((f) => ({ key: f.key, meaning: f.meaning, value_type: f.value_type }));
  const meaning = React.useCallback((k: string) => list.find((f) => f.key === k)?.meaning ?? k, [list]);
  return { list, meaning, loading: q.isLoading };
}

export function OriginPill({ origin, status }: { origin?: string; status?: string }) {
  return (
    <span className="inline-flex gap-1">
      {status === "DRAFT" ? <Pill tone="warn">Draft</Pill> : status === "RETIRED" ? <Pill tone="danger">Removed in draft</Pill> : null}
      {origin === "AI_PROPOSAL" ? <Pill tone="ai">AI-proposed</Pill> : origin === "HUMAN" ? <Pill tone="info">Edited by a person</Pill> : origin === "IMPORTED_RELEASE" ? <Pill title="From the reviewed release c1-v3">Imported release</Pill> : null}
    </span>
  );
}

/** areas: the parts a Screen 03 tab shows until its slice rebuilds it (SQR: questions and checks; Documents; Rules). */
export function ConfigurationTab({ d, areas }: { d: any; areas?: (typeof SUBS)[number][0][] }) {
  const id = d.combination.id;
  const [params, setParams] = useSearchParams();
  const area = params.get("area");
  const subs = SUBS.filter(([k]) => !areas || areas.includes(k));
  const [sub, setSubState] = React.useState<(typeof SUBS)[number][0]>(subs.some(([k]) => k === area) ? (area as any) : subs[0][0]);
  const setSub = (k: (typeof SUBS)[number][0]) => { setSubState(k); const n = new URLSearchParams(params); n.set("area", k); setParams(n, { replace: true }); };
  const cfg = useApi<any>(["config", id, "draft"], `/combinations/${id}/config?mode=draft`);
  const fields = useLibraryFields();
  if (cfg.isLoading) return <Spinner label="Loading configuration" />;
  if (cfg.isError) return <Notice tone="danger" title="The configuration could not be loaded">{(cfg.error as Error).message}</Notice>;
  const s = cfg.data.snapshot;
  return (
    <RevCtx.Provider value={cfg.data.revisions ?? {}}>
    <div className="space-y-4">
      <Notice tone="info">You are editing the <b>draft</b>. Every save is validated and versioned; the released version stays exactly as approved until a new release. Preview shows the effect immediately.</Notice>
      {subs.length > 1 ? <div role="tablist" className="flex gap-1">{subs.map(([k, l]) => <button key={k} role="tab" aria-selected={sub === k} onClick={() => setSub(k)} className={cn("rounded-lg px-3 py-1.5 text-sm", sub === k ? "bg-primary/10 font-medium text-text-link" : "text-text-muted hover:bg-text/5")}>{l} <span className="text-xs">({k === "forms" ? s.forms.length : k === "documents" ? s.document_requirements.length : k === "rules" ? s.rules.length : k === "questions" ? s.sections.length : s.checks.length})</span></button>)}</div> : null}
      {sub === "forms" ? <Forms id={id} s={s} fields={fields} /> : sub === "documents" ? <Documents id={id} s={s} fields={fields} /> : sub === "rules" ? <Rules id={id} s={s} fields={fields} /> : sub === "questions" ? <Questions id={id} s={s} /> : <Checks s={s} meaning={fields.meaning} />}
    </div>
    </RevCtx.Provider>
  );
}

function Forms({ id, s, fields }: { id: string; s: any; fields: any }) {
  const [edit, setEdit] = React.useState<any>(null);
  const boxes = (f: string) => s.field_maps.find((m: any) => m.form_number === f);
  return (
    <>
      <Table head={["Form", "Who files it", "When", "Field map", ""]}>
        {s.forms.map((f: any) => { const m = boxes(f.form_number); return (
          <tr key={f.form_number}>
            <td><p className="font-medium">{f.form_number}</p><p className="text-xs text-text-muted">{f.title}</p><OriginPill origin={f.origin} status={s.row_versions?.[`form:${f.form_number}`]?.includes("DRAFT") ? "DRAFT" : undefined} /></td>
            <td>{whoLabel(f.who)}</td>
            <td className="max-w-md text-xs">{f.status === "always" ? <Pill tone="ok">Always</Pill> : <><Pill tone="warn">Conditional</Pill><p className="mt-1">{f.condition_plain ?? plainCondition(f.condition, fields.meaning)}</p></>}</td>
            <td className="text-xs">{m ? <>{m.form_edition}<br /><span className="text-text-muted">{m.entries.filter((e: any) => e.outcome === "mapped").length} mapped of {m.entries.length} form fields</span></> : f.form_kind === "document" ? <span className="text-text-muted">document, not filled</span> : <span className="text-text-warn">no map yet</span>}</td>
            <td><Button size="sm" variant="ghost" onClick={() => setEdit(f)}><Pencil /> Edit</Button></td>
          </tr>); })}
      </Table>
      {!s.forms.length ? <Notice>No forms yet. Add one from <Link className="text-text-link underline" to={`/c/${id}/sources`}>Sources and forms</Link>.</Notice> : null}
      {edit ? <FormDialog id={id} f={edit} fields={fields} onClose={() => setEdit(null)} /> : null}
    </>
  );
}

function FormDialog({ id, f, fields, onClose }: { id: string; f: any; fields: any; onClose: () => void }) {
  const revs = React.useContext(RevCtx);
  const [who, setWho] = React.useState(f.who), [mode, setMode] = React.useState(f.status === "always" ? "COMBINATION_MANDATORY" : "ANSWER_CONDITIONAL"), [cond, setCond] = React.useState<any>(f.condition), [plain, setPlain] = React.useState(f.condition_plain ?? "");
  const save = useAction((b: any) => api(`/combinations/${id}/forms/${encodeURIComponent(f.form_number)}`, { method: "PATCH", json: { ...b, baseRevision: revs[`form:${f.form_number}`] } }), { success: "Form saved to the draft", invalidate: [["config", id], ["combination", id], ["preview"]], onDone: onClose });
  return (
    <Dialog guard wide open onOpenChange={(o) => !o && onClose()} title={`${f.form_number}: who files it and when`} footer={<><Button variant="destructive" className="mr-auto" onClick={() => save.mutate({ retire: true })}><Trash2 /> Remove from combination</Button><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => save.mutate({ who, attachMode: mode, condition: mode === "ANSWER_CONDITIONAL" ? cond : null, conditionPlain: plain })} busy={save.isPending}>Save to draft</Button></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3"><Field label="Who files it"><Select value={who} onChange={(e) => setWho(e.target.value)}>{WHO.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field><Field label="When"><Select value={mode} onChange={(e) => setMode(e.target.value)}><option value="COMBINATION_MANDATORY">Always, for this combination</option><option value="ANSWER_CONDITIONAL">Only when a condition is true</option></Select></Field></div>
        {mode === "ANSWER_CONDITIONAL" ? <><ConditionBuilder value={cond} onChange={setCond} fields={fields.list} /><Field label="In plain words" hint="Shown to staff and clients as the reason."><Input value={plain} onChange={(e) => setPlain(e.target.value)} /></Field></> : null}
      </div>
    </Dialog>
  );
}

function Documents({ id, s, fields }: { id: string; s: any; fields: any }) {
  const [edit, setEdit] = React.useState<any>(null);
  return (
    <>
      <ChecklistSourceEntry id={id} />
      <div className="flex justify-end"><Button onClick={() => setEdit({})}><Plus /> Add a document requirement</Button></div>
      <Table head={["Document", "Whose", "Base or conditional", "Source", ""]}>
        {s.document_requirements.map((r: any) => (
          <tr key={r.lineage}>
            <td className="max-w-xs"><p className="font-medium">{r.document_type}</p><OriginPill origin={r.origin} status={r.status} /></td>
            <td className="text-xs">{whoLabel(r.who)}<br /><span className="text-text-muted">provided by {r.provided_by}</span></td>
            <td className="max-w-md text-xs">{r.base_or_conditional === "base" ? <Pill tone="ok">Base</Pill> : <><Pill tone="warn">Conditional</Pill><p className="mt-1">{r.condition_plain ?? plainCondition(r.condition, fields.meaning)}</p></>}</td>
            <td className="max-w-sm text-xs text-text-muted">{r.source_quote ? `"${r.source_quote.slice(0, 160)}${r.source_quote.length > 160 ? "…" : ""}"` : "no source quote"}</td>
            <td><Button size="sm" variant="ghost" onClick={() => setEdit(r)}><Pencil /> Edit</Button></td>
          </tr>
        ))}
      </Table>
      {!s.document_requirements.length ? <Notice>No document requirements yet.</Notice> : null}
      {edit ? <RequirementDialog id={id} r={edit} fields={fields} onClose={() => setEdit(null)} /> : null}
    </>
  );
}

/** Sourced examples a person can load instead of typing (D274 sample input): exact words from the attached official
 *  checklist IMM 5484 (05-2026), checked against the file on 21 Oct (pdftotext). Conditions are the Lead's reading of
 *  those words: prototype only, not specialist-confirmed (D50). */
const F5484 = "official-sources/ircc/checklists/imm5484e.pdf";
const SAMPLE_REQUIREMENTS = [
  { label: "Passport (base): IMM 5484", newTypeName: "Passport or travel document information page photocopy", appliesToRoles: "each_applicant", attachMode: "COMBINATION_MANDATORY", providedBy: "client", sourceQuote: "A copy of the information page of your valid passport or travel document which includes: The passport number; The issuance and expiry dates; Your photo, name, date and place of birth.", sourceFile: F5484 },
  { label: "Proof of financial support (base): IMM 5484", newTypeName: "Proof of financial support", appliesToRoles: "each_applicant", attachMode: "COMBINATION_MANDATORY", providedBy: "client", sourceQuote: "Proof of Financial Support. You must include proof that you can support yourself and any family members accompanying you while you are in Canada.", sourceFile: F5484 },
  { label: "Minor travelling alone (conditional): IMM 5484", newTypeName: "Custody documents or parental letter of authorization", appliesToRoles: "each_dependent_child", attachMode: "ANSWER_CONDITIONAL", providedBy: "client", condition: { subjectKind: "DEPENDENT", op: "eq", field: "person.travelling_alone_to_canada", value: true }, conditionPlain: "Only for a minor travelling alone (the checklist also names travel with one parent; that case is not modelled here).", sourceQuote: "Minors travelling alone or with one parent must provide custody documents or a letter of authorization from the other non accompanying parent or a letter of authorization signed by both parents or legal guardians.", sourceFile: F5484 },
  { label: "Super visa: letter of invitation (base): IMM 5484 p. 2", newTypeName: "Letter of invitation from the child or grandchild in Canada", appliesToRoles: "principal_applicant", attachMode: "COMBINATION_MANDATORY", providedBy: "client", sourceQuote: "A Letter of invitation from your child or grandchild (and their co-signer, if applicable) residing in Canada as a permanent resident, Canadian citizen, or person registered as an Indian under the Indian Act.", sourceFile: F5484 },
  { label: "Super visa: medical insurance (base): IMM 5484 p. 2", newTypeName: "Proof of private medical insurance (minimum one year)", appliesToRoles: "each_applicant", attachMode: "COMBINATION_MANDATORY", providedBy: "client", sourceQuote: "Proof of valid private medical insurance coverage for a minimum of one year (copy of the insurance certificate or policy).", sourceFile: F5484 },
];

function RequirementDialog({ id, r, fields, onClose }: { id: string; r: any; fields: any; onClose: () => void }) {
  const revs = React.useContext(RevCtx);
  const types = useApi<any[]>(["doc-types"], "/library/document-types");
  const isNew = !r.lineage;
  const [f, setF] = React.useState<any>({ documentTypeKey: r.document_type_key ?? "", newTypeName: "", appliesToRoles: r.who ?? "each_applicant", attachMode: r.base_or_conditional === "conditional" ? "ANSWER_CONDITIONAL" : "COMBINATION_MANDATORY", condition: r.condition ?? null, conditionPlain: r.condition_plain ?? "", providedBy: r.provided_by ?? "client", sourceQuote: r.source_quote ?? "", sourceFile: r.source_file ?? "", note: r.note ?? "" });
  const set = (p: any) => setF((x: any) => ({ ...x, ...p }));
  const save = useAction((b: any) => api(isNew ? `/combinations/${id}/requirements` : `/combinations/${id}/requirements/${encodeURIComponent(r.lineage)}`, { method: isNew ? "POST" : "PATCH", json: isNew ? b : { ...b, baseRevision: revs[`requirement:${r.lineage}`] } }), { success: isNew ? "Document requirement added to the draft" : "Document requirement saved to the draft", invalidate: [["config", id], ["combination", id], ["preview"], ["doc-types"]], onDone: onClose });
  return (
    <Dialog guard wide open onOpenChange={(o) => !o && onClose()} title={isNew ? "Add a document requirement" : `Edit: ${r.document_type}`} description="Base requirements apply to everyone they name; conditional ones only when their condition is true for that person."
      footer={<>{!isNew ? <Button variant="destructive" className="mr-auto" onClick={() => save.mutate({ retire: true })}><Trash2 /> Remove</Button> : null}<Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => save.mutate(f)} busy={save.isPending}>Save to draft</Button></>}>
      <div className="space-y-4">
        {isNew ? <div className="flex flex-wrap items-center gap-2 rounded-lg bg-surface p-2 text-xs"><span className="text-text-muted">Sample inputs (instead of typing):</span>{SAMPLE_REQUIREMENTS.map((x) => <Button key={x.label} size="sm" variant="secondary" onClick={() => setF({ ...f, documentTypeKey: "", newTypeName: x.newTypeName, appliesToRoles: x.appliesToRoles, attachMode: x.attachMode, condition: (x as any).condition ?? null, conditionPlain: (x as any).conditionPlain ?? "", providedBy: x.providedBy, sourceQuote: x.sourceQuote, sourceFile: x.sourceFile })}>{x.label}</Button>)}</div> : null}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Document type" hint="Reuse a library type, or name a new one below."><Select value={f.documentTypeKey} onChange={(e) => set({ documentTypeKey: e.target.value, newTypeName: "" })}><option value="">(a new type)</option>{(types.data ?? []).map((t) => <option key={t.documentTypeKey} value={t.documentTypeKey}>{t.name}</option>)}</Select></Field>
          <Field label="New document type name"><Input value={f.newTypeName} disabled={!!f.documentTypeKey} onChange={(e) => set({ newTypeName: e.target.value })} placeholder="Proof of financial support" /></Field>
          <Field label="Whose document"><Select value={f.appliesToRoles} onChange={(e) => set({ appliesToRoles: e.target.value })}>{WHO.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
          <Field label="Provided by"><Select value={f.providedBy} onChange={(e) => set({ providedBy: e.target.value })}><option value="client">The client</option><option value="agent">The firm (agent)</option><option value="employer">The employer</option><option value="third_party">A third party</option></Select></Field>
        </div>
        <Field label="Requirement"><Select value={f.attachMode} onChange={(e) => set({ attachMode: e.target.value })}><option value="COMBINATION_MANDATORY">Base: always needed for the people it names</option><option value="ANSWER_CONDITIONAL">Conditional: only when a condition is true</option></Select></Field>
        {f.attachMode === "ANSWER_CONDITIONAL" ? <><ConditionBuilder value={f.condition} onChange={(c) => set({ condition: c })} fields={fields.list} /><Field label="Why it is needed, in plain words"><Input value={f.conditionPlain} onChange={(e) => set({ conditionPlain: e.target.value })} /></Field></> : null}
        <Field label="Source quote" hint="Exact words from the attached official source; leave empty if none (it then shows as unsourced)."><Textarea value={f.sourceQuote} onChange={(e) => set({ sourceQuote: e.target.value })} /></Field>
      </div>
    </Dialog>
  );
}

function Rules({ id, s, fields }: { id: string; s: any; fields: any }) {
  const [edit, setEdit] = React.useState<any>(null);
  return (
    <>
      <div className="flex justify-end"><Button onClick={() => setEdit({})}><Plus /> Add a rule</Button></div>
      <Table head={["Rule", "Evaluated for", "Condition", ""]}>
        {s.rules.map((r: any) => <tr key={r.id}><td className="max-w-sm"><p className="font-medium">{r.then}</p><span className="mono text-text-muted">{r.id}</span> <OriginPill origin={r.origin} status={r.status} /></td><td className="text-xs">{whoLabel(r.for_whom)}</td><td className="max-w-lg text-xs">{r.when_plain ?? plainCondition(r.when, fields.meaning)}</td><td><Button size="sm" variant="ghost" onClick={() => setEdit(r)}><Pencil /> Edit</Button></td></tr>)}
      </Table>
      {edit ? <RuleDialog id={id} r={edit} fields={fields} onClose={() => setEdit(null)} /> : null}
    </>
  );
}

function RuleDialog({ id, r, fields, onClose }: { id: string; r: any; fields: any; onClose: () => void }) {
  const revs = React.useContext(RevCtx);
  const isNew = !r.id;
  const [cond, setCond] = React.useState<any>(r.when ?? null), [then, setThen] = React.useState(r.then ?? ""), [when, setWhen] = React.useState(r.when_plain ?? ""), [forWhom, setForWhom] = React.useState(r.for_whom ?? "each_applicant");
  const save = useAction((b: any) => api(isNew ? `/combinations/${id}/rules` : `/combinations/${id}/rules/${r.id}`, { method: isNew ? "POST" : "PATCH", json: isNew ? b : { ...b, baseRevision: revs[`rule:${r.id}`] } }), { success: "Rule saved to the draft", invalidate: [["config", id], ["combination", id], ["preview"]], onDone: onClose });
  return (
    <Dialog guard wide open onOpenChange={(o) => !o && onClose()} title={isNew ? "Add a rule" : `Edit rule ${r.id}`} description="Rules are stored as data in the closed condition vocabulary and evaluated the same way everywhere; no code is generated or run."
      footer={<>{!isNew ? <Button variant="destructive" className="mr-auto" onClick={() => save.mutate({ retire: true })}><Trash2 /> Remove</Button> : null}<Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => save.mutate({ condition: cond, thenPlain: then, whenPlain: when, forWhom })} busy={save.isPending}>Save to draft</Button></>}>
      <div className="space-y-4">
        <Field label="What the rule does"><Input value={then} onChange={(e) => setThen(e.target.value)} placeholder="Ask for the previous visa refusal details." /></Field>
        <Field label="Evaluated for"><Select value={forWhom} onChange={(e) => setForWhom(e.target.value)}>{WHO.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
        <ConditionBuilder value={cond} onChange={setCond} fields={fields.list} />
        <Field label="Condition in plain words"><Input value={when} onChange={(e) => setWhen(e.target.value)} /></Field>
      </div>
    </Dialog>
  );
}

function Questions({ id, s }: { id: string; s: any }) {
  const sections = useApi<any[]>(["sections"], "/library/sections");
  const [open, setOpen] = React.useState<string | null>(s.sections[0]?.id ?? null);
  const [add, setAdd] = React.useState("");
  const sel = useAction((b: { key: string; on: boolean }) => api(`/combinations/${id}/sections/${b.key}`, { method: b.on ? "POST" : "DELETE" }), { success: "Questionnaire sections updated", invalidate: [["config", id], ["combination", id], ["preview"]] });
  const by = (sec: string) => s.placements.filter((p: any) => p.section_id === sec);
  const unselected = (sections.data ?? []).filter((x) => !s.sections.some((y: any) => y.id === x.key));
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2"><Field label="Add a library section to this questionnaire" className="w-96"><Select value={add} onChange={(e) => setAdd(e.target.value)}><option value="">choose a section</option>{unselected.map((x) => <option key={x.key} value={x.key}>{x.title} ({x.questions} questions)</option>)}</Select></Field><Button disabled={!add} onClick={() => { sel.mutate({ key: add, on: true }); setAdd(""); }}><Plus /> Add section</Button><Link to="/library/sections" className="ml-auto text-sm text-text-link underline">Manage sections</Link></div>
      {!s.sections.length ? <Notice>No sections selected. Questions are still asked for fields the forms need (placed in their library section).</Notice> : null}
      {s.sections.map((x: any) => (
        <div key={x.id} className="rounded-xl border border-border bg-surface-raised">
          <button className="flex w-full items-center justify-between px-4 py-3 text-left" onClick={() => setOpen(open === x.id ? null : x.id)} aria-expanded={open === x.id}>
            <span><span className="font-medium">{x.title}</span> <span className="text-xs text-text-muted">· {by(x.id).length} question placements</span></span>
            <span className="flex items-center gap-2"><Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); sel.mutate({ key: x.id, on: false }); }}>Remove from questionnaire</Button></span>
          </button>
          {open === x.id ? (
            <div className="border-t border-border px-4 py-3">
              {x.meaning ? <p className="mb-2 text-xs text-text-muted">{x.meaning}</p> : null}
              <Table dense head={["Field", "Asked as", "Collected from", "Repeats", "Condition"]}>{by(x.id).map((p: any) => <tr key={p.lineage}><td><Link className="mono text-text-link hover:underline" to={`/library/fields/${encodeURIComponent(p.fact)}`}>{p.fact}</Link>{p.status === "DRAFT" ? <Pill tone="warn" className="ml-1">Draft</Pill> : null}</td><td className="max-w-sm text-xs">{p.question_text ?? <span className="text-text-muted">(uses the field meaning)</span>}</td><td className="text-xs">{p.collected_from.replace(/_/g, " ")}</td><td className="text-xs">{p.repeats.replace(/_/g, " ")}</td><td className="text-xs">{p.condition ? `${p.condition_effect}: ${p.condition_plain ?? "conditional"}` : "—"}</td></tr>)}</Table>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function Checks({ s, meaning }: { s: any; meaning: (k: string) => string }) {
  return (
    <>
      <Notice tone="info">Checks run on facts as they are confirmed. Warnings never become a blanket block; severity comes from the approved configuration. Form-field checks stay with each form's field map.</Notice>
      <Table head={["Check", "Group", "Severity", "When it fires"]}>{s.checks.map((c: any) => <tr key={c.id}><td className="mono">{c.id}{c.illustrative ? <Pill tone="warn" className="ml-1">Illustrative</Pill> : null}</td><td className="text-xs">{c.group.replace(/_/g, " ")}</td><td><Pill tone={c.severity === "block" ? "danger" : c.severity === "warn" ? "warn" : "neutral"}>{c.severity}</Pill></td><td className="max-w-2xl text-xs">{c.message ?? plainCondition(c.condition, meaning)}</td></tr>)}</Table>
    </>
  );
}

/** Attach an official checklist or guide from here (D283): the Sources and forms upload, not a document requirement and
 *  not a client's evidence. Requirements below are what the case checklist asks for; this only adds the source text. */
function ChecklistSourceEntry({ id }: { id: string }) {
  const [busy, setBusy] = React.useState(false);
  const upload = useSourceUpload(id, setBusy);
  const ref = React.useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-border px-4 py-3 text-sm">
      <p className="text-text-muted"><span className="font-medium text-text">Official checklist or guide for this combination?</span> Attach it as a setup source (same upload and recognition as Sources and forms). It supports the requirements below; it is not a client document.</p>
      <div className="flex gap-2"><input ref={ref} type="file" className="hidden" accept=".pdf,.html" aria-label="Attach an official checklist or guide" onChange={(e) => { void upload(e.target.files); e.target.value = ""; }} /><Button size="sm" variant="secondary" busy={busy} onClick={() => ref.current?.click()}>Attach official checklist</Button><Button size="sm" variant="ghost" asChild><Link to={`/c/${id}/sources`}>Sources and forms</Link></Button></div>
    </div>
  );
}
