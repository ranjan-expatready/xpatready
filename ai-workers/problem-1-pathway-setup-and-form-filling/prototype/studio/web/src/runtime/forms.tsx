// Case forms panel (runtime lane, R1d, plan §8 RT-13…RT-16): each PDF form for each person on the case, what a copy made
// now would write, whether it can be filed (P-71: only missing or unconfirmed facts and the form's own Validate block),
// and every copy made: generating, generated, out of date (with the facts that changed), locked, stale. A new copy is
// made only when the officer asks; a locked copy never changes (P-65). The page reads one list per case.
import * as React from "react";
import { AlertCircle, Check, Download, FileText, Lock, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { api, getActor, useActorId, useApi, useToast } from "@/lib/api";
import { Button, Notice, Pill } from "@/components/ui/controls";
import { Skeleton } from "@/components/ui/skeleton";
import { LOCK_KINDS, type CaseForm, type FormCopy } from "../../../contracts/runtime";
import { noRetryOnRefusal } from "./questionnaire";

const when = (at: string) => new Date(at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const busy = (c: FormCopy) => c.status === "QUEUED" || c.status === "RUNNING";

/** The forms of one case. Under the questionnaire view's query key, so any answer change refreshes it too. */
export function FormsPanel({ caseId }: { caseId: string }) {
  const actor = useActorId();
  const q = useApi<{ forms: CaseForm[] }>(["runtime", "view", caseId, "forms", actor], `/runtime/cases/${caseId}/forms`, {
    retry: noRetryOnRefusal, refetchInterval: (query) => ((query.state.data as { forms: CaseForm[] } | undefined)?.forms.some((f) => f.copies.some(busy)) ? 1000 : false),
  });
  return (
    <section aria-labelledby="forms-h" className="rounded-xl border border-border bg-surface-raised">
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border px-4 py-3">
        <h2 id="forms-h" className="text-base font-semibold">Forms</h2>
        <p className="text-[13px] text-text-muted">Filled from confirmed answers only. A new copy is made only when you ask; a locked copy never changes.</p>
      </header>
      {q.isLoading ? <div className="p-4"><Skeleton className="h-16 w-full" /></div>
        : q.isError ? <div className="p-4"><Notice tone="danger" title="The forms could not be loaded">{(q.error as Error).message}</Notice></div>
        : !q.data!.forms.length ? <p className="px-4 py-3 text-sm text-text-muted">No PDF form applies to anyone on this case yet.</p>
        : <ul className="divide-y divide-border">{q.data!.forms.map((f) => <FormRow key={`${f.form}|${f.subject_id}`} caseId={caseId} f={f} />)}</ul>}
    </section>
  );
}

function CopyState({ c }: { c: FormCopy }) {
  if (busy(c)) return <Pill tone="info" title="The copy is being written and checked">{c.status === "QUEUED" ? "Waiting to generate…" : "Generating…"}</Pill>;
  if (c.status === "FAILED") return <Pill tone="danger" title={c.error ?? ""}>Failed</Pill>;
  if (c.stale) return <Pill tone="danger" title={`Facts changed after this copy was locked: ${c.changed.join(", ")}`}><Lock className="size-3" aria-hidden />Stale · {c.locked ? LOCK_KINDS[c.locked.kind] : ""}</Pill>;
  if (c.locked) return <Pill tone="ok" title={`Locked ${when(c.locked.at)}: it never changes`}><Lock className="size-3" aria-hidden />{LOCK_KINDS[c.locked.kind]}</Pill>;
  if (c.out_of_date) return <Pill tone="warn" title={`Facts changed since this copy was made: ${c.changed.join(", ")}`}>Out of date</Pill>;
  return <Pill tone="ok"><Check className="size-3" aria-hidden />Generated</Pill>;
}

function FormRow({ caseId, f }: { caseId: string; f: CaseForm }) {
  const qc = useQueryClient(), toast = useToast();
  const [working, setWorking] = React.useState(false);
  const [locking, setLocking] = React.useState<keyof typeof LOCK_KINDS | null>(null);
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
  }
  const canLock = latest && latest.status === "GENERATED" && !latest.locked && !latest.out_of_date;
  return (
    <li className="space-y-2 px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <FileText className="size-4 text-text-muted" aria-hidden />
        <h3 className="text-sm font-semibold">{f.form} <span className="font-normal text-text-muted">for</span> <span className="[overflow-wrap:anywhere]">{f.person}</span></h3>
        {f.readiness.ready ? <Pill tone="ok" title="Every required fact this form reads is confirmed (the form's own Validate still runs in Adobe)"><Check className="size-3" aria-hidden />Ready to file</Pill>
          : <Pill tone="warn" title={f.readiness.missing.slice(0, 12).map((m) => `${m.label} (${m.about})`).join("; ")}>{f.readiness.missing.length} fact{f.readiness.missing.length === 1 ? "" : "s"} to confirm before filing</Pill>}
        <span className="flex-1" />
        <Button size="sm" variant={!latest || latest.out_of_date || latest.status === "FAILED" ? "default" : "secondary"} busy={working || (latest ? busy(latest) : false)} onClick={() => void generate()}>
          <RefreshCw aria-hidden />{latest ? "Generate a new copy" : "Generate a copy"}
        </Button>
      </div>
      <p className="text-[13px] text-text-muted">A copy made now writes {f.draft.written_now} of {f.draft.mapped} form fields from confirmed answers{f.draft.unconfirmed ? `; ${f.draft.unconfirmed} answered but not confirmed stay blank` : ""}.</p>
      {latest ? <CopyLine c={latest} canLock={!!canLock} locking={locking} setLocking={setLocking} lock={lock} working={working} /> : null}
      {locked && locked !== latest ? <CopyLine c={locked} canLock={false} locking={null} setLocking={() => {}} lock={lock} working={working} /> : null}
      {earlier.length ? (
        <details className="text-[13px]">
          <summary className="cursor-pointer text-text-link">Earlier copies ({earlier.length})</summary>
          <ul className="mt-1 space-y-1 pl-4">{earlier.map((c) => <li key={c.id}><CopyLine c={c} canLock={false} locking={null} setLocking={() => {}} lock={lock} working={working} compact /></li>)}</ul>
        </details>
      ) : null}
    </li>
  );
}

function CopyLine({ c, canLock, locking, setLocking, lock, working, compact }: { c: FormCopy; canLock: boolean; locking: keyof typeof LOCK_KINDS | null; setLocking: (k: keyof typeof LOCK_KINDS | null) => void; lock: (id: string, k: keyof typeof LOCK_KINDS) => Promise<void>; working: boolean; compact?: boolean }) {
  const toast = useToast();
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
        <CopyState c={c} />
        <span className="text-text-muted">Copy of {when(c.created_at)}{c.counts ? ` · ${c.counts.written} form fields written${c.counts.by_hand ? `, ${c.counts.by_hand} by hand` : ""}` : ""}{c.intact ? " · read back and checked" : ""}</span>
        {c.status === "GENERATED" ? <Button size="sm" variant="ghost" onClick={() => void download()} aria-label={`Download the copy of ${when(c.created_at)}`}><Download aria-hidden />Download</Button> : null}
        {canLock && !locking ? <>
          <Button size="sm" variant="secondary" onClick={() => setLocking("validated_copy_uploaded")}><Lock aria-hidden />Validated copy uploaded back</Button>
          <Button size="sm" variant="secondary" onClick={() => setLocking("filed")}><Lock aria-hidden />Filed</Button>
        </> : null}
      </div>
      {!compact && locking ? (
        <div role="group" aria-label="Lock this copy" className="flex flex-wrap items-center gap-2 text-[13px]">
          <span>Lock this copy as “{LOCK_KINDS[locking]}”? A locked copy never changes; a later answer marks it stale.</span>
          <Button size="sm" busy={working} onClick={() => void lock(c.id, locking)}>Lock</Button>
          <Button size="sm" variant="ghost" onClick={() => setLocking(null)}>Cancel</Button>
        </div>
      ) : null}
      {!compact && (c.out_of_date || c.stale) ? <p className="flex items-start gap-1 text-[13px] text-text-warn"><AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />{c.stale ? "Facts changed after this copy was locked; the locked file is kept as it was." : "Facts changed since this copy was made; generate a new copy to file it."} Changed: {c.changed.join(", ")}.</p> : null}
      {!compact && c.status === "FAILED" ? <p className="text-[13px] text-text-danger">{c.error}</p> : null}
      {!compact && c.status === "GENERATED" && c.person_steps.length ? <p className="text-[13px] text-text-muted">Before filing, on the PDF: {c.person_steps.join(" ")}</p> : null}
    </div>
  );
}
