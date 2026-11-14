// B52 (tech lead's ruling P-334 (5), on #865): a form's own Yes/No question asked as its own question. Some PDF Yes/No
// form fields are mapped as "worked out from other answers" (IMM 5257's "Have you ever used any other name…?" reads
// whether another name is recorded), so no form field reads the Yes/No itself, nobody is asked it, and the conditions
// that depend on it (C4.11 step 5) have no question to land on. A person points such a form field at a Yes/No library
// field: one the library has, or a new one named and described by the person, its source the form's printed question
// (edition, page, the words, the official file's saved date; AGENTS rule 4: Sample until the expert checks). A new field
// waits for a second person on To review, as every new shared field does (BR-7, P-53). The form field keeps its "worked
// out" check: a No with a detail still recorded is never written (QA-165, engine/runtime/forms.ts). Rules only, no AI,
// US$0. The shared placement step (api/src/form-part-placements.ts) then asks it in the section of its form field.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Prisma } from "@prisma/client";
import { Body, Controller, Get, Headers, HttpStatus, Inject, Injectable, Param, Post } from "@nestjs/common";
import { cleanLabel, labelProblem, problemFromZod } from "../../contracts/programs.ts";
import { OwnQuestion, OwnQuestionUndo, type OwnQuestionUndone, type OwnQuestionsToAsk, type OwnQuestionsView } from "../../contracts/own-question.ts";
import { buildSnapshot, effective } from "../../engine/snapshot.ts";
import { current } from "../../engine/where-used.ts";
import { factName } from "../../engine/fact-name.ts";
import { manifest } from "../../engine/import.ts";
import { recordedDerivation } from "../../../p5/transforms.ts";
import { actorOf, Audit, Db, fail, need, readerOf, revise, SOLUTION, strip, type Actor } from "./core.ts";
import { freeKey, isWorkedOutYesNo, onlyThisAsk, sameName, whatAskReplaced, withdrawChange } from "./library-changes.ts";
import { fieldReaders, readerWords, type FieldReader } from "./where-used.ts";
import { nearLabels } from "./rule-facts.ts";
import { landField } from "./proposals.ts";
import { lockItem, refuseRetired } from "./library-items.ts";
import { inFormText, printedQuestion, printedStatement, rowPeople, scriptRulesOf, scriptWords, yesNoCodes, type Box } from "./own-yes-no.ts";
export { printedQuestion } from "./own-yes-no.ts";
export { isWorkedOutYesNo } from "./library-changes.ts";

const YES_NO = new Set(["yes_no", "boolean"]);
/** BR-1 (challenge B2): the QA-165 check needs the facts the "worked out" step names; a step that names none (IMM 5257's
 *  Questions 8 A and 9 A) cannot be checked: a confirmed No with rows recorded would be written N. */
const CANNOT_CHECK = "It cannot be checked against the answers it is worked out from yet, so it stays worked out.";
const groupWords = (g: string) => (g === "person" ? "a person" : g === "case" ? "the application" : g);
const wordsOfRow = (caption: string | null | undefined, question: string | null) => question || caption?.trim() || "This form field";

const readings = new Map<string, Map<string, Box>>();
/** A form edition's reading, by form field (B88 reads the printed question and the options of a worked-out Yes/No from it). */
export function readingOf(file: string | null): Map<string, Box> | null {
  if (!file) return null;
  if (!readings.has(file)) {
    try { readings.set(file, new Map(((JSON.parse(readFileSync(join(SOLUTION, file), "utf8")) as { fields?: Box[] }).fields ?? []).filter((x) => x.data_path).map((x) => [x.data_path!, x]))); } catch { return null; }
  }
  return readings.get(file)!;
}
/** The page a form field is on, from its XFA data path (form1[0].Page2[0]…): null when the path does not say. */
const pageOf = (dataPath: string) => /(?:^|\.)Page(\d+)\[/.exec(dataPath)?.[1] ?? null;
type MapRow = { id: string; version: number; status: string };
/** Breaker B1: a draft row changes only while it is still a draft: a release may have published it since it was read, and a
 *  released row is frozen. A published row gets a new draft (core.ts revise). */
async function reviseUnreleased<T extends MapRow>(tx: Prisma.TransactionClient, rows: T[], changes: Record<string, unknown>, by: string, released: string) {
  const newest = [...rows].sort((a, b) => b.version - a.version)[0];
  if (newest.status !== "DRAFT") return revise(tx.formFieldMap, rows, changes, by, strip);
  const done = await tx.formFieldMap.updateMany({ where: { id: newest.id, status: "DRAFT" }, data: { ...changes, updatedBy: by } });
  if (!done.count) fail(released, HttpStatus.CONFLICT);
}
/** Undo's guard (breaker M2): raised under the field's lock when something reads it, so nothing is withdrawn. */
class StillRead extends Error { constructor(readonly readers: FieldReader[]) { super("still read"); } }

@Injectable()
export class OwnQuestions {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Audit) private readonly audit: Audit) {}

  private async edition(id: string) {
    const ed = await this.db.formEdition.findUnique({ where: { id } }).catch(() => null);
    if (!ed) fail("This form edition does not exist.", HttpStatus.NOT_FOUND);
    if (ed!.channel !== "PDF") fail("This asks a PDF edition's Yes/No form fields as their own questions.");
    return ed!;
  }

  /** The names of library fields, for a person to read (a key never reaches the main path; M5). */
  private async fieldsOf(workspaceId: string) {
    const all = await this.db.canonicalField.findMany({ where: { workspaceId, status: { in: ["DRAFT", "PUBLISHED"] } }, orderBy: { version: "asc" }, select: { canonicalFieldKey: true, label: true, meaning: true, valueType: true, groupKey: true } });
    return new Map(all.map((f) => [f.canonicalFieldKey, { key: f.canonicalFieldKey, name: f.label?.trim() || f.meaning?.trim() || factName(f.canonicalFieldKey), meaning: f.meaning, valueType: f.valueType }]));
  }

  /** The edition's Yes/No form fields worked out from other answers: the form's printed question, whether it can be asked
   *  and why not, how it is asked now, and the library's Yes/No fields to choose from. */
  async list(editionId: string): Promise<OwnQuestionsView> {
    const ed = await this.edition(editionId);
    const reading = readingOf(ed.inventoryFile);
    const rows = effective(await this.db.formFieldMap.findMany({ where: { formEditionId: ed.id } }), (m) => m.dataPath, "draft").filter((m) => m.status !== "RETIRED" && m.outcome === "mapped" && isWorkedOutYesNo(m.transform));
    const fields = await this.fieldsOf(ed.workspaceId);
    const changes = new Map((await this.db.libraryChange.findMany({ where: { workspaceId: ed.workspaceId, kind: "field", action: "ADD", status: { in: ["WAITING", "RETURNED"] }, key: { in: rows.map((r) => r.canonicalFieldKey!).filter(Boolean) } }, select: { id: true, key: true } })).map((c) => [c.key, c.id]));
    const form = (await this.db.govFormDef.findUnique({ where: { id: ed.govFormDefId }, select: { formKey: true } }))?.formKey ?? ed.editionLabel;
    return { edition: { id: ed.id, label: ed.editionLabel, form }, yes_no_fields: [...fields.values()].filter((f) => YES_NO.has(f.valueType)).map(({ key, name, meaning }) => ({ key, name, meaning })),
      // Review F8: the rows stay in the form's order after each save: by page, then by data path.
      fields: [...rows].sort((a, b) => Number(pageOf(a.dataPath) ?? 999) - Number(pageOf(b.dataPath) ?? 999) || a.dataPath.localeCompare(b.dataPath)).map((r) => {
        const from = recordedDerivation(r.transform)!.facts, question = printedQuestion(reading?.get(r.dataPath));
        const f = r.canonicalFieldKey ? fields.get(r.canonicalFieldKey) : undefined;
        const asked = !!f && YES_NO.has(f.valueType) && !from.includes(f.key);
        return { dataPath: r.dataPath, question, page: pageOf(r.dataPath), field: r.canonicalFieldKey, group: (from[0] ?? r.canonicalFieldKey ?? "person").split(".")[0], worked_out_from: from, worked_out_from_names: from.map((k) => fields.get(k)?.name ?? factName(k)),
          asked, asked_as: asked ? { name: f!.name, waiting: changes.has(f!.key), change_id: changes.get(f!.key) ?? null } : null,
          can_ask: !asked && !!question && from.length > 0, why_not: asked ? null : !from.length ? CANNOT_CHECK : !question ? "The form's words cannot be read for this form field: map it on its field map." : null };
      }) };
  }

  /** The Smart questionnaire's line: this combination's PDF editions with Yes/No form fields a person can still ask. */
  async toAsk(combinationId: string): Promise<OwnQuestionsToAsk> {
    const c = await this.db.combination.findUnique({ where: { id: combinationId }, select: { id: true, workspaceId: true } }).catch(() => null);
    if (!c) fail("This combination does not exist.", HttpStatus.NOT_FOUND);
    const { snapshot } = await buildSnapshot(this.db, c!.workspaceId, c!.id, "draft");
    const labels = [...new Set((snapshot.field_maps as { form_edition: string; channel?: string }[]).filter((m) => m.channel !== "ONLINE").map((m) => m.form_edition))];
    const eds = await this.db.formEdition.findMany({ where: { workspaceId: c!.workspaceId, channel: "PDF", editionLabel: { in: labels } }, orderBy: { editionLabel: "asc" }, select: { id: true } });
    const out: OwnQuestionsToAsk["editions"] = [];
    for (const e of eds) { const v = await this.list(e.id); const n = v.fields.filter((f) => f.can_ask).length; if (n) out.push({ id: v.edition.id, form: v.edition.form, label: v.edition.label, to_ask: n }); }
    return { editions: out };
  }

  /** Points one worked-out Yes/No form field at a Yes/No library field (`field`), or at a new one (`label`, `meaning`). */
  async ask(actor: Actor, editionId: string, body: unknown) {
    need(actor, "author");
    const p = OwnQuestion.safeParse(body ?? {});
    if (!p.success) fail(problemFromZod(p.error).detail ?? "The request is not valid.");
    const b = p.data!;
    if (b.field && (b.label || b.meaning)) fail("Choose a library field, or name a new one: not both.");
    if (!b.field && (!b.label || !b.meaning)) fail("Choose the library Yes/No field it asks, or name a new one with its meaning.");
    const ed = await this.edition(editionId);
    const ws = ed.workspaceId;
    const rows = await this.db.formFieldMap.findMany({ where: { formEditionId: ed.id, dataPath: b.dataPath } });
    const cur = effective(rows, (m) => m.dataPath, "draft")[0];
    if (!cur || cur.status === "RETIRED") fail(`${ed.editionLabel} has no form field by that name.`, HttpStatus.NOT_FOUND);
    // B116 (founder's ruling on #1123, 6 Nov): a Yes/No form field nothing fills yet (no decision, or "filled by hand") is
    // asked as its own question too, so a box the form's Validate insists on (IMM 5257's Background 1 a) and 6), its
    // research-contact consent) is answered in the questionnaire, never ticked by hand in Adobe.
    const unmapped = cur!.outcome === "unresolved" || cur!.outcome === "by_hand";
    if (!unmapped && (cur!.outcome !== "mapped" || !isWorkedOutYesNo(cur!.transform))) fail(`"${wordsOfRow(cur!.caption, null)}" is not a Yes/No form field worked out from other answers: it is decided on its field map, or on To review › Form fields.`, HttpStatus.CONFLICT);
    const reading = readingOf(ed.inventoryFile);
    if (!reading) fail(`${ed.editionLabel}'s reading cannot be opened, so the form's own question cannot be quoted: read the form again first.`, HttpStatus.CONFLICT);
    const codes = unmapped ? yesNoCodes(reading!.get(b.dataPath)) : null;
    if (unmapped && !codes) fail(`"${wordsOfRow(cur!.caption, null)}" is not a Yes/No form field (the form does not print one Yes and one No choice for it), so it cannot be asked as a Yes/No question: map it on its field map.`, HttpStatus.CONFLICT);
    // A reading can print a neighbour's words on a box (IMM 5257's consent box carries Background 6's caption): the form's own
    // question is then quoted, and taken only when the form's saved text holds those words exactly (P-170).
    if (b.question && !unmapped) fail("A form field worked out from other answers is asked in the words its reading prints; quote the form's words only for a form field nothing fills yet.");
    const saved = (manifest() as { sha256?: string; path?: string; downloaded_utc?: string }[]).find((m) => m.sha256 === ed.sha256);
    if (b.question && !inFormText(saved?.path, b.question)) fail(`"${b.question}" is not in ${ed.editionLabel}'s own saved text, so it cannot be its question: quote the form exactly.`, HttpStatus.CONFLICT);
    // BK-25 (P-170): a Yes/No box nothing fills yet that the form prints as a statement answered YES or NO (IMM 5707's "I was
    // physically present at the marriage ceremony") is asked in those words, only when the form's saved text holds them.
    const question = b.question ?? printedQuestion(reading!.get(b.dataPath)) ?? (unmapped ? printedStatement(reading!.get(b.dataPath), saved?.path) : null);
    // BK-25: a box in a row about another person of the case (IMM 5707's spouse row) is about that person, as the row's other
    // form fields are: the person named must be the one every mapped form field of its row names (the nearest block that
    // holds any), never a guess.
    if (b.person) {
      if (!unmapped) fail("Only a form field nothing fills yet is asked about another person of its row.", HttpStatus.CONFLICT);
      const named = rowPeople(effective(await this.db.formFieldMap.findMany({ where: { formEditionId: ed.id } }), (m) => m.dataPath, "draft"), b.dataPath);
      if (named.length !== 1 || named[0] !== b.person) fail(`This form field's row is about ${named.length ? named.join(" and ") : "no one its other form fields name"}, not ${b.person}: name the person its row's other form fields name.`, HttpStatus.CONFLICT);
    }
    if (!question) fail(`${ed.editionLabel}'s reading has no printed question for this form field (neither its heading nor its caption is a question), so it cannot be asked in the form's words: map it on its field map instead.`, HttpStatus.CONFLICT);
    const from = unmapped ? [] : recordedDerivation(cur!.transform)!.facts;
    if (!unmapped && !from.length) fail(`"${question}": ${CANNOT_CHECK}`, HttpStatus.CONFLICT);
    // A form field nothing fills yet is about the person the form is for (each applicant's own copy).
    const group = unmapped ? "person" : (from[0] ?? cur!.canonicalFieldKey ?? "person").split(".")[0];
    const now = await this.db.canonicalField.findFirst({ where: { workspaceId: ws, canonicalFieldKey: cur!.canonicalFieldKey ?? "", status: { in: ["DRAFT", "PUBLISHED"] } }, orderBy: { version: "desc" }, select: { valueType: true, canonicalFieldKey: true, label: true, meaning: true } });
    if (!unmapped && now && YES_NO.has(now.valueType) && !from.includes(now.canonicalFieldKey)) fail(`"${question}" is already asked as its own question ("${now.label?.trim() || now.meaning?.trim() || factName(now.canonicalFieldKey)}"). Undo it first to choose another.`, HttpStatus.CONFLICT);
    const page = pageOf(b.dataPath);
    const source = `${ed.editionLabel}${page ? ` p. ${page}` : ""}: "${question}"${saved?.path ? ` (official-sources/ircc/${saved.path}${saved.downloaded_utc ? `, saved ${saved.downloaded_utc.slice(0, 10)}` : ""})` : ""}`;
    const res = await this.db.$transaction(async (tx) => {
      // One new name at a time per workspace, as on the field-map draft's new field (break M1 there).
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`new-field:${ws}`}))`;
      // Review m2: two people at once on one form field: read it again under the lock, so the second is refused in words.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`own-question:${ed.id}:${b.dataPath}`}))`;
      const fresh = await tx.formFieldMap.findMany({ where: { formEditionId: ed.id, dataPath: b.dataPath } });
      const now2 = effective(fresh, (m) => m.dataPath, "draft")[0];
      if (!now2 || now2.id !== cur!.id || now2.version !== cur!.version || now2.canonicalFieldKey !== cur!.canonicalFieldKey) fail(`"${question}" was changed by someone else just now: look at it again.`, HttpStatus.CONFLICT);
      let key: string, created = false, name: string;
      if (b.field) {
        await lockItem(tx, ws, "field", [b.field]); // Breaker M2: before it is read, so a withdrawal runs wholly before or after
        const f = await tx.canonicalField.findFirst({ where: { workspaceId: ws, canonicalFieldKey: b.field, status: { in: ["DRAFT", "PUBLISHED"] } }, orderBy: { version: "desc" } });
        if (!f) { await refuseRetired(tx, ws, "field", [b.field]); fail("That is not a library field: choose one the library has, or name a new one.", HttpStatus.NOT_FOUND); }
        name = f!.label?.trim() || f!.meaning?.trim() || factName(f!.canonicalFieldKey);
        if (!YES_NO.has(f!.valueType)) fail(`"${name}" is not answered Yes or No: choose a Yes/No field.`);
        if (f!.canonicalFieldKey.split(".")[0] !== group) fail(`"${name}" is about ${groupWords(f!.canonicalFieldKey.split(".")[0])}, but this form field is about ${groupWords(group)}: choose a field about ${groupWords(group)}.`);
        key = f!.canonicalFieldKey;
      } else {
        const label = cleanLabel(b.label!);
        const bad = labelProblem(label); if (bad) fail(bad);
        if (b.meaning!.length < 10) fail("Say what the field means, in a sentence (10 characters or more).");
        const twin = await sameName(tx, ws, group, label);
        // Review F6: the picker holds only Yes/No fields, so a same-name field of another type cannot be chosen there.
        if (twin?.valueType && !YES_NO.has(twin.valueType)) fail(`"${label}" is already a shared field (${twin.label}), and it is not answered Yes or No: give this one a different name.`, HttpStatus.CONFLICT);
        if (twin) fail(`"${label}" is already a shared field or waiting to be one (${twin.label}): choose it as the library field instead.`, HttpStatus.CONFLICT);
        // M6: a name close to a live field's needs a one-line reason, as C3.6's add does (P-149 (2)).
        const live = await tx.canonicalField.findMany({ where: { workspaceId: ws, status: { in: ["DRAFT", "PUBLISHED"] }, label: { not: null } }, select: { label: true } });
        const near = nearLabels(label, live.map((f) => f.label!)).slice(0, 5);
        if (near.length && !b.nearReason) fail(`"${label}" is close to the library's ${near.map((n) => `"${n}"`).join(", ")}: say why it is not the same (a one-line reason the second person reads), or use the existing field.`);
        key = await freeKey(tx, ws, group, label, new Set((await tx.canonicalField.findMany({ where: { workspaceId: ws }, select: { canonicalFieldKey: true } })).map((x) => x.canonicalFieldKey)));
        await landField(tx, { ws, actor, batchId: null, itemId: null, reason: `${b.reason} (${actor.name})${near.length ? ` Close to ${near.slice(0, 3).join(", ")}: ${b.nearReason}` : ""}`.slice(0, 1000), meaningChecked: true, aiVerdict: null },
          { key, meaning: b.meaning!, valueType: "yes_no", label, sourceRef: `${source}; asked as its own question by ${actor.name}`, origin: "HUMAN" });
        created = true; name = label;
      }
      await lockItem(tx, ws, "field", [key]); await refuseRetired(tx, ws, "field", [key]);
      // The form field keeps its "worked out" transformation: it now reads its own question, and the facts it names
      // stay the cross-check (QA-165). Its evidence is the printed question only (review m1: it is the box's label on the
      // list before the file); the full citation is the new field's source and the history line.
      const was = { origin: now2.origin, confidence: now2.confidence, evidenceQuote: now2.evidenceQuote, reason: now2.reason, ...(unmapped ? { outcome: now2.outcome, person: now2.person, transform: now2.transform, canonicalFieldKey: now2.canonicalFieldKey, condition: now2.condition, asked: { key, transform: `yes_no_code:${codes!.yes}/${codes!.no}` } } : {}) };
      // B116: a form field nothing filled is now mapped to the question, written in the form's own Yes and No codes.
      // QA-165's last two (P-170): when the form's own script requires it only for some answers (IMM 5257's Taiwan PIN and
      // Israel passport, CR 330212), its map says so in the script's words, so its question's condition can be confirmed
      // on it (B86) from the form itself, never typed.
      const said = unmapped ? scriptWords(scriptRulesOf(ed.inventoryFile).find((r) => r.box === b.dataPath), reading!) : null;
      const mapping = unmapped ? { outcome: "mapped", person: b.person ?? "form_subject", transform: was.asked!.transform, ...(said ? { condition: said } : {}) } : {};
      await reviseUnreleased(tx, fresh, { ...mapping, canonicalFieldKey: key, origin: "HUMAN", confidence: null, evidenceQuote: question!.slice(0, 500), reason: `${b.reason} (${actor.name}); ${source}`.slice(0, 500) }, actor.id, `"${question}" was released just now: look at it again.`);
      return { key, created, name, was };
    }, { timeout: 30_000, maxWait: 10_000 });
    await this.audit.log(ws, actor.id, "decided", "form field", b.dataPath, `${actor.name} asked ${source} as its own question (${res.key}${res.created ? ", a new shared field waiting for a second person" : ""}): ${b.reason}`, { edition: ed.id, undo: res.was });
    return { dataPath: b.dataPath, field: res.key, name: res.name, created: res.created, question, source };
  }

  /** BR-9 (EXPERIENCE §2.8, challenge B1): takes an ask back. The form field reads the first fact its step names again. A
   *  draft row that only held this ask over a released row goes, so the release sees no change. A new field still waiting,
   *  proposed by this person, that nothing else reads is withdrawn with it; otherwise it stays, and the answer says why. A
   *  question already placed stays too (review F3), and the answer names its sections and how to remove it. */
  async undo(actor: Actor, editionId: string, body: unknown): Promise<OwnQuestionUndone> {
    need(actor, "author");
    const p = OwnQuestionUndo.safeParse(body ?? {});
    if (!p.success) fail(problemFromZod(p.error).detail ?? "The request is not valid.");
    const b = p.data!;
    const ed = await this.edition(editionId);
    const ws = ed.workspaceId;
    const asked = effective(await this.db.formFieldMap.findMany({ where: { formEditionId: ed.id, dataPath: b.dataPath } }), (m) => m.dataPath, "draft")[0];
    // B116 (review m6): a form field asked with the form's words quoted reads as those words (its reading may print a neighbour's).
    const question = asked?.origin === "HUMAN" && asked.outcome === "mapped" && !isWorkedOutYesNo(asked.transform) && asked.evidenceQuote ? asked.evidenceQuote : printedQuestion(readingOf(ed.inventoryFile)?.get(b.dataPath));
    const words = (cap: string | null | undefined) => wordsOfRow(cap, question);
    const { key, from, name, unmapped } = await this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`own-question:${ed.id}:${b.dataPath}`}))`;
      const rows = await tx.formFieldMap.findMany({ where: { formEditionId: ed.id, dataPath: b.dataPath } });
      const cur = effective(rows, (m) => m.dataPath, "draft")[0];
      if (!cur || cur.status === "RETIRED") fail(`${ed.editionLabel} has no form field by that name.`, HttpStatus.NOT_FOUND);
      const facts = isWorkedOutYesNo(cur!.transform) ? recordedDerivation(cur!.transform)!.facts : [];
      const key = cur!.canonicalFieldKey;
      const field = key ? await tx.canonicalField.findFirst({ where: { workspaceId: ws, canonicalFieldKey: key, status: { in: ["DRAFT", "PUBLISHED"] } }, orderBy: { version: "desc" }, select: { valueType: true, label: true, meaning: true } }) : null;
      // B116: a form field nothing filled before its ask goes back to the decision it had (no decision, or by hand).
      const before = !facts.length && key && field && YES_NO.has(field.valueType) && cur!.outcome === "mapped" ? (await whatAskReplaced(tx, ws, ed.id, b.dataPath)) as (Awaited<ReturnType<typeof whatAskReplaced>> & { outcome?: string; person?: string | null; transform?: string | null; canonicalFieldKey?: string | null; condition?: string | null; asked?: { key: string; transform: string } }) | null : null;
      // Review M1: only while the form field still holds exactly what this ask wrote; a later change is never rolled back.
      if ((before?.outcome === "unresolved" || before?.outcome === "by_hand") && before.asked?.key === key && before.asked?.transform === cur!.transform) {
        await lockItem(tx, ws, "field", [key!]);
        // A draft that only held this ask over a released row goes, so the release sees no change (as for a worked-out ask).
        const under = cur!.supersedesId ? rows.find((r) => r.id === cur!.supersedesId) : undefined;
        if (cur!.status === "DRAFT" && under && under.outcome === before.outcome && (under.canonicalFieldKey ?? null) === (before.canonicalFieldKey ?? null)) { if (!(await tx.formFieldMap.deleteMany({ where: { id: cur!.id, status: "DRAFT" } })).count) fail(`"${words(cur!.caption)}" was released just now: look at it again.`, HttpStatus.CONFLICT); }
        else await reviseUnreleased(tx, rows, { outcome: before.outcome, canonicalFieldKey: before.canonicalFieldKey ?? null, person: before.person ?? null, transform: before.transform ?? null, ...("condition" in before ? { condition: before.condition ?? null } : {}), origin: before.origin, confidence: before.confidence, evidenceQuote: before.evidenceQuote, reason: before.reason }, actor.id, `"${words(cur!.caption)}" was released just now: look at it again.`);
        return { key: key!, from: [] as string[], name: field!.label?.trim() || field!.meaning?.trim() || factName(key!), unmapped: true };
      }
      if (!key || !field || !YES_NO.has(field.valueType) || !facts.length || facts.includes(key)) fail(`"${words(cur!.caption)}" is not asked as its own question, so there is nothing to take back.`, HttpStatus.CONFLICT);
      // Breaker m1: the same locks as an ask: the fact it goes back to takes no new use once retired.
      await lockItem(tx, ws, "field", [facts[0]]); await refuseRetired(tx, ws, "field", [facts[0]]);
      const released = `"${words(cur!.caption)}" was released just now: look at it again.`; // Breaker B1
      const under = cur!.supersedesId ? rows.find((r) => r.id === cur!.supersedesId) : undefined;
      if (onlyThisAsk(cur!, under, facts[0])) { if (!(await tx.formFieldMap.deleteMany({ where: { id: cur!.id, status: "DRAFT" } })).count) fail(released, HttpStatus.CONFLICT); }
      else {
        // Review R5 (m6): a draft goes back to what the ask replaced, an AI proposal's sign-off included (`needs_sme` counts
        // its origin): taking an ask back is not a person's decision about the mapping. A released ask is a change of its own.
        const was = cur!.status === "DRAFT" && under?.canonicalFieldKey !== key ? await whatAskReplaced(tx, ws, ed.id, b.dataPath) : null;
        await reviseUnreleased(tx, rows, { canonicalFieldKey: facts[0], ...(was ?? { origin: "HUMAN", reason: `Taken back by ${actor.name}: worked out from other answers again.`.slice(0, 500) }) }, actor.id, released);
      }
      return { key: key!, from: facts, name: field!.label?.trim() || field!.meaning?.trim() || factName(key!), unmapped: false };
    }, { timeout: 30_000, maxWait: 10_000 });
    const change = await this.db.libraryChange.findFirst({ where: { workspaceId: ws, kind: "field", action: "ADD", key, status: { in: ["WAITING", "RETURNED"] } }, select: { id: true, proposedBy: true } });
    let withdrew = false, kept: string | null = null;
    if (change) {
      if (change.proposedBy !== actor.id) kept = "The new field stays waiting on To review, under Waiting for others: another person proposed it.";
      // Breaker M2: the check and the withdrawal are one step, under the field's lock.
      else try { await withdrawChange(this.db, actor, change.id, "Withdrawn with the ask it was named for, which was taken back.", async (tx) => { const readers = await fieldReaders(tx, ws, key); if (readers.length) throw new StillRead(readers); }); withdrew = true; }
      catch (e) { kept = e instanceof StillRead ? `The new field stays waiting on To review, under Waiting for others: ${readerWords(e.readers)} still ${e.readers.length === 1 ? "reads" : "read"} it.` : await this.whyKept(change.id); }
    }
    const placed = withdrew ? [] : await this.sectionsAsking(ws, key);
    const still = placed.length ? `"${name}" is still asked in ${placed.map((s) => `"${s}"`).join(", ")}. If no other form needs it, remove it there on the Smart questionnaire tab.` : null;
    await this.audit.log(ws, actor.id, "decided", "form field", b.dataPath, `${actor.name} took back ${ed.editionLabel}'s "${words(null)}", asked as "${name}": ${unmapped ? "back to the decision it had before" : "worked out from other answers again"}${withdrew ? "; its new field was withdrawn" : ""}`);
    return { dataPath: b.dataPath, field: unmapped ? null : from[0], withdrew, kept, still_asked: still };
  }

  /** Breaker m2: a withdrawal lost to someone else at the same moment says what really happened. */
  private async whyKept(changeId: string) {
    const now = (await this.db.libraryChange.findUnique({ where: { id: changeId }, select: { status: true } }))?.status;
    if (now === "APPROVED" || now === "RELEASED") return "A second person approved the new field just now, so it stays in the library.";
    if (now === "WITHDRAWN") return "The new field was withdrawn just now.";
    return "The new field stays waiting on To review, under Waiting for others: it could not be withdrawn just now, so withdraw it there.";
  }

  /** The titles of the sections that still ask a field (review F3). */
  private async sectionsAsking(ws: string, key: string) {
    const rows = current(await this.db.sectionQuestion.findMany({ where: { workspaceId: ws, canonicalFieldKey: key }, select: { lineageKey: true, sectionKey: true, version: true, status: true } }), (q) => q.lineageKey);
    if (!rows.length) return [];
    const titles = await this.db.logicalSection.findMany({ where: { workspaceId: ws, sectionKey: { in: rows.map((q) => q.sectionKey) } }, orderBy: { version: "asc" }, select: { sectionKey: true, title: true } });
    const of = new Map(titles.map((s) => [s.sectionKey, s.title]));
    return [...new Set(rows.map((q) => of.get(q.sectionKey) ?? "a section"))].sort();
  }
}

@Controller("api")
export class OwnQuestionsController {
  constructor(@Inject(OwnQuestions) private readonly q: OwnQuestions) {}
  @Get("editions/:id/form-fields/own-questions") list(@Headers("x-actor") a: string | undefined, @Param("id") id: string) { readerOf(a); return this.q.list(id); }
  @Get("combinations/:id/own-questions") toAsk(@Headers("x-actor") a: string | undefined, @Param("id") id: string) { readerOf(a); return this.q.toAsk(id); }
  @Post("editions/:id/form-fields/own-question/undo") undo(@Headers("x-actor") a: string | undefined, @Param("id") id: string, @Body() b: unknown) { return this.q.undo(actorOf(a), id, b); }
  @Post("editions/:id/form-fields/own-question") ask(@Headers("x-actor") a: string | undefined, @Param("id") id: string, @Body() b: unknown) { return this.q.ask(actorOf(a), id, b); }
}
