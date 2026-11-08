// C10.2 (finished story only; DEMO.md checkpoint 3, rows 13–16 and 18): after the configured checkpoint, the family case
// (120) moves to release 2 (130) and is taken to a recorded submission through the product's own routes, as the people
// who act (api/src/finished-story.ts). Each stage is said on the result (`story`); a stage a rule refuses stops there
// with the rule's words, and the open bug that holds a stage is named, never faked.
import { finishFamilyCase, routesAt, type StoryStage } from "../../finished-story.ts";
import { SAMPLE_CASE } from "../../sample-case.ts";
import type { CheckpointStep } from "./_context.ts";
import { familyCase } from "./120-family-case.ts";
import { thinCase } from "./125-thin-case.ts";

export default {
  async run(ctx) {
    if (ctx.story !== "finished") return;
    const fam = familyCase(ctx).fam, thin = thinCase(ctx);
    const out = fam?.caseId ? await ctx.timed("finished story (family case to a recorded submission)", () => finishFamilyCase(routesAt(), fam.caseId!)) : null;
    const stages: StoryStage[] = out?.stages ?? [];
    ctx.result.story = stages;
    ctx.result.story_cases = { family: fam?.caseId ?? null, thin: thin.caseId };
    for (const s of stages) ctx.log.push(`  finished story · ${s.title}: ${s.status}${s.why ? ` (${s.why.slice(0, 200)})` : ""}`);
    const st = (k: string) => stages.find((x) => x.key === k);
    const pieces = ["forms", "signed", "ready", "record"].map(st);
    const done = pieces.every((x) => x?.status === "done"), reached = pieces.some((x) => x && x.status !== "waiting");
    ctx.row({ row: "13", title: "Online auto-fill with the browser extension", status: "out", shows: "Parked (P-102, W6): the Online form is entered by a person from its answer sheet (row 14)", why: null });
    ctx.row({ row: "14", title: "Online plus PDF in one filing: portal sheet, filled PDFs, signed scans (finished story)", status: !out ? "waiting" : done ? "done" : reached ? "partial" : "waiting",
      shows: pieces.filter((x) => x && x.status !== "waiting").map((x) => x!.shows).join(" · ") || "Not reached", why: !out ? "Waits for the family case (row 11)." : pieces.filter((x) => x?.why).map((x) => `${x!.title}: ${x!.why}`).join(" ") || null });
    const docs = st("documents");
    ctx.row({ row: "15", title: "Document checklist per person (finished story)", status: docs?.status ?? "waiting", shows: docs?.shows ?? "Not reached", why: docs?.why ?? (out ? null : "Waits for the family case (row 11).") });
    const moved = st("move")?.status === "done";
    ctx.row({ row: "16", title: "The case stays on its release while a new release goes out (finished story)", status: moved && thin.release === 1 ? "done" : "waiting",
      shows: `${moved ? `Family case ${SAMPLE_CASE.reference} moved to release ${out?.release}` : "Family case not moved"}; ${thin.caseId ? `thin case opened on release ${thin.release} and left there` : "no thin case"}`, why: thin.why ?? (moved ? null : st("move")?.why ?? null) });
    ctx.row({ row: "18", title: "One fact entered once fills every form of every combination (B reuses A's family facts)", status: "waiting", shows: "Visitor visa only in phase 1", why: "Phase 2 of the finished story (one seeded case per other combination) is a later backlog row." });
  },
} satisfies CheckpointStep;
