// Programs (Screen 01, Layout v2, P-35, P-49, P-50; journey board steps 1–2): one flat list, one row per combination,
// in Program › Category › Sub-category order (route steps in step order) unless sorted by status. Three columns:
// Combination (the path on two lines), Status (In setup · Not ready · Live), Next step. "Needs work" is the default
// view, then Live and All, each with its count. A row opens the combination page (no side panel, P-50); Back returns
// to this view with the opened row highlighted and the scroll where it was. One request per view (GET /catalogue);
// the view lives in the URL.
import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, Info, Plus, Search, TriangleAlert, X } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import type { CatalogueLeaf, CatalogueResponse, NextAction } from "../../../contracts/programs";
import { api, useApi, useSessionView, useToast } from "@/lib/api";
import { Button, Input, Notice } from "@/components/ui/controls";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { SHOW_ONLY_STEPS, StepLabel, StepTip, useNextStep } from "@/components/next-step";
import { StatusChip, Tip, TipProvider } from "@/components/status";
import { cn } from "@/lib/utils";

/** Where Back on a combination page returns to: this list's URL (with the opened row) and its scroll position. */
export const CATALOGUE_URL_KEY = "xr-catalogue-url";
export const CATALOGUE_SCROLL_KEY = "xr-catalogue-scroll";
export const PATHWAY_LABEL: Record<string, string> = { INDIVIDUAL: "Individual", CORPORATE: "Corporate and employers" };
export const STATUS_WORD = { IN_SETUP: "In setup", NOT_READY: "Not ready", READY: "Live" } as const;
const VIEWS = [["needs", "Needs work"], ["live", "Live"], ["all", "All"]] as const;
// Below 640 px (a phone, or 200 % zoom on a small screen) the next step moves under the name and status, so the
// combination's name keeps its width (QA-9 scale check: at 390 px the fixed columns left it 0 px wide).
const GRID = "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 sm:grid-cols-[minmax(0,1fr)_128px_210px] sm:gap-y-3";

/** Remembers the list as it is now, with this row as the one to highlight on Back: the page's own "Programs" link and
 *  the browser's Back button (the list's history entry gets the row too; review should 5). */
export function rememberList(nodeKey: string) {
  try {
    const u = new URL(location.href); u.searchParams.set("sel", nodeKey);
    if (u.pathname === "/") window.history.replaceState(window.history.state, "", `${u.pathname}${u.search}`);
    sessionStorage.setItem(CATALOGUE_URL_KEY, `${u.pathname}${u.search}`);
    sessionStorage.setItem(CATALOGUE_SCROLL_KEY, String(Math.round(window.scrollY)));
  } catch { /* private window: Back still opens the list */ }
}

export function ProgramsPage() {
  const [sp, setSp] = useSearchParams();
  const nav = useNavigate(); const qc = useQueryClient(); const toast = useToast();
  // Until the person is known the page is loading (QA-22): an author must not read "a configuration author adds…" first.
  const { known: knowsPerson, failed: noPerson, canAuthor } = useSessionView();
  const pathway = sp.get("pw") === "CORPORATE" ? "CORPORATE" : "INDIVIDUAL";
  const filter = sp.get("f") === "all" ? "all" : sp.get("f") === "live" ? "live" : "needs";
  const program = sp.get("prog") ?? "", under = sp.get("under") ?? "";
  const sort = sp.get("sort") === "status" ? "status" : sp.get("sort") === "-status" ? "-status" : "path";
  const q = sp.get("q") ?? "";
  const sel = sp.get("sel");
  const [typed, setTyped] = React.useState(q);
  React.useEffect(() => setTyped(q), [q]);
  React.useEffect(() => { const t = setTimeout(() => { if (typed !== q) set({ q: typed || null }); }, 120); return () => clearTimeout(t); }, [typed]);
  const search = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); search.current?.focus(); search.current?.select(); } };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, []);
  const cat = useApi<CatalogueResponse>(["catalogue", pathway, filter, q, program, under, sort], `/catalogue?pathway=${pathway}&filter=${filter}&q=${encodeURIComponent(q)}&program=${encodeURIComponent(program)}&under=${encodeURIComponent(under)}&sort=${sort}`,
    { placeholderData: keepPreviousData, refetchInterval: (x) => ((x.state.data?.rows ?? []).some((r) => r.aiRunning) ? 3000 : false) });

  // Always from the current URL, never a render's copy: the search box's delayed update must not undo a newer change.
  function set(p: Record<string, string | null>) {
    setSp((prev) => {
      const n = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(p)) { if (v === null || v === "") n.delete(k); else n.set(k, v); }
      n.delete("sel"); // a changed view clears the Back highlight
      return n;
    }, { replace: true });
  }
  const rows: CatalogueLeaf[] = cat.data?.rows ?? [];

  // Back from a combination: the opened row is highlighted and the list is where it was (saved scroll, else the row).
  const restored = React.useRef(false);
  React.useEffect(() => {
    if (restored.current || !sel || !cat.data) return;
    restored.current = true;
    let y: number | null = null;
    try { const v = sessionStorage.getItem(CATALOGUE_SCROLL_KEY); y = v === null ? null : Number(v); sessionStorage.removeItem(CATALOGUE_SCROLL_KEY); } catch { /* ignore */ }
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`[data-node="${CSS.escape(sel)}"]`);
      if (y !== null && !Number.isNaN(y)) window.scrollTo({ top: y }); else el?.scrollIntoView({ block: "center" });
      el?.focus({ preventScroll: true });
    });
  }, [sel, cat.data]);

  const open = async (leaf: CatalogueLeaf, suffix = "") => {
    rememberList(leaf.nodeKey);
    if (leaf.combinationId) return nav(`/c/${leaf.combinationId}${suffix}`);
    if (!canAuthor) return toast.push({ tone: "info", text: `${leaf.label} is not started yet. A configuration author starts it.` });
    try { const r = await api("/combinations", { method: "POST", json: { nodeKey: leaf.nodeKey } }); void qc.invalidateQueries(); return nav(`/c/${r.combination.id}${suffix}`); }
    catch (e) { return toast.push({ tone: "danger", text: (e as Error).message }); }
  };
  const step = useNextStep(open, (leaf) => rememberList(leaf.nodeKey));
  const progLabel = (cat.data?.programs ?? []).find((p) => p.key === (cat.data?.program ?? program))?.label;
  const underLabel = (cat.data?.underPath ?? []).join(" › ");
  const scoped = progLabel ?? (underLabel || null);

  return (
    <TipProvider>
      <div className="mx-auto flex max-w-[1240px] flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Programs</h1>
          <Tip tip="Each row is one application a firm can open: Program › Category › Sub-category. Status is calculated: Live means firms can open cases on it.">
            <button type="button" className="inline-flex cursor-help rounded-full text-text-muted outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50" aria-label="About this page"><Info className="size-4" aria-hidden /></button>
          </Tip>
          <span className="flex-1" />
          <div className="relative w-full sm:w-[24rem]">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-text-muted" aria-hidden />
            <Input ref={search} maxLength={120} className="pl-8 pr-14" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Search names, form codes, documents" aria-label="Search combinations, form codes and documents" aria-keyshortcuts="Meta+K Control+K" />
            {typed ? <button type="button" className="absolute right-1 top-1 rounded p-1.5 text-text-muted hover:bg-text/5" aria-label="Clear search" onClick={() => { setTyped(""); set({ q: null }); }}><X className="size-4" /></button>
              : <kbd className="pointer-events-none absolute right-2 top-2 rounded border border-border px-1.5 text-xs text-text-muted">⌘K</kbd>}
          </div>
          <Tip tip={!knowsPerson ? "Loading…" : noPerson ? "The studio could not tell who you are: see the notice above, then reload." : canAuthor ? "Build the path Program › Category › Sub-category, picking what exists or creating what is missing." : "Only a configuration author can create combinations. Switch to the Configuration author."}>
            <span><Button disabled={!canAuthor} onClick={() => nav(`/new${pathway === "CORPORATE" ? "?pw=CORPORATE" : ""}`)}><Plus /> New combination</Button></span>
          </Tip>
        </div>

        <PathwaySwitch value={pathway} pathways={cat.data?.pathways} onChange={(v) => setSp(v === "CORPORATE" ? { pw: "CORPORATE" } : {}, { replace: false })} />

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Show combinations">
            {VIEWS.map(([k, word]) => {
              const on = (cat.data ? cat.data.filter : filter) === k;
              return (
                <button key={k} type="button" aria-pressed={on} onClick={() => set({ f: k === "needs" ? null : k })}
                  className={cn("h-8 rounded-full border px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50", on ? "border-primary bg-primary font-semibold text-white" : "border-border bg-surface-raised text-text hover:bg-text/5")}>
                  {word} · <span className="tabular-nums">{cat.data?.counts?.[k] ?? "…"}</span>
                </button>
              );
            })}
          </div>
          <ProgramFilter programs={cat.data?.programs ?? []} value={program} label={progLabel} onChange={(k) => set({ prog: k || null, under: null })} />
          {cat.data?.under && underLabel ? <span className="inline-flex h-8 items-center gap-1 rounded-full border border-primary/40 bg-primary/10 pl-3 pr-1 text-sm text-text-link">Showing: {underLabel}<button type="button" className="rounded-full p-1 hover:bg-primary/15" aria-label={`Stop showing only ${underLabel}`} onClick={() => set({ under: null })}><X className="size-3.5" /></button></span> : null}
        </div>
        {cat.data?.fellBack && cat.data?.requestedFilter === "needs" ? <p className="text-sm text-text-muted" role="status">Nothing needs work{scoped ? ` in ${scoped}` : ""} right now, so all combinations are shown.</p> : null}
        {q && cat.data?.otherPathwayMatches ? <p className="text-sm text-text-muted" role="status">{cat.data.otherPathwayMatches} more {cat.data.otherPathwayMatches === 1 ? "match" : "matches"} in {PATHWAY_LABEL[pathway === "INDIVIDUAL" ? "CORPORATE" : "INDIVIDUAL"]}. <button type="button" className="text-text-link underline" onClick={() => set({ pw: pathway === "INDIVIDUAL" ? "CORPORATE" : null, prog: null, under: null })}>Switch</button></p> : null}

        {cat.isError ? <Notice tone="danger" title="The programs could not be loaded" action={<Button size="sm" variant="secondary" onClick={() => void cat.refetch()}>Try again</Button>}>{(cat.error as Error).message} If it keeps failing, restart the studio.</Notice>
          : cat.isLoading || !knowsPerson ? <ListSkeleton />
          : !rows.length && !q && !program && !under && cat.data?.counts?.all === 0 ? (
            <EmptyState title={`No combinations in ${PATHWAY_LABEL[pathway]} yet`} description={canAuthor ? "Start by attaching your program's official forms to a combination: each file is read, its fields are mapped into the shared library once — reused everywhere, never duplicated. AI drafts what it can; you accept, edit or reject every proposal before anything is released. Create the first one with New combination: pick or create its program, category and sub-category." : noPerson ? "The studio could not tell who you are, so nothing can be added yet: see the notice above, then reload." : "A configuration author adds combinations here."}
              action={canAuthor ? <Button onClick={() => nav(`/new${pathway === "CORPORATE" ? "?pw=CORPORATE" : ""}`)}><Plus /> New combination</Button> : undefined} />
          ) : !rows.length ? (
            <EmptyState title="Nothing matches" description={[q ? `No combination matches "${q}"` : filter === "live" ? "No combination is Live" : "No combination here", scoped ? `in ${scoped}` : null, q && filter === "live" ? "and is Live" : null].filter(Boolean).join(" ") + "."} action={<Button variant="secondary" onClick={() => { setTyped(""); set({ q: null, prog: null, under: null, f: "all" }); }}>Show all</Button>} />
          ) : <List rows={rows} highlight={sel} q={q} sort={sort} canAuthor={canAuthor} onSort={() => set({ sort: sort === "path" ? "status" : sort === "status" ? "-status" : null })} onOpen={(r) => void open(r)} onAct={step.run} />}
        {rows.length && knowsPerson ? <p className="sr-only" role="status">{rows.length} combination{rows.length === 1 ? "" : "s"} shown</p> : null}
      </div>
      {step.dialog}
    </TipProvider>
  );
}

/** The team's ProgramTypeSwitcher pattern (segmented control, aria-pressed), with each pathway's combination count. */
function PathwaySwitch({ value, pathways, onChange }: { value: string; pathways?: { value: string; label: string; combinations: number }[]; onChange: (v: string) => void }) {
  const list = pathways ?? [{ value: "INDIVIDUAL", label: PATHWAY_LABEL.INDIVIDUAL, combinations: NaN }, { value: "CORPORATE", label: PATHWAY_LABEL.CORPORATE, combinations: NaN }];
  return (
    <div role="group" aria-label="Pathway" className="inline-flex w-fit items-center gap-0.5 rounded-xl border border-border bg-surface p-0.5">
      {list.map((p) => (
        <button key={p.value} type="button" aria-pressed={value === p.value} onClick={() => onChange(p.value)}
          className={cn("inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50", value === p.value ? "bg-surface-raised font-semibold text-text-link shadow-sm" : "text-text-muted hover:text-text")}>
          {p.label}<span className="rounded-full bg-text/8 px-1.5 text-xs font-semibold tabular-nums text-text">{Number.isNaN(p.combinations) ? "…" : p.combinations}</span>
        </button>
      ))}
    </div>
  );
}

function ProgramFilter({ programs, value, label, onChange }: { programs: { key: string; label: string; combinations: number }[]; value: string; label?: string; onChange: (k: string) => void }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button size="sm" variant="secondary" className="font-medium">Program: {label ?? "All"} <ChevronDown /></Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="start" sideOffset={4} className="z-50 max-h-[60vh] min-w-[240px] overflow-y-auto rounded-lg border border-border bg-surface-raised p-1 text-sm shadow-lg">
          <DropdownMenu.RadioGroup value={value} onValueChange={onChange}>
            {[{ key: "", label: "All programs", combinations: programs.reduce((s, p) => s + p.combinations, 0) }, ...programs].map((p) => (
              <DropdownMenu.RadioItem key={p.key || "all"} value={p.key} className="flex cursor-pointer items-center justify-between gap-4 rounded-md px-2 py-1.5 outline-none data-[highlighted]:bg-text/5 data-[state=checked]:font-semibold data-[state=checked]:text-text-link">
                {p.label}<span className="tabular-nums text-text-muted">{p.combinations}</span>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function ListSkeleton() {
  return <div className="space-y-2 rounded-lg border border-border bg-surface-raised p-4" aria-busy="true" aria-label="Loading programs">{Array.from({ length: 7 }, (_, i) => <Skeleton key={i} className="h-10 w-full" />)}<span className="sr-only" role="status">Loading programs</span></div>;
}

/** One tab stop for the whole list (roving focus): ↑/↓ move, Home/End jump, Enter opens the combination. The next step
 *  is a real button inside the row; Tab goes from the row to it. */
function List({ rows, highlight, q, sort, canAuthor, onSort, onOpen, onAct }: { rows: CatalogueLeaf[]; highlight: string | null; q: string; sort: string; canAuthor: boolean; onSort: () => void; onOpen: (r: CatalogueLeaf) => void; onAct: (l: CatalogueLeaf, a: NextAction | null) => void }) {
  const [focus, setFocus] = React.useState<string | null>(null);
  const refs = React.useRef(new Map<string, HTMLDivElement>());
  const current = rows.find((r) => r.nodeKey === focus) ?? rows.find((r) => r.nodeKey === highlight) ?? rows[0];
  const move = (k: string | undefined) => { if (!k) return; setFocus(k); requestAnimationFrame(() => refs.current.get(k)?.focus()); };
  const onKey = (e: React.KeyboardEvent, i: number) => {
    if (e.target !== e.currentTarget) return;
    const k = e.key;
    if (k === "ArrowDown") move(rows[i + 1]?.nodeKey);
    else if (k === "ArrowUp") move(rows[i - 1]?.nodeKey);
    else if (k === "Home") move(rows[0]?.nodeKey);
    else if (k === "End") move(rows[rows.length - 1]?.nodeKey);
    else if (k === "Enter" || k === " ") onOpen(rows[i]);
    else return;
    e.preventDefault();
  };
  const SortIcon = sort === "status" ? ArrowDown : sort === "-status" ? ArrowUp : ArrowUpDown;
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface-raised" role="grid" aria-label="Combinations" aria-readonly="true">
      <div role="row" className={cn(GRID, "border-b border-border bg-surface px-4 py-2.5 text-sm font-semibold text-text-muted")}>
        <span role="columnheader">Combination</span>
        <span role="columnheader" aria-sort={sort === "status" ? "ascending" : sort === "-status" ? "descending" : "none"}>
          <Tip tip={sort === "path" ? "Sort by status: Not ready first, then In setup, then Live" : sort === "status" ? "Sort by status, Live first" : "Back to Program › Category › Sub-category order"}>
            <button type="button" onClick={onSort} className="inline-flex items-center gap-1 rounded outline-none hover:text-text focus-visible:ring-[3px] focus-visible:ring-ring/50">Status <SortIcon className="size-3.5" aria-hidden /></button>
          </Tip>
        </span>
        <span role="columnheader" className="sr-only sm:not-sr-only">Next step</span>
      </div>
      {rows.map((r, i) => {
        const active = current?.nodeKey === r.nodeKey, lit = highlight === r.nodeKey, ti = active ? 0 : -1;
        const a = r.nextAction;
        const authorOnly = a && !SHOW_ONLY_STEPS.includes(a.kind);
        const label = a ? a.label : r.combinationId ? "Open" : null;
        const parents = r.path.slice(0, -1).join(" › ");
        return (
          <div key={r.nodeKey} role="row" aria-selected={lit} tabIndex={ti} data-node={r.nodeKey} data-label={r.label} aria-label={`${r.path.join(" › ")}, ${STATUS_WORD[r.status]}`}
            ref={(el) => { if (el) refs.current.set(r.nodeKey, el); else refs.current.delete(r.nodeKey); }}
            onKeyDown={(e) => onKey(e, i)} onFocus={(e) => { if (e.target === e.currentTarget) setFocus(r.nodeKey); }} onClick={() => onOpen(r)}
            className={cn(GRID, "min-h-11 cursor-pointer border-b border-border px-4 py-2 outline-none last:border-b-0 focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/60", lit ? "bg-primary/10 shadow-[inset_3px_0_0_var(--color-primary)]" : "hover:bg-text/[0.03]")}>
            <div role="gridcell" className="flex min-w-0 flex-col">
              {/* Two lines, never cut in the middle (early look item 3): parents muted above, the combination's own name below. */}
              {parents ? <span className="break-words text-xs text-text-muted">{parents}</span> : null}
              <b className="break-words font-semibold">{r.label}</b>
              {r.note ? <span className="break-words text-xs text-text-muted">{r.note}</span> : null}
              {r.filing ? <span className="break-words text-xs text-text-muted" data-filing>Filed: {r.filing}</span> : null}
              {q && r.matches.some((m) => m !== "name") ? <span className="text-xs text-text-muted">Matches: {r.matches.filter((m) => m !== "name").join(", ")}</span> : null}
            </div>
            <div role="gridcell" className="flex items-center gap-1.5">
              {/* Reachable by Tab from the active row (review #7): the chip and the overdue mark explain themselves. */}
              <StatusChip tabIndex={ti} status={r.status} text={STATUS_WORD[r.status]} />
              {r.checked?.overdue ? <Tip focusable={ti} tip="Check overdue: compare with IRCC's published forms and guides."><span role="img" aria-label="Check overdue" className="inline-flex rounded outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"><TriangleAlert className="size-4 text-text-warn" aria-hidden /></span></Tip> : null}
            </div>
            <div role="gridcell" className="col-span-2 sm:col-span-1">
              {label && (canAuthor || !authorOnly) ? (
                <StepTip a={a}><button type="button" tabIndex={ti} data-next-step={a?.kind ?? "open"} onClick={(e) => { e.stopPropagation(); onAct(r, a); }} className="inline-flex items-center gap-1 text-left text-sm font-semibold text-text-link outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50">{a ? <StepLabel a={a} /> : label}</button></StepTip>
              ) : label ? <span className="text-sm text-text-muted" title="A configuration author does this step.">{label}</span> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
