import * as React from "react";
import { Link } from "react-router-dom";
import { FileUp, FolderOpen, Play, Recycle, ScanLine, Sparkles } from "lucide-react";
import { api, useAction, useActorId, useApi, useToast } from "@/lib/api";
import { DraftingSources } from "@/components/channels";
import { Button, Dialog, Field, Notice, Pill, Select, Table } from "@/components/ui/controls";
import { EmptyState } from "@/components/ui/empty-state";
import { ModePill, StatusPill } from "@/pages/combination";
import { useQueryClient } from "@tanstack/react-query";
import { IntakeResults, type IntakeResult } from "@/components/forms";

const STATUS: Record<string, [string, string]> = {
  HELD: ["warn", "Not an approved source: not sent to AI"], RECOGNISED: ["info", "Recognised: ready to read"], READ: ["info", "Read: ready for AI drafting"], READ_FAILED: ["danger", "Could not be read"],
  DRAFTED: ["ai", "AI draft ready to review"], IN_LIBRARY: ["ok", "In the library"], ATTACHED: ["neutral", "Source document"],
};

export function SourcesTab({ d }: { d: any }) {
  const id = d.combination.id;
  const actorId = useActorId();
  const session = useApi<any>(["session", actorId], "/session");
  const canAuthor = (session.data?.actor?.duties ?? []).includes("author");
  const qc = useQueryClient();
  const toast = useToast();
  const [sample, setSample] = React.useState(false);
  const [draftFor, setDraftFor] = React.useState<any>(null);
  const [drag, setDrag] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const invalidate = () => { void qc.invalidateQueries({ queryKey: ["combination", id] }); };
  const [results, setResults] = React.useState<IntakeResult[] | null>(null);
  const upload = useSourceUpload(id, setUploading, setResults);
  const read = useAction((aid: string) => api(`/attachments/${aid}/read`, { method: "POST" }), { success: (r: any) => `Form read: ${r.summary.entry_fields_bound} form fields`, invalidate: [["combination", id]] });
  const reuse = useAction((aid: string) => api(`/attachments/${aid}/reuse`, { method: "POST", json: {} }), { success: (r: any) => `${r.form} added from the library; no AI drafting needed`, invalidate: [["combination", id], ["preview"]] });
  const jobsFor = (aid: string) => d.jobs.filter((j: any) => j.attachmentId === aid);
  return (
    <div className="space-y-5">
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); void upload(e.dataTransfer.files); }}
        className={`flex flex-wrap items-center justify-between gap-4 rounded-xl border-2 border-dashed px-5 py-4 ${drag ? "border-primary bg-primary/5" : "border-border bg-surface-raised"}`}>
        <div className="flex items-center gap-3"><FileUp className="size-6 text-text-muted" /><div><p className="text-sm font-medium">Attach official forms, checklists and guides</p><p className="text-xs text-text-muted">Drop one or many files here or choose them. Each goes through the one form intake: code, edition and kind are read from the file; a new edition of a form the library has is held for review, never attached silently. Only files whose content matches the approved official library are read or sent to the AI.</p></div></div>
        {canAuthor ? <div className="flex gap-2">
          <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => { void upload(e.target.files); e.target.value = ""; }} accept=".pdf,.html" aria-label="Choose files" />
          <Button variant="secondary" onClick={() => fileRef.current?.click()} busy={uploading}><FolderOpen /> Choose files</Button>
          <Button variant="secondary" onClick={() => setSample(true)}><FileUp /> Attach a sample file</Button>
        </div> : <p className="text-sm text-text-muted">A configuration author attaches sources and starts drafting.</p>}
      </div>
      {results ? <IntakeResults results={results} /> : null}
      <DraftingSources id={id} canAuthor={canAuthor} />
      {!d.attachments.length ? <EmptyState title="No sources attached" description="Attach the program's official forms and guides. Each recognised form can be read and drafted with AI." /> : (
        <Table head={["Source", "Status and steps", "Next"]}>
          {d.attachments.map((a: any) => {
            const [tone, label] = STATUS[a.status] ?? ["neutral", a.status];
            const jobs = jobsFor(a.id);
            const ai = jobs.find((j: any) => j.kind === "field_map" && ["COMPLETED", "RUNNING", "QUEUED", "APPLIED"].includes(j.status));
            return (
              <tr key={a.id}>
                <td className="min-w-48"><p className="font-medium">{a.edition ?? a.fileName}</p><p className="text-xs text-text-muted">{a.kind} · {a.fileName} · {(a.bytes / 1024).toFixed(0)} KB · {a.uploadedVia === "SAMPLE" ? "sample button" : "uploaded by hand"}</p><a className="text-xs text-text-link underline" href={`/api/attachments/${a.id}/file`}>Open file</a></td>
                <td className="min-w-64"><Pill tone={tone}>{label}</Pill><p className="mt-1 max-w-lg text-xs text-text-muted">{a.statusDetail}</p>{jobs.length ? <div className="mt-1.5">{jobs.slice(0, 3).map((j: any) => <div key={j.id} className="mb-1 flex flex-wrap items-center gap-1 text-xs">{j.kind === "field_map" ? "AI draft" : "Read"} <ModePill mode={j.mode} /><StatusPill status={j.status} />{j.kind === "field_map" && j.status !== "RUNNING" ? <Link className="text-text-link underline" to={`/c/${id}/jobs/${j.id}`}>details</Link> : null}</div>)}</div> : null}</td>
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
      {sample ? <SampleDialog id={id} onClose={() => { setSample(false); invalidate(); }} attached={d.attachments.map((a: any) => a.sha256)} /> : null}
      {draftFor ? <DraftDialog a={draftFor} onClose={() => { setDraftFor(null); invalidate(); }} /> : null}
    </div>
  );
}

function ReuseButton({ a, d, onReuse, busy }: { a: any; d: any; onReuse: () => void; busy: boolean }) {
  const formKey = (a.edition ?? "").split(" (")[0];
  const cfg = useApi<any>(["config", d.combination.id, "draft"], `/combinations/${d.combination.id}/config?mode=draft`);
  const has = cfg.data?.snapshot?.forms?.some((f: any) => f.form_number === formKey);
  if (!cfg.data) return null;
  return has ? <Pill tone="ok">In this configuration</Pill> : <Button size="sm" variant="secondary" onClick={onReuse} busy={busy}><Recycle /> Add from library</Button>;
}

function SampleDialog({ id, onClose, attached }: { id: string; onClose: () => void; attached: string[] }) {
  const lib = useApi<any[]>(["official"], "/official-library");
  const toast = useToast();
  const [busy, setBusy] = React.useState<string | null>(null);
  const attach = async (f: any) => {
    setBusy(f.file);
    try { const r = await api(`/combinations/${id}/attachments/sample`, { method: "POST", json: { officialFile: f.file } }); toast.push({ tone: ["held", "new_edition_held", "older_edition_held", "refused", "failed"].includes(r.outcome) ? "danger" : "ok", text: `${f.edition}: ${r.message}` }); }
    catch (e) { toast.push({ tone: "danger", text: (e as Error).message }); }
    setBusy(null);
  };
  return (
    <Dialog wide open onOpenChange={(o) => !o && onClose()} title="Attach a sample file" description="Stands in for choosing a file from your computer: the file goes through the same upload, recognition and status handling." footer={<Button onClick={onClose}>Done</Button>}>
      <Table dense head={["Official file", "Kind", "Approved", ""]}>
        {(lib.data ?? []).map((f: any) => <tr key={f.file}><td><p className="font-medium">{f.edition}</p><p className="text-xs text-text-muted">{f.combination}</p></td><td className="text-xs">{f.kind}</td><td className="text-xs">{f.approval}</td><td>{attached.includes(f.sha256) ? <Pill tone="ok">Attached</Pill> : <Button size="sm" variant="secondary" busy={busy === f.file} onClick={() => attach(f)}>Attach</Button>}</td></tr>)}
      </Table>
    </Dialog>
  );
}

type SavedRun = { file: string; run_id: string; valid: boolean; recheckable: boolean; rechecked: boolean; at?: string; cost_usd?: number | null };

function DraftDialog({ a, onClose }: { a: any; onClose: () => void }) {
  const opts = useApi<any>(["draft-options", a.id], `/attachments/${a.id}/draft-options`);
  // The order the server uses: answers that pass today's check first, then ones it re-checks before use (Lead check A3).
  const runs: SavedRun[] = opts.data?.saved_runs ?? [];
  const saved = [...runs.filter((r) => r.valid), ...runs.filter((r) => r.recheckable)];
  const [mode, setMode] = React.useState<"live" | "replay" | "stub">("live");
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
        <label className="flex items-start gap-2"><input type="radio" checked={mode === "live"} onChange={() => setMode("live")} className="mt-1" /><span><b>Live AI call</b> through the guarded route: stub pass first, then Claude Opus 5.5, up to US$5 for this run. {l ? `Spent so far US$${l.committed_usd} of the US$${l.cap_usd} experiment cap; US$${l.remaining_usd} left.` : ""} {opts.data && !opts.data.key_present ? <span className="text-text-danger">The API key file is missing: a live call will be refused.</span> : null}</span></label>
        <label className="flex items-start gap-2"><input type="radio" checked={mode === "replay"} onChange={() => setMode("replay")} className="mt-1" disabled={!saved.length} /><span><b>Use the saved AI answer</b> (no model call, US$0): an earlier real answer for this same form, checked with today's rules before use and labelled wherever it is shown.{saved.length ? <Select className="mt-1" value={runFile} onChange={(e) => setRunFile(e.target.value)}>{saved.map((r) => <option key={r.file} value={r.file}>{r.run_id} · {r.at?.slice(0, 16)} · paid US${r.cost_usd?.toFixed(2)} then{r.recheckable ? " · re-checked first" : r.rechecked ? " · re-checked" : ""}</option>)}</Select> : <span className="block text-xs text-text-muted">No saved AI answer for this form yet.</span>}</span></label>
        <label className="flex items-start gap-2"><input type="radio" checked={mode === "stub"} onChange={() => setMode("stub")} className="mt-1" /><span><b>Stub pass only</b>: proves the guarded path end to end without network or cost; produces no AI content.</span></label>
        <Field label="Job" hint="Inputs: this form's inventory only (allowlisted); expected answers and family values are screened out of the prompt."><code className="mono block rounded bg-surface px-2 py-1">{opts.data?.job_id}</code></Field>
      </div>
    </Dialog>
  );
}

/** The one source upload used by Sources and forms and by the Documents area's checklist entry (D283): every file goes
 *  through the one form intake (P-51) in one request, with one result per file. Official setup sources only; never case
 *  or client evidence. */
export function useSourceUpload(id: string, setUploading: (b: boolean) => void, onResults?: (r: IntakeResult[]) => void) {
  const qc = useQueryClient();
  const toast = useToast();
  return async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    const fd = new FormData(); for (const f of Array.from(files)) fd.append("files", f);
    try {
      const r = await api(`/combinations/${id}/attachments`, { method: "POST", body: fd });
      onResults?.(r.results);
      const s = r.summary;
      toast.push({ tone: s.held || s.refused ? "danger" : "ok", text: [s.added && `${s.added} added to the library`, s.in_library && `${s.in_library} already in the library`, s.attached && `${s.attached} guide${s.attached === 1 ? "" : "s"} attached`, s.held && `${s.held} held for a person`, s.refused && `${s.refused} refused`].filter(Boolean).join(" · ") });
    } catch (e) { toast.push({ tone: "danger", text: (e as Error).message }); }
    setUploading(false); void qc.invalidateQueries();
  };
}
