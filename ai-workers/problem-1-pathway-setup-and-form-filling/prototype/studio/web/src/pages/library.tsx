import * as React from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ChevronRight, Pencil, Save, Search, Undo2 } from "lucide-react";
import { api, ApiError, useAction, useActorId, useApi } from "@/lib/api";
import { ChangePreview, useChangeCheck } from "@/ChangePreview";
import { Button, Dialog, Field, Input, Notice, Pill, Select, Table, Textarea } from "@/components/ui/controls";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { ConditionBuilder } from "@/components/conditions";
import { OriginPill, useLibraryFields } from "@/pages/configuration";
import { PERSON } from "@/pages/job";
import { nameOf } from "@/pages/review";
import { ItemStatusNote, useCanAuthor, useItemLifecycle } from "@/pages/library-item-actions";
import { TipProvider } from "@/components/status";
import { AdminDetails } from "@/components/details";

/** QA-39: value types in words (the stored code stays the value). */
const TYPE_WORD: Record<string, string> = { text: "Text", date: "Date", yes_no: "Yes or no", code: "List of choices", country: "Country", number: "Number", address: "Address", phone: "Phone number", email: "Email address",
  // P-47 types (C4.4 review m5); "document" is not one (P-130: an upload is a checklist line).
  long_text: "Long text", multi_choice: "Several choices", person_name: "Person's name (family and given names)", period_history: "Periods of time (history)", declaration: "Declaration (tick to agree)" };
const TYPES = Object.keys(TYPE_WORD);
const COLLECTED: [string, string][] = [["client_questionnaire", "Client questionnaire"], ["verified_document", "A verified document"], ["staff_working_view", "The case officer (Agent view)"], ["profile_record", "Client profile"], ["existing_record", "Existing record"]];
const collectedWord = (k: string) => COLLECTED.find(([x]) => x === k)?.[1] ?? k.replace(/_/g, " ");
import { fieldName } from "@/lib/field-name";
export { fieldName }; // QA-39, QA-71 (one copy in lib/field-name.ts)
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
const FORMAT_NONE: Record<Exclude<FormatLine["state"], "read">, string> = { none_on_form: "none on its forms", not_read: "not read yet", no_form: "on no form" };
const FormatCell = ({ f }: { f?: FormatLine }) => f?.text ? <span data-format>{f.text}</span> : <span data-format className={f?.state === "not_read" ? "text-text-warn" : "text-text-muted"}>{FORMAT_NONE[(f?.state ?? "not_read") as Exclude<FormatLine["state"], "read">]}</span>;
/** GET /library/fields/:key → format (engine/field-format.ts): each rule, the forms and boxes that say so, the quote. */
type FieldFormatView = { rules: { check: string; words: string; part: string | null; part_words: string | null; sources: { form: string; box: string; quote: string | null; from: string }[] }[]; not_checked: { function: string; form: string; quote: string | null; why: string }[]; read: boolean };
const FROM_WORD: Record<string, string> = { pdf_box: "the PDF form field", form_script: "the form's own check", field_map: "the field map" };
/** GET /library/:kind/:key/sources (api/src/library-sources.ts). */
type SourcesView = { name: string; sources: { kind: string; text: string; quote?: string | null; ref?: string | null }[]; unsourced: boolean; used_in: string[] };
/** Where used (C3.13): the combinations by name, the first two and a count. */
// C3.13 BR-3: the search also finds a field by one of its aliases, or by the start of the code or number of a form that
// fills it, with or without its space ("imm5257" or "5257" finds IMM 5257; 3 characters at least), as
// GET /library/fields?q= does (api/src/library-items.ts formCodeStarts).
const compact = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
const formCodeStarts = (form: string, code: string) => { const c = compact(form); return c.startsWith(code) || c.replace(/^\p{L}+/u, "").startsWith(code); };
const findsByAliasOrForm = (f: { aliases?: string[]; forms: string[] }, q: string) => (f.aliases ?? []).some((a) => a.toLowerCase().includes(q.toLowerCase())) || (compact(q).length >= 3 && f.forms.some((c) => formCodeStarts(c, compact(q))));
const usedWords = (used: string[] | undefined) => !used?.length ? <span className="text-text-muted">none</span> : <span title={used.join(", ")}>{used.slice(0, 2).join(", ")}{used.length > 2 ? ` and ${used.length - 2} more` : ""}</span>;

/** GET /library/reuse/:kind (api/src/library-sources.ts, C3.13, Screen 04 BR-4). */
type ReuseView = { combinations: { id: string; key: string; label: string; uses: number }[]; combination: { id: string; key: string; label: string } | null; total?: number; reused?: number; new?: number; items?: Record<string, { in_combination: "REUSED" | "NEW"; brought_in_by: string }> };
/** C3.13: the chosen combination lives in the address (?combination=<key>), so a filtered list can be shared and reloaded. */
function useReuse(kind: "fields" | "sections" | "document-types") {
  const [params, setParams] = useSearchParams();
  const combination = params.get("combination") ?? "";
  const r = useApi<ReuseView>(["library-reuse", kind, combination], `/library/reuse/${kind}${combination ? `?combination=${encodeURIComponent(combination)}` : ""}`);
  const choose = (key: string) => setParams((p) => { const n = new URLSearchParams(p); if (key) n.set("combination", key); else n.delete("combination"); return n; }, { replace: true });
  const items = combination && r.data?.combination ? r.data.items ?? {} : null;
  // Review c313 m2: with a combination in the address, nothing is drawn until its marks are known (no whole list first).
  const waiting = !!combination && r.isLoading;
  return { combination, choose, view: r.data, waiting, error: r.isError ? (r.error as Error).message : null, items, keep: (key: string) => !waiting && (!items || key in items) };
}
/** The Combination chooser and, once one is chosen, its totals ("18 · 12 reused · 6 new here"). */
function ReuseBar({ reuse, noun }: { reuse: ReturnType<typeof useReuse>; noun: string }) {
  const v = reuse.view;
  return <>
    <Select className="w-64" value={reuse.combination} onChange={(e) => reuse.choose(e.target.value)} aria-label="Combination"><option value="">All combinations</option>{(v?.combinations ?? []).map((c) => <option key={c.key} value={c.key}>{c.label} ({c.uses} used)</option>)}</Select>
    {reuse.error ? <span role="alert" className="text-xs text-text-danger">{reuse.error}</span> : v?.combination ? <span data-reuse-totals className="text-xs"><span className="font-medium">{v.combination.label} uses {v.total} {noun}{v.total === 1 ? "" : "s"}</span> · {v.reused} reused · {v.new} new here</span> : null}
  </>;
}
/** A row's mark with a combination chosen: Reused (another combination brought it in) or New here. */
/** Review c313 m1: who brought a reused item in is visible text, not only a hover title. */
const ReuseMark = ({ reuse, k }: { reuse: ReturnType<typeof useReuse>; k: string }) => { const it = reuse.items?.[k]; return !it ? null : it.in_combination === "NEW" ? <Pill tone="info">New here</Pill> : <span data-reused className="inline-flex flex-col gap-0.5"><Pill>Reused</Pill><span className="text-[11px] text-text-muted">from {it.brought_in_by}</span></span>; };
const NoneInCombination = ({ reuse, noun }: { reuse: ReturnType<typeof useReuse>; noun: string }) => <EmptyState title={`${reuse.view?.combination?.label} uses no ${noun}s yet`} description="Choose All combinations to see the whole library, or set up this combination first." />;

export function FieldsPage() {
  const [q, setQ] = React.useState("");
  const [only, setOnly] = React.useState("all");
  // C11.9 BR-10: the default list leaves retired fields out; the whole list (retired=all) feeds the Retired filter.
  const list = useApi<any[]>(["fields", "all"], "/library/fields?retired=all");
  const reuse = useReuse("fields");
  const navigate = useNavigate();
  const canAuthor = useCanAuthor();
  const life = useItemLifecycle("fields", () => list.refetch(), canAuthor);
  // C11.9 (BR-10): a retired field is listed only under "Retired".
  const rows = (list.data ?? []).filter((f) => (only === "retired" ? f.retired : !f.retired)).filter((f) => reuse.keep(f.key) && (!q || f.key.includes(q.toLowerCase()) || (f.name ?? fieldName(f.key)).toLowerCase().includes(q.toLowerCase()) || f.meaning.toLowerCase().includes(q.toLowerCase()) || findsByAliasOrForm(f, q)) && (only === "all" || only === "retired" || (only === "draft" && f.has_draft) || (only === "ai" && f.origin === "AI_PROPOSAL") || (only === "unplaced" && !f.placement) || (only === "shared" && f.forms.length > 1)));
  return (
    <TipProvider><div className="mx-auto max-w-7xl space-y-4">
      <div><h1 className="text-xl font-semibold">Fields</h1><p className="mt-1 text-sm text-text-muted">One definition per meaning, shared by every form and program. Values about people and cases are never stored here.</p><Origin>each field is read from a form field (proposed by AI, confirmed by a person), a document checklist line, or a rule that needs it. Nothing is added by hand.</Origin></div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-96"><Search className="absolute left-2.5 top-2.5 size-4 text-text-muted" /><Input className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a field, its meaning, an alias or a form code" aria-label="Search fields" /></div>
        <Select className="w-64" value={only} onChange={(e) => setOnly(e.target.value)} aria-label="Filter"><option value="all">All fields</option><option value="shared">Used by more than one form</option><option value="draft">With a draft change</option><option value="ai">AI-proposed</option><option value="unplaced">Not asked anywhere</option><option value="retired">Retired</option></Select>
        <ReuseBar reuse={reuse} noun="field" />
        <span className="text-xs text-text-muted">{rows.length} of {list.data?.length ?? 0}</span>
      </div>
      {list.isLoading || reuse.waiting ? <Spinner label="Loading fields" /> : !list.data?.length ? <EmptyState title="The library is empty" description="Load sample inputs, or add a form with AI drafting; reviewed fields land here." /> : reuse.items && !Object.keys(reuse.items).length ? <NoneInCombination reuse={reuse} noun="field" /> : (
        <Table head={["Field", "Meaning, format and source", "Type", "Forms", "Asked in", "Status"]}>
          {rows.slice(0, 400).map((f) => <tr key={f.key} data-item={f.key}><td><Link className="font-medium text-text-link hover:underline" to={`/library/fields/${encodeURIComponent(f.key)}`}>{f.name ?? fieldName(f.key)}</Link></td><td className="max-w-md text-xs">{f.meaning}<p className="mt-1 text-[11px]"><span className="text-text-muted">Format: </span><FormatCell f={f.format} /></p><SourceNote r={f} /></td><td className="text-xs">{TYPE_WORD[f.value_type] ?? f.value_type}</td><td className="text-xs">{f.forms.join(", ") || <span className="text-text-muted">none</span>}<span className="text-text-muted"> · {f.boxes} form field{f.boxes === 1 ? "" : "s"}{f.used_in?.length ? ` · ${f.used_in.length} combination${f.used_in.length === 1 ? "" : "s"}` : ""}</span></td><td className="text-xs">{f.placement ? `${f.placement.section.replace(/_/g, " ")} · ${collectedWord(f.placement.collected_from)}` : <span className="text-text-warn">not placed</span>}</td><td><div className="flex flex-wrap gap-1"><ReuseMark reuse={reuse} k={f.key} />{f.retired ? <Pill>Retired</Pill> : <ListPill origin={f.origin} status={f.status} />}</div><ItemStatusNote r={f} /><div className="mt-1.5">{life.action({ ...f, name: f.name ?? fieldName(f.key) }, () => navigate(`/library/fields/${encodeURIComponent(f.key)}`))}</div></td></tr>)}
        </Table>
      )}
      {life.node}
    </div></TipProvider>
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
  const [meaning, setMeaning] = React.useState(""), [type, setType] = React.useState("text"), [why, setWhy] = React.useState("");
  // C3.15: the reason is counted as the server counts it (NFKC, invisible characters removed; Devin on #712).
  const whyLength = why.normalize("NFKC").replace(/[\p{Cf}\p{Default_Ignorable_Code_Point}]/gu, "").trim().length;
  const [p, setP] = React.useState<any>(null);
  React.useEffect(() => { if (cur) { setMeaning(cur.meaning); setType(cur.valueType); } }, [cur?.id]);
  React.useEffect(() => { if (f.data) setP(place ? { sectionKey: place.sectionKey, collectedFrom: place.collectedFrom, repeats: place.repeats, tier: place.tier, questionText: place.questionText ?? "", helpText: place.helpText ?? "", condition: place.predicateJson, conditionEffect: place.conditionEffect, conditionPlain: place.conditionPlain ?? "" } : { sectionKey: "", collectedFrom: "client_questionnaire", repeats: key.startsWith("case.") ? "once_per_case" : "per_person", tier: "case", questionText: "", helpText: "", condition: null, conditionEffect: null, conditionPlain: "" }); }, [f.data?.current?.id, place?.id]);
  const inv = [["field", key], ["fields"], ["preview"], ["config"], ["combination"]];
  const saveDef = useAction(() => api(`/library/fields/${encodeURIComponent(key)}`, { method: "PATCH", json: { meaning, valueType: type, ...(meaning.trim() !== cur?.meaning ? { reason: why } : {}) } }), { success: "Definition saved as a draft version", invalidate: inv, onDone: () => setWhy("") });
  const [name, setName] = React.useState("");
  React.useEffect(() => { if (cur) setName((cur.labelChecked && cur.label) || fieldName(key)); }, [cur?.id, cur?.label]);
  const src = useApi<SourcesView>(["field-sources", key], `/library/fields/${encodeURIComponent(key)}/sources`);
  const [renaming, setRenaming] = React.useState(false); // G-CORE B2: the rename is confirmed in a dialog with "What this change touches"
  const savePlace = useAction(() => api(`/library/fields/${encodeURIComponent(key)}/placement`, { method: "POST", json: p }), { success: "Placement saved as a draft version", invalidate: inv });
  if (f.isLoading) return <Spinner label="Loading field" />;
  if (f.isError) return <Notice tone="danger" title="Field not found">{(f.error as Error).message}</Notice>;
  const v = f.data;
  const shown = (cur.labelChecked && cur.label) || fieldName(key);
  // C11.9 break round 2 minor: a retired field is read-only here until it is restored (each change would be refused).
  const retiredNow = cur.status === "RETIRED";
  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <nav className="flex items-center gap-1 text-xs text-text-muted"><Link to="/library/fields" className="hover:underline">Fields</Link><ChevronRight className="size-3" /><span>{shown}</span></nav>
      {/* UX-A part 4 (EXPERIENCE §5): the field's key is under Details, not under its name. */}
      <div><h1 className="text-xl font-semibold">{shown}</h1><p className="mt-1 text-sm">{cur.meaning}</p><div className="mt-2 flex gap-1"><Pill>v{cur.version}</Pill>{retiredNow ? <Pill>Retired</Pill> : <OriginPill origin={cur.origin} status={cur.status} />}<Pill>{cur.scope === "CASE_LEVEL" ? "once per case" : "about a person"}</Pill></div><AdminDetails className="mt-2" items={[["Field key", key]]} /></div>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="space-y-3 rounded-xl border border-border bg-surface-raised p-5 shadow-sm">
          <h2 className="font-semibold">Definition</h2>
          {retiredNow ? <Notice tone="warn" title="Retired">It takes no change or new use. Restore it on Fields (choose the Retired filter) first.</Notice> : null}
          <div className="flex items-start gap-2"><Field label="Name" className="flex-1" hint="Rename shows what it touches first. It applies now as a draft version, or waits for a second person when a released combination uses the field; a name another field in this group already has is refused."><Input value={name} onChange={(e) => setName(e.target.value)} /></Field><Button className="mt-6" variant="secondary" onClick={() => setRenaming(true)} disabled={retiredNow || !name.trim() || name.trim() === shown}><Pencil /> Rename</Button></div>
          <LastRename kind="field" itemKey={key} invalidate={[...inv, ["field-sources", key]]} />
          {renaming ? <RenameDialog kind="field" itemKey={key} current={shown} initial={name.trim()} label="Name" invalidate={[...inv, ["field-sources", key]]} onClose={() => setRenaming(false)} /> : null}
          <Field label="Meaning" hint="What reviewers and the comparison rely on; one meaning per field."><Textarea value={meaning} onChange={(e) => setMeaning(e.target.value)} /></Field>
          {/* C3.15 (P-253): a change of meaning says why; the reason is kept with the change in the activity. */}
          {meaning.trim() !== cur.meaning ? <Field label="Why the meaning changes" hint="Say why in a sentence (at least 8 characters) to save; it is kept with the change in the activity." error={why.trim() && whyLength < 8 ? "At least 8 characters: say why in a sentence (invisible characters do not count)." : null}><Input value={why} onChange={(e) => setWhy(e.target.value)} maxLength={300} placeholder="For example: IMM 5707 asks for the date of the last entry, not the first" /></Field> : null}
          <Field label="Value type"><Select value={type} onChange={(e) => setType(e.target.value)}>{TYPES.map((t) => <option key={t} value={t}>{TYPE_WORD[t]}</option>)}</Select></Field>
          <div className="flex justify-end"><Button onClick={() => saveDef.mutate(undefined)} busy={saveDef.isPending} disabled={retiredNow || meaning === cur.meaning && type === cur.valueType || meaning.trim() !== cur.meaning && whyLength < 8}><Save /> Save as draft</Button></div>
          <p className="text-xs text-text-muted">Versions: {v.versions.map((x: any) => `v${x.version} ${x.status.toLowerCase()}${x.updatedBy ? ` (${nameOf(session.data?.actors, x.updatedBy)})` : ""}`).join(" · ")}</p>
        </section>
        <section className="space-y-3 rounded-xl border border-border bg-surface-raised p-5 shadow-sm">
          <h2 className="font-semibold">Where it is asked</h2>
          {!place ? <Notice tone="warn">Not placed: nobody is asked for this value yet, so form fields that read it stay unresolved in a case unless a supported document supplies it.</Notice> : null}
          {p ? <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Section"><Select value={p.sectionKey} onChange={(e) => setP({ ...p, sectionKey: e.target.value })}><option value="">Choose a section</option>{(sections.data ?? []).filter((x) => !x.retired || x.key === p.sectionKey).map((s) => <option key={s.key} value={s.key}>{s.title}</option>)}</Select></Field>
              <Field label="Collected from"><Select value={p.collectedFrom} onChange={(e) => setP({ ...p, collectedFrom: e.target.value })}>{COLLECTED.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
              <Field label="Repeats"><Select value={p.repeats} onChange={(e) => setP({ ...p, repeats: e.target.value })}><option value="once_per_case">Once per case</option><option value="per_person">For each person the forms need</option><option value="per_row">For each row (history, children)</option></Select></Field>
              <Field label="Question text" hint="Optional; the meaning is used when empty."><Input value={p.questionText} onChange={(e) => setP({ ...p, questionText: e.target.value })} /></Field>
            </div>
            <Field label="Condition on the question"><Select value={p.conditionEffect ?? ""} onChange={(e) => setP({ ...p, conditionEffect: e.target.value || null, condition: e.target.value ? p.condition : null })}><option value="">None: asked whenever a form needs it</option><option value="SHOW">Show only when…</option><option value="HIDE">Hide when…</option><option value="OPTIONAL">Optional when…</option></Select></Field>
            {p.conditionEffect ? <><ConditionBuilder value={p.condition} onChange={(c) => setP({ ...p, condition: c })} fields={fields.list} /><Field label="In plain words"><Input value={p.conditionPlain} onChange={(e) => setP({ ...p, conditionPlain: e.target.value })} /></Field></> : null}
            <div className="flex justify-end"><Button onClick={() => savePlace.mutate(undefined)} busy={savePlace.isPending} disabled={retiredNow || !p.sectionKey}><Save /> Save placement as draft</Button></div>
          </> : null}
        </section>
      </div>
      <section data-format-panel className="rounded-xl border border-border bg-surface-raised p-5 shadow-sm">
        <h2 className="font-semibold">Format</h2>
        <p className="mt-1 text-sm text-text-muted">Type: {TYPE_WORD[cur.valueType] ?? cur.valueType}. The format is read from the official forms that ask it (the PDF form field and the form's own checks, no AI) and the rules listed are checked on every answer; nobody types a rule here.</p>
        {(() => {
          const fmt = v.format as FieldFormatView | undefined;
          if (!fmt?.rules.length) return <Notice tone={fmt?.read || !v.used_by.length ? "info" : "warn"}>{!v.used_by.length ? "On no form, so no format is read." : fmt?.not_checked?.length ? "No rule is checked on answers here; what its forms say is listed below." : fmt?.read ? "Its forms set no format beyond the type." : "Format: not read yet (its forms have not been read)."}</Notice>;
          return <Table dense className="mt-2" head={["Rule", "From", "The form says"]}>{fmt.rules.map((r) => <tr key={`${r.check}|${r.part}`}><td className="text-sm">{r.part_words ? <span className="text-text-muted">{r.part_words}: </span> : null}{r.words}</td><td className="text-xs">{r.sources.slice(0, 3).map((x) => `${x.form}, "${x.box}" (${FROM_WORD[x.from] ?? x.from})`).join(" · ")}{r.sources.length > 3 ? ` · ${r.sources.length - 3} more` : ""}</td><td className="text-xs text-text-muted">{r.sources.find((x) => x.quote)?.quote ? `"${r.sources.find((x) => x.quote)!.quote}"` : "—"}</td></tr>)}</Table>;
        })()}
        {(v.format as FieldFormatView | undefined)?.not_checked?.length ? <p className="mt-2 text-xs text-text-muted">Read from the form, not checked on answers here: {(v.format as FieldFormatView).not_checked.map((n) => `${n.form}: ${n.quote ? `"${n.quote}"` : n.function} (${n.why})`).join(" · ")}</p> : null}
      </section>
      <section data-sources className="rounded-xl border border-border bg-surface-raised p-5 shadow-sm">
        <h2 className="font-semibold">Where it comes from</h2>
        {src.isLoading ? <Spinner label="Loading sources" /> : src.data?.unsourced ? <Notice tone="warn">No source recorded: this field was not read from a form field, a checklist line or a rule.</Notice> : <><ul className="mt-2 space-y-1 text-sm">{(src.data?.sources ?? []).slice(0, 30).map((l) => <li key={`${l.text}|${l.quote ?? ""}`}>{l.text}{l.quote ? <span className="text-xs text-text-muted"> · {l.kind === "release" ? l.quote : `"${l.quote}"`}</span> : null}</li>)}</ul>
          {/* UX-A part 4 review M1: the release's hash, the AI runs and a form field's data path are under Details. */}
          <AdminDetails className="mt-2" items={[["Source references", (src.data?.sources ?? []).some((l) => l.ref) ? <ul className="space-y-1">{(src.data?.sources ?? []).slice(0, 30).flatMap((l) => (l.ref ?? "").split("\n").filter(Boolean)).map((r) => <li key={r}>{r}</li>)}</ul> : null]]} /></>}
        <p className="mt-3 text-sm"><span className="text-text-muted">Used in combinations:</span> {src.data?.used_in?.length ? src.data.used_in.join(", ") : "none"}</p>
      </section>
      <section className="rounded-xl border border-border bg-surface-raised p-5 shadow-sm">
        <h2 className="font-semibold">Form fields that read it, and whose value each form field needs</h2>
        {!v.used_by.length ? <p className="mt-2 text-sm text-text-muted">No form field reads this field.</p> : v.used_by.map((u: any) => (
          <div key={u.edition} className="mt-3"><p className="text-sm font-medium">{u.edition} · {u.boxes.length} form field{u.boxes.length > 1 ? "s" : ""}</p>
            <Table dense className="mt-1" head={["Form field", "Whose value", "Row", "Transformation", "Status"]}>{u.boxes.slice(0, 50).map((b: any) => <tr key={b.data_path}><td className="max-w-md text-xs">{b.caption || <><span className="text-text-muted">A form field with no label on the form</span><AdminDetails items={[["Form field path", b.data_path]]} /></>}</td><td className="text-xs">{PERSON[b.person] ?? b.person}</td><td className="text-xs">{b.row === null ? "—" : b.row + 1}</td><td className="mono text-xs">{b.transform}</td><td><OriginPill origin={b.origin} status={b.status} /></td></tr>)}</Table>
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
  const reuse = useReuse("sections");
  const shown = (s.data ?? []).filter((x) => reuse.keep(x.key));
  const [editing, setEditing] = React.useState<{ key: string; title: string } | null>(null);
  // C11.9: delete, retire and restore through the one guard; a retired section is listed only under "Retired".
  const canAuthor = useCanAuthor();
  const life = useItemLifecycle("sections", () => s.refetch(), canAuthor);
  const [retired, setRetired] = React.useState(false);
  const shownRows = shown.filter((x) => !!x.retired === retired);
  return (
    <TipProvider><div className="mx-auto max-w-6xl space-y-4">
      <div><h1 className="text-xl font-semibold">Sections</h1><p className="mt-1 text-sm text-text-muted">Reusable groups of questions. Each combination selects the sections its questionnaire uses.</p><Origin>the forms' own parts, each confirmed on To review. Nothing is added by hand; a combination picks its sections on its Smart questionnaire (SQR) tab.</Origin></div>
      <div className="flex flex-wrap items-center gap-2"><ReuseBar reuse={reuse} noun="section" /><Select className="w-56" value={retired ? "retired" : "current"} onChange={(e) => setRetired(e.target.value === "retired")} aria-label="Filter"><option value="current">Current sections</option><option value="retired">Retired</option></Select><span className="text-xs text-text-muted">{shownRows.length} of {s.data?.length ?? 0}</span></div>
      {s.isLoading || reuse.waiting ? <Spinner label="Loading" /> : !s.data?.length ? <EmptyState title="No sections yet" description="Sections come with the forms' parts; add a form first." /> : !shown.length ? <NoneInCombination reuse={reuse} noun="section" /> : !shownRows.length ? <p className="text-sm text-text-muted">{retired ? "No section is retired." : "Every section is retired: choose Retired to see them."}</p> : <Table head={["Section", "Meaning", "Questions", "Used by combinations", "Status"]}>{shownRows.map((x) => <tr key={x.key} data-item={x.key}><td className="font-medium">{x.title}</td><td className="max-w-lg text-xs text-text-muted">{x.meaning}<SourceNote r={x} /></td><td>{x.questions}</td><td className="text-xs">{usedWords(x.used_in)}</td><td><div className="flex flex-wrap gap-1"><ReuseMark reuse={reuse} k={x.key} />{x.retired ? <Pill>Retired</Pill> : <ListPill origin={x.origin} status={x.status} />}</div><ItemStatusNote r={x} /><div className="mt-1.5">{life.action({ ...x, name: x.title }, () => (x.retired ? life.view({ ...x, name: x.title }) : setEditing({ key: x.key, title: x.title })))}</div></td></tr>)}</Table>}
      {editing ? <RenameSection section={editing} onClose={() => setEditing(null)} /> : null}
      {life.node}
    </div></TipProvider>
  );
}

function RenameSection({ section, onClose }: { section: { key: string; title: string }; onClose: () => void }) {
  return <RenameDialog kind="section" itemKey={section.key} current={section.title} initial={section.title} label="Title" invalidate={[["sections"]]} onClose={onClose} withUndo />;
}

type RenameAnswer = { applied: boolean; name: string; version: number | null; words: string; change_set: string; change_id: string | null };
/** G-CORE B2 (BR-1, BR-3, BR-4): a rename through the change-set door. The new name, "What this change touches" for it, and
 *  a confirm that sends the panel's fingerprint as `expected`; the tier says whether it applies now or waits. */
function RenameDialog({ kind, itemKey, current, initial, label, invalidate, onClose, withUndo }: { kind: "field" | "section"; itemKey: string; current: string; initial: string; label: string; invalidate: unknown[][]; onClose: () => void; withUndo?: boolean }) {
  const [name, setName] = React.useState(initial);
  const [typed, setTyped] = React.useState(initial.trim());
  React.useEffect(() => { const t = setTimeout(() => setTyped(name.trim()), 300); return () => clearTimeout(t); }, [name]);
  const ready = typed.length > 0 && typed !== current;
  const check = useChangeCheck([{ action: "rename", kind, key: itemKey, name: typed }], ready);
  const [stale, setStale] = React.useState(false);
  const path = kind === "field" ? `/library/fields/${encodeURIComponent(itemKey)}/name` : `/library/sections/${encodeURIComponent(itemKey)}`;
  const save = useAction(() => api<RenameAnswer>(path, { method: "PATCH", json: { name: typed, expected: check.data?.fingerprint } }), {
    success: (r) => (r.applied ? (kind === "field" ? "Renamed (a new draft version)" : "Section renamed (a new draft version)") : `"${current}" stays as it is until a second person approves the new name on To review`),
    invalidate: [...invalidate, ["last-rename", kind, itemKey], ["review"]], onDone: onClose });
  React.useEffect(() => { if (save.error instanceof ApiError && save.error.problem.title === "Look again") { setStale(true); void check.refetch(); } }, [save.error]);
  const second = check.data?.tier.tier === "second_person";
  const busy = name.trim() !== typed || check.isFetching;
  return (
    <Dialog open wide onOpenChange={(o) => !o && onClose()} title={`Rename "${current}"`} description="See what the change touches, then confirm. A name already used is refused."
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => { setStale(false); save.mutate(undefined); }} busy={save.isPending} disabled={!ready || busy || !check.data?.ok}>{second ? "Send for approval" : "Rename"}</Button></>}>
      <div className="space-y-3">
        <Field label={label}><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
        {ready ? <ChangePreview check={check} stale={stale} /> : <p className="text-sm text-text-muted">Type the new {kind === "field" ? "name" : "title"} to see what it touches.</p>}
        {withUndo ? <LastRename kind={kind} itemKey={itemKey} invalidate={invalidate} /> : null}
      </div>
    </Dialog>
  );
}

/** BR-6: the item's newest rename, and "Undo rename" (a new change through the same door; refused in words when the
 *  old name was taken since or the item changed again). */
function LastRename({ kind, itemKey, invalidate }: { kind: "field" | "section"; itemKey: string; invalidate: unknown[][] }) {
  const last = useApi<{ id: string; status: string; before: string | null; after: string; by: string; at: string; made_by: string } | null>(["last-rename", kind, itemKey], `/change-sets/renames/${kind}/${encodeURIComponent(itemKey)}`);
  const undo = useAction(() => api<RenameAnswer>(`/change-sets/${last.data!.id}/undo-rename`, { method: "POST", json: {} }), {
    success: (r) => (r.applied ? `Rename undone: "${r.name}" again (a new draft version)` : "The undo waits for a second person on To review"), invalidate: [...invalidate, ["last-rename", kind, itemKey], ["review"]] });
  const x = last.data;
  if (!x) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted" data-last-rename={x.status}>
      {x.status === "waiting" ? <span>Renaming to "{x.after}" waits for a second person on To review ({x.by}).</span>
        : <><span>Last renamed from "{x.before}" to "{x.after}" by {x.by}.</span><Button size="sm" variant="secondary" onClick={() => undo.mutate(undefined)} busy={undo.isPending}><Undo2 /> Undo rename</Button></>}
    </div>
  );
}

export function DocumentTypesPage() {
  const t = useApi<any[]>(["doc-types"], "/library/document-types");
  const reuse = useReuse("document-types");
  const shown = (t.data ?? []).filter((x) => reuse.keep(x.documentTypeKey));
  const canAuthor = useCanAuthor();
  const life = useItemLifecycle("document-types", () => t.refetch(), canAuthor);
  const [retired, setRetired] = React.useState(false);
  // C11.9 (BR-10): a retired document type is listed only under "Retired".
  const rows = shown.filter((x) => !!x.retired === retired);
  return (
    <TipProvider><div className="mx-auto max-w-6xl space-y-4">
      <div><h1 className="text-xl font-semibold">Document types</h1><p className="mt-1 text-sm text-text-muted">Reusable document definitions. The facts a supported document can supply are a proposal until reading that document proves them on a case.</p><Origin>the document checklist lines of each combination (its official checklist, quoted), applied on the combination's Documents tab. Nothing is added by hand.</Origin></div>
      <div className="flex flex-wrap items-center gap-2"><ReuseBar reuse={reuse} noun="document type" /><Select className="w-56" value={retired ? "retired" : "current"} onChange={(e) => setRetired(e.target.value === "retired")} aria-label="Filter"><option value="current">Current document types</option><option value="retired">Retired</option></Select><span className="text-xs text-text-muted">{rows.length} of {t.data?.length ?? 0}</span></div>
      {t.isLoading || reuse.waiting ? <Spinner label="Loading" /> : !t.data?.length ? <EmptyState title="No document types yet" /> : !shown.length ? <NoneInCombination reuse={reuse} noun="document type" /> : !rows.length ? <p className="text-sm text-text-muted" data-none-retired>{retired ? "No document type is retired." : "Every document type is retired: choose Retired to see them."}</p> : <Table head={["Document type", "Category", "Facts it can supply", "Used by combinations", "Status"]}>{rows.map((x) => <tr key={x.documentTypeKey} data-item={x.documentTypeKey}><td className="max-w-md font-medium">{x.name}<SourceNote r={x} /></td><td className="text-xs">{CATEGORY_WORD[x.category] ?? x.category}</td><td className="max-w-lg text-xs">{x.suppliesFacts?.length ? x.suppliesFacts.map(fieldName).join(", ") : <span className="text-text-muted">none recorded</span>}</td><td className="text-xs">{usedWords(x.used_in)}</td><td><div className="flex flex-wrap gap-1"><ReuseMark reuse={reuse} k={x.documentTypeKey} />{x.retired ? <Pill>Retired</Pill> : <ListPill origin={x.origin} status={x.status} />}</div><ItemStatusNote r={x} /><div className="mt-1.5">{life.action({ ...x, key: x.documentTypeKey }, () => life.view({ ...x, key: x.documentTypeKey }))}</div></td></tr>)}</Table>}
      {life.node}
    </div></TipProvider>
  );
}
