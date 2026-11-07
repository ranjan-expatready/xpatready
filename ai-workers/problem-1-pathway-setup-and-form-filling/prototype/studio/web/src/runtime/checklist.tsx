// C6.4 (a) Documents panel (runtime lane; concept screens/M3-design-2026-11-04/documents/concept-draft.md §4, as changed by
// screens/C6.4-checkpoint/challenge-r2.md, approved by the tech lead on #1073): what each person on the case must provide,
// from the case's pinned release, with the reason for each line, its state in the team's words, and the case officer's
// actions (Request, Upload, Not applicable with a reason). Staff only. Every rule is the server's: the actions offered come
// from contracts/documents.ts, the words of each line from the engine; a refusal shows the server's own words.
import * as React from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { api, ApiError, useActorId, useApi } from "@/lib/api";
import { Button, Dialog, Field, Input, Notice, Pill } from "@/components/ui/controls";
import { Skeleton } from "@/components/ui/skeleton";
import { StandIn } from "@/components/stand-in";
import { NOT_APPLICABLE_FROM, REQUEST_FROM, UPLOAD_FROM, type LineState, type StoredDocument } from "../../../contracts/documents";
import { lineId, noRetryOnRefusal } from "./questionnaire";

/** What the panel reads of a line as the API answers it (api/src/case-checklist.ts StoredLine, from the engine's PersonLine
 *  in engine/runtime/case-checklist.ts). Declared here, not imported: the engine file reads Node modules the web build has not. */
type Missing = { key: string; question: string; answered: boolean; on: "case" | "person"; subject: string | null };
export type ChecklistLine = { id: string; label: string; lineage: string; reason: string; required: boolean; who_words: string; quote: string | null; missing: Missing[];
  state: LineState; state_words: string; state_reason: string | null; state_by: string | null; state_at: string | null; version: number; documents: StoredDocument[]; kept: boolean;
  /** C6.15: the substitute set the line uses (any one of / all of), and whether the person's files meet it. */
  set?: { name: string; mode: "any_one" | "all_together"; words: string; members: { key: string; name: string; standard: boolean; when_staff: string | null }[] } | null;
  set_status?: { met: boolean; words: string } | null };
/** B102 (A6, BR-8): the person's age as the lines read it (engine/runtime/case-checklist.ts PersonAge). */
type Age = { years: number | null; on: string | null; why: string; worked_out: boolean };
type Person = { subject: string; label: string; role: string; applies: boolean; lines: ChecklistLine[]; waiting: ChecklistLine[]; not_needed: ChecklistLine[]; age?: Age };
export type ChecklistView =
  | { derived: true; stand_in: "SI-14"; people: Person[]; basis: string; empty_release: boolean; ages_on_why: string }
  | { derived: false; why: string };

const HAVE: readonly LineState[] = ["received", "being_checked", "approved"];
const TONE: Partial<Record<LineState, string>> = { requested: "info", received: "ok", being_checked: "info", approved: "ok", rejected: "danger", not_applicable: "neutral" };
const ROLE: Record<string, string> = { principal: "Principal applicant", spouse_or_partner: "Spouse or partner", child: "Child" };
const when = (at: string) => new Date(at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
/** A question's words as a link's text: the engine quotes it ("Current marital status"); a screen reader should not read the marks. */
const unquoted = (q: string) => q.replace(/^["“]|["”]$/g, "");
/** A waiting line's reason without its closing "answer … first" clause, which the links below it say (no repeat). When its
 *  questions are all answered but do not work out together (Devin on #1073), the engine's "check …" words are kept whole. */
const whyWaiting = (r: string) => r.replace(/: answer .* first\.$/s, ".");
/** "n of m received": m the lines needed now (required), n those of them received, being checked or approved. */
export const received = (lines: ChecklistLine[]) => { const need = lines.filter((l) => l.required); return { n: need.filter((l) => HAVE.includes(l.state)).length, m: need.length }; };

/** The documents of one case, under the case view's query key so any answer change refreshes it (a line appears or goes). */
export function DocumentsPanel({ caseId, caseSubject, nameOf }: { caseId: string; caseSubject: string; nameOf: (actorId: string) => string }) {
  const actor = useActorId();
  const q = useApi<ChecklistView>(["runtime", "view", caseId, "checklist", actor], `/runtime/cases/${caseId}/checklist`, { retry: noRetryOnRefusal });
  return (
    <section aria-labelledby="documents-h" className="rounded-xl border border-border bg-surface-raised" data-documents-panel>
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border px-4 py-3">
        <h2 id="documents-h" tabIndex={-1} className="flex items-center gap-2 text-base font-semibold outline-none">Documents
          <StandIn id="SI-14" today="Requests, uploads and file states are kept here for the demo; the checklist rules are ours." later="Document storage, requests, versions and file status come from the team's document management module." /></h2>
        <p className="text-[13px] text-text-muted">What each person must provide, from the case's release. Each line says why it is there.</p>
      </header>
      {q.isLoading ? <div className="p-4"><Skeleton className="h-16 w-full" /></div>
        : q.isError ? <div className="p-4"><Notice tone="danger" title="The documents could not be loaded">{(q.error as Error).message}</Notice></div>
        : <Body caseId={caseId} caseSubject={caseSubject} d={q.data!} nameOf={nameOf} />}
    </section>
  );
}

function Body({ caseId, caseSubject, d, nameOf }: { caseId: string; caseSubject: string; d: ChecklistView; nameOf: (id: string) => string }) {
  if (!d.derived) return <div className="p-4"><Notice title="Not worked out for this combination">{d.why}</Notice></div>;
  if (d.empty_release) return <div className="p-4"><Notice tone="warn" title="This release has no document lines">{d.basis}</Notice></div>;
  return (
    <div className="divide-y divide-border">
      {d.people.map((p) => <PersonDocuments key={p.subject} caseId={caseId} caseSubject={caseSubject} p={p} nameOf={nameOf} />)}
      <p className="px-4 py-2 text-xs text-text-muted">{d.basis} {d.ages_on_why}</p>
    </div>
  );
}

function PersonDocuments({ caseId, caseSubject, p, nameOf }: { caseId: string; caseSubject: string; p: Person; nameOf: (id: string) => string }) {
  const { n, m } = received(p.lines);
  const id = `docs-${p.subject}`;
  return (
    <section aria-labelledby={id} className="px-4 py-3" data-documents-person={p.subject}>
      <h3 id={id} className="flex flex-wrap items-baseline gap-x-2 text-sm font-semibold"><span className="[overflow-wrap:anywhere]">{p.label}</span>
        <span className="text-xs font-normal text-text-muted">{ROLE[p.role] ?? p.role}</span>
        {p.age ? <span className={`text-xs font-normal ${p.age.years === null ? "text-text-warn" : "text-text-muted"}`} data-age={p.age.years ?? ""}>{p.age.why}</span> : null}
        {m ? <span className="text-xs font-normal text-text-muted" data-received>{n} of {m} received</span> : null}</h3>
      {!p.applies && !p.lines.length ? <p className="mt-1 text-sm text-text-muted" data-not-travelling>Not travelling with this application: nothing is asked of them.</p> : null}
      {p.applies && !p.lines.length && !p.waiting.length ? <p className="mt-1 text-sm text-text-muted">Nothing is needed from this person now.</p> : null}
      {p.lines.length ? <ul className="mt-2 divide-y divide-border rounded-lg border border-border">{p.lines.map((l) => <LineRow key={l.id} caseId={caseId} p={p} l={l} nameOf={nameOf} />)}</ul> : null}
      {p.waiting.length ? (
        <div className="mt-2" data-waiting>
          <p className="text-xs font-medium text-text-muted">May be needed</p>
          <ul className="mt-1 space-y-1">{p.waiting.map((l) => (
            <li key={l.id} className="rounded-lg border border-dashed border-border px-3 py-2 text-sm" data-waiting-line={l.lineage}>
              <span className="font-medium">{l.label}</span> <span className="text-xs text-text-muted">{l.who_words}</span>
              <p className="text-[13px] text-text-muted [overflow-wrap:anywhere]">{l.missing.length ? whyWaiting(l.reason) : l.reason}</p>
              {l.missing.length ? <p className="text-[13px]">{l.missing.every((x) => x.answered) ? "Check, in the Agent view" : "Answer first, in the Agent view"}: {l.missing.map((x, i) => { const to = lineId(x.on === "case" ? caseSubject : x.subject ?? p.subject, x.key); return <React.Fragment key={x.key}>{i ? ", " : ""}<a className="text-text-link underline" href={`#${to}`} data-answer-first={x.key}
                // The Agent view opens the tab the question is on (the application's, or the person's) on the address
                // change; the same link twice is announced again.
                onClick={() => { if (window.location.hash === `#${to}`) window.dispatchEvent(new HashChangeEvent("hashchange")); }}>{unquoted(x.question)}{x.on === "case" ? " (for the application)" : ""}</a></React.Fragment>; })}</p> : null}
            </li>))}</ul>
        </div>) : null}
      {p.not_needed.length ? (
        <details className="mt-2 text-sm" data-not-needed>
          <summary className="cursor-pointer text-xs font-medium text-text-muted">Not needed now ({p.not_needed.length})</summary>
          <ul className="mt-1 space-y-1">{p.not_needed.map((l) => <li key={l.id} className="text-[13px]"><span className="font-medium">{l.label}</span>: <span className="text-text-muted">{l.reason}</span></li>)}</ul>
        </details>) : null}
    </section>
  );
}

function LineRow({ caseId, p, l, nameOf }: { caseId: string; p: Person; l: ChecklistLine; nameOf: (id: string) => string }) {
  const qc = useQueryClient();
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [na, setNa] = React.useState(false);
  const [history, setHistory] = React.useState(false);
  const file = React.useRef<HTMLInputElement>(null);
  const member = React.useRef<string | null>(null); // C6.15: which member of the line's set the chosen file is
  // Review and break M1 (WCAG 2.4.3): after every action and when a dialog closes, focus goes back to this line's ⋯ button,
  // which stays focusable while its request runs (aria-busy, not disabled), so the next Tab continues from the line.
  const trigger = React.useRef<HTMLButtonElement>(null);
  // After the next frame and one task more: a closing dialog hands focus back on its own timer, which must not win.
  const back = () => requestAnimationFrame(() => setTimeout(() => trigger.current?.focus(), 0));
  const reload = () => qc.invalidateQueries({ queryKey: ["runtime", "view", caseId] });
  // Every refusal shows the server's own words on the line; a 409 (the line changed, or left the list) reloads the list.
  const run = async (f: () => Promise<unknown>) => {
    setBusy(true); setError(null);
    try { await f(); await reload(); return true; }
    catch (e) { setError((e as Error).message); if (e instanceof ApiError && e.status === 409) await reload(); return false; }
    finally { setBusy(false); back(); }
  };
  const request = () => run(() => api(`/runtime/checklist-lines/${l.id}/request`, { method: "POST", json: { version: l.version } }));
  const upload = (f: File) => run(() => { const fd = new FormData(); fd.append("version", String(l.version)); if (member.current) fd.append("member", member.current); fd.append("file", f, f.name); return api(`/runtime/checklist-lines/${l.id}/documents`, { method: "POST", body: fd }); });
  const currents = l.documents.filter((d) => d.current), current = currents[0], earlier = l.documents.length - currents.length;
  const item = "flex cursor-pointer select-none items-center gap-2 rounded px-2 py-1.5 outline-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[highlighted]:bg-surface";
  const label = `${l.label} for ${p.label}`;
  return (
    <li className="grid gap-x-4 gap-y-1 px-3 py-2.5 text-sm md:grid-cols-[minmax(0,14rem)_8rem_minmax(0,1fr)_auto]" data-line={l.id} data-state={l.state}>
      <div className="min-w-0"><p className="font-medium [overflow-wrap:anywhere]" data-line-label>{l.label}</p>
        <p className="text-xs text-text-muted" data-who>{l.who_words}</p></div>
      {/* Break m3: a kept line says so once, in its reason (the API's words); no second "Kept" label. */}
      <div className="min-w-0"><Pill tone={TONE[l.state] ?? "neutral"}><span data-state-words>{l.state_words}</span></Pill>
        {l.state_reason ? <p className="mt-0.5 text-xs text-text-muted [overflow-wrap:anywhere]">{l.state_reason}</p> : null}</div>
      <div className="min-w-0 text-[13px] [overflow-wrap:anywhere]"><p data-reason>{l.reason}</p>
        {l.quote ? <details className="mt-0.5"><summary className="cursor-pointer text-xs text-text-link">Source</summary><p className="mt-1 text-xs text-text-muted [overflow-wrap:anywhere]" data-quote>{l.quote}</p></details> : null}
        {l.set ? <div className="mt-1 text-xs" data-line-set={l.set.mode}><p>{l.set.words}</p>
          {l.set.members.filter((m) => m.when_staff).map((m) => <p key={m.key} className="text-text-muted">{m.name} is acceptable when: {m.when_staff}</p>)}
          {l.set_status ? <p className={l.set_status.met ? "text-text-muted" : "font-medium"} data-set-status={l.set_status.met ? "met" : "open"}>{l.set_status.words}</p> : null}</div> : null}
        <p className="mt-0.5 text-xs text-text-muted">{current ? <>{currents.length > 1 || current.member ? "Files" : "File"}: <span className="[overflow-wrap:anywhere]">{currents.map((d) => `${d.file_name}${d.member ? ` (${d.member.name})` : ""}`).join(", ")}</span>{earlier ? ` · ${earlier} earlier` : ""}</> : "No file yet"}{l.state_at ? ` · Last change ${when(l.state_at)}${l.state_by ? ` by ${nameOf(l.state_by)}` : ""}` : ""}</p>
        {error ? <p role="alert" className="mt-1 text-xs text-text-danger" data-line-error>{error}</p> : null}</div>
      <div className="flex items-start justify-end">
        <input ref={file} type="file" className="sr-only" tabIndex={-1} aria-hidden accept="application/pdf,image/jpeg,image/png" data-upload-input
          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void upload(f); }} />
        <DropdownMenu.Root modal={false}>
          <DropdownMenu.Trigger asChild><Button ref={trigger} size="sm" variant="ghost" aria-label={`Actions for ${label}`} aria-busy={busy || undefined} data-line-menu>
            {/* Review r2: a spinner while the line's request runs, without disabling the button (focus stays on it). */}
            {busy ? <span className="size-3.5 animate-spin motion-reduce:animate-none rounded-full border-2 border-current border-t-transparent" aria-hidden data-line-busy /> : <MoreHorizontal />}</Button></DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content align="end" sideOffset={4} className="z-50 min-w-[220px] rounded-lg border border-border bg-surface-raised p-1 text-sm shadow-lg">
              {REQUEST_FROM.includes(l.state) ? <DropdownMenu.Item className={item} disabled={busy} onSelect={() => void request()} data-action="request">{l.state === "not_requested" ? "Request" : "Request again"}</DropdownMenu.Item> : null}
              {UPLOAD_FROM.includes(l.state) && !l.set ? <DropdownMenu.Item className={item} disabled={busy} onSelect={() => { member.current = null; file.current?.click(); }} data-action="upload">Upload a file…</DropdownMenu.Item> : null}
              {UPLOAD_FROM.includes(l.state) && l.set ? l.set.members.map((m) => <DropdownMenu.Item key={m.key} className={item} disabled={busy} onSelect={() => { member.current = m.key; file.current?.click(); }} data-action="upload" data-member={m.key}>Upload {m.name}…</DropdownMenu.Item>) : null}
              {NOT_APPLICABLE_FROM.includes(l.state) ? <DropdownMenu.Item className={item} onSelect={() => setNa(true)} data-action="not-applicable">Not applicable…</DropdownMenu.Item> : null}
              <DropdownMenu.Item className={item} onSelect={() => setHistory(true)} data-action="history">History</DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
      {na ? <NotApplicableDialog l={l} label={label} close={() => { setNa(false); back(); }} done={reload} /> : null}
      {history ? <Dialog open onOpenChange={(o) => { if (!o) { setHistory(false); back(); } }} title={`History: ${label}`}>
        <div className="min-w-0 space-y-2 text-sm [overflow-wrap:anywhere]" data-history>
          <p>State: {l.state_words}{l.state_at ? `, since ${when(l.state_at)}${l.state_by ? ` by ${nameOf(l.state_by)}` : ""}` : ""}{l.state_reason ? `. Reason: ${l.state_reason}` : ""}.</p>
          {l.documents.length ? <ul className="space-y-1">{[...l.documents].reverse().map((d) => <li key={d.id}>{d.file_name}{d.member ? ` (${d.member.name})` : ""} · {Math.max(1, Math.round(d.size_bytes / 1024))} KB · {when(d.uploaded_at)} by {nameOf(d.uploaded_by)}{d.current ? " · current" : ` · replaced ${d.superseded_at ? when(d.superseded_at) : ""}`}</li>)}</ul> : <p className="text-text-muted">No file yet.</p>}
          <p className="text-xs text-text-muted">Opening a file comes with Fill from documents. A full history of every state change is not built yet.</p>
        </div>
      </Dialog> : null}
    </li>
  );
}

function NotApplicableDialog({ l, label, close, done }: { l: ChecklistLine; label: string; close: () => void; done: () => Promise<unknown> }) {
  const [reason, setReason] = React.useState("");
  const [err, setErr] = React.useState<{ field: string | null; other: string | null }>({ field: null, other: null });
  const [busy, setBusy] = React.useState(false);
  const sending = React.useRef(false);
  const save = async () => {
    if (sending.current) return; // break m2: Enter pressed twice sends one request
    sending.current = true; setBusy(true); setErr({ field: null, other: null });
    try { await api(`/runtime/checklist-lines/${l.id}/not-applicable`, { method: "POST", json: { reason, version: l.version } }); await done(); close(); }
    catch (e) {
      const f = e instanceof ApiError ? e.field("reason") : null;
      setErr({ field: f, other: f ? null : (e as Error).message });
      if (e instanceof ApiError && e.status === 409) await done();
    } finally { sending.current = false; setBusy(false); }
  };
  return (
    <Dialog open onOpenChange={(o) => { if (!o) close(); }} title={`Not applicable: ${label}`} description="The line stays on the list with your reason; any file is kept."
      footer={<><Button variant="secondary" onClick={close}>Cancel</Button><Button busy={busy} onClick={() => void save()} data-na-save>Mark not applicable</Button></>}>
      <form onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <Field label="Reason" error={err.field}><Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} data-na-reason /></Field>
      </form>
      {err.other ? <p role="alert" className="mt-2 text-sm text-text-danger">{err.other}</p> : null}
    </Dialog>
  );
}
