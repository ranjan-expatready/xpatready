// QA-395 (C7.2): engine/runtime/forms.ts countedOf, the count a "recorded" Yes/No whose form counts only some entries is
// worked out by (samples/recorded-counts.json: IMM 5257 Question 8 A, "During the past 5 years have you lived in any country
// other than your country of citizenship or your current country of residence for more than 6 months?"), and the fill's
// RECORDED step taking it (p5/transforms.ts runTransform). Pass and fail per rule. Pure: no database, no server, no model
// call (US$0). The checkpoint API check reading the PDF back is tests/check_qa395_q8a_counts.ts.
//   tsx studio/tests/check_qa395_counted.ts
import { countedOf, markNothingRecorded } from "../engine/runtime/forms.ts";
import { runTransform } from "../../p5/transforms.ts";
import type { BoxRow } from "../engine/render.ts";
import type { QuestionnaireView } from "../contracts/runtime.ts";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();
const P = "11111111-1111-4111-8111-111111111111", TODAY = new Date(Date.UTC(2026, 10, 11));
const BOX = "form1[0].Page1[0].PersonalDetails[0].PCRIndicator[0]";
const T = "derived:any previous residence in past 5 years, over 6 months, in a country other than citizenship or current residence -> yes_no_code:Y/N";
const box = (over: Partial<BoxRow> = {}): BoxRow => ({ box: BOX, caption: "Question 8 A …?", fact: "person.previous_residence_country", meaning: null, about: P, about_label: "Client A", row: null, coverage: "confirmed fact", detail: "", value: "X", transform: T, ...over });
const ans = (value: unknown, fills = true) => ({ value, fills, confirmed: fills, mark: "confirmed", why: "" });
/** A view of the person: citizenship and residence, and previous residences as [country, from, to] rows. */
function view(entries: [unknown, unknown, unknown][], own: { citizenship?: string; residence?: string } = { citizenship: "India", residence: "India" }): QuestionnaireView {
  const rows = (i: 0 | 1 | 2) => entries.map((e, n) => ({ row: `r${n}`, index: n, fits: true, answer: e[i] === undefined ? null : ans(e[i]) }));
  const q = (fact: string, extra: object) => ({ fact, subjectId: P, label: fact, hidden: false, answer: null, rows: [], fills: [], ...extra });
  return { checks: [], sections: [
    { section: "personal_details", title: "Personal details", subjectId: P, group: null, questions: [q("person.citizenship", { answer: own.citizenship ? ans(own.citizenship) : null }), q("person.current_residence_country", { answer: own.residence ? ans(own.residence) : null })] },
    { section: "previous", title: "Previous countries of residence", subjectId: P, group: { required: false, client: true, rows: entries.length, none_apply: null },
      questions: [q("person.previous_residence_country", { rows: rows(0) }), q("person.previous_residence_from", { rows: rows(1) }), q("person.previous_residence_to", { rows: rows(2) })] },
  ] } as unknown as QuestionnaireView;
}
const c = (entries: [unknown, unknown, unknown][], own?: { citizenship?: string; residence?: string }) => countedOf(box(), view(entries, own), TODAY)?.counted;

ok("QA-395 fail: the person's own country (India), one day in 2015: No", c([["India", "2015-01-01", "2015-01-01"]]) === false);
ok("QA-395 fail: own country is matched whatever the letter case: No", c([["india", "2023-01-01", "2026-01-01"]]) === false);
ok("QA-395 pass: another country, two years ending a year ago: Yes", c([["United States", "2023-11-11", "2025-11-11"]]) === true);
ok("QA-395 fail: another country for 6 months exactly is not more than 6 months: No", c([["United States", "2025-01-01", "2025-07-01"]]) === false);
ok("QA-395 pass: another country for 6 months and a day: Yes", c([["United States", "2025-01-01", "2025-07-02"]]) === true);
ok("QA-395 fail: another country, ended seven years ago: No", c([["United States", "2017-01-01", "2019-11-11"]]) === false);
ok("QA-395 fail: 2 years of which about 2 months fall inside the past 5 years: No", c([["United States", "2019-11-11", "2022-01-11"]]) === false);
ok("QA-395 pass: 2 years of which 12 months fall inside the past 5 years: Yes", c([["United States", "2020-11-11", "2022-11-11"]]) === true);
ok("QA-395 pass: dates to the month count from the first to the last day of the month: Yes", c([["United States", "2024-01", "2024-07"]]) === true);
ok("QA-395 pass: one counting entry among others is enough: Yes", c([["India", "2015-01-01", "2015-01-01"], ["Kenya", "2022-01-01", "2023-01-01"]]) === true);
ok("QA-395 fail (a person decides): another country without its dates cannot be counted: null", c([["Kenya", "2022-01-01", undefined]]) === null);
ok("QA-395 fail (a person decides): citizenship not answered: null", c([["Kenya", "2022-01-01", "2023-01-01"]], { residence: "India" }) === null);
ok("QA-395 pass: an incomplete entry does not hide a counting one: Yes", c([["Kenya", "2022-01-01", undefined], ["Peru", "2022-01-01", "2023-06-01"]]) === true);
// Review M1 on #1566: an end before its start is a slip a person corrects, never a stay that does not count.
const back = countedOf(box(), view([["Kenya", "2025-11-11", "2023-11-11"]]), TODAY);
ok("QA-395 review M1 (fail): another country whose end is before its start goes to a person (null), naming the entry and the slip", back?.counted === null && /Kenya ends \(2023-11-11\) before it starts \(2025-11-11\)/.test(back.detail), back);
ok("QA-395 review M1 (pass): a backwards entry does not hide a counting one: Yes", c([["Kenya", "2025-11-11", "2023-11-11"], ["Peru", "2022-01-01", "2023-06-01"]]) === true);
// Review m2: months are calendar months, kept to the month's last day (31 Aug + 6 months is 28 Feb, never 3 Mar).
ok("QA-395 review m2 (pass): 31 Aug to 2 Mar is more than 6 months: Yes", c([["United States", "2025-08-31", "2026-03-02"]]) === true);
ok("QA-395 review m2 (fail): 31 Aug to 28 Feb is 6 months, not more: No", c([["United States", "2025-08-31", "2026-02-28"]]) === false);
// Review m6: a person is told which entry to check and why.
ok("QA-395 review m6: the reason names the entry and what it lacks", /Kenya lacks its dates/.test(countedOf(box(), view([["Kenya", "2022-01-01", undefined]]), TODAY)?.detail ?? ""), countedOf(box(), view([["Kenya", "2022-01-01", undefined]]), TODAY)?.detail);
ok("QA-395 fail: a box no rule names is not counted (null result, the RECORDED rule as before)", countedOf(box({ box: "form1[0].Page3[0].Education[0].EducationIndicator[0]" }), view([["United States", "2023-01-01", "2025-01-01"]]), TODAY) === null);
// The fill's step takes the count; marked boxes carry it; "none apply" (not confirmed) is untouched.
const marked = markNothingRecorded([box()], view([["India", "2015-01-01", "2015-01-01"]]), [], TODAY)[0];
ok("QA-395: markNothingRecorded marks the box with the count and its reason in the form's words", marked.counted === false && /^No to "Question 8 A\./.test(marked.detail), [marked.counted, marked.detail.slice(0, 60)]);
const run = (counted: boolean | null) => runTransform(T, "India", {}, { counted, countedWhy: "why" });
ok("QA-395: the RECORDED step writes the count (N, Y), and leaves null to a person", (run(false) as { value?: string }).value === "N" && (run(true) as { value?: string }).value === "Y" && (run(null) as { hand?: boolean }).hand === true);
ok("QA-395 fail: without a count the step is as before (any entry: Y), so a form no rule names keeps its reading", (runTransform(T, "India", {}) as { value?: string }).value === "Y");
process.exit(summary() ? 1 : 0);
