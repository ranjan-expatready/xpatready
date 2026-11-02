// G-CORE B1 (P-253; concept screens/G-CORE-guarded-change/concept.md v2, approved on PR #504): the one guarded change
// pipeline's reader. It reads the library and where-used (SH2, api/src/where-used.ts) into plain shapes, runs the pure
// rules check and review tier (engine/change-set.ts) with the engine's own verifiers passed in, and builds the preview
// "What this change touches" with its fingerprint. `POST /api/change-sets/check` writes nothing. The flows that write
// (rename and merge in B2, AI proposals in B3) call `check` inside their own transaction and record a change_set row.
import { Body, Controller, Headers, HttpCode, HttpException, HttpStatus, Inject, Injectable, Post } from "@nestjs/common";
import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { canonical } from "../../../contracts/rules.ts";
import { ChangeSetBody, NOT_CHECKED, type ChangeItem, type CheckResult, type MadeBy, type PreviewItem } from "../../contracts/change-set.ts";
import { problemFromZod } from "../../contracts/programs.ts";
import { checkChangeSet, riskOf, type Context, type Library } from "../../engine/change-set.ts";
import { valueProblems } from "../../engine/eligibility-gates.ts";
import { buildSnapshot } from "../../engine/snapshot.ts";
import { askedInOrder } from "../../engine/validate.ts";
import { current, fieldReaders, newestBy } from "../../engine/where-used.ts";
import { Db, readerOf, Workspace } from "./core.ts";
import { noFreeAdd } from "./library-sources.ts";
import { combinationTrails, itemCombinations, itemReleases, mappedBoxes, openCasesByRelease } from "./where-used.ts";

type Client = Db | Prisma.TransactionClient;
type H = string | undefined;
const LIVE = ["PUBLISHED", "DRAFT", "RETIRED"] as const;
const VERIFIERS = { valueProblems, canonical: canonical as (t: never) => string };

/** The newest version of every library item, as the engine's check reads them. */
export async function libraryOf(db: Client, workspaceId: string): Promise<Library> {
  const [fields, sections, lists, types] = await Promise.all([
    db.canonicalField.findMany({ where: { workspaceId }, select: { canonicalFieldKey: true, groupKey: true, label: true, aliases: true, valueType: true, answerListKey: true, status: true, mergedIntoKey: true, version: true } }),
    db.logicalSection.findMany({ where: { workspaceId }, select: { sectionKey: true, title: true, status: true, version: true } }),
    db.answerList.findMany({ where: { workspaceId }, select: { answerListKey: true, status: true, version: true, values: { select: { valueKey: true } } } }),
    db.documentType.findMany({ where: { workspaceId }, select: { documentTypeKey: true, name: true, readerProfile: true, status: true, version: true } }),
  ]);
  return {
    fields: newestBy(fields, (f) => f.canonicalFieldKey).map((f) => ({ key: f.canonicalFieldKey, group: f.groupKey ?? f.canonicalFieldKey.split(".")[0], label: f.label, aliases: f.aliases, valueType: f.valueType, answerListKey: f.answerListKey, status: f.status, mergedInto: f.mergedIntoKey })),
    sections: newestBy(sections, (s) => s.sectionKey).map((s) => ({ key: s.sectionKey, title: s.title, status: s.status })),
    answerLists: newestBy(lists, (l) => l.answerListKey).map((l) => ({ key: l.answerListKey, values: l.values.map((v) => v.valueKey), status: l.status })),
    documentTypes: newestBy(types, (t) => t.documentTypeKey).map((t) => ({ key: t.documentTypeKey, name: t.name, proves: String((t.readerProfile as { proves?: unknown } | null)?.proves ?? ""), status: t.status })),
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
    const [library, rows, trails, derived] = await Promise.all([libraryOf(db, ws), useRows(db, ws), combinationTrails(db, ws), db.derivedField.findMany({ where: { workspaceId: ws }, select: { derivedKey: true } })]);
    // P-266: an item a released combination uses (its key is in a release snapshot).
    const released = new Set<string>();
    const releasesOf = new Map<string, { combinationId: string; version: number }[]>();
    for (const it of items) { const s = subjectOf(it); if (!s.kind) continue; const r = await itemReleases(db, ws, s.kind, s.key); releasesOf.set(`${s.kind}:${s.key}`, r); if (r.length && it.kind !== "condition") released.add(`${it.kind}:${it.key}`); }
    // R6 and R8 for a condition on a question: the conditions on it now, and the question order on each combination that
    // selects its section, before and after (challenge M5: the draft snapshot of each combination using the section).
    const existing: (unknown[] | undefined)[] = [], order: Context["order"] = [], rewrites: Context["rewrites"] = [];
    for (const it of items) {
      existing.push(undefined); order.push(undefined); rewrites.push(undefined);
      const i = existing.length - 1;
      if (it.action === "set_condition" && it.target === "question") {
        const q = current(rows.questions, (x) => x.lineageKey).find((x) => x.lineageKey === it.key);
        existing[i] = q?.predicateJson ? [q.predicateJson] : [];
        if (q) {
          const combos = rows.picks.filter((p) => p.sectionKey === q.sectionKey).map((p) => p.combinationId);
          const before: string[] = [], after: string[] = [];
          for (const cid of combos) {
            const s = (await buildSnapshot(db as Db, ws, cid, "draft")).snapshot;
            before.push(...askedInOrder(s).map((p) => p.message));
            after.push(...askedInOrder({ ...s, placements: s.placements.map((p) => (p.fact === it.key ? { ...p, condition: it.tree, condition_effect: "SHOW" } : p)) } as typeof s).map((p) => p.message));
          }
          order[i] = { before, after };
        }
      }
      // Challenge M4: every condition a merge rewrites, before and after the swap.
      if (it.action === "merge") {
        const swap = (j: unknown) => (j == null ? j : JSON.parse(JSON.stringify(j).split(`"field":"${it.key}"`).join(`"field":"${it.into}"`)));
        rewrites[i] = fieldReaders(rows, it.key).map((r) => {
          const tree = r.kind === "form_line" ? rows.lines.find((x) => x.lineageKey === r.key && x.combinationId === r.combinationId)?.predicateJson
            : r.kind === "rule" ? rows.rules.find((x) => x.predicateKey === r.key && x.combinationId === r.combinationId)?.predicateJson
            : r.kind === "document_line" ? rows.docs.find((x) => x.lineageKey === r.key && x.combinationId === r.combinationId)?.predicateJson
            : r.kind === "check" ? rows.checks.find((x) => x.checkKey === r.key && x.combinationId === r.combinationId)?.predicateJson
            : rows.questions.find((x) => x.lineageKey === r.key)?.predicateJson;
          return { where: `${READER_WORDS[r.kind]} ${r.key} on ${trails.get(r.combinationId) ?? "a combination"}`, before: tree, after: swap(tree) };
        });
      }
    }
    const ctx: Context = { library, released, derived: new Set(derived.map((d) => d.derivedKey)), existing, order, rewrites };
    const problems = checkChangeSet(items, madeBy, ctx, VERIFIERS);
    const tier = riskOf(items, madeBy, released);
    const preview = await this.preview(db, ws, items, library, rows, trails, releasesOf);
    const fingerprint = createHash("sha256").update(JSON.stringify({ items, problems, tier, preview })).digest("hex");
    return { ok: !problems.length, problems, not_checked: NOT_CHECKED, tier, preview, fingerprint };
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
      const combos = s.kind ? [...(usedBy[s.kind].get(s.key) ?? [])] : [];
      const qs = s.kind === "field" ? current(rows.questions, (q) => q.lineageKey).filter((q) => q.canonicalFieldKey === s.key) : [];
      const sections = s.kind === "section" ? [{ key: s.key, title: sec?.title ?? s.key }] : [...new Set(qs.map((q) => q.sectionKey))].map((k) => ({ key: k, title: sectionTitle.get(k) ?? k }));
      const forms = s.kind === "field" ? [...new Set(rows.boxes.filter((b) => b.canonicalFieldKey === s.key).map((b) => b.edition.editionLabel))].sort() : [];
      const rules = s.kind === "field" ? fieldReaders(rows, s.key).map((r) => ({ kind: READER_WORDS[r.kind], key: r.key, combination: trails.get(r.combinationId) ?? "A combination" })) : [];
      const releases = (s.kind ? releasesOf.get(`${s.kind}:${s.key}`) ?? [] : []).map((r) => ({ combination: trails.get(r.combinationId) ?? "A combination", version: r.version }));
      const cases = (await openCasesByRelease(db, combos)).map((c) => ({ combination: trails.get(c.combinationId) ?? "A combination", release: c.release, cases: c.cases }));
      const name = f ? f.label || f.key : sec ? sec.title : null;
      const [before, after] = it.action === "rename" ? [name, it.name] : it.action === "alias" ? [name, `${name} (also "${it.alias}")`] : it.action === "merge" ? [name, `merged into ${lib.fields.find((x) => x.key === it.into)?.label ?? it.into}`]
        : it.action === "set_condition" ? [JSON.stringify(current(rows.questions, (q) => q.lineageKey).find((q) => q.lineageKey === it.key)?.predicateJson ?? null), JSON.stringify(it.tree)] : [null, it.name];
      out.push({ item: i, kind: it.kind, key: it.key, name, before, after, sections, forms, rules, combinations: combos.map((id) => ({ id, label: trails.get(id) ?? id })).sort((a, b) => a.label.localeCompare(b.label)), releases, open_cases: cases });
    }
    return out;
  }
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
