// B104 (P-351): journey J7 Stage 1 on the configured checkpoint — the parts of a combination's setup the checkpoint did
// not yet make (#1069's re-score: QA-228 signers, QA-247 the IRCC account), set before its release is made, as the
// author, through the same services the Forms tab calls (who signs: PATCH /api/combinations/:id/forms/:code, the line
// editor in web/src/pages/workspace/forms.tsx; the IRCC account: PATCH /api/combinations/:id/account, AccountPicker in
// web/src/components/channels.tsx). The eligibility gates (QA-244) go through the service of PUT
// /api/combinations/:id/eligibility-gates, which no screen calls yet: allow-listed (product/tools/route-has-screen-allow.txt),
// the gate-authoring screen is row B106, and C6.9 is not Works on this route alone (tech lead's ruling on #1084). The
// values are data (samples/checkpoint-stage-one.json, P-319), each cited (P-170) and Sample, Unconfirmed: expert (AGENTS
// rule 4). The step's rules are applyStageOne's (api/src/checkpoint-stage-one-data.ts); this file only connects them to
// the services.
// No model call (US$0).
import { type Actor, type Audit, type Db } from "./core.ts";
import { EligibilityGates } from "./eligibility.ts";
import { applyStageOne, stageOneOf, type StageOnePort } from "./checkpoint-stage-one-data.ts";
import { checkGates } from "../../engine/eligibility-gates.ts";
import type { Forms } from "./forms.ts";
import type { Studio } from "./studio.ts";

/** Sets one combination's Stage 1 parts on its draft, as the author. Returns what was set and what a rule refused, in words. */
/** `setup` defaults to the combination's Stage 1 data; release 2's step passes its own (releaseTwoOf, row A3). */
export function setStageOne(svc: { db: Db; audit: Audit; studio: Studio; forms: Forms }, author: Actor, combinationId: string, key: string | undefined, said: (e: unknown) => string, setup = stageOneOf(key)) {
  const gates = new EligibilityGates(svc.db, svc.audit);
  const port: StageOnePort = {
    account: async () => (await svc.db.combination.findUniqueOrThrow({ where: { id: combinationId }, select: { portalKey: true } })).portalKey,
    // As the Forms tab's account picker sends it: over the account the author saw, so two saves at once cannot both pass.
    setAccount: async (from, to) => { await svc.forms.setAccount(author, combinationId, { account: to, from }); },
    lines: async () => {
      const rows = await svc.db.combinationForm.findMany({ where: { combinationId }, orderBy: { version: "asc" }, select: { lineageKey: true, status: true, signedBy: true, updatedAt: true, channel: true, signature: true } });
      return [...new Map(rows.map((r) => [r.lineageKey, r])).values()].map((r) => ({ form: r.lineageKey, retired: r.status === "RETIRED", signedBy: r.signedBy, revision: r.updatedAt.toISOString(), channel: r.channel, signature: r.signature }));
    },
    // As the line editor sends it (forms.tsx): with the revision read, so a change saved meanwhile is never overwritten.
    saveSigner: async (form, signedBy, revision) => { await svc.studio.saveForm(author, combinationId, form, { signedBy, baseRevision: revision }); },
    // Row A3, as the Forms tab's Signature column sends it (PATCH /api/combinations/:id/forms/:code/channel): the line's own
    // channel kept, over the channel and signature the author saw, so a change saved meanwhile is refused, not overwritten.
    saveSignature: async (form, channel, from, to) => { await svc.forms.setChannel(author, combinationId, form, { channel, signature: to, from: channel, fromSignature: from }); },
    gates: async () => { const g = await gates.get(combinationId); return { count: g.gates.length, version: g.version }; },
    // The gates service's own check (api/src/eligibility.ts put), run first so a bad file sets nothing.
    gatesProblems: async (e) => {
      const c = await svc.db.combination.findUniqueOrThrow({ where: { id: combinationId }, select: { workspaceId: true } });
      const [fields, derived] = await Promise.all([
        svc.db.canonicalField.findMany({ where: { workspaceId: c.workspaceId }, select: { canonicalFieldKey: true, valueType: true, status: true } }),
        svc.db.derivedField.findMany({ where: { workspaceId: c.workspaceId }, select: { derivedKey: true } }),
      ]);
      return checkGates({ gates: e.gates as { key?: unknown }[], judgement: e.judgement }, new Map(fields.filter((f) => f.status !== "RETIRED").map((f) => [f.canonicalFieldKey, f.valueType])), new Set(derived.map((d) => d.derivedKey))).errors.map((x) => `eligibility gates: ${x.message}`);
    },
    putGates: async (e, version) => { const v = await gates.put(author, combinationId, { gates: e.gates, judgement: e.judgement, version }); return { gates: v.gates.length, judgement: v.judgement.length }; },
  };
  return applyStageOne(port, setup, said);
}
