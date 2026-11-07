import * as React from "react";
import { fmtWhen } from "@/components/status";
import { CheckCircle2, CornerUpLeft, Rocket, Send } from "lucide-react";
import { api, useAction, useActorId, useApi } from "@/lib/api";
import { Button, Notice, Pill, Table, Textarea } from "@/components/ui/controls";
import { Spinner } from "@/components/ui/spinner";
import { irccWords } from "../../../contracts/workspace";
import { problemWords } from "../../../contracts/programs";
import { roleKeysInWords } from "@/pages/job";
import { fieldName } from "@/pages/library";
import { itemCell } from "@/lib/item-words";
import { UnsourcedNumbers } from "@/components/unsourced-numbers";
import { Link } from "react-router-dom";
import { AnswerKeyBlock, fixOnTests } from "@/components/answer-key-gate";
import { FormFieldsHeld, FormFieldsPanel, useFormFieldsOfCombination } from "@/components/form-field-conditions";

/** The simulated person's name for an id the server stores (QA-10: never "user-A" on screen). */
export const nameOf = (actors: { id: string; name: string }[] | undefined, id: string | null | undefined) => actors?.find((a) => a.id === id)?.name ?? id ?? "";
/** QA-73: the engine's part names in the words the pages use (the stored codes stay as they are). */
const KIND_WORD: Record<string, string> = { "Derived definition": "Calculated answer", "Derived fields": "Calculated answers", Questionnaires: "Smart questionnaire (SQR)", Tests: "Answer-key tests" }; // K13 (P-271): the key stays, the word is the module's; G2: answer-key tests
// QA-73: a message that already starts with its form or item says it once ("IMM 1295: 37 rows", not "IMM 1295: IMM 1295: …").
const problemLine = (p: any) => p.where === "Derived fields" ? `${p.label ? roleKeysInWords(p.label) : "A calculation"}: this calculation is not checked by a test yet; it is shown, never used to decide.`
  : String(p.message ?? "").startsWith(`${p.label ?? p.item}:`) ? p.message : problemWords(p);

/** B81 (challenge M3): a problem on a form's option map says where it is fixed: the form's panel on the Forms tab. */
const choicesAt = (p: { where?: unknown; message?: unknown }): string | null => { const m = /^Field map ((.+) \([^)]*\))$/.exec(String(p.where ?? "")); return m && /no code for|no option map yet|neither mapped|not on this form|the answer list does not have|has a code, but the form prints/.test(String(p.message ?? "")) ? `choices=${encodeURIComponent(m[2])}&edition=${encodeURIComponent(m[1])}` : null; };

/** B86: the rule's own opening words; the problem's item is the question it names. */
const HIDING = /^Hiding a value a form reads/;
/** changesCount: the combination's draft changes as the summary counts them (the shared draft bar's and the header's one
 *  count, UX-A part 3); undefined while it loads. */
export function ReviewTab({ d, changesCount, countFailed, onRetryCount }: { d: any; changesCount?: number; countFailed?: boolean; onRetryCount?: () => void }) {
  const id = d.combination.id;
  const actorId = useActorId();
  const r = useApi<any>(["review", id, actorId], `/combinations/${id}/review`);
  const session = useApi<any>(["session", actorId], "/session");
  const [note, setNote] = React.useState("");
  const [picked, setPicked] = React.useState<Set<string>>(new Set());
  const [allProblems, setAllProblems] = React.useState(false);
  const [allChanges, setAllChanges] = React.useState(false);
  // UX-A part 3 (break M2): a submit, sign or release refreshes the header, the draft bar and the cards too (G1: and the sources).
  const inv = [["review", id], ["combination", id], ["combination-summary", id], ["draft"], ["catalogue"], ["programs"], ["preview"], ["config", id], ["sources", id]];
  const submit = useAction(() => api(`/combinations/${id}/submit`, { method: "POST", json: { note } }), { success: "Submitted for review", invalidate: inv, onDone: () => setNote("") });
  const sign = useAction((b: any) => api(`/combinations/${id}/signoff`, { method: "POST", json: b }), { success: (x: any) => "Recorded", invalidate: inv, onDone: () => { setPicked(new Set()); setNote(""); } });
  const approve = useAction(() => api(`/combinations/${id}/approve`, { method: "POST" }), { success: (x: any) => `Released version ${x.version}`, invalidate: inv });
  // S5 m7 (P-123, AGENTS rule 4): the second person sees which forms AI picked, with IRCC's words, and confirms they apply.
  const cfg = useApi<{ snapshot: { forms: { form_number: string; title: string; origin?: string; source_quote?: string | null }[] } }>(["config", id, "draft"], `/combinations/${id}/config?mode=draft`);
  const aiPicked = (cfg.data?.snapshot.forms ?? []).filter((f) => f.origin === "AI_PROPOSAL" || f.origin === "AI_FOUND");
  const formFieldsView = useFormFieldsOfCombination(id); // B86 (break B2): above the early return, as every hook
  if (r.isLoading || !session.data) return <Spinner label="Loading review" />;
  const v = r.data;
  const me = session.data.actor;
  const sub = v.submission?.status === "SUBMITTED" ? v.submission : null;
  // UX-A part 3 (finding 7): the draft's changes are the summary's count (the draft bar's "No unreleased changes" and the
  // header): a combination with nothing configured has none, even though its draft carries shared library items.
  // Review n1 / break m2: while the summary's count is unknown the list waits, so it never shows the library's items
  // beside "No unreleased changes" for a moment.
  const counting = changesCount === undefined;
  const draftChanges = changesCount === 0 || counting ? [] : v.draft.changes;
  const changes: any[] = sub ? sub.changeSummary : draftChanges;
  const signed = new Map<string, any>((v.signoffs ?? []).map((s: any) => [s.itemRef, s]));
  const errors = v.draft.problems.filter((p: any) => p.level === "error"), warnings = v.draft.problems.filter((p: any) => p.level === "warning");
  // G1 PR 2b: numbers without a source have their own block (each with Add source); the validation list shows the rest.
  const gateOf = (p: { gate?: string }) => p.gate;
  // G5 (C5.1, P-248): no form line is its own warning box above the list (said once, with where to add one).
  const noFormLine = errors.find((p: { code?: string }) => p.code === "no_form_line"); // engine/programs.ts NO_FORM_LINE
  const noDocLine = errors.find((p: { code?: string }) => p.code === "no_document_line"); // engine/programs.ts NO_DOCUMENT_LINE
  const lineBox = noFormLine || noDocLine;
  const unsourced = errors.filter((p: { gate?: string }) => gateOf(p) === "no-source").length, others = errors.filter((p: { gate?: string }) => gateOf(p) !== "no-source" && p !== noFormLine && p !== noDocLine)
    .sort((a: { message?: string }, b: { message?: string }) => Number(HIDING.test(b.message ?? "")) - Number(HIDING.test(a.message ?? ""))); // B86: its way out is on the row, so never behind "Show all"
  const formFields = formFieldsView.data?.questions ?? [];
  const underProblem = new Set<string>(others.filter((p: { message?: string; item?: string }) => HIDING.test(p.message ?? "") && p.item).map((p: { item?: string }) => p.item as string));
  const ref = (c: any) => `${c.kind}|${c.key}`;
  const needSme = changes.filter((c) => c.needs_sme), unsignedSme = needSme.filter((c) => !signed.has(ref(c)));
  const can = (duty: string) => me.duties.includes(duty);
  return (
    <div className="space-y-4">
      {aiPicked.length ? (
        <Notice tone="ai" title={`Forms AI picked (${aiPicked.length}): confirm they apply before release`}>
          <ul className="mt-1 space-y-1" data-ai-picked>{aiPicked.map((f) => <li key={f.form_number}><span className="mono font-medium">{f.form_number}</span> {f.title}{f.source_quote ? <span className="text-text-muted"> · IRCC's words: "{irccWords(f.source_quote)!.slice(0, 140)}"</span> : null}</li>)}</ul>
          <p className="mt-1 text-xs">Which forms apply is Sample until the immigration expert confirms it here.</p>
        </Notice>
      ) : null}
      <div className="grid gap-3 md:grid-cols-3">
        <StepCard n={1} title="Author submits" done={!!sub} who="Configuration author (only the author submits)" text={sub ? `Submitted by ${nameOf(session.data.actors, sub.submittedBy)}, ${fmtWhen(sub.submittedAt)}${sub.stale ? ": the draft changed afterwards, submit again" : ""}` : `${counting ? "Counting draft changes" : `${draftChanges.length} draft change${draftChanges.length === 1 ? "" : "s"}`}; ${errors.length} problem${errors.length === 1 ? "" : "s"} to fix`} />
        <StepCard n={2} title="The immigration expert signs the content" done={!!sub && !unsignedSme.length} who="Content reviewer (the immigration expert's sign-off)" text={sub ? `${needSme.length - unsignedSme.length} of ${needSme.length} rule, document, check or AI-proposed changes signed` : "Rules, document requirements, checks and AI proposals need the immigration expert's sign-off"} />
        <StepCard n={3} title="A second person releases" done={false} who="Approver (never the author or submitter)" text={v.releases[0] ? `Last released: version ${v.releases[0].version}, in Release ${v.releases[0].release}, by ${v.releases[0].approver}` : "Nothing released yet"} />
      </div>
      <Notice tone="info" title={`You are acting as ${me.name} (simulated): ${me.role}`}>Duties: {me.duties.join(", ")}. The server enforces them: an author or submitter can never approve, and a draft changed after submission cannot be released.</Notice>
      {noFormLine ? <div data-no-form-line><Notice tone="warn" title="No form line yet: this combination cannot be released" action={<Button asChild size="sm" variant="secondary"><Link to={`/c/${id}/forms`}>Add a form</Link></Button>}>{noFormLine.message.replace(/^No form line yet: /, "").replace(/^./, (c: string) => c.toUpperCase())} Submit and release are refused until then.</Notice></div> : null}
      {noDocLine ? <div data-no-document-line><Notice tone="warn" title="No document line yet: this combination cannot be released" action={<Button asChild size="sm" variant="secondary"><Link to={`/c/${id}/documents`}>Add a document</Link></Button>}>{noDocLine.message.replace(/^No document line yet: /, "").replace(/^./, (c: string) => c.toUpperCase())} Submit and release are refused until then.</Notice></div> : null}
      <UnsourcedNumbers id={id} blocking={unsourced > 0} />
      {others.length || warnings.length ? (
        <div className="rounded-xl border border-border bg-surface-raised p-4">
          <p className="font-medium">Validation of the draft</p>
          <p className="mt-1 text-xs text-text-muted">{others.length}{unsourced || lineBox ? " other" : ""} error{others.length === 1 ? "" : "s"} (block submission) · {warnings.length} warning{warnings.length === 1 ? "" : "s"} (shown and recorded)</p>
          <ul className="mt-2 space-y-1 text-sm">{[...others, ...warnings].slice(0, allProblems ? undefined : 8).map((p: any, i: number) => <li key={i} className="flex gap-2"><Pill tone={p.level === "error" ? "danger" : "warn"}>{p.level}</Pill><span data-problem className="min-w-0 [overflow-wrap:anywhere]"><b>{KIND_WORD[p.where] ?? p.where}</b> · {problemLine(p)}{can("author") && choicesAt(p) ? <> <Link data-choices-link className="text-text-link underline" to={`/c/${id}/forms?${choicesAt(p)}`}>Set this form's choices</Link></> : null}</span>{p.where === "Tests" && p.item ? <> <Link className="text-text-link hover:underline" to={fixOnTests(id, p.item === "eligibility" ? "rule_set" : "field_map", p.item)} aria-label={`Fix on Tests: ${p.label ?? p.item}`} data-fix-tests>Fix on Tests</Link></> : null}</li>)}</ul>
          {underProblem.size ? <div className="mt-3 space-y-3 border-t border-border pt-3" data-hiding-way-out>{formFieldsView.isLoading ? <Spinner label="Loading the form fields that read these answers" /> : formFieldsView.isError ? <div data-hiding-way-out-failed><Notice tone="warn" title="The form fields that read these answers could not be read" action={<Button size="sm" variant="secondary" onClick={() => void formFieldsView.refetch()}>Try again</Button>}>Nothing has changed. The way to confirm them shows here when they can be read.</Notice></div> : formFields.filter((q) => underProblem.has(q.fact)).map((q) => <FormFieldsPanel key={q.fact} combinationId={id} view={q} />)}</div> : null}
          {others.length + warnings.length > 8 ? <Button size="sm" variant="ghost" className="mt-1" onClick={() => setAllProblems(!allProblems)}>{allProblems ? "Show fewer" : `Show all ${others.length + warnings.length}`}</Button> : null}
        </div>
      ) : unsourced || lineBox ? null : <Notice tone="ok" title="The draft passes validation" />}
      {formFieldsView.isError && !underProblem.size ? <div data-held-failed><Notice tone="warn" title="The form fields holding a question's condition could not be read" action={<Button size="sm" variant="secondary" onClick={() => void formFieldsView.refetch()}>Try again</Button>}>Nothing has changed. Their Undo shows here when they can be read.</Notice></div> : null}
      <FormFieldsHeld combinationId={id} questions={formFields} shown={underProblem} />
      <AnswerKeyBlock combinationId={id} v={v.draft.answer_keys} />
      <div className="rounded-xl border border-border bg-surface-raised">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <p className="font-medium">{sub ? "Submitted changes" : "Changes in the draft"} compared with {v.releases[0] ? `released version ${v.releases[0].version}` : "nothing released"} ({counting && !sub ? "…" : changes.length})</p>
          {sub && (can("sme") || can("review")) ? <div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => setPicked(new Set(changes.filter((c) => !signed.has(ref(c)) && (!c.needs_sme || can("sme"))).map(ref)))}>Select all I can sign</Button><Button size="sm" onClick={() => sign.mutate({ items: [...picked], action: "signed" })} disabled={!picked.size} busy={sign.isPending}><CheckCircle2 /> Sign {picked.size || ""}</Button></div> : null}
        </div>
        {!changes.length ? <p className="px-4 py-6 text-sm text-text-muted" role={counting && !sub ? "status" : undefined}>{counting && !sub ? (countFailed ? <>The draft changes could not be counted. {onRetryCount ? <button type="button" className="font-medium text-text-link underline" onClick={onRetryCount}>Try again</button> : null}</> : "Counting the draft changes…") : v.releases[0] ? "The draft is identical to the released version." : "Nothing configured yet."}</p> : (
          <Table className="rounded-none border-0" dense head={["", "Kind", "Item", "Change", "Origin", "Needs", "Signed"]}>
            {changes.slice(0, allChanges ? undefined : 25).map((c) => { const s = signed.get(ref(c)); return (
              <tr key={ref(c)}>
                <td>{sub && !s ? <input type="checkbox" aria-label={`Select ${c.label || c.key}`} checked={picked.has(ref(c))} disabled={c.needs_sme && !can("sme")} onChange={(e) => setPicked((p) => { const n = new Set(p); e.target.checked ? n.add(ref(c)) : n.delete(ref(c)); return n; })} /> : null}</td>
                <td className="text-xs">{KIND_WORD[c.kind] ?? c.kind}</td>{(() => { const it = itemCell(c, roleKeysInWords, fieldName); return <td className="max-w-md text-xs" title={it.tip} data-item-cell><span className={it.clamp ? "line-clamp-2" : undefined}>{it.text}</span></td>; })()}
                <td><Pill tone={c.change === "added" ? "info" : c.change === "removed" ? "danger" : "warn"}>{c.change}</Pill></td>
                <td>{c.origin === "AI_PROPOSAL" ? <Pill tone="ai">AI-proposed</Pill> : c.origin === "HUMAN" ? <Pill tone="info">person</Pill> : <Pill>{c.origin ?? "—"}</Pill>}</td>
                <td className="text-xs">{c.needs_sme ? "Immigration expert" : "Review"}</td>
                <td className="text-xs">{s ? <Pill tone={s.action === "signed" ? "ok" : "warn"}>{s.action} by {nameOf(session.data.actors, s.actorId)}</Pill> : sub ? "—" : ""}</td>
              </tr>); })}
          </Table>
        )}
        {changes.length > 25 ? <div className="border-t border-border px-4 py-2"><Button size="sm" variant="ghost" onClick={() => setAllChanges(!allChanges)}>{allChanges ? "Show fewer" : `Show all ${changes.length} changes`}</Button><span className="ml-2 text-xs text-text-muted">{Object.entries(changes.reduce((a: any, c: any) => { a[c.kind] = (a[c.kind] ?? 0) + 1; return a; }, {})).map(([k, n]) => `${n} ${(KIND_WORD[k] ?? k).toLowerCase()}`).join(" · ")}</span></div> : null}
      </div>
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface-raised p-4">
        <label className="min-w-80 flex-1 text-xs">Note (optional for submit and sign; required to return)<Textarea className="mt-1 min-h-14" value={note} onChange={(e) => setNote(e.target.value)} /></label>
        <Button variant="secondary" onClick={() => submit.mutate(undefined)} busy={submit.isPending} disabled={!can("review") || !draftChanges.length || (!!sub && !sub.stale) || !!errors.length} title={!can("review") ? "Needs the review duty" : errors.length ? "Fix the problems first" : ""}><Send /> {sub?.stale ? "Submit again" : "Submit for review"}</Button>
        {sub ? <Button variant="ghost" onClick={() => sign.mutate({ items: picked.size ? [...picked] : changes.map(ref).slice(0, 1), action: "returned", note })} disabled={!can("review") || !note.trim()} busy={sign.isPending}><CornerUpLeft /> Return to author</Button> : null}
        {v.draft.answer_keys?.demo ? /* C5.5 BR-3 (reviewer MJ1): the server's one derivation, demo workspace and Sample content in the draft (m9) */ <span className="self-center"><span data-demo-release><Pill tone="warn" title="Sample content: a demo release, never counted as a real publish.">Demo release</Pill></span></span> : null}
        <Button onClick={() => approve.mutate(undefined)} busy={approve.isPending} disabled={!sub || !can("approve")} title={!can("approve") ? "Only the approver duty can release" : ""}><Rocket /> Approve and release</Button>
      </div>
      {v.releases.length ? (
        <div><p className="mb-2 font-medium">Released versions</p><Table dense head={["Version", "Author / submitter / approver", "Released", "Basis"]}>{v.releases.map((x: any) => <tr key={x.id}><td title={`Fingerprint (SHA-256): ${x.sha256}`}>v{x.version}{(d.releases ?? []).find((y: { id: string; demo?: boolean }) => y.id === x.id)?.demo ? <> <span data-demo-release><Pill tone="warn" title="Sample content: a demo release, never counted as a real publish.">Demo release</Pill></span></> : null} <span className="text-xs text-text-muted">· Release {x.release}</span> {x.status === "SUPERSEDED" ? <Pill>superseded</Pill> : <Pill tone="ok">current</Pill>}</td><td className="text-xs">{String(x.author ?? "").split(",").map((a: string) => nameOf(session.data.actors, a)).join(", ")} / {nameOf(session.data.actors, x.submitter)} / {nameOf(session.data.actors, x.approver)}</td><td className="whitespace-nowrap text-xs">{fmtWhen(x.released_at)}</td><td className="max-w-md text-xs text-text-muted">{x.basis}</td></tr>)}</Table></div>
      ) : null}
    </div>
  );
}

function StepCard({ n, title, who, text, done }: { n: number; title: string; who: string; text: string; done: boolean }) {
  return (
    <div className={`rounded-xl border bg-surface-raised p-4 shadow-sm ${done ? "border-ok/50" : "border-border"}`}>
      <div className="flex items-center gap-2"><span className={`flex size-6 items-center justify-center rounded-full text-xs font-semibold ${done ? "bg-ok text-white" : "bg-surface text-text-muted"}`}>{done ? "✓" : n}</span><p className="font-medium">{title}</p></div>
      <p className="mt-1 text-xs text-text-muted">{who}</p><p className="mt-2 text-sm">{text}</p>
    </div>
  );
}
