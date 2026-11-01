// Acceptance C1.5 (P-220, pack 3): the author copies a form or document line from another combination, and adds or
// removes one line across many, after a preview of what happens in each (SA-1B-61 and SA1B-D6 in the team's SA-01B;
// founder 31 Oct on PR #167: form and document lines first; concept screens/X2-links-and-copy/concept-draft.md v3,
// BR-C1 to BR-C4; P-106: links between combinations are not configuration). Status today: Not built. On main: slice (a),
// POST /lines/bulk/preview. Open: PR #273, slice (b), POST /lines/bulk and POST /lines/bulk/:batchId/undo with table
// line_batch. Not built anywhere: slice (d), copy a line from another combination, POST /combinations/:id/lines/copy
// (named in the concept). Visitor visa first: IMM 5476 (Use of a representative) from With an LMIA. Rules only, US$0.
//   zsh studio/tools/isolated.sh accept 4440 start && tsx studio/tests/runtime/setup_visitor_visa.ts 4440 xr_studio_accept \
//     && tsx studio/acceptance/C1.5.test.ts 4440 xr_studio_accept
import { randomUUID } from "node:crypto";
import { client, recorder } from "../tests/runtime/api.ts";

const PORT = Number(process.argv[2] ?? 4440), DB = process.argv[3] ?? "xr_studio_accept";
const { call, sql } = client(PORT, DB);
const { ok, summary } = recorder();
const AUTHOR = "user-A", APPROVER = "user-B", OFFICER = "user-O";
const words = (r: { body: any }) => String(r.body?.detail ?? r.body?.message ?? ""); // eslint-disable-line @typescript-eslint/no-explicit-any
const n = (q: string) => Number(sql(q) || 0);
const lineOf = (combo: string, form: string) => sql(`select cf.who || '§' || coalesce(cf.condition_plain, '') || '§' || cf.channel || '§' || cf.signature || '§' || coalesce(cf.min_age::text, '') || '§' || coalesce(cf.signed_by, '') || '§' || coalesce(cf.copies::text, '') || '§' || cf.status || '§' || cf.origin || '§' || coalesce(cf.source_quote, '') from combination_form cf join gov_form_def g on g.id = cf.gov_form_def_id where cf.combination_id = '${combo}' and g.form_key = '${form}' order by cf.version desc limit 1`);
const attrs = (l: string) => l.split("§").slice(0, 7).join("§");

(async () => {
  const id = (k: string) => sql(`select id from combination where combination_key = '${k}'`);
  const WP = id("wp.family"), VV = id("vv.single"), SP = id("sp.student"), SV = id("sv.super_visa");
  const F = "IMM 5476";
  if (!WP || !VV || !SP || !lineOf(WP, F)) { console.error("STOP  run tests/runtime/setup_visitor_visa.ts first (fixture with With an LMIA's IMM 5476, then the Visitor visa)"); process.exit(2); }
  const src = lineOf(WP, F);
  const line = { combinationId: WP, kind: "form", key: F };

  // ── Preview (slice a, on main): a regression guard ──
  const pv = await call("POST", "/lines/bulk/preview", { line, op: "add", combinationIds: [VV, SP] });
  const tv = (pv.body?.targets ?? []).find((t: { combinationId: string }) => t.combinationId === VV);
  ok("C1.5 BR-C1 (slice a): the preview gives one outcome per target and writes nothing; the Visitor visa will get IMM 5476", pv.status === 200 && tv?.outcome === "WILL_ADD" && tv.tickable === true && !lineOf(VV, F), pv.status === 200 ? pv.body.targets.map((t: { outcome: string }) => t.outcome) : words(pv));

  // ── Add across many (slice b, PR #273) ──
  const key = `acceptance-${randomUUID()}`;
  const ap = await call("POST", "/lines/bulk", { line, op: "add", combinationIds: [VV, SP], include: [VV, SP], idempotencyKey: key });
  const batch = String(ap.body?.batchId ?? ap.body?.batch?.id ?? "");
  ok("C1.5 BR-C3 pass: Add writes one draft line in each ticked combination, in one batch, and says so in words", ap.status >= 200 && ap.status < 300 && batch !== "" && lineOf(VV, F).split("§")[7] === "DRAFT" && lineOf(SP, F).split("§")[7] === "DRAFT" && /IMM 5476 added to 2 combinations/.test(String(ap.body?.message ?? "")), { status: ap.status, words: words(ap) });
  ok("C1.5 BR-C2 pass: the copy carries who, \"only if\", channel, signature, minimum age, signer and copies from the source line", lineOf(VV, F) !== "" && attrs(lineOf(VV, F)) === attrs(src), { src: attrs(src), copy: attrs(lineOf(VV, F)) });
  ok("C1.5 BR-C2 fail: never copied: an AI origin or finder run; the copy says \"Copied from\" the source's trail", lineOf(VV, F) !== "" && !/^AI/.test(lineOf(VV, F).split("§")[8]) && /Copied from .*With an LMIA/.test(lineOf(VV, F).split("§")[9]) && n(`select count(*) from combination_form cf join gov_form_def g on g.id = cf.gov_form_def_id where cf.combination_id = '${VV}' and g.form_key = '${F}' and cf.finder_batch_id is not null`) === 0, lineOf(VV, F).split("§").slice(8));
  const rows = n(`select count(*) from combination_form`);
  const again = await call("POST", "/lines/bulk", { line, op: "add", combinationIds: [VV, SP], include: [VV, SP], idempotencyKey: key });
  ok("C1.5 BR-C3 fail: a retried request with the same key changes nothing twice and returns the same batch (replayed)", again.status >= 200 && again.status < 300 && again.body?.replayed === true && String(again.body?.batchId ?? again.body?.batch?.id ?? "") === batch && n(`select count(*) from combination_form`) === rows, { status: again.status, replayed: again.body?.replayed });
  const off = await call("POST", "/lines/bulk", { line, op: "add", combinationIds: [SV], include: [SV], idempotencyKey: `acceptance-${randomUUID()}` }, OFFICER);
  ok("C1.5 fail: a case officer cannot change configuration (403)", off.status === 403 && !lineOf(SV, F), off.status);

  // ── Undo (BR-C4) ──
  const other = await call("POST", `/lines/bulk/${batch || randomUUID()}/undo`, {}, APPROVER);
  ok("C1.5 BR-C4 fail: only the person who made the batch can undo it (403)", other.status === 403 && lineOf(VV, F) !== "", other.status);
  const un = await call("POST", `/lines/bulk/${batch || randomUUID()}/undo`, {}, AUTHOR);
  ok("C1.5 BR-C4 pass: one Undo takes the line back from every combination of the batch", un.status >= 200 && un.status < 300 && !["DRAFT", "PUBLISHED"].includes(lineOf(VV, F).split("§")[7] ?? "") && !["DRAFT", "PUBLISHED"].includes(lineOf(SP, F).split("§")[7] ?? ""), { status: un.status, vv: lineOf(VV, F).split("§")[7], sp: lineOf(SP, F).split("§")[7] });
  const ap2 = await call("POST", "/lines/bulk", { line, op: "add", combinationIds: [VV, SP], include: [VV, SP], idempotencyKey: `acceptance-${randomUUID()}` });
  const b2 = String(ap2.body?.batchId ?? ap2.body?.batch?.id ?? "");
  await call("PATCH", `/combinations/${SP}/forms/${encodeURIComponent(F)}`, { minAge: 18 });
  const un2 = await call("POST", `/lines/bulk/${b2 || randomUUID()}/undo`, {}, AUTHOR);
  ok("C1.5 BR-C4 fail: when one combination changed after the copy, Undo is refused naming it, and nothing is undone", un2.status === 409 && /was changed after the copy/.test(words(un2)) && /Nothing was undone/.test(words(un2)) && lineOf(VV, F).split("§")[7] === "DRAFT", { status: un2.status, words: words(un2) });

  // ── Remove across many ──
  const rmPv = await call("POST", "/lines/bulk/preview", { line: { combinationId: VV, kind: "form", key: F }, op: "remove", combinationIds: [SP, SV] });
  const rm = await call("POST", "/lines/bulk", { line: { combinationId: VV, kind: "form", key: F }, op: "remove", combinationIds: [SP, SV], include: [SP], idempotencyKey: `acceptance-${randomUUID()}` });
  ok("C1.5 pass: Remove across many takes the line out of each ticked combination (a removing draft), and the preview said which do not have it", rmPv.status === 200 && rmPv.body.targets.some((t: { combinationId: string; outcome: string }) => t.combinationId === SV && t.outcome === "DOES_NOT_HAVE") && rm.status >= 200 && rm.status < 300 && !["DRAFT", "PUBLISHED"].includes(lineOf(SP, F).split("§")[7] ?? ""), { status: rm.status, words: words(rm) });

  // ── A document line too (founder 31 Oct, PR #167: form and document lines first) ──
  const docLine = sql(`select d.lineage_key from document_requirement d where d.combination_id = '${WP}' and d.status = 'PUBLISHED' and d.document_type_key not in (select document_type_key from document_requirement where combination_id = '${VV}' and status in ('DRAFT', 'PUBLISHED')) order by d.lineage_key limit 1`);
  const docOn = (combo: string) => docLine ? sql(`select d.status || '§' || coalesce(d.condition_plain, '') || '§' || coalesce(d.applies_to_roles::text, '') from document_requirement d where d.combination_id = '${combo}' and d.document_type_key = (select document_type_key from document_requirement where lineage_key = '${docLine}' and combination_id = '${WP}' limit 1) order by d.version desc limit 1`) : "";
  const dl = { combinationId: WP, kind: "document", key: docLine };
  const dPv = await call("POST", "/lines/bulk/preview", { line: dl, op: "add", combinationIds: [VV] });
  const dAp = await call("POST", "/lines/bulk", { line: dl, op: "add", combinationIds: [VV], include: [VV], idempotencyKey: `acceptance-${randomUUID()}` });
  ok("C1.5 BR-C2 pass (document line): a With an LMIA document line is previewed, then added to the Visitor visa as a draft with its \"only if\" and whose it is", docLine !== "" && dPv.status === 200 && dAp.status >= 200 && dAp.status < 300 && docOn(VV).split("§")[0] === "DRAFT" && docOn(VV).split("§").slice(1).join("§") === docOn(WP).split("§").slice(1).join("§"), { docLine, preview: dPv.status, add: dAp.status, words: words(dAp) });
  const dUn = await call("POST", `/lines/bulk/${String(dAp.body?.batchId ?? randomUUID())}/undo`, {}, AUTHOR);
  ok("C1.5 BR-C4 pass (document line): Undo takes the document line back", dUn.status >= 200 && dUn.status < 300 && !["DRAFT", "PUBLISHED"].includes(docOn(VV).split("§")[0] ?? ""), dUn.status);

  // ── Copy one line from another combination (slice d, not built anywhere) ──
  const LM = id("lm.high_wage");
  const cp = await call("POST", `/combinations/${LM}/lines/copy`, { from: { combinationId: WP, kind: "form", key: F } });
  ok("C1.5 pass (SA-1B-61 \"copy from another row\"): the author copies IMM 5476 from With an LMIA onto High-wage position as a draft line with the same settings", cp.status >= 200 && cp.status < 300 && lineOf(LM, F).split("§")[7] === "DRAFT" && attrs(lineOf(LM, F)) === attrs(src), { status: cp.status, words: words(cp) });
  const cpSelf = await call("POST", `/combinations/${WP}/lines/copy`, { from: { combinationId: WP, kind: "form", key: F } });
  ok("C1.5 fail: copying a line onto the combination it comes from, or one that already has it, is refused 409 in words", cpSelf.status === 409 && words(cpSelf).length > 10, cpSelf.status);
  process.exit(summary() ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
