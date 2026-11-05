// G-CORE B1 (P-253; concept screens/G-CORE-guarded-change/concept.md v2, approved on PR #504): the one guarded change
// pipeline's reader. It reads the library and where-used (SH2, api/src/where-used.ts) into plain shapes, runs the pure
// rules check and review tier (engine/change-set.ts) with the engine's own verifiers passed in, and builds the preview
// "What this change touches" with its fingerprint. `POST /api/change-sets/check` writes nothing. The flows that write
// (rename and merge in B2, AI proposals in B3) call `guard` before they write and record a change_set row (`record`) in
// their own transaction.
import { SUPPLIES_KIND } from "../../contracts/document-supplies.ts";
import { Body, Controller, Headers, HttpCode, HttpException, HttpStatus, Inject, Injectable, Post } from "@nestjs/common";
import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { canonical, validatePredicate } from "../../../contracts/rules.ts";
import { ChangeSetBody, NOT_CHECKED, type ChangeItem, type CheckResult, type MadeBy, type PreviewItem } from "../../contracts/change-set.ts";
import { normalizeLabel, problemFromZod } from "../../contracts/programs.ts";
import { capProblems, checkChangeSet, listId, riskOf, swapMergedField, type Context, type Library, type OrderCheck } from "../../engine/change-set.ts";
import { valueProblems } from "../../engine/eligibility-gates.ts";
import { buildSnapshot } from "../../engine/snapshot.ts";
import { askedInOrder, isNode } from "../../engine/validate.ts";
import type { Snapshot } from "../../engine/snapshot.ts";
import { current, fieldReaders, newestBy } from "../../engine/where-used.ts";
import { Db, readerOf, Workspace } from "./core.ts";
import { noFreeAdd } from "./no-free-add.ts";
import { pendingNewFields, ridingLists } from "./proposals.ts";
import { combinationTrails, itemCombinations, itemReleases, mappedBoxes, openCasesByRelease } from "./where-used.ts";

type Client = Db | Prisma.TransactionClient;
type H = string | undefined;
const LIVE = ["PUBLISHED", "DRAFT", "RETIRED"] as const;
const VERIFIERS = { valueProblems, canonical: canonical as (t: never) => string, shape: (t: unknown) => validatePredicate(t, isNode) };
const isLive = (s: string) => s === "DRAFT" || s === "PUBLISHED";
const byWords = (a: string, b: string) => a.localeCompare(b);
/** BR-3 copy (concept §5): the preview is stale. */
export const STALE = "What this change touches changed since you opened it. Look at it again, then confirm.";
/** change_set.status (the table's check constraint): applied (direct, or approved by the second person) · waiting ·
 *  rolled_back · undone (it ended without being applied: returned, withdrawn or a merge rejected; the linked
 *  library_change / field_merge says which). Review B2 M1: every decision that ends a wait sets it, in the same write. */
export type ChangeSetStatus = "applied" | "waiting" | "rolled_back" | "undone";

/** The newest version of every library item, as the engine's check reads them. */
export async function libraryOf(db: Client, workspaceId: string): Promise<Library> {
  const [fields, sections, lists, types, approved] = await Promise.all([
    db.canonicalField.findMany({ where: { workspaceId }, select: { canonicalFieldKey: true, groupKey: true, label: true, aliases: true, valueType: true, answerListKey: true, status: true, mergedIntoKey: true, version: true } }),
    db.logicalSection.findMany({ where: { workspaceId }, select: { sectionKey: true, title: true, status: true, version: true } }),
    db.answerList.findMany({ where: { workspaceId }, select: { answerListKey: true, status: true, version: true, values: { select: { valueKey: true } } } }),
    db.documentType.findMany({ where: { workspaceId }, select: { documentTypeKey: true, name: true, readerProfile: true, status: true, version: true, suppliesFacts: true, suppliesAbout: true } }),
    // B112: an approved change of a document's facts goes back to what it replaced if it is withdrawn.
    db.libraryChange.findMany({ where: { workspaceId, kind: SUPPLIES_KIND, status: "APPROVED" }, select: { key: true, matches: true } }),
  ]);
  // Review B1 M1: every live version's names count, as today's doors read them (library-sources.ts, proposals.ts).
  const liveNames = new Map<string, string[]>(); for (const f of fields) if (isLive(f.status) && !f.mergedIntoKey) liveNames.set(f.canonicalFieldKey, [...(liveNames.get(f.canonicalFieldKey) ?? []), f.label ?? "", ...f.aliases].filter(Boolean));
  const liveTitles = new Map<string, string[]>(); for (const x of sections) if (isLive(x.status)) liveTitles.set(x.sectionKey, [...(liveTitles.get(x.sectionKey) ?? []), x.title]);
  const listIds = new Map<string, string[]>(); for (const l of lists) if (isLive(l.status)) listIds.set(l.answerListKey, [...(listIds.get(l.answerListKey) ?? []), listId(l.values.map((v) => v.valueKey))]);
  const proves = (t: (typeof types)[number]) => String((t.readerProfile as { proves?: unknown } | null)?.proves ?? "");
  const docIds = new Map<string, string[]>(); for (const t of types) if (isLive(t.status)) docIds.set(t.documentTypeKey, [...(docIds.get(t.documentTypeKey) ?? []), `${normalizeLabel(t.name)}|${normalizeLabel(proves(t))}`]);
  return {
    fields: newestBy(fields, (f) => f.canonicalFieldKey).map((f) => ({ key: f.canonicalFieldKey, group: f.groupKey ?? f.canonicalFieldKey.split(".")[0], label: f.label, aliases: f.aliases, valueType: f.valueType, answerListKey: f.answerListKey, status: f.status, mergedInto: f.mergedIntoKey, names: liveNames.get(f.canonicalFieldKey) ?? [] })),
    sections: newestBy(sections, (x) => x.sectionKey).map((x) => ({ key: x.sectionKey, title: x.title, status: x.status, liveTitles: liveTitles.get(x.sectionKey) ?? [] })),
    answerLists: newestBy(lists, (l) => l.answerListKey).map((l) => ({ key: l.answerListKey, values: l.values.map((v) => v.valueKey), status: l.status, liveIds: listIds.get(l.answerListKey) ?? [] })),
    documentTypes: newestBy(types, (t) => t.documentTypeKey).map((t) => ({ key: t.documentTypeKey, name: t.name, proves: proves(t), status: t.status, liveIds: docIds.get(t.documentTypeKey) ?? [],
      supplies: [{ facts: t.suppliesFacts, about: (t.suppliesAbout ?? {}) as Record<string, string> }, ...approved.filter((c) => c.key === t.documentTypeKey).map((c) => { const m = c.matches as { before?: string[]; beforeAbout?: Record<string, string> }; return { facts: m.before ?? [], about: m.beforeAbout ?? {} }; })] })),
  };
}

/** The rows a field's readers are found in (SH2's own tables). */
async function useRows(db: Client, workspaceId: string) {
  const [boxes, lines, rules, docs, checks, questions, picks] = await Promise.all([
    mappedBoxes(db, workspaceId),
    db.combinationForm.findMany({ where: { workspaceId, status: { in: [...LIVE] } } }),
    db.predicate.findMany({ where: { workspaceId, status: { in: [...LIVE] } } }),
    db.documentRequirement.findMany({ where: { workspaceId, status: { in: [...LIVE] } } }),
    db.check.findMany({ where: { workspaceId, status: { in: [...LIVE] } } }),
    db.sectionQuestion.findMany({ where: { workspaceId, status: { in: [...LIVE] } } }),
    db.sqrSectionSelection.findMany({ where: { workspaceId } }),
  ]);
  return { boxes, lines, rules, docs, checks, questions, picks };
}

/** The key a preview and the release test look an item up by (a condition on a question is about its field). */
const subjectOf = (it: ChangeItem): { kind: "field" | "section" | null; key: string } =>
  it.kind === "field" || it.kind === "section" ? { kind: it.kind, key: it.key } : it.kind === "condition" && it.target === "question" ? { kind: "field", key: it.key } : { kind: null, key: it.key };

@Injectable()
export class ChangeSets {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Workspace) private readonly ws: Workspace) {}

  /** The fixed rules check, the tier and the preview for one change set (no write). `db` may be a transaction. */
  async check(items: ChangeItem[], madeBy: MadeBy, workspaceId?: string, db: Client = this.db): Promise<CheckResult> {
    const ws = workspaceId ?? (await this.ws.id());
    const [library, rows, trails, derived, riding] = await Promise.all([libraryOf(db, ws), useRows(db, ws), combinationTrails(db, ws), db.derivedField.findMany({ where: { workspaceId: ws }, select: { derivedKey: true } }), ridingLists(db, ws)]);
    // P-266: an item a released combination uses (its key is in a release snapshot).
    const released = new Set<string>();
    const releasesOf = new Map<string, { combinationId: string; version: number }[]>();
    for (const it of items) { const s = subjectOf(it); if (!s.kind || releasesOf.has(`${s.kind}:${s.key}`)) continue; const r = await itemReleases(db, ws, s.kind, s.key); releasesOf.set(`${s.kind}:${s.key}`, r); }
    for (const it of items) { const s = subjectOf(it); if (s.kind && it.kind !== "condition" && releasesOf.get(`${s.kind}:${s.key}`)?.length) released.add(`${it.kind}:${it.key}`); }
    // R8: each affected combination's draft snapshot, read once per check (breaker minor: not once per item).
    const snaps = new Map<string, Snapshot>();
    const snap = async (cid: string) => { if (!snaps.has(cid)) snaps.set(cid, (await buildSnapshot(db as Db, ws, cid, "draft")).snapshot); return snaps.get(cid)!; };
    const orderOn = async (cids: string[], change: (s: Snapshot) => Snapshot): Promise<OrderCheck[]> => {
      const out: OrderCheck[] = [];
      for (const cid of [...new Set(cids)].sort()) { const s = await snap(cid); out.push({ combination: trails.get(cid) ?? "a combination", before: askedInOrder(s).map((p) => p.message), after: askedInOrder(change(s)).map((p) => p.message) }); }
      return out;
    };
    const fieldUsers = await itemCombinations(db, ws, "field");
    const existing: Context["existing"] = [], order: Context["order"] = [], rewrites: Context["rewrites"] = [];
    for (const [i, it] of items.entries()) {
      existing.push(undefined); order.push(undefined); rewrites.push(undefined);
      if (it.action === "set_condition" && it.target === "question") {
        // The question's current placement (as question-condition.ts placementOf reads it); null when no question asks it.
        const q = current(rows.questions, (x) => x.lineageKey).find((x) => x.lineageKey === it.key) ?? null;
        existing[i] = q ? (q.predicateJson ? [q.predicateJson] : []) : null;
        if (q) order[i] = await orderOn(rows.picks.filter((p) => p.sectionKey === q.sectionKey).map((p) => p.combinationId),
          (s) => ({ ...s, placements: s.placements.map((p) => (p.fact === it.key ? { ...p, condition: it.tree, condition_effect: "SHOW" } : p)) }) as Snapshot);
      }
      // Challenge M4 and review B1 M2, M3: every current condition a merge rewrites, before and after the swap (R5–R7),
      // and the question order on every combination reading the field, before and after (R8).
      if (it.action === "merge") {
        const swap = <T>(j: T): T => swapMergedField(j, it.key, it.into);
        rewrites[i] = fieldReaders(rows, it.key).map((r) => ({ where: `${READER_WORDS[r.kind]} ${r.key} on ${trails.get(r.combinationId) ?? "a combination"}`, before: r.tree, after: swap(r.tree) }));
        order[i] = await orderOn([...(fieldUsers.get(it.key) ?? [])], (s) => swap(s));
      }
    }
    const ctx: Context = { library, released, derived: new Set(derived.map((d) => d.derivedKey)), riding, existing, order, rewrites, pendingNew: await pendingNewFields(db, ws),
      // C3.15 BR-6 (#295): names waiting in open library changes for fields (an Add, or a rename's new name).
      waitingNames: (await db.libraryChange.findMany({ where: { workspaceId: ws, kind: "field", status: "WAITING", action: { in: ["ADD", "RENAME"] } }, select: { key: true, label: true } })).filter((c) => c.label).map((c) => ({ key: c.key, name: c.label! })) };
    const { problems, truncated } = capProblems(checkChangeSet(items, madeBy, ctx, VERIFIERS));
    const tier = riskOf(items, madeBy, released);
    const preview = await this.preview(db, ws, items, library, rows, trails, releasesOf);
    // Review m1, breaker M7: the same change on the same library is the same fingerprint, whatever the row or key order.
    const fingerprint = createHash("sha256").update(canonical(JSON.parse(JSON.stringify({ items, problems, tier, preview })) as never)).digest("hex");
    return { ok: !problems.length, problems, truncated, not_checked: NOT_CHECKED, tier, preview, fingerprint, made_by: madeBy };
  }

  /** BR-1, BR-3 (B2): the one door a confirm passes. The fixed rules check runs; any problem refuses (409, each problem in
   *  words, nothing written); an `expected` fingerprint that is no longer the current one answers 409 "look again" with
   *  the fresh check, so the screen shows what changed. Returns the check (its tier decides direct or second person). */
  async guard(items: ChangeItem[], madeBy: MadeBy, expected?: string | null, workspaceId?: string, db: Client = this.db): Promise<CheckResult> {
    const r = await this.check(items, madeBy, workspaceId, db);
    if (!r.ok) throw new HttpException({ type: "https://expatready.local/problems/change-refused", title: "Not changed", status: HttpStatus.CONFLICT, detail: `${r.problems.map((p) => p.message).join(" ")} Nothing was changed.`, problems: r.problems, check: r }, HttpStatus.CONFLICT);
    if (expected != null && expected !== r.fingerprint) // break m7: an empty fingerprint is stale too, never "no check"
      throw new HttpException({ type: "https://expatready.local/problems/look-again", title: "Look again", status: HttpStatus.CONFLICT, detail: STALE, check: r }, HttpStatus.CONFLICT);
    return r;
  }

  /** BR-5, BR-6: the change set's record, written inside the change's own transaction (a refused change writes none). */
  record(tx: Prisma.TransactionClient, workspaceId: string, actorId: string, items: ChangeItem[], madeBy: MadeBy, r: CheckResult, status: ChangeSetStatus, links: { libraryChangeId?: string; fieldMergeId?: string; before?: Prisma.InputJsonValue } = {}) {
    return tx.changeSet.create({ data: { workspaceId, madeBy, actor: actorId, items: items as unknown as Prisma.InputJsonValue, problems: r.problems as unknown as Prisma.InputJsonValue, tier: r.tier.tier, expertAtRelease: r.tier.expert_at_release, fingerprint: r.fingerprint, status, ...links } });
  }

  /** P-253 step 4: per item, every touched section, form, rule, combination, release and open case, and before → after. */
  private async preview(db: Client, ws: string, items: ChangeItem[], lib: Library, rows: Awaited<ReturnType<typeof useRows>>, trails: Map<string, string>, releasesOf: Map<string, { combinationId: string; version: number }[]>): Promise<PreviewItem[]> {
    const usedBy = { field: await itemCombinations(db, ws, "field"), section: await itemCombinations(db, ws, "section") };
    const sectionTitle = new Map(lib.sections.map((s) => [s.key, s.title]));
    const out: PreviewItem[] = [];
    for (const [i, it] of items.entries()) {
      const s = subjectOf(it);
      const f = s.kind === "field" ? lib.fields.find((x) => x.key === s.key) : undefined;
      const sec = s.kind === "section" ? lib.sections.find((x) => x.key === s.key) : undefined;
      const rels = s.kind ? releasesOf.get(`${s.kind}:${s.key}`) ?? [] : [];
      const combos = s.kind ? [...(usedBy[s.kind].get(s.key) ?? [])] : [];
      const qs = s.kind === "field" ? current(rows.questions, (q) => q.lineageKey).filter((q) => q.canonicalFieldKey === s.key) : [];
      const sections = (s.kind === "section" ? [{ key: s.key, title: sec?.title ?? s.key }] : [...new Set(qs.map((q) => q.sectionKey))].map((k) => ({ key: k, title: sectionTitle.get(k) ?? k }))).sort((a, b) => byWords(a.title, b.title));
      const forms = s.kind === "field" ? [...new Set(rows.boxes.filter((b) => b.canonicalFieldKey === s.key).map((b) => b.edition.editionLabel))].sort() : [];
      const rules = (s.kind === "field" ? fieldReaders(rows, s.key).map((r) => ({ kind: READER_WORDS[r.kind], key: r.key, combination: trails.get(r.combinationId) ?? "A combination" })) : []).sort((a, b) => byWords(`${a.kind}|${a.key}|${a.combination}`, `${b.kind}|${b.key}|${b.combination}`));
      const releases = rels.map((r) => ({ combination: trails.get(r.combinationId) ?? "A combination", version: r.version })).sort((a, b) => byWords(a.combination, b.combination) || a.version - b.version);
      // Review m2, breaker minor: the open cases pinned to a release that carries it (a combination only a release uses
      // counts too); a case not pinned yet is listed with no release.
      const carries = new Set(rels.map((r) => `${r.combinationId}|${r.version}`));
      const cases = (await openCasesByRelease(db, [...new Set([...combos, ...rels.map((r) => r.combinationId)])])).filter((c) => c.release === null || carries.has(`${c.combinationId}|${c.release}`))
        .map((c) => ({ combination: trails.get(c.combinationId) ?? "A combination", release: c.release, cases: c.cases })).sort((a, b) => byWords(a.combination, b.combination) || (a.release ?? 0) - (b.release ?? 0));
      const name = f ? f.label || f.key : sec ? sec.title : null;
      const [before, after] = it.action === "rename" ? [name, it.name] : it.action === "alias" ? [name, `${name} (also "${it.alias}")`] : it.action === "merge" ? [name, `merged into ${lib.fields.find((x) => x.key === it.into)?.label ?? it.into}`]
        : it.action === "set_condition" ? [conditionWords(current(rows.questions, (q) => q.lineageKey).find((q) => q.lineageKey === it.key)?.predicateJson ?? null, lib), conditionWords(it.tree, lib)] : [null, it.name];
      out.push({ item: i, kind: it.kind, key: it.key, name, before, after, sections, forms, rules, combinations: combos.map((id) => ({ id, label: trails.get(id) ?? id })).sort((a, b) => a.label.localeCompare(b.label)), releases, open_cases: cases });
    }
    return out;
  }
}
/** A condition in words with the fields' names (review m11: names, never codes); "Always asked" when there is none. */
export function conditionWords(tree: unknown, lib: Library, depth = 0): string {
  if (tree == null) return "Always asked";
  const n = tree as { op?: string; field?: string; value?: unknown; args?: unknown[]; arg?: unknown };
  if (depth > 12 || typeof n !== "object") return "a condition";
  const name = (k?: string) => lib.fields.find((f) => f.key === k)?.label ?? k ?? "a fact";
  const v = (x: unknown) => (Array.isArray(x) ? x.map((y) => JSON.stringify(y)).join(" or ") : JSON.stringify(x));
  const W: Record<string, string> = { eq: "is", neq: "is not", in: "is one of", gt: "is more than", gte: "is at least", lt: "is less than", lte: "is at most" };
  if (n.op && W[n.op]) return `${name(n.field)} ${W[n.op]} ${v(n.value)}`;
  if ((n.op === "and" || n.op === "or") && Array.isArray(n.args)) return n.args.map((a) => conditionWords(a, lib, depth + 1)).join(` ${n.op} `);
  if (n.op === "not") return `not (${conditionWords(n.arg, lib, depth + 1)})`;
  return n.op === "exists" ? `${name(n.field)} is answered` : "a condition";
}
const READER_WORDS: Record<string, string> = { form_line: "Form line", rule: "Rule", document_line: "Document line", check: "Check", question: "Question condition" };

@Controller("api")
export class ChangeSetsController {
  constructor(@Inject(ChangeSets) private readonly s: ChangeSets) {}
  /** The preview: the rules check, the tier and what the change touches, before anything is confirmed (no write). */
  @Post("change-sets/check") @HttpCode(200) async check(@Headers("x-actor") a: H, @Body() body: unknown) {
    readerOf(a);
    const r = ChangeSetBody.safeParse(body);
    if (!r.success) throw new HttpException(problemFromZod(r.error), HttpStatus.BAD_REQUEST);
    // Held (P-251, P-252 (3)): a new item made by hand is not added here; the answer says where items come from.
    const made = r.data.items.find((it) => it.action === "create");
    if (made) { if (made.kind !== "document_type") noFreeAdd(made.kind); throw new HttpException({ type: "https://expatready.local/problems/no-free-add", title: "Not added by hand", status: HttpStatus.GONE, detail: "Nothing is added to the shared library by hand. A document type comes from a checklist line (add the checklist on a combination's Documents page)." }, HttpStatus.GONE); }
    return this.s.check(r.data.items, "person");
  }
}
