// To review (Screen 02 slice 1, P-79; board view 1): everything that waits for a person, first under Configure. One
// request per view (GET /review-queue); the view, kind and search live in the URL. Each row shows only the step the
// person acting can take; the endpoint behind the step checks it again (BR-9).
import * as React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { keepPreviousData } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { KIND_WORDS, QUEUE_KINDS, type QueueItem, type QueueKind, type ReviewQueue } from "../../../contracts/review-queue";
import { ApiError, useActorId, useApi, useSessionView } from "@/lib/api";
import { Button, Input, Notice, Pill } from "@/components/ui/controls";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtWhen, Tip, TipProvider } from "@/components/status";
import { cn } from "@/lib/utils";
import { normaliseCode } from "../../../contracts/form-library";
import { withReturn } from "@/pages/workspace/setup-rail";

const VIEWS = [["needs", "Needs you"], ["waiting", "Waiting for others"], ["running", "Running"], ["all", "All"]] as const;
const KIND_TONE: Record<QueueKind, string> = { setup: "warn", proposals: "ai", ai_proposals: "ai", release: "info", library_change: "info", form_fields: "warn", new_edition: "warn", held_file: "warn", merge: "neutral", running: "ai" };
const STATE: Record<QueueItem["state"], [string, string]> = { needs: ["warn", "Needs you"], waiting: ["neutral", "Waiting for others"], running: ["ai", "Running"] };

export function ToReviewPage() {
  const [sp, setSp] = useSearchParams();
  const actor = useActorId();
  const { known } = useSessionView();
  const filter = (VIEWS.find(([k]) => k === sp.get("f"))?.[0] ?? "needs") as (typeof VIEWS)[number][0];
  const kind = (QUEUE_KINDS as readonly string[]).includes(sp.get("kind") ?? "") ? (sp.get("kind") as QueueKind) : null;
  const q = sp.get("q") ?? "";
  // C2.12 (concept m2, K1): opened from a form's guided path, the list is that form's items (?form=), on that combination
  // (?c=) as the path counts them; "Show every form" clears both. The API checks the number (400 in words).
  // Review m7: the number as the library writes it ("imm5257" → "IMM 5257"), as the strip and the API say it.
  const asked = sp.get("form")?.trim() || null;
  const form = asked ? (asked.length <= 40 ? normaliseCode(asked) : asked) : null;
  const heading = React.useRef<HTMLHeadingElement>(null);
  // Review m5 (WCAG 2.4.3): after "Show every form" the button is gone; focus goes to the page's heading, not the body.
  const showEvery = () => { set({ form: null, c: null }); requestAnimationFrame(() => heading.current?.focus()); };
  const combo = form ? sp.get("c")?.trim() || null : null;
  const [typed, setTyped] = React.useState(q);
  React.useEffect(() => setTyped(q), [q]);
  React.useEffect(() => { const t = setTimeout(() => { if (typed !== q) set({ q: typed || null }); }, 150); return () => clearTimeout(t); }, [typed]);
  const list = useApi<ReviewQueue>(["review-queue", actor, filter, kind, q, form, combo], `/review-queue?filter=${filter}${kind ? `&kind=${kind}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}${form ? `&form=${encodeURIComponent(form)}` : ""}${combo ? `&combination=${encodeURIComponent(combo)}` : ""}`,
    { placeholderData: keepPreviousData, refetchInterval: (x) => ((x.state.data?.counts.running ?? 0) > 0 ? 3000 : false) });
  function set(p: Record<string, string | null>) {
    setSp((prev) => { const n = new URLSearchParams(prev); for (const [k, v] of Object.entries(p)) { if (v === null || v === "") n.delete(k); else n.set(k, v); } return n; }, { replace: true });
  }
  const d = list.data;
  const kinds = QUEUE_KINDS.filter((k) => d?.kinds[k]);

  return (
    <TipProvider>
      <div className="mx-auto flex max-w-[1240px] flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 ref={heading} tabIndex={-1} className="text-2xl font-bold tracking-tight outline-none">To review</h1>
          <span className="flex-1" />
          <div className="relative w-full sm:w-[22rem]">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-text-muted" aria-hidden />
            <Input maxLength={120} className="pl-8 pr-9" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Search forms, combinations, fields" aria-label="Search the items to review" />
            {typed ? <button type="button" className="absolute right-1 top-1 rounded p-1.5 text-text-muted hover:bg-text/5" aria-label="Clear search" onClick={() => { setTyped(""); set({ q: null }); }}><X className="size-4" /></button> : null}
          </div>
        </div>
        <p className="-mt-2 text-sm text-text-muted">Everything that waits for a person: problems that block a combination's release, AI proposals, combinations to review and release, new editions, held files and merges. Nothing reaches a release until a person decides.</p>

        {form ? <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 text-sm" data-form-filter={form}>
          <span>Only <b className="font-semibold">{form.length > 40 ? `${form.slice(0, 40)}…` : form}</b>{combo ? " on this combination, and the shared library's items for it" : ", on every combination"}.</span>
          <span className="flex-1" />
          <Button size="sm" variant="secondary" onClick={showEvery}>Show every form</Button>
        </div> : null}

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Show items">
            {VIEWS.map(([k, word]) => {
              const on = filter === k;
              return (
                <button key={k} type="button" aria-pressed={on} onClick={() => set({ f: k === "needs" ? null : k })}
                  className={cn("h-8 rounded-full border px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50", on ? "border-primary bg-primary font-semibold text-white" : "border-border bg-surface-raised text-text hover:bg-text/5")}>
                  {word} · <span className="tabular-nums">{d?.counts[k] ?? "…"}</span>
                </button>
              );
            })}
          </div>
          <label className="flex h-8 items-center gap-1.5 rounded-full border border-border bg-surface-raised pl-3 pr-1 text-sm">
            <span className="text-text-muted">Kind</span>
            <select className="bg-transparent pr-1 text-sm font-medium" value={kind ?? ""} onChange={(e) => set({ kind: e.target.value || null })} aria-label="Kind of item">
              <option value="">All</option>
              {(kind && !kinds.includes(kind) ? [...kinds, kind] : kinds).map((k) => <option key={k} value={k}>{KIND_WORDS[k]} ({d?.kinds[k] ?? 0})</option>)}
            </select>
          </label>
        </div>

        {list.isError ? (form && list.error instanceof ApiError && list.error.status === 400
            // C2.12: a form number the studio refuses (too long, empty) is said in its words, with the way out, not "Try again".
            // Review m3: the title names what was refused (the combination reference or the form number).
            ? <Notice tone="danger" title={list.error.field("combination") ? "This combination reference is not one the studio reads" : "This form number is not one the studio reads"} action={<Button size="sm" variant="secondary" onClick={showEvery}>Show every form</Button>}>{list.error.message}</Notice>
            : <Notice tone="danger" title="The list could not be loaded" action={<Button size="sm" variant="secondary" onClick={() => void list.refetch()}>Try again</Button>}>{(list.error as Error).message} Your decisions so far are saved.</Notice>)
          : list.isLoading || !known ? <div className="space-y-2 rounded-lg border border-border bg-surface-raised p-4" aria-busy="true" aria-label="Loading items to review">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-12 w-full" />)}<span className="sr-only" role="status">Loading items to review</span></div>
          : !d!.items.length ? (
            form && !q && !kind ? <EmptyState title={`Nothing for ${form.length > 40 ? `${form.slice(0, 40)}…` : form} in ${VIEWS.find(([k]) => k === filter)![1]}`} description={`${filter !== "all" && d!.counts.all ? `${d!.counts.all} other item${d!.counts.all === 1 ? "" : "s"} of this form ${d!.counts.all === 1 ? "is" : "are"} under All. ` : ""}Items of other forms are not shown.`} action={<Button variant="secondary" onClick={showEvery}>Show every form</Button>} />
            : q || kind ? <EmptyState title="Nothing matches" description={`No item ${q ? `matches "${q}"` : ""}${q && kind ? " and " : ""}${kind ? `is a ${KIND_WORDS[kind].toLowerCase()}` : ""} in ${VIEWS.find(([k]) => k === filter)![1]}.`} action={<Button variant="secondary" onClick={() => { setTyped(""); set({ q: null, kind: null, f: "all" }); }}>Show all</Button>} />
              // UX-A part 2: never "Nothing waits for you" while a combination's release is blocked (someone else fixes it).
              : filter === "needs" ? <EmptyState title={d!.blocked ? `Nothing waits for you, but ${d!.blocked} combination${d!.blocked === 1 ? " has problems" : "s have problems"} to fix before release` : d!.notSetUp ? `Nothing waits for you, but ${d!.notSetUp} combination${d!.notSetUp === 1 ? " has" : "s have"} nothing to release yet` : "Nothing waits for you"}
                  // UX-A part 2 (review M3, n4): never a bare "Nothing waits for you" beside a red "to fix"; an empty draft's
                  // next step is a building step, found on Immigration programs.
                  description={`${d!.blocked ? "Their problems are fixed by the configuration author: see them under Waiting for others." : d!.notSetUp ? `${d!.notSetUp === 1 ? "Its" : "Their"} next step is on Immigration programs: set up the forms it files.` : "Reviews, confirmations and the problems that block a release appear here when they are yours."}${d!.counts.waiting ? ` ${d!.counts.waiting} item${d!.counts.waiting === 1 ? " waits" : "s wait"} for someone else.` : ""}`}
                  action={d!.blocked ? <Button variant="secondary" onClick={() => set({ f: "waiting" })}>Show Waiting for others</Button> : <Button asChild variant="secondary"><Link to="/">Open Immigration programs</Link></Button>} />
              : <EmptyState title={filter === "running" ? "No AI work is running" : filter === "waiting" ? "Nothing waits for someone else" : "Nothing to review"} description="Items appear here as sources are added, drafted and submitted." />
          ) : <Rows items={d!.items} way={form && combo ? { form, combo } : null} />}
        {d?.items.length ? <p className="text-xs text-text-muted">Oldest first within each group. Each row shows only the step you can take; the studio checks it again when you take it.</p> : null}
        {d ? <p className="sr-only" role="status">{d.items.length} item{d.items.length === 1 ? "" : "s"} shown</p> : null}
      </div>
    </TipProvider>
  );
}

function Rows({ items, way }: { items: QueueItem[]; way: { form: string; combo: string } | null }) {
  return (
    // QA-113: at 1024 px the box is about 735 px wide; a 760 px floor scrolled sideways and cut "Item". The columns wrap
    // down to 640 px, and only a narrower window scrolls.
    <div className="overflow-x-auto rounded-lg border border-border bg-surface-raised">
      <table className="w-full min-w-[640px] text-sm" aria-label="Items to review">
        <thead><tr className="border-b border-border bg-surface text-left text-text-muted">
          <th scope="col" className="px-4 py-2.5 font-semibold">Item</th><th scope="col" className="px-4 py-2.5 font-semibold">What and why</th>
          <th scope="col" className="px-4 py-2.5 font-semibold">Status</th><th scope="col" className="px-4 py-2.5 font-semibold">AI cost</th><th scope="col" className="px-4 py-2.5 font-semibold">Next step</th>
        </tr></thead>
        <tbody>
          {items.map((i) => {
            const [tone, word] = STATE[i.state];
            return (
              <tr key={i.id} data-item={i.id} data-kind={i.kind} data-state={i.state} className="border-b border-border align-top last:border-b-0">
                <td className="min-w-[220px] px-4 py-3"><Pill tone={KIND_TONE[i.kind]}>{KIND_WORDS[i.kind]}</Pill><p className="mt-1 break-words font-semibold">{i.title}</p>{i.by ? <p className="text-xs text-text-muted">{i.by} · {fmtWhen(i.at)}</p> : null}</td>
                <td className="max-w-[420px] px-4 py-3 text-text-muted">{i.what}</td>
                <td className="px-4 py-3"><Pill tone={tone}>{word}</Pill>{i.waiting_on ? <p className="mt-1 max-w-[220px] text-xs text-text-muted">{i.waiting_on}</p> : null}</td>
                <td className="whitespace-nowrap px-4 py-3 text-xs">{i.cost_usd === null ? "—" : `US$${i.cost_usd.toFixed(2)}`}</td>
                <td className="px-4 py-3" data-next>{!i.next ? <span className="text-xs text-text-muted">No step for you</span>
                  : i.next.href ? <><Link className="rounded font-semibold text-text-link outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50" to={way ? withReturn(i.next.href, way.form, way.combo) : i.next.href}>{i.next.label}</Link>{i.next.note ? <p className="mt-1 max-w-[220px] text-xs text-text-muted">{i.next.note}</p> : null}</>
                  : <Tip tip={i.next.note ?? ""}><span tabIndex={0} className="cursor-help font-semibold text-text-muted outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">{i.next.label} <span className="text-xs font-normal">(not built yet)</span></span></Tip>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
