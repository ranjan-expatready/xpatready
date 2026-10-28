// S5 Forms tab (W1-08, walkthrough v2 S5), slice 1: the combination's form lines with who fills each, from what age,
// only if (a rule, or words with no rule yet: M1), how it is filed by default within what IRCC accepts, and who signs.
// A row opens a 560 px drawer to change them. "Add a form from the library" picks only forms the library holds (P-118 Q2:
// forms enter only through the Form library). Each form is listed once (early-look fix 1): its reading and matching
// status and next step are in its row, its steps in its drawer; checklists, guides and pages that are not lines are one
// "Sources" line. Slice 3: the forms come from the form finder (finder.tsx, the forms lane's endpoints); each row's ⋯
// menu has Redo with AI, Replace edition and Remove from this combination; the page has one Undo (the forms lane's
// POST …/forms/undo, P-116 amended) and the shared Undo toast after a removal; guides are sources (api/src/guide-sources.ts).
import * as React from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { MoreHorizontal, Pencil, Plus, RefreshCw, Trash2, Undo2 } from "lucide-react";
import { CHANNEL_WORDS, type Channel } from "../../../../contracts/forms";
import { changeWords, SIGNED_BY, type LastFormChange, type RemovedForm, type WorkspaceFormLine } from "../../../../contracts/workspace";
import { api, ApiError, useAction, useSessionView, useToast } from "@/lib/api";
import { useUndoToast } from "@/components/lifecycle";
import { FindDialog, FinderPanel, formsKeys, useFinderLatest } from "./finder";
import { Button, Dialog, Field, Input, Notice, Panel, Pill, Select, Table } from "@/components/ui/controls";
import { Spinner } from "@/components/ui/spinner";
import { ConditionBuilder } from "@/components/conditions";
import { fmtWhen, Tip } from "@/components/status";
import { useLibraryFields, WHO, whoLabel } from "@/pages/configuration";
import { attachmentFor, pendingForms, ReadingCell, ReadingSteps, SourcesLine, StepNotices } from "@/pages/sources";
import { FormPicker } from "@/components/forms";
import { useApi } from "@/lib/api";
import { ChannelCell } from "@/components/channels";
import type { CombinationSummary, CombinationView } from "../../../../contracts/programs";
/** The fields of a summary line that ChannelCell reads. */
type ChannelLine = CombinationSummary["forms"][number];
type Combo = Parameters<typeof SourcesLine>[0]["d"];

/** m3 (P-113): Online is a real way for portal-only forms; the product fills it in a later wave. */
const ONLINE_WORDS = "Online: the case officer types it into the portal from the answer sheet (P-113); the browser extension fills it in a later wave.";
const TIPS = {
  who: "Whose form it is: one copy for each person it names. A minimum age leaves out anyone younger.",
  onlyIf: "When the form is needed. A rule is checked on every case; words alone cannot be checked, so a case cannot tell until a rule is built.",
  filed: "How new cases file this form unless the case officer changes it. Only ways IRCC accepts are offered (Form library; Sample until the immigration expert confirms).",
  signed: "Who signs the form. Sample until the immigration expert confirms.",
  library: "The edition this combination uses, how many of its form fields are matched to shared fields, and the step the form waits for (read it, draft with AI, review AI's proposals).",
};

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;

export function FormsTab({ id, lines, filing, filingDetail, problems, removed = [], fromLibrary = [], lastChange = null }: { id: string; lines: WorkspaceFormLine[]; filing: string; filingDetail: string; problems: { level: "error" | "warning"; item: string; message: string }[]; removed?: RemovedForm[]; fromLibrary?: string[]; lastChange?: LastFormChange | null }) {
  const { canAuthor, known } = useSessionView();
  const [open, setOpen] = React.useState<WorkspaceFormLine | null>(null);
  const [adding, setAdding] = React.useState(false);
  const [finding, setFinding] = React.useState<string[] | null>(null);
  const [removing, setRemoving] = React.useState<WorkspaceFormLine | null>(null);
  const d = useApi<CombinationView>(["combination", id], `/combinations/${id}`);
  const latest = useFinderLatest(id);
  const toast = useUndoToast();
  const qc = useQueryClient();
  const undoLast = async (changeId?: string) => { await api(`/combinations/${id}/forms/undo`, { method: "POST", json: changeId ? { changeId } : {} }); for (const k of [...formsKeys(id), ["combination", id, "finder"]]) void qc.invalidateQueries({ queryKey: k }); };
  const redo = (codes?: string[]) => setFinding(codes ?? []);
  const finder = <><FinderPanel id={id} latest={latest.data} onRedo={redo} removed={removed.map((r) => r.code)} />{finding ? <FindDialog id={id} only={finding.length ? finding : undefined} onClose={() => setFinding(null)} onStarted={(runId) => window.dispatchEvent(new CustomEvent("s5-find-started", { detail: runId }))} /> : null}</>;
  const onRemoved = (code: string) => toast.show(`${code} removed from this combination; it stays in the Form library`, () => undoLast());
  const noRule = lines.filter((l) => l.onlyIf.kind === "words_only");
  const add = canAuthor ? <Button size="sm" variant="secondary" onClick={() => setAdding(true)}><Plus /> Add a form from the library</Button> : null;
  const picker = adding ? <Panel open onOpenChange={(o) => !o && setAdding(false)} title="Add a form from the library" description="Only forms already in the Form library. A new form enters there first (upload, or the form finder)." footer={<><Button variant="ghost" onClick={() => setAdding(false)}>Close</Button><Link className="text-sm text-text-link underline" to="/library/forms">Open the Form library</Link></>}><FormPicker combinationId={id} have={lines.map((l) => l.code)} /></Panel> : null;
  const combo = d.data as unknown as Combo | undefined;
  const codes = lines.map((l) => l.code);
  // A form removed in this draft is under "Removed in this draft" (Undo), not a form waiting to be set up.
  const pending = combo ? pendingForms(combo, [...codes, ...removed.map((r) => r.code)]) : [];
  // Break m4 (Screen 01): an author never sees the channels as read-only words while the session loads.
  if (!known || !combo) return <Spinner label="Loading forms" />;
  const undo = canAuthor ? <>{lastChange ? <UndoBar change={lastChange} onUndo={undoLast} /> : null}{removed.length ? <RemovedNotice id={id} removed={removed} /> : null}</> : null;
  if (!lines.length && !pending.length) return (
    <div className="space-y-5">
      {undo}{finder}
      <div className="rounded-xl border border-border bg-surface-raised p-5" data-forms-empty>
        <div className="flex flex-wrap items-start justify-between gap-3"><h2 className="font-semibold">No forms yet</h2>{add}</div>
        <p className="mt-1 text-sm text-text-muted">Find them with AI above, or add one from the <Link className="text-text-link underline" to="/library/forms">Form library</Link>.</p>
      </div>
      <SourcesLine d={combo} lineCodes={codes} />{picker}{toast.node}
    </div>
  );
  // Drift check 5: forms attached but not set up are counted with the lines, so the header never says "No forms yet ·
  // 0 forms" above them; what each waits for is said in the same steps as the rows (and the page's next step).
  const inLibrary = (a: { id: string; status: string }) => a.status === "IN_LIBRARY" || fromLibrary.includes(a.id);
  const ready = pending.filter(inLibrary).length, toDraft = pending.length - ready;
  const count = pending.length ? `${plural(lines.length + pending.length, "form")} attached, ${lines.length} set up` : plural(lines.length, "form");
  return (
    <div className="space-y-4">
      {undo}{finder}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm" data-filing><span className="text-text-muted">Filing: </span>{lines.length ? <><b className="font-semibold" title={filingDetail !== filing ? filingDetail : undefined}>{filing}</b>{filingDetail !== filing ? <span className="sr-only"> ({filingDetail})</span> : null}</> : <b className="font-semibold">not known until a form is set up</b>} <span className="text-text-muted">· {count} · Sample until the immigration expert confirms</span></p>
        <span className="flex items-center gap-3">{add}<Link className="text-sm text-text-link underline" to="/library/forms">Open the Form library</Link></span>
      </div>
      {pending.length ? <p className="text-sm" data-pending-summary><span className="font-medium">Not set up yet: </span>{[ready ? `${plural(ready, "form")} can be added from the library now (${ready === 1 ? "its" : "their"} form fields are already matched, no AI needed)` : "", toDraft ? `${plural(toDraft, "form")} ${toDraft === 1 ? "needs" : "need"} reading and drafting with AI` : ""].filter(Boolean).join("; ")}. Each row has its step.</p> : null}
      <StepNotices d={combo} />
      {noRule.length ? <Notice tone="warn" title={`${noRule.length} condition${noRule.length === 1 ? " is" : "s are"} in words only`}>A case cannot tell whom {noRule.map((l) => l.code).join(", ")} {noRule.length === 1 ? "applies" : "apply"} to until the words are turned into a rule. Release waits for it. Open the form to build the rule.</Notice> : null}
      <Table head={["Form", "Why it is here (IRCC's words)", <Head key="w" tip={TIPS.who}>Who fills it</Head>, <Head key="o" tip={TIPS.onlyIf}>Only if</Head>, <Head key="f" tip={TIPS.filed}>Filed as by default</Head>, <Head key="s" tip={TIPS.signed}>Signed by</Head>, <Head key="l" tip={TIPS.library}>Read and matched</Head>, ""]}>
        {lines.map((l) => (
          <tr key={l.line} data-line={l.code}>
            <td><span className="mono font-medium">{l.code}</span><br /><span className="text-xs text-text-muted">{l.title}</span>{l.origin === "AI_FOUND" || l.origin === "AI_PROPOSAL" ? <><br /><Pill tone="ai">Picked by AI · Sample</Pill></> : null}</td>
            <td className="max-w-56 text-xs text-text-muted">{l.quote ? `"${l.quote.slice(0, 120)}${l.quote.length > 120 ? "…" : ""}"` : "Added by a person"}</td>
            <td className="text-sm">{l.document ? <span className="text-text-muted">Checklist · not filed</span> : <>{whoLabel(l.who)}{l.minAge ? <span className="text-text-muted"> · {l.minAge}+</span> : null}</>}</td>
            <td className="max-w-56 text-xs"><OnlyIfCell l={l} /></td>
            <td className="text-sm">{l.document ? <span className="text-text-muted">—</span> : <><ChannelCell id={id} line={{ code: l.code, channel: l.channel as Channel, channelWords: l.channelWords, signature: l.signature, document: l.document } as ChannelLine} canAuthor={canAuthor} />{l.channel === "ONLINE" ? <p className="text-xs text-text-muted" data-online-words>Answer sheet in portal order (P-113)</p> : null}</>}</td>
            <td className="text-xs">{l.document ? "—" : l.signedBy ? l.signedByLabel : <span className="text-text-muted">Not set</span>}</td>
            <td className="text-xs"><span className="block">{l.edition ?? <span className="text-text-muted">No edition read yet</span>}{l.document ? null : <span className="text-text-muted"> · {l.boxes} form fields matched</span>}</span>{l.document ? null : <ReadingCell d={combo} a={attachmentFor(combo, l.code)} />}</td>
            <td className="whitespace-nowrap">{canAuthor ? <><Button size="sm" variant="ghost" aria-label={`Change ${l.code}`} onClick={() => setOpen(l)}><Pencil /> Change</Button><LineMenu id={id} l={l} onRedo={() => redo([l.code])} onRemove={() => setRemoving(l)} /></> : null}</td>
          </tr>
        ))}
        {pending.map((a) => (
          <tr key={a.id} data-pending={a.edition ?? a.fileName}>
            <td><span className="mono font-medium">{(a.edition ?? a.fileName).split(" (")[0]}</span><br /><span className="text-xs text-text-muted">{a.edition} · {a.fileName}</span></td>
            <td colSpan={5} className="text-xs text-text-muted">Attached from the Form library: not set up as a line yet. It is read, then its form fields are matched to shared fields; it joins the lines when the matches are applied.</td>
            <td className="text-xs"><ReadingCell d={combo} a={a} inLibrary={inLibrary(a)} /></td>
            <td />
          </tr>
        ))}
      </Table>
      {problems.length ? <ul className="space-y-1 text-sm" aria-label="Filing problems">{problems.map((x, i) => <li key={i} className="flex gap-2"><Pill tone={x.level === "error" ? "danger" : "warn"}>{x.level === "error" ? "Blocks release" : "Warning"}</Pill>{x.message}</li>)}</ul> : null}
      <SourcesLine d={combo} lineCodes={codes} />
      {open ? <LineDrawer id={id} l={open} d={combo} onClose={() => setOpen(null)} onRemoved={onRemoved} /> : null}
      {removing ? <RemoveDialog id={id} l={removing} onClose={() => setRemoving(null)} onRemoved={onRemoved} /> : null}
      {picker}{toast.node}
    </div>
  );
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

/** The row's ⋯ menu: Redo with AI (find, read, match for this form), Replace edition, Remove from this combination. */
function LineMenu({ id, l, onRedo, onRemove }: { id: string; l: WorkspaceFormLine; onRedo: () => void; onRemove: () => void }) {
  const toast = useToast();
  const item = "flex cursor-pointer select-none items-center gap-2 rounded px-2 py-1.5 outline-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[highlighted]:bg-surface";
  const replace = async () => {
    try { const r = await api<{ outcome: string; message: string }>(`/combinations/${id}/forms/${encodeURIComponent(l.code)}/replace`, { method: "POST", json: { version: l.version } }); toast.push({ tone: r.outcome === "current" ? "ok" : "info", text: r.message }); }
    catch (e) { toast.push({ tone: "danger", text: (e as Error).message }); }
  };
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild><Button size="sm" variant="ghost" aria-label={`Actions for ${l.code}`}><MoreHorizontal /></Button></DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={4} className="z-50 min-w-[280px] rounded-lg border border-border bg-surface-raised p-1 text-sm shadow-lg">
          <DropdownMenu.Item className={item} disabled={l.document} onSelect={onRedo}><RefreshCw className="size-4" /> Redo with AI (find, read, match)</DropdownMenu.Item>
          <DropdownMenu.Item className={item} disabled={l.document} onSelect={() => void replace()}>Replace edition… (checks canada.ca)</DropdownMenu.Item>
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
  const [mode, setMode] = React.useState<"always" | "only_if">(l.onlyIf.kind === "always" ? "always" : "only_if");
  const [cond, setCond] = React.useState<any>(l.condition);
  const [words, setWords] = React.useState(l.onlyIf.kind === "always" ? "" : l.onlyIf.words);
  const [channel, setChannel] = React.useState<Channel>(l.channel as Channel);
  const [signedBy, setSignedBy] = React.useState(l.signedBy ?? "");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  const refresh = () => { for (const k of [["combination", id], ["combination-summary", id], ["config", id], ["catalogue"], ["draft"]]) void qc.invalidateQueries({ queryKey: k }); };
  const save = async () => {
    setBusy(true); setErrors({});
    try {
      const age = minAge.trim() === "" ? null : Number(minAge);
      await api(`/combinations/${id}/forms/${encodeURIComponent(l.code)}`, { method: "PATCH", json: {
        who, minAge: age, signedBy: signedBy || null, baseRevision: l.revision || undefined,
        attachMode: mode === "always" ? "COMBINATION_MANDATORY" : "ANSWER_CONDITIONAL",
        ...(mode === "only_if" ? (cond ? { condition: cond, conditionPlain: words } : { conditionPlain: words }) : {}),
      } });
      if (channel !== l.channel) await api(`/combinations/${id}/forms/${encodeURIComponent(l.code)}/channel`, { method: "PATCH", json: { channel, from: l.channel } });
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
          <Field label="Who fills it" hint="One copy for each person it names." error={errors.who}><Select value={who} onChange={(e) => setWho(e.target.value)}>{WHO.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</Select></Field>
          <Field label="From age (optional)" hint="Leave empty for any age. Sample." error={errors.minAge}><Input inputMode="numeric" value={minAge} onChange={(e) => setMinAge(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))} placeholder="Any age" /></Field>
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
          <Field label="Filed as by default" hint={channel === "ONLINE" ? ONLINE_WORDS : l.acceptedBasis}><Select value={channel} onChange={(e) => setChannel(e.target.value as Channel)}>{(["PDF_UPLOAD", "SIGNED_PDF_UPLOAD", "ONLINE"] as Channel[]).map((c) => <option key={c} value={c} disabled={!l.accepted.includes(c)}>{CHANNEL_WORDS[c]}{l.accepted.includes(c) ? "" : " (IRCC does not accept it)"}</option>)}</Select></Field>
          <Field label="Signed by" hint="Sample until the immigration expert confirms." error={errors.signedBy}><Select value={signedBy} onChange={(e) => setSignedBy(e.target.value)}><option value="">Not set</option>{SIGNED_BY.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}</Select></Field>
        </div> : null}
        {!l.document ? <section aria-labelledby="drawer-reading" className="space-y-2 border-t border-border pt-4"><h3 id="drawer-reading" className="text-xs font-medium">Reading and matching</h3><ReadingSteps d={d} a={attachmentFor(d, l.code)} /></section> : null}
      </div>
    </Panel>
  );
}
