// G1 (C5.4) PR 1: the source register table (migration 20261102183000_g1_source_entry; concept BR-3, BR-11 and the tech
// lead's ⚑ changes on #558). The database itself refuses an entry that is neither a full citation nor "None published"
// with its reason, both at once, an unknown kind or a second entry for one address; each rule with a pass and a fail.
// The table is additive and read by nothing yet (PR 2a wires it). No model call (US$0).
//   zsh studio/tools/isolated.sh screens_g1db 4449 start && tsx studio/tests/check_g1_source_entry_db.ts 4449 xr_studio_screens_g1db
import { client, recorder } from "./runtime/api.ts";

const PORT = Number(process.argv[2] ?? 4449), DB = process.argv[3] ?? "xr_studio_screens_g1db";
const { sql } = client(PORT, DB);
const { ok, summary } = recorder();
const W = "00000000-0000-0000-0000-000000000001"; // a workspace id no copy uses; its rows are removed before and after
const insert = (key: string, cols: string): string => {
  try { sql(`insert into source_entry (id, workspace_id, item_kind, item_key, value_path, value, citation_url, citation_quote, citation_date, none_published, none_published_reason, created_by, updated_by) values (gen_random_uuid(), '${W}', ${cols.replace("$KEY", key)})`); return "inserted"; }
  catch (e) { return /violates [a-z ]+"([a-z_]+)"/.exec(String((e as { stderr?: string }).stderr ?? e))?.[1] ?? String(e).slice(0, 200); }
};
sql(`delete from source_entry where workspace_id = '${W}'`);
const cited = "'rule', '$KEY', 'person.age_years|gte|1', '18', 'https://www.canada.ca/guide-5487', 'at least 18 years of age', '2026-10-19', false, null, 'test', 'test'";
const none = (reason: string) => `'check', '$KEY', 'case.days|lt|1', '90', null, null, null, true, ${reason}, 'test', 'test'`;

ok("C5.4 BR-3 pass: a full citation (https URL, the words, the date read) is stored, version 1, not Sample", insert("t/R-01", cited) === "inserted" && sql(`select version || ':' || sample from source_entry where workspace_id='${W}' and item_key='t/R-01'`) === "1:false");
ok("C5.4 BR-3 fail: a citation without its words or date is refused", insert("t/R-02", "'rule', '$KEY', 'x|gte|1', '18', 'https://www.canada.ca/x', null, null, false, null, 'test', 'test'") === "source_entry_answer_check");
ok("C5.4 BR-3 pass: \"None published – set by ExpatReady\" with a reason of 10 characters or more is stored", insert("t/C-01", none("'IRCC publishes no limit for this'")) === "inserted");
ok("C5.4 BR-3 fail (⚑ reason column): \"None published\" with no reason, or a reason under 10 characters, is refused", insert("t/C-02", none("null")) === "source_entry_answer_check" && insert("t/C-03", none("'too short'")) === "source_entry_answer_check");
ok("C5.4 BR-3 fail: a citation and \"None published\" at once is refused", insert("t/C-04", "'check', '$KEY', 'case.days|lt|1', '90', 'https://x', 'q', '2026-10-19', true, 'IRCC publishes no limit for this', 'test', 'test'") === "source_entry_answer_check");
ok("C5.4 BR-1 fail: a kind the engine does not list is refused", insert("t/G-01", cited.replace("'rule'", "'gate'")) === "source_entry_item_kind_check");
ok("C5.4 BR-2 fail: one entry per address: a second entry for the same item and address is refused", insert("t/R-01", cited) === "source_entry_workspace_id_item_kind_item_key_value_path_key");
ok("C5.4 BR-2 pass: the same item with another address (another number in it) is its own entry", insert("t/R-01", cited.replace("person.age_years|gte|1", "person.age_years|gte|2")) === "inserted");
sql(`delete from source_entry where workspace_id = '${W}'`);
process.exitCode = summary() ? 1 : 0;
