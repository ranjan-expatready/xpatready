// P-319 (founder, 4 Nov: "no combination is hard-coded"): which forms are family information forms ([IRCC-F09] Guide 5256)
// is each library form's role, set per form by an author (POST /library/forms/:code/role, with a reason, in Activity) and
// released with the combination's snapshot, never a list of form numbers in the code. On the suites' fixture (Work permit
// (family), IMM 1295 and IMM 5707 among its forms), as check_c38_completeness_api.ts:
//   the demo data marks IMM 5707 and IMM 5645; the released sample stays clean; IMM 5707 removed is an error, as on main;
//   a new family form the code never listed (IMM 5406, marked by an author) fills the line, and the validator reads its
//   role from the snapshot (its "no field map" words say it is the family information form); unmarked again, the error
//   is back; a role the library does not know, a viewer, an unknown form and a missing reason are refused.
// No model call (US$0).
//   zsh studio/tools/isolated.sh forms_p319 4612 start && tsx studio/tests/check_p319_family_role.ts 4612 xr_studio_forms_p319
import { client, recorder } from "./runtime/api.ts";

const PORT = Number(process.argv[2] ?? 4612), DB = process.argv[3] ?? "xr_studio_forms_p319";
const { call, sql } = client(PORT, DB);
const { ok, summary } = recorder();
type P = { level: string; where: string; item: string; message: string };
const said = (r: { body: any }) => String(r.body?.detail ?? r.body?.message ?? ""); // eslint-disable-line @typescript-eslint/no-explicit-any

(async () => {
  await call("POST", "/demo/reset", { confirm: "RESET" });
  if ((await call("POST", "/demo/load")).status >= 300) { console.error("STOP  the sample did not load"); process.exit(2); }
  const wp = sql("select id from combination where combination_key = 'wp.family'");
  if (!wp) { console.error("STOP  no Work permit (family) on the fixture"); process.exit(2); }
  const problems = async () => ((await call("GET", `/combinations/${wp}/review`)).body as { draft: { problems: P[] } }).draft.problems;
  const fam = (ps: P[]) => ps.filter((p) => p.level === "error" && /Family Information\) is in this combination's application package/.test(p.message));
  const role = (code: string) => sql(`select coalesce(form_role, '-') from gov_form_def where form_key = '${code}'`);
  const setRole = (code: string, body: unknown, actor = "user-A") => call("POST", `/library/forms/${encodeURIComponent(code)}/role`, body, actor);

  // ── the demo data, and the released sample as on main
  ok("P-319 data: the demo marks IMM 5707 and IMM 5645 as family information forms (samples/form-roles.json); others have no role", role("IMM 5707") === "family_information" && role("IMM 5645") === "family_information" && role("IMM 1295") === "-", { "IMM 5707": role("IMM 5707"), "IMM 5645": role("IMM 5645"), "IMM 1295": role("IMM 1295") });
  let ps = await problems();
  ok("C3.8 [IRCC-F09] pass (as main): IMM 5707 in the package and in the forms raises no family information error", fam(ps).length === 0, fam(ps).map((p) => p.message));
  let r = await call("DELETE", `/combinations/${wp}/forms/${encodeURIComponent("IMM 5707")}`, {});
  ps = await problems();
  ok("C3.8 [IRCC-F09] fail (as main): IMM 5707 removed while the package lists it is an error naming IMM 5707", r.status < 300 && fam(ps).length === 1 && fam(ps)[0].item === "IMM 5707", { status: r.status, fam: fam(ps).map((p) => p.item) });

  // ── a new family form the code never listed: marked by an author, it fills the line
  r = await call("POST", `/combinations/${wp}/forms`, { formKey: "IMM 5406" });
  ps = await problems();
  ok("P-319 fail first: IMM 5406 on the forms, with no role, does not fill the family information line", r.status < 300 && fam(ps).length === 1, { status: r.status, said: said(r), fam: fam(ps).length });
  r = await setRole("IMM 5406", { role: "family_information", reason: "Additional family information: IRCC's family form for this package (test)" });
  ps = await problems();
  ok("P-319 pass: an author marks IMM 5406 as a family information form, and it fills the line (no form number in the rule)", r.status < 300 && r.body?.changed === true && role("IMM 5406") === "family_information" && fam(ps).length === 0, { status: r.status, said: said(r), fam: fam(ps).map((p) => p.message) });
  const unmapped = ps.find((p) => p.item === "IMM 5406" && /No form fields mapped yet/.test(p.message));
  ok("P-319 pass: the validator reads the role from the combination's snapshot: IMM 5406's \"no field map\" words say it is the family information form", !!unmapped && /It is this combination's family information form/.test(unmapped.message), unmapped?.message);
  const activity = sql("select coalesce(string_agg(summary, ' | '), '') from audit_event where entity = 'form' and entity_key = 'IMM 5406' and action = 'updated'");
  ok("P-319 pass: Activity says who set the role, from what to what, and why", /set IMM 5406 to Family information form \(was no role\): Additional family information/.test(activity), activity);
  r = await setRole("IMM 5406", { role: "family_information", reason: "the same again" });
  ok("P-319 pass: setting the same role again changes nothing", r.status < 300 && r.body?.changed === false, r.body);

  // ── unmarked again: the line comes back (the role is the only thing the rule reads)
  r = await setRole("IMM 5406", { role: null, reason: "Not a family information form (test)" });
  ps = await problems();
  ok("P-319 fail: with IMM 5406's role removed, the family information error is back", r.status < 300 && role("IMM 5406") === "-" && fam(ps).length === 1, { status: r.status, fam: fam(ps).length });

  // ── refusals
  r = await setRole("IMM 5406", { role: "something_else", reason: "a role the library does not know" });
  ok("P-319 fail: a role the library does not know is refused (400), nothing changes", r.status === 400 && role("IMM 5406") === "-", { status: r.status, said: said(r) });
  r = await setRole("IMM 5406", { role: "family_information" });
  ok("P-319 fail: a role change without a reason is refused (400)", r.status === 400 && role("IMM 5406") === "-", { status: r.status, said: said(r) });
  r = await setRole("IMM 5406", { role: "family_information", reason: "a viewer tries" }, "user-C");
  ok("P-319 fail: a person without the author duty cannot set a form's role (403)", r.status === 403 && role("IMM 5406") === "-", r.status);
  r = await setRole("IMM 9999", { role: "family_information", reason: "not in the library" });
  ok("P-319 fail: a form that is not in the library is refused (404), in words", r.status === 404 && /not in the library/.test(said(r)), { status: r.status, said: said(r) });
  let refusedDb = false;
  try { sql("update gov_form_def set form_role = 'other' where form_key = 'IMM 5406'"); } catch { refusedDb = true; }
  ok("P-319 fail: the database refuses an unknown role written past the API (gov_form_def_form_role_known)", refusedDb && role("IMM 5406") === "-");
  process.exit(summary() ? 1 : 0);
})().catch((e) => { console.error("FAIL  unexpected", e); process.exit(1); });
