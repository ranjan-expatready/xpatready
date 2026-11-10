// C8.1 Sign and scan, by screens (screens lane, M3 sprint row B3, journey J-B3; concept `product/screens/B3/concept.md`;
// prepare-tab concept r2 BR-2, BR-4, BR-10, BR-11; r5c BR-8, BR-10, BR-21; P-65, P-136, P-143; QA-251). Inside a form's
// row: who signs it (every form, from GET /prepare's `signers`, never worked out here), and on a form signed by hand and
// scanned its four steps in order: Printed (naming the copy) → Signed by hand → Signed scan received (by uploading the
// scan) → Uploaded to IRCC (once the filing is Ready to file). Only the next step has a button; a later one says
// "Cannot start yet" in the server's own words (stepRefusal, the one rule in engine/runtime/sign-order.ts). A stale page's
// refusal shows the server's words. Once the submission is recorded the block is read-only. Staff only. Types live here
// only (prepare-tab §2). US$0.
// B161 (Lead 34 on #1334; B132 #1278, P-380 Q3, P-348 (3)): a form signed in pen on Paper shows its Paper line's steps,
// Validated in Adobe (a barcode form) → Printed → Signed in pen → Mailed to IRCC, in SignBlock's layout; the case officer
// records Printed and Signed in pen on sign-steps.ts's route, and a step that cannot be done yet says why in the server's
// own words (penRefusal). Mail is not recorded in the product yet: it says so.
import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Circle, Upload } from "lucide-react";
import { api, ApiError, useApi, useToast } from "@/lib/api";
import { Button, Notice, Pill } from "@/components/ui/controls";
import { Skeleton } from "@/components/ui/skeleton";
import { SIGNATURE_WORDS, type Signature } from "../../../contracts/forms";
import { MAX_DOCUMENT_BYTES, MAX_DOCUMENT_MB } from "../../../contracts/documents";
import type { CaseForm } from "../../../contracts/runtime";
import { PEN_STEP_WORDS, PEN_STEPS, penRefusal, SIGN_STEPS, stepRefusal, type PenStepKey, type SignStepKey, type StepsDone } from "../../../engine/runtime/sign-order";
import { noRetryOnRefusal } from "./questionnaire";
import { useFirm } from "./team";
import { FoldOut } from "@/components/fold-out";

type PrepItem = { id: string; kind: string; form?: string; subject: string; person: string; filing: string; signature?: Signature; signed_by?: string | null; signers?: string[];
  state: string; reason?: string; replaces?: string | null; record?: string;
  /** B161: a Paper line's steps and its validated copy read back, as GET /prepare gives them (engine/runtime/prepare.ts paperLine). */
  steps?: PaperStep[]; validated?: { copy: string; at: string; current: boolean } | null; barcode_page?: boolean };
type PaperStep = { key: "validate" | "print" | "sign_in_pen" | "mail"; words: string; done: boolean | null; neededBefore?: string };
type Filing = { id: string; label: string; status: string; read_only?: boolean };
type PrepareView = { derived: boolean; filings: Filing[]; items: PrepItem[] };
type Step = { key: SignStepKey | PenStepKey; words: string; done: { at: string; by: string; copy?: string | null } | null };
type Scan = { id: string; file_name: string; media_type: string; size_bytes: number; sha256: string; uploaded_by: string; uploaded_at: string };
type ItemView = { id: string; form: string; sign_steps: Step[]; signed_scans: Scan[] };
type TeamView = { representative: { id: string; name: string } | null; officers: { id: string; name: string }[] };

/** The API's item states in words (C7.7, prepare-tab BR-4): only these, never one made up here. */
const STATE: Record<string, { words: string; tone: string }> = {
  to_do: { words: "To do", tone: "neutral" }, in_progress: { words: "In progress", tone: "info" }, ready: { words: "Ready", tone: "ok" }, done: { words: "Done", tone: "ok" },
  out_of_date: { words: "Out of date", tone: "warn" }, cannot_start: { words: "Cannot start yet", tone: "neutral" }, not_needed: { words: "Not needed", tone: "neutral" },
};
// The same date words as the copy block in the same row (forms.tsx), so "Printed: the copy of 7 Nov, 08:36" names it exactly.
const when = (at: string) => new Date(at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const size = (n: number) => (n < 1024 ? `${n} bytes` : n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);
const MEDIA_WORDS: Record<string, string> = { "application/pdf": "PDF", "image/jpeg": "JPEG", "image/png": "PNG" };
const focusLater = (el: () => HTMLElement | null | undefined) => requestAnimationFrame(() => el()?.focus());
const prepareKey = (caseId: string) => ["runtime", "view", caseId, "prepare"]; // the same key as the Ready to file panel's (one read)

/** BR-1: who signs, in words, from the server's `signers` (person · parent · principal · representative). */
function whoSigns(signers: string[], person: string, rep: string | null): string {
  const words = signers.map((s) => s === "person" ? person : s === "parent" ? `a parent, for ${person} (under 18)` : s === "principal" ? "the principal applicant, for the family"
    : s === "representative" ? `the representative of record${rep ? ` (${rep})` : " (not chosen yet on the case team)"}` : s);
  return words.length <= 1 ? words.join("") : `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}

/** The signing part of one form's row: who signs (every form), and the steps of a form signed by hand and scanned. */
export function SignSteps({ caseId, f }: { caseId: string; f: CaseForm }) {
  const { form, subject_id: subject, person } = f;
  const prep = useApi<PrepareView>(prepareKey(caseId), `/runtime/cases/${caseId}/prepare`, { retry: noRetryOnRefusal });
  const team = useApi<TeamView>(["runtime", "team", caseId], `/runtime/cases/${caseId}/team`, { retry: noRetryOnRefusal });
  // C9.2: when the signed copy is out of date the view lists the old signed scan as its own record; the item is the other.
  const item = prep.data?.items?.find((i) => i.kind === "form" && i.form === form && i.subject === subject && i.record !== "signed_scan");
  if (!item) return null; // a client (403), a view not derived yet, or a form not on the application: nothing to say here
  const rep = team.data?.representative?.name ?? null;
  const signers = item.signers ?? [];
  const method = item.signature ? SIGNATURE_WORDS[item.signature] : null;
  return (<>
    {item.signature ? (
      <p className="text-[13px]" data-who-signs={item.signature === "NONE" && item.signed_by === "none" ? "" : signers.join(",")}>
        {/* "No signature" chosen on the release's line (signedBy none) names nobody. A line whose way of signing is not set
            yet still names who signs by R7 (the person; a parent for a child, J7 5.8) and says the way is not set
            (readiness S1 warns "missing signature" until it is). */}
        <span className="text-text-muted">Who signs: </span>{item.signature === "NONE" && item.signed_by === "none" ? "nobody · No signature"
          : <>{signers.length ? <span className="[overflow-wrap:anywhere]">{whoSigns(signers, person, rep)}</span> : "not set on this form's line yet"}<span className="text-text-muted"> · {item.signature === "NONE" ? "how it is signed is not set on the release's line yet" : method}</span></>}
      </p>
    ) : null}
    {item.signature === "HAND_SCANNED" ? <SignBlock caseId={caseId} item={item} f={f} filing={prep.data!.filings.find((x) => x.id === item.filing)} /> : null}
    {item.signature === "PEN" && item.steps?.length ? <PenBlock caseId={caseId} item={item} f={f} filing={prep.data!.filings.find((x) => x.id === item.filing)} /> : null}
  </>);
}

function SignBlock({ caseId, item, f, filing }: { caseId: string; item: PrepItem; f: CaseForm; filing: Filing | undefined }) {
  const copies = f.copies;
  const qc = useQueryClient(), toast = useToast(), firm = useFirm();
  const team = useApi<TeamView>(["runtime", "team", caseId], `/runtime/cases/${caseId}/team`, { retry: noRetryOnRefusal }).data;
  const form = item.form ?? "";
  const q = useApi<ItemView>(["runtime", "view", caseId, "sign-item", item.id], `/runtime/items/${item.id}`, { retry: noRetryOnRefusal, refetchOnWindowFocus: true });
  const heading = React.useRef<HTMLHeadingElement>(null), next = React.useRef<HTMLDivElement>(null), file = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const [refusal, setRefusal] = React.useState<string | null>(null), [fileErr, setFileErr] = React.useState<string | null>(null);
  const nameOf = (id: string) => (team?.representative?.id === id ? team.representative.name : null) ?? team?.officers.find((o) => o.id === id)?.name ?? firm.data?.users.find((u) => u.id === id)?.name ?? "a person no longer on the firm's list"; // review m6: never a raw id
  const refresh = () => qc.invalidateQueries({ queryKey: ["runtime", "view", caseId] });
  /** After a step: read everything again, then (once the buttons are no longer busy) the focus goes to the next step's
   *  button, else the block's heading. */
  // Review Major 1 (b): the focus moves only once no button is busy (a busy button is disabled and cannot take it).
  const [focusTo, setFocusTo] = React.useState<"next" | "heading" | null>(null);
  React.useEffect(() => {
    if (!focusTo || busy) return;
    const to = focusTo; setFocusTo(null);
    focusLater(() => (to === "next" ? next.current?.querySelector<HTMLElement>("button:not([disabled])") : null) ?? heading.current);
  }, [focusTo, busy]);
  const after = async () => { await refresh(); setFocusTo("next"); };
  /** Break M2: before Signed by hand or the scan, the copies are read again; a printed copy whose facts changed since (a
   *  change made in another tab or by the client) is refused here in words, nothing sent. The server also refuses a step
   *  naming a copy that is not the one printed now (B130), so a tab read before a new print never signs it. True when refused. */
  async function printedCopyStale(): Promise<boolean> {
    const key = ["runtime", "view", caseId, "forms"];
    await qc.refetchQueries({ queryKey: key });
    const fresh = qc.getQueriesData<{ forms: CaseForm[] }>({ queryKey: key }).flatMap(([, d]) => d?.forms ?? []).find((x) => x.form === f.form && x.subject_id === f.subject_id);
    const copy = fresh?.copies.find((c) => c.id === done.print?.copy);
    if (!copy?.out_of_date) return false;
    await refresh();
    setRefusal(`The printed copy of ${form} is out of date: a fact on it changed since it was printed. Nothing was recorded. Print a new copy and have that one signed.`);
    setFocusTo("heading");
    return true;
  }
  async function run(key: SignStepKey, body: unknown, ok: string) {
    setBusy(true); setRefusal(null); setFileErr(null);
    try {
      if (key === "signed" && (await printedCopyStale())) return; await api(`/runtime/items/${item.id}/sign-steps/${key}`, { method: "POST", json: body }); toast.push({ tone: "ok", text: ok }); await after(); }
    catch (e) { await refresh(); setRefusal((e as Error).message); setFocusTo("heading"); } // BR-9: the server's own words (a 409 means the page was out of date)
    finally { setBusy(false); }
  }
  async function upload(f: File) {
    setRefusal(null); setFileErr(null);
    // BR-6: the size is checked here first (the server checks it again, and the type by the file's own bytes).
    const refuse = (words: string) => { setFileErr(words); if (file.current) file.current.value = ""; setFocusTo("next"); };
    if (f.size > MAX_DOCUMENT_BYTES) return refuse(`The file is larger than ${MAX_DOCUMENT_MB} MB. Nothing was stored.`);
    if (!f.size) return refuse("The file is empty. Nothing was stored.");
    setBusy(true);
    try {
      if (await printedCopyStale()) return;
      const fd = new FormData(); fd.append("file", f, f.name);
      if (done.print?.copy) fd.append("copy", done.print.copy); // B130: the printed copy this scan is of
      await api(`/runtime/items/${item.id}/signed-scan`, { method: "POST", body: fd });
      toast.push({ tone: "ok", text: `${form}: signed scan received` }); await after();
    } catch (e) {
      // A refusal about the file (its type, size, emptiness) stays on the upload; any other (the order, a stale page) under the block.
      if (e instanceof ApiError && [400, 413, 422].includes(e.status)) { setFileErr(e.message); setFocusTo("next"); }
      else { await refresh(); setRefusal((e as Error).message); setFocusTo("heading"); }
    } finally { setBusy(false); if (file.current) file.current.value = ""; }
  }

  const st = STATE[item.state] ?? { words: item.state.replace(/_/g, " "), tone: "neutral" };
  const steps = q.data?.sign_steps ?? [];
  const done: StepsDone = Object.fromEntries(steps.filter((s) => s.done).map((s) => [s.key, s.done!]));
  const nextKey = (SIGN_STEPS as readonly (SignStepKey | PenStepKey)[]).find((k) => !done[k]) ?? null;
  const copyOf = (id: string | null | undefined) => copies.find((c) => c.id === id);
  // BR-4 (challenge m2): the copy to print is the newest generated one: current, its file there, and not stamped "Copy,
  // not for filing"; otherwise the copy block's reason. A form whose filling is not proven yet is warned, not blocked
  // (EXPERIENCE §2.9; the checkpoint's IMM 5476 has no fill trial recorded): check the copy before it is signed.
  const latest = copies.find((c) => c.status === "GENERATED"), pending = copies[0] && (copies[0].status === "QUEUED" || copies[0].status === "RUNNING");
  const notFiled = !f.for_filing ? `${form} is filed Online: a PDF copy is not for filing, so it is not printed to sign.` : latest?.copy_not_for_filing ? `This copy was made while ${form} was filed Online, so it is stamped “Copy, not for filing”. Generate a new copy above and print that one.` : null;
  const unproven = f.trial_passed ? null : `${f.trial_why ?? `${form}: this form's filling is not proven yet.`} Check the copy against the case before it is signed.`;
  const current = latest && !latest.out_of_date && latest.file_ok && !notFiled ? latest : null;
  // BR-8 (C9.2; challenge M1): a new print starts the signing again exactly when the server allows it (sign-steps.ts
  // `restart`): Printed done, Uploaded to IRCC not, and the printed copy's facts changed since (its copy reads Out of date,
  // the same test), or the view asks for a new signed copy (`replaces`). Then Signed by hand and the upload are not
  // offered. Once uploaded to IRCC nothing is signed again here: the reason only.
  const printed = copyOf(done.print?.copy);
  const again = !!done.print && !done.uploaded_to_ircc && (!!item.replaces || !!printed?.out_of_date);
  const ready = filing?.status.toLowerCase() === "ready_to_file";
  // Challenge M2: once the submission is recorded the application is read-only: the steps done stay, no button.
  const recorded = !!filing?.read_only || filing?.status.toLowerCase() === "submitted";
  const blockId = `sign-${item.id}`;

  /** The print action, or why it cannot be done yet (BR-4): the newest generated copy that is still current. */
  const printAction = (label: string) => current
    ? <div className="space-y-1">{unproven ? <p className="text-[13px] text-text-warn" data-unproven>{unproven}</p> : null}<Button size="sm" busy={busy} onClick={() => void run("print", { copy: current.id }, `${form}: Printed (copy of ${when(current.created_at)})`)} data-step-action="print">{label} {when(current.created_at)}</Button></div>
    : <p className="text-[13px] text-text-muted" data-step-why>{pending ? "The copy is being generated…" : notFiled ? notFiled : latest?.out_of_date ? `This copy is out of date: generate a new copy of ${form} above and print that one.` : latest && !latest.file_ok ? `The file of the newest copy of ${form} is missing: generate a new copy above.` : `Generate a copy of ${form} above first: the copy printed is named here.`}</p>;

  function action(key: SignStepKey) {
    if (key === "print") return <div className="space-y-1">{current ? <p className="text-[13px] text-text-muted">Download the copy above, print it, then record it here.</p> : null}{printAction("Printed: the copy of")}</div>;
    if (key === "signed") return <Button size="sm" busy={busy} onClick={() => void run("signed", { copy: done.print?.copy ?? undefined }, `${form}: Signed by hand`)} data-step-action="signed">Signed by hand</Button>;
    if (key === "scan_received") return (
      <div className="space-y-1">
        <input ref={file} type="file" accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" className="sr-only" tabIndex={-1} aria-hidden aria-label={`Signed scan of ${form}`} data-scan-input
          onChange={(e) => { const x = e.target.files?.[0]; if (x) void upload(x); }} />
        <Button size="sm" busy={busy} onClick={() => file.current?.click()} aria-describedby={`${blockId}-scan-note`} aria-invalid={fileErr ? true : undefined} data-step-action="scan_received"><Upload aria-hidden />Upload the signed scan…</Button>
        {fileErr ? <p id={`${blockId}-scan-note`} role="alert" className="text-[13px] text-text-danger [overflow-wrap:anywhere]" data-scan-error>{fileErr}</p>
          : <p id={`${blockId}-scan-note`} className="text-[13px] text-text-muted">The signed scan of {form}: PDF, JPEG or PNG, up to {MAX_DOCUMENT_MB} MB. It is kept as uploaded, with its checksum.</p>}
      </div>
    );
    // BR-7: "Uploaded to IRCC" only once the filing is Ready to file (the server reads it again and refuses otherwise).
    return ready ? <Button size="sm" busy={busy} onClick={() => void run("uploaded_to_ircc", { copy: done.print?.copy ?? undefined }, `${form}: Uploaded to IRCC`)} data-step-action="uploaded_to_ircc">Uploaded to IRCC</Button>
      : <p className="text-[13px] text-text-muted" data-step-why>Cannot start yet: {stepRefusal("uploaded_to_ircc", done, form, { viaUpload: true, filingReady: false })}{" "}
          <button type="button" className="text-text-link underline underline-offset-2" onClick={() => focusLater(() => document.getElementById("readiness-h"))}>Go to Ready to file</button></p>;
  }

  function detail(s: Step) {
    if (!s.done) return null;
    // Challenge m1: the officer records a step; the signers sign (there is no signing for the client, C8.1-12).
    const by = <span className="text-text-muted">recorded by {nameOf(s.done.by)}, {when(s.done.at)}</span>;
    if (s.key === "print") { const c = copyOf(s.done.copy); return <>{c ? <>Copy of {when(c.created_at)} · </> : null}{by}</>; }
    // Break M1: the record holds who recorded it, not who signed: the signers are today's "Who signs" line above, never
    // written here (they change with the case team).
    if (s.key === "scan_received") {
      const x = q.data?.signed_scans[q.data.signed_scans.length - 1];
      return <>{x ? <span data-scan-file><span className="[overflow-wrap:anywhere]">{x.file_name}</span> · {MEDIA_WORDS[x.media_type] ?? x.media_type} · {size(x.size_bytes)} · </span> : null}{by}
        {/* Challenge m6: the checksum reachable by keyboard, off the main line (EXPERIENCE §5: no hashes on the main path). */}
        {x ? <FoldOut className="mt-0.5" summaryClassName="inline-flex min-h-6 items-center text-text-link" summary="Checksum"><span className="mono break-all text-text-muted">SHA-256 {x.sha256}</span></FoldOut> : null}</>;
    }
    return by;
  }

  return (
    <section aria-labelledby={`${blockId}-h`} className="space-y-2 rounded-lg border border-border bg-surface px-3 py-2" data-sign-block={item.id} data-state={item.state}>
      <div className="flex flex-wrap items-center gap-2">
        <h4 ref={heading} id={`${blockId}-h`} tabIndex={-1} className="text-[13px] font-semibold outline-none">Sign and scan</h4>
        <Pill tone={st.tone} title="This form's state on the application">{st.words}</Pill>
        {item.reason && !recorded ? <span className="min-w-0 flex-1 text-[13px] text-text-muted [overflow-wrap:anywhere]" data-reason>{item.reason}</span> : null}
      </div>
      <p className="text-[13px] text-text-muted">Signed by hand and scanned: print the copy, have it signed, upload the scan. Each step is recorded with who and when.</p>
      {refusal ? <div data-sign-refusal><Notice tone="danger" title="Not recorded"><p className="[overflow-wrap:anywhere]">{refusal}</p></Notice></div> : null}
      {q.isLoading ? <><Skeleton className="h-16 w-full" /><span className="sr-only" role="status">Loading the signing steps of {form}…</span></>
        : q.isError ? <Notice tone="danger" title="The signing steps could not be loaded" action={<Button size="sm" variant="secondary" onClick={() => void q.refetch()}>Retry</Button>}>{(q.error as Error).message}</Notice>
        : <>
          {recorded ? <p className="text-[13px] text-text-muted" data-sign-readonly>The submission is recorded: this application is read-only.{done.uploaded_to_ircc ? "" : ` "Uploaded to IRCC" was not ticked for ${form} before it was recorded.`}</p> : null}
          {again && !recorded ? (
            <div className="space-y-1 rounded-md border border-border px-2 py-1.5" data-sign-again>
              <p className="text-[13px] text-text-warn">{done.scan_received ? `The signed ${form} is out of date: print a new copy, have it signed and upload the new scan. The earlier scan is kept.` : `The printed copy of ${form} is out of date: a fact on it changed. Print a new copy and have that one signed.`}</p>
              {printAction("Printed: the new copy of")}
            </div>
          ) : null}
          <ol className="space-y-1.5">{steps.map((s, i) => {
            const isNext = s.key === nextKey && !again && !recorded;
            const why = !s.done && !isNext && !again && !recorded ? stepRefusal(s.key as SignStepKey, done, form, { viaUpload: true, filingReady: true }) : null;
            return (
              <li key={s.key} className="flex flex-wrap items-start gap-x-3 gap-y-1 text-[13px]" data-step={s.key} data-done={s.done ? "yes" : "no"}>
                <span className="flex items-center gap-1.5 font-medium sm:min-w-48">
                  {s.done ? <Check className="size-3.5 text-text-ok" aria-hidden /> : <Circle className="size-3.5 text-text-muted" aria-hidden />}
                  <span>{i + 1}. {s.words}</span><span className="sr-only">{s.done ? ": done" : isNext ? ": next" : ": not yet"}</span>
                </span>
                <div className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                  {s.done ? detail(s) : isNext ? <div ref={next}>{action(s.key as SignStepKey)}</div> : why ? <span className="text-text-muted" data-step-why>Cannot start yet: {why}</span> : null}
                </div>
              </li>
            );
          })}</ol>
        </>}
    </section>
  );
}

/** B161: the label of each Paper step; the line's own words (paperLine) say what to do under it. */
const PAPER_LABEL: Record<PaperStep["key"], string> = { validate: "Validated in Adobe", print: PEN_STEP_WORDS.print, sign_in_pen: PEN_STEP_WORDS.sign_in_pen, mail: "Mailed to IRCC" };

/** B161: a form signed in pen on Paper. The rows are the Paper line's steps from GET /prepare (Validate for a barcode form,
 *  Printed, Signed in pen, Mail); who recorded Printed and Signed in pen, and when, come from the item read. Only the next
 *  recordable step has a button; a later one says "Cannot start yet" in penRefusal's words, the server's own (sign-order.ts). */
function PenBlock({ caseId, item, f, filing }: { caseId: string; item: PrepItem; f: CaseForm; filing: Filing | undefined }) {
  const qc = useQueryClient(), toast = useToast(), firm = useFirm();
  const team = useApi<TeamView>(["runtime", "team", caseId], `/runtime/cases/${caseId}/team`, { retry: noRetryOnRefusal }).data;
  const form = item.form ?? "";
  const q = useApi<ItemView>(["runtime", "view", caseId, "sign-item", item.id], `/runtime/items/${item.id}`, { retry: noRetryOnRefusal, refetchOnWindowFocus: true });
  const heading = React.useRef<HTMLHeadingElement>(null), next = React.useRef<HTMLDivElement>(null);
  const [busy, setBusy] = React.useState(false), [refusal, setRefusal] = React.useState<string | null>(null);
  const [focusTo, setFocusTo] = React.useState<"next" | "heading" | null>(null);
  React.useEffect(() => {
    if (!focusTo || busy) return;
    const to = focusTo; setFocusTo(null);
    focusLater(() => (to === "next" ? next.current?.querySelector<HTMLElement>("button:not([disabled])") : null) ?? heading.current);
  }, [focusTo, busy]);
  const nameOf = (id: string) => (team?.representative?.id === id ? team.representative.name : null) ?? team?.officers.find((o) => o.id === id)?.name ?? firm.data?.users.find((u) => u.id === id)?.name ?? "a person no longer on the firm's list";
  const refresh = () => qc.invalidateQueries({ queryKey: ["runtime", "view", caseId] });
  async function run(key: PenStepKey, body: unknown, ok: string) {
    setBusy(true); setRefusal(null);
    try {
      if (key === "sign_in_pen" && !barcode && (await printedCopyStale())) return;
      await api(`/runtime/items/${item.id}/sign-steps/${key}`, { method: "POST", json: body }); toast.push({ tone: "ok", text: ok }); await refresh(); setFocusTo("next"); }
    catch (e) { await refresh(); setRefusal((e as Error).message); setFocusTo("heading"); } // the server's own words (a 409 means the page was out of date)
    finally { setBusy(false); }
  }

  const st = STATE[item.state] ?? { words: item.state.replace(/_/g, " "), tone: "neutral" };
  const recordedSteps = q.data?.sign_steps ?? [];
  const raw: StepsDone = Object.fromEntries(recordedSteps.filter((s) => s.done).map((s) => [s.key, s.done!]));
  const barcode = !!item.barcode_page, v = item.validated ?? null;
  // Review Major 1: the steps that count are the server's (case-prepare.ts, B132): on a barcode form only those done on its
  // current validated copy. A fact changed after Printed makes the validated copy not current, so nothing counts and no
  // Signed in pen is offered until a new validated copy is read back and printed.
  const counts = !barcode || (!!v?.current && raw.print?.copy === v.copy);
  const done: StepsDone = counts ? raw : {};
  const rec = (k: PenStepKey) => (counts ? done[k] ?? null : null);
  const copyOf = (id: string | null | undefined) => f.copies.find((c) => c.id === id);
  // The copy to print: a barcode form's current validated copy (it holds the barcode page; the server prints no other),
  // else, as SignBlock's (review m2), the newest generated copy that is current, for filing and with its file.
  const latest = f.copies.find((c) => c.status === "GENERATED"), pending = f.copies[0] && (f.copies[0].status === "QUEUED" || f.copies[0].status === "RUNNING");
  const notFiled = !f.for_filing ? `${form} is filed Online: a PDF copy is not for filing, so it is not printed to sign.` : latest?.copy_not_for_filing ? `This copy was made while ${form} was filed Online, so it is stamped “Copy, not for filing”. Generate a new copy above and print that one.` : null;
  const unproven = f.trial_passed ? null : `${f.trial_why ?? `${form}: this form's filling is not proven yet.`} Check the copy against the case before it is signed.`;
  const vAt = v ? copyOf(v.copy)?.created_at ?? v.at : null; // review m1: the copy's own date, as the done row names it
  const toPrint = barcode ? (v?.current ? { id: v.copy, at: vAt! } : null) : latest && !latest.out_of_date && latest.file_ok && !notFiled ? { id: latest.id, at: latest.created_at } : null;
  const notYet = barcode ? penRefusal("print", {}, form, { barcode, validated: false })
    : pending ? "the copy is being generated…" : notFiled ? notFiled : latest?.out_of_date ? `this copy is out of date: generate a new copy of ${form} above and print that one.` : latest && !latest.file_ok ? `the file of the newest copy of ${form} is missing: generate a new copy above.` : `generate a copy of ${form} above first: the copy printed is named here.`;
  // The server prints again (its `restart`) when the printed copy is no longer the current validated one, or its facts changed.
  const again = !!raw.print && (barcode ? !!v?.current && raw.print.copy !== v.copy : !!copyOf(raw.print.copy)?.out_of_date);
  /** Review m3 (SignBlock's printedCopyStale): before Signed in pen on a form with no barcode page, the copies are read
   *  again; a printed copy whose facts changed since is refused here in words, nothing sent. True when refused. */
  async function printedCopyStale(): Promise<boolean> {
    const key = ["runtime", "view", caseId, "forms"];
    await qc.refetchQueries({ queryKey: key });
    const fresh = qc.getQueriesData<{ forms: CaseForm[] }>({ queryKey: key }).flatMap(([, d]) => d?.forms ?? []).find((x) => x.form === f.form && x.subject_id === f.subject_id);
    if (!fresh?.copies.find((c) => c.id === raw.print?.copy)?.out_of_date) return false;
    await refresh();
    setRefusal(`The printed copy of ${form} is out of date: a fact on it changed since it was printed. Nothing was recorded. Print a new copy and have that one signed in pen.`);
    setFocusTo("heading");
    return true;
  }
  const recorded = !!filing?.read_only || filing?.status.toLowerCase() === "submitted";
  const nextKey = PEN_STEPS.find((k) => !done[k]) ?? null;
  const blockId = `pen-${item.id}`;
  const printLabel = barcode ? "Printed: the validated copy of" : "Printed: the copy of";
  const printAction = (label: string) => toPrint
    ? <Button size="sm" busy={busy} onClick={() => void run("print", { copy: toPrint.id }, `${form}: Printed (copy of ${when(toPrint.at)})`)} data-step-action="print">{label} {when(toPrint.at)}</Button>
    : <p className="text-[13px] text-text-muted" data-step-why>Cannot start yet: {notYet}</p>;
  function action(key: PenStepKey) {
    if (key === "print") return <div className="space-y-1">{toPrint && !barcode && unproven ? <p className="text-[13px] text-text-warn" data-unproven>{unproven}</p> : null}{toPrint ? <p className="text-[13px] text-text-muted">Download the copy above, print it{barcode ? " with the barcode page on top" : ""}, then record it here.</p> : null}{printAction(printLabel)}</div>;
    return <Button size="sm" busy={busy} onClick={() => void run("sign_in_pen", { copy: done.print?.copy ?? undefined }, `${form}: Signed in pen`)} data-step-action="sign_in_pen">Signed in pen</Button>;
  }
  function row(s: PaperStep, i: number) {
    const pen = s.key === "print" || s.key === "sign_in_pen" ? (s.key as PenStepKey) : null;
    const r = pen ? rec(pen) : null, isDone = pen ? !!r : s.done === true;
    // A step recorded on a copy that no longer counts (a fact changed, or a newer validated copy) says so; it is not ticked.
    const old = pen && !r && raw[pen] ? raw[pen]! : null;
    const isNext = !!pen && pen === nextKey && !again && !recorded;
    const why = pen && !isDone && !isNext && !again && !recorded ? penRefusal(pen, done, form, { barcode, validated: !!v?.current }) : null;
    const by = r ? <span className="text-text-muted">recorded by {nameOf(r.by)}, {when(r.at)}</span> : null;
    const earlier = old ? <span className="block text-text-muted" data-step-old>Recorded on an earlier copy by {nameOf(old.by)}, {when(old.at)}: it no longer counts.</span> : null;
    const detail = s.key === "validate" ? (isDone && v ? <span className="text-text-muted">validated copy of {when(vAt ?? v.at)}, read back {when(v.at)}</span> : <span className="text-text-muted">{s.words}. It is read back in the copy block above.</span>)
      : s.key === "mail" ? <span className="text-text-muted" data-step-why>{s.words}. It is not recorded in the product yet.</span>
      : isDone ? <>{s.key === "print" && r?.copy ? <>Copy of {when(copyOf(r.copy)?.created_at ?? (v?.copy === r.copy ? v.at : r.at))} · </> : null}{by}</>
      : isNext ? <div ref={next} className="space-y-1">{earlier}<p className="text-[13px] text-text-muted">{s.words}.</p>{action(pen!)}</div>
      : <>{earlier}{why ? <span className="text-text-muted" data-step-why>Cannot start yet: {why}</span> : <span className="text-text-muted">{s.words}.</span>}</>;
    return (
      <li key={s.key} className="flex flex-wrap items-start gap-x-3 gap-y-1 text-[13px]" data-step={s.key} data-done={isDone ? "yes" : "no"}>
        <span className="flex items-center gap-1.5 font-medium sm:min-w-48">
          {isDone ? <Check className="size-3.5 text-text-ok" aria-hidden /> : <Circle className="size-3.5 text-text-muted" aria-hidden />}
          <span>{i + 1}. {PAPER_LABEL[s.key]}</span><span className="sr-only">{isDone ? ": done" : isNext ? ": next" : ": not yet"}</span>
        </span>
        <div className="min-w-0 flex-1 [overflow-wrap:anywhere]">{detail}</div>
      </li>
    );
  }

  return (
    <section aria-labelledby={`${blockId}-h`} className="space-y-2 rounded-lg border border-border bg-surface px-3 py-2" data-pen-block={item.id} data-state={item.state}>
      <div className="flex flex-wrap items-center gap-2">
        <h4 ref={heading} id={`${blockId}-h`} tabIndex={-1} className="text-[13px] font-semibold outline-none">Print and sign in pen</h4>
        <Pill tone={st.tone} title="This form's state on the application">{st.words}</Pill>
        {item.reason && !recorded ? <span className="min-w-0 flex-1 text-[13px] text-text-muted [overflow-wrap:anywhere]" data-reason>{item.reason}</span> : null}
      </div>
      <p className="text-[13px] text-text-muted">On Paper, signed in pen. Printed and Signed in pen are recorded here with who and when.</p>
      {refusal ? <div data-sign-refusal><Notice tone="danger" title="Not recorded"><p className="[overflow-wrap:anywhere]">{refusal}</p></Notice></div> : null}
      {q.isLoading ? <><Skeleton className="h-16 w-full" /><span className="sr-only" role="status">Loading the signing steps of {form}…</span></>
        : q.isError ? <Notice tone="danger" title="The signing steps could not be loaded" action={<Button size="sm" variant="secondary" onClick={() => void q.refetch()}>Retry</Button>}>{(q.error as Error).message}</Notice>
        : <>
          {recorded ? <p className="text-[13px] text-text-muted" data-sign-readonly>The submission is recorded: this application is read-only.</p> : null}
          {again && !recorded ? (
            <div className="space-y-1 rounded-md border border-border px-2 py-1.5" data-sign-again>
              <p className="text-[13px] text-text-warn">{barcode ? `A newer validated copy of ${form} was read back since it was printed: print that one and have it signed in pen.` : `The printed copy of ${form} is out of date: a fact on it changed. Print a new copy and have that one signed in pen.`}</p>
              {printAction(barcode ? "Printed: the new validated copy of" : "Printed: the new copy of")}
            </div>
          ) : null}
          <ol className="space-y-1.5">{(item.steps ?? []).map(row)}</ol>
        </>}
    </section>
  );
}
