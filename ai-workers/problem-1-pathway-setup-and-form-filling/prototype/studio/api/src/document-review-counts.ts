// C6.5 part 2c (P-243, row L-SA9; rows.md C6.5 "Done when": "staff corrections are counted per review mode and can be
// read"): how often staff correct a value a document gave, counted by its review mode (collapsed: backed by passed check
// digits; expanded: looked at one by one), so the team can see the reader's error rate (impact report D1). Staff only.
// A correction (rows.md Q1, the tech lead's recommendation, confirm on the PR):
//   * a staff answer (the Agent view, OFFICER_ENTRY) saved after the document was read, that differs from what it read
//     (a correction before Confirm & use, or any later change to a value that came from the document); or
//   * a typed-versus-document check resolved by keeping the answer, not the document's value.
// A client's own change, an answer equal to what the document read, a value nobody touched, an answer saved after a
// newer file replaced the document, and a check a newer file closed are not corrections. A value the reader gave but not
// in the question's terms (a country only as a code: notWritable) is left for a person: counted apart (left), never as
// read or corrected (review M1 on c774e63b6: answering it is the expected path, not a reader error).
// Read only; nothing is stored (computed from read_value, answer_check and the answers' own history). US$0.
import { Controller, Get, Headers, HttpStatus, Inject, Injectable, Param } from "@nestjs/common";
import { notWritable, typedOf } from "./case-documents.ts";
import { CORRECTION_RULE, countCorrections, type ReviewCounts } from "./document-review-rule.ts";
import { actorOf, CaseRead, Db, fail, type Actor } from "./core.ts";
import { Runtime } from "./runtime.ts";

type H = string | undefined;
export { CORRECTION_RULE, REPLACED, countCorrections, type ModeCount, type ReviewCounts } from "./document-review-rule.ts";

@Injectable()
export class DocumentReviewCounts {
  constructor(@Inject(Runtime) private readonly r: Runtime, @Inject(Db) private readonly db: Db) {}

  /** GET /runtime/cases/:id/document-reviews/counts: staff of the case's firm only. */
  async counts(actor: Actor, caseId: string): Promise<ReviewCounts> {
    const c = await this.r.reach(actor, caseId, "officer");
    const values = await this.db.readValue.findMany({ where: { caseId: c.id }, include: { read: { select: { readAt: true, document: { select: { supersededAt: true } } } } } });
    const s = this.r.snapshotOf(c);
    const subjects = [...new Set(values.map((v) => v.subjectId))], facts = [...new Set(values.map((v) => v.fact))];
    const answers = values.length ? await this.db.clientCanonicalAnswer.findMany({ where: { subjectId: { in: subjects }, canonicalFieldKey: { in: facts }, rowKey: null }, select: { subjectId: true, canonicalFieldKey: true, valueJson: true, sourceJson: true, effectiveAt: true } }) : [];
    const kept = values.length ? await this.db.answerCheck.findMany({ where: { caseId: c.id, state: "resolved", kept: "answer", resolvedBy: { not: null } }, select: { readValueId: true, resolvedBy: true, resolvedAt: true, reason: true } }) : [];
    const out = countCorrections(values.map((v) => ({ id: v.id, subjectId: v.subjectId, fact: v.fact, review: v.review, valueJson: typedOf(s, v.fact, v.valueJson), documentId: v.documentId, readAt: v.read.readAt,
      left: notWritable(s, v.fact, v.valueJson) !== null, replacedAt: v.read.document.supersededAt })),
      answers.map((a) => { const src = a.sourceJson as { channel?: string; actor?: string }; return { subjectId: a.subjectId, fact: a.canonicalFieldKey, valueJson: a.valueJson, channel: src.channel ?? "", actor: src.actor ?? "", at: a.effectiveAt }; }),
      // A replaced file's check closed by a newer file (its reason says so) is the system's, not a person's judgement (countCorrections).
      kept.filter((k) => k.resolvedBy && k.resolvedAt).map((k) => ({ readValueId: k.readValueId, by: k.resolvedBy!, at: k.resolvedAt!, reason: k.reason })));
    return { case_id: c.id, ...out, rule: CORRECTION_RULE };
  }
}

@CaseRead()
@Controller("api/runtime")
export class DocumentReviewCountsController {
  constructor(@Inject(DocumentReviewCounts) private readonly x: DocumentReviewCounts) {}
  @Get("cases/:id/document-reviews/counts") counts(@Headers("x-actor") a: H, @Param("id") id: string) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) fail("No such case.", HttpStatus.NOT_FOUND);
    return this.x.counts(actorOf(a), id);
  }
}
