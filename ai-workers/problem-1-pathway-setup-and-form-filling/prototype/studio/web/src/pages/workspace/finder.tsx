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
import { costWords, START } from "../../../../contracts/start-setup";
import { FindFormsStart } from "@/components/start-setup";
import { useCostGate } from "@/components/cost-warning";
import { COST_WORDS } from "../../../../contracts/cost-check";

export type FinderState = "ATTACHED" | "DOWNLOADED_ATTACHED" | "NEWER_FILE_SAME_EDITION" | "NOT_FOUND" | "UPLOAD_WAITING_SECOND_PERSON" | "REMOVED_BY_PERSON" | "TO_DECIDE" | "NOT_FOR_THIS_APPLICATION";
export type FinderForm = { code: string; title: string; quote: string | null; conditionPlain: string | null; who: string | null; state: FinderState; why?: string | null; /** C11.15 (P-156 (4)): where the file is on canada.ca when its download failed. */ link?: string | null; lineId?: string | null; lineVersion?: number | null; runId: string };
/** S3 item 5: a run that could not pick the application page names the pages it saw; the person chooses one here. */
export type PageChoice = { candidates: { title: string; url: string }[]; why: string };
export type FinderLatest = { run: { id: string; status: string; mode: string; finished_at: string | null } | null; forms: FinderForm[]; sample_note?: string; page_choice?: PageChoice | null };
type Mode = "replay" | "rules" | "live";
type Plan = { live?: { on: boolean; why: string | null }; steps: { n: number; label: string; uses_ai: boolean; chosen?: boolean; worst_usd?: number | null }[]; totals: { worst_usd: number | null; expected_usd: number | null; about_usd?: number | null; ai_rounds: number }; note?: string | null; plan_sha256: string };

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

/** Find forms with AI: the plan and its cost first, then the run (Find again, and Redo for one form with `only`). With
 *  `page` (S3 item 5), the person first chooses the application page the last run could not pick: from the pages it saw,
 *  or another canada.ca address; the plan then reads only that page (the server refuses any other site). */
export function FindDialog({ id, only, page, onClose, onStarted }: { id: string; only?: string[]; page?: PageChoice | null; onClose: () => void; onStarted: (runId: string) => void }) {
  const [mode, setMode] = React.useState<Mode>(page ? "live" : "replay");
  const [picked, setPicked] = React.useState<string>(page?.candidates[0]?.url ?? "");
  const [other, setOther] = React.useState("");
  const pageUrl = page ? (picked === "other" ? other.trim() : picked) || undefined : undefined;
  const key = React.useMemo(() => crypto.randomUUID(), []);
  const plan = useQuery<Plan, ApiError>({ queryKey: ["finder-plan", id, mode, only?.join(",") ?? "", pageUrl ?? ""], queryFn: () => api<Plan>(`/combinations/${id}/forms/find/plan`, { method: "POST", json: { mode, ...(only ? { only } : {}), ...(pageUrl ? { pageUrl } : {}) } }), retry: false, enabled: !page || !!pageUrl });
  const [busy, setBusy] = React.useState(false), [error, setError] = React.useState<string | null>(null);
  const qc = useQueryClient(), toast = useToast();
  // Lead Critical 29 Oct: with AI now switched off on this copy the live choice is greyed with the reason (any plan says it).
  const liveOff = plan.data?.live && !plan.data.live.on ? plan.data.live.why : null;
  React.useEffect(() => { if (liveOff && mode === "live") setMode(page ? "rules" : "replay"); }, [liveOff, mode, page]);
  const cost = useCostGate(); // P-179: over a limit, the cost warning first (Continue or Cancel)
  const start = async () => {
    if (!plan.data) return;
    setBusy(true); setError(null);
    try {
      const body = { mode, ...(only ? { only } : {}), ...(pageUrl ? { pageUrl } : {}) };
      const v = (await cost.gate(plan.data as unknown as Parameters<typeof cost.gate>[0], { kind: "find_forms", combinationId: id, ...body },
        (overrideId) => api<{ id: string }>(`/combinations/${id}/forms/find`, { method: "POST", json: { ...body, planSha256: plan.data!.plan_sha256, idempotencyKey: `s5-${key}-${mode}-${pageUrl ?? ""}`, ...(overrideId ? { overrideId } : {}) } }))) as { id: string } | undefined;
      // Review m7: Cancel is the person's choice, not an error: the same info toast as Draft setup.
      if (!v) { toast.push({ tone: "info", text: COST_WORDS.cancelled }); return; }
      for (const k of formsKeys(id)) void qc.invalidateQueries({ queryKey: k });
      void qc.invalidateQueries({ queryKey: ["combination", id, "finder"] });
      onStarted(v.id); onClose();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  const title = only?.length ? `Redo with AI: ${only.join(", ")}` : page ? START.pageButton : "Find this combination's forms";
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }} title={title} description="AI reads the application's canada.ca pages and its guide, names each form with IRCC's words, and attaches the ones both rounds agree on. Which forms apply is Sample until the immigration expert confirms."
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => void start()} busy={busy} disabled={!plan.data}><Sparkles /> Start</Button></>}>
      <div className="space-y-4" data-find-dialog>
        {page ? (
          <fieldset className="space-y-2" data-page-choice>
            <legend className="text-xs font-medium">{START.pageLegend}</legend>
            <p className="text-xs text-text-muted">{START.pageHint}</p>
            {page.candidates.map((c) => (
              <label key={c.url} className="flex gap-2 text-sm"><input type="radio" name="find-page" checked={picked === c.url} onChange={() => setPicked(c.url)} className="mt-1" /><span><span className="font-medium">{c.title}</span><br /><span className="break-all text-xs text-text-muted">{c.url}</span></span></label>
            ))}
            <label className="flex gap-2 text-sm"><input type="radio" name="find-page" checked={picked === "other" || !page.candidates.length} onChange={() => setPicked("other")} className="mt-1" /><span className="flex-1"><span className="font-medium">{START.pageOther}</span>
              <input type="url" aria-label={START.pageOther} placeholder="https://www.canada.ca/en/immigration-refugees-citizenship/…" value={other} onFocus={() => setPicked("other")} onChange={(e) => setOther(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-surface px-2 py-1 text-sm" data-page-other /></span></label>
          </fieldset>
        ) : null}
        <fieldset className="space-y-2">
          <legend className="text-xs font-medium">How AI answers</legend>
          {MODES.map(([m, label, hint]) => (
            <label key={m} className={`flex gap-2 text-sm${m === "live" && liveOff ? " text-text-muted" : ""}`} data-mode={m}><input type="radio" name="find-mode" checked={mode === m} disabled={m === "live" && !!liveOff} onChange={() => setMode(m)} className="mt-1" /><span><span className="font-medium">{label}</span><br /><span className="text-xs text-text-muted">{m === "live" && liveOff ? liveOff : hint}</span></span></label>
          ))}
        </fieldset>
        {plan.isPending ? <p className="text-sm text-text-muted">Working out the steps and their cost…</p> : plan.error ? <Notice tone="danger" title="This find cannot start">{plan.error.message}</Notice> : plan.data ? (
          <div className="rounded-lg border border-border p-3 text-sm" data-find-plan>
            <ol className="list-decimal space-y-0.5 pl-5">{plan.data.steps.map((s) => <li key={s.n}>{s.label} {s.uses_ai ? <Pill tone="ai">AI</Pill> : s.chosen ? <Pill title="The page a person chose: no AI and no rule reads it again">your choice</Pill> : <Pill>rules</Pill>}{mode === "live" && s.worst_usd != null ? <span className="ml-1 text-xs text-text-muted" data-step-reserve>at most US${s.worst_usd.toFixed(2)}</span> : null}</li>)}</ol>
            <p className="mt-2 font-medium" data-find-cost>{mode === "live" ? `${costWords(plan.data.totals.about_usd ?? null, plan.data.totals.worst_usd ?? 0).replace(/^./, (x) => x.toUpperCase())}, inside the AI spending cap. Nothing is spent until you click Start.` : "Cost: US$0 (no AI call)."}</p>
            {plan.data.note ? <p className="mt-1 text-xs text-text-muted">{plan.data.note}</p> : null}
          </div>
        ) : null}
        {error ? <p role="alert" className="text-sm text-text-danger">{error}</p> : null}
        {cost.dialog}
      </div>
    </Dialog>
  );
}

/** The finder's strip above the lines: what the latest find did, Find (again), and its run while it runs. */
/** lineCount: the combination's form lines (QA-78: forms added without a find are counted, never "No form find yet"). */
export function FinderPanel({ id, latest, onRedo, onChoosePage, removed = [], lineCount = 0 }: { id: string; latest: FinderLatest | undefined; onRedo: (codes?: string[]) => void; onChoosePage: () => void; removed?: string[]; lineCount?: number }) {
  const { canAuthor } = useSessionView();
  const qc = useQueryClient();
  const [runId, setRunId] = React.useState<string | null>(null);
  const run = latest?.run ?? null;
  const shown = runId ?? (run && ACTIVE.has(run.status) ? run.id : null);
  const forms = latest?.forms ?? [];
  // S3 item 5: the run waits for the application page: the one call to action is choosing it (never a dead end).
  const waitsForPage = !!run && !ACTIVE.has(run.status) && !!latest?.page_choice;
  const attached = forms.filter((f) => ON_LINE.has(f.state)).length, notFound = forms.filter((f) => f.state === "NOT_FOUND" || f.state === "UPLOAD_WAITING_SECOND_PERSON").length, decide = forms.filter((f) => f.state === "TO_DECIDE").length;
  // A run started here (FindDialog) is shown at once; the strip keeps it until it ends, then refreshes the lines.
  React.useEffect(() => { const h = (e: Event) => setRunId((e as CustomEvent<string>).detail); window.addEventListener("s5-find-started", h); return () => window.removeEventListener("s5-find-started", h); }, []);
  return (
    <section aria-label="Forms found by AI" className="space-y-3 rounded-xl border border-border bg-surface-raised p-4" data-finder>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="text-sm">
          <p className="font-medium">{waitsForPage ? START.pageTitle : run ? `AI found ${attached} form${attached === 1 ? "" : "s"} for this combination${notFound ? `, ${notFound} not found` : ""}${decide ? `, ${decide} to decide` : ""}` : lineCount ? `${lineCount} form${lineCount === 1 ? "" : "s"} on this combination` : "No form find yet"}</p>
          <p className="text-xs text-text-muted" data-finder-status>{waitsForPage ? `${START.pageBody} ` : run ? `Last find ${run.finished_at ? fmtWhen(run.finished_at) : "running now"}${run.mode === "replay" ? " · saved AI answers, US$0" : run.mode === "rules" ? " · rules only, US$0" : ""}. ` : lineCount ? "Added without an AI find. Nothing was spent on finding forms yet. " : `${START.body} `}Which forms apply is Sample until the immigration expert confirms.</p>
        </div>
        {/* Lead split (28 Oct): the first find is started from Start setup (screens lane, S3): its "Find forms with AI"
            button is this slot. Once a find exists, Find again (or choosing the page it waits for) is this list's one action. */}
        {run ? (canAuthor ? (waitsForPage ? <Button size="sm" onClick={onChoosePage} disabled={!!shown} data-find-forms="page">{START.pageButton}</Button>
          : <Button size="sm" variant="secondary" onClick={() => onRedo()} disabled={!!shown} data-find-forms="again"><RefreshCw /> Find again</Button>) : null) : <FindFormsStart combinationId={id} />}
      </div>
      {shown ? <RunCard runId={shown} onEnded={() => { setRunId(null); for (const k of [...formsKeys(id), ["combination", id, "finder"]]) void qc.invalidateQueries({ queryKey: k }); }} /> : null}
      {/* A form removed in this draft is listed once, under "Removed in this draft" with Add back (forms.tsx). */}
      <FinderRows id={id} forms={forms.filter((f) => !ON_LINE.has(f.state) && !(f.state === "REMOVED_BY_PERSON" && removed.includes(f.code)))} onRedo={onRedo} canAuthor={canAuthor} />
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
            {f.state === "NOT_FOUND" && f.link ? <a className="inline-flex h-8 items-center rounded px-1 text-sm text-text-link underline outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50" href={f.link} target="_blank" rel="noreferrer" data-download-link>Download from this link<span className="sr-only"> (canada.ca, opens in a new tab)</span></a> : null}
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
