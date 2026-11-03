// The forms lane's part of the demo story (P-93, DEMO.md rows 1 and 7). The runtime lane's demo seed (api/src/demo.ts,
// D1) calls seedFormsStory for combination A (Visitor visa) after setting it up; until it does, POST /api/demo/forms-story
// runs it from the Demo menu or a check. Like the demo loader it stands in for people on the screens and calls the same
// services they do: the official files go through the one intake; an off-list copy of a visitor visa form is held and
// decided by a second person (P-80); the checklist drafting path runs its stub pass (no AI until the founder's live run).
// Never AI, never a case answer; every value is Sample. W1-02 (P-102): the APR rows (2: online capture, 13: filed Online
// on the APR Portal) are parked with the browser extension; forms come in only as PDFs.
import { HttpStatus } from "@nestjs/common";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { manifest } from "../../engine/import.ts";
import { ACTORS, Db, fail, isDemoWorkspace, need, OFFICIAL, type Actor } from "./core.ts";
import type { Checklists } from "./checklist.ts";
import type { Intake } from "./intake.ts";
import type { Sources } from "./sources.ts";

const who = (id: string) => ACTORS.find((a) => a.id === id)! as Actor;
const AUTHOR = who("user-A"), REVIEWER = who("user-C");
/** Row 1: the visitor visa's official forms and checklists (DEMO.md combination A). */
export const STORY_FILES = ["imm5257e.pdf", "imm5707e.pdf", "imm5476e.pdf", "imm5484e.pdf", "IMM5881E.pdf"];
/** Row 1's off-list copy: the first of these visitor visa forms whose edition the library does not hold yet (a copy of an
 *  edition the library holds is not needed: review-3 Major 1), as a person would have saved it from an email. Visitor
 *  visa forms only, never another program's (review-4 Major 2): IMM 5409, the common-law declaration Guide 5256 asks
 *  for "if it applies", then Schedule 1. Which forms a program uses is Sample until the immigration expert confirms. */
export const COPY_CANDIDATES = ["imm5409e.pdf", "imm5257_1e.pdf"];

type Services = { db: Db; intake: Intake; sources: Sources; checklists: Checklists };
export type FormsStory = { log: string[]; held_decision: "approved" | "rejected" | null; checklist_job_id: string | null };
/** One run per combination at a time (break 13): a second click while it runs is told so. */
const running = new Set<string>();

/** Rows 1 and 7 for one combination. */
export async function seedFormsStory(s: Services, actor: Actor, combinationId: string): Promise<FormsStory> {
  need(actor, "author");
  // C5.5 (breaker F4): it records the content reviewer's decision for them, so never outside the demo workspace.
  if (!isDemoWorkspace()) fail("This demo control works only in the demo workspace.", HttpStatus.CONFLICT);
  const combo = await s.db.combination.findUnique({ where: { id: combinationId } });
  if (!combo) fail("That combination does not exist (it may have been removed by a reset).", HttpStatus.NOT_FOUND);
  // Break 13: the story's files are the visitor visa's (combination A); never attached to another combination.
  if (!/^visitor visa$/i.test(combo!.label.trim())) fail(`The forms part of the demo story is for the Visitor visa (combination A), not "${combo!.label}".`, HttpStatus.CONFLICT);
  if (running.has(combinationId)) fail("The forms part of the demo story is already running for this combination: wait for it to finish.", HttpStatus.CONFLICT);
  running.add(combinationId);
  try { return await seedSteps(s, combinationId, combo!.label); } finally { running.delete(combinationId); }
}

async function seedSteps(s: Services, combinationId: string, label: string): Promise<FormsStory> {
  const combo = await s.db.combination.findUniqueOrThrow({ where: { id: combinationId } });
  // Run once per combination: a finished run leaves its own history entry (break m5: never a file name a person could also use).
  if (await s.db.auditEvent.count({ where: { combinationId, action: "seeded", entity: "demo story" } }))
    fail(`"${label}" already holds the forms part of the demo story: reset the demo to run it again.`, HttpStatus.CONFLICT);
  const log: string[] = [];
  // Row 1: each official file through the one intake (code, edition, checksum read without AI); a form is read here.
  for (const f of STORY_FILES) {
    const r = await s.intake.sample(AUTHOR, combinationId, f);
    if (r.attachmentStatus === "RECOGNISED" && r.attachmentId) await s.sources.read(AUTHOR, r.attachmentId);
    log.push(`row 1: ${r.edition ?? f}: ${r.outcome}`);
  }
  // Row 1: a copy of a visitor visa form saved from an email (its bytes differ from the official file, so its checksum is
  // on no list): held, the uploader records the IRCC page, a second person decides (P-80). Approved when the library does
  // not hold that edition yet; when it does (the setup's library holds every visitor visa form), the copy is not needed
  // and the second person rejects it with that reason (review-3 Major 1: never a copy approved into a loop).
  const editions = new Set((await s.db.formEdition.findMany({ where: { workspaceId: combo.workspaceId }, select: { editionLabel: true } })).map((e) => e.editionLabel));
  const pick = manifest().filter((i) => COPY_CANDIDATES.includes(i.file)).sort((a, b) => COPY_CANDIDATES.indexOf(a.file) - COPY_CANDIDATES.indexOf(b.file)).find((i) => !editions.has(i.edition)) ?? manifest().find((i) => i.file === COPY_CANDIDATES[0])!;
  const copy = Buffer.concat([readFileSync(join(OFFICIAL, pick.path)), Buffer.from("\n% Sample: a copy saved from an email (forms lane demo story)\n")]);
  const held = (await s.intake.intake(AUTHOR, [{ originalname: `${pick.file.replace(/\.pdf$/, "")}-from-email.pdf`, buffer: copy }], combinationId)).results[0];
  let decision: FormsStory["held_decision"] = null;
  const item = await s.db.intakeItem.findFirst({ where: { sha256: held.sha256 ?? "", status: "HELD" } });
  if (item) {
    await s.intake.recordPage(AUTHOR, item.id, { irccPage: pick.url && /^https:\/\/(www\.)?canada\.ca\//.test(pick.url) ? pick.url : "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/application-forms-guides.html" });
    const inLibrary = item.editionLabel ? await s.db.formEdition.findUnique({ where: { workspaceId_editionLabel: { workspaceId: item.workspaceId, editionLabel: item.editionLabel } } }) : null;
    if (inLibrary) { await s.intake.decideHeld(REVIEWER, item.id, "reject", { note: `Sample: the library already holds ${item.editionLabel} from the official file` }); decision = "rejected"; }
    else { await s.intake.decideHeld(REVIEWER, item.id, "approve", { note: "Sample: compared with the IRCC page" }); decision = "approved"; }
  }
  log.push(`row 1: an off-list copy of ${held.edition ?? held.file}: ${held.outcome}${decision ? `, ${decision} by a second person` : ""}`);
  // Row 7: the checklist drafting path (stub pass: no AI until the founder's live run).
  const checklist = await s.db.sourceAttachment.findFirst({ where: { combinationId, kind: "Document checklist", recognised: true }, orderBy: { createdAt: "asc" } });
  const job = checklist ? await s.checklists.draft(AUTHOR, checklist.id, { mode: "stub" }) : null;
  log.push(`row 7: ${checklist ? `${checklist.edition}: checklist drafting stub pass (US$0, the live draft waits for the founder)` : "no checklist attached"}`);
  await s.db.auditEvent.create({ data: { workspaceId: combo.workspaceId, actor: AUTHOR.id, action: "seeded", entity: "demo story", entityKey: "forms", summary: `The forms part of the demo story ran on "${label}" (rows 1 and 7; Sample, no AI)`, combinationId } });
  return { log, held_decision: decision, checklist_job_id: job?.id ?? null };
}
