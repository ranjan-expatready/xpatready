// G4 (C5.7; concept screens/G4-answer-keys/concept.md BR-1…BR-8): answer-key families, keys and runs. The author writes
// a made-up family and what an item (a form's field map, or the combination's eligibility rules) should give for it;
// a run reads the combination's draft through the pure runner (engine/answer-keys.ts) and stores every line; the
// immigration expert signs the expected values. Registered in features/answer-keys.ts (P-214). No model call (US$0).
// Audit lines name the family key, the item and the counts: never a family's values (SA-1B-296 field 9).
import { Body, Controller, Get, Headers, HttpCode, HttpException, HttpStatus, Inject, Injectable, Param, Post, Put, Query } from "@nestjs/common";
import { readFileSync, statSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { Prisma } from "@prisma/client";
import type { z } from "zod";
import { FamilyBody, KeyCreateBody, KeyUpdateBody, SignBody } from "../../contracts/answer-keys.ts";
import { problemFromZod } from "../../contracts/programs.ts";
import { canonical } from "../../../contracts/rules.ts";
import { buildSnapshot, effective, type Snapshot } from "../../engine/snapshot.ts";
import { dependentListsFor, writesParts } from "../../engine/field-format.ts";
import { blank, changeProblem, checkExpected, checkFamily, fingerprintOf, inventoryHash, ITEM_KINDS, keyBoxes, NO_SCORING, runFieldMap, runRuleSet, runState, SAMPLE_WORDS, signProblem, unclean, type Family, type FieldError, type ItemKind, type MapExpected, type RuleExpected } from "../../engine/answer-keys.ts";
import type { Inventory } from "../../engine/form-values.ts";
import { ACTORS, Audit, Db, fail, need, readerOf, SOLUTION, Workspace, type Actor } from "./core.ts";

const nameOf = (id: string | null | undefined) => [...ACTORS].find((a) => a.id === id)?.name ?? (id ? "Someone else" : null);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const invalid = (errors: FieldError[]): never => { throw new HttpException({ type: "https://expatready.local/problems/validation", title: "Some details need fixing", status: 400, detail: errors.map((e) => e.message).join(" "), errors }, HttpStatus.BAD_REQUEST); };
const conflict = (detail: string, extra: object = {}): never => { throw new HttpException({ type: "https://expatready.local/problems/stale", title: "Changed by someone else", status: 409, detail, ...extra }, HttpStatus.CONFLICT); };
/** STANDARDS §6 (review minor 3): the request's shape first (contracts/answer-keys.ts), then the engine's item rules. */
const parse = <S extends z.ZodType>(schema: S, input: unknown): z.infer<S> => { const r = schema.safeParse(input ?? {}); if (!r.success) throw new HttpException(problemFromZod(r.error), HttpStatus.BAD_REQUEST); return r.data; };
const obj = (b: unknown) => (b && typeof b === "object" && !Array.isArray(b) ? b : {}) as Record<string, unknown>;
const holds = (a: Actor, duty: string) => (a.duties as readonly string[]).includes(duty);
const at = (d: Date | null | undefined) => (d ? d.toISOString() : null);
type FamilyRow = { id: string; familyKey: string; label: string; referenceDate: string; people: unknown; facts: unknown; noneApply: unknown; version: number; updatedBy: string; updatedAt: Date };
export const familyOf = (r: FamilyRow): Family => ({ key: r.familyKey, label: r.label, reference_date: r.referenceDate, people: r.people as Family["people"], facts: r.facts as Family["facts"], none_apply: (r.noneApply ?? []) as Family["none_apply"] });
const familyView = (r: FamilyRow) => ({ id: r.id, ...familyOf(r), version: r.version, sample: SAMPLE_WORDS, saved_by: nameOf(r.updatedBy), saved_at: at(r.updatedAt) });
const pdfHas = (s: Snapshot, form: string) => (s.field_maps as { form_number: string; channel?: string }[]).some((m) => m.form_number === form && m.channel !== "ONLINE");
const editionIn = (expected: unknown) => { const e = obj(expected).edition; return typeof e === "string" && e.trim() ? e.trim() : null; };
/** A field-map key's edition (the one it was written for), or null for a rule-set key. */
export const editionOf = (k: { itemKind: string; expected: unknown }) => (k.itemKind === "field_map" ? ((k.expected as MapExpected | null)?.edition ?? null) : null);
const itemWords = (kind: string, ref: string) => (kind === "rule_set" ? "the eligibility rules" : `the ${ref} field map`);

/** The form field list of a form's PDF map (the edition's inventory file), as the filler reads it (api/src/fill.ts
 *  writeForm); null when none is recorded. G2 (challenge m5): read once per file version and kept with its hash, so a
 *  release gate pass over many keys reads and hashes each list once. */
const LISTS = new Map<string, { stamp: string; inv: Inventory; hash: string }>();
export function fieldListOf(s: Snapshot, form: string, edition?: string | null): { inv: Inventory; hash: string } | null {
  // With `edition`, that edition's list (G2, Devin on #568): a combination may hold several mapped PDF editions.
  const all = (s.field_maps as { form_number: string; form_edition?: string; channel?: string; inventory_file?: string | null }[]).filter((x) => x.form_number === form && x.channel !== "ONLINE");
  const m = (edition ? all.find((x) => x.form_edition === edition) : undefined) ?? all[0];
  if (!m?.inventory_file) return null;
  // Devin review (PR #513): the field list is read only from inside the solution folder, and only a .json file.
  const path = resolve(SOLUTION, m.inventory_file);
  if (!path.startsWith(resolve(SOLUTION) + sep) || !path.endsWith(".json")) return null;
  try {
    const st = statSync(path), stamp = `${st.mtimeMs}|${st.size}`, hit = LISTS.get(path);
    if (hit?.stamp === stamp) return hit;
    // BK-26: with the form's dependent lists beside it, so a key checks what a fill writes (its hash leaves them out).
    const inv = { ...(JSON.parse(readFileSync(path, "utf8")) as Inventory), dependent_lists: dependentListsFor(m.inventory_file) }, out = { stamp, inv, hash: inventoryHash(inv) };
    LISTS.set(path, out);
    return out;
  } catch { return null; }
}

@Injectable()
export class AnswerKeys {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Workspace) private readonly ws: Workspace, @Inject(Audit) private readonly audit: Audit) {}

  private async fields(workspaceId: string) {
    const rows = await this.db.canonicalField.findMany({ where: { workspaceId, status: { not: "RETIRED" } }, select: { canonicalFieldKey: true } });
    return new Set(rows.map((r) => r.canonicalFieldKey));
  }
  /** Challenge m3: the library's person roles (S5), not a list in code. */
  private async roles(workspaceId: string) {
    const rows = await this.db.personRole.findMany({ where: { workspaceId }, select: { roleKey: true } });
    return new Set(rows.map((r) => r.roleKey));
  }
  private async family(id: string) {
    const f = UUID.test(id) ? await this.db.testFamily.findUnique({ where: { id } }) : null;
    if (!f || f.workspaceId !== (await this.ws.id())) fail("That test family does not exist (it may have been removed by a reset).", HttpStatus.NOT_FOUND);
    return f!;
  }
  private async combination(id: string) {
    const c = UUID.test(id) ? await this.db.combination.findUnique({ where: { id } }) : null;
    if (!c || c.workspaceId !== (await this.ws.id())) fail("That combination does not exist (it may have been removed by a reset).", HttpStatus.NOT_FOUND);
    return c!;
  }
  private async key(id: string) {
    const k = UUID.test(id) ? await this.db.answerKey.findUnique({ where: { id }, include: { family: true, combination: true, runs: { orderBy: { ranAt: "desc" }, take: 1 } } }) : null;
    if (!k || k.workspaceId !== (await this.ws.id())) fail("That answer key does not exist (it may have been removed by a reset).", HttpStatus.NOT_FOUND);
    return k!;
  }
  private draft = async (workspaceId: string, combinationId: string): Promise<Snapshot> => (await buildSnapshot(this.db, workspaceId, combinationId, "draft")).snapshot;
  /** The form's field list (the edition's inventory file), as the filler reads it (api/src/fill.ts writeForm). */
  private inventory(s: Snapshot, form: string): Inventory {
    const inv = this.inventoryOrNull(s, form);
    if (!inv) fail(`${form}'s form field list is not recorded, so its map cannot be tested.`, HttpStatus.UNPROCESSABLE_ENTITY);
    return inv!;
  }
  private inventoryOrNull(s: Snapshot, form: string, edition?: string | null): Inventory | null { return fieldListOf(s, form, edition)?.inv ?? null; }
  /** G2 (Devin on #568, 3rd pass): the field list of the edition asked for, never another edition's: an edition the
   *  combination has whose list is not recorded is refused in words (422); an edition it lacks, or none named, reads
   *  the form's first map's list as before. */
  private listFor(s: Snapshot, form: string, edition: string | null): Inventory {
    const has = edition && (s.field_maps as { form_number: string; form_edition?: string; channel?: string }[]).some((m) => m.form_number === form && m.form_edition === edition && m.channel !== "ONLINE");
    if (!has) return this.inventory(s, form);
    const inv = this.inventoryOrNull(s, form, edition);
    if (!inv) fail(`${form} (${edition})'s form field list is not recorded, so its map cannot be tested.`, HttpStatus.UNPROCESSABLE_ENTITY);
    return inv!;
  }

  // ------------------------------------------------------------------------------------------------ families (BR-1)
  async families() {
    const rows = await this.db.testFamily.findMany({ where: { workspaceId: await this.ws.id() }, orderBy: { familyKey: "asc" } });
    return { sample: SAMPLE_WORDS, families: rows.map(familyView) };
  }

  async createFamily(actor: Actor, body: unknown) {
    need(actor, "author");
    const workspaceId = await this.ws.id();
    const { family, errors } = checkFamily(parse(FamilyBody, body), await this.fields(workspaceId), await this.roles(workspaceId));
    if (errors.length) invalid(errors);
    if (await this.db.testFamily.findUnique({ where: { workspaceId_familyKey: { workspaceId, familyKey: family.key } } })) invalid([{ field: "key", message: `A family with the key "${family.key}" exists already: choose another key or change that family.` }]);
    const r = await this.db.testFamily.create({ data: { workspaceId, familyKey: family.key, label: family.label, referenceDate: family.reference_date, people: family.people, facts: family.facts as object[], noneApply: family.none_apply, updatedBy: actor.id } });
    await this.audit.log(workspaceId, actor.id, "created", "answer-key family", family.key, `${actor.name} wrote the test family "${family.key}": ${family.people.length} people, ${family.facts.length} facts (made up, Sample)`);
    return familyView(r);
  }

  /** BR-8: saved at the version read. A family change returns every signed key that uses it to Draft: the expert signed
   *  the values for the family as it was (BR-7). */
  async updateFamily(actor: Actor, id: string, body: unknown) {
    need(actor, "author");
    const f = await this.family(id);
    const b = parse(FamilyBody, body) as Record<string, unknown>;
    const { family, errors } = checkFamily({ ...b, key: f.familyKey }, await this.fields(f.workspaceId), await this.roles(f.workspaceId));
    if (errors.length) invalid(errors);
    if (b.version !== f.version) conflict(`${nameOf(f.updatedBy)} saved this family at ${f.updatedAt.toISOString().slice(11, 16)} UTC. Reload their version, then make your change again.`, { current: familyView(f) });
    const signed = await this.db.answerKey.count({ where: { familyId: id, state: "SIGNED" } });
    const reason = typeof b.reason === "string" && !unclean(b.reason) && !blank(b.reason) && !/[\n\r]/.test(b.reason) && [...b.reason.trim()].length <= 300 ? b.reason.trim() : "";
    if (signed && !reason) invalid([{ field: "reason", message: `${signed} signed answer key${signed === 1 ? " uses" : "s use"} this family: give a one-line reason; ${signed === 1 ? "it goes" : "they go"} back to Draft for the expert to sign again.` }]);
    const done = await this.db.$transaction(async (tx) => {
      const n = await tx.testFamily.updateMany({ where: { id, version: f.version }, data: { label: family.label, referenceDate: family.reference_date, people: family.people, facts: family.facts as object[], noneApply: family.none_apply, version: { increment: 1 }, updatedBy: actor.id } });
      if (!n.count) return false;
      // Break M1, review minor 5: the family's keys are locked first, so a sign cannot land between the count and the
      // change (it waits, then finds a new version and is refused); one statement unsigns and versions every key.
      const locked = await tx.$queryRaw<{ state: string }[]>(Prisma.sql`SELECT "state" FROM "answer_key" WHERE "family_id" = ${id}::uuid FOR UPDATE`);
      if (!reason && locked.some((k) => k.state === "SIGNED")) throw new HttpException({ type: "https://expatready.local/problems/validation", title: "Some details need fixing", status: 400, detail: "A key using this family was signed a moment ago: give a one-line reason; it goes back to Draft for the expert to sign again.", errors: [{ field: "reason", message: "A key using this family was signed a moment ago: give a one-line reason." }] }, HttpStatus.BAD_REQUEST);
      // Every key of the family gets a new version, so its last run reads "Not run" (BR-5): the facts changed.
      await tx.$executeRaw(Prisma.sql`UPDATE "answer_key" SET "version" = "version" + 1, "change_reason" = CASE WHEN "state" = 'SIGNED' THEN ${`Family changed: ${reason}`} ELSE "change_reason" END, "state" = 'DRAFT', "signed_by_user_id" = NULL, "signed_at" = NULL, "updated_by" = ${actor.id}, "updated_at" = now() WHERE "family_id" = ${id}::uuid`);
      return true;
    });
    if (!done) conflict("Someone saved this family a moment ago. Reload their version, then make your change again.");
    await this.audit.log(f.workspaceId, actor.id, "updated", "answer-key family", f.familyKey, `${actor.name} changed the test family "${f.familyKey}"${signed ? `; ${signed} signed key${signed === 1 ? "" : "s"} back to Draft` : ""}`, reason ? { reason } : undefined);
    return familyView((await this.family(id)) as FamilyRow);
  }

  /** The family editor's field picker (BR-1): the library's fields a fact may name (none retired), with the value type
   *  and, for a choice field, its answer list's values. /library/fields names no answer list, so it is not reused. */
  async libraryFields() {
    const workspaceId = await this.ws.id();
    const [rows, lists, phones] = await Promise.all([this.db.canonicalField.findMany({ where: { workspaceId } }), this.db.answerList.findMany({ where: { workspaceId }, include: { values: { orderBy: { sortOrder: "asc" } } } }),
      // Devin review: a phone is stored as text in the library but written as parts ({country_code, number}); the
      // forms that read it part by part say so in their transform ("phone:…", "phone_part:…").
      // Devin review (2nd pass): after an optional "select primary phone;" choice (engine/field-format.ts writesParts).
      this.db.formFieldMap.findMany({ where: { workspaceId, OR: [{ transform: { contains: "phone" } }, { transform: { contains: "address_part" } }] }, select: { canonicalFieldKey: true, transform: true } })]);
    const byParts = new Set(phones.filter((p) => writesParts(p.transform)).map((p) => p.canonicalFieldKey).filter(Boolean));
    const values = new Map(effective(lists, (l) => l.answerListKey, "draft").map((l) => [l.answerListKey, l.values.map((v) => ({ key: v.valueKey, label: v.label }))]));
    return {
      fields: effective(rows, (r) => r.canonicalFieldKey, "draft").filter((f) => f.status !== "RETIRED").sort((a, b) => a.canonicalFieldKey.localeCompare(b.canonicalFieldKey))
        .map((f) => ({ id: f.canonicalFieldKey, label: (f.labelChecked && f.label) || f.meaning, value_type: f.valueType, values: f.answerListKey ? values.get(f.answerListKey) ?? [] : null, parts: f.dataType === "COMPOSITE" || f.valueType === "address" || f.valueType === "phone" || byParts.has(f.canonicalFieldKey) })),
    };
  }

  /** Concept §4 (challenge M5 b): the Expected editor's boxes of one form's map in this combination's draft, read
   *  through the engine (keyBoxes); never a run's output. */
  async boxes(combinationId: string, form: unknown, edition?: unknown) {
    const c = await this.combination(combinationId);
    const ref = typeof form === "string" ? form.trim() : "";
    if (!ref) invalid([{ field: "form", message: "Name the form (?form=IMM 5257)." }]);
    const s = await this.draft(c.workspaceId, c.id);
    if (!pdfHas(s, ref)) fail(`${ref} has no PDF field map in this combination.`, HttpStatus.NOT_FOUND);
    // G2 (Devin on #568): ?edition= picks that edition's map and form field list (a combination may hold several).
    const ed = typeof edition === "string" && edition.trim() ? edition.trim() : null;
    const out = keyBoxes(s, ref, this.listFor(s, ref, ed), ed);
    if (!out) fail(`${ref} has no PDF field map of the edition ${ed} in this combination.`, HttpStatus.NOT_FOUND);
    return out!;
  }

  // ------------------------------------------------------------------------------------------------ keys (BR-2, BR-7)
  /** The combination's testable items (each PDF field map, the eligibility rules) × families, each with its state. */
  async list(combinationId: string) {
    const c = await this.combination(combinationId);
    const s = await this.draft(c.workspaceId, c.id);
    const items = [
      ...(s.field_maps as { form_number: string; form_edition: string; channel?: string; entries: unknown[] }[]).filter((m) => m.channel !== "ONLINE" && m.entries.length).map((m) => ({ item_kind: "field_map" as const, item_ref: m.form_number, label: `${m.form_number} field map`, edition: m.form_edition })),
      ...(s.eligibility?.gates?.length ? [{ item_kind: "rule_set" as const, item_ref: "eligibility", label: "Eligibility rules", edition: null }] : []),
    ];
    const keys = await this.db.answerKey.findMany({ where: { combinationId }, include: { family: true, runs: { orderBy: { ranAt: "desc" }, take: 1 } }, orderBy: { updatedAt: "asc" } });
    const fp = new Map(items.map((i) => [`${i.item_kind}|${i.item_ref}|${i.edition ?? ""}`, fingerprintOf(s, i.item_kind, i.item_ref, i.item_kind === "field_map" ? this.inventoryOrNull(s, i.item_ref, i.edition) : null, { edition: i.edition })]));
    return {
      combination: { id: c.id, label: c.label }, sample: SAMPLE_WORDS, scoring: NO_SCORING, items,
      keys: keys.map((k) => { const ed = editionOf(k); return this.keyView(k, k.runs[0] ?? null, fp.get(`${k.itemKind}|${k.itemRef}|${ed ?? ""}`) ?? fingerprintOf(s, k.itemKind as ItemKind, k.itemRef, null, { edition: ed })); }),
    };
  }

  private keyView(k: { id: string; itemKind: string; itemRef: string; expected: unknown; state: string; version: number; signedByUserId: string | null; signedAt: Date | null; changeReason: string | null; updatedBy: string; updatedAt: Date; family: FamilyRow }, last: { result: string; itemFingerprint: string; inputsFingerprint: string; keyVersion: number; passed: number; failed: number; ranBy: string; ranAt: Date; lines?: unknown } | null, now: ReturnType<typeof fingerprintOf>, withLines = false) {
    const st = runState(last, now, k.version);
    return {
      id: k.id, item_kind: k.itemKind, item_ref: k.itemRef, family: { id: k.family.id, key: k.family.familyKey, label: k.family.label }, expected: k.expected, version: k.version,
      state: k.state, sample: k.state === "SIGNED" ? null : SAMPLE_WORDS, signed_by: nameOf(k.signedByUserId), signed_at: at(k.signedAt), change_reason: k.changeReason, saved_by: nameOf(k.updatedBy), saved_at: at(k.updatedAt),
      run: { state: st.state, why: st.why, last: last ? { result: last.result, passed: last.passed, failed: last.failed, ran_by: nameOf(last.ranBy), ran_at: at(last.ranAt), ...(withLines ? { lines: last.lines } : {}) } : null },
    };
  }

  async get(id: string) {
    const k = await this.key(id);
    const s = await this.draft(k.workspaceId, k.combinationId);
    return this.keyView(k, k.runs[0] ?? null, fingerprintOf(s, k.itemKind as ItemKind, k.itemRef, k.itemKind === "field_map" ? this.inventoryOrNull(s, k.itemRef, editionOf(k)) : null, { edition: editionOf(k) }), true);
  }

  /** Challenge M3 (SA-1B-296 r2: "entered and signed by the expert"): the expert or the author enters expected values. */
  private writer(actor: Actor) { if (!holds(actor, "author") && !holds(actor, "sme")) fail(`${actor.name} (simulated) does not hold the author or the immigration expert duty`, HttpStatus.FORBIDDEN); }

  async create(actor: Actor, combinationId: string, body: unknown) {
    this.writer(actor);
    const c = await this.combination(combinationId);
    if (c.retiredAt) fail(`"${c.label}" is retired: no new answer key is written for it.`, HttpStatus.CONFLICT);
    const b = parse(KeyCreateBody, body) as Record<string, unknown>;
    const kind = b.item_kind as ItemKind, ref = typeof b.item_ref === "string" ? b.item_ref.trim() : "";
    if (!(ITEM_KINDS as readonly string[]).includes(kind)) invalid([{ field: "item_kind", message: "Choose what the key tests: field_map (a form's field map) or rule_set (the eligibility rules)." }]);
    if (typeof b.family_id !== "string" || !UUID.test(b.family_id)) invalid([{ field: "family_id", message: "Choose the test family (its id)." }]);
    const f = await this.family(b.family_id as string);
    const s = await this.draft(c.workspaceId, c.id);
    // Break m2: a map key needs the form's field list (it says which boxes a person fills), as a run does.
    const { expected, errors } = checkExpected(s, kind, ref, familyOf(f), b.expected, kind === "field_map" && pdfHas(s, ref) ? this.listFor(s, ref, editionIn(b.expected)) : null);
    if (errors.length) invalid(errors);
    if (await this.db.answerKey.findUnique({ where: { familyId_combinationId_itemKind_itemRef: { familyId: f.id, combinationId, itemKind: kind, itemRef: ref } } })) invalid([{ field: "family_id", message: `The family "${f.familyKey}" already has a key for ${itemWords(kind, ref)} here: change that one.` }]);
    const k = await this.db.answerKey.create({ data: { workspaceId: c.workspaceId, familyId: f.id, combinationId, itemKind: kind, itemRef: ref, expected: expected as object, updatedBy: actor.id } });
    await this.audit.log(c.workspaceId, actor.id, "created", "answer key", `${f.familyKey}:${ref}`, `${actor.name} wrote the expected values of the family "${f.familyKey}" for ${itemWords(kind, ref)} (Draft, Sample)`, undefined, c.id);
    return this.get(k.id);
  }

  /** BR-7, BR-8: a change at the version read; a signed key needs a reason and returns to Draft. */
  async update(actor: Actor, id: string, body: unknown) {
    this.writer(actor);
    const k = await this.key(id);
    if (k.combination.retiredAt) fail(`"${k.combination.label}" is retired: its answer keys are not changed.`, HttpStatus.CONFLICT);
    const b = parse(KeyUpdateBody, body) as Record<string, unknown>;
    const s = await this.draft(k.workspaceId, k.combinationId);
    // Review minor 1 (BR-6): a change that names no edition keeps the key's own; it never moves to the map's edition.
    const given = obj(b.expected), kept = k.itemKind === "field_map" && !(typeof given.edition === "string" && given.edition.trim()) ? { ...given, edition: (k.expected as MapExpected).edition } : b.expected;
    const { expected, errors } = checkExpected(s, k.itemKind as ItemKind, k.itemRef, familyOf(k.family), kept, k.itemKind === "field_map" && pdfHas(s, k.itemRef) ? this.listFor(s, k.itemRef, editionIn(kept)) : null);
    if (errors.length) invalid(errors);
    if (b.version !== k.version) conflict(`${nameOf(k.updatedBy)} saved these expected values at ${k.updatedAt.toISOString().slice(11, 16)} UTC. Reload their version, then make your change again.`);
    const why = changeProblem(k.state, b.reason);
    if (why) invalid([{ field: "reason", message: why }]);
    // Break m6: a signed key "changed" to the very same values keeps its signature (nothing to sign again).
    if (k.state === "SIGNED" && canonical(expected as never) === canonical(k.expected as never)) return this.get(id);
    const reason = k.state === "SIGNED" ? String(b.reason).trim() : null;
    // Break m1: the state read is part of the guard, so a sign landing during this change makes it a 409, never an
    // unsigning without a reason.
    const n = await this.db.answerKey.updateMany({ where: { id, version: k.version, state: k.state }, data: { expected: expected as object, version: { increment: 1 }, state: "DRAFT", signedByUserId: null, signedAt: null, changeReason: reason ?? k.changeReason, updatedBy: actor.id } });
    if (!n.count) conflict("Someone saved these expected values a moment ago. Reload their version, then make your change again.");
    await this.audit.log(k.workspaceId, actor.id, "updated", "answer key", `${k.family.familyKey}:${k.itemRef}`, `${actor.name} changed the expected values of the family "${k.family.familyKey}" for ${itemWords(k.itemKind, k.itemRef)}${reason ? " (were signed: back to Draft)" : ""}`, reason ? { reason } : undefined, k.combinationId);
    return this.get(id);
  }

  /** BR-7: the expert signs the version shown. */
  async sign(actor: Actor, id: string, body: unknown) {
    const k = await this.key(id);
    if (k.combination.retiredAt) fail(`"${k.combination.label}" is retired: its answer keys are not signed.`, HttpStatus.CONFLICT);
    const why = signProblem(k, actor, parse(SignBody, body).version);
    if (why) throw new HttpException({ type: "https://expatready.local/problems/sign", title: "Not signed", status: holds(actor, "sme") ? 409 : 403, detail: why }, holds(actor, "sme") ? HttpStatus.CONFLICT : HttpStatus.FORBIDDEN);
    const n = await this.db.answerKey.updateMany({ where: { id, version: k.version, state: "DRAFT" }, data: { state: "SIGNED", signedByUserId: actor.id, signedAt: new Date() } }); // the PUT guard reads the state too (break m1)
    if (!n.count) conflict("These expected values changed a moment ago: reload, read them again, then sign.");
    await this.audit.log(k.workspaceId, actor.id, "signed", "answer key", `${k.family.familyKey}:${k.itemRef}`, `${actor.name} signed the expected values of the family "${k.family.familyKey}" for ${itemWords(k.itemKind, k.itemRef)}`, undefined, k.combinationId);
    return this.get(id);
  }

  /** BR-3…BR-6: a run on the combination's draft, stored with every line and what it read. */
  async run(actor: Actor, id: string) {
    this.writer(actor);
    const k = await this.key(id);
    const s = await this.draft(k.workspaceId, k.combinationId);
    const family = familyOf(k.family);
    const r = k.itemKind === "field_map" ? runFieldMap(s, family, k.itemRef, this.inventoryOrNull(s, k.itemRef, editionOf(k)) ?? this.inventory(s, k.itemRef), k.expected as MapExpected) : runRuleSet(s, family, k.expected as RuleExpected);
    const row = await this.db.answerKeyRun.create({ data: { workspaceId: k.workspaceId, keyId: k.id, keyVersion: k.version, itemFingerprint: r.fingerprint.item, inputsFingerprint: r.fingerprint.inputs, result: r.result, lines: r.lines as object[], passed: r.passed, failed: r.failed, ranBy: actor.id } });
    await this.audit.log(k.workspaceId, actor.id, "ran", "answer key", `${k.family.familyKey}:${k.itemRef}`, `${actor.name} ran the family "${k.family.familyKey}" against ${itemWords(k.itemKind, k.itemRef)}: ${r.result === "PASSED" ? "passed" : "failed"}, ${r.passed} of ${r.passed + r.failed} values`, undefined, k.combinationId);
    return { id: row.id, result: r.result, passed: r.passed, failed: r.failed, lines: r.lines, key: this.keyView(k, row, r.fingerprint) };
  }
}

type H = string | undefined;
@Controller("api")
export class AnswerKeysController {
  constructor(@Inject(AnswerKeys) private readonly k: AnswerKeys) {}
  @Get("answer-keys/families") families(@Headers("x-actor") a: H) { readerOf(a); return this.k.families(); }
  @Post("answer-keys/families") createFamily(@Headers("x-actor") a: H, @Body() b: unknown) { return this.k.createFamily(readerOf(a), b); }
  @Put("answer-keys/families/:id") updateFamily(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.k.updateFamily(readerOf(a), id, b); }
  @Get("answer-keys/fields") fields(@Headers("x-actor") a: H) { readerOf(a); return this.k.libraryFields(); }
  @Get("combinations/:id/answer-keys/boxes") boxes(@Headers("x-actor") a: H, @Param("id") id: string, @Query("form") form: unknown, @Query("edition") edition: unknown) { readerOf(a); return this.k.boxes(id, form, edition); }
  @Get("combinations/:id/answer-keys") list(@Headers("x-actor") a: H, @Param("id") id: string) { readerOf(a); return this.k.list(id); }
  @Post("combinations/:id/answer-keys") create(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.k.create(readerOf(a), id, b); }
  @Get("answer-keys/:id") get(@Headers("x-actor") a: H, @Param("id") id: string) { readerOf(a); return this.k.get(id); }
  @Put("answer-keys/:id") update(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.k.update(readerOf(a), id, b); }
  @Post("answer-keys/:id/sign") @HttpCode(200) sign(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.k.sign(readerOf(a), id, b); }
  @Post("answer-keys/:id/run") @HttpCode(200) run(@Headers("x-actor") a: H, @Param("id") id: string) { return this.k.run(readerOf(a), id); }
}

