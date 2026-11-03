// W1-15 Questions and documents, slice 2 (runtime lane; P-130–P-132, board v2 agreed P-147): the Questionnaires tab's
// strip (every fact has one source), the source chips and "Needs you", rows of five things (Question · Comes from ·
// Pre-qualification · Only if · Status) with a ⋯ menu whose greyed actions keep their reason as visible text, the side
// drawer with every parameter, and the bulk bar on ticked rows (Set where it comes from, Pre-qualification on or off;
// one Undo per bulk change). The rules work out each source (engine/sources.ts); a person's change is an override for
// this combination, reviewed at its release. Accept and Reject of AI proposals come with slice 5.
import * as React from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Lock, MoreHorizontal, TriangleAlert } from "lucide-react";
import type { AnswerSource, BulkSourceResult, FactSourceRow, FactSourcesView, QuestionnaireQuestion } from "../../../../contracts/workspace";
import { api, ApiError, useActorId } from "@/lib/api";
import { Button, Notice, Panel, Pill, Select, Textarea } from "@/components/ui/controls";
import { Tip } from "@/components/status";
import { useUndoToast } from "@/components/lifecycle";
import { cn } from "@/lib/utils";
import { factName } from "../../../../engine/fact-name";

/** P-154: the words people read ("Agent" is retired as a role word); AGENT stays the internal name. */
export const SOURCE_LABEL: Record<AnswerSource, string> = { DOCUMENT: "Document", CLIENT: "Client", AGENT: "Case officer" };
const TYPE_WORDS: Record<string, string> = { text: "Text", date: "A date", yes_no: "Yes or no", number: "A number", code: "A choice from a list", country: "A country", address: "An address", phone: "A phone number", email: "An email address" };
/** The words the screen shows for each lock (board v2 frame 7), the same the API answers with. */
export const SAY = {
  clientOnly: "Declarations are always answered by the client.",
  /** P-155(3): the case officer on a fact that is not theirs needs a written reason (the API's words). */
  officerNeedsReason: "The case officer enters only the representative's, the office's and the case's own details. To have the case officer enter this answer, write why; a second person reviews it at release.",
  clientNotPlaced: "No question asks it, so the client cannot give it. Add the question first.",
  pqAgent: "Not offered: the case officer enters it.",
  pqNoQuestion: "The prospect needs a question to answer. Add a fallback question first.",
  // C4.1 (P-216): inside a section the library sets the questions' order; the sections move on this tab.
  order: (section: string) => `Questions keep the library's order inside ${section}. To move the whole section, use Move up or Move down on its header.`,
  retire: "A question line is not retired here. Retire the question in the library.",
  library: "Wording, answer and options are shared by every combination that asks it; a second person approves.",
  atDefault: "Already as the rules say.",
  readOnly: "Read only: you do not hold the author duty.",
};
const sourceText = (f: Pick<FactSourceRow, "source" | "document">) => (f.source === "DOCUMENT" ? `Document · ${f.document?.name ?? "a document"}` : SOURCE_LABEL[f.source]);
const atDefault = (f: FactSourceRow) => f.source === f.ruleSource && (f.source !== "DOCUMENT" || f.document?.key === f.ruleDocument?.key);

export function useFactSources(id: string) {
  return useQuery<FactSourcesView, ApiError>({ queryKey: ["fact-sources", id], queryFn: () => api<FactSourcesView>(`/combinations/${id}/fact-sources`) });
}
export function useRefreshSources(id: string) {
  const qc = useQueryClient();
  return () => { for (const k of [["fact-sources", id], ["pqr-country", id], ["combination", id], ["combination-summary", id], ["config", id], ["draft"], ["preview"]]) void qc.invalidateQueries({ queryKey: k }); };
}

/** The strip (C4.10, P-130): the full form = from documents + client answers + case officer enters, with pre-qualification
 *  and whether every fact has one source. */
export function SourceStrip({ v }: { v: FactSourcesView | undefined }) {
  if (!v) return <div className="h-16 animate-pulse rounded-xl border border-border bg-surface" aria-hidden />;
  const errors = v.problems.filter((p) => p.level === "error");
  const Part = ({ n, label, tip }: { n: number; label: string; tip: string }) => (
    <Tip tip={tip} focusable><span className="flex cursor-help flex-col rounded-lg bg-surface px-3 py-1.5"><span className="text-lg font-semibold leading-6">{n}</span><span className="text-xs text-text-muted">{label}</span></span></Tip>
  );
  return (
    <section aria-label="Where every answer comes from" className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface-raised p-3" data-source-strip>
      <Part n={v.counts.facts} label="Form facts, all people" tip="Every answer the combination's forms need, one per person role the combination allows (the application's own facts once). The line under the person chips and the Draft questions and documents dialog count the same facts." />
      <span aria-hidden className="text-text-muted">=</span>
      <Part n={v.counts.document} label="From documents" tip="Read from a document on that person's checklist; the client is asked only if it cannot be read." />
      <span aria-hidden className="text-text-muted">+</span>
      <Part n={v.counts.client} label="Client answers" tip="Asked in the client questionnaire." />
      <span aria-hidden className="text-text-muted">+</span>
      <Part n={v.counts.agent} label="Case officer enters" tip="The representative's, the office's and the case's own facts." />
      <span className="mx-1 h-8 w-px bg-border" aria-hidden />
      <Part n={v.counts.prequalification} label="Prospect questionnaire (PQR)" tip="Asked of a prospect before the case starts; the answer is later confirmed." />
      <span className="ml-auto text-sm" data-strip-state>{errors.length ? <span className="font-medium text-text-danger">{errors.length} release check{errors.length === 1 ? "" : "s"} to fix</span> : <span className="text-text-ok">✓ Every fact has one source</span>}</span>
      <p className="w-full text-xs text-text-muted">{v.basis}.</p>
    </section>
  );
}

export type Filter = "all" | AnswerSource | "needs" | "pqr";
/** Source chips and "Needs you" for one person role (EXPERIENCE §0). */
export function SourceChips({ rows, needs, value, onChange }: { rows: FactSourceRow[]; needs: number; value: Filter; onChange: (f: Filter) => void }) {
  const n = (s: AnswerSource) => rows.filter((r) => r.source === s).length;
  const chip = (f: Filter, label: string) => (
    <button key={f} type="button" aria-pressed={value === f} data-source-chip={f} onClick={() => onChange(value === f && f !== "all" ? "all" : f)}
      className={cn("min-h-8 rounded-full border px-3 py-0.5 text-sm", value === f ? "border-primary bg-primary/10 font-medium text-text-link" : "border-border bg-surface-raised text-text-muted hover:bg-text/5", f === "needs" && needs ? "text-text-danger" : "")}>{label}</button>
  );
  return (
    <div role="group" aria-label="Where it comes from" className="flex flex-wrap gap-1.5">
      {chip("all", "All sources")}{chip("DOCUMENT", `Document ${n("DOCUMENT")}`)}{chip("CLIENT", `Client ${n("CLIENT")}`)}{chip("AGENT", `Case officer ${n("AGENT")}`)}{chip("pqr", `Prospect questionnaire (PQR) ${rows.filter((r) => r.prequalification).length}`)}{chip("needs", `Needs you · ${needs}`)}
    </div>
  );
}

/** Status pill: a release check first, then a change made here (draft or released), else the rules. */
export function RowStatus({ f, check }: { f: FactSourceRow | undefined; check: string | undefined }) {
  if (check) return <span data-row-status="check"><Pill tone="danger" title={check}>Release check</Pill></span>;
  if (!f || !f.change) return <span data-row-status="rules"><Pill title="As the rules work it out; nothing changed here.">Rules</Pill></span>;
  return f.change.status === "DRAFT" ? <span data-row-status="draft"><Pill tone="info" title="Changed for this combination; goes out with its next release.">Changed here</Pill></span> : <span data-row-status="released"><Pill tone="ok" title="Changed for this combination and released.">Released</Pill></span>;
}

/** "Comes from" in the row: the source, the lock on a declaration, and a missing fallback. */
export function ComesFrom({ f, fallbackless }: { f: FactSourceRow | undefined; fallbackless?: boolean }) {
  if (!f) return <span className="text-xs text-text-muted">Client · decides what applies</span>;
  return (
    <span className="flex flex-col gap-0.5" data-comes-from={f.source}>
      <span className="inline-flex items-center gap-1">{f.clientOnly ? <Lock className="size-3.5 text-text-muted" aria-label="Always the client" /> : null}{sourceText(f)}{f.proposedBy === "Person" ? <span className="sr-only"> (changed here)</span> : null}</span>
      {/* QA-114: the row shows the next release's source; an approved library change says it is still coming. */}
      {f.fills.change?.status === "APPROVED" ? <span className="text-xs text-text-muted" data-fills-coming>From the next release: filled by {FILLS_WORD[f.fills.change.to]} (library change approved)</span> : null}
      {fallbackless ? <span className="inline-flex items-center gap-1 text-xs text-text-warn"><TriangleAlert className="size-3.5" aria-hidden /> No fallback question</span> : null}
      {f.sourceReason ? <span className="text-xs text-text-muted" data-source-reason>Why: {f.sourceReason}</span> : null}
    </span>
  );
}

export function PreQual({ f }: { f: FactSourceRow | undefined }) {
  if (!f) return <span className="text-xs text-text-muted">—</span>;
  if (f.prequalification) return <Pill tone="info" title={f.reason ?? undefined}>Ask</Pill>;
  return <span className="text-xs text-text-muted">{f.source === "AGENT" ? "Not offered" : "—"}</span>;
}

type MenuItem = { label: string; why?: string | null; onSelect?: () => void; href?: string };
/** The row's ⋯ menu (P-147 Q1): every action, a greyed one with its reason written under it. */
export function RowMenu({ name, items }: { name: string; items: MenuItem[] }) {
  const item = "flex cursor-pointer flex-col gap-0.5 rounded-md px-2 py-1.5 outline-none data-[highlighted]:bg-text/5 data-[disabled]:cursor-default";
  return (
    // Not modal: a modal menu hides the rest of the page from screen readers while focusable items stay in it.
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild><Button size="sm" variant="ghost" aria-label={`Actions for ${name}`} data-row-menu><MoreHorizontal /></Button></DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={4} className="z-50 w-[300px] rounded-lg border border-border bg-surface-raised p-1 text-sm shadow-lg" data-row-menu-items>
          {items.map((x) => x.href && !x.why ? (
            <DropdownMenu.Item key={x.label} asChild className={item}><Link to={x.href}>{x.label}</Link></DropdownMenu.Item>
          ) : (
            <DropdownMenu.Item key={x.label} className={item} disabled={!!x.why} onSelect={() => x.onSelect?.()} data-menu-item={x.label}>
              <span className={x.why ? "text-text-muted/70" : ""}>{x.label}</span>
              {x.why ? <span className="text-xs text-text-muted" data-menu-why>{x.why}</span> : null}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/** Each document that can supply it for this person: the rules' choice first, then the others ("also supplied by"). */
const documentsOf = (f: FactSourceRow) => [f.ruleDocument, ...f.also].filter((x, i, a): x is NonNullable<typeof x> => !!x && a.findIndex((y) => y?.key === x.key) === i);

/** The side drawer: every parameter of one question line (board v2 frame 1). Saving changes where the answer comes
 *  from and the pre-qualification tick for this combination; the rest is the library's and says where to change it. */
export function FactDrawer({ id, role, roleLabel, section, q, f, canAuthor, onClose, onSaved }: {
  id: string; role: string; roleLabel: string; section: string | null; q: QuestionnaireQuestion | null; f: FactSourceRow | undefined; canAuthor: boolean;
  onClose: () => void; onSaved: (text: string, undo?: () => Promise<void>) => void;
}) {
  const me = useActorId();
  const refresh = useRefreshSources(id);
  const docs = f ? documentsOf(f) : [];
  const start = f ? (f.source === "DOCUMENT" ? `DOCUMENT:${f.document?.key ?? ""}` : f.source) : "CLIENT";
  const [choice, setChoice] = React.useState(start);
  const [tick, setTick] = React.useState(f?.prequalification ?? false);
  const [reason, setReason] = React.useState(f?.reason ?? "");
  const [officerWhy, setOfficerWhy] = React.useState(f?.sourceReason ?? "");
  const [error, setError] = React.useState<{ field: string; message: string } | null>(null);
  const [stale, setStale] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  // QA-172 (review m2): a fact answered without a question is titled by its short name, as its row is (QA-82); its
  // meaning shows below as "Meaning:", as a placed question's does.
  const title = q?.wording ?? (f ? factName(f.fact) : "Question");
  const meaning = q?.meaning ?? f?.label ?? null;
  const editable = canAuthor && !!f;
  // P-155(3): the case officer on a fact that is not theirs needs a written reason (required; reviewed at release).
  const needsWhy = !!f && choice === "AGENT" && !f.agentOffered;
  const changed = !!f && (choice !== start || tick !== f.prequalification || (tick && reason.trim() !== (f.reason ?? "")) || (needsWhy && officerWhy.trim() !== (f.sourceReason ?? "")));
  const why = (s: string): string | null => {
    if (!f) return null;
    const src = s.split(":")[0] as AnswerSource;
    if (f.clientOnly && src !== "CLIENT") return SAY.clientOnly;
    if (src === "CLIENT" && !f.placed) return SAY.clientNotPlaced;
    return null;
  };
  const pqWhy = !f ? null : (choice.startsWith("AGENT") ? SAY.pqAgent : !f.placed ? SAY.pqNoQuestion : null);
  const save = async () => {
    if (!f) return;
    setBusy(true); setError(null);
    const [src, doc] = choice.split(":");
    const wasDraft = f.change?.status === "DRAFT";
    try {
      await api(`/combinations/${id}/fact-sources/${encodeURIComponent(role)}/${encodeURIComponent(f.fact)}`, { method: "PUT", json: { source: src, documentTypeKey: src === "DOCUMENT" ? doc : null, sourceReason: needsWhy ? officerWhy.trim() || null : null, prequalification: tick, reason: tick ? reason.trim() || null : f.reason, version: f.version } });
      refresh();
      // One Undo (P-116 amended): only when there was no draft before, so Undo returns exactly to what was shown.
      onSaved(`"${title}" saved for this combination`, wasDraft ? undefined : async () => { await api(`/combinations/${id}/fact-sources/${encodeURIComponent(role)}/${encodeURIComponent(f.fact)}`, { method: "DELETE", json: { version: f.version + 1 } }); refresh(); });
      onClose();
    } catch (e) {
      const err = e as ApiError;
      if (err.status === 409) setStale(err.message);
      else { const x = err.problem?.errors?.[0]; setError(x ? { field: x.field, message: x.message } : { field: "source", message: err.message }); }
    } finally { setBusy(false); }
  };
  const status = !f ? "Asked of the client; no form needs it, it decides what applies." : f.change ? `${f.change.status === "DRAFT" ? "Changed here, in this draft" : "Changed here, released"} · by ${f.change.by === me ? "you" : f.change.by} · ${new Date(f.change.at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : "As the rules work it out; nothing changed here.";
  return (
    <Panel open onOpenChange={(o) => !o && onClose()} title={title} description={`${roleLabel}${section ? ` · ${section}` : ""}`} badge={<RowStatus f={f} check={undefined} />}
      footer={editable ? <><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => void save()} busy={busy} disabled={!changed} data-drawer-save>Save</Button></> : <><span className="text-xs text-text-muted">{canAuthor ? "" : SAY.readOnly}</span><Button variant="ghost" onClick={onClose}>Close</Button></>}>
      <div className="space-y-4 text-sm" data-fact-drawer>
        {/* QA-82: the field's meaning (its definition) lives here, not in the Question column. */}
        {meaning ? <p className="text-text-muted" data-fact-meaning><span className="font-medium text-text">Meaning: </span>{meaning}</p> : null}
        {stale ? <Notice tone="warn" title="Changed by someone else" action={<Button size="sm" variant="secondary" onClick={() => { refresh(); onClose(); }}>Reload their version</Button>}>{stale}</Notice> : null}
        {f ? (
          <section aria-labelledby="d-source" className="space-y-2">
            <h3 id="d-source" className="font-semibold">Where the answer comes from</h3>
            <fieldset className="space-y-1.5" disabled={!editable}>
              <legend className="sr-only">Where the answer comes from</legend>
              {[...docs.map((d) => ({ value: `DOCUMENT:${d.key}`, label: `Document · ${d.name}`, hint: d.key === f.ruleDocument?.key ? `Default by the rules: it is on ${roleLabel}'s checklist and supplies it.` : "Also supplied by it." })),
                // QA-112: said once, in the option's reason; the case has no checklist of its own.
                ...(docs.length ? [] : [{ value: "DOCUMENT:", label: "Document", hint: "" }]),
                { value: "CLIENT", label: "Client", hint: f.placed ? "Asked in the client questionnaire." : "" },
                { value: "AGENT", label: "Case officer", hint: f.agentOffered ? "The case officer enters it." : f.clientOnly ? "" : "Not one of the case officer's own details: only with a written reason, reviewed at release." }].map((o) => {
                const off = o.value === "DOCUMENT:" ? (role === "case" ? "The case has no documents of its own: the client or the case officer answers it." : `No document on ${roleLabel}'s checklist supplies it. Add one on Documents.`) : why(o.value);
                return (
                  <label key={o.value} className={cn("flex gap-2 rounded-lg border p-2", choice === o.value ? "border-primary bg-primary/5" : "border-border", off ? "text-text-muted" : "")} data-source-option={o.value}>
                    <input type="radio" name="fact-source" className="mt-1" checked={choice === o.value} disabled={!!off} onChange={() => setChoice(o.value)} aria-describedby={off ? `why-${o.value}` : undefined} />
                    <span><span className="font-medium">{o.label}</span>{o.hint ? <span className="block text-xs text-text-muted">{o.hint}</span> : null}{off ? <span id={`why-${o.value}`} className="block text-xs text-text-muted" data-option-why>{off}</span> : null}</span>
                  </label>
                );
              })}
            </fieldset>
            {needsWhy ? (
              <label className="block text-xs font-medium" data-officer-why>Why the case officer enters it <span className="font-normal text-text-muted">(required; shown on the row and to the second person at release)</span>
                <Textarea className="mt-1 min-h-14" value={officerWhy} disabled={!editable} onChange={(e) => setOfficerWhy(e.target.value)} aria-invalid={error?.field === "sourceReason" ? true : undefined} aria-describedby={error?.field === "sourceReason" ? "officer-why-error" : undefined} data-officer-why-box />
              </label>
            ) : null}
            {error?.field === "source" || error?.field === "documentTypeKey" || error?.field === "sourceReason" ? <p role="alert" id={error.field === "sourceReason" ? "officer-why-error" : undefined} className="text-text-danger" data-drawer-error>{error.message}</p> : null}
            {/* QA-112: a fallback is only for a document that can supply it; with none, there is nothing to fall back from. */}
            {docs.length ? <p className="text-xs" data-fallback>{f.placed ? <span className="text-text-ok">✓ Fallback question reachable{section ? ` in ${section}` : ""}: the client is asked if the document is missing or cannot be read.</span> : <span className="text-text-warn">No fallback question: if the document is missing or cannot be read, nobody is asked.</span>}</p> : null}
            {f.also.length ? <p className="text-xs text-text-muted" data-also>Also supplied by: {f.also.map((x) => x.name).join(", ")} (information only).</p> : null}
            <p className="rounded-lg bg-surface p-2 text-xs text-text-muted">Changing it here is an override for this combination only, reviewed in this combination's release. The library default stays.</p>
          </section>
        ) : null}
        {f ? (
          <section aria-labelledby="d-pq" className="space-y-2">
            <h3 id="d-pq" className="font-semibold">Prospect questionnaire (PQR)</h3>
            <label className={cn("flex items-start gap-2", pqWhy ? "text-text-muted" : "")}>
              <input type="checkbox" className="mt-1" checked={tick} disabled={!editable || !!pqWhy} onChange={(e) => setTick(e.target.checked)} aria-describedby={pqWhy ? "pq-why" : undefined} data-pq-tick />
              <span>Ask in the Prospect questionnaire (PQR){pqWhy ? <span id="pq-why" className="block text-xs" data-option-why>{pqWhy}</span> : null}</span>
            </label>
            {tick && !pqWhy ? <label className="block text-xs font-medium">Why <span className="font-normal text-text-muted">(shown to the second person)</span><Textarea className="mt-1 min-h-14" value={reason} disabled={!editable} onChange={(e) => setReason(e.target.value)} /></label> : null}
            {error?.field === "prequalification" ? <p role="alert" className="text-text-danger" data-drawer-error>{error.message}</p> : null}
            <p className="text-xs text-text-muted">The prospect's answer is their own. The client questionnaire shows it as "please confirm"; a document read later is compared with it, and a difference is a check, not an overwrite.</p>
          </section>
        ) : null}
        {f ? <WhoFills f={f} canAuthor={canAuthor} refresh={refresh} /> : null}
        <dl className="grid grid-cols-[9rem_1fr] gap-x-3 gap-y-2" data-question-details>
          <dt className="text-text-muted">When it is asked</dt><dd>{q?.onlyIf ?? "Always"}{q ? (q.required ? " · required" : " · optional") : ""}</dd>
          {q ? <><dt className="text-text-muted">Kind of answer</dt><dd>{TYPE_WORDS[q.answerType] ?? q.answerType} · from the library</dd></> : null}
          <dt className="text-text-muted">Where it sits</dt><dd>{section ? `${section} · order set in the library section` : "Not in a section: no question asks it"}</dd>
          <dt className="text-text-muted">Used by</dt><dd>{(f?.forms ?? q?.neededBy ?? []).join(", ") || "No form: it decides what applies"}</dd>
          {q ? <><dt className="text-text-muted">Used in</dt><dd>{q.whereUsed} combination{q.whereUsed === 1 ? "" : "s"}</dd></> : null}
          <dt className="text-text-muted">Status and history</dt><dd data-drawer-status>{status}</dd>
          {/* QA-94: the system name stays behind the library link, never on screen. */}
          <dt className="text-text-muted">In the library</dt><dd><Link className="text-text-link underline" to={`/library/fields/${encodeURIComponent(q?.fact ?? f?.fact ?? "")}`} data-library-link>Open this answer in the shared library</Link><p className="text-xs text-text-muted">{SAY.library}</p></dd>
        </dl>
      </div>
    </Panel>
  );
}

const FILLS_WORD = { CLIENT: "the client", CASE_OFFICER: "the case officer" } as const;
/** C4.9 (P-97): who fills the question for every combination, the shared library's default. Changed only as a library
 *  change: proposed here with a reason, approved on To review by a second person, out with the next release. */
function WhoFills({ f, canAuthor, refresh }: { f: FactSourceRow; canAuthor: boolean; refresh: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [why, setWhy] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const lib = f.fills.library, ch = f.fills.change;
  const to = lib === "CLIENT" ? "CASE_OFFICER" : "CLIENT";
  const send = async () => {
    setBusy(true); setError(null);
    try { await api(`/library/fields/${encodeURIComponent(f.fact)}/fills`, { method: "POST", json: { to, reason: why.trim() } }); setOpen(false); setWhy(""); refresh(); }
    catch (e) { setError((e as ApiError).message); }
    finally { setBusy(false); }
  };
  return (
    <section aria-labelledby="d-fills" className="space-y-2" data-who-fills>
      <h3 id="d-fills" className="font-semibold">Who fills it, for every combination</h3>
      {f.clientOnly ? <p className="flex items-center gap-1 text-xs text-text-muted" data-fills-locked><Lock className="size-3.5" aria-hidden /> {SAY.clientOnly} Who fills it does not change.</p>
        : !lib ? <p className="text-xs text-text-muted" data-fills-none>In the shared library it is not a question the client or the case officer fills; choose where it comes from for this combination above.</p>
        : <p data-fills-library>In the shared library: filled by {FILLS_WORD[lib]}.</p>}
      {ch ? (
        <p className="rounded-lg bg-surface p-2 text-xs" data-fills-change={ch.status}>
          {ch.status === "WAITING" ? <>Waiting for a second person on <Link className="text-text-link underline" to="/review">To review</Link>: {FILLS_WORD[ch.to]} fills it for every combination.</>
            : ch.status === "RETURNED" ? <>Returned on <Link className="text-text-link underline" to="/review">To review</Link>: correct or withdraw it there.</>
            : <>Approved: {FILLS_WORD[ch.to]} fills it for every combination from the next release.</>}
          {" "}Proposed by {ch.by}. Why: {ch.reason}
        </p>
      ) : lib && !f.clientOnly && canAuthor ? (open ? (
        <div className="space-y-2 rounded-lg border border-border p-2" data-fills-form>
          <p className="text-xs">Change to <span className="font-medium">{FILLS_WORD[to]}</span> for every combination that asks it. A second person approves it on To review; it goes out with the next release. This combination's own choice above stays.</p>
          <label className="block text-xs font-medium">Why <span className="font-normal text-text-muted">(required; shown to the second person)</span>
            <Textarea className="mt-1 min-h-14" value={why} onChange={(e) => setWhy(e.target.value)} aria-invalid={error ? true : undefined} aria-describedby={error ? "fills-error" : undefined} data-fills-why />
          </label>
          {error ? <p role="alert" id="fills-error" className="text-xs text-text-danger" data-fills-error>{error}</p> : null}
          <span className="flex gap-2"><Button size="sm" onClick={() => void send()} busy={busy} data-fills-send>Send to To review</Button><Button size="sm" variant="ghost" onClick={() => { setOpen(false); setError(null); }}>Cancel</Button></span>
        </div>
      ) : <Button size="sm" variant="secondary" onClick={() => setOpen(true)} data-fills-open>Change who fills…</Button>) : null}
    </section>
  );
}

/** The bulk bar (P-147 Q2), only while rows are ticked: Set where it comes from, Pre-qualification on or off. Each row is
 *  re-checked by the server; refused rows are listed in words; one Undo takes the bulk change back. */
export function BulkBar({ id, picked, onClear, onDone }: { id: string; picked: FactSourceRow[]; onClear: () => void; onDone: (r: BulkSourceResult, undo?: () => Promise<void>) => void }) {
  const refresh = useRefreshSources(id);
  const [busy, setBusy] = React.useState(false);
  const run = async (b: { source?: AnswerSource | "RULES"; prequalification?: boolean }) => {
    setBusy(true);
    try {
      const r = await api<BulkSourceResult>(`/combinations/${id}/fact-sources/bulk`, { method: "POST", json: { items: picked.map((f) => ({ role: f.role, fact: f.fact, version: f.version })), ...b } });
      refresh();
      onDone(r, r.batchId ? async () => { await api(`/combinations/${id}/fact-sources/bulk/undo`, { method: "POST", json: { batchId: r.batchId } }); refresh(); } : undefined);
    } catch (e) { onDone({ saved: 0, batchId: null, what: "", refused: [{ role: "", fact: "", label: "", message: (e as Error).message }] }); }
    finally { setBusy(false); }
  };
  return (
    // Floats at the bottom of the window: appearing never moves the rows under the pointer.
    <div role="region" aria-label="Change the ticked rows" className="fixed bottom-4 right-4 z-40 flex w-[calc(100vw-2rem)] max-w-[960px] flex-wrap md:w-[calc(100vw-14rem-3rem)] items-center gap-2 rounded-xl border border-primary/40 bg-surface-raised p-2 shadow-lg" data-bulk-bar>
      <span className="px-1 text-sm font-medium" data-bulk-count>{picked.length} selected</span>
      <Select aria-label="Set where it comes from" className="h-8 w-60" value="" disabled={busy} onChange={(e) => { const v = e.target.value as AnswerSource | "RULES"; if (v) void run({ source: v }); }} data-bulk-source>
        <option value="">Set where it comes from…</option><option value="CLIENT">Client</option><option value="AGENT">Case officer</option><option value="RULES">Back to the rules' default</option>
      </Select>
      <Select aria-label="Prospect questionnaire (PQR)" className="h-8 w-72 max-w-full" value="" disabled={busy} onChange={(e) => { if (e.target.value) void run({ prequalification: e.target.value === "on" }); }} data-bulk-pq>
        <option value="">Prospect questionnaire (PQR)…</option><option value="on">Ask in the Prospect questionnaire (PQR)</option><option value="off">Do not ask</option>
      </Select>
      <Button size="sm" variant="ghost" onClick={onClear}>Clear selection</Button>
      <span className="text-xs text-text-muted">Accept and Reject of AI proposals come with the AI step. No bulk remove, delete or retire.</span>
    </div>
  );
}

export { useUndoToast };
