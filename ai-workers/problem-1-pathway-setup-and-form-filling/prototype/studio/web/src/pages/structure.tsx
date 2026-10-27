// Program structure (W1-03; visual system and round 2, P-127, board screens/W1-visual-system/design/draft-structure-v2.html
// layout A): the one place names enter. Pathway cards choose what shows (the one last chosen, or All pathways); each
// Program is a section with one line per combination (a category without sub-categories, or each sub-category);
// level marks and colours from the visual system. Every add is the one "Add to Program structure" pop-up
// (components/add-to-structure.tsx, POST /structure/path); the inline add rows are gone. The details panel is
// unchanged: trail, what uses it, where cases may be opened, rename, order, remove / retire / restore (each approved by
// a second person), history. Every write goes to /api/structure (contracts/structure.ts); the server decides.
import * as React from "react";
import { Link, useSearchParams } from "react-router-dom";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ChevronDown, ChevronLeft, ChevronRight, Info, MoreHorizontal, Plus, Search, X } from "lucide-react";
import type { Level, LifecycleAction, PathwayType, StructureNode, UsesView } from "../../../contracts/structure";
import { api, ApiError, useActorId, useApi, useSessionView } from "@/lib/api";
import { Button, Input, Notice, Pill, Textarea } from "@/components/ui/controls";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtWhen, StatusChip, Tip, TipProvider } from "@/components/status";
import { PathwayCards } from "@/components/pathway-cards";
import { AddToStructure, LocationPicker, LOC_TIP, locKey, type AddPrefill } from "@/components/add-to-structure";
import { LevelMark, pathwayAccent } from "@/components/levels";
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
const LEVEL_TIP: Record<Level, string> = {
  pathway: "The outcome the application leads to, such as temporary or permanent residence.",
  program: "A group of applications under a pathway, such as Visitors or Study permits.",
  category: "One kind of application. A category without sub-categories is a combination.",
  subCategory: "A variant IRCC files as a different application. Every sub-category is a combination.",
};
const locWords = (l: string[]) => (l.length === 2 ? "Inside or outside Canada" : l[0] === "inside_canada" ? "Inside Canada" : l[0] === "outside_canada" ? "Outside Canada" : "—");
const NMC_TIP = "Only the spelling check ran; a reviewer compares the meaning by eye. The AI meaning check runs when paid runs are on.";
const AUTHOR_ONLY = "Only a configuration author adds, renames, orders or removes names. You can read everything.";
const NEED_YOU = "Combinations waiting for a person: something to review, something missing or something blocking release.";
const PENDING_WORD: Record<LifecycleAction, string> = { DELETE: "Removal waiting", RETIRE: "Retire waiting", RESTORE: "Restore waiting" };
const norm = (s: string) => s.normalize("NFKC").toLocaleLowerCase("en-CA").replace(/[^\p{L}\p{N}]+/gu, " ").trim();

const LAST_PATHWAY = (actor: string | null) => `xr-structure-pathway:${actor ?? "anyone"}`;
type Line = { leaf: StructureNode; category: StructureNode; sub: StructureNode | null };

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
  const list = useApi<ListResp>(["structure", type], `/structure?pathwayType=${type}`);
  const other = useApi<ListResp>(["structure", type === "INDIVIDUAL" ? "CORPORATE" : "INDIVIDUAL"], q.trim() ? `/structure?pathwayType=${type === "INDIVIDUAL" ? "CORPORATE" : "INDIVIDUAL"}` : null);
  const [closed, setClosed] = React.useState<Set<string>>(new Set());
  const [adding, setAdding] = React.useState<AddPrefill | null>(sp.get("add") === "1" ? {} : null);
  const [justAdded, setJustAdded] = React.useState<string | null>(null);
  const [note, setNote] = React.useState<{ ok: boolean; text: string } | null>(null);
  const set = (patch: Record<string, string | null>) => setSp((p) => { const n = new URLSearchParams(p); for (const [k, v] of Object.entries(patch)) v ? n.set(k, v) : n.delete(k); return n; }, { replace: true });

  const nodes = list.data?.nodes ?? [];
  const byKey = React.useMemo(() => new Map(nodes.map((n) => [n.key, n])), [nodes]);
  const kids = React.useMemo(() => { const m = new Map<string | null, StructureNode[]>(); for (const n of nodes) m.set(n.parentKey, [...(m.get(n.parentKey) ?? []), n]); return m; }, [nodes]);
  const words = norm(q);
  const pathways = (kids.get(null) ?? []).filter((n) => n.level === "pathway");
  // P-127: the page opens on the Pathway the person last chose (the first one on a first visit); "All pathways" shows every band.
  const saved = (() => { try { return localStorage.getItem(LAST_PATHWAY(actor)); } catch { return null; } })();
  const pParam = sp.get("p");
  const want = pParam ?? saved;
  const chosen = want === "all" ? null : want && pathways.some((x) => x.key === want) ? want : pathways[0]?.key ?? null;
  const choose = (key: string | null) => { try { localStorage.setItem(LAST_PATHWAY(actor), key ?? "all"); } catch { /* private window */ } set({ p: key ?? "all", node: null }); };

  /** One line per combination (Q3): a category without sub-categories, or each of its sub-categories. */
  const linesOf = (program: StructureNode): Line[] => (kids.get(program.key) ?? []).flatMap((c): Line[] => {
    const subs = kids.get(c.key) ?? [];
    return subs.length ? subs.map((s) => ({ leaf: s, category: c, sub: s })) : [{ leaf: c, category: c, sub: null }];
  });
  const hit = (s: string) => !words || norm(s).includes(words);
  /** Find (every Pathway of the tab): a Pathway or Program name match keeps everything under it; else the lines that match. */
  const shownLines = (pw: StructureNode, program: StructureNode) => (hit(pw.label) || hit(program.label) ? linesOf(program) : linesOf(program).filter((l) => hit(l.category.label) || (l.sub && hit(l.sub.label))));
  const programsOf = (pw: StructureNode) => (kids.get(pw.key) ?? []).filter((pr) => !words || hit(pw.label) || hit(pr.label) || shownLines(pw, pr).length);
  const matchCount = (pw: StructureNode) => (kids.get(pw.key) ?? []).reduce((s, pr) => s + shownLines(pw, pr).length, 0);
  const bands = words ? pathways.filter((pw) => hit(pw.label) || programsOf(pw).length) : chosen ? pathways.filter((x) => x.key === chosen) : pathways;

  const live = nodes.filter((n) => !n.retired);
  const count = (l: Level) => live.filter((n) => n.level === l).length;
  const combos = live.filter((n) => n.level === "pathway").reduce((s, n) => s + n.combinations, 0);
  const many = (n: number, one: string, more: string) => `${n} ${n === 1 ? one : more}`;
  const otherMatches = words && other.data ? other.data.nodes.filter((n) => norm(n.label).includes(words)).length : 0;
  const selectedNode = selected ? byKey.get(selected) : undefined;
  const below = (k: string): StructureNode[] => (kids.get(k) ?? []).flatMap((c) => [c, ...below(c.key)]);
  const isLeaf = (n: StructureNode) => n.level === "subCategory" || (n.level === "category" && !(kids.get(n.key)?.length));
  const leavesUnder = (k: string) => below(k).filter((n) => isLeaf(n)).map((n) => {
    const path: string[] = [];
    for (let x: StructureNode | undefined = n; x && x.key !== k; x = x.parentKey ? byKey.get(x.parentKey) : undefined) path.unshift(x.label);
    return { n, path };
  });
  const pathwayOf = (k: string) => { let x = byKey.get(k); while (x?.parentKey) x = byKey.get(x.parentKey); return x; };
  const detail = (pw: StructureNode) => {
    const ls = leavesUnder(pw.key).map((x) => x.n).filter((n) => !n.retired);
    const liveN = ls.filter((n) => n.combination?.status === "READY" && n.combination.id).length, notStarted = ls.filter((n) => !n.combination?.id).length;
    const notReady = ls.filter((n) => n.combination?.id && n.combination.status === "NOT_READY").length, inSetup = ls.length - liveN - notStarted - notReady;
    return [[liveN, "Live"], [notReady, "Not ready"], [inSetup, "In setup"], [notStarted, "Not started"]].filter(([n]) => n).map(([n, w]) => `${n} ${w}`).join(" · ") || `${many((kids.get(pw.key) ?? []).length, "program", "programs")}`;
  };

  // After Add: open the Pathway it went into, its section, and show the line, tagged "Just added" (no toast, AD-7).
  React.useEffect(() => {
    if (!justAdded || !byKey.get(justAdded)) return;
    const pw = pathwayOf(justAdded);
    if (pw && !words && chosen && chosen !== pw.key) { choose(pw.key); return; }
    requestAnimationFrame(() => { const el = document.querySelector<HTMLElement>(`[data-key="${CSS.escape(justAdded)}"]`); el?.scrollIntoView({ block: "center" }); el?.querySelector<HTMLElement>("[data-open]")?.focus({ preventScroll: true }); });
  }, [justAdded, byKey, chosen]);
  const openAdd = (prefill: AddPrefill) => { if (canAuthor) setAdding(prefill); };
  const closeAdd = () => { setAdding(null); if (sp.get("add")) set({ add: null }); };

  // P-116 (Move up / down, at once with an audit line); the order here is the order on Immigration programs (QA-49).
  const move = async (n: StructureNode, by: -1 | 1) => {
    const sib = (kids.get(n.parentKey) ?? []).filter((x) => n.parentKey !== null || x.level === "pathway");
    const i = sib.findIndex((x) => x.key === n.key), j = i + by;
    if (i < 0 || j < 0 || j >= sib.length) return;
    const keys = sib.map((x) => x.key); [keys[i], keys[j]] = [keys[j], keys[i]];
    try { await api("/structure/reorder", { method: "POST", json: { pathwayType: type, parentKey: n.parentKey, keys } }); setNote({ ok: true, text: `Moved "${n.label}" ${by < 0 ? "up" : "down"}. Immigration programs follows this order.` }); await Promise.all([qc.invalidateQueries({ queryKey: ["structure"] }), qc.invalidateQueries({ queryKey: ["catalogue"] })]); }
    catch (e) { setNote({ ok: false, text: (e as Error).message }); }
  };
  const canMove = (n: StructureNode, by: -1 | 1) => { const sib = (kids.get(n.parentKey) ?? []).filter((x) => n.parentKey !== null || x.level === "pathway"); const i = sib.findIndex((x) => x.key === n.key); return canAuthor && i + by >= 0 && i + by < sib.length; };
  // Lines: one tab stop each; ↑ / ↓ move between them, Enter opens details (P-127 keyboard: no tree model any more).
  const onLineKey = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const all = [...document.querySelectorAll<HTMLButtonElement>("[data-line] [data-open]")];
    const i = all.indexOf(e.currentTarget); all[i + (e.key === "ArrowDown" ? 1 : -1)]?.focus(); e.preventDefault();
  };

  return (
    <TipProvider>
      {fromPrograms ? <Link to="/" className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-text-link hover:underline" data-back-programs><ChevronLeft className="size-4" aria-hidden />Back to Immigration programs</Link> : null}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-semibold">Program structure</h1>
        <Tip focusable tip="Every pathway, program, category and sub-category your firm offers. Every category without sub-categories, and every sub-category, is a combination."><span className="text-text-muted outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"><Info className="size-4" aria-label="About the Program structure" /></span></Tip>
        <span className="flex-1" />
        <Tip tip={canAuthor ? "Add a pathway, program, category or sub-category: one pop-up, checked as you type." : AUTHOR_ONLY}><span><Button disabled={!canAuthor} onClick={() => openAdd({ pathwayKey: chosen ?? undefined })} data-add-open><Plus /> Add</Button></span></Tip>
        <p className="w-full text-sm text-text-muted">Where every combination sits: Pathway › Program › Category › Sub-category. The order here is the order on Immigration programs.</p>
      </div>
      <div className={cn("grid gap-6", selectedNode && "xl:grid-cols-[minmax(0,1fr)_420px]")}>
        <section aria-label={`${typeLabel} program structure`} className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div role="group" aria-label="Pathway type" className="inline-flex w-fit items-center gap-0.5 rounded-xl border border-border bg-surface p-0.5">
              {TYPES.map((t) => (
                <Tip key={t.value} tip={t.tip}>
                  <button type="button" aria-pressed={type === t.value} onClick={() => { set({ t: t.value === "INDIVIDUAL" ? null : t.value, node: null, p: null }); setClosed(new Set()); }}
                    className={cn("inline-flex h-8 items-center rounded-lg px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50", type === t.value ? "bg-primary font-semibold text-primary-foreground shadow-sm" : "text-text-muted hover:text-text")}>{t.label}</button>
                </Tip>
              ))}
            </div>
            <label className="relative min-w-[200px] flex-1">
              <span className="sr-only">Find a name</span>
              <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-text-muted" aria-hidden />
              <Tip tip="Find a name in every pathway of this tab. A pathway or program that matches keeps everything under it; the cards count the matches."><Input value={q} onChange={(e) => { setQ(e.target.value); set({ q: e.target.value || null }); }} placeholder="Find a name" className="pl-8" /></Tip>
              {q ? <button type="button" aria-label="Clear the search" className="absolute right-1 top-1.5 flex size-6 items-center justify-center rounded text-text-muted hover:bg-text/5" onClick={() => { setQ(""); set({ q: null }); }}><X className="size-4" /></button> : null}
            </label>
            <Tip tip="Open every program section."><Button size="sm" variant="secondary" onClick={() => setClosed(new Set())}>Expand all</Button></Tip>
            <Tip tip="Show the program titles only; open one with its arrow."><Button size="sm" variant="secondary" onClick={() => setClosed(new Set(nodes.filter((n) => n.level === "program").map((n) => n.key)))}>Collapse all</Button></Tip>
          </div>
          {list.data && !list.data.empty && pathways.length ? (
            <div className="mb-3"><PathwayCards typeLabel={typeLabel} pathways={pathways.map((p) => ({ ...p, detail: detail(p), matches: words ? matchCount(p) : undefined }))} open={words ? null : chosen} onOpen={choose}
              allTip={`Shows every ${typeLabel} pathway, one band each.`} cardTip={(l) => `Shows ${l}'s programs and combinations.`}
              add={{ enabled: canAuthor, tip: canAuthor ? `Add a pathway to ${typeLabel}, such as Citizenship: opens the Add pop-up.` : AUTHOR_ONLY, onAdd: () => openAdd({ focus: "pathway" }) }} /></div>
          ) : null}
          {list.data && !list.data.empty ? (
            <p className="mb-2 text-sm text-text-muted" data-stats>
              {many(count("pathway"), "pathway", "pathways")} · {many(count("program"), "program", "programs")} · {many(count("category"), "category", "categories")} · {many(count("subCategory"), "sub-category", "sub-categories")} · <b className="font-semibold text-text">{combos}</b> {combos === 1 ? "combination" : "combinations"}
            </p>
          ) : null}
          {note ? <p role={note.ok ? "status" : "alert"} className={cn("mb-2 text-sm", note.ok ? "text-text-ok" : "text-text-danger")} data-page-note>{note.text}</p> : null}
          {list.isError ? (
            <ErrorState title="The program structure could not load" description={`${(list.error as Error).message} Your work is safe.`} action={<Button size="sm" variant="secondary" onClick={() => void list.refetch()}>Retry</Button>} />
          ) : list.isPending || !known ? (
            <div className="space-y-2 rounded-xl border border-border bg-surface-raised p-3" aria-busy="true"><span className="sr-only" role="status">Loading the program structure</span>{[0, 1, 1, 1, 0, 1, 1].map((d, i) => <Skeleton key={i} className={d ? "h-9" : "h-7 w-1/3"} />)}</div>
          ) : list.data.empty ? (
            <EmptyState title="No structure yet" description={`${typeLabel} has no names. After Reset both tabs are empty. Add your first pathway, for example Temporary residence.`}
              action={canAuthor ? <Button onClick={() => openAdd({ focus: "pathway" })}><Plus /> Add pathway</Button> : <p className="text-sm text-text-muted">{AUTHOR_ONLY}</p>} />
          ) : words && !bands.length ? (
            <EmptyState title={`No name matches "${q.trim()}" in ${typeLabel}`} description={otherMatches ? undefined : "Check the spelling, or clear the search."}
              action={otherMatches ? <p className="text-sm">{otherMatches} {otherMatches === 1 ? "match" : "matches"} in {TYPES.find((t) => t.value !== type)!.label}. <button type="button" className="font-semibold text-text-link underline underline-offset-2" onClick={() => set({ t: type === "INDIVIDUAL" ? "CORPORATE" : null, node: null })}>Show {otherMatches === 1 ? "it" : "them"}</button></p> : <Button size="sm" variant="secondary" onClick={() => { setQ(""); set({ q: null }); }}>Clear the search</Button>} />
          ) : (
            <div className="space-y-5" data-structure-a>
              {bands.map((pw) => {
                const progs = words ? programsOf(pw) : kids.get(pw.key) ?? [];
                const idx = pathways.findIndex((x) => x.key === pw.key);
                return (
                  <section key={pw.key} aria-label={`${pw.label} pathway`} data-band={pw.key} data-key={pw.key}>
                    <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-lv1-b bg-lv1-t py-1.5 pl-3 pr-2" style={{ borderLeft: `4px solid ${pathwayAccent(idx)}` }}>
                      <button type="button" onClick={() => set({ node: pw.key })} className="inline-flex items-center gap-1.5 rounded text-base font-semibold text-lv1 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50" data-band-title><LevelMark level="pathway" tip={false} /><Mark text={pw.label} words={words} /></button>
                      <span className="text-sm text-text-muted">{many(pw.combinations, "combination", "combinations")}</span>
                      {pw.needs ? <Tip tip={NEED_YOU}><span className="rounded-full bg-warn/15 px-1.5 text-xs font-semibold text-text-warn">{pw.needs} need{pw.needs === 1 ? "s" : ""} you</span></Tip> : null}
                      {pw.retired ? <Pill tone="neutral">Retired</Pill> : null}
                      <span className="flex-1" />
                      <Tip tip={canAuthor ? `Add a program under ${pw.label}.` : AUTHOR_ONLY}><span><Button size="sm" variant="ghost" disabled={!canAuthor || pw.retired} onClick={() => openAdd({ pathwayKey: pw.key, focus: "program" })} data-add-program><Plus /> Add program</Button></span></Tip>
                    </div>
                    {!progs.length ? <p className="rounded-xl border border-dashed border-border-strong px-4 py-3 text-sm text-text-muted" data-empty-pathway>No programs yet.{canAuthor ? <> <button type="button" className="font-semibold text-text-link underline underline-offset-2" onClick={() => openAdd({ pathwayKey: pw.key, focus: "program" })}>+ Add program</button></> : null}</p> : (
                      <div className="space-y-3">
                        {progs.map((pr) => {
                          const lines = words ? shownLines(pw, pr) : linesOf(pr);
                          const shut = closed.has(pr.key) && !words;
                          return (
                            <section key={pr.key} aria-label={`${pr.label} program`} data-section={pr.key} data-key={pr.key} className={cn("rounded-xl border border-border bg-surface-raised", selected === pr.key && "ring-2 ring-primary/30")}>
                              <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
                                <button type="button" aria-expanded={!shut} aria-label={`${shut ? "Open" : "Close"} ${pr.label}`} onClick={() => setClosed((c) => { const n = new Set(c); if (n.has(pr.key)) n.delete(pr.key); else n.add(pr.key); return n; })} className="flex size-6 items-center justify-center rounded text-text-muted outline-none hover:bg-text/5 focus-visible:ring-[3px] focus-visible:ring-ring/50">{shut ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}</button>
                                <button type="button" onClick={() => set({ node: pr.key })} className="inline-flex items-center gap-1.5 rounded text-sm font-semibold text-lv2 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50" data-section-title><LevelMark level="program" tip={false} /><Mark text={pr.label} words={words} /></button>
                                <span className="text-xs text-text-muted">{many(pr.combinations, "combination", "combinations")}</span>
                                {pr.needs ? <Tip tip={NEED_YOU}><span className="rounded-full bg-warn/15 px-1.5 text-xs font-semibold text-text-warn">{pr.needs} need{pr.needs === 1 ? "s" : ""} you</span></Tip> : null}
                                {pr.retired ? <Pill tone="neutral">Retired</Pill> : null}
                                {pr.pending ? <Tip tip="A change to this name waits for a second person on To review."><Pill tone="warn">{PENDING_WORD[pr.pending.action]}</Pill></Tip> : null}
                                <span className="flex-1" />
                                <Tip tip={canAuthor ? `Add a category under ${pr.label}.` : AUTHOR_ONLY}><span><Button size="sm" variant="ghost" disabled={!canAuthor || pr.retired} onClick={() => openAdd({ pathwayKey: pw.key, programKey: pr.key, focus: "category" })} data-add-category><Plus /> Add category</Button></span></Tip>
                                <RowMenu label={pr.label} items={[{ word: "Open details", run: () => set({ node: pr.key }) }, { word: "Move up", run: () => void move(pr, -1), off: !canMove(pr, -1) }, { word: "Move down", run: () => void move(pr, 1), off: !canMove(pr, 1) }]} />
                              </div>
                              {shut ? null : !lines.length ? <p className="px-4 py-3 text-sm text-text-muted" data-empty-program>No categories yet.{canAuthor ? <> <button type="button" className="font-semibold text-text-link underline underline-offset-2" onClick={() => openAdd({ pathwayKey: pw.key, programKey: pr.key, focus: "category" })}>+ Add category</button></> : null}</p> : (
                                <ul aria-label={`${pr.label} combinations`} className="divide-y divide-border">
                                  {lines.map((l) => <LineRow key={l.leaf.key} line={l} words={words} selected={selected === l.leaf.key || selected === l.category.key} justAdded={justAdded === l.leaf.key} canAuthor={canAuthor}
                                    onOpen={(k) => set({ node: k })} onKey={onLineKey} onMove={(n, by) => void move(n, by)} canMove={canMove}
                                    onAddSub={() => openAdd({ pathwayKey: pw.key, programKey: pr.key, categoryKey: l.category.key, focus: "subCategory" })} />)}
                                </ul>)}
                            </section>
                          );
                        })}
                      </div>)}
                  </section>
                );
              })}
            </div>
          )}
          {list.data && !list.data.empty ? <p className="mt-2 text-xs text-text-muted">Names and locations are Sample until the immigration expert confirms. {list.data.meaningCheck.why}</p> : null}
        </section>
        {selectedNode ? <DetailPanel key={selectedNode.key} node={selectedNode} type={type} siblings={kids.get(selectedNode.parentKey)?.filter((s) => selectedNode.parentKey !== null || s.level === "pathway") ?? []} leaf={isLeaf(selectedNode)} leaves={leavesUnder(selectedNode.key)} canAuthor={canAuthor}
          onClose={() => set({ node: null })} onAddChild={() => { const pr = selectedNode.parentKey ? byKey.get(selectedNode.parentKey) : undefined; openAdd({ pathwayKey: pr?.parentKey ?? undefined, programKey: pr?.key, categoryKey: selectedNode.key, focus: "subCategory" }); }} /> : null}
      </div>
      <AddToStructure open={!!adding} onClose={closeAdd} type={type} prefill={adding ?? undefined}
        onAdded={(r, again) => { setJustAdded(r.leaf.key); setNote({ ok: true, text: `Added ${r.created.map((c) => `"${c.label}"`).join(", ")}${r.combination ? ": listed on Immigration programs as Not started; no setup started." : "."}` }); if (!again) closeAdd(); }}
        onShow={(k) => { closeAdd(); set({ node: k }); setJustAdded(k); }} />
    </TipProvider>
  );
}

/** A ⋯ menu of row actions (P-127): each disabled one says why in its tooltip-free form (the panel has the reasons). */
function RowMenu({ label, items }: { label: string; items: { word: string; run: () => void; off?: boolean }[] }) {
  return (
    <DropdownMenu.Root>
      <Tip tip={`Actions for ${label}`}>
        <DropdownMenu.Trigger asChild>
          <button type="button" aria-label={`Actions for ${label}`} className="flex size-7 items-center justify-center rounded-md text-text-muted outline-none hover:bg-text/5 focus-visible:ring-[3px] focus-visible:ring-ring/50" data-row-menu><MoreHorizontal className="size-4" aria-hidden /></button>
        </DropdownMenu.Trigger>
      </Tip>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={4} className="z-50 min-w-[200px] rounded-lg border border-border bg-surface-raised p-1 text-sm shadow-lg">
          {items.map((x) => <DropdownMenu.Item key={x.word} disabled={x.off} onSelect={x.run} className="cursor-pointer rounded-md px-2 py-1.5 outline-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[highlighted]:bg-text/5">{x.word}</DropdownMenu.Item>)}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/** One line per combination (P-127 Q3): ◆ Category › ◇ Sub-category (the identity in navy), its state, where cases may be
 *  opened, and a ⋯ menu. Clicking it opens the same details panel as before. */
function LineRow({ line, words, selected, justAdded, canAuthor, onOpen, onKey, onMove, canMove, onAddSub }: {
  line: Line; words: string; selected: boolean; justAdded: boolean; canAuthor: boolean; onOpen: (k: string) => void; onKey: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
  onMove: (n: StructureNode, by: -1 | 1) => void; canMove: (n: StructureNode, by: -1 | 1) => boolean; onAddSub: () => void;
}) {
  const n = line.leaf, c = n.combination;
  const items = [
    { word: "Open details", run: () => onOpen(n.key) },
    ...(line.sub ? [{ word: `${line.category.label}: details`, run: () => onOpen(line.category.key) }] : []),
    { word: line.sub ? "Add another sub-category" : "Add sub-category", run: onAddSub, off: !canAuthor || line.category.hasSetup || line.category.retired },
    { word: "Move up", run: () => onMove(n, -1), off: !canMove(n, -1) },
    { word: "Move down", run: () => onMove(n, 1), off: !canMove(n, 1) },
  ];
  return (
    <li data-line={n.key} data-key={n.key} className={cn("flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 px-3 py-1.5", selected && "bg-primary/10 shadow-[inset_3px_0_0_var(--color-primary)]", n.retired && "text-text-muted")}>
      <button type="button" data-open onClick={() => onOpen(n.key)} onKeyDown={onKey} className="flex min-w-0 flex-1 items-center gap-1.5 rounded text-left text-sm outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50">
        <LevelMark level="category" tip={false} />
        <span className="min-w-0 [overflow-wrap:anywhere]">
          <span className="font-semibold text-lv3"><Mark text={line.category.label} words={words} /></span>
          {line.sub ? <><span className="text-text-muted" aria-hidden> › </span><LevelMark level="subCategory" tip={false} className="mx-0.5" /><span className="font-medium text-lv3"><Mark text={line.sub.label} words={words} /></span></> : null}
        </span>
      </button>
      {justAdded ? <span className="rounded-full bg-ok/15 px-2 py-0.5 text-xs font-semibold text-text-ok" data-just-added>Just added</span> : null}
      {n.retired ? <Tip tip="Retired by a release: hidden from pickers and AI; earlier releases and open cases keep it."><Pill tone="neutral">Retired</Pill></Tip> : null}
      {n.pending ? <Tip tip="A change to this name waits for a second person on To review."><Pill tone="warn">{PENDING_WORD[n.pending.action]}</Pill></Tip> : null}
      {c && !n.retired ? (c.id ? (c.retired ? <Pill tone="neutral">Retired</Pill> : <StatusChip status={c.status} text={c.statusText} />)
        : <Tip tip="Added to the Program structure; no setup yet. Start it from its card on Immigration programs or its details."><span className="inline-flex items-center gap-1 rounded-full border border-dashed border-border-strong px-2 py-0.5 text-xs font-semibold text-text-muted">Not started</span></Tip>) : null}
      <Tip tip={LOC_TIP}><span className="w-40 shrink-0 text-xs text-text-muted" data-loc>{locWords(n.allowedLocations)}</span></Tip>
      <RowMenu label={line.sub ? `${line.category.label} › ${line.sub.label}` : line.category.label} items={items} />
    </li>
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
          <Tip tip={no ?? "Moves it among the names under the same parent. Shown on the Program structure and in Immigration programs; applies at once."}><span><Button size="sm" variant="secondary" disabled={!!no || i <= 0} onClick={() => void move(-1)}><ArrowUp /> Move up</Button></span></Tip>
          <Tip tip={no ?? "Moves it among the names under the same parent. Shown on the Program structure and in Immigration programs; applies at once."}><span><Button size="sm" variant="secondary" disabled={!!no || i < 0 || i >= siblings.length - 1} onClick={() => void move(1)}><ArrowDown /> Move down</Button></span></Tip>
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
