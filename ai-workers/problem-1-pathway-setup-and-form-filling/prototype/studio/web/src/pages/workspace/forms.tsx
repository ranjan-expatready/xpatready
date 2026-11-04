// S5 Forms tab (W1-08, walkthrough v2 S5), slice 1: the combination's form lines with who fills each, from what age,
// only if (a rule, or words with no rule yet: M1), how it is filed by default within what IRCC accepts, and who signs.
// A row opens a 560 px drawer to change them. "Add a form from the library" picks only forms the library holds (P-118 Q2:
// forms enter only through the Form library). Each form is listed once (early-look fix 1): its reading and matching
// status and next step are in its row, its steps in its drawer; checklists, guides and pages that are not lines are one
// "Sources" line. Slice 3: the forms come from the form finder (finder.tsx, the forms lane's endpoints); each row's ⋯
// menu has Redo with AI, Replace edition and Remove from this combination; the page has one Undo (the forms lane's
// POST …/forms/undo, P-116 amended) and the shared Undo toast after a removal; guides are sources (api/src/guide-sources.ts).
import * as React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ArrowDown, ArrowUp, Copy, MoreHorizontal, Pencil, Plus, RefreshCw, Trash2, Undo2 } from "lucide-react";
import { ACCOUNT_WORDS, CHANNEL_WORDS, CHANNELS, SIGNATURE_FITS, SIGNATURE_WORDS, throughAccount, type Channel, type IrccAccount, type Signature } from "../../../../contracts/forms";
import { changeWords, COPIES_WORDS, copiesWords, SIGNED_BY, type LastFormChange, type RemovedForm, type WorkspaceFormLine } from "../../../../contracts/workspace";
import { api, ApiError, useAction, useSessionView, useToast } from "@/lib/api";
import { useUndoToast } from "@/components/lifecycle";
import { useBulkLines } from "@/components/bulk-lines";
import { APPROVER_WORDS } from "../../../../contracts/lines-bulk";
import { FindDialog, FinderPanel, formsKeys, useFinderLatest } from "./finder";
import { Button, Dialog, Field, Input, Notice, Panel, Pill, Select, Table } from "@/components/ui/controls";
import { Spinner } from "@/components/ui/spinner";
import { ConditionBuilder } from "@/components/conditions";
import { StartableNotice } from "@/components/startable-notice";
import { fmtWhen, Tip } from "@/components/status";
import { FORM_WHO, useLibraryFields, whoLabel } from "@/pages/configuration";
import { ItemSources, useItemNumbers } from "@/components/source-panel";
import { attachmentFor, pendingForms, ReadingCell, ReadingSteps, SourcesLine, StepNotices } from "@/pages/sources";
import { FormMasters } from "@/components/ai-launch";
import { FormPicker } from "@/components/forms";
import { waitsForMap } from "../../../../engine/setup-checklist";
import { DoneSinceNotice, FOCUS_RING, useFocusItem } from "@/components/focus-item";
import { cn } from "@/lib/utils";
import { useApi } from "@/lib/api";
import { SetupRail, StepChip } from "./setup-rail";
import type { FormStepChip } from "../../../../contracts/form-progress";
import { normaliseCode } from "../../../../contracts/form-library";
import { AccountPicker, ChannelCell, SignatureCell } from "@/components/channels";
import type { CombinationSummary, CombinationView } from "../../../../contracts/programs";
import { formsWords, type FormsCount } from "../../../../contracts/counts";
/** The fields of a summary line that ChannelCell reads. */
type ChannelLine = CombinationSummary["forms"][number];
type Combo = Parameters<typeof SourcesLine>[0]["d"];

/** m3 (P-113): Online is a real way for portal-only forms; the product fills it in a later wave. */
const ONLINE_WORDS = "Online: the case officer types it into the portal from the answer sheet; the browser extension fills it in a later wave.";
const TIPS = {
  who: "Whose form it is: one copy for each person it names. A minimum age leaves out anyone younger.",
  onlyIf: "When the form is needed. A rule is checked on every case; words alone cannot be checked, so a case cannot tell until a rule is built.",
  filed: "How new cases file this form unless the case officer changes it. Only ways IRCC accepts are offered (Form library; Sample until the immigration expert confirms).",
  signed: "Who signs the form. Sample until the immigration expert confirms.",
  signature: "How the form is signed: typed name, signed by hand and scanned, signed in pen (paper), or no signature. Only what fits the way it is filed is offered (Sample until the immigration expert confirms).",
  library: "The edition this combination uses, how many of its form fields are matched to shared fields, and the step the form waits for (read it, draft with AI, review AI's proposals).",
};

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;

export function FormsTab({ id, lines, filing, filingDetail, account = null, accountKey = null, problems, removed = [], removedEver = [], fromLibrary = [], lastChange = null, progress = {} }: { id: string; lines: WorkspaceFormLine[]; filing: string; filingDetail: string; account?: string | null; accountKey?: string | null; problems: { level: "error" | "warning"; item: string; message: string }[]; removed?: RemovedForm[]; removedEver?: string[]; fromLibrary?: string[]; lastChange?: LastFormChange | null; progress?: Record<string, FormStepChip> }) {
  const { canAuthor, known } = useSessionView();
  const [open, setOpen] = React.useState<WorkspaceFormLine | null>(null);
  const [adding, setAdding] = React.useState(false);
  const [finding, setFinding] = React.useState<string[] | null>(null);
  const [choosingPage, setChoosingPage] = React.useState(false);
  // C11.15: a line's own "Redo with AI" chooses its stage (find, read, match); Find again for a form not on it does not.
  const [lineRedo, setLineRedo] = React.useState(false);
  const [sp, setSp] = useSearchParams();
  const [removing, setRemoving] = React.useState<WorkspaceFormLine | null>(null);
  // C2.12 slice 3: one form's guided path, addressable as ?setup=<form number> (a reload lands on the same form).
  const setup = sp.get("setup");
  const openSetup = (code: string) => setSp((x) => { const n = new URLSearchParams(x); n.set("setup", code); return n; });
  const closeSetup = () => { const code = setup ? normaliseCode(setup) : null; setSp((x) => { const n = new URLSearchParams(x); n.delete("setup"); n.delete("back"); return n; }, { replace: true }); refocusChip(code); };
  // WCAG 2.4.3: focus goes back to the form's chip; the dialog hands focus back to what was focused before it opened (the
  // page, when the rail opened from the address), so the chip is focused again for a few frames until it holds.
  const refocusChip = (code: string | null, tries = 20) => { const el = document.querySelector<HTMLElement>(`[data-step-chip="${CSS.escape(code ?? "")}"]`); if (el && document.activeElement !== el) el.focus(); if (tries > 0) requestAnimationFrame(() => refocusChip(code, tries - 1)); };
  const rail = setup ? <SetupRail key={setup} id={id} code={setup} onClose={closeSetup} focusCurrent={sp.get("back") === "1"} /> : null;
  const d = useApi<CombinationView>(["combination", id], `/combinations/${id}`);
  const latest = useFinderLatest(id);
  const toast = useUndoToast();
  // X2b (C1.5): copy a line to other combinations, remove it from them, or copy lines here from another combination.
  const bulk = useBulkLines(id);
  const qc = useQueryClient();
  const undoLast = async (changeId?: string) => { await api(`/combinations/${id}/forms/undo`, { method: "POST", json: changeId ? { changeId } : {} }); for (const k of [...formsKeys(id), ["combination", id, "finder"]]) void qc.invalidateQueries({ queryKey: k }); };
  const redo = (codes?: string[], onLine = false) => { setChoosingPage(false); setLineRedo(onLine); setFinding(codes ?? []); };
  const choosePage = () => { setChoosingPage(true); setLineRedo(false); setFinding([]); };
  // S3 item 5 (QA-63): a run card elsewhere (AI work) sends the person here: ?find=page opens the page choice, ?find=again
  // the Find dialog; the address is cleaned so a reload does not open it again.
  const asked = sp.get("find");
  React.useEffect(() => {
    if (!asked || !latest.data) return;
    if (asked === "page" && latest.data.page_choice) choosePage(); else redo();
    setSp((x) => { const n = new URLSearchParams(x); n.delete("find"); return n; }, { replace: true });
  }, [asked, latest.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const onRemoved = (code: string) => toast.show(`${code} removed from this combination; it stays in the Form library`, () => undoLast());
  const noRule = lines.filter((l) => l.onlyIf.kind === "words_only");
  const add = canAuthor ? <><Button size="sm" variant="secondary" onClick={() => setAdding(true)}><Plus /> Add a form from the library</Button><Button size="sm" variant="secondary" onClick={bulk.openFrom} data-copy-from-open><Copy /> Copy a line from another combination</Button></> : null;
  const picker = adding ? <Panel open onOpenChange={(o) => !o && setAdding(false)} title="Add a form from the library" description="Only forms already in the Form library. A new form enters there first (upload, or the form finder)." footer={<><Button variant="ghost" onClick={() => setAdding(false)}>Close</Button><Link className="text-sm text-text-link underline" to="/library/forms">Open the Form library</Link></>}><FormPicker combinationId={id} have={lines.map((l) => l.code)} /></Panel> : null;
  const combo = d.data as unknown as Combo | undefined;
  const codes = lines.map((l) => l.code);
  // A form removed in this draft is under "Removed in this draft" (Undo), not a form waiting to be set up.
  const pending = combo ? pendingForms(combo, [...codes, ...removed.map((r) => r.code), ...removedEver]) : [];
  // X1 / #206 finding 6: the setup checklist's forms items land here (?focus=forms:sources, forms:lines, forms:problems,
  // forms:held): scrolled to, focused, outlined 2 s, the address cleared (components/focus-item). Nothing lands while the
  // tab loads.
  // QA-121: a forms:* place no longer on the tab (no held edition now, no problems now) says so and leaves the address.
  // Review M2: forms:held and a released version's forms:problems are drawn from the summary, so nothing counts as gone
  // before it is in (as Questionnaires). Review M1: forms:finder ("Find forms") has no single place drawn here; it is
  // never claimed, so an open Find forms item is never called done.
  const sumForFocus = useApi<CombinationSummary>(["combination-summary", id], `/combinations/${id}/summary`);
  // UX-A part 1 (contracts/counts.ts): the forms count is the summary's, the one the Overview, the setup strip and the
  // Programs card show; this tab never counts its own.
  const sc = sumForFocus.data?.setup?.counts;
  const formsCount: FormsCount | null = sc ? { total: sc.forms, setUp: sc.formsSetUp } : null;
  const doneSince = useFocusItem(known && combo && sumForFocus.data ? [] : undefined, (k) => k.startsWith("forms:") && k !== "forms:finder");
  const finder = <><FinderPanel id={id} latest={latest.data} onRedo={redo} onChoosePage={choosePage} removed={removed.map((r) => r.code)} count={formsCount} countFailed={sumForFocus.isError} onRetryCount={() => void sumForFocus.refetch()} />{finding ? <FindDialog id={id} only={finding.length ? finding : undefined} page={choosingPage ? latest.data?.page_choice ?? { candidates: [], why: "" } : null} stages={lineRedo} onClose={() => { setFinding(null); setChoosingPage(false); setLineRedo(false); }} onStarted={(runId) => window.dispatchEvent(new CustomEvent("s5-find-started", { detail: runId }))} /> : null}</>;
  // Break m4 (Screen 01): an author never sees the channels as read-only words while the session loads.
  if (!known || !combo) return <Spinner label="Loading forms" />;
  const undo = canAuthor ? <>{lastChange ? <UndoBar change={lastChange} onUndo={undoLast} /> : null}{removed.length ? <RemovedNotice id={id} removed={removed} /> : null}</> : null;
  if (!lines.length && !pending.length) return (
    <div className="space-y-5">
      <DoneSinceNotice shown={doneSince} />
      {undo}{bulk.note}{finder}
      <div className="rounded-xl border border-border bg-surface-raised p-5" data-forms-empty>
        <div className="flex flex-wrap items-start justify-between gap-3"><h2 className="font-semibold">No forms yet</h2>{add}</div>
        <p className="mt-1 text-sm text-text-muted">Find them with AI above, or add one from the <Link className="text-text-link underline" to="/library/forms">Form library</Link>.</p>
      </div>
      {/* Devin on #622: a released combination with no forms lands its "No forms yet" cause here too. */}
      <FormsProblems id={id} filing={problems} />
      <SourcesLine d={combo} lineCodes={codes} />{picker}{rail}{toast.node}{bulk.node}
    </div>
  );
  // Drift check 5: forms attached but not set up are counted with the lines, so the header never says "No forms yet ·
  // 0 forms" above them; what each waits for is said in the same steps as the rows (and the page's next step).
  const inLibrary = (a: { id: string; status: string }) => a.status === "IN_LIBRARY" || fromLibrary.includes(a.id);
  const ready = pending.filter(inLibrary).length, toDraft = pending.length - ready;
  // Review m5: while the summary loads the line says so; if it fails, it says so with Retry (never a silent "…").
  const count = formsCount ? formsWords(formsCount) : sumForFocus.isError ? <span className="text-text-danger" data-count-failed>forms count not loaded <button type="button" className="font-medium text-text-link underline" onClick={() => void sumForFocus.refetch()}>Retry</button></span> : "counting forms…";
  return (
    <div className="space-y-4">
      <DoneSinceNotice shown={doneSince} />
      {undo}{bulk.note}{finder}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 text-sm" data-filing>{/* P-143, review M2: the IRCC account, chosen here by an author; min-w-0 (QA-20): the line shrinks to 390 px and the picker with it */}<span className="mr-3" data-account><span className="text-text-muted">IRCC account: </span>{canAuthor ? <AccountPicker id={id} saved={accountKey} /> : account ? `Filed ${accountKey ? throughAccount(accountKey) : `through the ${account}`}` : <span className="text-text-muted">Not set (every way IRCC may accept is offered, Sample)</span>}</span><span className="text-text-muted">Filing: </span>{lines.length ? <><b className="font-semibold" title={filingDetail !== filing ? filingDetail : undefined}>{filing}</b>{filingDetail !== filing ? <span className="sr-only"> ({filingDetail})</span> : null}</> : <b className="font-semibold">not known until a form is set up</b>} <span className="text-text-muted">· {count} · Sample until the immigration expert confirms</span></p>
        <span className="flex flex-wrap items-center gap-3">{add}<Link className="text-sm text-text-link underline" to="/library/forms">Open the Form library</Link></span>
      </div>
      {canAuthor && lines.length > 1 ? <FilingOrder id={id} codes={lines.map((l) => l.code)} /> : null}
      {pending.length ? <p className={cn("text-sm", FOCUS_RING)} data-pending-summary data-focus="forms:sources"><span className="font-medium">Not set up yet: </span>{[ready ? `${plural(ready, "form")} can be added from the library now (${ready === 1 ? "its" : "their"} form fields are already matched, no AI needed)` : "", toDraft ? `${plural(toDraft, "form")} ${toDraft === 1 ? "needs" : "need"} reading and drafting with AI` : ""].filter(Boolean).join("; ")}. Each row has its step.</p> : null}
      <StepNotices d={combo} />
      <HeldEditions id={id} />
      {noRule.length ? <Notice tone="warn" title={`${noRule.length} condition${noRule.length === 1 ? " is" : "s are"} in words only`}>A case cannot tell whom {noRule.map((l) => l.code).join(", ")} {noRule.length === 1 ? "applies" : "apply"} to until the words are turned into a rule. Release waits for it. Open the form to build the rule.</Notice> : null}
      <div className={FOCUS_RING} data-focus="forms:lines"><Table head={["Form", "Why it is here (IRCC's words)", <Head key="w" tip={TIPS.who}>Who fills it</Head>, <Head key="o" tip={TIPS.onlyIf}>Only if</Head>, <Head key="f" tip={TIPS.filed}>Filed as by default</Head>, <Head key="g" tip={TIPS.signature}>Signature</Head>, <Head key="s" tip={TIPS.signed}>Signed by</Head>, <Head key="l" tip={TIPS.library}>Read and matched</Head>, ""]}>
        {lines.map((l) => (
          <tr key={l.line} data-line={l.code} data-line-not-needed={l.channel === "NOT_NEEDED" || undefined} className={l.channel === "NOT_NEEDED" ? "bg-surface text-text-muted" : undefined}>{/* C-4: kept visible, greyed, never filled */}
            <td><span className="mono font-medium">{l.code}</span><br /><span className="text-xs text-text-muted">{l.title}</span>{l.origin === "AI_FOUND" || l.origin === "AI_PROPOSAL" ? <><br /><Pill tone="ai">Picked by AI · Sample</Pill></> : null}</td>
            <td className="max-w-56 text-xs text-text-muted">{l.quote ? `"${l.quote.slice(0, 120)}${l.quote.length > 120 ? "…" : ""}"` : l.added ?? "Added by a person"}</td>
            <td className="text-sm">{l.document ? <span className="text-text-muted">Checklist · not filed</span> : <>{whoLabel(l.who)}{l.minAge ? <span className="text-text-muted"> · {l.who === "principal_partner_adult_children" ? `children ${l.minAge}+` : `${l.minAge}+`}</span> : null}{l.copies > 1 ? <span className="text-text-muted" data-copies> · {copiesWords(l.copies)}</span> : null}</>}</td>
            <td className="max-w-56 text-xs"><OnlyIfCell l={l} /></td>
            <td className="text-sm">{l.document ? <span className="text-text-muted">—</span> : <><ChannelCell id={id} line={{ code: l.code, channel: l.channel as Channel, channelWords: l.channelWords, signature: l.signature, document: l.document } as ChannelLine} canAuthor={canAuthor} options={l.channelOptions} />{l.channel === "ONLINE" && accountKey !== "PAPER" ? <p className="text-xs text-text-muted" data-online-words>{accountKey ? `Typed into the ${ACCOUNT_WORDS[accountKey as IrccAccount] ?? accountKey} from the answer sheet, in portal order` : canAuthor ? "IRCC account not set: choose above the account it is typed into" : "IRCC account not set: no portal to type it into yet"}</p> : null}</>}</td>
            <td className="text-sm">{l.document ? <span className="text-text-muted">—</span> : <SignatureCell id={id} code={l.code} channel={l.channel as Channel} signature={l.signatureKind as Signature} signatures={l.signatures} canAuthor={canAuthor} />}</td>
            <td className="text-xs">{l.document ? "—" : l.signedBy ? l.signedByLabel : <span className="text-text-muted">Not set</span>}</td>
            <td className="text-xs"><span className="block">{l.edition ?? l.libraryEdition ?? <span className="text-text-muted">No edition read yet</span>}{l.document ? null : <span className="text-text-muted"> · {l.boxes} form fields matched</span>}</span>{l.document ? null : <LineReading combo={combo} l={l} fromLibrary={fromLibrary} />}{l.document ? null : <span className="mt-1 block"><StepChip code={l.code} chip={progress[l.code]} onOpen={() => openSetup(l.code)} /></span>}</td>
            <td className="whitespace-nowrap">{canAuthor ? <><Button size="sm" variant="ghost" aria-label={`Change ${l.code}`} onClick={() => setOpen(l)}><Pencil /> Change</Button><LineMenu id={id} l={l} onRedo={() => redo([l.code], true)} onRemove={() => setRemoving(l)} onBulk={(op) => bulk.open({ kind: "form", key: l.code, short: l.code }, op)} /></> : null}</td>
          </tr>
        ))}
        {pending.map((a) => (
          <tr key={a.id} data-pending={a.edition ?? a.fileName} data-attachment={a.id}>
            <td><span className="mono font-medium">{(a.edition ?? a.fileName).split(" (")[0]}</span><br />{/* QA-78: the edition a person reads, never the file name (imm5257e.pdf). */}<span className="text-xs text-text-muted">{a.edition ?? "Not read yet"}</span></td>
            <td colSpan={5} className="text-xs text-text-muted">Attached from the Form library: not set up as a line yet. It is read, then its form fields are matched to shared fields; it joins the lines when the matches are applied.</td>
            <td className="text-xs"><ReadingCell d={combo} a={a} inLibrary={inLibrary(a)} />{a.edition ? <span className="mt-1 block"><StepChip code={a.edition.split(" (")[0]} chip={progress[a.edition.split(" (")[0]]} onOpen={() => openSetup(a.edition!.split(" (")[0])} /></span> : null}</td>
            <td />
          </tr>
        ))}
      </Table></div>
      {!canAuthor ? <p className="text-xs text-text-muted" data-approver-copies>{APPROVER_WORDS}</p> : null}
      <FormsProblems id={id} filing={problems} />
      <SourcesLine d={combo} lineCodes={codes} />
      {/* QA-218 (C3.4, P-138): the guide's checks, Saved (US$0) where a saved AI run exists; forms are listed once (S5 fix 1). */}
      {canAuthor ? <FormMasters combinationId={id} guidesOnly /> : null}
      {open ? <LineDrawer id={id} l={open} d={combo} onClose={() => setOpen(null)} onRemoved={onRemoved} /> : null}
      {removing ? <RemoveDialog id={id} l={removing} onClose={() => setRemoving(null)} onRemoved={onRemoved} /> : null}
      {picker}{rail}{toast.node}{bulk.node}
    </div>
  );
}

/** Lead check L11: a set-up line whose form fields the library already matched has no AI step left; a line still being
 *  read or drafted keeps its step. Devin Review (PR #71): "matched" is the shown file's own edition (the server's
 *  fromLibrary: its edition has a field map), never the line's count, so a newer unmapped edition keeps Draft with AI. */
function LineReading({ combo, l, fromLibrary }: { combo: Combo; l: WorkspaceFormLine; fromLibrary: string[] }) {
  const a = attachmentFor(combo, l.code);
  // QA-103: a line whose file is in the library but not on this combination never says "Not attached": it says the file
  // is in the library, and its next step is the line's own step chip below (Field map); with no file anywhere, it says so.
  if (!a && !l.boxes) return l.libraryEdition
    ? <span className="mt-1 inline-flex flex-col items-start gap-1" data-line-next="library"><Pill tone="info">File in the library</Pill></span>
    : <span className="mt-1 block text-text-muted" data-line-next="file">No file yet: upload it or find it in <Link className="text-text-link underline" to="/library/forms">Shared library › Forms</Link></span>;
  const mapped = a ? a.status === "IN_LIBRARY" || fromLibrary.includes(a.id) : l.boxes > 0;
  // The last step and when it ran stay (QA-17); only the next step, which would be AI, goes.
  const last = a ? combo.jobs.find((j) => j.attachmentId === a.id) : undefined;
  if (mapped && (!a || ["RECOGNISED", "READ", "IN_LIBRARY"].includes(a.status))) return <span className="mt-1 inline-flex flex-col items-start gap-1" data-line-matched><Pill tone="ok">In the library</Pill>{last ? <span className="text-text-muted">{last.kind === "field_map" ? "AI draft" : "Read"} {fmtWhen(last.startedAt)}</span> : null}</span>;
  return <ReadingCell d={combo} a={a} />;
}

/** The one Undo of the page (P-116 amended): the newest change on this combination's forms, named, while the draft is
 *  open. The forms lane's Undo puts the lines back exactly and refuses when someone changed them since. */
function UndoBar({ change, onUndo }: { change: LastFormChange; onUndo: (changeId: string) => Promise<void> }) {
  const toast = useToast();
  const [busy, setBusy] = React.useState(false);
  const go = async () => { setBusy(true); try { await onUndo(change.id); toast.push({ tone: "ok", text: `Undone: ${changeWords(change)}` }); } catch (e) { toast.push({ tone: "danger", text: (e as Error).message }); } finally { setBusy(false); } };
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm" data-undo-bar>
      <span><span className="text-text-muted">Last change: </span>{changeWords(change)} <span className="text-text-muted">· {fmtWhen(change.at)}</span></span>
      <Button size="sm" variant="secondary" onClick={() => void go()} busy={busy}><Undo2 /> Undo</Button>
    </div>
  );
}

/** Forms removed since the last release: Add back puts the same line back (the forms lane's attach restores it). */
function RemovedNotice({ id, removed }: { id: string; removed: RemovedForm[] }) {
  const add = useAction((code: string) => api(`/combinations/${id}/forms`, { method: "POST", json: { formKey: code } }), { success: (r: { added: string }) => `${r.added} is back on this combination`, invalidate: [...formsKeys(id), ["combination", id, "finder"]] });
  // A removal just made (the list grew, or the notice appeared) brings it into view, clear of the fixed top bar: the
  // person removed it lower down the page.
  const box = React.useRef<HTMLDivElement>(null), seen = React.useRef(0);
  React.useEffect(() => { if (removed.length > seen.current) box.current?.scrollIntoView({ block: "center" }); seen.current = removed.length; }, [removed.length]);
  return (
    <div ref={box}><Notice tone="info" title={`Removed in this draft (${removed.length})`}>
      <ul className="mt-1 space-y-1" data-removed>{removed.map((f) => <li key={f.code} className="flex flex-wrap items-center gap-2"><span><span className="mono font-medium">{f.code}</span> {f.title}</span><Button size="sm" variant="secondary" onClick={() => add.mutate(f.code)} busy={add.isPending && add.variables === f.code} aria-label={`Add back ${f.code}`}><Plus /> Add back</Button></li>)}</ul>
      <p className="mt-1 text-xs">Each stays in the Form library. Add back puts the same line back; Undo above reverses the last change.</p>
    </Notice></div>
  );
}

/** The row's ⋯ menu: Redo with AI (find, read, match for this form), Replace edition, Copy to other combinations… and
 *  Remove from other combinations… (X2b, C1.5), Remove from this combination. */
function LineMenu({ id, l, onRedo, onRemove, onBulk }: { id: string; l: WorkspaceFormLine; onRedo: () => void; onRemove: () => void; onBulk: (op: "add" | "remove") => void }) {
  const toast = useToast();
  const item = "flex cursor-pointer select-none items-center gap-2 rounded px-2 py-1.5 outline-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[highlighted]:bg-surface";
  const replace = async () => {
    try { const r = await api<{ outcome: string; message: string }>(`/combinations/${id}/forms/${encodeURIComponent(l.code)}/replace`, { method: "POST", json: { version: l.version } }); toast.push({ tone: r.outcome === "current" ? "ok" : "info", text: r.message }); }
    catch (e) { toast.push({ tone: "danger", text: (e as Error).message }); }
  };
  return (
    // Not modal (as RowMenu): a modal menu hides the page header from screen readers while it stays focusable (axe).
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild><Button size="sm" variant="ghost" aria-label={`Actions for ${l.code}`}><MoreHorizontal /></Button></DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={4} className="z-50 min-w-[280px] rounded-lg border border-border bg-surface-raised p-1 text-sm shadow-lg">
          <DropdownMenu.Item className={item} disabled={l.document} onSelect={onRedo}><RefreshCw className="size-4" /> Redo with AI (find, read, match)</DropdownMenu.Item>
          <DropdownMenu.Item className={item} disabled={l.document} onSelect={() => void replace()}>Replace edition… (checks canada.ca)</DropdownMenu.Item>
          <DropdownMenu.Item className={item} onSelect={() => onBulk("add")} data-bulk-menu="add"><Copy className="size-4" /> Copy to other combinations…</DropdownMenu.Item>
          <DropdownMenu.Item className={item} onSelect={() => onBulk("remove")} data-bulk-menu="remove">Remove from other combinations…</DropdownMenu.Item>
          <DropdownMenu.Item className={`${item} text-text-danger`} onSelect={onRemove}><Trash2 className="size-4" /> Remove from this combination</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/** Remove from this combination, asked first and naming the form (P-116); the forms lane's DELETE with the line's version. */
async function removeLine(id: string, l: WorkspaceFormLine) {
  await api(`/combinations/${id}/forms/${encodeURIComponent(l.code)}`, { method: "DELETE", json: { version: l.version } });
}
const REMOVE_ASK = (l: WorkspaceFormLine) => <>Remove <b>{l.code}</b> ({l.title}) from this combination? It stays in the Form library, and you can undo it until the draft is released.</>;

function RemoveDialog({ id, l, onClose, onRemoved }: { id: string; l: WorkspaceFormLine; onClose: () => void; onRemoved: (code: string) => void }) {
  const qc = useQueryClient(), toast = useToast();
  const [busy, setBusy] = React.useState(false);
  const go = async () => {
    setBusy(true);
    try { await removeLine(id, l); for (const k of [...formsKeys(id), ["combination", id, "finder"]]) void qc.invalidateQueries({ queryKey: k }); onRemoved(l.code); onClose(); }
    catch (e) { toast.push({ tone: "danger", text: (e as Error).message }); if ((e as ApiError).status === 409) for (const k of formsKeys(id)) void qc.invalidateQueries({ queryKey: k }); } finally { setBusy(false); }
  };
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }} title={`Remove ${l.code} from this combination`}
      footer={<><Button variant="ghost" onClick={onClose} disabled={busy}>Keep it</Button><Button variant="destructive" onClick={() => void go()} busy={busy}><Trash2 /> Remove {l.code}</Button></>}>
      <p className="text-sm" data-confirm-remove>{REMOVE_ASK(l)}</p>
    </Dialog>
  );
}

/** A column heading with its tooltip (EXPERIENCE: a tooltip on every column that needs one). */
function Head({ tip, children }: { tip: string; children: React.ReactNode }) {
  return <Tip tip={tip} focusable><span className="cursor-help underline decoration-dotted decoration-text-muted underline-offset-4">{children}</span></Tip>;
}

function OnlyIfCell({ l }: { l: WorkspaceFormLine }) {
  if (l.onlyIf.kind === "always") return <Pill tone="ok">Always</Pill>;
  if (l.onlyIf.kind === "words_only") return <span data-no-rule><Pill tone="warn">No rule yet</Pill><br /><span className="text-text-muted">{l.onlyIf.words || "Only if (no words)"}</span></span>;
  return <span>{l.onlyIf.words || "Conditional (a rule)"}</span>;
}

/** The line drawer: who, minimum age, only if (rule builder and words), filed as within what IRCC accepts, signed by. */
function LineDrawer({ id, l, d, onClose, onRemoved }: { id: string; l: WorkspaceFormLine; d: Combo; onClose: () => void; onRemoved: (code: string) => void }) {
  const qc = useQueryClient(); const toast = useToast();
  const fields = useLibraryFields();
  const [who, setWho] = React.useState(l.who);
  const [minAge, setMinAge] = React.useState(l.minAge ? String(l.minAge) : "");
  // Devin on #627: the hint follows the saved age's own source state (missing or changed: it needs one; answered: it has one).
  const age = useItemNumbers(id, "threshold", `form:${l.code}`, "min_age");
  // CI on #627: while the list refreshes after a save, its old entry (the 18) is never read as the 19's answer: the hint
  // claims "recorded" only from a settled list whose number is the age saved on this line.
  const ageAnswered = age.settled && age.nums.length > 0 && age.nums.every((n) => n.passes && n.value === String(l.minAge));
  const [copies, setCopies] = React.useState(String(l.copies ?? 1));
  const [mode, setMode] = React.useState<"always" | "only_if">(l.onlyIf.kind === "always" ? "always" : "only_if");
  const [cond, setCond] = React.useState<any>(l.condition);
  const [words, setWords] = React.useState(l.onlyIf.kind === "always" ? "" : l.onlyIf.words);
  const [channel, setChannel] = React.useState<Channel>(l.channel as Channel);
  const [signature, setSignature] = React.useState<Signature>(l.signatureKind as Signature);
  // C-2: a channel change keeps a signature that still fits, else takes the channel's first (its default).
  const pickChannel = (c: Channel) => { setChannel(c); if (!SIGNATURE_FITS[c].includes(signature)) setSignature(SIGNATURE_FITS[c][0]); };
  const [signedBy, setSignedBy] = React.useState(l.signedBy ?? "");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  // Review m1 on #627: a saved From age is a published number, so its source state is refreshed with the line.
  const refresh = () => { for (const k of [["combination", id], ["combination-summary", id], ["config", id], ["sources", id], ["catalogue"], ["draft"]]) void qc.invalidateQueries({ queryKey: k }); };
  const save = async () => {
    setBusy(true); setErrors({});
    try {
      const age = minAge.trim() === "" ? null : Number(minAge);
      // C1.8: an emptied Copies field means the default single copy. Anything else is sent as typed only when it is plain
      // digits (break m1, m2: nothing is stripped silently); the API refuses what is outside 1 to 9, on the field.
      const typed = copies.trim();
      if (typed !== "" && !/^[0-9]+$/.test(typed)) { setErrors({ copies: COPIES_WORDS }); setBusy(false); return; }
      const copiesN = typed === "" ? 1 : Number(typed);
      await api(`/combinations/${id}/forms/${encodeURIComponent(l.code)}`, { method: "PATCH", json: {
        who, minAge: age, copies: copiesN, signedBy: signedBy || null, baseRevision: l.revision || undefined,
        attachMode: mode === "always" ? "COMBINATION_MANDATORY" : "ANSWER_CONDITIONAL",
        ...(mode === "only_if" ? (cond ? { condition: cond, conditionPlain: words } : { conditionPlain: words }) : {}),
      } });
      if (channel !== l.channel || signature !== l.signatureKind) await api(`/combinations/${id}/forms/${encodeURIComponent(l.code)}/channel`, { method: "PATCH", json: { channel, signature, from: l.channel, fromSignature: l.signatureKind } });
      toast.push({ tone: "ok", text: `${l.code} saved to the draft` }); refresh(); onClose();
    } catch (e) {
      const err = e as ApiError;
      const fe: Record<string, string> = {};
      for (const x of err.problem?.errors ?? []) fe[x.field] = x.message;
      if (Object.keys(fe).length) setErrors(fe); else toast.push({ tone: "danger", text: err.message });
      if (err.status === 409) refresh();
    } finally { setBusy(false); }
  };
  // P-116 (drift check 8): removing asks first, naming the form; Undo stays on the Forms tab while the draft is open.
  const [confirming, setConfirming] = React.useState(false);
  const remove = async () => {
    setBusy(true);
    try { await removeLine(id, l); refresh(); onRemoved(l.code); onClose(); }
    catch (e) { toast.push({ tone: "danger", text: (e as Error).message }); setConfirming(false); } finally { setBusy(false); }
  };
  const footer = confirming
    ? <div className="flex w-full flex-wrap items-center justify-between gap-2" role="alert" data-confirm-remove><span className="text-sm">{REMOVE_ASK(l)}</span><span className="flex gap-2"><Button variant="ghost" onClick={() => setConfirming(false)} disabled={busy}>Keep it</Button><Button variant="destructive" onClick={() => void remove()} busy={busy}><Trash2 /> Remove {l.code}</Button></span></div>
    : <><Button variant="ghost" className="text-text-danger" onClick={() => setConfirming(true)} disabled={busy}><Trash2 /> Remove from this combination</Button><span className="flex gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => void save()} busy={busy}>Save to draft</Button></span></>;
  return (
    <Panel open onOpenChange={(o) => !o && onClose()} title={`${l.code} · ${l.title}`} description={l.edition ? `Edition ${l.edition} · ${l.boxes} form fields matched` : "No edition read yet"}
      badge={l.origin === "AI_PROPOSAL" ? <Pill tone="ai">Picked by AI · Sample</Pill> : null}
      footer={footer}>
      <div className="space-y-5">
        {l.quote ? <p className="rounded-lg bg-surface px-3 py-2 text-xs text-text-muted">IRCC's words: "{l.quote}"</p> : null}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Who fills it" hint="Each person it names fills their own." error={errors.who}><Select value={who} onChange={(e) => setWho(e.target.value)}>{FORM_WHO.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</Select></Field>
          <div className="flex flex-col gap-1.5">
            {/* G1 PR 2c (concept §4, m3): a saved "From age" is a published number; it needs a source before release. */}
            <Field label="From age (optional)" hint={!l.minAge ? "Leave empty for any age." : ageAnswered ? "Its source is recorded: see Source below." : "Needs a source before release."} error={errors.minAge}><Input inputMode="numeric" value={minAge} onChange={(e) => setMinAge(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))} placeholder="Any age" /></Field>
            {l.minAge ? <ItemSources id={id} kind="threshold" suffix={`form:${l.code}`} address="min_age" variant="link" /> : null}
          </div>
          {!l.document ? <Field label="Copies" hint="Copies of this form for each person it names, 1 to 9. Sample." error={errors.copies}><Input inputMode="numeric" value={copies} onChange={(e) => { setCopies(e.target.value.slice(0, 3)); setErrors(({ copies: _c, ...rest }) => rest); }} placeholder="1" /></Field> : null}
        </div>
        <fieldset className="space-y-3">
          <legend className="text-xs font-medium">Only if</legend>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="radio" name="onlyif" checked={mode === "always"} onChange={() => setMode("always")} aria-label="Always" /> Always</label>
            <label className="flex items-center gap-2"><input type="radio" name="onlyif" checked={mode === "only_if"} onChange={() => setMode("only_if")} aria-label="Only if" /> Only if…</label>
          </div>
          {mode === "only_if" ? <>
            <Field label="In plain words" hint="Shown to staff and clients as the reason." error={errors.conditionPlain}><Input value={words} onChange={(e) => setWords(e.target.value)} placeholder="Is in a common-law union" /></Field>
            <div className="rounded-lg border border-border p-3">
              <p className="mb-2 text-xs text-text-muted">{cond ? "The rule a case checks:" : "No rule yet: a case cannot tell whom this form applies to, and release waits for a rule. Build it here."}</p>
              <ConditionBuilder value={cond} onChange={setCond} fields={fields.list} />
            </div>
          </> : null}
        </fieldset>
        {!l.document ? <div className="grid grid-cols-2 gap-3">
          <Field label="Filed as by default" hint={channel === "ONLINE" ? ONLINE_WORDS : l.channelOptions.find((o) => o.channel === channel && !o.ok)?.why ?? l.acceptedBasis}><Select value={channel} onChange={(e) => pickChannel(e.target.value as Channel)}>{CHANNELS.map((c) => { const o = l.channelOptions.find((x) => x.channel === c); return <option key={c} value={c} disabled={!!o && !o.ok && c !== l.channel} title={o?.why ?? undefined}>{CHANNEL_WORDS[c]}{o && !o.ok ? " (IRCC does not accept it)" : ""}</option>; })}</Select></Field>
          <Field label="Signature" hint="Only signatures that fit the way it is filed. Sample until the immigration expert confirms."><Select value={signature} onChange={(e) => setSignature(e.target.value as Signature)}>{SIGNATURE_FITS[channel].map((x) => <option key={x} value={x}>{SIGNATURE_WORDS[x]}</option>)}</Select></Field>
          <Field label="Signed by" hint="Sample until the immigration expert confirms." error={errors.signedBy}><Select value={signedBy} onChange={(e) => setSignedBy(e.target.value)}><option value="">Not set</option>{SIGNED_BY.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}</Select></Field>
        </div> : null}
        {/* Break m9: each way IRCC does not accept says why in visible text, not only in a disabled option's tooltip. */}
        {!l.document && l.channelOptions.some((o) => !o.ok) ? <ul className="space-y-0.5 text-xs text-text-muted" data-refused-ways>{l.channelOptions.filter((o) => !o.ok).map((o) => <li key={o.channel}><b className="font-medium">{o.words}</b> is not offered: {o.why}</li>)}</ul> : null}
        {!l.document ? <section aria-labelledby="drawer-reading" className="space-y-2 border-t border-border pt-4"><h3 id="drawer-reading" className="text-xs font-medium">Reading and matching</h3><ReadingSteps d={d} a={attachmentFor(d, l.code)} /></section> : null}
      </div>
    </Panel>
  );
}

/** X1 (#206 finding 6): where the setup checklist's "Fix n form problems" lands (?focus=forms:problems). The filing
 *  problems of this answer, then any other error the checklist counts for step 3 (the draft's validator problems in
 *  Forms, engine/setup-checklist.ts WHERE_STEP: conditions, ages), never a recount by other words; a problem only of the
 *  released version says to release the corrected draft. */
function FormsProblems({ id, filing }: { id: string; filing: { level: "error" | "warning"; item: string; message: string }[] }) {
  const o = useApi<CombinationView>(["combination", id], `/combinations/${id}`);
  const sum = useApi<CombinationSummary>(["combination-summary", id], `/combinations/${id}/summary`);
  const shown = new Set(filing.map((x) => x.message));
  // V3 B1 review (minor): a form with no field map is its row's "No field map yet", never a second line here.
  const more = (o.data?.draft.problems ?? []).filter((p) => p.level === "error" && p.where === "Forms" && !shown.has(p.message) && !waitsForMap(p));
  const releasedAll = (sum.data?.setup?.steps ?? []).flatMap((st) => st.open).filter((i) => i.focus === "forms:problems" && i.fromRelease);
  // Devin on #622: a startable-check cause (e.g. a form with no fields mapped) says itself, never "this draft no longer has it".
  const startable = releasedAll.filter((i) => i.startable);
  const released = releasedAll.find((i) => !i.startable);
  if (!filing.length && !more.length && !released && !startable.length) return null;
  // Warnings alone are not something to fix: the block is the landing only when it holds what the checklist counts.
  const counted = filing.some((x) => x.level === "error") || more.length > 0 || !!released || startable.length > 0;
  return (
    <div className={cn("space-y-2", FOCUS_RING)} data-focus={counted ? "forms:problems" : undefined} data-forms-problems>
      {filing.length ? <ul className="space-y-1 text-sm" aria-label="Filing problems">{filing.map((x, i) => <li key={i} className="flex gap-2"><Pill tone={x.level === "error" ? "danger" : "warn"}>{x.level === "error" ? "Blocks release" : "Warning"}</Pill>{x.message}</li>)}</ul> : null}
      {more.length ? <ul className="space-y-1 text-sm" aria-label="Other form problems" data-forms-problems-more>{more.map((x, i) => <li key={i} className="flex gap-2"><Pill tone="danger">Blocks release</Pill>{x.message}</li>)}</ul> : null}
      {released && !filing.some((x) => x.level === "error") && !more.length ? <Notice tone="danger" title={`The released version has ${released.count} form problem${released.count === 1 ? "" : "s"}: firms cannot open cases`}>
        <p className="mt-1">This draft no longer has {released.count === 1 ? "it" : "them"}. Send the draft for review and release it to put it right. <Link className="font-medium text-text-link underline" to={`/c/${id}/review`}>Review and release</Link></p>
      </Notice> : null}
      {startable.length ? <div data-startable><StartableNotice id={id} items={startable} /></div> : null}
    </div>
  );
}

/** X1 (#206 finding 6): where the setup checklist's "Review new edition" lands (?focus=forms:held). The same held new
 *  editions the checklist counts (the row's `held`, P-32): never used until a person reviews their impact on To review. */
function HeldEditions({ id }: { id: string }) {
  const sum = useApi<CombinationSummary>(["combination-summary", id], `/combinations/${id}/summary`);
  const held = sum.data?.row?.held ?? [];
  if (!held.length) return null;
  return (
    <div className={FOCUS_RING} data-focus="forms:held" data-held-editions>
      <Notice tone="warn" title={held.length === 1 ? `A new edition is waiting for its impact review: ${held[0].edition}` : `${held.length} new editions are waiting for their impact review`}>
        {held.length > 1 ? <p className="mt-1">{held.map((h) => h.edition).join(", ")}.</p> : null}
        <p className="mt-1">This combination keeps using the edition in the library until a person reviews what changed. <Link className="font-medium text-text-link underline" to="/review">Review it on To review</Link></p>
      </Notice>
    </div>
  );
}

/** C11.9 (P-116 "reorder where order matters"): the order the forms are filed in, moved with Up and Down, saved to the
 *  draft (POST /combinations/:id/forms/reorder); the snapshot and every tab list them in this order. */
function FilingOrder({ id, codes }: { id: string; codes: string[] }) {
  const [open, setOpen] = React.useState(false);
  const [order, setOrder] = React.useState(codes);
  React.useEffect(() => { if (!open) setOrder(codes); }, [codes.join("|"), open]);
  const qc = useQueryClient();
  const save = useAction(() => api(`/combinations/${id}/forms/reorder`, { method: "POST", json: { forms: order } }), { success: "Filing order saved to the draft", onDone: () => { setOpen(false); for (const k of formsKeys(id)) void qc.invalidateQueries({ queryKey: k }); } });
  const move = (i: number, d: -1 | 1) => setOrder((o) => { const n = [...o]; [n[i], n[i + d]] = [n[i + d], n[i]]; return n; });
  if (!open) return <p className="text-sm"><button type="button" className="text-text-link underline underline-offset-2" onClick={() => setOpen(true)} data-filing-order-open>Change the filing order</button></p>;
  return (
    <section aria-label="Filing order" className="space-y-2 rounded-lg border border-border p-3" data-filing-order>
      <p className="text-sm font-medium">Filing order <span className="font-normal text-text-muted">: the order the forms are filed in, top first</span></p>
      <ol className="space-y-1 text-sm">{order.map((c, i) => <li key={c} className="flex items-center gap-2" data-order-row={c}><span className="w-6 text-text-muted">{i + 1}.</span><span className="min-w-24 font-medium">{c}</span>
        <Button variant="ghost" size="sm" disabled={i === 0} aria-label={`Move ${c} up`} onClick={() => move(i, -1)}><ArrowUp /></Button>
        <Button variant="ghost" size="sm" disabled={i === order.length - 1} aria-label={`Move ${c} down`} onClick={() => move(i, 1)}><ArrowDown /></Button></li>)}</ol>
      <div className="flex gap-2"><Button size="sm" busy={save.isPending} disabled={order.join("|") === codes.join("|")} onClick={() => save.mutate(undefined)} data-filing-order-save>Save to draft</Button><Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button></div>
    </section>
  );
}
