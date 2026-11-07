// Row C9 of the M3 sprint plan (QA-246; C7.7 Prepare application list; VV-R07, VV-R09, VV-R10): on the configured
// checkpoint's family case, GET /runtime/cases/:id/prepare gives each person's forms to fill (`items`, kind "form") and,
// apart, the forms not yet known (`waiting`), each naming the question it waits on; nothing that applies is hidden.
// Answering one waiting question Yes moves that form into that person's forms to fill only; answering No takes it out,
// listed in `not_needed` with its reason.
// What is expected comes from row C1's expectedLines (acceptance/lib/m3.ts: the case's pinned release as configured and
// the cited rules), never from /prepare. One rule is applied to it by hand, the same rule this row adds: a waiting line
// whose question is already answered on the case moves. On the checkpoint the only such answer at case open is "Uses a
// representative", Yes from the firm record (engine/runtime/team.ts representativeAnswers, row A2; VV-R10), read here from
// the questionnaire, so the adults' IMM 5476 is expected among the forms to fill (the children are 10 and 15: under its 18).
// On main before row C9 it fails at C9-1: adults are listed 7 forms (3 of them "Cannot start yet"), children 4.
// Sample data, live AI off, no model call (US$0).
//   zsh studio/tools/isolated.sh rt_c9 4491 start && tsx studio/tests/runtime/check_c9_prepare_waiting.ts 4491 xr_studio_rt_c9
import { request } from "node:http";
import * as m3 from "../../acceptance/lib/m3.ts";
import { recorder } from "./api.ts";

const { ok, summary } = recorder();
const { AUTHOR, FAMILY, PORT, answer, call, expectedFor, needVisitorVisa, openCase, readinessOf, filingOf } = m3;
type Item = { id: string; kind: string; form?: string; subject: string; state: string; reason?: string; filing: string; waits_on?: { fact: string; question: string }[] };
type View = { items: Item[]; waiting?: Item[]; not_needed?: (Item & { decided_by?: string[] })[]; stage1: { filing: string; to_confirm: number }[] } & m3.Prepare;
const post = (path: string, body: unknown) => new Promise<number>((done) => {
  const data = JSON.stringify(body);
  const rq = request({ host: "127.0.0.1", port: PORT, path: `/api${path}`, method: "POST", timeout: 1_200_000, headers: { "content-type": "application/json", "x-actor": AUTHOR, "content-length": Buffer.byteLength(data) } }, (r) => { r.resume(); r.on("end", () => done(r.statusCode ?? 0)); });
  rq.on("timeout", () => rq.destroy(new Error("timeout"))); rq.on("error", () => done(0)); rq.end(data);
});
const sorted = (x: string[]) => [...x].sort();
const view = async (caseId: string) => (await call("GET", `/runtime/cases/${caseId}/prepare`, undefined, m3.officerOf(caseId))).body as View | undefined;
type Lists = Record<string, { fill: string[]; waiting: string[]; notNeeded: string[] }>;
const listsOf = (v: View | undefined, subjects: Record<string, string>): Lists => Object.fromEntries(Object.entries(subjects).map(([n, s]) => [n, {
  fill: sorted((v?.items ?? []).filter((i) => i.subject === s && i.kind === "form").map((i) => i.form ?? "?")),
  waiting: sorted((v?.waiting ?? []).filter((i) => i.subject === s).map((i) => i.form ?? "?")),
  notNeeded: sorted((v?.not_needed ?? []).filter((i) => i.subject === s).map((i) => i.form ?? "?")),
}]));
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

// ---- Setup: a fresh checkpoint (Demo › Reset, then Load the configured checkpoint), and the pack's family case. ----
const reset = await post("/demo/reset", { confirm: "RESET" }), load = reset < 300 ? await post("/demo/load", { sample: "configured" }) : 0;
ok("C9-0a setup: Demo › Reset, then Load the configured checkpoint", reset < 300 && load < 300, [reset, load]);
const c = await openCase(needVisitorVisa(), FAMILY);
const exp = await expectedFor(c.id);
type Q = { subjectId: string; fact: string; label: string; options: { key: string; label: string }[] | null; answer: { value: unknown; channel?: string } | null };
const questions = async () => ((await m3.agent(c.id))?.sections ?? []).flatMap((s: { questions: Q[] }) => s.questions) as Q[];
const qs = await questions();
const labelOf = (fact: string) => qs.find((q) => q.fact === fact)?.label ?? null;
const repYes = qs.some((q) => q.fact === "case.uses_representative" && q.subjectId === c.caseSubject && q.answer?.value === true && q.answer?.channel === "firm_record");
ok("C9-0b setup: expectedLines reads the case's release 2, and the questionnaire shows \"Uses a representative\" answered Yes from the firm record (row A2)", !!exp && repYes, { exp: !!exp, repYes });

// The expected lists: expectedLines, with the one answered question moved (by hand, see the header).
const want: Lists = Object.fromEntries(FAMILY.map((p) => {
  const e = exp?.[p.name], moves = (l: m3.ExpectedLine) => repYes && same(l.waitsOn, ["case.uses_representative"]);
  return [p.name, { fill: sorted([...(e?.forms ?? []), ...(e?.waiting ?? []).filter(moves)].map((l) => l.form)), waiting: sorted((e?.waiting ?? []).filter((l) => !moves(l)).map((l) => l.form)), notNeeded: [] }];
}));
let v = await view(c.id);
let got = listsOf(v, c.subjects);
const diff = (g: Lists, w: Lists, part: "fill" | "waiting" | "notNeeded") => Object.keys(w).filter((n) => !same(g[n]?.[part], w[n][part])).map((n) => `${n}: got ${g[n]?.[part].join(", ")}; want ${w[n][part].join(", ")}`);
ok("C9-1 pass (QA-246): each person's forms to fill equal expectedLines exactly, by form and by count (adults IMM 5257, Schedule 1, IMM 5645 and IMM 5476; each child IMM 5257 only)",
  !!exp && !diff(got, want, "fill").length && want["Sample Client A"].fill.length === 4 && want["Sample Child A1"].fill.length === 1, diff(got, want, "fill"));
ok("C9-2 pass (QA-246): each person's forms not yet known are listed apart and equal expectedLines' waiting lines exactly (IMM 5409, IMM 5475, IRM 0002 for everyone)",
  !!exp && !diff(got, want, "waiting").length && Object.values(want).every((x) => x.waiting.length === 3), diff(got, want, "waiting"));
// Each waiting form names the question it waits on: the fact its line reads (expectedLines' waitsOn), in the questionnaire's own words.
const named = (v?.waiting ?? []).filter((i) => {
  const name = Object.entries(c.subjects).find(([, s]) => s === i.subject)?.[0] ?? "", line = exp?.[name]?.waiting.find((l) => l.form === i.form);
  return !line || !same((i.waits_on ?? []).map((x) => x.fact), line.waitsOn) || !(i.waits_on ?? []).every((x) => !!x.question && x.question === labelOf(x.fact) && (i.reason ?? "").includes(`"${x.question}"`)) || i.state !== "cannot_start" || i.kind !== "form";
});
ok("C9-3 pass: each form not yet known names the question it waits on (its line's fact, in the questionnaire's words, in its reason) and says Cannot start yet", (v?.waiting ?? []).length === 12 && !named.length, named.map((i) => [i.form, i.waits_on, i.reason]));
// Break B3 kept: a waiting form still stands as a CRITICAL "missing facts" line on its filing, naming it.
const unnamed = (v?.waiting ?? []).filter((i) => !(readinessOf(v ?? null, i.filing)?.warns ?? []).some((w) => w.code === "missing_facts" && w.item === i.id && w.words.includes(i.form ?? "?")));
ok("C9-4 pass (break B3 kept): readiness still names each form not yet known as a line on its filing, so none is dropped", (v?.waiting ?? []).length > 0 && !unnamed.length, unnamed.map((i) => i.form));
const stage1 = (v?.stage1 ?? []).length === 4 && (v?.stage1 ?? []).every((x) => x.to_confirm > 0);
ok("C9-5 pass: stage 1 still counts facts to confirm on every filing (its forms to fill)", stage1, v?.stage1);

// ---- Answer one waiting question Yes for one adult: IRM 0002 for the spouse. ----
const before = got, S = c.subjects["Sample Spouse A"], P = c.subjects["Sample Client A"];
let r = await answer(c.id, S, "person.gender_identifier_differs_from_documents", true, m3.officerOf(c.id), { onBehalfOf: S, reason: "Entered from the person's signed form (Sample)" });
v = await view(c.id); got = listsOf(v, c.subjects);
const yes = { ...before, "Sample Spouse A": { fill: sorted([...before["Sample Spouse A"].fill, "IRM 0002"]), waiting: before["Sample Spouse A"].waiting.filter((f) => f !== "IRM 0002"), notNeeded: [] } };
ok("C9-6 pass: answered Yes for the spouse, IRM 0002 moves into the spouse's forms to fill; nobody else's lists change", r.status === 200 && same(got, yes), { status: r.status, got: got["Sample Spouse A"], others: Object.keys(got).filter((n) => n !== "Sample Spouse A" && !same(got[n], before[n])) });
const item = (v?.items ?? []).find((i) => i.subject === S && i.form === "IRM 0002");
ok("C9-7 pass: the spouse's IRM 0002 is now a form to fill (To do, its facts to answer), no longer \"Cannot start yet\"", item?.state === "to_do" && !/Cannot start/.test(item?.reason ?? "") && item?.waits_on === undefined, item);

// ---- Answer another No for the principal: marital status other than common-law, so IMM 5409 is not needed. ----
const marital = (await questions()).find((q) => q.subjectId === P && q.fact === "person.marital_status");
const notCommonLaw = marital?.options?.map((o) => o.key).find((k) => k !== "common_law"), notCommonLawWords = marital?.options?.find((o) => o.key === notCommonLaw)?.label;
r = await answer(c.id, P, "person.marital_status", notCommonLaw, m3.CLIENT);
const v2 = await view(c.id), got2 = listsOf(v2, c.subjects);
const no = { ...got, "Sample Client A": { fill: got["Sample Client A"].fill, waiting: got["Sample Client A"].waiting.filter((f) => f !== "IMM 5409"), notNeeded: ["IMM 5409"] } };
ok("C9-8 pass: answered No for the principal (not common-law), IMM 5409 leaves the principal's forms not yet known and is not a form to fill; nobody else's lists change",
  !!notCommonLaw && r.status === 200 && same(got2, no), { status: r.status, answer: notCommonLaw, got: got2["Sample Client A"], others: Object.keys(got2).filter((n) => n !== "Sample Client A" && !same(got2[n], got[n])) });
const nn = (v2?.not_needed ?? []).find((i) => i.subject === P && i.form === "IMM 5409");
ok("C9-9 pass: the principal's IMM 5409 is listed as not needed with its reason: the question in the questionnaire's words and the answer given, in the choice's own words (never its key)",
  nn?.state === "not_needed" && (nn?.reason ?? "").startsWith("Not needed:") && !!notCommonLawWords && (nn?.reason ?? "").includes(`"${labelOf("person.marital_status")}" is answered ${notCommonLawWords}`) && same(nn?.decided_by, ["person.marital_status"]), nn);
ok("C9-10 fail: a form answered No is no longer a line on the principal's filing (nothing waits on it)", !(readinessOf(v2 ?? null, filingOf(v2 ?? null, P)?.id)?.warns ?? []).some((w) => w.words.includes("IMM 5409 for Sample Client A")));
process.exitCode = summary() ? 1 : 0;
