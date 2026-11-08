// C6.5 part 2b: the "Fill this from documents" drawer (concept product/screens/C6.5-documents-drawer/concept-draft.md,
// approved by the tech lead after its challenge, P-223 (4)). On the officer's Agent view, one button per section opens a
// side panel that reads the person's uploaded documents (a passport by its coded lines, by rules, no AI, US$0; a letter
// by replaying a saved AI read after its cost card), shows each document as one block with one "Confirm & use" (P-242),
// collapses only the values its check digits back (P-243), asks a tick or a correction on each other value that will be
// written (L-SA9; the server refuses Confirm & use without them), answers in place what a document cannot give, and
// resolves a typed-versus-document difference with a reason (BR-7). The server decides every rule (differs, left_why,
// needs_look, not_read); this screen only shows them (STANDARDS §7). Sample documents only (P-133).
import * as React from "react";
import { AlertCircle, Check, ExternalLink, FileText } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError, getActor, useApi, useToast } from "@/lib/api";
import { Button, Field, Notice, Panel, Pill, Textarea } from "@/components/ui/controls";
import { Skeleton } from "@/components/ui/skeleton";
import { inSentence, type ViewQuestion, type ViewSection } from "../../../contracts/runtime";
import { kindOf, putAnswer, QuestionField, refusal, shown, toDraft, toValue, WHO, type View } from "./questionnaire";

type Reader = "mrz" | "ai_vision";
export type Proposal = { id: string; fact: string; label: string; value: unknown; subject: string; source: { document: string; page: number; reader: Reader };
  confidence: number; state: "proposed" | "used" | "agreed" | "conflict" | "not_asked"; review: "collapsed" | "expanded"; checked: boolean; replayed: boolean; note?: string;
  asked: boolean; current: { answer_id: string; value: unknown } | null; differs: boolean; left_why: string | null; needs_look: boolean };
type Review = { id: string; document: string; document_name: string; file_name: string; reader: Reader; replayed: boolean; collapsed: string[]; expanded: string[];
  confirmed: { by: string; at: string } | null; check_digits: "passed" | "failed" | "incomplete" | null; evidence: string[] };
type Unreadable = { fact: string; reason: string; label: string; document: string };
type Fill = { proposals: Proposal[]; reviews: Review[]; unreadable: Unreadable[]; not_read: { document: string; document_name: string; why: string }[];
  waiting_for_cost?: { document: string; document_name: string }[]; message: string };
type Plan = { documents: { document: string; document_name: string; reader: Reader }[]; estimate: { usual_usd: number; worst_usd: number; replay_usd: number; basis: string };
  live_allowed: boolean; live_why: string; replay_available: boolean; replay: { document: string; document_name: string; replay_available: boolean }[] };
export type OpenCheck = { id: string; subject: string; fact: string; label: string; typed: unknown; document_value: unknown; document: string; current: { answer_id: string; value: unknown } | null };
type Loaded = { plan: Plan; fill: Fill | null; refused: string | null; checks: OpenCheck[] };

const problemCode = (e: unknown) => (e instanceof ApiError ? (e.problem as { code?: string }).code ?? null : null);
const usd = (n: number) => `US$${n.toFixed(2)}`;
/** Times the founder and staff read are in IST (P-302). */
const ist = (at: string) => `${new Date(at).toLocaleString("en-GB", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} IST`;
const who = (id: string) => WHO[id] ?? "someone";
const READER_WORDS: Record<Reader, string> = { mrz: "Read from its coded lines: rules, no AI, US$0", ai_vision: "A saved AI read, replayed: US$0" };
const STATE_WORDS: Record<Proposal["state"], string> = { proposed: "", used: "Used", agreed: "Agreed with the answer", conflict: "Check opened", not_asked: "Not asked by this case" };

/** Break m4: an in-place form open in the drawer is closed first by Escape or the X (its typing is not thrown away with
 *  the whole drawer). Each open form registers how to close it. */
const OpenForms = React.createContext<React.MutableRefObject<(() => void)[]> | null>(null);

/** The open checks of a case, one shared query per case view (the badge on every section's button). */
export function useOpenChecks(caseId: string) {
  return useApi<{ checks: OpenCheck[] }>(["runtime", "checks", caseId, "open"], `/runtime/cases/${caseId}/checks?state=open`);
}

/** BR-1: the section header's button (staff only: the Agent view), with "n to resolve" for the person's open checks. */
export function DocumentsButton({ view, s }: { view: View; s: ViewSection }) {
  const [open, setOpen] = React.useState(false);
  const opener = React.useRef<HTMLButtonElement | null>(null);
  const checks = useOpenChecks(view.case.id).data?.checks.filter((c) => c.subject === s.subjectId) ?? [];
  return (
    <>
      <Button ref={opener} size="sm" variant="secondary" onClick={() => setOpen(true)} data-fill-from-documents={s.section}
        title="Reads this person's uploaded documents and proposes values. Nothing changes until you Confirm & use. Typing always works.">
        <FileText aria-hidden />Fill this from documents{checks.length ? <Pill tone="warn" className="ml-1" title="A typed answer and a document differ: resolve each in this drawer, with a reason">{checks.length} to resolve</Pill> : null}
      </Button>
      {open ? <DocumentsDrawer view={view} s={s} close={() => setOpen(false)} returnFocus={() => opener.current} /> : null}
    </>
  );
}

function DocumentsDrawer({ view, s, close, returnFocus }: { view: View; s: ViewSection; close: () => void; returnFocus: () => HTMLElement | null }) {
  const caseId = view.case.id, subjectId = s.subjectId;
  const qc = useQueryClient(), toast = useToast();
  const key = ["runtime", "documents", caseId, subjectId, s.section];
  // BR-2: the cost card's data first, then the read (idempotent: a stored read comes back as it was), then the open checks.
  const loaded = useQuery<Loaded>({ queryKey: key, queryFn: async () => {
    const base = `/runtime/cases/${caseId}/sections/${s.section}/fill-from-documents`;
    const plan = await api<Plan>(`${base}/plan`, { method: "POST", json: { subjectId } });
    let fill: Fill | null = null, refused: string | null = null;
    try { fill = await api<Fill>(base, { method: "POST", json: { subjectId } }); }
    catch (e) { if (problemCode(e) === "cost_first") refused = (e as Error).message; else throw e; }
    const checks = (await api<{ checks: OpenCheck[] }>(`/runtime/cases/${caseId}/checks?subject=${subjectId}&state=open`)).checks;
    return { plan, fill, refused, checks };
  }, retry: false });
  const refresh = async () => { await Promise.all([qc.invalidateQueries({ queryKey: key }), qc.invalidateQueries({ queryKey: ["runtime", "view", caseId] }), qc.invalidateQueries({ queryKey: ["runtime", "checks", caseId] })]); };
  const [replaying, setReplaying] = React.useState(false);
  // Break M1, m2: a refusal (a replaced file, someone else confirmed first) is shown at the drawer's top, so the reload
  // that replaces the document's block never takes the server's words away with it.
  const [notice, setNotice] = React.useState<string | null>(null);
  const noticeRef = React.useRef<HTMLParagraphElement | null>(null);
  React.useEffect(() => { if (notice) requestAnimationFrame(() => noticeRef.current?.focus()); }, [notice]);
  const forms = React.useRef<(() => void)[]>([]);
  async function replay() {
    setReplaying(true);
    try { await api(`/runtime/cases/${caseId}/sections/${s.section}/fill-from-documents`, { method: "POST", json: { subjectId, mode: "replay" } }); await refresh(); }
    catch (e) { toast.push({ tone: "danger", text: refusal(e) }); }
    setReplaying(false);
  }
  const questions = view.sections.flatMap((x) => x.questions).filter((q) => q.subjectId === subjectId && !q.group);
  const questionOf = (fact: string) => questions.find((q) => q.fact === fact);
  const d = loaded.data;
  const aiDocs = d?.plan.documents.filter((x) => x.reader === "ai_vision") ?? [];
  const aiUnread = aiDocs.filter((x) => !d?.fill?.reviews.some((r) => r.document === x.document));
  return (
    <OpenForms.Provider value={forms}>
    <Panel open onOpenChange={(o) => { if (!o) close(); }} returnFocus={returnFocus} title="Fill from documents" description={<span className="[overflow-wrap:anywhere]">{s.about_label} · {s.title}</span>} bodyLabel="Documents and their values"
      confirmClose={() => { const cancel = forms.current.pop(); if (cancel) { cancel(); return false; } return true; }}
      footer={<><Button variant="ghost" onClick={close}>Close</Button><span className="text-xs text-text-muted">Typing an answer always works.</span></>}>
      {loaded.isLoading ? <div className="space-y-3" aria-busy="true"><p className="text-[13px] text-text-muted">Reading the documents: a passport by its coded lines (rules, no AI, US$0); a letter shows its cost first…</p><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div> : null}
      {loaded.isError ? <Notice tone="danger" title="The documents could not be read">{refusal(loaded.error)}</Notice> : null}
      {d ? (
        <div className="space-y-4" data-documents-drawer>
          {notice ? <Notice tone="danger" title="Not done"><p ref={noticeRef} tabIndex={-1} role="alert" className="outline-none" data-drawer-notice>{notice}</p></Notice> : null}
          {aiUnread.length ? <CostCard plan={d.plan} docs={aiUnread} replaying={replaying} replay={() => void replay()} /> : null}
          {d.fill?.reviews.map((r) => (
            <DocumentBlock key={r.id} caseId={caseId} subjectId={subjectId} section={s} review={r} fill={d.fill!} checks={d.checks.filter((c) => c.document === r.document)} questionOf={questionOf} refresh={refresh} onNotice={setNotice} />
          ))}
          {d.fill?.not_read.map((x) => (
            <div key={x.document} className="flex items-start justify-between gap-3 rounded-lg border border-border px-4 py-3 text-[13px]" data-read-by-person>
              <span><b className="font-medium">{x.document_name}</b>: read by a person. Check its values against it.</span>
              <OpenFile document={x.document} name={x.document_name} />
            </div>
          ))}
          {d.fill && !d.fill.reviews.length && !d.fill.not_read.length && !aiDocs.length ? (
            <Notice tone="info" title="Nothing to read here">No uploaded document of {inSentence(s.about_label)} gives a value in this section. Type the answers.</Notice>
          ) : null}
          <NotOnDocument caseId={caseId} section={s} fill={d.fill} questionOf={questionOf} refresh={refresh} />
        </div>
      ) : null}
    </Panel>
    </OpenForms.Provider>
  );
}

/** BR-2 (P-110, P-175, P-295): a letter's cost before any read; live is never offered here; replay is US$0. */
function CostCard({ plan, docs, replaying, replay }: { plan: Plan; docs: { document: string; document_name: string }[]; replaying: boolean; replay: () => void }) {
  const can = docs.every((x) => plan.replay.find((r) => r.document === x.document)?.replay_available);
  return (
    <section aria-label="Cost before reading" className="rounded-lg border border-border px-4 py-3 text-[13px]" data-cost-card>
      <p className="font-medium">{docs.map((x) => x.document_name).join(", ")}: read by AI</p>
      <p className="mt-1">A live read would cost about {usd(plan.estimate.usual_usd)}, at most {usd(plan.estimate.worst_usd)}. It is not offered here: it needs approval first.</p>
      <details className="mt-1 text-xs text-text-muted"><summary className="cursor-pointer">Details</summary><p className="mt-1">{plan.estimate.basis}</p><p className="mt-1">{plan.live_why}</p></details>
      {can ? <Button size="sm" className="mt-2" busy={replaying} onClick={replay}>Replay the saved read · US$0</Button>
        : <p className="mt-2 text-text-muted" data-no-saved-read>No saved read yet. The first read of this letter is a paid run that needs approval first. Nothing was sent. Type the values for now.</p>}
    </section>
  );
}

/** Opens a stored file for the officer (the staff route needs the person's header, so it is fetched, then shown). */
function OpenFile({ document, name }: { document: string; name: string }) {
  const toast = useToast();
  async function open() {
    const tab = window.open("", "_blank");
    if (tab) tab.opener = null; // break m8: the new tab keeps no link back to the app
    try {
      const res = await fetch(`/api/runtime/documents/${document}/file`, { headers: { "x-actor": getActor() } });
      if (!res.ok) throw new Error(res.status === 403 ? "Only the case team opens a stored document." : "The document could not be opened.");
      const url = URL.createObjectURL(await res.blob());
      if (tab) tab.location.href = url; else window.open(url, "_blank", "noopener");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) { tab?.close(); toast.push({ tone: "danger", text: (e as Error).message }); }
  }
  const what = /passport/i.test(name) ? "the passport" : "the document";
  return <Button size="sm" variant="ghost" onClick={() => void open()} aria-label={`Open ${what}: ${name} (new tab)`} title="Opens the stored file in a new tab, to check the values against it" data-open-file><ExternalLink aria-hidden />Open {what}</Button>;
}

/** BR-3 to BR-12: one document, its values in the concept's order, one Confirm & use. */
function DocumentBlock({ caseId, subjectId, section, review, fill, checks, questionOf, refresh, onNotice }: { caseId: string; subjectId: string; section: ViewSection; review: Review; fill: Fill; checks: OpenCheck[];
  questionOf: (fact: string) => ViewQuestion | undefined; refresh: () => Promise<void>; onNotice: (words: string | null) => void }) {
  const toast = useToast();
  // The question's own label where this person is asked it (the server's label falls back to the fact's last word).
  const labelled = <T extends { fact: string; label: string }>(x: T): T => ({ ...x, label: questionOf(x.fact)?.label ?? x.label });
  const mine = fill.proposals.filter((p) => p.source.document === review.document).map(labelled);
  const unread = fill.unreadable.filter((u) => u.document === review.document).map(labelled);
  const [ticked, setTicked] = React.useState<Set<string>>(new Set());
  const [busy, setBusy] = React.useState(false);
  const confirmed = review.confirmed;
  const evidence = new Set(review.evidence);
  // Break m3: after a successful Confirm & use, focus moves to the confirmed line once the reloaded block draws it.
  const focusConfirmed = React.useRef(false);
  React.useEffect(() => { if (confirmed && focusConfirmed.current) { focusConfirmed.current = false; document.getElementById(`confirmed-${review.document}`)?.focus(); } }, [confirmed, review.document]);
  const value = (p: { fact: string }, v: unknown) => { const q = questionOf(p.fact); return q ? String(shown(q, v)) : String(v ?? ""); };
  const differs = mine.filter((p) => p.state === "proposed" && p.differs);
  const left = mine.filter((p) => p.state === "proposed" && p.left_why);
  const look = mine.filter((p) => p.needs_look);
  const collapsed = mine.filter((p) => p.state === "proposed" && p.review === "collapsed" && !p.differs && !p.left_why);
  const notAsked = mine.filter((p) => !p.asked);
  const open = look.filter((p) => !ticked.has(p.id));
  async function use() {
    setBusy(true); onNotice(null);
    try {
      const r = await api<{ message: string }>(`/runtime/cases/${caseId}/documents/${review.document}/confirm-and-use`, { method: "POST", json: { subjectId, checked: [...ticked] } });
      toast.push({ tone: "ok", text: r.message }); focusConfirmed.current = true;
    } catch (e) {
      const c = e instanceof ApiError ? (e.problem as { confirmed?: { by: string; at: string } }).confirmed : undefined;
      onNotice(problemCode(e) === "already_confirmed" && c ? `${review.document_name}: already confirmed and used by ${who(c.by)} on ${ist(c.at)}.` : `${review.document_name}: ${refusal(e)}`);
    }
    await refresh();
    setBusy(false);
  }
  return (
    <section aria-labelledby={`doc-${review.document}`} className="overflow-hidden rounded-xl border border-border" data-document-block={review.document}>
      <header className="flex flex-wrap items-start justify-between gap-2 border-b border-border bg-surface px-4 py-3">
        <div className="min-w-0">
          <h3 id={`doc-${review.document}`} className="text-sm font-semibold [overflow-wrap:anywhere]">{review.document_name}</h3>
          <p className="text-xs text-text-muted [overflow-wrap:anywhere]" title={review.reader === "mrz" ? "The passport's coded lines (the two lines of letters and < at the foot of the page) are read by fixed rules, never by AI. Their check digits back the number, the date of birth and the expiry." : "A saved AI read of this file, replayed at no cost; its values are checked one by one."}>{review.file_name} · {READER_WORDS[review.reader]}{review.check_digits ? ` · Check digits: ${review.check_digits === "failed" ? "one failed, so every value is shown" : review.check_digits === "passed" ? "passed" : "not all present"}` : ""}</p>
        </div>
        <OpenFile document={review.document} name={review.document_name} />
      </header>
      <div className="divide-y divide-border">
        {checks.map((k) => <ResolveCheck key={k.id} check={k} questionOf={questionOf} refresh={refresh} />)}
        {differs.map((p) => (
          <Row key={p.id} p={p} value={value(p, p.value)} section={section}>
            <p className="text-xs text-text-warn" data-differs><AlertCircle className="mr-1 inline size-3" aria-hidden />Differs from the current answer, {value(p, p.current?.value)}{answerBy(questionOf(p.fact))}. Confirm & use opens a check for it and keeps the current answer until you choose.</p>
          </Row>
        ))}
        {unread.map((u) => (
          <div key={`u-${u.fact}`} className="px-4 py-2.5 text-[13px]" data-could-not-read>
            <p className="font-medium">{u.label}: could not read</p><p className="text-xs text-text-muted">{u.reason}</p>
            <AnswerInPlace caseId={caseId} q={questionOf(u.fact)} refresh={refresh} document={evidence.has(u.fact) ? review.document : undefined} docName={review.document_name} />
          </div>
        ))}
        {left.map((p) => (
          <Row key={p.id} p={p} value={value(p, p.value)} section={section}>
            <p className="text-xs text-text-muted" data-left-why>{questionOf(p.fact)?.answer ? "Left for you, and answered." : p.left_why}</p>
            <AnswerInPlace caseId={caseId} q={questionOf(p.fact)} refresh={refresh} document={evidence.has(p.fact) ? review.document : undefined} docName={review.document_name} />
          </Row>
        ))}
        {look.map((p) => (
          <Row key={p.id} p={p} value={value(p, p.value)} section={section}>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" aria-label={`Matches the document: ${p.label}`} checked={ticked.has(p.id)} onChange={(e) => setTicked((t) => { const n = new Set(t); if (e.target.checked) n.add(p.id); else n.delete(p.id); return n; })} data-tick={p.fact} />Matches the document</label>
              <AnswerInPlace caseId={caseId} q={questionOf(p.fact)} refresh={refresh} label="Correct it" />
            </div>
          </Row>
        ))}
        {collapsed.length ? (
          <details className="px-4 py-2.5 text-[13px]" data-collapsed>
            <summary className="cursor-pointer">{collapsed.length} value{collapsed.length === 1 ? "" : "s"} checked by the {review.document_name.toLowerCase().includes("passport") ? "passport's" : "document's"} check digits: {collapsed.map((p) => p.label).join(", ")}</summary>
            <ul className="mt-2 space-y-1">{collapsed.map((p) => <li key={p.id} className="text-xs" data-collapsed-value={p.fact}><span className="text-text-muted">{p.label}:</span> <b className="font-medium">{value(p, p.value)}</b> · page {p.source.page} · check digit passed</li>)}</ul>
          </details>
        ) : null}
        {confirmed ? mine.filter((p) => p.state !== "proposed").map((p) => {
          // Break m1: once its check is resolved, a difference says so, with the value the person has now.
          const resolved = p.state === "conflict" && !checks.some((k) => k.fact === p.fact);
          const q = questionOf(p.fact);
          return (
            <div key={`s-${p.id}`} className="px-4 py-1.5 text-xs" data-row-state={resolved ? "resolved" : p.state}>
              <span className="text-text-muted">{p.label}:</span> {resolved && q?.answer ? value(p, q.answer.value) : value(p, p.value)} · <b className="font-medium">{resolved ? "Check resolved" : STATE_WORDS[p.state]}</b>
              {/* BR-12: an answer kept by a resolved check can be marked checked against this document, where it gives the fact. */}
              {resolved && evidence.has(p.fact) && q?.answer && q.answer.status !== "VERIFIED" ? <AnswerInPlace caseId={caseId} q={q} refresh={refresh} document={review.document} docName={review.document_name} markOnly /> : null}
            </div>
          );
        }) : null}
        {notAsked.length && !confirmed ? <p className="px-4 py-2 text-xs text-text-muted">Not asked by this case: {notAsked.map((p) => p.label).join(", ")}.</p> : null}
      </div>
      <footer className="space-y-2 border-t border-border px-4 py-3">
        {confirmed ? <p id={`confirmed-${review.document}`} tabIndex={-1} className="flex items-center gap-1.5 text-[13px] outline-none" data-confirmed><Check className="size-4 text-text-ok" aria-hidden />Confirmed and used by {who(confirmed.by)} on {ist(confirmed.at)}.</p> : (
          <>
            <p className="text-xs text-text-muted">The document's values are used only on Confirm & use. A correction or answer you save is your answer at once.</p>
            <Button busy={busy} disabled={open.length > 0} onClick={() => void use()} title={open.length ? `Tick or correct each value first: ${open.length} left.` : "Use this document's values: who and when are recorded"} data-confirm-and-use>Confirm & use</Button>
            {open.length ? <p className="text-xs text-text-muted" data-ticks-left>Tick or correct each value first: {open.length} left.</p> : null}
          </>
        )}
      </footer>
    </section>
  );
}

const answerBy = (q: ViewQuestion | undefined) => (q?.answer ? ` (${q.answer.channel === "questionnaire" ? `${who(q.answer.by)} typed it` : q.answer.by === getActor() ? "you entered it" : `${who(q.answer.by)} entered it`})` : "");

/** One value: its label, the section it fills, the value, page and reader in words. */
function Row({ p, value, section, children }: { p: Proposal; value: string; section: ViewSection; children?: React.ReactNode }) {
  const where = p.fact && section.questions.some((q) => q.fact === p.fact) ? section.title : null;
  return (
    <div className="space-y-1 px-4 py-2.5 text-[13px]" data-value={p.fact}>
      <p className="[overflow-wrap:anywhere]"><span className="text-text-muted">{p.label}{where ? ` (${where})` : ""}:</span> <b className="font-medium [overflow-wrap:anywhere]">{value}</b></p>
      <p className="text-xs text-text-muted">page {p.source.page} · {p.source.reader === "mrz" ? (p.checked ? "check digit passed" : "no check digit of its own") : `confidence ${Math.round(p.confidence * 100)}% (Sample)`}{p.note ? ` · ${p.note}` : ""}</p>
      {children}
    </div>
  );
}

/** BR-8, BR-11: answer or correct a value in place with the question's own field, saved as the Agent view saves it. */
function AnswerInPlace({ caseId, q, refresh, label, document, docName, markOnly, onSaved }: { caseId: string; q: ViewQuestion | undefined; refresh: () => Promise<void>; label?: string; document?: string; docName?: string; markOnly?: boolean; onSaved?: (fact: string) => void }) {
  const toast = useToast();
  const [editing, setEditing] = React.useState(false);
  const forms = React.useContext(OpenForms);
  const cancel = React.useCallback(() => setEditing(false), []);
  React.useEffect(() => { if (!editing || !forms) return; forms.current.push(cancel); return () => { forms.current = forms.current.filter((f) => f !== cancel); }; }, [editing, forms, cancel]);
  const [draft, setDraft] = React.useState<unknown>(undefined);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  if (!q) return null;
  const answered = !!q.answer;
  async function save() {
    const v = toValue(kindOf(q!), draft);
    if (v === undefined) { setError("Give an answer; an answer can be changed but not cleared."); return; }
    setBusy(true);
    try { const r = await putAnswer(caseId, q!, v); toast.push({ tone: "ok", text: r.message }); setEditing(false); onSaved?.(q!.fact); await refresh(); }
    catch (e) { setError(refusal(e)); if (e instanceof ApiError && e.status === 409) await refresh(); }
    setBusy(false);
  }
  async function markChecked() {
    setBusy(true);
    try { await api(`/runtime/cases/${caseId}/answers/${q!.subjectId}/${q!.fact}/checked-against-document`, { method: "POST", json: { document } }); toast.push({ tone: "ok", text: `${q!.label}: checked against the document.` }); await refresh(); }
    catch (e) { toast.push({ tone: "danger", text: refusal(e) }); }
    setBusy(false);
  }
  if (!editing) return (
    <span className="flex flex-wrap items-center gap-2">
      {answered && !label && !markOnly ? <span className="text-xs [overflow-wrap:anywhere]">Answered: <b className="font-medium">{String(shown(q, q.answer!.value))}</b></span> : null}
      {markOnly ? null : <Button size="sm" variant="ghost" onClick={() => { setDraft(toDraft(kindOf(q), q.answer?.value)); setError(null); setEditing(true); }} data-answer-in-place={q.fact}>{label ?? (answered ? "Change it" : "Answer it")}</Button>}
      {/* BR-12: only where it adds evidence: a value the document could not give, once answered. */}
      {document && answered && q.answer!.status !== "VERIFIED" ? <Button size="sm" variant="ghost" busy={busy} onClick={() => void markChecked()} data-mark-checked={q.fact}>Mark checked against {/passport/i.test(docName ?? "") ? "the passport" : "the document"}</Button> : null}
    </span>
  );
  return (
    <form className="space-y-2 rounded-lg border border-border bg-surface px-3 py-2" onSubmit={(e) => { e.preventDefault(); void save(); }} data-in-place-form={q.fact}>
      <QuestionField q={q} idBase={`doc-${q.subjectId}-${q.fact}`} draft={draft} onChange={(v) => { setDraft(v); setError(null); }} errors={error ? [error] : []} compact officer />
      <div className="flex gap-2"><Button size="sm" type="submit" busy={busy}>Save</Button><Button size="sm" variant="ghost" type="button" onClick={() => setEditing(false)}>Cancel</Button></div>
    </form>
  );
}

/** BR-10 (C6.5-14, P-142 D6): resolve a difference in the drawer, with a reason; the server's words on refusal. */
function ResolveCheck({ check, questionOf, refresh }: { check: OpenCheck; questionOf: (fact: string) => ViewQuestion | undefined; refresh: () => Promise<void> }) {
  const toast = useToast();
  const q = questionOf(check.fact);
  const [keep, setKeep] = React.useState<"document" | "answer">("answer");
  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const show = (v: unknown) => (q ? String(shown(q, v)) : String(v ?? ""));
  async function save() {
    setBusy(true); setError(null);
    try {
      await api(`/runtime/checks/${check.id}/resolve`, { method: "POST", json: { keep, reason, answerId: check.current?.answer_id ?? null } });
      toast.push({ tone: "ok", text: `${q?.label ?? check.label}: resolved, keeping the ${keep === "document" ? "document's value" : "current answer"}.` });
      await refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.field("reason") ?? e.message : (e as Error).message);
      if (["changed", "not_current"].includes(problemCode(e) ?? "")) await refresh();
    }
    setBusy(false);
  }
  return (
    <form className="space-y-2 bg-warn/5 px-4 py-3 text-[13px]" onSubmit={(e) => { e.preventDefault(); void save(); }} data-resolve-check={check.fact}>
      <p className="font-medium [overflow-wrap:anywhere]">{q?.label ?? check.label}: the answer is {show(check.current?.value ?? check.typed)}{answerBy(q)}; the document reads {show(check.document_value)}. Which is right?</p>
      <fieldset className="flex flex-wrap gap-4 text-xs"><legend className="sr-only">Which value to keep</legend>
        <label className="flex items-center gap-1.5"><input type="radio" name={`keep-${check.id}`} checked={keep === "document"} onChange={() => setKeep("document")} />Keep the document's value</label>
        <label className="flex items-center gap-1.5"><input type="radio" name={`keep-${check.id}`} checked={keep === "answer"} onChange={() => setKeep("answer")} />Keep the current answer</label>
      </fieldset>
      <Field label="Reason (required)" error={error}><Textarea rows={2} value={reason} onChange={(e) => { setReason(e.target.value); setError(null); }} maxLength={500} /></Field>
      <Button size="sm" type="submit" busy={busy}>Save</Button>
    </form>
  );
}

/** "Not on this document": the section's unanswered questions no read gives, answered in place (BR-7, BR-11). */
function NotOnDocument({ caseId, section, fill, questionOf, refresh }: { caseId: string; section: ViewSection; fill: Fill | null; questionOf: (fact: string) => ViewQuestion | undefined; refresh: () => Promise<void> }) {
  // Break M2: a question answered here stays in the list (with its answer), so the officer sees what they typed.
  const [here, setHere] = React.useState<Set<string>>(new Set());
  if (!fill?.reviews.length) return null;
  const evidenceOf = (fact: string) => fill.reviews.find((r) => r.evidence.includes(fact))?.document;
  const given = new Set([...fill.proposals.map((p) => p.fact), ...fill.unreadable.map((u) => u.fact)]);
  const rest = section.questions.filter((q) => !q.group && !q.hidden && (!q.answer || here.has(q.fact)) && !given.has(q.fact) && kindOf(q) !== "declaration");
  if (!rest.length) return null;
  return (
    <section aria-label="Not on these documents" className="rounded-xl border border-dashed border-border px-4 py-3 text-[13px]" data-not-on-document>
      <p className="font-medium">Not on these documents</p>
      <ul className="mt-1 space-y-2">{rest.map((q) => <li key={q.fact}><span className="text-text-muted">{q.label}</span><AnswerInPlace caseId={caseId} q={questionOf(q.fact)} refresh={refresh} document={evidenceOf(q.fact)} docName={fill.reviews.find((r) => r.document === evidenceOf(q.fact))?.document_name} onSaved={(f) => setHere((x) => new Set(x).add(f))} /></li>)}</ul>
    </section>
  );
}
