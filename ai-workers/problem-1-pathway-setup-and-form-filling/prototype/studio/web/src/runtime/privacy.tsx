// C6.16 Adult privacy and "Send to …" (screens lane, B138; concept §4, §5; P-412): the principal's lines under "About
// <person>" in the client questionnaire (Send to …, sent, progress only, take back, resend) and the officer's "Own links
// and privacy" panel (the setting and link state in words; Send, Resend, Send to a new address, Take back, Keep private).
// The server decides who may do what (GET …/people/privacy `can`) and checks again on every request.
import * as React from "react";
import { Info, Lock, Mail, RotateCcw, Send, Undo2 } from "lucide-react";
import { api, ApiError, useAction, useApi } from "@/lib/api";
import { Button, Dialog, Field, Input, Notice, Pill, Table, Textarea } from "@/components/ui/controls";
import { Tip, TipProvider } from "@/components/status";
import { LINK_WORDS, type PeoplePrivacy, type PersonPrivacy, type ProgressOnly } from "../../../contracts/person-link";

export const usePeoplePrivacy = (caseId: string | null) => useApi<PeoplePrivacy>(["runtime", "privacy", caseId], caseId ? `/runtime/cases/${caseId}/people/privacy` : null);
const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const REFRESH = [["runtime"]];

/** "4 of 7 parts done · last saved 9 Nov 14:10", counted on the server (challenge m3). */
export function progressLine(p: ProgressOnly) {
  return `${p.done} of ${p.asked} part${p.asked === 1 ? "" : "s"} done${p.optional ? ` (${p.optional} optional)` : ""}${p.saved_at ? ` · last saved ${when(p.saved_at)}` : ""}`;
}

/** The progress card the principal reads for a person kept private from them (BR-7): never values. */
export function PrivateProgress({ label, progress, children }: { label: string; progress: ProgressOnly; children?: React.ReactNode }) {
  const pct = progress.asked ? Math.round((100 * progress.done) / progress.asked) : 0;
  return (
    <div className="rounded-xl border border-border bg-surface-raised p-4" data-private-progress>
      <p className="flex items-center gap-2 text-sm font-medium"><Lock className="size-4 text-text-muted" aria-hidden />{label} is answering on their own link</p>
      <p className="mt-1 text-[13px] text-text-muted">{progressLine(progress)}</p>
      <div className="mt-2 h-2 rounded-full bg-text/10" role="progressbar" aria-label={`Parts ${label} has done`} aria-valuemin={0} aria-valuemax={progress.asked} aria-valuenow={progress.done}><div className="h-2 rounded-full bg-primary" style={{ width: `${pct}%` }} /></div>
      <p className="mt-2 text-[13px] text-text-muted">Their answers are private to them and the firm.</p>
      {children}
    </div>
  );
}

/** Send or resend: one dialog, at most three steps on one screen (address, what happens, Send). Without `address`
 *  the server resends to the newest link's address (for the principal after acceptance, the kept one). */
function SendDialog({ caseId, person, mode, close }: { caseId: string; person: PersonPrivacy; mode: "send" | "new"; close: () => void }) {
  const [address, setAddress] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const key = React.useMemo(() => crypto.randomUUID(), []); // one link per dialog, however often Send is pressed
  const send = useAction(() => api(`/runtime/cases/${caseId}/people/${person.subject_id}/link`, { method: "POST", json: { address, idempotencyKey: key } }), { success: `Sent to ${person.label}. The link works for 14 days.`, invalidate: REFRESH, onDone: close });
  const submit = () => { if (!address.trim()) { setError("Enter their email address."); return; } send.mutate(undefined, { onError: (e) => setError(e instanceof ApiError ? e.field("address") ?? e.message : e.message) }); };
  return (
    <Dialog open onOpenChange={(o) => { if (!o) close(); }} title={mode === "new" ? `Send to a new address for ${person.label}` : `Send to ${person.label}`} description={mode === "new" ? `${person.label} already answers on ${person.kept_masked}. A new address replaces it; the old link stops working.` : undefined}
      footer={<><Button variant="ghost" onClick={close}>Cancel</Button><Button busy={send.isPending} onClick={submit}><Send aria-hidden />{mode === "new" ? "Send to the new address" : `Send to ${person.label}`}</Button></>}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate>
        <Field label={`${person.label}'s email (required)`} hint="Sample addresses only in the prototype (name@example.com)." error={error}><Input type="email" autoComplete="off" value={address} onChange={(e) => { setAddress(e.target.value); setError(null); }} /></Field>
        <p className="text-sm text-text-muted">{LINK_WORDS.dialog(person.label)}</p>
        <button type="submit" hidden />
      </form>
    </Dialog>
  );
}

/** Take back, confirmed on the page (EXPERIENCE §2.8). Staff give a reason (kept in the history). */
function TakeBackDialog({ caseId, person, staff, close }: { caseId: string; person: PersonPrivacy; staff: boolean; close: () => void }) {
  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const take = useAction(() => api(`/runtime/cases/${caseId}/people/${person.subject_id}/link`, { method: "DELETE", json: reason.trim() ? { reason } : {} }), { success: `${person.label}'s link was taken back.`, invalidate: REFRESH, onDone: close });
  return (
    <Dialog open onOpenChange={(o) => { if (!o) close(); }} title={`Take back ${person.label}'s link?`} description={person.private.on ? LINK_WORDS.takeBack(person.label) : `${person.label}'s link stops working now. You can send a new one later.`}
      footer={<><Button variant="ghost" onClick={close}>Keep the link</Button><Button busy={take.isPending} onClick={() => take.mutate(undefined, { onError: (e) => setError(e instanceof ApiError ? e.field("reason") ?? e.message : e.message) })}><Undo2 aria-hidden />Take back</Button></>}>
      {staff ? <Field label="Why (kept in the case history)" error={error}><Textarea rows={2} value={reason} onChange={(e) => { setReason(e.target.value); setError(null); }} /></Field> : error ? <p role="alert" className="text-sm text-text-danger">{error}</p> : <p className="text-sm text-text-muted">Nothing else changes.</p>}
    </Dialog>
  );
}

/** The staff tick "Keep private from the principal" (AG-7-107, Q71), with a reason; it stays on (P-412). */
function TickDialog({ caseId, person, principal, close }: { caseId: string; person: PersonPrivacy; principal: string; close: () => void }) {
  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const tick = useAction(() => api(`/runtime/cases/${caseId}/people/${person.subject_id}/private`, { method: "PUT", json: { reason } }), { success: `${person.label}'s answers are now private from ${principal}.`, invalidate: REFRESH, onDone: close });
  return (
    <Dialog open onOpenChange={(o) => { if (!o) close(); }} title={`Keep ${person.label}'s answers private from ${principal}?`} description={`${principal} will see how far ${person.label} has got, not their answers, and can no longer change them. Staff always see and edit. It stays on (no untick yet).`}
      footer={<><Button variant="ghost" onClick={close}>Cancel</Button><Button busy={tick.isPending} onClick={() => tick.mutate(undefined, { onError: (e) => setError(e instanceof ApiError ? e.field("reason") ?? e.message : e.message) })}><Lock aria-hidden />Keep private</Button></>}>
      <Field label="Why (kept in the case history)" error={error}><Textarea rows={2} value={reason} onChange={(e) => { setReason(e.target.value); setError(null); }} /></Field>
    </Dialog>
  );
}

/** One click Resend to the newest address (the kept one after acceptance). */
function useResend(caseId: string, person: PersonPrivacy) {
  return useAction(() => api(`/runtime/cases/${caseId}/people/${person.subject_id}/link`, { method: "POST", json: {} }), { success: `A new link was sent to ${person.label} at ${person.kept_masked ?? person.link?.email_masked ?? "their address"}. The earlier one no longer works.`, invalidate: REFRESH });
}

/** The principal's line under "About <person>" (layout §4, 390 px): Send to …, sent, progress only, taken back. */
export function PrincipalPersonLine({ caseId, person }: { caseId: string; person: PersonPrivacy }) {
  const [dialog, setDialog] = React.useState<"send" | "take" | null>(null);
  const resend = useResend(caseId, person);
  const l = person.link, live = person.can.take_back;
  if (person.role === "principal") return null;
  if (!person.adult) return person.why_not && /date of birth/.test(person.why_not) ? <p className="mb-2 text-[13px] text-text-muted">{person.why_not}</p> : null;
  // Resend goes to the newest address (the kept one once accepted); another address only before acceptance (BR-3).
  const actions = (
    <div className="mt-3 flex flex-wrap gap-2">
      {l ? <Button size="sm" variant="secondary" className="h-10" busy={resend.isPending} onClick={() => resend.mutate(undefined)}><RotateCcw aria-hidden />Resend</Button> : null}
      {l && !person.kept_masked && person.can.send ? <Button size="sm" variant="ghost" className="h-10" onClick={() => setDialog("send")}>Send to another address…</Button> : null}
      {live ? <Button size="sm" variant="ghost" className="h-10" onClick={() => setDialog("take")}><Undo2 aria-hidden />Take back</Button> : null}
    </div>
  );
  let body: React.ReactNode;
  if (person.private.on && person.progress) body = (
    <PrivateProgress label={person.label} progress={person.progress}>
      {l?.why ? <p className="mt-2 text-[13px] text-text-muted">{l.state === "taken_back" ? "The link was taken back" : "Their link no longer works"}. You can resend it to {person.kept_masked ?? l.email_masked}, or ask the firm.</p> : null}
      {actions}
    </PrivateProgress>
  );
  else if (l && l.state === "sent") body = (
    <div className="rounded-xl border border-border bg-surface-raised p-4" data-link-sent>
      <p className="flex items-center gap-2 text-sm"><Mail className="size-4 text-text-muted" aria-hidden />Sent to {l.email_masked} on {day(l.sent_at)}.</p>
      <p className="mt-1 text-[13px] text-text-muted">{person.label} has not opened it yet; you can still answer for them.</p>
      {actions}
    </div>
  );
  else body = (
    <div className="flex flex-wrap items-center gap-2" data-send-to>
      <Button size="sm" variant="secondary" className="h-10" onClick={() => setDialog("send")}><Send aria-hidden />Send to {person.label}…</Button>
      <TipProvider><Tip focusable tip={LINK_WORDS.dialogTip}><span className="inline-flex items-center gap-1 rounded text-[13px] text-text-muted outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"><Info className="size-4" aria-hidden />{person.label} answers their own questions</span></Tip></TipProvider>
      {l ? <p className="w-full text-[13px] text-text-muted">{l.why ?? ""}</p> : null}
    </div>
  );
  return (
    <div className="mb-2">
      {body}
      {dialog === "send" ? <SendDialog caseId={caseId} person={person} mode="send" close={() => setDialog(null)} /> : null}
      {dialog === "take" ? <TakeBackDialog caseId={caseId} person={person} staff={false} close={() => setDialog(null)} /> : null}
    </div>
  );
}

/** The officer's panel (layout §4, 1440 px): every person with who answers and the link in words, and the actions. */
export function OfficerPeoplePanel({ caseId }: { caseId: string }) {
  const q = usePeoplePrivacy(caseId);
  const [open, setOpen] = React.useState<{ kind: "send" | "new" | "take" | "tick"; person: PersonPrivacy } | null>(null);
  return (
    <section aria-labelledby="own-links" className="rounded-xl border border-border bg-surface-raised">
      <header className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        <h2 id="own-links" className="text-base font-semibold">Own links and privacy</h2>
        <ProposedStandIn today="links and codes go to a demo inbox by address (Demo workspace only)" later="the team's email sending (AG-10)" />
        <p className="w-full text-[13px] text-text-muted">Staff always see and edit every answer. An adult who answers on their own link is kept private from {q.data?.principal ?? "the principal"}, who then sees their progress only.</p>
      </header>
      {q.isLoading ? <p className="px-4 py-3 text-sm text-text-muted">Loading who answers for each person…</p> : q.isError ? <div className="p-3"><Notice tone="danger" title="Who answers could not be loaded">{(q.error as Error).message}</Notice></div> : (
        <Table dense label="Who answers for each person" head={["Person", "Answers", "Progress", ""]}>
          {q.data!.people.map((p) => (
            <tr key={p.subject_id} data-person={p.subject_id}>
              <td className="px-3 py-2 align-top"><span className="font-medium [overflow-wrap:anywhere]">{p.label}</span><span className="block text-xs text-text-muted">{p.role === "principal" ? "Principal applicant · their own family link" : p.role.replace(/_/g, " ")}</span></td>
              <td className="px-3 py-2 align-top text-[13px]">
                {p.private.on ? <Pill tone="info" title={`${p.private.why ?? ""} (${p.private.by ?? ""}, ${p.private.at ? day(p.private.at) : ""})`}><Lock className="size-3" aria-hidden />Private from {q.data!.principal}</Pill> : null}
                <span className="mt-0.5 block">{p.role === "principal" ? "Answers for the family" : p.words}</span>
                {!p.adult && p.role !== "principal" ? <span className="block text-xs text-text-muted">{p.why_not}</span> : null}
                {p.link?.why ? <span className="block text-xs text-text-muted">{p.link.why}</span> : null}
              </td>
              <td className="px-3 py-2 align-top text-[13px] text-text-muted">{p.progress ? progressLine(p.progress) : "—"}</td>
              <td className="px-3 py-2 align-top">
                <div className="flex flex-wrap justify-end gap-1.5">
                  {p.can.send && !p.link ? <Button size="sm" variant="secondary" onClick={() => setOpen({ kind: "send", person: p })}><Send aria-hidden />Send…</Button> : null}
                  {p.link && (p.can.send || p.can.resend_kept) ? <ResendButton caseId={caseId} person={p} /> : null}
                  {p.can.send_new ? <Button size="sm" variant="ghost" onClick={() => setOpen({ kind: "new", person: p })}>Send to a new address…</Button> : p.link && p.can.send ? <Button size="sm" variant="ghost" onClick={() => setOpen({ kind: "send", person: p })}>Send to another address…</Button> : null}
                  {p.can.take_back ? <Button size="sm" variant="ghost" onClick={() => setOpen({ kind: "take", person: p })}><Undo2 aria-hidden />Take back…</Button> : null}
                  {p.can.tick ? <Button size="sm" variant="ghost" onClick={() => setOpen({ kind: "tick", person: p })}><Lock aria-hidden />Keep private…</Button> : null}
                </div>
              </td>
            </tr>
          ))}
        </Table>
      )}
      {open?.kind === "send" || open?.kind === "new" ? <SendDialog caseId={caseId} person={open.person} mode={open.kind} close={() => setOpen(null)} /> : null}
      {open?.kind === "take" ? <TakeBackDialog caseId={caseId} person={open.person} staff close={() => setOpen(null)} /> : null}
      {open?.kind === "tick" ? <TickDialog caseId={caseId} person={open.person} principal={q.data?.principal ?? "the principal"} close={() => setOpen(null)} /> : null}
    </section>
  );
}

function ResendButton({ caseId, person }: { caseId: string; person: PersonPrivacy }) {
  const resend = useResend(caseId, person);
  return <TipProvider><Tip tip={`A new link to ${person.kept_masked ?? person.link?.email_masked}; the earlier one stops working.`}><Button size="sm" variant="secondary" busy={resend.isPending} onClick={() => resend.mutate(undefined)}><RotateCcw aria-hidden />Resend</Button></Tip></TipProvider>;
}


/** C6.16: the stand-in chip's look for a stand-in the tech lead has not yet added to product/STAND-INS.md (proposed on
 *  PR #1257 as SI-20 and SI-21). It carries no data-stand-in until its row exists; then it becomes <StandIn id="SI-n">. */
export function ProposedStandIn({ today, later }: { today: string; later: string }) {
  return (
    <TipProvider><Tip focusable tip={<>Today: {today}<br />Later: {later}<br /><span className="text-text-muted">Proposed for the stand-ins register</span></>}>
      <span className="inline-flex h-5 items-center whitespace-nowrap rounded-full border border-dashed border-border-strong px-2 text-[11px] font-medium text-text-muted outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">Stand-in</span>
    </Tip></TipProvider>
  );
}
