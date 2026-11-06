// The shared lifecycle components (P-116 amended 28 Oct; board screens/W1-lifecycle-pattern/design/draft-lifecycle.html):
// RowAction (Edit and one written action from the state), BlockedLine (why a greyed action cannot be taken, as visible
// text), WherePanel (what stops it, what is kept, what waits), ImpactPanel (the confirm, in the right panel) and the
// Undo toast. Every word comes from contracts/lifecycle.ts; the decision comes from the one guard (api/src/lifecycle.ts).
import * as React from "react";
import { Link } from "react-router-dom";
import { Archive, Check, Eye, Pencil, RotateCcw, Trash2, Undo2, X } from "lucide-react";
import type { UsesView } from "../../../../contracts/structure";
import { ACTION_LABEL, SAY, type LifecycleWord } from "../../../../contracts/lifecycle";
import { Button, Textarea } from "@/components/ui/controls";
import { Skeleton } from "@/components/ui/skeleton";
import { Tip } from "@/components/status";
import { cn } from "@/lib/utils";

const ICON: Record<LifecycleWord, React.ReactNode> = {
  DELETE: <Trash2 className="size-3.5" aria-hidden />, RETIRE: <Archive className="size-3.5" aria-hidden />,
  RESTORE: <RotateCcw className="size-3.5" aria-hidden />, WITHDRAW: <Undo2 className="size-3.5" aria-hidden />,
};

/** Edit and the row's one written action. A greyed action keeps its place, is described by its BlockedLine
 *  (aria-describedby) and opens nothing. */
export function RowAction({ kind, why, tip, canEdit, name, tabIndex, reasonId, onEdit, onAction, editTip }: {
  kind: LifecycleWord; why: string | null; tip: string; canEdit: boolean; name: string; tabIndex?: number; reasonId?: string;
  onEdit: () => void; onAction: () => void; editTip: string;
}) {
  return (
    <div className="flex items-center justify-end gap-0.5" data-row-action>
      <Tip tip={editTip}>
        <button type="button" tabIndex={tabIndex} onClick={onEdit} data-edit className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-text-muted outline-none hover:bg-text/5 hover:text-text-link focus-visible:ring-[3px] focus-visible:ring-ring/50">{canEdit ? <Pencil className="size-3.5" aria-hidden /> : <Eye className="size-3.5" aria-hidden />}{canEdit ? "Edit" : "View"}<span className="sr-only"> {name}</span></button>
      </Tip>
      <Tip tip={why ?? tip}>
        <button type="button" tabIndex={tabIndex} aria-disabled={why ? true : undefined} aria-describedby={why ? reasonId : undefined} onClick={() => { if (!why) onAction(); }} data-action={kind}
          className={cn("inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50", why ? "cursor-not-allowed text-text-muted/60" : kind === "WITHDRAW" ? "text-text-warn hover:bg-text/5" : "text-text-muted hover:bg-text/5 hover:text-text-link")}>{ICON[kind]}{ACTION_LABEL[kind]}<span className="sr-only"> {name}</span></button>
      </Tip>
    </div>
  );
}

/** Why the action is greyed, as visible text (never a tooltip only), with the way to see each use. */
export function BlockedLine({ id, text, onWhere, className }: { id: string; text: string; onWhere?: () => void; className?: string }) {
  return (
    <p id={id} className={cn("text-xs text-text-muted", className)} data-blocked-line>
      {text}{onWhere ? <> <button type="button" tabIndex={-1} onClick={onWhere} className="font-medium text-text-link underline underline-offset-2">See where used</button></> : null}
    </p>
  );
}

/** Where used (P-116 "where used first"): what stops the action, what is kept and does not stop it, what waits. Each
 *  use links where it can; the counts say what they count. While unknown, the actions stay greyed. */
export function WherePanel({ uses, loading, error, onRetry }: { uses?: UsesView; loading?: boolean; error?: string | null; onRetry?: () => void }) {
  const stops = uses?.uses.filter((x) => x.blocks && x.kind !== "draft_change") ?? [];
  const kept = uses?.uses.filter((x) => !x.blocks && x.kind !== "draft_change") ?? [];
  const waiting = uses?.uses.filter((x) => x.kind === "draft_change") ?? [];
  const Line = ({ x, ok }: { x: UsesView["uses"][number]; ok: boolean }) => (
    <li className="flex flex-wrap items-baseline gap-x-2">
      {ok ? <Check className="size-3.5 shrink-0 self-center text-text-ok" aria-hidden /> : <X className="size-3.5 shrink-0 self-center text-text-danger" aria-hidden />}
      <span className="min-w-0 [overflow-wrap:anywhere]">{x.href ? <Link to={x.href} className="text-text-link underline underline-offset-2">{x.label}</Link> : x.label}</span>
      <span className="text-xs text-text-muted">{x.why}</span>
    </li>
  );
  return (
    <section aria-label="Where used" className="space-y-2 rounded-lg border border-border p-3" data-where-panel>
      <h3 className="text-sm font-semibold">Where used</h3>
      {loading ? <><span className="sr-only" role="status">Finding every use</span><Skeleton className="h-10" /></>
        : error ? <p className="text-sm text-text-danger" role="alert">Couldn't load where it is used. Actions stay greyed until we know. {onRetry ? <button type="button" onClick={onRetry} className="font-medium text-text-link underline">Retry</button> : null}</p>
        : !stops.length && !kept.length && !waiting.length ? <p className="text-sm text-text-muted" data-used-nowhere>Used nowhere: nothing in a setup, release or case reads it.</p>
        : <>
          {stops.length ? <div><p className="text-xs font-semibold text-text-danger">Stops it ({stops.length})</p><ul className="mt-1 space-y-1 text-sm" data-stops>{stops.map((x, i) => <Line key={i} x={x} ok={false} />)}</ul></div> : null}
          {kept.length ? <div><p className="text-xs font-semibold text-text-ok">Kept, does not stop it ({kept.length})</p><ul className="mt-1 space-y-1 text-sm" data-kept>{kept.map((x, i) => <Line key={i} x={x} ok />)}</ul></div> : null}
          {waiting.length ? <div><p className="text-xs font-semibold text-text-warn">Waiting ({waiting.length})</p><ul className="mt-1 space-y-1 text-sm">{waiting.map((x, i) => <li key={i}>{x.href ? <Link to={x.href} className="text-text-link underline underline-offset-2">{x.label}</Link> : x.label} <span className="text-xs text-text-muted">{x.why}</span></li>)}</ul></div> : null}
        </>}
    </section>
  );
}

/** The confirm, in the right panel (it may collect a reason, so never a centred modal): what goes or what is kept,
 *  who approves and when it takes effect, then the one button. An author's own draft deletes at once (no reason). */
export function ImpactPanel({ kind, name, goes, kept, withCombination, immediate, again, busy, error, onCancel, onSend, takesEffect, body }: {
  /** C11.9: a body that replaces the standard one (a library item restores at approval, not at the next release; B83: a withdrawal names what still reads the field). */ body?: string;
  kind: LifecycleWord; name: string; goes?: { num?: string | null; label: string }[]; kept?: string[]; withCombination?: boolean; immediate?: boolean; busy?: boolean; error?: string | null;
  /** Send again (QA-59): a returned change goes back to a second person with what changed. */
  again?: boolean;
  /** When it takes effect, if not the kind's usual (QA-64: a library retire or restore takes effect at approval, P-116 amended). */
  takesEffect?: string;
  onCancel: () => void; onSend: (reason: string) => void;
}) {
  const [reason, setReason] = React.useState("");
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const first = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => { (immediate ? first.current : ref.current)?.focus(); }, [immediate]);
  const word = kind === "DELETE" ? "Delete" : kind === "WITHDRAW" ? "Withdraw" : ACTION_LABEL[kind];
  const needsReason = !immediate;
  const title = again && kind !== "WITHDRAW" ? SAY.sendAgainTitle(kind, name) : SAY.confirmTitle(kind, name, goes?.length ?? 0);
  return (
    <aside aria-label={title} className="fixed bottom-4 right-0 top-14 z-40 flex w-full max-w-[440px] flex-col border-l border-border bg-surface-raised shadow-xl xl:sticky xl:top-20 xl:z-auto xl:max-h-[calc(100vh-6rem)] xl:max-w-none xl:rounded-xl xl:border xl:shadow-sm" data-impact-panel={kind}>
      <div className="border-b border-border px-5 py-3"><h2 className="break-words text-lg font-semibold">{title}</h2></div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4 text-sm">
        {again ? <p data-send-again-body>{SAY.sendAgainBody}</p> : null}
        {kind === "DELETE" ? (goes?.length ? <><p>{SAY.deleteGoesWith}</p><ul className="ml-5 list-disc" data-goes-with>{goes.map((g, i) => <li key={i}>{g.num ? `${g.num} ` : ""}{g.label}</li>)}</ul></> : <p>{SAY.deleteNothingUses}</p>)
          : kind === "RETIRE" ? <p>{SAY.retireBody}</p> : kind === "RESTORE" ? <p>{body ?? SAY.restoreBody}</p> : <p>{body ?? SAY.withdrawBody}</p>}
        {kept?.length ? <div><p className="text-xs font-semibold text-text-ok">Kept</p><ul className="ml-5 list-disc" data-kept>{kept.map((k, i) => <li key={i}>{k}</li>)}</ul></div> : null}
        {withCombination && (kind === "RETIRE" || kind === "RESTORE") ? <p data-with-combination>{SAY.withCombination(kind)}</p> : null}
        {immediate ? <p className="rounded-lg bg-surface p-3" data-own-draft>{SAY.ownDraft}</p> : kind !== "WITHDRAW" ? (
          <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-1 rounded-lg bg-surface p-3 text-sm"><dt className="text-text-muted">Approves</dt><dd>{SAY.approves}</dd><dt className="text-text-muted">Takes effect</dt><dd>{takesEffect ?? SAY.takesEffect(kind)}</dd></dl>
        ) : null}
        {needsReason ? <>
          <label htmlFor="lifecycle-reason" className="block text-xs font-medium">{kind === "WITHDRAW" ? "Why withdraw it?" : again ? "What changed?" : `Why ${word.toLowerCase()} it?`} <span className="font-normal text-text-muted">Required, for the second person</span></label>
          <Textarea ref={ref} id="lifecycle-reason" value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-16" />
        </> : null}
        {error ? <p role="alert" className="text-text-danger">{error}</p> : null}
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button ref={first} variant={kind === "DELETE" ? "destructive" : "default"} disabled={needsReason && reason.trim().length < 3} busy={busy} onClick={() => onSend(reason.trim())} data-confirm-send>{immediate ? "Delete" : kind === "WITHDRAW" ? "Withdraw" : again ? "Send again" : "Send for approval"}</Button>
      </div>
    </aside>
  );
}

/** The Undo toast: one at a time, 10 s, never the only copy (the row shows the new state too). The Undo outlives the
 *  toast (QA-58, WCAG 2.2.1): `link` puts it on the page note until it is used or `clear` drops it (another action). */
export function useUndoToast() {
  const [t, setT] = React.useState<{ id: number; text: string; undo?: () => Promise<void> } | null>(null);
  const [shown, setShown] = React.useState(false);
  React.useEffect(() => { if (!t || !shown) return; const h = setTimeout(() => setShown(false), 10_000); return () => clearTimeout(h); }, [t, shown]);
  const show = (text: string, undo?: () => Promise<void>) => { setT({ id: Date.now(), text, undo }); setShown(true); };
  const clear = () => { setT(null); setShown(false); };
  const [busy, setBusy] = React.useState(false);
  const run = async () => { if (!t?.undo || busy) return; setBusy(true); try { await t.undo(); } finally { setBusy(false); clear(); } };
  const node = t && shown ? (
    <div role="status" className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg bg-text px-4 py-2.5 text-sm text-surface shadow-lg" data-undo-toast>
      <span>{t.text}</span>
      {t.undo ? <button type="button" disabled={busy} onClick={() => void run()} className="rounded font-semibold underline underline-offset-2 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50" data-undo>Undo</button> : null}
      <button type="button" aria-label="Close" onClick={() => setShown(false)} className="rounded p-0.5 opacity-80 hover:opacity-100"><X className="size-4" /></button>
    </div>
  ) : null;
  const link = t?.undo ? (
    <button type="button" disabled={busy} onClick={() => void run()} className="ml-2 rounded font-semibold text-text-link underline underline-offset-2 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50" data-note-undo>Undo</button>
  ) : null;
  return { show, clear, node, link };
}
