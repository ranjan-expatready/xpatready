// G1 PR 2b (C5.4, P-240; concept screens/G1-source-register/concept.md v2 §4–§5, board 2): the Source panel. One card
// per published number of one item: its official source (address, page, the words that state it, the date read), or
// "None published – set by ExpatReady" with the reason. The server decides (PUT /combinations/:id/sources/:kind/:key):
// only the author duty writes, the words must state the number, an old version or a moved number answers 409. Fee lines
// and usable validity rules already cite their numbers and show read only (BR-4; no fee card, m4).
import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { SourceNumberView, SourcesView } from "../../../contracts/source-register";
import { api, ApiError, useApi, useSessionView, useToast } from "@/lib/api";
import { Button, Field, Input, Notice, Panel, Pill, Textarea } from "@/components/ui/controls";
import { Spinner } from "@/components/ui/spinner";
import { fmtDate } from "@/components/status";

/** §5 chips, word for word. */
export const SOURCE_CHIP = {
  missing: "No source", cited: "Official source", none_published: "None published – set by ExpatReady", changed: "Changed since its source",
  sample: "Sample", fee_table: "Official source", validity_cite: "Official source", from_sample_load: "From the sample load",
} as const;
const CHIP_TONE: Record<string, string> = { missing: "danger", changed: "warn", cited: "ok", none_published: "info", sample: "warn", fee_table: "ok", validity_cite: "ok" };
/** §5 words. */
export const SOURCE_SAY = {
  readOnly: "Only the configuration author adds sources.",
  empty: "This item has no published numbers.",
  noneHint: "Use this only when the government publishes nothing on the point. If an official page states it, cite that page.",
  sampleCheck: "This check stays Sample: it has no source quote of its own. A number's source does not change that.",
} as const;

/** Build note 2 (PR 2a): a check's item words are its message, about 200 characters; the panel and the list show the
 *  first sentence only, the whole text on hover. */
export const firstSentence = (s: string) => { const m = /^(.{12,}?[.!?])(\s|$)/.exec(s.trim()); return m ? m[1] : s.trim(); };
const today = () => new Date().toISOString().slice(0, 10);
export const sourcesPath = (id: string, kind?: string, key?: string) => `/combinations/${id}/sources${kind && key ? `/${encodeURIComponent(kind)}/${encodeURIComponent(key)}` : ""}`;

export type SourceItem = { kind: string; key: string; item_words: string; where: string };

/** The right-hand panel for one item's numbers. `onSaved` lets the caller refresh its own lists. */
export function SourcePanel({ id, item, onClose }: { id: string; item: SourceItem | null; onClose: () => void }) {
  const { canAuthor } = useSessionView();
  const q = useApi<SourcesView>(["sources", id, item?.kind, item?.key], item ? sourcesPath(id, item.kind, item.key) : null, { staleTime: 0 });
  // URLs this combination already cites, offered as choices (STANDARDS §3.2: the approved sources the release uses).
  const all = useApi<SourcesView>(["sources", id], item ? sourcesPath(id) : null);
  const urls = [...new Set((all.data?.numbers ?? []).map((n) => n.entry?.cited?.url).filter((u): u is string => !!u))];
  const numbers = q.data?.numbers ?? [];
  return (
    <Panel open={!!item} onOpenChange={(o) => { if (!o) onClose(); }} title="Sources of its numbers" bodyLabel="Sources of its numbers"
      description={item ? <><span title={item.item_words}>{firstSentence(item.item_words)}</span> · {item.where}</> : undefined}
      footer={<><Button variant="ghost" onClick={onClose}>Close</Button><span className="text-xs text-text-muted">{canAuthor ? "Each number saves on its own." : SOURCE_SAY.readOnly}</span></>}>
      <div className="space-y-4 text-sm" data-source-panel>
        {q.isLoading ? <Spinner label="Loading the sources" /> : q.isError ? <Notice tone="danger" title="The sources could not be loaded">{(q.error as Error).message}</Notice>
          : !numbers.length ? <p className="text-text-muted" data-source-empty>{SOURCE_SAY.empty}</p>
          : numbers.map((n) => <NumberCard key={`${n.address}`} id={id} n={n} canAuthor={canAuthor} urls={urls} siblings={numbers} />)}
        <datalist id="source-urls">{urls.map((u) => <option key={u} value={u} />)}</datalist>
      </div>
    </Panel>
  );
}

type Draft = { mode: "cited" | "none"; url: string; page: string; quote: string; date: string; reason: string };
const draftOf = (n: SourceNumberView): Draft => ({
  mode: n.entry?.none_published ? "none" : "cited",
  url: n.entry?.cited?.url ?? "", page: n.entry?.cited?.page ?? "", quote: n.entry?.cited?.quote ?? n.item_quote ?? "",
  date: n.state === "changed" ? today() : n.entry?.cited?.date ?? today(), reason: n.entry?.none_published?.reason ?? "",
});

function NumberCard({ id, n, canAuthor, urls, siblings }: { id: string; n: SourceNumberView; canAuthor: boolean; urls: string[]; siblings: SourceNumberView[] }) {
  const qc = useQueryClient(); const toast = useToast();
  const answered = n.state === "cited" || n.state === "none_published" || n.state === "sample";
  const [editing, setEditing] = React.useState(n.state === "missing");
  const [d, setD] = React.useState<Draft>(() => draftOf(n));
  const [errs, setErrs] = React.useState<Record<string, string>>({});
  const [conflict, setConflict] = React.useState<{ detail: string; version: number } | null>(null);
  const [busy, setBusy] = React.useState(false);
  // The same number elsewhere in this item (the IMM 5707 line's 18 twice): one save may write both (board 2).
  const twins = siblings.filter((x) => x.address !== n.address && x.value === n.value && !x.passes && x.state !== "fee_table" && x.state !== "validity_cite");
  const [alsoTwins, setAlsoTwins] = React.useState(false);
  React.useEffect(() => { setD(draftOf(n)); setEditing(n.state === "missing"); setErrs({}); setConflict(null); }, [n.state, n.entry?.version, n.value]);
  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setD((x) => ({ ...x, [k]: e.target.value }));
  const body = (x: SourceNumberView, version: number) => ({ address: x.address, value: x.value, version,
    ...(d.mode === "cited" ? { cited: { url: d.url, page: d.page.trim() || null, quote: d.quote, date: d.date } } : { none_published: { reason: d.reason } }) });
  const done = async () => { for (const k of [["sources", id], ["review", id], ["combination", id], ["programs"], ["draft"]]) await qc.invalidateQueries({ queryKey: k }); };
  const save = async (version = n.entry?.version ?? 0) => {
    setBusy(true); setErrs({}); setConflict(null);
    try {
      await api(sourcesPath(id, n.kind, n.key), { method: "PUT", json: body(n, version) });
      let also = 0;
      if (alsoTwins) for (const t of twins) { try { await api(sourcesPath(id, t.kind, t.key), { method: "PUT", json: body(t, t.entry?.version ?? 0) }); also++; } catch (e) { toast.push({ tone: "danger", text: `${t.words}: ${(e as Error).message}` }); } }
      toast.push({ tone: "ok", text: `Source saved: ${n.words}${also ? ` and ${also} more` : ""}` });
      setEditing(false); setAlsoTwins(false); await done();
    } catch (e) {
      const err = e as ApiError;
      if (err.status === 409 && typeof (err.problem as { version?: unknown }).version === "number") setConflict({ detail: err.message, version: (err.problem as { version: number }).version });
      else if (err.status === 409) { setConflict({ detail: err.message, version: -1 }); }
      // "Still correct for 60" with words that state 90 is refused on the words: open the editor so the error shows there.
      else if (err.problem?.errors?.length) { setErrs(Object.fromEntries(err.problem.errors.map((x) => [x.field, x.message]))); setEditing(true); }
      else toast.push({ tone: "danger", text: err.message });
    } finally { setBusy(false); }
  };
  const chip = n.state === "fee_table" || n.state === "validity_cite" ? SOURCE_CHIP.cited : SOURCE_CHIP[n.state as keyof typeof SOURCE_CHIP];
  const base = `src-${n.address.replace(/[^a-z0-9]/gi, "-")}`;
  return (
    <section className="rounded-lg border border-border bg-surface p-3" aria-labelledby={`${base}-h`} data-source-number={n.address} data-state={n.state}>
      <div className="flex flex-wrap items-center gap-2">
        <h3 id={`${base}-h`} className="font-medium">{n.words}</h3>
        <Pill tone={CHIP_TONE[n.state] ?? "neutral"}>{chip}</Pill>
        {n.entry?.from_sample_load ? <Pill tone="neutral">{SOURCE_CHIP.from_sample_load}</Pill> : null}
      </div>
      {n.state === "fee_table" ? <p className="mt-1 text-xs text-text-muted">Cited by the fee table: each fee line carries its page, address, IRCC's words and the date read.</p> : null}
      {n.state === "validity_cite" ? <p className="mt-1 text-xs text-text-muted">Cited by its validity rule's own source (its words state the months).</p> : null}
      {n.state === "sample" && !n.passes ? <p className="mt-1 text-xs text-text-danger">A Sample source passes only in the demo workspace, as a Demo release. Add the official source, or mark "None published – set by ExpatReady".</p> : null}
      {n.state === "changed" ? (
        <div className="mt-2 space-y-1" data-source-changed>
          <p>The source was written for <b>{n.entry?.value}</b>; the number is now <b>{n.value}</b>.</p>
          <p className="text-xs text-text-muted">Before: <Answer n={n} /></p>
        </div>
      ) : answered && !editing ? <div className="mt-2 text-xs"><Answer n={n} /></div> : null}
      {conflict ? (
        <Notice tone="warn" className="mt-2" title="Saved by someone else">{conflict.detail}
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => { setConflict(null); void done(); }}>Reload theirs</Button>
            {conflict.version >= 0 ? <Button size="sm" onClick={() => void save(conflict.version)} busy={busy}>Keep mine and save again</Button> : null}
          </div>
        </Notice>
      ) : null}
      {canAuthor && n.state !== "fee_table" && n.state !== "validity_cite" ? (
        editing ? (
          <div className="mt-3 space-y-3" data-source-editor>
            <fieldset>
              <legend className="text-xs font-medium">Where does {n.value} come from?</legend>
              <div className="mt-1 flex flex-wrap gap-2" role="radiogroup">
                {(["cited", "none"] as const).map((m) => (
                  <label key={m} className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm ${d.mode === m ? "border-primary bg-primary/5" : "border-border"}`}>
                    <input type="radio" name={`${base}-mode`} checked={d.mode === m} onChange={() => { setD((x) => ({ ...x, mode: m })); setErrs({}); }} />
                    {m === "cited" ? "Official source" : "None published – set by ExpatReady"}
                  </label>
                ))}
              </div>
            </fieldset>
            {d.mode === "cited" ? (
              <>
                <Field label="Official address (https)" hint={urls.length ? "Pick one this combination already cites, or type the page's address." : undefined} error={errs["cited.url"]}>
                  <Input value={d.url} onChange={set("url")} list="source-urls" inputMode="url" autoComplete="off" placeholder="https://www.canada.ca/…" />
                </Field>
                <Field label="Page or section (optional, up to 200 characters)" error={errs["cited.page"]}><Input value={d.page} onChange={set("page")} maxLength={400} /></Field>
                <Field label="Date read" error={errs["cited.date"]}><Input type="date" value={d.date} onChange={set("date")} max={today()} /></Field>
                <Field label="The words that state the number (up to 300 characters)" error={errs["cited.quote"]}
                  hint={n.item_quote && d.quote === n.item_quote ? `Filled in from the item's own quote. It must state ${n.value}; if it does not, copy the page's words that do.` : `Copy the words from the page that state ${n.value}.`}>
                  <Textarea value={d.quote} onChange={set("quote")} className="min-h-20" />
                </Field>
              </>
            ) : (
              <>
                {/* The guidance stays in view when the reason has an error (a Field shows its hint or its error, not both). */}
                <p className="text-xs text-text-muted" data-none-hint>{SOURCE_SAY.noneHint}</p>
                <Field label="Why ExpatReady set this number (required)" error={errs["none_published.reason"]}>
                  <Textarea value={d.reason} onChange={set("reason")} className="min-h-16" />
                </Field>
              </>
            )}
            {errs.address || errs.value || errs.version ? <p role="alert" className="text-xs text-text-danger">{errs.address ?? errs.value ?? errs.version}</p> : null}
            {twins.length ? <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={alsoTwins} onChange={(e) => setAlsoTwins(e.target.checked)} /> Use the same source for the other {n.value} in this item ({twins.map((t) => t.words).join("; ")})</label> : null}
            <div className="flex justify-end gap-2">
              {answered || n.state === "changed" ? <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setD(draftOf(n)); setErrs({}); }}>Cancel</Button> : null}
              <Button size="sm" onClick={() => void save()} busy={busy} data-source-save>Save source</Button>
            </div>
          </div>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {n.state === "changed" ? <>
              <Button size="sm" onClick={() => void save()} busy={busy} data-source-still>Still correct for {n.value}</Button>
              <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>Write a new source</Button>
            </> : <Button size="sm" variant="secondary" onClick={() => setEditing(true)} data-source-change>Change</Button>}
          </div>
        )
      ) : null}
    </section>
  );
}

/** One stored answer in words: where it comes from, when it was read or written, and by whom. */
function Answer({ n }: { n: SourceNumberView }) {
  const e = n.entry;
  if (!e) return <span>No source yet.</span>;
  const who = e.from_sample_load ? "written by the sample load" : `by ${e.updated_by_name}`;
  if (e.cited) return <span><a className="text-text-link underline" href={e.cited.url} target="_blank" rel="noreferrer noopener">{e.cited.page || new URL(e.cited.url).hostname}</a> · checked {fmtDate(e.cited.date)} · {who}<br /><q className="text-text-muted">{e.cited.quote}</q></span>;
  if (e.none_published) return <span>None published – set by ExpatReady · {fmtDate(e.updated_at)} · {who}<br /><span className="text-text-muted">{e.none_published.reason}</span></span>;
  return <span>Sample: no source claimed · {who}</span>;
}
