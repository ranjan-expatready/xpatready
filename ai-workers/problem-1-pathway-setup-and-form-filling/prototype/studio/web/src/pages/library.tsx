import * as React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronRight, Plus, Save, Search } from "lucide-react";
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

export function FieldsPage() {
  const [q, setQ] = React.useState("");
  const [only, setOnly] = React.useState("all");
  const [add, setAdd] = React.useState(false);
  const list = useApi<any[]>(["fields"], "/library/fields");
  const rows = (list.data ?? []).filter((f) => (!q || f.key.includes(q.toLowerCase()) || fieldName(f.key).toLowerCase().includes(q.toLowerCase()) || f.meaning.toLowerCase().includes(q.toLowerCase())) && (only === "all" || (only === "draft" && f.has_draft) || (only === "ai" && f.origin === "AI_PROPOSAL") || (only === "unplaced" && !f.placement) || (only === "shared" && f.forms.length > 1)));
  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-xl font-semibold">Fields</h1><p className="mt-1 text-sm text-text-muted">One definition per meaning, shared by every form and program. Values about people and cases are never stored here.</p></div><Button onClick={() => setAdd(true)}><Plus /> Add a field</Button></div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-96"><Search className="absolute left-2.5 top-2.5 size-4 text-text-muted" /><Input className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a field or its meaning" aria-label="Search fields" /></div>
        <Select className="w-64" value={only} onChange={(e) => setOnly(e.target.value)} aria-label="Filter"><option value="all">All fields</option><option value="shared">Used by more than one form</option><option value="draft">With a draft change</option><option value="ai">AI-proposed</option><option value="unplaced">Not asked anywhere</option></Select>
        <span className="text-xs text-text-muted">{rows.length} of {list.data?.length ?? 0}</span>
      </div>
      {list.isLoading ? <Spinner label="Loading fields" /> : !list.data?.length ? <EmptyState title="The library is empty" description="Load sample inputs, or add a form with AI drafting; reviewed fields land here." /> : (
        <Table head={["Field", "Meaning", "Type", "Forms", "Asked in", "Status"]}>
          {rows.slice(0, 400).map((f) => <tr key={f.key}><td><Link className="font-medium text-text-link hover:underline" to={`/library/fields/${encodeURIComponent(f.key)}`}>{fieldName(f.key)}</Link><p className="mono break-all text-[11px] text-text-muted">{f.key}</p></td><td className="max-w-md text-xs">{f.meaning}</td><td className="text-xs">{TYPE_WORD[f.value_type] ?? f.value_type}</td><td className="text-xs">{f.forms.join(", ") || <span className="text-text-muted">none</span>}<span className="text-text-muted"> · {f.boxes} form field{f.boxes === 1 ? "" : "s"}</span></td><td className="text-xs">{f.placement ? `${f.placement.section.replace(/_/g, " ")} · ${collectedWord(f.placement.collected_from)}` : <span className="text-text-warn">not placed</span>}</td><td><ListPill origin={f.origin} status={f.status} /></td></tr>)}
        </Table>
      )}
      {add ? <AddField onClose={() => setAdd(false)} /> : null}
    </div>
  );
}

function AddField({ onClose }: { onClose: () => void }) {
  const nav = useNavigate();
  const [key, setKey] = React.useState("person."), [meaning, setMeaning] = React.useState(""), [type, setType] = React.useState("text");
  const save = useAction(() => api("/library/fields", { method: "POST", json: { key, meaning, valueType: type } }), { success: "Field added as a draft", invalidate: [["fields"]], onDone: () => { onClose(); nav(`/library/fields/${encodeURIComponent(key)}`); } });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title="Add a field" description="Check the library first: one meaning has one field, whoever it is about." footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => save.mutate(undefined)} busy={save.isPending}>Add as draft</Button></>}>
      <div className="space-y-3">
        <Field label="Key" hint="area.name in lower case; areas: person, relationship, case, organisation, representative"><Input className="mono" value={key} onChange={(e) => setKey(e.target.value)} /></Field>
        <Field label="Meaning"><Textarea value={meaning} onChange={(e) => setMeaning(e.target.value)} placeholder="Country that refused the person's previous visa application" /></Field>
        <Field label="Value type"><Select value={type} onChange={(e) => setType(e.target.value)}>{TYPES.map((t) => <option key={t} value={t}>{TYPE_WORD[t]}</option>)}</Select></Field>
      </div>
    </Dialog>
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
  const savePlace = useAction(() => api(`/library/fields/${encodeURIComponent(key)}/placement`, { method: "POST", json: p }), { success: "Placement saved as a draft version", invalidate: inv });
  if (f.isLoading) return <Spinner label="Loading field" />;
  if (f.isError) return <Notice tone="danger" title="Field not found">{(f.error as Error).message}</Notice>;
  const v = f.data;
  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <nav className="flex items-center gap-1 text-xs text-text-muted"><Link to="/library/fields" className="hover:underline">Fields</Link><ChevronRight className="size-3" /><span>{fieldName(key)}</span></nav>
      <div><h1 className="text-xl font-semibold">{fieldName(key)}</h1><p className="mono text-xs text-text-muted">{key}</p><p className="mt-1 text-sm">{cur.meaning}</p><div className="mt-2 flex gap-1"><Pill>v{cur.version}</Pill><OriginPill origin={cur.origin} status={cur.status} /><Pill>{cur.scope === "CASE_LEVEL" ? "once per case" : "about a person"}</Pill></div></div>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="space-y-3 rounded-xl border border-border bg-surface-raised p-5 shadow-sm">
          <h2 className="font-semibold">Definition</h2>
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
  const [title, setTitle] = React.useState(""), [meaning, setMeaning] = React.useState("");
  const add = useAction(() => api("/library/sections", { method: "POST", json: { title, meaning } }), { success: "Section added as a draft", invalidate: [["sections"]], onDone: () => { setTitle(""); setMeaning(""); } });
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div><h1 className="text-xl font-semibold">Sections</h1><p className="mt-1 text-sm text-text-muted">Reusable groups of questions. Each combination selects the sections its questionnaire uses.</p></div>
      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-border bg-surface-raised p-4"><Field label="New section title" className="w-72"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Travel history" /></Field><Field label="Meaning" className="min-w-80 flex-1"><Input value={meaning} onChange={(e) => setMeaning(e.target.value)} /></Field><Button onClick={() => add.mutate(undefined)} disabled={!title.trim()} busy={add.isPending}><Plus /> Add</Button></div>
      {s.isLoading ? <Spinner label="Loading" /> : !s.data?.length ? <EmptyState title="No sections yet" /> : <Table head={["Section", "Meaning", "Questions", "Used by combinations", "Status"]}>{s.data.map((x) => <tr key={x.key}><td className="font-medium">{x.title}</td><td className="max-w-lg text-xs text-text-muted">{x.meaning}</td><td>{x.questions}</td><td>{x.combinations}</td><td><ListPill origin={x.origin} status={x.status} /></td></tr>)}</Table>}
    </div>
  );
}

export function DocumentTypesPage() {
  const t = useApi<any[]>(["doc-types"], "/library/document-types");
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div><h1 className="text-xl font-semibold">Document types</h1><p className="mt-1 text-sm text-text-muted">Reusable document definitions. The facts a supported document can supply are a proposal until reading that document proves them on a case.</p></div>
      {t.isLoading ? <Spinner label="Loading" /> : !t.data?.length ? <EmptyState title="No document types yet" /> : <Table head={["Document type", "Category", "Facts it can supply", "Status"]}>{t.data.map((x) => <tr key={x.documentTypeKey}><td className="max-w-md font-medium">{x.name}</td><td className="text-xs">{CATEGORY_WORD[x.category] ?? x.category}</td><td className="max-w-lg text-xs">{x.suppliesFacts?.length ? x.suppliesFacts.map(fieldName).join(", ") : <span className="text-text-muted">none recorded</span>}</td><td><ListPill origin={x.origin} status={x.status} /></td></tr>)}</Table>}
    </div>
  );
}
