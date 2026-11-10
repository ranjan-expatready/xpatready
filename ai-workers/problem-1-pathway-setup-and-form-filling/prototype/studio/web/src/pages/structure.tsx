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
import { Archive, ArrowDown, ArrowUp, ChevronLeft, Eye, Info, List as ListIcon, ListTree, Pencil, Plus, RotateCcw, Search, Trash2, Undo2, X } from "lucide-react";
import type { Level, LifecycleAction, PathwayType, StructureNode, UsesView } from "../../../contracts/structure";
import { api, ApiError, useActorId, useApi, useSessionView } from "@/lib/api";
import { Button, Input, Notice, Pill, Textarea } from "@/components/ui/controls";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtWhen, StatusChip, Tip, TipProvider } from "@/components/status";
import { AddToStructure, LocationPicker, LOC_TIP, locKey, type AddPrefill } from "@/components/add-to-structure";
import { BlockedLine, ImpactPanel, RowAction, useUndoToast, WherePanel } from "@/components/lifecycle";
import { ACTION_LABEL, RETURNED_LABEL, SAY, TIP, WAITING_LABEL, WHY } from "../../../contracts/lifecycle";
import { LevelMark, pathwayAccent } from "@/components/levels";
import { cn } from "@/lib/utils";
import { StartSetupButton } from "@/components/start-setup";
import { STATE_WORDS, USED_BY_NOTHING_YET } from "../../../contracts/status-words";
import { FoldArrow } from "@/components/fold-out";

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
const PENDING_WORD: Record<LifecycleAction, string> = WAITING_LABEL; // the one word set (contracts/lifecycle.ts)
const ACTION_WORDS = ACTION_LABEL;
const USED_TIP = "What uses this combination: the releases firms have and the cases open on it. Its details list each one.";
const STATUS: { value: string; label: string; test: (n: StructureNode) => boolean }[] = [
  { value: "setup", label: STATE_WORDS.IN_SETUP, test: (n) => !!n.combination?.id && n.combination.status === "IN_SETUP" },
  { value: "notready", label: STATE_WORDS.NOT_READY, test: (n) => !!n.combination?.id && n.combination.status === "NOT_READY" },
  { value: "live", label: STATE_WORDS.READY, test: (n) => !!n.combination?.id && n.combination.status === "READY" },
  { value: "ns", label: STATE_WORDS.NOT_STARTED, test: (n) => !!n.combination && !n.combination.id },
  { value: "waiting", label: "Waiting for approval", test: (n) => !!n.pending },
];
const norm = (s: string) => s.normalize("NFKC").toLocaleLowerCase("en-CA").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const many = (n: number, one: string, more: string) => `${n} ${n === 1 ? one : more}`;
/** "Used by" (P-127 (1)): the releases that hold the combination and the cases open on it. */
const usedBy = (c: StructureNode["combination"]) => {
  if (!c?.id) return "Nothing yet";
  const parts = [c.releases ? `${c.releases} release${c.releases === 1 ? "" : "s"}` : "", c.openCases ? `${c.openCases} open case${c.openCases === 1 ? "" : "s"}` : ""].filter(Boolean);
  return parts.length ? parts.join(" · ") : USED_BY_NOTHING_YET;
};

const VIEW_KEY = (actor: string | null) => `xr-structure-view:${actor ?? "anyone"}`;
type Confirm = { key: string; kind: LifecycleAction | "WITHDRAW"; again?: boolean };

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
    // Focus goes to the row only once the pop-up is closed: during "Add and add another" the pop-up's focus trap took it
    // back and selected the letters already typed, so the next key replaced them (QA-60).
    const stay = !!adding;
    requestAnimationFrame(() => { const el = document.querySelector<HTMLElement>(`[data-row="${CSS.escape(n.key)}"]`); el?.scrollIntoView({ block: "center" }); if (!stay) el?.querySelector<HTMLElement>("[data-edit]")?.focus({ preventScroll: true }); });
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
  const rowProps = (n: StructureNode) => ({ n, num: num.get(n.key) ?? null, selected: selected === n.key || confirm?.key === n.key, current: cur === n.key, justAdded: justAdded === n.key, canAuthor, words,
    onEdit: () => { setCurrent(n.key); set({ node: n.key }); }, onAction: () => { setCurrent(n.key); setActing({ busy: false, error: null }); set({ node: null }); setConfirm({ key: n.key, kind: n.action.kind }); },
    onSendAgain: () => { setCurrent(n.key); setActing({ busy: false, error: null }); set({ node: null }); setConfirm({ key: n.key, kind: n.pending!.action, again: true }); }, onKey: onRowKey(n.key), wide: !selectedNode && !confirm });

  // The confirm (ImpactPanel, the right panel), then the Undo toast (P-116 amended): an author's own draft is deleted at
  // once (Undo brings it back); anything else waits for a second person (Undo withdraws it).
  const undo = useUndoToast();
  const [acting, setActing] = React.useState<{ busy: boolean; error: string | null }>({ busy: false, error: null });
  const confirmNode = confirm ? byKey.get(confirm.key) : undefined;
  const branchOf = (k: string): string[] => [...byKey.values()].filter((x) => x.parentKey === k && !x.retired).flatMap((x) => [x.key, ...branchOf(x.key)]);
  const sendAction = async (n: StructureNode, kind: LifecycleAction | "WITHDRAW", reason: string, again = false) => {
    setActing({ busy: true, error: null });
    try {
      if (again && kind !== "WITHDRAW") { await api(`/library/changes/${n.pending!.id}/resubmit`, { method: "POST", json: { reason } }); setNote({ ok: true, text: SAY.sentAgain(kind, n.label) }); undo.show(SAY.sentAgain(kind, n.label)); }
      else if (kind === "WITHDRAW") { await api(`/library/changes/${n.pending!.id}/withdraw`, { method: "POST", json: { note: reason } }); setNote({ ok: true, text: SAY.withdrawn(n.label) }); undo.show(SAY.withdrawn(n.label)); }
      else {
        const r = await api<{ id: string; immediate?: boolean }>(`/structure/nodes/${encodeURIComponent(n.key)}${kind === "DELETE" ? "" : `/${kind.toLowerCase()}`}`, { method: kind === "DELETE" ? "DELETE" : "POST", json: { reason: reason || SAY.ownDraft } });
        const text = r.immediate ? SAY.deletedNow(n.label, n.action.below.length) : SAY.sent(kind, n.label);
        setNote({ ok: true, text });
        undo.show(text, async () => {
          try {
            await api(r.immediate ? `/library/changes/${r.id}/undo` : `/library/changes/${r.id}/withdraw`, { method: "POST", json: r.immediate ? {} : { note: SAY.undone } });
            setNote({ ok: true, text: r.immediate ? SAY.undoneDelete(n.label) : SAY.undone });
          } catch (e) { setNote({ ok: false, text: (e as Error).message }); }
          await refresh();
        });
      }
      setConfirm(null); setActing({ busy: false, error: null }); await refresh();
    } catch (e) { setActing({ busy: false, error: (e as Error).message }); }
  };
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
                    className={cn("inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50", type === t.value ? "bg-primary font-semibold text-primary-foreground shadow-sm" : "text-text-muted hover:text-text")}>{t.label}{c !== undefined ? <span className={cn("text-xs font-medium", type === t.value ? "text-primary-foreground" : "text-text-muted")}>{c}</span> : null}</button>
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
      {note ? <p role={note.ok ? "status" : "alert"} className={cn("mt-2 text-sm", note.ok ? "text-text-ok" : "text-text-danger")} data-page-note>{note.text}{note.ok ? undo.link : null}</p> : null}

      <div className={cn("mt-3 grid gap-6", (selectedNode || confirmNode) && "xl:grid-cols-[minmax(0,1fr)_420px]")}>
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
              <Heads wide={!selectedNode && !confirm} first="Name" />
              {pathways.filter((p) => shown.has(p.key)).map((p) => {
                const shut = closed.has(p.key);
                return (
                  <section key={p.key} aria-label={`${p.label} pathway`} data-band={p.key} className="mb-3.5 rounded-xl border border-lv1-b bg-lv1-t pb-2 pr-2" style={{ borderLeft: `4px solid ${pathwayAccent(pathways.findIndex((x) => x.key === p.key))}` }}>
                    <Row {...rowProps(p)} open={!shut} onToggle={() => setClosed((c) => toggle(c, p.key))} meta={many(leafCount(p.key), "combination", "combinations")} />
                    {shut ? null : !(kids.get(p.key) ?? []).some((x) => shown.has(x.key)) ? <p className="py-2 pl-10 text-sm text-text-muted" data-empty-pathway>Nothing under it yet. Use Add to add a program.</p> : (kids.get(p.key) ?? []).filter((x) => shown.has(x.key)).map((g) => {
                      const gShut = closed.has(g.key);
                      return (
                        <div key={g.key} className="mb-2 ml-6 rounded-lg border border-border bg-surface-raised last:mb-0" data-block={g.key}>
                          <Row {...rowProps(g)} open={!gShut} onToggle={() => setClosed((c) => toggle(c, g.key))} meta={many(leafCount(g.key), "combination", "combinations")} />
                          {gShut ? null : !(kids.get(g.key) ?? []).some((x) => shown.has(x.key)) ? <p className="border-t border-border py-2 pl-12 text-sm text-text-muted" data-empty-program>Nothing under it yet. Use Add to add a category.</p> : (kids.get(g.key) ?? []).filter((x) => shown.has(x.key)).map((c) => {
                            const subs = (kids.get(c.key) ?? []).filter((x) => shown.has(x.key)), cShut = closed.has(c.key);
                            return (
                              <React.Fragment key={c.key}>
                                <Row {...rowProps(c)} open={subs.length ? !cShut : undefined} onToggle={() => setClosed((x) => toggle(x, c.key))} meta={subs.length ? many(subs.length, "sub-category", "sub-categories") : undefined} />
                                {cShut ? null : subs.map((s) => <Row key={s.key} {...rowProps(s)} />)}
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
              <Heads wide={!selectedNode && !confirm} first="Combination: Pathway type › Pathway › Program › Category › Sub-category" list />
              {(sort === "az" ? [...leaves].sort((a, b) => trailOf(a).map((x) => x.label).join("|").localeCompare(trailOf(b).map((x) => x.label).join("|"), "en-CA")) : leaves).map((n) => (
                <React.Fragment key={n.key}>
                  <Row {...rowProps(n)} list trail={[typeLabel, ...trailOf(n).map((x) => x.label)]} />
                </React.Fragment>
              ))}
            </div>
          )}
          {list.data && !list.data.empty ? <p className="mt-2 text-xs text-text-muted">Names and locations are Sample until the immigration expert confirms. {list.data.meaningCheck.why}</p> : null}
        </section>
        {confirmNode ? <ImpactPanel key={`impact-${confirmNode.key}-${confirm!.again ? "again" : ""}`} kind={confirm!.kind} name={confirmNode.label} immediate={!confirm!.again && confirm!.kind === "DELETE" && confirmNode.action.immediate} again={confirm!.again}
          goes={confirm!.kind === "DELETE" ? (confirm!.again ? branchOf(confirmNode.key) : confirmNode.action.below).map((k) => ({ num: num.get(k) ?? null, label: byKey.get(k)?.label ?? k })) : undefined}
          kept={confirm!.kind === "RETIRE" && confirmNode.combination?.id && usedBy(confirmNode.combination) !== USED_BY_NOTHING_YET ? [usedBy(confirmNode.combination)] : undefined}
          withCombination={confirmNode.action.withCombination} busy={acting.busy} error={acting.error} onCancel={() => setConfirm(null)} onSend={(reason) => void sendAction(confirmNode, confirm!.kind, reason, confirm!.again)} />
        : selectedNode ? <DetailPanel key={selectedNode.key} node={selectedNode} num={num.get(selectedNode.key) ?? null} type={type} siblings={kids.get(selectedNode.parentKey)?.filter((s) => selectedNode.parentKey !== null || s.level === "pathway") ?? []} leaf={isLeaf(selectedNode)}
          leaves={below(selectedNode.key).filter(isLeaf).map((x) => ({ n: x, path: trailOf(x).slice(trailOf(selectedNode).length).map((y) => y.label) }))} canAuthor={canAuthor} onClose={() => set({ node: null })}
          onAction={() => { setActing({ busy: false, error: null }); const k = selectedNode.key; set({ node: null }); setConfirm({ key: k, kind: selectedNode.action.kind }); }} /> : null}
      </div>
      <AddToStructure open={!!adding} onClose={() => setAdding(null)} type={type} prefill={adding ?? undefined}
        onAdded={(r, again) => { setJustAdded(r.leaf.key); undo.clear(); setNote({ ok: true, text: `Added ${r.created.map((c) => `"${c.label}"`).join(", ")}${r.combination ? ": listed on Immigration programs as Not started; no setup started." : "."}` }); if (!again) setAdding(null); }}
        onShow={(k) => { setAdding(null); set({ node: k }); setJustAdded(k); }} />
      {undo.node}
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

/** One row of the Tree or the List: number, mark, name in text colour (level colour on the mark and number only,
 *  P-128 (6)), its state, where cases may be opened, Used by, then Edit and its one action (R3-2). */
function Row({ n, num, selected, current, justAdded, canAuthor, words, onEdit, onAction, onSendAgain, onKey, wide, open, onToggle, meta, list, trail }: {
  n: StructureNode; num: string | null; selected: boolean; current: boolean; justAdded: boolean; canAuthor: boolean; words: string; wide: boolean;
  onEdit: () => void; onAction: () => void; onSendAgain: () => void; onKey: (e: React.KeyboardEvent) => void; open?: boolean; onToggle?: () => void; meta?: string; list?: boolean; trail?: string[];
}) {
  const leaf = !!n.combination, c = n.combination, a = n.action;
  const why = !canAuthor ? WHY.author : a.why;
  const reasonId = `why-${n.key}`;
  const tab = current ? 0 : -1;
  const level = DEPTH[n.level];
  const numText = <Tip tip={num ? NUM_TIP : "Retired: not numbered, so the numbers of the others never move."}><span className={cn("shrink-0 text-xs font-semibold tabular-nums", list ? "text-text-muted" : ["text-lv1", "text-lv2", "text-lv3", "text-lv3"][level])} data-num>{num ?? "—"}</span></Tip>;
  return (
    <div role="group" aria-label={`${num ? `${num} ` : ""}${LEVEL_WORD[n.level]} ${n.label}`} data-row={n.key} data-level={n.level} onKeyDown={onKey}
      className={cn(GRID(wide, list), "min-h-10 px-3 py-1", !list && level >= 2 && "border-t border-border", list && "border-t border-border first-of-type:border-t-0", selected && "bg-primary/10", n.retired && "text-text-muted")}>
      {list ? numText : null}
      <div className={cn("flex min-w-0 items-center gap-1.5", !list && ["", "", "pl-6", "pl-12"][level])}>
        {!list ? (open !== undefined ? <button type="button" tabIndex={-1} aria-expanded={open} aria-label={`${open ? "Collapse" : "Expand"} ${n.label}`} onClick={onToggle} className="flex size-5 shrink-0 items-center justify-center rounded text-text-muted hover:bg-text/5"><FoldArrow open={open} className="size-4" /></button> : <span className="size-5 shrink-0" />) : null}
        {!list ? numText : null}
        {list && trail ? <TrailText parts={trail} words={words} /> : <>
          <LevelMark level={n.level} />
          {/* The name keeps the width; its count wraps under it when the row is narrow (1024 px). */}
          <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
            <span className={cn("min-w-0 [overflow-wrap:break-word]", ["text-base font-semibold", "font-semibold", "font-medium", ""][level], n.pending?.action === "DELETE" && n.pending.status !== "RETURNED" && "line-through decoration-warn")} data-name><Mark text={n.label} words={words} /></span>
            {meta ? <span className="whitespace-nowrap text-xs text-text-muted">{meta}</span> : null}
          </span>
        </>}
        {justAdded ? <span className="shrink-0 rounded-full bg-ok/15 px-2 py-0.5 text-xs font-semibold text-text-ok" data-just-added>Just added</span> : null}
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-1">
        {n.pending?.status === "RETURNED" ? <Tip tip={TIP.returned}><span><Pill tone="danger">{RETURNED_LABEL[n.pending.action]}</Pill></span></Tip>
          : n.pending ? <Tip tip={`Sent to a second person on To review. ${n.pending.action === "DELETE" ? "It is deleted when approved." : "It takes effect with the next release after approval."}`}><span><Pill tone="warn">{PENDING_WORD[n.pending.action]}</Pill></span></Tip> : null}
        {n.retired ? <Pill tone="neutral"><Archive className="size-3" aria-hidden /> Retired</Pill> : leaf && !n.pending ? (c!.id ? (c!.retired ? <Pill tone="neutral">Retired</Pill> : <StatusChip status={c!.status} text={c!.statusText} />)
          : <Tip tip="Added to the Program structure; no setup yet. Start it from its card on Immigration programs or its details."><span className="inline-flex items-center rounded-full border border-dashed border-border-strong px-2 py-0.5 text-xs font-semibold text-text-muted">Not started</span></Tip>) : null}
        {list && leaf ? <span className={cn("w-full text-xs text-text-muted", wide && "xl:hidden")} data-loc-stacked>{locWords(n.allowedLocations)}</span> : null}
      </div>
      <span className={cn("text-xs text-text-muted", list && (wide ? "max-xl:hidden" : "hidden"))} data-loc>{leaf ? <Tip tip={LOC_TIP}><span>{locWords(n.allowedLocations)}</span></Tip> : null}</span>
      {wide ? <span className="text-xs text-text-muted max-xl:hidden" data-used-by-line>{leaf ? <Tip tip={USED_TIP}><span><span className="sr-only">Used by: </span>{usedBy(c)}</span></Tip> : null}</span> : null}
      <RowAction kind={a.kind} why={why} tip={a.kind === "DELETE" ? TIP.DELETE(a.below.length, a.immediate) : a.kind === "RETIRE" ? TIP.RETIRE(a.withCombination) : a.kind === "RESTORE" ? TIP.RESTORE : TIP.WITHDRAW(n.label)}
        canEdit={canAuthor} name={n.label} tabIndex={tab} reasonId={reasonId} onEdit={onEdit} onAction={onAction} editTip={TIP.edit(leaf, canAuthor)} />
      {/* The reason a state greys the action, as visible text under the row (P-116 amended); a reader's is the tooltip. */}
      {/* A returned change (QA-59): who returned it and why, as visible text, with Send again beside the row's Withdraw. */}
      {n.pending?.status === "RETURNED" ? (
        <p className={cn("col-span-full -mt-0.5 pb-0.5 text-xs text-text-danger", list ? "pl-[4.25rem]" : ["pl-[3.25rem]", "pl-[3.75rem]", "pl-[5.5rem]", "pl-[7rem]"][level])} data-returned>
          {SAY.returnedNote(n.pending.by, n.pending.note)}
          {canAuthor && n.pending.mine ? <button type="button" onClick={onSendAgain} className="ml-2 rounded font-semibold text-text-link underline underline-offset-2 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50" data-send-again>Send again</button> : null}
        </p>) : null}
      {canAuthor && a.why ? <BlockedLine id={reasonId} text={a.why} onWhere={onEdit} className={cn("col-span-full -mt-0.5 pb-0.5", list ? "pl-[4.25rem]" : ["pl-[3.25rem]", "pl-[3.75rem]", "pl-[5.5rem]", "pl-[7rem]"][level])} /> : null}
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


function Mark({ text, words }: { text: string; words: string }) {
  if (!words) return <>{text}</>;
  const i = norm(text).indexOf(words);
  // The normalised match maps back only when the name is plain words; otherwise show it unmarked.
  if (i < 0 || norm(text) !== text.toLocaleLowerCase("en-CA").trim()) return <>{text}</>;
  return <>{text.slice(0, i)}<mark className="rounded-sm bg-warn/25 text-text">{text.slice(i, i + words.length)}</mark>{text.slice(i + words.length)}</>;
}

/** Edit (R3-2): the selected name: what uses it, rename, where cases may be opened, order, delete / retire / restore,
 *  history. A side panel beside the outline (non-modal, pinned header and footer). Adding goes through the one Add. */
function DetailPanel({ node, num, type, siblings, leaf, leaves, canAuthor, onClose, onAction }: { node: StructureNode; num: string | null; type: PathwayType; siblings: StructureNode[]; leaf: boolean; leaves: { n: StructureNode; path: string[] }[]; canAuthor: boolean; onClose: () => void; onAction: () => void }) {
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
  // The server wants every name under the parent, retired ones included (in their place); only active names move,
  // past any retired one between them (lead review, 28 Oct).
  const active = siblings.filter((s) => !s.retired);
  const move = async (dir: -1 | 1) => {
    const a = active.findIndex((s) => s.key === node.key), other = active[a + dir];
    if (a < 0 || !other) return;
    const keys = siblings.map((s) => s.key), i = keys.indexOf(node.key), j = keys.indexOf(other.key);
    [keys[i], keys[j]] = [keys[j], keys[i]];
    try { await api("/structure/reorder", { method: "POST", json: { pathwayType: type, parentKey: node.parentKey, keys } }); await refresh(); say(true, `Moved "${node.label}" ${dir < 0 ? "up" : "down"}.` ); }
    catch (e) { say(false, (e as Error).message ); }
  };
  const u = uses.data;
  const i = active.findIndex((s) => s.key === node.key);
  const no = !canAuthor ? AUTHOR_ONLY : null;
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
          <dd data-used-by>{leaf ? (node.combination?.id ? <>This combination: {node.combination.statusText} <Link className="font-semibold text-text-link underline underline-offset-2" to={`/c/${node.combination.id}`}>Open</Link></> : <>This combination: Not started (no setup yet){!node.retired && canAuthor ? <> <StartSetupButton nodeKey={node.key} label={node.label} why={node.combination?.startWhy} variant="outline" /></> : null}</>) : (
            <>
              <p>{node.combinations} combination{node.combinations === 1 ? "" : "s"}{node.live ? `, ${node.live} Live` : ""}</p>
              {/* S1-finish: each combination below it by name, its state and Open (Not started ones have no setup to open). */}
              {leaves.length ? <ul className="mt-1 space-y-1" aria-label={`Combinations under ${node.label}`}>{leaves.map(({ n: l, path }) => {
                const c = l.combination;
                return (
                  <li key={l.key} className="flex flex-wrap items-center gap-x-2">
                    <span className="min-w-0 break-words">{path.join(" › ")}</span>
                    <span className="text-xs text-text-muted">{l.retired || c?.retired ? STATE_WORDS.RETIRED : c?.statusText ?? STATE_WORDS.NOT_STARTED}</span>
                    {c?.id ? <Link className="font-semibold text-text-link underline underline-offset-2" to={`/c/${c.id}`} aria-label={`Open ${l.label}`}>Open</Link>
                      : !l.retired && canAuthor ? <StartSetupButton nodeKey={l.key} label={l.label} why={c?.startWhy} variant="outline" /> : null}
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
          <Tip tip={no ?? "Moves it among the names under the same parent. Shown on the Program structure and in Immigration programs; applies at once."}><span><Button size="sm" variant="secondary" disabled={!!no || i < 0 || i >= active.length - 1} onClick={() => void move(1)}><ArrowDown /> Move down</Button></span></Tip>
        </div>
        <WherePanel uses={u} loading={uses.isPending} error={uses.isError ? (uses.error as Error).message : null} onRetry={() => void uses.refetch()} />
        {node.pending?.status === "RETURNED" ? <Notice tone="danger" title={RETURNED_LABEL[node.pending.action]}>{SAY.returnedNote(node.pending.by, node.pending.note)}. <Link to={`/review/change/${node.pending.id}`} className="text-text-link underline underline-offset-2">See it on To review</Link></Notice>
          : u?.pending ? <Notice tone="warn" title={`${PENDING_WORD[u.pending.action]} for a second person`}>Proposed by {u.pending.by}. <Link to={`/review/change/${u.pending.id}`} className="text-text-link underline underline-offset-2">See it on To review</Link></Notice> : null}
        {u?.history.length ? (
          <section aria-label="History"><h3 className="mb-1 text-sm font-semibold">History</h3><ul className="space-y-1 text-xs text-text-muted">{u.history.map((h, k) => <li key={k}><span className="text-text">{fmtWhen(h.at)}</span> · {h.what}</li>)}</ul></section>
        ) : null}
      </div>
      {note ? <p role={note.ok ? "status" : "alert"} data-panel-note className={cn("border-t border-border px-5 py-2 text-sm", note.ok ? "text-text-ok" : "text-text-danger")}>{note.text}</p> : null}
      {/* S2 fix (founder, 27 Oct): the lifecycle buttons sit in the footer with Save, so all of them always show. */}
      <div className="flex flex-wrap items-center gap-2 border-t border-border px-5 py-3" data-panel-footer>
        {/* The row's one action, the same guard and words; it opens the same confirm (ImpactPanel). */}
        {u ? <div className="flex min-w-0 flex-col items-start gap-0.5"><Button size="sm" variant="outline" className={node.action.kind === "DELETE" ? "text-text-danger" : undefined} disabled={!!no || !!node.action.why} aria-describedby={node.action.why ? "panel-why" : undefined} onClick={onAction} data-panel-action={node.action.kind}>{ACTION_WORDS[node.action.kind]}</Button>
          {canAuthor && node.action.why ? <BlockedLine id="panel-why" text={node.action.why} className="max-w-[16rem]" /> : null}</div> : null}
        <span className="flex-1" />
        <Button variant="ghost" onClick={onClose}>Close</Button>
        <Tip tip={no ?? (node.retired ? "It is retired: restore it first." : changed ? "Saves the name and where cases may be opened." : "Change the name or where cases may be opened first.")}><span><Button onClick={() => void save("new")} disabled={!!no || !changed || node.retired || !label.trim()} busy={busy}>Save</Button></span></Tip>
      </div>
    </aside>
  );
}
