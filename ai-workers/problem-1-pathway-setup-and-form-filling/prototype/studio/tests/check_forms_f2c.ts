// F2c (forms lane, F2 plan §7 BR-7…BR-13, XT-6; Lead decisions Q2, Q3; challenge M2, M3, M5, M7): the fill plan for
// one open portal screen of a case. The screen is compared with the approved version in the case's own release before
// anything is filled; only confirmed facts fill, in the portal's own format; "You answer this on screen" is never filled;
// a changed or unknown screen fills nothing and opens one "Re-capture needed" task, updated by the next mismatch;
// approving the re-capture closes it; a case on the older release then fills that screen by hand. Every rule with a
// passing and a failing case. Isolated copy; the runtime lane's visitor-visa setup, then a release that files IMM 5257
// Online (a copy only: the demo seed's channel is never changed, M4). No browser, NO model call (US$0).
//   zsh studio/tools/isolated.sh forms_f2c 4457 start && tsx studio/tests/check_forms_f2c.ts 4457 xr_studio_forms_f2c
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ANSWER_ON_SCREEN, portalValue } from "../engine/extension/fill.ts";
import { screenIdentity } from "../engine/twin.ts";
import { openCase, releaseOnline, setupVisitorVisa, type Call } from "./forms_f2_setup.ts";

const PORT = Number(process.argv[2] ?? 4457), DB = process.argv[3] ?? "xr_studio_forms_f2c";
const STUDIO = join(import.meta.dirname, "..");
const FIX = join(STUDIO, "tests", "fixtures", "portal");
const PY = join(STUDIO, "..", "..", "..", "..", ".tools", "solution-1-prototype", ".venv", "bin", "python");
const ID = "ipomjnfjkniidipddghocobgcfecebaf", ORIGIN = `chrome-extension://${ID}`;
const log: { name: string; ok: boolean; detail?: unknown }[] = []; let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; log.push({ name, ok: !!c, detail }); console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 260)}` : ""}`); };
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses are read loosely, as in the other API checks
const call = async (method: string, path: string, body?: unknown, actor: string | { token: string } = "user-A"): Promise<Res> => {
  const who: Record<string, string> = typeof actor === "string" ? { "x-actor": actor } : { authorization: `Bearer ${actor.token}`, origin: ORIGIN };
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { ...who, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ }
  return { status: r.status, body: j };
};
const upload = async (path: string, names: string[]): Promise<Res> => {
  const fd = new FormData(); for (const n of names) fd.append("files", new Blob([new Uint8Array(readFileSync(join(FIX, n)))]), n);
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method: "POST", headers: { "x-actor": "user-A" }, body: fd });
  return { status: r.status, body: await r.json() };
};
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const read = (file: string) => JSON.parse(execFileSync(PY, ["-I", join(STUDIO, "tools", "read_portal_capture.py"), "page", join(FIX, file)], { encoding: "utf8" }).trim().split("\n").pop()!).screens[0];
const until = async (fn: () => Promise<boolean>, ms = 120_000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await fn()) return true; await new Promise((r) => setTimeout(r, 500)); } return false; };
const OFFICER = "user-O";
/** A screen not in the version is kept as a checksum of its heading (break M2). */
const SPOUSE_PAGE = `unknown-${createHash("sha256").update(screenIdentity("Your spouse or common-law partner")).digest("hex").slice(0, 16)}`;

(async () => {
  // ──────────────────────────────────────────── engine (no server): the portal's own format (BR-10)
  const inp = (x: Record<string, unknown>) => ({ id: "x", label: "x", type: "text", required: false, order: 1, ...x }) as never;
  ok("C7.4: BR-10 a date fills each part in the portal's format; a full date input takes the whole date", portalValue("1990-05-17", "date:YYYY", inp({}), null, []) === "1990" && portalValue("1990-05-17", "date:MM", inp({}), null, []) === "05" && portalValue("1990-05-17", "date:DD", inp({}), null, []) === "17" && portalValue("1990-05-17", "date:YYYY-MM-DD", inp({}), null, []) === "1990-05-17");
  ok("C7.4: BR-10 fail: a date that is not a date, a choice with no code, a text longer than the input allows: not filled (null)", portalValue("17/05/1990", "date:YYYY", inp({}), null, []) === null
    && portalValue("female", "option_map", inp({ options: [{ code: "FEMALE", label: "Female" }] }), { map: { male: "MALE" }, unused: [], codes: ["FEMALE"] } as never, [{ key: "female", label: "Female" }]) === null
    && portalValue("x".repeat(11), "as_is", inp({ max_length: 10 }), null, []) === null);
  ok("C7.4: BR-10 a choice takes the portal's own code from the option map", portalValue("female", "option_map", inp({ options: [{ code: "FEMALE", label: "Female" }] }), { map: { female: "FEMALE" }, unused: [], codes: ["FEMALE"] } as never, [{ key: "female", label: "Female" }]) === "FEMALE");

  // ──────────────────────────────────────────── setup (not under test): visitor visa released, then IMM 5257 filed Online
  setupVisitorVisa(PORT, DB);
  const vv = sql("select id from combination where combination_key='vv.single'");
  const cap = (await call("POST", "/captures", { portal: "ircc_portal", form: "IMM 5257", title: "Application for a visitor visa (online)", applicationType: "Visitor visa" })).body;
  await upload(`/captures/${cap.id}/screens`, ["imm5257-online-s1-personal.html", "imm5257-online-s2-marital.html", "imm5257-online-s3-language.html"]);
  await call("POST", `/captures/${cap.id}/finish`);
  await call("POST", `/captures/${cap.id}/approve`, undefined, "user-B");
  const ed = sql(`select form_edition_id from portal_capture where id='${cap.id}'`);
  let r = await releaseOnline(call as Call, sql, vv, ed, { note: "F2c: IMM 5257 filed Online" });
  ok("setup: Visitor visa released again with IMM 5257 filed Online (capture, second person, screen map, Q3 marker)", r.status < 300 && Number(sql(`select max(version) from config_release where combination_id='${vv}'`)) >= 2, r.body?.message ?? r.status);
  // Q3: the marker the setup set, and who may set it.
  ok("C9.3: Q3 the immigration expert role marked the UCI \"You answer this on screen\"; the released map row says so", sql(`select outcome from form_field_map where form_edition_id='${ed}' and data_path='uci' order by version desc limit 1`) === ANSWER_ON_SCREEN);
  r = await call("PATCH", `/online-versions/${ed}/screen-map`, { input: "uci", answerOnScreen: true, reason: "Sample: the representative answers this on the portal" }, "user-A");
  ok("C9.3: Q3 fail: only the immigration expert role (SME duty) marks \"You answer this on screen\" (author: 403)", r.status === 403, r.body.message);
  r = await call("PATCH", `/online-versions/${ed}/screen-map`, { input: "uci", answerOnScreen: true, notAFact: true, reason: "both" }, "user-C");
  ok("C9.3: Q3 fail: one decision per input (answered on screen and not a fact together: 400)", r.status === 400, r.status);

  // A case on that release, with confirmed facts.
  const k = await openCase(call as Call, vv, "F2C-CASE-1", [["person.family_name", "SAMPLE"], ["person.sex", "f_female"], ["person.date_of_birth", "1990-05-17"], ["person.place_of_birth_city", "Sample City"]], ["person.family_name", "person.date_of_birth", "person.sex"]);
  const c = { id: k.id }, P = k.principal, save = k.save;

  // ──────────────────────────────────────────── the extension, fill mode
  const code = (await call("POST", "/extension/pairings", {}, OFFICER)).body.code;
  const ext = { token: (await call("POST", "/extension/sessions", { code, extensionId: ID }, { token: "" })).body.token as string };
  const s1 = read("imm5257-online-s1-personal.html"), rw = read("imm5257-online-s1-personal-reworded.html"), s4 = read("imm5257-online-s4-spouse.html");
  const plan = async (screen: unknown, who: string | { token: string } = ext, caseId = c.id, subject = P) => call("POST", `/extension/cases/${caseId}/forms/IMM 5257/${subject}/fill-plans`, { screen }, who);
  // An answer entered after its section was confirmed waits for the section again (P-72).
  await save("person.given_names", "SAMPLE GIVEN");
  r = await plan(s1);
  const by = (id: string) => (r.body.inputs as { id: string; value: string | null; status: string; why: string }[]).find((x) => x.id === id)!;
  ok("C7.4: BR-7 the open screen matches the approved version in the case's release: a plan for its 9 inputs", r.status === 200 && r.body.match === true && r.body.inputs.length === 9, { status: r.status, match: r.body.match, message: r.body.message });
  ok("C7.4: BR-8 BR-10 confirmed facts fill in the portal's format: the name, the sex as the portal's code, the date in three parts, the city", by("familyName").value === "SAMPLE" && by("sex").value === "FEMALE" && by("dobYear").value === "1990" && by("dobMonth").value === "05" && by("dobDay").value === "17" && by("birthCity").value === "Sample City", r.body.counts);
  ok("C7.4: BR-8 fail: an answer not confirmed is not filled: \"Not filled: confirm … in the case first\"", by("givenNames").status === "not_confirmed" && by("givenNames").value === null && /^Not filled: confirm .+ in the case first\.$/.test(by("givenNames").why), by("givenNames"));
  ok("C7.4: BR-8 fail: a fact with no answer yet is not filled (\"No answer yet\")", by("birthCountry").status === "no_answer" && by("birthCountry").value === null);
  ok("C9.3: BR-9 Q3 an input marked \"You answer this on screen\" is never filled", by("uci").status === "you_answer" && by("uci").value === null && by("uci").why === "You answer this on screen.");
  ok("C7.4: M7 only an input to fill carries a value; every other carries null (the browser is never trusted to skip one)", (r.body.inputs as { status: string; value: unknown }[]).every((x) => (x.status === "fill") === (x.value !== null)));
  ok("C7.4: the panel's words: \"6 to fill on this screen · 3 need you\"", r.body.message === "6 to fill on this screen · 3 need you.", r.body.message);

  // roles and contract (BR-15, M3, M7)
  const capCode = (await call("POST", "/extension/pairings", {}, "user-A")).body.code;
  const capTok = { token: (await call("POST", "/extension/sessions", { code: capCode, extensionId: ID }, { token: "" })).body.token as string };
  r = await plan(s1, capTok);
  ok("C7.4: BR-15 fail: a capture-only token cannot fill (403)", r.status === 403 && /case duty/.test(r.body.message), r.body.message);
  r = await plan(s1, OFFICER);
  ok("C7.4: M7 fail: the Studio's x-actor alone cannot ask for a fill plan (401)", r.status === 401, r.status);
  r = await plan(s1, ext, "00000000-0000-4000-8000-000000000000");
  ok("C7.4: fail: a case that does not exist is 404", r.status === 404, r.status);
  r = await plan(s1, ext, c.id, "00000000-0000-4000-8000-000000000000");
  ok("C7.4: fail: a person who is not on the case is 404", r.status === 404, r.body.message);
  r = await call("POST", `/extension/cases/${c.id}/forms/IMM 5707/${P}/fill-plans`, { screen: s1 }, ext);
  ok("C7.4: fail: a form this case's release files as a PDF has no screens to fill (409, in words)", r.status === 409 && /not filed online/.test(r.body.message), r.body.message);
  r = await plan({ ...s1, inputs: s1.inputs.map((i: Record<string, unknown>, n: number) => (n ? i : { ...i, value: "SAMPLE" })) });
  ok("C7.4: BR-1 fail: a screen sent with a value is refused (400), nothing kept", r.status === 400 && /carried an answer/.test(r.body.message), r.body.message);

  // ──────────────────────────────────────────── BR-7 / XT-6: compare before fill, Re-capture needed
  r = await plan(rw);
  const diff = r.body.differences as { input: string; change: string; approved_label: string | null }[];
  ok("C9.3: BR-7 a reworded screen fills nothing and lists the differing inputs (the reworded name, the added option)", r.status === 200 && r.body.match === false && r.body.reason === "changed" && !r.body.inputs && diff.some((d) => d.input === "familyName" && d.change === "reworded") && diff.some((d) => d.input === "sex" && d.change === "options") && /looks different from the approved version\. Nothing was filled\. Re-capture needed is open/.test(r.body.message), { diff, message: r.body.message });
  const task1 = r.body.task;
  ok("C9.3: XT-6 one \"Re-capture needed\" task opens for the version and screen, with the open cases it affects", !!task1?.id && task1.times === 1 && sql(`select count(*) from recapture_task where status='OPEN' and screen_page='personal-details'`) === "1" && Number(sql(`select (affected->>'open_cases')::int from recapture_task where id='${task1.id}'`)) >= 1, task1);
  ok("C9.3: M5 the task keeps the approved labels and codes, never the live page's text (\"Surname\" is in no task, audit line or log)", sql(`select count(*) from recapture_task where differences::text like '%Surname%' or screen_title like '%Surname%'`) === "0" && sql(`select count(*) from audit_event where summary like '%Surname%'`) === "0" && !readFileSync(join(STUDIO, "var", `isolated-${DB.replace(/^xr_studio_/, "")}`, "api.log"), "utf8").includes("Surname"));
  r = await plan(rw);
  ok("C9.3: XT-6 a second mismatch updates the same task (seen twice), never a second one", r.body.task?.id === task1.id && r.body.task.times === 2 && sql(`select count(*) from recapture_task where screen_page='personal-details'`) === "1", r.body.task);
  const both = await Promise.all([plan(rw), plan(rw), plan(rw)]);
  ok("C9.3: XT-6 three mismatches at the same moment still make one task (the database decides)", both.every((x) => x.status === 200) && sql(`select count(*)||':'||max(times) from recapture_task where screen_page='personal-details'`) === "1:5", sql(`select count(*)||':'||max(times) from recapture_task where screen_page='personal-details'`));
  r = await plan(s4);
  ok("C9.3: Q2 a screen the approved version does not have fills nothing and opens \"Capture needed\" (not a change)", r.body.match === false && r.body.reason === "not_captured" && /not in the approved version/.test(r.body.message) && sql(`select kind from recapture_task where screen_page='${SPOUSE_PAGE}'`) === "not_captured", r.body.message);
  r = await call("GET", "/extension/recapture-tasks", undefined, "user-C");
  ok("C9.3: the content team lists the open tasks with the screens and changes to capture again", r.status === 200 && r.body.length === 2 && r.body.every((t: { status: string }) => t.status === "OPEN"), r.body.map((t: { screen: string; kind: string; times: number }) => `${t.screen}:${t.kind}:${t.times}`));
  r = await call("GET", "/extension/recapture-tasks", undefined, OFFICER);
  ok("C9.3: fail: a person without the review duty cannot list them (403)", r.status === 403, r.status);
  ok("C7.4: BR-13 no answer of the case is written in the audit or the server's log", sql(`select count(*) from audit_event where summary like '%SAMPLE%' or summary like '%Sample City%' or summary like '%1990%'`) === "0" && !/Sample City|SAMPLE GIVEN/.test(readFileSync(join(STUDIO, "var", `isolated-${DB.replace(/^xr_studio_/, "")}`, "api.log"), "utf8")));

  // ──────────────────────────────────────────── re-capture → approve: the task closes; the old case fills by hand (M2)
  const cap2 = (await call("POST", "/extension/captures", { portal: "ircc_portal", form: "IMM 5257", title: "Application for a visitor visa (online)", applicationType: "Visitor visa" }, capTok)).body;
  r = await call("POST", `/extension/captures/${cap2.id}/screens`, { screen: rw, revision: cap2.revision }, capTok);
  await call("POST", `/extension/captures/${cap2.id}/finish`, undefined, capTok);
  r = await call("POST", `/captures/${cap2.id}/approve`, undefined, "user-C");
  ok("C9.3: XT-6 approving the re-capture closes the task of the screen it saw; the screen it did not see keeps its task", r.status < 300 && sql(`select status from recapture_task where id='${task1.id}'`) === "DONE" && sql(`select status from recapture_task where screen_page='${SPOUSE_PAGE}'`) === "OPEN", sql("select screen_page||':'||status from recapture_task order by screen_page"));
  const tasksBefore = sql("select count(*) from recapture_task");
  r = await plan(rw);
  ok("C7.4: M2 a case on the older release, on the newer screen: nothing filled, \"fill this screen by hand\", and no new task", r.body.match === false && !!r.body.newer && /fill this screen by hand/.test(r.body.message) && !r.body.task && sql("select count(*) from recapture_task") === tasksBefore, r.body.message);

  // the new version released (its screen map from the earlier one, no AI; the new choice marked unused) → a new case
  const ed2 = sql(`select form_edition_id from portal_capture where id='${cap2.id}'`);
  r = await releaseOnline(call as Call, sql, vv, ed2, { unused: ["UNSPECIFIED"], note: "F2c: the re-captured IMM 5257 screens" });
  const c2 = (await call("POST", "/runtime/cases", { combinationId: vv, reference: "F2C-CASE-2", clientActor: "user-P", principal: { displayName: "Client A" } }, OFFICER)).body;
  const P2 = (await call("GET", `/runtime/cases/${c2.id}`, undefined, OFFICER)).body.people.find((x: { role: string }) => x.role === "principal").subject_id as string;
  r = await plan(rw, ext, c2.id, P2);
  ok("C7.4: Q2 the proof ends: a new case on the new release fills the re-captured screen (it matches: a plan, no task)", r.status === 200 && r.body.match === true && sql("select count(*) from recapture_task") === tasksBefore, { status: r.status, match: r.body.match, message: r.body.message });

  // ──────────────────────────────────────────── CHECK fixes (break B1, M2, M4)
  r = await plan({ ...s1, title: "Personal details (Spouse or common-law partner)" }, ext, c2.id, P2);
  ok("C7.4: break B1 a screen titled \"Personal details (Spouse …)\" is not the applicant's screen: no plan, no value of the applicant", r.body.match === false && r.body.reason === "not_captured" && !JSON.stringify(r.body).includes("SAMPLE") && !JSON.stringify(r.body).includes("1990"), r.body.reason);
  const secret = { ...s1, title: "Application 1234 5678 90 · details of AB1234567 Sample Name" };
  r = await plan(secret, ext, c2.id, P2);
  const leak = sql("select count(*) from recapture_task where screen_title like '%AB1234567%' or screen_page like '%ab1234567%' or screen_title like '%Sample Name%' or screen_page like '%sample-name%' or screen_page like '%1234%'");
  ok("C9.3: break M2 a screen not in the version is kept as a checksum and named in words: its heading (a client's details) is in no task", r.body.task?.id && leak === "0" && sql(`select screen_title from recapture_task where id='${r.body.task.id}'`) === "A screen that is not in the approved version" && /^unknown-[0-9a-f]{16}$/.test(sql(`select screen_page from recapture_task where id='${r.body.task.id}'`)), { leak });
  const secretTask = r.body.task.id as string;
  // PR #27: a "Capture needed" task keeps the live screen's element ids (what to capture), but drops any id that looks
  // like a client's detail (a page can build an id from what was typed).
  const idsScreen = { title: "Travel companions (Sample)", inputs: [{ id: "companionName", label: "Name", type: "text", required: false, order: 1 }, { id: "AB1234567", label: "Passport", type: "text", required: false, order: 2 }, { id: "12345678", label: "UCI", type: "text", required: false, order: 3 }, { id: "applicant_UCI12345678", label: "UCI", type: "text", required: false, order: 4 }, { id: "dob-1990-05-17", label: "Date", type: "text", required: false, order: 5 }] };
  r = await plan(idsScreen, ext, c2.id, P2);
  const kept = r.body.task?.id ? sql(`select differences::text from recapture_task where id='${r.body.task.id}'`) : "";
  ok("C9.3: PR #27 \"Capture needed\" keeps the page's own element ids (companionName) to say what to capture", /companionName/.test(kept), kept);
  ok("C9.3: PR #27 fail: an element id that looks like a passport number or a UCI, alone or inside a longer id (applicant_UCI12345678, dob-1990-05-17), is dropped from the task (in no task row)", !/AB1234567|12345678|1990-05-17/.test(kept) && sql("select count(*) from recapture_task where differences::text like '%AB1234567%' or differences::text like '%12345678%' or differences::text like '%1990-05-17%'") === "0", kept);
  for (let n = 0; n < 12; n++) await plan({ ...s1, title: `Junk screen number ${n}` }, ext, c2.id, P2);
  const unknown = Number(sql(`select count(*) from recapture_task where kind='not_captured' and status='OPEN' and form_edition_id=(select form_edition_id from recapture_task where id='${secretTask}')`));
  ok("C9.3: break M2 fail: one fill token cannot flood the content team (at most 10 open \"Capture needed\" per version)", unknown === 10, unknown);
  r = await call("GET", "/extension/cases?q=f2c-case-1", undefined, ext);
  const all = await call("GET", "/extension/cases", undefined, ext);
  ok("C7.4: break M4 fill mode finds any open case by its reference; no match is an empty list", r.status === 200 && r.body.length === 1 && r.body[0].reference === "F2C-CASE-1" && all.body.length === 2 && (await call("GET", "/extension/cases?q=nothing-like-this", undefined, ext)).body.length === 0, r.body.map((x: { reference: string }) => x.reference));

  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`FAIL  the check stopped: ${String((e as Error)?.message ?? e).slice(0, 200)}`); console.error(e); process.exit(1); });
