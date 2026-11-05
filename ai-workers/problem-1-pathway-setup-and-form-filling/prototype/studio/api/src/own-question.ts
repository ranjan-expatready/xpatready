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
import { Body, Controller, Get, Headers, HttpStatus, Inject, Injectable, Param, Post } from "@nestjs/common";
import { z } from "zod";
import { cleanLabel, labelProblem, problemFromZod } from "../../contracts/programs.ts";
import { effective } from "../../engine/snapshot.ts";
import { manifest } from "../../engine/import.ts";
import { recordedDerivation } from "../../../p5/transforms.ts";
import { actorOf, Audit, Db, fail, need, readerOf, revise, SOLUTION, strip, type Actor } from "./core.ts";
import { keyFor, sameName } from "./library-changes.ts";
import { landField } from "./proposals.ts";
import { lockItem, refuseRetired } from "./library-items.ts";
import { printedQuestion, type Box } from "./own-yes-no.ts";
export { printedQuestion } from "./own-yes-no.ts";

const said = z.string().transform((x) => x.normalize("NFKC").replace(/[\p{Cf}\p{Default_Ignorable_Code_Point}]/gu, "").trim());
export const OwnQuestion = z.object({
  dataPath: z.string({ error: "Name the form field." }).min(1, "Name the form field.").max(300),
  field: z.string().trim().min(3).max(120).optional(),
  label: z.string().max(200).optional(),
  meaning: said.pipe(z.string().max(500, "Keep the meaning under 500 characters.")).optional(),
  reason: said.pipe(z.string().min(8, "Say why in a sentence (at least 8 characters).").max(300)),
}).strict();

/** A Yes/No form field worked out from whether other answers are recorded ("derived: … recorded -> yes_no_code"). */
export const isWorkedOutYesNo = (transform: string | null | undefined) => !!recordedDerivation(transform) && /\byes_no_code\b/.test(transform ?? "");
const YES_NO = new Set(["yes_no", "boolean"]);

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

@Injectable()
export class OwnQuestions {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Audit) private readonly audit: Audit) {}

  private async edition(id: string) {
    const ed = await this.db.formEdition.findUnique({ where: { id } }).catch(() => null);
    if (!ed) fail("This form edition does not exist.", HttpStatus.NOT_FOUND);
    if (ed!.channel !== "PDF") fail("This asks a PDF edition's Yes/No form fields as their own questions.");
    return ed!;
  }

  /** The edition's Yes/No form fields worked out from other answers, each with the form's printed question and the
   *  field it reads now (the one it is asked as, once a person has pointed it at a Yes/No field). */
  async list(editionId: string) {
    const ed = await this.edition(editionId);
    const reading = readingOf(ed.inventoryFile);
    const rows = effective(await this.db.formFieldMap.findMany({ where: { formEditionId: ed.id } }), (m) => m.dataPath, "draft").filter((m) => m.status !== "RETIRED" && m.outcome === "mapped" && isWorkedOutYesNo(m.transform));
    const types = new Map((await this.db.canonicalField.findMany({ where: { workspaceId: ed.workspaceId, canonicalFieldKey: { in: rows.map((r) => r.canonicalFieldKey!).filter(Boolean) }, status: { in: ["DRAFT", "PUBLISHED"] } }, select: { canonicalFieldKey: true, valueType: true } })).map((f) => [f.canonicalFieldKey, f.valueType]));
    return { edition: { id: ed.id, label: ed.editionLabel }, fields: rows.map((r) => ({ dataPath: r.dataPath, question: printedQuestion(reading?.get(r.dataPath)), page: pageOf(r.dataPath), field: r.canonicalFieldKey, worked_out_from: recordedDerivation(r.transform)!.facts, asked: !!r.canonicalFieldKey && YES_NO.has(types.get(r.canonicalFieldKey) ?? "") })) };
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
    if (!cur || cur.status === "RETIRED") fail(`${ed.editionLabel} has no form field ${b.dataPath}.`, HttpStatus.NOT_FOUND);
    if (cur!.outcome !== "mapped" || !isWorkedOutYesNo(cur!.transform)) fail(`${cur!.caption ?? b.dataPath} is not a Yes/No form field worked out from other answers: it is decided on its field map, or on To review › Form fields.`, HttpStatus.CONFLICT);
    const reading = readingOf(ed.inventoryFile);
    if (!reading) fail(`${ed.editionLabel}'s reading cannot be opened, so the form's own question cannot be quoted: read the form again first.`, HttpStatus.CONFLICT);
    const question = printedQuestion(reading!.get(b.dataPath));
    if (!question) fail(`${ed.editionLabel}'s reading has no printed question for ${b.dataPath} (neither its heading nor its caption is a question), so it cannot be asked in the form's words: map it on its field map instead.`, HttpStatus.CONFLICT);
    const from = recordedDerivation(cur!.transform)!.facts;
    const group = (from[0] ?? cur!.canonicalFieldKey ?? "person").split(".")[0];
    const now = await this.db.canonicalField.findFirst({ where: { workspaceId: ws, canonicalFieldKey: cur!.canonicalFieldKey ?? "", status: { in: ["DRAFT", "PUBLISHED"] } }, orderBy: { version: "desc" }, select: { valueType: true, canonicalFieldKey: true } });
    if (now && YES_NO.has(now.valueType) && !from.includes(now.canonicalFieldKey)) fail(`${cur!.caption ?? b.dataPath} is already asked as its own question (${now.canonicalFieldKey}).`, HttpStatus.CONFLICT);
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
      if (!now2 || now2.id !== cur!.id || now2.version !== cur!.version || now2.canonicalFieldKey !== cur!.canonicalFieldKey) fail(`${cur!.caption ?? b.dataPath} was changed by someone else just now: look at it again.`, HttpStatus.CONFLICT);
      let key: string, created = false;
      if (b.field) {
        const f = await tx.canonicalField.findFirst({ where: { workspaceId: ws, canonicalFieldKey: b.field, status: { in: ["DRAFT", "PUBLISHED"] } }, orderBy: { version: "desc" } });
        if (!f) { await refuseRetired(tx, ws, "field", [b.field]); fail(`${b.field} is not a library field: choose one the library has, or name a new one.`, HttpStatus.NOT_FOUND); }
        if (!YES_NO.has(f!.valueType)) fail(`${b.field} is answered as ${f!.valueType}, not Yes or No: choose a Yes/No field.`);
        if (f!.canonicalFieldKey.split(".")[0] !== group) fail(`${b.field} is about ${f!.canonicalFieldKey.split(".")[0]}, but this form field is about ${group}: choose a ${group} field.`);
        key = f!.canonicalFieldKey;
      } else {
        const label = cleanLabel(b.label!);
        const bad = labelProblem(label); if (bad) fail(bad);
        if (b.meaning!.length < 10) fail("Say what the field means, in a sentence (10 characters or more).");
        const twin = await sameName(tx, ws, group, label);
        if (twin) fail(`"${label}" is already a shared field or waiting to be one (${twin.label}): choose it as the library field instead.`, HttpStatus.CONFLICT);
        key = keyFor(group, label, new Set((await tx.canonicalField.findMany({ where: { workspaceId: ws }, select: { canonicalFieldKey: true } })).map((x) => x.canonicalFieldKey)));
        await landField(tx, { ws, actor, batchId: null, itemId: null, reason: `${b.reason} (${actor.name})`, meaningChecked: true, aiVerdict: null },
          { key, meaning: b.meaning!, valueType: "yes_no", label, sourceRef: `${source}; asked as its own question by ${actor.name}`, origin: "HUMAN" });
        created = true;
      }
      await lockItem(tx, ws, "field", [key]); await refuseRetired(tx, ws, "field", [key]);
      // The form field keeps its "worked out" transformation: it now reads its own question, and the facts it names
      // stay the cross-check (QA-165). Its evidence is the printed question only (review m1: it is the box's label on the
      // list before the file); the full citation is the new field's source and the history line.
      await revise(tx.formFieldMap, fresh, { canonicalFieldKey: key, origin: "HUMAN", confidence: null, evidenceQuote: question!.slice(0, 500), reason: `${b.reason} (${actor.name}); ${source}`.slice(0, 500) }, actor.id, strip);
      return { key, created };
    }, { timeout: 30_000, maxWait: 10_000 });
    await this.audit.log(ws, actor.id, "decided", "form field", b.dataPath, `${actor.name} asked ${source} as its own question (${res.key}${res.created ? ", a new shared field waiting for a second person" : ""}): ${b.reason}`);
    return { dataPath: b.dataPath, field: res.key, created: res.created, question, source };
  }
}

@Controller("api")
export class OwnQuestionsController {
  constructor(@Inject(OwnQuestions) private readonly q: OwnQuestions) {}
  @Get("editions/:id/form-fields/own-questions") list(@Headers("x-actor") a: string | undefined, @Param("id") id: string) { readerOf(a); return this.q.list(id); }
  @Post("editions/:id/form-fields/own-question") ask(@Headers("x-actor") a: string | undefined, @Param("id") id: string, @Body() b: unknown) { return this.q.ask(actorOf(a), id, b); }
}
