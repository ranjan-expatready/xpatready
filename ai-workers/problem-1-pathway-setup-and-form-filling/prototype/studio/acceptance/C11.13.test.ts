// C11.13 acceptance (P-220 pack 2; P-120, P-138, P-149 (2), P-158): AI-drafted masters come as "reuse" or "new"; the rules
// refuse an exact duplicate and say where the existing item is used; a near duplicate needs a one-line reason, and that
// reason is shown to the second person and at release. Two parts: (1) the real producer — the six's Demo load drafts
// every form's fields (replayed, US$0) into the queue, and a name drafted for two editions must be one "new" item, the
// other a "reuse" (P-120: drafted once, reused); (2) the one door's contract (api/src/proposals.ts insertProposals, as a
// producer writes) decided through the queue's API. Part 2 alone could go green with no producer wired; part 1 cannot.
// Today: part 1 fails (each edition proposes its own "new" twins), the exact duplicate is refused without "where used",
// and the near reason is not shown at release (the second person's batch, the Release page); so this fails. No AI (US$0).
//   zsh studio/tools/isolated.sh accept 4440 start && tsx --tsconfig studio/api/tsconfig.json studio/acceptance/C11.13.test.ts 4440 xr_studio_accept
import { randomUUID } from "node:crypto";
import { AUTHOR, APPROVER, pack2, run } from "./lib/pack2.ts";

const T = pack2("C11.13");
const { call, sql, ok, words } = T;
process.env.DATABASE_URL = `postgresql://xr_studio@127.0.0.1:54329/${T.DB}`;

run(async () => {
  await T.ready();
  const { Db } = await import("../api/src/core.ts");
  const P = await import("../api/src/proposals.ts");
  const db = new Db();
  const ws = (await db.workspace.findUniqueOrThrow({ where: { key: "demo" } })).id;
  const vv = T.combo("vv.single");
  const before = T.spent();
  const runId = randomUUID();
  await db.draftingJob.create({ data: { id: runId, workspaceId: ws, combinationId: vv, kind: "masters_edition", mode: "REPLAY", status: "COMPLETED", startedBy: AUTHOR, finishedAt: new Date() } });
  const payload = (label: string) => ({ kind: "field" as const, label, aliases: [], meaning: `${label} of the person, as on the form (Sample).`, valueType: "text", subject: "person", formBox: null });
  const reading = (label: string) => ({ reading: label, payload: payload(label), from: "replay" as const, runFile: "runs/acceptance.json", costUsd: 0 });
  const item = (label: string, over: Record<string, unknown> = {}) => ({ kind: "field" as const, runId, step: "masters_edition", scope: { formEdition: "IMM 5257 (09-2023)", combinationId: null }, landsOn: "library" as const,
    reuse: { match: "new" as const, existingKey: null }, payload: payload(label), source: { file: "imm5257e.pdf", sha256: "0dc03b24e7914a178ad29e2cfae811045835a1d36d7a3c35f040251d0aca562e", edition: "09-2023", page: 1, quote: label, quoteFound: true, rule: null },
    rounds: { draft: reading(label), check: reading(label) }, rules: [{ rule: "quote_found", passed: true, why: null }], agreement: "agreed" as const, confidence: "ready" as const, reason: null, origin: "ai" as const,
    identity: { key: P.identityKeyOf(payload(label), ""), near: [] as string[], nearReason: null as string | null }, relatesTo: null, revision: null, basis: "SAMPLE" as const, ...over });
  const tryInsert = async (it: any) => { try { return { ids: await P.insertProposals(db, ws, [it]), status: 201, why: "" }; } catch (e: any) { return { ids: [], status: e?.status ?? e?.getStatus?.() ?? 500, why: String(e?.response?.detail ?? e?.response?.message ?? e?.message ?? e) }; } };

  // ---------------------------------------------------------------- 1. the producer: one "new" per name across editions
  const fields = sql("select form_edition||'\t'||identity_key||'\t'||(reuse->>'match') from proposal_item where kind='field' and status='waiting'").split("\n").filter(Boolean).map((l) => l.split("\t"));
  const editionsOf = new Map<string, Set<string>>();
  for (const [ed, k, m] of fields) if (m === "new") editionsOf.set(k, new Set([...(editionsOf.get(k) ?? []), ed]));
  const twins = [...editionsOf].filter(([, eds]) => eds.size > 1);
  ok("setup: the Demo load's field drafts wait in the queue (several form editions)", new Set(fields.map((f) => f[0])).size >= 3, new Set(fields.map((f) => f[0])).size);
  ok("C11.13 fail (producer): a name drafted for two editions is one 'new' item; the other edition's is 'reuse' (P-120)", fields.length > 0 && twins.length === 0, { twins: twins.length, e_g: twins.slice(0, 3).map(([k, eds]) => `${k}: ${[...eds].map((e) => e.slice(0, 12)).join(" + ")}`) });

  // ---------------------------------------------------------------- 2. the one door: exact duplicate refused, saying where used
  // A live library field to collide with: one accepted through the queue (the six's library starts empty).
  let fam = sql("select label from canonical_field where status in ('DRAFT','PUBLISHED') and label is not null order by canonical_field_key limit 1");
  if (!fam) {
    const seed = await tryInsert(item("Family name"));
    // QA-192: if the one door finds it close to a waiting draft, the decider says why it is not the same.
    const d = await call("POST", "/review/proposals/decide", { ids: seed.ids, action: "accept", reason: "Seeded as the library field this check collides with (Sample)." }, AUTHOR);
    fam = d.status < 300 ? sql("select label from canonical_field where status in ('DRAFT','PUBLISHED') and label is not null order by canonical_field_key limit 1") : "";
  }
  const famKey = sql(`select canonical_field_key from canonical_field where label='${fam.replace(/'/g, "''")}' limit 1`);
  ok("setup: the library has a live shared field", !!famKey, { fam, famKey });
  let w = await tryInsert(item(fam));
  ok("C11.13 fail: a 'new' item with the same name as a live library item is refused (409)", w.status === 409, w.why);
  ok("C11.13 fail: the refusal names the existing item and where it is used (P-120 'with where used')", w.why.includes(famKey) && /used (by|in|on)|combination|IMM \d{4}/i.test(w.why), w.why);
  w = await tryInsert(item(fam, { reuse: { match: "reuse", existingKey: famKey } }));
  ok("C11.13 pass: the same item as 'reuse' of the existing field is accepted into the queue", w.status === 201, w.why);

  // ---------------------------------------------------------------- near duplicate: needs a reason, shown at release
  w = await tryInsert(item("Family name at birth", { identity: { key: P.identityKeyOf(payload("Family name at birth"), ""), near: [famKey], nearReason: null } }));
  ok("C11.13 fail: a near duplicate with no reason is refused by the contract", w.status === 400 || /say why it is not the same/i.test(w.why), w.why);
  const REASON = "The family name given at birth, which may differ from the current family name.";
  w = await tryInsert(item("Family name at birth", { identity: { key: P.identityKeyOf(payload("Family name at birth"), ""), near: [famKey], nearReason: REASON } }));
  ok("C11.13 pass: with its one-line reason the near duplicate waits in the queue", w.status === 201, w.why);
  const q = (await call("GET", `/review/proposals?group=${encodeURIComponent("edition:IMM 5257 (09-2023)")}`)).body;
  const near = [...(q?.group?.bands?.ready ?? []), ...(q?.group?.bands?.check ?? []), ...(q?.group?.bands?.decide ?? [])].find((x: any) => x.title === "Family name at birth");
  ok("C11.13 pass: the queue shows the near match and its reason, and the one door puts a near item in Check whatever band the producer gave (BAND_TIPS: close to a library item)", !!near && near.near?.includes(famKey) && near.near_reason === REASON && near.band !== "ready", near && { band: near.band, near: near.near, reason: near.near_reason });
  // QA-192 (P-120, P-149 (2)): the producer's reason is not a person's, so the decider gives the one line (refused without it).
  let r = await call("POST", "/review/proposals/decide", { ids: [near?.id ?? w.ids[0]], action: "accept" }, AUTHOR);
  ok("QA-192 fail: accepting a near duplicate whose only reason is the producer's, with no person's reason, is refused (400, naming the close field)", r.status === 400 && words(r).includes(famKey) && /say in one line why it is not the same/.test(words(r)), [r.status, words(r)]);
  r = await call("POST", "/review/proposals/decide", { ids: [near?.id ?? w.ids[0]], action: "accept", reason: REASON }, AUTHOR);
  ok("setup: the author accepts it (a DRAFT field and a waiting library change)", r.status < 300, r.status >= 300 ? words(r) : undefined);
  const batches = (await call("GET", "/review/changes?group=batch", undefined, APPROVER)).body?.batches ?? [];
  ok("C11.13 fail→pass: the second person's batch shows the near reason beside the new item", JSON.stringify(batches).includes(REASON), batches.length);
  const draft = (await call("GET", "/draft", undefined, APPROVER)).body;
  ok("C11.13 fail→pass: the Release page's library list shows the near reason (P-120: shown at release)", JSON.stringify(draft?.library ?? []).includes(REASON), (draft?.library ?? []).length);

  // ---------------------------------------------------------------- approval checks identity again
  w = await tryInsert(item("Passport colour"));
  const twin = w.ids[0];
  // Copies a live field's row shape (status DRAFT) so only the key and the name differ.
  const made = (() => { try { sql(`insert into canonical_field (id, workspace_id, canonical_field_key, version, status, meaning, value_type, data_type, scope, subject_kind, origin, updated_by, label) select gen_random_uuid(), workspace_id, 'person.passport_colour', 1, 'DRAFT', 'Colour of the passport cover (Sample).', value_type, data_type, scope, subject_kind, origin, '${AUTHOR}', 'Passport colour' from canonical_field where canonical_field_key='${famKey}' limit 1`); return "made"; } catch (e: any) { return String(e?.message ?? e).slice(0, 200); } })();
  ok("setup: a twin 'Passport colour' enters the library after the proposal was written", !!twin && made === "made", { twin, made });
  r = await call("POST", "/review/proposals/decide", { ids: [twin ?? randomUUID()], action: "accept" }, AUTHOR);
  ok("C11.13 pass: a twin added after the proposal is caught at acceptance (409 naming it)", r.status === 409 && /person\.passport_colour/.test(words(r)), words(r));
  ok("C11.13 pass: no AI was called (US$0)", T.spent() === before);
  await db.$disconnect();
  T.done();
});
