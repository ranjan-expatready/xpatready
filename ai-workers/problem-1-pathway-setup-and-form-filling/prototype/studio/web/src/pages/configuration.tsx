import * as React from "react";
import { Link } from "react-router-dom";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { api, useAction, useApi } from "@/lib/api";
import { Button, Dialog, Field, Input, Notice, Pill, Select, Table, Textarea } from "@/components/ui/controls";
import { Spinner } from "@/components/ui/spinner";
import { ConditionBuilder, plainCondition, type FieldInfo } from "@/components/conditions";
import { cn } from "@/lib/utils";
import { irccWords } from "../../../contracts/workspace";
import { normalizeLabel } from "../../../contracts/programs";
import { ItemSources, SOURCE_SAY } from "@/components/source-panel";
import { fieldName } from "@/lib/field-name";
import { FoldOut } from "@/components/fold-out";
import { FoldArrow } from "@/components/fold-out";

export const WHO: [string, string][] = [["each_applicant", "Each applicant"], ["principal_applicant", "Principal applicant"], ["spouse_or_partner", "Spouse or partner"], ["couple_once", "Once per couple"], ["each_dependent_child", "Each child"], ["each_person", "Each person"], ["case", "The application (once)"], ["representative", "The representative"], ["sponsor", "The sponsor"]];
/** QA-221 (ruling C): a form line may also name the principal applicant, a spouse or partner, and each child 18 or older
 *  (IMM 5257 SCH1's own words); documents and rules keep WHO. */
export const FORM_WHO: [string, string][] = [...WHO, ["principal_partner_adult_children", "Principal, spouse or partner, and each child 18 or older"]];
export const whoLabel = (w: string) => FORM_WHO.find(([v]) => v === w)?.[1] ?? w;
/** Revision tokens of the draft rows the editors open (sent back so a concurrent change is refused, not overwritten). */
export const RevCtx = React.createContext<Record<string, string>>({});

export function useLibraryFields() {
  const q = useApi<any[]>(["fields", "all"], "/library/fields?retired=all"); // C11.9: the meaning of a retired field is still shown
  // C11.9 (BR-10): a retired field is not offered in pickers; its meaning is still shown where something reads it.
  const all: FieldInfo[] = (q.data ?? []).map((f) => ({ key: f.key, meaning: f.meaning, value_type: f.value_type, name: f.name ?? null }));
  const list = all.filter((_, i) => !(q.data ?? [])[i]?.retired);
  const meaning = React.useCallback((k: string) => all.find((f) => f.key === k)?.meaning ?? k, [all]);
  // QA-219: a field's name in words, retired and merged fields included (a merge names the field that went away).
  const name = React.useCallback((k: string) => all.find((f) => f.key === k)?.name || fieldName(k), [all]);
  return { list, meaning, name, loading: q.isLoading };
}

export function OriginPill({ origin, status }: { origin?: string; status?: string }) {
  return (
    <span className="inline-flex gap-1">
      {status === "DRAFT" ? <Pill tone="warn">Draft</Pill> : status === "RETIRED" ? <Pill tone="danger">Removed in draft</Pill> : null}
      {origin === "AI_PROPOSAL" ? <Pill tone="ai">AI-proposed</Pill> : origin === "HUMAN" ? <Pill tone="info">Edited by a person</Pill> : origin === "IMPORTED_RELEASE" ? <Pill title="Loaded with the sample setup, from an earlier reviewed release">From the sample setup</Pill> : null}
    </span>
  );
}

/** One part of the combination's draft configuration (S5 tabs: Documents; Questionnaires holds questions, rules and
 *  checks), with the revision tokens its editors send back. */
export function ConfigArea({ id, areas }: { id: string; areas: ("documents" | "questions" | "rules" | "checks")[] }) {
  const cfg = useApi<any>(["config", id, "draft"], `/combinations/${id}/config?mode=draft`);
  const fields = useLibraryFields();
  if (cfg.isLoading) return <Spinner label="Loading the configuration" />;
  if (cfg.isError) return <Notice tone="danger" title="The configuration could not be loaded">{(cfg.error as Error).message}</Notice>;
  const s = cfg.data.snapshot;
  return (
    <RevCtx.Provider value={cfg.data.revisions ?? {}}>
      <div className="space-y-6">
        {areas.includes("documents") ? <Documents id={id} s={s} fields={fields} /> : null}
        {areas.includes("questions") ? <section aria-labelledby="cfg-q" className="space-y-3"><h2 id="cfg-q" className="font-semibold">Questions by section</h2><Questions id={id} s={s} /></section> : null}
        {areas.includes("rules") ? <FoldOut className="rounded-xl border border-border bg-surface-raised px-4 py-3" data-rules summaryClassName="font-semibold" summary={<>Rules used here ({s.rules.length})</>}><div className="mt-3 space-y-3"><Rules id={id} s={s} fields={fields} /></div></FoldOut> : null}
        {areas.includes("checks") ? <FoldOut className="rounded-xl border border-border bg-surface-raised px-4 py-3" data-checks summaryClassName="font-semibold" summary={<>Checks on these answers ({(s.checks ?? []).length})</>}><div className="mt-3 space-y-3"><Checks id={id} s={s} meaning={fields.meaning} /></div></FoldOut> : null}
      </div>
    </RevCtx.Provider>
  );
}

function Documents({ id, s, fields }: { id: string; s: any; fields: any }) {
  const [edit, setEdit] = React.useState<any>(null);
  return (
    <>
      <div className="flex justify-end"><Button onClick={() => setEdit({})}><Plus /> Add a document requirement</Button></div>
      <Table head={["Document", "Whose", "Base or conditional", "Source", ""]}>
        {s.document_requirements.map((r: any) => (
          <tr key={r.lineage}>
            <td className="max-w-xs"><p className="font-medium">{r.document_type}</p><OriginPill origin={r.origin} status={r.status} /></td>
            <td className="text-xs">{whoLabel(r.who)}<br /><span className="text-text-muted">provided by {r.provided_by}</span></td>
            <td className="max-w-md text-xs">{r.base_or_conditional === "base" ? <Pill tone="ok">Base</Pill> : <><Pill tone="warn">Conditional</Pill><p className="mt-1">{r.condition_plain ?? plainCondition(r.condition, fields.meaning)}</p></>}</td>
            <td className="max-w-sm text-xs text-text-muted">{r.source_quote ? `"${irccWords(r.source_quote)!.slice(0, 160)}${r.source_quote.length > 160 ? "…" : ""}"` : "no source quote"}</td>
            <td><Button size="sm" variant="ghost" onClick={() => setEdit(r)}><Pencil /> Edit</Button></td>
          </tr>
        ))}
      </Table>
      {!s.document_requirements.length ? <Notice>No document requirements yet.</Notice> : null}
      {edit ? <RequirementDialog id={id} r={edit} fields={fields} onClose={() => setEdit(null)} /> : null}
    </>
  );
}

/** What saving a line answers: the line, or (C3.6) a new type name waiting as a library proposal. */
type SaveAnswer = { status?: string; message?: string; proposalId?: string } | undefined;
/** Add or edit one checklist line (also the Documents tab's "+ Add a document" and its drawer's Edit, W1-15 slice 3). */
export function RequirementDialog({ id, r, fields, onClose, onSaved }: { id: string; r: any; fields: any; onClose: () => void; onSaved?: () => void }) {
  const revs = React.useContext(RevCtx);
  // C3.6 (P-158): a new type name waits as a library proposal; the dialog stays open with the line's details kept, looks
  // for the type every few seconds, and chooses it once it is accepted, so the author only saves the line.
  const [waiting, setWaiting] = React.useState<{ message: string; name: string } | null>(null);
  const types = useApi<any[]>(["doc-types"], "/library/document-types", { refetchInterval: waiting ? 5000 : false, refetchOnWindowFocus: !!waiting });
  const isNew = !r.lineage;
  const [f, setF] = React.useState<any>({ alternatives: r.alternatives ?? [], documentTypeKey: r.document_type_key ?? "", newTypeName: "", appliesToRoles: r.who ?? "each_applicant", attachMode: r.base_or_conditional === "conditional" ? "ANSWER_CONDITIONAL" : "COMBINATION_MANDATORY", condition: r.condition ?? null, conditionPlain: r.condition_plain ?? "", providedBy: r.provided_by ?? "client", sourceQuote: r.source_quote ?? "", sourceFile: r.source_file ?? "", note: r.note ?? "" });
  const set = (p: any) => setF((x: any) => ({ ...x, ...p }));
  const landed = waiting ? (types.data ?? []).find((t) => !t.retired && normalizeLabel(t.name) === normalizeLabel(waiting.name)) : undefined;
  React.useEffect(() => { if (landed && !f.documentTypeKey) set({ documentTypeKey: landed.documentTypeKey, newTypeName: "" }); }, [landed?.documentTypeKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = useAction((b: any) => api(isNew ? `/combinations/${id}/requirements` : `/combinations/${id}/requirements/${encodeURIComponent(r.lineage)}`, { method: isNew ? "POST" : "PATCH", json: isNew ? b : { ...b, baseRevision: revs[`requirement:${r.lineage}`] } }), { success: (res: SaveAnswer) => (res?.status === "waiting" && res.message ? res.message : isNew ? "Document requirement added to the draft" : "Document requirement saved to the draft"), invalidate: [["config", id], ["combination", id], ["preview"], ["doc-types"], ["checklist", id], ["fact-sources", id], ["proposals"], ["review-queue"]], onDone: (res: SaveAnswer) => { if (res?.status === "waiting") { setWaiting({ message: res.message ?? "", name: f.newTypeName }); set({ newTypeName: "" }); return; } onSaved?.(); onClose(); } });
  return (
    <Dialog guard wide open onOpenChange={(o) => !o && onClose()} title={isNew ? "Add a document requirement" : `Edit: ${r.document_type}`} description="Base requirements apply to everyone they name; conditional ones only when their condition is true for that person."
      footer={<>{!isNew ? <Button variant="destructive" className="mr-auto" onClick={() => save.mutate({ retire: true })}><Trash2 /> Remove</Button> : null}<Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => save.mutate(f)} busy={save.isPending}>Save to draft</Button></>}>
      <div className="space-y-4">
        {waiting && landed ? <Notice tone="ok" title="The new type was accepted"><span data-requirement-type-accepted>"{landed.name}" is now in the library and chosen above: save the line.</span></Notice>
          : waiting ? <Notice tone="info" title="The new type waits for a second person" action={<Link className="whitespace-nowrap text-text-link underline" target="_blank" rel="noopener" to={`/review/proposals?group=${encodeURIComponent(`combination:${id}`)}`}>Open To review › Proposals (new tab)</Link>}><span data-requirement-type-waiting>{waiting.message} The other details below are kept while this stays open.</span></Notice> : null}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Document type" hint="Reuse a library type, or name a new one below."><Select value={f.documentTypeKey} onChange={(e) => set({ documentTypeKey: e.target.value, newTypeName: "" })}><option value="">(a new type)</option>{(types.data ?? []).filter((t) => !t.retired || t.documentTypeKey === f.documentTypeKey).map((t) => <option key={t.documentTypeKey} value={t.documentTypeKey}>{t.name}</option>)}</Select></Field>
          <Field label="New document type name" hint="A new type waits for a second person on To review › Proposals; once accepted, choose it above and save."><Input value={f.newTypeName} disabled={!!f.documentTypeKey} onChange={(e) => set({ newTypeName: e.target.value })} placeholder="Proof of financial support" /></Field>
          <Field label="Whose document"><Select value={f.appliesToRoles} onChange={(e) => set({ appliesToRoles: e.target.value })}>{WHO.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
          <Field label="Provided by"><Select value={f.providedBy} onChange={(e) => set({ providedBy: e.target.value })}><option value="client">The client</option><option value="agent">The firm</option><option value="employer">The employer</option><option value="third_party">A third party</option></Select></Field>
        </div>
        <Field label="Requirement"><Select value={f.attachMode} onChange={(e) => set({ attachMode: e.target.value })}><option value="COMBINATION_MANDATORY">Base: always needed for the people it names</option><option value="ANSWER_CONDITIONAL">Conditional: only when a condition is true</option></Select></Field>
        {f.attachMode === "ANSWER_CONDITIONAL" ? <><ConditionBuilder value={f.condition} onChange={(c) => set({ condition: c })} fields={fields.list} /><Field label="Why it is needed, in plain words"><Input value={f.conditionPlain} onChange={(e) => set({ conditionPlain: e.target.value })} /></Field></> : null}
        <Field label="Alternatives (any one counts)" hint="Other library document types the client may give instead. The facts read are this line's document's.">
          <span className="flex flex-wrap items-center gap-1.5" data-alternatives>
            {(f.alternatives as string[]).map((k) => <Pill key={k}>{(types.data ?? []).find((t) => t.documentTypeKey === k)?.name ?? k}<button type="button" aria-label={`Remove alternative ${(types.data ?? []).find((t) => t.documentTypeKey === k)?.name ?? k}`} className="ml-1" onClick={() => set({ alternatives: (f.alternatives as string[]).filter((x) => x !== k) })}>×</button></Pill>)}
            <Select aria-label="Add an alternative" className="h-8 w-64" value="" onChange={(e) => { if (e.target.value) set({ alternatives: [...f.alternatives, e.target.value] }); }}><option value="">Add an alternative…</option>{(types.data ?? []).filter((t) => t.documentTypeKey !== f.documentTypeKey && !(f.alternatives as string[]).includes(t.documentTypeKey) && !t.retired).map((t) => <option key={t.documentTypeKey} value={t.documentTypeKey}>{t.name}</option>)}</Select>
          </span>
        </Field>
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
  const save = useAction((b: any) => api(isNew ? `/combinations/${id}/rules` : `/combinations/${id}/rules/${r.id}`, { method: isNew ? "POST" : "PATCH", json: isNew ? b : { ...b, baseRevision: revs[`rule:${r.id}`] } }), { success: "Rule saved to the draft", invalidate: [["config", id], ["sources", id], ["combination", id], ["preview"]], onDone: onClose });
  return (
    <Dialog guard wide open onOpenChange={(o) => !o && onClose()} title={isNew ? "Add a rule" : `Edit rule ${r.id}`} description="Rules are stored as data in the closed condition vocabulary and evaluated the same way everywhere; no code is generated or run."
      footer={<>{!isNew ? <Button variant="destructive" className="mr-auto" onClick={() => save.mutate({ retire: true })}><Trash2 /> Remove</Button> : null}<Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => save.mutate({ condition: cond, thenPlain: then, whenPlain: when, forWhom })} busy={save.isPending}>Save to draft</Button></>}>
      <div className="space-y-4">
        <Field label="What the rule does"><Input value={then} onChange={(e) => setThen(e.target.value)} placeholder="Ask for the previous visa refusal details." /></Field>
        <Field label="Evaluated for"><Select value={forWhom} onChange={(e) => setForWhom(e.target.value)}>{WHO.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
        <ConditionBuilder value={cond} onChange={setCond} fields={fields.list} />
        <Field label="Condition in plain words"><Input value={when} onChange={(e) => setWhen(e.target.value)} /></Field>
        {/* G1 PR 2c (concept §4): the rule's published numbers and their sources, as saved in the draft. */}
        {!isNew ? <ItemSources id={id} kind="rule" suffix={r.id} variant="section" /> : null}
      </div>
    </Dialog>
  );
}

function Questions({ id, s }: { id: string; s: any }) {
  const sections = useApi<any[]>(["sections"], "/library/sections");
  const [open, setOpen] = React.useState<string | null>(s.sections[0]?.id ?? null);
  const [add, setAdd] = React.useState("");
  const sel = useAction((b: { key: string; on: boolean }) => api(`/combinations/${id}/sections/${b.key}`, { method: b.on ? "POST" : "DELETE" }), { success: "Smart questionnaire (SQR) sections updated", invalidate: [["config", id], ["combination", id], ["preview"]] });
  const by = (sec: string) => s.placements.filter((p: any) => p.section_id === sec);
  const unselected = (sections.data ?? []).filter((x) => !x.retired && !s.sections.some((y: any) => y.id === x.key)); // C11.9: retired sections are not offered
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2"><Field label="Add a library section to this questionnaire" className="w-96"><Select value={add} onChange={(e) => setAdd(e.target.value)}><option value="">choose a section</option>{unselected.map((x) => <option key={x.key} value={x.key}>{x.title} ({x.questions} questions)</option>)}</Select></Field><Button disabled={!add} onClick={() => { sel.mutate({ key: add, on: true }); setAdd(""); }}><Plus /> Add section</Button><Link to="/library/sections" className="ml-auto text-sm text-text-link underline">Manage sections</Link></div>
      {!s.sections.length ? <Notice>No sections selected. Questions are still asked for fields the forms need (placed in their library section).</Notice> : null}
      {s.sections.map((x: any) => (
        <div key={x.id} className="rounded-xl border border-border bg-surface-raised">
          {/* The section toggle and its Remove are siblings, never a button inside a button (axe nested-interactive). */}
          <div className="flex items-center justify-between gap-2 pr-2">
            <button className="flex flex-1 items-start gap-1.5 px-4 py-3 text-left" onClick={() => setOpen(open === x.id ? null : x.id)} aria-expanded={open === x.id}>
              <FoldArrow open={open === x.id} className="mt-[0.2em] text-text-muted" /><span><span className="font-medium">{x.title}</span> <span className="text-xs text-text-muted">· {by(x.id).length} question placements</span></span>
            </button>
            <Button size="sm" variant="ghost" onClick={() => sel.mutate({ key: x.id, on: false })} aria-label={`Remove from questionnaire: ${x.title}`}>Remove from questionnaire</Button>
          </div>
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

function Checks({ id, s, meaning }: { id: string; s: any; meaning: (k: string) => string }) {
  // Review m2 on #627: a failed sources list is said once for the table, with one Try again; the rows stay quiet.
  const src = useApi<unknown>(["sources", id], `/combinations/${id}/sources`);
  return (
    <>
      {src.isError && !src.data ? <Notice tone="danger" title="The sources of the checks' numbers could not be loaded" action={<Button size="sm" variant="secondary" onClick={() => void src.refetch()} busy={src.isFetching}>Try again</Button>}><span data-checks-sources-error>{(src.error as Error).message}</span></Notice> : null}
      <Notice tone="info">Checks run on facts as they are confirmed. Warnings never become a blanket block; severity comes from the approved configuration. Form-field checks stay with each form's field map.</Notice>
      <Table head={["Check", "Group", "Severity", "When it fires", "Sources"]}>{s.checks.map((c: any) => <tr key={c.id}><td className="mono">{c.id}{c.illustrative ? <Pill tone="warn" className="ml-1">Illustrative</Pill> : null}</td><td className="text-xs">{c.group.replace(/_/g, " ")}</td><td><Pill tone={c.severity === "block" ? "danger" : c.severity === "warn" ? "warn" : "neutral"}>{c.severity}</Pill></td><td className="max-w-2xl text-xs">{c.message ?? plainCondition(c.condition, meaning)}</td>
        {/* G1 PR 2c: a check that holds a number opens the Source panel on it (m3: an illustrative check says it stays Sample). */}
        <td><ItemSources id={id} kind="check" suffix={c.id} variant="button" quietOnError label={`check ${c.id}`} note={c.illustrative ? SOURCE_SAY.sampleCheck : undefined} /></td></tr>)}</Table>
    </>
  );
}
