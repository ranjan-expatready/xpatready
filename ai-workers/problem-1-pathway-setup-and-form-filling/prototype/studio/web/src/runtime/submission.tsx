// C8.2 Record the submission (runtime lane, M3-F; M3-CONTRACT C8.2; r5c BR-11, BR-12, BR-15, BR-21; AV-6, P-155,
// P-168): on the case page, one "Record the submission" per submission group, open once every filing of the group is
// Ready to file (C7.6). Per filing our reference, the date it was submitted, IRCC's application number and the fee
// receipt; a UCI per person. Once recorded the group is read-only: the record reads Prepared by · Reviewed by, a wrong
// number is fixed with "Correct a number" (kept with its reason), and a fact changed after filing opens a task to
// re-sign or tell IRCC (Unconfirmed: no counsel). The C7.7 Prepare application tab will host this panel when it lands.
import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError, useApi, useToast } from "@/lib/api";
import { Button, Dialog, Field, Input, Notice, Pill } from "@/components/ui/controls";
import { Skeleton } from "@/components/ui/skeleton";
import type { CaseTaskView, FilingRecordView } from "../../../contracts/submission-record";
import { noRetryOnRefusal } from "./questionnaire";

type Applicant = { subject: string; label: string; role: string; mode: string };
type Filing = { id: string; label: string; status: string; number: string | null; applicants: Applicant[]; group: string; record?: FilingRecordView; read_only?: boolean };
type Group = { id: string; kind: string; label?: string; filings: string[] };
type PrepareView = { derived: boolean; reference: string; version: string | number; portal: string | null; filings: Filing[]; groups: Group[]; tasks?: CaseTaskView[]; why?: string };

const STATUS: Record<string, { words: string; tone: string }> = {
  not_started: { words: "Not started", tone: "neutral" }, ready_to_file: { words: "Ready to file", tone: "info" }, submitted: { words: "Submitted", tone: "ok" },
};
const statusOf = (s: string) => STATUS[s.toLowerCase()] ?? { words: s.toLowerCase().replace(/_/g, " "), tone: "neutral" };
const whoOf = (f: Filing) => f.applicants.find((a) => a.mode === "applying")?.label ?? f.applicants[0]?.label ?? "A person";
// A calendar date is shown as the date it is, in any browser's time zone (break m on #924: UTC+14 showed the next day).
const day = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-CA", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const when = (at: string) => new Date(at).toLocaleString("en-CA", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const todayHere = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const PORTAL: Record<string, string> = { APR_PORTAL: "APR Portal" };
type Problem = Record<string, string>;
/** A save from a dialog: its refusals show on the dialog's own fields, never also as a toast over its buttons (break m on
 *  #924); a 409 re-reads the case, so the next try carries the version now (it failed again until a reload). */
function useSave<R>(caseId: string, fn: () => Promise<R>, opts: { success: (r: R) => string; onDone: () => void; onProblem: (p: Problem) => void }) {
  const qc = useQueryClient(), toast = useToast();
  return useMutation<R, Error>({
    mutationFn: fn,
    onSuccess: (r) => { void qc.invalidateQueries({ queryKey: ["runtime", "view", caseId] }); toast.push({ tone: "ok", text: opts.success(r) }); opts.onDone(); },
    onError: (e) => {
      if (e instanceof ApiError && e.status === 409) void qc.invalidateQueries({ queryKey: ["runtime", "view", caseId] });
      const list = e instanceof ApiError ? e.problem.errors ?? [] : [];
      opts.onProblem(list.length ? Object.fromEntries(list.map((x) => [x.field, x.message])) : { form: e.message });
    },
  });
}
/** After a refusal, focus moves to the first field in error (break m on #924). */
const focusFirstError = (root: HTMLElement | null) => requestAnimationFrame(() => (root?.querySelector<HTMLElement>('[aria-invalid="true"]') ?? root?.querySelector<HTMLElement>('[role="alert"]'))?.focus());

/** The case's submission groups and what was filed. Under the case view's query key, so an answer change re-reads it. */
export function SubmissionPanel({ caseId }: { caseId: string }) {
  const q = useApi<PrepareView>(["runtime", "view", caseId, "prepare"], `/runtime/cases/${caseId}/prepare`, { retry: noRetryOnRefusal });
  const [recording, setRecording] = React.useState<Group | null>(null);
  const [correcting, setCorrecting] = React.useState<{ f: Filing; uci?: { subject: string; person: string; uci: string | null } } | null>(null);
  const back = React.useRef<HTMLElement | null>(null);
  // A closed dialog gives focus back to the button that opened it; after recording that button is gone (the group is
  // read-only), so focus goes to the panel's heading.
  const done = (recorded = false) => { setRecording(null); setCorrecting(null); requestAnimationFrame(() => { const el = recorded ? null : back.current; (el?.isConnected ? el : document.getElementById("submission-h"))?.focus(); }); };
  const v = q.data;
  const open = (v?.tasks ?? []).filter((t) => t.state === "open");
  return (
    <section aria-labelledby="submission-h" className="rounded-xl border border-border bg-surface-raised" data-submission>
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-4 py-3">
        <h2 id="submission-h" tabIndex={-1} className="text-base font-semibold outline-none">Submission to IRCC</h2>
        <p className="min-w-0 flex-1 text-[13px] text-text-muted">Record what IRCC acknowledged, once per submission. A recorded submission is read-only.</p>
      </header>
      {q.isLoading ? <div className="p-4"><Skeleton className="h-16 w-full" /></div>
        : q.isError ? <div className="p-4"><Notice tone="danger" title="The submission could not be loaded">{(q.error as Error).message}</Notice></div>
        : !v!.derived ? <p className="px-4 py-3 text-sm text-text-muted">{v!.why ?? "No filings are worked out for this case yet."}</p>
        : <>
            {open.length ? <div className="px-4 pt-3" data-after-filing-tasks><Notice tone="warn" title={`${open.length} task${open.length === 1 ? "" : "s"} after filing`}>
                <ul className="list-disc space-y-1 pl-5">{open.map((t) => <li key={t.id} className="[overflow-wrap:anywhere]" data-task={t.kind}>{t.words}</li>)}</ul>
              </Notice></div> : null}
            {v!.groups.map((g) => {
              const fs = g.filings.map((id) => v!.filings.find((f) => f.id === id)).filter((f): f is Filing => !!f);
              const recorded = fs.some((f) => f.record);
              const notReady = fs.filter((f) => f.status !== "ready_to_file");
              return (
                <section key={g.id} aria-labelledby={`sub-${g.id}`} className="border-b border-border px-4 py-3 last:border-b-0" data-submission-group={g.id}>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 id={`sub-${g.id}`} className="text-sm font-semibold [overflow-wrap:anywhere]">{g.label ?? (g.kind === "family" ? "Family submission" : "Separate submission")}</h3>
                    {recorded ? <Pill tone="ok">Recorded · read-only</Pill> : null}
                    <span className="flex-1" />
                    {recorded ? null : <Button size="sm" disabled={notReady.length > 0} aria-describedby={notReady.length ? `sub-why-${g.id}` : undefined} onClick={(e) => { back.current = e.currentTarget; setRecording(g); }}>Record the submission…</Button>}
                  </div>
                  {!recorded && notReady.length ? <p id={`sub-why-${g.id}`} className="mt-1 text-[13px] text-text-muted">Opens once every filing is Ready to file: {notReady.map((f) => `${whoOf(f)} (${statusOf(f.status).words})`).join(", ")}.</p> : null}
                  <ul className="mt-2 space-y-3">{fs.map((f) => <FilingLine key={f.id} f={f} onCorrect={(from, uci) => { back.current = from; setCorrecting({ f, uci }); }} />)}</ul>
                </section>
              );
            })}
          </>}
      {recording && v ? <RecordDialog caseId={caseId} view={v} group={recording} close={() => done()} recorded={() => done(true)} /> : null}
      {correcting ? <CorrectDialog caseId={caseId} filing={correcting.f} uci={correcting.uci} close={() => done()} /> : null}
    </section>
  );
}

type UciLine = { subject: string; person: string; uci: string | null };
function FilingLine({ f, onCorrect }: { f: Filing; onCorrect: (from: HTMLElement, uci?: UciLine) => void }) {
  const s = statusOf(f.status), r = f.record;
  return (
    <li className="rounded-lg border border-border px-3 py-2" data-submission-filing={f.id} data-status={f.status}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 text-sm font-medium [overflow-wrap:anywhere]">{f.label}</span>
        <Pill tone={s.tone}>{s.words}</Pill>
      </div>
      {r ? <>
        <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1.5 text-[13px] sm:grid-cols-[max-content_1fr]" data-record>
          <dt className="text-text-muted">Application number</dt>
          <dd className="flex flex-wrap items-center gap-2"><span className="font-mono" data-number>{r.application_number}</span><Button size="sm" variant="ghost" onClick={(e) => onCorrect(e.currentTarget)}>Correct a number…</Button></dd>
          <dt className="text-text-muted">Submitted on</dt><dd>{day(r.submitted_on)}{r.portal ? ` · through ${PORTAL[r.portal] ?? r.portal}` : ""}</dd>
          <dt className="text-text-muted">Our reference</dt><dd className="[overflow-wrap:anywhere]">{r.our_reference}</dd>
          <dt className="text-text-muted">Fee receipt</dt><dd className="[overflow-wrap:anywhere]">{r.fee_receipt ?? "None given"}</dd>
          <dt className="text-text-muted">UCI</dt>
          <dd><ul className="space-y-0.5" data-ucis>{r.ucis.map((u) => <li key={u.subject} className="flex flex-wrap items-center gap-2 [overflow-wrap:anywhere]" data-uci={u.subject}>
            <span>{u.person}: {u.uci ? <span className="font-mono">{u.uci}</span> : <span className="text-text-muted">none given</span>}</span>
            <Button size="sm" variant="ghost" aria-label={`${u.uci ? "Correct" : "Add"} ${u.person}’s UCI`} onClick={(e) => onCorrect(e.currentTarget, u as UciLine)}>{u.uci ? "Correct…" : "Add…"}</Button></li>)}</ul></dd>
          <dt className="text-text-muted">Prepared by · Reviewed by</dt><dd data-prepared-reviewed>{r.prepared_by.name} · {r.reviewed_by ? (r.reviewed_by.self ? "Self-reviewed" : r.reviewed_by.name) : "no representative of record"}</dd>
        </dl>
        {r.corrections.length ? <div className="mt-2" data-corrections>
          <p className="text-[12px] font-medium text-text-muted">Corrections</p>
          <ul className="mt-0.5 space-y-0.5 text-[12px] text-text-muted">{r.corrections.map((c, i) => <li key={i} className="[overflow-wrap:anywhere]">{when(c.at)}: {c.by} {c.field === "uci" ? (c.before ? `corrected ${c.person}’s UCI from ` : `added ${c.person}’s UCI `) : "corrected "}{c.before ? <><span className="font-mono">{c.before}</span> to </> : null}<span className="font-mono">{c.after}</span>: “{c.reason}”</li>)}</ul>
        </div> : null}
      </> : null}
    </li>
  );
}

type Line = { our_reference: string; submitted_on: string; application_number: string; fee_receipt: string };
function RecordDialog({ caseId, view, group, close, recorded }: { caseId: string; view: PrepareView; group: Group; close: () => void; recorded: () => void }) {
  const fs = group.filings.map((id) => view.filings.find((f) => f.id === id)).filter((f): f is Filing => !!f);
  const people = fs.flatMap((f) => f.applicants.filter((a) => a.mode === "applying"));
  const [lines, setLines] = React.useState<Record<string, Line>>(() => Object.fromEntries(fs.map((f, i) => [f.id, { our_reference: fs.length > 1 ? `${view.reference}-${i + 1}` : view.reference, submitted_on: todayHere(), application_number: "", fee_receipt: "" }])));
  const [ucis, setUcis] = React.useState<Record<string, string>>({});
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const set = (id: string, k: keyof Line, value: string) => { setLines({ ...lines, [id]: { ...lines[id], [k]: value } }); setErrors({}); };
  const sent = people.filter((p) => (ucis[p.subject] ?? "").trim());
  const formRef = React.useRef<HTMLFormElement>(null);
  const act = useSave(caseId, () => api<{ warning: string | null }>(`/runtime/groups/${group.id}/record`, { method: "PATCH", json: {
    filings: fs.map((f) => ({ filing: f.id, ...lines[f.id], fee_receipt: lines[f.id].fee_receipt.trim() || null })),
    ucis: sent.map((p) => ({ subject: p.subject, uci: ucis[p.subject].trim() })), version: view.version } }),
    { success: (r) => `Submission recorded: these filings are now read-only.${r.warning ? ` ${r.warning}` : ""}`, onDone: recorded,
      // filings.<i>.<field> → the filing's own field; ucis.<i>.* → that person's UCI.
      onProblem: (p) => { setErrors(Object.fromEntries(Object.entries(p).map(([k, v]) => { const m = /^(filings|ucis)\.(\d+)\.(\w+)$/.exec(k); if (!m) return [k, v];
        return m[1] === "filings" ? [`${fs[Number(m[2])]?.id}.${m[3]}`, v] : [`uci.${sent[Number(m[2])]?.subject}`, v]; }))); focusFirstError(formRef.current); } });
  const submit = () => act.mutate();
  const err = (id: string, k: string) => errors[`${id}.${k}`] ?? null;
  return (
    <Dialog open onOpenChange={(o) => { if (!o) close(); }} title="Record the submission" description={<>One record for the whole submission, as IRCC acknowledged it{view.portal ? ` through ${PORTAL[view.portal] ?? view.portal}` : ""}. It cannot be undone: afterwards the filings are read-only and a wrong number is fixed with “Correct a number”.</>}
      footer={<><Button variant="ghost" onClick={close}>Cancel</Button><Button busy={act.isPending} onClick={submit}>Record the submission</Button></>}>
      <form ref={formRef} className="space-y-5" onSubmit={(e) => { e.preventDefault(); submit(); }} data-record-form>
        {errors.form || errors.filings || errors.version ? <Notice tone="danger" title="Not recorded">{errors.form ?? errors.filings ?? errors.version}</Notice> : null}
        {fs.map((f, i) => (
          <fieldset key={f.id} className="space-y-3 rounded-lg border border-border p-3" data-record-filing={f.id}>
            <legend className="px-1 text-sm font-semibold [overflow-wrap:anywhere]">{whoOf(f)}’s filing</legend>
            <Field label="Application number" hint="As on IRCC’s acknowledgement, like W123456789 (Sample pattern)" error={err(f.id, "application_number")}>
              <Input value={lines[f.id].application_number} maxLength={40} autoFocus={i === 0} autoComplete="off" spellCheck={false} onChange={(e) => set(f.id, "application_number", e.target.value)} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Submitted on" hint="Not after today" error={err(f.id, "submitted_on")}><Input type="date" value={lines[f.id].submitted_on} max={todayHere()} onChange={(e) => set(f.id, "submitted_on", e.target.value)} /></Field>
              <Field label="Our reference" error={err(f.id, "our_reference")}><Input value={lines[f.id].our_reference} maxLength={100} onChange={(e) => set(f.id, "our_reference", e.target.value)} /></Field>
            </div>
            <Field label="Fee receipt (optional)" hint="The receipt number of the fees paid" error={err(f.id, "fee_receipt")}><Input value={lines[f.id].fee_receipt} maxLength={100} onChange={(e) => set(f.id, "fee_receipt", e.target.value)} /></Field>
          </fieldset>
        ))}
        <fieldset className="space-y-3 rounded-lg border border-border p-3">
          <legend className="px-1 text-sm font-semibold">UCI per person (optional)</legend>
          {people.map((p) => <Field key={p.subject} label={`${p.label}’s UCI`} hint="The client identifier IRCC gave this person" error={errors[`uci.${p.subject}`] ?? null}>
            <Input value={ucis[p.subject] ?? ""} maxLength={40} autoComplete="off" spellCheck={false} onChange={(e) => { setUcis({ ...ucis, [p.subject]: e.target.value }); setErrors({}); }} /></Field>)}
        </fieldset>
        <button type="submit" hidden />
      </form>
    </Dialog>
  );
}

function CorrectDialog({ caseId, filing, uci, close }: { caseId: string; filing: Filing; uci?: UciLine; close: () => void }) {
  const [value, setValue] = React.useState(uci ? uci.uci ?? "" : filing.record?.application_number ?? "");
  const [reason, setReason] = React.useState("");
  const [errors, setErrors] = React.useState<Problem>({});
  const formRef = React.useRef<HTMLFormElement>(null);
  const field = uci ? "uci.uci" : "application_number";
  const act = useSave(caseId, () => api<{ warning: string | null }>(`/runtime/filings/${filing.id}/record/corrections`, { method: "POST", json: uci ? { uci: { subject: uci.subject, uci: value }, reason } : { application_number: value, reason } }),
    { success: (r) => `${uci ? (uci.uci ? "UCI corrected" : "UCI added") : "Number corrected"}: ${uci?.uci || !uci ? "the old one is kept with your reason" : "kept with your reason"}.${r.warning ? ` ${r.warning}` : ""}`, onDone: close,
      onProblem: (p) => { setErrors(p); focusFirstError(formRef.current); } });
  const title = uci ? `${uci.uci ? "Correct" : "Add"} ${uci.person}’s UCI` : "Correct a number";
  const now = uci ? uci.uci : filing.record?.application_number;
  return (
    <Dialog open onOpenChange={(o) => { if (!o) close(); }} title={title} description={<>{whoOf(filing)}’s recorded filing. {now ? <>The {uci ? "UCI" : "number"} recorded now, <span className="font-mono">{now}</span>, stays in the history with your reason.</> : "It is added with your reason, in the history."}</>}
      footer={<><Button variant="ghost" onClick={close}>Cancel</Button><Button busy={act.isPending} onClick={() => act.mutate()}>{uci ? (uci.uci ? "Correct the UCI" : "Add the UCI") : "Correct the number"}</Button></>}>
      <form ref={formRef} className="space-y-4" onSubmit={(e) => { e.preventDefault(); act.mutate(); }} data-correct-form>
        {errors.filing || errors.form || errors["uci.subject"] ? <Notice tone="danger" title="Not saved">{errors.filing ?? errors.form ?? errors["uci.subject"]}</Notice> : null}
        <Field label={uci ? "UCI" : "Corrected application number"} hint={uci ? "As on IRCC’s letter, digits (spaces and hyphens are fine)" : undefined} error={errors[field] ?? null}><Input value={value} maxLength={40} autoFocus autoComplete="off" spellCheck={false} onChange={(e) => { setValue(e.target.value); setErrors({}); }} /></Field>
        <Field label="Reason" hint={uci ? "Why it is added or corrected" : "Why the recorded number was wrong"} error={errors.reason ?? null}><Input value={reason} maxLength={400} onChange={(e) => { setReason(e.target.value); setErrors({}); }} /></Field>
        <button type="submit" hidden />
      </form>
    </Dialog>
  );
}
