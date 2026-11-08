// C6.5 part 2c (P-243, row L-SA9; rows.md C6.5 "Done when": "staff corrections are counted per review mode and can be
// read"): how often staff correct a value a document gave, counted by its review mode (collapsed: backed by passed check
// digits; expanded: looked at one by one), so the team can see the reader's error rate (impact report D1). Staff only.
// A correction (rows.md Q1, the tech lead's recommendation, confirm on the PR):
//   * a staff answer (the Agent view, OFFICER_ENTRY) saved after the document was read, that differs from what it read
//     (a correction before Confirm & use, or any later change to a value that came from the document); or
//   * a typed-versus-document check resolved by keeping the answer, not the document's value.
// A client's own change, an answer equal to what the document read, and a value nobody touched are not corrections.
// Read only; nothing is stored (computed from read_value, answer_check and the answers' own history). US$0.
import { Controller, Get, Headers, HttpStatus, Inject, Injectable, Param } from "@nestjs/common";
import { OFFICER_ENTRY } from "../../engine/runtime/background.ts";
import { sameValue } from "./case-documents.ts";
import { actorOf, CaseRead, Db, fail, type Actor } from "./core.ts";
import { Runtime } from "./runtime.ts";

type H = string | undefined;
/** The reason case-documents.ts writes when a newer file closes a replaced file's check (not a person's judgement). */
const REPLACED = /^Its file was replaced by a newer /;
type Mode = "collapsed" | "expanded";
export type ModeCount = { read: number; corrected: number; rate: number | null };
export type ReviewCounts = { case_id: string; by_mode: Record<Mode, ModeCount>; corrections: { fact: string; review: Mode; document: string; how: "staff_answer" | "kept_answer"; by: string; at: string }[]; rule: string };

export const CORRECTION_RULE = "A correction is a staff answer saved after the document was read that differs from what it read, or a check resolved by keeping the answer instead of the document's value. A client's own change, and an answer equal to the document, are not corrections.";

/** The counts from plain rows (no database), so the rule is tested on its own. */
export function countCorrections(values: { id: string; subjectId: string; fact: string; review: string; valueJson: unknown; documentId: string; readAt: Date }[],
  answers: { subjectId: string; fact: string; valueJson: unknown; channel: string; actor: string; at: Date }[],
  kept: { readValueId: string; by: string; at: Date }[]): Omit<ReviewCounts, "case_id" | "rule"> {
  const by_mode: Record<Mode, ModeCount> = { collapsed: { read: 0, corrected: 0, rate: null }, expanded: { read: 0, corrected: 0, rate: null } };
  const corrections: ReviewCounts["corrections"] = [];
  for (const v of values) {
    const mode: Mode = v.review === "collapsed" ? "collapsed" : "expanded";
    by_mode[mode].read++;
    const staff = answers.filter((a) => a.subjectId === v.subjectId && a.fact === v.fact && a.channel === OFFICER_ENTRY && a.at > v.readAt && !sameValue(v.fact, a.valueJson, v.valueJson)).sort((a, b) => a.at.getTime() - b.at.getTime())[0];
    const keptAnswer = kept.filter((k) => k.readValueId === v.id).sort((a, b) => a.at.getTime() - b.at.getTime())[0];
    const first = [staff && { how: "staff_answer" as const, by: staff.actor, at: staff.at }, keptAnswer && { how: "kept_answer" as const, by: keptAnswer.by, at: keptAnswer.at }].filter((x): x is { how: "staff_answer" | "kept_answer"; by: string; at: Date } => !!x).sort((a, b) => a.at.getTime() - b.at.getTime())[0];
    if (!first) continue;
    by_mode[mode].corrected++;
    corrections.push({ fact: v.fact, review: mode, document: v.documentId, how: first.how, by: first.by, at: first.at.toISOString() });
  }
  for (const m of Object.values(by_mode)) m.rate = m.read ? Math.round((m.corrected / m.read) * 1000) / 1000 : null;
  return { by_mode, corrections };
}

@Injectable()
export class DocumentReviewCounts {
  constructor(@Inject(Runtime) private readonly r: Runtime, @Inject(Db) private readonly db: Db) {}

  /** GET /runtime/cases/:id/document-reviews/counts: staff of the case's firm only. */
  async counts(actor: Actor, caseId: string): Promise<ReviewCounts> {
    const c = await this.r.reach(actor, caseId, "officer");
    const values = await this.db.readValue.findMany({ where: { caseId: c.id }, include: { read: { select: { readAt: true } } } });
    const subjects = [...new Set(values.map((v) => v.subjectId))], facts = [...new Set(values.map((v) => v.fact))];
    const answers = values.length ? await this.db.clientCanonicalAnswer.findMany({ where: { subjectId: { in: subjects }, canonicalFieldKey: { in: facts }, rowKey: null }, select: { subjectId: true, canonicalFieldKey: true, valueJson: true, sourceJson: true, effectiveAt: true } }) : [];
    const kept = values.length ? await this.db.answerCheck.findMany({ where: { caseId: c.id, state: "resolved", kept: "answer", resolvedBy: { not: null } }, select: { readValueId: true, resolvedBy: true, resolvedAt: true, reason: true } }) : [];
    const out = countCorrections(values.map((v) => ({ id: v.id, subjectId: v.subjectId, fact: v.fact, review: v.review, valueJson: v.valueJson, documentId: v.documentId, readAt: v.read.readAt })),
      answers.map((a) => { const src = a.sourceJson as { channel?: string; actor?: string }; return { subjectId: a.subjectId, fact: a.canonicalFieldKey, valueJson: a.valueJson, channel: src.channel ?? "", actor: src.actor ?? "", at: a.effectiveAt }; }),
      // A replaced file's check closed by a newer file (its reason says so) is the system's, not a person's judgement of the value.
      kept.filter((k) => k.resolvedBy && k.resolvedAt && !REPLACED.test(k.reason ?? "")).map((k) => ({ readValueId: k.readValueId, by: k.resolvedBy!, at: k.resolvedAt! })));
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
