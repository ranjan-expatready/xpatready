// C4.11 part 3 (forms lane, B4b; the tech lead's option (a) on #319, BR-6, RULES-MODEL §2): accepting a `condition`
// item on the queue never edits a question directly. A question's condition lives on the shared library question
// (section_question), so it changes every combination that uses its section: accepting writes a waiting library change
// (kind placement_condition) that a second person approves on To review; at approval the question gets a draft version
// with the condition (checked again first), published with the next release that carries it. The same path as "who
// fills" (who-fills.ts, runtime lane). Undo within the batch removes the waiting change (proposals.ts undo by batchId).
// No schema change, no per-combination override. Every condition is Sample until the immigration expert confirms it.
import { HttpException, HttpStatus } from "@nestjs/common";
import type { LibraryChange, Prisma } from "@prisma/client";
import { Audit, Db, revise, strip, type Actor } from "./core.ts";
import { checkCondition } from "../../engine/validate.ts";
import { placementRefusal } from "../../engine/field-scope.ts";

export const COND_KIND = "placement_condition", COND_ACTION = "SET_CONDITION";
const OPEN = ["WAITING", "RETURNED", "APPROVED"];
type Tx = Prisma.TransactionClient;
const problem = (status: number, title: string, detail: string) =>
  new HttpException({ type: `https://expatready.local/problems/${title.toLowerCase().replace(/[^a-z]+/g, "-")}`, title, status, detail }, status);

async function placementOf(db: Pick<Tx, "sectionQuestion">, workspaceId: string, key: string) {
  const rows = await db.sectionQuestion.findMany({ where: { workspaceId, lineageKey: key }, orderBy: { version: "desc" } });
  return { rows, current: rows.find((r) => r.status === "DRAFT") ?? rows.find((r) => r.status === "PUBLISHED") ?? null };
}
const nameOf = async (db: Pick<Tx, "canonicalField">, workspaceId: string, key: string) => {
  const f = await db.canonicalField.findFirst({ where: { workspaceId, canonicalFieldKey: key }, orderBy: { version: "desc" } });
  return (f?.meaning ?? f?.label ?? key).trim().replace(/\.$/, "").replace(/^./, (x) => x.toUpperCase());
};
/** C3.16 (#1054 M1): a question asked once for the household or employer cannot depend on one person's answer yet. */
async function refuseScoped(db: Pick<Tx, "canonicalField">, workspaceId: string, key: string) {
  const f = await db.canonicalField.findFirst({ where: { workspaceId, canonicalFieldKey: key }, orderBy: { version: "desc" }, select: { scope: true } });
  const no = placementRefusal(f?.scope, { repeats: "per_person", condition: true });
  if (no) throw problem(422, "Asked once", no); // the same status as placeField (review m2)
}
const sameTree = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** The queue's lander (proposals.ts LANDERS.condition): a waiting library change, never a direct edit. Returns its id. */
export async function proposeConditionChange(tx: Tx, l: { ws: string; actor: Actor; batchId: string | null; itemId: string | null; reason: string | null; sourceJobId?: string | null; combinationId?: string | null },
  p: { target: { kind: string; key: string }; roles: string[]; condition: { sentence: string; tree: unknown } }): Promise<string> {
  if (p.target.kind !== "question") throw problem(409, "Not a question", "Only a condition on a question is accepted here; a section or form line condition is set on its own page.");
  const key = p.target.key, name = await nameOf(tx, l.ws, key);
  const { current } = await placementOf(tx, l.ws, key);
  if (!current) throw problem(409, "Not placed", `No question asks "${name}" in the library, so its condition has nowhere to go. Remove this item.`);
  await refuseScoped(tx, l.ws, key); // C3.16 (#1054 M1): a household or employer question takes no condition yet
  const types = new Map((await tx.canonicalField.findMany({ where: { workspaceId: l.ws }, select: { canonicalFieldKey: true, valueType: true } })).map((f) => [f.canonicalFieldKey, f.valueType]));
  const errs = checkCondition(p.condition.tree, types, new Set());
  if (errs.length) throw problem(409, "Condition not valid", `The condition on "${name}" is not valid any more (it ${errs[0]}), so it is not proposed. Remove this item.`);
  if (sameTree(current.predicateJson, p.condition.tree)) throw problem(409, "Nothing changes", `"${name}" already has this condition in the library.`);
  await tx.$executeRawUnsafe(`select pg_advisory_xact_lock(hashtext($1))`, `placement_condition:${l.ws}:${key}`);
  if (await tx.libraryChange.findFirst({ where: { workspaceId: l.ws, kind: COND_KIND, key, status: { in: OPEN } } })) throw problem(409, "Already waiting", `A change of when "${name}" is asked already waits on To review or for the next release.`);
  const uses = await tx.combination.count({ where: { workspaceId: l.ws, retiredAt: null, sections: { some: { sectionKey: current.sectionKey } } } });
  const label = `${name} · ${p.condition.sentence.replace(/^"[^"]*" is /, "").replace(/\.$/, "")}, for every combination that asks it`.slice(0, 300);
  const c = await tx.libraryChange.create({ data: { workspaceId: l.ws, kind: COND_KIND, key, label, action: COND_ACTION, reason: l.reason, status: "WAITING", proposedBy: l.actor.id, appliedBy: l.actor.id,
    matches: { before: current.predicateJson ?? null, beforePlain: current.conditionPlain ?? null, after: p.condition.tree, sentence: p.condition.sentence, section: current.sectionKey, uses } as Prisma.InputJsonValue,
    sourceJobId: l.sourceJobId ?? null, combinationId: l.combinationId ?? null, proposalItemId: l.itemId, batchId: l.batchId } });
  return c.id;
}

/** What the second person compares on To review: before → after, the reason, how many combinations ask it. */
export function conditionView(c: Pick<LibraryChange, "matches" | "reason">) {
  const m = (c.matches ?? {}) as { beforePlain?: string | null; sentence?: string; uses?: number };
  return { before: m.beforePlain ?? "Always asked", after: m.sentence ?? "", uses: m.uses ?? 0, reason: c.reason ?? "" };
}

/** At approval (lifecycle afterApprove): the question gets a draft version with the condition, checked again first. */
export async function applyCondition(db: Db, audit: Audit, actor: Actor, c: LibraryChange) {
  const m = c.matches as { before?: unknown; after?: unknown; sentence?: string };
  const { rows, current } = await placementOf(db, c.workspaceId, c.key);
  if (!current || !m.after) throw problem(409, "Not placed", "The question is no longer placed in the library, so nothing was changed. Return the change.");
  if (!sameTree(current.predicateJson, m.before)) throw problem(HttpStatus.CONFLICT, "Changed since", "When this question is asked changed after it was proposed, so nothing was changed. Return it; it can be drafted again.");
  await refuseScoped(db, c.workspaceId, c.key); // C3.16: checked again at approval (the scope may have been set since)
  await revise(db.sectionQuestion, rows, { predicateJson: m.after as Prisma.InputJsonValue, conditionEffect: "SHOW", conditionPlain: m.sentence ?? null, origin: "AI_PROPOSAL" }, actor.id, strip);
  await audit.log(c.workspaceId, actor.id, "approved", "placement", c.key, `${actor.name} approved: ${c.label ?? c.key}. A draft of the question goes out with the next release.`);
}

/** At a release (publishLibraryChanges): an approved change whose question draft this release published is released. */
export async function releaseCondition(tx: Tx, workspaceId: string, pack: number) {
  const out: { kind: string; key: string; label: string; action: string }[] = [];
  for (const c of await tx.libraryChange.findMany({ where: { workspaceId, kind: COND_KIND, status: "APPROVED" } })) {
    if (await tx.sectionQuestion.count({ where: { workspaceId, lineageKey: c.key, status: "DRAFT" } })) continue;
    await tx.libraryChange.update({ where: { id: c.id }, data: { status: "RELEASED", releasedIn: pack } });
    out.push({ kind: c.kind, key: c.key, label: c.label ?? c.key, action: c.action });
  }
  return out;
}
