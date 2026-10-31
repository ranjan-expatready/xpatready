// S6 slice 1b (P-149 one door, P-121, P-123): the review queue. Waiting proposals grouped by form edition or
// combination, each group in Ready to accept · Check · Decide. A side panel shows both readings, IRCC's quote and the
// rules; Ready items are accepted together (at most 200, one Undo for 10 s); everything else is decided on its own.
// The batch page lets a second person approve or return what one decision landed on the library. The server checks
// every rule again (proposals.ts).
import * as React from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Check, ChevronRight, Undo2 } from "lucide-react";
import { BAND_TIPS, BAND_WORDS, BANDS, type Band, type ChangeBatch, type DecideResult, type ProposalsView, type QueueProposal } from "../../../contracts/review-proposals";
import { api, useAction, useActorId, useApi, useSessionView } from "@/lib/api";
import { Button, Notice, Panel, Pill, Table, Textarea } from "@/components/ui/controls";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtWhen, Tip, TipProvider } from "@/components/status";
import { cn } from "@/lib/utils";

const BAND_TONE: Record<Band, string> = { ready: "ok", check: "warn", decide: "danger" };
const inv = [["proposals"], ["review-queue"], ["catalogue"], ["change-batch"]];
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function Crumbs({ here }: { here: string }) {
  return <nav aria-label="Path" className="text-xs text-text-muted"><Link to="/review" className="hover:underline">To review</Link> › {here}</nav>;
}

export function ProposalsPage() {
  const [sp, setSp] = useSearchParams();
  const actor = useActorId();
  const asked = sp.get("group");
  // PR #108 minor (c): a setup checklist link names the combination and step; the server picks that group.
  const forCombo = !asked && sp.get("c") ? `?c=${encodeURIComponent(sp.get("c")!)}${sp.get("step") ? `&step=${encodeURIComponent(sp.get("step")!)}` : ""}` : "";
  const view = useApi<ProposalsView>(["proposals", actor, asked, forCombo], `/review/proposals${asked ? `?group=${encodeURIComponent(asked)}` : forCombo}`, { retry: false });
  const groups = view.data?.groups ?? [];
  // Without a group in the URL, the oldest group opens (one click less for the usual case).
  React.useEffect(() => { if (!asked && groups.length) setSp({ group: view.data?.group?.id ?? groups[0].id }, { replace: true }); }, [asked, groups.length]);
  const [open, setOpen] = React.useState<QueueProposal | null>(null);
  const [picked, setPicked] = React.useState<Set<string>>(new Set());
  const [undoable, setUndoable] = React.useState<{ batchId: string; n: number; until: number } | null>(null);
  React.useEffect(() => setPicked(new Set()), [asked]);

  const g = view.data?.group ?? null;
  const max = view.data?.batch_max ?? 200;
  const readyOk = (g?.bands.ready ?? []).filter((p) => !p.bulk_why);
  const decideMany = useAction((ids: string[]) => api<DecideResult>("/review/proposals/decide", { method: "POST", json: { ids, action: "accept" } }),
    { invalidate: inv, success: (r) => `Accepted ${plural(r.items.length, "proposal")}. New library items wait for a second person on To review.`, onDone: (r) => { setPicked(new Set()); setUndoable({ batchId: r.batchId, n: r.items.length, until: Date.now() + (view.data?.undo_seconds ?? 10) * 1000 }); } });

  // Lead review of PR #96 (5): the group's last item decided makes the group answer 404; its Undo stays offered here.
  if (view.isError && asked) return (
    <div className="mx-auto flex max-w-[1240px] flex-col gap-4">
      <Crumbs here="Proposals" />
      {undoable ? <UndoBar {...undoable} onGone={() => setUndoable(null)} /> : null}
      <Notice tone="info" title="Nothing waits in this group any more" action={<Link className="whitespace-nowrap text-text-link underline" to="/review/proposals">See every group</Link>}>{view.error.message}</Notice>
    </div>
  );
  return (
    <TipProvider>
      <div className="mx-auto flex max-w-[1240px] flex-col gap-4">
        <Crumbs here="Proposals" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Proposals</h1>
          <p className="mt-1 text-sm text-text-muted">What AI and the rules propose for the shared library and the combinations, one group per form edition or combination. Nothing changes until a person accepts; a new library item then waits for a second person.</p>
        </div>
        {undoable ? <UndoBar {...undoable} onGone={() => setUndoable(null)} /> : null}
        {view.isPending ? <Skeleton className="h-64" /> : view.isError ? <ErrorState title="The proposals could not be loaded" description={view.error.message} action={<Button variant="secondary" onClick={() => view.refetch()}>Try again</Button>} />
          : !groups.length ? <EmptyState title="Nothing to review" description="No proposal is waiting. New ones appear here when AI drafts a form or the rules propose an item." />
          : (
            <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
              <nav aria-label="Groups" className="flex flex-col gap-1.5">
                {groups.map((x) => (
                  <button key={x.id} type="button" aria-current={x.id === asked ? "true" : undefined} onClick={() => setSp({ group: x.id })}
                    className={cn("rounded-lg border px-3 py-2 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50", x.id === asked ? "border-primary bg-primary/5" : "border-border bg-surface-raised hover:bg-text/5")}>
                    <span className="block truncate text-sm font-semibold">{x.title}</span>
                    <span className="block text-xs text-text-muted">{x.kind === "edition" ? "Form edition" : x.kind === "combination" ? "Combination" : "Run"} · {plural(x.total, "proposal")}</span>
                    <span className="mt-1 flex flex-wrap gap-1">{BANDS.map((b) => x.counts[b] ? <Pill key={b} tone={BAND_TONE[b]}>{BAND_WORDS[b]} {x.counts[b]}</Pill> : null)}</span>
                  </button>
                ))}
              </nav>
              {g ? (
                <section aria-label={g.title} className="flex min-w-0 flex-col gap-4">
                  <div>
                    <h2 className="text-lg font-semibold">{g.title}</h2>
                    <p className="text-xs text-text-muted">{g.sub} · oldest {fmtWhen(g.oldest)}</p>
                  </div>
                  {BANDS.map((b) => (
                    <BandTable key={b} band={b} items={g.bands[b]} onOpen={setOpen} picked={picked} setPicked={setPicked} max={max}
                      bulk={b === "ready" && readyOk.length ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm text-text-muted" aria-live="polite">{picked.size ? `${plural(picked.size, "item")} chosen` : `${readyOk.length} can be accepted together`}{readyOk.length > max ? ` · at most ${max} at a time` : ""}</span>
                          <Button size="sm" variant="secondary" onClick={() => setPicked(new Set(readyOk.slice(0, max).map((p) => p.id)))}>Choose {readyOk.length > max ? `the first ${max}` : `all ${readyOk.length}`}</Button>
                          <Button size="sm" busy={decideMany.isPending} disabled={!picked.size} onClick={() => decideMany.mutate([...picked])}><Check className="size-4" aria-hidden />Accept {picked.size ? plural(picked.size, "item") : ""}</Button>
                        </div>) : null} />
                  ))}
                </section>
              ) : <Skeleton className="h-64" />}
            </div>
          )}
        {open ? <SidePanel p={open} onClose={() => setOpen(null)} onDone={(r, n) => { setOpen(null); if (r) setUndoable({ batchId: r.batchId, n, until: Date.now() + (view.data?.undo_seconds ?? 10) * 1000 }); }} /> : null}
      </div>
    </TipProvider>
  );
}

function BandTable({ band, items, onOpen, picked, setPicked, bulk, max }: { band: Band; items: QueueProposal[]; onOpen: (p: QueueProposal) => void; picked: Set<string>; setPicked: (s: Set<string>) => void; bulk: React.ReactNode; max: number }) {
  const toggle = (id: string) => { const n = new Set(picked); if (n.has(id)) n.delete(id); else if (n.size < max) n.add(id); setPicked(n); };
  return (
    <div className="flex flex-col gap-2" data-band={band}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold"><Tip tip={BAND_TIPS[band]} focusable><span><Pill tone={BAND_TONE[band]}>{BAND_WORDS[band]}</Pill></span></Tip><span className="tabular-nums text-text-muted">{items.length}</span></h3>
        {bulk}
      </div>
      {items.length ? (
        <Table dense label={`${BAND_WORDS[band]}: ${items.length}`} head={[band === "ready" ? <span className="sr-only">Choose</span> : "", "Proposal", "Kind", "Adds or reuses", band === "ready" ? "Reading" : "Why a person looks", ""]}>
          {items.map((p) => (
            <tr key={p.id} data-id={p.id}>
              <td className="w-8">{band === "ready" ? (p.bulk_why ? <Tip tip={p.bulk_why}><span className="text-xs text-text-muted">—</span></Tip>
                : <input type="checkbox" className="size-4 accent-[var(--color-primary)]" aria-label={`Choose ${p.title}`} checked={picked.has(p.id)} onChange={() => toggle(p.id)} />) : null}</td>
              <td className="max-w-[22rem]"><span className="font-medium">{p.title}</span>{p.meaning ? <span className="block truncate text-xs text-text-muted">{p.meaning}</span> : null}</td>
              <td><Pill>{p.kind_word}</Pill>{p.origin === "rules" ? <Pill className="ml-1" tone="info">Rules</Pill> : <Pill className="ml-1" tone="ai">AI</Pill>}</td>
              <td className="text-xs">{p.lands_on === "combination" ? "This combination" : p.reuse.match === "reuse" ? `Reuses ${p.reuse.existing_key}` : "New library item"}</td>
              <td className="max-w-[20rem] text-xs text-text-muted">{band === "ready" ? p.agreement_word : p.reason ?? p.agreement_word}</td>
              <td className="text-right">{p.decide_on ? <Link className="whitespace-nowrap text-sm text-text-link underline" to={p.decide_on}>Decide on its form-field page</Link>
                : <Button size="sm" variant="secondary" onClick={() => onOpen(p)} aria-label={`Open ${p.title}`}>Open<ChevronRight className="size-4" aria-hidden /></Button>}</td>
            </tr>
          ))}
        </Table>
      ) : <p className="rounded-lg border border-dashed border-border px-3 py-2 text-sm text-text-muted">None in this group.</p>}
    </div>
  );
}

function UndoBar({ batchId, n, until, onGone }: { batchId: string; n: number; until: number; onGone: () => void }) {
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => { const t = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(t); }, []);
  const left = Math.max(0, Math.ceil((until - now) / 1000));
  React.useEffect(() => { if (!left) onGone(); }, [left]);
  const undo = useAction(() => api(`/review/proposals/undo/${batchId}`, { method: "POST" }), { invalidate: inv, success: `Undone: ${plural(n, "proposal")} waiting again.`, onDone: onGone });
  return (
    <Notice tone="ok" title={`Decided ${plural(n, "proposal")}`} action={<Button size="sm" variant="secondary" busy={undo.isPending} onClick={() => undo.mutate(undefined)}><Undo2 className="size-4" aria-hidden />Undo ({left} s)</Button>}>
      New library items wait for a second person on To review. Undo is offered for {left} more second{left === 1 ? "" : "s"}.
    </Notice>
  );
}

function Reading({ label, r }: { label: string; r: QueueProposal["readings"]["draft"] }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2">
      <p className="text-xs font-medium text-text-muted">{label}{r ? ` · ${r.from === "live" ? "live" : "saved run"}` : ""}</p>
      <p className="mt-0.5 text-sm">{r ? r.text || "No words given." : "No reading."}</p>
    </div>
  );
}

function SidePanel({ p, onClose, onDone }: { p: QueueProposal; onClose: () => void; onDone: (r: DecideResult | null, n: number) => void }) {
  const [reason, setReason] = React.useState("");
  const run = useAction((b: { action: "accept" | "edit" | "reject"; payload?: unknown }) => api<DecideResult>("/review/proposals/decide", { method: "POST", json: { ids: [p.id], action: b.action, reason: reason.trim() || null, payload: b.payload } }),
    { invalidate: inv, success: (r) => (p.kind === "pqr_pick" ? (r.items[0]?.landedAs ? "Accepted: it is now asked in pre-qualification in this combination's draft, released with it." : "Rejected: it is not asked in pre-qualification.") : r.items[0]?.landedAs ? `Decided. It landed as ${r.items[0].landedAs}.` : "Decided."), onDone: (r) => onDone(r, 1) });
  const checkPayload = p.readings.check?.payload ?? null;
  const differ = p.agreement === "differ" && !!checkPayload;
  // Review m3 (f6): a pre-qualification pick ticks the combination's draft, which only a configuration author changes.
  const { canAuthor } = useSessionView();
  const authorOnly = p.kind === "pqr_pick" && !canAuthor;
  return (
    <Panel open onOpenChange={(o) => !o && onClose()} title={p.title} description={`${p.kind_word} · ${p.lands_on === "library" ? "shared library" : "this combination"}${p.basis === "SAMPLE" ? " · Sample until the immigration expert confirms" : ""}`}
      badge={<Pill tone={BAND_TONE[p.band]}>{BAND_WORDS[p.band]}</Pill>}
      footer={<>
        <Button variant="secondary" busy={run.isPending} disabled={reason.trim().length < 3} onClick={() => run.mutate({ action: "reject" })}>Reject</Button>
        <span className="flex flex-wrap gap-2">
          {differ ? <Button variant="secondary" busy={run.isPending} onClick={() => run.mutate({ action: "edit", payload: checkPayload })}>Accept the checker's reading</Button> : null}
          {authorOnly ? <span className="self-center text-xs text-text-muted" data-author-only>Only a configuration author accepts a pre-qualification pick.</span> : null}
          <Button busy={run.isPending} disabled={authorOnly} onClick={() => run.mutate({ action: "accept" })}>{differ ? "Accept the first reading" : "Accept"}</Button>
        </span>
      </>}>
      <div className="flex flex-col gap-4 text-sm">
        {p.reason ? <Notice tone={p.band === "decide" ? "danger" : "warn"} title="Why a person looks">{p.reason}</Notice> : null}
        {p.meaning ? <section><h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">What it means</h3><p className="mt-1">{p.meaning}</p></section> : null}
        <section aria-label="Both readings">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted"><Tip tip="AI reads the source twice: a first reading, then a checker that has not seen it. Items from the rules have no AI reading." focusable><span>Both readings</span></Tip> · {p.agreement_word}</h3>
          <div className="mt-1 grid gap-2">
            <Reading label="First reading" r={p.readings.draft} />
            <Reading label="Checker's reading" r={p.readings.check} />
          </div>
        </section>
        <section aria-label="IRCC's words">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">IRCC's words</h3>
          {p.source ? (
            <blockquote className="mt-1 rounded-lg border-l-4 border-primary bg-surface px-3 py-2">
              <p>“{p.source.quote}”</p>
              <footer className="mt-1 text-xs text-text-muted">{p.source.file}{p.source.edition ? ` · edition ${p.source.edition}` : ""}{p.source.page ? ` · page ${p.source.page}` : ""} · {p.source.quote_found ? "found in the file" : "not found in the file"}</footer>
              {p.source.rule ? <p className="mt-1 text-xs">Rule: {p.source.rule.sentence}</p> : null}
            </blockquote>
          ) : <p className="mt-1 text-text-muted">No quote: it comes from {p.origin === "rules" ? "the rules" : "the reading"} alone.</p>}
        </section>
        <section aria-label="Rules">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Rules</h3>
          {p.rules.length ? <ul className="mt-1 space-y-1">{p.rules.map((r) => <li key={r.rule} className="flex gap-2"><Pill tone={r.passed ? "ok" : "danger"}>{r.passed ? "Passed" : "Failed"}</Pill><span>{r.rule.replace(/_/g, " ")}{r.why ? `: ${r.why}` : ""}</span></li>)}</ul> : <p className="mt-1 text-text-muted">No rule ran on this item.</p>}
        </section>
        {p.near.length ? <section><h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Close to</h3><p className="mt-1">{p.near.join(", ")}</p>{p.near_reason ? <p className="text-xs text-text-muted">Why it is not the same: {p.near_reason}</p> : null}</section> : null}
        <div>
          <label className="block text-sm font-medium" htmlFor="proposal-reason">Reason (needed to reject; the producer learns from it)</label>
          <Textarea id="proposal-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="What is wrong with it" />
        </div>
      </div>
    </Panel>
  );
}

// ───────────────────────────────────────────── grouped second-person approval
export function ChangeBatchPage() {
  const { id } = useParams(); const nav = useNavigate(); const actor = useActorId();
  const b = useApi<ChangeBatch>(["change-batch", id, actor], `/review/changes/batch/${id}`, { retry: false });
  const [note, setNote] = React.useState("");
  const act = useAction((decision: "approve" | "return") => api<{ decided: unknown[]; refused: { label: string; why: string }[] }>(`/review/changes/batch/${id}`, { method: "POST", json: { decision, ...(note.trim() ? { note: note.trim() } : {}) } }),
    { invalidate: inv, success: (r) => `${plural(r.decided.length, "item")} decided${r.refused.length ? `; ${r.refused.length} refused: ${r.refused[0].label} (${r.refused[0].why})` : ""}.`, onDone: () => nav("/review") });
  if (b.isPending) return <Skeleton className="mx-auto h-64 max-w-[1240px]" />;
  if (b.isError) return <div className="mx-auto max-w-[1240px]"><ErrorState title="This decision could not be loaded" description={b.error.message} action={<Button variant="secondary" onClick={() => b.refetch()}>Try again</Button>} /></div>;
  const x = b.data!;
  return (
    <div className="mx-auto flex max-w-[1240px] flex-col gap-4">
      <Crumbs here="Library items from one decision" />
      <div>
        <div className="flex flex-wrap items-center gap-3"><h1 className="text-2xl font-bold tracking-tight">{plural(x.items.length, "new library item")} from one decision</h1><Pill tone="warn">Waiting for a second person</Pill></div>
        <p className="mt-1 text-sm text-text-muted">{x.by} accepted these on the review queue {fmtWhen(x.at)}. Approve them together, or return them with a reason. Nothing is released until a release includes them.</p>
      </div>
      <Table label="Items in this decision" head={["Item", "Kind", "Reason", "Status"]}>
        {x.items.map((c) => (
          <tr key={c.id}><td className="font-medium">{c.label}<span className="block text-xs text-text-muted">{c.key}</span></td><td>{c.kind_word}</td><td className="text-xs text-text-muted">{c.reason ?? "—"}</td><td><Pill tone={c.status === "WAITING" ? "warn" : "neutral"}>{c.status === "WAITING" ? "Waiting" : c.status.toLowerCase()}</Pill></td></tr>
        ))}
      </Table>
      {x.can_decide ? (
        <div className="space-y-2 rounded-lg border border-border bg-surface-raised p-4">
          <label className="block text-sm font-medium" htmlFor="batch-note">Reason (needed to return)</label>
          <Textarea id="batch-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="What the person who accepted them should know" />
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" disabled={act.isPending || note.trim().length < 3} onClick={() => act.mutate("return")}>Return {plural(x.count, "item")}</Button>
            <Button busy={act.isPending} onClick={() => act.mutate("approve")}>Approve {plural(x.count, "item")}</Button>
          </div>
        </div>
      ) : <Notice tone="info" title="You cannot decide these">{x.why_not}</Notice>}
    </div>
  );
}
