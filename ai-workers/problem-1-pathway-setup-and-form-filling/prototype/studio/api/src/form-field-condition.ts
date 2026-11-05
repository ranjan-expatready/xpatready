// B86 (QA-237, C4.11; concept product/screens/B86-form-field-condition): the door by which a form field comes to hold its
// question's condition in a form the rule can read. An author reads the form field's own words and says they say the same
// as the condition; a second person approves on To review; at approval the form field gets a draft version with the
// condition, copied by the server, never typed. The same path as a question's condition (question-condition.ts). It says
// "these say the same", not "this is correct": every condition stays Sample, Unconfirmed: expert (AGENTS rule 4).
import { Body, Controller, Get, Headers, HttpException, HttpStatus, Inject, Injectable, Param, Post, Query } from "@nestjs/common";
import { Prisma, type LibraryChange } from "@prisma/client";
import { z } from "zod";
import { problemFromZod } from "../../contracts/programs.ts";
import { askedStep, blockFacts, decidingYes, isWorkedOutYesNo, plainWords, showCondition, whenWords, yesNoStep } from "../../engine/form-field-condition.ts";
import { buildSnapshot, effective, type Snapshot } from "../../engine/snapshot.ts";
import { factWords } from "../../engine/sources.ts";
import { bareCond } from "../../engine/validate.ts";
import { actorOf, Audit, Db, need, readerOf, revise, strip, Workspace, type Actor } from "./core.ts";
import { printedQuestion, readingOf } from "./own-question.ts";

export const FORM_FIELD_KIND = "form_field_condition", FORM_FIELD_ACTION = "SET_FORM_FIELD_CONDITION";
/** B88 (QA-239): the same door, for a worked-out Yes/No that prints its condition's deciding question: it is asked as that
 *  question (it reads the deciding Yes/No and writes the person's own answer), so it no longer reads the hidden answer. */
export const ASK_ACTION = "SET_FORM_FIELD_QUESTION";
type Step = { fact: string | null; transform: string | null; origin?: string | null; evidence?: string | null };
/** BR-7: an approved change never blocks a new one, so a mistake can be undone before any release. */
const BLOCKING = ["WAITING", "RETURNED"];
type Client = Pick<Db, "formFieldMap" | "combination" | "combinationForm" | "sectionQuestion">;
const problem = (status: number, title: string, detail: string) =>
  new HttpException({ type: `https://expatready.local/problems/${title.toLowerCase().replace(/[^a-z]+/g, "-")}`, title, status, detail }, status);
const sameCondition = (a: unknown, b: unknown) => bareCond(a) !== null && bareCond(a) === bareCond(b);
const keyOf = (formEditionId: string, dataPath: string) => `${formEditionId}:${dataPath}`;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export type FormFieldState = "not_confirmed" | "waiting" | "returned" | "confirmed" | "different" | "no_words" | "worked_out" | "asked";
const NO_WORDS = "This form field's map has no words about when it is filled, so nothing says it is conditional, and it cannot be confirmed. This combination stays held until the form can carry the condition, or the condition is removed.";
const WORKED_OUT = "This Yes/No is worked out from other answers and must write No when the answer is No, so it cannot be filled only under this condition. This combination stays held until the form can carry the condition, or the condition is removed.";
/** B88: why a worked-out Yes/No can be asked as its condition's deciding question, or why not (BR-1, BR-2), in words. */
const CAN_ASK = (deciding: string) => `This Yes/No prints its own question. If it asks the same as "${deciding}", it is asked as that question: it writes the person's own answer, Y or N, and no longer reads this hidden answer. A second person approves.`;
const ASKED = (deciding: string) => `Asked as "${deciding}": it writes the person's own answer, Y or N, and no longer reads this answer. Undo makes it worked out from other answers again.`;
function cannotAsk(why: "shape" | "type" | "group" | "printed" | "codes" | "block"): string {
  const w = { shape: "its question's condition is not \"asked only when a Yes/No is Yes\"", type: "the condition's deciding question is not answered Yes or No", group: "the condition's deciding question is about someone else", printed: "the form's reading has no printed question for it", codes: "the form's reading does not give it one Yes and one No option", block: "its printed block does not hold this question's details alone, so which details it vouches for cannot be told from the form" }[why];
  return `${WORKED_OUT} It cannot be asked as the deciding question either: ${w}.`;
}

/** Lead's ruling 3 on #1053: what approving this holds elsewhere, in words: the other combinations that ask this question and
 *  their form fields that read it without this condition. A combination cannot be released until they agree (the rule). */
export async function spreadOf(db: Client, workspaceId: string, fact: string, tree: unknown, except: string | null | undefined): Promise<{ combinations: number; form_fields: number; words: string | null }> {
  const q = await db.sectionQuestion.findMany({ where: { workspaceId, lineageKey: fact }, orderBy: { version: "desc" }, select: { sectionKey: true, status: true } });
  const current = q.find((r) => r.status === "DRAFT") ?? q.find((r) => r.status === "PUBLISHED");
  if (!current) return { combinations: 0, form_fields: 0, words: null };
  const others = (await db.combination.findMany({ where: { workspaceId, retiredAt: null, sections: { some: { sectionKey: current.sectionKey } } }, select: { id: true } })).map((c) => c.id).filter((id) => id !== except);
  if (!others.length) return { combinations: 0, form_fields: 0, words: null };
  const lines = await db.combinationForm.findMany({ where: { workspaceId, combinationId: { in: others } }, orderBy: { version: "desc" }, select: { combinationId: true, lineageKey: true, status: true, govFormDefId: true } });
  const newest = new Map<string, (typeof lines)[number]>();
  for (const l of lines) if (!newest.has(`${l.combinationId}|${l.lineageKey}`)) newest.set(`${l.combinationId}|${l.lineageKey}`, l);
  const live = [...newest.values()].filter((l) => l.status !== "RETIRED");
  const rows = effective(await db.formFieldMap.findMany({ where: { workspaceId, canonicalFieldKey: fact, edition: { govFormDefId: { in: [...new Set(live.map((l) => l.govFormDefId))] } } }, include: { edition: { select: { govFormDefId: true } } } }), (m) => `${m.formEditionId}|${m.dataPath}`, "draft").filter((m) => m.outcome === "mapped" && !sameCondition(m.conditionRule, tree));
  const forms = new Set(rows.map((r) => r.edition.govFormDefId));
  const held = new Set(live.filter((l) => forms.has(l.govFormDefId)).map((l) => l.combinationId));
  if (!held.size) return { combinations: 0, form_fields: 0, words: null };
  return { combinations: held.size, form_fields: rows.length, words: `${plural(held.size, "other combination")} ask${held.size === 1 ? "s" : ""} this question, and ${plural(rows.length, "form field")} there ${rows.length === 1 ? "does" : "do"} not hold this condition: ${held.size === 1 ? "it" : "they"} cannot be released until ${rows.length === 1 ? "that form field holds" : "those form fields hold"} it, or the condition is removed.` };
}

/** What the second person compares on To review. */
export function formFieldView(c: Pick<LibraryChange, "matches" | "reason"> & { action?: string }) {
  const m = (c.matches ?? {}) as { form?: string; edition?: string; caption?: string; words?: string; sentence?: string; clear?: boolean; spread?: string | null; printed?: string; deciding?: string; writes?: string };
  const ask = (c as { action?: string }).action === ASK_ACTION ? { printed: m.printed ?? "", deciding: m.deciding ?? "", writes: m.writes ?? "" } : null; // B88
  return { form: m.form ?? "", edition: m.edition ?? "", caption: m.caption ?? "", words: m.words ?? "", sentence: m.sentence ?? "", clear: !!m.clear, spread: m.spread ?? null, reason: c.reason ?? "", ask };
}

/** BR-7 (found by B88): only one WAITING or APPROVED change per form field may exist (index library_change_one_open), so a
 *  new proposal closes the approved change it replaces, in the same transaction; its draft stays applied until this one is
 *  approved. Without it, Undo of an approved change answered 409 "Already exists". */
const REPLACED = "Replaced by a later change of this form field.";
type Replaced = { id: string; note: string | null };
async function closeReplaced(tx: Pick<Db, "libraryChange">, workspaceId: string, key: string): Promise<Replaced[]> {
  const open = await tx.libraryChange.findMany({ where: { workspaceId, kind: FORM_FIELD_KIND, key, status: "APPROVED" }, select: { id: true, decisionNote: true } });
  if (open.length) await tx.libraryChange.updateMany({ where: { id: { in: open.map((o) => o.id) } }, data: { status: "WITHDRAWN", decisionNote: REPLACED } });
  return open.map((o) => ({ id: o.id, note: o.decisionNote }));
}

/** B88 review M3: a later change that is returned or withdrawn was never applied, so the approved change it closed is put back:
 *  APPROVED while its draft waits for a release, RELEASED once a release has published it. Never one someone else closed. */
export async function restoreReplaced(tx: Pick<Db, "libraryChange" | "formFieldMap">, c: Pick<LibraryChange, "kind" | "matches">) {
  if (c.kind !== FORM_FIELD_KIND) return;
  for (const r of ((c.matches as { replaces?: Replaced[] } | null)?.replaces ?? [])) {
    const old = await tx.libraryChange.findUnique({ where: { id: r.id } });
    if (!old || old.status !== "WITHDRAWN" || old.decisionNote !== REPLACED) continue;
    const m = old.matches as { formEditionId: string; dataPath: string };
    const waiting = await tx.formFieldMap.count({ where: { formEditionId: m.formEditionId, dataPath: m.dataPath, status: "DRAFT" } });
    await tx.libraryChange.update({ where: { id: old.id }, data: { status: waiting ? "APPROVED" : "RELEASED", decisionNote: r.note } });
  }
}

/** At approval (lifecycle afterApprove): the form field gets a draft version with the condition, checked again first. */
export async function applyFormFieldCondition(db: Db, audit: Audit, actor: Actor, c: LibraryChange) {
  if (c.action === ASK_ACTION) return applyAsk(db, audit, actor, c);
  const m = c.matches as { formEditionId: string; dataPath: string; fact: string; rawWords: string | null; before: unknown; after: unknown; form: string; edition: string };
  const rows = await db.formFieldMap.findMany({ where: { formEditionId: m.formEditionId, dataPath: m.dataPath } });
  const now = effective(rows, (x) => x.dataPath, "draft")[0];
  if (!now || now.outcome !== "mapped" || now.canonicalFieldKey !== m.fact || (now.condition ?? null) !== (m.rawWords ?? null)) throw problem(HttpStatus.CONFLICT, "Changed since", "This form field or its words changed after this was proposed, so nothing was changed. Return it; it can be proposed again.");
  if (JSON.stringify(now.conditionRule ?? null) !== JSON.stringify(m.before ?? null)) throw problem(HttpStatus.CONFLICT, "Changed since", "What this form field holds changed after this was proposed, so nothing was changed. Return it; it can be proposed again.");
  if (m.after && isWorkedOutYesNo(now.transform)) throw problem(HttpStatus.CONFLICT, "Changed since", `${WORKED_OUT} Nothing was changed. Return it.`);
  await revise(db.formFieldMap, rows, { conditionRule: m.after ? (m.after as Prisma.InputJsonValue) : Prisma.DbNull }, actor.id, strip);
  // BR-7: an earlier approved change this one replaces is closed, not left open for the next release.
  await db.libraryChange.updateMany({ where: { workspaceId: c.workspaceId, kind: FORM_FIELD_KIND, key: c.key, status: "APPROVED", id: { not: c.id } }, data: { status: "WITHDRAWN", decisionNote: "Replaced by a later change of this form field." } });
  await audit.log(c.workspaceId, actor.id, "approved", "form field", m.form, `${actor.name} approved: ${c.label ?? c.key}. It goes out with the next release that carries ${m.edition}.`, undefined, c.combinationId ?? undefined);
}

/** B88 BR-3, BR-4, BR-7: at approval the form field gets a draft version that reads the deciding Yes/No with its own codes (or
 *  its earlier step again, on Undo), checked again first: the form field and the question's condition as they were proposed. */
async function applyAsk(db: Db, audit: Audit, actor: Actor, c: LibraryChange) {
  const m = c.matches as { formEditionId: string; dataPath: string; fact: string; before: Step; after: Step; clear: boolean; printed: string; form: string; edition: string };
  const rows = await db.formFieldMap.findMany({ where: { formEditionId: m.formEditionId, dataPath: m.dataPath } });
  const now = effective(rows, (x) => x.dataPath, "draft")[0];
  if (!now || now.status === "RETIRED" || now.outcome !== "mapped" || now.canonicalFieldKey !== m.before.fact || (now.transform ?? null) !== (m.before.transform ?? null)) throw problem(HttpStatus.CONFLICT, "Changed since", "This form field changed after this was proposed, so nothing was changed. Return it; it can be proposed again.");
  if (!m.clear) {
    const q = await db.sectionQuestion.findMany({ where: { workspaceId: c.workspaceId, lineageKey: m.fact }, orderBy: { version: "desc" }, select: { status: true, predicateJson: true, conditionEffect: true } });
    const cur = q.find((r) => r.status === "DRAFT") ?? q.find((r) => r.status === "PUBLISHED");
    const yesNo = await db.canonicalField.findFirst({ where: { workspaceId: c.workspaceId, canonicalFieldKey: m.after.fact ?? "", status: { in: ["DRAFT", "PUBLISHED"] } }, orderBy: { version: "desc" }, select: { valueType: true } });
    const map = effective(await db.formFieldMap.findMany({ where: { formEditionId: m.formEditionId } }), (x) => x.dataPath, "draft").filter((x) => x.status !== "RETIRED").map((x) => ({ data_path: x.dataPath, fact: x.canonicalFieldKey, outcome: x.outcome }));
    const codes = /-> (yes_no_code:\S+)$/.exec(m.after.transform ?? "")?.[1] ?? "";
    if (askedStep(blockFacts(map, m.dataPath, m.after.fact ?? ""), codes) !== m.after.transform) throw problem(HttpStatus.CONFLICT, "Changed since", "The details in this Yes/No's printed block changed after this was proposed, so nothing was changed. Return it; it can be proposed again.");
    if (!cur || (cur.conditionEffect ?? "SHOW") !== "SHOW" || decidingYes(cur.predicateJson) !== m.after.fact || !["yes_no", "boolean"].includes(yesNo?.valueType ?? "")) throw problem(HttpStatus.CONFLICT, "Changed since", "The question's condition changed after this was proposed, so this form field is no longer its deciding question's: nothing was changed. Return it.");
  }
  await revise(db.formFieldMap, rows, { canonicalFieldKey: m.after.fact, transform: m.after.transform, origin: (m.after.origin ?? "HUMAN") as "HUMAN", confidence: null, evidenceQuote: m.clear ? m.after.evidence ?? null : m.printed.slice(0, 500), reason: `${c.label ?? c.key} (approved by ${actor.name})`.slice(0, 500) }, actor.id, strip);
  await db.libraryChange.updateMany({ where: { workspaceId: c.workspaceId, kind: FORM_FIELD_KIND, key: c.key, status: "APPROVED", id: { not: c.id } }, data: { status: "WITHDRAWN", decisionNote: "Replaced by a later change of this form field." } });
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

const Confirm = z.object({ combinationId: z.string().uuid(), fact: z.string().min(1).max(200), formEditionId: z.string().uuid(), dataPath: z.string().min(1).max(500), item: z.string().uuid().optional(), clear: z.boolean().optional(), ask: z.boolean().optional(), reason: z.string().trim().min(3).max(300).optional() }).strict();

/** B88 BR-8: how many other combinations file this form, so the second person sees that the form field changes there too. */
async function filersOf(db: Pick<Db, "formEdition" | "combinationForm">, workspaceId: string, formEditionId: string, except: string): Promise<string | null> {
  const ed = await db.formEdition.findUnique({ where: { id: formEditionId }, select: { govFormDefId: true, form: { select: { formKey: true } } } });
  if (!ed) return null;
  const lines = await db.combinationForm.findMany({ where: { workspaceId, govFormDefId: ed.govFormDefId, combinationId: { not: except } }, orderBy: { version: "desc" }, select: { combinationId: true, lineageKey: true, status: true } });
  const newest = new Map<string, (typeof lines)[number]>();
  for (const l of lines) if (!newest.has(`${l.combinationId}|${l.lineageKey}`)) newest.set(`${l.combinationId}|${l.lineageKey}`, l);
  const n = new Set([...newest.values()].filter((l) => l.status !== "RETIRED").map((l) => l.combinationId)).size;
  return n ? `${plural(n, "other combination")} file${n === 1 ? "s" : ""} ${ed.form.formKey}: this form field changes there too (shared library).` : null;
}

@Injectable()
export class FormFieldConditions {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Audit) private readonly audit: Audit, @Inject(Workspace) private readonly ws: Workspace) {}

  /** BR-1: the condition a form field is compared with: a waiting card's while it belongs to this combination and targets
   *  this question and the library holds no condition or the same one; else the question's own SHOW condition. Never typed. */
  private async conditionOf(workspaceId: string, combinationId: string, fact: string, s: Snapshot, item?: string): Promise<{ tree: unknown; sentence: string | null; why: string | null }> {
    const placed = (s.placements as { fact: string; condition?: unknown; condition_effect?: string | null }[]).find((p) => p.fact === fact);
    const own = showCondition(s.placements as never, fact);
    if (placed?.condition && !own) return { tree: null, sentence: null, why: "This question's condition does not hide it (it is not \"asked only when\"), so no form field needs to hold it." };
    if (item) {
      const it = await this.db.proposalItem.findUnique({ where: { id: item } });
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

  /** B88 BR-7: per form field, the newest approved change that had it ask a deciding question, while it still reads what that
   *  change gave it (an approved change a later proposal replaced is closed, so its status alone does not say). */
  private async askedOf(workspaceId: string) {
    const byKey = new Map<string, LibraryChange>(), byPath = new Map<string, LibraryChange>();
    for (const c of await this.db.libraryChange.findMany({ where: { workspaceId, kind: FORM_FIELD_KIND, action: ASK_ACTION, status: { in: ["APPROVED", "RELEASED", "WITHDRAWN"] }, decidedAt: { not: null } }, orderBy: { proposedAt: "desc" } })) {
      const m = c.matches as { clear?: boolean; form?: string; dataPath?: string } | null;
      if (m?.clear) continue;
      if (!byKey.has(c.key)) byKey.set(c.key, c);
      const k = `${m?.form}|${m?.dataPath}`; if (!byPath.has(k)) byPath.set(k, c);
    }
    // Breaker M3: a new edition carries the form field's step (api/src/impact.ts), so its history is found by form and form field too.
    return { get: (key: string, form: string, dataPath: string) => byKey.get(key) ?? byPath.get(`${form}|${dataPath}`) };
  }

  /** The form fields of this combination's forms that read the answer, each with its own words (every edition, as the rule);
   *  B88: also those a person had ask this question's deciding question, so that can be undone. */
  private async rowsOf(workspaceId: string, combinationId: string, fact: string, s: Snapshot, tree: unknown) {
    type Entry = { data_path: string; caption?: string | null; outcome?: string; fact?: string | null; condition?: string | null; transform?: string | null; condition_rule?: unknown };
    const all = s.field_maps as { form_number: string; form_edition: string; entries: Entry[] }[];
    const eds = await this.db.formEdition.findMany({ where: { workspaceId, editionLabel: { in: all.map((m) => m.form_edition) } }, select: { id: true, editionLabel: true, inventoryFile: true, form: { select: { formKey: true } } } });
    const edOf = (m: { form_number: string; form_edition: string }) => eds.find((x) => x.editionLabel === m.form_edition && x.form.formKey === m.form_number);
    const asked = await this.askedOf(workspaceId);
    const askedHere = (m: (typeof all)[number], e: Entry) => {
      const c = asked.get(keyOf(edOf(m)?.id ?? "", e.data_path), m.form_number, e.data_path), x = c?.matches as { fact?: string; clear?: boolean; after?: Step } | undefined;
      return !!x && !x.clear && x.fact === fact && e.outcome === "mapped" && e.fact === x.after?.fact && (e.transform ?? null) === (x.after?.transform ?? null);
    };
    const reads = (m: (typeof all)[number], e: Entry) => (e.fact === fact && e.outcome === "mapped") || askedHere(m, e);
    const maps = all.filter((m) => m.entries.some((e) => reads(m, e)));
    const open = await this.db.libraryChange.findMany({ where: { workspaceId, kind: FORM_FIELD_KIND, status: { in: BLOCKING } }, select: { id: true, key: true, status: true } });
    const decider = (tree as { field?: unknown } | null)?.field;
    // B88 BR-1: the deciding question a worked-out Yes/No may be asked as: only "X is Yes", X a Yes/No field about the same group.
    const yes = decidingYes(tree);
    const yesField = yes ? (s.canonical_fields as { id: string; value_type?: string }[]).find((f) => f.id === yes) : undefined;
    const yesLabel = yes ? (await this.db.canonicalField.findFirst({ where: { workspaceId, canonicalFieldKey: yes, status: { in: ["DRAFT", "PUBLISHED"] } }, orderBy: { version: "desc" }, select: { label: true } }))?.label ?? null : null;
    const yesProblem = !yes ? "shape" as const : !yesField || !["yes_no", "boolean"].includes(yesField.value_type ?? "") ? "type" as const : yes.split(".")[0] !== fact.split(".")[0] ? "group" as const : null;
    return maps.flatMap((m) => m.entries.filter((e) => reads(m, e)).map((e) => {
      const ed = edOf(m), formEditionId = ed?.id ?? "";
      const pending = open.find((c) => c.key === keyOf(formEditionId, e.data_path));
      const plain = e.condition ? plainWords(e.condition, m.entries, (f) => factWords(s, f), fact) : { text: "", names: [] as string[] };
      const isAsked = askedHere(m, e);
      const state: FormFieldState = pending ? (pending.status === "RETURNED" ? "returned" : "waiting") : isAsked ? "asked" : e.condition_rule ? (tree && sameCondition(e.condition_rule, tree) ? "confirmed" : "different") : isWorkedOutYesNo(e.transform) ? "worked_out" : !e.condition ? "no_words" : "not_confirmed";
      const elsewhere = typeof decider === "string" && plain.names.length && !plain.names.includes(decider) ? plain.names[0] : null;
      // B88 BR-2: the form's printed question and its own Yes and No codes, from the form's reading (never typed).
      const box = isWorkedOutYesNo(e.transform) || isAsked ? readingOf(ed?.inventoryFile ?? null)?.get(e.data_path) : undefined;
      const printed = box ? printedQuestion(box) : null, codes = box ? yesNoStep(box.options) : null;
      const found = yes ? blockFacts(m.entries, e.data_path, yes) : [];
      // Breaker m2: the block must hold the question this Yes/No reads, and be one printed question's details, not a section.
      const details = found.includes(fact) && found.length <= 8 ? found : [];
      const step = codes && details.length ? askedStep(details, codes) : null;
      const why2 = yesProblem ?? (!printed ? "printed" as const : !codes ? "codes" as const : !details.length ? "block" as const : null);
      const askable = state === "worked_out" && !!tree && !why2;
      const deciding = isAsked ? String((asked.get(keyOf(formEditionId, e.data_path), m.form_number, e.data_path)?.matches as { deciding?: string } | null)?.deciding ?? factWords(s, e.fact ?? "")) : yes ? yesLabel ?? factWords(s, yes) : null;
      return { form: m.form_number, edition: m.form_edition, form_edition_id: formEditionId, data_path: e.data_path, caption: e.caption ?? "", words: plain.text, state, change_id: pending?.id ?? null,
        why: state === "no_words" ? NO_WORDS : state === "asked" ? ASKED(deciding ?? "its deciding question") : state === "worked_out" ? (askable ? CAN_ASK(deciding!) : tree && why2 ? cannotAsk(why2) : WORKED_OUT) : null,
        warning: askable && plain.text ? `Its own words also say: "${plain.text.replace(/[.\s]+$/, "")}". Ask it only if its deciding question is the whole condition (Sample, Unconfirmed: expert).` : state === "not_confirmed" && elsewhere ? `Its words name "${factWords(s, elsewhere)}", not this condition's deciding question "${factWords(s, decider as string)}". Check before saying they are the same.` : null,
        asks: (askable || state === "asked") && printed ? { printed, deciding: deciding ?? "", writes: codes ? `${codes.slice("yes_no_code:".length).split("/")[0]} when Yes, ${codes.split("/")[1]} when No` : "" } : null,
        can_confirm: state === "not_confirmed" && !!tree, can_ask: askable, can_undo: state === "confirmed" || state === "different" || state === "asked",
        step: askable ? step : null, field: askable ? yes : null };
    }));
  }

  /** Breaker M2: the questions of this combination whose form fields already hold or ask their condition (or wait to), so
   *  Review and release can show their panel, and its Undo, once no "Hiding a value" problem shows it. */
  async followers(combinationId: string) {
    const workspaceId = await this.ws.id();
    const c = /^[0-9a-f-]{36}$/i.test(combinationId) ? await this.db.combination.findUnique({ where: { id: combinationId } }) : null;
    if (!c || c.workspaceId !== workspaceId) throw problem(404, "Not found", "That combination does not exist (it may have been removed by a reset).");
    const { snapshot: s } = await buildSnapshot(this.db, workspaceId, combinationId, "draft");
    const out: { fact: string; question: string; form_fields: number }[] = [];
    for (const p of s.placements as { fact: string }[]) {
      const own = showCondition(s.placements as never, p.fact);
      if (!own) continue;
      const n = (await this.rowsOf(workspaceId, combinationId, p.fact, s, own)).filter((r) => ["confirmed", "asked", "waiting", "returned", "different"].includes(r.state)).length;
      if (n) out.push({ fact: p.fact, question: factWords(s, p.fact), form_fields: n });
    }
    return { questions: out };
  }

  async list(combinationId: string, fact: string, item?: string) {
    const workspaceId = await this.ws.id();
    const c = /^[0-9a-f-]{36}$/i.test(combinationId) ? await this.db.combination.findUnique({ where: { id: combinationId } }) : null;
    if (!c || c.workspaceId !== workspaceId) throw problem(404, "Not found", "That combination does not exist (it may have been removed by a reset).");
    const { snapshot: s } = await buildSnapshot(this.db, workspaceId, combinationId, "draft");
    if (!(s.canonical_fields as { id: string }[]).some((f) => f.id === fact)) throw problem(404, "Not found", "This combination does not read that question.");
    const cond = await this.conditionOf(workspaceId, combinationId, fact, s, item);
    const rows = await this.rowsOf(workspaceId, combinationId, fact, s, cond.tree);
    const spread = cond.tree ? await spreadOf(this.db, workspaceId, fact, cond.tree, combinationId) : null;
    return { fact, question: factWords(s, fact), sentence: cond.sentence, why: cond.why, rows: rows.map(({ step: _s, field: _f, ...r }) => r), spread: spread?.words ?? null };
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
    if (b.ask && b.clear) throw problem(HttpStatus.BAD_REQUEST, "Some details need fixing", "Ask it as the deciding question, or undo: not both.");
    if (b.ask && row.state === "asked") throw problem(409, "Nothing changes", "This form field already asks its deciding question.");
    if (b.ask && !row.can_ask) throw problem(409, "Cannot be asked", `${row.why ?? "Only a worked-out Yes/No that prints its condition's deciding question can be asked as it."} Nothing was changed.`);
    if (!b.ask && row.state === "worked_out") throw problem(409, "Cannot be confirmed", row.can_ask ? "This Yes/No must write No when the answer is No, so it cannot hold the condition: ask it as its deciding question instead. Nothing was changed." : `${row.why ?? WORKED_OUT} Nothing was changed.`);
    if (b.clear ? !row.can_undo : row.state === "confirmed" || (!b.ask && row.state === "asked")) throw problem(409, "Nothing changes", b.clear ? "This form field holds no condition, so there is nothing to take off." : row.state === "asked" ? "This form field asks its deciding question, so it reads no hidden answer: nothing to confirm." : "This form field already holds this condition.");
    if (!b.clear && !b.ask && !row.can_confirm) throw problem(409, row.state === "different" ? "A different condition" : "Cannot be confirmed", row.why ?? "This form field holds a different condition: undo that first, then confirm this one. Nothing was changed.");
    const rawRows = await this.db.formFieldMap.findMany({ where: { formEditionId: b.formEditionId, dataPath: b.dataPath } });
    const raw = effective(rawRows, (x) => x.dataPath, "draft")[0];
    if (b.ask || (b.clear && row.state === "asked")) return this.proposeAsk(actor, workspaceId, c.id, b, row, raw, s, !!b.clear);
    const spread = cond.tree ? await spreadOf(this.db, workspaceId, b.fact, cond.tree, c.id) : { words: null };
    const name = factWords(s, b.fact), field = row.caption || "a form field";
    const label = (b.clear ? `${row.form} · ${field}: filled whenever the form applies again` : `${row.form} · ${field}: filled only when ${cond.sentence ?? "its question is asked"}`).slice(0, 300);
    const key = keyOf(b.formEditionId, b.dataPath);
    return this.db.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`select pg_advisory_xact_lock(hashtext($1))`, `form_field_condition:${workspaceId}:${key}`);
      if (await tx.libraryChange.findFirst({ where: { workspaceId, kind: FORM_FIELD_KIND, key, status: { in: BLOCKING } } })) throw problem(409, "Already waiting", "A change of this form field already waits on To review. Decide or withdraw it first.");
      const replaces = await closeReplaced(tx, workspaceId, key);
      const change = await tx.libraryChange.create({ data: { workspaceId, kind: FORM_FIELD_KIND, key, label, action: FORM_FIELD_ACTION, reason: b.reason ?? null, status: "WAITING", proposedBy: actor.id, appliedBy: actor.id, combinationId: c.id,
        matches: { fact: b.fact, question: name, formEditionId: b.formEditionId, dataPath: b.dataPath, form: row.form, edition: row.edition, caption: row.caption, words: row.words, rawWords: raw?.condition ?? null, before: raw?.conditionRule ?? null, after: (cond.tree ?? null) as Prisma.InputJsonValue, sentence: cond.sentence, clear: !!b.clear, spread: spread.words, replaces } as unknown as Prisma.InputJsonValue } });
      await this.audit.log(workspaceId, actor.id, "proposed", "form field", row.form, `${actor.name} proposed: ${label}. It waits for a second person.`, undefined, c.id);
      return { id: change.id, status: change.status, label, spread: spread.words };
    });
  }

  /** B88 BR-1 to BR-4, BR-7: a worked-out Yes/No asked as its condition's deciding question (or undone), one waiting library
   *  change; nothing applied before a second person approves. The target and the step come from the server, never typed. */
  private async proposeAsk(actor: Actor, workspaceId: string, combinationId: string, b: z.infer<typeof Confirm>, row: Awaited<ReturnType<FormFieldConditions["rowsOf"]>>[number], raw: { canonicalFieldKey: string | null; transform: string | null; origin?: string; evidenceQuote?: string | null } | undefined, s: Snapshot, undo: boolean) {
    const key = keyOf(b.formEditionId, b.dataPath), field = row.caption || "a form field";
    const was = undo ? ((await this.askedOf(workspaceId)).get(key, row.form, b.dataPath)?.matches as { before?: Step; deciding?: string } | undefined) : undefined;
    if (undo && !was?.before) throw problem(409, "Nothing to undo", "This form field's earlier step is not on record, so it cannot be put back. Nothing was changed.");
    const before: Step = { fact: raw?.canonicalFieldKey ?? null, transform: raw?.transform ?? null, origin: (raw as { origin?: string } | undefined)?.origin ?? null, evidence: (raw as { evidenceQuote?: string | null } | undefined)?.evidenceQuote ?? null };
    const after: Step = undo ? was!.before! : { fact: row.field, transform: row.step, origin: "HUMAN" };
    const deciding = undo ? was!.deciding ?? factWords(s, before.fact ?? "") : row.asks?.deciding ?? "";
    const spread = await filersOf(this.db, workspaceId, b.formEditionId, combinationId);
    const label = (undo ? `${row.form} · ${field}: worked out from other answers again, not asked as "${deciding}"` : `${row.form} · ${field}: asks "${deciding}" (${row.asks?.writes})`).slice(0, 300);
    return this.db.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`select pg_advisory_xact_lock(hashtext($1))`, `form_field_condition:${workspaceId}:${key}`);
      if (await tx.libraryChange.findFirst({ where: { workspaceId, kind: FORM_FIELD_KIND, key, status: { in: BLOCKING } } })) throw problem(409, "Already waiting", "A change of this form field already waits on To review. Decide or withdraw it first.");
      const replaces = await closeReplaced(tx, workspaceId, key);
      const change = await tx.libraryChange.create({ data: { workspaceId, kind: FORM_FIELD_KIND, key, label, action: ASK_ACTION, reason: b.reason ?? null, status: "WAITING", proposedBy: actor.id, appliedBy: actor.id, combinationId,
        matches: { fact: b.fact, question: factWords(s, b.fact), formEditionId: b.formEditionId, dataPath: b.dataPath, form: row.form, edition: row.edition, caption: row.caption, words: row.words, printed: row.asks?.printed ?? "", deciding, writes: row.asks?.writes ?? "", before, after, clear: undo, spread, replaces } as unknown as Prisma.InputJsonValue } });
      await this.audit.log(workspaceId, actor.id, "proposed", "form field", row.form, `${actor.name} proposed: ${label}. It waits for a second person.`, undefined, combinationId);
      return { id: change.id, status: change.status, label, spread };
    });
  }
}

@Controller("api")
export class FormFieldConditionsController {
  constructor(@Inject(FormFieldConditions) private readonly f: FormFieldConditions) {}
  @Get("combinations/:id/form-field-followers") followers(@Headers("x-actor") a: string | undefined, @Param("id") id: string) { readerOf(a); return this.f.followers(id); }
  @Get("combinations/:id/questions/:fact/form-fields") list(@Headers("x-actor") a: string | undefined, @Param("id") id: string, @Param("fact") fact: string, @Query("item") item?: string) { readerOf(a); return this.f.list(id, fact, item); }
  @Post("library/form-field-conditions") propose(@Headers("x-actor") a: string | undefined, @Body() b: unknown) { return this.f.propose(actorOf(a), b); }
}
