// Structure (W1-03, slice 2; concept §2–§8, board design/draft-structure-v2.html; P-104, P-112, P-115, P-116): the one
// place new names enter. An outline per Pathway type (Retail · Corporate and employers): Pathway › Program › Category ›
// Sub-category, with a "+ Add …" row typed in place at the end of each group (the free name check runs as you type),
// and a side panel for the selected name: trail, what uses it, where cases may be opened, rename, order, remove /
// retire / restore (each approved by a second person), history. The outline is a WAI-ARIA tree with one tab stop.
// Every write goes to /api/structure (contracts/structure.ts); the server decides and the page shows its reasons.
import * as React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Info, Plus, Search, X } from "lucide-react";
import type { Level, LifecycleAction, PathwayType, StructureNode, UsesView } from "../../../contracts/structure";
import { api, ApiError, useApi, useSessionView } from "@/lib/api";
import { Button, Input, Notice, Pill, Textarea } from "@/components/ui/controls";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtWhen, StatusChip, Tip, TipProvider } from "@/components/status";
import { PathwayCards } from "@/components/pathway-cards";
import { cn } from "@/lib/utils";

type ListResp = { pathwayType: PathwayType; typeLabel: string; nodes: StructureNode[]; empty: boolean; meaningCheck: { on: boolean; why: string } };
type Close = { key: string; label: string; trail: string[]; why: string };
type Check = { exact: { key: string; label: string; trail: string[] } | null; close: Close[] };
/** The parts of a refusal (Problem Details) this page acts on: close names to show, or a stale edit. */
type Refusal = { code?: string; close?: Close[] };

const TYPES: { value: PathwayType; label: string; tip: string }[] = [
  { value: "INDIVIDUAL", label: "Retail", tip: "Who applies: a person and their family. Applications a person makes for themselves and their family." },
  { value: "CORPORATE", label: "Corporate and employers", tip: "Who applies: an employer or organisation, such as for an LMIA." },
];
const LEVEL_WORD: Record<Level, string> = { pathway: "Pathway", program: "Program", category: "Category", subCategory: "Sub-category" };
const CHILD: Record<Level, Level | null> = { pathway: "program", program: "category", category: "subCategory", subCategory: null };
const LEVEL_TIP: Record<Level, string> = {
  pathway: "The outcome the application leads to, such as temporary or permanent residence.",
  program: "A group of applications under a pathway, such as Visitors or Study permits.",
  category: "One kind of application. A category without sub-categories is a combination.",
  subCategory: "A variant IRCC files as a different application. Every sub-category is a combination.",
};
const LOCS = [["inside_canada", "Inside"], ["outside_canada", "Outside"], ["both", "Both"]] as const;
const locKey = (l: string[]) => (l.length === 2 ? "both" : l[0] ?? "both");
const locList = (k: string) => (k === "both" ? ["inside_canada", "outside_canada"] : [k]);
const locWords = (l: string[]) => (l.length === 2 ? "Inside or outside Canada" : l[0] === "inside_canada" ? "Inside Canada" : l[0] === "outside_canada" ? "Outside Canada" : "—");
const LOC_TIP = "Where a case for it may be opened. Sample until the immigration expert confirms.";
const NMC_TIP = "Only the spelling check ran; a reviewer compares the meaning by eye. The AI meaning check runs when paid runs are on.";
const AUTHOR_ONLY = "Only a configuration author adds, renames, orders or removes names. You can read everything.";
const PENDING_WORD: Record<LifecycleAction, string> = { DELETE: "Removal waiting", RETIRE: "Retire waiting", RESTORE: "Restore waiting" };
const norm = (s: string) => s.normalize("NFKC").toLocaleLowerCase("en-CA").replace(/[^\p{L}\p{N}]+/gu, " ").trim();

type Row = { kind: "node"; node: StructureNode; depth: number; expandable: boolean } | { kind: "add"; key: string; level: Level; parentKey: string | null; depth: number; parentLabel: string | null; disabled: string | null };

export function StructurePage() {
  const [sp, setSp] = useSearchParams();
  const type: PathwayType = sp.get("t") === "CORPORATE" ? "CORPORATE" : "INDIVIDUAL";
  const typeLabel = TYPES.find((t) => t.value === type)!.label;
  const selected = sp.get("node");
  const [q, setQ] = React.useState(sp.get("q") ?? "");
  const { canAuthor, known } = useSessionView();
  const list = useApi<ListResp>(["structure", type], `/structure?pathwayType=${type}`);
  const other = useApi<ListResp>(["structure", type === "INDIVIDUAL" ? "CORPORATE" : "INDIVIDUAL"], q.trim() ? `/structure?pathwayType=${type === "INDIVIDUAL" ? "CORPORATE" : "INDIVIDUAL"}` : null);
  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set());
  const [adding, setAdding] = React.useState<{ level: Level; parentKey: string | null } | null>(null);
  const [focusKey, setFocusKey] = React.useState<string | null>(null);
  const treeRef = React.useRef<HTMLDivElement>(null);
  const set = (patch: Record<string, string | null>) => setSp((p) => { const n = new URLSearchParams(p); for (const [k, v] of Object.entries(patch)) v ? n.set(k, v) : n.delete(k); return n; }, { replace: true });

  const nodes = list.data?.nodes ?? [];
  const byKey = React.useMemo(() => new Map(nodes.map((n) => [n.key, n])), [nodes]);
  const kids = React.useMemo(() => { const m = new Map<string | null, StructureNode[]>(); for (const n of nodes) m.set(n.parentKey, [...(m.get(n.parentKey) ?? []), n]); return m; }, [nodes]);
  const words = norm(q);
  const matches = React.useMemo(() => {
    if (!words) return null;
    const keep = new Set<string>();
    for (const n of nodes) if (norm(n.label).includes(words)) for (let x: StructureNode | undefined = n; x; x = x.parentKey ? byKey.get(x.parentKey) : undefined) keep.add(x.key);
    return keep;
  }, [words, nodes, byKey]);
  const isLeaf = (n: StructureNode) => n.level === "subCategory" || (n.level === "category" && !(kids.get(n.key)?.length));
  const expandable = (n: StructureNode) => n.level === "pathway" || n.level === "program" || (n.level === "category" && !!kids.get(n.key)?.length);

  const rows = React.useMemo(() => {
    const out: Row[] = [];
    const addRow = (level: Level, parent: StructureNode | null, depth: number) => {
      if (matches) return;
      const disabled = !canAuthor ? AUTHOR_ONLY : parent?.retired ? `"${parent.label}" is retired: restore it first.` : null;
      out.push({ kind: "add", key: `add:${parent?.key ?? "top"}`, level, parentKey: parent?.key ?? null, depth, parentLabel: parent?.label ?? null, disabled });
    };
    const walk = (n: StructureNode, depth: number) => {
      if (matches && !matches.has(n.key)) return;
      out.push({ kind: "node", node: n, depth, expandable: expandable(n) });
      // QA-45: a category with no sub-categories yet has no add row of its own; "Add sub-category" in the panel opens one
      // under it, typed in place like every other.
      if (!expandable(n) && n.level === "category" && adding?.level === "subCategory" && adding.parentKey === n.key) addRow("subCategory", n, depth + 1);
      if (!expandable(n) || (collapsed.has(n.key) && !matches)) return;
      for (const c of kids.get(n.key) ?? []) walk(c, depth + 1);
      const child = CHILD[n.level];
      if (child) addRow(child, n, depth + 1);
    };
    for (const p of kids.get(null) ?? []) walk(p, 0);
    addRow("pathway", null, 0);
    return out;
  }, [kids, collapsed, matches, canAuthor, adding]);
  const rowKey = (r: Row) => (r.kind === "node" ? r.node.key : r.key);
  const current = focusKey && rows.some((r) => rowKey(r) === focusKey) ? focusKey : rows[0] ? rowKey(rows[0]) : null;
  React.useEffect(() => { if (focusKey && treeRef.current?.contains(document.activeElement)) treeRef.current.querySelector<HTMLElement>(`[data-key="${CSS.escape(focusKey)}"]`)?.focus(); }, [focusKey, rows]);

  const toggle = (key: string, open?: boolean) => setCollapsed((c) => { const n = new Set(c); (open ?? n.has(key)) ? n.delete(key) : n.add(key); return n; });
  const startAdd = (level: Level, parentKey: string | null) => { if (parentKey) toggle(parentKey, true); setAdding({ level, parentKey }); };
  const onKey = (e: React.KeyboardEvent) => {
    if ((e.target as HTMLElement).closest("[data-add-row]")) return; // typing in the add row
    const i = rows.findIndex((r) => rowKey(r) === current);
    if (i < 0) return;
    const r = rows[i];
    const go = (j: number) => { const t = rows[Math.max(0, Math.min(rows.length - 1, j))]; if (t) setFocusKey(rowKey(t)); };
    const parentIndex = () => { const pk = r.kind === "node" ? r.node.parentKey : r.parentKey; return rows.findIndex((x) => x.kind === "node" && x.node.key === pk); };
    switch (e.key) {
      case "ArrowDown": go(i + 1); break;
      case "ArrowUp": go(i - 1); break;
      case "Home": go(0); break;
      case "End": go(rows.length - 1); break;
      case "ArrowRight": if (r.kind === "node" && r.expandable) { if (collapsed.has(r.node.key)) toggle(r.node.key, true); else go(i + 1); } break;
      case "ArrowLeft": if (r.kind === "node" && r.expandable && !collapsed.has(r.node.key)) toggle(r.node.key, false); else { const p = parentIndex(); if (p >= 0) go(p); } break;
      case "Enter": case " ": if (r.kind === "node") set({ node: r.node.key }); else if (!r.disabled) startAdd(r.level, r.parentKey); break;
      default: return;
    }
    e.preventDefault();
  };

  const live = nodes.filter((n) => !n.retired);
  const count = (l: Level) => live.filter((n) => n.level === l).length;
  const combos = live.filter((n) => n.level === "pathway").reduce((s, n) => s + n.combinations, 0);
  const many = (n: number, one: string, more: string) => `${n} ${n === 1 ? one : more}`;
  const otherMatches = words && other.data ? other.data.nodes.filter((n) => norm(n.label).includes(words)).length : 0;
  const selectedNode = selected ? byKey.get(selected) : undefined;
  // S1-finish (founder, 27 Oct): the Pathway cards open one Pathway's tree and close the others; "All" opens everything.
  const pathways = (kids.get(null) ?? []).filter((n) => n.level === "pathway");
  const openPathway = sp.get("p");
  const below = (k: string): StructureNode[] => (kids.get(k) ?? []).flatMap((c) => [c, ...below(c.key)]);
  const openOne = (key: string | null) => {
    set({ p: key, node: null });
    setCollapsed(new Set(key ? pathways.filter((x) => x.key !== key).map((x) => x.key) : []));
  };
  /** The combinations below a name, each with its path from just under that name ("Study permit › Outside Canada"). */
  const leavesUnder = (k: string) => below(k).filter((n) => isLeaf(n)).map((n) => {
    const path: string[] = [];
    for (let x: StructureNode | undefined = n; x && x.key !== k; x = x.parentKey ? byKey.get(x.parentKey) : undefined) path.unshift(x.label);
    return { n, path };
  });

  return (
    <TipProvider>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-semibold">Structure</h1>
        <Tip focusable tip="The list of pathways, programs, categories and sub-categories. Every category without sub-categories, and every sub-category, is a combination."><span className="text-text-muted outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"><Info className="size-4" aria-label="About the Structure" /></span></Tip>
        <p className="w-full text-sm text-text-muted">Where every combination sits: Pathway › Program › Category › Sub-category.</p>
      </div>
      <div className={cn("grid gap-6", selectedNode && "xl:grid-cols-[minmax(0,1fr)_420px]")}>
        <section aria-label={`${typeLabel} structure`} className="min-w-0 max-w-[780px]">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div role="group" aria-label="Pathway type" className="inline-flex w-fit items-center gap-0.5 rounded-xl border border-border bg-surface p-0.5">
              {TYPES.map((t) => (
                <Tip key={t.value} tip={t.tip}>
                  <button type="button" aria-pressed={type === t.value} onClick={() => { set({ t: t.value === "INDIVIDUAL" ? null : t.value, node: null, p: null }); setAdding(null); setCollapsed(new Set()); }}
                    className={cn("inline-flex h-8 items-center rounded-lg px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50", type === t.value ? "bg-primary font-semibold text-primary-foreground shadow-sm" : "text-text-muted hover:text-text")}>{t.label}</button>
                </Tip>
              ))}
            </div>
            <label className="relative min-w-[200px] flex-1">
              <span className="sr-only">Find a name</span>
              <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-text-muted" aria-hidden />
              <Tip tip="Find a name at any level in this tab. The names above a match stay shown."><Input value={q} onChange={(e) => { setQ(e.target.value); set({ q: e.target.value || null }); }} placeholder="Find a name" className="pl-8" /></Tip>
              {q ? <button type="button" aria-label="Clear the search" className="absolute right-1 top-1.5 flex size-6 items-center justify-center rounded text-text-muted hover:bg-text/5" onClick={() => { setQ(""); set({ q: null }); }}><X className="size-4" /></button> : null}
            </label>
            <Tip tip="Open every group in this tab."><Button size="sm" variant="secondary" onClick={() => openOne(null)}>Expand all</Button></Tip>
            <Tip tip="Show the pathways only; open a group with its arrow."><Button size="sm" variant="secondary" onClick={() => { set({ p: null }); setCollapsed(new Set(nodes.filter((n) => n.level === "pathway").map((n) => n.key))); }}>Collapse all</Button></Tip>
          </div>
          {list.data && !list.data.empty && pathways.length ? (
            <div className="mb-3"><PathwayCards typeLabel={typeLabel} pathways={pathways} open={openPathway && pathways.some((x) => x.key === openPathway) ? openPathway : null} onOpen={openOne}
              allTip={`Shows the whole ${typeLabel} outline, every pathway open.`} cardTip={(l) => `Opens ${l}'s tree and closes the other pathways.`}
              add={{ enabled: canAuthor, tip: canAuthor ? `Add a pathway to ${typeLabel}, such as Citizenship. Typed in place at the end of the outline.` : AUTHOR_ONLY, onAdd: () => { openOne(null); startAdd("pathway", null); } }} /></div>
          ) : null}
          {list.data && !list.data.empty ? (
            <p className="mb-2 text-sm text-text-muted" data-stats>
              {many(count("pathway"), "pathway", "pathways")} · {many(count("program"), "program", "programs")} · {many(count("category"), "category", "categories")} · {many(count("subCategory"), "sub-category", "sub-categories")} · <b className="font-semibold text-text">{combos}</b> {combos === 1 ? "combination" : "combinations"}
            </p>
          ) : null}
          {list.isError ? (
            <ErrorState title="The structure could not load" description={`${(list.error as Error).message} Your work is safe.`} action={<Button size="sm" variant="secondary" onClick={() => void list.refetch()}>Retry</Button>} />
          ) : list.isPending || !known ? (
            <div className="space-y-2 rounded-xl border border-border bg-surface-raised p-3" aria-busy="true"><span className="sr-only" role="status">Loading the structure</span>{[0, 1, 1, 2, 2, 1, 0].map((d, i) => <Skeleton key={i} className="h-7" style={{ marginLeft: d * 22, width: `${70 - d * 8}%` }} />)}</div>
          ) : list.data.empty && !adding ? (
            <EmptyState title="No structure yet" description={`${typeLabel} has no names. After Reset both tabs are empty. Add your first pathway, for example Temporary residence.`}
              action={canAuthor ? <Button onClick={() => startAdd("pathway", null)}><Plus /> Add pathway</Button> : <p className="text-sm text-text-muted">{AUTHOR_ONLY}</p>} />
          ) : words && rows.length === 0 ? (
            <EmptyState title={`No name matches "${q.trim()}" in ${typeLabel}`} description={otherMatches ? undefined : "Check the spelling, or clear the search."}
              action={otherMatches ? <p className="text-sm">{otherMatches} {otherMatches === 1 ? "match" : "matches"} in {TYPES.find((t) => t.value !== type)!.label}. <button type="button" className="font-semibold text-text-link underline underline-offset-2" onClick={() => set({ t: type === "INDIVIDUAL" ? "CORPORATE" : null, node: null })}>Show {otherMatches === 1 ? "it" : "them"}</button></p> : <Button size="sm" variant="secondary" onClick={() => { setQ(""); set({ q: null }); }}>Clear the search</Button>} />
          ) : (
            <div ref={treeRef} role="tree" aria-label={`${typeLabel} structure`} onKeyDown={onKey} className="rounded-xl border border-border bg-surface-raised py-2">
              {rows.map((r) => r.kind === "node"
                ? <NodeRow key={r.node.key} r={r} leaf={isLeaf(r.node)} focused={current === r.node.key} selected={selected === r.node.key} collapsed={collapsed.has(r.node.key) && !matches} words={words}
                    onFocus={() => setFocusKey(r.node.key)} onToggle={() => toggle(r.node.key)} onSelect={() => set({ node: r.node.key })} />
                : adding && adding.parentKey === r.parentKey && adding.level === r.level
                  ? <AddRow key={r.key} type={type} row={r} parent={r.parentKey ? byKey.get(r.parentKey) : undefined} onDone={() => setAdding(null)} onPick={(k) => { setAdding(null); set({ node: k }); setFocusKey(k); }} />
                  : <GhostRow key={r.key} r={r} focused={current === r.key} onFocus={() => setFocusKey(r.key)} onStart={() => startAdd(r.level, r.parentKey)} />)}
            </div>
          )}
          {list.data && !list.data.empty ? <p className="mt-2 text-xs text-text-muted">Names and locations are Sample until the immigration expert confirms. {list.data.meaningCheck.why}</p> : null}
        </section>
        {selectedNode ? <DetailPanel key={selectedNode.key} node={selectedNode} type={type} siblings={kids.get(selectedNode.parentKey)?.filter((s) => selectedNode.parentKey !== null || s.level === "pathway") ?? []} leaf={isLeaf(selectedNode)} leaves={leavesUnder(selectedNode.key)} canAuthor={canAuthor}
          onClose={() => set({ node: null })} onAddChild={() => { set({ node: null }); startAdd("subCategory", selectedNode.key); }} /> : null}
      </div>
    </TipProvider>
  );
}

/** S1-finish (founder's idea, 27 Oct; reused later on Immigration programs): one card per Pathway of the tab with its
 *  combinations and how many need work. A card opens that Pathway's tree and closes the others; "All" opens all. */
/** S2 fix (founder, 27 Oct): beside the outline (1280 px and wider) the panel starts below the page header and only
 *  sticks once scrolled, so a fixed height pushed its footer (Remove / Retire, Save) below the screen. Its height is
 *  what is left of the window below its top edge; the body scrolls inside, the footer always shows. */
function useFitToScreen() {
  const [el, setEl] = React.useState<HTMLElement | null>(null);
  React.useEffect(() => {
    if (!el) return;
    const wide = window.matchMedia("(min-width: 1280px)");
    const run = () => { el.style.height = wide.matches ? `${Math.max(320, window.innerHeight - Math.max(80, el.getBoundingClientRect().top) - 16)}px` : ""; };
    run();
    // Content above it (the Pathway cards, a notice) can arrive after it does and push it down: watch the page too.
    // The page above it settles in its first moments (cards, notices, fonts): follow it frame by frame for two seconds,
    // then only on size changes, scroll and resize.
    const ro = new ResizeObserver(run); ro.observe(document.body);
    const until = performance.now() + 2000; let frame = 0;
    const follow = () => { run(); if (performance.now() < until) frame = requestAnimationFrame(follow); };
    frame = requestAnimationFrame(follow);
    window.addEventListener("scroll", run, { passive: true }); window.addEventListener("resize", run); wide.addEventListener("change", run);
    return () => { ro.disconnect(); cancelAnimationFrame(frame); window.removeEventListener("scroll", run); window.removeEventListener("resize", run); wide.removeEventListener("change", run); };
  }, [el]);
  return setEl;
}

/** S2 (founder, 27 Oct): a Not started combination gets a way to begin, New combination with its trail filled (S3 replaces it). */
function StartSetup({ leafKey, type, label }: { leafKey: string; type: string; label: string }) {
  return (
    <Tip tip="Opens New combination with this trail filled in; setup starts with its forms.">
      <Link className="font-semibold text-text-link underline underline-offset-2" data-start-setup to={`/new?${type === "CORPORATE" ? "pw=CORPORATE&" : ""}leaf=${encodeURIComponent(leafKey)}`} aria-label={`Start setup of ${label}`}>Start setup</Link>
    </Tip>
  );
}

function Mark({ text, words }: { text: string; words: string }) {
  if (!words) return <>{text}</>;
  const i = norm(text).indexOf(words);
  // The normalised match maps back only when the name is plain words; otherwise show it unmarked.
  if (i < 0 || norm(text) !== text.toLocaleLowerCase("en-CA").trim()) return <>{text}</>;
  return <>{text.slice(0, i)}<mark className="rounded-sm bg-warn/25 text-text">{text.slice(i, i + words.length)}</mark>{text.slice(i + words.length)}</>;
}

function NodeRow({ r, leaf, focused, selected, collapsed, words, onFocus, onToggle, onSelect }: { r: Extract<Row, { kind: "node" }>; leaf: boolean; focused: boolean; selected: boolean; collapsed: boolean; words: string; onFocus: () => void; onToggle: () => void; onSelect: () => void }) {
  const n = r.node;
  const strong = n.level === "pathway" || n.level === "program";
  const c = n.combination;
  return (
    <div role="treeitem" data-key={n.key} aria-level={r.depth + 1} aria-expanded={r.expandable ? !collapsed : undefined} aria-selected={selected} tabIndex={focused ? 0 : -1} onFocus={onFocus} onClick={onSelect}
      className={cn("mx-1.5 flex min-h-9 cursor-pointer flex-wrap items-center gap-x-2 gap-y-0.5 rounded-md px-2 py-1 text-sm outline-none hover:bg-surface focus-visible:ring-[3px] focus-visible:ring-ring/50", selected && "bg-primary/10 ring-1 ring-primary/20", n.retired && "text-text-muted")}
      style={{ paddingLeft: 8 + r.depth * 22 }}>
      {r.expandable
        ? <button type="button" tabIndex={-1} aria-hidden onClick={(e) => { e.stopPropagation(); onToggle(); }} className="flex size-5 items-center justify-center rounded text-text-muted hover:bg-text/5">{collapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}</button>
        : <span className="size-5" aria-hidden />}
      <span className={cn("min-w-0 break-words", strong && "font-semibold")}><Mark text={n.label} words={words} /></span>
      <Tip tip={LEVEL_TIP[n.level]}><span className="rounded border border-border px-1.5 text-xs text-text-muted">{LEVEL_WORD[n.level]}{leaf ? " · combination" : ""}</span></Tip>
      {n.retired ? <Tip tip="Retired by a release: hidden from pickers and AI; earlier releases and open cases keep it."><Pill tone="neutral">Retired</Pill></Tip> : null}
      {n.pending ? <Tip tip="A change to this name waits for a second person on To review."><Pill tone="warn">{PENDING_WORD[n.pending.action]}</Pill></Tip> : null}
      {leaf && c && !n.retired ? (c.id ? (c.retired ? <Pill tone="neutral">Retired</Pill> : <StatusChip status={c.status} text={c.statusText} tabIndex={-1} />)
        : <Tip tip="Added to the Structure; no setup yet. Start by adding its forms."><span className="inline-flex items-center gap-1 rounded-full border border-dashed border-border-strong px-2 py-0.5 text-xs font-semibold text-text-muted">Not started</span></Tip>) : null}
      <span className="ml-auto whitespace-nowrap text-xs text-text-muted">{leaf ? <Tip tip={LOC_TIP}><span>{locWords(n.allowedLocations)}</span></Tip> : `${n.combinations} ${n.combinations === 1 ? "combination" : "combinations"}`}</span>
    </div>
  );
}

function GhostRow({ r, focused, onFocus, onStart }: { r: Extract<Row, { kind: "add" }>; focused: boolean; onFocus: () => void; onStart: () => void }) {
  const tip = r.disabled ?? `Add a ${LEVEL_WORD[r.level].toLowerCase()} ${r.parentLabel ? `under ${r.parentLabel}` : "to this tab"}. Checked against the names that exist first.`;
  return (
    <Tip tip={tip}>
      <div role="treeitem" data-key={r.key} aria-level={r.depth + 1} aria-disabled={!!r.disabled || undefined} tabIndex={focused ? 0 : -1} onFocus={onFocus} onClick={() => { if (!r.disabled) onStart(); }}
        className={cn("mx-1.5 flex h-8 items-center gap-2 rounded-md px-2 text-sm text-text-muted outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50", r.disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-surface hover:text-text-link")}
        style={{ paddingLeft: 8 + r.depth * 22 }}>
        <span className="size-5" aria-hidden /><Plus className="size-4" aria-hidden />Add {LEVEL_WORD[r.level].toLowerCase()}
      </div>
    </Tip>
  );
}

function LocationPicker({ value, onChange, disabled, label }: { value: string[]; onChange: (l: string[]) => void; disabled?: boolean; label: string }) {
  const cur = locKey(value);
  return (
    <Tip tip={LOC_TIP}>
      <div role="radiogroup" aria-label={label} className="inline-flex overflow-hidden rounded-lg border border-border-strong text-xs">
        {LOCS.map(([k, w]) => (
          <button key={k} type="button" role="radio" aria-checked={cur === k} disabled={disabled} onClick={() => onChange(locList(k))}
            className={cn("px-2.5 py-1 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 [&+&]:border-l [&+&]:border-border", cur === k ? "bg-primary font-semibold text-primary-foreground" : "bg-surface-raised text-text hover:bg-surface", disabled && "cursor-not-allowed opacity-60")}>{w}</button>
        ))}
      </div>
    </Tip>
  );
}

/** "+ Add …" typed in place (board A+): the free name check as you type, Enter to add, Esc to cancel; the row stays
 *  open for the next name. The server checks again on save. */
function AddRow({ type, row, parent, onDone, onPick }: { type: PathwayType; row: Extract<Row, { kind: "add" }>; parent?: StructureNode; onDone: () => void; onPick: (key: string) => void }) {
  const qc = useQueryClient();
  // S1-finish: success is said on the row itself, never in a toast over the outline or the panel.
  const [done, setDone] = React.useState<string | null>(null);
  const [label, setLabel] = React.useState("");
  const hasLocs = row.level === "category" || row.level === "subCategory";
  const [locs, setLocs] = React.useState<string[]>(row.level === "subCategory" && parent?.allowedLocations.length ? parent.allowedLocations : ["inside_canada", "outside_canada"]);
  const [check, setCheck] = React.useState<Check | null>(null);
  const [checking, setChecking] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const input = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => { input.current?.focus(); }, []);
  const refused = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (refused.current === label) refused.current = null; else setError(null); // a refused name put back keeps its reason
    if (!label.trim()) { setCheck(null); return; }
    setChecking(true);
    const t = setTimeout(() => api<Check>("/structure/name-check", { method: "POST", json: { pathwayType: type, level: row.level, parentKey: row.parentKey, label } })
      .then(setCheck).catch((e) => setError((e as Error).message)).finally(() => setChecking(false)), 250);
    return () => clearTimeout(t);
  }, [label, type, row.level, row.parentKey]);
  const where = parent ? `under ${parent.label}` : `in ${TYPES.find((t) => t.value === type)!.label}`;
  const add = async (decision: "new" | "add_anyway") => {
    if (!label.trim() || busy) return;
    // QA-44: the box clears as the name is sent, so whatever is typed while it saves is kept; a refusal puts the name
    // back only if nothing new was typed.
    const sent = label;
    setBusy(true); setError(null); setLabel(""); setCheck(null); setDone(`Adding "${sent.trim()}" ${where}…`);
    try {
      const r = await api<{ key: string; label: string }>("/structure/nodes", { method: "POST", json: { pathwayType: type, level: row.level, parentKey: row.parentKey, label: sent, decision, ...(hasLocs ? { allowedLocations: locs } : {}) } });
      setDone(`Added "${r.label}" ${where}.${row.level === "category" || row.level === "subCategory" ? " It is listed in Immigration programs as Not started." : ""} Type the next name, or Esc.`);
      await Promise.all([qc.invalidateQueries({ queryKey: ["structure"] }), qc.invalidateQueries({ queryKey: ["catalogue"] })]);
      input.current?.focus();
    } catch (e) {
      setDone(null); refused.current = sent; setLabel((now) => now || sent);
      const p: Refusal = e instanceof ApiError ? (e.problem as Refusal) : {};
      if (p.code === "close_names") setCheck({ exact: null, close: p.close ?? [] });
      else setError((e as Error).message);
    } finally { setBusy(false); }
  };
  const exact = check?.exact, close = check?.close ?? [];
  const id = React.useId();
  return (
    <div data-add-row role="treeitem" aria-level={row.depth + 1} className="mx-1.5 flex flex-wrap items-center gap-2 rounded-md bg-surface px-2 py-2" style={{ paddingLeft: 8 + row.depth * 22 }}>
      <span className="size-5" aria-hidden />
      <Input ref={input} value={label} onChange={(e) => { setLabel(e.target.value); setDone(null); }} aria-label={`New ${LEVEL_WORD[row.level].toLowerCase()} name ${where}`} aria-invalid={exact || error ? true : undefined} aria-describedby={`${id}-hint`}
        placeholder={`New ${LEVEL_WORD[row.level].toLowerCase()} ${where}`} className={cn("h-8 w-auto min-w-[240px] flex-1", exact && "border-danger")}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (!exact && !close.length) void add("new"); } if (e.key === "Escape") { e.preventDefault(); onDone(); } }} />
      {hasLocs ? <LocationPicker value={locs} onChange={setLocs} label="Cases may be opened from" /> : null}
      <Button size="sm" onClick={() => void add("new")} disabled={!label.trim() || !!exact || close.length > 0 || checking} busy={busy}>Add</Button>
      <Button size="sm" variant="ghost" onClick={onDone}>Cancel</Button>
      <div id={`${id}-hint`} className="w-full pl-7 text-xs" aria-live="polite">
        {done && !label.trim() ? <p role="status" data-done className="font-medium text-text-ok">{done}</p>
          : error ? <p role="alert" className="text-text-danger">{error}</p>
          : exact ? <p role="alert" className="text-text-danger">"{exact.label}" already exists {where}. Choose it instead. <button type="button" className="font-semibold text-text-link underline underline-offset-2" onClick={() => onPick(exact.key)}>Show it</button></p>
          : close.length ? (
            <div className="rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 text-sm text-text">
              Did you mean {close.slice(0, 3).map((c, i) => <span key={c.key}>{i ? ", " : ""}<b>{c.trail.join(" › ")}</b> <span className="text-xs text-text-muted">({c.why})</span></span>)}?
              <span className="ml-2 inline-flex gap-1.5"><Button size="sm" variant="secondary" onClick={() => onPick(close[0].key)}>Use existing</Button><Tip tip="Adds it anyway; Activity records that close names existed."><Button size="sm" variant="ghost" onClick={() => void add("add_anyway")} busy={busy}>Add mine anyway</Button></Tip></span>
            </div>)
          : <p className="text-text-muted">{label.trim() ? (checking ? "Checking the names that exist…" : `No exact match ${where} · no close spelling · `) : "Type a name. "}<Tip tip={NMC_TIP} focusable><span className="rounded-full border border-dashed border-border-strong px-1.5">Not meaning-checked</span></Tip> · Enter to add, Esc to cancel</p>}
      </div>
    </div>
  );
}

/** The selected name: what uses it, rename, where cases may be opened, order, remove / retire / restore, history. A side
 *  panel beside the outline (non-modal, pinned header and footer). */
function DetailPanel({ node, type, siblings, leaf, leaves, canAuthor, onClose, onAddChild }: { node: StructureNode; type: PathwayType; siblings: StructureNode[]; leaf: boolean; leaves: { n: StructureNode; path: string[] }[]; canAuthor: boolean; onClose: () => void; onAddChild: () => void }) {
  const qc = useQueryClient();
  const fit = useFitToScreen();
  // S1-finish: what happened is said in the panel's own status line, never in a toast over the outline or the panel.
  const [note, setNote] = React.useState<{ ok: boolean; text: string } | null>(null);
  const say = (ok: boolean, text: string) => setNote({ ok, text });
  const uses = useApi<UsesView>(["structure-uses", node.key], `/structure/nodes/${encodeURIComponent(node.key)}/uses`);
  // The version the person started editing from: a save sends it, so someone else's save in between is a 409 with
  // the current row, never a silent overwrite. While nothing is typed, a newer row simply replaces the fields.
  const [base, setBase] = React.useState({ version: node.version, label: node.label, locs: node.allowedLocations });
  const [label, setLabel] = React.useState(node.label);
  const [locs, setLocs] = React.useState(node.allowedLocations);
  const dirty = label !== base.label || locKey(locs) !== locKey(base.locs);
  const takeLatest = () => { setBase({ version: node.version, label: node.label, locs: node.allowedLocations }); setLabel(node.label); setLocs(node.allowedLocations); };
  React.useEffect(() => { if (!dirty) takeLatest(); }, [node.version, node.label, node.allowedLocations.join()]); // eslint-disable-line react-hooks/exhaustive-deps
  const [busy, setBusy] = React.useState(false);
  const [close, setClose] = React.useState<Close[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [stale, setStale] = React.useState<string | null>(null);
  const [action, setAction] = React.useState<LifecycleAction | "WITHDRAW" | null>(null);
  const [reason, setReason] = React.useState("");
  const hasLocs = node.level === "category" || node.level === "subCategory";
  const changed = label.trim() !== base.label || (hasLocs && locKey(locs) !== locKey(base.locs));
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ["structure"] }), qc.invalidateQueries({ queryKey: ["structure-uses"] }), qc.invalidateQueries({ queryKey: ["catalogue"] }), qc.invalidateQueries({ queryKey: ["draft"] }), qc.invalidateQueries({ queryKey: ["review-queue"] })]);
  const save = async (decision: "new" | "add_anyway") => {
    setBusy(true); setError(null); setClose([]);
    try {
      const r = await api<{ affected: number; changed: boolean; version: number; label: string; allowedLocations: string[] }>(`/structure/nodes/${encodeURIComponent(node.key)}`, { method: "PATCH", json: { version: base.version, decision, ...(label.trim() !== base.label ? { label } : {}), ...(hasLocs && locKey(locs) !== locKey(base.locs) ? { allowedLocations: locs } : {}) } });
      setBase({ version: r.version, label: r.label, locs: r.allowedLocations }); setLabel(r.label); setLocs(r.allowedLocations);
      say(true, r.affected ? `Saved. ${r.affected} combination${r.affected === 1 ? " gets" : "s get"} a change for the next release; firms see it then.` : "Saved." );
      await refresh();
    } catch (e) {
      const p: Refusal = e instanceof ApiError ? (e.problem as Refusal) : {};
      if (p.code === "close_names") setClose(p.close ?? []);
      else if (p.code === "stale") setStale((e as Error).message);
      else setError((e as ApiError).field?.("label") ?? (e as Error).message);
    } finally { setBusy(false); }
  };
  const move = async (dir: -1 | 1) => {
    const keys = siblings.map((s) => s.key), i = keys.indexOf(node.key), j = i + dir;
    if (i < 0 || j < 0 || j >= keys.length) return;
    [keys[i], keys[j]] = [keys[j], keys[i]];
    try { await api("/structure/reorder", { method: "POST", json: { pathwayType: type, parentKey: node.parentKey, keys } }); await refresh(); say(true, `Moved "${node.label}" ${dir < 0 ? "up" : "down"}.` ); }
    catch (e) { say(false, (e as Error).message ); }
  };
  const lifecycle = async () => {
    setBusy(true);
    try {
      if (action === "WITHDRAW") await api(`/library/changes/${uses.data!.pending!.id}/withdraw`, { method: "POST", json: { note: reason } });
      else await api(`/structure/nodes/${encodeURIComponent(node.key)}${action === "DELETE" ? "" : `/${action!.toLowerCase()}`}`, { method: action === "DELETE" ? "DELETE" : "POST", json: { reason } });
      say(true, action === "WITHDRAW" ? "Withdrawn. Nothing changed." : `Sent to a second person on To review. ${action === "DELETE" ? "It is removed when approved." : "It takes effect with the next release after approval."}` );
      setAction(null); setReason(""); await refresh();
    } catch (e) { say(false, (e as Error).message ); }
    finally { setBusy(false); }
  };
  const u = uses.data;
  const i = siblings.findIndex((s) => s.key === node.key);
  const no = !canAuthor ? AUTHOR_ONLY : null;
  const ACTIONS: { a: LifecycleAction; word: string; why: string | null | undefined; tip: string }[] = [
    { a: "DELETE", word: "Remove", why: u?.can.delete, tip: "Removes a name that was never released and is used nowhere. A second person approves; Undo while it waits." },
    { a: "RETIRE", word: "Retire", why: u?.can.retire, tip: "Hides a released name from pickers and AI. Earlier releases and open cases keep it. Takes effect with the next release." },
    { a: "RESTORE", word: "Restore", why: u?.can.restore, tip: "Brings a retired name back to pickers, by the same path: a second person approves, the release publishes." },
  ];
  return (
    <aside ref={fit} data-panel aria-label={`${node.label} details`} className="fixed bottom-4 right-0 top-14 z-40 flex w-full max-w-[440px] flex-col border-l border-border bg-surface-raised shadow-xl xl:sticky xl:top-20 xl:z-auto xl:max-w-none xl:rounded-xl xl:border xl:shadow-sm">
      <div className="flex items-start gap-2 border-b border-border px-5 py-3">
        <div className="min-w-0 flex-1"><h2 className="break-words text-lg font-semibold">{node.label}</h2><p className="text-xs text-text-muted">{LEVEL_WORD[node.level]}{leaf ? " · combination" : ""}{node.retired ? " · Retired" : ""}</p></div>
        <Button size="icon" variant="ghost" aria-label="Close the details" onClick={onClose}><X /></Button>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 text-sm">
        <dl className="grid grid-cols-[120px_1fr] gap-x-3 gap-y-2">
          <dt className="text-text-muted">Trail</dt>
          <dd data-trail>{[TYPES.find((t) => t.value === type)!.label, ...(u?.trail ?? [node.label])].map((t, k, a) => <span key={k}>{k ? <span className="text-text-muted"> › </span> : null}{k === a.length - 1 ? <b>{t}</b> : t}</span>)}</dd>
          <dt className="text-text-muted">Used by</dt>
          <dd data-used-by>{leaf ? (node.combination?.id ? <>This combination: {node.combination.statusText} <Link className="font-semibold text-text-link underline underline-offset-2" to={`/c/${node.combination.id}`}>Open</Link></> : <>This combination: Not started (no setup yet){!node.retired && canAuthor ? <> <StartSetup leafKey={node.key} type={type} label={node.label} /></> : null}</>) : (
            <>
              <p>{node.combinations} combination{node.combinations === 1 ? "" : "s"}{node.live ? `, ${node.live} Live` : ""}</p>
              {/* S1-finish: each combination below it by name, its state and Open (Not started ones have no setup to open). */}
              {leaves.length ? <ul className="mt-1 space-y-1" aria-label={`Combinations under ${node.label}`}>{leaves.map(({ n: l, path }) => {
                const c = l.combination;
                return (
                  <li key={l.key} className="flex flex-wrap items-center gap-x-2">
                    <span className="min-w-0 break-words">{path.join(" › ")}</span>
                    <span className="text-xs text-text-muted">{l.retired || c?.retired ? "Retired" : c?.statusText ?? "Not started"}</span>
                    {c?.id ? <Link className="font-semibold text-text-link underline underline-offset-2" to={`/c/${c.id}`} aria-label={`Open ${l.label}`}>Open</Link>
                      : !l.retired && canAuthor ? <StartSetup leafKey={l.key} type={type} label={l.label} /> : null}
                  </li>
                );
              })}</ul> : null}
            </>)}</dd>
          {hasLocs ? <><dt className="text-text-muted">Cases opened from</dt><dd><LocationPicker value={locs} onChange={setLocs} disabled={!canAuthor || node.retired} label="Cases may be opened from" /><p className="mt-1 text-xs text-text-muted">{node.level === "category" ? "Its sub-categories start from this. " : ""}Sample. A change needs the expert's tick at release.</p></dd></> : null}
          <dt className="text-text-muted">Meaning check</dt>
          <dd><Tip tip={NMC_TIP} focusable><span className="rounded-full border border-dashed border-border-strong px-1.5 text-xs text-text-muted">Not meaning-checked</span></Tip></dd>
        </dl>
        <div className="space-y-1.5">
          <label htmlFor="structure-name" className="text-xs font-medium">Name <span className="font-normal text-text-muted">Required</span></label>
          <Input id="structure-name" value={label} onChange={(e) => { setLabel(e.target.value); setClose([]); setError(null); }} disabled={!canAuthor || node.retired} aria-invalid={error ? true : undefined} aria-describedby="structure-name-hint" />
          <p id="structure-name-hint" className={cn("text-xs", error ? "text-text-danger" : "text-text-muted")} role={error ? "alert" : undefined}>{error ?? "The new name shows in setup at once; firms see it after the next release. Open cases keep their names."}</p>
          {close.length ? <Notice tone="warn" title="Close names exist">Did you mean {close.map((c) => c.trail.join(" › ")).join(", ")}? <Button size="sm" variant="ghost" onClick={() => void save("add_anyway")} busy={busy}>Rename anyway</Button></Notice> : null}
          {stale ? <Notice tone="danger" title="Changed meanwhile" action={<Button size="sm" variant="secondary" onClick={() => { setStale(null); takeLatest(); void refresh(); }}>Reload</Button>}>{stale}</Notice> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-text-muted">Order</span>
          <Tip tip={no ?? "Moves it among the names under the same parent. Shown on the Structure and in Immigration programs; applies at once."}><span><Button size="sm" variant="secondary" disabled={!!no || i <= 0} onClick={() => void move(-1)}><ArrowUp /> Move up</Button></span></Tip>
          <Tip tip={no ?? "Moves it among the names under the same parent. Shown on the Structure and in Immigration programs; applies at once."}><span><Button size="sm" variant="secondary" disabled={!!no || i < 0 || i >= siblings.length - 1} onClick={() => void move(1)}><ArrowDown /> Move down</Button></span></Tip>
          {node.level === "category" && leaf ? <Tip tip={no ?? (node.hasSetup ? `${node.label} already has its own setup, so it is the combination. A sub-category would leave that setup above a combination.` : `Add a sub-category under ${node.label}. It then becomes the combination instead.`)}><span><Button size="sm" variant="secondary" disabled={!!no || node.hasSetup || node.retired} onClick={onAddChild}><Plus /> Add sub-category</Button></span></Tip> : null}
        </div>
        <section aria-label="Where used" className="space-y-2 rounded-lg border border-border p-3">
          <h3 className="text-sm font-semibold">Where used</h3>
          {uses.isPending ? <Skeleton className="h-10" /> : uses.isError ? <p className="text-text-danger">{(uses.error as Error).message}</p> : u ? (
            <>
              {u.uses.filter((x) => x.kind !== "draft_change").length ? <ul className="space-y-1">{u.uses.filter((x) => x.kind !== "draft_change").map((x, k) => <li key={k} className="flex flex-wrap gap-x-2"><span>{x.href ? <Link to={x.href.replace(/^\/structure\?node=/, "/structure?node=")} className="text-text-link underline underline-offset-2">{x.label}</Link> : x.label}</span><span className={cn("text-xs", x.blocks ? "text-text-warn" : "text-text-muted")}>{x.why}</span></li>)}</ul> : <p className="text-text-muted">Used nowhere.</p>}
              {u.pending ? <Notice tone="warn" title={`${PENDING_WORD[u.pending.action]} for a second person`} action={canAuthor ? <Button size="sm" variant="secondary" onClick={() => { setAction("WITHDRAW"); setReason(""); }}>Withdraw</Button> : undefined}>Proposed by {u.pending.by}. <Link to={`/review/change/${u.pending.id}`} className="text-text-link underline underline-offset-2">See it on To review</Link></Notice> : null}
              {action ? (
                <div className="space-y-2 rounded-lg bg-surface p-3">
                  <label htmlFor="structure-reason" className="text-xs font-medium">{action === "WITHDRAW" ? "Why withdraw it?" : `Why ${action === "DELETE" ? "remove" : action.toLowerCase()} "${node.label}"?`} <span className="font-normal text-text-muted">Required, for the second person</span></label>
                  <Textarea id="structure-reason" value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-16" />
                  <div className="flex justify-end gap-2"><Button size="sm" variant="ghost" onClick={() => setAction(null)}>Cancel</Button><Button size="sm" onClick={() => void lifecycle()} disabled={reason.trim().length < 3} busy={busy}>{action === "WITHDRAW" ? "Withdraw" : "Send for approval"}</Button></div>
                </div>) : null}
            </>) : null}
        </section>
        {u?.history.length ? (
          <section aria-label="History"><h3 className="mb-1 text-sm font-semibold">History</h3><ul className="space-y-1 text-xs text-text-muted">{u.history.map((h, k) => <li key={k}><span className="text-text">{fmtWhen(h.at)}</span> · {h.what}</li>)}</ul></section>
        ) : null}
      </div>
      {note ? <p role={note.ok ? "status" : "alert"} data-panel-note className={cn("border-t border-border px-5 py-2 text-sm", note.ok ? "text-text-ok" : "text-text-danger")}>{note.text}</p> : null}
      {/* S2 fix (founder, 27 Oct): the lifecycle buttons sit in the footer with Save, so all of them always show. */}
      <div className="flex flex-wrap items-center gap-2 border-t border-border px-5 py-3" data-panel-footer>
        {u && !u.pending ? ACTIONS.filter((x) => (x.a === "RESTORE") === node.retired).map((x) => { const why = no ?? x.why; return <Tip key={x.a} tip={why ?? x.tip}><span><Button size="sm" variant={x.a === "RESTORE" ? "secondary" : "outline"} className={x.a !== "RESTORE" ? "text-text-danger" : undefined} disabled={!!why} onClick={() => { setAction(x.a); setReason(""); requestAnimationFrame(() => document.getElementById("structure-reason")?.focus()); }}>{x.word}</Button></span></Tip>; }) : null}
        <span className="flex-1" />
        <Button variant="ghost" onClick={onClose}>Close</Button>
        <Tip tip={no ?? (node.retired ? "It is retired: restore it first." : changed ? "Saves the name and where cases may be opened." : "Change the name or where cases may be opened first.")}><span><Button onClick={() => void save("new")} disabled={!!no || !changed || node.retired || !label.trim()} busy={busy}>Save</Button></span></Tip>
      </div>
    </aside>
  );
}
