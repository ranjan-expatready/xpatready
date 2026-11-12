// C6.13 People and filings (screens lane, B135; concept screens/B135/concept.md r2; board design/draft-filing-changes.html):
// one row per person with their filing and its status (from GET …/prepare, the same read as Prepare application), and a
// row menu for Make principal, Remove filing and Add filing back. Every change opens a dialog that first asks the server
// what changes (POST …/filing-changes with preview), names each other filing that changes by person, then applies it
// with a reason over the preview's basis. Refusals are the server's words; the two that never depend on the case's data
// (the principal's own Remove, a child's Make principal) are shown in the menu before any click (GOV.UK: no silent
// disabled buttons). After a change, an Undo next to its words opens the inverse change. Nothing is decided here.
import * as React from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Info, MoreHorizontal, Undo2, UserPlus } from "lucide-react";
import { api, ApiError, useApi } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Dialog, Field, Notice, Pill, Textarea } from "@/components/ui/controls";
import { Skeleton } from "@/components/ui/skeleton";
import { noRetryOnRefusal, type CanAdd, type CasePerson } from "./questionnaire";

type Kind = "make_principal" | "remove_filing" | "add_back";
type Preview = { kind: Kind; subject: string; title: string; stays: string; changes: { person: string; label: string; words: string[]; on?: string }[]; totals: { before_cents: number; after_cents: number } | null; basis: string };
type Applicant = { subject: string; mode: string };
/** `owner`: the filing's principal applicant (Filing.subjectId, IRCC's principal applicant on that application, S12). */
type Filing = { id: string; status: string; owner?: { subject: string; label: string }; applicants: Applicant[]; record?: { submitted_on?: string; application_number?: string } | null };
type PrepareView = { derived: boolean; filings: Filing[] };
type Change = { kind: string; subject: string; other: string | null; reason: string | null; by: string; at: string };

const cad = (c: number) => `CAD ${(c / 100).toFixed(c % 100 ? 2 : 0)}`;
const day = (at: string) => new Date(at).toLocaleDateString("en-CA", { day: "numeric", month: "short" });
const STATUS: Record<string, string> = { not_started: "Not started", ready_to_file: "Ready to file", submitted: "Submitted" };
const ROLE_TIP = "The principal applicant carries the family's capped fees and signs for a minor child. Change it with Make principal.";
/** A24-3 (P-492, design case-structure-a24 §5.1, CS-4, CS-10): IRCC's principal applicant is per application (S12). */
const APPLICANT_TIP = "Each application has its own principal applicant: the person it is filed for. A family member on someone else's application is not its principal applicant.";
/** A24-3: whose filing it is: its principal applicant (Filing.subjectId), read from GET …/prepare. */
const ownerOf = (f: Filing) => f.owner?.subject ?? f.applicants[0]?.subject;
/** A24-3 (P-492, CS-8): the case's client person: the one who answers, the same person whatever Make principal did since
 *  (C6.13 BR-3b: `client` is set once roles were swapped), else the principal. The server's clientSubjectOf, read from
 *  GET /runtime/cases/:id; the case list's client_name names the same person. */
export const clientOf = (people: CasePerson[]): CasePerson | undefined =>
  people.find((p) => p.role !== "case" && p.client === true) ?? people.find((p) => p.role === "principal");
/** Review M4: after a change or Cancel, focus goes back to the person's row (its menu button), once the table re-renders. */
const focusRow = (subject: string) => { let n = 0; const go = () => { const el = document.querySelector<HTMLElement>(`[data-person-row="${subject}"] [data-person-menu]`); if (el && document.activeElement !== el) { el.focus(); return; } if (++n < 20) setTimeout(go, 100); }; setTimeout(go, 50); };
const ITEM = "flex cursor-pointer select-none flex-col gap-0.5 rounded px-2 py-1.5 outline-none data-[disabled]:cursor-not-allowed data-[highlighted]:bg-surface";

export function PeopleAndFilings({ caseId, people, canAdd, onAdd, roleOf, nameOf }: { caseId: string; people: CasePerson[]; canAdd: CanAdd[]; onAdd: (r: CanAdd) => void; roleOf: (p: CasePerson) => string; nameOf: (who: string) => string }) {
  const prep = useApi<PrepareView>(["runtime", "view", caseId, "prepare"], `/runtime/cases/${caseId}/prepare`, { retry: noRetryOnRefusal });
  const hist = useApi<{ changes: Change[] }>(["runtime", "filing-changes", caseId], `/runtime/cases/${caseId}/filing-changes`, { retry: noRetryOnRefusal });
  const [open, setOpen] = React.useState<{ kind: Kind; subject: string; reason?: string } | null>(null);
  const [last, setLast] = React.useState<{ words: string; undo: { kind: Kind; subject: string }; reason: string } | null>(null);
  const filings = prep.data?.derived ? prep.data.filings : [];
  const filingOf = (s: string) => filings.find((f) => ownerOf(f) === s);
  /** A24-3 (CS-10): the filing's principal applicant by name (the case's people, else the name the filing carries). */
  const applicantOf = (f: Filing) => { const s = ownerOf(f); return people.find((p) => p.subject_id === s)?.label ?? f.owner?.label; };
  /** On someone else's filing (C11.12: on the principal's application, applying or declared only). */
  const onFiling = (s: string) => { const f = filings.find((x) => ownerOf(x) !== s && x.applicants.some((a) => a.subject === s)); return f ? { f, mode: f.applicants.find((a) => a.subject === s)!.mode, owner: applicantOf(f) ?? "the principal" } : null; };
  const recordedFiling = filings.find((f) => f.status.toLowerCase() === "submitted" || !!f.record), recorded = !!recordedFiling;
  const recordedWords = recordedFiling?.record?.submitted_on ? `Recorded as submitted to IRCC on ${recordedFiling.record.submitted_on}${recordedFiling.record.application_number ? ` (${recordedFiling.record.application_number})` : ""}: no person or filing of this case changes here. Taking back a submitted application is done in the case's lifecycle (not built here).` : "Recorded as submitted: no person or filing of this case changes here. Taking back a submitted application is done in the case's lifecycle (not built here)."; 
  const lastRemoval = (s: string) => hist.data?.changes.find((c) => c.subject === s && (c.kind === "remove_filing" || c.kind === "travelling_flag"));
  const lastSwap = hist.data?.changes.find((c) => c.kind === "make_principal");
  const shown = people.filter((p) => p.role !== "case");
  return (
    <section aria-labelledby="people" className="rounded-xl border border-border bg-surface-raised" data-people-filings>
      <header className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        <h2 id="people" className="text-base font-semibold">People and filings</h2>
        <span className="text-xs text-text-muted">{filings.length ? `${filings.length} filing${filings.length === 1 ? "" : "s"}` : ""}</span>
        <span className="flex-1" />
        {canAdd.map((r) => <Button key={r.role} size="sm" variant="secondary" data-add-role={r.role} onClick={() => onAdd(r)}><UserPlus aria-hidden />Add {r.label.toLowerCase()}</Button>)}
      </header>
      {last ? <div className="flex flex-wrap items-center gap-2 border-b border-border bg-surface px-4 py-2 text-sm" role="status" data-change-done>{last.words}
        <Button size="sm" variant="ghost" onClick={() => setOpen({ ...last.undo, reason: `Undo: ${last.reason}`.slice(0, 500) })} data-undo><Undo2 aria-hidden />Undo</Button></div> : null}
      {prep.isLoading ? <div className="space-y-2 p-4"><Skeleton className="h-6 w-full" /><Skeleton className="h-6 w-full" /></div> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-left text-xs text-text-muted"><th className="px-4 py-2 font-medium">Person</th><th className="px-2 py-2 font-medium"><span className="inline-flex items-center gap-1">Role<span tabIndex={0} role="img" title={ROLE_TIP} aria-label={ROLE_TIP} className="rounded outline-none focus-visible:ring-2 focus-visible:ring-ring"><Info className="size-3" aria-hidden /></span></span></th><th className="px-2 py-2 font-medium">Filing</th><th className="px-2 py-2 font-medium"><span className="inline-flex items-center gap-1">Principal applicant<span tabIndex={0} role="img" title={APPLICANT_TIP} aria-label={APPLICANT_TIP} className="rounded outline-none focus-visible:ring-2 focus-visible:ring-ring"><Info className="size-3" aria-hidden /></span></span></th><th className="px-2 py-2 font-medium">Status</th><th className="px-4 py-2"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {shown.map((p) => {
                const f = filingOf(p.subject_id), on = f ? null : onFiling(p.subject_id), removal = !p.applies ? lastRemoval(p.subject_id) : undefined;
                const swapNote = p.role === "principal" && lastSwap?.subject === p.subject_id ? lastSwap : undefined;
                return (
                  <tr key={p.subject_id} className="border-b border-border last:border-0 align-top" data-person-row={p.subject_id}>
                    <td className="px-4 py-2 font-medium [overflow-wrap:anywhere]">{p.label}</td>
                    <td className="px-2 py-2">{roleOf(p)}{swapNote ? <div className="text-xs text-text-muted" data-change-reason>Made principal {day(swapNote.at)} by {nameOf(swapNote.by)}: “{swapNote.reason}”</div> : null}</td>
                    <td className="px-2 py-2">{p.co_files ? <Pill title="Their forms are sent with the principal applicant's application, never on their own">Sent with the principal's application</Pill>
                      : f ? "Own application" : on ? (on.mode === "declared_only" ? <span className="text-text-muted">Declared only on {on.owner}'s application (not travelling)</span> : `On ${on.owner}'s application`)
                      : <span className="text-text-muted">No filing: not travelling</span>}
                      {removal ? <div className="text-xs text-text-muted [overflow-wrap:anywhere]" data-change-reason>{removal.reason ? `Removed ${day(removal.at)} by ${nameOf(removal.by)}: “${removal.reason}”` : `Marked not travelling ${day(removal.at)} by ${nameOf(removal.by)}`}</div> : null}</td>
                    <td className="px-2 py-2 [overflow-wrap:anywhere]" data-filing-principal={(f ?? on?.f) ? ownerOf((f ?? on?.f)!) ?? "" : ""}>{(f ?? on?.f) ? applicantOf((f ?? on?.f)!) ?? "—" : <span className="text-text-muted">—</span>}</td>
                    <td className="px-2 py-2">{(f ?? on?.f) ? <Pill>{(({ status }) => STATUS[status.toLowerCase()] ?? status.toLowerCase().replace(/_/g, " "))((f ?? on?.f)!)}</Pill> : "—"}</td>
                    <td className="px-4 py-2 text-right">{recorded ? <span className="block max-w-xs text-left text-xs text-text-muted" data-recorded-note>{recordedWords}</span>
                      : p.co_files ? null : <RowMenu p={p} onPick={(kind) => setOpen({ kind, subject: p.subject_id })} />}</td>
                  </tr>);
              })}
            </tbody>
          </table>
        </div>)}
      {open ? <ChangeDialog caseId={caseId} kind={open.kind} subject={open.subject} initialReason={open.reason} close={() => { const s = open.subject; setOpen(null); focusRow(s); }} done={(r, reason) => { const s = open.subject; setLast({ words: r.words, undo: r.undo, reason }); setOpen(null); focusRow(s); }} /> : null}
    </section>
  );
}

function RowMenu({ p, onPick }: { p: CasePerson; onPick: (k: Kind) => void }) {
  const principal = p.role === "principal", spouse = p.role === "spouse_or_partner";
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild><Button size="sm" variant="ghost" aria-label={`Actions for ${p.label}`} data-person-menu><MoreHorizontal /></Button></DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={4} className="z-50 w-[300px] rounded-lg border border-border bg-surface-raised p-1 text-sm shadow-lg">
          {!principal ? <DropdownMenu.Item className={ITEM} aria-disabled={!spouse || undefined} data-refused={!spouse || undefined} onSelect={(e) => { if (!spouse) { e.preventDefault(); return; } onPick("make_principal"); }} data-action="make-principal">
            <span className={spouse ? "" : "text-text-muted"}>Make principal…</span>
            <small className="text-xs text-text-muted">{spouse ? "Swaps roles with the principal applicant. Answers stay with each person." : p.role === "child" ? `Refused: a child cannot swap with a parent. To make ${p.label} the principal applicant, open a case for them.` : "Refused: only the spouse or partner can swap with the principal."}</small></DropdownMenu.Item> : null}
          {principal ? <DropdownMenu.Item className={ITEM} aria-disabled data-refused onSelect={(e) => e.preventDefault()} data-action="remove-filing"><span className="text-text-muted">Remove filing</span><small className="text-xs text-text-muted">Refused: make someone else principal first.</small></DropdownMenu.Item>
            : p.applies ? <DropdownMenu.Item className={ITEM} onSelect={() => onPick("remove_filing")} data-action="remove-filing"><span>Remove filing…</span><small className="text-xs text-text-muted">{p.label} stays on the case, not travelling.</small></DropdownMenu.Item>
            : <DropdownMenu.Item className={ITEM} onSelect={() => onPick("add_back")} data-action="add-back"><span>Add filing back…</span><small className="text-xs text-text-muted">The same filing, with its items, comes back.</small></DropdownMenu.Item>}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function ChangeDialog({ caseId, kind, subject, initialReason, close, done }: { caseId: string; kind: Kind; subject: string; initialReason?: string; close: () => void; done: (r: { words: string; undo: { kind: Kind; subject: string } }, reason: string) => void }) {
  const qc = useQueryClient();
  const [view, setView] = React.useState<Preview | null>(null);
  const [refusal, setRefusal] = React.useState<string | null>(null);
  /** Review M3, break M3: a 409 on apply says why the preview changed; a reload of the preview never clears it. */
  const [stale, setStale] = React.useState<string | null>(null);
  const [reason, setReason] = React.useState(initialReason ?? "");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const load = React.useCallback(async () => {
    setView(null); setRefusal(null);
    try { setView(await api<Preview>(`/runtime/cases/${caseId}/filing-changes`, { method: "POST", json: { kind, subject, preview: true } })); }
    catch (e) { setRefusal(e instanceof ApiError ? e.message : (e as Error).message); }
  }, [caseId, kind, subject]);
  React.useEffect(() => { void load(); }, [load]);
  const apply = async () => {
    if (!reason.trim()) { setError("Write a reason: it is kept with the change."); return; }
    setBusy(true);
    try {
      const r = await api<{ words: string; undo: { kind: Kind; subject: string } }>(`/runtime/cases/${caseId}/filing-changes`, { method: "POST", json: { kind, subject, basis: view!.basis, reason } });
      await qc.invalidateQueries({ queryKey: ["runtime"] });
      done(r, reason.trim());
    } catch (e) {
      const status = e instanceof ApiError ? e.status : 0;
      if (status === 409) { setStale(`${(e as Error).message} What changes now is shown below.`); void load(); }
      else setError(e instanceof ApiError ? e.field("reason") ?? e.message : (e as Error).message);
    } finally { setBusy(false); }
  };
  const verb = kind === "make_principal" ? "Make principal" : kind === "remove_filing" ? "Remove filing" : "Add filing back";
  const others = view?.changes.filter((c) => c.person !== subject) ?? [];
  return (
    <Dialog open onOpenChange={(o) => { if (!o) close(); }} wide title={view?.title ?? verb} description={view?.stays}
      footer={<><Button variant="ghost" onClick={close}>Cancel</Button>{view ? <Button variant={kind === "remove_filing" ? "destructive" : "default"} busy={busy} onClick={() => void apply()} data-confirm>{verb}</Button> : null}</>}>
      <div className="space-y-3" data-change-dialog>
        {stale ? <Notice tone="warn" title="Changed since you opened this">{stale}</Notice> : null}
        {refusal ? <Notice tone="warn" title="Not possible">{refusal}</Notice> : null}
        {!view && !refusal ? <div className="space-y-2"><Skeleton className="h-5 w-2/3" /><Skeleton className="h-16 w-full" /></div> : null}
        {view ? <>
          {others.length ? <p className="rounded-lg bg-warn/15 px-3 py-2 text-sm font-medium text-text-warn" data-dependants>{view.changes.some((c) => c.on) /* BK-9: a shared application */ ? `This changes ${others.length} other ${others.length === 1 ? "person's application" : "people's applications"} too:` : `${others.length} other filing${others.length === 1 ? " depends" : "s depend"} on this one and change${others.length === 1 ? "s" : ""}:`}</p>
            : <p className="text-sm text-text-muted">No other filing changes.</p>}
          <ul className="space-y-2">{view.changes.map((c) => <li key={c.person} className="rounded-lg border border-border px-3 py-2" data-change-filing={c.person}>
            <p className="font-medium">{c.on ? `${c.label} · on ${c.on}'s application` : view.changes.some((x) => x.on) /* review m4: one word per dialog */ ? `${c.label}'s application` : `${c.label}'s filing`}{c.person === subject ? " (this one)" : ""}</p>
            <ul className="ml-4 list-disc text-sm">{c.words.map((w) => <li key={w}>{w}</li>)}</ul></li>)}</ul>
          {view.totals && view.totals.before_cents !== view.totals.after_cents ? <p className="text-sm text-text-muted" data-change-totals>Fees for this case: {cad(view.totals.before_cents)} → {cad(view.totals.after_cents)} (amounts from the cited fee table, Sample).</p> : null}
          <Field label="Why?" hint="Kept with the change and shown on the person's row." error={error}>
            <Textarea value={reason} onChange={(e) => { setReason(e.target.value); setError(null); }} maxLength={500} placeholder={kind === "make_principal" ? "For example: the spouse holds the job offer" : kind === "remove_filing" ? "For example: added by mistake; not travelling after all" : "For example: travelling after all"} data-change-reason-input autoFocus />
          </Field>
        </> : null}
      </div>
    </Dialog>
  );
}
