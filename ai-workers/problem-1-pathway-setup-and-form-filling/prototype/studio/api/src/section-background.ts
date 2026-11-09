// B154 (runtime lane; P-97, P-244, P-412 F11): the author route for a library section's `client_only` flag, "Background
// answers". A section so marked holds the client's own answers for every combination: a document or the case officer is
// never their source (P-97, W1-15), staff may still record one taken by phone or in person, marked Officer, and the client
// re-confirms it before signing (P-244, C6.18). The flag changes only as a library change, like who fills a question
// (C4.9, api/src/who-fills.ts): proposed here with a reason, approved on To review by a second person (decideChange), applied
// at approval as a draft section version, and published with the next release that carries the section's questions
// (publishLibraryChanges marks it released). Declarations stay the client's own: a section that asks one is never
// unmarked (P-244 "Declarations stay client-only"). Which sections are marked is the author's choice, never a list here
// (P-319). Unconfirmed: expert, no counsel. US$0, no AI.
import { refuseRetired } from "./library-items.ts";
import { Body, Controller, Headers, HttpException, HttpStatus, Inject, Injectable, Param, Post } from "@nestjs/common";
import type { LibraryChange, Prisma } from "@prisma/client";
import { z } from "zod";
import { problemFromZod } from "../../contracts/programs.ts";
import { factName } from "../../engine/fact-name.ts";
import { AGENT_FROM, isAgentFact } from "../../engine/sources.ts";
import { actorOf, Audit, Db, need, revise, strip, Workspace, type Actor } from "./core.ts";

type H = string | undefined;
const problem = (status: number, title: string, detail: string) =>
  new HttpException({ type: `https://expatready.local/problems/${title.toLowerCase().replace(/[^a-z]+/g, "-")}`, title, status, detail }, status);

export const KIND = "section_background", ACTION = "SET_BACKGROUND";
/** What the mark means, said wherever it is offered or shown (P-97, P-244). */
export const BACKGROUND_MEANS = "The client's own answers for every combination: never from a document or the case officer's records. Staff may record one the client gives by phone or in person, marked Officer, and the client re-confirms it before signing.";
const REASON_MIN = 5;
const OPEN = ["WAITING", "RETURNED", "APPROVED"];

export const ProposeBackground = z.object({
  on: z.boolean({ error: "Say whether the section holds background answers (true) or not (false)." }),
  // Break m2: invisible characters (zero-width spaces and other format marks) are not a reason.
  reason: z.string({ error: "Say why it changes for every combination." }).transform((x) => x.normalize("NFKC").replace(/[\p{Cf}]/gu, "")).pipe(z.string().trim().min(REASON_MIN, `Write at least ${REASON_MIN} characters: why it changes for every combination.`).max(300, "Keep the reason under 300 characters.")),
}).strict();

/** The section's versions, newest first, and the one that counts now (a draft, else the newest published). */
async function sectionOf(db: Pick<Db, "logicalSection">, workspaceId: string, key: string) {
  const rows = await db.logicalSection.findMany({ where: { workspaceId, sectionKey: key }, orderBy: { version: "desc" } });
  return { rows, current: rows.find((r) => r.status === "DRAFT") ?? rows.find((r) => r.status === "PUBLISHED") ?? null };
}

/** The questions the section asks now: each placement's newest version that still counts (a draft, else published). */
async function questionsOf(db: Pick<Db, "sectionQuestion">, workspaceId: string, key: string) {
  const rows = await db.sectionQuestion.findMany({ where: { workspaceId, sectionKey: key, status: { in: ["DRAFT", "PUBLISHED"] } }, orderBy: { version: "desc" } });
  const seen = new Set<string>(), out: typeof rows = [];
  for (const r of rows) if (!seen.has(r.lineageKey) && seen.add(r.lineageKey)) out.push(r);
  // A question moved to another section since (its newest version is elsewhere) is not asked here any more.
  const moved = new Set((await db.sectionQuestion.findMany({ where: { workspaceId, lineageKey: { in: out.map((r) => r.lineageKey) }, status: { in: ["DRAFT", "PUBLISHED"] }, NOT: { sectionKey: key } }, select: { lineageKey: true, version: true } }))
    .filter((o) => o.version > (out.find((r) => r.lineageKey === o.lineageKey)?.version ?? 0)).map((o) => o.lineageKey));
  return out.filter((r) => !moved.has(r.lineageKey));
}

const quoted = (xs: string[]) => `${xs.slice(0, 2).map((x) => `"${x}"`).join(", ")}${xs.length > 2 ? ` and ${xs.length - 2} more` : ""}`;
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/** Whether the section may take this mark now, checked when it is proposed and again at approval (review M1, M2; break
 *  M2, M3, M4): a section that asks nothing is not marked; a marked section's questions are the client's own, so none
 *  may be filled by the case officer, be the case officer's or representative's own details, or have a change of who
 *  fills it open; a section that asks a declaration keeps its mark (P-244). Returns what the second person reads. */
async function checkMark(db: Db, workspaceId: string, key: string, title: string, on: boolean) {
  const questions = await questionsOf(db, workspaceId, key);
  const facts = [...new Set(questions.map((q) => q.canonicalFieldKey))];
  const fields = new Map((await db.canonicalField.findMany({ where: { workspaceId, canonicalFieldKey: { in: facts } }, orderBy: { version: "desc" }, select: { canonicalFieldKey: true, label: true, meaning: true, valueType: true } }))
    .reverse().map((f) => [f.canonicalFieldKey, f]));
  const name = (k: string) => (fields.get(k)?.label ?? fields.get(k)?.meaning ?? factName(k)).trim().replace(/\.$/, "");
  if (!on) {
    const decl = facts.filter((k) => fields.get(k)?.valueType === "declaration");
    if (decl.length) throw problem(409, "Declarations stay with the client", `"${title}" asks ${plural(decl.length, "a declaration", `${decl.length} declarations`)} (${quoted(decl.map(name))}): a declaration is always the client's own, so the section keeps its mark.`);
    return { facts, documents: [] as string[] };
  }
  if (!facts.length) throw problem(409, "Asks nothing yet", `"${title}" asks no question yet, so there is nothing to mark. Place its questions first.`);
  const own = facts.filter(isAgentFact);
  if (own.length) throw problem(409, "Not the client's to give", `"${title}" asks the case officer's or representative's own details (${quoted(own.map(name))}): background answers are the client's own, so this section is not marked.`);
  const staff = questions.filter((q) => AGENT_FROM.has(q.collectedFrom)).map((q) => q.canonicalFieldKey);
  if (staff.length) throw problem(409, "Filled by the case officer", `In the shared library the case officer fills ${plural(staff.length, "one of its questions", `${staff.length} of its questions`)} (${quoted(staff.map(name))}). Background answers are the client's own: change who fills ${plural(staff.length, "it", "them")} to the client first (Change who fills), then mark the section.`);
  const fills = await db.libraryChange.findMany({ where: { workspaceId, kind: "placement_fills", key: { in: facts }, status: { in: OPEN } }, select: { key: true } });
  if (fills.length) throw problem(409, "Who fills it is changing", `A change of who fills ${quoted(fills.map((f) => name(f.key)))} is open on To review or waits for the next release. Decide or withdraw it first, then mark the section.`);
  // P-97: a marked question never comes from a document; the second person sees which ones a document supplies today.
  const supplied = new Set((await db.documentType.findMany({ where: { workspaceId, status: { in: ["DRAFT", "PUBLISHED"] }, suppliesFacts: { hasSome: facts } }, select: { suppliesFacts: true } })).flatMap((d) => d.suppliesFacts));
  return { facts, documents: facts.filter((k) => supplied.has(k)).map(name) };
}

/** The waiting, returned or approved (not yet released) change of this section's mark, if any. */
export async function openBackgroundChange(db: Pick<Db, "libraryChange">, workspaceId: string, key: string) {
  return db.libraryChange.findFirst({ where: { workspaceId, kind: KIND, key, status: { in: OPEN } }, orderBy: { proposedAt: "desc" } });
}

/** Every open change of a section's mark, by section (Library › Sections lists it on its row). */
export async function openBackgroundChanges(db: Pick<Db, "libraryChange">, workspaceId: string) {
  const out = new Map<string, { id: string; status: string; on: boolean; by: string; reason: string | null }>();
  for (const c of await db.libraryChange.findMany({ where: { workspaceId, kind: KIND, status: { in: OPEN } }, orderBy: { proposedAt: "desc" } }))
    if (!out.has(c.key)) out.set(c.key, { id: c.id, status: c.status, on: !!(c.matches as { after?: boolean } | null)?.after, by: c.proposedBy, reason: c.reason });
  return out;
}

const marked = (on: boolean) => (on ? "background answers" : "ordinary questions");

@Injectable()
export class SectionBackground {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Audit) private readonly audit: Audit, @Inject(Workspace) private readonly ws: Workspace) {}

  async propose(actor: Actor, key: string, body: unknown) {
    need(actor, "author");
    const parsed = ProposeBackground.safeParse(body);
    if (!parsed.success) throw new HttpException(problemFromZod(parsed.error), HttpStatus.BAD_REQUEST);
    const { on, reason } = parsed.data;
    const workspaceId = await this.ws.id();
    const { current } = await sectionOf(this.db, workspaceId, key);
    if (!current) throw problem(404, "Not in the library", "That section is not in the shared library.");
    const title = current.title;
    await refuseRetired(this.db, workspaceId, "section", [key]);
    if (current.clientOnly === on) throw problem(409, "Nothing changes", `"${title}" already holds ${marked(on)} in the library.`);
    const { facts, documents } = await checkMark(this.db, workspaceId, key, title, on);
    if (await openBackgroundChange(this.db, workspaceId, key)) throw problem(409, "Already waiting", `A change of whether "${title}" holds background answers already waits on To review or for the next release.`);
    const uses = facts.length ? await this.db.combination.count({ where: { workspaceId, retiredAt: null, forms: { some: { status: { not: "RETIRED" }, form: { editions: { some: { maps: { some: { canonicalFieldKey: { in: facts } } } } } } } } } }) : 0;
    // A combination that chose a document or the case officer as the source of one of its questions (Comes from, C4.10):
    // once marked, its next release asks to set that back to the client (engine/sources.ts says so), so the second person
    // sees them before approving.
    const others = on && facts.length ? await this.db.factSource.findMany({ where: { workspaceId, canonicalFieldKey: { in: facts }, source: { not: "CLIENT" }, status: { in: ["DRAFT", "PUBLISHED"] }, combination: { retiredAt: null } }, select: { combinationId: true, canonicalFieldKey: true, combination: { select: { label: true } } } }) : [];
    const sourced = [...new Map(others.map((o) => [o.combinationId, o.combination.label])).values()].sort();
    const label = `${title} · ${on ? "background answers" : "no longer background answers"}, for every combination`;
    const c = await this.db.libraryChange.create({ data: { workspaceId, kind: KIND, key, label, action: ACTION, reason, status: "WAITING", proposedBy: actor.id, matches: { before: current.clientOnly, after: on, title, questions: facts.length, uses, sourced, documents } } });
    // Two people proposing at once both pass the check above: the earlier stays, the later is refused (who-fills pattern).
    const first = await this.db.libraryChange.findFirst({ where: { workspaceId, kind: KIND, key, status: "WAITING" }, orderBy: [{ proposedAt: "asc" }, { id: "asc" }] });
    if (first && first.id !== c.id) { await this.db.libraryChange.delete({ where: { id: c.id } }); throw problem(409, "Already waiting", `A change of whether "${title}" holds background answers already waits on To review.`); }
    await this.audit.log(workspaceId, actor.id, "proposed", "section", key, `${actor.name} proposed that "${title}" ${on ? "holds background answers" : "no longer holds background answers"} for every combination (${facts.length} question${facts.length === 1 ? "" : "s"}, used by ${uses}); waits for a second person. Why: ${reason}`);
    return { id: c.id, status: c.status, label, before: current.clientOnly, after: on, questions: facts.length, uses, sourced, documents };
  }
}

/** What the second person compares on To review: before → after, what it means, the reason, the reach. */
export function backgroundView(c: Pick<LibraryChange, "matches" | "reason">) {
  const m = (c.matches ?? {}) as { before?: boolean; after?: boolean; title?: string; questions?: number; uses?: number; sourced?: string[]; documents?: string[] };
  const w = (x?: boolean) => (x ? "Background answers" : "Ordinary questions");
  return { section: m.title ?? "", before: w(m.before), after: w(m.after), on: !!m.after, questions: m.questions ?? 0, uses: m.uses ?? 0, sourced: m.sourced ?? [], documents: m.documents ?? [], means: BACKGROUND_MEANS, reason: c.reason ?? "" };
}

/** One line for To review's list. */
export function backgroundWhat(c: Pick<LibraryChange, "matches" | "reason">) {
  const v = backgroundView(c);
  return `Background answers, for every combination: ${v.before} → ${v.after} · ${v.questions} question${v.questions === 1 ? "" : "s"} · used by ${v.uses} combination${v.uses === 1 ? "" : "s"}${v.sourced.length ? ` · ${v.sourced.length} choose${v.sourced.length === 1 ? "s" : ""} another source for one of them: its next release asks to set it back to the client` : ""}${v.documents.length ? ` · a document supplies ${v.documents.length} of them today: once marked, the client answers ${v.documents.length === 1 ? "it" : "them"}` : ""} · Reason: ${v.reason}`;
}

/** At approval (lifecycle afterApprove): the section gets a draft version with the new mark, checked again first; it is
 *  published with the next release that carries the section's questions. Nothing changes before approval. */
export async function applyBackground(db: Db, audit: Audit, actor: Actor, c: LibraryChange) {
  const m = c.matches as { after?: boolean; before?: boolean };
  const { rows, current } = await sectionOf(db, c.workspaceId, c.key);
  if (!current || typeof m.after !== "boolean") throw problem(409, "Not in the library", "The section is no longer in the shared library, so nothing was changed. Return the change.");
  await refuseRetired(db, c.workspaceId, "section", [c.key]);
  if (current.clientOnly !== m.before) throw problem(409, "Changed since", "Whether this section holds background answers changed after it was proposed, so nothing was changed. Return it; the author proposes it again.");
  await checkMark(db, c.workspaceId, c.key, current.title, m.after); // review M2, break M2: checked again; nothing changes if it no longer holds
  await revise(db.logicalSection, rows, { clientOnly: m.after, origin: "HUMAN" }, actor.id, strip);
  await audit.log(c.workspaceId, actor.id, "approved", "section", c.key, `${actor.name} approved: ${c.label ?? c.key}. A draft of the section goes out with the next release that carries its questions.`);
}

/** Break m1: an approved mark not released yet is withdrawn by its proposer: the section's draft goes back to the mark it
 *  had, and a draft that then differs from the released section in nothing is removed. */
export async function withdrawApprovedBackground(tx: Prisma.TransactionClient, actor: Actor, c: LibraryChange, why: string) {
  const m = c.matches as { before?: boolean };
  const rows = await tx.logicalSection.findMany({ where: { workspaceId: c.workspaceId, sectionKey: c.key }, orderBy: { version: "desc" } });
  const draft = rows.find((r) => r.status === "DRAFT"), live = rows.find((r) => r.status === "PUBLISHED");
  if (draft) {
    const back = { clientOnly: !!m.before };
    if (live && live.title === draft.title && (live.meaning ?? null) === (draft.meaning ?? null) && live.displayOrder === draft.displayOrder && live.clientOnly === back.clientOnly) await tx.logicalSection.delete({ where: { id: draft.id } });
    else await tx.logicalSection.update({ where: { id: draft.id }, data: { ...back, updatedBy: actor.id } });
  }
  const done = await tx.libraryChange.updateMany({ where: { id: c.id, status: "APPROVED" }, data: { status: "WITHDRAWN", decidedBy: actor.id, decidedAt: new Date(), decisionNote: why } });
  if (!done.count) throw problem(409, "Changed meanwhile", "This change was released or decided at the same moment. Refresh to see it.");
  await tx.auditEvent.create({ data: { workspaceId: c.workspaceId, actor: actor.id, action: "withdrawn", entity: "section", entityKey: c.key, summary: `${actor.name} withdrew the approved change "${c.label ?? c.key}" before its release: the section keeps the mark it had. Why: ${why}`.slice(0, 600) } });
}

/** At a release (publishLibraryChanges): an approved change whose section draft this release published is released. */
export async function releaseBackground(tx: Prisma.TransactionClient, workspaceId: string, pack: number) {
  const out: { kind: string; key: string; label: string; action: string }[] = [];
  for (const c of await tx.libraryChange.findMany({ where: { workspaceId, kind: KIND, status: "APPROVED" } })) {
    if (await tx.logicalSection.count({ where: { workspaceId, sectionKey: c.key, status: "DRAFT" } })) continue;
    await tx.libraryChange.update({ where: { id: c.id }, data: { status: "RELEASED", releasedIn: pack } });
    out.push({ kind: c.kind, key: c.key, label: c.label ?? c.key, action: c.action });
  }
  return out;
}

@Controller("api")
export class SectionBackgroundController {
  constructor(@Inject(SectionBackground) private readonly s: SectionBackground) {}
  @Post("library/sections/:key/background") propose(@Headers("x-actor") a: H, @Param("key") key: string, @Body() b: unknown) { return this.s.propose(actorOf(a), key, b); }
}
