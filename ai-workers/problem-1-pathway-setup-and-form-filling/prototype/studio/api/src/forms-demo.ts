// The forms lane's part of the demo story (P-93, DEMO.md rows 1, 2, 7 and 13; P-98: the APR Portal). The runtime lane's
// demo seed (api/src/demo.ts, D1) calls seedFormsStory for combination A (Visitor visa) after setting it up; until it
// does, POST /api/demo/forms-story runs it from the Demo menu or a check. Like the demo loader it stands in for people
// on the screens and calls the same services they do: the official files go through the one intake; an off-list copy is
// held and approved by a second person (P-80); the Sample APR screens are captured from saved blank pages and approved
// by a second person (P-66, P-98); the checklist drafting path runs its stub pass (no AI until the founder's live run);
// and, for release 2, IMM 5257 is filed Online on the APR Portal with its screen map decided (the runtime lane then
// submits and releases). Never AI, never a case answer; every value is Sample. The real blank APR screens replace the
// Sample ones once the founder captures them (G3).
import { HttpStatus } from "@nestjs/common";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ACTORS, Db, fail, need, OFFICIAL, STUDIO, type Actor } from "./core.ts";
import type { Checklists } from "./checklist.ts";
import type { Forms } from "./forms.ts";
import type { Intake } from "./intake.ts";
import type { Sources } from "./sources.ts";

const who = (id: string) => ACTORS.find((a) => a.id === id)! as Actor;
const AUTHOR = who("user-A"), REVIEWER = who("user-C"), APPROVER = who("user-B");
/** Row 1: the visitor visa's official forms and checklists (DEMO.md combination A). */
export const STORY_FILES = ["imm5257e.pdf", "imm5707e.pdf", "imm5476e.pdf", "imm5484e.pdf", "IMM5881E.pdf"];
/** Row 2: the Sample APR screens of the visitor visa in portal order, as a person answering "Single" sees them (the
 *  spouse screen is a branch, not seen; the screen map lists its PDF questions as not seen). */
export const APR_VV_SCREENS = ["apr-vv-s01-application.html", "apr-vv-s02-personal.html", "apr-vv-s03-marital.html", "apr-vv-s05-language.html", "apr-vv-s06-passport.html"];
const APR_DIR = join(STUDIO, "tests", "fixtures", "portal-apr");
const SCHEDULE_1 = join(OFFICIAL, "forms", "imm5257_1e.pdf");

type Services = { db: Db; forms: Forms; intake: Intake; sources: Sources; checklists: Checklists };
export type FormsStory = { log: string[]; capture_id: string; online_version_id: string; held_approved: boolean; checklist_job_id: string | null };

/** Rows 1, 2 and 7 for one combination; with `online`, row 13's setup too (IMM 5257 filed Online on the APR Portal). */
export async function seedFormsStory(s: Services, actor: Actor, combinationId: string, opts: { online?: boolean } = {}): Promise<FormsStory> {
  need(actor, "author");
  const combo = await s.db.combination.findUnique({ where: { id: combinationId } });
  if (!combo) fail("That combination does not exist (it may have been removed by a reset).", HttpStatus.NOT_FOUND);
  if (await s.db.portalCapture.count({ where: { combinationId, portalKey: "apr_portal", formKey: "IMM 5257", status: { in: ["HELD", "APPROVED"] } } }))
    fail(`"${combo!.label}" already holds the forms part of the demo story: reset the demo to run it again.`, HttpStatus.CONFLICT);
  const log: string[] = [];
  // Row 1: each official file through the one intake (code, edition, checksum read without AI); a form is read here.
  for (const f of STORY_FILES) {
    const r = await s.intake.sample(AUTHOR, combinationId, f);
    if (r.attachmentStatus === "RECOGNISED" && r.attachmentId) await s.sources.read(AUTHOR, r.attachmentId);
    log.push(`row 1: ${r.edition ?? f}: ${r.outcome}`);
  }
  // Row 1: a copy of IMM 5257 Schedule 1 saved from an email (its bytes differ from the official file, so its checksum is
  // on no list): held, the uploader records the IRCC page, a second person compares and approves it (P-80).
  const copy = Buffer.concat([readFileSync(SCHEDULE_1), Buffer.from("\n% Sample: a copy saved from an email (forms lane demo story)\n")]);
  const held = (await s.intake.intake(AUTHOR, [{ originalname: "imm5257-schedule1-from-email.pdf", buffer: copy }], combinationId)).results[0];
  let heldApproved = false;
  const item = await s.db.intakeItem.findFirst({ where: { sha256: held.sha256 ?? "", status: "HELD" } });
  if (item) {
    await s.intake.recordPage(AUTHOR, item.id, { irccPage: "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/application-forms-guides/imm5257-schedule-1.html" });
    await s.intake.decideHeld(REVIEWER, item.id, "approve", { note: "Sample: compared with the IRCC page" });
    heldApproved = true;
  }
  log.push(`row 1: an off-list copy of ${held.edition ?? held.file}: ${held.outcome}${heldApproved ? ", approved by a second person" : ""}`);
  // Row 2: the Sample APR screens, captured from saved blank pages (way A), approved by a second person.
  const cap = await s.forms.createCapture(AUTHOR, { portal: "apr_portal", form: "IMM 5257", title: "Application for a visitor visa", applicationType: "Visitor visa", combinationId });
  await s.forms.addScreens(AUTHOR, cap.id, APR_VV_SCREENS.map((f) => ({ originalname: f, buffer: readFileSync(join(APR_DIR, f)) })));
  await s.forms.finish(AUTHOR, cap.id);
  const approved = await s.forms.approve(APPROVER, cap.id);
  const ed = (await s.db.portalCapture.findUniqueOrThrow({ where: { id: cap.id } })).formEditionId!;
  log.push(`row 2: IMM 5257 online, ${APR_VV_SCREENS.length} Sample APR screens (the spouse branch not seen): ${approved.capture.status.toLowerCase()} by a second person`);
  // Row 7: the checklist drafting path (stub pass: no AI until the founder's live run).
  const checklist = await s.db.sourceAttachment.findFirst({ where: { combinationId, kind: "Document checklist", recognised: true }, orderBy: { createdAt: "asc" } });
  const job = checklist ? await s.checklists.draft(AUTHOR, checklist.id, { mode: "stub" }) : null;
  log.push(`row 7: ${checklist ? `${checklist.edition}: checklist drafting stub pass (US$0, the live draft waits for the founder)` : "no checklist attached"}`);
  if (opts.online) log.push(...(await fileOnlineOnApr(s, combinationId, ed)));
  return { log, capture_id: cap.id, online_version_id: ed, held_approved: heldApproved, checklist_job_id: job?.id ?? null };
}

/** Row 13's setup: the combination files IMM 5257 Online on the APR Portal from the approved online version; its screen
 *  map is drafted without AI and accepted, the UCI is answered on screen (the immigration expert role, Sample), the
 *  other inputs the PDF does not map are not facts, and the sex choice gets its portal codes. Submit and release are
 *  the runtime lane's (release 2). */
async function fileOnlineOnApr(s: Services, combinationId: string, ed: string) {
  await s.forms.setPortal(AUTHOR, combinationId, { portal: "apr_portal" });
  await s.forms.setChannel(AUTHOR, combinationId, "IMM 5257", { channel: "ONLINE" });
  const draft = await s.forms.draftScreenMapFor(AUTHOR, ed);
  await s.forms.acceptScreenMap(REVIEWER, ed, {});
  const open = await s.db.formFieldMap.findMany({ where: { formEditionId: ed, outcome: "unresolved" }, select: { dataPath: true } });
  for (const { dataPath } of open)
    await s.forms.resolveInput(REVIEWER, ed, dataPath === "uci" ? { input: dataPath, answerOnScreen: true, reason: "Sample: the representative answers this on the portal" }
      : dataPath === "birthCity" ? { input: dataPath, fact: "person.place_of_birth_city" } : { input: dataPath, notAFact: true, reason: "Asked elsewhere in this case (demo story, Sample)" });
  await s.forms.draftOptionMaps(AUTHOR, ed);
  await s.forms.setOptionMap(AUTHOR, ed, { dataPath: "sex", map: { f_female: "FEMALE", m_male: "MALE", u_unknown: "UNKNOWN", x_another_gender: "ANOTHER" }, unused: [] });
  return [`row 13: IMM 5257 filed Online on the APR Portal; screen map ${draft.counts.mapped} of ${draft.counts.inputs} inputs matched without AI, ${open.length} decided by a person, ${draft.pdf_not_on_portal.length} PDF questions not on any captured screen; ready for release 2`];
}
