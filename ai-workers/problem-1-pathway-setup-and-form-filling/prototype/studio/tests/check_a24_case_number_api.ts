// A24-1 API checks (P-492; design product/design/case-structure-a24-2026-11-12.md §5.2 CS-1, CS-7, CS-8, §8), through
// the product's routes on the configured checkpoint: a case opens with the firm's next case number (C-<year>-<5 digits>);
// 20 opened at once get 20 different numbers with no gap; a refused opening uses no number; a replay keeps its number;
// the firm's own reference is optional; each firm counts on its own; the case list returns the number, the client
// person's name (kept after Make principal) and the filing count; the database refuses a second principal. Every rule
// has a passing and a failing case. SQL only reads, except the refused writes named where they are. No model call (US$0).
//   zsh studio/tools/isolated.sh rt_a24 4491 start && tsx studio/tests/check_a24_case_number_api.ts 4491 xr_studio_rt_a24
import { call, firms, FAMILY, openCase, prepare, run, sql } from "../acceptance/lib/m3.ts";
import { CASE_NUMBER } from "../contracts/runtime.ts";
import { client as dbClient, recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();
const AUTHOR = "user-A", CLIENT = "user-P";
const words = (r: { body: any }) => String(r.body?.detail ?? r.body?.message ?? JSON.stringify(r.body?.errors ?? "")); // eslint-disable-line @typescript-eslint/no-explicit-any -- responses read loosely, as in the other checks
const comboId = (key: string) => sql(`select c.id from combination c where c.combination_key='${key}' and exists (select 1 from config_release r where r.combination_id=c.id)`);
if (!comboId("vv.single")) { const l = await call("POST", "/demo/load", { sample: "configured" }, AUTHOR); if (l.status >= 300) { console.error("STOP  the configured checkpoint did not load", l.status); process.exit(2); } }
const vv = comboId("vv.single")!;
const f = await firms();
const officer = f.officer ?? "user-O", solo = "user-S";
const YEAR = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", year: "numeric" }).format(new Date());
const seq = (n: unknown) => (typeof n === "string" && CASE_NUMBER.test(n) && n.startsWith(`C-${YEAR}-`) ? Number(n.slice(7)) : NaN);
const open = (body: Record<string, unknown>, actor = officer) => call("POST", "/runtime/cases", { combinationId: vv, clientActor: CLIENT, principal: { displayName: "Sample Client N" }, ...(actor === officer && f.rep ? { representative: f.rep, caseOfficers: [officer] } : {}), ...body }, actor);
const ref = (k: string) => `A24-${k}-${run}`;

// ---------------------------------------------------------------- a new case gets the next number (CS-7)
const a = await open({ reference: ref("a") });
const n0 = seq(a.body?.case_number);
ok("A24-1 CS-7 pass: a new case gets a case number C-<this year>-<5 digits>", a.status === 201 && Number.isInteger(n0) && n0 >= 1, [a.status, a.body?.case_number]);
const b = await open({});
ok("A24-1 CS-7 pass: the firm's own reference is optional: a case opens without one and gets the next number", b.status === 201 && b.body?.reference === null && seq(b.body?.case_number) === n0 + 1, [b.status, b.body?.reference, b.body?.case_number, words(b)]);
const bGet = await call("GET", `/runtime/cases/${b.body?.id}`, undefined, officer);
ok("A24-1 CS-7 pass: the case page's data carries the same number", bGet.status === 200 && bGet.body?.case_number === b.body?.case_number);
const dup = await open({ reference: ref("a") });
const empty = await open({ reference: "" });
const c = await open({ reference: ref("c") });
ok("A24-1 CS-7 fail: an opening refused (the same reference again: 409; an empty reference: 400 on the field) uses no number: the next case is the next number, no gap",
  dup.status === 409 && empty.status === 400 && empty.body?.errors?.[0]?.field === "reference" && seq(c.body?.case_number) === n0 + 2, [dup.status, empty.status, c.body?.case_number]);
// Break M1: a reference that looks like a case number is refused on the field, so two cases are never named alike.
const like = await Promise.all([`C-${YEAR}-00001`, "c-2026-31", " C - 2026 - 00042 "].map((r) => open({ reference: r })));
const nul = await open({ reference: null });
ok("A24-1 CS-7 fail (break M1): a reference that looks like a case number (any case, any digits) is refused on the field (400), and uses no number",
  like.every((r) => r.status === 400 && r.body?.errors?.[0]?.field === "reference" && /cannot look like a case number/.test(words(r))) && seq(nul.body?.case_number) === n0 + 3, [like.map((r) => r.status), words(like[0])]);
ok("A24-1 CS-7 pass (break m4): an explicit null reference is no reference (201, the next number)", nul.status === 201 && nul.body?.reference === null, [nul.status, words(nul)]);
const key = `a24-replay-${run}`;
const d1 = await open({ reference: ref("d"), idempotencyKey: key }), d2 = await open({ reference: ref("d"), idempotencyKey: key });
const e = await open({ reference: ref("e") });
ok("A24-1 CS-7 pass: a replay (same idempotency key) answers the same case and number, and takes no new number",
  d1.status === 201 && d2.body?.created === false && d2.body?.id === d1.body?.id && d2.body?.case_number === d1.body?.case_number && seq(d1.body?.case_number) === n0 + 4 && seq(e.body?.case_number) === n0 + 5, [d1.body?.case_number, d2.body?.case_number, e.body?.case_number]);

// ---------------------------------------------------------------- two (twenty) at once (concurrency)
const many = await Promise.all(Array.from({ length: 20 }, (_, i) => open({ reference: ref(`m${i}`) })));
const nums = many.map((r) => seq(r.body?.case_number)).sort((x, y) => x - y);
ok("A24-1 CS-7 pass (concurrent): 20 cases opened at once in one firm all open (201) with 20 different numbers", many.every((r) => r.status === 201) && new Set(nums).size === 20, { statuses: many.map((r) => r.status).filter((s) => s !== 201), nums });
ok("A24-1 CS-7 pass (concurrent): their numbers follow on with no gap (the 20 after the last one)", nums.every((n, i) => n === n0 + 6 + i), nums);
ok("A24-1 CS-7 (data): no two cases of the firm share a number, and the firm's counter stands after the last one",
  sql(`select count(*) from (select case_number from runtime_case group by workspace_id, firm_key, case_number having count(*) > 1) x`) === "0"
  && sql(`select next_value from firm_case_counter where firm_key = (select firm_key from runtime_case where id='${e.body?.id}') and year=${YEAR}`) === String(n0 + 26));

// ---------------------------------------------------------------- each firm counts on its own
const s1 = await open({ reference: ref("solo") }, solo);
const soloFirm = sql(`select firm_key from runtime_case where id='${s1.body?.id}'`), mainFirm = sql(`select firm_key from runtime_case where id='${a.body?.id}'`);
const soloCount = Number(sql(`select count(*) from runtime_case where firm_key='${soloFirm}' and case_number like 'C-${YEAR}-%'`));
ok("A24-1 CS-7 pass: another firm (the solo representative's) has its own count: its new case is its own next number, whatever the first firm's", s1.status === 201 && soloFirm !== mainFirm && seq(s1.body?.case_number) === soloCount, [s1.status, s1.body?.case_number, soloCount, words(s1)]);
const g = await open({ reference: ref("g") });
ok("A24-1 CS-7 fail: another firm's opening takes none of this firm's numbers: this firm's next case follows its own last one", seq(g.body?.case_number) === n0 + 26, g.body?.case_number);

// ---------------------------------------------------------------- the list: number, client name, filing count (CS-8)
const fam = await openCase(vv, FAMILY, f.rep ? { representative: f.rep, caseOfficers: [officer] } : undefined, ref("fam"));
const rowOf = async (id: string, q = "") => ((await call("GET", `/runtime/cases?take=100${q}`, undefined, officer)).body?.cases ?? []).find((x: { id: string }) => x.id === id);
const before = await rowOf(fam.id);
ok("A24-1 CS-8 pass: the list row carries the case number, the client person's name, and 0 filings before the case is prepared",
  before?.case_number === fam.body?.case_number && CASE_NUMBER.test(before?.case_number ?? "") && before?.client_name === "Sample Client A" && before?.filings === 0, before);
const p = (await prepare(fam.id, officer)).p;
const after = await rowOf(fam.id);
ok("A24-1 CS-8 pass: after Prepare, the list's filing count is the case's filings (Visitor visa family: each person files their own)",
  !!p && p.filings.length === FAMILY.length && after?.filings === p.filings.length, [p?.filings.length, after?.filings]);
ok("A24-1 CS-8 pass: one client's page (client=) still lists the people, with the new fields", (await rowOf(fam.id, `&client=${CLIENT}`))?.people?.length === FAMILY.length && (await rowOf(fam.id, `&client=${CLIENT}`))?.client_name === "Sample Client A");
const noRef = await rowOf(b.body?.id);
const rec = await call("GET", `/runtime/cases/${b.body?.id}/filing-record`, undefined, officer);
const named = await Promise.all(["filings", "checklist", "prepare"].map((x) => call("GET", `/runtime/cases/${b.body?.id}/${x}`, undefined, officer)));
ok("A24-1 CS-7 pass (break M2, review M2, P-496 (2)): the filing record, the filings, the checklist and Prepare (which Record submission's \"Our reference\" reads) name a case without a reference by its case number, never null",
  rec.status === 200 && rec.body?.our_reference === b.body?.case_number && named.every((r) => r.status === 200 && r.body?.reference === b.body?.case_number), [rec.status, rec.body?.our_reference, named.map((r) => [r.status, r.body?.reference])]);
const famNamed = await Promise.all(["filings", "prepare"].map((x) => call("GET", `/runtime/cases/${a.body?.id}/${x}`, undefined, officer)));
ok("A24-1 CS-7 fail (byte-identical words): a case with a reference is still named by its reference, never by its number (filings, Prepare)", famNamed.every((r) => r.body?.reference === ref("a")), famNamed.map((r) => r.body?.reference));
ok("A24-1 CS-8 pass: a case opened without a reference lists with its number and no reference", noRef?.case_number === b.body?.case_number && noRef?.reference === null, noRef);

// ---------------------------------------------------------------- one principal per case, Make principal still works (CS-1)
const spouse = fam.subjects["Sample Spouse A"], client = fam.subjects["Sample Client A"];
const v = await call("POST", `/runtime/cases/${fam.id}/filing-changes`, { kind: "make_principal", subject: spouse, preview: true }, officer);
const mp = v.status === 200 ? await call("POST", `/runtime/cases/${fam.id}/filing-changes`, { kind: "make_principal", subject: spouse, basis: v.body?.basis, reason: "A24-1 check on a test copy (Sample)" }, officer) : v;
ok("A24-1 CS-1 pass: Make principal still works under the database's one-principal rule (checked at commit)",
  mp.status === 200 && sql(`select string_agg(subject_id::text, ',') from case_participant where case_id='${fam.id}' and role='principal'`) === spouse, [mp.status, words(mp)]);
ok("A24-1 CS-8 pass: after Make principal the list still names the client person (the principal when the case opened), as the case page does",
  (await rowOf(fam.id))?.client_name === "Sample Client A");
// Refused writes, each by the rule's own name in the database's error.
const raw = dbClient(Number(process.argv[2] ?? 4440), process.argv[3] ?? "xr_studio_accept").sql;
const refused = (q: string, re: RegExp) => { try { raw(q); return false; } catch (x) { return re.test(String((x as { stderr?: string }).stderr ?? x)); } };
ok("A24-1 CS-1 fail (database): storing a second principal on a case is refused (a new person as principal, or the former principal made principal again)",
  // One statement: a new person, then that person as a second principal (refused, so neither is kept).
  refused(`with s as (insert into answer_subject (id, workspace_id, party_id, subject_kind, label) select gen_random_uuid(), workspace_id, party_id, 'principal', 'Sample Second' from answer_subject where id='${spouse}' returning id)
    insert into case_participant (id, workspace_id, case_id, subject_id, role, "order") select gen_random_uuid(), p.workspace_id, p.case_id, s.id, 'principal', 99 from case_participant p, s where p.subject_id='${spouse}'`, /case_participant_one_principal/)
  && refused(`update case_participant set role='principal' where subject_id='${client}'`, /case_participant_one_principal/)
  && sql(`select count(*) from case_participant where case_id='${fam.id}' and role='principal'`) === "1");
ok("A24-1 CS-1 fail (database): a case left with no principal is refused", refused(`update case_participant set role='child' where subject_id='${spouse}'`, /case_one_principal/)
  && sql(`select count(*) from case_participant where case_id='${fam.id}' and role='principal'`) === "1");
ok("A24-1 CS-7 fail (database): a case's number is never changed", refused(`update runtime_case set case_number='C-${YEAR}-99999' where id='${fam.id}'`, /case_number_fixed/)
  && sql(`select case_number from runtime_case where id='${fam.id}'`) === fam.body?.case_number);
process.exitCode = summary() ? 1 : 0;
