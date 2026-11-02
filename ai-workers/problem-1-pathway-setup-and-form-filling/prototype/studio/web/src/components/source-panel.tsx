// G1 PR 2b (C5.4, P-240; concept screens/G1-source-register/concept.md v2 §4–§5, board 2): the Source panel. One card
// per published number of one item: its official source (address, page, the words that state it, the date read), or
// "None published – set by ExpatReady" with the reason. The server decides (PUT /combinations/:id/sources/:kind/:key):
// only the author duty writes, the words must state the number, an old version or a moved number answers 409. Fee lines
// and usable validity rules already cite their numbers and show read only (BR-4; no fee card, m4).
import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { SourceEntryView, SourceNumberView, SourcesView } from "../../../contracts/source-register";
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
/** The person's own calendar day (break m5: the UTC day refused "today" east of UTC); the server allows up to 14 hours
 *  ahead of UTC, the furthest time zone. */
const today = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10); };
export const sourcesPath = (id: string, kind?: string, key?: string) => `/combinations/${id}/sources${kind && key ? `/${encodeURIComponent(kind)}/${encodeURIComponent(key)}` : ""}`;

export type SourceItem = { kind: string; key: string; item_words: string; where: string };

/** The right-hand panel for one item's numbers. `onSaved` lets the caller refresh its own lists. */
export function SourcePanel({ id, item, onClose, returnFocus, note }: { id: string; item: SourceItem | null; onClose: () => void; returnFocus?: () => HTMLElement | null | undefined;
  /** A line read first (m3: "This check stays Sample: …" for a check marked illustrative). */
  note?: string }) {
  const { canAuthor } = useSessionView();
  const q = useApi<SourcesView>(["sources", id, item?.kind, item?.key], item ? sourcesPath(id, item.kind, item.key) : null, { staleTime: 0 });
  // URLs this combination already cites, offered as choices (STANDARDS §3.2: the approved sources the release uses).
  const all = useApi<SourcesView>(["sources", id], item ? sourcesPath(id) : null);
  const urls = [...new Set((all.data?.numbers ?? []).map((n) => n.entry?.cited?.url).filter((u): u is string => !!u))];
  const numbers = q.data?.numbers ?? [];
  // Break M4: a source typed but not saved is not thrown away without asking (Escape, the overlay, the X or Close).
  const dirty = React.useRef(new Set<string>());
  const setDirty = React.useCallback((address: string, on: boolean) => { on ? dirty.current.add(address) : dirty.current.delete(address); }, []);
  React.useEffect(() => { if (!item) dirty.current.clear(); }, [item]);
  const confirmClose = () => !dirty.current.size || window.confirm("Discard the source you typed? It is not saved.");
  const close = () => { if (confirmClose()) { dirty.current.clear(); onClose(); } };
  // Break m9: the panel opens before its numbers load, so focus first sits on the panel itself; once they load it moves
  // to the first field (or button), as every other panel does.
  React.useEffect(() => {
    if (!q.data) return;
    const t = window.setTimeout(() => { const box = document.querySelector<HTMLElement>("[data-source-panel]"); const a = document.activeElement; if (box && a && a.getAttribute("role") === "dialog") box.querySelector<HTMLElement>("input:not([disabled]), textarea, select, button")?.focus(); }, 0);
    return () => window.clearTimeout(t);
  }, [q.data]);
  return (
    <Panel open={!!item} onOpenChange={(o) => { if (!o) { dirty.current.clear(); onClose(); } }} confirmClose={confirmClose} returnFocus={returnFocus} title="Sources of its numbers" bodyLabel="Sources of its numbers"
      description={item ? <><span title={item.item_words}>{firstSentence(item.item_words)}</span> · {item.where}</> : undefined}
      footer={<><Button variant="ghost" onClick={close}>Close</Button><span className="text-xs text-text-muted">{canAuthor ? "Each number saves on its own." : SOURCE_SAY.readOnly}</span></>}>
      <div className="space-y-4 text-sm" data-source-panel>
        {note ? <p className="rounded-lg bg-warn/10 px-3 py-2 text-xs" data-source-note>{note}</p> : null}
        {q.isLoading ? <Spinner label="Loading the sources" /> : q.isError ? <Notice tone="danger" title="The sources could not be loaded">{(q.error as Error).message}</Notice>
          : !numbers.length ? <p className="text-text-muted" data-source-empty>{SOURCE_SAY.empty}</p>
          : numbers.map((n) => <NumberCard key={`${n.address}`} id={id} n={n} canAuthor={canAuthor} urls={urls} siblings={numbers} setDirty={setDirty} />)}
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

function NumberCard({ id, n, canAuthor, urls, siblings, setDirty }: { id: string; n: SourceNumberView; canAuthor: boolean; urls: string[]; siblings: SourceNumberView[]; setDirty: (address: string, on: boolean) => void }) {
  const qc = useQueryClient(); const toast = useToast();
  const answered = n.state === "cited" || n.state === "none_published" || n.state === "sample";
  const [editing, setEditing] = React.useState(n.state === "missing");
  const [d, setD] = React.useState<Draft>(() => draftOf(n));
  const [errs, setErrs] = React.useState<Record<string, string>>({});
  // A 409 is either someone else's save (version: Keep mine is offered) or the number itself moved (value: reload only;
  // review m2 on PR 2b: no one saved, so it never says "someone else").
  // Break M3: a save conflict shows what the other save holds, so Keep mine never overwrites an answer unseen.
  const [conflict, setConflict] = React.useState<{ detail: string; version: number; moved?: boolean; theirs?: SourceEntryView | null } | null>(null);
  const [busy, setBusy] = React.useState(false);
  // The same number elsewhere in this item (the IMM 5707 line's 18 twice): one save may write both (board 2).
  const twins = siblings.filter((x) => x.address !== n.address && x.value === n.value && !x.passes && x.state !== "fee_table" && x.state !== "validity_cite");
  const [alsoTwins, setAlsoTwins] = React.useState(false);
  React.useEffect(() => { setD(draftOf(n)); setEditing(n.state === "missing"); setErrs({}); setConflict(null); }, [n.state, n.entry?.version, n.value]);
  const typed = editing && JSON.stringify(d) !== JSON.stringify(draftOf(n));
  React.useEffect(() => { setDirty(n.address, typed); return () => setDirty(n.address, false); }, [typed, n.address, setDirty]);
  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setD((x) => ({ ...x, [k]: e.target.value }));
  const body = (x: SourceNumberView, version: number) => ({ address: x.address, value: x.value, version,
    ...(d.mode === "cited" ? { cited: { url: d.url, page: d.page.trim() || null, quote: d.quote, date: d.date } } : { none_published: { reason: d.reason } }) });
  // Devin on #615: the workspace's setup badges and next action (combination-summary) and the catalogue count source
  // problems too, so a save refreshes them with Review and the Release page.
  const done = async () => { for (const k of [["sources", id], ["review", id], ["combination", id], ["combination-summary", id], ["catalogue"], ["programs"], ["draft"]]) await qc.invalidateQueries({ queryKey: k }); };
  const save = async (version = n.entry?.version ?? 0) => {
    setBusy(true); setErrs({}); setConflict(null);
    try {
      await api(sourcesPath(id, n.kind, n.key), { method: "PUT", json: body(n, version) });
      let also = 0; const missed: string[] = [];
      if (alsoTwins) for (const t of twins) { try { await api(sourcesPath(id, t.kind, t.key), { method: "PUT", json: body(t, t.entry?.version ?? 0) }); also++; } catch { missed.push(t.words); } }
      // Break m2: a twin that did not save is named, and its card (now refreshed) is where to try again.
      toast.push({ tone: missed.length ? "danger" : "ok", text: `Source saved: ${n.words}${also ? ` and ${also} more` : ""}.${missed.length ? ` Not saved: ${missed.join("; ")}. Open its card below and save it again.` : ""}` });
      setEditing(false); setAlsoTwins(false); await done();
    } catch (e) {
      const err = e as ApiError;
      if (err.status === 409 && typeof (err.problem as { value?: unknown }).value === "string") setConflict({ detail: err.message, version: -1, moved: true });
      else if (err.status === 409 && typeof (err.problem as { version?: unknown }).version === "number") {
        const theirs = await api<SourcesView>(sourcesPath(id, n.kind, n.key)).then((v) => v.numbers.find((x) => x.address === n.address)?.entry ?? null).catch(() => null);
        setConflict({ detail: err.message, version: (err.problem as { version: number }).version, theirs });
      }
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
      ) : answered && !editing ? <div className="mt-2 text-xs"><Answer n={n} /></div>
        : n.state === "missing" && !canAuthor ? <p className="mt-2 text-xs text-text-muted" data-source-none-yet>No source yet. The configuration author adds it.</p> : null}
      {conflict ? (
        <Notice tone="warn" className="mt-2" title={conflict.moved ? "The number changed" : conflict.version >= 0 ? "Saved while you had it open" : "Not saved"}>{conflict.detail}
          {conflict.theirs ? <p className="mt-1 text-xs" data-source-theirs>Saved now: <Answer n={{ ...n, entry: conflict.theirs }} /></p> : null}
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => { setConflict(null); void done(); }}>{conflict.moved ? "Reload" : "Reload the saved one"}</Button>
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
                <Field label="Page or section (optional, up to 200 characters)" error={errs["cited.page"]}><Input value={d.page} onChange={set("page")} maxLength={200} /></Field>
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
  // Break m7: the link reads the host it goes to; m1: long unbroken words wrap, never widen the panel.
  const host = (() => { try { return new URL(e.cited?.url ?? "").hostname; } catch { return e.cited?.url ?? ""; } })();
  if (e.cited) return <span className="[overflow-wrap:anywhere]"><a className="text-text-link underline" href={e.cited.url} target="_blank" rel="noreferrer noopener">{host}</a>{e.cited.page ? ` · ${e.cited.page}` : ""} · checked {fmtDate(e.cited.date)} · {who}<br /><q className="text-text-muted">{e.cited.quote}</q></span>;
  if (e.none_published) return <span className="[overflow-wrap:anywhere]">None published – set by ExpatReady · {fmtDate(e.updated_at)} · {who}<br /><span className="text-text-muted">{e.none_published.reason}</span></span>;
  return <span>Sample: no source claimed · {who}</span>;
}

/** G1 PR 2c (concept §4: "The panel also opens from …"): one item's published numbers where the item is edited, with
 *  their state, and a control that opens the Source panel on that item. `variant`: "section" in the rule dialog ("Sources
 *  of its numbers", each number with its chip), "button" on a check row ("Sources (n)"), "link" under a form line's
 *  "From age" ("Source"). Nothing shows for an item with no published number. The numbers are the draft's as saved. */
export function ItemSources({ id, kind, suffix, address, variant, label, note }: {
  id: string; kind: string; suffix: string; address?: string; variant: "section" | "button" | "link"; label?: string; note?: string;
}) {
  const q = useApi<SourcesView>(["sources", id], sourcesPath(id));
  const { canAuthor } = useSessionView();
  const [open, setOpen] = React.useState<SourceItem | null>(null);
  const opener = React.useRef<HTMLButtonElement | null>(null);
  const nums = (q.data?.numbers ?? []).filter((n) => n.kind === kind && n.key.endsWith(`/${suffix}`) && (!address || n.address === address));
  if (!nums.length) return null;
  const item: SourceItem = { kind: nums[0].kind, key: nums[0].key, item_words: nums[0].item_words, where: nums[0].where };
  const held = nums.filter((n) => !n.passes).length;
  const verb = canAuthor ? (held ? "Add or check sources" : "Check sources") : "View sources";
  const name = label ?? item.item_words;
  const chipOf = (n: SourceNumberView) => <Pill tone={CHIP_TONE[n.state] ?? "neutral"}>{n.state === "fee_table" || n.state === "validity_cite" ? SOURCE_CHIP.cited : SOURCE_CHIP[n.state as keyof typeof SOURCE_CHIP]}</Pill>;
  const panel = <SourcePanel id={id} item={open} onClose={() => setOpen(null)} returnFocus={() => opener.current} note={note} />;
  const show = () => setOpen(item);
  if (variant === "button") return (
    <>
      <Button ref={opener} size="sm" variant="ghost" onClick={show} aria-label={`Sources (${nums.length})${held ? ` ${held} no source` : ""}: ${name}`} data-item-sources={item.key}>
        Sources ({nums.length}){held ? <Pill tone="danger" className="ml-1">{held} no source</Pill> : null}
      </Button>
      {panel}
    </>
  );
  if (variant === "link") return (
    <span className="flex flex-wrap items-center gap-1.5 text-xs" data-item-sources={item.key}>
      {nums.map((n) => <React.Fragment key={n.address}>{chipOf(n)}</React.Fragment>)}
      <button ref={opener} type="button" className="text-text-link underline" onClick={show} aria-label={`Source of ${nums.map((n) => n.words).join("; ")}`}>Source</button>
      {panel}
    </span>
  );
  return (
    <section className="rounded-lg border border-border p-3" aria-labelledby={`item-src-${item.key.replace(/[^a-z0-9]/gi, "-")}`} data-item-sources={item.key}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={`item-src-${item.key.replace(/[^a-z0-9]/gi, "-")}`} className="text-sm font-medium">Sources of its numbers</h3>
        <Button ref={opener} size="sm" variant="secondary" onClick={show}>{verb}</Button>
      </div>
      <p className="mt-1 text-xs text-text-muted">The numbers as saved in the draft. Save a change first to give a new number its source.</p>
      <ul className="mt-2 space-y-1 text-sm">{nums.map((n) => <li key={n.address} className="flex flex-wrap items-center gap-2">{n.words} {chipOf(n)}</li>)}</ul>
      {panel}
    </section>
  );
}
