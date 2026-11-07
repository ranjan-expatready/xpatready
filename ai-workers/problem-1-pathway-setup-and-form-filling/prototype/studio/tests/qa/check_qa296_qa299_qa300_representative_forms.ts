// QA-296 (Conflict · Major; C6.11, C7.7), QA-299 (Bug · Major; C6.11) and QA-300 (Gap · Major; C6.11): what the firm
// record's representative puts on IMM 5476 and IMM 5475 on the configured checkpoint's Visitor visa.
// QA-296: IMM 5475 box 5 "Your designated individual's full name" must not be filled with the representative (IRCC:
// "someone who will not act as your representative").
// QA-299: a CICC representative's number goes only in the CICC box, not in the law society's, the Chambre des notaires'
// or the unpaid licensed member's box.
// QA-300: no fact on IMM 5476 stays open that nobody on the case can answer, and no such line is said to be owed by the client.
// FAILS today (QA-296-1, QA-299-2, -3, -4, QA-300-5, -6); PASSES when row B107 lands. US$0, no model call.
//   tsx studio/tests/qa/check_qa296_qa299_qa300_representative_forms.ts <port> <database>     (an isolated copy on the configured checkpoint)
import { OFFICER, call, fillEverything, firms, generateCopy, main, needVisitorVisa, ok, openCase, prepare, sql, yearsAgo, itemsOf, readinessOf } from "../../acceptance/lib/m3.ts";

const written = (copy: string | null): string[] => (sql(`select string_agg(b->>'box', E'\\n') from form_instance i, jsonb_array_elements(i.result_json->'boxes') b where i.id = '${copy}' and b->>'result' = 'written'`) ?? "").split("\n").filter(Boolean);

await main("QA-296, QA-299, QA-300", "The representative on IMM 5476 and IMM 5475", async () => {
  const vv = needVisitorVisa();
  const f = await firms();
  const officer = f.officer ?? OFFICER;
  const c = await openCase(vv, [{ role: "principal", name: "Sample Client R", dob: yearsAgo(40) }], { representative: f.rep, caseOfficers: [officer] });
  const P = c.subjects["Sample Client R"];

  const c5475 = await generateCopy(c.id, "IMM 5475", P);
  const inFive = written(c5475).filter((b) => b.includes(".Five["));
  ok("QA-296-1 fail: IMM 5475's designated individual (box 5) is not filled from the firm record's representative", c5475 !== null && inFive.length === 0, inFive);

  const c5476 = await generateCopy(c.id, "IMM 5476", P);
  const boxes = written(c5476);
  const has = (s: string) => boxes.some((b) => b.includes(s));
  ok("QA-299-0 pass: IMM 5476's CICC box holds the CICC representative's number (setup)", has("questionII[0].ICCRCMember[0]"), boxes);
  ok("QA-299-2 fail: nothing in the law society's box for a CICC representative", !has("questionII[0].membership[0]"));
  ok("QA-299-3 fail: nothing in the Chambre des notaires' box for a CICC representative", !has("questionII[0].quebecLaw[0]"));
  ok("QA-299-4 fail: nothing in the unpaid licensed member's box for a paid CICC representative", !has("questionI[0].membership[0]"));

  // Set-up by the pack's own helper: with the person's own facts confirmed, whatever stays open is about the representative.
  await fillEverything(c.id);
  const forms = (await call("GET", `/runtime/cases/${c.id}/forms`, undefined, officer)).body?.forms ?? [];
  const f5476 = forms.find((x: { form: string; subject?: string }) => x.form === "IMM 5476");
  const repMissing = ((f5476?.readiness?.missing ?? []) as { about?: string; fact?: string }[]).filter((m) => m.about === "The representative").map((m) => m.fact);
  ok("QA-300-5 fail: IMM 5476 lists no fact about the representative that nobody on the case can answer", repMissing.length === 0, repMissing);

  const p = (await prepare(c.id, officer)).p;
  const it = itemsOf(p, P, "IMM 5476")[0];
  const owed = (readinessOf(p, it?.filing)?.warns ?? []).filter((w: { code: string; owes?: string; key?: string }) => w.code === "missing_facts" && w.owes === "client" && /person\.address_|person\.phone_|person\.email/.test(w.key ?? "") && w.item === it?.id);
  ok("QA-300-6 fail: the client is not told it owes the representative's office details", owed.length === 0, owed.map((w: { words: string }) => w.words.slice(0, 120)));
});
