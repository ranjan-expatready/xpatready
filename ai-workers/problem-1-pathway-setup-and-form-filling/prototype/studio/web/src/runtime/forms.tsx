// Case forms panel (runtime lane, R1d, plan §8 RT-13…RT-16): each PDF form for each person on the case, what a copy made
// now would write (every declared and confirmed answer, P-242, P-411), whether it can be filed (P-71: only missing or
// unconfirmed facts and the form's own Validate block),
// and every copy made: generating, generated, out of date (with the facts that changed), locked, stale. A new copy is
// made only when the officer asks; a locked copy never changes (P-65). The page reads one list per case.
import * as React from "react";
import { AlertCircle, Check, Download, FileText, Lock, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { api, getActor, useActorId, useApi, useToast } from "@/lib/api";
import { Button, Notice, Pill } from "@/components/ui/controls";
import { Skeleton } from "@/components/ui/skeleton";
import { inSentence, LOCK_KINDS, notReady, ONLINE_LATER_WAVE, type CaseForm, type CaseOnlineForm, type FormCopy } from "../../../contracts/runtime";
import { noRetryOnRefusal } from "./questionnaire";
import { cardFacts, openLines } from "../../../engine/runtime/open-lines";
import { OutOfDate } from "./out-of-date";
import { MovedGroups } from "./release-update"; // C9.5: what a move to a newer release did, until each copy is made again
import { ReadinessPanel } from "./readiness"; // C7.6 (B2): the filings' readiness from /prepare, right after the forms
import { SignSteps } from "./sign-steps"; // C8.1 (B3): who signs, and the steps of a form signed by hand and scanned
import { AddedTag, AddFormButton, BlankRow } from "./add-form"; // C7.8 (B141): add a library form to one filing
import { Link } from "react-router-dom";
import { FoldOut } from "@/components/fold-out";
import { sheetPath, STATE_WORDS } from "./answer-sheet"; // C7.3 (QA-317): the Online line opens its answer sheet

const when = (at: string) => new Date(at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const busy = (c: FormCopy) => c.status === "QUEUED" || c.status === "RUNNING";

/** The forms of one case. Under the questionnaire view's query key, so any answer change refreshes it too. QA-229 (B2):
 *  "Ready to file" is a filing's state, said only by the readiness panel below (the server's); a form row says whether
 *  its own facts are confirmed. */

export function FormsPanel({ caseId }: { caseId: string }) {
  const actor = useActorId();
  const q = useApi<{ forms: CaseForm[]; online?: CaseOnlineForm[] }>(["runtime", "view", caseId, "forms", actor], `/runtime/cases/${caseId}/forms`, {
    retry: noRetryOnRefusal, refetchInterval: (query) => ((query.state.data as { forms: CaseForm[] } | undefined)?.forms.some((f) => f.copies.some(busy)) ? 1000 : false),
  });
  // C7.8 (B141): the filings, to put "+ Add a form" after each filing's forms (the same read as Ready to file below).
  const prep = useApi<PrepareFilings>(["runtime", "view", caseId, "prepare"], `/runtime/cases/${caseId}/prepare`, { retry: noRetryOnRefusal });
  return (<>
    <section aria-labelledby="forms-h" className="rounded-xl border border-border bg-surface-raised">
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border px-4 py-3">
        <h2 id="forms-h" tabIndex={-1} className="text-base font-semibold outline-none">Prepare application</h2>
        <p className="text-[13px] text-text-muted">The forms to file, filled from declared and confirmed answers. A new copy is made only when you ask; a locked copy never changes.</p>
      </header>
      <MovedGroups caseId={caseId} />
      <OutOfDate caseId={caseId} />
      {q.isLoading ? <div className="p-4"><Skeleton className="h-16 w-full" /></div>
        : q.isError ? <div className="p-4"><Notice tone="danger" title="The forms could not be loaded">{(q.error as Error).message}</Notice></div>
        : !q.data!.forms.length && !q.data!.online?.length ? <p className="px-4 py-3 text-sm text-text-muted">No form applies to anyone on this case yet.</p>
        : <ul className="divide-y divide-border">
            {byFiling(q.data!.forms, prep.data).map((g) => <React.Fragment key={g.filing ?? "none"}>
              {g.forms.map((f) => f.blank ? <BlankRow key={`${f.form}|${f.subject_id}`} caseId={caseId} f={f} recorded={g.recorded} /> : <FormRow key={`${f.form}|${f.subject_id}`} caseId={caseId} f={f} recorded={g.recorded} />)}
              {g.filing ? <AddFormButton caseId={caseId} filing={g.filing} owner={g.owner} disabled={g.recorded ? "This application is recorded as submitted: read-only." : null} /> : null}
            </React.Fragment>)}
            {(q.data!.online ?? []).map((f) => <OnlineRow key={f.form} caseId={caseId} f={f} />)}
          </ul>}
    </section>
    <ReadinessPanel caseId={caseId} />
  </>);
}

type PrepareFilings = { filings?: { id: string; status: string; applicants: { subject: string; label: string; mode: string }[]; owner?: { subject: string; label?: string } | null }[] };
/** C7.8 (B141): the form rows in filing order (a filing's people together), each group followed by its "+ Add a form";
 *  rows of a person on no current filing stay at the end, as before. */
function byFiling(forms: CaseForm[], p: PrepareFilings | undefined) {
  const filings = p?.filings ?? [];
  const groups = filings.map((f) => ({ filing: f.id as string | null, recorded: f.status === "submitted", owner: f.applicants.find((a) => a.subject === f.owner?.subject)?.label ?? f.applicants[0]?.label ?? "this",
    forms: forms.filter((x) => f.applicants.some((a) => a.subject === x.subject_id)) }));
  // Breaker m5: once any filing of the case is recorded, nothing on it is added or removed (the server's rule, C8.2-9).
  if (filings.some((f) => f.status === "submitted")) for (const g of groups) g.recorded = true;
  const placed = new Set(groups.flatMap((g) => g.forms));
  const rest = forms.filter((x) => !placed.has(x));
  return [...groups, ...(rest.length ? [{ filing: null, recorded: false, owner: "", forms: rest }] : [])];
}

/** Review m3 (QA-317): each person's Online item says its state beside its link (the server's), so the case shows when the
 *  sheet is Done (B4's last step) where the officer opens it. */
/** QA-40: a form filed Online has no PDF copy; it is named with its people, so it is never silently missing. QA-317: each
 *  person's Online item opens its answer sheet (the item ids come from the case's Prepare view, as "How each form is filed"
 *  reads them); its PDF copy, if any, is among the forms listed above this line. */
function OnlineRow({ caseId, f }: { caseId: string; f: CaseOnlineForm }) {
  const actor = useActorId();
  const prep = useApi<{ derived: boolean; items: { id: string; kind: string; form?: string; channel?: string; person: string; state: string }[] }>(["runtime", "view", caseId, "prepare", actor], `/runtime/cases/${caseId}/prepare`, { retry: noRetryOnRefusal });
  // Review m1: in the order the line names the people.
  const at = (person: string) => { const n = f.people.indexOf(person); return n < 0 ? f.people.length : n; };
  const items = (prep.data?.items ?? []).filter((i) => i.kind === "form" && i.form === f.form && i.channel === "ONLINE").sort((a, b) => at(a.person) - at(b.person));
  return (
    <li className="px-4 py-3" data-online-form={f.form}>
      <h3 className="text-sm font-semibold"><span className="mono">{f.form}</span> · filed {ONLINE_LATER_WAVE} <Pill tone="info">{f.pdf_copy ? "PDF copy, not for filing" : "Answer sheet only"}</Pill></h3>
      <p className="text-[13px] text-text-muted">{f.title}, for {f.people.join(", ")}. It is filed online: the case officer types it into the IRCC account from its answer sheet{f.pdf_copy ? "; a PDF copy, not for filing, is listed with the forms above." : `. ${f.why_no_copy ?? ""}`}</p>
      {items.length ? (
        <p className="mt-1.5 flex flex-wrap gap-2" data-sheet-links>
          {items.map((i) => <Link key={i.id} to={sheetPath(caseId, i.id)} className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 text-[13px] font-medium text-text-link hover:bg-surface-raised" data-sheet-link={i.id}><FileText className="size-3.5" aria-hidden />Open answer sheet: {f.form} for {i.person}<span className="sr-only">, </span><span className="font-normal text-text-muted" data-sheet-state={i.state}>· {STATE_WORDS[i.state]?.[0] ?? i.state}</span></Link>)}
        </p>
      ) : prep.isError ? <p className="mt-1 text-[13px] text-text-danger">Its answer sheet could not be found: {(prep.error as Error).message}</p> : null}
    </li>
  );
}

/** C-9, C-10 (P-144, P-171 (1)): Validate is the last step. The officer validates the copy in Adobe, saves it and sends it
 *  back here; a later change to a fact on the form marks it "Out of date: validate again". */
function ValidatedState({ caseId, c, form }: { caseId: string; c: FormCopy; form: string }) {
  const qc = useQueryClient(); const toast = useToast();
  const input = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  async function send(file: File) {
    setBusy(true);
    try {
      const fd = new FormData(); fd.append("file", file, file.name);
      const r = await api<{ copy?: FormCopy }>(`/runtime/form-copies/${c.id}/validated`, { method: "POST", body: fd });
      // BK-19 (P-46, QA-315): "validated" only when the copy counts (its barcodes read and matching); a file kept but not
      // counted says why, in the barcode check's words.
      const back = r.copy?.validated;
      toast.push(back?.current ? { tone: "ok", text: `${form}: validated copy read back` } : { tone: "danger", text: `${form}: read back, not validated. ${back?.words ?? ""}`.trim() });
      void qc.invalidateQueries({ queryKey: ["runtime", "view", caseId] });
    } catch (e) { toast.push({ tone: "danger", text: (e as Error).message }); }
    finally { setBusy(false); if (input.current) input.current.value = ""; }
  }
  const v = c.validated;
  // BK-19: a read-back that does not count as validated (Validate not passed on it, or its barcodes not read and matching).
  const notCounted = !!v && !v.current && v.barcodes?.matched !== true;
  return (
    <span className="inline-flex min-w-0 max-w-full flex-wrap items-center gap-2" data-validated={v ? (v.current ? "current" : notCounted ? "not_validated" : "out_of_date") : "none"}>
      {/* BK-19 (review M3 on #1679): the barcode check's words are long; they wrap beside a short pill, at any width. */}
      {v && notCounted && !c.validated_elsewhere ? <><Pill tone="warn" title={`Read back ${v.read_back.equal} of ${v.read_back.written} values${v.barcodes?.expected ? `; barcodes ${v.barcodes.decoded} of ${v.barcodes.expected} read` : ""}`}>Read back, not validated</Pill>
          <span className="min-w-0 text-[12px] text-text-warn [overflow-wrap:anywhere]" data-validated-words>{v.words}</span></>
        : v && (v.current || !c.validated_elsewhere) ? <Pill tone={v.current ? "ok" : "warn"} title={`Read back ${v.read_back.equal} of ${v.read_back.written} values${v.barcodes?.expected ? `; barcodes ${v.barcodes.decoded} of ${v.barcodes.expected} read` : ""}`}>{v.words}</Pill>
        : c.validated_elsewhere ? <Pill tone="warn" title="Sample: the validated file is not in these working files, so this copy is not filed or locked as validated" data-validated-elsewhere>{c.validated_elsewhere}</Pill>
        : <Pill tone="warn">Not validated yet</Pill>}
      {c.out_of_date ? null : <>
        <input ref={input} type="file" accept="application/pdf" className="sr-only" aria-label={`Validated copy of ${form}`} onChange={(e) => { const x = e.target.files?.[0]; if (x) void send(x); }} />
        <Button size="sm" variant="secondary" busy={busy} onClick={() => input.current?.click()}>{v && v.current ? "Read back again" : "Read back the validated copy"}</Button>
      </>}
    </span>
  );
}

/** QA-391 (P-65, C9.5): what a copy is for. "file": a copy to file; "check": for reading and checking only (filed Online,
 *  or the form's filling not proven yet); "kept": the form no longer applies, so the copy is kept and listed, never filed. */
type CopyUse = "file" | "check" | "kept";

function CopyState({ c, use = "file" }: { c: FormCopy; use?: CopyUse }) {
  if (busy(c)) return <Pill tone="info" title="The copy is being written and checked">{c.status === "QUEUED" ? "Waiting to generate…" : "Generating…"}</Pill>;
  if (c.status === "FAILED") return <Pill tone="danger" title={c.error ?? ""}>Failed</Pill>;
  if (c.stale) return <Pill tone="danger" title={`Facts changed after this copy was locked: ${c.changed.join(", ")}`}><Lock className="size-3" aria-hidden />Stale · {c.locked ? LOCK_KINDS[c.locked.kind] : ""}</Pill>;
  if (c.locked) return <Pill tone="ok" title={`Locked ${when(c.locked.at)}: it never changes`}><Lock className="size-3" aria-hidden />{LOCK_KINDS[c.locked.kind]}</Pill>;
  if (use === "kept") return <span className="inline-flex" data-copy-kept><Pill title="This form no longer applies: the copy is kept as it was, never filed">Kept, never filed</Pill></span>;
  if (c.out_of_date) return <Pill tone="warn" title={`Facts changed since this copy was made: ${c.changed.join(", ")}`}>Out of date</Pill>;
  return <Pill tone="ok"><Check className="size-3" aria-hidden />Generated</Pill>;
}

function FormRow({ caseId, f, recorded }: { caseId: string; f: CaseForm; recorded?: boolean }) {
  const qc = useQueryClient(), toast = useToast();
  const [working, setWorking] = React.useState(false);
  const [locking, setLocking] = React.useState<keyof typeof LOCK_KINDS | null>(null);
  const heading = React.useRef<HTMLHeadingElement>(null);
  // The latest copy, and the latest locked one (the copy that was filed or uploaded back) always in view.
  const latest = f.copies[0], locked = f.copies.find((c) => c.locked);
  const earlier = f.copies.filter((c) => c !== latest && c !== locked);
  const refresh = () => qc.invalidateQueries({ queryKey: ["runtime", "view", caseId] });
  async function generate() {
    setWorking(true);
    try { await api(`/runtime/cases/${caseId}/forms/${encodeURIComponent(f.form)}/${f.subject_id}/generate`, { method: "POST", json: { idempotencyKey: crypto.randomUUID() } }); toast.push({ tone: "info", text: `A new copy of ${f.form} for ${f.person} is being generated.` }); }
    catch (e) { toast.push({ tone: "danger", text: (e as Error).message }); }
    await refresh(); setWorking(false);
  }
  async function lock(id: string, kind: keyof typeof LOCK_KINDS) {
    setWorking(true);
    try { await api(`/runtime/form-copies/${id}/lock`, { method: "POST", json: { kind } }); toast.push({ tone: "ok", text: `Copy locked: ${LOCK_KINDS[kind]}. It never changes; a later answer marks it stale.` }); }
    catch (e) { toast.push({ tone: "danger", text: (e as Error).message }); }
    setLocking(null); await refresh(); setWorking(false);
    heading.current?.focus(); // the lock buttons are gone: the focus goes to the form's heading, not the page (review M5)
  }
  // P-71 and P-65 (a): a copy is filed or uploaded back only when the form is ready to file and its fill trial passed;
  // until then the buttons say why.
  const lockable = latest && latest.status === "GENERATED" && !latest.locked && !latest.out_of_date && latest.file_ok;
  // P-145: a copy of a form filed Online is never filed; C-9 (P-144): a barcode form is filed only after its validated copy is read back.
  // C11.6: a copy made while this person's form was filed Online carries "Copy, not for filing"; after a channel change it is replaced, never filed.
  const missing = f.readiness.missing;
  // QA-165 (#1318 review M2): a mandatory form field left empty is no fact to answer; it is listed once, under "Marked mandatory
  // on IRCC's form, still empty", and holds no lock back (the server's blocksLock).
  const facts = missing.filter((m) => m.reason !== "left empty on the form");
  // QA-318: the card counts a mandatory form field that still needs an answer as a fact to answer (cardFacts), so
  // "Facts confirmed" is never shown over it; the lock is unchanged (#1318 M2).
  const card = cardFacts(missing), emptyFields = card.emptyFields.length;
  const why = !f.for_filing ? `${f.form} is filed Online: this PDF is a copy, not for filing.` : !f.trial_passed ? (f.trial_why ?? `${f.form}: this form's filling is not proven yet, so this copy is for checking only, not for filing.`) : latest?.copy_not_for_filing ? `This copy was made while ${f.form} was filed Online, so it is stamped “Copy, not for filing”. Generate a new copy to file it.` : facts.length ? notReady(facts.length)
    : f.needs_validate && !latest?.validated?.current ? `Validate ${f.form} in Adobe, save it and read the validated copy back before it is filed.` : null;
  const use: CopyUse = !f.applies ? "kept" : !f.for_filing || !f.trial_passed ? "check" : "file";
  const canLock = lockable && !why && use !== "kept";
  const lockBlocked = lockable && why && use !== "kept" ? why : null;
  return (
    <li className="space-y-2 px-4 py-3" data-row-form={`${f.form}|${f.subject_id}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <FileText className="size-4 text-text-muted" aria-hidden />
        <h3 ref={heading} tabIndex={-1} className="text-sm font-semibold outline-none">{f.form} <span className="font-normal text-text-muted">for</span> <span className="[overflow-wrap:anywhere]">{f.person}</span></h3>
        {f.added ? <AddedTag caseId={caseId} f={f} recorded={recorded} /> : null}
        {!f.for_filing ? <Pill tone="info" title="Filed Online: IRCC's PDF filled from the same declared and confirmed answers, for reading and checking only">Copy, not for filing</Pill>
          : !f.trial_passed && f.applies ? <Pill tone="warn" title="This form's filling is not proven yet, so the copy is for checking only">Checked copy, not for filing</Pill> : null}
        {/* QA-391: a form that no longer applies is kept and listed, never filed: nothing to confirm, validate or generate. */}
        {f.applies && f.for_filing && f.needs_validate && latest?.status === "GENERATED" ? <ValidatedState caseId={caseId} c={latest} form={f.form} /> : null}
        {/* Break M2 (C-9): a barcode form with no current validated copy is never "Ready to file", in words. QA-229 (B2): nor is
            any form: "Ready to file" is the filing's, said by the readiness panel; a form says "Facts confirmed". */}
        {!f.applies ? null
          : !card.facts.length && f.for_filing && f.needs_validate && !latest?.validated?.current ? <Pill tone="warn" title="Every fact is confirmed; IRCC returns a barcode form unprocessed unless it was validated in Adobe" data-needs-validated>Validate before filing</Pill>
          : !card.facts.length ? <Pill tone="ok" title="Every required fact this form reads is confirmed and passes its checks. Whether the filing is Ready to file is under Ready to file below."><Check className="size-3" aria-hidden />Facts confirmed</Pill>
          : <Pill tone="warn">{card.facts.length} fact{card.facts.length === 1 ? "" : "s"} to answer or confirm before filing</Pill>}
        {/* QA-165 (#1318): never "ready" over a mandatory box a copy leaves empty: said apart from the facts, listed below. */}
        {f.applies && emptyFields ? <Pill tone="warn" title="IRCC's form marks these form fields mandatory and a copy made now leaves them empty (listed below); Ready to file waits on them until they are fixed or passed with a reason" data-fields-left-empty>{emptyFields} mandatory form field{emptyFields === 1 ? "" : "s"} left empty</Pill> : null}
        <span className="flex-1" />
        {f.applies ? <Button size="sm" variant={!latest || latest.out_of_date || latest.status === "FAILED" ? "default" : "secondary"} busy={working || (latest ? busy(latest) : false)} onClick={() => void generate()}>
          <RefreshCw aria-hidden />{latest ? "Generate a new copy" : "Generate a copy"}
        </Button> : null}
      </div>
      {/* Review M1: a copy locked before the form stopped applying stays the record of what was filed or uploaded back. */}
      {!f.applies ? <p className="text-[13px] text-text-muted [overflow-wrap:anywhere]" data-not-applying>This form no longer applies to {f.person}{f.applies_why ? `: ${f.applies_why}` : ""}. {locked?.locked ? `Its copy locked as “${LOCK_KINDS[locked.locked.kind]}” on ${when(locked.locked.at)} stays as it was; no new copy is filed.` : "Its copies are kept as they were, never filed."}</p> : null}
      {f.applies ? <p className="text-[13px] text-text-muted" data-draft-words>Declared or confirmed answers for {f.draft.written_now} of {f.draft.mapped} form fields{f.draft.to_fix ? `; ${f.draft.to_fix} answered but needing a fix ${f.draft.to_fix === 1 ? "stays" : "stay"} blank` : ""}. A copy also lists the form fields to write by hand.</p> : null}
      {f.applies && card.facts.length ? (
        <FoldOut className="text-[13px]" summaryClassName="flex min-h-6 items-center text-text-link" summary={<>Facts to answer or confirm ({card.facts.length})</>}>
          <ul className="mt-1 list-disc space-y-0.5 pl-6">{card.facts.map((m) => <li key={`${m.fact}|${m.about}`} data-missing-reason={m.reason}><span className="[overflow-wrap:anywhere]">{m.label}</span> <span className="text-text-muted [overflow-wrap:anywhere]">({inSentence(m.about)}): {m.reason === "left empty on the form" && m.why ? m.why : <>{m.reason}{m.why ? ` — ${m.why}` : ""}</>}</span></li>)}</ul>
        </FoldOut>
      ) : null}
      {/* QA-165 part 2 (P-237, P-238): each mandatory field of IRCC's form a copy leaves empty, with why, before the file is offered. */}
      {f.applies && f.fields_open?.length ? (
        <FoldOut className="text-[13px]" data-fields-open summaryClassName="flex min-h-6 items-center text-text-link" summary={<>Marked mandatory on IRCC's form, still empty ({openLines(f.fields_open).length}): Adobe's Validate asks for {openLines(f.fields_open).length === 1 ? "it" : "each"}, and may ask for more that its own checks make mandatory</>}>
          <ul className="mt-1 list-disc space-y-0.5 pl-6">{openLines(f.fields_open).map((o) => <li key={o.key}><span className="[overflow-wrap:anywhere]">{o.label}</span>{o.n > 1 ? <span className="text-text-muted"> ({o.n} form fields)</span> : null} <span className="text-text-muted [overflow-wrap:anywhere]">— {o.reason}: {o.why}</span></li>)}</ul>
        </FoldOut>
      ) : null}
      {latest ? <CopyLine c={latest} use={use} canLock={!!canLock} lockBlocked={lockBlocked} locking={locking} setLocking={setLocking} lock={lock} working={working} /> : null}
      {locked && locked !== latest ? <CopyLine c={locked} use={use} canLock={false} locking={null} setLocking={() => {}} lock={lock} working={working} /> : null}
      <SignSteps caseId={caseId} f={f} />
      {earlier.length ? (
        <FoldOut className="text-[13px]" summaryClassName="text-text-link" summary={<>Earlier copies ({earlier.length})</>}>
          <ul className="mt-1 space-y-1 pl-4">{earlier.map((c) => <li key={c.id}><CopyLine c={c} use={use} canLock={false} locking={null} setLocking={() => {}} lock={lock} working={working} compact /></li>)}</ul>
        </FoldOut>
      ) : null}
    </li>
  );
}

const FIRST = 5;
/** A list that may be long (38 newly confirmed facts): the first few, the rest behind "more". */
function Few({ items }: { items: string[] }) {
  if (items.length <= FIRST) return <>{items.join(", ")}</>;
  return <>{items.slice(0, FIRST).join(", ")} <FoldOut className="inline" summaryClassName="inline text-text-link" summary={<>and {items.length - FIRST} more</>}>{items.slice(FIRST).join(", ")}</FoldOut></>;
}

function CopyLine({ c, use = "file", canLock, lockBlocked = null, locking, setLocking, lock, working, compact }: { c: FormCopy; use?: CopyUse; canLock: boolean; lockBlocked?: string | null; locking: keyof typeof LOCK_KINDS | null; setLocking: (k: keyof typeof LOCK_KINDS | null) => void; lock: (id: string, k: keyof typeof LOCK_KINDS) => Promise<void>; working: boolean; compact?: boolean }) {
  const toast = useToast();
  const confirmRef = React.useRef<HTMLButtonElement>(null);
  const buttons = React.useRef<Partial<Record<keyof typeof LOCK_KINDS, HTMLButtonElement | null>>>({}), back = React.useRef<keyof typeof LOCK_KINDS | null>(null);
  // Keyboard (review M5, break m2): the confirmation takes the focus; Cancel gives it back to the button pressed (drawn
  // again once the confirmation closes, so it is found by its kind, not kept as an element).
  React.useEffect(() => {
    if (locking) confirmRef.current?.focus();
    else if (back.current) { buttons.current[back.current]?.focus(); back.current = null; }
  }, [locking]);
  const ask = (kind: keyof typeof LOCK_KINDS) => () => setLocking(kind);
  const cancel = () => { back.current = locking; setLocking(null); };
  async function download() {
    try {
      const r = await fetch(`/api/runtime/form-copies/${c.id}/file`, { headers: { "x-actor": getActor() } });
      if (!r.ok) throw new Error((await r.json().catch(() => null))?.detail ?? `${r.status} ${r.statusText}`);
      const url = URL.createObjectURL(await r.blob()), a = document.createElement("a");
      a.href = url; a.download = /filename="?([^";]+)/.exec(r.headers.get("content-disposition") ?? "")?.[1] ?? "copy.pdf"; a.click(); URL.revokeObjectURL(url);
    } catch (e) { toast.push({ tone: "danger", text: `The copy could not be downloaded: ${(e as Error).message}` }); }
  }
  return (
    <div className={compact ? "flex flex-wrap items-center gap-2" : "space-y-1.5 rounded-lg border border-border bg-surface px-3 py-2"}>
      <div className="flex flex-wrap items-center gap-2 text-[13px]">
        <CopyState c={c} use={use} />
        <span className="text-text-muted">Copy of {when(c.created_at)}{c.counts ? ` · ${c.counts.written} form fields written${c.counts.by_hand ? `, ${c.counts.by_hand} by hand` : ""}${c.counts.not_on_form ? `, ${c.counts.not_on_form} not on this form` : ""}` : ""}{c.intact ? " · read back and checked" : ""}</span>
        {c.status === "GENERATED" && c.file_ok ? <Button size="sm" variant="ghost" onClick={() => void download()} aria-label={`Download the copy of ${when(c.created_at)}`}><Download aria-hidden />Download</Button> : null}
        {c.status === "GENERATED" && !c.file_ok ? <Pill tone="danger" title="The file is missing from the working files">File missing</Pill> : null}
        {lockBlocked ? <>
          <Button size="sm" variant="secondary" disabled aria-describedby={`lock-why-${c.id}`}><Lock aria-hidden />Validated copy uploaded back</Button>
          <Button size="sm" variant="secondary" disabled aria-describedby={`lock-why-${c.id}`}><Lock aria-hidden />Filed</Button>
        </> : null}
        {canLock && !locking ? <>
          <Button ref={(b) => { buttons.current.validated_copy_uploaded = b; }} size="sm" variant="secondary" onClick={ask("validated_copy_uploaded")}><Lock aria-hidden />Validated copy uploaded back</Button>
          <Button ref={(b) => { buttons.current.filed = b; }} size="sm" variant="secondary" onClick={ask("filed")}><Lock aria-hidden />Filed</Button>
        </> : null}
      </div>
      {lockBlocked ? <p id={`lock-why-${c.id}`} className="text-[13px] text-text-muted">Not yet: {lockBlocked}</p> : null}
      {!compact && locking ? (
        <div role="group" aria-label="Lock this copy" className="flex flex-wrap items-center gap-2 text-[13px]">
          <span>Lock this copy as “{LOCK_KINDS[locking]}”? A locked copy never changes; a later answer marks it stale.</span>
          <Button ref={confirmRef} size="sm" busy={working} onClick={() => void lock(c.id, locking)}>Lock</Button>
          <Button size="sm" variant="ghost" onClick={cancel}>Cancel</Button>
        </div>
      ) : null}
      {/* QA-391: a kept copy (the form no longer applies) is never told to be made again or filed; a copy for checking only
          is never told "to file it". */}
      {!compact && c.stale ? <p className="flex items-start gap-1 text-[13px] text-text-warn"><AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden /><span>Facts changed after this copy was locked; the locked file is kept as it was. Added, changed or removed: <Few items={c.changed} />.</span></p>
        : !compact && c.out_of_date && use !== "kept" ? <p className="flex items-start gap-1 text-[13px] text-text-warn"><AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden /><span>{use === "check" ? "Facts changed since this copy was made; generate a new copy to check the current answers." : "Facts changed since this copy was made; generate a new copy to file it."} Added, changed or removed: <Few items={c.changed} />.</span></p> : null}
      {/* Review M3: a kept copy is never prepared further: no by-hand or not-on-form instructions. */}
      {!compact && use !== "kept" && c.status === "GENERATED" && c.by_hand.length ? <p className="text-[13px] text-text-muted">To write by hand in Adobe: <Few items={c.by_hand.map((b) => `${b.label}${b.why ? ` (${b.why})` : ""}`)} />.</p> : null}
      {/* B81: not "by hand": the form has no such choice to write. Who it is about comes first (the same words on many form fields). */}
      {!compact && use !== "kept" && c.status === "GENERATED" && c.not_on_form?.length ? <p className="text-[13px] text-text-warn" data-not-on-form>Not on this form: <Few items={c.not_on_form.map((b) => `${b.label}${b.person ? ` of ${b.person}` : ""}: ${b.why}`)} /></p> : null}
      {!compact && c.status === "FAILED" ? <p className="text-[13px] text-text-danger">{c.error}</p> : null}
      {!compact && use !== "kept" && c.status === "GENERATED" && c.person_steps.length ? <p className="text-[13px] text-text-muted">Before filing, on the PDF: {c.person_steps.join(" ")}</p> : null}
    </div>
  );
}
