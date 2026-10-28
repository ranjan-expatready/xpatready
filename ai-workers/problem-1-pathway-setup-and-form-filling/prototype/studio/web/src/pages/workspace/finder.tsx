// S5 slice 3 (W1-08, P-123, challenge M2 and M5): the combination's forms come from the form finder (forms lane, S4).
// The Forms tab starts a find (plan first, its cost said before anything runs), shows the run on the forms lane's run
// card, and lists what the latest find found that is not a line: not found (Upload PDF · Find again), waiting for a second
// person, to decide, removed by a person (Add back) and not for this application. Lines AI attached show "Picked by AI ·
// Sample" with IRCC's words in their own rows (forms.tsx). Which forms apply is Sample until the immigration expert
// confirms. Endpoints are the forms lane's: …/forms/find/plan, …/forms/find, …/forms/find/latest, POST …/forms,
// /library/forms/upload (forCombination, forCode).
import * as React from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileUp, Plus, RefreshCw, Sparkles } from "lucide-react";
import { api, ApiError, useApi, useSessionView, useToast } from "@/lib/api";
import { Button, Dialog, Notice, Pill } from "@/components/ui/controls";
import { RunCard } from "@/components/run-card";
import { fmtWhen } from "@/components/status";
import { irccWords } from "../../../../contracts/workspace";

export type FinderState = "ATTACHED" | "DOWNLOADED_ATTACHED" | "NEWER_FILE_SAME_EDITION" | "NOT_FOUND" | "UPLOAD_WAITING_SECOND_PERSON" | "REMOVED_BY_PERSON" | "TO_DECIDE" | "NOT_FOR_THIS_APPLICATION";
export type FinderForm = { code: string; title: string; quote: string | null; conditionPlain: string | null; who: string | null; state: FinderState; why?: string | null; lineId?: string | null; lineVersion?: number | null; runId: string };
export type FinderLatest = { run: { id: string; status: string; mode: string; finished_at: string | null } | null; forms: FinderForm[]; sample_note?: string };
type Mode = "replay" | "rules" | "live";
type Plan = { steps: { n: number; label: string; uses_ai: boolean }[]; totals: { worst_usd: number | null; expected_usd: number | null; ai_rounds: number }; note?: string | null; plan_sha256: string };

const ACTIVE = new Set(["QUEUED", "RUNNING"]);
const ON_LINE = new Set<FinderState>(["ATTACHED", "DOWNLOADED_ATTACHED", "NEWER_FILE_SAME_EDITION"]);
/** Every read the Forms tab shows, refreshed after a find, an attach or an upload. */
export const formsKeys = (id: string) => [["combination", id], ["combination-summary", id], ["config", id], ["catalogue"], ["draft"], ["runs-active"]];

export const useFinderLatest = (id: string) => useApi<FinderLatest>(["combination", id, "finder"], `/combinations/${id}/forms/find/latest`, { refetchInterval: (q) => (q.state.data?.run && ACTIVE.has(q.state.data.run.status) ? 2000 : false) });

const MODES: [Mode, string, string][] = [
  ["replay", "Use saved AI answers (US$0)", "Replays the answers AI gave for these exact pages before. Only combinations with saved answers can be found this way."],
  ["rules", "Rules only (US$0)", "Reads the pages and lists the form numbers printed on them; attaches nothing."],
  ["live", "AI now (cost shown below)", "Two AI rounds read the pages and must agree; only forms both pick are attached."],
];

/** Find forms with AI: the plan and its cost first, then the run (Find again, and Redo for one form with `only`). */
export function FindDialog({ id, only, onClose, onStarted }: { id: string; only?: string[]; onClose: () => void; onStarted: (runId: string) => void }) {
  const [mode, setMode] = React.useState<Mode>("replay");
  const key = React.useMemo(() => crypto.randomUUID(), []);
  const plan = useQuery<Plan, ApiError>({ queryKey: ["finder-plan", id, mode, only?.join(",") ?? ""], queryFn: () => api<Plan>(`/combinations/${id}/forms/find/plan`, { method: "POST", json: { mode, ...(only ? { only } : {}) } }), retry: false });
  const [busy, setBusy] = React.useState(false), [error, setError] = React.useState<string | null>(null);
  const qc = useQueryClient();
  const start = async () => {
    if (!plan.data) return;
    setBusy(true); setError(null);
    try {
      const v = await api<{ id: string }>(`/combinations/${id}/forms/find`, { method: "POST", json: { mode, ...(only ? { only } : {}), planSha256: plan.data.plan_sha256, idempotencyKey: `s5-${key}-${mode}` } });
      for (const k of formsKeys(id)) void qc.invalidateQueries({ queryKey: k });
      void qc.invalidateQueries({ queryKey: ["combination", id, "finder"] });
      onStarted(v.id); onClose();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  const title = only?.length ? `Redo with AI: ${only.join(", ")}` : "Find this combination's forms";
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }} title={title} description="AI reads the application's canada.ca pages and its guide, names each form with IRCC's words, and attaches the ones both rounds agree on. Which forms apply is Sample until the immigration expert confirms."
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => void start()} busy={busy} disabled={!plan.data}><Sparkles /> Start</Button></>}>
      <div className="space-y-4" data-find-dialog>
        <fieldset className="space-y-2">
          <legend className="text-xs font-medium">How AI answers</legend>
          {MODES.map(([m, label, hint]) => (
            <label key={m} className="flex gap-2 text-sm"><input type="radio" name="find-mode" checked={mode === m} onChange={() => setMode(m)} className="mt-1" /><span><span className="font-medium">{label}</span><br /><span className="text-xs text-text-muted">{hint}</span></span></label>
          ))}
        </fieldset>
        {plan.isPending ? <p className="text-sm text-text-muted">Working out the steps and their cost…</p> : plan.error ? <Notice tone="danger" title="This find cannot start">{plan.error.message}</Notice> : plan.data ? (
          <div className="rounded-lg border border-border p-3 text-sm" data-find-plan>
            <ol className="list-decimal space-y-0.5 pl-5">{plan.data.steps.map((s) => <li key={s.n}>{s.label} {s.uses_ai ? <Pill tone="ai">AI</Pill> : <Pill>rules</Pill>}</li>)}</ol>
            <p className="mt-2 font-medium" data-find-cost>{mode === "live" ? `At most US$${(plan.data.totals.worst_usd ?? 0).toFixed(2)}${plan.data.totals.expected_usd != null ? ` (usually about US$${plan.data.totals.expected_usd.toFixed(2)})` : " (no earlier run to say the usual cost)"}, inside the AI spending cap.` : "Cost: US$0 (no AI call)."}</p>
            {plan.data.note ? <p className="mt-1 text-xs text-text-muted">{plan.data.note}</p> : null}
          </div>
        ) : null}
        {error ? <p role="alert" className="text-sm text-text-danger">{error}</p> : null}
      </div>
    </Dialog>
  );
}

/** The finder's strip above the lines: what the latest find did, Find (again), and its run while it runs. */
export function FinderPanel({ id, latest, onRedo }: { id: string; latest: FinderLatest | undefined; onRedo: (codes?: string[]) => void }) {
  const { canAuthor } = useSessionView();
  const qc = useQueryClient();
  const [runId, setRunId] = React.useState<string | null>(null);
  const run = latest?.run ?? null;
  const shown = runId ?? (run && ACTIVE.has(run.status) ? run.id : null);
  const forms = latest?.forms ?? [];
  const attached = forms.filter((f) => ON_LINE.has(f.state)).length, notFound = forms.filter((f) => f.state === "NOT_FOUND" || f.state === "UPLOAD_WAITING_SECOND_PERSON").length, decide = forms.filter((f) => f.state === "TO_DECIDE").length;
  // A run started here (FindDialog) is shown at once; the strip keeps it until it ends, then refreshes the lines.
  React.useEffect(() => { const h = (e: Event) => setRunId((e as CustomEvent<string>).detail); window.addEventListener("s5-find-started", h); return () => window.removeEventListener("s5-find-started", h); }, []);
  return (
    <section aria-label="Forms found by AI" className="space-y-3 rounded-xl border border-border bg-surface-raised p-4" data-finder>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="text-sm">
          <p className="font-medium">{run ? `AI found ${attached} form${attached === 1 ? "" : "s"} for this combination${notFound ? `, ${notFound} not found` : ""}${decide ? `, ${decide} to decide` : ""}` : "No form find yet"}</p>
          <p className="text-xs text-text-muted" data-finder-status>{run ? `Last find ${run.finished_at ? fmtWhen(run.finished_at) : "running now"}${run.mode === "replay" ? " · saved AI answers, US$0" : run.mode === "rules" ? " · rules only, US$0" : ""}. ` : "AI reads the application's canada.ca pages and guide and attaches the forms it finds. "}Which forms apply is Sample until the immigration expert confirms.</p>
        </div>
        {canAuthor ? <Button size="sm" variant={run ? "secondary" : "default"} onClick={() => onRedo()} disabled={!!shown}>{run ? <><RefreshCw /> Find again</> : <><Sparkles /> Find forms with AI</>}</Button> : null}
      </div>
      {shown ? <RunCard runId={shown} onEnded={() => { setRunId(null); for (const k of [...formsKeys(id), ["combination", id, "finder"]]) void qc.invalidateQueries({ queryKey: k }); }} /> : null}
      <FinderRows id={id} forms={forms.filter((f) => !ON_LINE.has(f.state))} onRedo={onRedo} canAuthor={canAuthor} />
    </section>
  );
}

const STATE_WORDS: Record<FinderState, [string, "warn" | "danger" | "info" | "neutral" | "ai"]> = {
  ATTACHED: ["On this combination", "info"], DOWNLOADED_ATTACHED: ["Downloaded from canada.ca and added", "info"], NEWER_FILE_SAME_EDITION: ["A newer file on canada.ca", "warn"],
  NOT_FOUND: ["Not found", "danger"], UPLOAD_WAITING_SECOND_PERSON: ["Uploaded · waiting for a second person", "warn"], REMOVED_BY_PERSON: ["Removed by a person", "neutral"],
  TO_DECIDE: ["AI's two rounds disagree · you decide", "warn"], NOT_FOR_THIS_APPLICATION: ["Not for this application", "neutral"],
};

/** What the latest find named that is not a line on this combination, each with the step that moves it. */
function FinderRows({ id, forms, onRedo, canAuthor }: { id: string; forms: FinderForm[]; onRedo: (codes?: string[]) => void; canAuthor: boolean }) {
  const qc = useQueryClient(), toast = useToast();
  const [busy, setBusy] = React.useState<string | null>(null);
  const refresh = () => { for (const k of [...formsKeys(id), ["combination", id, "finder"]]) void qc.invalidateQueries({ queryKey: k }); };
  const add = async (code: string) => {
    setBusy(code);
    try { await api(`/combinations/${id}/forms`, { method: "POST", json: { formKey: code } }); toast.push({ tone: "ok", text: `${code} added to this combination from the library. Undo is above the forms.` }); refresh(); }
    catch (e) { toast.push({ tone: "danger", text: (e as Error).message }); } finally { setBusy(null); }
  };
  const main = forms.filter((f) => f.state !== "NOT_FOR_THIS_APPLICATION"), notFor = forms.filter((f) => f.state === "NOT_FOR_THIS_APPLICATION");
  if (!forms.length) return null;
  return (
    <div className="space-y-2">
      {main.length ? <ul className="divide-y divide-border rounded-lg border border-border" data-finder-rows>{main.map((f) => (
        <li key={f.code} className="flex flex-wrap items-start justify-between gap-3 px-3 py-2.5" data-finder-row={f.code} data-state={f.state}>
          <div className="min-w-64 flex-1 text-sm">
            <p><span className="mono font-medium">{f.code}</span> {f.title} <Pill tone={STATE_WORDS[f.state][1]}>{STATE_WORDS[f.state][0]}</Pill></p>
            {f.quote ? <p className="text-xs text-text-muted">IRCC's words: "{irccWords(f.quote)!.slice(0, 200)}{f.quote.length > 200 ? "…" : ""}"</p> : null}
            {f.why ? <p className="text-xs text-text-muted">{f.why}</p> : null}
          </div>
          {canAuthor ? <span className="flex flex-wrap gap-2">
            {f.state === "NOT_FOUND" ? <><UploadFor id={id} code={f.code} onDone={refresh} /><Button size="sm" variant="ghost" onClick={() => onRedo([f.code])}><RefreshCw /> Find again</Button></> : null}
            {f.state === "UPLOAD_WAITING_SECOND_PERSON" ? <Link className="text-sm text-text-link underline" to="/review">Open To review</Link> : null}
            {f.state === "REMOVED_BY_PERSON" || f.state === "TO_DECIDE" ? <Button size="sm" variant="secondary" onClick={() => void add(f.code)} busy={busy === f.code}><Plus /> {f.state === "REMOVED_BY_PERSON" ? "Add back" : "Add to this combination"}</Button> : null}
          </span> : null}
        </li>
      ))}</ul> : null}
      {notFor.length ? <details className="text-sm" data-not-for><summary className="cursor-pointer text-text-muted">Not for this application ({notFor.length})</summary><ul className="mt-1 space-y-1 pl-4">{notFor.map((f) => <li key={f.code}><span className="mono">{f.code}</span> {f.title}{f.quote ? <span className="text-xs text-text-muted"> · IRCC's words: "{irccWords(f.quote)!.slice(0, 140)}"</span> : null}</li>)}</ul></details> : null}
    </div>
  );
}

/** Not found → Upload PDF: the file goes through the library's checks and joins this combination once usable. */
function UploadFor({ id, code, onDone }: { id: string; code: string; onDone: () => void }) {
  const input = React.useRef<HTMLInputElement>(null), toast = useToast();
  const [busy, setBusy] = React.useState(false);
  const send = async (file: File) => {
    setBusy(true);
    const fd = new FormData(); fd.append("files", file, file.name); fd.append("forCombination", id); fd.append("forCode", code);
    try {
      const r = await api<{ runId: string; refused?: { file: string; why: string }[] }>("/library/forms/upload", { method: "POST", body: fd });
      if (r.refused?.length) toast.push({ tone: "danger", text: r.refused.map((x) => `${x.file}: ${x.why}`).join(" · ") });
      else { toast.push({ tone: "ok", text: `${file.name} is being checked. ${code} joins this combination once it is usable.` }); window.dispatchEvent(new CustomEvent("s5-find-started", { detail: r.runId })); }
      onDone();
    } catch (e) { toast.push({ tone: "danger", text: (e as Error).message }); } finally { setBusy(false); }
  };
  return <>
    <Button size="sm" onClick={() => input.current?.click()} busy={busy}><FileUp /> Upload PDF</Button>
    <input ref={input} type="file" tabIndex={-1} accept="application/pdf,.pdf" className="sr-only" aria-label={`Choose the PDF of ${code}`} onChange={(e) => { const f = e.target.files?.[0]; if (f) void send(f); e.target.value = ""; }} />
  </>;
}
