// C4.5 (concept product/screens/C4.5-document-supplies/concept.md §4, approved by the tech lead on #1005): "Change the
// facts it supplies…", a person's step, US$0. One side panel, opened in place from the Documents tab drawer and from
// Library › Document types. Cards, one per official line (source, page, quote, date read) with its facts as chips, so
// words shared by several facts are typed once (challenge M4); the API takes one cite per fact. A second person
// approves on To review; the panel shows the change while it waits, is returned, or is approved and not released.
import * as React from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { api, ApiError, useActorId, useApi } from "@/lib/api";
import { Button, Input, Notice, Panel, Pill, Textarea } from "@/components/ui/controls";
import { Spinner } from "@/components/ui/spinner";
import { ABOUT_WORDS, type SuppliesPanelView, type SuppliesWarning } from "../../../contracts/document-supplies";

type About = keyof typeof ABOUT_WORDS;
type Card = { id: number; source: string; quote: string; readOn: string; facts: { fact: string; about: About }[] };
/** Today as the reader's own date (P-302: IST is the founder's day), YYYY-MM-DD. */
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
let seq = 0;
const blank = (p?: { source: string; quote: string } | null): Card => ({ id: ++seq, source: p?.source ?? "", quote: p?.quote ?? "", readOn: today(), facts: [] });
/** The facts it supplies now, grouped by the official words recorded with them (one card per line). */
function cardsOf(v: SuppliesPanelView): Card[] {
  const by = new Map<string, Card>();
  for (const f of v.facts) {
    const k = f.cite ? `${f.cite.source}|${f.cite.quote}|${f.cite.readOn}` : "none";
    const c = by.get(k) ?? { id: ++seq, source: f.cite?.source ?? "", quote: f.cite?.quote ?? "", readOn: f.cite?.readOn ?? today(), facts: [] };
    c.facts.push({ fact: f.fact, about: f.about }); by.set(k, c);
  }
  return by.size ? [...by.values()] : [blank(v.prefill)];
}

export function SuppliesPanel({ typeKey, combinationId, open, onClose, onSaved }: { typeKey: string; combinationId?: string; open: boolean; onClose: () => void; onSaved?: () => void }) {
  const me = useActorId(), qc = useQueryClient();
  const v = useApi<SuppliesPanelView>(["supplies", typeKey, combinationId ?? null], open ? `/library/document-types/${encodeURIComponent(typeKey)}/supplies${combinationId ? `?combination=${combinationId}` : ""}` : null);
  const [cards, setCards] = React.useState<Card[] | null>(null);
  const [reason, setReason] = React.useState("");
  const [why, setWhy] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [warnings, setWarnings] = React.useState<SuppliesWarning[]>([]);
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => { if (v.data && !cards) setCards(cardsOf(v.data)); }, [v.data, cards]);
  React.useEffect(() => { if (!open) { setCards(null); setReason(""); setWhy(""); setError(null); setWarnings([]); } }, [open]);
  const label = React.useMemo(() => new Map((v.data?.fields ?? []).map((f) => [f.key, f.label])), [v.data]);
  const refresh = () => { void v.refetch(); for (const k of [["supplies"], ["doc-types"], ["checklist"], ["fact-sources"], ["preview"], ["review-queue"]]) void qc.invalidateQueries({ queryKey: k }); onSaved?.(); };
  const dirty = !!cards && !!v.data && JSON.stringify(cards.map((c) => [c.source, c.quote, c.facts])) !== JSON.stringify(cardsOf(v.data).map((c) => [c.source, c.quote, c.facts]));
  const send = async () => {
    setError(null);
    const used = cards!.filter((c) => c.facts.length);
    const missing = used.find((c) => c.source.trim().length < 3 || c.quote.trim().length < 3);
    if (missing) { setError("Each official line with facts needs its source (form, edition, page) and its quote."); return; }
    setBusy(true);
    try {
      const r = await api<{ warnings: SuppliesWarning[] }>(`/library/document-types/${encodeURIComponent(typeKey)}/supplies`, { method: "POST", json: { reason: reason.trim(), facts: used.flatMap((c) => c.facts.map((f) => ({ fact: f.fact, about: f.about, source: c.source.trim(), quote: c.quote.trim(), readOn: c.readOn }))) } });
      setWarnings(r.warnings ?? []); setReason(""); setCards(null); refresh();
    } catch (e) { setError((e as ApiError).message); } finally { setBusy(false); }
  };
  const withdraw = async (id: string) => {
    setError(null); setBusy(true);
    try { await api(`/library/changes/${id}/withdraw`, { method: "POST", json: { note: why.trim() } }); setWhy(""); setCards(null); refresh(); }
    catch (e) { setError((e as ApiError).message); } finally { setBusy(false); }
  };
  const x = v.data, o = x?.open ?? null, editing = !!x && !o && !!cards;
  const set = (id: number, patch: Partial<Card>) => setCards((cs) => cs!.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const placed = new Set(cards?.flatMap((c) => c.facts.map((f) => f.fact)) ?? []);
  return (
    <Panel open={open} onOpenChange={(o2) => !o2 && onClose()} title={x ? `Facts ${x.name} supplies` : "Facts this document supplies"}
      description={x ? `Used by ${x.uses} combination${x.uses === 1 ? "" : "s"} · a second person approves it on To review` : undefined}
      confirmClose={() => !dirty || window.confirm("Discard the facts and words you changed?")}
      badge={o ? <Pill tone={o.status === "RETURNED" ? "danger" : "warn"}>{o.status === "WAITING" ? "Waiting for a second person" : o.status === "RETURNED" ? "Returned" : "Approved · next release"}</Pill> : null}
      footer={editing ? <><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => void send()} busy={busy} disabled={!dirty} data-supplies-send>Send for approval</Button></> : <span className="ml-auto"><Button variant="ghost" onClick={onClose}>Close</Button></span>}>
      {v.isLoading || (!cards && !v.isError) ? <Spinner label="Loading" /> : v.isError ? <Notice tone="danger" title="This document type could not be opened">{(v.error as Error).message}</Notice> : (
        <div className="space-y-4 text-sm" data-supplies-panel>
          <p className="text-xs text-text-muted">List the facts this document shows, with the official words that say so. A second person approves; it changes every combination whose checklist names it. Sample until the immigration expert confirms.</p>
          {warnings.length ? <Notice tone="warn" title="Sent, with a note">{warnings.map((w) => <p key={w.fact} data-supplies-warning>{w.why}</p>)}</Notice> : null}
          {o ? (
            <div className="space-y-2" data-supplies-open={o.status}>
              <p>{o.status === "WAITING" ? <>Waiting for a second person on <Link className="text-text-link underline" to="/review">To review</Link>.</> : o.status === "RETURNED" ? <>Returned by the second person: <span className="font-medium">{o.note}</span>. Withdraw it, then propose the facts again.</> : <>Approved: in every combination's draft and Preview now; it goes out with each one's next release.</>} Proposed by {o.by}. Why: {o.reason}</p>
              <ul className="space-y-1.5 rounded-lg border border-border p-3" aria-label="The facts proposed">{o.supplies.cites.map((c) => <li key={c.fact}><span className="font-medium">{c.label}</span>{c.about !== "holder" ? <span className="text-text-muted"> · about {ABOUT_WORDS[c.about]}</span> : null}<br /><span className="text-xs text-text-muted">{c.source} · read {c.readOn}: “{c.quote}”</span></li>)}{!o.supplies.cites.length ? <li className="text-text-muted">No fact: filed as is.</li> : null}</ul>
              {o.status !== "APPROVED" && o.byId === me ? <div className="space-y-1.5"><label className="block text-xs font-medium">Why withdraw it <span className="font-normal text-text-muted">(required)</span><Textarea className="mt-1 min-h-12" value={why} onChange={(e) => setWhy(e.target.value)} data-supplies-why /></label><Button size="sm" variant="secondary" busy={busy} disabled={why.trim().length < 3} onClick={() => void withdraw(o.id)} data-supplies-withdraw>Withdraw</Button></div> : null}
            </div>
          ) : (
            <>
              {cards!.map((c, i) => <CardEditor key={c.id} n={i + 1} c={c} label={label} fields={x!.fields} taken={placed} onChange={(p) => set(c.id, p)} onRemove={cards!.length > 1 ? () => setCards((cs) => cs!.filter((y) => y.id !== c.id)) : undefined} />)}
              <Button size="sm" variant="secondary" onClick={() => setCards((cs) => [...cs!, blank()])} data-supplies-add-line>Add another official line</Button>
              <label className="block text-xs font-medium">Why it changes, for every combination <span className="font-normal text-text-muted">(required; shown to the second person)</span>
                <Textarea className="mt-1 min-h-14" value={reason} onChange={(e) => setReason(e.target.value)} aria-invalid={error ? true : undefined} aria-describedby={error ? "supplies-error" : undefined} data-supplies-reason />
              </label>
            </>
          )}
          {error ? <p role="alert" id="supplies-error" className="text-xs text-text-danger" data-supplies-error>{error}</p> : null}
        </div>
      )}
    </Panel>
  );
}

/** One official line: where the words are, the words, when they were read, and the facts they say the document shows. */
function CardEditor({ n, c, label, fields, taken, onChange, onRemove }: { n: number; c: Card; label: Map<string, string>; fields: SuppliesPanelView["fields"]; taken: Set<string>; onChange: (p: Partial<Card>) => void; onRemove?: () => void }) {
  const [q, setQ] = React.useState("");
  const id = `supplies-card-${c.id}`;
  const hits = fields.filter((f) => !taken.has(f.key) && (q.trim() ? f.label.toLowerCase().includes(q.trim().toLowerCase()) : f.suggested)).slice(0, 8);
  return (
    <fieldset className="space-y-2 rounded-lg border border-border p-3" data-supplies-card={n} aria-labelledby={`${id}-legend`}>
      <legend id={`${id}-legend`} className="px-1 text-xs font-semibold">Official line {n}</legend>
      <div className="flex items-start gap-2">
        <label className="block flex-1 text-xs font-medium">Source: form, edition, page<Input className="mt-1" value={c.source} placeholder="IMM 5484 (05-2026), page 1" onChange={(e) => onChange({ source: e.target.value })} data-supplies-source /></label>
        <label className="block w-36 text-xs font-medium">Date read<Input className="mt-1" type="date" value={c.readOn} onChange={(e) => onChange({ readOn: e.target.value })} data-supplies-read /></label>
      </div>
      <label className="block text-xs font-medium">The official words that say the document shows it<Textarea className="mt-1 min-h-14" value={c.quote} onChange={(e) => onChange({ quote: e.target.value })} data-supplies-quote /></label>
      <div>
        <p className="text-xs font-medium">Facts these words support ({c.facts.length})</p>
        {c.facts.length ? <ul className="mt-1 flex flex-wrap gap-1.5" aria-label={`Facts of official line ${n}`}>{c.facts.map((f) => (
          <li key={f.fact} className="flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-xs" data-supplies-chip={f.fact}>
            <span>{label.get(f.fact) ?? f.fact}</span>
            <select className="rounded border-none bg-transparent text-xs text-text-muted" value={f.about} aria-label={`Whom "${label.get(f.fact) ?? f.fact}" is about`} onChange={(e) => onChange({ facts: c.facts.map((y) => (y.fact === f.fact ? { ...y, about: e.target.value as About } : y)) })}>
              {(Object.keys(ABOUT_WORDS) as About[]).map((a) => <option key={a} value={a}>{a === "holder" ? "the holder" : `about ${ABOUT_WORDS[a]}`}</option>)}
            </select>
            <button type="button" className="rounded p-0.5 hover:bg-text/10" aria-label={`Remove "${label.get(f.fact) ?? f.fact}"`} onClick={() => onChange({ facts: c.facts.filter((y) => y.fact !== f.fact) })}><X className="size-3" aria-hidden /></button>
          </li>
        ))}</ul> : <p className="mt-1 text-xs text-text-muted">None yet{n === 1 ? ": with no fact the document is filed as is" : ""}.</p>}
        <label className="mt-2 block text-xs font-medium">Add facts<Input className="mt-1" value={q} placeholder="Search shared fields by meaning" onChange={(e) => setQ(e.target.value)} data-supplies-search /></label>
        <ul className="mt-1 space-y-0.5" aria-label={q.trim() ? "Matching shared fields" : "Suggested shared fields"}>
          {!q.trim() && hits.length ? <li className="text-xs text-text-muted">Suggested: fields whose meaning names this document</li> : null}
          {hits.map((f) => <li key={f.key}><button type="button" className="w-full rounded px-2 py-1 text-left text-xs hover:bg-text/5 focus-visible:outline-2" onClick={() => { onChange({ facts: [...c.facts, { fact: f.key, about: "holder" }] }); setQ(""); }} data-supplies-pick={f.key}>+ {f.label}</button></li>)}
          {q.trim() && !hits.length ? <li className="text-xs text-text-muted">No shared field matches “{q.trim()}”.</li> : null}
        </ul>
      </div>
      {onRemove ? <Button size="sm" variant="ghost" onClick={onRemove}>Remove this line</Button> : null}
    </fieldset>
  );
}
