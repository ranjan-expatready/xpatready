// Immigration programs (W1-04, S2; concept §2, §5, §7, §8; board design/draft-programs-v2.html design D; P-104, P-112,
// P-113, P-115; founder 27 Oct; round 3 P-128 (4)(5)); card v4 (W1 setup checklist concept v4 §6–§7, board
// W1-setup-checklist/design/draft-board-v4.html; R-144, P-180): every combination of one Pathway type (Retail ·
// Corporate and employers), under the same filter bar as Program structure (Pathway chips, Program, status chips
// All · Not started · In progress · Live, Needs you, active-filter chips and Clear all, all in the address).
// "Add combination" opens the one "Add to Program structure" pop-up here; the new card shows in place, outlined for 2 s.
// Cards (default) or List, remembered per person. A card shows the name, the full trail, its filing tag (P-208), "n of 5
// steps" or "✓ Live" (with a 2 px five-part edge bar that only repeats it), Needs you, and one button (Start setup ·
// Resume setup · Open), all read from the setup checklist (`setup`, slice A); the rest lives on the combination's
// Overview. Sections: Pathway, then Program, each with "n of m live", folded per person. One request per view
// (GET /catalogue); the view lives in the URL. A card or row opens the combination page (P-50); Back returns here with
// it highlighted and the scroll where it was.
import * as React from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronRight, Info, LayoutGrid, List as ListIcon, ListTree, Plus, Search, X } from "lucide-react";
import type { CatalogueLeaf, CatalogueResponse, CatalogueSection, SessionView } from "../../../contracts/programs";
import { PATHWAY_TYPE_LABEL } from "../../../contracts/structure";
import type { ChipStatus } from "../../../contracts/setup-checklist";
import { api, useActorId, useApi, useSessionView, useToast } from "@/lib/api";
import type { PathwayType } from "../../../contracts/structure";
import { AddToStructure, type AddPrefill } from "@/components/add-to-structure";
import { Button, Input, Notice } from "@/components/ui/controls";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { LevelMark, pathwayAccent } from "@/components/levels";
import { Tip, TipProvider } from "@/components/status";
import { cn } from "@/lib/utils";
import { StartSetupButton } from "@/components/start-setup";
import { STATE_WORDS, STATUS_WORDS } from "../../../contracts/status-words";

/** Where Back on a combination page returns to: this page's URL (with the opened combination) and its scroll position. */
export const CATALOGUE_URL_KEY = "xr-catalogue-url";
export const CATALOGUE_SCROLL_KEY = "xr-catalogue-scroll";
/** The Pathway type's words (P-104): Retail · Corporate and employers. */
export const PATHWAY_LABEL: Record<string, string> = PATHWAY_TYPE_LABEL;
export const STATUS_WORD = STATUS_WORDS; // UX-A part 3: the one word set
const TYPE_TIP: Record<string, string> = {
  INDIVIDUAL: "Who applies: a person and their family. Applications a person makes for themselves and their family.",
  CORPORATE: "Who applies: an employer or organisation. Applications an employer makes, such as an LMIA.",
};
/** The status chips (P-180 Q2): All · Not started · In progress · Live, and Retired while any is retired. "Needs work"
 *  and "Not ready" fold into In progress and Needs you. */
const STATUSES = [
  ["all", "All", "Every combination of this tab."],
  ["not_started", STATE_WORDS.NOT_STARTED, "Added to the Program structure; no setup yet."],
  ["in_progress", STATE_WORDS.IN_SETUP, "Setup has begun and firms cannot use it yet, or its release must be fixed first (Not ready)."],
  ["live", "Live", "Firms can open cases on it, with or without changes not released yet."],
  // QA-48: retired combinations are left out of every other view (P-116); here they can be found again. Offered only
  // while one is retired.
  ["retired", "Retired", "Retired at a release: hidden from the other views. Restore one from its row on Program structure."],
] as const;
type StatusKey = (typeof STATUSES)[number][0];
const statusWordOf = (k: StatusKey) => STATUSES.find(([x]) => x === k)![1];
const NEED_YOU = "Combinations where something waits for you: a review or a confirmation on your duty.";
const BAR_TIP = "Five steps, worked out from what is set up now: Official pages · Who can be in this application · Forms · Questions and documents · Review and release. The Overview shows each one.";
const VIEW_TIP = "Cards show setup progress; the list fits more on screen. Remembered for you.";
// Below 640 px the trail and progress move under the name, so the combination's name keeps its width (QA-9).
const GRID = "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)_120px_96px_140px] sm:gap-y-0";

/** Remembers the page as it is now, with this combination as the one to highlight on Back. */
export function rememberList(nodeKey: string) {
  try {
    const u = new URL(location.href); u.searchParams.set("sel", nodeKey);
    if (u.pathname === "/") window.history.replaceState(window.history.state, "", `${u.pathname}${u.search}`);
    sessionStorage.setItem(CATALOGUE_URL_KEY, `${u.pathname}${u.search}`);
    sessionStorage.setItem(CATALOGUE_SCROLL_KEY, String(Math.round(window.scrollY)));
  } catch { /* private window: Back still opens the page */ }
}

/** Cards or List, per person (concept §2): the URL's `v` wins, else what this person chose last. C11.10 (P-115): the
 *  choice is kept on the server for the person (PATCH /session/preferences), so it follows them to any browser; this
 *  browser's copy only shows it at once while the session loads. */
function useView(sp: URLSearchParams): ["cards" | "list", (v: "cards" | "list") => void] {
  const actor = useActorId();
  const qc = useQueryClient();
  const server = useApi<SessionView>(["session", actor], "/session").data?.preferences?.programsView;
  const key = `xr-programs-view:${actor ?? "anyone"}`;
  const read = () => { try { return localStorage.getItem(key) === "list" ? "list" : "cards"; } catch { return "cards"; } };
  const [saved, setSaved] = React.useState<"cards" | "list">(read);
  React.useEffect(() => setSaved(read()), [key]);
  React.useEffect(() => { if (server) { setSaved(server); try { localStorage.setItem(key, server); } catch { /* private window */ } } }, [server, key]);
  const url = sp.get("v");
  const view = url === "list" || url === "cards" ? url : saved;
  return [view, (v) => {
    setSaved(v); try { localStorage.setItem(key, v); } catch { /* private window */ }
    void api("/session/preferences", { method: "PATCH", json: { programsView: v } }).then(() => qc.invalidateQueries({ queryKey: ["session", actor] })).catch(() => undefined); // the view still changes here; only the server copy is missed
  }];
}

/** Folded Pathway and Program sections, remembered per person (P-180). While a filter or search is on, every section
 *  holding a match opens and a fold lasts only until the filter changes. */
function useFolds(filterKey: string | null): [Set<string>, (k: string) => void] {
  const actor = useActorId();
  const key = `xr-programs-fold:${actor ?? "anyone"}`;
  const read = () => { try { const v = JSON.parse(localStorage.getItem(key) ?? "[]"); return new Set<string>(Array.isArray(v) ? v.filter((x) => typeof x === "string") : []); } catch { return new Set<string>(); } };
  const [saved, setSaved] = React.useState<Set<string>>(read);
  const [temp, setTemp] = React.useState<Set<string>>(new Set());
  React.useEffect(() => setSaved(read()), [key]);
  React.useEffect(() => setTemp(new Set()), [filterKey]);
  const flip = (s: Set<string>, k: string) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; };
  if (filterKey !== null) return [temp, (k) => setTemp((s) => flip(s, k))];
  return [saved, (k) => setSaved((s) => { const n = flip(s, k); try { localStorage.setItem(key, JSON.stringify([...n])); } catch { /* private window */ } return n; })];
}

const isNotStarted = (r: CatalogueLeaf) => !r.combinationId;
const many = (n: number, one: string, more: string) => `${n} ${n === 1 ? one : more}`;
/** The combination's name: its sub-category, or its category when it has none. */
const nameOf = (r: CatalogueLeaf) => { const sub = r.trail[4]; return sub && sub !== "No sub-category" ? sub : r.trail[3] ?? r.label; };
/** The full trail (Pathway type › … › name), without the "No sub-category" placeholder. */
const trailOf = (r: CatalogueLeaf) => r.trail.filter((p) => p && p !== "No sub-category");
/** The card's state, from the setup checklist (concept v4 §6); without it (no viewer known) from the row. */
const chipOf = (r: CatalogueLeaf): ChipStatus => r.setup?.chip.status ?? (r.retired ? "RETIRED" : isNotStarted(r) ? "NOT_STARTED" : r.live ? "LIVE" : "IN_PROGRESS");
const doneOf = (r: CatalogueLeaf) => r.setup?.bar.done ?? 0;
/** "n of 5 steps", "✓ Live" or "Retired at Release n". */
const progressText = (r: CatalogueLeaf) => r.setup?.bar.text ?? (chipOf(r) === "LIVE" ? "✓ Live" : chipOf(r) === "RETIRED" ? "Retired" : `${doneOf(r)} of 5 steps`);
/** The card's whole progress in words (its name for screen readers): "✓ Live · Next release: 3 of 5 steps to do". */
const progressWords = (r: CatalogueLeaf) => [progressText(r), chipOf(r) === "LIVE" ? r.setup?.bar.next : null].filter(Boolean).join(" · ");
const needsYouOf = (r: CatalogueLeaf) => r.setup?.viewer.needsYou ?? null;

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
  const needsOnly = sp.get("n") === "1";
  const [view, setView] = useView(sp);
  // P-128 (5): Add combination opens the one pop-up here; the new card is brought into view and outlined for 2 s.
  const [adding, setAdding] = React.useState<AddPrefill | null>(null);
  const [justAdded, setJustAdded] = React.useState<string | null>(null);
  const [outlined, setOutlined] = React.useState<string | null>(null);
  const showAdded = React.useRef<string | null>(null); // the card to bring into view once, right after an Add
  const [note, setNote] = React.useState<string | null>(null);
  const [typed, setTyped] = React.useState(q);
  React.useEffect(() => setTyped(q), [q]);
  React.useEffect(() => { const t = setTimeout(() => { if (typed !== q) set({ q: typed || null }); }, 120); return () => clearTimeout(t); }, [typed]);
  const search = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); search.current?.focus(); search.current?.select(); } };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, []);
  // The person is part of the key: the button, Needs you and its counts are this person's (P-180 overlay). The last
  // answer stays on screen while a filter loads, never across a person switch (it would show the other person's buttons).
  const actorId = useActorId();
  const cat = useApi<CatalogueResponse>(["catalogue", pathway, filter, q, program, under, sort, pathwayKey, actorId], `/catalogue?pathway=${pathway}&filter=${filter}&q=${encodeURIComponent(q)}&program=${encodeURIComponent(program)}&under=${encodeURIComponent(under)}&sort=${sort}&pathwayKey=${encodeURIComponent(pathwayKey)}`,
    { placeholderData: (prev, prevQuery) => (prevQuery?.queryKey.at(-1) === actorId ? keepPreviousData(prev) : undefined), refetchInterval: (x) => ((x.state.data?.rows ?? []).some((r) => r.aiRunning) ? 3000 : false) });

  // Always from the current URL, never a render's copy: the search box's delayed update must not undo a newer change.
  function set(p: Record<string, string | null>, push = false) {
    setSp((prev) => {
      const n = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(p)) { if (v === null || v === "") n.delete(k); else n.set(k, v); }
      n.delete("sel"); // a changed view clears the Back highlight
      return n;
    }, { replace: !push });
  }
  // "Needs you" (P-128 (4), P-180): only the combinations where an item on this person's duty waits.
  const rows: CatalogueLeaf[] = (cat.data?.rows ?? []).filter((r) => !needsOnly || r.needsYou);
  const sections: CatalogueSection[] = cat.data?.sections ?? [];
  // From the answer, not the address: while a new Pathway's answer is on its way, the page keeps showing the last one whole.
  const answered = cat.data?.pathwayKey ?? "";
  const shownSections = answered && sections.some((s) => s.pathwayKey === answered) ? sections.filter((s) => s.pathwayKey === answered) : sections;
  // A Pathway chip is a filter too: it opens its sections even when the person folded them (break-report M2).
  const filtering = filter !== "all" || !!q || !!program || !!under || needsOnly || !!pathwayKey;
  const programMeta = new Map((cat.data?.programs ?? []).map((p) => [p.key, p]));
  const groups: Group[] = shownSections.map((s) => {
    const mine = rows.filter((r) => r.pathwayKey === s.pathwayKey);
    const byProgram = new Map<string, CatalogueLeaf[]>();
    for (const r of mine) byProgram.set(r.programKey, [...(byProgram.get(r.programKey) ?? []), r]);
    return { s, i: sections.findIndex((x) => x.pathwayKey === s.pathwayKey), rows: mine,
      programs: [...byProgram].map(([key, list]) => { const m = programMeta.get(key); return { key, label: m?.label ?? list[0].trail[2], combinations: m?.combinations ?? list.length, live: m?.live ?? list.filter((r) => chipOf(r) === "LIVE").length, rows: list }; }) };
  }).filter((g) => g.rows.length || !filtering);
  const [closed, toggle] = useFolds(filtering ? `${pathway}|${pathwayKey}|${filter}|${q}|${program}|${under}|${needsOnly}` : null);

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

  // QA-50: a double click leaves the page once; the second click finds the page already on its way out (one history entry).
  const leaving = React.useRef(false);
  const go = (to: string) => { if (leaving.current) return; leaving.current = true; nav(to); };
  const open = async (leaf: CatalogueLeaf) => {
    if (leaving.current) return;
    if (!leaf.combinationId && !canAuthor) return toast.push({ tone: "info", text: `${leaf.label} is not started yet. A configuration author starts it.` });
    rememberList(leaf.nodeKey);
    if (leaf.combinationId) return go(`/c/${leaf.combinationId}`);
    // S2 fix 3 kept: never a silent start. S3 (P-125): there is no New combination page; the name says how to begin, and
    // nothing is created until the person presses Start setup.
    return toast.push({ tone: "info", text: leaf.startWhy ?? `${leaf.label} is not started yet. Start setup on it begins its setup.` });
  };
  // Resume setup lands on the first open item (concept v4 §7 button map), else on the Overview.
  const resume = (leaf: CatalogueLeaf) => {
    if (leaving.current || !leaf.combinationId) return;
    rememberList(leaf.nodeKey);
    go(leaf.setup?.next?.href ?? `/c/${leaf.combinationId}`);
  };
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
  // After Add: a filter that would hide the new card is cleared, so it shows in place (board P2, "After Add").
  React.useEffect(() => {
    const k = showAdded.current;
    if (!k || !cat.data || cat.isPlaceholderData) return;
    if (rows.some((r) => r.nodeKey === k)) { showAdded.current = null; return; }
    set({ q: null, n: null, prog: null, under: null, p: null, ...(filter !== "all" && filter !== "not_started" ? { f: null } : {}) });
  }, [justAdded, cat.data, cat.isPlaceholderData]); // eslint-disable-line react-hooks/exhaustive-deps
  // Just added (concept v4 §6): the Not started card, scrolled into view and outlined for 2 s, with no extra text.
  React.useEffect(() => {
    if (!justAdded || !rows.some((r) => r.nodeKey === justAdded)) return;
    const k = justAdded;
    setOutlined(k); setJustAdded(null);
    requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-node="${CSS.escape(k)}"]`)?.scrollIntoView({ block: "center" }));
  }, [justAdded, rows.length]); // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => { if (!outlined) return; const t = setTimeout(() => setOutlined(null), 2000); return () => clearTimeout(t); }, [outlined]);
  const allCount = cat.data?.pathways.find((x) => x.value === pathway)?.combinations ?? 0;
  const mineNeeds = (cat.data?.rows ?? []).filter((r) => r.needsYou).length;
  const activeChips: { key: string; label: string; clear: () => void }[] = [
    ...(pathwayLabel ? [{ key: "p", label: pathwayLabel, clear: () => set({ p: null, prog: null, under: null }) }] : []),
    ...(scopeChip ? [{ key: "prog", label: scopeChip, clear: () => set({ prog: null, under: null }) }] : []),
    ...(filter !== "all" ? [{ key: "f", label: statusWordOf(filter), clear: () => set({ f: null }) }] : []),
    ...(needsOnly ? [{ key: "n", label: "Needs you", clear: () => set({ n: null }) }] : []),
    ...(q ? [{ key: "q", label: `"${q}"`, clear: () => { setTyped(""); set({ q: null }); } }] : []),
  ];
  const scopeTotal = pathwayLabel ? shownSections[0].combinations : cat.data?.pathways.find((x) => x.value === pathway)?.combinations ?? 0;
  const statusWord = statusWordOf(filter);
  const lit = (k: string) => sel === k || outlined === k;

  return (
    <TipProvider>
      <div className="mx-auto flex max-w-[1240px] flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Immigration programs</h1>
          <Tip tip="Each card is one application a firm can open: Pathway type › Pathway › Program › Category › Sub-category. Its setup has five steps, worked out from what is set up now: Live means firms can open cases on it.">
            <button type="button" className="inline-flex cursor-help rounded-full text-text-muted outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50" aria-label="About this page"><Info className="size-4" aria-hidden /></button>
          </Tip>
          <span className="flex-1" />
          <Tip tip="Rename, reorder or delete Pathways, Programs, Categories and Sub-categories.">
            <Button variant="secondary" onClick={() => nav(`/structure${pathway === "CORPORATE" ? "?t=CORPORATE" : ""}`)}><ListTree /> Program structure</Button>
          </Tip>
          <Tip tip={!knowsPerson ? "Loading…" : noPerson ? "The studio could not tell who you are: see the notice above, then reload." : canAuthor ? "Opens the Add to Program structure pop-up here. Pick what exists or type new names; the new combination appears on this page as Not started." : "Only a configuration author adds combinations. Switch to the Configuration author."}>
            <span><Button disabled={!canAuthor} onClick={() => { if (canAuthor) setAdding({ pathwayKey: pathwayKey || answered || undefined, programKey: program || undefined }); }} data-add-combination><Plus /> Add combination</Button></span>
          </Tip>
        </div>
        <p className="-mt-3 text-sm text-text-muted">Every combination your firm can open, and where its setup stands.</p>

        {/* The filter bar (P-128 (4), board v4): the same pattern as Program structure. */}
        <div className="flex flex-col gap-2.5" data-filter-bar>
          <div className="flex flex-wrap items-center gap-2">
            <TypeSwitch value={pathway} pathways={cat.data?.pathways} onChange={(v) => setSp(v === "CORPORATE" ? { pw: "CORPORATE" } : {}, { replace: false })} />
            <span className="flex-1" />
            <ViewSwitch value={view} onChange={(v) => { setView(v); set({ v: null }, true); }} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[19rem] flex-[1_1_19rem]">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-text-muted" aria-hidden />
              <Input ref={search} maxLength={120} className="pl-8 pr-14" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Search names, forms, documents" aria-label="Search combinations, form numbers and documents" aria-keyshortcuts="Meta+K Control+K" />
              {typed ? <button type="button" className="absolute right-1 top-1 rounded p-1.5 text-text-muted hover:bg-text/5" aria-label="Clear search" onClick={() => { setTyped(""); set({ q: null }); }}><X className="size-4" /></button>
                : <kbd className="pointer-events-none absolute right-2 top-2 rounded border border-border px-1.5 text-xs text-text-muted">⌘K</kbd>}
            </div>
            {cat.data && sections.length ? (
              <div role="group" aria-label="Pathway" className="flex flex-wrap items-center gap-1.5" data-pathway-chips>
                {[{ key: "", label: "All", count: allCount, needs: sections.reduce((n, x) => n + x.needs, 0), idx: -1 }, ...sections.map((x, i) => ({ key: x.pathwayKey, label: x.label, count: x.combinations, needs: x.needs, idx: i }))].map((c) => (
                  <Tip key={c.key || "all"} tip={`${c.key ? `Shows only ${c.label}'s combinations.` : `Shows every ${typeLabel} pathway's combinations.`} The number counts them; "need you" counts those waiting for you.`}>
                    <button type="button" aria-pressed={answered === c.key} onClick={() => set({ p: c.key || null, prog: null, under: null }, true)} data-pathway-chip={c.key || "all"}
                      className={cn("inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50", answered === c.key ? "border-primary/40 bg-primary/10 font-semibold text-text-link" : "border-border-strong bg-surface-raised text-text hover:bg-text/5")}>
                      {c.idx >= 0 ? <span className="h-3.5 w-1 rounded-sm" style={{ background: pathwayAccent(c.idx) }} aria-hidden /> : null}{c.label}<span className="text-xs font-medium tabular-nums text-text-muted" data-count>{c.count}</span>
                      {c.needs ? <span className="rounded-full bg-warn/15 px-1.5 text-xs font-semibold text-text-warn" data-need>{c.needs}<span className="sr-only"> need you</span></span> : null}
                    </button>
                  </Tip>
                ))}
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {cat.data?.programs.length ? (
              <select aria-label="Program" value={program} onChange={(e) => set({ prog: e.target.value || null, under: null }, true)} className="h-8 max-w-[12rem] rounded-full border border-border-strong bg-surface-raised px-2.5 text-sm" data-program-filter>
                <option value="">Program: All</option>{cat.data.programs.map((x) => <option key={x.key} value={x.key}>{x.label} ({x.combinations})</option>)}
              </select>
            ) : null}
            <StatusChips value={filter} counts={counts} onChange={(k) => set({ f: k === "all" ? null : k }, true)} />
            <Tip tip={NEED_YOU}>
              <button type="button" aria-pressed={needsOnly} onClick={() => set({ n: needsOnly ? null : "1" }, true)} data-needs-you
                className={cn("inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50", needsOnly ? "border-warn bg-warn/10 font-semibold text-text-warn" : "border-border-strong bg-surface-raised text-text hover:bg-text/5")}>
                <span className="size-1.5 rounded-full bg-warn" aria-hidden />Needs you<span className="tabular-nums text-xs font-semibold">{mineNeeds}</span>
              </button>
            </Tip>
          </div>
        </div>

        {counts && !nothingAtAll ? (
          <p className="-mt-1 text-sm text-text-muted" data-stats aria-busy={busy || undefined}>
            {busy ? <span className="mr-1.5 inline-block size-3 animate-spin rounded-full border-2 border-primary/30 border-t-primary align-[-1px]" role="status" aria-label="Updating" /> : null}
            <b className="font-semibold text-text">{filter === "retired" ? many(counts.retired, "retired combination", "retired combinations") : q ? `${counts.all} of ${many(scopeTotal, "combination", "combinations")} match` : many(counts.all, "combination", "combinations")}</b>{pathwayLabel ? ` in ${pathwayLabel}` : ""}
            {([["live", "live"], ["in_progress", "in progress"], ["not_started", "not started"]] as const).filter(([k]) => counts[k]).map(([k, w]) => ` · ${counts[k]} ${w}`).join("")}
            {counts.retired && filter !== "retired" ? ` · ${counts.retired} retired, not shown (Retired)` : ""}
            {filter !== "all" && filter !== "retired" ? ` · showing ${rows.length} ${statusWord}` : needsOnly ? ` · showing ${rows.length} that need you` : ""}
            {activeChips.length ? <span className="ml-2 inline-flex flex-wrap items-center gap-1.5 align-middle" data-active-filters>
              {activeChips.map((c) => <span key={c.key} className="inline-flex h-6 items-center gap-1 rounded-full border border-primary/40 bg-primary/10 pl-2.5 pr-1 text-xs font-medium text-text-link">{c.label}<button type="button" aria-label={`Remove the filter ${c.label}`} onClick={c.clear} className="flex size-4 items-center justify-center rounded-full hover:bg-primary/15"><X className="size-3" /></button></span>)}
              <button type="button" className="text-sm font-medium text-text-link underline underline-offset-2" onClick={() => { setTyped(""); set({ p: null, prog: null, under: null, f: null, n: null, q: null }); }} data-clear-all>Clear all</button>
            </span> : null}
            <span className="block text-xs" data-sample-note>Names are Sample until the immigration expert confirms.</span>
          </p>
        ) : null}
        {note ? <p role="status" className="-mt-1 text-sm text-text-ok" data-page-note>{note}</p> : null}
        {cat.data?.fellBack ? <p className="text-sm text-text-muted" role="status">Nothing needs work right now, so every combination is shown.</p> : null}
        {q && cat.data?.otherPathwayMatches ? <p className="text-sm text-text-muted" role="status">{many(cat.data.otherPathwayMatches, "match", "matches")} in {PATHWAY_LABEL[other]}. <button type="button" className="text-text-link underline" onClick={() => set({ pw: other === "CORPORATE" ? "CORPORATE" : null, p: null, prog: null, under: null })}>Show {cat.data.otherPathwayMatches === 1 ? "it" : "them"}</button></p> : null}
        {pathway === "CORPORATE" && !nothingAtAll ? <CorporateCallout /> : null}

        {cat.isError ? <Notice tone="danger" title="The combinations could not load" action={<Button size="sm" variant="secondary" onClick={() => void cat.refetch()}>Retry</Button>}>{(cat.error as Error).message} Your work is safe. If it keeps failing, restart the studio.</Notice>
          : cat.isLoading || !knowsPerson ? <CardsSkeleton />
          : nothingAtAll ? (
            <EmptyState title={`Nothing set up in ${typeLabel} yet`} description={canAuthor ? "Start with the Program structure: add the pathways, programs and categories you offer. Each category or sub-category you add appears here as a card." : noPerson ? "The studio could not tell who you are, so nothing can be added yet: see the notice above, then reload." : "A configuration author adds the pathways, programs and categories on the Program structure; each one appears here as a card."}
              action={<Button onClick={() => nav(`/structure${pathway === "CORPORATE" ? "?t=CORPORATE" : ""}`)}><ListTree /> Open Program structure</Button>} />
          ) : !rows.length && filtering ? (
            <EmptyState title="Nothing matches" description={`${q ? `No combination matches “${q}”` : needsOnly && filter === "all" ? "Nothing waits for you" : `No combination is ${statusWord}`}${pathwayLabel ? ` in ${pathwayLabel}` : ` in ${typeLabel}`}${q && filter !== "all" ? ` and is ${statusWord}` : ""}${scopeChip ? `, under ${scopeChip}` : ""}.`}
              action={<Button variant="secondary" onClick={() => { setTyped(""); set({ q: null, prog: null, under: null, f: null, n: null }); }}>{q ? "Clear search" : "Show all"}</Button>} />
          ) : view === "cards" ? (
            <div className={cn("flex flex-col gap-5 transition-opacity", busy && "opacity-60")} data-view="cards">
              {groups.map((g) => (
                <section key={g.s.pathwayKey} aria-labelledby={`sec-${g.s.pathwayKey}`} data-section={g.s.pathwayKey}>
                  <SectionHeader s={g.s} accent={g.i} shown={g.rows.length} filtering={filtering} needsOnly={needsOnly} closed={closed.has(g.s.pathwayKey)} onToggle={() => toggle(g.s.pathwayKey)} />
                  {closed.has(g.s.pathwayKey) ? null : g.rows.length ? g.programs.map((p) => (
                    <div key={p.key} data-program-section={p.key}>
                      <ProgramHeader p={p} closed={closed.has(p.key)} onToggle={() => toggle(p.key)} />
                      {closed.has(p.key) ? null : (
                        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-label={`${p.label} combinations`}>
                          {p.rows.map((r) => <li key={r.nodeKey} className="flex min-w-0"><SetupCard r={r} lit={lit(r.nodeKey)} justAdded={outlined === r.nodeKey} q={q} canAuthor={canAuthor} onOpen={() => void open(r)} onResume={() => resume(r)} /></li>)}
                        </ul>
                      )}
                    </div>
                  )) : <SectionEmpty label={g.s.label} pathway={pathway} />}
                </section>
              ))}
            </div>
          ) : <List groups={groups} closed={closed} onToggle={toggle} highlight={sel ?? outlined} q={q} sort={sort} filtering={filtering} needsOnly={needsOnly} pathway={pathway} canAuthor={canAuthor} onSort={() => set({ sort: sort === "path" ? "status" : sort === "status" ? "-status" : null })} onOpen={(r) => void open(r)} onResume={resume} />}
        {rows.length && knowsPerson ? <p className="sr-only" role="status">{many(rows.length, "combination", "combinations")} shown</p> : null}
      </div>
      <AddToStructure open={!!adding} onClose={() => setAdding(null)} type={pathway as PathwayType} prefill={adding ?? undefined}
        onAdded={(r, again) => { showAdded.current = r.leaf.key; setJustAdded(r.leaf.key); setNote(`Added ${r.trail.join(" › ")}${r.combination ? ": listed here as Not started; no setup started." : ". Add a category under it to list a combination here."}`); if (!again) setAdding(null); }}
        onShow={(k) => { setAdding(null); showAdded.current = k; setJustAdded(k); }} />
    </TipProvider>
  );
}

type ProgramGroup = { key: string; label: string; combinations: number; live: number; rows: CatalogueLeaf[] };
type Group = { s: CatalogueSection; i: number; rows: CatalogueLeaf[]; programs: ProgramGroup[] };

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

/** The status chips (P-180 Q2), each with its count for this tab and search; Retired only while one is retired. */
function StatusChips({ value, counts, onChange }: { value: StatusKey; counts?: CatalogueResponse["counts"]; onChange: (k: StatusKey) => void }) {
  return (
    <div role="group" aria-label="Status" className="flex flex-wrap items-center gap-1.5" data-status-chips>
      {STATUSES.filter(([k]) => k !== "retired" || counts?.retired || value === "retired").map(([k, w, tip]) => (
        <Tip key={k} tip={tip}>
          <button type="button" aria-pressed={value === k} onClick={() => onChange(k)} data-status-chip={k}
            className={cn("inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50", value === k ? "border-primary bg-primary/10 font-semibold text-text-link" : "border-border-strong bg-surface-raised text-text hover:bg-text/5")}>
            {w}<span className="text-xs font-medium tabular-nums text-text-muted">{counts ? counts[k] : "…"}</span>
          </button>
        </Tip>
      ))}
    </div>
  );
}

const liveCount = (live: number, of: number) => `${live} of ${of} live`;

function SectionHeader({ s, accent, shown, filtering, needsOnly, closed, onToggle }: { s: CatalogueSection; accent: number; shown: number; filtering: boolean; needsOnly: boolean; closed: boolean; onToggle: () => void }) {
  return (
    <h2 id={`sec-${s.pathwayKey}`} className="rounded-lg border border-lv1-b bg-lv1-t py-1 pl-2 text-base" style={{ borderLeft: `4px solid ${pathwayAccent(accent)}` }} data-band>
      <button type="button" aria-expanded={!closed} onClick={onToggle} className="inline-flex items-center gap-2 rounded-md py-0.5 pr-2 text-left outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50">
        {closed ? <ChevronRight className="size-4 text-text-muted" aria-hidden /> : <ChevronDown className="size-4 text-text-muted" aria-hidden />}
        <LevelMark level="pathway" tip={false} />
        <span className="font-semibold text-lv1">{s.label}</span>
        <span className="text-sm font-normal text-text-muted" data-live-count>{liveCount(s.live, s.combinations)}{filtering ? ` · ${shown} shown` : ""}</span>
        {needsOnly && s.needs ? <span className="rounded-full bg-warn/15 px-1.5 text-xs font-semibold text-text-warn" data-need-you>{s.needs} need{s.needs === 1 ? "s" : ""} you</span> : null}
      </button>
    </h2>
  );
}

function ProgramHeader({ p, closed, onToggle }: { p: ProgramGroup; closed: boolean; onToggle: () => void }) {
  return (
    <h3 className="mb-2 mt-3 pl-1 text-sm" data-program-band>
      <button type="button" aria-expanded={!closed} onClick={onToggle} className="inline-flex min-h-7 items-center gap-2 rounded-md py-0.5 pr-2 text-left outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50">
        {closed ? <ChevronRight className="size-4 text-text-muted" aria-hidden /> : <ChevronDown className="size-4 text-text-muted" aria-hidden />}
        <span className="font-semibold text-lv2">{p.label}</span>
        <span className="text-xs font-normal text-text-muted" data-live-count>{liveCount(p.live, p.combinations)}</span>
      </button>
    </h3>
  );
}

function SectionEmpty({ label, pathway }: { label: string; pathway: string }) {
  return <p className="mt-2 rounded-lg border border-dashed border-border-strong px-4 py-3 text-sm text-text-muted">No combinations in {label} yet. Add its programs and categories on the <Link className="text-text-link underline underline-offset-2" to={`/structure${pathway === "CORPORATE" ? "?t=CORPORATE" : ""}`}>Program structure</Link>; each appears here as a card.</p>;
}

/** The five parts of the setup, decorative only (the progress words carry the meaning): one per step done, all green
 *  when Live, none when Retired. `mini` is the List's small bar. */
function StepBar({ r, mini }: { r: CatalogueLeaf; mini?: boolean }) {
  const st = chipOf(r);
  if (st === "RETIRED") return mini ? <span className="inline-block w-[58px]" aria-hidden /> : null;
  const done = doneOf(r);
  return (
    <span aria-hidden data-edge-bar={st === "LIVE" ? "live" : done}
      className={mini ? "inline-grid w-[58px] shrink-0 grid-cols-5 gap-0.5" : "absolute inset-x-0 bottom-0 grid h-0.5 grid-cols-5 gap-0.5"}>
      {[0, 1, 2, 3, 4].map((i) => <i key={i} className={cn(mini && "h-1 rounded-sm", st === "LIVE" ? "bg-ok" : i < done ? "bg-primary" : "bg-text/10")} />)}
    </span>
  );
}

/** Needs you (P-180 Q1): only when an item on this person's duty and tier waits; its hover says what and how many. */
function NeedsYouMark({ r, className, tabIndex = 0 }: { r: CatalogueLeaf; className?: string; tabIndex?: number }) {
  const n = needsYouOf(r);
  if (!n) return null;
  return (
    <Tip focusable={tabIndex} tip={n.text}>
      <span role="img" aria-label={`Needs you: ${n.text}`} data-needs-you-mark={n.count} onClick={(e) => e.stopPropagation()}
        className={cn("inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full border border-warn/50 bg-warn/10 px-2 py-px text-xs font-semibold text-text-warn outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50", className)}>
        <span className="size-1.5 rounded-full bg-warn" aria-hidden />Needs you
      </span>
    </Tip>
  );
}

/** The card's one button (P-180): Start setup · Resume setup · Open, in the one primary colour, the same place and size on
 *  every card; Open for anyone without the author duty. A retired name that was never set up is restored, not opened. */
function CardButton({ r, canAuthor, tabIndex, onOpen, onResume }: { r: CatalogueLeaf; canAuthor: boolean; tabIndex?: number; onOpen: () => void; onResume: () => void }) {
  if (r.retired && !r.combinationId) return <Link tabIndex={tabIndex} to={`/structure?r=1${r.pathwayType === "CORPORATE" ? "&t=CORPORATE" : ""}`} onClick={(e) => e.stopPropagation()} className="text-sm text-text-link underline">Restore on Program structure</Link>;
  const word = r.setup?.viewer.button ?? (isNotStarted(r) && canAuthor ? "Start setup" : "Open");
  if (word === "Start setup" && canAuthor) return <StartSetupButton nodeKey={r.nodeKey} label={r.label} why={r.startWhy} step />;
  const resume = word === "Resume setup";
  return <Button size="sm" tabIndex={tabIndex} data-card-button={resume ? "resume" : "open"} aria-label={`${word}: ${r.label}`} onClick={(e) => { e.stopPropagation(); if (resume) onResume(); else onOpen(); }}>{word}</Button>;
}

function Progress({ r, mini }: { r: CatalogueLeaf; mini?: boolean }) {
  const st = chipOf(r);
  const text = mini ? (st === "LIVE" ? "Live" : st === "RETIRED" ? "Retired" : `${doneOf(r)} of 5`) : progressText(r);
  // QA-184: a Live combination says Live first, then what its next release still needs (the Overview's words). The
  // List's 120 px column (review m1) gives it its own short line, "5 of 5 steps to do", with the full words for screen
  // readers and on hover.
  const next = st === "LIVE" ? r.setup?.bar.next : null;
  if (next && mini) return (
    <span data-progress={st} title={next} className="flex flex-col leading-tight">
      <span className="font-semibold text-text-ok">Live</span>
      <span className="whitespace-nowrap text-xs text-text-muted" data-next-release><span className="sr-only"> · Next release: </span>{next.replace(/^Next release: /, "")}</span>
    </span>
  );
  return <span data-progress={st} className={cn(st === "LIVE" ? "font-semibold text-text-ok" : st === "RETIRED" ? "text-text-muted" : "text-text")}>{text}{next ? <span className="font-normal text-text-muted" data-next-release> · {next}</span> : null}</span>;
}

/** A card (concept v4 §7): the name, the full trail, "n of 5 steps" or "✓ Live" with the edge bar, the filing tag (X1b, P-208), Needs you and one
 *  button. The name, and the rest of the card, open the combination page. */
function SetupCard({ r, lit, justAdded, q, canAuthor, onOpen, onResume }: { r: CatalogueLeaf; lit: boolean; justAdded?: boolean; q: string; canAuthor: boolean; onOpen: () => void; onResume: () => void }) {
  const trail = trailOf(r).join(" › ");
  const needs = !!needsYouOf(r);
  return (
    <article data-node={r.nodeKey} data-label={r.label} data-state={chipOf(r)} data-just-added={justAdded ? "" : undefined} aria-label={`${trail}, ${progressWords(r)}${needs ? ", needs you" : ""}`} onClick={onOpen}
      className={cn("relative flex min-h-[148px] w-full cursor-pointer flex-col gap-1 overflow-hidden rounded-xl border bg-surface-raised px-4 pb-4 pt-3.5 shadow-sm transition-colors", lit ? "border-primary ring-2 ring-primary/25" : "border-border hover:border-border-strong")}>
      {needs ? <NeedsYouMark r={r} className="absolute right-3 top-3" /> : null}
      <h3 className={cn("text-base font-semibold leading-snug text-lv3", needs && "pr-24")}>
        <button type="button" data-open onClick={(e) => { e.stopPropagation(); onOpen(); }} className="text-left [overflow-wrap:anywhere] outline-none hover:underline focus-visible:rounded focus-visible:ring-[3px] focus-visible:ring-ring/50">{nameOf(r)}</button>
      </h3>
      <p className="truncate text-xs text-text-muted" title={trail} data-trail>{trail}</p>
      <Tip tip={BAR_TIP}><p className="mt-1.5 w-fit text-[13px]">{<Progress r={r} />}</p></Tip>
      {r.filing && FILING_KINDS.some((k) => r.filing!.startsWith(k)) ? <FilingTag filing={r.filing} /> : null}
      {q && r.matches.some((m) => m !== "name") ? <p className="text-xs text-text-muted">Matches: {r.matches.filter((m) => m !== "name").join(", ")}</p> : null}
      <div className="mt-auto pt-2.5" data-card-act><CardButton r={r} canAuthor={canAuthor} onOpen={onOpen} onResume={onResume} /></div>
      <StepBar r={r} />
    </article>
  );
}

/** X1b (P-208): how the combination is filed, as a small tag on its card: "PDF only" · "Online only" · "Mixed" (the
 *  catalogue's C1.6 words, engine/channels.ts filingKind; "Mixed: online and PDF" is shortened on the card and said in
 *  full to screen readers and on hover). No tag while it has no form lines (filing is null). */
/** Review m2: only a filing method gets a tag ("Checklists only" is not one). */
export const FILING_KINDS = ["PDF only", "Online only", "Paper only", "Mixed"];
export const FILING_TAG = (filing: string) => (filing.startsWith("Mixed") ? "Mixed" : filing);
function FilingTag({ filing }: { filing: string }) {
  return <p className="w-fit"><span className="rounded border border-border px-1.5 py-px text-xs text-text-muted" title={`Filing: ${filing}`} data-filing-tag={FILING_TAG(filing)}><span className="sr-only">Filing: {filing}</span><span aria-hidden>{FILING_TAG(filing)}</span></span></p>;
}

function CorporateCallout() {
  return (
    <aside aria-label="How employer and worker cases connect" className="rounded-xl border border-border bg-surface-raised p-4 text-sm" data-corporate-callout>
      <p className="font-semibold">How employer and worker cases connect <span className="ml-1 rounded border border-border px-1.5 text-xs font-normal text-text-muted">Sample examples</span></p>
      <p className="mt-1 text-text-muted">The employer's LMIA is set up here; the worker's work permit is set up under Retail. On the worker's case the case officer picks "relies on employer case", and the employer's name, address and LMIA number fill in (later wave).</p>
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
    <div aria-busy="true" aria-label="Loading combinations" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }, (_, i) => <div key={i} className="min-h-[148px] space-y-2.5 rounded-xl border border-border bg-surface-raised p-4"><Skeleton className="h-5 w-2/3" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-1/3" /><Skeleton className="h-8 w-28" /></div>)}
      <span className="sr-only" role="status">Loading combinations</span>
    </div>
  );
}

/** The list (P-115, board v4): one line per combination under its Pathway and Program bands that fold: name, trail, a
 *  five-part mini bar with "n of 5" or "Live", Needs you, the button. One tab stop for the rows (roving focus): ↑/↓
 *  move, Home/End jump, Enter opens; Tab reaches the button. */
function List({ groups, closed, onToggle, highlight, q, sort, filtering, needsOnly, pathway, canAuthor, onSort, onOpen, onResume }: { groups: Group[]; closed: Set<string>; onToggle: (k: string) => void; highlight: string | null; q: string; sort: string; filtering: boolean; needsOnly: boolean; pathway: string; canAuthor: boolean; onSort: () => void; onOpen: (r: CatalogueLeaf) => void; onResume: (r: CatalogueLeaf) => void }) {
  const rows = groups.flatMap((g) => (closed.has(g.s.pathwayKey) ? [] : g.programs.flatMap((p) => (closed.has(p.key) ? [] : p.rows))));
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
  const band = (key: string, shut: boolean, body: React.ReactNode, cls: string, style?: React.CSSProperties) => (
    <div role="row" data-group={key} className={cls} style={style}>
      <span role="rowheader" className="flex items-center">
        <button type="button" aria-expanded={!shut} onClick={() => onToggle(key)} className="inline-flex min-h-7 items-center gap-2 rounded-md px-2 py-0.5 text-sm outline-none hover:text-text-link focus-visible:ring-[3px] focus-visible:ring-ring/50">
          {shut ? <ChevronRight className="size-4 text-text-muted" aria-hidden /> : <ChevronDown className="size-4 text-text-muted" aria-hidden />}{body}
        </button>
      </span>
    </div>
  );
  return (
    // overflow-clip, not overflow-hidden: hidden makes the grid the sticky bands' scroll box, so a Pathway band stuck
    // 56 px down inside it and covered the first Program band (axe target-size).
    <div className="overflow-clip rounded-lg border border-border bg-surface-raised" role="grid" aria-label="Combinations" aria-readonly="true" data-view="list">
      <div role="row" className={cn(GRID, "border-b border-border bg-surface px-4 py-2 text-xs font-semibold text-text-muted")}>
        <span role="columnheader">Combination</span>
        <span role="columnheader" className="sr-only sm:not-sr-only">Trail</span>
        <span role="columnheader" aria-sort={sort === "status" ? "ascending" : sort === "-status" ? "descending" : "none"} className="sr-only sm:not-sr-only">
          <Tip tip={sort === "path" ? "Sort by progress: In progress first, then Not started, then Live" : sort === "status" ? "Sort by progress, Live first" : "Back to Program structure order"}>
            <button type="button" onClick={onSort} className="inline-flex items-center gap-1 rounded outline-none hover:text-text focus-visible:ring-[3px] focus-visible:ring-ring/50">Progress <SortIcon className="size-3.5" aria-hidden /></button>
          </Tip>
        </span>
        <span role="columnheader" className="sr-only">Needs you</span>
        <span role="columnheader" className="sr-only">Action</span>
      </div>
      {groups.map(({ s, i: gi, rows: mine, programs }) => {
        const shut = closed.has(s.pathwayKey);
        return (
          <React.Fragment key={s.pathwayKey}>
            {band(s.pathwayKey, shut, <><LevelMark level="pathway" tip={false} /><b className="font-semibold text-lv1">{s.label}</b><span className="text-text-muted" data-live-count>· {liveCount(s.live, s.combinations)}{filtering ? ` · ${mine.length} shown` : ""}</span>
              {needsOnly && s.needs ? <span className="rounded-full bg-warn/15 px-1.5 text-xs font-semibold text-text-warn" data-need-you>{s.needs} need{s.needs === 1 ? "s" : ""} you</span> : null}</>,
              "sticky top-14 z-10 border-b border-lv1-b bg-lv1-t px-2 py-1.5", { boxShadow: `inset 4px 0 0 ${pathwayAccent(gi)}` })}
            {shut ? null : !mine.length ? <div role="row" className="border-b border-border px-4 py-2.5 text-sm text-text-muted"><span role="gridcell"><SectionEmpty label={s.label} pathway={pathway} /></span></div> : programs.map((p) => (
              <React.Fragment key={p.key}>
                {band(p.key, closed.has(p.key), <><span className="font-semibold text-lv2">{p.label}</span><span className="text-xs text-text-muted" data-live-count>· {liveCount(p.live, p.combinations)}</span></>, "border-b border-border bg-surface px-4 py-1")}
                {closed.has(p.key) ? null : p.rows.map((r) => {
                  const active = current?.nodeKey === r.nodeKey, lit = highlight === r.nodeKey, ti = active ? 0 : -1;
                  const trail = trailOf(r), above = trail.slice(0, -1).join(" › ");
                  return (
                    <div key={r.nodeKey} role="row" aria-selected={lit} tabIndex={ti} data-node={r.nodeKey} data-label={r.label} data-state={chipOf(r)} aria-label={`${trail.join(" › ")}, ${progressWords(r)}${needsYouOf(r) ? ", needs you" : ""}`}
                      ref={(el) => { if (el) refs.current.set(r.nodeKey, el); else refs.current.delete(r.nodeKey); }}
                      onKeyDown={(e) => onKey(e, r)} onFocus={(e) => { if (e.target === e.currentTarget) setFocus(r.nodeKey); }} onClick={() => onOpen(r)}
                      className={cn(GRID, "min-h-11 cursor-pointer border-b border-border px-4 py-1.5 outline-none last:border-b-0 focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/60", lit ? "bg-primary/10 shadow-[inset_3px_0_0_var(--color-primary)]" : "hover:bg-text/[0.03]")}>
                      <div role="gridcell" className="min-w-0 truncate text-sm font-semibold text-lv3" data-name>{nameOf(r)}</div>
                      <div role="gridcell" className="col-start-1 row-start-2 min-w-0 sm:col-start-auto sm:row-start-auto">
                        <span className="block truncate text-xs text-text-muted" title={above} data-trail>{above}</span>
                        {q && r.matches.some((m) => m !== "name") ? <span className="block truncate text-xs text-text-muted">Matches: {r.matches.filter((m) => m !== "name").join(", ")}</span> : null}
                      </div>
                      <div role="gridcell" className="col-start-1 row-start-3 flex items-center gap-2 text-sm sm:col-start-auto sm:row-start-auto"><StepBar r={r} mini /><Progress r={r} mini /></div>
                      <div role="gridcell" className="col-start-2 row-start-1 justify-self-end sm:col-start-auto sm:row-start-auto sm:justify-self-start"><NeedsYouMark r={r} tabIndex={ti} /></div>
                      <div role="gridcell" className="col-start-2 row-span-2 row-start-2 justify-self-end sm:col-start-auto sm:row-span-1 sm:row-start-auto sm:justify-self-start" data-step-cell><CardButton r={r} canAuthor={canAuthor} tabIndex={ti} onOpen={() => onOpen(r)} onResume={() => onResume(r)} /></div>
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </React.Fragment>
        );
      })}
    </div>
  );
}
