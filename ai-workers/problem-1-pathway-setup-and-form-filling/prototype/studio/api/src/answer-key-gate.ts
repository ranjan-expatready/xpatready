// G2 (C5.5; concept screens/G2-answer-key-gate/concept.md v2 §2): the answer-key release gate's database side. Two
// functions (challenge m4): `gateOf` / `gatesOf` read (one query, never a write; every page), `runKeys` writes (only
// Submit, Approve and the shared release run it, SA-1B-296 r3: "at submit and again at publish"). The rules are the
// pure engine/answer-key-gate.ts. No model call (US$0).
import type { Prisma } from "@prisma/client";
import { sha256 } from "../../../contracts/rules.ts";
import { itemFingerprint, runFieldMap, runRuleSet, runState, type ItemKind, type MapExpected, type RuleExpected } from "../../engine/answer-keys.ts";
import { answerKeyGate, evidenceOf, testableItems, type GateKey, type GateProblem, type ItemVerdict } from "../../engine/answer-key-gate.ts";
import type { Snapshot } from "../../engine/snapshot.ts";
import { isDemoSnapshot } from "../../engine/validate.ts";
import { editionOf, fieldListOf, familyOf } from "./answer-keys.ts";
import { ACTORS, type Actor, type Audit, type Db, WORKSPACE_KEY } from "./core.ts";

/** BR-3 (the tech lead on #558 and #568): only the demo workspace may release Sample content, as a Demo release. */
export const isDemoWorkspace = () => WORKSPACE_KEY === "demo";
/** BR-3: Demo = the demo workspace and Sample content in the draft itself (G3's isDemoSnapshot); key states never
 *  decide it, so an untested map never turns a real release into a Demo release. */
export const demoRelease = (s: Snapshot) => isDemoWorkspace() && isDemoSnapshot(s);

const nameOf = (id: string | null) => (id ? [...ACTORS].find((a) => a.id === id)?.name ?? "Someone else" : null);
const KEYS = { family: true, runs: { orderBy: { ranAt: "desc" as const }, take: 1, select: { id: true, result: true, keyVersion: true, itemFingerprint: true, inputsFingerprint: true, passed: true, failed: true } } };
type KeyRow = Prisma.AnswerKeyGetPayload<{ include: typeof KEYS }>;
type Line = { label?: string; person_label?: string; expected?: string; got?: string; pass?: boolean; why?: string };
const failureWords = (lines: unknown): string | null => {
  const l = (Array.isArray(lines) ? (lines as Line[]) : []).find((x) => x && x.pass === false);
  if (!l) return null;
  return `${l.label ?? "A value"}${l.person_label ? ` (${l.person_label})` : ""}: expected "${l.expected ?? ""}", got "${l.got ?? ""}".`;
};

export type Gate = { demo: boolean; judged: boolean; items: ItemVerdict[]; problems: GateProblem[]; evidence: ReturnType<typeof evidenceOf>; /** every key judged (BR-6) */ keys: { key_id: string; version: number; state: string }[] };
/** `released`: the latest release (any kind; a draft identical to it has nothing to release). `baseline`: the latest
 *  real release, what "new or changed" is measured against (reviewer m1: a Demo release proves nothing for a real one,
 *  so maps first released in a demo stay new until a real release carries them). */
type Input = { combinationId: string; snapshot: Snapshot; sha256: string; released: { snapshot: unknown; sha256: string } | null; baseline: unknown; submitted: boolean };
/** The latest real release of a list ordered newest first (BR-3: a Demo release is never a real publish; outside the
 *  demo workspace every release is real, C5.5). */
export const realBaseline = (releases: { snapshot: unknown }[]) => releases.find((r) => !(isDemoWorkspace() && isDemoSnapshot(r.snapshot)))?.snapshot ?? null;

/** The keys of each combination with their last run judged against this draft (runState: key version, item and inputs
 *  fingerprints), the failing ones with their first failing value. */
async function statesOf(db: Db, rows: Input[]): Promise<Map<string, GateKey[]>> {
  const keys = rows.length ? await db.answerKey.findMany({ where: { combinationId: { in: rows.map((r) => r.combinationId) } }, include: KEYS, orderBy: { updatedAt: "asc" } }) : [];
  const by = new Map(rows.map((r) => [r.combinationId, r]));
  const judged = keys.map((k: KeyRow) => {
    const r = by.get(k.combinationId)!, last = k.runs[0] ?? null;
    const ed = editionOf(k), list = k.itemKind === "field_map" ? fieldListOf(r.snapshot, k.itemRef, ed) : null;
    // A map with no form field list cannot be run (BR-5 "cannot be tested"); its key reads "Not run".
    const st = k.itemKind === "field_map" && !list ? { state: "NOT_RUN" as const, why: "Its form field list is not recorded." } : runState(last, { item: itemFp(r.snapshot, k.itemKind, k.itemRef, ed), inputs: inputsFp(r.sha256, list?.hash) }, k.version);
    return { k, last, st };
  });
  const failedRuns = judged.filter((j) => j.st.state === "FAILED" && j.last).map((j) => j.last!.id);
  const lines = new Map(failedRuns.length ? (await db.answerKeyRun.findMany({ where: { id: { in: failedRuns } }, select: { id: true, lines: true } })).map((x) => [x.id, x.lines]) : []);
  const out = new Map<string, GateKey[]>(rows.map((r) => [r.combinationId, []]));
  for (const { k, last, st } of judged) out.get(k.combinationId)!.push({
    key_id: k.id, item_kind: k.itemKind, item_ref: k.itemRef, edition: editionOf(k), family: k.family.label, state: k.state, version: k.version, signed_by: nameOf(k.signedByUserId), signed_at: k.signedAt?.toISOString() ?? null, change_reason: k.changeReason,
    run: { state: st.state, why: st.why, passed: last?.passed ?? 0, failed: last?.failed ?? 0, first_failure: st.state === "FAILED" && last ? failureWords(lines.get(last.id)) : null, run_id: last?.id ?? null },
  });
  return out;
}

// The two fingerprints a run stores (engine/answer-keys.ts fingerprintOf), from hashes already held: the item part is
// cheap; the inputs part is the draft's sha256 (buildSnapshot's, the same as snapshotHash) and the field list's hash.
const itemFp = (s: Snapshot, kind: string, ref: string, edition: string | null) => itemFingerprint(s, kind as ItemKind, ref, edition);
const inputsFp = (snap: string, inv?: string) => (inv ? sha256(`${snap}|${inv}`) : snap);

/** The gate for many drafts at once (the catalogue, the shared Release page): one keys query. A draft identical to its
 *  release is not judged (challenge M1: nothing to release, so no line on a Live, unchanged row). */
export async function gatesOf(db: Db, rows: Input[]): Promise<Map<string, Gate>> {
  const open = rows.filter((r) => !r.released || r.released.sha256 !== r.sha256);
  const states = await statesOf(db, open);
  const out = new Map<string, Gate>();
  for (const r of rows) {
    const demo = demoRelease(r.snapshot);
    if (!states.has(r.combinationId)) { out.set(r.combinationId, { demo, judged: false, items: [], problems: [], evidence: [], keys: [] }); continue; }
    const items = testableItems(r.snapshot, (r.baseline ?? null) as Snapshot | null, (form, edition) => !!fieldListOf(r.snapshot, form, edition));
    const keys = states.get(r.combinationId)!, g = answerKeyGate(items, keys, { demo, submitted: r.submitted });
    out.set(r.combinationId, { demo, judged: true, items: g.items, problems: g.problems, evidence: evidenceOf(g.items), keys: keys.map((k) => ({ key_id: k.key_id, version: k.version, state: k.state })) });
  }
  return out;
}

/** One draft's gate: its latest release and whether it is submitted are read here. */
export async function gateOf(db: Db, combinationId: string, snapshot: Snapshot, sha256: string): Promise<Gate> {
  const [rels, sub] = await Promise.all([
    db.configRelease.findMany({ where: { combinationId }, orderBy: { version: "desc" }, select: { snapshot: true, sha256: true } }),
    db.reviewSubmission.findFirst({ where: { combinationId }, orderBy: { submittedAt: "desc" }, select: { status: true, draftSha256: true } }),
  ]);
  return (await gatesOf(db, [{ combinationId, snapshot, sha256, released: rels[0] ?? null, baseline: realBaseline(rels), submitted: sub?.status === "SUBMITTED" && sub.draftSha256 === sha256 }])).get(combinationId)!;
}

/** BR-6 (SA-1B-296 r3): every key of the combination runs on this exact draft and its run is stored (who: the person
 *  submitting or releasing). A map with no form field list is not run (the gate names it "cannot be tested"). One
 *  audit line per pass (challenge m4), never one per key. Returns how many ran, passed and failed. */
export async function runKeys(db: Db, audit: Audit, actor: Actor, c: { id: string; workspaceId: string; combinationKey: string; label: string }, snapshot: Snapshot, sha256: string) {
  const keys = await db.answerKey.findMany({ where: { combinationId: c.id }, include: { family: true }, orderBy: { updatedAt: "asc" } });
  let passed = 0, failed = 0;
  for (const k of keys) {
    const list = k.itemKind === "field_map" ? fieldListOf(snapshot, k.itemRef, editionOf(k)) : null;
    if (k.itemKind === "field_map" && !list) continue;
    const known = { snapshot: sha256, inventory: list?.hash };
    const r = k.itemKind === "field_map" ? runFieldMap(snapshot, familyOf(k.family), k.itemRef, list!.inv, k.expected as MapExpected, known) : runRuleSet(snapshot, familyOf(k.family), k.expected as RuleExpected, known);
    await db.answerKeyRun.create({ data: { workspaceId: k.workspaceId, keyId: k.id, keyVersion: k.version, itemFingerprint: r.fingerprint.item, inputsFingerprint: r.fingerprint.inputs, result: r.result, lines: r.lines as object[], passed: r.passed, failed: r.failed, ranBy: actor.id } });
    if (r.result === "PASSED") passed++; else failed++;
  }
  if (keys.length) await audit.log(c.workspaceId, actor.id, "ran", "answer-key tests", c.combinationKey, `${actor.name} ran the answer-key tests of "${c.label}" on its draft: ${passed} passed, ${failed} failed`, { sha256, passed, failed }, c.id);
  return { ran: passed + failed, passed, failed };
}

/** BR-6 (challenge m8; Devin on #568): inside the release transaction the combination's keys are re-read FOR SHARE
 *  and must be exactly the keys judged (the same ids, versions and states): a key added, removed, signed, unsigned or
 *  changed since makes the release a 409, so the frozen evidence is what was judged. A key written after this read is
 *  written after the release. */
export async function keysUnchanged(tx: Prisma.TransactionClient, combinationId: string, judged: { key_id: string; version: number; state: string }[]): Promise<boolean> {
  const now = await tx.$queryRaw<{ id: string; version: number; state: string }[]>`SELECT "id"::text AS "id", "version", "state" FROM "answer_key" WHERE "combination_id" = ${combinationId}::uuid FOR SHARE`;
  return now.length === judged.length && judged.every((e) => now.some((k) => k.id === e.key_id && k.version === e.version && k.state === e.state));
}
