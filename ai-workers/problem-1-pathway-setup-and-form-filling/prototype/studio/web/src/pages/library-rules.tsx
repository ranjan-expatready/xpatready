import * as React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { useApi } from "@/lib/api";
import { Input, Pill, Select, Table } from "@/components/ui/controls";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { OriginPill } from "@/pages/configuration";
import { fieldName } from "@/pages/library";

/** C3.14 (Screen 04 views 9 and 10, RULES-MODEL §7, P-37): the Checks list and Shared library › Rules, read-only.
 *  Nothing is authored here (P-28): a rule or check is changed where it lives, on its combination's tab. */
type Combo = { id: string; key: string; label: string };
type Read = { key: string; name: string | null };
type PerCombination = { combination: Combo; serious: boolean; message: string | null; source: string | null; unsourced: boolean; sample: boolean; origin: string; status: string };
type CheckRow = { key: string; kind: string; kind_word: string; group: string; group_word: string; about: string | null; reads: Read[]; used_in: Combo[]; differs: boolean; per_combination: PerCombination[]; message: string | null; serious: boolean | null; source: string | null; unsourced: boolean | null; sample: boolean; origin: string | null; status: string };
type RuleRow = { id: string; kind: string; kind_word: string; when: string | null; then: string; lives_on: { combination: Combo | null; section: string | null; tab: string; tab_word: string }; used_in: Combo[]; reads: Read[]; source: string | null; unsourced: boolean; origin: string; status: string };

const readWords = (r: Read[]) => !r.length ? <span className="text-text-muted">no field</span> : <span title={r.map((x) => x.name ?? fieldName(x.key)).join(", ")}>{r.slice(0, 3).map((x) => x.name ?? fieldName(x.key)).join(", ")}{r.length > 3 ? ` and ${r.length - 3} more` : ""}</span>;
/** Review c314 m4: each link is a 24 px target (WCAG 2.5.8), one per line. */
const usedLinks = (u: Combo[], tab: string) => !u.length ? <span className="text-text-muted">none</span> : <span className="flex flex-col">{u.map((c) => <Link key={c.id} className="inline-flex min-h-6 items-center text-text-link hover:underline" to={`/c/${c.id}/${tab}`}>{c.label}</Link>)}</span>;
/** Review c314 m3: checks warn (decision 7, RULES-MODEL §7); a check stored as blocking is said to be a serious warning, never "stops". */
const effectWord = (serious: boolean) => (serious ? "Serious warning" : "Warns");
const ORIGINS: [string, string][] = [["AI_PROPOSAL", "AI-proposed"], ["HUMAN", "Edited by a person"], ["IMPORTED_RELEASE", "From the sample setup"]];
const SourceLine = ({ r }: { r: { source: string | null; unsourced: boolean } }) => r.unsourced
  ? <p data-source className="mt-1 text-[11px] text-text-warn">No source recorded</p>
  : <p data-source className="mt-1 line-clamp-2 text-[11px] text-text-muted" title={r.source ?? ""}>Source: "{r.source}"</p>;

/** The filter bar both lists share: search, kind chips with counts, and the combination; all kept in the address. */
function useFilters<T extends { kind: string; kind_word: string; used_in: Combo[]; origins: string[] }>(rows: T[] | undefined, text: (r: T) => string, always: [string, string, string?][] = []) {
  const [params, setParams] = useSearchParams();
  const kind = params.get("kind") ?? "", combination = params.get("combination") ?? "", origin = params.get("origin") ?? "";
  const set = (k: string, v: string) => setParams((p) => { const n = new URLSearchParams(p); if (v) n.set(k, v); else n.delete(k); return n; }, { replace: true });
  // Review c314 m10: the search box keeps its own state (no keystroke lost to the address round trip); the address follows.
  const [q, setQ] = React.useState(params.get("q") ?? "");
  React.useEffect(() => { if ((params.get("q") ?? "") !== q) set("q", q); }, [q]); // eslint-disable-line react-hooks/exhaustive-deps -- the address follows the box only
  const inCombo = (rows ?? []).filter((r) => (!combination || r.used_in.some((c) => c.key === combination)) && (!origin || r.origins.includes(origin)));
  const kinds = [...new Map([...always.map(([k, w]) => [k, w] as [string, string]), ...inCombo.map((r) => [r.kind, r.kind_word] as [string, string])]).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const note = new Map(always.filter((a) => a[2]).map(([k, , n]) => [k, n!]));
  const shown = inCombo.filter((r) => (!kind || r.kind === kind) && (!q || text(r).toLowerCase().includes(q.toLowerCase())));
  const combos = [...new Map((rows ?? []).flatMap((r) => r.used_in).map((c) => [c.key, c])).values()].sort((a, b) => a.label.localeCompare(b.label));
  const bar = (noun: string) => (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-96"><Search className="absolute left-2.5 top-2.5 size-4 text-text-muted" /><Input className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${noun}s, the fields they read or their source`} aria-label={`Search ${noun}s`} /></div>
        <Select className="w-64" value={combination} onChange={(e) => set("combination", e.target.value)} aria-label="Combination"><option value="">All combinations</option>{combos.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</Select>
        <Select className="w-52" value={origin} onChange={(e) => set("origin", e.target.value)} aria-label="Origin"><option value="">Any origin</option>{ORIGINS.map(([k, w]) => <option key={k} value={k}>{w}</option>)}</Select>
        <span className="text-xs text-text-muted">{shown.length} of {rows?.length ?? 0}</span>
      </div>
      <div role="group" aria-label="Kind" className="flex flex-wrap gap-1.5">
        {[["", "All", inCombo.length] as const, ...kinds.map(([k, w]) => [k, w, inCombo.filter((r) => r.kind === k).length] as const)].map(([k, w, n]) => (
          <button key={k || "all"} type="button" aria-pressed={kind === k} onClick={() => set("kind", k)} className={`rounded-full border px-2.5 py-1 text-xs ${kind === k ? "border-primary bg-primary/10 font-medium text-text-link" : "border-border text-text-muted hover:text-text"}`}>{w} <span className="tabular-nums">{n}</span></button>
        ))}
      </div>
    </div>
  );
  return { shown, bar, note: kind ? note.get(kind) ?? null : null, filtered: !!(q || kind || combination || origin) };
}

/** Kinds RULES-MODEL §7 names that no check carries yet (challenge M8): shown with a count of 0 and why. */
const CHECK_KINDS_ALWAYS: [string, string, string][] = [
  ["field_validation", "Field validation", "Field validation is set on each field (its type and the form's limits), not as a check here."],
  ["ai_review", "AI review", "No AI review objectives yet: not built (no screen creates them)."],
];

export function ChecksPage() {
  const list = useApi<CheckRow[]>(["library-checks"], "/library/checks");
  const rows = React.useMemo(() => list.data?.map((r) => ({ ...r, origins: [...new Set(r.per_combination.map((x) => x.origin))] })), [list.data]);
  const f = useFilters(rows, (r) => [r.key, r.kind_word, r.group_word, r.about, ...r.per_combination.flatMap((x) => [x.message, x.source]), ...r.reads.map((x) => x.name ?? fieldName(x.key))].join(" "), CHECK_KINDS_ALWAYS);
  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div><h1 className="text-xl font-semibold">Checks</h1><p className="mt-1 text-sm text-text-muted">Every check across combinations: what it looks at, the fields it reads, where it is used and its source. Checks warn; only the form's own Validate stops a form. Read-only: checks are proposed on To review and change on their combination's Questionnaires tab.</p><p className="mt-1 text-xs text-text-muted"><span className="font-medium">When it runs:</span> not built (no check records its stage yet).</p></div>
      {list.isLoading ? <Spinner label="Loading checks" /> : !list.data?.length ? <EmptyState title="No checks yet" description="AI drafts checks from form limits, guides and checklists when a combination's sources are read; they appear on To review first." /> : <>
        {f.bar("check")}
        {f.note ? <p data-kind-note className="text-sm text-text-muted">{f.note}</p> : null}
        {!f.shown.length ? (f.note ? null : <EmptyState title="No check matches" description="Clear the search, or choose All for the kind, the combination and the origin." />) : (
          <Table head={["Check", "Kind", "Reads", "Effect and source by combination", "Status"]}>
            {f.shown.map((r) => <tr key={r.key} data-check={r.key}><td className="max-w-md"><p className="font-medium">{r.about ?? r.key}</p>{r.differs ? <p className="text-xs font-medium text-text-warn">Differs by combination: see each one</p> : <><p className="text-xs">{r.message}</p><SourceLine r={{ source: r.source, unsourced: !!r.unsourced }} /></>}</td><td className="text-xs">{r.kind_word}<p className="text-[11px] text-text-muted">{r.group_word}</p></td><td className="max-w-40 text-xs">{readWords(r.reads)}</td>
              <td className="max-w-xs text-xs"><ul className="space-y-1.5">{r.per_combination.map((x) => <li key={x.combination.id} data-per-combination><Link className="inline-flex min-h-6 items-center text-text-link hover:underline" to={`/c/${x.combination.id}/questionnaires`}>{x.combination.label}</Link>: {effectWord(x.serious)}{r.differs ? <>{x.message ? <p className="text-text-muted">{x.message}</p> : null}<SourceLine r={x} /></> : null}</li>)}</ul></td>
              <td><div className="flex flex-wrap gap-1">{r.sample ? <Pill tone="warn" title="Illustrative: not from an official source">Sample</Pill> : null}{r.differs ? <Pill tone="warn">Differs</Pill> : <OriginPill origin={r.origin ?? undefined} status={r.status} />}</div></td></tr>)}
          </Table>
        )}
      </>}
    </div>
  );
}

export function RulesPage() {
  const list = useApi<RuleRow[]>(["library-rules"], "/library/rules");
  const rows = React.useMemo(() => list.data?.map((r) => ({ ...r, origins: [r.origin] })), [list.data]);
  const f = useFilters(rows, (r) => [r.when, r.then, r.kind_word, r.source, r.lives_on.section, ...r.reads.map((x) => x.name ?? fieldName(x.key))].join(" "));
  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div><h1 className="text-xl font-semibold">Rules</h1><p className="mt-1 text-sm text-text-muted">Every rule in one place, as a sentence, with where it lives and its source. Read-only: change a rule where it lives.</p></div>
      {list.isLoading ? <Spinner label="Loading rules" /> : !list.data?.length ? <EmptyState title="No rules yet" description="Rules come with a combination's sources: its rules, and the conditions on its forms, documents and questions." /> : <>
        {f.bar("rule")}
        {!f.shown.length ? <EmptyState title="No rule matches" description="Clear the search, or choose All for the kind, the combination and the origin." /> : (
          <Table label="Table: Rule, Kind, Reads, Lives on, Status" headClass={[undefined, "hidden xl:table-cell"]} head={["Rule", "Kind", "Reads", "Lives on", "Status"]}>
            {f.shown.map((r) => <tr key={r.id} data-rule={r.kind}><td className="max-w-md"><p className="text-sm font-medium">{r.then}</p>{r.when ? <p className="text-sm"><span className="text-text-muted">When: </span>{r.when}</p> : null}<p className="mt-1 text-[11px] text-text-muted xl:hidden">{r.kind_word}</p><SourceLine r={r} /></td><td className="hidden text-xs xl:table-cell">{r.kind_word}</td><td className="max-w-40 text-xs">{readWords(r.reads)}</td><td className="max-w-56 text-xs">{r.lives_on.combination ? <Link className="text-text-link hover:underline" to={`/c/${r.lives_on.combination.id}/${r.lives_on.tab}`}>{r.lives_on.combination.label} · {r.lives_on.tab_word}</Link> : <><p>Section {r.lives_on.section}, used by:</p>{usedLinks(r.used_in, r.lives_on.tab)}</>}</td><td><OriginPill origin={r.origin} status={r.status} /></td></tr>)}
          </Table>
        )}
      </>}
    </div>
  );
}
