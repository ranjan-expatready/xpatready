// G-CORE (P-253; concept screens/G-CORE-guarded-change/concept.md v2, approved on PR #504): the fixed rules check and the
// review tier of one change set, the same for a person and for the AI. Pure (P-249 lift-ready): no database, framework,
// vendor or file access. The engine's existing verifiers (valueProblems, askedInOrder, canonical) sit in modules that
// read files at load, so the API passes them in as `Verifiers`; this module imports only shapes and the label rule.
import { normalizeLabel } from "../contracts/programs.ts";
import type { ChangeItem, CheckProblem, MadeBy, RuleId, Tier, TierResult } from "../contracts/change-set.ts";
import { nearMatches } from "./near.ts";
import { fieldsOf } from "./where-used.ts";

/** The newest version of each library item, as the API reads it, with the names every live (draft or published) version
 *  answers to: today's doors check all of them (library-sources.ts rename, proposals.ts sameInLibrary; review B1 M1). */
export type LibField = { key: string; group: string; label: string | null; aliases: string[]; valueType: string; answerListKey: string | null; status: string; mergedInto: string | null;
  /** Labels and aliases of every live version that is not merged away. */ names: string[] };
export type LibSection = { key: string; title: string; status: string; /** Titles of every live version. */ liveTitles: string[] };
export type LibList = { key: string; values: string[]; status: string; /** The code set of every live version (listIdentity). */ liveIds: string[] };
export type LibDocType = { key: string; name: string; proves: string; status: string; /** name|proves of every live version. */ liveIds: string[] ; /** B112 (QA-256): what it supplies now and whom each fact is about, and (held) what an approved change would go back to if withdrawn. */ supplies?: { facts: string[]; about: Record<string, string>; held?: boolean }[] };
export type Library = { fields: LibField[]; sections: LibSection[]; answerLists: LibList[]; documentTypes: LibDocType[] };

/** R8's question order on one combination's draft, before and after the change (compared per combination, review m4). */
export type OrderCheck = { combination: string; before: string[]; after: string[] };
/** What the check reads beside the library, per item (index-aligned with the change set's items). */
export type Context = {
  library: Library;
  /** `${kind}:${key}` of each item a released combination uses (P-266: a rename of it needs a second person). */
  released: Set<string>;
  /** Worked-out facts (derived fields): a condition may read them. */
  derived: Set<string>;
  /** Draft answer lists that ride with a draft field (proposals.ts ridingLists): not reusable, so not a duplicate. */
  riding?: Set<string>;
  /** New fields other proposals are waiting to add (QA-159: a near duplicate of one of them is caught too). */
  pendingNew?: { key: string | null; name: string; meaning?: string | null }[];
  /** C3.15 BR-6 (tech lead on #295): field names waiting for a second person in open library changes (an Add or a
   *  rename), by key; a waiting name of the same group (the key's first part) is taken too. */
  waitingNames?: { key: string; name: string }[];
  /** Per set_condition item: the condition on its target now (R6), or null when the target does not exist. */
  existing?: (unknown[] | null | undefined)[];
  /** Per item: R8's question order on each affected combination's draft, before and after the change. */
  order?: (OrderCheck[] | undefined)[];
  /** Per merge item: every condition the merge rewrites, before and after the swap (R5–R7 on them; R8 is `order`). */
  rewrites?: ({ where: string; before: unknown; after: unknown }[] | undefined)[];
};
/** The engine's own verifiers, passed in: engine/eligibility-gates.ts valueProblems, contracts/rules.ts canonical and the
 *  closed predicate vocabulary (contracts/rules.ts validatePredicate with engine/validate.ts isNode). */
export type Verifiers = { valueProblems: (tree: unknown, types: Map<string, string>, derived: Set<string>) => string[]; canonical: (tree: never) => string; shape: (tree: unknown) => string[] };

const LIVE = (s: string) => s === "DRAFT" || s === "PUBLISHED";
const letters = (s: string) => (s.match(/\p{L}/gu) ?? []).length;
const fieldName = (f: LibField) => f.label || f.key;
/** A library key: lower-case words with dots and underscores ("person.family_name", "passport"). */
export const KEY = /^[a-z0-9][a-z0-9_]*(\.[a-z0-9_]+)*$/; // "2nd_passport" too (proposals slugKey; break n4)
/** Control, invisible, direction and blank-looking characters (contracts/programs.ts cleanLabel drops the same classes). */
const UNSEEN = /[\p{Cc}\p{Cf}\p{Default_Ignorable_Code_Point}\u2800]/u; // break round 2 n2: every control, format and ignorable character, and the blank braille cell
/** A condition the check reads at all (breaker M1): at most this deep and this many parts; anything larger is refused
 *  before any verifier runs, so no tree can crash or stall the check. */
export const TREE_MAX = { depth: 12, nodes: 200 };
/** The most problems one check returns, and per item (breaker minor, round 2 n3: every item keeps its first problems). */
export const PROBLEMS_MAX = 200, PROBLEMS_PER_ITEM = 10;
/** The library's kinds of answer (engine/snapshot.ts VALUE_TYPE_TO_DATA_TYPE; a test keeps the two the same). */
export const VALUE_TYPES = new Set(["text", "yes_no", "date", "code", "country", "address", "number", "phone", "email", "long_text", "multi_choice", "person_name", "period_history", "declaration"]);
/** Field codes in a verifier's words become the fields' names (EXPERIENCE: names, never codes). */
const named = (m: string, lib: Library) => lib.fields.reduce((t, f) => (f.label ? t.split(f.key).join(f.label) : t), m);
const nameOfKey = (lib: Library, key: string) => { const f = lib.fields.find((x) => x.key === key); return f ? fieldName(f) : key; };

// ───────────────────────────────────────────────── R3: no exact duplicate, one row per action and kind (challenge M2)
/** The scope each action checks names in, kept as today's flows check them (library-sources.ts rename, proposals.ts
 *  sameInLibrary), so a person and the AI get the same answer for the same action. */
export const DUPLICATE_SCOPE: Record<string, string> = {
  "field:rename": "every live version of the other active fields of its group, by name or alias",
  "field:alias": "every live version of the other active fields of its group, by name or alias",
  "section:rename": "every other section's newest title, retired ones too",
  "field:accept_proposal": "every live version of every active field of the library, by name or alias",
  "section:accept_proposal": "every live version of every section, by title (and the proposal's aliases)",
  "answer_list:accept_proposal": "every live version of every answer list not riding with a draft field, by its exact codes",
  "document_type:accept_proposal": "every live version of every document type, by name and what it proves",
};
/** proposals.ts listIdentity: the distinct codes, sorted, exactly as written (the long-list hash is the same string's). */
export const listId = (codes: string[]) => [...new Set(codes)].sort().join(",");
const docId = (name: string, proves: string) => `${normalizeLabel(name)}|${normalizeLabel(proves)}`;

function duplicate(it: ChangeItem, ctx: Context): string | null {
  const lib = ctx.library;
  if (it.kind === "field" && (it.action === "rename" || it.action === "alias")) {
    const me = lib.fields.find((f) => f.key === it.key); if (!me) return null;
    const want = normalizeLabel(it.action === "rename" ? it.name : it.alias);
    const twin = lib.fields.find((t) => t.key !== it.key && t.group === me.group && t.names.some((x) => normalizeLabel(x) === want));
    if (twin) return `"${it.action === "rename" ? it.name : it.alias}" is already the name of ${twin.label ?? twin.key} in this group. If they mean the same, merge them; otherwise choose another name.`;
    // The waiting change's group: its field's group when the field exists (a rename), else its key's first part (an Add,
    // #295), so both sides are compared by the same rule (Devin on #712).
    const groupOf = (key: string) => lib.fields.find((f) => f.key === key)?.group ?? key.split(".")[0];
    const waiting = (ctx.waitingNames ?? []).find((w) => w.key !== it.key && groupOf(w.key) === me.group && normalizeLabel(w.name) === want);
    return waiting ? `"${it.action === "rename" ? it.name : it.alias}" is waiting for a second person on To review as the name of another field in this group. Choose another name, or wait until that change is decided.` : null;
  }
  if (it.kind === "section" && it.action === "rename") {
    const twin = lib.sections.find((s) => s.key !== it.key && normalizeLabel(s.title) === normalizeLabel(it.name));
    return twin ? `There is already a section called "${twin.title}". Use that one, or choose another title.` : null;
  }
  if (it.action === "accept_proposal" || it.action === "create") {
    const want = normalizeLabel(it.name);
    if (it.kind === "field") { const t = lib.fields.find((f) => f.names.some((x) => x && normalizeLabel(x) === want)); return t ? `"${it.name}" is already in the library as ${fieldName(t)}: reuse it instead.` : null; }
    if (it.kind === "section") { const names = new Set([want, ...(it.action === "accept_proposal" ? it.aliases.map(normalizeLabel) : [])]); const t = lib.sections.find((s) => s.liveTitles.some((x) => names.has(normalizeLabel(x)))); return t ? `"${it.name}" is already in the library as the section "${t.title}": reuse it instead.` : null; }
    if (it.kind === "answer_list" && it.action === "accept_proposal" && it.values?.length) { const id = listId(it.values); const t = lib.answerLists.find((l) => !ctx.riding?.has(l.key) && l.liveIds.includes(id)); return t ? `This list of choices is already in the library${t.values.length ? ` (${t.values.slice(0, 3).join(", ")}${t.values.length > 3 ? ", …" : ""})` : ""}: reuse it instead.` : null; }
    if (it.kind === "document_type") { const id = docId(it.name, it.action === "accept_proposal" ? it.proves ?? "" : ""); const t = lib.documentTypes.find((d) => d.liveIds.includes(id)); return t ? `"${it.name}" is already in the library as a document type: reuse it instead.` : null; }
  }
  return null;
}
/** The words a new name is compared in within one set: a field's rename or alias within its group (review m5). */
function nameKey(it: ChangeItem, lib: Library): string | null {
  const name = it.action === "rename" || it.action === "accept_proposal" || it.action === "create" ? it.name : it.action === "alias" ? it.alias : null;
  if (!name) return null;
  const group = it.kind === "field" && (it.action === "rename" || it.action === "alias") ? lib.fields.find((f) => f.key === it.key)?.group ?? "" : "*";
  return `${it.kind}|${group}|${normalizeLabel(name)}`;
}

// ───────────────────────────────────────────────── R1 on a condition: its size first, then the closed vocabulary
type Node = { op?: string; field?: string; value?: unknown; args?: unknown; arg?: unknown };
/** Every part of a tree, without recursion; null when it is deeper or larger than TREE_MAX (or not a tree). */
function nodes(tree: unknown): Node[] | null {
  const out: Node[] = [], stack: [unknown, number][] = [[tree, 1]];
  while (stack.length) {
    const [n, d] = stack.pop()!;
    if (!n || typeof n !== "object" || Array.isArray(n)) return null;
    if (d > TREE_MAX.depth || out.length >= TREE_MAX.nodes) return null;
    const x = n as Node; out.push(x);
    if (x.args !== undefined) { if (!Array.isArray(x.args)) return null; for (const a of x.args) stack.push([a, d + 1]); }
    if (x.arg !== undefined) stack.push([x.arg, d + 1]);
  }
  return out;
}
/** R1 for a condition: a tree of the closed vocabulary, small enough to read. Returns its parts when it is one. */
function conditionShape(tree: unknown, v: Verifiers): { parts: Node[] | null; why: string | null } {
  const parts = nodes(tree);
  if (!parts) return { parts: null, why: `The condition is not a condition, or it is larger than ${TREE_MAX.depth} levels or ${TREE_MAX.nodes} parts.` };
  const errs = v.shape(tree);
  return errs.length ? { parts: null, why: `The condition is not valid: ${errs[0]}.` } : { parts, why: null };
}

// ───────────────────────────────────────────────── R5–R7 on one condition tree (R8 is the question order)
/** R7: an "is" or "is one of" with a value not on the field's list, which can never be true. Codes are compared exactly,
 *  as the evaluator does (contracts/rules.ts). "is not" with such a value is always true, so it is not this rule. */
function neverTrue(tree: unknown, lib: Library): string[] {
  const out: string[] = [];
  // Only a part the whole condition needs: the root and what "and" joins below it. Under "or" another part can still
  // make it true, and under "not" an "is" that can never be true makes the whole always true (break round 2).
  const needed: Node[] = []; const stack = [tree as Node];
  while (stack.length) { const n = stack.pop(); if (!n || typeof n !== "object") continue; needed.push(n); if (n.op === "and" && Array.isArray(n.args)) stack.push(...(n.args as Node[])); }
  for (const n of needed) {
    if (!n.field || (n.op !== "eq" && n.op !== "in")) continue;
    const f = lib.fields.find((x) => x.key === n.field); const list = f?.answerListKey ? lib.answerLists.find((l) => l.key === f.answerListKey) : undefined;
    if (!f || !list?.values.length) continue;
    const codes = new Set(list.values);
    const vals = n.op === "in" ? (Array.isArray(n.value) ? n.value : []) : [n.value];
    const off = vals.filter((v) => typeof v === "string" && !codes.has(v));
    if (off.length && off.length === vals.length) out.push(`The condition asks ${fieldName(f)} to be "${off.join('" or "')}", which is not on its list: it can never be true.`);
  }
  return out;
}
/** R6: an "and"/"or" that repeats one of its parts. */
function repeatedPart(parts: Node[], v: Verifiers): string[] {
  const out: string[] = [];
  for (const n of parts) if ((n.op === "and" || n.op === "or") && Array.isArray(n.args) && n.args.length) { const c = n.args.map((a) => v.canonical(a as never)); if (new Set(c).size < c.length) out.push(`The condition repeats one of its parts under "${n.op}": remove the copy.`); }
  return out;
}
const ORDER = /^Unreachable question|^Questions decide each other in a loop/;

function treeProblems(i: number, tree: unknown, ctx: Context, v: Verifiers, where = ""): CheckProblem[] {
  const at = where ? ` (${where})` : "";
  const shape = conditionShape(tree, v);
  if (!shape.parts) return [{ rule: "R1", item: i, message: `${shape.why!.replace(/\.$/, "")}${at}.` }];
  const out: CheckProblem[] = [];
  const types = new Map(ctx.library.fields.map((f) => [f.key, f.valueType]));
  // R4 inside a condition: every field it reads exists and is still in use.
  for (const k of new Set(fieldsOf(tree))) {
    const f = ctx.library.fields.find((x) => x.key === k);
    if (!f && !ctx.derived.has(k)) out.push({ rule: "R4", item: i, message: `The condition reads ${k}, which is not in the library${at}.` });
    else if (f && (f.mergedInto || !LIVE(f.status))) out.push({ rule: "R4", item: i, message: `The condition reads ${fieldName(f)}, which is ${f.mergedInto ? `merged into ${nameOfKey(ctx.library, f.mergedInto)}` : "retired"}${at}.` });
  }
  for (const m of v.valueProblems(tree, types, ctx.derived)) out.push({ rule: "R5", item: i, message: `The condition ${named(m, ctx.library)}${at}.` });
  for (const m of repeatedPart(shape.parts, v)) out.push({ rule: "R6", item: i, message: `${m.replace(/\.$/, "")}${at}.` });
  for (const m of neverTrue(tree, ctx.library)) out.push({ rule: "R7", item: i, message: `${m.replace(/\.$/, "")}${at}.` });
  return out;
}

/** What a merge does to a snapshot or a condition (forms.ts approveMerge): every condition reference to the merged field
 *  and every question that asks it move to the surviving field (a review thread on #556: R8 must see both). */
export function swapMergedField<T>(j: T, from: string, to: string): T {
  if (j == null) return j;
  return JSON.parse(JSON.stringify(j).split(`"field":"${from}"`).join(`"field":"${to}"`).split(`"fact":"${from}"`).join(`"fact":"${to}"`)) as T;
}

/** A merged-field chain is at most this many merges long (SH3 resolver contract, #509 Q1: it follows at most 5 keys). */
export const MERGE_HOPS_MAX = 4;
/** The longest chain of merged fields that ends at `key` (0 when nothing was merged into it). */
export function mergeDepth(fields: LibField[], key: string, seen = new Set<string>()): number {
  if (seen.has(key)) return 0; seen.add(key);
  return Math.max(0, ...fields.filter((f) => f.mergedInto === key).map((f) => 1 + mergeDepth(fields, f.key, seen)));
}
/** The library keys an item changes (a merge changes both fields). */
// A condition changes its question's field and reads the fields it names (break round 2 n1: a merge of A and a
// condition reading A, or on A's question, in one set).
// What an item writes, and what it reads (a review thread on #556: two conditions reading one field are independent; a
// merge of a field must not meet another item that writes or reads either field).
const writesOf = (it: ChangeItem) => (it.action === "merge" ? [`field:${it.key}`, `field:${it.into}`] : it.action === "set_condition" ? [`condition:${it.key}`] : [`${it.kind}:${it.key}`]);
const readsOf = (it: ChangeItem) => (it.action === "set_condition" ? [...new Set([`field:${it.key}`, ...(nodes(it.tree) ?? []).filter((n) => typeof n.field === "string").map((n) => `field:${n.field}`)])] : []);

/** The fixed rules check (P-253 step 2), in order; every rule runs and every error refuses. */
export function checkChangeSet(items: ChangeItem[], madeBy: MadeBy, ctx: Context, v: Verifiers): CheckProblem[] {
  const out: CheckProblem[] = [];
  const add = (rule: RuleId, item: number, message: string) => out.push({ rule, item, message });
  const lib = ctx.library;
  items.forEach((it, i) => {
    // R1 type and format.
    if (!KEY.test(it.key) || (it.action === "merge" && !KEY.test(it.into))) add("R1", i, "A library key is lower-case words joined by dots or underscores (like person.family_name).");
    const name = it.action === "rename" || it.action === "accept_proposal" || it.action === "create" ? it.name : it.action === "alias" ? it.alias : null;
    // The rename door's own limits (library-sources.ts NameBody: 2 to 80 characters); a new item's name needs a letter.
    const max = it.action === "rename" || it.action === "alias" ? 80 : 120;
    if (name !== null && UNSEEN.test(name)) add("R1", i, "Remove the control, invisible or direction characters from the name.");
    else if (name !== null && (name.length < 2 || name.length > max)) add("R1", i, name.length < 2 ? "A name has at least two characters." : `Keep the name under ${max} characters.`);
    else if (name !== null && (it.action === "accept_proposal" || it.action === "create") && letters(name) < 1) add("R1", i, "A new item's name has at least one letter.");
    if (it.action === "accept_proposal" && it.kind === "field" && !VALUE_TYPES.has(it.valueType ?? "")) add("R1", i, `"${it.valueType ?? "nothing"}" is not a kind of answer the library knows.`);
    // B1 checks conditions on questions (the AI's condition proposals, C4.11); other targets are changed on their pages.
    if (it.action === "set_condition" && it.target !== "question") add("R1", i, "Only a question's condition goes through this check now; a form line, document line, rule or check condition is changed on its own page.");
    // R2 source and reason, for anything new.
    if (it.action === "accept_proposal" || it.action === "create") {
      if (!it.source) add("R2", i, `"${it.name}" needs a source: a form field, an official page with its quote, or "set by ExpatReady".`);
      const r = (it.reason ?? "").trim();
      if (UNSEEN.test(r.replace(/[\n\t]/g, " "))) add("R2", i, "Remove the control or invisible characters from the reason.");
      else if (r.length > 300 || letters(r) < 3) add("R2", i, `"${it.name}" needs a reason in words (3 to 300 characters): why nothing in the library fits.`);
    }
    // R3 no exact duplicate.
    const dup = duplicate(it, ctx); if (dup) add("R3", i, dup);
    // R3 near duplicate (QA-159, engine/near.ts): a new field close to a library field, or to one another proposal is
    // adding, needs a reason that names it (why it does not fit); it is never direct and never Ready.
    else if ((it.action === "accept_proposal" || it.action === "create") && it.kind === "field") {
      // A review thread on #556: every live name of a field counts (as the exact check reads them), one entry per field.
      const near: { key: string | null; name: string; names: string[]; why: string }[] = [];
      for (const f of lib.fields.filter((f) => LIVE(f.status) && !f.mergedInto)) {
        const names = [...new Set([fieldName(f), ...f.names])];
        const hit = names.map((n) => nearMatches({ key: it.key, name: it.name }, [{ key: f.key, name: n }])[0]).find(Boolean);
        if (hit) near.push({ key: f.key, name: hit.name, names, why: hit.why });
      }
      for (const n of nearMatches({ key: it.key, name: it.name }, ctx.pendingNew ?? [])) near.push({ ...n, names: [n.name] });
      // Review r4-M1, r5-m1: compared as whole words (lower case, NFKC, every run of other characters one space), the
      // item's own name and key taken out of the reason first, so "The full name, as on travel document, is asked…"
      // does not count as naming "Full name", and "page" does not name "Age".
      const seq = (x: string) => ` ${x.toLowerCase().normalize("NFKC").replace(/[^\p{L}\p{N}]+/gu, " ").trim()} `;
      const own = [it.name, it.key, it.key.split(".").slice(1).join(" ")].map(seq).filter((x) => x.trim().length > 1);
      const reason = own.reduce((r, o) => r.split(o).join(" "), seq(it.reason ?? ""));
      for (const n of near) if (!n.names.some((x) => reason.includes(seq(x))) && !(n.key && reason.includes(seq(n.key)))) add("R3", i, `"${it.name}" is close to ${n.name} (${n.why}): reuse ${n.name}, or say in the reason why it does not fit.`);
    }
    // R4 references intact.
    if (it.action === "accept_proposal" || it.action === "create") {
      const taken = it.kind === "field" ? lib.fields.some((f) => f.key === it.key) || ctx.derived.has(it.key) : it.kind === "section" ? lib.sections.some((s) => s.key === it.key) : it.kind === "answer_list" ? lib.answerLists.some((l) => l.key === it.key) : lib.documentTypes.some((d) => d.key === it.key);
      if (taken) add("R4", i, `The key ${it.key} is already taken in the library: a new item needs a new key.`);
    }
    if (it.action === "rename" || it.action === "alias" || it.action === "merge") {
      const has = it.kind === "section" ? lib.sections.find((s) => s.key === it.key) : lib.fields.find((f) => f.key === it.key);
      if (!has) add("R4", i, `${it.key} is not in the shared library.`);
      else if (has.status === "RETIRED") add("R4", i, `${it.kind === "section" ? `The section "${(has as LibSection).title}"` : `The field "${fieldName(has as LibField)}"`} is retired: it takes no new use or change. Restore it first.`);
      else if (it.kind === "field" && (has as LibField).mergedInto) add("R4", i, `${fieldName(has as LibField)} was merged into ${nameOfKey(lib, (has as LibField).mergedInto!)}: change that field instead.`);
    }
    if (it.action === "merge") {
      const keep = lib.fields.find((f) => f.key === it.into), gone = lib.fields.find((f) => f.key === it.key);
      if (it.key === it.into) add("R4", i, "Choose two different fields.");
      else if (!keep || keep.status === "RETIRED" || keep.mergedInto) add("R4", i, `${keep ? fieldName(keep) : it.into} is not an active field of the library.`);
      else if (gone && gone.valueType !== keep.valueType) add("R4", i, `${fieldName(keep)} holds a ${keep.valueType} and ${fieldName(gone)} a ${gone.valueType}: fields of different kinds are not the same meaning.`);
      else if (gone && (gone.answerListKey ?? null) !== (keep.answerListKey ?? null)) add("R4", i, `${fieldName(keep)} and ${fieldName(gone)} use different lists of choices: merging them would leave answers off the list.`);
      // SH3 contract (#509, Q1): the resolver follows at most MERGE_HOPS_MAX merges and answers the first key beyond
      // that, so a merge that would make a longer chain is refused.
      else if (gone) { const merges = mergeDepth(lib.fields, it.key) + 1; if (merges > MERGE_HOPS_MAX) add("R4", i, `Merging ${fieldName(gone)} into ${fieldName(keep)} would make a chain of ${merges} merges; at most ${MERGE_HOPS_MAX} are followed.`); }
      // B112 (QA-256): one fact can't be about two people: a document that supplies both, about different people, keeps them apart.
      if (gone && keep) for (const t of lib.documentTypes.filter((d) => d.status !== "RETIRED")) {
        const both = (t.supplies ?? []).filter((x) => x.facts.includes(it.key) && x.facts.includes(it.into) && (x.about[it.key] ?? "holder") !== (x.about[it.into] ?? "holder"));
        if (both.some((x) => !x.held)) add("R4", i, `${t.name} supplies both ${fieldName(gone)} and ${fieldName(keep)}, about different people, so merging them would lose whom one is about. Change what it supplies first, then merge.`);
        else if (both.length) add("R4", i, `${t.name} has an approved change that would bring back ${fieldName(gone)} and ${fieldName(keep)}, about different people, if it were withdrawn, so merging them would lose whom one is about. Let that change go out with a release, or withdraw it, then merge.`);
      }
      // R5, R6, R7 on every condition the merge rewrites (challenge M4): only the problems the swap makes count. The swap
      // renames the field inside the words, so they are compared by how many there are of each rule, before and after.
      for (const w of ctx.rewrites?.[i] ?? []) {
        const count = (ps: CheckProblem[]) => ps.reduce((m, p) => m.set(p.rule, (m.get(p.rule) ?? 0) + 1), new Map<RuleId, number>());
        const before = count(treeProblems(i, w.before, ctx, v).filter((p) => p.rule !== "R4"));
        const after = treeProblems(i, w.after, ctx, v, w.where).filter((p) => p.rule !== "R4");
        for (const [rule, n] of count(after)) if (n > (before.get(rule) ?? 0)) out.push(...after.filter((p) => p.rule === rule).slice(before.get(rule) ?? 0));
      }
    }
    if (it.action === "set_condition" && it.target === "question") {
      if (ctx.existing?.[i] === null) add("R4", i, `No question asks ${nameOfKey(lib, it.key)} in the library, so its condition has nowhere to go.`);
      const asked = lib.fields.find((f) => f.key === it.key);
      if (asked && (asked.mergedInto || !LIVE(asked.status))) add("R4", i, `${fieldName(asked)} is ${asked.mergedInto ? `merged into ${nameOfKey(lib, asked.mergedInto)}` : "retired"}: its question takes no new condition.`);
      const tp = treeProblems(i, it.tree, ctx, v); out.push(...tp);
      // R6 the same condition already on the target (only for a tree that is a condition at all).
      if (!tp.some((p) => p.rule === "R1")) { const mine = v.canonical(it.tree as never); if ((ctx.existing?.[i] ?? []).some((e) => e && v.canonical(e as never) === mine)) add("R6", i, "The same condition is already on it: nothing would change."); }
    }
    // R8 loop or unreachable question, per combination: only the problems this change makes there.
    for (const o of ctx.order?.[i] ?? []) { const before = new Set(o.before); for (const m of new Set(o.after)) if (ORDER.test(m) && !before.has(m)) add("R8", i, `${m}${o.combination ? ` (${o.combination})` : ""}`); }
  });
  // R3 and R4 across the items of one set (breaker M3): one change per item, and no new name given twice.
  const seenName = new Map<string, number>();
  items.forEach((it, i) => {
    const k = nameKey(it, lib);
    if (k) { if (seenName.has(k)) add("R3", i, `"${it.action === "alias" ? it.alias : (it as { name: string }).name}" is given twice in this change (items ${seenName.get(k)! + 1} and ${i + 1}): keep one.`); else seenName.set(k, i); }
    const clash = items.findIndex((o, j) => {
      if (j >= i) return false;
      const w = writesOf(it), wo = writesOf(o);
      const touch = (a: string[], b: string[]) => a.find((k) => b.includes(k));
      return touch(w, wo) || (it.action === "merge" && touch(w, readsOf(o))) || (o.action === "merge" && touch(wo, readsOf(it)));
    });
    if (clash >= 0) {
      const o = items[clash], key = [...writesOf(it), ...readsOf(it)].find((k) => [...writesOf(o), ...readsOf(o)].includes(k)) ?? writesOf(it)[0];
      add("R4", i, `Items ${clash + 1} and ${i + 1} both change ${key.startsWith("field:") ? nameOfKey(lib, key.slice(6)) : key.slice(key.indexOf(":") + 1)}: one change per item in a change set (send the next one after this one).`);
    }
  });
  void madeBy;
  return out;
}
/** At most PROBLEMS_PER_ITEM per item and PROBLEMS_MAX in all, in item order; `truncated` says more were found. */
export function capProblems(ps: CheckProblem[]): { problems: CheckProblem[]; truncated: boolean } {
  const per = new Map<number, number>(), kept: CheckProblem[] = [];
  for (const p of [...ps].sort((a, b) => a.item - b.item)) { const n = per.get(p.item) ?? 0; if (n < PROBLEMS_PER_ITEM && kept.length < PROBLEMS_MAX) { kept.push(p); per.set(p.item, n + 1); } }
  return { problems: kept, truncated: kept.length < ps.length };
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
/** Which items the immigration expert signs at release review, as today (validate.ts diff needs_sme: rules, document
 *  requirements, checks, a form line with a condition, and anything the AI made; not a person's question condition). No
 *  gate at approval (P-253 Q3, tech lead on PR #504; review B1 M5). */
export const EXPERT_TARGETS = new Set(["rule", "document_line", "check", "form_line"]);
// An accepted proposal is the AI's item, whoever sends the check (break round 2).
const expertSigns = (it: ChangeItem, madeBy: MadeBy) => madeBy !== "person" || it.action === "accept_proposal" || (it.action === "set_condition" && EXPERT_TARGETS.has(it.target));
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
