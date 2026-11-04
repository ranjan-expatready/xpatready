// Small helpers other services use when they create a form line or take a field id from a person (F1, forms lane).
// Kept apart from forms.ts so sources.ts can use them without an import cycle.
import { Prisma } from "@prisma/client";
import { HttpStatus } from "@nestjs/common";
import { Db, fail } from "./core.ts";
import { WHO } from "./studio.ts";
import { canonicalFact } from "../../engine/resolver.ts";
import { notFiledWords } from "../../engine/form-type.ts";

/** A field id merged into another redirects to it (P-65); any other id is returned as it is. SH3: the chain rule is the
 *  resolver's (contracts/resolver.ts R9); this answers one hop from the newest version of the field. */
export async function resolveKey(db: Db, workspaceId: string, key: string) {
  return canonicalFact(key, async (k) => (await db.canonicalField.findFirst({ where: { workspaceId, canonicalFieldKey: k }, orderBy: { version: "desc" } }))?.mergedIntoKey);
}

/** Puts a library form on a combination as a draft line (QA-13), or answers "already" when its newest version is on it.
 *  Only the newest version of the line counts. Adding back a removed form restores the line, never a different one
 *  (CHECK must 2): a removal not released yet is taken back (the released line returns unchanged, or a draft-only line
 *  becomes a draft again with its own who and when); after a released removal the form comes back as a new version
 *  with the content it had when removed. A new line is filed as a PDF upload (F1, P-102). Writes never raise a duplicate
 *  error, so a racing request inside a transaction (the AI apply) is answered "already" instead of aborting it. */
export async function addFormLine(db: Pick<Db, "combinationForm" | "govFormDef" | "libraryChange">, l: { workspaceId: string; combinationId: string; govFormDefId: string; formKey: string; who?: string; origin: "HUMAN" | "AI_PROPOSAL" | "AI_FOUND"; by: string; sourceQuote: string;
  /** S4: the form finder's reading (always, or only if: its plain condition from the page) and its run. */
  attachMode?: "COMBINATION_MANDATORY" | "ANSWER_CONDITIONAL"; conditionPlain?: string | null; finderBatchId?: string }): Promise<"added" | "already"> {
  if (l.who !== undefined && !WHO.includes(l.who)) fail("Choose whose form it is from the list.");
  // S4 round 3 R3-1 (P-116): nothing new may use a retired form, or one whose retire or delete is open: every attach path
  // (by hand, upload for a row, "+ Add", the finder, an AI apply) comes through here.
  const def = await db.govFormDef.findUnique({ where: { id: l.govFormDefId }, select: { retiredAt: true, formKind: true, displayName: true } });
  // C11.11 (QA-101): a guide or checklist is never a filed form line, on every attach path (it stays a source).
  const notFiled = def ? notFiledWords(l.formKey, def.formKind, def.displayName) : null;
  if (notFiled) fail(notFiled, HttpStatus.CONFLICT);
  if (def?.retiredAt) fail(`${l.formKey} is retired in the library: restore it there first.`, HttpStatus.CONFLICT);
  const closing = await db.libraryChange.findFirst({ where: { workspaceId: l.workspaceId, kind: "library_form", key: l.formKey, action: { in: ["RETIRE", "DELETE"] }, status: { in: ["WAITING", "APPROVED"] } } });
  if (closing) fail(`A request to ${closing.action.toLowerCase()} ${l.formKey} is open on To review: nothing new may use it until it is decided.`, HttpStatus.CONFLICT);
  const history = await db.combinationForm.findMany({ where: { combinationId: l.combinationId, lineageKey: l.formKey }, orderBy: { version: "desc" } });
  const newest = history[0];
  if (newest && newest.status !== "RETIRED") return "already";
  const before = newest?.supersedesId ? history.find((h) => h.id === newest.supersedesId) : undefined;
  let n = 0;
  if (newest && before?.status === "PUBLISHED") n = (await db.combinationForm.deleteMany({ where: { id: newest.id, status: "RETIRED" } })).count; // the released line stands again
  else if (newest && !newest.supersedesId) n = (await db.combinationForm.updateMany({ where: { id: newest.id, status: "RETIRED" }, data: { status: "DRAFT", updatedBy: l.by } })).count;
  else {
    // After a released removal the line comes back with the content it had when removed (break M1, C1.8: its copies,
    // minimum age and signer too); a new line gets the defaults.
    const row: Prisma.CombinationFormCreateManyInput = newest
      ? { workspaceId: newest.workspaceId, combinationId: newest.combinationId, lineageKey: newest.lineageKey, govFormDefId: newest.govFormDefId, who: newest.who, attachMode: newest.attachMode, predicateJson: newest.predicateJson ?? Prisma.DbNull, conditionPlain: newest.conditionPlain, sourceQuote: newest.sourceQuote, channel: newest.channel, signature: newest.signature, minAge: newest.minAge, signedBy: newest.signedBy, copies: newest.copies, origin: l.origin, updatedBy: l.by, status: "DRAFT", version: newest.version + 1, supersedesId: newest.id }
      : { workspaceId: l.workspaceId, combinationId: l.combinationId, lineageKey: l.formKey, govFormDefId: l.govFormDefId, who: l.who ?? "each_applicant", attachMode: l.attachMode ?? "COMBINATION_MANDATORY", conditionPlain: l.conditionPlain ?? null, sourceQuote: l.sourceQuote.slice(0, 500), channel: "PDF_UPLOAD", origin: l.origin, finderBatchId: l.finderBatchId ?? null, updatedBy: l.by, status: "DRAFT", version: 1 };
    n = (await db.combinationForm.createMany({ data: [row], skipDuplicates: true })).count;
  }
  return n ? "added" : "already";
}
