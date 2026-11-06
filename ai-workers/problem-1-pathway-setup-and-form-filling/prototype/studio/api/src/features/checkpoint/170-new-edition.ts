// C10.1 row 17 (QA-207): the current IMM 5476 arrives through the intake on no combination, as a person sends a new
// edition: the intake holds it (C2.4), and its comparison and impact wait on To review (C9.1; saved AI comparison, #781).
// The Visitor visa's form finder may already have held it (its replay attaches the page's forms): then this send answers
// "already waiting", and the row reads the one held item either way (review m4).
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { stateOf } from "../../features.ts";
import { OFFICIAL, SOLUTION } from "../../core.ts";
import { Intake } from "../../intake.ts";
import { Sources } from "../../sources.ts";
import type { CheckpointStep } from "./_context.ts";

/** C10.1 row 17 (QA-207, tech lead's ruling (a), 4 Nov): the library uses IMM 5476's 2021 edition on every combination
 *  that files it, and the current edition arrives as a new edition, held, so C9.1's comparison and impact can be reached
 *  on the demo data. Only once a saved field map of the 2021 edition is recorded (the paid runner's): without it the
 *  2021 edition would leave IMM 5476 unmapped and QA-180's rule refuses the releases. The current edition, cited (P-170):
 *  canada.ca "Use of a Representative Form (IMM 5476)" (official-sources/ircc/web-pages/page-imm5476.html, modified
 *  2025-12-12, saved 19 Oct 2026): "A new version of this form is available (11-2025). Make sure you are using the most
 *  recent version." The 2021 file is IRCC's own, from the web archive (manifest: imm5476e-2021.pdf). */
export const ROW17 = { previous: "imm5476e-2021.pdf", previousInventory: "prototype/p1/inventory/imm5476e-2021.inventory.json", current: "imm5476e.pdf", previousLabel: "IMM 5476 (11-2021)", currentLabel: "IMM 5476 (11-2025)" };

/** Whether the library files the 2021 edition on this run (decided before the six load). */
const row17 = stateOf(() => ({ on: false }));

export default {
  // IMM 5476 2021 in the library only when its saved field map is recorded (see ROW17). The same reading as the six's
  // replay (ai.ts plan: the job id and the inventory's checksum), so a map recorded for an older reading of the 2021 file
  // never swaps the edition in (review m1).
  prepare(ctx) {
    const sources = ctx.get(Sources);
    const inv2021 = join(SOLUTION, ROW17.previousInventory);
    const on = row17(ctx).on = existsSync(inv2021) && sources.savedRuns(sources.jobIdFor(ROW17.previous), createHash("sha256").update(readFileSync(inv2021)).digest("hex")).some((r) => r.valid);
    return on ? { swap: { [ROW17.current]: ROW17.previous } } : {};
  },
  async run(ctx) {
    const { db, workspaceId, author } = ctx;
    const on = row17(ctx).on;
    let held17: string | null = null, why17: string | null = null;
    if (on) {
      const item = (JSON.parse(readFileSync(join(SOLUTION, "official-sources", "ircc", "manifest.json"), "utf8")).items as { file: string; path: string }[]).find((i) => i.file === ROW17.current);
      const r = item ? (await ctx.timed("new edition held (row 17)", () => ctx.get(Intake).intake(author, [{ originalname: item.file, buffer: readFileSync(join(OFFICIAL, item.path)) }], undefined, "SAMPLE"))).results[0] : null;
      const heldNow = await db.intakeItem.findFirst({ where: { workspaceId, outcome: "new_edition_held", status: "HELD", code: "IMM 5476" }, select: { editionLabel: true } });
      if (heldNow) held17 = heldNow.editionLabel ?? ROW17.currentLabel; else why17 = `${ROW17.currentLabel} was not held as a new edition: ${r?.message ?? "its official file is not in the manifest"}`;
    }
    const users = on ? (await db.combinationForm.findMany({ where: { workspaceId, lineageKey: "IMM 5476", status: { not: "RETIRED" } }, select: { combinationId: true }, distinct: ["combinationId"] })).length : 0;
    ctx.row({ row: "17", title: "New edition: IMM 5476 2021 → 11-2025 comparison and impact", status: !on ? "waiting" : held17 ? "done" : "partial",
      shows: held17 ? `${held17} held as a new edition over the library's ${ROW17.previousLabel}, which ${users} combination${users === 1 ? " files" : "s file"}: its comparison and impact are on To review (saved AI comparison, US$0); canada.ca names 11-2025 the current edition` : "The comparison and impact are built (C9.1, its saved AI comparison #781)",
      why: !on ? `Waits for a saved field map of ${ROW17.previousLabel} (the paid runner's; tech lead, 4 Nov): the library then files the 2021 edition and holds 11-2025 as the new one.` : why17 });
  },
} satisfies CheckpointStep;
