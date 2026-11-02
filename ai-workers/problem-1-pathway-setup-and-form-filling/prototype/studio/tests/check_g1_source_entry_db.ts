// G1 (C5.4) PR 1: the source register table (migration 20261102183000_g1_source_entry; concept BR-3, BR-10, BR-11, the
// tech lead's ⚑ changes and his Sample condition on #558; review MJ-1, MJ-2 and minor 1 on #569). The database refuses
// an entry that is not exactly one honest answer: a citation (https URL, the words, the date read), "None published"
// with its reason, or Sample with no source claimed. Every clause has its own failing insert beside a passing one, so
// dropping any single clause turns this red. The table is read by nothing yet (PR 2a wires it). No model call (US$0).
//   zsh studio/tools/isolated.sh screens_g1db 4449 start && tsx studio/tests/check_g1_source_entry_db.ts 4449 xr_studio_screens_g1db
import { client, recorder } from "./runtime/api.ts";

const PORT = Number(process.argv[2] ?? 4449), DB = process.argv[3] ?? "xr_studio_screens_g1db";
const { sql } = client(PORT, DB);
const { ok, summary } = recorder();
const W = "00000000-0000-0000-0000-000000000001"; // a workspace id no copy uses; its rows are removed before and after
type Row = Partial<Record<"item_kind" | "item_key" | "value_path" | "value" | "citation_url" | "citation_page" | "citation_quote" | "citation_date" | "none_published" | "none_published_reason" | "sample" | "version", string | number | boolean | null>>;
const lit = (v: unknown) => (v === null || v === undefined ? "null" : typeof v === "string" ? `'${v.replace(/'/g, "''")}'` : String(v));
let n = 0;
/** Inserts one row (a fresh key each time unless given) and answers "inserted" or the constraint it broke. */
const put = (row: Row): string => {
  const r: Row = { item_kind: "rule", item_key: `t/R-${++n}`, value_path: "person.age_years|gte|1", value: "18", ...row };
  const cols = Object.keys(r), vals = cols.map((c) => lit(r[c as keyof Row]));
  try { sql(`insert into source_entry (id, workspace_id, created_by, updated_by, ${cols.join(", ")}) values (gen_random_uuid(), '${W}', 'test', 'test', ${vals.join(", ")})`); return "inserted"; }
  catch (e) { return /violates [a-z ]+"([a-z_]+)"/.exec(String((e as { stderr?: string }).stderr ?? e))?.[1] ?? String(e).slice(0, 200); }
};
const CITED: Row = { citation_url: "https://www.canada.ca/guide-5487", citation_quote: "at least 18 years of age", citation_date: "2026-10-19" };
const NONE: Row = { none_published: true, none_published_reason: "IRCC publishes no limit for this" };
const SAMPLE: Row = { sample: true };
const ANS = "source_entry_answer_check", CIT = "source_entry_citation_check", KEYS = "source_entry_keys_check";
sql(`delete from source_entry where workspace_id = '${W}'`);

// (a) cited
ok("C5.4 BR-3 pass: a full citation is stored, version 1, not Sample", put({ ...CITED, item_key: "t/cited" }) === "inserted" && sql(`select version || ':' || sample from source_entry where workspace_id='${W}' and item_key='t/cited'`) === "1:false");
ok("C5.4 BR-3 pass: a page note and a 300-character quote are kept", put({ ...CITED, citation_page: "Guide 5487, page 4", citation_quote: "q".repeat(300) }) === "inserted");
ok("C5.4 BR-3 fail: a citation without its URL, its words or its date is refused (each alone)", [{ citation_url: null }, { citation_quote: null }, { citation_date: null }].every((x) => put({ ...CITED, ...x }) === ANS));
ok("C5.4 BR-3 fail: a citation that also carries a reason, or is also marked Sample, is refused", put({ ...CITED, none_published_reason: "IRCC publishes no limit for this" }) === ANS && put({ ...CITED, sample: true }) === ANS);
ok("C5.4 BR-3 fail (review minor 1): an address that is not https, or has a space, or is blank, is refused", ["http://www.canada.ca/x", "javascript:alert(1)", "https://www.canada.ca/a b", "https://", ""].every((u) => put({ ...CITED, citation_url: u }) === CIT));
ok("C5.4 BR-3 fail (review minor 1; Devin on #569: tabs and line breaks are blank too): blank words, words over 300 characters, a blank page note or one over 200 are refused", put({ ...CITED, citation_quote: "   " }) === CIT && put({ ...CITED, citation_quote: "\t\t" }) === CIT && put({ ...CITED, citation_page: "\n" }) === CIT && put({ ...CITED, citation_quote: "q".repeat(301) }) === CIT && put({ ...CITED, citation_page: " " }) === CIT && put({ ...CITED, citation_page: "p".repeat(201) }) === CIT);
// (b) None published
ok("C5.4 BR-3 pass: \"None published – set by ExpatReady\" with a reason of 10 characters is stored", put({ ...NONE, none_published_reason: "0123456789" }) === "inserted");
ok("C5.4 BR-3 fail (⚑ reason): no reason, or under 10 characters once trimmed (\"   too short   \"), is refused", put({ ...NONE, none_published_reason: null }) === ANS && put({ ...NONE, none_published_reason: "   too short   " }) === ANS && put({ ...NONE, none_published_reason: "\t\ttoo short\n\n\n" }) === ANS);
ok("C5.4 BR-3 fail: \"None published\" with any citation field, or also marked Sample, is refused (each alone)", [{ citation_url: "https://x.ca" }, { citation_page: "p" }, { citation_quote: "q" }, { citation_date: "2026-10-19" }, { sample: true }].every((x) => put({ ...NONE, ...x }) === ANS));
// (c) Sample (review MJ-1: the tech lead's condition on Decision 1)
ok("C5.4 BR-10 pass (review MJ-1): a Sample entry with no source claimed is stored", put({ ...SAMPLE }) === "inserted");
ok("C5.4 BR-10 fail (review MJ-1): a Sample entry may not also claim a citation field, None published or a reason (each alone)", [{ citation_url: "https://x.ca" }, { citation_page: "p" }, { citation_quote: "q" }, { citation_date: "2026-10-19" }, { none_published: true }, { none_published_reason: "IRCC publishes no limit for this" }].every((x) => put({ ...SAMPLE, ...x }) === ANS));
// the flag and its reason go together (mutation run on #569: each was missed alone)
ok("C5.4 BR-3 fail: a citation with the None published flag on (and no reason) is refused", put({ ...CITED, none_published: true }) === ANS);
ok("C5.4 BR-3 fail: a reason with the None published flag off (no citation, not Sample) is refused", put({ none_published_reason: "IRCC publishes no limit for this" }) === ANS);
// no answer at all
ok("C5.4 BR-3 fail: an entry with no answer (no citation, not None published, not Sample) is refused", put({}) === ANS);
// keys, kind, version, one entry per address
ok("C5.4 BR-1 fail: a kind the engine does not list is refused", put({ ...CITED, item_kind: "gate" }) === "source_entry_item_kind_check");
ok("C5.4 BR-2 fail (review minor 1): a blank item, address or value is refused (each alone)", [{ item_key: " " }, { value_path: "" }, { value: "  " }, { item_key: "\t" }, { value_path: "\n" }, { value: "\t \n" }].every((x) => put({ ...CITED, ...x }) === KEYS));
ok("C5.4 BR-11 fail (review MJ-2): version 0 is refused", put({ ...CITED, version: 0 }) === "source_entry_version_check");
ok("C5.4 BR-2 fail: one entry per address: a second entry for the same item and address is refused", put({ ...CITED, item_key: "t/cited" }) === "source_entry_workspace_id_item_kind_item_key_value_path_key");
ok("C5.4 BR-2 pass: the same item with another address (another number in it) is its own entry", put({ ...CITED, item_key: "t/cited", value_path: "person.age_years|gte|2" }) === "inserted");
sql(`delete from source_entry where workspace_id = '${W}'`);
process.exitCode = summary() ? 1 : 0;
