// QA-403 (P-486, reversible): the firm's own facts are the case officer's, never the client's. Who fills each question in
// samples/who-fills.json is changed through the product's own route (Change who fills, C4.9: the author proposes with
// the reason, the Approver approves on To review), and its question and help get the file's plain words through the
// placement route, before release 1 (step 110) carries them. Data, not code (P-319): this file names no fact and no
// combination; a question already filled as the file says, or not placed, is said in the log and left. US$0, no AI.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { STUDIO } from "../../core.ts";
import { Screen02 } from "../../screen02.ts";
import { Studio } from "../../studio.ts";
import { FILLS, fillsOf, WhoFills, type Fills } from "../../who-fills.ts";
import type { CheckpointStep } from "./_context.ts";

export const WHO_FILLS_FILE = join(STUDIO, "samples", "who-fills.json");
export type WhoFillsEntry = { fact: string; fills: Fills; question: string; help: string; reason: string };
const KNOWN = new Set(["fact", "fills", "question", "help", "reason"]);

/** Reads the file and refuses, naming the entry, a fact given twice, an unknown name, a "fills" that is not CLIENT or
 *  CASE_OFFICER, or empty words (the question, its help and the reason are all said to a person). */
export function whoFillsFrom(file = WHO_FILLS_FILE): WhoFillsEntry[] {
  const raw = JSON.parse(readFileSync(file, "utf8")) as { questions?: unknown };
  if (!Array.isArray(raw.questions)) throw new Error(`${file}: needs a "questions" list.`);
  const seen = new Set<string>();
  return raw.questions.map((q, i) => {
    const e = (q ?? {}) as Record<string, unknown>;
    const at = typeof e.fact === "string" && e.fact.trim() ? e.fact : `entry ${i + 1}`;
    const extra = Object.keys(e).find((k) => !KNOWN.has(k));
    if (extra) throw new Error(`${at}: "${extra}" is not a known name.`);
    if (typeof e.fact !== "string" || !/^[a-z]+\.[a-z0-9_]+$/.test(e.fact)) throw new Error(`${at}: needs its fact (a library key such as case.application_type).`);
    if (seen.has(e.fact)) throw new Error(`${at}: given twice.`);
    seen.add(e.fact);
    if (e.fills !== "CLIENT" && e.fills !== "CASE_OFFICER") throw new Error(`${at}: fills is CLIENT or CASE_OFFICER.`);
    for (const k of ["question", "help", "reason"] as const) if (typeof e[k] !== "string" || (e[k] as string).trim().length < 5) throw new Error(`${at}: needs its ${k}, in words.`);
    return { fact: e.fact, fills: e.fills, question: (e.question as string).trim(), help: (e.help as string).trim(), reason: (e.reason as string).trim() };
  });
}

export default {
  async run(ctx) {
    const { db, workspaceId, author, approver, said, log } = ctx;
    const studio = ctx.get(Studio), fills = ctx.get(WhoFills), library = ctx.get(Screen02);
    const done: string[] = [], left: string[] = [];
    for (const e of whoFillsFrom()) {
      const now = await db.sectionQuestion.findFirst({ where: { workspaceId, lineageKey: e.fact, status: { in: ["DRAFT", "PUBLISHED"] } }, orderBy: { version: "desc" } });
      if (!now) { left.push(`${e.fact}: no question asks it in this library`); continue; }
      try {
        // Its words first, keeping everything else of the placement as it is (who fills changes only below).
        await studio.placeField(author, e.fact, { sectionKey: now.sectionKey, collectedFrom: now.collectedFrom, repeats: now.repeats, tier: now.tier ?? "case", questionText: e.question, helpText: e.help,
          ...(now.predicateJson ? { condition: now.predicateJson, conditionEffect: now.conditionEffect, conditionPlain: now.conditionPlain ?? undefined } : {}), ruleOnly: now.ruleOnly });
        if (fillsOf(now.collectedFrom) === e.fills) { done.push(`${e.fact} (words only; already ${FILLS[e.fills]})`); continue; }
        const c = await fills.propose(author, e.fact, { to: e.fills, reason: e.reason });
        await library.decideLibraryChange(approver, c.id, "approve", "Approved by the sample loader as the second person (QA-403, P-486: the firm's own fact).");
        done.push(e.fact);
      } catch (err) { left.push(`${e.fact}: ${said(err)}`); }
    }
    log.push(`  who fills (QA-403, samples/who-fills.json): ${done.length ? `the case officer's, in plain words: ${done.join(", ")}` : "nothing changed"}${left.length ? `; left: ${left.join("; ")}` : ""}`);
  },
} satisfies CheckpointStep;
