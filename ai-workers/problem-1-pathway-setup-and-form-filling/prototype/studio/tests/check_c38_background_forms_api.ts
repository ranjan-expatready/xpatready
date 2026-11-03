// C3.8 [IRCC-F08] QA-199 on real data: every Background information question of IMM 5257, IMM 1295 and IMM 1294 is
// named by the form's own reading (engine/form-completeness.ts backgroundQuestions over the edition's inventory), so
// Q4 military, Q5 political party and Q6 ill-treatment, which sit outside any `BackgroundInfo` node, are refused as
// "not a fact" (409, in words) and, left so by an earlier decision, block release by their caption. Per form: IMM 1295
// on the Work permit (family) sample; IMM 5257 and IMM 1294 on Reset to the six, their saved field-map answers applied
// (replays, no model call, US$0). An edition whose recorded reading is missing here fails closed (review Minor 1).
// Before QA-199 the three questions answered 200 and raised no error on every form.
//   zsh studio/tools/isolated.sh screens_c38bg 4447 start && tsx studio/tests/check_c38_background_forms_api.ts 4447 xr_studio_screens_c38bg
import { client, recorder } from "./runtime/api.ts";

const PORT = Number(process.argv[2] ?? 4447), DB = process.argv[3] ?? "xr_studio_screens_c38bg";
const { call, sql } = client(PORT, DB);
const { ok, summary } = recorder();
type P = { level: string; where: string; item: string; message: string };
const stop = (why: string, detail?: unknown) => { console.error(`STOP  ${why}`, detail ?? ""); process.exit(2); };
const words = (r: { body: unknown }) => String((r.body as { detail?: string })?.detail ?? JSON.stringify(r.body));

/** Q4, Q5 and Q6 of each form, as its own field list numbers them (p1/inventory/<file>.inventory.json). */
const Q456 = (page: string) => ["Military", "Occupation", "GovPosition"].map((n) => `form1[0].${page}[0].PageWrapper[0].${n}[0].Choice[0]`);

/** Applies the combination's saved field-map answer for one form, as a person would on To review: compared again with
 *  today's library, then decided and applied (US$0). */
async function applySaved(combinationKey: string, file: string) {
  const a = sql(`select a.id from source_attachment a join combination c on c.id = a.combination_id where c.combination_key = '${combinationKey}' and a.file_name = '${file}'`);
  const job = a && sql(`select id from drafting_job where attachment_id = '${a}' and kind = 'field_map' order by started_at desc limit 1`);
  if (!job) stop(`no saved field-map answer for ${file} on ${combinationKey}`);
  await call("POST", `/jobs/${job}/recompare`, {}); // the library changed when the other form was applied (no AI call)
  await call("POST", `/jobs/${job}/accept-clean`, {}, "user-C");
  for (const i of ((await call("GET", `/jobs/${job}`)).body.items as { id: string; decision: string }[]).filter((x) => x.decision === "PENDING"))
    await call("POST", `/jobs/${job}/items/${i.id}`, { decision: "ACCEPTED", note: "A different meaning from the candidates (QA-199 check)" }, "user-C");
  const r = await call("POST", `/jobs/${job}/apply`, {});
  if (r.status >= 300) stop(`${file}'s saved answer did not apply`, r.body);
}

async function form(formKey: string, combinationKey: string, page: string) {
  const combo = sql(`select id from combination where combination_key = '${combinationKey}'`);
  const ed = sql(`select e.id from form_edition e join gov_form_def g on g.id = e.gov_form_def_id where g.form_key = '${formKey}' and e.channel = 'PDF' order by e.edition_label limit 1`);
  if (!combo || !ed) stop(`no ${formKey} on ${combinationKey}`, { combo, ed });
  const errors = async () => ((await call("GET", `/combinations/${combo}/review`)).body as { draft: { problems: P[] } }).draft.problems.filter((p) => p.level === "error" && p.item === formKey && /Background information question/.test(p.message));
  const view = async () => ((await call("GET", `/editions/${ed}/form-fields`)).body as { fields: { dataPath: string; caption: string | null; outcome: string; background?: boolean }[] }).fields;
  const before = await view();
  const listed = Q456(page).filter((p) => before.find((f) => f.dataPath === p)?.background === true);
  ok(`C3.8 [IRCC-F08] QA-199 ${formKey}: Form fields marks Q4 military, Q5 political party and Q6 ill-treatment as Background questions (the form's own reading)`, listed.length === 3, { listed, background: before.filter((f) => f.background).length });
  for (const [n, path] of Q456(page).entries()) {
    const q = `Q${n + 4}`, caption = before.find((f) => f.dataPath === path)?.caption ?? "";
    // An undecided question (as a replay leaves some): deciding it "not a fact" is refused, nothing changes.
    sql(`update form_field_map set outcome = 'unresolved', canonical_field_key = null, transform = null where form_edition_id = '${ed}' and data_path = '${path}' and status in ('DRAFT', 'PUBLISHED')`);
    const r = await call("POST", `/editions/${ed}/form-fields/decision`, { dataPath: path, decision: "not_a_fact", reason: "Not a fact this product fills (QA-199 check)" }, "user-C");
    const after = (await view()).find((f) => f.dataPath === path)?.outcome;
    ok(`C3.8 [IRCC-F08] QA-199 ${formKey} ${q}: deciding it "not a fact" is refused (409) in plain words naming the question, never its PDF path, and nothing changes`,
      r.status === 409 && /is a Background information question: IRCC returns an application with one unanswered/.test(words(r)) && !!caption && words(r).includes(caption.slice(0, 40)) && !/\[0\]/.test(words(r)) && after === "unresolved", { status: r.status, said: words(r).slice(0, 160), after });
    // Left "not a fact" by an earlier decision: an error on Review and release by its caption; "filled by hand" clears it.
    sql(`update form_field_map set outcome = 'not_a_fact' where form_edition_id = '${ed}' and data_path = '${path}' and status in ('DRAFT', 'PUBLISHED')`);
    const es = await errors();
    ok(`C3.8 [IRCC-F08] QA-199 ${formKey} ${q}: already "not a fact", it is an error that blocks release, by its caption`, es.length === 1 && es[0].message.includes(caption.slice(0, 40)) && !/\[0\]/.test(es[0].message), es.map((p) => p.message.slice(0, 120)));
    const h = await call("POST", `/editions/${ed}/form-fields/decision`, { dataPath: path, decision: "by_hand", reason: "Recorded by hand by the officer (QA-199 check)" }, "user-C");
    ok(`C3.8 [IRCC-F08] QA-199 ${formKey} ${q} pass: decided "filled by hand", the error is cleared`, h.status < 300 && (await errors()).length === 0, { status: h.status });
  }
  // Pass case: a form field outside the Background section can still be "not a fact" (the rule names only the form's own list).
  const plain = (await view()).find((f) => !f.background && f.outcome === "unresolved");
  if (plain) {
    const r = await call("POST", `/editions/${ed}/form-fields/decision`, { dataPath: plain.dataPath, decision: "not_a_fact", reason: "Not a fact this product fills (QA-199 check)" }, "user-C");
    ok(`C3.8 [IRCC-F08] QA-199 ${formKey} pass: a form field outside Background information can still be "not a fact"`, r.status < 300, { status: r.status, field: plain.caption });
  }
}

/** Review Minor 1: an edition whose recorded reading is missing here fails closed, on the decision and on release. */
async function readingMissing(formKey: string, combinationKey: string) {
  const combo = sql(`select id from combination where combination_key = '${combinationKey}'`);
  const ed = sql(`select e.id from form_edition e join gov_form_def g on g.id = e.gov_form_def_id where g.form_key = '${formKey}' and e.channel = 'PDF' order by e.edition_label limit 1`);
  const file = sql(`select inventory_file from form_edition where id = '${ed}'`);
  const plain = ((await call("GET", `/editions/${ed}/form-fields`)).body as { fields: { dataPath: string; outcome: string; background?: boolean }[] }).fields.find((f) => !f.background && f.outcome !== "mapped");
  sql(`update form_edition set inventory_file = 'prototype/p1/inventory/missing-qa199-check.inventory.json' where id = '${ed}'`);
  try {
    const r = plain ? await call("POST", `/editions/${ed}/form-fields/decision`, { dataPath: plain.dataPath, decision: "not_a_fact", reason: "Not a fact this product fills (QA-199 check)" }, "user-C") : { status: 0, body: null };
    ok(`C3.8 [IRCC-F08] QA-199 review Minor 1 ${formKey}: with its reading missing, "not a fact" is refused (409) in words saying to read the form again`, r.status === 409 && /reading of .* is missing on this computer/.test(words(r)) && /read the form again/.test(words(r)), { status: r.status, said: words(r).slice(0, 160) });
    const ps = ((await call("GET", `/combinations/${combo}/review`)).body as { draft: { problems: P[] } }).draft.problems.filter((p) => p.level === "error" && p.item === formKey && /is missing on this computer/.test(p.message));
    ok(`C3.8 [IRCC-F08] QA-199 review Minor 1 ${formKey}: with its reading missing, release is blocked by an error in words`, ps.length === 1, ps.map((p) => p.message.slice(0, 120)));
  } finally { sql(`update form_edition set inventory_file = '${file}' where id = '${ed}'`); }
  const back = ((await call("GET", `/combinations/${combo}/review`)).body as { draft: { problems: P[] } }).draft.problems.filter((p) => /is missing on this computer/.test(p.message));
  ok(`C3.8 [IRCC-F08] QA-199 review Minor 1 ${formKey} pass: the reading back, the error is gone`, back.length === 0, back.length);
}

(async () => {
  await call("POST", "/demo/reset", { confirm: "RESET" });
  if ((await call("POST", "/demo/load")).status >= 300) stop("the sample did not load");
  await form("IMM 1295", "wp.family", "Page4");
  await readingMissing("IMM 1295", "wp.family");
  if ((await call("POST", "/demo/reset-to-six", { confirm: "RESET" })).status >= 300) stop("Reset to the six did not load");
  await applySaved("vv.single", "imm5257e.pdf");
  await applySaved("sp.outside", "imm1294e.pdf");
  await form("IMM 5257", "vv.single", "Page3");
  await form("IMM 1294", "sp.outside", "Page4");
  process.exit(summary() ? 1 : 0);
})().catch((e) => { console.error("FAIL  C3.8 QA-199 the check itself stopped:", e); process.exit(1); });
