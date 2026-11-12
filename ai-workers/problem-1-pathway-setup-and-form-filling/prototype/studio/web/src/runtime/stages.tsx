// C6.17 A multi-stage case (B139; board screens/B139/design/draft-multi-stage.html; concept §4, §5). Under the case
// header, a stage strip (GOV.UK task-list statuses) when the case is on a route: each stage's status, the current one's
// deadline (Sample) and "Start next stage: <name>" when a next stage exists. The dialog says before the click what comes
// along, what is asked again, who files nothing, what is unrecorded and the deadline; one transaction, "This cannot be
// undone". A stage chip opens its own record in a side panel (read only; a done-before stage's key details editable).
// "Open a case" adds an "Earlier stages" step when the chosen combination is a later stage of a route. Every word, count
// and date comes from the server (GET /runtime/cases/:id/stages, …/stages/next, …/stages/:stage); identical with AI off.
import * as React from "react";
import { ArrowRight, Info } from "lucide-react";
import { api, ApiError, useActorId, useApi, useToast } from "@/lib/api";
import { Button, Dialog, Field, Input, Notice, Panel, Pill, Textarea } from "@/components/ui/controls";
import { Skeleton } from "@/components/ui/skeleton";
import { Tip, TipProvider } from "@/components/status";
import { useQueryClient } from "@tanstack/react-query";
import type { CaseStages, CaseStageView, OpenableRelease, StartNextPreview } from "../../../contracts/runtime";
import { noRetryOnRefusal } from "./questionnaire";

const STRIP_TIP = "A stage is one application on this client's route. Earlier stages stay here as history.";
const ENDED_TIP = "The firm moved to the next application; IRCC's decision is recorded on the filing.";
const DONE_TIP = "Done before we started: made before the firm took the case. Its details are kept on this stage.";
const day = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const TONE: Record<CaseStageView["state"], string> = { DONE_BEFORE: "ok", NOT_RECORDED: "neutral", CURRENT: "info", ENDED_NEXT_STARTED: "neutral", NOT_STARTED: "neutral" };

function InfoTip({ tip, label }: { tip: string; label: string }) {
  // Review M3 (WCAG 2.5.8): a 24 px target, never inside another button.
  return <Tip tip={tip}><button type="button" className="inline-flex size-6 shrink-0 items-center justify-center rounded-sm text-text-muted outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label={label}><Info className="size-3.5" aria-hidden /></button></Tip>;
}

export function useStages(caseId: string) {
  const actor = useActorId();
  return useApi<CaseStages>(["runtime", "view", caseId, "stages", actor], `/runtime/cases/${caseId}/stages`, { retry: noRetryOnRefusal });
}

/** The deadline line (Sample everywhere, BR-8). */
function Deadline({ d }: { d: NonNullable<CaseStageView["deadline"]> }) {
  return <p className="text-xs text-text-muted" data-stage-deadline>{d.due ? <>{d.label} <span className="font-medium text-text">{day(d.due)}</span></> : d.why} <Pill tone="warn" title={d.why}>Sample</Pill></p>;
}

/** The strip under the case header; nothing for a one-stage case (no route) or while it loads. */
export function StageStrip({ caseId }: { caseId: string }) {
  const q = useStages(caseId);
  const [panel, setPanel] = React.useState<string | null>(null);
  const [starting, setStarting] = React.useState(false);
  const opener = React.useRef<HTMLButtonElement>(null);
  const chip = React.useRef<HTMLButtonElement | null>(null); // breaker m3: the chip that opened the panel takes focus back
  const v = q.data;
  if (q.isLoading) return <Skeleton className="h-[64px] w-full rounded-lg" aria-hidden />;
  if (!v || v.stages.length < 2) return null;
  const next = v.stages.find((s) => s.id === v.next);
  return (
    <TipProvider>
      <section aria-labelledby="stages-h" className="rounded-lg border border-border bg-surface-raised" data-stage-strip>
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2">
          <h2 id="stages-h" tabIndex={-1} className="text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-primary">Stages</h2>
          {v.route ? <span className="text-xs text-text-muted">{v.route.label}</span> : null}
          {v.route?.basis === "SAMPLE" ? <Pill tone="warn" title="A Sample route: not a recommended one; real routes come from the immigration expert">Sample route</Pill> : null}
          <InfoTip tip={STRIP_TIP} label="What a stage is" />
          {next && !next.cannot_start_why ? <Button ref={opener} size="sm" className="ml-auto" data-start-next onClick={() => setStarting(true)}>Start next stage: {next.client_name}</Button> : null}
        </div>
        <ol className="flex flex-wrap items-stretch gap-2 px-4 py-3">
          {v.stages.map((s, i) => (
            <li key={s.id} className="flex items-center gap-2">
              {i > 0 ? <ArrowRight className="size-4 shrink-0 text-text-muted" aria-hidden /> : null}
              {s.cannot_start_why ? (
                <div className="flex min-w-[200px] flex-col rounded-lg border border-border px-3 py-1.5 text-text-muted" data-stage={s.key} data-state="CANNOT_START">
                  <span className="text-sm font-medium">{s.name}</span><span className="text-xs">Cannot start yet</span><span className="text-xs">{s.cannot_start_why.replace(/^Cannot start yet: /, "")}</span>
                </div>
              ) : (
                <div className={`flex min-w-[200px] items-start gap-1 rounded-lg border ${s.state === "CURRENT" ? "border-primary shadow-[inset_3px_0_0_var(--color-primary,#0862c5)]" : "border-border"}`}>
                  <button type="button" onClick={(e) => { chip.current = e.currentTarget; setPanel(s.id); }} data-stage={s.key} data-state={s.state} aria-current={s.state === "CURRENT" ? "step" : undefined}
                    className="flex flex-1 flex-col items-start rounded-lg px-3 py-1.5 text-left outline-none hover:bg-text/5 focus-visible:ring-2 focus-visible:ring-primary">
                    <span className="text-sm font-medium">{s.name}</span>
                    <span className="text-xs"><Pill tone={TONE[s.state]}>{s.words}</Pill></span>
                    {s.state === "CURRENT" && s.deadline ? <Deadline d={s.deadline} /> : null}
                  </button>
                  {s.state === "ENDED_NEXT_STARTED" ? <span className="pt-1 pr-1"><InfoTip tip={ENDED_TIP} label="What ended means" /></span> : s.state === "DONE_BEFORE" ? <span className="pt-1 pr-1"><InfoTip tip={DONE_TIP} label="What done before we started means" /></span> : null}
                </div>
              )}
            </li>
          ))}
        </ol>
        {next?.cannot_start_why ? <p className="px-4 pb-3 text-xs text-text-muted">{next.name}: {next.cannot_start_why}</p> : null}
      </section>
      {panel ? <StagePanel caseId={caseId} stageId={panel} close={() => setPanel(null)} returnFocus={() => chip.current} /> : null}
      {starting ? <StartNextDialog caseId={caseId} close={() => setStarting(false)} returnFocus={() => opener.current ?? document.getElementById("stages-h")} /> : null}
    </TipProvider>
  );
}

type StageRecord = CaseStageView & { read_only: boolean; filings: { id: string; person: string; status: string; active: boolean; application_number: string | null; recorded_on: string | null }[];
  documents: { id: string; person: string; document_type: string; file_name: string; uploaded_at: string }[]; lines: { person: string; document_type: string; state: string }[] };

/** A stage's own record (BR-6, m2): read only; a done-before stage's key details can be corrected. */
function StagePanel({ caseId, stageId, close, returnFocus }: { caseId: string; stageId: string; close: () => void; returnFocus: () => HTMLElement | null }) {
  const actor = useActorId();
  const q = useApi<StageRecord>(["runtime", "view", caseId, "stage", stageId, actor], `/runtime/cases/${caseId}/stages/${stageId}`, { retry: noRetryOnRefusal });
  const s = q.data;
  const [edit, setEdit] = React.useState<Record<string, string> | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  const qc = useQueryClient(), toast = useToast();
  async function save() {
    if (!s || !edit) return;
    setBusy(true); setErrors({});
    try {
      await api(`/runtime/cases/${caseId}/stages/${stageId}/key-details`, { method: "PUT", json: { stage_version: s.version, key_details: Object.fromEntries(Object.entries(edit).map(([k, v]) => [k, v.trim() ? v : null])) } });
      toast.push({ tone: "ok", text: `${s.name}: key details saved` }); setEdit(null); void qc.invalidateQueries({ queryKey: ["runtime"] });
    } catch (e) { const p = e instanceof ApiError ? e.problem.errors ?? [] : []; setErrors(Object.fromEntries(p.map((x) => [x.field.replace(/^key_details\./, ""), x.message]))); if (!p.length) toast.push({ tone: "danger", text: (e as Error).message }); } finally { setBusy(false); }
  }
  return (
    <Panel open onOpenChange={(o) => { if (!o) close(); }} returnFocus={returnFocus} title={s?.name ?? "Stage"} badge={s ? <Pill tone={TONE[s.state]}>{s.words}</Pill> : null}
      description={s ? (s.state === "CURRENT" ? "The stage the case works on now." : s.state === "DONE_BEFORE" ? "Made before the firm took the case: nothing is filed here." : s.state === "ENDED_NEXT_STARTED" ? "Kept as it was when the next stage started: read only." : "Not started yet.") : undefined}
      footer={<><Button variant="ghost" onClick={() => { close(); setTimeout(() => returnFocus()?.focus(), 0); }}>Close</Button>{edit ? <Button busy={busy} onClick={() => void save()}>Save key details</Button> : s?.state === "DONE_BEFORE" ? <Button variant="secondary" onClick={() => setEdit(Object.fromEntries(s.key_details.map((d) => [d.field, d.value ?? ""])))}>Edit key details</Button> : null}</>}>
      {q.isLoading ? <Skeleton className="h-40 w-full" /> : q.isError ? <Notice tone="danger" title="This stage could not be read">{(q.error as Error).message}</Notice> : s ? (
        <div className="space-y-5 text-sm" data-stage-panel={s.key}>
          <section><h3 className="mb-1 font-semibold">Key details</h3>
            {!s.key_details.length ? <p className="text-text-muted">This stage records no key details.</p> : (
              <dl className="divide-y divide-border rounded-lg border border-border">{s.key_details.map((d) => (
                <div key={d.field} className="grid grid-cols-[1fr_auto] items-center gap-2 px-3 py-2">
                  <dt className="text-text-muted">{d.label}{d.same_every_stage ? <span className="ml-1 text-xs">(also the client's answer)</span> : null}</dt>
                  <dd className="text-right">{edit ? <Field label={d.label} error={errors[d.field]} className="text-left"><Input type={d.type === "DATE" ? "date" : "text"} value={edit[d.field] ?? ""} onChange={(e) => setEdit({ ...edit, [d.field]: e.target.value })} /></Field>
                    : d.value ? <><span className="font-medium">{d.type === "DATE" ? day(d.value) : d.value}</span><span className="block text-xs text-text-muted">{d.by}</span></> : <span className="text-text-muted">Not recorded</span>}</dd>
                </div>))}</dl>)}
            <p className="mt-1 text-xs text-text-muted">Sample key details: not cited from canada.ca.</p>
          </section>
          {s.deadline ? <section><h3 className="mb-1 font-semibold">Deadline</h3><Deadline d={s.deadline} /></section> : null}
          {s.state !== "DONE_BEFORE" && s.state !== "NOT_RECORDED" ? <>
            <section><h3 className="mb-1 font-semibold">Filings</h3>{s.filings.length ? <ul className="divide-y divide-border rounded-lg border border-border">{s.filings.map((f) => <li key={f.id} className="flex flex-wrap items-center gap-2 px-3 py-2"><span className="flex-1">{f.person}'s filing</span><Pill>{f.status.replace(/_/g, " ").toLowerCase()}</Pill>{f.application_number ? <span className="text-xs">No. {f.application_number}</span> : null}{f.recorded_on ? <span className="text-xs text-text-muted">recorded {day(f.recorded_on)}</span> : <span className="text-xs text-text-muted">no filing record</span>}</li>)}</ul> : <p className="text-text-muted">No filing yet: Prepare application makes them.</p>}</section>
            <section><h3 className="mb-1 font-semibold">Its own documents</h3>{s.documents.length ? <ul className="divide-y divide-border rounded-lg border border-border">{s.documents.map((d) => <li key={d.id} className="px-3 py-2">{d.person}: {d.file_name} <span className="text-xs text-text-muted">uploaded {day(d.uploaded_at)}</span></li>)}</ul> : <p className="text-text-muted">No document uploaded on this stage's lines{s.ended_at ? " before it ended" : ""}.</p>}</section>
          </> : null}
        </div>) : null}
    </Panel>
  );
}

/** BR-4: Start next stage, with everything it does said before the click. */
function StartNextDialog({ caseId, close, returnFocus }: { caseId: string; close: () => void; returnFocus: () => HTMLElement | null }) {
  const actor = useActorId();
  const q = useApi<StartNextPreview>(["runtime", "view", caseId, "stages-next", actor], `/runtime/cases/${caseId}/stages/next`, { retry: noRetryOnRefusal });
  const p = q.data;
  const [details, setDetails] = React.useState<Record<string, string> | null>(null);
  const [reason, setReason] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [refused, setRefused] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const qc = useQueryClient(), toast = useToast();
  React.useEffect(() => { if (p && !details) setDetails(Object.fromEntries(p.key_details.map((d) => [d.field, d.value ?? ""]))); }, [p, details]);
  async function start() {
    if (!p) return;
    setBusy(true); setErrors({}); setRefused(null);
    try {
      const r = await api<{ words: string }>(`/runtime/cases/${caseId}/stages/next`, { method: "POST", json: { from_stage: p.from.stage, stage_version: p.from.version, key_details: Object.fromEntries(Object.entries(details ?? {}).map(([k, v]) => [k, v.trim() ? v : null])), ...(reason.trim() ? { reason } : {}) } });
      // Review M3: after a start the button is gone (the next stage is current), so focus goes to the strip's heading.
      toast.push({ tone: "ok", text: r.words }); void qc.invalidateQueries({ queryKey: ["runtime"] }); close(); setTimeout(() => (document.getElementById("stages-h") ?? returnFocus())?.focus(), 0);
    } catch (e) {
      const errs = e instanceof ApiError ? e.problem.errors ?? [] : [];
      if (errs.length) setErrors(Object.fromEntries(errs.map((x) => [x.field.replace(/^key_details\./, ""), x.message])));
      else { setRefused((e as Error).message); void q.refetch(); }
    } finally { setBusy(false); }
  }
  const n = (k: number, one: string, many: string) => `${k} ${k === 1 ? one : many}`;
  return (
    <Dialog open onOpenChange={(o) => { if (!o) { close(); setTimeout(() => returnFocus()?.focus(), 0); } }} wide title={p?.to ? `Start ${p.to.name}` : "Start next stage"} description={p?.to ? `Starting it ends the ${p.from.name} stage: its filings stay as they are and can no longer be changed.` : undefined}
      footer={<><Button variant="ghost" onClick={() => { close(); setTimeout(() => returnFocus()?.focus(), 0); }}>Cancel</Button><Button busy={busy} disabled={!p?.to || !!p.refused} onClick={() => void start()} data-start-confirm>{p?.to ? `Start ${p.to.name}` : "Start next stage"}</Button></>}>
      {q.isLoading ? <Skeleton className="h-48 w-full" /> : q.isError ? <Notice tone="danger" title="Could not work out the next stage">{(q.error as Error).message}</Notice> : p ? (
        <div className="space-y-4 text-sm" data-start-dialog>
          {Object.keys(errors).length ? <Notice tone="danger" title="Some details need fixing"><ul className="list-disc pl-5" data-error-summary>{Object.values(errors).map((m) => <li key={m}>{m}</li>)}</ul></Notice> : null}
          {refused ? <Notice tone="danger" title="Not started">{refused}</Notice> : null}
          {p.refused ? <Notice tone="warn" title="Cannot start yet">{p.refused}</Notice> : null}
          {p.to && !p.refused ? <>
            <p>It starts on <span className="font-medium">{p.to.release}</span> (the newest release of {p.to.name}, now).</p>
            <section><h3 className="mb-1 font-semibold">Who comes along</h3>
              <ul className="space-y-0.5">{p.people.map((x) => <li key={x.subject}>{x.label}{x.comes ? "" : <span className="text-text-warn"> — {x.words}</span>}</li>)}</ul></section>
            <section><h3 className="mb-1 font-semibold">What carries and what is asked</h3>
              <ul className="grid gap-1 sm:grid-cols-2" data-start-counts>
                <li>{n(p.counts.person_answers_used, "answer about the people used (not copied)", "answers about the people used (not copied)")}</li>
                <li>{n(p.counts.asked_again, "question about this application asked again", "questions about this application asked again")}</li>
                <li>{n(p.counts.new_questions, "new question", "new questions")}</li>
                <li>{n(p.counts.forms, "form", "forms")}: {p.forms.join(", ") || "none"}</li>
                <li className="sm:col-span-2" data-start-documents>{`${n(p.counts.documents, "document", "documents")} on the checklist` /* M3-S4: every checklist is worked out */}: {p.documents.join("; ") || "none"}</li>
              </ul>
              <p className="mt-1 text-xs text-text-muted">The people's answers are read where they are; this application's own answers (its number, date, office, country where applying) belong to the new application and are asked again.</p></section>
            {p.deadline ? <section><h3 className="mb-1 font-semibold">Deadline</h3><Deadline d={p.deadline} /></section> : null}
          </> : null}
          {p.key_details.length && p.to && !p.refused ? (
            <section><h3 className="mb-1 font-semibold">{p.from.name}: key details</h3>
              <p className="mb-2 text-xs text-text-muted">Kept on the ending stage's record (pre-filled only from it). Sample: not cited from canada.ca.</p>
              <div className="grid gap-3 sm:grid-cols-2">{p.key_details.map((d) => <Field key={d.field} label={`${d.label} (optional)`} error={errors[d.field]}><Input type={d.type === "DATE" ? "date" : "text"} value={details?.[d.field] ?? ""} onChange={(e) => setDetails({ ...(details ?? {}), [d.field]: e.target.value })} /></Field>)}</div></section>
          ) : null}
          {p.unrecorded.length && p.to && !p.refused ? (
            <Notice tone="warn" title="No filing record">
              <p>{p.unrecorded.map((u) => `${u.person}'s ${p.from.client_name.toLowerCase()}`).join(" and ")} {p.unrecorded.length === 1 ? "has" : "have"} no filing record. Say why you are starting the next stage anyway.</p>
              <Field label="Reason" error={errors.reason} className="mt-2"><Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} /></Field>
            </Notice>
          ) : null}
          {p.to && !p.refused ? <p className="font-medium text-text-warn" data-cannot-undo>This cannot be undone.</p> : null}
        </div>) : null}
    </Dialog>
  );
}

type EarlierValue = Record<string, { done: boolean; details: Record<string, string> }>;
/** "Open a case" step 2: when the chosen combination is a later stage of a route, record the earlier stages. */
export function EarlierStages({ release, value, onChange, errors }: { release: OpenableRelease | undefined; value: EarlierValue; onChange: (v: EarlierValue) => void; errors: Record<string, string> }) {
  const st = release?.stage;
  if (!st) return null;
  return (
    <section className="space-y-2 rounded-lg border border-border p-3" data-earlier-stages>
      <div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold">Earlier stages</h3><Pill tone="warn" title="A Sample route: not a recommended one">Sample route</Pill></div>
      <p className="text-xs text-text-muted">{st.name} is a later stage of "{st.route_label}". Record what was done before your firm took the case. Nothing is filed for these stages.</p>
      {st.earlier.map((e, i) => {
        const v = value[e.key] ?? { done: true, details: {} };
        return (
          <div key={e.key} className="rounded-md border border-border p-2" data-earlier={e.key}>
            <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={v.done} onChange={(x) => onChange({ ...value, [e.key]: { ...v, done: x.target.checked } })} />{e.name} · Done before we started</label>
            {v.done ? <div className="mt-2 grid gap-2 sm:grid-cols-2">{e.key_details.map((d) => (
              <Field key={d.field} label={`${d.label} (optional)`} hint={d.same_every_stage ? "Also saved as the client's answer, entered by you" : "Kept on this stage's record"} error={errors[`earlier.${i}.key_details.${d.field}`]}>
                <Input type={d.type === "DATE" ? "date" : "text"} value={v.details[d.field] ?? ""} onChange={(x) => onChange({ ...value, [e.key]: { ...v, details: { ...v.details, [d.field]: x.target.value } } })} />
              </Field>))}</div> : <p className="mt-1 text-xs text-text-muted">Not recorded.</p>}
          </div>
        );
      })}
    </section>
  );
}
/** The request's `earlier` from the step's values (blank details left out). */
export const earlierOf = (release: OpenableRelease | undefined, value: EarlierValue) => release?.stage ? release.stage.earlier.map((e) => {
  const v = value[e.key] ?? { done: true, details: {} };
  return { stage: e.key, done_before: v.done, ...(v.done ? { key_details: Object.fromEntries(Object.entries(v.details).filter(([, x]) => x.trim())) } : {}) };
}) : undefined;
