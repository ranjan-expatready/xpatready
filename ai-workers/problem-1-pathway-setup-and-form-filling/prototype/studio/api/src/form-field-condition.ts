// B86 (QA-237, C4.11; concept product/screens/B86-form-field-condition): the door by which a form field comes to hold its
// question's condition in a form the rule can read. An author reads the form field's own words and says they say the same
// as the condition; a second person approves on To review; at approval the form field gets a draft version with the
// condition, copied by the server, never typed. The same path as a question's condition (question-condition.ts). It says
// "these say the same", not "this is correct": every condition stays Sample, Unconfirmed: expert (AGENTS rule 4).
import { Body, Controller, Get, Headers, HttpException, HttpStatus, Inject, Injectable, Param, Post, Query } from "@nestjs/common";
import { Prisma, type LibraryChange } from "@prisma/client";
import { z } from "zod";
import type { FormFieldRow, FormFieldState, FormFieldsOfCombination, FormFieldsOfQuestion } from "../../contracts/form-field-conditions.ts";
import { problemFromZod } from "../../contracts/programs.ts";
import { isWorkedOutYesNo, plainWords, showCondition, whenWords } from "../../engine/form-field-condition.ts";
import { buildSnapshot, effective, type Snapshot } from "../../engine/snapshot.ts";
import { factWords } from "../../engine/sources.ts";
import { bareCond } from "../../engine/validate.ts";
import { actorOf, Audit, Db, need, readerOf, revise, strip, Workspace, type Actor } from "./core.ts";

export const FORM_FIELD_KIND = "form_field_condition", FORM_FIELD_ACTION = "SET_FORM_FIELD_CONDITION";
/** BR-7: an approved change never blocks a new one, so a mistake can be undone before any release. */
const BLOCKING = ["WAITING", "RETURNED"];
type Client = Pick<Prisma.TransactionClient, "formFieldMap" | "combination" | "combinationForm" | "sectionQuestion">;
const problem = (status: number, title: string, detail: string) =>
  new HttpException({ type: `https://expatready.local/problems/${title.toLowerCase().replace(/[^a-z]+/g, "-")}`, title, status, detail }, status);
const sameCondition = (a: unknown, b: unknown) => bareCond(a) !== null && bareCond(a) === bareCond(b);
const keyOf = (formEditionId: string, dataPath: string) => `${formEditionId}:${dataPath}`;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

const NO_WORDS = "This form field's map has no words about when it is filled, so nothing says it is conditional, and it cannot be confirmed. This combination stays held until the form can carry the condition, or the condition is removed.";
const WORKED_OUT = "This Yes/No is worked out from other answers and must write No when the answer is No, so it cannot be filled only under this condition. This combination stays held until the form can carry the condition, or the condition is removed.";

/** Lead's ruling 3 on #1053: what approving this holds elsewhere, in words: the other combinations that ask this question and
 *  their form fields that read it without this condition. A combination cannot be released until they agree (the rule). */
export async function spreadOf(db: Client, workspaceId: string, fact: string, tree: unknown, except: string | null | undefined): Promise<{ combinations: number; form_fields: number; words: string | null }> {
  if (!(await db.sectionQuestion.count({ where: { workspaceId, lineageKey: fact } }))) return { combinations: 0, form_fields: 0, words: null };
  // A combination asks a question its forms read (engine/snapshot.ts), not only one in a section it picked.
  const rows = effective(await db.formFieldMap.findMany({ where: { workspaceId, canonicalFieldKey: fact }, include: { edition: { select: { govFormDefId: true } } } }), (m) => `${m.formEditionId}|${m.dataPath}`, "draft").filter((m) => m.outcome === "mapped" && !sameCondition(m.conditionRule, tree));
  const forms = [...new Set(rows.map((r) => r.edition.govFormDefId))];
  if (!forms.length) return { combinations: 0, form_fields: 0, words: null };
  const open = new Set((await db.combination.findMany({ where: { workspaceId, retiredAt: null }, select: { id: true } })).map((c) => c.id));
  const lines = await db.combinationForm.findMany({ where: { workspaceId, govFormDefId: { in: forms } }, orderBy: { version: "desc" }, select: { combinationId: true, lineageKey: true, status: true, govFormDefId: true } });
  const newest = new Map<string, (typeof lines)[number]>();
  for (const l of lines) if (!newest.has(`${l.combinationId}|${l.lineageKey}`)) newest.set(`${l.combinationId}|${l.lineageKey}`, l);
  const live = [...newest.values()].filter((l) => l.status !== "RETIRED" && l.combinationId !== except && open.has(l.combinationId));
  const filed = new Set(live.map((l) => l.govFormDefId)), held = new Set(live.map((l) => l.combinationId)), fields = rows.filter((r) => filed.has(r.edition.govFormDefId)).length;
  if (!held.size) return { combinations: 0, form_fields: 0, words: null };
  return { combinations: held.size, form_fields: fields, words: `${plural(held.size, "other combination")} ask${held.size === 1 ? "s" : ""} this question, and ${plural(fields, "form field")} there ${fields === 1 ? "does" : "do"} not hold this condition: ${held.size === 1 ? "it" : "they"} cannot be released until ${fields === 1 ? "that form field holds" : "those form fields hold"} it, or the condition is removed.` };
}

/** What the second person compares on To review. */
export function formFieldView(c: Pick<LibraryChange, "matches" | "reason">) {
  const m = (c.matches ?? {}) as { form?: string; edition?: string; caption?: string; words?: string; sentence?: string; clear?: boolean; spread?: string | null };
  return { form: m.form ?? "", edition: m.edition ?? "", caption: m.caption ?? "", words: m.words ?? "", sentence: m.sentence ?? "", clear: !!m.clear, spread: m.spread ?? null, reason: c.reason ?? "" };
}

/** At approval (lifecycle afterApprove): the form field gets a draft version with the condition, checked again first. */
export async function applyFormFieldCondition(db: Db, audit: Audit, actor: Actor, c: LibraryChange) {
  const m = c.matches as { formEditionId: string; dataPath: string; fact: string; rawWords: string | null; before: unknown; after: unknown; form: string; edition: string };
  const rows = await db.formFieldMap.findMany({ where: { formEditionId: m.formEditionId, dataPath: m.dataPath } });
  const now = effective(rows, (x) => x.dataPath, "draft")[0];
  if (!now || now.outcome !== "mapped" || now.canonicalFieldKey !== m.fact || (now.condition ?? null) !== (m.rawWords ?? null)) throw problem(HttpStatus.CONFLICT, "Changed since", "This form field or its words changed after this was proposed, so nothing was changed. Return it; it can be proposed again.");
  if (JSON.stringify(now.conditionRule ?? null) !== JSON.stringify(m.before ?? null)) throw problem(HttpStatus.CONFLICT, "Changed since", "What this form field holds changed after this was proposed, so nothing was changed. Return it; it can be proposed again.");
  if (m.after && isWorkedOutYesNo(now.transform)) throw problem(HttpStatus.CONFLICT, "Changed since", `${WORKED_OUT} Nothing was changed. Return it.`);
  // Break m3: a question whose condition changed since is said now, not left as a rule that does nothing.
  const q = await db.sectionQuestion.findMany({ where: { workspaceId: c.workspaceId, lineageKey: m.fact }, orderBy: { version: "desc" } });
  const own = q.find((r) => r.status === "DRAFT") ?? q.find((r) => r.status === "PUBLISHED");
  if (m.after && own?.predicateJson && !sameCondition(own.predicateJson, m.after)) throw problem(HttpStatus.CONFLICT, "Changed since", "The question's condition changed after this was proposed, so nothing was changed. Return it; it can be proposed again.");
  // Break M1: the draft is the proposer's, not the approver's: approving is not authoring, or the second person, the one who holds the release duty, could never release it (BR-14).
  await revise(db.formFieldMap, rows, { conditionRule: m.after ? (m.after as Prisma.InputJsonValue) : Prisma.DbNull }, c.proposedBy, strip);
  await audit.log(c.workspaceId, actor.id, "approved", "form field", m.form, `${actor.name} approved: ${c.label ?? c.key}. It goes out with the next release that carries ${m.edition}.`, undefined, c.combinationId ?? undefined);
}

/** At a release (publishLibraryChanges): an approved change whose form field draft this release published is released. */
export async function releaseFormFieldCondition(tx: Prisma.TransactionClient, workspaceId: string, pack: number) {
  const out: { kind: string; key: string; label: string; action: string }[] = [];
  for (const c of await tx.libraryChange.findMany({ where: { workspaceId, kind: FORM_FIELD_KIND, status: "APPROVED" } })) {
    const m = c.matches as { formEditionId: string; dataPath: string };
    if (await tx.formFieldMap.count({ where: { formEditionId: m.formEditionId, dataPath: m.dataPath, status: "DRAFT" } })) continue;
    await tx.libraryChange.update({ where: { id: c.id }, data: { status: "RELEASED", releasedIn: pack } });
    out.push({ kind: c.kind, key: c.key, label: c.label ?? c.key, action: c.action });
  }
  return out;
}

const Confirm = z.object({ combinationId: z.string().uuid(), fact: z.string().min(1).max(200), formEditionId: z.string().uuid(), dataPath: z.string().min(1).max(500), item: z.string().uuid().optional(), clear: z.boolean().optional(), reason: z.string().trim().min(3).max(300).optional() }).strict();

@Injectable()
export class FormFieldConditions {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Audit) private readonly audit: Audit, @Inject(Workspace) private readonly ws: Workspace) {}

  /** BR-1: the condition a form field is compared with: a waiting card's while it belongs to this combination and targets
   *  this question and the library holds no condition or the same one; else the question's own SHOW condition. Never typed. */
  private async conditionOf(workspaceId: string, combinationId: string, fact: string, s: Snapshot, item?: string): Promise<{ tree: unknown; sentence: string | null; why: string | null }> {
    const placed = (s.placements as { fact: string; condition?: unknown; condition_effect?: string | null }[]).find((p) => p.fact === fact);
    const own = showCondition(s.placements as never, fact);
    if (placed?.condition && !own) return { tree: null, sentence: null, why: placed.condition_effect === "HIDE" ? "This question is hidden under its condition, and a form field cannot be filled only then. Change the condition to \"asked only when\", or remove it." : "This question's condition does not hide it (it is not \"asked only when\"), so no form field needs to hold it." };
    if (item) {
      const it = typeof item === "string" && /^[0-9a-f-]{36}$/i.test(item) ? await this.db.proposalItem.findUnique({ where: { id: item } }) : null;
      if (!it || it.workspaceId !== workspaceId) throw problem(404, "Not found", "That proposal does not exist (it may have been removed by a reset).");
      const p = it.payload as { kind?: string; target?: { kind?: string; key?: string }; condition?: { tree?: unknown; sentence?: string } } | null;
      if (it.combinationId !== combinationId || it.kind !== "condition" || p?.target?.key !== fact || !p.condition?.tree) throw problem(409, "Not this question", "That proposal is not a condition on this question of this combination, so nothing was changed.");
      if (it.status !== "waiting") throw problem(409, "Already decided", "That proposal has been decided, so its condition is not used here. Once the question holds it, confirm the form field on Review and release.");
      if (own && !sameCondition(own, p.condition.tree)) throw problem(409, "A different condition", "The library's question already holds a different condition, so this card's cannot be confirmed. Decide the card first.");
      return { tree: p.condition.tree, sentence: whenWords(p.condition.tree, (f) => factWords(s, f)) ?? "its question's condition holds", why: null };
    }
    if (!own) return { tree: null, sentence: null, why: "This question has no condition yet, so there is nothing to compare this form field with." };
    return { tree: own, sentence: whenWords(own, (f) => factWords(s, f)) ?? "its question's condition holds", why: null };
  }

  /** The form fields of this combination's forms that read the answer, each with its own words (every edition, as the rule). */
  private async rowsOf(workspaceId: string, combinationId: string, fact: string, s: Snapshot, tree: unknown): Promise<FormFieldRow[]> {
    const maps = (s.field_maps as { form_number: string; form_edition: string; entries: { data_path: string; caption?: string | null; outcome?: string; fact?: string | null; condition?: string | null; transform?: string | null; condition_rule?: unknown }[] }[]).filter((m) => m.entries.some((e) => e.fact === fact && e.outcome === "mapped"));
    const eds = await this.db.formEdition.findMany({ where: { workspaceId, editionLabel: { in: maps.map((m) => m.form_edition) } }, select: { id: true, editionLabel: true, form: { select: { formKey: true } } } });
    const open = await this.db.libraryChange.findMany({ where: { workspaceId, kind: FORM_FIELD_KIND, status: { in: BLOCKING } }, select: { id: true, key: true, status: true } });
    const decider = (tree as { field?: unknown } | null)?.field;
    return maps.flatMap((m) => m.entries.filter((e) => e.fact === fact && e.outcome === "mapped").map((e) => {
      const formEditionId = eds.find((x) => x.editionLabel === m.form_edition && x.form.formKey === m.form_number)?.id ?? "";
      const pending = open.find((c) => c.key === keyOf(formEditionId, e.data_path));
      const plain = e.condition ? plainWords(e.condition, m.entries, (f) => factWords(s, f), fact) : { text: "", names: [] as string[] };
      const state: FormFieldState = pending ? (pending.status === "RETURNED" ? "returned" : "waiting") : e.condition_rule ? (tree && sameCondition(e.condition_rule, tree) ? "confirmed" : "different") : isWorkedOutYesNo(e.transform) ? "worked_out" : !e.condition ? "no_words" : "not_confirmed";
      const elsewhere = typeof decider === "string" && plain.names.length && !plain.names.includes(decider) ? plain.names[0] : null;
      return { form: m.form_number, edition: m.form_edition, form_edition_id: formEditionId, data_path: e.data_path, caption: e.caption ?? "", words: plain.text, state, change_id: pending?.id ?? null,
        why: state === "no_words" ? NO_WORDS : state === "worked_out" ? WORKED_OUT : null,
        warning: state === "not_confirmed" && elsewhere ? `Its words name "${factWords(s, elsewhere)}", not this condition's deciding question "${factWords(s, decider as string)}". Check before saying they are the same.` : null,
        can_confirm: state === "not_confirmed" && !!tree, can_undo: state === "confirmed" || state === "different" };
    }));
  }

  /** Review and release's one request: every question of this combination with a SHOW condition that a form reads, or read
   *  by a form field holding a condition. */
  async listAll(combinationId: string): Promise<FormFieldsOfCombination> {
    const workspaceId = await this.ws.id();
    const c = /^[0-9a-f-]{36}$/i.test(combinationId) ? await this.db.combination.findUnique({ where: { id: combinationId } }) : null;
    if (!c || c.workspaceId !== workspaceId) throw problem(404, "Not found", "That combination does not exist (it may have been removed by a reset).");
    const { snapshot: s } = await buildSnapshot(this.db, workspaceId, combinationId, "draft");
    const entries = (s.field_maps as { entries: { fact?: string | null; outcome?: string; condition_rule?: unknown }[] }[]).flatMap((m) => m.entries.filter((e) => e.outcome === "mapped" && e.fact));
    // A HIDE condition too: the rule refuses it, and the panel says what to do (break n4).
    const hides = new Set((s.placements as { fact: string; condition?: unknown; condition_effect?: string | null }[]).filter((p) => p.condition && p.condition_effect === "HIDE").map((p) => p.fact));
    const facts = [...new Set(entries.filter((e) => e.condition_rule || hides.has(e.fact!) || showCondition(s.placements as never, e.fact!)).map((e) => e.fact!))].sort();
    const questions: FormFieldsOfQuestion[] = [];
    for (const fact of facts) {
      const cond = await this.conditionOf(workspaceId, combinationId, fact, s);
      const spread = cond.tree ? await spreadOf(this.db, workspaceId, fact, cond.tree, combinationId) : null;
      questions.push({ fact, question: factWords(s, fact), sentence: cond.sentence, why: cond.why, rows: await this.rowsOf(workspaceId, combinationId, fact, s, cond.tree), spread: spread?.words ?? null });
    }
    return { questions };
  }

  async list(combinationId: string, fact: string, item?: string): Promise<FormFieldsOfQuestion> {
    const workspaceId = await this.ws.id();
    const c = /^[0-9a-f-]{36}$/i.test(combinationId) ? await this.db.combination.findUnique({ where: { id: combinationId } }) : null;
    if (!c || c.workspaceId !== workspaceId) throw problem(404, "Not found", "That combination does not exist (it may have been removed by a reset).");
    const { snapshot: s } = await buildSnapshot(this.db, workspaceId, combinationId, "draft");
    if (!(s.canonical_fields as { id: string }[]).some((f) => f.id === fact)) throw problem(404, "Not found", "This combination does not read that question.");
    const cond = await this.conditionOf(workspaceId, combinationId, fact, s, item);
    const rows = await this.rowsOf(workspaceId, combinationId, fact, s, cond.tree);
    const spread = cond.tree ? await spreadOf(this.db, workspaceId, fact, cond.tree, combinationId) : null;
    return { fact, question: factWords(s, fact), sentence: cond.sentence, why: cond.why, rows, spread: spread?.words ?? null };
  }

  /** BR-1 to BR-3, BR-7: one waiting library change, nothing applied before a second person approves. */
  async propose(actor: Actor, body: unknown) {
    need(actor, "author");
    const parsed = Confirm.safeParse(body);
    if (!parsed.success) throw problem(HttpStatus.BAD_REQUEST, "Some details need fixing", problemFromZod(parsed.error).detail ?? "The request is not valid.");
    const b = parsed.data, workspaceId = await this.ws.id();
    const c = await this.db.combination.findUnique({ where: { id: b.combinationId } });
    if (!c || c.workspaceId !== workspaceId) throw problem(404, "Not found", "That combination does not exist (it may have been removed by a reset).");
    const { snapshot: s } = await buildSnapshot(this.db, workspaceId, c.id, "draft");
    const cond = b.clear ? { tree: null, sentence: null, why: null } : await this.conditionOf(workspaceId, c.id, b.fact, s, b.item);
    if (!b.clear && !cond.tree) throw problem(409, "No condition to hold", `${cond.why} Nothing was changed.`);
    const rows = await this.rowsOf(workspaceId, c.id, b.fact, s, cond.tree);
    const row = rows.find((r) => r.form_edition_id === b.formEditionId && r.data_path === b.dataPath);
    if (!row) throw problem(404, "Not found", "This combination's forms have no such form field reading that question.");
    if (row.state === "waiting" || row.state === "returned") throw problem(409, "Already waiting", "A change of this form field already waits on To review. Decide or withdraw it first.");
    if (b.clear ? !row.can_undo : row.state === "confirmed") throw problem(409, "Nothing changes", b.clear ? "This form field holds no condition, so there is nothing to take off." : "This form field already holds this condition.");
    if (!b.clear && !row.can_confirm) throw problem(409, row.state === "different" ? "A different condition" : "Cannot be confirmed", row.why ?? "This form field holds a different condition: undo that first, then confirm this one. Nothing was changed.");
    const rawRows = await this.db.formFieldMap.findMany({ where: { formEditionId: b.formEditionId, dataPath: b.dataPath } });
    const raw = effective(rawRows, (x) => x.dataPath, "draft")[0];
    // Break m8: taking a rule off holds whoever asks this question under its condition, so the second person is told that too.
    const spread = cond.tree ? await spreadOf(this.db, workspaceId, b.fact, cond.tree, c.id) : { words: showCondition(s.placements as never, b.fact) ? `Taking it off holds every combination that asks this question and files ${row.form}: they cannot be released until the form field holds the condition again, or the condition is removed.` : null };
    const name = factWords(s, b.fact), field = row.caption || "a form field";
    const label = (b.clear ? `${row.form} · ${field}: filled whenever the form applies again` : `${row.form} · ${field}: filled only when ${cond.sentence ?? "its question is asked"}`).slice(0, 300);
    const key = keyOf(b.formEditionId, b.dataPath);
    return this.db.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`select pg_advisory_xact_lock(hashtext($1))`, `form_field_condition:${workspaceId}:${key}`);
      if (await tx.libraryChange.findFirst({ where: { workspaceId, kind: FORM_FIELD_KIND, key, status: { in: BLOCKING } } })) throw problem(409, "Already waiting", "A change of this form field already waits on To review. Decide or withdraw it first.");
      // BR-7 (break B1): an approved change not released yet is closed here: what it applied stays on the form field until this
      // one is approved, and the library allows one waiting or approved change per form field (library_change_one_open).
      await tx.libraryChange.updateMany({ where: { workspaceId, kind: FORM_FIELD_KIND, key, status: "APPROVED" }, data: { status: "WITHDRAWN", decisionNote: "Replaced by a later change of this form field." } });
      const change = await tx.libraryChange.create({ data: { workspaceId, kind: FORM_FIELD_KIND, key, label, action: FORM_FIELD_ACTION, reason: b.reason ?? null, status: "WAITING", proposedBy: actor.id, appliedBy: actor.id, combinationId: c.id,
        matches: { fact: b.fact, question: name, formEditionId: b.formEditionId, dataPath: b.dataPath, form: row.form, edition: row.edition, caption: row.caption, words: row.words, rawWords: raw?.condition ?? null, before: raw?.conditionRule ?? null, after: (cond.tree ?? null) as Prisma.InputJsonValue, sentence: cond.sentence, clear: !!b.clear, spread: spread.words } as unknown as Prisma.InputJsonValue } });
      await this.audit.log(workspaceId, actor.id, "proposed", "form field", row.form, `${actor.name} proposed: ${label}. It waits for a second person.`, undefined, c.id);
      return { id: change.id, status: change.status, label, spread: spread.words };
    });
  }
}

@Controller("api")
export class FormFieldConditionsController {
  constructor(@Inject(FormFieldConditions) private readonly f: FormFieldConditions) {}
  @Get("combinations/:id/form-field-conditions") listAll(@Headers("x-actor") a: string | undefined, @Param("id") id: string) { readerOf(a); return this.f.listAll(id); }
  @Get("combinations/:id/questions/:fact/form-fields") list(@Headers("x-actor") a: string | undefined, @Param("id") id: string, @Param("fact") fact: string, @Query("item") item?: string) { readerOf(a); return this.f.list(id, fact, item); }
  @Post("library/form-field-conditions") propose(@Headers("x-actor") a: string | undefined, @Body() b: unknown) { return this.f.propose(actorOf(a), b); }
}
