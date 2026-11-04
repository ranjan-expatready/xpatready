// S5 Forms tab, reading and matching (early-look fix 1: each form listed once): a form attached to the combination is read
// by rules (US$0), then AI matches its form fields to shared fields and a person reviews the proposals. Its status and
// next step sit in the form's own row, its steps in the form's side panel; checklists, guides and pages that are not
// form lines show as one compact "Sources" line. The Sources tab, its desktop upload and "Attach a sample file" are gone
// (P-118 Q2: forms enter only through the Form library). Slice 3 turns this into the form finder's stage strip (W1-07).
import * as React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Play, Recycle, ScanLine, Sparkles } from "lucide-react";
import { api, ApiError, useAction, useApi, useSessionView, useToast } from "@/lib/api";
import { Button, Dialog, Field, Notice, Pill, Select } from "@/components/ui/controls";
import { LIVE_OFF_NEXT } from "@/components/ai-launch";
import { ModePill, StatusPill } from "@/pages/combination";
import { fmtWhen } from "@/components/status";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCostGate } from "@/components/cost-warning";
import { COST_WORDS, type CostCheck } from "../../../contracts/cost-check";
import { attachedNotSetUp } from "../../../contracts/counts";
import { AdminDetails } from "@/components/details";

/** One attached source as GET /combinations/:id lists it, and one reading or drafting step. */
export type Attachment = { id: string; combinationId: string; kind: string; fileName: string; edition: string | null; status: string; statusDetail: string | null; recognised: boolean; uploadedVia: string; bytes: number };
type Job = { id: string; attachmentId: string | null; kind: string; mode: string; status: string; message: string; startedAt: string };
type Combo = { combination: { id: string }; attachments: Attachment[]; jobs: Job[] };

const STATUS: Record<string, [string, string]> = {
  HELD: ["warn", "Not an approved source: not sent to AI"], RECOGNISED: ["info", "Recognised: ready to read"], READ: ["info", "Read: ready for AI drafting"], READ_FAILED: ["danger", "Could not be read"],
  DRAFTED: ["ai", "AI draft ready to review"], IN_LIBRARY: ["ok", "In the library"], ATTACHED: ["neutral", "Source document"],
};
/** The form code an attachment holds ("IMM 5257 SCH1 (09-2023)" → "IMM 5257 SCH1"). */
export const codeOf = (a: Attachment) => (a.edition ?? "").split(" (")[0];
/** The attached form file behind a line, if any (the newest one). */
export const attachmentFor = (d: Combo, code: string) => [...d.attachments].reverse().find((a) => a.kind === "Form" && codeOf(a) === code);

/** A form's reading status and its one next step, for its row. */
export function ReadingCell({ d, a, inLibrary = false }: { d: Combo; a: Attachment | undefined; inLibrary?: boolean }) {
  if (!a) return <span className="text-text-muted">Not attached</span>;
  // Drift check 5: a file the library already matched waits for "Add from library", the page's next step, not for AI.
  const [tone, label] = inLibrary && a.status !== "IN_LIBRARY" ? STATUS.IN_LIBRARY : STATUS[a.status] ?? ["neutral", a.status];
  // The last step and when it ran (QA-17: the day when it was not today); every step is in the form's side panel.
  const last = d.jobs.find((j) => j.attachmentId === a.id);
  return <span className="inline-flex flex-col items-start gap-1"><Pill tone={tone}>{label}</Pill>{last ? <span className="text-text-muted">{last.kind === "field_map" ? "AI draft" : "Read"} {fmtWhen(last.startedAt)}</span> : null}<ReadingActions d={d} a={inLibrary ? { ...a, status: "IN_LIBRARY" } : a} /></span>;
}

/** Read form · Draft with AI · Review AI proposals · Add from library: the step the form is waiting for. */
export function ReadingActions({ d, a }: { d: Combo; a: Attachment }) {
  const { canAuthor } = useSessionView();
  const id = d.combination.id;
  const qc = useQueryClient();
  // P-227 (D2 part 4): a failed Live run's "Use Saved (US$0)" opens this form's Draft dialog (?draft=<attachment>), on Saved.
  const [sp, setSp] = useSearchParams();
  const [drafting, setDrafting] = React.useState(sp.get("draft") === a.id);
  const read = useAction(() => api(`/attachments/${a.id}/read`, { method: "POST" }), { success: (r: { summary: { entry_fields_bound: number } }) => `Form read: ${r.summary.entry_fields_bound} form fields`, invalidate: [["combination", id]] });
  const reuse = useAction(() => api(`/attachments/${a.id}/reuse`, { method: "POST", json: {} }), { success: (r: { form: string }) => `${r.form} added from the library; no AI drafting needed`, invalidate: [["combination", id], ["preview"]] });
  if (!canAuthor) return null;
  const ai = d.jobs.find((j) => j.attachmentId === a.id && j.kind === "field_map" && ["COMPLETED", "RUNNING", "QUEUED", "APPLIED"].includes(j.status));
  return (
    <>
      {a.status === "RECOGNISED" || a.status === "READ_FAILED" ? <Button size="sm" onClick={() => read.mutate(undefined)} busy={read.isPending}><ScanLine /> Read form</Button> : null}
      {a.status === "READ" || (a.status === "DRAFTED" && !ai) ? <Button size="sm" onClick={() => setDrafting(true)}><Sparkles /> Draft with AI</Button> : null}
      {a.status === "DRAFTED" && ai ? <Button size="sm" asChild><Link to={`/c/${id}/jobs/${ai.id}`}><Sparkles /> Review AI proposals</Link></Button> : null}
      {a.status === "IN_LIBRARY" && a.kind === "Form" ? <ReuseButton id={id} code={codeOf(a)} onReuse={() => reuse.mutate(undefined)} busy={reuse.isPending} /> : null}
      {drafting ? <DraftDialog a={a} onClose={() => { setDrafting(false); if (sp.get("draft")) { const n = new URLSearchParams(sp); n.delete("draft"); setSp(n, { replace: true }); } void qc.invalidateQueries({ queryKey: ["combination", id] }); }} /> : null}
    </>
  );
}

/** A form's reading and matching steps, newest first, for its side panel. */
export function ReadingSteps({ d, a }: { d: Combo; a: Attachment | undefined }) {
  if (!a) return <p className="text-sm text-text-muted">No file of this form is attached to the combination yet.</p>;
  const jobs = d.jobs.filter((j) => j.attachmentId === a.id);
  return (
    <div className="space-y-2 text-sm" data-reading-steps>
      <p className="text-xs text-text-muted">{a.statusDetail}</p>
      {jobs.length ? <ul className="space-y-1">{jobs.slice(0, 5).map((j) => <li key={j.id} className="flex flex-wrap items-center gap-1 text-xs">{j.kind === "field_map" ? "AI draft" : "Read"} <ModePill mode={j.mode} /><StatusPill status={j.status} /><span className="text-text-muted">{fmtWhen(j.startedAt)}</span>{j.kind === "field_map" && j.status !== "RUNNING" ? <Link className="text-text-link underline" to={`/c/${d.combination.id}/jobs/${j.id}`}>details</Link> : null}</li>)}</ul> : null}
      <p className="text-xs text-text-muted">File {a.fileName} · {(a.bytes / 1024).toFixed(0)} KB · <a className="text-text-link underline" href={`/api/attachments/${a.id}/file`}>Open file</a></p>
    </div>
  );
}

/** Forms attached but not set up as lines yet: one row each, with the step they wait for. */
/** UX-A part 1 (break 3): the API's rule (contracts/counts.ts attachedNotSetUp), so the rows are the count. */
export function pendingForms(d: Combo, lineCodes: string[]) {
  return attachedNotSetUp(d.attachments, lineCodes);
}

/** Checklists, guides and pages that are not form lines: one compact line (read for documents and citations, never filed). */
export function SourcesLine({ d, lineCodes }: { d: Combo; lineCodes: string[] }) {
  const sources = d.attachments.filter((a) => a.kind !== "Form" && !lineCodes.includes(codeOf(a)));
  if (!sources.length) return null;
  return (
    <p className="text-sm" data-sources><span className="font-medium">Sources</span> <span className="text-text-muted">(read for documents and citations, never filed):</span>{" "}
      {sources.map((a, i) => <React.Fragment key={a.id}>{i ? " · " : null}<a className="text-text-link underline" href={`/api/attachments/${a.id}/file`} title={`${a.kind} · ${a.fileName}`}>{(a.edition ?? a.fileName).replace(/ \(edition read from the file\)/, "")}</a></React.Fragment>)}
    </p>
  );
}

/** Running, blocked or failed steps of the combination, said once above the forms. */
export function StepNotices({ d }: { d: Combo }) {
  const running = d.jobs.find((j) => j.status === "RUNNING" || j.status === "QUEUED");
  const stuck = d.jobs.find((j) => j.status === "BLOCKED" || j.status === "FAILED");
  return <>
    {running ? <Notice tone="ai" title="A step is running">{running.message} This page refreshes by itself; you can keep working elsewhere.</Notice> : null}
    {stuck ? <Notice tone={stuck.status === "BLOCKED" ? "warn" : "danger"} title={stuck.status === "BLOCKED" ? "The AI step is blocked" : "A step failed"}>{stuck.message}</Notice> : null}
  </>;
}

function ReuseButton({ id, code, onReuse, busy }: { id: string; code: string; onReuse: () => void; busy: boolean }) {
  const cfg = useApi<{ snapshot: { forms: { form_number: string }[] } }>(["config", id, "draft"], `/combinations/${id}/config?mode=draft`);
  if (!cfg.data) return null;
  return cfg.data.snapshot.forms.some((f) => f.form_number === code) ? null : <Button size="sm" variant="secondary" onClick={onReuse} busy={busy}><Recycle /> Add from library</Button>;
}

type SavedRun = { file: string; run_id: string; valid: boolean; recheckable: boolean; rechecked: boolean; at?: string; cost_usd?: number | null };
/** UX-A part 4 (EXPERIENCE §5): a saved AI answer is named by its form and date, never by its run file; short enough for
 *  its list at 1440 px (review n6: "paid US$1.55 then" was cut off). */
const formOf = (a: { edition?: string | null; fileName?: string }) => (a.edition ?? a.fileName ?? "This form").split(" (")[0];
export function savedName(form: string, r: Pick<SavedRun, "at" | "cost_usd" | "recheckable" | "rechecked">) {
  const when = r.at && !Number.isNaN(new Date(r.at).getTime()) ? new Date(r.at).toLocaleString("en-CA", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "date not recorded";
  return `${form} · saved ${when}${r.cost_usd != null ? ` · cost US$${r.cost_usd.toFixed(2)}` : ""}${r.recheckable ? " · re-checked first" : r.rechecked ? " · re-checked" : ""}`;
}
/** UX-A part 4 (break M2): what can still be spent, naming the limit that sets it. The server's remaining figure is the
 *  smaller of the AI spending cap's room and this round's budget's room (P-110, P-179); the figures are under Details. */
export function spendLeftWords(l: { committed_usd: number; cap_usd: number; remaining_usd: number; wave?: { cap_usd: number; spent_usd: number } }) {
  const left = `US$${Math.max(0, l.remaining_usd).toFixed(2)}`;
  const capRoom = l.cap_usd - l.committed_usd;
  return l.wave && l.wave.cap_usd - l.wave.spent_usd < capRoom - 0.005 ? `${left} left in this round's AI budget (US$${Math.max(0, capRoom).toFixed(2)} before the AI spending cap).` : `${left} left before the AI spending cap.`;
}
type DraftOptions = { model?: string; saved_runs: SavedRun[]; saved_parts?: { parts: number; saved: number } | null; ledger?: { committed_usd: number; cap_usd: number; remaining_usd: number; wave?: { name: string; cap_usd: number; spent_usd: number } }; key_present: boolean; job_id: string };

// X8a: the Start button says when it is ready (data-options-loaded: the saved answers are in, so the mode will not switch
// to "Use saved AI answer" by itself any more; data-start-ready: nothing it waits on is still loading), so a check follows
// the page instead of a fixed wait.
function DraftDialog({ a, onClose }: { a: Attachment; onClose: () => void }) {
  const opts = useApi<DraftOptions>(["draft-options", a.id], `/attachments/${a.id}/draft-options`);
  // The order the server uses: answers that pass today's check first, then ones it re-checks before use (Lead check A3).
  const runs: SavedRun[] = opts.data?.saved_runs ?? [];
  const saved = [...runs.filter((r) => r.valid), ...runs.filter((r) => r.recheckable)];
  // A form drafted in parts is saved part by part: Saved uses them when every part has one (US$0); some missing, it waits.
  const sp = opts.data?.saved_parts ?? null;
  const partsAll = !saved.length && !!sp && sp.parts > 0 && sp.saved === sp.parts;
  const replayOpen = saved.length > 0 || partsAll;
  // Review-3 Minor 4: a form approved in the product (not on the official manifest) is not open to a paid call yet (the
  // founder's or the Lead's decision): Live says why it is closed. P-227 (D2 part 2): only Live and Saved are shown; the
  // stub pass stays an API path for tests (POST /attachments/:id/draft {mode:"stub"}), never offered to a person.
  const liveClosed = !a.recognised;
  // C11.8 (P-227, review Major 1): the same form being mapped in another combination is never drafted again, Live or
  // Saved (F3 D4, BR-7): the server refuses both (409). The plan says so before the click (no model call, US$0), so the
  // dialog closes Start with that reason and a link to the draft there, instead of offering a Saved that is refused.
  const scope = { kind: "source" as const, ids: [a.id] };
  const here = useQuery<{ targets?: { action: string; why: string; elsewhere?: { combination: string; job_href: string } }[] }>({ queryKey: ["ai-plan", "source", a.id, "REPLAY", true], queryFn: () => api("/ai/plan", { method: "POST", json: { scope, mode: "REPLAY", draftAgain: true } }), staleTime: 0, retry: false });
  const elsewhere = here.data?.targets?.[0]?.elsewhere ? here.data.targets[0] : null;
  const settled = (opts.isSuccess || opts.isError) && (here.isSuccess || here.isError);
  const nothingToStart = (m: "live" | "replay") => !!elsewhere || (m === "live" && liveClosed) || (m === "replay" && !replayOpen);
  const [mode, setMode] = React.useState<"live" | "replay">(liveClosed ? "replay" : "live");
  const [runFile, setRunFile] = React.useState("");
  React.useEffect(() => { if (saved.length && !runFile) { setRunFile(saved[0].file); setMode("replay"); } else if (partsAll) setMode("replay"); }, [saved.length, partsAll]);
  const qc = useQueryClient();
  const toast = useToast();
  // N6 (review N1): the live start is the same plan as Draft setup's with the scope narrowed to this form (D280), so it
  // carries the same cost check: over a limit, the cost warning first (Continue or Cancel), as on Draft setup. The plan is
  // made when Live is chosen, so the click opens the warning at once. The server checks everything again.
  const plan = useQuery<{ cost_check: CostCheck; run_key: string; plan_sha256: string; live?: { on: boolean; blocked: boolean } }>({ queryKey: ["ai-plan", "source", a.id, "LIVE", true], queryFn: () => api("/ai/plan", { method: "POST", json: { scope, mode: "LIVE", draftAgain: true } }), enabled: mode === "live", staleTime: 0, retry: false });
  const cost = useCostGate();
  // One launch key per dialog: a retry after Continue (or a double click) returns the same run, never a second one.
  const [key] = React.useState(() => (globalThis.crypto?.randomUUID?.() ?? `k-${Date.now()}-${Math.random().toString(36).slice(2)}`));
  const [busy, setBusy] = React.useState(false);
  const start = async () => {
    setBusy(true);
    try {
      const launch = (overrideId?: string) => api(`/attachments/${a.id}/draft`, { method: "POST", json: { mode, runFile: mode === "replay" && runFile ? runFile : undefined, idempotencyKey: key, ...(overrideId ? { overrideId } : {}) } });
      // No plan (it could not be made: the server's launch says why in words) or not live (US$0): straight to the launch.
      // N6 follow-up: the plan is made again in the click (after the Escape guard is armed), so after a Cancel or a refused
      // Continue the warning shows today's spend, not the figures from when the dialog opened (and so does the Live line).
      const planAgain = async () => { void qc.invalidateQueries({ queryKey: ["draft-options", a.id] }); const r = await plan.refetch(); if (r.error) throw r.error; return r.data!; };
      const r = mode === "live" && plan.data ? await cost.gate(planAgain, { kind: "draft_field_maps", scope, mode: "LIVE", draftAgain: true }, launch) : await launch();
      if (r === undefined) { toast.push({ tone: "info", text: COST_WORDS.cancelled }); return; }
      toast.push({ tone: "ok", text: mode === "replay" ? "Saved result used: proposals compared with the library" : "AI draft started" });
      void qc.invalidateQueries({ queryKey: ["combination"] }); onClose();
    } catch (e) {
      toast.push({ tone: "danger", text: (e as Error).message });
      // Break 3 m1: any refusal (a cost refusal is a 400) makes the plan again, so the next Start shows today's warning.
      // Review (10a0e90e) 2: the spend figures in this dialog are read again too, so they agree with the refusal's words.
      if (e instanceof ApiError) { void plan.refetch(); void qc.invalidateQueries({ queryKey: ["draft-options", a.id] }); }
    } finally { setBusy(false); }
  };
  const l = opts.data?.ledger;
  // C11.8 (P-175, break m1): on a copy without the live switch a live draft that would call the model is not offered here
  // either (as Draft setup); the server refuses it at the door.
  const liveOff = mode === "live" && plan.data?.live?.blocked === true;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={`Draft the field map of ${a.edition}`} description="The AI reads the list of the form's fields (public official content only) and proposes, for every form field, whose fact fills it and which library field it is. People decide every proposal before anything reaches the draft."
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => void start()} busy={busy} disabled={nothingToStart(mode) || liveOff || (mode === "live" && plan.isFetching)} aria-describedby={elsewhere ? "draft-elsewhere" : nothingToStart(mode) ? "draft-none" : undefined} data-draft-start data-mode={mode} data-options-loaded={settled ? "true" : "false"} data-start-ready={!busy && settled && !(mode === "live" && plan.isFetching) && !nothingToStart(mode) ? "true" : "false"}><Play /> {mode === "replay" ? "Use Saved (US$0)" : "Start Live"}</Button></>}>
      <div className="space-y-3 text-sm">
        <label className="flex items-start gap-2"><input type="radio" checked={mode === "live"} onChange={() => setMode("live")} className="mt-1" disabled={liveClosed || !!elsewhere} /><span>{liveClosed ? <><b>Live</b>: not open yet for a form approved in the product (only for files on the official list); use Saved when there is one.</> : <><b>Live</b> through the guarded route: a safety check first, then the AI model, up to US$5 for this run. {/* UX-A part 4: the model, the caps and the wave's budget lines are under Details; the main path keeps what is left. */}{l ? spendLeftWords(l) : ""} {opts.data && !opts.data.key_present ? <span className="text-text-danger">The API key file is missing: a live call will be refused.</span> : null}</>}</span></label>
        <label className="flex items-start gap-2"><input type="radio" checked={mode === "replay"} onChange={() => setMode("replay")} className="mt-1" disabled={!replayOpen || !!elsewhere} /><span className="min-w-0 flex-1"><b>Saved</b> (no model call, US$0): an earlier real answer for this same form, checked with today's rules before use and labelled wherever it is shown.{saved.length ? <Select className="mt-1 block" value={runFile} onChange={(e) => setRunFile(e.target.value)}>{saved.map((r) => <option key={r.file} value={r.file}>{savedName(formOf(a), r)}</option>)}</Select> : <span className="block text-xs text-text-muted" data-saved-parts={sp ? `${sp.saved}/${sp.parts}` : undefined}>{partsAll ? `Saved answers for each of its ${sp!.parts} parts (it was drafted in parts): used together.` : sp?.saved ? `Saved answers for ${sp.saved} of its ${sp.parts} parts only: it waits for Live, so it is never half-filled.` : "No saved AI answer for this form yet."}</span>}</span></label>
        {elsewhere ? <Notice tone="info" title={`Being mapped in ${elsewhere.elsewhere!.combination}`}><span id="draft-elsewhere" data-draft-elsewhere>{elsewhere.why} Nothing starts here, Live or Saved. <Link className="underline" to={elsewhere.elsewhere!.job_href}>Open that draft</Link></span></Notice> : null}
        {opts.isSuccess && !elsewhere && nothingToStart(mode) ? <p id="draft-none" className="text-sm" role="status" data-draft-none>Nothing can start for this form yet: {liveClosed ? "Live is not open for it" : "it has no Saved result, so choose Live"}{liveClosed && !replayOpen ? ", and it has no Saved result" : ""}.</p> : null}
        {/* Break m4: when Saved is closed too, the notice does not point to it. */}
        {liveOff ? <Notice tone="warn" title="Live AI is off on this copy">{replayOpen ? LIVE_OFF_NEXT : "No paid AI call can start here, and this form has no complete Saved answer: it waits until live AI is on, or a person maps it."}</Notice> : null}
        {cost.dialog}
        <p className="text-xs text-text-muted">The AI reads this form's own field list only; expected answers and family values are kept out of what it reads.</p>
        <AdminDetails items={[["AI model (Live)", liveClosed ? null : opts.data?.model], ["Job", opts.data?.job_id], ["Saved run file", mode === "replay" ? runFile || null : null], ["Saved run", mode === "replay" ? saved.find((r) => r.file === runFile)?.run_id : null],
          ["Spending", l ? `US$${l.committed_usd.toFixed(2)} of the US$${l.cap_usd.toFixed(2)} AI spending cap (the experiment cap)${l.wave ? ` · this round's budget (${l.wave.name}): US$${l.wave.spent_usd.toFixed(2)} of US$${l.wave.cap_usd.toFixed(2)}` : ""}` : null]]} />
      </div>
    </Dialog>
  );
}
