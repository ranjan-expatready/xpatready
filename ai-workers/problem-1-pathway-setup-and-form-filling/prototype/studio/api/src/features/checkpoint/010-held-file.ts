// C10.1 row 1: every official file through the intake (the six load), then one off-list file with a readable edition,
// held and approved by a second person through the intake's own steps (X9a; the forms lane's demo story does the same).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { OFFICIAL, type Actor } from "../../core.ts";
import { Intake } from "../../intake.ts";
import type { CheckpointContext, CheckpointStep } from "./_context.ts";

/** C10.1 row 1 (X9a): the off-list file the configured checkpoint uploads (Sample): IMM 5257's previous edition (the
 *  official-sources/ircc manifest's previous-editions/imm5257e-pre-2023.pdf, P-32), saved again so its checksum is on no
 *  list; its IRCC page on canada.ca. Not IMM 5476 2021 since QA-207: row 17 makes that the library's edition. */
export const OFF_LIST_COPY = { official: "previous-editions/imm5257e-pre-2023.pdf", name: "imm5257e-pre-2023-from-email.pdf", page: "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/application-forms-guides/imm5257.html", library: "IMM 5257 (09-2023)" };

/** C10.1 row 1 (X9a): an off-list copy of IMM 5257's previous edition, as a person would have saved it from an email (its
 *  bytes differ from the official file, so its checksum is on no approved list; Sample). The author uploads it on the
 *  Visitor visa (held for source verification), records the IRCC page it came from, and the approver, a second person,
 *  compares and approves it on the intake's own route (P-80). The library holds IMM 5257 (09-2023), not the older
 *  edition, so the copy is not a duplicate (review-3 Major 1). Once approved it goes through the intake again: an edition older than the
 *  library's is set aside by the Approver, never used, which the row says. */
async function heldFileApproved(ctx: CheckpointContext, author: Actor, approver: Actor, workspaceId: string): Promise<{ ok: true; shows: string } | { ok: false; why: string }> {
  const intake = ctx.get(Intake);
  const vv = await ctx.db.combination.findFirst({ where: { workspaceId, combinationKey: "vv.single" }, select: { id: true } });
  if (!vv) return { ok: false, why: "The Visitor visa combination is not in the sample, so the off-list copy has nowhere to be uploaded." };
  const copy = Buffer.concat([readFileSync(join(OFFICIAL, OFF_LIST_COPY.official)), Buffer.from("\n% Sample: a copy saved from an email (C10.1 row 1, X9a)\n")]);
  const up = (await intake.intake(author, [{ originalname: OFF_LIST_COPY.name, buffer: copy }], vv.id)).results[0];
  const item = await ctx.db.intakeItem.findFirst({ where: { workspaceId, sha256: up.sha256 ?? "", status: "HELD", outcome: "held" } });
  if (!item) return { ok: false, why: `The off-list copy of IMM 5257's previous edition was not held for a source check: ${up.message}` };
  await intake.recordPage(author, item.id, { irccPage: OFF_LIST_COPY.page });
  const done = await intake.decideHeld(approver, item.id, "approve", { note: "Sample: compared with the IRCC page", irccPage: OFF_LIST_COPY.page });
  // Review m2 (f7): the re-intake holds it as an older edition; the Approver sets it aside with that reason, so nothing is
  // left waiting on To review (a second person may set aside an older edition: Intake.heldFile anyHold).
  let after = done.result ? ` Then the intake: ${done.result.message}` : "";
  if (done.result?.outcome === "older_edition_held") {
    const older = await ctx.db.intakeItem.findFirst({ where: { workspaceId, sha256: item.sha256, status: "HELD", outcome: "older_edition_held" }, select: { id: true } });
    // #300 n2: say "set it aside" only when there was a held row to set aside.
    if (older) await intake.decideHeld(approver, older.id, "reject", { note: `Sample: older than the library's ${OFF_LIST_COPY.library}, so it is not used.` });
    after = older ? ` Then the intake found it older than the library's ${OFF_LIST_COPY.library}, and ${approver.name} set it aside: not used.` : ` Then the intake found it older than the library's ${OFF_LIST_COPY.library}: not used.`;
  }
  return { ok: true, shows: `an off-list copy of ${item.editionLabel ?? "IMM 5257's previous edition"} (${OFF_LIST_COPY.name}) held for a source check, its IRCC page recorded by ${author.name}, approved by ${approver.name}.${after}` };
}

export default {
  async run(ctx) {
    const { db, workspaceId, author, approver, timed, said, row } = ctx;
    const files = ctx.six.combinations.reduce((t, c) => t + c.files, 0);
    // Only a file held because its edition could not be read (outcome "held"); a new edition held for row 17 is another
    // kind of held file, said on row 17 (QA-207 review m5).
    const unread = await db.intakeItem.findMany({ where: { workspaceId, status: "HELD", outcome: "held" }, select: { fileName: true } });
    const offList = await timed("held file approved by a second person", () => heldFileApproved(ctx, author, approver, workspaceId).catch((e) => ({ ok: false as const, why: said(e) })));
    const unreadWords = unread.length ? ` ${unread.length} official file${unread.length === 1 ? " stays" : "s stay"} held because the form's edition could not be read from the file (${unread.map((h) => h.fileName).join(", ")}): such a file cannot become a source.` : "";
    row({ row: "1", title: "Ingest PDF forms; a held file approved by a second person", status: offList.ok ? "done" : "partial",
      shows: `${files} official files read on the six combinations (code, edition, checksum; no AI)${offList.ok ? `; ${offList.shows}` : ""}`,
      why: offList.ok ? (unreadWords.trim() || null) : `${offList.why}${unreadWords}` });
  },
} satisfies CheckpointStep;
