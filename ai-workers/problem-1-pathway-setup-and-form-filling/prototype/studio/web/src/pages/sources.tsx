// S5 Forms tab, "Reading and matching": each form attached to the combination is read (rules, US$0), then AI matches its
// form fields to shared fields and a person reviews the proposals. Slice 1 keeps this existing pipeline on the Forms
// tab; the Sources tab, its desktop upload and "Attach a sample file" are gone (P-118 Q2: forms enter only through the
// Form library). Slice 3 turns it into the setup strip of the form finder (W1-07 run component).
import * as React from "react";
import { Link } from "react-router-dom";
import { Play, Recycle, ScanLine, Sparkles } from "lucide-react";
import { api, useAction, useActorId, useApi, useToast } from "@/lib/api";
import { Button, Dialog, Field, Input, Notice, Pill, Select, Table } from "@/components/ui/controls";
import { EmptyState } from "@/components/ui/empty-state";
import { ModePill, StatusPill } from "@/pages/combination";
import { fmtWhen } from "@/components/status";
import { useQueryClient } from "@tanstack/react-query";

const STATUS: Record<string, [string, string]> = {
  HELD: ["warn", "Not an approved source: not sent to AI"], RECOGNISED: ["info", "Recognised: ready to read"], READ: ["info", "Read: ready for AI drafting"], READ_FAILED: ["danger", "Could not be read"],
  DRAFTED: ["ai", "AI draft ready to review"], IN_LIBRARY: ["ok", "In the library"], ATTACHED: ["neutral", "Source document"],
};

export function ReadingSection({ d }: { d: any }) {
  const id = d.combination.id;
  const actorId = useActorId();
  const session = useApi<any>(["session", actorId], "/session");
  const canAuthor = (session.data?.actor?.duties ?? []).includes("author");
  const qc = useQueryClient();
  const toast = useToast();
  const [draftFor, setDraftFor] = React.useState<any>(null);
  const invalidate = () => { void qc.invalidateQueries({ queryKey: ["combination", id] }); };
  const read = useAction((aid: string) => api(`/attachments/${aid}/read`, { method: "POST" }), { success: (r: any) => `Form read: ${r.summary.entry_fields_bound} form fields`, invalidate: [["combination", id]] });
  const reuse = useAction((aid: string) => api(`/attachments/${aid}/reuse`, { method: "POST", json: {} }), { success: (r: any) => `${r.form} added from the library; no AI drafting needed`, invalidate: [["combination", id], ["preview"]] });
  const jobsFor = (aid: string) => d.jobs.filter((j: any) => j.attachmentId === aid);
  return (
    <section aria-labelledby="reading" className="space-y-3" data-reading>
      <div><h2 id="reading" className="font-semibold">Reading and matching</h2><p className="text-sm text-text-muted">Each form is read by rules (no AI call), then AI matches its form fields to shared fields and a person reviews what it proposes.{canAuthor ? "" : " A configuration author starts these steps."}</p></div>
      {!d.attachments.length ? <EmptyState title="Nothing to read yet" description="Add a form from the library: it is read here, then matched to shared fields with AI." /> : (
        <Table head={["Source", "Status and steps", "Next"]}>
          {d.attachments.map((a: any) => {
            const [tone, label] = STATUS[a.status] ?? ["neutral", a.status];
            const jobs = jobsFor(a.id);
            const ai = jobs.find((j: any) => j.kind === "field_map" && ["COMPLETED", "RUNNING", "QUEUED", "APPLIED"].includes(j.status));
            return (
              <tr key={a.id}>
                <td className="min-w-48"><p className="font-medium">{a.edition ?? a.fileName}</p><p className="text-xs text-text-muted">{a.kind} · {a.fileName} · {(a.bytes / 1024).toFixed(0)} KB · {a.uploadedVia === "SAMPLE" ? "from the sample" : "from the Form library"}</p><a className="text-xs text-text-link underline" href={`/api/attachments/${a.id}/file`}>Open file</a></td>
                <td className="min-w-64"><Pill tone={tone}>{label}</Pill><p className="mt-1 max-w-lg text-xs text-text-muted">{a.statusDetail}</p>{jobs.length ? <div className="mt-1.5">{jobs.slice(0, 3).map((j: any) => <div key={j.id} className="mb-1 flex flex-wrap items-center gap-1 text-xs">{j.kind === "field_map" ? "AI draft" : "Read"} <ModePill mode={j.mode} /><StatusPill status={j.status} /><span className="text-text-muted">{fmtWhen(j.startedAt)}</span>{j.kind === "field_map" && j.status !== "RUNNING" ? <Link className="text-text-link underline" to={`/c/${id}/jobs/${j.id}`}>details</Link> : null}</div>)}</div> : null}</td>
                <td className="w-px">{!canAuthor ? null : <>
                  {a.status === "RECOGNISED" || a.status === "READ_FAILED" ? <Button size="sm" onClick={() => read.mutate(a.id)} busy={read.isPending && read.variables === a.id}><ScanLine /> Read form</Button> : null}
                  {a.status === "READ" || (a.status === "DRAFTED" && !ai) ? <Button size="sm" onClick={() => setDraftFor(a)}><Sparkles /> Draft with AI</Button> : null}
                  {a.status === "DRAFTED" && ai ? <Button size="sm" asChild><Link to={`/c/${id}/jobs/${ai.id}`}><Sparkles /> Review AI proposals</Link></Button> : null}
                  {a.status === "IN_LIBRARY" && a.kind === "Form" ? <ReuseButton a={a} d={d} onReuse={() => reuse.mutate(a.id)} busy={reuse.isPending} /> : null}
                </>}</td>

              </tr>
            );
          })}
        </Table>
      )}
      {d.jobs.some((j: any) => j.status === "RUNNING" || j.status === "QUEUED") ? <Notice tone="ai" title="A step is running">{d.jobs.find((j: any) => j.status === "RUNNING" || j.status === "QUEUED").message} This page refreshes by itself; you can keep working elsewhere.</Notice> : null}
      {d.jobs.filter((j: any) => j.status === "BLOCKED" || j.status === "FAILED").slice(0, 1).map((j: any) => <Notice key={j.id} tone={j.status === "BLOCKED" ? "warn" : "danger"} title={j.status === "BLOCKED" ? "The AI step is blocked" : "A step failed"}>{j.message}</Notice>)}
      {draftFor ? <DraftDialog a={draftFor} onClose={() => { setDraftFor(null); invalidate(); }} /> : null}
    </section>
  );
}

function ReuseButton({ a, d, onReuse, busy }: { a: any; d: any; onReuse: () => void; busy: boolean }) {
  const formKey = (a.edition ?? "").split(" (")[0];
  const cfg = useApi<any>(["config", d.combination.id, "draft"], `/combinations/${d.combination.id}/config?mode=draft`);
  const has = cfg.data?.snapshot?.forms?.some((f: any) => f.form_number === formKey);
  if (!cfg.data) return null;
  return has ? <Pill tone="ok">In this configuration</Pill> : <Button size="sm" variant="secondary" onClick={onReuse} busy={busy}><Recycle /> Add from library</Button>;
}

/** One file of the official library, as GET /official-library lists it. */
type OfficialFile = { file: string; edition: string; kind: string; combination: string; sha256: string };

type SavedRun = { file: string; run_id: string; valid: boolean; recheckable: boolean; rechecked: boolean; at?: string; cost_usd?: number | null };

function DraftDialog({ a, onClose }: { a: any; onClose: () => void }) {
  const opts = useApi<any>(["draft-options", a.id], `/attachments/${a.id}/draft-options`);
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
  const go = useAction(() => api(`/attachments/${a.id}/draft`, { method: "POST", json: { mode, runFile: mode === "replay" ? runFile : undefined } }), {
    success: mode === "replay" ? "Saved AI answer used: proposals compared with the library" : mode === "live" ? "AI draft started" : "Stub pass started", invalidate: [["combination", a.combinationId]], onDone: () => { void qc.invalidateQueries({ queryKey: ["combination"] }); onClose(); } });
  const l = opts.data?.ledger;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={`Draft the field map of ${a.edition}`} description="The AI reads the list of the form's fields (public official content only) and proposes, for every form field, whose fact fills it and which library field it is. People decide every proposal before anything reaches the draft."
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => go.mutate(undefined)} busy={go.isPending}><Play /> {mode === "replay" ? "Use saved AI answer" : mode === "live" ? "Start live AI draft" : "Run stub pass"}</Button></>}>
      <div className="space-y-3 text-sm">
        <label className="flex items-start gap-2"><input type="radio" checked={mode === "live"} onChange={() => setMode("live")} className="mt-1" disabled={liveClosed} /><span>{liveClosed ? <><b>Live AI call</b>: not open yet for a form approved in the product (only for files on the official list); run the stub pass.</> : <><b>Live AI call</b> through the guarded route: stub pass first, then Claude Opus 5.5, up to US$5 for this run. {l ? `Spent so far US$${l.committed_usd} of the US$${l.cap_usd} experiment cap; US$${l.remaining_usd} left.` : ""} {opts.data && !opts.data.key_present ? <span className="text-text-danger">The API key file is missing: a live call will be refused.</span> : null}</>}</span></label>
        <label className="flex items-start gap-2"><input type="radio" checked={mode === "replay"} onChange={() => setMode("replay")} className="mt-1" disabled={!saved.length} /><span><b>Use the saved AI answer</b> (no model call, US$0): an earlier real answer for this same form, checked with today's rules before use and labelled wherever it is shown.{saved.length ? <Select className="mt-1" value={runFile} onChange={(e) => setRunFile(e.target.value)}>{saved.map((r) => <option key={r.file} value={r.file}>{r.run_id} · {r.at?.slice(0, 16)} · paid US${r.cost_usd?.toFixed(2)} then{r.recheckable ? " · re-checked first" : r.rechecked ? " · re-checked" : ""}</option>)}</Select> : <span className="block text-xs text-text-muted">No saved AI answer for this form yet.</span>}</span></label>
        <label className="flex items-start gap-2"><input type="radio" checked={mode === "stub"} onChange={() => setMode("stub")} className="mt-1" /><span><b>Stub pass only</b>: proves the guarded path end to end without network or cost; produces no AI content.</span></label>
        <Field label="Job" hint="Inputs: this form's inventory only (allowlisted); expected answers and family values are screened out of the prompt."><code className="mono block rounded bg-surface px-2 py-1">{opts.data?.job_id}</code></Field>
      </div>
    </Dialog>
  );
}
