// B104 (P-351): journey J7 Stage 1 on the configured checkpoint — the parts of a combination's setup the checkpoint did
// not yet make (#1069's re-score: QA-228 signers, QA-247 the IRCC account), set before its release is made, as the
// author, through the same services the Forms tab calls (who signs: PATCH /api/combinations/:id/forms/:code, the line
// editor in web/src/pages/workspace/forms.tsx; the IRCC account: PATCH /api/combinations/:id/account, AccountPicker in
// web/src/components/channels.tsx). The eligibility gates (QA-244) go through the service of PUT
// /api/combinations/:id/eligibility-gates, which no screen calls yet: allow-listed (product/tools/route-has-screen-allow.txt),
// the gate-authoring screen is row B106, and C6.9 is not Works on this route alone (tech lead's ruling on #1084). The values are data (samples/checkpoint-stage-one.json, P-319), each cited (P-170)
// and Sample, Unconfirmed: expert (AGENTS rule 4). A step a rule refuses stays undone and is said in the rule's words.
// No model call (US$0).
import { type Actor, type Audit, type Db } from "./core.ts";
import { EligibilityGates } from "./eligibility.ts";
import { stageOneOf, stageOneProblems } from "./checkpoint-stage-one-data.ts";
import type { Forms } from "./forms.ts";
import type { Studio } from "./studio.ts";

/** Sets one combination's Stage 1 parts on its draft. Returns what was set and what a rule refused, in words. */
export async function setStageOne(svc: { db: Db; audit: Audit; studio: Studio; forms: Forms }, author: Actor, combinationId: string, key: string | undefined, said: (e: unknown) => string) {
  const setup = stageOneOf(key);
  const done: string[] = [], refused: string[] = [];
  if (!setup) return { done, refused };
  const bad = stageOneProblems(setup);
  if (bad.length) return { done, refused: [`samples/checkpoint-stage-one.json: ${bad.join("; ")}; nothing was set`] };
  if (setup.account) {
    const c = await svc.db.combination.findUniqueOrThrow({ where: { id: combinationId }, select: { portalKey: true } });
    // Saved over the account the author saw, as the Forms tab's picker sends it, so two saves at once cannot both pass.
    if (c.portalKey !== setup.account.value) {
      try { await svc.forms.setAccount(author, combinationId, { account: setup.account.value, from: c.portalKey }); done.push(`filed through ${setup.account.value}`); }
      catch (e) { refused.push(`IRCC account: ${said(e)}`); }
    }
  }
  // Who signs each line (QA-228). A line that is not on this combination (or was removed) is said, never added here.
  const lines = new Map((await svc.db.combinationForm.findMany({ where: { combinationId }, orderBy: { version: "asc" }, select: { lineageKey: true, status: true, signedBy: true } })).map((l) => [l.lineageKey, l]));
  for (const s of setup.signers ?? []) {
    const line = lines.get(s.form);
    if (!line || line.status === "RETIRED") { refused.push(`${s.form}: not a line of this combination, so who signs it is not set`); continue; }
    if (line.signedBy === s.signedBy) continue;
    try { await svc.studio.saveForm(author, combinationId, s.form, { signedBy: s.signedBy }); done.push(`${s.form} signed by ${s.signedBy}`); }
    catch (e) { refused.push(`${s.form}: ${said(e)}`); }
  }
  // The gates as data on the draft, saved once over the version read (BR-3); gates already saved are left as they are.
  if (setup.eligibility) {
    const gates = new EligibilityGates(svc.db, svc.audit);
    const now = await gates.get(combinationId);
    if (!now.gates.length) {
      try { const v = await gates.put(author, combinationId, { gates: setup.eligibility.gates, judgement: setup.eligibility.judgement, version: now.version }); done.push(`${v.gates.length} eligibility gates and ${v.judgement.length} officer's judgement lines`); }
      catch (e) { refused.push(`eligibility gates: ${said(e)}`); }
    }
  }
  return { done, refused };
}
