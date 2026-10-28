// Program structure, round 3 (P-128, supersedes P-127; board screens/W1-visual-system/design/draft-r3-program-structure.html
// option A): the one place names enter. A filter bar (type tabs, Tree or List, Find, Pathway chips, Program, Status, Show
// retired) on top; the Tree is a numbered outline (1, 1.1, 1.1.1: positions on this page, not IRCC codes), each Pathway
// and Program a block; the List is one line per combination with its full trail. Every row shows Edit (the side panel:
// name, cases may be opened from, order, where used, history) and its one lifecycle action, decided by the server
// (contracts/structure.ts RowAction): Delete (a whole unused branch, R3-4), Retire, Restore or Withdraw, each confirmed in
// the page and approved by a second person on To review. One Add opens the "Add to Program structure" pop-up
// (components/add-to-structure.tsx, POST /structure/path), prefilled from the tab and filters.
import * as React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Archive, ArrowDown, ArrowUp, ChevronDown, ChevronLeft, ChevronRight, Eye, Info, List as ListIcon, ListTree, Pencil, Plus, RotateCcw, Search, Trash2, Undo2, X } from "lucide-react";
import type { Level, LifecycleAction, PathwayType, StructureNode, UsesView } from "../../../contracts/structure";
import { api, ApiError, useActorId, useApi, useSessionView } from "@/lib/api";
import { Button, Input, Notice, Pill, Textarea } from "@/components/ui/controls";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtWhen, StatusChip, Tip, TipProvider } from "@/components/status";
import { AddToStructure, LocationPicker, LOC_TIP, locKey, type AddPrefill } from "@/components/add-to-structure";
import { LevelMark, pathwayAccent } from "@/components/levels";
import { cn } from "@/lib/utils";

type ListResp = { pathwayType: PathwayType; typeLabel: string; nodes: StructureNode[]; empty: boolean; meaningCheck: { on: boolean; why: string } };
type Close = { key: string; label: string; trail: string[]; why: string };
/** The parts of a refusal (Problem Details) this page acts on: close names to show, or a stale edit. */
type Refusal = { code?: string; close?: Close[] };

const TYPES: { value: PathwayType; label: string; tip: string }[] = [
  { value: "INDIVIDUAL", label: "Retail", tip: "Who applies: a person and their family. Applications a person makes for themselves and their family." },
  { value: "CORPORATE", label: "Corporate and employers", tip: "Who applies: an employer or organisation, such as for an LMIA." },
];
const LEVEL_WORD: Record<Level, string> = { pathway: "Pathway", program: "Program", category: "Category", subCategory: "Sub-category" };
const DEPTH: Record<Level, number> = { pathway: 0, program: 1, category: 2, subCategory: 3 };
const locWords = (l: string[]) => (l.length === 2 ? "Inside or outside Canada" : l[0] === "inside_canada" ? "Inside Canada" : l[0] === "outside_canada" ? "Outside Canada" : "—");
const NMC_TIP = "Only the spelling check ran; a reviewer compares the meaning by eye. The AI meaning check runs when paid runs are on.";
const AUTHOR_ONLY = "Only a configuration author adds, renames, orders, deletes or retires names. You can read everything.";
const NUM_TIP = "Position in this structure; it changes when you reorder. Not an IRCC code.";
const PENDING_WORD: Record<LifecycleAction, string> = { DELETE: "Deletion waiting", RETIRE: "Retire waiting", RESTORE: "Restore waiting" };
const USED_TIP = "What uses this combination: the releases firms have and the cases open on it. Its details list each one.";
const STATUS: { value: string; label: string; test: (n: StructureNode) => boolean }[] = [
  { value: "setup", label: "In setup", test: (n) => !!n.combination?.id && n.combination.status === "IN_SETUP" },
  { value: "notready", label: "Not ready", test: (n) => !!n.combination?.id && n.combination.status === "NOT_READY" },
  { value: "live", label: "Live", test: (n) => !!n.combination?.id && n.combination.status === "READY" },
  { value: "ns", label: "Not started", test: (n) => !!n.combination && !n.combination.id },
  { value: "waiting", label: "Waiting for approval", test: (n) => !!n.pending },
];
const norm = (s: string) => s.normalize("NFKC").toLocaleLowerCase("en-CA").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const many = (n: number, one: string, more: string) => `${n} ${n === 1 ? one : more}`;
/** "Used by" (P-127 (1)): the releases that hold the combination and the cases open on it. */
const usedBy = (c: StructureNode["combination"]) => {
  if (!c?.id) return "Nothing yet";
  const parts = [c.releases ? `${c.releases} release${c.releases === 1 ? "" : "s"}` : "", c.openCases ? `${c.openCases} open case${c.openCases === 1 ? "" : "s"}` : ""].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Setup draft";
};

const VIEW_KEY = (actor: string | null) => `xr-structure-view:${actor ?? "anyone"}`;
type Confirm = { key: string; kind: LifecycleAction | "WITHDRAW" };

export function StructurePage() {
  const [sp, setSp] = useSearchParams();
  const actor = useActorId();
  const type: PathwayType = sp.get("t") === "CORPORATE" ? "CORPORATE" : "INDIVIDUAL";
  const typeLabel = TYPES.find((t) => t.value === type)!.label;
  const selected = sp.get("node");
  const fromPrograms = sp.get("from") === "programs";
  const [q, setQ] = React.useState(sp.get("q") ?? "");
  const { canAuthor, known } = useSessionView();
  const qc = useQueryClient();
  // Every name of the tab, retired ones included: Show retired only shows them (QA-48's missing view).
  const list = useApi<ListResp>(["structure", type, "all"], `/structure?pathwayType=${type}&retired=1`);
  const otherType: PathwayType = type === "INDIVIDUAL" ? "CORPORATE" : "INDIVIDUAL";
  const other = useApi<ListResp>(["structure", otherType, "all"], `/structure?pathwayType=${otherType}&retired=1`);
  const [closed, setClosed] = React.useState<Set<string>>(new Set());
  const [adding, setAdding] = React.useState<AddPrefill | null>(null);
  const [justAdded, setJustAdded] = React.useState<string | null>(null);
  const [note, setNote] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [confirm, setConfirm] = React.useState<Confirm | null>(null);
  // Built from the address as it is now, not as it was at the last render: two quick filter changes both stay.
  const set = (patch: Record<string, string | null>) => setSp(() => { const n = new URLSearchParams(window.location.search); for (const [k, v] of Object.entries(patch)) v ? n.set(k, v) : n.delete(k); return n; }, { replace: true });

  // The view is the person's own (remembered per person); the filters live in the address (P-115).
  const savedView = (() => { try { return localStorage.getItem(VIEW_KEY(actor)); } catch { return null; } })();
  const view: "tree" | "list" = (sp.get("v") ?? savedView) === "list" ? "list" : "tree";
  const chooseView = (v: "tree" | "list") => { try { localStorage.setItem(VIEW_KEY(actor), v); } catch { /* private window */ } set({ v }); };
  const pw = sp.get("p"), prog = sp.get("prog"), status = sp.get("s"), showRetired = sp.get("r") === "1", sort = sp.get("sort") === "az" ? "az" : "page";

  // Drift 9 / round 3 minor: the pop-up opens from the address only for a person who can add.
  React.useEffect(() => { if (known && sp.get("add") === "1") { if (canAuthor) setAdding({ pathwayKey: pw ?? undefined, programKey: prog ?? undefined }); set({ add: null }); } }, [known]); // eslint-disable-line react-hooks/exhaustive-deps

  const nodes = list.data?.nodes ?? [];
  const byKey = React.useMemo(() => new Map(nodes.map((n) => [n.key, n])), [nodes]);
  const kids = React.useMemo(() => { const m = new Map<string | null, StructureNode[]>(); for (const n of nodes) m.set(n.parentKey, [...(m.get(n.parentKey) ?? []), n]); return m; }, [nodes]);
  const pathways = (kids.get(null) ?? []).filter((n) => n.level === "pathway");
  // R3-1 (and minor 5): numbers count the active names in page order; a retired name shows "—" and never shifts them.
  const num = React.useMemo(() => {
    const m = new Map<string, string>();
    const walk = (parent: string | null, prefix: string) => (kids.get(parent) ?? []).filter((n) => !n.retired && (parent !== null || n.level === "pathway")).forEach((n, i) => { const s = prefix ? `${prefix}.${i + 1}` : `${i + 1}`; m.set(n.key, s); walk(n.key, s); });
    walk(null, ""); return m;
  }, [kids]);
  const isLeaf = (n: StructureNode) => n.level === "subCategory" || (n.level === "category" && !(kids.get(n.key)?.length));
  const below = (k: string): StructureNode[] => (kids.get(k) ?? []).flatMap((c) => [c, ...below(c.key)]);
  const trailOf = (n: StructureNode) => { const t: StructureNode[] = []; for (let x: StructureNode | undefined = n; x; x = x.parentKey ? byKey.get(x.parentKey) : undefined) t.unshift(x); return t; };
  const pathwayOf = (n: StructureNode) => trailOf(n)[0];

  // Filters (R3-6): a combination shows when it passes them all, with every name above it; with no Find and no Status,
  // a name with no combination under it shows too, so an empty Program can be found and filled.
  const words = norm(q);
  const statusOf = STATUS.find((s) => s.value === status);
  const shown = React.useMemo(() => {
    const keep = new Set<string>();
    const add = (n: StructureNode) => { for (const x of trailOf(n)) keep.add(x.key); };
    for (const n of nodes) {
      const t = trailOf(n);
      if (!showRetired && t.some((x) => x.retired)) continue;
      if (pw && t[0]?.key !== pw) continue;
      if (prog && !(t[1]?.key === prog || (n.level === "pathway" && byKey.get(prog)?.parentKey === n.key))) continue;
      if (isLeaf(n)) {
        if (statusOf && !statusOf.test(n)) continue;
        if (words && !t.some((x) => norm(x.label).includes(words))) continue;
        add(n);
      } else if (!words && !statusOf && !below(n.key).some(isLeaf)) add(n);
    }
    return keep;
  }, [nodes, pw, prog, status, showRetired, words]); // eslint-disable-line react-hooks/exhaustive-deps
  const leaves = nodes.filter((n) => isLeaf(n) && shown.has(n.key));
  const activeLeaves = nodes.filter((n) => isLeaf(n) && !trailOf(n).some((x) => x.retired));
  const filtered = !!(pw || prog || statusOf || words);
  const retiredCount = nodes.filter((n) => n.retired).length;
  const otherMatches = words && other.data ? other.data.nodes.filter((n) => !n.retired && norm(n.label).includes(words)).length : 0;
  const leafCount = (k: string) => below(k).filter((x) => isLeaf(x) && !trailOf(x).some((y) => y.retired)).length;
  const typeCount = (d: ListResp | undefined) => (d ? d.nodes.filter((n) => (n.level === "subCategory" || (n.level === "category" && !d.nodes.some((x) => x.parentKey === n.key))) && !n.retired).length : undefined);
  const levelCount = (l: Level) => nodes.filter((n) => n.level === l && shown.has(n.key)).length;
  const programsFor = nodes.filter((n) => n.level === "program" && !n.retired && (!pw || n.parentKey === pw));
  const selectedNode = selected ? byKey.get(selected) : undefined;

  // After Add: the new line shows (filters that would hide it are cleared), scrolled to and tagged "Just added" (AD-7).
  React.useEffect(() => {
    const n = justAdded ? byKey.get(justAdded) : undefined;
    if (!n) return;
    if (!shown.has(n.key)) { setQ(""); set({ p: null, prog: null, s: null, q: null }); return; }
    requestAnimationFrame(() => { const el = document.querySelector<HTMLElement>(`[data-row="${CSS.escape(n.key)}"]`); el?.scrollIntoView({ block: "center" }); el?.querySelector<HTMLElement>("[data-edit]")?.focus({ preventScroll: true }); });
  }, [justAdded, byKey, shown]); // eslint-disable-line react-hooks/exhaustive-deps
  const openAdd = () => { if (canAuthor) setAdding({ pathwayKey: pw ?? undefined, programKey: prog ?? undefined }); };
  const refresh = () => Promise.all(["structure", "structure-uses", "catalogue", "draft", "review-queue"].map((k) => qc.invalidateQueries({ queryKey: [k] })));

  // Keyboard (minor 7): one Tab stop in the outline; ↑ / ↓ move between rows, Home / End to the ends, Enter is Edit,
  // the Delete key is the row's action; Tab inside a row reaches its two buttons.
  const rowKeys = view === "tree" ? nodes.filter((n) => shown.has(n.key) && !trailOf(n).slice(0, -1).some((x) => closed.has(x.key))).map((n) => n.key) : leaves.map((n) => n.key);
  const [current, setCurrent] = React.useState<string | null>(null);
  const cur = current && rowKeys.includes(current) ? current : rowKeys[0] ?? null;
  const onRowKey = (key: string) => (e: React.KeyboardEvent) => {
    const i = rowKeys.indexOf(key);
    const go = (j: number) => { const k = rowKeys[Math.max(0, Math.min(rowKeys.length - 1, j))]; setCurrent(k); requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-row="${CSS.escape(k)}"] [data-edit]`)?.focus()); e.preventDefault(); };
    if (e.key === "ArrowDown") go(i + 1); else if (e.key === "ArrowUp") go(i - 1); else if (e.key === "Home") go(0); else if (e.key === "End") go(rowKeys.length - 1);
    else if (e.key === "Delete" && (e.target as HTMLElement).dataset.edit !== undefined) { document.querySelector<HTMLElement>(`[data-row="${CSS.escape(key)}"] [data-action]`)?.click(); e.preventDefault(); }
  };
  const rowProps = (n: StructureNode) => ({ n, num: num.get(n.key) ?? null, selected: selected === n.key, current: cur === n.key, justAdded: justAdded === n.key, canAuthor, words,
    onEdit: () => { setCurrent(n.key); set({ node: n.key }); }, onAction: () => { setCurrent(n.key); setConfirm({ key: n.key, kind: n.action.kind }); }, onKey: onRowKey(n.key), wide: !selectedNode });

  const confirmBox = (n: StructureNode) => confirm?.key === n.key ? <ConfirmAction key={`c-${n.key}`} n={n} kind={confirm.kind} num={num} byKey={byKey} onClose={() => setConfirm(null)}
    onDone={async (text) => { setConfirm(null); setNote({ ok: true, text }); await refresh(); }} /> : null;
  const chip = (key: string, label: string, clear: () => void) => <span key={key} className="inline-flex h-6 items-center gap-1 rounded-full border border-primary/40 bg-primary/10 pl-2.5 pr-1 text-xs font-medium text-text-link">{label}<button type="button" aria-label={`Remove the filter ${label}`} onClick={clear} className="flex size-4 items-center justify-center rounded-full hover:bg-primary/15"><X className="size-3" /></button></span>;

  return (
    <TipProvider>
      {fromPrograms ? <Link to="/" className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-text-link hover:underline" data-back-programs><ChevronLeft className="size-4" aria-hidden />Back to Immigration programs</Link> : null}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-semibold">Program structure</h1>
        <Tip focusable tip="Every Pathway, Program, Category and Sub-category is created here, and only here. Each combination it defines appears on Immigration programs, where its setup starts."><span className="text-text-muted outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"><Info className="size-4" aria-label="About the Program structure" /></span></Tip>
        <span className="flex-1" />
        <Tip tip={canAuthor ? "Add a Pathway, Program, Category or Sub-category, or a whole line at once. Pick what exists or type a new name." : AUTHOR_ONLY}><span><Button disabled={!canAuthor} onClick={openAdd} data-add-open><Plus /> Add</Button></span></Tip>
        <p className="w-full text-sm text-text-muted">Where every combination sits: Pathway › Program › Category › Sub-category. The order here is the order on Immigration programs.</p>
      </div>

      {/* The filter bar (R3-6): the same pattern as Immigration programs. */}
      <div className="space-y-2.5" data-filter-bar>
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Pathway type" className="inline-flex items-center gap-0.5 rounded-xl border border-border bg-surface p-0.5">
            {TYPES.map((t) => {
              const c = typeCount(t.value === type ? list.data : other.data);
              return (
                <Tip key={t.value} tip={t.tip}>
                  <button type="button" aria-pressed={type === t.value} onClick={() => { set({ t: t.value === "INDIVIDUAL" ? null : t.value, node: null, p: null, prog: null }); setClosed(new Set()); setConfirm(null); }}
                    className={cn("inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50", type === t.value ? "bg-primary font-semibold text-primary-foreground shadow-sm" : "text-text-muted hover:text-text")}>{t.label}{c !== undefined ? <span className={cn("text-xs font-medium", type === t.value ? "text-primary-foreground/80" : "text-text-muted")}>{c}</span> : null}</button>
                </Tip>
              );
            })}
          </div>
          <Tip tip="Tree shows each Pathway and Program as a block; List shows one line per combination with its full trail. Remembered for you.">
            <div role="group" aria-label="View" className="inline-flex items-center gap-0.5 rounded-xl border border-border bg-surface p-0.5">
              {(["tree", "list"] as const).map((v) => (
                <button key={v} type="button" aria-pressed={view === v} onClick={() => chooseView(v)} data-view-choice={v}
                  className={cn("inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50", view === v ? "bg-surface-raised font-semibold text-text shadow-sm" : "text-text-muted hover:text-text")}>{v === "tree" ? <ListTree className="size-4" aria-hidden /> : <ListIcon className="size-4" aria-hidden />}{v === "tree" ? "Tree" : "List"}</button>
              ))}
            </div>
          </Tip>
          <label className="relative min-w-[200px] flex-1">
            <span className="sr-only">Find a name</span>
            <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-text-muted" aria-hidden />
            <Tip tip={`Find a name in every pathway of ${typeLabel}. A line shows when any of its names matches.`}><Input value={q} onChange={(e) => { setQ(e.target.value); set({ q: e.target.value || null }); }} placeholder={`Find a name in ${typeLabel}`} className="pl-8" /></Tip>
            {q ? <button type="button" aria-label="Clear the search" className="absolute right-1 top-1 flex size-7 items-center justify-center rounded text-text-muted hover:bg-text/5" onClick={() => { setQ(""); set({ q: null }); }}><X className="size-4" /></button> : null}
          </label>
          {view === "tree" ? <>
            <Tip tip="Open every Pathway and Program."><Button size="sm" variant="secondary" onClick={() => setClosed(new Set())}>Expand all</Button></Tip>
            <Tip tip="Show the Pathways and Programs only; open one with its arrow."><Button size="sm" variant="secondary" onClick={() => setClosed(new Set(nodes.filter((n) => n.level === "program").map((n) => n.key)))}>Collapse all</Button></Tip>
          </> : (
            <Tip tip="Page order is the order set here, the one Immigration programs uses; A to Z sorts each line by its trail.">
              <select aria-label="Sort" value={sort} onChange={(e) => set({ sort: e.target.value === "az" ? "az" : null })} className="h-8 rounded-lg border border-border bg-surface px-2 text-sm" data-sort>
                <option value="page">Sort: page order</option><option value="az">Sort: A to Z</option>
              </select>
            </Tip>
          )}
        </div>
        {list.data && !list.data.empty ? (
          <div className="flex flex-wrap items-center gap-2">
            <div role="group" aria-label="Pathway" className="flex flex-wrap items-center gap-1.5">
              <span className="mr-0.5 text-xs text-text-muted">Pathway</span>
              {[{ key: null as string | null, label: "All", count: activeLeaves.length, idx: -1 }, ...pathways.filter((p) => !p.retired || showRetired).map((p, i) => ({ key: p.key as string | null, label: p.label, count: leafCount(p.key), idx: i }))].map((c) => (
                <button key={c.key ?? "all"} type="button" aria-pressed={pw === c.key} onClick={() => set({ p: c.key, prog: null })} data-pathway-chip={c.key ?? "all"}
                  className={cn("inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50", pw === c.key ? "border-primary/40 bg-primary/10 font-semibold text-text-link" : "border-border-strong bg-surface-raised text-text hover:bg-text/5")}>
                  {c.idx >= 0 ? <span className="h-3.5 w-1 rounded-sm" style={{ background: pathwayAccent(c.idx) }} aria-hidden /> : null}{c.label}<span className="text-xs font-medium text-text-muted">{c.count}</span>
                </button>
              ))}
            </div>
            <select aria-label="Program" value={prog ?? ""} onChange={(e) => set({ prog: e.target.value || null })} className="h-8 max-w-[16rem] rounded-lg border border-border bg-surface px-2 text-sm" data-program-filter>
              <option value="">Program: All</option>{programsFor.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
            <select aria-label="Status" value={status ?? ""} onChange={(e) => set({ s: e.target.value || null })} className="h-8 rounded-lg border border-border bg-surface px-2 text-sm" data-status-filter>
              <option value="">Status: All</option>{STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <span className="flex-1" />
            <Tip tip="Retired names are hidden from Add and from new setups. Show them to restore one.">
              <label className="inline-flex items-center gap-1.5 text-sm"><input type="checkbox" checked={showRetired} onChange={(e) => set({ r: e.target.checked ? "1" : null })} data-show-retired /> Show retired ({retiredCount})</label>
            </Tip>
          </div>
        ) : null}
        {list.data && !list.data.empty ? (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-text-muted" data-stats>
            <span>{filtered ? <>Showing <b className="font-semibold text-text">{leaves.filter((n) => !trailOf(n).some((x) => x.retired)).length} of {activeLeaves.length}</b> combinations · </> : null}{many(levelCount("pathway"), "pathway", "pathways")} · {many(levelCount("program"), "program", "programs")} · {many(levelCount("category"), "category", "categories")} · {many(levelCount("subCategory"), "sub-category", "sub-categories")}{filtered ? null : <> · <b className="font-semibold text-text">{activeLeaves.length}</b> {activeLeaves.length === 1 ? "combination" : "combinations"}</>}</span>
            {filtered ? <>
              {pw ? chip("p", byKey.get(pw)?.label ?? "Pathway", () => set({ p: null, prog: null })) : null}
              {prog ? chip("prog", byKey.get(prog)?.label ?? "Program", () => set({ prog: null })) : null}
              {statusOf ? chip("s", statusOf.label, () => set({ s: null })) : null}
              {words ? chip("q", `"${q.trim()}"`, () => { setQ(""); set({ q: null }); }) : null}
              <button type="button" className="text-sm font-medium text-text-link underline underline-offset-2" onClick={() => { setQ(""); set({ p: null, prog: null, s: null, q: null }); }} data-clear-all>Clear all</button>
            </> : null}
          </p>
        ) : null}
        {list.data && !list.data.empty ? <p className="flex flex-wrap items-center gap-x-3.5 text-xs text-text-muted" data-legend>{(["pathway", "program", "category", "subCategory"] as const).map((l) => <span key={l} className="inline-flex items-center gap-1"><LevelMark level={l} tip={false} />{LEVEL_WORD[l]}</span>)}<span>· Numbers show the order on this page, not IRCC codes.</span></p> : null}
      </div>
      {note ? <p role={note.ok ? "status" : "alert"} className={cn("mt-2 text-sm", note.ok ? "text-text-ok" : "text-text-danger")} data-page-note>{note.text}</p> : null}

      <div className={cn("mt-3 grid gap-6", selectedNode && "xl:grid-cols-[minmax(0,1fr)_420px]")}>
        <section aria-label={`${typeLabel} program structure`} className="min-w-0">
          {list.isError ? (
            <ErrorState title="The program structure could not load" description={`${(list.error as Error).message} Your work is safe.`} action={<Button size="sm" variant="secondary" onClick={() => void list.refetch()}>Retry</Button>} />
          ) : list.isPending || !known ? (
            <div className="space-y-2 rounded-xl border border-border bg-surface-raised p-3" aria-busy="true"><span className="sr-only" role="status">Loading the program structure</span>{[0, 1, 1, 1, 0, 1, 1].map((d, i) => <Skeleton key={i} className={d ? "h-9" : "h-7 w-1/3"} />)}</div>
          ) : list.data.empty ? (
            <EmptyState title="No structure yet" description={`${typeLabel} has no names. After Reset both tabs are empty. Add your first pathway, for example Temporary residence.`}
              action={canAuthor ? <Button onClick={() => setAdding({ focus: "pathway" })}><Plus /> Add pathway</Button> : <p className="text-sm text-text-muted">{AUTHOR_ONLY}</p>} />
          ) : !shown.size ? (
            <EmptyState title={words ? `No name matches "${q.trim()}" in ${typeLabel}` : "Nothing matches these filters"} description={otherMatches ? undefined : "Check the spelling, or clear the filters."}
              action={otherMatches ? <p className="text-sm">{otherMatches} {otherMatches === 1 ? "match" : "matches"} in {TYPES.find((t) => t.value !== type)!.label}. <button type="button" className="font-semibold text-text-link underline underline-offset-2" onClick={() => set({ t: type === "INDIVIDUAL" ? "CORPORATE" : null, node: null, p: null, prog: null })}>Show {otherMatches === 1 ? "it" : "them"}</button></p> : <Button size="sm" variant="secondary" onClick={() => { setQ(""); set({ p: null, prog: null, s: null, q: null }); }}>Clear all filters</Button>} />
          ) : view === "tree" ? (
            <div data-tree>
              <Heads wide={!selectedNode} first="Name" />
              {pathways.filter((p) => shown.has(p.key)).map((p) => {
                const shut = closed.has(p.key);
                return (
                  <section key={p.key} aria-label={`${p.label} pathway`} data-band={p.key} className="mb-3.5 rounded-xl border border-lv1-b bg-lv1-t pb-2 pr-2" style={{ borderLeft: `4px solid ${pathwayAccent(pathways.findIndex((x) => x.key === p.key))}` }}>
                    <Row {...rowProps(p)} open={!shut} onToggle={() => setClosed((c) => toggle(c, p.key))} meta={many(leafCount(p.key), "combination", "combinations")} />
                    {confirmBox(p)}
                    {shut ? null : !(kids.get(p.key) ?? []).some((x) => shown.has(x.key)) ? <p className="py-2 pl-10 text-sm text-text-muted" data-empty-pathway>Nothing under it yet. Use Add to add a program.</p> : (kids.get(p.key) ?? []).filter((x) => shown.has(x.key)).map((g) => {
                      const gShut = closed.has(g.key);
                      return (
                        <div key={g.key} className="mb-2 ml-6 rounded-lg border border-border bg-surface-raised last:mb-0" data-block={g.key}>
                          <Row {...rowProps(g)} open={!gShut} onToggle={() => setClosed((c) => toggle(c, g.key))} meta={many(leafCount(g.key), "combination", "combinations")} />
                          {confirmBox(g)}
                          {gShut ? null : !(kids.get(g.key) ?? []).some((x) => shown.has(x.key)) ? <p className="border-t border-border py-2 pl-12 text-sm text-text-muted" data-empty-program>Nothing under it yet. Use Add to add a category.</p> : (kids.get(g.key) ?? []).filter((x) => shown.has(x.key)).map((c) => {
                            const subs = (kids.get(c.key) ?? []).filter((x) => shown.has(x.key)), cShut = closed.has(c.key);
                            return (
                              <React.Fragment key={c.key}>
                                <Row {...rowProps(c)} open={subs.length ? !cShut : undefined} onToggle={() => setClosed((x) => toggle(x, c.key))} meta={subs.length ? many(subs.length, "sub-category", "sub-categories") : undefined} />
                                {confirmBox(c)}
                                {cShut ? null : subs.map((s) => <React.Fragment key={s.key}><Row {...rowProps(s)} />{confirmBox(s)}</React.Fragment>)}
                              </React.Fragment>
                            );
                          })}
                        </div>
                      );
                    })}
                  </section>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-surface-raised" data-list>
              <Heads wide={!selectedNode} first="Combination: Pathway type › Pathway › Program › Category › Sub-category" list />
              {(sort === "az" ? [...leaves].sort((a, b) => trailOf(a).map((x) => x.label).join("|").localeCompare(trailOf(b).map((x) => x.label).join("|"), "en-CA")) : leaves).map((n) => (
                <React.Fragment key={n.key}>
                  <Row {...rowProps(n)} list trail={[typeLabel, ...trailOf(n).map((x) => x.label)]} />
                  {confirmBox(n)}
                </React.Fragment>
              ))}
            </div>
          )}
          {list.data && !list.data.empty ? <p className="mt-2 text-xs text-text-muted">Names and locations are Sample until the immigration expert confirms. {list.data.meaningCheck.why}</p> : null}
        </section>
        {selectedNode ? <DetailPanel key={selectedNode.key} node={selectedNode} num={num.get(selectedNode.key) ?? null} type={type} siblings={kids.get(selectedNode.parentKey)?.filter((s) => (selectedNode.parentKey !== null || s.level === "pathway") && !s.retired) ?? []} leaf={isLeaf(selectedNode)}
          leaves={below(selectedNode.key).filter(isLeaf).map((x) => ({ n: x, path: trailOf(x).slice(trailOf(selectedNode).length).map((y) => y.label) }))} canAuthor={canAuthor} onClose={() => set({ node: null })} /> : null}
      </div>
      <AddToStructure open={!!adding} onClose={() => setAdding(null)} type={type} prefill={adding ?? undefined}
        onAdded={(r, again) => { setJustAdded(r.leaf.key); setNote({ ok: true, text: `Added ${r.created.map((c) => `"${c.label}"`).join(", ")}${r.combination ? ": listed on Immigration programs as Not started; no setup started." : "."}` }); if (!again) setAdding(null); }}
        onShow={(k) => { setAdding(null); set({ node: k }); setJustAdded(k); }} />
    </TipProvider>
  );
}

const toggle = (s: Set<string>, k: string) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; };
/** The row grid: name, status, cases may be opened from, Used by (1280 px and wider, panel closed: minor 6), actions. */
const GRID = (wide: boolean, list?: boolean) => cn("grid items-center gap-x-2", list ? (wide ? "grid-cols-[3.5rem_minmax(0,1fr)_8rem_10rem_7rem_9.5rem] max-xl:grid-cols-[3.5rem_minmax(0,1fr)_10rem_9.5rem]" : "grid-cols-[3.5rem_minmax(0,1fr)_10rem_9.5rem]")
  : (wide ? "grid-cols-[minmax(0,1fr)_8rem_10rem_7rem_9.5rem] max-xl:grid-cols-[minmax(0,1fr)_7rem_8rem_9.5rem]" : "grid-cols-[minmax(0,1fr)_7rem_8rem_9.5rem]"));
function Heads({ wide, first, list }: { wide: boolean; first: string; list?: boolean }) {
  return (
    <div className={cn(GRID(wide, list), "py-1.5 text-xs font-medium text-text-muted", list ? "border-b border-border px-3" : "pl-3 pr-[1.375rem]")} aria-hidden data-line-heads>
      {list ? <span>No.</span> : null}<span>{first}</span><span>Status{list ? <span className="xl:hidden"> · cases from</span> : null}</span><span className={cn(list && (wide ? "max-xl:hidden" : "hidden"))}>Cases may be opened from</span>{wide ? <span className="max-xl:hidden">Used by</span> : null}<span className="text-right"><span className="sr-only">Actions</span></span>
    </div>
  );
}

const ACTION: Record<LifecycleAction | "WITHDRAW", { word: string; icon: React.ReactNode; tip: (n: StructureNode) => string }> = {
  DELETE: { word: "Delete", icon: <Trash2 className="size-3.5" aria-hidden />, tip: (n) => n.action.below.length ? `Deletes ${n.label} and the ${n.action.below.length} names under it; nothing uses them. A second person approves on To review.` : "Nothing uses it. A second person approves the deletion on To review." },
  RETIRE: { word: "Retire", icon: <Archive className="size-3.5" aria-hidden />, tip: (n) => `Released, so it cannot be deleted. Retire hides it from Add and new setups; cases and earlier releases keep it.${n.action.withCombination ? " Its combination is retired with it." : ""}` },
  RESTORE: { word: "Restore", icon: <RotateCcw className="size-3.5" aria-hidden />, tip: () => "Retired: hidden from Add and new setups; cases and earlier releases keep it. Restore brings it back (a second person approves)." },
  WITHDRAW: { word: "Withdraw", icon: <Undo2 className="size-3.5" aria-hidden />, tip: (n) => `${n.pending ? PENDING_WORD[n.pending.action] : "A change waits"} for a second person on To review. Withdraw keeps ${n.label} as it is.` },
};

/** One row of the Tree or the List: number, mark, name in text colour (level colour on the mark and number only,
 *  P-128 (6)), its state, where cases may be opened, Used by, then Edit and its one action (R3-2). */
function Row({ n, num, selected, current, justAdded, canAuthor, words, onEdit, onAction, onKey, wide, open, onToggle, meta, list, trail }: {
  n: StructureNode; num: string | null; selected: boolean; current: boolean; justAdded: boolean; canAuthor: boolean; words: string; wide: boolean;
  onEdit: () => void; onAction: () => void; onKey: (e: React.KeyboardEvent) => void; open?: boolean; onToggle?: () => void; meta?: string; list?: boolean; trail?: string[];
}) {
  const leaf = !!n.combination, c = n.combination, a = n.action;
  const why = !canAuthor ? AUTHOR_ONLY : a.why ? (a.kind === "DELETE" ? `Can't delete: ${a.why.replace(/\.$/, "")}. A name in use can't be deleted; once it is released it can be retired instead.` : a.why) : null;
  const tab = current ? 0 : -1;
  const level = DEPTH[n.level];
  const numText = <Tip tip={num ? NUM_TIP : "Retired: not numbered, so the numbers of the others never move."}><span className={cn("shrink-0 text-xs font-semibold tabular-nums", list ? "text-text-muted" : ["text-lv1", "text-lv2", "text-lv3", "text-lv3"][level])} data-num>{num ?? "—"}</span></Tip>;
  return (
    <div role="group" aria-label={`${num ? `${num} ` : ""}${LEVEL_WORD[n.level]} ${n.label}`} data-row={n.key} data-level={n.level} onKeyDown={onKey}
      className={cn(GRID(wide, list), "min-h-10 px-3 py-1", !list && level >= 2 && "border-t border-border", list && "border-t border-border first-of-type:border-t-0", selected && "bg-primary/10", n.retired && "text-text-muted")}>
      {list ? numText : null}
      <div className={cn("flex min-w-0 items-center gap-1.5", !list && ["", "", "pl-6", "pl-12"][level])}>
        {!list ? (open !== undefined ? <button type="button" tabIndex={-1} aria-expanded={open} aria-label={`${open ? "Collapse" : "Expand"} ${n.label}`} onClick={onToggle} className="flex size-5 shrink-0 items-center justify-center rounded text-text-muted hover:bg-text/5">{open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}</button> : <span className="size-5 shrink-0" />) : null}
        {!list ? numText : null}
        {list && trail ? <TrailText parts={trail} words={words} /> : <>
          <LevelMark level={n.level} />
          {/* The name keeps the width; its count wraps under it when the row is narrow (1024 px). */}
          <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
            <span className={cn("min-w-0 [overflow-wrap:break-word]", ["text-base font-semibold", "font-semibold", "font-medium", ""][level], n.pending?.action === "DELETE" && "line-through decoration-warn")} data-name><Mark text={n.label} words={words} /></span>
            {meta ? <span className="whitespace-nowrap text-xs text-text-muted">{meta}</span> : null}
          </span>
        </>}
        {justAdded ? <span className="shrink-0 rounded-full bg-ok/15 px-2 py-0.5 text-xs font-semibold text-text-ok" data-just-added>Just added</span> : null}
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-1">
        {n.pending ? <Tip tip={`Sent to a second person on To review. ${n.pending.action === "DELETE" ? "It is deleted when approved." : "It takes effect with the next release after approval."}`}><span><Pill tone="warn">{PENDING_WORD[n.pending.action]}</Pill></span></Tip> : null}
        {n.retired ? <Pill tone="neutral"><Archive className="size-3" aria-hidden /> Retired</Pill> : leaf && !n.pending ? (c!.id ? (c!.retired ? <Pill tone="neutral">Retired</Pill> : <StatusChip status={c!.status} text={c!.statusText} />)
          : <Tip tip="Added to the Program structure; no setup yet. Start it from its card on Immigration programs or its details."><span className="inline-flex items-center rounded-full border border-dashed border-border-strong px-2 py-0.5 text-xs font-semibold text-text-muted">Not started</span></Tip>) : null}
        {list && leaf ? <span className={cn("w-full text-xs text-text-muted", wide && "xl:hidden")} data-loc-stacked>{locWords(n.allowedLocations)}</span> : null}
      </div>
      <span className={cn("text-xs text-text-muted", list && (wide ? "max-xl:hidden" : "hidden"))} data-loc>{leaf ? <Tip tip={LOC_TIP}><span>{locWords(n.allowedLocations)}</span></Tip> : null}</span>
      {wide ? <span className="text-xs text-text-muted max-xl:hidden" data-used-by-line>{leaf ? <Tip tip={USED_TIP}><span><span className="sr-only">Used by: </span>{usedBy(c)}</span></Tip> : null}</span> : null}
      <div className="flex items-center justify-end gap-0.5">
        <Tip tip={canAuthor ? (leaf ? "Rename it, set where cases may be opened, reorder it, see where it is used and its history." : "Rename, reorder, see where it is used and its history.") : "See the name, where it is used and its history. Only a configuration author changes it."}>
          <button type="button" tabIndex={tab} onClick={onEdit} data-edit className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-text-muted outline-none hover:bg-text/5 hover:text-text-link focus-visible:ring-[3px] focus-visible:ring-ring/50">{canAuthor ? <Pencil className="size-3.5" aria-hidden /> : <Eye className="size-3.5" aria-hidden />}{canAuthor ? "Edit" : "View"}<span className="sr-only"> {n.label}</span></button>
        </Tip>
        <Tip tip={why ?? ACTION[a.kind].tip(n)}>
          <button type="button" tabIndex={tab} aria-disabled={why ? true : undefined} onClick={() => { if (!why) onAction(); }} data-action={a.kind}
            className={cn("inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50", why ? "cursor-not-allowed text-text-muted/60" : a.kind === "WITHDRAW" ? "text-text-warn hover:bg-text/5" : "text-text-muted hover:bg-text/5 hover:text-text-link")}>{ACTION[a.kind].icon}{ACTION[a.kind].word}<span className="sr-only"> {n.label}{why ? `: ${why}` : ""}</span></button>
        </Tip>
      </div>
    </div>
  );
}

/** The List's trail (R3-5): Pathway type › Pathway › Program › Category › Sub-category, wrapping whole at separators. */
function TrailText({ parts, words }: { parts: string[]; words: string }) {
  const [type, ...rest] = parts;
  return (
    <span className="min-w-0 text-sm [overflow-wrap:anywhere]" data-trail-line>
      <span className="text-text-muted">{type}</span>
      {rest.map((p, i) => <span key={i}><span className="text-text-muted" aria-hidden> › </span><span className={i >= 2 ? "font-medium" : undefined}><Mark text={p} words={words} /></span></span>)}
      {rest.length === 3 ? <><span className="text-text-muted" aria-hidden> › </span><span className="text-text-muted">No sub-category</span></> : null}
    </span>
  );
}

/** The in-page confirm (R3-3): what goes or what uses it, a reason for the second person, and the one button. */
function ConfirmAction({ n, kind, num, byKey, onClose, onDone }: { n: StructureNode; kind: LifecycleAction | "WITHDRAW"; num: Map<string, string>; byKey: Map<string, StructureNode>; onClose: () => void; onDone: (text: string) => Promise<void> }) {
  const [reason, setReason] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const ref = React.useRef<HTMLTextAreaElement>(null);
  React.useEffect(() => { ref.current?.focus(); }, []);
  const send = async () => {
    setBusy(true); setError(null);
    try {
      if (kind === "WITHDRAW") await api(`/library/changes/${n.pending!.id}/withdraw`, { method: "POST", json: { note: reason } });
      else await api(`/structure/nodes/${encodeURIComponent(n.key)}${kind === "DELETE" ? "" : `/${kind.toLowerCase()}`}`, { method: kind === "DELETE" ? "DELETE" : "POST", json: { reason } });
      await onDone(kind === "WITHDRAW" ? `Withdrawn. "${n.label}" stays as it was.` : `Sent to a second person on To review: ${kind === "DELETE" ? `"${n.label}"${n.action.below.length ? ` and the ${n.action.below.length} names under it are` : " is"} deleted when approved` : `"${n.label}"${n.action.withCombination ? " and its combination are" : " is"} ${kind === "RETIRE" ? "retired" : "restored"} with the next release after approval`}.`);
    } catch (e) { setError((e as Error).message); setBusy(false); }
  };
  const title = kind === "DELETE" ? `Delete "${n.label}"${n.action.below.length ? " and everything under it" : ""}?` : kind === "RETIRE" ? `Retire "${n.label}"?` : kind === "RESTORE" ? `Restore "${n.label}"?` : `Withdraw the ${n.pending ? PENDING_WORD[n.pending.action].toLowerCase() : "change"}?`;
  return (
    <div role="region" aria-label={title} className="mx-3 my-2 space-y-2 rounded-lg border border-border-strong bg-surface p-3 text-sm shadow-sm" data-confirm={n.key}>
      <p className="font-semibold">{title}</p>
      {kind === "DELETE" ? (n.action.below.length ? <><p>These go with it; none is used:</p><ul className="ml-5 list-disc" data-goes-with>{n.action.below.map((k) => <li key={k}>{num.get(k) ? `${num.get(k)} ` : ""}{byKey.get(k)?.label ?? k}</li>)}</ul></> : <p>Nothing uses it: no setup, no cases, never released.</p>)
        : kind === "RETIRE" ? <p>It was released{n.combination?.id ? ` and is used: ${usedBy(n.combination)}` : ""}. Retired, it is hidden from Add and from new setups. Open cases and earlier releases keep it. You can restore it.{n.action.withCombination ? " Its combination is retired with it." : ""}</p>
        : kind === "RESTORE" ? <p>It comes back to Add and to new setups with the next release after approval.{n.action.withCombination ? " Its combination is restored with it." : ""}</p>
        : <p>Nothing changes: the request leaves To review.</p>}
      <label htmlFor={`reason-${n.key}`} className="block text-xs font-medium">{kind === "WITHDRAW" ? "Why withdraw it?" : "Why?"} <span className="font-normal text-text-muted">Required, for the second person</span></label>
      <Textarea ref={ref} id={`reason-${n.key}`} value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-14" />
      {kind !== "WITHDRAW" ? <p className="text-xs text-text-muted">A second person approves on To review. Until then it shows as {PENDING_WORD[kind].toLowerCase()} and you can withdraw it.</p> : null}
      {error ? <p role="alert" className="text-text-danger">{error}</p> : null}
      <div className="flex justify-end gap-2"><Button size="sm" variant="ghost" onClick={onClose}>Cancel</Button><Button size="sm" variant={kind === "DELETE" ? "destructive" : "default"} onClick={() => void send()} disabled={reason.trim().length < 3} busy={busy} data-confirm-send>{kind === "DELETE" ? "Delete" : kind === "RETIRE" ? "Retire" : kind === "RESTORE" ? "Restore" : "Withdraw"}</Button></div>
    </div>
  );
}

/** S2 fix (founder, 27 Oct): beside the outline (1280 px and wider) the panel starts below the page header and only
 *  sticks once scrolled, so a fixed height pushed its footer (Delete / Retire, Save) below the screen. Its height is
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

/** Edit (R3-2): the selected name: what uses it, rename, where cases may be opened, order, delete / retire / restore,
 *  history. A side panel beside the outline (non-modal, pinned header and footer). Adding goes through the one Add. */
function DetailPanel({ node, num, type, siblings, leaf, leaves, canAuthor, onClose }: { node: StructureNode; num: string | null; type: PathwayType; siblings: StructureNode[]; leaf: boolean; leaves: { n: StructureNode; path: string[] }[]; canAuthor: boolean; onClose: () => void }) {
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
      say(true, action === "WITHDRAW" ? "Withdrawn. Nothing changed." : `Sent to a second person on To review. ${action === "DELETE" ? "It is deleted when approved." : "It takes effect with the next release after approval."}` );
      setAction(null); setReason(""); await refresh();
    } catch (e) { say(false, (e as Error).message ); }
    finally { setBusy(false); }
  };
  const u = uses.data;
  const i = siblings.findIndex((s) => s.key === node.key);
  const no = !canAuthor ? AUTHOR_ONLY : null;
  const ACTIONS: { a: LifecycleAction; word: string; why: string | null | undefined; tip: string }[] = [
    { a: "DELETE", word: "Delete", why: u?.can.delete, tip: "Deletes a name that was never released and is used nowhere, with every name under it. A second person approves; Withdraw while it waits." },
    { a: "RETIRE", word: "Retire", why: u?.can.retire, tip: `Hides a released name from pickers and AI. Earlier releases and open cases keep it. Takes effect with the next release.${u?.withCombination ? " Its combination is retired with it." : ""}` },
    { a: "RESTORE", word: "Restore", why: u?.can.restore, tip: "Brings a retired name back to pickers, by the same path: a second person approves, the release publishes." },
  ];
  return (
    <aside ref={fit} data-panel aria-label={`${node.label} details`} className="fixed bottom-4 right-0 top-14 z-40 flex w-full max-w-[440px] flex-col border-l border-border bg-surface-raised shadow-xl xl:sticky xl:top-20 xl:z-auto xl:max-w-none xl:rounded-xl xl:border xl:shadow-sm">
      <div className="flex items-start gap-2 border-b border-border px-5 py-3">
        <div className="min-w-0 flex-1"><h2 className="break-words text-lg font-semibold">{num ? <span className="mr-1.5 text-sm tabular-nums text-text-muted" data-panel-num>{num}</span> : null}{node.label}</h2><p className="text-xs text-text-muted">{LEVEL_WORD[node.level]}{leaf ? " · combination" : ""}{node.retired ? " · Retired" : ""}</p></div>
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
          <Tip tip={no ?? "Moves it among the names under the same parent. Shown on the Program structure and in Immigration programs; applies at once."}><span><Button size="sm" variant="secondary" disabled={!!no || i <= 0} onClick={() => void move(-1)}><ArrowUp /> Move up</Button></span></Tip>
          <Tip tip={no ?? "Moves it among the names under the same parent. Shown on the Program structure and in Immigration programs; applies at once."}><span><Button size="sm" variant="secondary" disabled={!!no || i < 0 || i >= siblings.length - 1} onClick={() => void move(1)}><ArrowDown /> Move down</Button></span></Tip>
        </div>
        <section aria-label="Where used" className="space-y-2 rounded-lg border border-border p-3">
          <h3 className="text-sm font-semibold">Where used</h3>
          {uses.isPending ? <Skeleton className="h-10" /> : uses.isError ? <p className="text-text-danger">{(uses.error as Error).message}</p> : u ? (
            <>
              {u.uses.filter((x) => x.kind !== "draft_change").length ? <ul className="space-y-1">{u.uses.filter((x) => x.kind !== "draft_change").map((x, k) => <li key={k} className="flex flex-wrap gap-x-2"><span>{x.href ? <Link to={x.href.replace(/^\/structure\?node=/, "/structure?node=")} className="text-text-link underline underline-offset-2">{x.label}</Link> : x.label}</span><span className={cn("text-xs", x.blocks ? "text-text-warn" : "text-text-muted")}>{x.why}</span></li>)}</ul> : <p className="text-text-muted">Used nowhere.</p>}
              {u.pending ? <Notice tone="warn" title={`${PENDING_WORD[u.pending.action]} for a second person`} action={canAuthor ? <Button size="sm" variant="secondary" onClick={() => { setAction("WITHDRAW"); setReason(""); }}>Withdraw</Button> : undefined}>Proposed by {u.pending.by}. <Link to={`/review/change/${u.pending.id}`} className="text-text-link underline underline-offset-2">See it on To review</Link></Notice> : null}
              {action ? (
                <div className="space-y-2 rounded-lg bg-surface p-3">
                  <label htmlFor="structure-reason" className="text-xs font-medium">{action === "WITHDRAW" ? "Why withdraw it?" : `Why ${action.toLowerCase()} "${node.label}"?`} <span className="font-normal text-text-muted">Required, for the second person</span></label>
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
