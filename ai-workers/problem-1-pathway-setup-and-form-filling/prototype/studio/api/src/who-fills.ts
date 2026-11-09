// M2 queue item 3, who fills a question (runtime lane; C4.9, P-97, P-23; plan.md "Who fills", agreed by the Lead 29 Oct).
// Who fills a question for every combination (the client or the case officer) is the library placement's default; it is
// changed only as a library change: proposed here with a reason, approved on To review by a second person (the existing
// decideChange), applied at approval as a draft placement version, and published with the next release that carries the
// question (publishLibraryChanges marks it released). A per-combination choice (Comes from, C4.10) stays and still wins.
// Background and declaration sections (client-only) are never changed (P-97). US$0, no AI.
import { refuseRetired } from "./library-items.ts";
import { Body, Controller, Headers, HttpException, HttpStatus, Inject, Injectable, Param, Post } from "@nestjs/common";
import type { LibraryChange, Prisma } from "@prisma/client";
import { z } from "zod";
import { problemFromZod } from "../../contracts/programs.ts";
import { actorOf, Audit, Db, need, revise, strip, Workspace, type Actor } from "./core.ts";

type H = string | undefined;
const problem = (status: number, title: string, detail: string) =>
  new HttpException({ type: `https://expatready.local/problems/${title.toLowerCase().replace(/[^a-z]+/g, "-")}`, title, status, detail }, status);

/** P-97, Lead Q2: only these two are offered; a document as the source is chosen per combination (Comes from, P-130). */
export const FILLS = { CLIENT: "client_questionnaire", CASE_OFFICER: "staff_working_view" } as const;
export type Fills = keyof typeof FILLS;
export const FILLS_WORDS: Record<Fills, string> = { CLIENT: "the client", CASE_OFFICER: "the case officer" };
export const fillsOf = (collectedFrom: string): Fills | null => collectedFrom === FILLS.CLIENT ? "CLIENT" : collectedFrom === FILLS.CASE_OFFICER ? "CASE_OFFICER" : null;
export const KIND = "placement_fills", ACTION = "SET_FILLS";
/** Said where the direct edit is refused (placeField) and by the library page's door. */
export const FILLS_LOCK = "Who fills a question is changed with a second person: use Change who fills. It goes to To review, then out with the next release.";
const REASON_MIN = 5;
const OPEN = ["WAITING", "RETURNED", "APPROVED"];

export const ProposeFills = z.object({
  to: z.enum(["CLIENT", "CASE_OFFICER"], { message: "Choose who fills it: the client or the case officer." }),
  reason: z.string({ error: "Say why it changes for every combination." }).trim().min(REASON_MIN, `Write at least ${REASON_MIN} characters: why it changes for every combination.`).max(300, "Keep the reason under 300 characters."),
}).strict();

/** B154: an open change marking this section as background answers (waiting, returned or approved, not released). */
async function db_openMark(db: Pick<Db, "libraryChange">, workspaceId: string, sectionKey: string) {
  const open = await db.libraryChange.findMany({ where: { workspaceId, kind: "section_background", key: sectionKey, status: { in: OPEN } }, select: { matches: true } });
  return open.some((c) => (c.matches as { after?: boolean } | null)?.after === true);
}

/** The newest placement of a fact that still counts (a draft, else the newest published). */
async function placementOf(db: Pick<Db, "sectionQuestion">, workspaceId: string, key: string) {
  const rows = await db.sectionQuestion.findMany({ where: { workspaceId, lineageKey: key }, orderBy: { version: "desc" } });
  return { rows, current: rows.find((r) => r.status === "DRAFT") ?? rows.find((r) => r.status === "PUBLISHED") ?? null };
}

/** The waiting, returned or approved (not yet released) change of who fills this question, if any. */
export async function openFillsChange(db: Pick<Db, "libraryChange">, workspaceId: string, key: string) {
  return db.libraryChange.findFirst({ where: { workspaceId, kind: KIND, key, status: { in: OPEN } }, orderBy: { proposedAt: "desc" } });
}

@Injectable()
export class WhoFills {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Audit) private readonly audit: Audit, @Inject(Workspace) private readonly ws: Workspace) {}

  async propose(actor: Actor, key: string, body: unknown) {
    need(actor, "author");
    const parsed = ProposeFills.safeParse(body);
    if (!parsed.success) throw new HttpException(problemFromZod(parsed.error), HttpStatus.BAD_REQUEST);
    const { to, reason } = parsed.data;
    const workspaceId = await this.ws.id();
    const field = await this.db.canonicalField.findFirst({ where: { workspaceId, canonicalFieldKey: key }, orderBy: { version: "desc" } });
    if (!field) throw problem(404, "Not in the library", "That question is not in the shared library.");
    const name = (field.meaning ?? field.label ?? key).trim().replace(/\.$/, "").replace(/^./, (x) => x.toUpperCase());
    if (field.status === "RETIRED") throw problem(409, "Retired", `"${name}" is retired in the library: restore it first.`);
    const { current } = await placementOf(this.db, workspaceId, key);
    if (!current) throw problem(409, "Not placed", `No question asks "${name}" in the library yet, so nobody fills it. Place it in a section first.`);
    const section = await this.db.logicalSection.findFirst({ where: { workspaceId, sectionKey: current.sectionKey }, orderBy: { version: "desc" } });
    // B154 (review M1, break M4): a section waiting to be marked as background answers takes no case officer meanwhile.
    if (to === "CASE_OFFICER" && await db_openMark(this.db, workspaceId, current.sectionKey)) throw problem(409, "Background answers pending", `"${name}" is in ${section?.title ?? "a section"}, which waits to be marked as background answers (the client's own): decide or withdraw that change first.`);
    if (section?.clientOnly) throw problem(409, "Always the client", `"${name}" is in ${section.title ?? "a background and declarations section"}: only the client answers it, so who fills it does not change.`);
    const from = fillsOf(current.collectedFrom);
    if (!from) throw problem(409, "Not a question someone fills", `"${name}" is not filled by the client or the case officer in the library; where it comes from is chosen per combination on its Smart questionnaire (SQR) tab.`);
    if (from === to) throw problem(409, "Nothing changes", `"${name}" is already filled by ${FILLS_WORDS[to]} in the library.`);
    if (await openFillsChange(this.db, workspaceId, key)) throw problem(409, "Already waiting", `A change of who fills "${name}" already waits on To review or for the next release.`);
    const uses = await this.db.combination.count({ where: { workspaceId, retiredAt: null, forms: { some: { status: { not: "RETIRED" }, form: { editions: { some: { maps: { some: { canonicalFieldKey: key } } } } } } } } });
    const label = `${name} · filled by ${FILLS_WORDS[to]}, for every combination`;
    const c = await this.db.libraryChange.create({ data: { workspaceId, kind: KIND, key, label, action: ACTION, reason, status: "WAITING", proposedBy: actor.id, matches: { before: from, after: to, section: current.sectionKey, uses } } });
    // Two people proposing at once both pass the check above: the earlier stays, the later is refused (form_accepts pattern).
    const first = await this.db.libraryChange.findFirst({ where: { workspaceId, kind: KIND, key, status: "WAITING" }, orderBy: [{ proposedAt: "asc" }, { id: "asc" }] });
    if (first && first.id !== c.id) { await this.db.libraryChange.delete({ where: { id: c.id } }); throw problem(409, "Already waiting", `A change of who fills "${name}" already waits on To review.`); }
    await this.audit.log(workspaceId, actor.id, "proposed", "placement", key, `${actor.name} proposed that ${FILLS_WORDS[to]} fills "${name}" for every combination (used by ${uses}); waits for a second person. Why: ${reason}`);
    return { id: c.id, status: c.status, label, before: from, after: to, uses };
  }
}

/** What the second person compares on To review: before → after, the reason, how many combinations use it. */
export function fillsView(c: Pick<LibraryChange, "matches" | "reason">) {
  const m = (c.matches ?? {}) as { before?: Fills; after?: Fills; uses?: number };
  const w = (x?: Fills) => (x === "CASE_OFFICER" ? "Case officer" : x === "CLIENT" ? "Client" : "Not set");
  return { before: w(m.before), after: w(m.after), uses: m.uses ?? 0, reason: c.reason ?? "" };
}

/** At approval (lifecycle afterApprove): the placement gets a draft version with the new default, checked again first;
 *  it is published with the next release that carries the question. Nothing changes before approval. */
export async function applyFills(db: Db, audit: Audit, actor: Actor, c: LibraryChange) {
  const m = c.matches as { after?: Fills; before?: Fills };
  const { rows, current } = await placementOf(db, c.workspaceId, c.key);
  if (!current || !m.after) throw problem(409, "Not placed", "The question is no longer placed in the library, so nothing was changed. Return the change.");
  // C11.9 break round 2 (Major 3): a field retired meanwhile gets no new draft question.
  await refuseRetired(db, c.workspaceId, "field", [c.key]);
  // B154 (review M1): checked again: a question in a section marked (or being marked) as background answers stays the client's.
  if (m.after === "CASE_OFFICER") {
    const section = await db.logicalSection.findFirst({ where: { workspaceId: c.workspaceId, sectionKey: current.sectionKey }, orderBy: { version: "desc" } });
    if (section?.clientOnly || await db_openMark(db, c.workspaceId, current.sectionKey)) throw problem(409, "Background answers", `The question is in ${section?.title ?? "a section"}, which holds (or waits to hold) background answers, the client's own; nothing was changed. Return the change.`);
  }
  if (fillsOf(current.collectedFrom) !== m.before) throw problem(409, "Changed since", "Who fills this question changed after it was proposed, so nothing was changed. Return it; the author proposes it again.");
  await revise(db.sectionQuestion, rows, { collectedFrom: FILLS[m.after], origin: "HUMAN" }, actor.id, strip);
  await audit.log(c.workspaceId, actor.id, "approved", "placement", c.key, `${actor.name} approved: ${c.label ?? c.key}. A draft of the placement goes out with the next release.`);
}

/** At a release (publishLibraryChanges): an approved change whose placement draft this release published is released. */
export async function releaseFills(tx: Prisma.TransactionClient, workspaceId: string, pack: number) {
  const out: { kind: string; key: string; label: string; action: string }[] = [];
  for (const c of await tx.libraryChange.findMany({ where: { workspaceId, kind: KIND, status: "APPROVED" } })) {
    if (await tx.sectionQuestion.count({ where: { workspaceId, lineageKey: c.key, status: "DRAFT" } })) continue;
    await tx.libraryChange.update({ where: { id: c.id }, data: { status: "RELEASED", releasedIn: pack } });
    out.push({ kind: c.kind, key: c.key, label: c.label ?? c.key, action: c.action });
  }
  return out;
}

@Controller("api")
export class WhoFillsController {
  constructor(@Inject(WhoFills) private readonly w: WhoFills) {}
  @Post("library/fields/:key/fills") propose(@Headers("x-actor") a: H, @Param("key") key: string, @Body() b: unknown) { return this.w.propose(actorOf(a), key, b); }
}
