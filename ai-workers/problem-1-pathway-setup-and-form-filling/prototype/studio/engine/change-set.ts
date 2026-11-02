// G-CORE (P-253; concept screens/G-CORE-guarded-change/concept.md v2, approved on PR #504): the fixed rules check and the
// review tier of one change set, the same for a person and for the AI. Pure (P-249 lift-ready): no database, framework,
// vendor or file access. The engine's existing verifiers (valueProblems, askedInOrder, canonical) sit in modules that
// read files at load, so the API passes them in as `Verifiers`; this module imports only shapes and the label rule.
import { normalizeLabel } from "../contracts/programs.ts";
import type { ChangeItem, CheckProblem, MadeBy, RuleId, Tier, TierResult } from "../contracts/change-set.ts";
import { fieldsOf } from "./where-used.ts";

/** The newest version of each library item, as the API reads it. */
export type LibField = { key: string; group: string; label: string | null; aliases: string[]; valueType: string; answerListKey: string | null; status: string; mergedInto: string | null };
export type LibSection = { key: string; title: string; status: string };
export type LibList = { key: string; values: string[]; status: string };
export type LibDocType = { key: string; name: string; proves: string; status: string };
export type Library = { fields: LibField[]; sections: LibSection[]; answerLists: LibList[]; documentTypes: LibDocType[] };

/** What the check reads beside the library, per item (index-aligned with the change set's items). */
export type Context = {
  library: Library;
  /** `${kind}:${key}` of each item a released combination uses (P-266: a rename of it needs a second person). */
  released: Set<string>;
  /** Worked-out facts (derived fields): a condition may read them. */
  derived: Set<string>;
  /** Per item: the conditions already on its target (R6). */
  existing?: (unknown[] | undefined)[];
  /** Per item: R8's question-order problems on each affected combination's draft, before and after the change. */
  order?: ({ before: string[]; after: string[] } | undefined)[];
  /** Per merge item: every condition the merge rewrites, before and after the swap (R5, R7, R8 on them). */
  rewrites?: ({ where: string; before: unknown; after: unknown }[] | undefined)[];
};
/** The engine's own verifiers, passed in (engine/eligibility-gates.ts valueProblems, contracts/rules.ts canonical). */
export type Verifiers = { valueProblems: (tree: unknown, types: Map<string, string>, derived: Set<string>) => string[]; canonical: (tree: never) => string };

const LIVE = (s: string) => s === "DRAFT" || s === "PUBLISHED";
const letters = (s: string) => (s.match(/\p{L}/gu) ?? []).length;
const fieldName = (f: LibField) => f.label || f.key;
/** The library's kinds of answer (engine/snapshot.ts VALUE_TYPE_TO_DATA_TYPE; a test keeps the two the same). */
export const VALUE_TYPES = new Set(["text", "yes_no", "date", "code", "country", "address", "number", "phone", "email", "long_text", "multi_choice", "person_name", "period_history", "declaration"]);
/** Field codes in a verifier's words become the fields' names (EXPERIENCE: names, never codes). */
const named = (m: string, lib: Library) => lib.fields.reduce((t, f) => (f.label ? t.split(f.key).join(f.label) : t), m);

// ───────────────────────────────────────────────── R3: no exact duplicate, one row per action and kind (challenge M2)
/** The scope each action checks names in, kept as today's flows check them (library-sources.ts rename, proposals.ts
 *  sameInLibrary), so a person and the AI get the same answer for the same action. */
export const DUPLICATE_SCOPE: Record<string, string> = {
  "field:rename": "the other active fields of its group, by name or alias",
  "field:alias": "the other active fields of its group, by name or alias",
  "section:rename": "every other section's title, retired ones too",
  "field:accept_proposal": "every active field of the library, by name or alias",
  "section:accept_proposal": "every active section, by title (and the proposal's aliases)",
  "answer_list:accept_proposal": "every active answer list, by its codes",
  "document_type:accept_proposal": "every active document type, by name and what it proves",
};
const listId = (codes: string[]) => [...new Set(codes.map((c) => c.trim().toUpperCase()))].sort().join("|");

function duplicate(it: ChangeItem, lib: Library): string | null {
  if (it.kind === "field" && (it.action === "rename" || it.action === "alias")) {
    const me = lib.fields.find((f) => f.key === it.key); if (!me) return null;
    const want = normalizeLabel(it.action === "rename" ? it.name : it.alias);
    const twin = lib.fields.find((t) => t.key !== it.key && t.group === me.group && !t.mergedInto && LIVE(t.status) && [t.label ?? "", ...t.aliases].some((x) => normalizeLabel(x) === want));
    return twin ? `"${it.action === "rename" ? it.name : it.alias}" is already the name of ${twin.label ?? twin.key} in this group. If they mean the same, merge them; otherwise choose another name.` : null;
  }
  if (it.kind === "section" && it.action === "rename") {
    const twin = lib.sections.find((s) => s.key !== it.key && normalizeLabel(s.title) === normalizeLabel(it.name));
    return twin ? `There is already a section called "${twin.title}". Use that one, or choose another title.` : null;
  }
  if (it.action === "accept_proposal" || it.action === "create") {
    const want = normalizeLabel(it.name);
    if (it.kind === "field") { const t = lib.fields.find((f) => LIVE(f.status) && !f.mergedInto && [f.label ?? "", ...f.aliases].some((x) => x && normalizeLabel(x) === want)); return t ? `"${it.name}" is already in the library as ${fieldName(t)}: reuse it instead.` : null; }
    if (it.kind === "section") { const names = new Set([want, ...(it.action === "accept_proposal" ? it.aliases.map(normalizeLabel) : [])]); const t = lib.sections.find((s) => LIVE(s.status) && names.has(normalizeLabel(s.title))); return t ? `"${it.name}" is already in the library as the section "${t.title}": reuse it instead.` : null; }
    if (it.kind === "answer_list" && it.action === "accept_proposal" && it.values?.length) { const id = listId(it.values); const t = lib.answerLists.find((l) => LIVE(l.status) && listId(l.values) === id); return t ? `This list of choices is already in the library as ${t.key}: reuse it instead.` : null; }
    if (it.kind === "document_type") { const proves = normalizeLabel(it.action === "accept_proposal" ? it.proves ?? "" : ""); const t = lib.documentTypes.find((d) => LIVE(d.status) && normalizeLabel(d.name) === want && normalizeLabel(d.proves) === proves); return t ? `"${it.name}" is already in the library as a document type: reuse it instead.` : null; }
  }
  return null;
}
/** Two items of one change set that would make the same new name (caught before either is written). */
function sameWithinSet(items: ChangeItem[]): [number, string][] {
  const seen = new Map<string, number>(), out: [number, string][] = [];
  items.forEach((it, i) => {
    const name = it.action === "rename" || it.action === "accept_proposal" || it.action === "create" ? it.name : it.action === "alias" ? it.alias : null;
    if (!name) return;
    const k = `${it.kind}|${normalizeLabel(name)}`;
    if (seen.has(k)) out.push([i, `"${name}" is given twice in this change (items ${seen.get(k)! + 1} and ${i + 1}): keep one.`]); else seen.set(k, i);
  });
  return out;
}

// ───────────────────────────────────────────────── R5–R8 on one condition tree
type Node = { op?: string; field?: string; value?: unknown; args?: unknown[]; arg?: unknown };
const nodes = (tree: unknown): Node[] => { const out: Node[] = [], stack = [tree]; while (stack.length) { const n = stack.pop() as Node | null; if (!n || typeof n !== "object") continue; out.push(n); for (const a of n.args ?? []) stack.push(a); if (n.arg) stack.push(n.arg); } return out; };
/** R7: a value compared with a choice field that is not on that field's list (the condition can never be true). */
function neverTrue(tree: unknown, lib: Library): string[] {
  const out: string[] = [];
  for (const n of nodes(tree)) {
    if (!n.field || !["eq", "neq", "in"].includes(n.op ?? "")) continue;
    const f = lib.fields.find((x) => x.key === n.field); const list = f?.answerListKey ? lib.answerLists.find((l) => l.key === f.answerListKey) : undefined;
    if (!f || !list?.values.length) continue;
    const codes = new Set(list.values.map((v) => v.trim().toUpperCase()));
    for (const v of n.op === "in" ? (Array.isArray(n.value) ? n.value : []) : [n.value]) if (typeof v === "string" && !codes.has(v.trim().toUpperCase())) out.push(`The condition asks ${fieldName(f)} to be "${v}", which is not on its list: it can never be true.`);
  }
  return out;
}
/** R6: an "and"/"or" that repeats one of its parts. */
function repeatedPart(tree: unknown, v: Verifiers): string[] {
  const out: string[] = [];
  for (const n of nodes(tree)) if ((n.op === "and" || n.op === "or") && n.args?.length) { const c = n.args.map((a) => v.canonical(a as never)); if (new Set(c).size < c.length) out.push(`The condition repeats one of its parts under "${n.op}": remove the copy.`); }
  return out;
}
const ORDER = /^Unreachable question|^Questions decide each other in a loop/;

function treeProblems(i: number, tree: unknown, ctx: Context, v: Verifiers, where = ""): CheckProblem[] {
  const out: CheckProblem[] = [];
  const at = where ? ` (${where})` : "";
  const types = new Map(ctx.library.fields.map((f) => [f.key, f.valueType]));
  // R4 inside a condition: every field it reads exists and is still in use.
  for (const k of new Set(fieldsOf(tree))) {
    const f = ctx.library.fields.find((x) => x.key === k);
    if (!f && !ctx.derived.has(k)) out.push({ rule: "R4", item: i, message: `The condition reads ${k}, which is not in the library${at}.` });
    else if (f && (f.mergedInto || !LIVE(f.status))) out.push({ rule: "R4", item: i, message: `The condition reads ${fieldName(f)}, which is ${f.mergedInto ? `merged into ${f.mergedInto}` : "retired"}${at}.` });
  }
  for (const m of v.valueProblems(tree, types, ctx.derived)) out.push({ rule: "R5", item: i, message: `The condition ${named(m, ctx.library)}${at}.` });
  for (const m of repeatedPart(tree, v)) out.push({ rule: "R6", item: i, message: `${m.replace(/\.$/, "")}${at}.` });
  for (const m of neverTrue(tree, ctx.library)) out.push({ rule: "R7", item: i, message: `${m.replace(/\.$/, "")}${at}.` });
  return out;
}

/** A merged-field chain is at most this many hops long (SH3 resolver contract, #509 Q1: it follows at most 5 keys). */
export const MERGE_HOPS_MAX = 4;
/** The longest chain of merged fields that ends at `key` (0 when nothing was merged into it). */
export function mergeDepth(fields: LibField[], key: string, seen = new Set<string>()): number {
  if (seen.has(key)) return 0; seen.add(key);
  return Math.max(0, ...fields.filter((f) => f.mergedInto === key).map((f) => 1 + mergeDepth(fields, f.key, seen)));
}

/** The fixed rules check (P-253 step 2), in order; every rule runs and every error refuses. */
export function checkChangeSet(items: ChangeItem[], madeBy: MadeBy, ctx: Context, v: Verifiers): CheckProblem[] {
  const out: CheckProblem[] = [];
  const add = (rule: RuleId, item: number, message: string) => out.push({ rule, item, message });
  const lib = ctx.library;
  items.forEach((it, i) => {
    // R1 type and format.
    const name = it.action === "rename" || it.action === "accept_proposal" || it.action === "create" ? it.name : it.action === "alias" ? it.alias : null;
    const max = it.action === "rename" || it.action === "alias" ? 80 : 120; // the rename door's own limit (library-sources.ts NameBody)
    if (name !== null && (name.length < 2 || name.length > max)) add("R1", i, name.length < 2 ? "A name has at least two characters." : `Keep the name under ${max} characters.`);
    else if (name !== null && letters(name) < 1) add("R1", i, "A name has at least one letter.");
    if (it.action === "accept_proposal" && it.kind === "field" && !VALUE_TYPES.has(it.valueType ?? "")) add("R1", i, `"${it.valueType ?? "nothing"}" is not a kind of answer the library knows.`);
    if (it.action === "set_condition" && (!it.tree || typeof it.tree !== "object")) add("R1", i, "The condition is empty or not a condition.");
    // R2 source and reason, for anything new.
    if (it.action === "accept_proposal" || it.action === "create") {
      if (!it.source) add("R2", i, `"${it.name}" needs a source: a form box, an official page with its quote, or "set by ExpatReady".`);
      const r = (it.reason ?? "").trim();
      if (r.length > 300 || letters(r) < 3) add("R2", i, `"${it.name}" needs a reason in words (3 to 300 characters): why nothing in the library fits.`);
    }
    // R3 no exact duplicate.
    const dup = duplicate(it, lib); if (dup) add("R3", i, dup);
    // R4 references intact.
    if (it.action === "rename" || it.action === "alias" || it.action === "merge") {
      const has = it.kind === "section" ? lib.sections.find((s) => s.key === it.key) : lib.fields.find((f) => f.key === it.key);
      if (!has) add("R4", i, `${it.key} is not in the shared library.`);
      else if (has.status === "RETIRED") add("R4", i, `${it.kind === "section" ? `The section "${(has as LibSection).title}"` : `The field "${fieldName(has as LibField)}"`} is retired: it takes no new use or change. Restore it first.`);
      else if (it.kind === "field" && (has as LibField).mergedInto) add("R4", i, `${it.key} was merged into ${(has as LibField).mergedInto}: change that field instead.`);
    }
    if (it.action === "merge") {
      if (it.key === it.into) add("R4", i, "Choose two different fields.");
      const keep = lib.fields.find((f) => f.key === it.into), gone = lib.fields.find((f) => f.key === it.key);
      if (!keep || keep.status === "RETIRED" || keep.mergedInto) add("R4", i, `${it.into} is not an active field of the library.`);
      else if (gone && gone.valueType !== keep.valueType) add("R4", i, `${it.into} holds a ${keep.valueType} and ${it.key} a ${gone.valueType}: fields of different kinds are not the same meaning.`);
      else if (gone && (gone.answerListKey ?? null) !== (keep.answerListKey ?? null)) add("R4", i, `${fieldName(keep)} and ${fieldName(gone)} use different lists of choices: merging them would leave answers off the list.`);
      // SH3 contract (#509, Q1): the resolver follows at most MERGE_HOPS_MAX hops of merged fields and answers the first
      // key beyond that, so a merge that would make a longer chain is refused.
      else if (gone) { const hops = mergeDepth(lib.fields, it.key) + 1; if (hops > MERGE_HOPS_MAX) add("R4", i, `Merging ${fieldName(gone)} into ${fieldName(keep)} would make a chain of ${hops + 1} merged fields (at most ${MERGE_HOPS_MAX + 1}): merge the older fields straight into ${fieldName(keep)} first.`); }
      // R5, R6, R7 on every condition the merge rewrites (challenge M4): only the problems the swap makes count. The swap
      // renames the field inside the words, so they are compared by how many there are of each rule, before and after.
      for (const w of ctx.rewrites?.[i] ?? []) {
        const count = (ps: CheckProblem[]) => ps.reduce((m, p) => m.set(p.rule, (m.get(p.rule) ?? 0) + 1), new Map<RuleId, number>());
        const before = count(treeProblems(i, w.before, ctx, v).filter((p) => p.rule !== "R4"));
        const after = treeProblems(i, w.after, ctx, v, w.where).filter((p) => p.rule !== "R4");
        for (const [rule, n] of count(after)) if (n > (before.get(rule) ?? 0)) out.push(...after.filter((p) => p.rule === rule).slice(before.get(rule) ?? 0));
      }
    }
    if (it.action === "set_condition") {
      out.push(...treeProblems(i, it.tree, ctx, v));
      // R6 the same condition already on the target.
      const mine = v.canonical(it.tree as never);
      if ((ctx.existing?.[i] ?? []).some((e) => e && v.canonical(e as never) === mine)) add("R6", i, "The same condition is already on it: nothing would change.");
    }
    // R8 loop or unreachable question: only the problems this change makes.
    const o = ctx.order?.[i];
    if (o) { const before = new Set(o.before); for (const m of o.after) if (ORDER.test(m) && !before.has(m)) add("R8", i, m); }
  });
  for (const [i, m] of sameWithinSet(items)) add("R3", i, m);
  void madeBy;
  return out;
}

// ───────────────────────────────────────────────── review by risk (P-253 step 6, P-266), one table, fixed in code
/** Each action's tier when nothing raises it. Wording is direct (P-96); anything new, a meaning change, a merge, a rule
 *  or condition change and a retire wait for a second person. */
export const RISK_TABLE: Record<string, { tier: Tier; why: string }> = {
  "field:rename": { tier: "direct", why: "A change of wording is direct and logged (P-96)." },
  "section:rename": { tier: "direct", why: "A change of wording is direct and logged (P-96)." },
  "field:alias": { tier: "direct", why: "An alias is wording: direct and logged (P-96)." },
  "field:merge": { tier: "second_person", why: "A merge changes meaning: a second person approves (P-65)." },
  "condition:set_condition": { tier: "second_person", why: "A rule or condition change: a second person approves (P-253)." },
  "field:accept_proposal": { tier: "second_person", why: "A new item: a second person approves (P-253, BR-7)." },
  "section:accept_proposal": { tier: "second_person", why: "A new item: a second person approves (P-253, BR-7)." },
  "answer_list:accept_proposal": { tier: "second_person", why: "A new item: a second person approves (P-253, BR-7)." },
  "document_type:accept_proposal": { tier: "second_person", why: "A new item: a second person approves (P-253, BR-7)." },
  "field:create": { tier: "second_person", why: "A new item: a second person approves (P-252, held)." },
  "section:create": { tier: "second_person", why: "A new item: a second person approves (P-252, held)." },
  "answer_list:create": { tier: "second_person", why: "A new item: a second person approves (P-252, held)." },
  "document_type:create": { tier: "second_person", why: "A new item: a second person approves (P-252, held)." },
};
/** What raises a direct change to a second person (each one row). */
export const RAISES = {
  released: "It is used by a released combination: a second person approves (P-266).",
  ai: "The AI made it: an AI change is never direct (P-121, P-253 step 3).",
} as const;
/** Which items the immigration expert signs at release review, as today (validate.ts diff needs_sme): rules and
 *  conditions, and anything the AI made. No gate at approval (P-253 Q3, tech lead on PR #504). */
const expertSigns = (it: ChangeItem, madeBy: MadeBy) => it.kind === "condition" || madeBy !== "person";
export const TIER_WORDS: Record<Tier, string> = { direct: "Applies now as a draft; logged, and shown at the next release review.", second_person: "Waits for a second person to approve." };

export function riskOf(items: ChangeItem[], madeBy: MadeBy, released: Set<string>): TierResult {
  let tier: Tier = "direct"; const why: string[] = []; let expert = false;
  for (const it of items) {
    const row = RISK_TABLE[`${it.kind}:${it.action}`] ?? { tier: "second_person" as Tier, why: "Not in the risk table: a second person approves." };
    let t = row.tier; const w = [row.why];
    if (t === "direct" && released.has(`${it.kind}:${it.key}`)) { t = "second_person"; w.push(RAISES.released); }
    if (t === "direct" && madeBy !== "person") { t = "second_person"; w.push(RAISES.ai); }
    if (t === "second_person") tier = "second_person";
    if (expertSigns(it, madeBy)) expert = true;
    for (const x of w) if (!why.includes(x)) why.push(x);
  }
  return { tier, expert_at_release: expert, why, words: TIER_WORDS[tier] + (expert ? " The immigration expert signs it at release." : "") };
}
