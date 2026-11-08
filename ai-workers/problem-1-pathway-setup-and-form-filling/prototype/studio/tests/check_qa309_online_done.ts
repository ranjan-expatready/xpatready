// QA-309 (C7.3, C10.2; P-401, P-113) on the configured checkpoint: the principal's Online IMM 5257 reads Done once every
// answer-sheet section is ticked "Entered in the portal". A section waits only for what the form's readiness names, so a
// fact held as "none apply", a row fact answered on its rows (the form's spare rows stay empty) or a fact release 2 never
// asks (the visit contact in Canada) never waits; while something truly waits, the item's reason names it, never
// "Every fact it reads is confirmed.". Pass and fail per rule. Runs on a copy with the configured checkpoint loaded,
// which it loads itself (as check_c73_parts_checkpoint.ts). US$0, no live AI.
//   zsh studio/tools/isolated.sh runtime_q309 4436 start && tsx studio/tests/check_qa309_online_done.ts 4436 xr_studio_runtime_q309
import { AUTHOR, OFFICER, PORT, answer, call, confirmAll, fillEverything, itemsOf, needVisitorVisa, ok, openCase, prepare, rec, yearsAgo } from "../acceptance/lib/m3.ts";

type Section = { key: string; title: string; version: string; entered: { by: string } | null; out_of_date: boolean; answers: { fact: string; subject: string; value: unknown; label: string }[]; waiting: { fact: string; subject: string }[] };
type Sheet = { sections: Section[] };
type Group = { subjectId: string; about_label: string; section: string; title: string; group: { rows: number; none_apply: { id: string; value: boolean } | null } | null };

if (PORT === 4400) { console.log("STOP  never the demo (:4400): this check resets its copy"); process.exit(2); }
const reset = await call("POST", "/demo/reset", { confirm: "RESET" }, AUTHOR);
const load = await call("POST", "/demo/load", { sample: "configured" }, AUTHOR);
if (reset.status >= 300 || load.status >= 300) { console.log(`STOP  the configured checkpoint did not load: reset ${reset.status}, load ${load.status}`); process.exit(2); }
const c = await openCase(needVisitorVisa(), [{ role: "principal", name: "Sample Client A", dob: yearsAgo(40) }]);
const P = c.subjects["Sample Client A"];
const item = async () => itemsOf((await prepare(c.id)).p, P, "IMM 5257")[0] as { id: string; channel?: string; state: string; reason?: string } | undefined;
const sheet = async (id: string) => (await call("GET", `/runtime/items/${id}/answer-sheet`, undefined, OFFICER)).body as Sheet;
const tick = (id: string, s: Section) => call("POST", `/runtime/items/${id}/screens/${s.key}/entered`, { version: s.version }, OFFICER);
const CONFIRMED = /Every fact it reads is confirmed/;

let it = await item();
if (it?.channel !== "ONLINE") { console.log(`STOP  setup: the principal's IMM 5257 is not Online on this release (${it?.channel})`); process.exit(2); }
// Before any answer: facts truly wait, and the reason names them (label and person), never "Every fact … confirmed".
ok("QA-309 (fail): while facts wait, the item is To do and its reason names them, by label and person", it.state === "to_do" && /^Waiting for \d+ facts? to answer or confirm: .+ \(Sample Client A\)/.test(it.reason ?? "") && !CONFIRMED.test(it.reason ?? ""), it.reason);
// Review M1 (b): a fact about the application ("case" on the form) that readiness names waits on the sheet too.
const early = (await sheet(it.id)).sections.flatMap((x) => x.waiting);
ok("QA-309 M1 (b) fail: an unanswered fact about the application waits on the sheet (\"case\" on the form, the case's own fact)", early.some((w) => w.subject === "case" && w.fact.startsWith("case.")), early.filter((w) => w.subject === "case").slice(0, 3));

await fillEverything(c.id);
it = await item();
let s = await sheet(it!.id);
const waiting = s.sections.flatMap((x) => x.waiting);
ok("QA-309 pass: once every fact is answered and confirmed, no section waits", s.sections.length > 0 && waiting.length === 0, waiting.slice(0, 5));
ok("QA-309 pass: the facts the probe saw waiting do not: \"none apply\" (previous residence, education), answered employment rows, the visit contact release 2 never asks", !waiting.some((w) => /previous_residence|education_|occupation_|visit_contact_/.test(w.fact)));
const groups = ((await call("GET", `/runtime/cases/${c.id}/questionnaire?mode=agent`, undefined, OFFICER)).body?.sections ?? []) as Group[];
const none = groups.filter((g) => g.subjectId === P && g.group && g.group.rows === 0 && g.group.none_apply?.value === true);
ok("QA-309 setup: the case holds at least one group as \"none apply\" (education or previous residence)", none.length > 0, none.map((g) => g.title));
ok("QA-309 (fail): nothing waits but nothing is ticked: the item is To do, its reason names the sections still to tick, never \"Every fact … confirmed\"", it?.state === "to_do" && /still to tick "Entered in the portal": /.test(it?.reason ?? "") && s.sections.every((x) => (it?.reason ?? "").includes(x.title)) && !CONFIRMED.test(it?.reason ?? ""), it?.reason);

const last = s.sections.at(-1)!;
for (const x of s.sections.slice(0, -1)) await tick(it!.id, x);
it = await item();
ok("QA-309 (fail): with one section not ticked the item stays To do, its reason naming that section only", it?.state === "to_do" && (it?.reason ?? "").includes(`1 of ${s.sections.length} section`) && (it?.reason ?? "").endsWith(`${last.title}.`), it?.reason);
const r = await tick(it!.id, last);
it = await item();
ok("QA-309 pass: every section ticked, the principal's Online IMM 5257 reads Done", r.status === 201 && it?.state === "done" && /Every section is entered in the portal/.test(it?.reason ?? ""), { tick: r.status, state: it?.state, reason: it?.reason });

// Taking back the "none apply" of a group IMM 5257 reads (Education, as in the probe) makes it truly wait again: not
// Done, the reason names it; given back and confirmed, Done again.
const g = none.find((x) => x.title === "Education") ?? none[0];
const back = await call("PUT", `/runtime/cases/${c.id}/groups/${g.subjectId}/${g.section}/none-apply`, { noneApply: false, expectedId: g.group!.none_apply!.id }, OFFICER);
it = await item();
s = await sheet(it!.id);
ok("QA-309 (fail): a \"none apply\" taken back waits again: the item is not Done and its reason names the group", back.status < 300 && it?.state === "to_do" && /^Waiting for \d+ facts? to answer or confirm: /.test(it?.reason ?? "") && s.sections.some((x) => x.waiting.length > 0), { back: back.status, state: it?.state, reason: it?.reason });
const again = ((await call("GET", `/runtime/cases/${c.id}/questionnaire?mode=agent`, undefined, OFFICER)).body?.sections as Group[]).find((x) => x.subjectId === g.subjectId && x.section === g.section);
await call("PUT", `/runtime/cases/${c.id}/groups/${g.subjectId}/${g.section}/none-apply`, { noneApply: true, expectedId: again?.group?.none_apply?.id ?? null }, OFFICER);
const sec = ((await call("GET", `/runtime/cases/${c.id}/questionnaire?mode=agent`, undefined, OFFICER)).body?.sections as (Group & { questions: unknown[] })[]).find((x) => x.subjectId === g.subjectId && x.section === g.section);
if (sec?.group?.none_apply?.id) await call("POST", `/runtime/cases/${c.id}/sections/${g.section}/confirm`, { subjectId: g.subjectId, seen: [sec.group.none_apply.id] }, OFFICER);
it = await item();
ok("QA-309 pass: \"none apply\" given and confirmed again, the item reads Done again (nothing to re-enter: the section's answers did not change)", it?.state === "done", { state: it?.state, reason: it?.reason });


// Review M1 (a): Done also needs readiness to name nothing. After Done, the officer changes the end of the stay (an answer
// that fills at once but is not confirmed yet, P-411) and ticks the changed section again: nothing waits on the sheet, yet the
// item is not Done, its reason naming the fact; once the section is confirmed, Done again.
const K = ((await call("GET", `/runtime/cases/${c.id}/questionnaire?mode=agent`, undefined, OFFICER)).body?.sections as Group[]).find((x) => x.about_label === "The application")?.subjectId ?? "";
s = await sheet(it!.id);
const stay = s.sections.flatMap((x) => x.answers).find((a) => a.subject === "case" && /^case\..*_to$/.test(a.fact) && /^\d{4}-\d{2}-\d{2}$/.test(String(a.value)))
  ?? s.sections.flatMap((x) => x.answers).find((a) => a.subject === "case" && /^\d{4}-\d{2}-\d{2}$/.test(String(a.value)));
if (!stay || !K) { console.log(`STOP  setup: no dated fact about the application on the sheet (${stay?.fact}, ${K})`); process.exit(2); }
const later = new Date(Date.parse(`${String(stay.value)}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
const changed = await answer(c.id, K, stay.fact, later, OFFICER);
s = await sheet(it!.id);
for (const x of s.sections.filter((y) => y.out_of_date)) await tick(it!.id, x);
it = await item();
s = await sheet(it!.id);
ok(`QA-309 M1 (a) fail: after the officer changes ${stay.fact} and ticks its section again, nothing waits on the sheet, yet the item is To do and its reason names the fact not confirmed`,
  changed.status < 300 && s.sections.every((x) => x.entered && !x.out_of_date && !x.waiting.length) && it?.state === "to_do" && /^Waiting for 1 fact to answer or confirm: .+ \(The application\)\.$/.test(it?.reason ?? ""), { changed: changed.status, state: it?.state, reason: it?.reason });
await confirmAll(c.id, K);
it = await item();
ok("QA-309 M1 (a) pass: once the application's section is confirmed, the item reads Done again", it?.state === "done", { state: it?.state, reason: it?.reason });

process.exitCode = rec.summary() ? 1 : 0;
