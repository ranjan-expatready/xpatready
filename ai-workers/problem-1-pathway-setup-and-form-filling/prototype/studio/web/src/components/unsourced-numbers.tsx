// G1 PR 2b (concept §4, board 1): the "Numbers without a source (n)" block on a combination's Review and release tab.
// Every number that holds Submit and release back, grouped by its item, each with the refusal's own words and an
// "Add source" (or "Check source" when it changed) that opens the Source panel in place. A count line says how many fee
// lines the fee table already cites, and how many numbers the sample load cited.
import * as React from "react";
import type { SourceNumberView, SourcesView } from "../../../contracts/source-register";
import { useApi } from "@/lib/api";
import { Button, Pill } from "@/components/ui/controls";
import { firstSentence, SOURCE_CHIP, SourcePanel, sourcesPath, type SourceItem } from "@/components/source-panel";

const SHOWN = 6;
/** §5 refusal words, as the API says them (engine/source-register.ts NO_SOURCE, CHANGED, SAMPLE_ONLY). */
const lineWords = (n: SourceNumberView) => n.state === "changed"
  ? `The source was written for ${n.entry?.value}; the number is now ${n.value}. Check the source again, or mark "None published – set by ExpatReady".`
  : n.state === "sample" ? `${n.words} has only a Sample source, which passes only in the demo workspace as a Demo release. Add the official source, or mark "None published – set by ExpatReady".`
  : `${n.words} has no source entry. Add the official source, or mark "None published – set by ExpatReady".`;

/** `blocking`: the draft's own problems hold these numbers (the draft differs from its release, or nothing is released;
 *  BR-7). A Live combination with no draft change lists them as what the next change will need, in neutral colours. */
export function UnsourcedNumbers({ id, blocking }: { id: string; blocking: boolean }) {
  const q = useApi<SourcesView>(["sources", id], sourcesPath(id));
  const [open, setOpen] = React.useState<SourceItem | null>(null);
  const [all, setAll] = React.useState(false);
  if (!q.data) return null;
  const held = q.data.numbers.filter((n) => !n.passes);
  const groups = [...held.reduce((m, n) => { const k = `${n.kind}|${n.key}`; m.set(k, [...(m.get(k) ?? []), n]); return m; }, new Map<string, SourceNumberView[]>()).values()];
  const c = q.data.counts;
  const fromLoad = q.data.numbers.filter((n) => n.passes && n.entry?.from_sample_load).length;
  const feeLines = new Set(q.data.numbers.filter((n) => n.state === "fee_table").map((n) => n.key)).size;
  const context = [fromLoad ? `${fromLoad} more have a source "From the sample load"` : null, feeLines ? `Fees from the fee table: ${feeLines} line${feeLines === 1 ? "" : "s"}, each with its source` : null].filter(Boolean).join(" · ");
  if (!held.length) return c.total ? (
    <p className="rounded-lg border border-border bg-surface-raised px-4 py-3 text-sm" data-sources-all-set>
      <Pill tone="ok">Sources</Pill> Every published number has its source ({c.total}).{context ? <span className="text-text-muted"> {context}.</span> : null}
    </p>
  ) : null;
  return (
    <section className={`rounded-xl border bg-surface-raised p-4 ${blocking ? "border-danger/40" : "border-border"}`} aria-labelledby="unsourced-h" data-unsourced data-blocking={blocking}>
      <h2 id="unsourced-h" className="font-medium">Numbers without a source ({held.length})</h2>
      <p className="mt-1 text-xs text-text-muted">{blocking ? "They block submission and release, grouped by item." : "The released version is not affected; they will block the next submission once the draft changes. Grouped by item."}{context ? ` ${context}.` : ""}</p>
      <p className="mt-1 text-sm">Each published number needs its official source, or a note that the government publishes nothing and ExpatReady set it.</p>
      <ul className="mt-3 space-y-3">
        {groups.slice(0, all ? undefined : SHOWN).map((g) => {
          const n0 = g[0], item: SourceItem = { kind: n0.kind, key: n0.key, item_words: n0.item_words, where: n0.where };
          return (
            <li key={`${n0.kind}|${n0.key}`} className="rounded-lg border border-border p-3" data-unsourced-item={n0.key}>
              <p className="text-sm"><b className="font-medium" title={n0.item_words}>{firstSentence(n0.item_words)}</b> <span className="text-xs text-text-muted">· {n0.where}</span></p>
              <ul className="mt-2 space-y-2">
                {g.map((n) => (
                  <li key={n.address} className="flex flex-wrap items-start justify-between gap-2" data-unsourced-number={n.address}>
                    <span className="min-w-0 flex-1 text-sm"><Pill tone={n.state === "changed" || n.state === "sample" ? "warn" : "danger"}>{n.state === "changed" ? SOURCE_CHIP.changed : n.state === "sample" ? SOURCE_CHIP.sample : SOURCE_CHIP.missing}</Pill> <span>{lineWords(n)}</span></span>
                    <Button size="sm" variant="secondary" onClick={() => setOpen(item)} aria-label={`${n.state === "changed" ? "Check source" : "Add source"}: ${n.words}`}>{n.state === "changed" ? "Check source" : "Add source"}</Button>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
      {groups.length > SHOWN ? <Button size="sm" variant="ghost" className="mt-2" onClick={() => setAll(!all)}>{all ? "Show fewer" : `Show all ${groups.length} items`}</Button> : null}
      <SourcePanel id={id} item={open} onClose={() => setOpen(null)} />
    </section>
  );
}
