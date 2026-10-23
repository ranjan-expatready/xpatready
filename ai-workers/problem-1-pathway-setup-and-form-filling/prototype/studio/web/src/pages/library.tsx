import * as React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronRight, Plus, Save, Search } from "lucide-react";
import { api, useAction, useApi } from "@/lib/api";
import { Button, Dialog, Field, Input, Notice, Pill, Select, Table, Textarea } from "@/components/ui/controls";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { ConditionBuilder } from "@/components/conditions";
import { OriginPill, useLibraryFields } from "@/pages/configuration";
import { PERSON } from "@/pages/job";

const TYPES = ["text", "date", "yes_no", "code", "country", "number", "address", "phone", "email"];
const COLLECTED: [string, string][] = [["client_questionnaire", "Client questionnaire"], ["verified_document", "A verified document"], ["staff_working_view", "Staff working view"], ["profile_record", "Client profile"], ["existing_record", "Existing record"]];

export function FieldsPage() {
  const [q, setQ] = React.useState("");
  const [only, setOnly] = React.useState("all");
  const [add, setAdd] = React.useState(false);
  const list = useApi<any[]>(["fields"], "/library/fields");
  const rows = (list.data ?? []).filter((f) => (!q || f.key.includes(q.toLowerCase()) || f.meaning.toLowerCase().includes(q.toLowerCase())) && (only === "all" || (only === "draft" && f.has_draft) || (only === "ai" && f.origin === "AI_PROPOSAL") || (only === "unplaced" && !f.placement) || (only === "shared" && f.forms.length > 1)));
  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-xl font-semibold">Canonical fields</h1><p className="mt-1 text-sm text-text-muted">One definition per meaning, shared by every form and program. Values about people and cases are never stored here.</p></div><Button onClick={() => setAdd(true)}><Plus /> Add a field</Button></div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-96"><Search className="absolute left-2.5 top-2.5 size-4 text-text-muted" /><Input className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search key or meaning" aria-label="Search fields" /></div>
        <Select className="w-64" value={only} onChange={(e) => setOnly(e.target.value)} aria-label="Filter"><option value="all">All fields</option><option value="shared">Used by more than one form</option><option value="draft">With a draft change</option><option value="ai">AI-proposed</option><option value="unplaced">Not asked anywhere</option></Select>
        <span className="text-xs text-text-muted">{rows.length} of {list.data?.length ?? 0}</span>
      </div>
      {list.isLoading ? <Spinner label="Loading fields" /> : !list.data?.length ? <EmptyState title="The library is empty" description="Load sample inputs, or add a form with AI drafting; reviewed fields land here." /> : (
        <Table head={["Field", "Meaning", "Type", "Forms", "Asked in", "Status"]}>
          {rows.slice(0, 400).map((f) => <tr key={f.key}><td><Link className="mono text-text-link hover:underline" to={`/library/fields/${encodeURIComponent(f.key)}`}>{f.key}</Link></td><td className="max-w-md text-xs">{f.meaning}</td><td className="text-xs">{f.value_type}</td><td className="text-xs">{f.forms.join(", ") || <span className="text-text-muted">none</span>}<span className="text-text-muted"> · {f.boxes} boxes</span></td><td className="text-xs">{f.placement ? `${f.placement.section.replace(/_/g, " ")} · ${f.placement.collected_from.replace(/_/g, " ")}` : <span className="text-text-warn">not placed</span>}</td><td><span className="flex flex-wrap gap-1"><Pill>v{f.version}</Pill><OriginPill origin={f.origin} status={f.status} /></span></td></tr>)}
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
    <Dialog open onOpenChange={(o) => !o && onClose()} title="Add a canonical field" description="Check the library first: one meaning has one key, whoever it is about." footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => save.mutate(undefined)} busy={save.isPending}>Add as draft</Button></>}>
      <div className="space-y-3">
        <Field label="Key" hint="area.name in lower case; areas: person, relationship, case, organisation, representative"><Input className="mono" value={key} onChange={(e) => setKey(e.target.value)} /></Field>
        <Field label="Meaning"><Textarea value={meaning} onChange={(e) => setMeaning(e.target.value)} placeholder="Country that refused the person's previous visa application" /></Field>
        <Field label="Value type"><Select value={type} onChange={(e) => setType(e.target.value)}>{TYPES.map((t) => <option key={t}>{t}</option>)}</Select></Field>
      </div>
    </Dialog>
  );
}

export function FieldPage() {
  const { key = "" } = useParams();
  const f = useApi<any>(["field", key], `/library/fields/${encodeURIComponent(key)}`);
  const sections = useApi<any[]>(["sections"], "/library/sections");
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
      <nav className="flex items-center gap-1 text-xs text-text-muted"><Link to="/library/fields" className="hover:underline">Fields</Link><ChevronRight className="size-3" /><span className="mono">{key}</span></nav>
      <div><h1 className="mono text-xl font-semibold">{key}</h1><p className="mt-1 text-sm">{cur.meaning}</p><div className="mt-2 flex gap-1"><Pill>v{cur.version}</Pill><OriginPill origin={cur.origin} status={cur.status} /><Pill>{cur.scope === "CASE_LEVEL" ? "once per case" : "about a person"}</Pill></div></div>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="space-y-3 rounded-xl border border-border bg-surface-raised p-5 shadow-sm">
          <h2 className="font-semibold">Definition</h2>
          <Field label="Meaning" hint="What reviewers and the comparison rely on; one meaning per key."><Textarea value={meaning} onChange={(e) => setMeaning(e.target.value)} /></Field>
          <Field label="Value type"><Select value={type} onChange={(e) => setType(e.target.value)}>{TYPES.map((t) => <option key={t}>{t}</option>)}</Select></Field>
          <div className="flex justify-end"><Button onClick={() => saveDef.mutate(undefined)} busy={saveDef.isPending} disabled={meaning === cur.meaning && type === cur.valueType}><Save /> Save as draft</Button></div>
          <p className="text-xs text-text-muted">Versions: {v.versions.map((x: any) => `v${x.version} ${x.status.toLowerCase()}${x.updatedBy ? ` (${x.updatedBy})` : ""}`).join(" · ")}</p>
        </section>
        <section className="space-y-3 rounded-xl border border-border bg-surface-raised p-5 shadow-sm">
          <h2 className="font-semibold">Where it is asked</h2>
          {!place ? <Notice tone="warn">Not placed: nobody is asked for this value yet, so boxes that read it stay unresolved in a case unless a supported document supplies it.</Notice> : null}
          {p ? <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Section"><Select value={p.sectionKey} onChange={(e) => setP({ ...p, sectionKey: e.target.value })}><option value="">choose</option>{(sections.data ?? []).map((s) => <option key={s.key} value={s.key}>{s.title}</option>)}</Select></Field>
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
        <h2 className="font-semibold">Boxes that read it, and whose value each box needs</h2>
        {!v.used_by.length ? <p className="mt-2 text-sm text-text-muted">No form box reads this field.</p> : v.used_by.map((u: any) => (
          <div key={u.edition} className="mt-3"><p className="text-sm font-medium">{u.edition} · {u.boxes.length} box{u.boxes.length > 1 ? "es" : ""}</p>
            <Table dense className="mt-1" head={["Box", "Whose value", "Row", "Transformation", "Status"]}>{u.boxes.slice(0, 50).map((b: any) => <tr key={b.data_path}><td className="max-w-md text-xs">{b.caption || <span className="mono">{b.data_path}</span>}</td><td className="text-xs">{PERSON[b.person] ?? b.person}</td><td className="text-xs">{b.row === null ? "—" : b.row + 1}</td><td className="mono text-xs">{b.transform}</td><td><OriginPill origin={b.origin} status={b.status} /></td></tr>)}</Table>
          </div>
        ))}
        {v.supplied_by_documents.length ? <p className="mt-3 text-sm">A supported document can supply it: {v.supplied_by_documents.join(", ")} <span className="text-xs text-text-muted">(reader profile, a proposal; extraction is proved in the case journey)</span></p> : null}
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
      {s.isLoading ? <Spinner label="Loading" /> : !s.data?.length ? <EmptyState title="No sections yet" /> : <Table head={["Section", "Meaning", "Question placements", "Used by combinations", "Status"]}>{s.data.map((x) => <tr key={x.key}><td className="font-medium">{x.title}</td><td className="max-w-lg text-xs text-text-muted">{x.meaning}</td><td>{x.questions}</td><td>{x.combinations}</td><td><OriginPill origin={x.origin} status={x.status} /></td></tr>)}</Table>}
    </div>
  );
}

export function DocumentTypesPage() {
  const t = useApi<any[]>(["doc-types"], "/library/document-types");
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div><h1 className="text-xl font-semibold">Document types</h1><p className="mt-1 text-sm text-text-muted">Reusable document definitions. Facts a supported type can supply come from the reader profiles (a proposal until the reader proves them on a case).</p></div>
      {t.isLoading ? <Spinner label="Loading" /> : !t.data?.length ? <EmptyState title="No document types yet" /> : <Table head={["Document type", "Category", "Facts it can supply", "Status"]}>{t.data.map((x) => <tr key={x.documentTypeKey}><td className="max-w-md font-medium">{x.name}</td><td className="text-xs">{x.category}</td><td className="max-w-lg text-xs">{x.suppliesFacts?.length ? x.suppliesFacts.join(", ") : <span className="text-text-muted">none recorded</span>}</td><td><OriginPill origin={x.origin} status={x.status} /></td></tr>)}</Table>}
    </div>
  );
}
