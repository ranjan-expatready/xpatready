// S5 Forms tab, reading and matching (early-look fix 1: each form listed once): a form attached to the combination is read
// by rules (US$0), then AI matches its form fields to shared fields and a person reviews the proposals. Its status and
// next step sit in the form's own row, its steps in the form's side panel; checklists, guides and pages that are not
// form lines show as one compact "Sources" line. The Sources tab, its desktop upload and "Attach a sample file" are gone
// (P-118 Q2: forms enter only through the Form library). Slice 3 turns this into the form finder's stage strip (W1-07).
import * as React from "react";
import { Link } from "react-router-dom";
import { Play, Recycle, ScanLine, Sparkles } from "lucide-react";
import { api, ApiError, useAction, useApi, useSessionView, useToast } from "@/lib/api";
import { Button, Dialog, Field, Notice, Pill, Select } from "@/components/ui/controls";
import { ModePill, StatusPill } from "@/pages/combination";
import { fmtWhen } from "@/components/status";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCostGate } from "@/components/cost-warning";
import { COST_WORDS, type CostCheck } from "../../../contracts/cost-check";

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
  const [drafting, setDrafting] = React.useState(false);
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
      {drafting ? <DraftDialog a={a} onClose={() => { setDrafting(false); void qc.invalidateQueries({ queryKey: ["combination", id] }); }} /> : null}
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
export function pendingForms(d: Combo, lineCodes: string[]) {
  return d.attachments.filter((a) => a.kind === "Form" && !lineCodes.includes(codeOf(a)));
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
type DraftOptions = { saved_runs: SavedRun[]; ledger?: { committed_usd: number; cap_usd: number; remaining_usd: number; wave?: { name: string; cap_usd: number; spent_usd: number } }; key_present: boolean; job_id: string };

// X8a: the Start button says when it is ready (data-options-loaded: the saved answers are in, so the mode will not switch
// to "Use saved AI answer" by itself any more; data-start-ready: nothing it waits on is still loading), so a check follows
// the page instead of a fixed wait.
function DraftDialog({ a, onClose }: { a: Attachment; onClose: () => void }) {
  const opts = useApi<DraftOptions>(["draft-options", a.id], `/attachments/${a.id}/draft-options`);
  // The order the server uses: answers that pass today's check first, then ones it re-checks before use (Lead check A3).
  const runs: SavedRun[] = opts.data?.saved_runs ?? [];
  const saved = [...runs.filter((r) => r.valid), ...runs.filter((r) => r.recheckable)];
  // Review-3 Minor 4: a form approved in the product (not on the official manifest) is not open to a paid call yet (the
  // founder's or the Lead's decision): its dialog starts on the stub pass and says why Live is closed.
  const liveClosed = !a.recognised;
  const [mode, setMode] = React.useState<"live" | "replay" | "stub">(liveClosed ? "stub" : "live");
  const [runFile, setRunFile] = React.useState("");
  React.useEffect(() => { if (saved.length && !runFile) { setRunFile(saved[0].file); setMode("replay"); } }, [saved.length]);
  const qc = useQueryClient();
  const toast = useToast();
  // N6 (review N1): the live start is the same plan as Draft setup's with the scope narrowed to this form (D280), so it
  // carries the same cost check: over a limit, the cost warning first (Continue or Cancel), as on Draft setup. The plan is
  // made when Live is chosen, so the click opens the warning at once. The server checks everything again.
  const scope = { kind: "source" as const, ids: [a.id] };
  const plan = useQuery<{ cost_check: CostCheck; run_key: string; plan_sha256: string }>({ queryKey: ["ai-plan", "source", a.id, "LIVE", true], queryFn: () => api("/ai/plan", { method: "POST", json: { scope, mode: "LIVE", draftAgain: true } }), enabled: mode === "live", staleTime: 0, retry: false });
  const cost = useCostGate();
  // One launch key per dialog: a retry after Continue (or a double click) returns the same run, never a second one.
  const [key] = React.useState(() => (globalThis.crypto?.randomUUID?.() ?? `k-${Date.now()}-${Math.random().toString(36).slice(2)}`));
  const [busy, setBusy] = React.useState(false);
  const start = async () => {
    setBusy(true);
    try {
      const launch = (overrideId?: string) => api(`/attachments/${a.id}/draft`, { method: "POST", json: { mode, runFile: mode === "replay" ? runFile : undefined, idempotencyKey: key, ...(overrideId ? { overrideId } : {}) } });
      // No plan (it could not be made: the server's launch says why in words) or not live (US$0): straight to the launch.
      // N6 follow-up: the plan is made again in the click (after the Escape guard is armed), so after a Cancel or a refused
      // Continue the warning shows today's spend, not the figures from when the dialog opened (and so does the Live line).
      const planAgain = async () => { void qc.invalidateQueries({ queryKey: ["draft-options", a.id] }); const r = await plan.refetch(); if (r.error) throw r.error; return r.data!; };
      const r = mode === "live" && plan.data ? await cost.gate(planAgain, { kind: "draft_field_maps", scope, mode: "LIVE", draftAgain: true }, launch) : await launch();
      if (r === undefined) { toast.push({ tone: "info", text: COST_WORDS.cancelled }); return; }
      toast.push({ tone: "ok", text: mode === "replay" ? "Saved result used: proposals compared with the library" : mode === "live" ? "AI draft started" : "Stub pass started" });
      void qc.invalidateQueries({ queryKey: ["combination"] }); onClose();
    } catch (e) {
      toast.push({ tone: "danger", text: (e as Error).message });
      // Break 3 m1: any refusal (a cost refusal is a 400) makes the plan again, so the next Start shows today's warning.
      // Review (10a0e90e) 2: the spend figures in this dialog are read again too, so they agree with the refusal's words.
      if (e instanceof ApiError) { void plan.refetch(); void qc.invalidateQueries({ queryKey: ["draft-options", a.id] }); }
    } finally { setBusy(false); }
  };
  const l = opts.data?.ledger;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={`Draft the field map of ${a.edition}`} description="The AI reads the list of the form's fields (public official content only) and proposes, for every form field, whose fact fills it and which library field it is. People decide every proposal before anything reaches the draft."
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => void start()} busy={busy} disabled={mode === "live" && plan.isFetching} data-draft-start data-mode={mode} data-options-loaded={opts.isSuccess || opts.isError ? "true" : "false"} data-start-ready={!busy && (opts.isSuccess || opts.isError) && !(mode === "live" && plan.isFetching) ? "true" : "false"}><Play /> {mode === "replay" ? "Use saved AI answer" : mode === "live" ? "Start live AI draft" : "Run stub pass"}</Button></>}>
      <div className="space-y-3 text-sm">
        <label className="flex items-start gap-2"><input type="radio" checked={mode === "live"} onChange={() => setMode("live")} className="mt-1" disabled={liveClosed} /><span>{liveClosed ? <><b>Live</b>: not open yet for a form approved in the product (only for files on the official list); run the stub pass.</> : <><b>Live</b> through the guarded route: stub pass first, then Claude Opus 5.5, up to US$5 for this run. {/* Break 3 m2: what is left is the smaller of the cap's and the wave's room: both are named. */}{l ? `Spent so far US$${l.committed_usd.toFixed(2)} of the US$${l.cap_usd.toFixed(2)} experiment cap${l.wave ? ` · ${l.wave.name}: US$${l.wave.spent_usd.toFixed(2)} of US$${l.wave.cap_usd.toFixed(2)}` : ""}; US$${Math.max(0, l.remaining_usd).toFixed(2)} left before a cap.` : ""} {opts.data && !opts.data.key_present ? <span className="text-text-danger">The API key file is missing: a live call will be refused.</span> : null}</>}</span></label>
        <label className="flex items-start gap-2"><input type="radio" checked={mode === "replay"} onChange={() => setMode("replay")} className="mt-1" disabled={!saved.length} /><span><b>Saved</b> (no model call, US$0): an earlier real answer for this same form, checked with today's rules before use and labelled wherever it is shown.{saved.length ? <Select className="mt-1" value={runFile} onChange={(e) => setRunFile(e.target.value)}>{saved.map((r) => <option key={r.file} value={r.file}>{r.run_id} · {r.at?.slice(0, 16)} · paid US${r.cost_usd?.toFixed(2)} then{r.recheckable ? " · re-checked first" : r.rechecked ? " · re-checked" : ""}</option>)}</Select> : <span className="block text-xs text-text-muted">No saved AI answer for this form yet.</span>}</span></label>
        <label className="flex items-start gap-2"><input type="radio" checked={mode === "stub"} onChange={() => setMode("stub")} className="mt-1" /><span><b>Stub pass only</b>: proves the guarded path end to end without network or cost; produces no AI content.</span></label>
        {cost.dialog}
        <Field label="Job" hint="Inputs: this form's inventory only (allowlisted); expected answers and family values are screened out of the prompt."><code className="mono block rounded bg-surface px-2 py-1">{opts.data?.job_id}</code></Field>
      </div>
    </Dialog>
  );
}
