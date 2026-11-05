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
import { Prisma } from "@prisma/client";
import { Body, Controller, Get, Headers, HttpStatus, Inject, Injectable, Param, Post } from "@nestjs/common";
import { cleanLabel, labelProblem, problemFromZod } from "../../contracts/programs.ts";
import { OwnQuestion, OwnQuestionUndo, type OwnQuestionsToAsk, type OwnQuestionsView } from "../../contracts/own-question.ts";
import { buildSnapshot, effective } from "../../engine/snapshot.ts";
import { factName } from "../../engine/fact-name.ts";
import { manifest } from "../../engine/import.ts";
import { recordedDerivation } from "../../../p5/transforms.ts";
import { actorOf, Audit, Db, fail, need, readerOf, revise, SOLUTION, strip, type Actor } from "./core.ts";
import { keyFor, sameName, withdrawChange } from "./library-changes.ts";
import { nearLabels } from "./rule-facts.ts";
import { landField } from "./proposals.ts";
import { lockItem, refuseRetired } from "./library-items.ts";
import { printedQuestion, type Box } from "./own-yes-no.ts";
export { printedQuestion } from "./own-yes-no.ts";

/** A Yes/No form field worked out from whether other answers are recorded ("derived: … recorded -> yes_no_code"). */
export const isWorkedOutYesNo = (transform: string | null | undefined) => !!recordedDerivation(transform) && /\byes_no_code\b/.test(transform ?? "");
const YES_NO = new Set(["yes_no", "boolean"]);
/** BR-1 (challenge B2): the QA-165 check needs the facts the "worked out" step names; a step that names none (IMM 5257's
 *  Questions 8 A and 9 A) cannot be checked: a confirmed No with rows recorded would be written N. */
const CANNOT_CHECK = "It cannot be checked against the answers it is worked out from yet, so it stays worked out.";
const groupWords = (g: string) => (g === "person" ? "a person" : g === "case" ? "the application" : g);
const wordsOfRow = (caption: string | null | undefined, question: string | null) => question || caption?.trim() || "This form field";

const readings = new Map<string, Map<string, Box>>();
function readingOf(file: string | null): Map<string, Box> | null {
  if (!file) return null;
  if (!readings.has(file)) {
    try { readings.set(file, new Map(((JSON.parse(readFileSync(join(SOLUTION, file), "utf8")) as { fields?: Box[] }).fields ?? []).filter((x) => x.data_path).map((x) => [x.data_path!, x]))); } catch { return null; }
  }
  return readings.get(file)!;
}
/** The page a form field is on, from its XFA data path (form1[0].Page2[0]…): null when the path does not say. */
const pageOf = (dataPath: string) => /(?:^|\.)Page(\d+)\[/.exec(dataPath)?.[1] ?? null;

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
      fields: rows.map((r) => {
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
    if (cur!.outcome !== "mapped" || !isWorkedOutYesNo(cur!.transform)) fail(`"${wordsOfRow(cur!.caption, null)}" is not a Yes/No form field worked out from other answers: it is decided on its field map, or on To review › Form fields.`, HttpStatus.CONFLICT);
    const reading = readingOf(ed.inventoryFile);
    if (!reading) fail(`${ed.editionLabel}'s reading cannot be opened, so the form's own question cannot be quoted: read the form again first.`, HttpStatus.CONFLICT);
    const question = printedQuestion(reading!.get(b.dataPath));
    if (!question) fail(`${ed.editionLabel}'s reading has no printed question for this form field (neither its heading nor its caption is a question), so it cannot be asked in the form's words: map it on its field map instead.`, HttpStatus.CONFLICT);
    const from = recordedDerivation(cur!.transform)!.facts;
    if (!from.length) fail(`"${question}": ${CANNOT_CHECK}`, HttpStatus.CONFLICT);
    const group = (from[0] ?? cur!.canonicalFieldKey ?? "person").split(".")[0];
    const now = await this.db.canonicalField.findFirst({ where: { workspaceId: ws, canonicalFieldKey: cur!.canonicalFieldKey ?? "", status: { in: ["DRAFT", "PUBLISHED"] } }, orderBy: { version: "desc" }, select: { valueType: true, canonicalFieldKey: true, label: true, meaning: true } });
    if (now && YES_NO.has(now.valueType) && !from.includes(now.canonicalFieldKey)) fail(`"${question}" is already asked as its own question ("${now.label?.trim() || now.meaning?.trim() || factName(now.canonicalFieldKey)}"). Undo it first to choose another.`, HttpStatus.CONFLICT);
    const page = pageOf(b.dataPath);
    const saved = (manifest() as { sha256?: string; path?: string; downloaded_utc?: string }[]).find((m) => m.sha256 === ed.sha256);
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
        const f = await tx.canonicalField.findFirst({ where: { workspaceId: ws, canonicalFieldKey: b.field, status: { in: ["DRAFT", "PUBLISHED"] } }, orderBy: { version: "desc" } });
        if (!f) { await refuseRetired(tx, ws, "field", [b.field]); fail("That is not a library field: choose one the library has, or name a new one.", HttpStatus.NOT_FOUND); }
        name = f!.label?.trim() || f!.meaning?.trim() || factName(f!.canonicalFieldKey);
        if (!YES_NO.has(f!.valueType)) fail(`"${name}" is answered as ${f!.valueType}, not Yes or No: choose a Yes/No field.`);
        if (f!.canonicalFieldKey.split(".")[0] !== group) fail(`"${name}" is about ${groupWords(f!.canonicalFieldKey.split(".")[0])}, but this form field is about ${groupWords(group)}: choose a field about ${groupWords(group)}.`);
        key = f!.canonicalFieldKey;
      } else {
        const label = cleanLabel(b.label!);
        const bad = labelProblem(label); if (bad) fail(bad);
        if (b.meaning!.length < 10) fail("Say what the field means, in a sentence (10 characters or more).");
        const twin = await sameName(tx, ws, group, label);
        if (twin) fail(`"${label}" is already a shared field or waiting to be one (${twin.label}): choose it as the library field instead.`, HttpStatus.CONFLICT);
        // M6: a name close to a live field's needs a one-line reason, as C3.6's add does (P-149 (2)).
        const live = await tx.canonicalField.findMany({ where: { workspaceId: ws, status: { in: ["DRAFT", "PUBLISHED"] }, label: { not: null } }, select: { label: true } });
        const near = nearLabels(label, live.map((f) => f.label!)).slice(0, 5);
        if (near.length && !b.nearReason) fail(`"${label}" is close to the library's ${near.map((n) => `"${n}"`).join(", ")}: say why it is not the same (a one-line reason the second person reads), or use the existing field.`);
        key = keyFor(group, label, new Set((await tx.canonicalField.findMany({ where: { workspaceId: ws }, select: { canonicalFieldKey: true } })).map((x) => x.canonicalFieldKey)));
        await landField(tx, { ws, actor, batchId: null, itemId: null, reason: `${b.reason} (${actor.name})${near.length ? ` Close to ${near.slice(0, 3).join(", ")}: ${b.nearReason}` : ""}`.slice(0, 1000), meaningChecked: true, aiVerdict: null },
          { key, meaning: b.meaning!, valueType: "yes_no", label, sourceRef: `${source}; asked as its own question by ${actor.name}`, origin: "HUMAN" });
        created = true; name = label;
      }
      await lockItem(tx, ws, "field", [key]); await refuseRetired(tx, ws, "field", [key]);
      // The form field keeps its "worked out" transformation: it now reads its own question, and the facts it names
      // stay the cross-check (QA-165). Its evidence is the printed question only (review m1: it is the box's label on the
      // list before the file); the full citation is the new field's source and the history line.
      await revise(tx.formFieldMap, fresh, { canonicalFieldKey: key, origin: "HUMAN", confidence: null, evidenceQuote: question!.slice(0, 500), reason: `${b.reason} (${actor.name}); ${source}`.slice(0, 500) }, actor.id, strip);
      return { key, created, name };
    }, { timeout: 30_000, maxWait: 10_000 });
    await this.audit.log(ws, actor.id, "decided", "form field", b.dataPath, `${actor.name} asked ${source} as its own question (${res.key}${res.created ? ", a new shared field waiting for a second person" : ""}): ${b.reason}`);
    return { dataPath: b.dataPath, field: res.key, name: res.name, created: res.created, question, source };
  }

  /** BR-9 (EXPERIENCE §2.8, challenge B1): takes an ask back. The form field reads the first fact its step names again. A
   *  draft row that only held this ask over a released row goes, so the release sees no change. A new field still waiting,
   *  proposed by this person, that nothing else reads is withdrawn with it; otherwise it stays, and the answer says why. */
  async undo(actor: Actor, editionId: string, body: unknown) {
    need(actor, "author");
    const p = OwnQuestionUndo.safeParse(body ?? {});
    if (!p.success) fail(problemFromZod(p.error).detail ?? "The request is not valid.");
    const b = p.data!;
    const ed = await this.edition(editionId);
    const ws = ed.workspaceId;
    const question = printedQuestion(readingOf(ed.inventoryFile)?.get(b.dataPath));
    const words = (cap: string | null | undefined) => wordsOfRow(cap, question);
    const { key, from } = await this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`own-question:${ed.id}:${b.dataPath}`}))`;
      const rows = await tx.formFieldMap.findMany({ where: { formEditionId: ed.id, dataPath: b.dataPath } });
      const cur = effective(rows, (m) => m.dataPath, "draft")[0];
      if (!cur || cur.status === "RETIRED") fail(`${ed.editionLabel} has no form field by that name.`, HttpStatus.NOT_FOUND);
      const facts = isWorkedOutYesNo(cur!.transform) ? recordedDerivation(cur!.transform)!.facts : [];
      const key = cur!.canonicalFieldKey;
      const field = key ? await tx.canonicalField.findFirst({ where: { workspaceId: ws, canonicalFieldKey: key, status: { in: ["DRAFT", "PUBLISHED"] } }, orderBy: { version: "desc" }, select: { valueType: true } }) : null;
      if (!key || !field || !YES_NO.has(field.valueType) || !facts.length || facts.includes(key)) fail(`"${words(cur!.caption)}" is not asked as its own question, so there is nothing to take back.`, HttpStatus.CONFLICT);
      const under = cur!.supersedesId ? rows.find((r) => r.id === cur!.supersedesId) : undefined;
      const onlyThisAsk = !!under && cur!.status === "DRAFT" && under.canonicalFieldKey === facts[0] && under.transform === cur!.transform && under.outcome === cur!.outcome && under.person === cur!.person && under.row === cur!.row && JSON.stringify(under.optionMap) === JSON.stringify(cur!.optionMap) && JSON.stringify(under.listPurpose) === JSON.stringify(cur!.listPurpose);
      if (onlyThisAsk) await tx.formFieldMap.delete({ where: { id: cur!.id } });
      else await revise(tx.formFieldMap, rows, { canonicalFieldKey: facts[0], origin: "HUMAN", reason: `Taken back by ${actor.name}: worked out from other answers again.`.slice(0, 500) }, actor.id, strip);
      return { key: key!, from: facts };
    }, { timeout: 30_000, maxWait: 10_000 });
    const change = await this.db.libraryChange.findFirst({ where: { workspaceId: ws, kind: "field", action: "ADD", key, status: { in: ["WAITING", "RETURNED"] } }, select: { id: true, proposedBy: true } });
    let withdrew = false, kept: string | null = null;
    if (change) {
      const readers = await this.readers(ws, key);
      if (change.proposedBy !== actor.id) kept = "The new field stays waiting on To review: another person proposed it.";
      else if (readers) kept = `The new field stays waiting on To review: ${readers} still read${readers === "a form field" ? "s" : ""} it.`;
      else try { await withdrawChange(this.db, actor, change.id, "Withdrawn with the ask it was named for, which was taken back."); withdrew = true; } catch { kept = "The new field stays waiting on To review: it changed just now."; }
    }
    await this.audit.log(ws, actor.id, "decided", "form field", b.dataPath, `${actor.name} took back ${ed.editionLabel}'s "${words(null)}": worked out from other answers again${withdrew ? "; its new field was withdrawn" : ""}`);
    return { dataPath: b.dataPath, field: from[0], withdrew, kept };
  }

  /** What else reads a field a taken-back ask may have added: another form field, a condition, or a waiting proposal. */
  private async readers(ws: string, key: string): Promise<string | null> {
    if (await this.db.formFieldMap.count({ where: { workspaceId: ws, canonicalFieldKey: key, status: { in: ["DRAFT", "PUBLISHED"] } } })) return "a form field";
    const reads = (x: unknown) => JSON.stringify(x ?? null).includes(`"field":"${key}"`);
    const conds = [
      ...await this.db.sectionQuestion.findMany({ where: { workspaceId: ws, status: { not: "RETIRED" }, NOT: { predicateJson: { equals: Prisma.DbNull } } }, select: { predicateJson: true } }),
      ...await this.db.combinationForm.findMany({ where: { workspaceId: ws, NOT: { predicateJson: { equals: Prisma.DbNull } } }, select: { predicateJson: true } }),
      ...await this.db.documentRequirement.findMany({ where: { workspaceId: ws, NOT: { predicateJson: { equals: Prisma.DbNull } } }, select: { predicateJson: true } }),
      ...await this.db.predicate.findMany({ where: { workspaceId: ws, status: { not: "RETIRED" } }, select: { predicateJson: true } }),
    ];
    if (conds.some((c) => reads(c.predicateJson))) return "a rule or condition";
    const waiting = await this.db.proposalItem.findMany({ where: { workspaceId: ws, status: "waiting", kind: { in: ["condition", "check", "pqr_pick"] } }, select: { payload: true } });
    return waiting.some((w) => JSON.stringify(w.payload ?? null).includes(key)) ? "a proposal on To review" : null;
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
