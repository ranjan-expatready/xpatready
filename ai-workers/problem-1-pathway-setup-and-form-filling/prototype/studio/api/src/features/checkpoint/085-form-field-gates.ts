// B107 (QA-296, QA-299, QA-300; C6.11, C7.7): after the form setup (080), before release 1 (110): each form field the forms'
// own words gate (IMM 5476's membership boxes by regulatory body, its uncompensated part, the student-at-law and fax
// boxes), and IMM 5475's designated individual filled by hand, from cited data (samples/form-field-gates.json, P-319),
// proposed by the author and approved by the approver, a second person, through the door's own service
// (api/src/form-field-gates.ts). The data is checked whole before anything is proposed, so a bad file proposes nothing.
// A form field already holding the same decision is left as it is (one load runs once on a blank copy). Refusals are said
// on row 7 (090). Sample, Unconfirmed: expert.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { effective } from "../../../../engine/snapshot.ts";
import { boxGate } from "../../../../engine/form-field-condition.ts";
import { canonical } from "../../../../../contracts/rules.ts";
import { FormFieldGates, gateProblems, type GateProposal } from "../../form-field-gates.ts";
import { Screen02 } from "../../screen02.ts";
import type { CheckpointContext, CheckpointStep } from "./_context.ts";
import { formSetup } from "./080-form-setup.ts";

type Gate = { box: string; gate: unknown; words: string; cite: string };
type ByHand = { under: string; words: string; cite: string };
export type GateEdition = { form: string; edition: string; file: string; gates?: Gate[]; byHand?: ByHand[] };
export const GATES_FILE = join(import.meta.dirname, "..", "..", "..", "..", "samples", "form-field-gates.json");
export const gateEditions = (file = GATES_FILE): GateEdition[] => (JSON.parse(readFileSync(file, "utf8")) as { editions: GateEdition[] }).editions;

/** What the step did, for tests and the log. */
export type GatesDone = { proposed: number; approved: number; kept: number; refused: string[] };

export async function applyGates(ctx: CheckpointContext, editions = gateEditions()): Promise<GatesDone> {
  const { db, workspaceId, author, approver, said } = ctx;
  const done: GatesDone = { proposed: 0, approved: 0, kept: 0, refused: [] };
  const library = new Set((await db.canonicalField.findMany({ where: { workspaceId, status: { in: ["DRAFT", "PUBLISHED"] } }, select: { canonicalFieldKey: true } })).map((f) => f.canonicalFieldKey));
  const bad = editions.flatMap((e) => [...(e.gates ?? []).map((g) => ({ at: `${e.edition} ${g.box}`, why: gateProblems(g, (f) => library.has(f)) })), ...(e.byHand ?? []).map((b) => ({ at: `${e.edition} ${b.under}`, why: gateProblems({ ...b, byHand: true }, () => true) }))]).filter((x) => x.why.length);
  if (bad.length) { done.refused.push(...bad.map((x) => `samples/form-field-gates.json, ${x.at}: ${x.why.join("; ")}; nothing was proposed`)); return done; }
  const gates = ctx.get(FormFieldGates), library2 = ctx.get(Screen02);
  for (const e of editions) {
    const ed = await db.formEdition.findFirst({ where: { workspaceId, editionLabel: e.edition, channel: { not: "ONLINE" } }, select: { id: true, govFormDefId: true } });
    if (!ed) continue; // the load holds no such edition: nothing to decide
    const rows = effective(await db.formFieldMap.findMany({ where: { formEditionId: ed.id } }), (x) => x.dataPath, "draft").filter((r) => r.status !== "RETIRED");
    // A combination that files this form names the change on To review (the library change's combination).
    const line = await db.combinationForm.findFirst({ where: { workspaceId, govFormDefId: ed.govFormDefId, status: { not: "RETIRED" } }, orderBy: { combinationId: "asc" }, select: { combinationId: true } });
    const asks: GateProposal[] = [];
    for (const g of e.gates ?? []) {
      const r = rows.find((x) => x.dataPath === g.box);
      if (!r || r.outcome !== "mapped") { done.refused.push(`${e.edition}: no mapped form field ${g.box}, so its gate was not proposed`); continue; }
      if (boxGate(r.conditionRule) && canonical(r.conditionRule as never) === canonical({ gate: g.gate, words: g.words, cite: g.cite } as never)) { done.kept++; continue; }
      asks.push({ formEditionId: ed.id, dataPath: g.box, gate: g.gate, words: g.words, cite: g.cite });
    }
    for (const b of e.byHand ?? []) {
      const under = rows.filter((x) => x.dataPath.startsWith(b.under) && x.outcome === "mapped");
      if (!under.length && !rows.some((x) => x.dataPath.startsWith(b.under))) done.refused.push(`${e.edition}: no form field under ${b.under}, so nothing was marked filled by hand`);
      for (const r of under) asks.push({ formEditionId: ed.id, dataPath: r.dataPath, byHand: true, words: b.words, cite: b.cite });
    }
    for (const a of asks) {
      try {
        const ch = await gates.propose(author, line?.combinationId ?? null, a); done.proposed++;
        await library2.decideLibraryChange(approver, ch.id, "approve", "Approved by the sample loader as the second person: the form's own words, quoted in the change (B107; Sample, Unconfirmed: expert)."); done.approved++;
      } catch (err) { done.refused.push(`${e.edition} ${a.dataPath}: ${said(err)}`); }
    }
  }
  return done;
}

export default {
  async run(ctx) {
    const done = await ctx.timed("form field gates (B107)", () => applyGates(ctx));
    formSetup(ctx).refused.push(...done.refused);
    ctx.log.push(`form field gates and filled by hand (B107, samples/form-field-gates.json): ${done.proposed} proposed by the ${ctx.author.name}, ${done.approved} approved by the ${ctx.approver.name}${done.kept ? `, ${done.kept} already held` : ""}${done.refused.length ? `; refused: ${done.refused.join(" · ")}` : ""}`);
  },
} satisfies CheckpointStep;
