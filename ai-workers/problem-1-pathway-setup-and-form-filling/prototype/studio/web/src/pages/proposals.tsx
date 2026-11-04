// S6 slice 1b (P-149 one door, P-121, P-123): the review queue. Waiting proposals grouped by form edition or
// combination, each group in Ready to accept · Check · Decide. A side panel shows both readings, IRCC's quote and the
// rules; Ready items are accepted together (at most 200, one Undo for 10 s); everything else is decided on its own.
// The batch page lets a second person approve or return what one decision landed on the library. The server checks
// every rule again (proposals.ts).
import * as React from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Check, ChevronRight, Undo2 } from "lucide-react";
import { NearLine, ownReason, type NearView } from "@/components/near-line";
import { BAND_TIPS, BAND_WORDS, BANDS, type Band, type ChangeBatch, type DecideResult, type ProposalsView, type QueueProposal } from "../../../contracts/review-proposals";
import { api, useAction, useActorId, useApi } from "@/lib/api";
import { Button, Input, Notice, Panel, Pill, Select, Table, Textarea } from "@/components/ui/controls";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtWhen, Tip, TipProvider } from "@/components/status";
import { cn } from "@/lib/utils";

const BAND_TONE: Record<Band, string> = { ready: "ok", check: "warn", decide: "danger" };
const inv = [["proposals"], ["review-queue"], ["catalogue"], ["change-batch"], ["fact-sources"], ["pqr-country"]]; // C4.7: a pick ticks a question
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
/** QA-196: a shared yes/no answer in words; an answer-list value by its key. */
const answerWord = (v: string) => (v === "true" ? "Yes (true)" : v === "false" ? "No (false)" : v);

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
            <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
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
                          <Button size="sm" variant="secondary" data-choose-all onClick={() => setPicked(new Set(readyOk.slice(0, max).map((p) => p.id)))}>Choose {readyOk.length > max ? `the first ${max}` : `all ${readyOk.length}`}</Button>
                          {/* C11.14 (P-121): Deselect all within the group, as Choose all selects within it. */}
                          <Button size="sm" variant="ghost" disabled={!picked.size} onClick={(e) => { const band = e.currentTarget.closest("[data-band]"); setPicked(new Set()); requestAnimationFrame(() => band?.querySelector<HTMLButtonElement>("[data-choose-all]")?.focus()); }}>Clear the choice</Button>
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
              <td className="w-8">{band === "ready" ? (p.bulk_why ? <Tip tip={p.bulk_why} focusable><span className="text-xs text-text-muted" role="img" aria-label="Cannot be ticked with others">—</span></Tip>
                : <input type="checkbox" className="size-4 accent-[var(--color-primary)]" aria-label={`Choose ${p.title}`} checked={picked.has(p.id)} onChange={() => toggle(p.id)} />) : null}</td>
              <td className="max-w-[22rem]"><span className="font-medium">{p.title}</span>{p.meaning ? <span className="block truncate text-xs text-text-muted">{p.meaning}</span> : null}</td>
              <td><Pill>{p.kind_word}</Pill>{p.origin === "rules" ? <Pill className="ml-1" tone="info">Rules</Pill> : <Pill className="ml-1" tone="ai">AI</Pill>}</td>
              <td className="text-xs">{p.lands_on === "combination" ? "This combination" : p.reuse.match === "reuse" ? (p.reuse.existing_key ? `Reuses ${p.reuse.existing_key}` : "Same item as drafted for another form (the first accepted adds it)") : "New library item"}</td>
              <td className="max-w-[20rem] text-xs text-text-muted">{band === "ready" ? p.agreement_word : p.reason ?? p.agreement_word}</td>
              <td className="text-right">{p.decide_on ? <Link className="whitespace-nowrap text-sm text-text-link underline" to={p.decide_on}>Decide on its {p.step === "checklist_draft" ? "checklist" : "form-field"} page</Link>
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

// A rules item's reading is the rules' own reading of the file, never an AI run (C3.4 review Minor 2).
function Reading({ label, r, rules = false }: { label: string; r: QueueProposal["readings"]["draft"]; rules?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2">
      <p className="text-xs font-medium text-text-muted">{label}{r ? ` · ${rules ? "rules, US$0" : r.from === "live" ? "Live" : "Saved"}` : ""}</p>
      <p className="mt-0.5 text-sm">{r ? r.text || "No words given." : "No reading."}</p>
    </div>
  );
}

function SidePanel({ p, onClose, onDone }: { p: QueueProposal; onClose: () => void; onDone: (r: DecideResult | null, n: number) => void }) {
  const [reason, setReason] = React.useState("");
  const run = useAction((b: { action: "accept" | "edit" | "reject"; payload?: unknown }) => api<DecideResult>("/review/proposals/decide", { method: "POST", json: { ids: [p.id], action: b.action, reason: reason.trim() || null, payload: b.payload } }),
    { invalidate: inv, success: (r) => (r.items[0]?.landedAs ? `Decided. It landed as ${r.items[0].landedAs}.` : "Decided."), onDone: (r) => onDone(r, 1) });
  const checkPayload = p.readings.check?.payload ?? null;
  const differ = p.agreement === "differ" && !!checkPayload;
  // QA-196 (tech lead, 4 Nov): a form check warns unless the person makes it a serious warning before Accept (an edit).
  const asRead = ((p.readings.draft?.payload ?? null) as { severity?: string } | null)?.severity ?? "warn";
  const [severity, setSeverity] = React.useState(asRead);
  const withSeverity = (payload: unknown) => (p.kind === "form_check" && payload && typeof payload === "object" ? { ...payload, severity } : payload);
  // QA-206 (P-158, PRODUCT §4): a section with no printed heading on the form is accepted only under a name a person types
  // here (an edit of its name); its placeholder name is never accepted (the API refuses it too).
  // Devin review on #883: a rules-pass section drafted before printed headings were read has no "printed_heading" result
  // and may carry the PDF's part name: it is named here too, and may keep its name once a person has typed it.
  const legacy = p.kind === "section" && p.origin === "rules" && p.step === "masters_edition" && !(p.reuse.match === "reuse" && !!p.reuse.existing_key) && !p.rules.some((r) => r.rule === "printed_heading");
  const unnamed = (p.kind === "section" && p.rules.some((r) => r.rule === "printed_heading" && !r.passed)) || legacy;
  const [name, setName] = React.useState("");
  const flat = (x: string) => x.normalize("NFKC").toLocaleLowerCase("en-CA").replace(/[^\p{L}\p{N}\p{M}]+/gu, "");
  const named = flat(name).length >= 2 && !flat(name).startsWith("unnamedsection") && (legacy || flat(name) !== flat(p.title));
  // A twin waiting on another form's copy (a reuse with no key yet): only the studio knows whether it lands on that copy's
  // item, so Accept stays on with no name typed and the studio answers (it refuses in words when it would add the name).
  const twinOpen = legacy && p.reuse.match === "reuse";
  const acceptFirst = () => (unnamed && !(twinOpen && !name.trim()) ? run.mutate({ action: "edit", payload: { ...(p.readings.draft?.payload as object), label: name.trim() } })
    : p.kind === "form_check" && severity !== asRead ? run.mutate({ action: "edit", payload: withSeverity(p.readings.draft?.payload) }) : run.mutate({ action: "accept" }));
  return (
    <Panel open onOpenChange={(o) => !o && onClose()} title={p.title} description={`${p.kind_word} · ${p.reads && p.lands_on === "library" ? "every combination that files this form" : p.lands_on === "library" ? "shared library" : "this combination"}${p.basis === "SAMPLE" ? " · Sample until the immigration expert confirms" : ""}`}
      badge={<Pill tone={BAND_TONE[p.band]}>{BAND_WORDS[p.band]}</Pill>}
      footer={<>
        <Button variant="secondary" busy={run.isPending} disabled={reason.trim().length < 3} onClick={() => run.mutate({ action: "reject" })}>Reject</Button>
        <span className="flex flex-wrap gap-2">
          {differ ? <Button variant="secondary" busy={run.isPending} disabled={!!p.near_reason_needed_check && reason.trim().length < 8} aria-describedby={p.near_reason_needed_check && reason.trim().length < 8 ? "accept-needs-reason" : undefined} onClick={() => run.mutate({ action: "edit", payload: withSeverity(checkPayload) })}>Accept the checker's reading</Button> : null}
          <Button busy={run.isPending} disabled={(!!p.near_reason_needed && reason.trim().length < 8) || (unnamed && !named && !(twinOpen && !name.trim()))} aria-describedby={unnamed && !named ? "accept-needs-name" : p.near_reason_needed && reason.trim().length < 8 ? "accept-needs-reason" : undefined} onClick={acceptFirst}>{differ ? "Accept the first reading" : unnamed ? "Accept with this name" : "Accept"}</Button>
        </span>
      </>}>
      <div className="flex flex-col gap-4 text-sm">
        {p.reason ? <Notice tone={p.band === "decide" ? "danger" : "warn"} title="Why a person looks">{p.reason}</Notice> : null}
        {unnamed ? (
          <div>
            <label className="block text-sm font-medium" htmlFor="section-name">Section name (as a client will read it)</label>
            <Input id="section-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} className="mt-1" placeholder="For example: Your visit" aria-describedby="accept-needs-name" />
            <p id="accept-needs-name" className="mt-1 text-xs text-text-muted">{named ? "It is accepted under this name." : legacy ? "Accept stays off until you type the section's name: it was drafted before the form's printed headings were read, so its name may be the PDF's own part name (type it again if it is right)." : "Accept stays off until you give the section a name (the reason above says why the form gives none)."}</p>
          </div>
        ) : null}
        {p.meaning ? <section><h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">What it means</h3><p className="mt-1">{p.meaning}</p></section> : null}
        {p.values?.length ? <section aria-label="Answer values" data-answer-values><h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Answer values · {p.values.length}</h3><ul className="mt-1 list-disc pl-5">{p.values.map((v) => <li key={v.code}>{v.label}</li>)}</ul></section> : null}
        {p.reads ? (
          <section aria-label="What it reads" data-check-reads>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">What it reads</h3>
            <ul className="mt-1 space-y-1.5">{p.reads.map((x) => (
              <li key={x.field} className="flex flex-wrap items-center gap-x-2" data-read={x.shared ?? ""}>
                <span>{x.words}</span><span aria-hidden className="text-text-muted">→</span>
                {x.shared ? <span><span className="sr-only">reads the shared field </span>{x.shared_words} <span className="text-xs text-text-muted">{x.shared}</span></span>
                  : <Pill tone="warn">{p.lands_on === "library" ? "Not mapped to a shared field yet" : "Not in the library yet: read in words"}</Pill>}
                {x.values.length ? (
                  <span className="basis-full text-xs text-text-muted" data-read-values>
                    {x.values.map((v, i) => <span key={v.printed} className="mr-2">{i ? "· " : ""}“{v.printed}” → {v.shared !== null ? <span className="font-medium text-text">{answerWord(v.shared)}</span> : <span className="font-medium text-text">no answer of the shared field yet</span>}</span>)}
                  </span>
                ) : null}
              </li>))}
            </ul>
            {p.lands_on === "library" && p.reads.some((x) => !x.shared || x.values.some((v) => v.shared === null)) ? (
              <p className="mt-1 text-xs text-text-muted">It cannot be accepted until each form field is mapped and each choice is an answer of its shared field: draft and apply the form's field map from <Link className="text-text-link underline" to="/library/forms">Shared library › Forms</Link>.</p>
            ) : null}
          </section>
        ) : null}
        {p.kind === "form_check" ? (
          <div>
            <label className="block text-sm font-medium" htmlFor="check-severity">When it fires</label>
            <Select id="check-severity" value={severity} onChange={(e) => setSeverity(e.target.value)} className="mt-1 max-w-xs">
              <option value="warn">Warns</option>
              <option value="block">Serious warning</option>
            </Select>
          </div>
        ) : p.kind === "cross_check" ? <p className="text-xs text-text-muted">A check that compares two answers or more only warns.</p> : null}
        <section aria-label="Both readings">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted"><Tip tip="AI reads the source twice: a first reading, then a checker that has not seen it. Items from the rules have no AI reading." focusable><span>Both readings</span></Tip> · {p.agreement_word}</h3>
          <div className="mt-1 grid gap-2">
            <Reading label="First reading" r={p.readings.draft} rules={p.origin === "rules"} />
            <Reading label="Checker's reading" r={p.readings.check} rules={p.origin === "rules"} />
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
        {p.near.length ? <section><h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Close to</h3><p className="mt-1">{p.near.join(", ")}</p>{p.near_reason ? <p className="text-xs text-text-muted">{p.near_reason_needed ? `Why ${p.origin === "ai" ? "the AI" : "the rules"} found it close: ${p.near_reason}` : `Why it is not the same: ${p.near_reason}`}</p> : null}</section> : null}
        <div>
          {/* QA-192 (P-120): a near duplicate is accepted only with a person's one-line reason, shown at release. */}
          <label className="block text-sm font-medium" htmlFor="proposal-reason">{p.near_reason_needed || p.near_reason_needed_check ? "Reason (needed to accept, 8 characters or more: why it is not the same as the item it is close to; the second person sees it at release. Also needed to reject)" : "Reason (needed to reject; the producer learns from it)"}</label>
          {(p.near_reason_needed || p.near_reason_needed_check) && reason.trim().length < 8 ? <p id="accept-needs-reason" className="mt-1 text-xs text-text-muted">{p.near_reason_needed && p.near_reason_needed_check ? "Accept" : p.near_reason_needed ? "Accept (this reading)" : "Accepting the checker's reading"} stays off until you write why it is not the same (8 characters or more).</p> : null}
          <Textarea id="proposal-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder={p.near_reason_needed || p.near_reason_needed_check ? "Why it is not the same as the item it is close to" : "What is wrong with it"} />
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
        {(x.items as (ChangeBatch["items"][number] & { near?: NearView | null })[]).map((c) => ( // C11.13: near, beside the contract's view
          <tr key={c.id}><td className="font-medium">{c.label}<span className="block text-xs text-text-muted">{c.key}</span></td><td>{c.kind_word}</td><td className="text-xs text-text-muted">{ownReason(c) ?? (c.near ? null : "—")}<NearLine near={c.near} /></td><td><Pill tone={c.status === "WAITING" ? "warn" : "neutral"}>{c.status === "WAITING" ? "Waiting" : c.status.toLowerCase()}</Pill></td></tr>
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
