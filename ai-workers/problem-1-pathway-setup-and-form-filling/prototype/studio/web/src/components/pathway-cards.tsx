// The row of Pathway cards on top of a Pathway type tab (S1-finish on Structure, S2 on Immigration programs; founder,
// 27 Oct): "All pathways", one card per Pathway with its combinations and how many need the person, and "+ Add pathway".
// A card is a toggle (aria-pressed); what it opens is the page's own (Structure: that Pathway's tree; Immigration
// programs: that Pathway's setup cards).
import { Plus } from "lucide-react";
import { LevelMark, pathwayAccent } from "@/components/levels";
import { Tip } from "@/components/status";
import { cn } from "@/lib/utils";

/** detail: a short line of counts by status ("1 Live · 2 In setup · 4 Not started"); matches: Find's hits in it. */
export type PathwayCardItem = { key: string; label: string; combinations: number; needs: number; retired?: boolean; detail?: string; matches?: number };
export const NEED_YOU_TIP = '"Need you": combinations waiting for a person: something to review, something missing or something blocking release.';

export function PathwayCards({ typeLabel, pathways, open, onOpen, allTip, cardTip, add }: {
  typeLabel: string; pathways: PathwayCardItem[]; open: string | null; onOpen: (key: string | null) => void;
  allTip: string; cardTip: (label: string) => string;
  /** The add card: enabled for an author, else its tooltip says who may add. */
  add: { enabled: boolean; tip: string; onAdd: () => void };
}) {
  const total = pathways.reduce((s, p) => s + p.combinations, 0), needs = pathways.reduce((s, p) => s + p.needs, 0);
  const card = "flex min-h-[76px] flex-col items-start justify-between gap-1 rounded-xl border px-3.5 py-2.5 text-left outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50";
  const Counts = ({ n, k }: { n: number; k: number }) => (
    <span className="flex flex-wrap items-center gap-1.5 text-xs text-text-muted">
      {n} {n === 1 ? "combination" : "combinations"}
      {k ? <span className="rounded-full bg-warn/15 px-1.5 font-semibold text-text-warn">{k} need{k === 1 ? "s" : ""} you</span> : <span>· none need you</span>}
    </span>
  );
  return (
    <div role="group" aria-label={`${typeLabel} pathways`} className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2.5" data-pathway-cards>
      <Tip tip={allTip}>
        <button type="button" aria-pressed={open === null} onClick={() => onOpen(null)} className={cn(card, open === null ? "border-primary bg-primary/10" : "border-border bg-surface-raised hover:border-border-strong")}>
          <span className="text-sm font-semibold">All pathways</span><Counts n={total} k={needs} />
        </button>
      </Tip>
      {pathways.map((p, i) => (
        <Tip key={p.key} tip={`${cardTip(p.label)} ${NEED_YOU_TIP}`}>
          {/* VS-9: the Pathway's accent as a 4 px stripe; its name stays slate with the Pathway mark. */}
          <button type="button" aria-pressed={open === p.key} onClick={() => onOpen(p.key)} data-pathway={p.key} style={{ borderLeftColor: pathwayAccent(i), borderLeftWidth: 4 }} className={cn(card, open === p.key ? "border-primary bg-primary/10" : "border-border bg-surface-raised hover:border-border-strong", p.retired && "opacity-70")}>
            <span className="flex items-start gap-1.5 break-words text-sm font-semibold text-lv1"><LevelMark level="pathway" tip={false} className="mt-1" />{p.label}{p.retired ? <span className="ml-1 font-normal text-text-muted">(retired)</span> : null}</span>
            <Counts n={p.combinations} k={p.needs} />
            {p.detail ? <span className="text-xs text-text-muted" data-card-detail>{p.detail}</span> : null}
            {p.matches !== undefined ? <span className="text-xs font-semibold text-text-link" data-card-matches>{p.matches} {p.matches === 1 ? "match" : "matches"}</span> : null}
          </button>
        </Tip>
      ))}
      <Tip tip={add.tip}>
        <button type="button" aria-disabled={!add.enabled || undefined} onClick={() => { if (add.enabled) add.onAdd(); }} className={cn(card, "items-center justify-center border-dashed border-border-strong text-sm text-text-muted", add.enabled ? "hover:border-primary hover:text-text-link" : "cursor-not-allowed opacity-60")}>
          <span className="flex items-center gap-1.5"><Plus className="size-4" aria-hidden />Add pathway</span>
        </button>
      </Tip>
    </div>
  );
}
