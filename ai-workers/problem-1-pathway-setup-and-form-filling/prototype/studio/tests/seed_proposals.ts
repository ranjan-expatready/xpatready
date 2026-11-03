// Test setup only (S6 slice 1b): queue items written through the one door (proposals.ts insertProposals), as an edition
// draft would write them, on an isolated copy's database. Prints the ids as JSON. Never run against the demo database.
//   tsx --tsconfig studio/api/tsconfig.json studio/tests/seed_proposals.ts xr_studio_<name> "IMM 1111 (02-2026)" [lists]
// With "lists": two Ready new answer lists for that edition instead (P-305: each is accepted on its own).
import { randomUUID } from "node:crypto";

const DB = process.argv[2], ED = process.argv[3] ?? "IMM 1111 (02-2026)", LISTS = process.argv[4] === "lists";
if (!DB || DB === "xr_studio") { console.error("give an isolated copy's database name"); process.exit(2); }
process.env.DATABASE_URL = `postgresql://xr_studio@127.0.0.1:54329/${DB}`;
const { Db } = await import("../api/src/core.ts");
const P = await import("../api/src/proposals.ts");
const db = new Db();
const ws = (await db.workspace.findUniqueOrThrow({ where: { key: "demo" } })).id;
const run = randomUUID();
await db.draftingJob.create({ data: { id: run, workspaceId: ws, kind: "field_map_edition", mode: "REPLAY", status: "COMPLETED", startedBy: "user-A", finishedAt: new Date() } });
const payload = (label: string) => ({ kind: "field" as const, label, aliases: [], meaning: `What "${label}" means on the form (Sample).`, valueType: "text" as const, subject: "person" as const, formBox: null });
const reading = (label: string, words: string) => ({ reading: words, payload: payload(label), from: "replay" as const, runFile: "runs/sample.json", costUsd: 0 });
const item = (label: string, over: Record<string, unknown> = {}) => ({ kind: "field" as const, runId: run, step: "field_map_edition", scope: { formEdition: ED, combinationId: null }, landsOn: "library" as const,
  reuse: { match: "new" as const, existingKey: null }, payload: payload(label), source: { file: "imm1111e.pdf", sha256: "b".repeat(64), edition: "02-2026", page: 2, quote: `${label} (as on the form)`, quoteFound: true, rule: null },
  rounds: { draft: reading(label, `${label} of the applicant`), check: reading(label, `${label} of the applicant`) }, rules: [{ rule: "quote_found", passed: true, why: null }], agreement: "agreed" as const, confidence: "ready" as const,
  reason: null, origin: "ai" as const, identity: { key: P.identityKeyOf(payload(label), ""), near: [], nearReason: null }, relatesTo: null, revision: null, basis: "SAMPLE" as const, ...over });
// P-305 (P-299 extended): nothing new to the shared library is accepted with others, answer lists included; bulk is
// only for clean reuse. So the two Ready items accepted together are reuse matches of two library fields (they add
// nothing); the new answer lists ("lists") are each accepted on their own.
const list = (label: string, codes: string[]) => { const p = { kind: "answer_list" as const, label, values: codes.map((c) => ({ code: c, label: c.replace(/_/g, " ") })) };
  return item(label, { kind: "answer_list", payload: p, rounds: { draft: { ...reading(label, `${label} (Sample)`), payload: p }, check: { ...reading(label, `${label} (Sample)`), payload: p } }, identity: { key: P.identityKeyOf(p as never, ""), near: [], nearReason: null } }); };
if (LISTS) {
  const lists = await P.insertProposals(db, ws, [list("Hair colour", ["qz_auburn", "qz_grey"]), list("Way of arrival", ["qz_by_land", "qz_by_sea"])] as any);
  console.log(JSON.stringify({ run, lists }));
  await db.$disconnect(); process.exit(0);
}
const lib = await db.canonicalField.findMany({ where: { workspaceId: ws, status: { in: ["DRAFT", "PUBLISHED"] }, mergedIntoKey: null, label: { not: null } }, orderBy: { canonicalFieldKey: "asc" }, take: 2, select: { canonicalFieldKey: true, label: true } });
const reuseOf = (f: { canonicalFieldKey: string; label: string | null }) => item(f.label!, { reuse: { match: "reuse" as const, existingKey: f.canonicalFieldKey } });
const ids = await P.insertProposals(db, ws, [
  reuseOf(lib[0]), reuseOf(lib[1]),
  item("Height in centimetres", { confidence: "check", reason: "A rule failed: the quote was not found in the file.", rules: [{ rule: "quote_found", passed: false, why: "The words are not in the file." }] }),
  item("Name at birth", { confidence: "decide", agreement: "differ", reason: "The two readings differ: the checker reads it as the name on the birth certificate.", rounds: { draft: reading("Name at birth", "Name given at birth"), check: reading("Name on the birth certificate", "Name as printed on the birth certificate") } }),
  item("Eye colour", { origin: "rules", rounds: { draft: null, check: null }, agreement: "rules_only" }),
] as any);
await db.auditEvent.create({ data: { workspaceId: ws, actor: "user-A", action: "created", entity: "test", entityKey: "seed_proposals", summary: "test setup: queue items (Sample)" } });
console.log(JSON.stringify({ run, ready1: ids[0], ready2: ids[1], check: ids[2], decide: ids[3], rules: ids[4], reused: lib.map((f) => f.canonicalFieldKey) }));
await db.$disconnect();
