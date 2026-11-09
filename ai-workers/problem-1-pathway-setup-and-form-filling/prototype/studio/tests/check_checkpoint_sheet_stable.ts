// The configured checkpoint gives one IMM 5257 review sheet, load after load (Lead 39 on #1396, 9 Nov, option (a)): the
// pack's case (acceptance/C7.5.test.ts's fixed values, tests/fixtures/c75-made-up-run.ts packLikeCase) is built on two
// fresh loads of Demo › Load the configured checkpoint, and its sheet checksum, the key a saved paid review of the
// checkpoint is found by, is the same both times, as is the meaning of person.date_of_birth (the words the sheet's
// caption-less date-of-birth form fields borrow). Before 040-field-map-review.ts reviewed the drafts in one order, two
// loads gave 123a97599291 and 666775af9fcc. The order decides keys too (review B1 on #1411: an order by file name moved
// IMM 5257's other given names and US green card keys and turned C10.1 and C7.6 red), so the whole published library,
// every key with its meaning, must also be the same on both loads, and those two IMM 5257 keys must be in it. No model
// call (US$0); live AI off.
//   zsh studio/tools/isolated.sh runtime_ckst 4434 start && tsx studio/tests/check_checkpoint_sheet_stable.ts 4434 xr_studio_runtime_ckst
import { recorder } from "./runtime/api.ts";
import * as m3 from "../acceptance/lib/m3.ts";
import { packLikeCase } from "./fixtures/c75-made-up-run.ts";

const { ok, summary } = recorder();
const { call, sql } = m3;
const AUTHOR = "user-A";
/** A blank workspace, then the configured checkpoint, as Gate B loads it (tools/gate-b.mjs loadCheckpoint). */
async function load() {
  const blank = await call("POST", "/demo/reset", { confirm: "RESET" }, AUTHOR);
  const loaded = blank.status < 300 ? await call("POST", "/demo/load", { sample: "configured" }, AUTHOR) : blank;
  return loaded.status;
}
/** The pack's case on this load: its IMM 5257 sheet checksum and the library's wording of the date of birth. */
async function sheet() {
  const { c, P } = await packLikeCase();
  const r = await call("POST", `/runtime/cases/${c.id}/review-runs/plan`, { forms: ["IMM 5257"], subject: P });
  return { status: r.status, sha: String(r.body?.forms?.[0]?.sheet_sha256 ?? ""), meaning: sql("select meaning from canonical_field where canonical_field_key='person.date_of_birth' and status='PUBLISHED' order by version desc limit 1") ?? "",
    library: sql("select md5(string_agg(canonical_field_key || '=' || coalesce(meaning, ''), '|' order by canonical_field_key)) from canonical_field where status='PUBLISHED'") ?? "",
    keys: sql("select string_agg(canonical_field_key, ',' order by canonical_field_key) from canonical_field where status='PUBLISHED' and canonical_field_key in ('person.other_given_names','person.us_green_card_expiry_date')") ?? "" };
}

(async () => {
  const s1 = await load();
  const a = await sheet();
  ok("checkpoint load 1: loaded, and the pack's case has an IMM 5257 run card", s1 < 300 && a.status === 200 && /^[0-9a-f]{64}$/.test(a.sha), { load: s1, plan: a.status, sha: a.sha.slice(0, 12) });
  const b2 = await sheet();
  ok("checkpoint load 1: a second case on the same load gives the same sheet", b2.sha === a.sha, [a.sha.slice(0, 12), b2.sha.slice(0, 12)]);
  const s2 = await load();
  const b = await sheet();
  ok("checkpoint load 2 (fresh): loaded, and the pack's case has an IMM 5257 run card", s2 < 300 && b.status === 200 && /^[0-9a-f]{64}$/.test(b.sha), { load: s2, plan: b.status, sha: b.sha.slice(0, 12) });
  ok(`checkpoint pass: two fresh loads give the same IMM 5257 sheet (${a.sha.slice(0, 12)}), the key a saved paid review of the checkpoint is found by`, a.sha === b.sha, [a.sha.slice(0, 12), b.sha.slice(0, 12)]);
  ok(`checkpoint pass: and the same wording of the date of birth ("${a.meaning}")`, !!a.meaning && a.meaning === b.meaning, [a.meaning, b.meaning]);
  ok("checkpoint pass: and the same published library on both loads, every key with its meaning (the order decides keys too)", !!a.library && a.library === b.library, [a.library, b.library]);
  ok("checkpoint pass (review B1): IMM 5257's own keys for other given names and the US green card expiry are in the library, as on main", a.keys === "person.other_given_names,person.us_green_card_expiry_date" && b.keys === a.keys, [a.keys, b.keys]);
  process.exitCode = summary() ? 1 : 0;
})();
