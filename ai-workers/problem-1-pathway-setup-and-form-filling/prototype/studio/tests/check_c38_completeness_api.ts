// C3.8 (validator) on real data: the two completeness rules of engine/form-completeness.ts through Review and release,
// on the released Work permit (family) sample (IMM 1295 and IMM 5707 among its forms). Each rule has a passing and a
// failing case; the Devin findings on #691 each have their own. An isolated copy, no browser, no model call (US$0).
//   [IRCC-F08] a Background question left "not a fact" (decided before the rule) is an error, listed on Form fields to
//              decide again, and cleared by "filled by hand"; a form removed in the draft is no longer checked
//   [IRCC-F09] IMM 5707 in the package and in the forms is clean; removed from the forms, it is an error in words
//   zsh studio/tools/isolated.sh screens_c38 4446 start && tsx studio/tests/check_c38_completeness_api.ts 4446 xr_studio_screens_c38
import { client, recorder } from "./runtime/api.ts";

const PORT = Number(process.argv[2] ?? 4446), DB = process.argv[3] ?? "xr_studio_screens_c38";
const { call, sql } = client(PORT, DB);
const { ok, summary } = recorder();
type P = { level: string; where: string; item: string; message: string };

(async () => {
  await call("POST", "/demo/reset", { confirm: "RESET" });
  if ((await call("POST", "/demo/load")).status >= 300) { console.error("STOP  the sample did not load"); process.exit(2); }
  const wp = sql("select id from combination where combination_key = 'wp.family'");
  const ed = sql("select e.id from form_edition e join gov_form_def g on g.id = e.gov_form_def_id where g.form_key = 'IMM 1295' and e.channel = 'PDF' order by e.edition_label limit 1");
  const path = sql(`select data_path from form_field_map where form_edition_id = '${ed}' and status = 'PUBLISHED' and data_path like '%BackgroundInfo[0].Choice[0]' limit 1`);
  if (!wp || !ed || !path) { console.error("STOP  no Work permit (family) with an IMM 1295 Background question", { wp, ed, path }); process.exit(2); }
  const errors = async () => ((await call("GET", `/combinations/${wp}/review`)).body as { draft: { problems: P[] } }).draft.problems.filter((p) => p.level === "error");
  const bg = (ps: P[]) => ps.filter((p) => p.item === "IMM 1295" && /Background information question/.test(p.message));
  const fam = (ps: P[]) => ps.filter((p) => p.item === "IMM 5707" && /Family Information/.test(p.message));

  // ── [IRCC-F08] pass: the released sample is clean
  let ps = await errors();
  ok("C3.8 [IRCC-F08] pass: the released sample's Background questions raise no error", bg(ps).length === 0, bg(ps).map((p) => p.message));
  ok("C3.8 [IRCC-F09] pass: IMM 5707 is in the package and in the forms, so no family information error", fam(ps).length === 0, fam(ps).map((p) => p.message));

  // ── [IRCC-F08] fail: a Background question left "not a fact" before the rule (written as an old decision would be)
  sql(`update form_field_map set outcome = 'not_a_fact', canonical_field_key = null, reason = 'Decided before C3.8 (test)' where form_edition_id = '${ed}' and data_path = '${path}' and status = 'PUBLISHED'`);
  ps = await errors();
  ok("C3.8 [IRCC-F08] fail: a Background question already \"not a fact\" is an error on Review and release, by its caption, never its PDF path", bg(ps).length === 1 && !/\[0\]/.test(bg(ps)[0].message), ps.filter((p) => p.item === "IMM 1295").map((p) => p.message.slice(0, 120)));
  const view = (await call("GET", `/editions/${ed}/form-fields`)).body as { fields: { dataPath: string; outcome: string; background?: boolean }[] };
  const row = view.fields.find((f) => f.dataPath === path);
  ok("C3.8 [IRCC-F08] (Devin on #691): Form fields marks it a Background question, so the page lists it to decide again", row?.background === true && row.outcome === "not_a_fact", row);
  let r = await call("POST", `/editions/${ed}/form-fields/decision`, { dataPath: path, decision: "not_a_fact", reason: "Still not a fact (test)" }, "user-C");
  ok("C3.8 [IRCC-F08] fail: deciding it \"not a fact\" again is refused (409) in words", r.status === 409 && /Background information question/.test(String((r.body as { message?: string })?.message ?? JSON.stringify(r.body))), r.status);
  r = await call("POST", `/editions/${ed}/form-fields/decision`, { dataPath: path, decision: "by_hand", reason: "Recorded by hand by the officer (test)" }, "user-C");
  ps = await errors();
  ok("C3.8 [IRCC-F08] pass (Devin on #691): decided \"filled by hand\", the error is cleared", r.status < 300 && bg(ps).length === 0, { status: r.status, left: bg(ps).map((p) => p.message.slice(0, 80)) });

  // ── [IRCC-F08] Devin on #691: a form removed in the draft is no longer checked
  sql(`update form_field_map set outcome = 'not_a_fact', canonical_field_key = null where form_edition_id = '${ed}' and data_path = '${path}'`);
  ok("C3.8 [IRCC-F08] setup: the Background error is back", bg(await errors()).length === 1);
  r = await call("DELETE", `/combinations/${wp}/forms/${encodeURIComponent("IMM 1295")}`, {});
  ps = await errors();
  ok("C3.8 [IRCC-F08] pass (Devin on #691): IMM 1295 removed in the draft (its released line still there until release), its Background question is no longer an error", r.status < 300 && bg(ps).length === 0, { status: r.status, left: bg(ps).length });

  // ── [IRCC-F09] fail: IMM 5707 removed from the forms while the package still lists it
  r = await call("DELETE", `/combinations/${wp}/forms/${encodeURIComponent("IMM 5707")}`, {});
  ps = await errors();
  ok("C3.8 [IRCC-F09] fail: IMM 5707 removed from the forms while its package lists it is an error saying what to add and where", r.status < 300 && fam(ps).length === 1 && /on the Forms tab, add IMM 5707/.test(fam(ps)[0].message), { status: r.status, said: fam(ps).map((p) => p.message) });
  process.exit(summary() ? 1 : 0);
})().catch((e) => { console.error("FAIL  C3.8 the check itself stopped:", e); process.exit(1); });
