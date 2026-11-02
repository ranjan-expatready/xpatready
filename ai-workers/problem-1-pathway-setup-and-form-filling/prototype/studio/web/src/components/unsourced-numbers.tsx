// G1 PR 2b (concept §4, board 1): the "Numbers without a source (n)" block on a combination's Review and release tab.
// Every number that holds Submit and release back, grouped by its item, each with the refusal's own words and an
// "Add source" (or "Check source" when it changed) that opens the Source panel in place; a person without the author
// duty gets "View" (read only). A count line says how many fee lines the fee table already cites (its tooltip names
// each line's quote kind), and how many numbers the sample load cited. When the panel closes, focus returns to the
// button that opened it, or to the next one when its number left the list (review MJ-2, WCAG 2.4.3).
import * as React from "react";
import type { SourceNumberView, SourcesView } from "../../../contracts/source-register";
import { useApi, useSessionView } from "@/lib/api";
import { Button, Notice, Pill } from "@/components/ui/controls";
import { firstSentence, SOURCE_CHIP, SourcePanel, sourcesPath, type SourceItem } from "@/components/source-panel";

const SHOWN = 6;
const NONE = `or mark "None published – set by ExpatReady".`;
/** §5 refusal words, as the API says them (engine/source-register.ts NO_SOURCE, CHANGED, SAMPLE_ONLY), each naming its
 *  number (review m3: an item with two numbers says which one changed). */
const lineWords = (n: SourceNumberView) => n.state === "changed"
  ? `${n.words}: the source was written for ${n.entry?.value}; the number is now ${n.value}. Check the source again, ${NONE}`
  : n.state === "sample" ? `${n.words} has only a Sample source, which passes only in the demo workspace as a Demo release. Add the official source, ${NONE}`
  : `${n.words} has no source entry. Add the official source, ${NONE}`;
const BUTTONS = "[data-unsourced] [data-unsourced-number] button";

export function UnsourcedNumbers({ id, blocking }: { id: string; blocking: boolean }) {
  /** `blocking`: the draft's own problems hold these numbers (the draft differs from its release, or nothing is
   *  released; BR-7). A Live combination with no draft change lists them as what the next change will need. */
  const q = useApi<SourcesView>(["sources", id], sourcesPath(id));
  const { canAuthor } = useSessionView();
  const [open, setOpen] = React.useState<SourceItem | null>(null);
  const [all, setAll] = React.useState(false);
  const opener = React.useRef<{ el: HTMLElement; index: number } | null>(null);
  /** Where focus goes when the panel closes: its button, else the button now in its place, else the block's heading. */
  const returnFocus = React.useCallback(() => {
    const o = opener.current; if (!o) return null;
    if (o.el.isConnected) return o.el;
    const buttons = [...document.querySelectorAll<HTMLElement>(BUTTONS)];
    return buttons[Math.min(o.index, buttons.length - 1)] ?? document.getElementById("unsourced-h") ?? document.querySelector<HTMLElement>("[data-sources-all-set]");
  }, []);
  // A save refetches the list after the panel closed: if the opener's row left the list meanwhile, focus would fall to
  // the page, so it moves on to the next button (or the heading).
  React.useEffect(() => {
    if (open || !opener.current) return;
    const a = document.activeElement;
    if (!a || a === document.body || !a.isConnected) returnFocus()?.focus();
  }, [q.data, open, returnFocus]);
  const openFor = (item: SourceItem) => (e: React.MouseEvent<HTMLButtonElement>) => {
    const el = e.currentTarget; opener.current = { el, index: Math.max(0, [...document.querySelectorAll<HTMLElement>(BUTTONS)].indexOf(el)) };
    setOpen(item);
  };
  const panel = <SourcePanel id={id} item={open} onClose={() => setOpen(null)} returnFocus={returnFocus} />;
  // Devin on #615 (EXPERIENCE: every screen has its loading and error states): Review may list source problems while
  // this list is still loading or failed to load, so say so and offer to try again, never a silent gap.
  if (q.isPending) return <p className="rounded-lg border border-border bg-surface-raised px-4 py-3 text-sm text-text-muted" data-unsourced-loading>Loading the numbers and their sources…</p>;
  if (!q.data) return <Notice tone="danger" title="The numbers and their sources could not be loaded" action={<Button size="sm" variant="secondary" onClick={() => void q.refetch()} busy={q.isFetching}>Try again</Button>}><span data-unsourced-error>{(q.error as Error | null)?.message ?? "No answer from the server."} Review and release still lists them; their Add source buttons come back with the list.</span></Notice>;
  const held = q.data.numbers.filter((n) => !n.passes);
  const groups = [...held.reduce((m, n) => { const k = `${n.kind}|${n.key}`; m.set(k, [...(m.get(k) ?? []), n]); return m; }, new Map<string, SourceNumberView[]>()).values()];
  const c = q.data.counts;
  const fromLoad = q.data.numbers.filter((n) => n.passes && n.entry?.from_sample_load).length;
  const fees = [...new Map(q.data.numbers.filter((n) => n.state === "fee_table").map((n) => [n.key, n])).values()];
  const feeLine = fees.length ? <span title={fees.map((n) => `${n.item_words}: ${n.quote_kind ?? "its source"}`).join(" · ")} data-fee-count>Fees from the fee table: {fees.length} line{fees.length === 1 ? "" : "s"}, each with its source</span> : null;
  if (!held.length) return c.total ? (
    <>
      <p className="rounded-lg border border-border bg-surface-raised px-4 py-3 text-sm" tabIndex={-1} data-sources-all-set>
        <Pill tone="ok">Sources</Pill> Every published number has its answer ({c.total}{fromLoad ? `, ${fromLoad} of them from the sample load` : ""}): {c.sample ? <><b data-sources-sample>{c.sample} only Sample, with no source claimed (they pass only in the demo workspace, as a Demo release)</b>; the rest </> : null}an official source or "None published – set by ExpatReady".{feeLine ? <span className="text-text-muted"> {feeLine}.</span> : null}
      </p>
      {panel}
    </>
  ) : panel;
  return (
    <section className={`rounded-xl border bg-surface-raised p-4 ${blocking ? "border-danger/40" : "border-border"}`} aria-labelledby="unsourced-h" data-unsourced data-blocking={blocking}>
      <h2 id="unsourced-h" tabIndex={-1} className="font-medium outline-none">Numbers without a source ({held.length})</h2>
      <p className="mt-1 text-xs text-text-muted">
        {blocking ? "They block submission and release, grouped by item." : "The released version is not affected; they will block the next submission once the draft changes. Grouped by item."}
        {fromLoad ? ` ${fromLoad} more have a source "From the sample load".` : ""}{feeLine ? <> {feeLine}.</> : null}
      </p>
      <p className="mt-1 text-sm">Each published number needs its official source, or a note that the government publishes nothing and ExpatReady set it.</p>
      <ul className="mt-3 space-y-3">
        {groups.slice(0, all ? undefined : SHOWN).map((g) => {
          const n0 = g[0], item: SourceItem = { kind: n0.kind, key: n0.key, item_words: n0.item_words, where: n0.where };
          return (
            <li key={`${n0.kind}|${n0.key}`} className="rounded-lg border border-border p-3" data-unsourced-item={n0.key}>
              <p className="text-sm" id={`unsourced-item-${groups.indexOf(g)}`}><b className="font-medium" title={n0.item_words}>{firstSentence(n0.item_words)}</b> <span className="text-xs text-text-muted">· {n0.where}</span></p>
              <ul className="mt-2 space-y-2">
                {g.map((n) => {
                  const verb = !canAuthor ? "View" : n.state === "changed" ? "Check source" : "Add source";
                  return (
                    <li key={n.address} className="flex flex-wrap items-start justify-between gap-2" data-unsourced-number={n.address}>
                      <span className="min-w-0 flex-1 text-sm"><Pill tone={n.state === "changed" || n.state === "sample" ? "warn" : "danger"}>{n.state === "changed" ? SOURCE_CHIP.changed : n.state === "sample" ? SOURCE_CHIP.sample : SOURCE_CHIP.missing}</Pill> <span>{lineWords(n)}</span></span>
                      <Button size="sm" variant="secondary" onClick={openFor(item)} aria-label={`${verb}: ${n.words}`} aria-describedby={`unsourced-item-${groups.indexOf(g)}`}>{verb}</Button>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ul>
      {groups.length > SHOWN ? <Button size="sm" variant="ghost" className="mt-2" onClick={() => setAll(!all)}>{all ? "Show fewer" : `Show all ${groups.length} items`}</Button> : null}
      {panel}
    </section>
  );
}
