// Immigration programs (W1-04, S2; concept §2, §5, §7, §8; board design/draft-programs-v2.html design D; P-104, P-112,
// P-113, P-115; founder 27 Oct): every combination of one Pathway type (Retail · Corporate and employers), opened by the
// same Pathway cards as the Structure ("All pathways" shows every Pathway's section; a card shows only that Pathway's).
// Cards (default) or List, remembered per person: a card is the full five-part trail, a calculated status, the four
// setup steps (Forms · Draft · Review · Release), how it is filed and one next step; the list is the same data as dense
// rows grouped by Pathway. Above: search (⌘K) and "Status: All ▾" (every combination by default, BR-13 amends P-49);
// no filter-tab row. One request per view (GET /catalogue); the view lives in the URL. A card or row opens the
// combination page (P-50); Back returns here with it highlighted and the scroll where it was.
import * as React from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { keepPreviousData } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronRight, Info, LayoutGrid, List as ListIcon, ListTree, Plus, Search, TriangleAlert, X } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import type { CatalogueLeaf, CatalogueResponse, CatalogueSection, NextAction } from "../../../contracts/programs";
import { PATHWAY_TYPE_LABEL } from "../../../contracts/structure";
import { useActorId, useApi, useSessionView, useToast } from "@/lib/api";
import { Button, Input, Notice } from "@/components/ui/controls";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { SHOW_ONLY_STEPS, StepLabel, StepTip, useNextStep } from "@/components/next-step";
import { PathwayCards } from "@/components/pathway-cards";
import { StatusChip, Tip, TipProvider } from "@/components/status";
import { cn } from "@/lib/utils";

/** Where Back on a combination page returns to: this page's URL (with the opened combination) and its scroll position. */
export const CATALOGUE_URL_KEY = "xr-catalogue-url";
export const CATALOGUE_SCROLL_KEY = "xr-catalogue-scroll";
/** The Pathway type's words (P-104): Retail · Corporate and employers. */
export const PATHWAY_LABEL: Record<string, string> = PATHWAY_TYPE_LABEL;
export const STATUS_WORD = { IN_SETUP: "In setup", NOT_READY: "Not ready", READY: "Live" } as const;
const TYPE_TIP: Record<string, string> = {
  INDIVIDUAL: "Who applies: a person and their family. Applications a person makes for themselves and their family.",
  CORPORATE: "Who applies: an employer or organisation. Applications an employer makes, such as an LMIA.",
};
/** "Status: All ▾" (concept §2, BR-13): All is the default; Needs work is kept as an option (was the default view, P-49). */
const STATUSES = [
  ["all", "All", "Every combination of this tab."],
  ["needs", "Needs work", "Anything with a next step: not released yet, not ready, or waiting for you."],
  ["not_started", "Not started", "Added to the Structure; no setup yet."],
  ["in_setup", "In setup", "Setup has begun and is not released yet."],
  ["not_ready", "Not ready", "Something blocks release; the card says what."],
  ["live", "Live", "Firms can open cases on it."],
] as const;
type StatusKey = (typeof STATUSES)[number][0];
const NEED_YOU = "Combinations waiting for a person: something to review, something missing or something blocking release.";
const SETUP_TIP = "The four setup steps: Forms added · Draft done (AI or by hand) · Review done · Released. All four done = Live.";
const VIEW_TIP = "Cards show setup progress; the list fits more on screen. Remembered for you.";
const AUTHOR_ONLY = "Only a configuration author starts setup or adds names. You can open and read everything.";
// Below 640 px the next step moves under the name and status, so the combination's name keeps its width (QA-9).
const GRID = "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 sm:grid-cols-[minmax(0,1fr)_112px_112px_190px] sm:gap-y-3";

/** Remembers the page as it is now, with this combination as the one to highlight on Back. */
export function rememberList(nodeKey: string) {
  try {
    const u = new URL(location.href); u.searchParams.set("sel", nodeKey);
    if (u.pathname === "/") window.history.replaceState(window.history.state, "", `${u.pathname}${u.search}`);
    sessionStorage.setItem(CATALOGUE_URL_KEY, `${u.pathname}${u.search}`);
    sessionStorage.setItem(CATALOGUE_SCROLL_KEY, String(Math.round(window.scrollY)));
  } catch { /* private window: Back still opens the page */ }
}

/** Cards or List, per person (concept §2): the URL's `v` wins, else what this person chose last. */
function useView(sp: URLSearchParams): ["cards" | "list", (v: "cards" | "list") => void] {
  const actor = useActorId();
  const key = `xr-programs-view:${actor ?? "anyone"}`;
  const read = () => { try { return localStorage.getItem(key) === "list" ? "list" : "cards"; } catch { return "cards"; } };
  const [saved, setSaved] = React.useState<"cards" | "list">(read);
  React.useEffect(() => setSaved(read()), [key]);
  const url = sp.get("v");
  const view = url === "list" || url === "cards" ? url : saved;
  return [view, (v) => { setSaved(v); try { localStorage.setItem(key, v); } catch { /* private window */ } }];
}

const isNotStarted = (r: CatalogueLeaf) => !r.combinationId;
/** S2 fix 4: the forms found for a combination, in the same numbers its next step uses ("Add 1 form from the library"). */
const formsFound = (n: number, ready: number) => `${n} ${n === 1 ? "form" : "forms"} found${ready ? ` · ${ready} ready to add from the library` : ""}${n - ready ? ` · ${n - ready} ${n - ready === 1 ? "needs" : "need"} a draft` : ""}`;
const many = (n: number, one: string, more: string) => `${n} ${n === 1 ? one : more}`;

export function ProgramsPage() {
  const [sp, setSp] = useSearchParams();
  const nav = useNavigate(); const toast = useToast();
  // Until the person is known the page is loading (QA-22): an author must not read "a configuration author adds…" first.
  const { known: knowsPerson, failed: noPerson, canAuthor } = useSessionView();
  const pathway = sp.get("pw") === "CORPORATE" ? "CORPORATE" : "INDIVIDUAL";
  const typeLabel = PATHWAY_LABEL[pathway];
  const fParam = sp.get("f");
  const filter: StatusKey = (STATUSES.find(([k]) => k === fParam)?.[0] ?? "all");
  const program = sp.get("prog") ?? "", under = sp.get("under") ?? "", pathwayKey = sp.get("p") ?? "";
  const sort = sp.get("sort") === "status" ? "status" : sp.get("sort") === "-status" ? "-status" : "path";
  const q = sp.get("q") ?? "";
  const sel = sp.get("sel");
  const [view, setView] = useView(sp);
  const [typed, setTyped] = React.useState(q);
  React.useEffect(() => setTyped(q), [q]);
  React.useEffect(() => { const t = setTimeout(() => { if (typed !== q) set({ q: typed || null }); }, 120); return () => clearTimeout(t); }, [typed]);
  const search = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); search.current?.focus(); search.current?.select(); } };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, []);
  const cat = useApi<CatalogueResponse>(["catalogue", pathway, filter, q, program, under, sort, pathwayKey], `/catalogue?pathway=${pathway}&filter=${filter}&q=${encodeURIComponent(q)}&program=${encodeURIComponent(program)}&under=${encodeURIComponent(under)}&sort=${sort}&pathwayKey=${encodeURIComponent(pathwayKey)}`,
    { placeholderData: keepPreviousData, refetchInterval: (x) => ((x.state.data?.rows ?? []).some((r) => r.aiRunning) ? 3000 : false) });

  // Always from the current URL, never a render's copy: the search box's delayed update must not undo a newer change.
  function set(p: Record<string, string | null>, push = false) {
    setSp((prev) => {
      const n = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(p)) { if (v === null || v === "") n.delete(k); else n.set(k, v); }
      n.delete("sel"); // a changed view clears the Back highlight
      return n;
    }, { replace: !push });
  }
  const rows: CatalogueLeaf[] = cat.data?.rows ?? [];
  const sections: CatalogueSection[] = cat.data?.sections ?? [];
  // From the answer, not the address: while a new Pathway's answer is on its way, the page keeps showing the last one whole.
  const answered = cat.data?.pathwayKey ?? "";
  const shownSections = answered && sections.some((s) => s.pathwayKey === answered) ? sections.filter((s) => s.pathwayKey === answered) : sections;
  const filtering = filter !== "all" || !!q || !!program || !!under;
  const groups = shownSections.map((s) => ({ s, rows: rows.filter((r) => r.pathwayKey === s.pathwayKey) })).filter((g) => g.rows.length || !filtering);
  const [closed, setClosed] = React.useState<Set<string>>(new Set());
  React.useEffect(() => setClosed(new Set()), [pathway]);
  const toggle = (k: string) => setClosed((c) => { const n = new Set(c); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  // Back from a combination: the opened one is highlighted and the page is where it was (saved scroll, else the item).
  const restored = React.useRef(false);
  React.useEffect(() => {
    if (restored.current || !sel || !cat.data) return;
    restored.current = true;
    let y: number | null = null;
    try { const v = sessionStorage.getItem(CATALOGUE_SCROLL_KEY); y = v === null ? null : Number(v); sessionStorage.removeItem(CATALOGUE_SCROLL_KEY); } catch { /* ignore */ }
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`[data-node="${CSS.escape(sel)}"]`);
      const target = el?.matches("[role=row]") ? el : el?.querySelector<HTMLElement>("[data-open]") ?? el;
      if (y !== null && !Number.isNaN(y)) window.scrollTo({ top: y }); else el?.scrollIntoView({ block: "center" });
      target?.focus({ preventScroll: true });
    });
  }, [sel, cat.data]);

  const open = async (leaf: CatalogueLeaf, suffix = "") => {
    rememberList(leaf.nodeKey);
    if (leaf.combinationId) return nav(`/c/${leaf.combinationId}${suffix}`);
    if (!canAuthor) return toast.push({ tone: "info", text: `${leaf.label} is not started yet. A configuration author starts it.` });
    // S2 fix 3: never a silent start. A Not started name (or its Start setup step) opens the Start setup page with the
    // trail filled; nothing is created until the person presses the button there.
    return nav(`/new?${pathway === "CORPORATE" ? "pw=CORPORATE&" : ""}leaf=${encodeURIComponent(leaf.nodeKey)}`);
  };
  const step = useNextStep(open, (leaf) => rememberList(leaf.nodeKey));
  const progLabel = (cat.data?.programs ?? []).find((p) => p.key === (cat.data?.program ?? program))?.label;
  const underLabel = (cat.data?.underPath ?? []).join(" › ");
  const scopeChip = progLabel ?? (cat.data?.under && underLabel ? underLabel : null);
  const pathwayLabel = shownSections.length === 1 && answered ? shownSections[0].label : null;
  const counts = cat.data?.counts;
  const other = pathway === "INDIVIDUAL" ? "CORPORATE" : "INDIVIDUAL";
  const nothingAtAll = !!cat.data && !sections.length && !q;
  React.useEffect(() => {
    if (cat.data && !cat.isPlaceholderData && pathwayKey && !answered) set({ p: null }); // not a Pathway of this tab (break M1)
  }, [cat.data, cat.isPlaceholderData, pathwayKey, answered]);
  const busy = cat.isPlaceholderData;
  const scopeTotal = pathwayLabel ? shownSections[0].combinations : cat.data?.pathways.find((x) => x.value === pathway)?.combinations ?? 0;
  const statusWord = STATUSES.find(([k]) => k === filter)![1];

  return (
    <TipProvider>
      <div className="mx-auto flex max-w-[1240px] flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Immigration programs</h1>
          <Tip tip="Each card is one application a firm can open: Pathway type › Pathway › Program › Category › Sub-category. Status and setup progress are calculated: Live means firms can open cases on it.">
            <button type="button" className="inline-flex cursor-help rounded-full text-text-muted outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50" aria-label="About this page"><Info className="size-4" aria-hidden /></button>
          </Tip>
          <span className="flex-1" />
          <Tip tip="Add or rename pathways, programs, categories and sub-categories. New names enter only there.">
            <Button variant="secondary" onClick={() => nav(`/structure${pathway === "CORPORATE" ? "?t=CORPORATE" : ""}`)}><ListTree /> Structure</Button>
          </Tip>
          <Tip tip={!knowsPerson ? "Loading…" : noPerson ? "The studio could not tell who you are: see the notice above, then reload." : canAuthor ? "Pick a path from the Structure and start its setup, or open it if it is already set up." : "Only a configuration author starts combinations. Switch to the Configuration author."}>
            <span><Button disabled={!canAuthor} onClick={() => nav(`/new${pathway === "CORPORATE" ? "?pw=CORPORATE" : ""}`)}><Plus /> New combination</Button></span>
          </Tip>
        </div>
        <p className="-mt-3 text-sm text-text-muted">Every combination your firm can open, and where its setup stands.</p>

        <TypeSwitch value={pathway} pathways={cat.data?.pathways} onChange={(v) => setSp(v === "CORPORATE" ? { pw: "CORPORATE" } : {}, { replace: false })} />

        {cat.data && sections.length ? (
          <PathwayCards typeLabel={typeLabel} pathways={sections.map((s) => ({ key: s.pathwayKey, label: s.label, combinations: s.combinations, needs: s.needs }))}
            open={answered || null} onOpen={(k) => set({ p: k }, true)}
            allTip={`Shows every ${typeLabel} pathway's combinations, one section each.`} cardTip={(l) => `Shows only ${l}'s combinations. A Pathway is the outcome the application leads to, such as temporary or permanent residence.`}
            add={{ enabled: canAuthor, tip: canAuthor ? `New names enter on the Structure: opens it to add a pathway to ${typeLabel}.` : AUTHOR_ONLY, onAdd: () => nav(`/structure${pathway === "CORPORATE" ? "?t=CORPORATE" : ""}`) }} />
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[16rem] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-text-muted" aria-hidden />
            <Input ref={search} maxLength={120} className="pl-8 pr-14" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Search names, form numbers, documents" aria-label="Search combinations, form numbers and documents" aria-keyshortcuts="Meta+K Control+K" />
            {typed ? <button type="button" className="absolute right-1 top-1 rounded p-1.5 text-text-muted hover:bg-text/5" aria-label="Clear search" onClick={() => { setTyped(""); set({ q: null }); }}><X className="size-4" /></button>
              : <kbd className="pointer-events-none absolute right-2 top-2 rounded border border-border px-1.5 text-xs text-text-muted">⌘K</kbd>}
          </div>
          <StatusFilter value={filter} counts={counts} onChange={(k) => set({ f: k === "all" ? null : k }, true)} />
          {scopeChip ? <span className="inline-flex h-8 items-center gap-1 rounded-full border border-primary/40 bg-primary/10 pl-3 pr-1 text-sm text-text-link">Showing: {scopeChip}<button type="button" className="rounded-full p-1 hover:bg-primary/15" aria-label={`Stop showing only ${scopeChip}`} onClick={() => set({ under: null, prog: null })}><X className="size-3.5" /></button></span> : null}
          <ViewSwitch value={view} onChange={(v) => { setView(v); set({ v: null }, true); }} />
        </div>

        {counts && !nothingAtAll ? (
          <p className="-mt-1 text-sm text-text-muted" data-stats aria-busy={busy || undefined}>
            {busy ? <span className="mr-1.5 inline-block size-3 animate-spin rounded-full border-2 border-primary/30 border-t-primary align-[-1px]" role="status" aria-label="Updating" /> : null}
            <b className="font-semibold text-text">{q ? `${counts.all} of ${many(scopeTotal, "combination", "combinations")} match` : many(counts.all, "combination", "combinations")}</b>{pathwayLabel ? ` in ${pathwayLabel}` : ""}
            {([["live", "Live"], ["not_ready", "Not ready"], ["in_setup", "In setup"], ["not_started", "Not started"]] as const).filter(([k]) => counts[k]).map(([k, w]) => ` · ${counts[k]} ${w}`).join("")}
            {filter !== "all" ? ` · showing ${rows.length} ${statusWord}` : ""}
            <span className="block text-xs" data-sample-note>Names are Sample until the immigration expert confirms.</span>
          </p>
        ) : null}
        {cat.data?.fellBack ? <p className="text-sm text-text-muted" role="status">Nothing needs work right now, so every combination is shown.</p> : null}
        {q && cat.data?.otherPathwayMatches ? <p className="text-sm text-text-muted" role="status">{many(cat.data.otherPathwayMatches, "match", "matches")} in {PATHWAY_LABEL[other]}. <button type="button" className="text-text-link underline" onClick={() => set({ pw: other === "CORPORATE" ? "CORPORATE" : null, p: null, prog: null, under: null })}>Show {cat.data.otherPathwayMatches === 1 ? "it" : "them"}</button></p> : null}
        {pathway === "CORPORATE" && !nothingAtAll ? <CorporateCallout /> : null}

        {cat.isError ? <Notice tone="danger" title="The combinations could not load" action={<Button size="sm" variant="secondary" onClick={() => void cat.refetch()}>Retry</Button>}>{(cat.error as Error).message} Your work is safe. If it keeps failing, restart the studio.</Notice>
          : cat.isLoading || !knowsPerson ? <CardsSkeleton />
          : nothingAtAll ? (
            <EmptyState title={`Nothing set up in ${typeLabel} yet`} description={canAuthor ? "Start with the Structure: add the pathways, programs and categories you offer. Each category or sub-category you add appears here as a card." : noPerson ? "The studio could not tell who you are, so nothing can be added yet: see the notice above, then reload." : "A configuration author adds the pathways, programs and categories on the Structure; each one appears here as a card."}
              action={<Button onClick={() => nav(`/structure${pathway === "CORPORATE" ? "?t=CORPORATE" : ""}`)}><ListTree /> Open Structure</Button>} />
          ) : !rows.length && filtering ? (
            <EmptyState title="Nothing matches" description={`${q ? `No combination matches “${q}”` : `No combination is ${statusWord}`}${pathwayLabel ? ` in ${pathwayLabel}` : ` in ${typeLabel}`}${q && filter !== "all" ? ` and is ${statusWord}` : ""}${scopeChip ? `, under ${scopeChip}` : ""}.`}
              action={<Button variant="secondary" onClick={() => { setTyped(""); set({ q: null, prog: null, under: null, f: null }); }}>{q ? "Clear search" : "Show all"}</Button>} />
          ) : view === "cards" ? (
            <div className={cn("flex flex-col gap-5 transition-opacity", busy && "opacity-60")} data-view="cards">
              {groups.map(({ s, rows: mine }) => (
                <section key={s.pathwayKey} aria-labelledby={`sec-${s.pathwayKey}`} data-section={s.pathwayKey}>
                  <SectionHeader s={s} shown={mine.length} filtering={filtering} closed={closed.has(s.pathwayKey)} onToggle={() => toggle(s.pathwayKey)} />
                  {closed.has(s.pathwayKey) ? null : mine.length ? (
                    <ul className="mt-2.5 grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3" aria-label={`${s.label} combinations`}>
                      {mine.map((r) => <li key={r.nodeKey} className="flex min-w-0"><SetupCard r={r} lit={sel === r.nodeKey} q={q} canAuthor={canAuthor} onOpen={() => void open(r)} onAct={step.run} /></li>)}
                    </ul>
                  ) : <SectionEmpty label={s.label} pathway={pathway} />}
                </section>
              ))}
            </div>
          ) : <List groups={groups} closed={closed} onToggle={toggle} highlight={sel} q={q} sort={sort} filtering={filtering} pathway={pathway} canAuthor={canAuthor} onSort={() => set({ sort: sort === "path" ? "status" : sort === "status" ? "-status" : null })} onOpen={(r) => void open(r)} onAct={step.run} />}
        {rows.length && knowsPerson ? <p className="sr-only" role="status">{many(rows.length, "combination", "combinations")} shown</p> : null}
      </div>
      {step.dialog}
    </TipProvider>
  );
}

/** The Pathway type tabs: the team's segmented control (aria-pressed), each with its combination count. */
function TypeSwitch({ value, pathways, onChange }: { value: string; pathways?: { value: string; label: string; combinations: number }[]; onChange: (v: string) => void }) {
  const list = (pathways ?? [{ value: "INDIVIDUAL", label: "", combinations: NaN }, { value: "CORPORATE", label: "", combinations: NaN }]).map((p) => ({ ...p, label: PATHWAY_LABEL[p.value] }));
  return (
    <div role="group" aria-label="Pathway type" className="inline-flex w-fit items-center gap-0.5 rounded-xl border border-border bg-surface p-0.5">
      {list.map((p) => (
        <Tip key={p.value} tip={TYPE_TIP[p.value]}>
          <button type="button" aria-pressed={value === p.value} onClick={() => onChange(p.value)}
            className={cn("inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50", value === p.value ? "bg-surface-raised font-semibold text-text-link shadow-sm" : "text-text-muted hover:text-text")}>
            {p.label}<span className="rounded-full bg-text/8 px-1.5 text-xs font-semibold tabular-nums text-text">{Number.isNaN(p.combinations) ? "…" : p.combinations}</span>
          </button>
        </Tip>
      ))}
    </div>
  );
}

function ViewSwitch({ value, onChange }: { value: "cards" | "list"; onChange: (v: "cards" | "list") => void }) {
  const opts = [["cards", "Cards", LayoutGrid], ["list", "List", ListIcon]] as const;
  return (
    <Tip tip={VIEW_TIP}>
      <div role="group" aria-label="Show as" className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-surface p-0.5">
        {opts.map(([v, w, Icon]) => (
          <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)}
            className={cn("inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50", value === v ? "bg-surface-raised font-semibold text-text-link shadow-sm" : "text-text-muted hover:text-text")}>
            <Icon className="size-4" aria-hidden />{w}
          </button>
        ))}
      </div>
    </Tip>
  );
}

function StatusFilter({ value, counts, onChange }: { value: StatusKey; counts?: CatalogueResponse["counts"]; onChange: (k: StatusKey) => void }) {
  const word = STATUSES.find(([k]) => k === value)![1];
  return (
    <DropdownMenu.Root>
      <Tip tip="Show every combination, or only those in one state. Counts are for this tab and search.">
        <DropdownMenu.Trigger asChild>
          <Button size="sm" variant="secondary" className={cn("h-9 font-medium", value !== "all" && "border-primary text-text-link")}>Status: {word} <ChevronDown /></Button>
        </DropdownMenu.Trigger>
      </Tip>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="start" sideOffset={4} className="z-50 min-w-[280px] rounded-lg border border-border bg-surface-raised p-1 text-sm shadow-lg">
          <DropdownMenu.RadioGroup value={value} onValueChange={(v) => onChange(v as StatusKey)}>
            {STATUSES.map(([k, w, tip]) => (
              <DropdownMenu.RadioItem key={k} value={k} className="flex cursor-pointer flex-col gap-0.5 rounded-md px-2 py-1.5 outline-none data-[highlighted]:bg-text/5 data-[state=checked]:text-text-link">
                <span className="flex items-center justify-between gap-4"><span className={cn(value === k && "font-semibold")}>{w}{k === "all" ? " · default" : ""}</span><span className="tabular-nums text-text-muted">{counts ? counts[k === "all" ? "all" : k] : "…"}</span></span>
                <span className="text-xs text-text-muted">{tip}</span>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function SectionHeader({ s, shown, filtering, closed, onToggle }: { s: CatalogueSection; shown: number; filtering: boolean; closed: boolean; onToggle: () => void }) {
  return (
    <h2 id={`sec-${s.pathwayKey}`} className="text-base">
      <button type="button" aria-expanded={!closed} onClick={onToggle} className="inline-flex items-center gap-2 rounded-md py-0.5 pr-2 text-left outline-none hover:text-text-link focus-visible:ring-[3px] focus-visible:ring-ring/50">
        {closed ? <ChevronRight className="size-4 text-text-muted" aria-hidden /> : <ChevronDown className="size-4 text-text-muted" aria-hidden />}
        <span className="font-semibold">{s.label}</span>
        <span className="text-sm font-normal text-text-muted">{filtering ? `${shown} of ${s.combinations}` : many(s.combinations, "combination", "combinations")}</span>
        {s.needs ? <Tip tip={NEED_YOU}><span className="rounded-full bg-warn/15 px-1.5 text-xs font-semibold text-text-warn" data-need-you>{s.needs} need{s.needs === 1 ? "s" : ""} you</span></Tip> : null}
      </button>
    </h2>
  );
}

function SectionEmpty({ label, pathway }: { label: string; pathway: string }) {
  return <p className="mt-2 rounded-lg border border-dashed border-border-strong px-4 py-3 text-sm text-text-muted">No combinations in {label} yet. Add its programs and categories on the <Link className="text-text-link underline underline-offset-2" to={`/structure${pathway === "CORPORATE" ? "?t=CORPORATE" : ""}`}>Structure</Link>; each appears here as a card.</p>;
}

function NotStartedChip({ tabIndex = 0 }: { tabIndex?: number }) {
  return <Tip focusable={tabIndex} tip="Added to the Structure; no setup yet. Start by adding its forms."><span data-status="NOT_STARTED" className="inline-flex w-fit items-center gap-1 whitespace-nowrap rounded-full border border-dashed border-border-strong px-2 py-0.5 text-xs font-semibold text-text-muted outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">Not started</span></Tip>;
}

/** The four setup steps as shape and text, never colour alone ("Step 2 of 4: Draft" is read aloud). */
function SetupSteps({ r, compact, tabIndex = 0 }: { r: CatalogueLeaf; compact?: boolean; tabIndex?: number }) {
  const p = r.progress;
  const running = !!r.aiRunning;
  // S2 fix 7: no setup yet → an empty bar and the words "Not started", not "Step 1 of 4".
  if (isNotStarted(r)) return (
    <Tip focusable={tabIndex} tip={<>{SETUP_TIP}<br />Not started: no setup yet.</>}>
      <span className="flex min-w-0 flex-col gap-1 rounded outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50" data-setup="0" aria-label="Setup: not started" role="img">
        <span className="flex gap-1" aria-hidden>{[0, 1, 2, 3].map((i) => <span key={i} className={cn("h-1.5 flex-1 rounded-full bg-text/10", compact ? "min-w-4" : "min-w-6")} />)}</span>
        {compact ? null : <span className="text-xs text-text-muted">Not started</span>}
      </span>
    </Tip>
  );
  return (
    <Tip focusable={tabIndex} tip={<>{SETUP_TIP}<br />{p.label}{running ? " · AI drafting now" : ""}</>}>
      <span className="flex min-w-0 flex-col gap-1 rounded outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50" data-setup={p.step} aria-label={`Setup: ${p.label}${running ? ", AI drafting now" : ""}`} role="img">
        <span className="flex gap-1" aria-hidden>
          {p.done.map((d, i) => <span key={i} className={cn("h-1.5 flex-1 rounded-full", d ? "bg-ok" : i === p.step - 1 && !p.live ? (running ? "animate-pulse bg-primary/60" : "border border-primary bg-primary/20") : "bg-text/10", compact ? "min-w-4" : "min-w-6")} />)}
        </span>
        {compact ? null : <span className="text-xs text-text-muted">{p.live ? "Step 4 of 4 · Live" : `${p.label.replace(": ", " · ")}${running ? " · running" : ""}`}</span>}
      </span>
    </Tip>
  );
}

/** One next step (BR-13): the server's nextAction; an approver gets "Open" instead of an author's step. */
function NextStep({ r, canAuthor, tabIndex, onAct, onOpen, primary }: { r: CatalogueLeaf; canAuthor: boolean; tabIndex?: number; onAct: (l: CatalogueLeaf, a: NextAction | null) => void; onOpen: () => void; primary?: boolean }) {
  const a = r.nextAction;
  const mine = !a || canAuthor || SHOW_ONLY_STEPS.includes(a.kind);
  const cls = primary ? "inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface-raised px-3 text-sm font-semibold text-text-link outline-none hover:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/50"
    : "inline-flex items-center gap-1 text-left text-sm font-semibold text-text-link outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50";
  if (a && mine) return <StepTip a={a}><button type="button" tabIndex={tabIndex} data-next-step={a.kind} onClick={(e) => { e.stopPropagation(); onAct(r, a); }} className={cls}><StepLabel a={a} /></button></StepTip>;
  if (r.combinationId) return <button type="button" tabIndex={tabIndex} data-next-step="open" onClick={(e) => { e.stopPropagation(); onOpen(); }} className={cls}>Open</button>;
  return null;
}

/** A setup card (concept §2): muted trail, the category bold with its sub-category below, status, the four steps,
 *  forms and how it is filed, one next step. The name opens the combination page. */
function SetupCard({ r, lit, q, canAuthor, onOpen, onAct }: { r: CatalogueLeaf; lit: boolean; q: string; canAuthor: boolean; onOpen: () => void; onAct: (l: CatalogueLeaf, a: NextAction | null) => void }) {
  const [type, pw, prog, catName, sub] = r.trail;
  const formsN = r.forms.filter((f) => !f.document).length;
  const found = r.forms.filter((f) => !f.document && !f.drafted), ready = found.filter((f) => f.inLibrary).length;
  return (
    <article data-node={r.nodeKey} data-label={r.label} aria-label={`${r.trail.join(" › ")}, ${isNotStarted(r) ? "Not started" : STATUS_WORD[r.status]}`}
      className={cn("flex w-full flex-col gap-2.5 rounded-xl border bg-surface-raised p-4 shadow-sm transition-colors", lit ? "border-primary ring-2 ring-primary/25" : "border-border hover:border-border-strong")}>
      <div className="flex items-start gap-2">
        <span className="min-w-0 flex-1 text-xs text-text-muted [overflow-wrap:anywhere]" data-trail>{[type, pw, prog].join(" › ")}</span>
        {isNotStarted(r) ? <NotStartedChip /> : <StatusChip status={r.status} text={STATUS_WORD[r.status]} />}
        {r.checked?.overdue ? <Tip focusable tip="Check overdue: compare with IRCC's published forms and guides."><span role="img" aria-label="Check overdue" className="inline-flex rounded outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"><TriangleAlert className="size-4 text-text-warn" aria-hidden /></span></Tip> : null}
      </div>
      <div className="min-w-0">
        <h3 className="text-base leading-snug"><button type="button" data-open onClick={onOpen} className="text-left font-semibold [overflow-wrap:anywhere] outline-none hover:text-text-link hover:underline focus-visible:rounded focus-visible:ring-[3px] focus-visible:ring-ring/50">{catName}</button></h3>
        <p className={cn("text-sm [overflow-wrap:anywhere]", sub === "No sub-category" ? "text-text-muted" : "font-medium")}>{sub}</p>
      </div>
      <SetupSteps r={r} />
      <p className="break-words text-xs text-text-muted" data-filed>{r.filed !== "No forms yet" ? `${formsN ? `${many(formsN, "form", "forms")} · ` : ""}Filed: ${r.filed}` : found.length ? formsFound(found.length, ready) : "No forms yet"}</p>
      {q && r.matches.some((m) => m !== "name") ? <p className="text-xs text-text-muted">Matches: {r.matches.filter((m) => m !== "name").join(", ")}</p> : null}
      <div className="mt-auto flex items-center gap-2 pt-1"><NextStep r={r} canAuthor={canAuthor} onAct={onAct} onOpen={onOpen} primary /></div>
    </article>
  );
}

function CorporateCallout() {
  return (
    <aside aria-label="How employer and worker cases connect" className="rounded-xl border border-border bg-surface-raised p-4 text-sm" data-corporate-callout>
      <p className="font-semibold">How employer and worker cases connect <span className="ml-1 rounded border border-border px-1.5 text-xs font-normal text-text-muted">Sample examples</span></p>
      <p className="mt-1 text-text-muted">The employer's LMIA is set up here; the worker's work permit is set up under Retail. On the worker's case the agent picks "relies on employer case", and the employer's name, address and LMIA number fill in (later wave).</p>
      <ul className="mt-2 list-disc space-y-0.5 pl-5 text-text-muted">
        <li>A software company hires one developer: one employer case here, one worker case under Retail.</li>
        <li>One LMIA for three cooks: one employer case, three worker cases, each relying on it.</li>
        <li>A household hires a caregiver: the household is the employer.</li>
      </ul>
    </aside>
  );
}

function CardsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading combinations" className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3">
      {Array.from({ length: 6 }, (_, i) => <div key={i} className="space-y-2.5 rounded-xl border border-border bg-surface-raised p-4"><Skeleton className="h-3 w-2/3" /><Skeleton className="h-5 w-1/2" /><Skeleton className="h-2 w-full" /><Skeleton className="h-8 w-28" /></div>)}
      <span className="sr-only" role="status">Loading combinations</span>
    </div>
  );
}

/** The list (concept §2: the same data as dense rows): group rows per Pathway that collapse, then one row per
 *  combination with the full trail (first parts muted, the last level bold), status, a compact setup bar and the
 *  next step. One tab stop for the rows (roving focus): ↑/↓ move, Home/End jump, Enter opens; Tab reaches the step. */
function List({ groups, closed, onToggle, highlight, q, sort, filtering, pathway, canAuthor, onSort, onOpen, onAct }: { groups: { s: CatalogueSection; rows: CatalogueLeaf[] }[]; closed: Set<string>; onToggle: (k: string) => void; highlight: string | null; q: string; sort: string; filtering: boolean; pathway: string; canAuthor: boolean; onSort: () => void; onOpen: (r: CatalogueLeaf) => void; onAct: (l: CatalogueLeaf, a: NextAction | null) => void }) {
  const rows = groups.flatMap((g) => (closed.has(g.s.pathwayKey) ? [] : g.rows));
  const [focus, setFocus] = React.useState<string | null>(null);
  const refs = React.useRef(new Map<string, HTMLDivElement>());
  const current = rows.find((r) => r.nodeKey === focus) ?? rows.find((r) => r.nodeKey === highlight) ?? rows[0];
  const move = (k: string | undefined) => { if (!k) return; setFocus(k); requestAnimationFrame(() => refs.current.get(k)?.focus()); };
  const onKey = (e: React.KeyboardEvent, r: CatalogueLeaf) => {
    if (e.target !== e.currentTarget) return;
    const i = rows.indexOf(r), k = e.key;
    if (k === "ArrowDown") move(rows[i + 1]?.nodeKey);
    else if (k === "ArrowUp") move(rows[i - 1]?.nodeKey);
    else if (k === "Home") move(rows[0]?.nodeKey);
    else if (k === "End") move(rows[rows.length - 1]?.nodeKey);
    else if (k === "Enter" || k === " ") onOpen(r);
    else return;
    e.preventDefault();
  };
  const SortIcon = sort === "status" ? ArrowDown : sort === "-status" ? ArrowUp : ArrowUpDown;
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface-raised" role="grid" aria-label="Combinations" aria-readonly="true" data-view="list">
      <div role="row" className={cn(GRID, "border-b border-border bg-surface px-4 py-2.5 text-sm font-semibold text-text-muted")}>
        <span role="columnheader">Combination</span>
        <span role="columnheader" aria-sort={sort === "status" ? "ascending" : sort === "-status" ? "descending" : "none"}>
          <Tip tip={sort === "path" ? "Sort by status: Not ready first, then In setup, then Live" : sort === "status" ? "Sort by status, Live first" : "Back to Structure order"}>
            <button type="button" onClick={onSort} className="inline-flex items-center gap-1 rounded outline-none hover:text-text focus-visible:ring-[3px] focus-visible:ring-ring/50">Status <SortIcon className="size-3.5" aria-hidden /></button>
          </Tip>
        </span>
        <span role="columnheader" className="sr-only sm:not-sr-only"><Tip tip={SETUP_TIP}><span>Setup</span></Tip></span>
        <span role="columnheader" className="sr-only sm:not-sr-only">Next step</span>
      </div>
      {groups.map(({ s, rows: mine }) => {
        const shut = closed.has(s.pathwayKey);
        return (
          <React.Fragment key={s.pathwayKey}>
            <div role="row" data-group={s.pathwayKey} className="border-b border-border bg-surface/60 px-2 py-1.5">
              <span role="rowheader" className="flex items-center">
                <button type="button" aria-expanded={!shut} onClick={() => onToggle(s.pathwayKey)} className="inline-flex items-center gap-2 rounded-md px-2 py-0.5 text-sm outline-none hover:text-text-link focus-visible:ring-[3px] focus-visible:ring-ring/50">
                  {shut ? <ChevronRight className="size-4 text-text-muted" aria-hidden /> : <ChevronDown className="size-4 text-text-muted" aria-hidden />}
                  <b className="font-semibold">{s.label}</b><span className="text-text-muted">· {filtering ? `${mine.length} of ${s.combinations}` : s.combinations}</span>
                  {s.needs ? <Tip tip={NEED_YOU}><span className="rounded-full bg-warn/15 px-1.5 text-xs font-semibold text-text-warn" data-need-you>{s.needs} need{s.needs === 1 ? "s" : ""} you</span></Tip> : null}
                </button>
              </span>
            </div>
            {shut ? null : !mine.length ? <div role="row" className="border-b border-border px-4 py-2.5 text-sm text-text-muted"><span role="gridcell"><SectionEmpty label={s.label} pathway={pathway} /></span></div> : mine.map((r) => {
              const active = current?.nodeKey === r.nodeKey, lit = highlight === r.nodeKey, ti = active ? 0 : -1;
              const [type, pw, prog, catName, sub] = r.trail;
              return (
                <div key={r.nodeKey} role="row" aria-selected={lit} tabIndex={ti} data-node={r.nodeKey} data-label={r.label} aria-label={`${r.trail.join(" › ")}, ${isNotStarted(r) ? "Not started" : STATUS_WORD[r.status]}`}
                  ref={(el) => { if (el) refs.current.set(r.nodeKey, el); else refs.current.delete(r.nodeKey); }}
                  onKeyDown={(e) => onKey(e, r)} onFocus={(e) => { if (e.target === e.currentTarget) setFocus(r.nodeKey); }} onClick={() => onOpen(r)}
                  className={cn(GRID, "min-h-11 cursor-pointer border-b border-border px-4 py-2 outline-none last:border-b-0 focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/60", lit ? "bg-primary/10 shadow-[inset_3px_0_0_var(--color-primary)]" : "hover:bg-text/[0.03]")}>
                  <div role="gridcell" className="min-w-0 break-words text-sm" data-trail>
                    <span className="text-text-muted">{[type, pw, prog].join(" › ")} › </span>
                    <b className="font-semibold">{catName}</b>
                    <span className="text-text-muted"> › </span>
                    <span className={sub === "No sub-category" ? "text-text-muted" : "font-semibold"}>{sub}</span>
                    {r.filed !== "No forms yet" ? <span className="block text-xs text-text-muted" data-filed>Filed: {r.filed}</span> : null}
                    {q && r.matches.some((m) => m !== "name") ? <span className="block text-xs text-text-muted">Matches: {r.matches.filter((m) => m !== "name").join(", ")}</span> : null}
                  </div>
                  <div role="gridcell" className="flex items-center gap-1.5">
                    {isNotStarted(r) ? <NotStartedChip tabIndex={ti} /> : <StatusChip tabIndex={ti} status={r.status} text={STATUS_WORD[r.status]} />}
                    {r.checked?.overdue ? <Tip focusable={ti} tip="Check overdue: compare with IRCC's published forms and guides."><span role="img" aria-label="Check overdue" className="inline-flex rounded outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"><TriangleAlert className="size-4 text-text-warn" aria-hidden /></span></Tip> : null}
                  </div>
                  <div role="gridcell" className="hidden sm:block"><SetupSteps r={r} compact tabIndex={ti} /></div>
                  <div role="gridcell" className="col-span-2 sm:col-span-1" data-step-cell><NextStep r={r} canAuthor={canAuthor} tabIndex={ti} onAct={onAct} onOpen={() => onOpen(r)} /></div>
                </div>
              );
            })}
          </React.Fragment>
        );
      })}
    </div>
  );
}
