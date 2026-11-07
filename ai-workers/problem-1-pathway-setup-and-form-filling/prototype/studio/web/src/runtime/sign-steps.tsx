// C8.1 Sign and scan, by screens (screens lane, M3 sprint row B3, journey J-B3; concept `product/screens/B3/concept.md`;
// prepare-tab concept r2 BR-2, BR-4, BR-10, BR-11; r5c BR-8, BR-10, BR-21; P-65, P-136, P-143; QA-251). Inside a form's
// row: who signs it (every form, from GET /prepare's `signers`, never worked out here), and on a form signed by hand and
// scanned its four steps in order: Printed (naming the copy) → Signed by hand → Signed scan received (by uploading the
// scan) → Uploaded to IRCC (once the filing is Ready to file). Only the next step has a button; a later one says
// "Cannot start yet" in the server's own words (as engine/runtime/signing.ts stepRefusal). A stale page's
// refusal shows the server's words. Staff only. Types live here only (prepare-tab §2). US$0.
import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Circle, Upload } from "lucide-react";
import { api, ApiError, useApi, useToast } from "@/lib/api";
import { Button, Notice, Pill } from "@/components/ui/controls";
import { Skeleton } from "@/components/ui/skeleton";
import { SIGNATURE_WORDS, type Signature } from "../../../contracts/forms";
import { MAX_DOCUMENT_BYTES, MAX_DOCUMENT_MB } from "../../../contracts/documents";
import type { FormCopy } from "../../../contracts/runtime";
import { noRetryOnRefusal } from "./questionnaire";
import { useFirm } from "./team";

// The step keys and the waiting words of engine/runtime/signing.ts (SIGN_STEPS, stepRefusal). That file is not imported:
// it reads engine/runtime/case.ts, which loads files from disk (node:fs) and cannot run in the browser. The step words
// come from the server's own read (GET /runtime/items/:id), and the browser check proves the waiting words here equal
// the server's refusal for the same step (tests/check_c81_sign_browser.ts).
type SignStepKey = "print" | "signed" | "scan_received" | "uploaded_to_ircc";
type StepsDone = Partial<Record<SignStepKey, { at: string; by: string; copy?: string | null }>>;
const SIGN_STEPS: SignStepKey[] = ["print", "signed", "scan_received", "uploaded_to_ircc"];
/** Why a step cannot be done yet, in the server's words (stepRefusal's order and Ready to file lines), or null. */
function stepRefusal(key: SignStepKey, done: StepsDone, words: Record<string, string>, form: string, opts: { filingReady: boolean }): string | null {
  const i = SIGN_STEPS.indexOf(key), before = SIGN_STEPS[i - 1];
  if (before && !done[before]) return `${words[key]} comes after "${words[before]}": ${before === "print" ? `print ${form} first` : before === "signed" ? `mark ${form} signed by hand first` : `upload the signed scan of ${form} first`}.`;
  if (key === "uploaded_to_ircc" && !opts.filingReady) return `${form} is uploaded to IRCC only once its filing is Ready to file.`;
  return null;
}

type PrepItem = { id: string; kind: string; form?: string; subject: string; person: string; filing: string; signature?: Signature; signers?: string[];
  state: string; reason?: string; replaces?: string | null; record?: string };
type PrepareView = { derived: boolean; filings: { id: string; label: string; status: string }[]; items: PrepItem[] };
type Step = { key: SignStepKey; words: string; done: { at: string; by: string; copy?: string | null } | null };
type Scan = { id: string; file_name: string; media_type: string; size_bytes: number; sha256: string; uploaded_by: string; uploaded_at: string };
type ItemView = { id: string; form: string; sign_steps: Step[]; signed_scans: Scan[] };
type TeamView = { representative: { id: string; name: string } | null; officers: { id: string; name: string }[] };

/** The API's item states in words (C7.7, prepare-tab BR-4): only these, never one made up here. */
const STATE: Record<string, { words: string; tone: string }> = {
  to_do: { words: "To do", tone: "neutral" }, in_progress: { words: "In progress", tone: "info" }, ready: { words: "Ready", tone: "ok" }, done: { words: "Done", tone: "ok" },
  out_of_date: { words: "Out of date", tone: "warn" }, cannot_start: { words: "Cannot start yet", tone: "neutral" }, not_needed: { words: "Not needed", tone: "neutral" },
};
const when = (at: string) => new Date(at).toLocaleString("en-CA", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const size = (n: number) => (n < 1024 ? `${n} bytes` : n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);
const MEDIA_WORDS: Record<string, string> = { "application/pdf": "PDF", "image/jpeg": "JPEG", "image/png": "PNG" };
const focusLater = (el: () => HTMLElement | null | undefined) => requestAnimationFrame(() => el()?.focus());
const prepareKey = (caseId: string) => ["runtime", "view", caseId, "prepare"]; // the same key as the Ready to file panel's (one read)

/** BR-1: who signs, in words, from the server's `signers` (person · parent · principal · representative). */
function whoSigns(signers: string[], person: string, rep: string | null): string {
  const words = signers.map((s) => s === "person" ? person : s === "parent" ? `a parent, for ${person} (under 18)` : s === "principal" ? "the principal applicant, for the family"
    : s === "representative" ? `the representative of record${rep ? ` (${rep})` : ""}` : s);
  return words.length <= 1 ? words.join("") : `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}

/** The signing part of one form's row: who signs (every form), and the steps of a form signed by hand and scanned. */
export function SignSteps({ caseId, form, subject, person, copies }: { caseId: string; form: string; subject: string; person: string; copies: FormCopy[] }) {
  const prep = useApi<PrepareView>(prepareKey(caseId), `/runtime/cases/${caseId}/prepare`, { retry: noRetryOnRefusal });
  const team = useApi<TeamView>(["runtime", "team", caseId], `/runtime/cases/${caseId}/team`, { retry: noRetryOnRefusal });
  // C9.2: when the signed copy is out of date the view lists the old signed scan as its own record; the item is the other.
  const item = prep.data?.items?.find((i) => i.kind === "form" && i.form === form && i.subject === subject && i.record !== "signed_scan");
  if (!item) return null; // a client (403), a view not derived yet, or a form not on the application: nothing to say here
  const rep = team.data?.representative?.name ?? null;
  const signers = item.signers ?? [];
  const method = item.signature ? SIGNATURE_WORDS[item.signature] : null;
  return (<>
    {signers.length || item.signature === "NONE" ? (
      <p className="text-[13px]" data-who-signs={signers.join(",")}>
        <span className="text-text-muted">Who signs: </span>{signers.length ? <span className="[overflow-wrap:anywhere]">{whoSigns(signers, person, rep)}</span> : "nobody"}{method ? <span className="text-text-muted"> · {method}</span> : null}
      </p>
    ) : null}
    {item.signature === "HAND_SCANNED" ? <SignBlock caseId={caseId} item={item} copies={copies} filing={prep.data!.filings.find((f) => f.id === item.filing)} /> : null}
  </>);
}

function SignBlock({ caseId, item, copies, filing }: { caseId: string; item: PrepItem; copies: FormCopy[]; filing: { id: string; label: string; status: string } | undefined }) {
  const qc = useQueryClient(), toast = useToast(), firm = useFirm();
  const team = useApi<TeamView>(["runtime", "team", caseId], `/runtime/cases/${caseId}/team`, { retry: noRetryOnRefusal }).data;
  const form = item.form ?? "";
  const q = useApi<ItemView>(["runtime", "view", caseId, "sign-item", item.id], `/runtime/items/${item.id}`, { retry: noRetryOnRefusal });
  const heading = React.useRef<HTMLHeadingElement>(null), next = React.useRef<HTMLDivElement>(null), file = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const [refusal, setRefusal] = React.useState<string | null>(null), [fileErr, setFileErr] = React.useState<string | null>(null);
  const nameOf = (id: string) => (team?.representative?.id === id ? team.representative.name : null) ?? team?.officers.find((o) => o.id === id)?.name ?? firm.data?.users.find((u) => u.id === id)?.name ?? id;
  const refresh = () => qc.invalidateQueries({ queryKey: ["runtime", "view", caseId] });
  /** After a step: read everything again, then the focus goes to the next step's button, else the block's heading. */
  const after = async () => { await refresh(); focusLater(() => next.current?.querySelector<HTMLElement>("button:not([disabled])") ?? heading.current); };
  async function run(key: SignStepKey, body: unknown, ok: string) {
    setBusy(true); setRefusal(null); setFileErr(null);
    try { await api(`/runtime/items/${item.id}/sign-steps/${key}`, { method: "POST", json: body }); toast.push({ tone: "ok", text: ok }); await after(); }
    catch (e) { await refresh(); setRefusal((e as Error).message); focusLater(() => heading.current); } // BR-9: the server's own words (a 409 means the page was out of date)
    finally { setBusy(false); }
  }
  async function upload(f: File) {
    setRefusal(null); setFileErr(null);
    // BR-6: the size is checked here first (the server checks it again, and the type by the file's own bytes).
    if (f.size > MAX_DOCUMENT_BYTES) { setFileErr(`The file is larger than ${MAX_DOCUMENT_MB} MB. Nothing was stored.`); focusLater(() => next.current?.querySelector<HTMLElement>("button")); return; }
    if (!f.size) { setFileErr("The file is empty. Nothing was stored."); focusLater(() => next.current?.querySelector<HTMLElement>("button")); return; }
    setBusy(true);
    try {
      const fd = new FormData(); fd.append("file", f, f.name);
      await api(`/runtime/items/${item.id}/signed-scan`, { method: "POST", body: fd });
      toast.push({ tone: "ok", text: `${form}: signed scan received` }); await after();
    } catch (e) {
      // A refusal about the file (its type, size, emptiness) stays on the upload; any other (the order, a stale page) under the block.
      if (e instanceof ApiError && [400, 413, 422].includes(e.status)) { setFileErr(e.message); focusLater(() => next.current?.querySelector<HTMLElement>("button")); }
      else { await refresh(); setRefusal((e as Error).message); focusLater(() => heading.current); }
    } finally { setBusy(false); if (file.current) file.current.value = ""; }
  }

  const st = STATE[item.state] ?? { words: item.state.replace(/_/g, " "), tone: "neutral" };
  const steps = q.data?.sign_steps ?? [];
  const stepWords: Record<string, string> = Object.fromEntries(steps.map((s) => [s.key, s.words]));
  const done: StepsDone = Object.fromEntries(steps.filter((s) => s.done).map((s) => [s.key, s.done!]));
  const nextKey = SIGN_STEPS.find((k) => !done[k]) ?? null;
  const latest = copies[0];
  const copyOf = (id: string | null | undefined) => copies.find((c) => c.id === id);
  const current = latest && latest.status === "GENERATED" && !latest.out_of_date ? latest : null;
  // BR-8 (C9.2): the signed copy is out of date and not yet uploaded to IRCC: a new print starts its signing again (the
  // server supersedes the earlier steps, keeping the earlier scan). Once uploaded, nothing is signed again here (C8.2).
  const again = !!done.print && !done.uploaded_to_ircc && (!!item.replaces || item.state === "out_of_date");
  const ready = filing?.status.toLowerCase() === "ready_to_file";
  const blockId = `sign-${item.id}`;

  /** The print action, or why it cannot be done yet (BR-4): the newest generated copy that is still current. */
  const printAction = (label: string) => current
    ? <Button size="sm" busy={busy} onClick={() => void run("print", { copy: current.id }, `${form}: Printed (copy of ${when(current.created_at)})`)} data-step-action="print">{label} {when(current.created_at)}</Button>
    : <p className="text-[13px] text-text-muted" data-step-why>{latest && (latest.status === "QUEUED" || latest.status === "RUNNING") ? "The copy is being generated…" : latest?.out_of_date ? `This copy is out of date: generate a new copy of ${form} above and print that one.` : `Generate a copy of ${form} above first: the copy printed is named here.`}</p>;

  function action(key: SignStepKey) {
    if (key === "print") return <div className="space-y-1"><p className="text-[13px] text-text-muted">Download the copy above, print it, then record it here.</p>{printAction("Printed: the copy of")}</div>;
    if (key === "signed") return <Button size="sm" busy={busy} onClick={() => void run("signed", {}, `${form}: Signed by hand`)} data-step-action="signed">Signed by hand</Button>;
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
    return ready ? <Button size="sm" busy={busy} onClick={() => void run("uploaded_to_ircc", {}, `${form}: Uploaded to IRCC`)} data-step-action="uploaded_to_ircc">Uploaded to IRCC</Button>
      : <p className="text-[13px] text-text-muted" data-step-why>Cannot start yet: {stepRefusal("uploaded_to_ircc", done, stepWords, form, { filingReady: false })}{" "}
          <button type="button" className="text-text-link underline underline-offset-2" onClick={() => focusLater(() => document.getElementById("readiness-h"))}>Go to Ready to file</button></p>;
  }

  function detail(s: Step) {
    if (!s.done) return null;
    const by = <span className="text-text-muted">by {nameOf(s.done.by)}, {when(s.done.at)}</span>;
    if (s.key === "print") { const c = copyOf(s.done.copy); return <>{c ? <>Copy of {when(c.created_at)} · </> : null}{by}</>; }
    if (s.key === "scan_received") {
      const x = q.data?.signed_scans[q.data.signed_scans.length - 1];
      return <>{x ? <span title={`Checksum (SHA-256): ${x.sha256}`} data-scan-file><span className="[overflow-wrap:anywhere]">{x.file_name}</span> · {MEDIA_WORDS[x.media_type] ?? x.media_type} · {size(x.size_bytes)} · </span> : null}{by}</>;
    }
    return by;
  }

  return (
    <section aria-labelledby={`${blockId}-h`} className="space-y-2 rounded-lg border border-border bg-surface px-3 py-2" data-sign-block={item.id} data-state={item.state}>
      <div className="flex flex-wrap items-center gap-2">
        <h4 ref={heading} id={`${blockId}-h`} tabIndex={-1} className="text-[13px] font-semibold outline-none">Sign and scan</h4>
        <Pill tone={st.tone} title="This form's state on the application">{st.words}</Pill>
        {item.reason ? <span className="min-w-0 flex-1 text-[13px] text-text-muted [overflow-wrap:anywhere]" data-reason>{item.reason}</span> : null}
      </div>
      <p className="text-[13px] text-text-muted">Signed by hand and scanned: print the copy, have it signed, upload the scan. Each step is recorded with who and when.</p>
      {refusal ? <div data-sign-refusal><Notice tone="danger" title="Not recorded"><p className="[overflow-wrap:anywhere]">{refusal}</p></Notice></div> : null}
      {q.isLoading ? <><Skeleton className="h-16 w-full" /><span className="sr-only" role="status">Loading the signing steps of {form}…</span></>
        : q.isError ? <Notice tone="danger" title="The signing steps could not be loaded" action={<Button size="sm" variant="secondary" onClick={() => void q.refetch()}>Retry</Button>}>{(q.error as Error).message}</Notice>
        : <>
          {again ? (
            <div className="space-y-1 rounded-md border border-border px-2 py-1.5" data-sign-again>
              <p className="text-[13px] text-text-warn">The signed {form} is out of date: print a new copy, have it signed and upload the new scan. The earlier scan is kept.</p>
              {printAction("Printed: the new copy of")}
            </div>
          ) : null}
          <ol className="space-y-1.5">{steps.map((s, i) => {
            const isNext = s.key === nextKey && !again;
            const why = !s.done && !isNext && !again ? stepRefusal(s.key, done, stepWords, form, { filingReady: true }) : null;
            return (
              <li key={s.key} className="flex flex-wrap items-start gap-x-3 gap-y-1 text-[13px]" data-step={s.key} data-done={s.done ? "yes" : "no"}>
                <span className="flex min-w-48 items-center gap-1.5 font-medium">
                  {s.done ? <Check className="size-3.5 text-text-ok" aria-hidden /> : <Circle className="size-3.5 text-text-muted" aria-hidden />}
                  <span>{i + 1}. {s.words}</span><span className="sr-only">{s.done ? ": done" : isNext ? ": next" : ": not yet"}</span>
                </span>
                <div className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                  {s.done ? detail(s) : isNext ? <div ref={next}>{action(s.key)}</div> : why ? <span className="text-text-muted" data-step-why>Cannot start yet: {why}</span> : null}
                </div>
              </li>
            );
          })}</ol>
        </>}
    </section>
  );
}
