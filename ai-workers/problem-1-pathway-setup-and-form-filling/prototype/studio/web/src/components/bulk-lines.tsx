// X2b slices (c) and (d) (C1.5, concept v3 §4, board design/draft-x2b-board.html): copy one form or document line to other
// combinations, or remove it from them, after a preview of what happens in each; copy lines here from another
// combination. Every change is a draft change in its own combination, and one Undo takes back the whole change. Used by
// the Forms and Documents tabs (an author only; the approver sees the copies as ordinary draft changes on Review and
// release). The API is api/src/lines-bulk.ts; the words are the shared contract's.
import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { COPY_FROM_INTRO, OUTCOME_WORDS, PREVIEW_INTRO, PREVIEW_REMOVE_INTRO, UNDO_REFUSED_TITLE, undoRefusedHint, type ApplyResult, type BulkCombination, type BulkOp, type CopyFromApplied, type CopyFromResult, type LineKind, type Outcome, type PreviewResult, type PreviewTarget, type UndoResult } from "../../../contracts/lines-bulk";
import { api, ApiError } from "@/lib/api";
import { Button, Dialog, Notice, Pill, Select } from "@/components/ui/controls";
import { Spinner } from "@/components/ui/spinner";

export type BulkLine = { kind: LineKind; key: string; short: string };
type Toast = { id: number; text: string; undo?: () => Promise<void> };
type Refused = { title: string; text: string; hint: string };

/** The order of the preview's rows: what changes first, then what waits, then what cannot, then no change. */
const RANK: Record<Outcome, number> = { WILL_ADD: 0, WILL_REMOVE: 0, WAITS: 1, CANNOT_CHANNEL: 2, CANNOT_PERSON: 2, CANNOT_FACT: 2, CANNOT_RETIRED: 2, CANNOT_NO_FILE: 2, CANNOT_WAITING_PERSON: 2, CANNOT_COMBINATION_RETIRED: 2, ALREADY_HAS: 3, HAS_OTHER_CONDITION: 3, DOES_NOT_HAVE: 3, REMOVED_IN_DRAFT: 3, SOURCE: 4 };
const toneOf = (o: Outcome) => (o === "WILL_ADD" || o === "WILL_REMOVE" ? "ok" : o === "WAITS" || o.startsWith("CANNOT") ? "warn" : "neutral");
const key = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);
const msg = (e: unknown) => (e as Error)?.message ?? "Something went wrong. Nothing was changed.";

/** The menu items, the "Copy a line from another combination" button, the dialogs, the toast with Undo and the refused
 *  Undo, for one combination's tab. `open(line, op)` opens the preview; `openFrom()` the copy from another combination. */
export function useBulkLines(combinationId: string) {
  const qc = useQueryClient();
  const [preview, setPreview] = React.useState<{ line: BulkLine; op: BulkOp } | null>(null);
  const [from, setFrom] = React.useState(false);
  // Review M1 (#281): the last change's Undo is kept on the tab after the toast hides (as useUndoToast, QA-58); the toast
  // waits while the pointer or focus is on it, and focus moves to its Undo after Add, or back to the opener on Cancel.
  const [toast, setToast] = React.useState<Toast | null>(null);
  const [shown, setShown] = React.useState(false);
  const [held, setHeld] = React.useState(false);
  const [refused, setRefused] = React.useState<Refused | null>(null);
  const [undoing, setUndoing] = React.useState(false);
  const opener = React.useRef<HTMLElement | null>(null);
  const undoBtn = React.useRef<HTMLButtonElement | null>(null);
  React.useEffect(() => { if (!toast || !shown || held) return; const h = setTimeout(() => setShown(false), 12_000); return () => clearTimeout(h); }, [toast, shown, held]);
  /** Focus goes to `el` for a few frames, until the closing dialog has handed focus back (WCAG 2.4.3). */
  // Only while focus is lost (on the page body): once the person moves focus on, it is never taken back.
  const focusSoon = (get: () => HTMLElement | null | undefined, tries = 20, force = false) => {
    const el = get();
    if (el?.isConnected && document.activeElement === el) return; // it holds: done
    const lost = !document.activeElement || document.activeElement === document.body || !!document.activeElement.closest("[data-bulk-dialog]");
    if (el?.isConnected && (lost || force)) el.focus();
    if (tries > 0) requestAnimationFrame(() => focusSoon(get, tries - 1, force));
  };
  const remember = () => { opener.current = (document.querySelector('[aria-haspopup="menu"][data-state="open"]') ?? document.activeElement) as HTMLElement | null; };
  const back = () => focusSoon(() => opener.current);
  // Every tab of every combination may show a changed line: everything is read again.
  const refresh = () => void qc.invalidateQueries();
  const say = (t: Toast) => { setToast(t); setShown(true); };
  const done = (text: string, undo: () => Promise<{ message: string }>, op: BulkOp, short: string) => {
    refresh();
    say({ id: Date.now(), text, undo: async () => {
      try { const r = await undo(); refresh(); say({ id: Date.now(), text: r.message }); back(); }
      catch (e) { setShown(false); setToast(null); setRefused({ title: UNDO_REFUSED_TITLE(op), text: msg(e), hint: undoRefusedHint(op, short) }); refresh(); }
    } });
    // After Add, focus goes to the toast's Undo (the dialog's own close would hand it back to the menu's button).
    focusSoon(() => undoBtn.current, 30, true);
  };
  const runUndo = async () => { if (!toast?.undo || undoing) return; setUndoing(true); try { await toast.undo(); } finally { setUndoing(false); } };
  const undoButton = (where: "toast" | "note") => toast?.undo ? (
    <button type="button" ref={where === "toast" ? undoBtn : undefined} disabled={undoing} onClick={() => void runUndo()}
      className={where === "toast" ? "rounded font-semibold underline underline-offset-2 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50" : "ml-2 rounded font-semibold text-text-link underline underline-offset-2 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"}
      data-bulk-undo={where === "toast" ? "" : undefined} data-bulk-note-undo={where === "note" ? "" : undefined}>{undoing ? "Undoing…" : "Undo"}</button>
  ) : null;
  const node = (
    <>
      {preview ? <PreviewDialog combinationId={combinationId} line={preview.line} op={preview.op} onClose={() => { setPreview(null); back(); }}
        onApplied={(r) => { setPreview(null); done(r.message, () => api<UndoResult>(`/lines/bulk/${r.batchId}/undo`, { method: "POST" }), preview.op, preview.line.short); }} /> : null}
      {from ? <CopyFromDialog combinationId={combinationId} onClose={() => { setFrom(false); back(); }}
        onApplied={(r, shorts) => { setFrom(false); done(r.message, () => api<UndoResult>("/lines/bulk/undo", { method: "POST", json: { batchIds: r.batchIds } }), "add", shorts); }} /> : null}
      {refused ? (
        <Dialog open onOpenChange={(o) => { if (!o) { setRefused(null); back(); } }} title={refused.title} footer={<Button onClick={() => { setRefused(null); back(); }}>Close</Button>}>
          <div role="alert" data-bulk-undo-refused><p className="text-sm text-text-danger">{refused.text}</p><p className="mt-2 text-sm text-text-muted">{refused.hint}</p></div>
        </Dialog>
      ) : null}
      {toast && shown ? (
        <div role="status" onMouseEnter={() => setHeld(true)} onMouseLeave={() => setHeld(false)} onFocus={() => setHeld(true)} onBlur={() => setHeld(false)}
          className="fixed bottom-4 left-1/2 z-50 flex w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-3 rounded-lg bg-text px-4 py-2.5 text-sm text-surface shadow-lg" data-bulk-toast>
          <span>{toast.text}</span>
          {undoButton("toast")}
          <button type="button" aria-label="Close" onClick={() => { setShown(false); setHeld(false); }} className="rounded p-0.5 opacity-80 hover:opacity-100"><X className="size-4" /></button>
        </div>
      ) : null}
    </>
  );
  /** The last copy or removal made here, with its Undo, once the toast has gone (review M1). */
  const note = toast?.undo && !shown ? <p className="text-xs text-text-muted" data-bulk-note>Last change across combinations: {toast.text}{undoButton("note")}</p> : null;
  return { open: (line: BulkLine, op: BulkOp) => { remember(); setPreview({ line, op }); }, openFrom: () => { remember(); setFrom(true); }, node, note };
}

/** Board "Copy to others: preview" and "Remove from others: preview": one row per other combination with its trail, a tick
 *  box (only "will change" and "waits" may be ticked; "waits" only on purpose) and the outcome with its reason. */
function PreviewDialog({ combinationId, line, op, onClose, onApplied }: { combinationId: string; line: BulkLine; op: BulkOp; onClose: () => void; onApplied: (r: ApplyResult) => void }) {
  const idem = React.useRef(key());
  const [pv, setPv] = React.useState<PreviewResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [ticked, setTicked] = React.useState<Set<string>>(new Set());
  const [busy, setBusy] = React.useState(false);
  const [round, setRound] = React.useState(0);
  React.useEffect(() => {
    let live = true;
    setPv(null); setError(null);
    (async () => {
      const all = await api<BulkCombination[]>(`/lines/bulk/combinations?from=${combinationId}`);
      if (!all.length) return { line: { kind: line.kind, key: line.key, words: line.short, from: "", version: "" }, op, targets: [], counts: { tickable: 0, waits: 0, cannot: 0, nothing: 0 } } as PreviewResult;
      // Break m6: the API takes at most 500 combinations per request; more are previewed in parts and put together.
      const parts: PreviewResult[] = [];
      for (let i = 0; i < all.length; i += 500) parts.push(await api<PreviewResult>("/lines/bulk/preview", { method: "POST", json: { line: { combinationId, kind: line.kind, key: line.key }, op, combinationIds: all.slice(i, i + 500).map((c) => c.id) } }));
      const sum = (k: keyof PreviewResult["counts"]) => parts.reduce((x, r) => x + r.counts[k], 0);
      return { ...parts[0], targets: parts.flatMap((r) => r.targets), counts: { tickable: sum("tickable"), waits: sum("waits"), cannot: sum("cannot"), nothing: sum("nothing") } };
    })().then((r) => { if (!live) return; setPv(r); setTicked(new Set(r.targets.filter((t) => t.outcome === "WILL_ADD" || t.outcome === "WILL_REMOVE").map((t) => t.combinationId))); })
      .catch((e) => { if (live) setError(msg(e)); });
    return () => { live = false; };
  }, [combinationId, line.kind, line.key, op, round]);
  const rows = pv ? [...pv.targets].sort((a, b) => RANK[a.outcome] - RANK[b.outcome] || a.trail.join(" › ").localeCompare(b.trail.join(" › "))) : [];
  const n = ticked.size;
  const verb = op === "add" ? "Add" : "Remove";
  const go = async () => {
    setBusy(true); setError(null);
    try {
      const include = [...ticked];
      const r = await api<ApplyResult>("/lines/bulk", { method: "POST", json: { line: { combinationId, kind: line.kind, key: line.key }, op, combinationIds: include, include, idempotencyKey: idem.current, sourceVersion: pv!.line.version } });
      onApplied(r);
    } catch (e) { setError(msg(e)); } finally { setBusy(false); }
  };
  const again = () => { idem.current = key(); setRound((x) => x + 1); };
  const toggle = (t: PreviewTarget) => setTicked((s) => { const x = new Set(s); if (x.has(t.combinationId)) x.delete(t.combinationId); else x.add(t.combinationId); return x; });
  const counts = pv ? [pv.counts.tickable ? `${pv.counts.tickable} will ${op === "add" ? "change" : "be removed"}` : "", pv.counts.waits ? `${pv.counts.waits} submitted for review` : "", pv.counts.cannot ? `${pv.counts.cannot} cannot` : "", pv.counts.nothing ? `${pv.counts.nothing} no change` : ""].filter(Boolean).join(" · ") : "";
  return (
    <Dialog open wide onOpenChange={(o) => { if (!o && !busy) onClose(); }} title={`${op === "add" ? "Copy" : "Remove"} ${line.short} ${op === "add" ? "to" : "from"} other combinations`}
      description={<span data-bulk-intro>{pv?.line.words ? <>Line: {pv.line.words.replace(/[.\s]+$/, "")}. </> : null}{op === "add" ? PREVIEW_INTRO : PREVIEW_REMOVE_INTRO}</span>}
      footer={<><Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button><Button variant={op === "remove" ? "destructive" : "default"} onClick={() => void go()} busy={busy} disabled={!pv || !n} data-bulk-apply>{verb} {op === "add" ? "to" : "from"} {n} combination{n === 1 ? "" : "s"}</Button></>}>
      <div className="space-y-3" data-bulk-preview={op} data-bulk-dialog>
        {error ? <Notice tone="danger" title="Nothing was changed" action={<Button size="sm" variant="ghost" onClick={again}>Preview again</Button>}><span data-bulk-error>{error}</span></Notice> : null}
        {!pv && !error ? <Spinner label="Working out what happens in each combination" /> : null}
        {pv && !pv.targets.length ? <p className="text-sm text-text-muted" data-bulk-none>There are no other combinations yet.</p> : null}
        {pv && pv.targets.length ? <>
          <p className="text-xs text-text-muted" data-bulk-counts>{counts}</p>
          <div className="overflow-x-auto rounded-lg border border-border" tabIndex={0} role="region" aria-label="What happens in each combination">
            <table className="w-full text-sm">
              <thead className="bg-surface text-left text-xs text-text-muted"><tr><th className="w-10 px-3 py-2"><span className="sr-only">Include</span></th><th className="px-3 py-2 font-medium">Combination</th><th className="px-3 py-2 font-medium">What happens</th></tr></thead>
              <tbody>
                {rows.map((t) => {
                  const last = t.trail.at(-1) ?? "";
                  return (
                    <tr key={t.combinationId} className="border-t border-border align-top" data-bulk-row={t.outcome} data-combination={t.combinationId}>
                      <td className="px-3 py-2"><input type="checkbox" className="size-4" checked={ticked.has(t.combinationId)} disabled={!t.tickable || busy} onChange={() => toggle(t)}
                        aria-label={t.tickable ? `Include ${t.trail.join(" › ")}${t.outcome === "WAITS" ? ", withdraws its review" : ""}` : `${last}: ${OUTCOME_WORDS[t.outcome].toLowerCase()}`} /></td>
                      <td className="px-3 py-2">{t.trail.join(" › ")}</td>
                      <td className={t.tickable ? "px-3 py-2" : "px-3 py-2 text-text-muted"}><Pill tone={toneOf(t.outcome)}>{OUTCOME_WORDS[t.outcome]}</Pill>{t.reason ? <span className="ml-1.5" data-bulk-reason>{t.reason}</span> : null}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </> : null}
      </div>
    </Dialog>
  );
}

/** Board "Copy a line from another": choose the combination to copy from; its form and document lines each say what happens
 *  here; the ticked ones are added in one go, and one Undo takes them all back. */
function CopyFromDialog({ combinationId, onClose, onApplied }: { combinationId: string; onClose: () => void; onApplied: (r: CopyFromApplied, shorts: string) => void }) {
  const idem = React.useRef(key());
  const [combos, setCombos] = React.useState<BulkCombination[] | null>(null);
  const [source, setSource] = React.useState("");
  const [pv, setPv] = React.useState<CopyFromResult | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [ticked, setTicked] = React.useState<Set<string>>(new Set());
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => { api<BulkCombination[]>(`/lines/bulk/combinations?from=${combinationId}`).then(setCombos).catch((e) => setError(msg(e))); }, [combinationId]);
  // Break M1 (#281): only the answer for the combination chosen last is shown (arrow keys in the select fire a preview each).
  const asked = React.useRef(0);
  const choose = async (id: string) => {
    const mine = ++asked.current;
    setSource(id); setPv(null); setError(null); setTicked(new Set()); idem.current = key();
    if (!id) { setLoading(false); return; }
    setLoading(true);
    try {
      const r = await api<CopyFromResult>("/lines/copy/preview", { method: "POST", json: { sourceId: id, targetId: combinationId } });
      if (mine !== asked.current) return;
      // Nothing ticked at first: the person ticks the line they came for (a source may have 30 lines; #281 Question 1).
      setPv(r); setTicked(new Set());
    } catch (e) { if (mine === asked.current) setError(msg(e)); } finally { if (mine === asked.current) setLoading(false); }
  };
  const n = ticked.size;
  const go = async () => {
    setBusy(true); setError(null);
    try {
      const lines = pv!.lines.filter((l) => ticked.has(`${l.kind}|${l.key}`));
      const r = await api<CopyFromApplied>("/lines/copy", { method: "POST", json: { sourceId: pv!.source.id, targetId: combinationId, lines: lines.map((l) => ({ kind: l.kind, key: l.key, version: l.version })), idempotencyKey: idem.current } });
      onApplied(r, lines.length > 3 ? `these ${lines.length} lines` : lines.map((l) => l.short).join(", "));
    } catch (e) { setError(msg(e)); if ((e as ApiError).status === 409) idem.current = key(); } finally { setBusy(false); }
  };
  const toggle = (k: string) => setTicked((s) => { const x = new Set(s); if (x.has(k)) x.delete(k); else x.add(k); return x; });
  return (
    <Dialog open wide onOpenChange={(o) => { if (!o && !busy) onClose(); }} title="Copy a line from another combination" description={COPY_FROM_INTRO}
      initialFocus={() => document.getElementById("bulk-from-source") as HTMLInputElement | null}
      footer={<><Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button><Button onClick={() => void go()} busy={busy} disabled={!pv || !n || pv.source.id !== source} data-copy-from-apply>Add {n} line{n === 1 ? "" : "s"}</Button></>}>
      <div className="space-y-3" data-copy-from data-bulk-dialog>
        <label className="block text-sm font-medium" htmlFor="bulk-from-source">Combination to copy from</label>
        {/* Rendered at once (loading inside), so focus starts here when the dialog opens. */}
        <Select id="bulk-from-source" value={source} onChange={(e) => void choose(e.target.value)} aria-busy={combos ? undefined : true} data-copy-from-source>
          <option value="">{combos ? (combos.length ? "Choose a combination…" : "There are no other combinations yet") : "Loading the combinations…"}</option>
          {(combos ?? []).map((c) => <option key={c.id} value={c.id}>{c.trail.join(" › ")}</option>)}
        </Select>
        {error ? <Notice tone="danger" title="Nothing was changed"><span data-copy-from-error>{error}</span>{source ? <> <button type="button" className="font-medium text-text-link underline" onClick={() => void choose(source)}>Check again</button></> : null}</Notice> : null}
        {loading ? <Spinner label="Working out what happens here" /> : null}
        {pv ? <>
          {pv.hidden ? <p className="text-xs text-text-muted" data-copy-from-hidden>{pv.hidden} line{pv.hidden === 1 ? " it shares" : "s it shares"} with this combination {pv.hidden === 1 ? "is" : "are"} not offered.</p> : null}
          {pv.lines.length ? (
            <div className="overflow-x-auto rounded-lg border border-border" tabIndex={0} role="region" aria-label="Its lines and what happens here">
              <table className="w-full text-sm">
                <thead className="bg-surface text-left text-xs text-text-muted"><tr><th className="w-10 px-3 py-2"><span className="sr-only">Copy</span></th><th className="px-3 py-2 font-medium">Line</th><th className="px-3 py-2 font-medium">What happens here</th></tr></thead>
                <tbody>
                  {pv.lines.map((l) => {
                    const k = `${l.kind}|${l.key}`;
                    return (
                      <tr key={k} className="border-t border-border align-top" data-copy-from-row={l.outcome} data-line-key={l.key}>
                        <td className="px-3 py-2"><input type="checkbox" className="size-4" checked={ticked.has(k)} disabled={!l.tickable || busy} onChange={() => toggle(k)} aria-label={l.tickable ? `Copy ${l.short}` : `${l.short}: ${OUTCOME_WORDS[l.outcome].toLowerCase()}`} /></td>
                        <td className="px-3 py-2"><b className="font-medium">{l.short}</b> <span className="text-text-muted">· {l.kind}</span><span className="block text-xs text-text-muted">{l.words}</span></td>
                        <td className={l.tickable ? "px-3 py-2" : "px-3 py-2 text-text-muted"}><Pill tone={toneOf(l.outcome)}>{OUTCOME_WORDS[l.outcome]}</Pill>{l.reason ? <span className="ml-1.5">{l.reason}</span> : null}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : <p className="text-sm text-text-muted" data-copy-from-none>It has no line this combination does not already have.</p>}
        </> : null}
      </div>
    </Dialog>
  );
}
