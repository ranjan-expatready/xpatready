import * as React from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronRight, Pencil, Save, Search } from "lucide-react";
import { api, useAction, useActorId, useApi } from "@/lib/api";
import { Button, Dialog, Field, Input, Notice, Pill, Select, Table, Textarea } from "@/components/ui/controls";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { ConditionBuilder } from "@/components/conditions";
import { OriginPill, useLibraryFields } from "@/pages/configuration";
import { PERSON } from "@/pages/job";
import { nameOf } from "@/pages/review";

/** QA-39: value types in words (the stored code stays the value). */
const TYPE_WORD: Record<string, string> = { text: "Text", date: "Date", yes_no: "Yes or no", code: "List of choices", country: "Country", number: "Number", address: "Address", phone: "Phone number", email: "Email address" };
const TYPES = Object.keys(TYPE_WORD);
const COLLECTED: [string, string][] = [["client_questionnaire", "Client questionnaire"], ["verified_document", "A verified document"], ["staff_working_view", "The case officer (case view)"], ["profile_record", "Client profile"], ["existing_record", "Existing record"]];
const collectedWord = (k: string) => COLLECTED.find(([x]) => x === k)?.[1] ?? k.replace(/_/g, " ");
/** QA-39, QA-71: a field's name in words from its key ("person.family_name" → "Family name"); the key itself stays small. */
const ABBREVIATIONS = new Set(["dli", "eta", "id", "ircc", "lmia", "noc", "pgwp", "pr", "sin", "uci"]);
export const fieldName = (key: string) => { const w = (key.split(".").pop() ?? key).split("_").map((x) => ABBREVIATIONS.has(x) ? x.toUpperCase() : x).join(" "); return w.charAt(0).toUpperCase() + w.slice(1); };
/** QA-71: lists show a draft or AI-proposed mark only; the version and "Imported release" are on the item's page. */
const ListPill = ({ origin, status }: { origin?: string; status?: string }) => <OriginPill origin={origin === "IMPORTED_RELEASE" ? undefined : origin} status={status} />;
const CATEGORY_WORD: Record<string, string> = { client: "Client", employer: "Employer", government: "Government", other: "Someone else" };
/** S6 (2a), P-158: one line per library page on where its items come from; nothing is added by hand. */
const Origin = ({ children }: { children: React.ReactNode }) => <p data-origin className="mt-1 text-sm text-text-muted"><span className="font-medium text-text">Where these come from:</span> {children}</p>;
/** A list row's source (P-158 item 6): never blank; an item with none is flagged. */
const SourceNote = ({ r }: { r: { source?: string | null; more_sources?: number; unsourced?: boolean } }) => r.unsourced
  ? <p data-source className="mt-1 text-[11px] text-text-warn">No source recorded</p>
  : <p data-source className="mt-1 text-[11px] text-text-muted">{r.source}{r.more_sources ? ` · ${r.more_sources} more` : ""}</p>;
/** P-162 (C3.1): a field's format in the list, from its form fields; never blank (why there is none is said). */
type FormatLine = { text: string | null; state: "read" | "none_on_form" | "not_read" | "no_form" };
const FORMAT_NONE: Record<Exclude<FormatLine["state"], "read">, string> = { none_on_form: "No format on its forms", not_read: "Format: not read yet", no_form: "On no form" };
const FormatCell = ({ f }: { f?: FormatLine }) => f?.text ? <span data-format>{f.text}</span> : <span data-format className={f?.state === "not_read" ? "text-text-warn" : "text-text-muted"}>{FORMAT_NONE[(f?.state ?? "not_read") as Exclude<FormatLine["state"], "read">]}</span>;
/** GET /library/fields/:key → format (engine/field-format.ts): each rule, the forms and boxes that say so, the quote. */
type FieldFormatView = { rules: { check: string; words: string; part: string | null; sources: { form: string; box: string; quote: string | null; from: string }[] }[]; not_checked: { function: string; form: string; quote: string | null }[]; read: boolean };
const FROM_WORD: Record<string, string> = { pdf_box: "the PDF form field", form_script: "the form's own check", field_map: "the field map" };
/** GET /library/:kind/:key/sources (api/src/library-sources.ts). */
type SourcesView = { name: string; sources: { kind: string; text: string; quote?: string | null }[]; unsourced: boolean; used_in: string[] };
/** Where used (C3.13): the combinations by name, the first two and a count. */
const usedWords = (used: string[] | undefined) => !used?.length ? <span className="text-text-muted">none</span> : <span title={used.join(", ")}>{used.slice(0, 2).join(", ")}{used.length > 2 ? ` and ${used.length - 2} more` : ""}</span>;

export function FieldsPage() {
  const [q, setQ] = React.useState("");
  const [only, setOnly] = React.useState("all");
  const list = useApi<any[]>(["fields"], "/library/fields");
  const rows = (list.data ?? []).filter((f) => (!q || f.key.includes(q.toLowerCase()) || (f.name ?? fieldName(f.key)).toLowerCase().includes(q.toLowerCase()) || f.meaning.toLowerCase().includes(q.toLowerCase())) && (only === "all" || (only === "draft" && f.has_draft) || (only === "ai" && f.origin === "AI_PROPOSAL") || (only === "unplaced" && !f.placement) || (only === "shared" && f.forms.length > 1)));
  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div><h1 className="text-xl font-semibold">Fields</h1><p className="mt-1 text-sm text-text-muted">One definition per meaning, shared by every form and program. Values about people and cases are never stored here.</p><Origin>each field is read from a form field (proposed by AI, confirmed by a person), a document checklist line, or a rule that needs it. Nothing is added by hand.</Origin></div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-96"><Search className="absolute left-2.5 top-2.5 size-4 text-text-muted" /><Input className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a field or its meaning" aria-label="Search fields" /></div>
        <Select className="w-64" value={only} onChange={(e) => setOnly(e.target.value)} aria-label="Filter"><option value="all">All fields</option><option value="shared">Used by more than one form</option><option value="draft">With a draft change</option><option value="ai">AI-proposed</option><option value="unplaced">Not asked anywhere</option></Select>
        <span className="text-xs text-text-muted">{rows.length} of {list.data?.length ?? 0}</span>
      </div>
      {list.isLoading ? <Spinner label="Loading fields" /> : !list.data?.length ? <EmptyState title="The library is empty" description="Load sample inputs, or add a form with AI drafting; reviewed fields land here." /> : (
        <Table head={["Field", "Meaning", "Type and format", "Forms", "Asked in", "Status"]}>
          {rows.slice(0, 400).map((f) => <tr key={f.key}><td><Link className="font-medium text-text-link hover:underline" to={`/library/fields/${encodeURIComponent(f.key)}`}>{f.name ?? fieldName(f.key)}</Link><p className="mono break-all text-[11px] text-text-muted">{f.key}</p></td><td className="max-w-md text-xs">{f.meaning}<SourceNote r={f} /></td><td className="max-w-48 text-xs">{TYPE_WORD[f.value_type] ?? f.value_type}<p className="mt-1 text-[11px]"><FormatCell f={f.format} /></p></td><td className="text-xs">{f.forms.join(", ") || <span className="text-text-muted">none</span>}<span className="text-text-muted"> · {f.boxes} form field{f.boxes === 1 ? "" : "s"}{f.used_in?.length ? ` · ${f.used_in.length} combination${f.used_in.length === 1 ? "" : "s"}` : ""}</span></td><td className="text-xs">{f.placement ? `${f.placement.section.replace(/_/g, " ")} · ${collectedWord(f.placement.collected_from)}` : <span className="text-text-warn">not placed</span>}</td><td><ListPill origin={f.origin} status={f.status} /></td></tr>)}
        </Table>
      )}
    </div>
  );
}

export function FieldPage() {
  const { key = "" } = useParams();
  const f = useApi<any>(["field", key], `/library/fields/${encodeURIComponent(key)}`);
  const sections = useApi<any[]>(["sections"], "/library/sections");
  const actorId = useActorId();
  const session = useApi<any>(["session", actorId], "/session");
  const fields = useLibraryFields();
  const cur = f.data?.current;
  const place = f.data?.placements?.[0];
  const [meaning, setMeaning] = React.useState(""), [type, setType] = React.useState("text");
  const [p, setP] = React.useState<any>(null);
  React.useEffect(() => { if (cur) { setMeaning(cur.meaning); setType(cur.valueType); } }, [cur?.id]);
  React.useEffect(() => { if (f.data) setP(place ? { sectionKey: place.sectionKey, collectedFrom: place.collectedFrom, repeats: place.repeats, tier: place.tier, questionText: place.questionText ?? "", helpText: place.helpText ?? "", condition: place.predicateJson, conditionEffect: place.conditionEffect, conditionPlain: place.conditionPlain ?? "" } : { sectionKey: "", collectedFrom: "client_questionnaire", repeats: key.startsWith("case.") ? "once_per_case" : "per_person", tier: "case", questionText: "", helpText: "", condition: null, conditionEffect: null, conditionPlain: "" }); }, [f.data?.current?.id, place?.id]);
  const inv = [["field", key], ["fields"], ["preview"], ["config"], ["combination"]];
  const saveDef = useAction(() => api(`/library/fields/${encodeURIComponent(key)}`, { method: "PATCH", json: { meaning, valueType: type } }), { success: "Definition saved as a draft version", invalidate: inv });
  const [name, setName] = React.useState("");
  React.useEffect(() => { if (cur) setName((cur.labelChecked && cur.label) || fieldName(key)); }, [cur?.id, cur?.label]);
  const src = useApi<SourcesView>(["field-sources", key], `/library/fields/${encodeURIComponent(key)}/sources`);
  const rename = useAction(() => api(`/library/fields/${encodeURIComponent(key)}/name`, { method: "PATCH", json: { name } }), { success: "Renamed (a new draft version)", invalidate: [...inv, ["field-sources", key]] });
  const savePlace = useAction(() => api(`/library/fields/${encodeURIComponent(key)}/placement`, { method: "POST", json: p }), { success: "Placement saved as a draft version", invalidate: inv });
  if (f.isLoading) return <Spinner label="Loading field" />;
  if (f.isError) return <Notice tone="danger" title="Field not found">{(f.error as Error).message}</Notice>;
  const v = f.data;
  const shown = (cur.labelChecked && cur.label) || fieldName(key);
  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <nav className="flex items-center gap-1 text-xs text-text-muted"><Link to="/library/fields" className="hover:underline">Fields</Link><ChevronRight className="size-3" /><span>{shown}</span></nav>
      <div><h1 className="text-xl font-semibold">{shown}</h1><p className="mono text-xs text-text-muted">{key}</p><p className="mt-1 text-sm">{cur.meaning}</p><div className="mt-2 flex gap-1"><Pill>v{cur.version}</Pill><OriginPill origin={cur.origin} status={cur.status} /><Pill>{cur.scope === "CASE_LEVEL" ? "once per case" : "about a person"}</Pill></div></div>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="space-y-3 rounded-xl border border-border bg-surface-raised p-5 shadow-sm">
          <h2 className="font-semibold">Definition</h2>
          <div className="flex items-start gap-2"><Field label="Name" className="flex-1" hint="Renaming is direct and makes a new draft version; a name another field in this group already has is refused."><Input value={name} onChange={(e) => setName(e.target.value)} /></Field><Button className="mt-6" variant="secondary" onClick={() => rename.mutate(undefined)} busy={rename.isPending} disabled={!name.trim() || name.trim() === shown}><Pencil /> Rename</Button></div>
          <Field label="Meaning" hint="What reviewers and the comparison rely on; one meaning per field."><Textarea value={meaning} onChange={(e) => setMeaning(e.target.value)} /></Field>
          <Field label="Value type"><Select value={type} onChange={(e) => setType(e.target.value)}>{TYPES.map((t) => <option key={t} value={t}>{TYPE_WORD[t]}</option>)}</Select></Field>
          <div className="flex justify-end"><Button onClick={() => saveDef.mutate(undefined)} busy={saveDef.isPending} disabled={meaning === cur.meaning && type === cur.valueType}><Save /> Save as draft</Button></div>
          <p className="text-xs text-text-muted">Versions: {v.versions.map((x: any) => `v${x.version} ${x.status.toLowerCase()}${x.updatedBy ? ` (${nameOf(session.data?.actors, x.updatedBy)})` : ""}`).join(" · ")}</p>
        </section>
        <section className="space-y-3 rounded-xl border border-border bg-surface-raised p-5 shadow-sm">
          <h2 className="font-semibold">Where it is asked</h2>
          {!place ? <Notice tone="warn">Not placed: nobody is asked for this value yet, so form fields that read it stay unresolved in a case unless a supported document supplies it.</Notice> : null}
          {p ? <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Section"><Select value={p.sectionKey} onChange={(e) => setP({ ...p, sectionKey: e.target.value })}><option value="">Choose a section</option>{(sections.data ?? []).map((s) => <option key={s.key} value={s.key}>{s.title}</option>)}</Select></Field>
              <Field label="Collected from"><Select value={p.collectedFrom} onChange={(e) => setP({ ...p, collectedFrom: e.target.value })}>{COLLECTED.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
              <Field label="Repeats"><Select value={p.repeats} onChange={(e) => setP({ ...p, repeats: e.target.value })}><option value="once_per_case">Once per case</option><option value="per_person">For each person the forms need</option><option value="per_row">For each row (history, children)</option></Select></Field>
              <Field label="Question text" hint="Optional; the meaning is used when empty."><Input value={p.questionText} onChange={(e) => setP({ ...p, questionText: e.target.value })} /></Field>
            </div>
            <Field label="Condition on the question"><Select value={p.conditionEffect ?? ""} onChange={(e) => setP({ ...p, conditionEffect: e.target.value || null, condition: e.target.value ? p.condition : null })}><option value="">None: asked whenever a form needs it</option><option value="SHOW">Show only when…</option><option value="HIDE">Hide when…</option><option value="OPTIONAL">Optional when…</option></Select></Field>
            {p.conditionEffect ? <><ConditionBuilder value={p.condition} onChange={(c) => setP({ ...p, condition: c })} fields={fields.list} /><Field label="In plain words"><Input value={p.conditionPlain} onChange={(e) => setP({ ...p, conditionPlain: e.target.value })} /></Field></> : null}
            <div className="flex justify-end"><Button onClick={() => savePlace.mutate(undefined)} busy={savePlace.isPending} disabled={!p.sectionKey}><Save /> Save placement as draft</Button></div>
          </> : null}
        </section>
      </div>
      <section data-format-panel className="rounded-xl border border-border bg-surface-raised p-5 shadow-sm">
        <h2 className="font-semibold">Format</h2>
        <p className="mt-1 text-sm text-text-muted">Type: {TYPE_WORD[cur.valueType] ?? cur.valueType}. The format is read from the official forms that ask it (the PDF form field and the form's own checks, no AI) and checked on every answer; nobody types a rule here.</p>
        {(() => {
          const fmt = v.format as FieldFormatView | undefined;
          if (!fmt?.rules.length) return <Notice tone={fmt?.read || !v.used_by.length ? "info" : "warn"}>{!v.used_by.length ? "On no form, so no format is read." : fmt?.read ? "Its forms set no format beyond the type." : "Format: not read yet (its forms have not been read)."}</Notice>;
          return <Table dense className="mt-2" head={["Rule", "From", "The form says"]}>{fmt.rules.map((r) => <tr key={`${r.check}|${r.part}`}><td className="text-sm">{r.part ? <span className="text-text-muted">{r.part.replace(/_/g, " ")}: </span> : null}{r.words}</td><td className="text-xs">{r.sources.slice(0, 3).map((x) => `${x.form}, "${x.box}" (${FROM_WORD[x.from] ?? x.from})`).join(" · ")}{r.sources.length > 3 ? ` · ${r.sources.length - 3} more` : ""}</td><td className="text-xs text-text-muted">{r.sources.find((x) => x.quote)?.quote ? `"${r.sources.find((x) => x.quote)!.quote}"` : "—"}</td></tr>)}</Table>;
        })()}
        {(v.format as FieldFormatView | undefined)?.not_checked?.length ? <p className="mt-2 text-xs text-text-muted">Read from the form, not checked here yet: {(v.format as FieldFormatView).not_checked.map((n) => `${n.form} ${n.quote ? `"${n.quote}"` : n.function}`).join(" · ")}</p> : null}
      </section>
      <section data-sources className="rounded-xl border border-border bg-surface-raised p-5 shadow-sm">
        <h2 className="font-semibold">Where it comes from</h2>
        {src.isLoading ? <Spinner label="Loading sources" /> : src.data?.unsourced ? <Notice tone="warn">No source recorded: this field was not read from a form field, a checklist line or a rule.</Notice> : <ul className="mt-2 space-y-1 text-sm">{(src.data?.sources ?? []).slice(0, 30).map((l) => <li key={l.text}>{l.text}{l.quote ? <span className="text-xs text-text-muted"> · {l.kind === "release" ? l.quote : `"${l.quote}"`}</span> : null}</li>)}</ul>}
        <p className="mt-3 text-sm"><span className="text-text-muted">Used in combinations:</span> {src.data?.used_in?.length ? src.data.used_in.join(", ") : "none"}</p>
      </section>
      <section className="rounded-xl border border-border bg-surface-raised p-5 shadow-sm">
        <h2 className="font-semibold">Form fields that read it, and whose value each form field needs</h2>
        {!v.used_by.length ? <p className="mt-2 text-sm text-text-muted">No form field reads this field.</p> : v.used_by.map((u: any) => (
          <div key={u.edition} className="mt-3"><p className="text-sm font-medium">{u.edition} · {u.boxes.length} form field{u.boxes.length > 1 ? "s" : ""}</p>
            <Table dense className="mt-1" head={["Form field", "Whose value", "Row", "Transformation", "Status"]}>{u.boxes.slice(0, 50).map((b: any) => <tr key={b.data_path}><td className="max-w-md text-xs">{b.caption || <span className="mono">{b.data_path}</span>}</td><td className="text-xs">{PERSON[b.person] ?? b.person}</td><td className="text-xs">{b.row === null ? "—" : b.row + 1}</td><td className="mono text-xs">{b.transform}</td><td><OriginPill origin={b.origin} status={b.status} /></td></tr>)}</Table>
          </div>
        ))}
        {v.supplied_by_documents.length ? <p className="mt-3 text-sm">A supported document can supply it: {v.supplied_by_documents.join(", ")} <span className="text-xs text-text-muted">(a proposal until reading the document proves it on a case)</span></p> : null}
      </section>
      <section className="rounded-xl border border-border bg-surface-raised p-5 shadow-sm">
        <h2 className="font-semibold">Conditions that read it</h2>
        {!v.conditions.length ? <p className="mt-2 text-sm text-text-muted">None.</p> : <Table dense className="mt-2" head={["Kind", "Item", "Combination", "Condition"]}>{v.conditions.map((c: any, i: number) => <tr key={i}><td className="text-xs">{c.kind}</td><td className="max-w-sm text-xs">{c.item}</td><td className="text-xs">{c.combination}</td><td className="max-w-md text-xs text-text-muted">{c.plain}</td></tr>)}</Table>}
      </section>
    </div>
  );
}

export function SectionsPage() {
  const s = useApi<any[]>(["sections"], "/library/sections");
  const [editing, setEditing] = React.useState<{ key: string; title: string } | null>(null);
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div><h1 className="text-xl font-semibold">Sections</h1><p className="mt-1 text-sm text-text-muted">Reusable groups of questions. Each combination selects the sections its questionnaire uses.</p><Origin>the forms' own parts, each confirmed on To review. Nothing is added by hand; a combination picks its sections on its Questionnaires tab.</Origin></div>
      {s.isLoading ? <Spinner label="Loading" /> : !s.data?.length ? <EmptyState title="No sections yet" description="Sections come with the forms' parts; add a form first." /> : <Table head={["Section", "Meaning", "Questions", "Used by combinations", "Status", ""]}>{s.data.map((x) => <tr key={x.key}><td className="font-medium">{x.title}</td><td className="max-w-lg text-xs text-text-muted">{x.meaning}<SourceNote r={x} /></td><td>{x.questions}</td><td className="text-xs">{usedWords(x.used_in)}</td><td><ListPill origin={x.origin} status={x.status} /></td><td><Button variant="ghost" size="sm" aria-label={`Rename ${x.title}`} onClick={() => setEditing({ key: x.key, title: x.title })}><Pencil /> Rename</Button></td></tr>)}</Table>}
      {editing ? <RenameSection section={editing} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}

function RenameSection({ section, onClose }: { section: { key: string; title: string }; onClose: () => void }) {
  const [title, setTitle] = React.useState(section.title);
  const save = useAction(() => api(`/library/sections/${encodeURIComponent(section.key)}`, { method: "PATCH", json: { name: title } }), { success: "Section renamed (a new draft version)", invalidate: [["sections"]], onDone: onClose });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={`Rename "${section.title}"`} description="Renaming is direct and makes a new draft version; another section's title is refused." footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => save.mutate(undefined)} busy={save.isPending} disabled={!title.trim() || title.trim() === section.title}>Rename</Button></>}>
      <Field label="Title"><Input value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
    </Dialog>
  );
}

export function DocumentTypesPage() {
  const t = useApi<any[]>(["doc-types"], "/library/document-types");
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div><h1 className="text-xl font-semibold">Document types</h1><p className="mt-1 text-sm text-text-muted">Reusable document definitions. The facts a supported document can supply are a proposal until reading that document proves them on a case.</p><Origin>the document checklist lines of each combination (its official checklist, quoted), applied on the combination's Documents tab. Nothing is added by hand.</Origin></div>
      {t.isLoading ? <Spinner label="Loading" /> : !t.data?.length ? <EmptyState title="No document types yet" /> : <Table head={["Document type", "Category", "Facts it can supply", "Used by combinations", "Status"]}>{t.data.map((x) => <tr key={x.documentTypeKey}><td className="max-w-md font-medium">{x.name}<SourceNote r={x} /></td><td className="text-xs">{CATEGORY_WORD[x.category] ?? x.category}</td><td className="max-w-lg text-xs">{x.suppliesFacts?.length ? x.suppliesFacts.map(fieldName).join(", ") : <span className="text-text-muted">none recorded</span>}</td><td className="text-xs">{usedWords(x.used_in)}</td><td><ListPill origin={x.origin} status={x.status} /></td></tr>)}</Table>}
    </div>
  );
}
