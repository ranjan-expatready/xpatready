// S5 Combination workspace slice 1 (runtime lane, W1-08, P-123; challenge M1, M3, M4, m5): person roles from the shared
// library (built in, kept by Reset), "Who can be in this application" (rules on Save, version guard, confirm, Undo), the
// runtime honouring the release's people, form line settings (minimum age, signed by, "Only if" in words with no rule),
// Preview on caseView, and the carried fixes QA-38, QA-40, QA-47, D-1, D-2. A passing and a failing case per rule, on an isolated
// copy with the sample loaded. No browser, no model call (US$0).
//   zsh studio/tools/isolated.sh runtime_s5 4431 start && tsx studio/tests/check_s5_slice1.ts 4431 xr_studio_runtime_s5
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tabOf } from "../contracts/workspace.ts";
import { newestReleases } from "../contracts/runtime.ts";
import { checkPeople, linesNamingRemoved } from "../engine/people.ts";
import { sourceEveryNumber } from "./fixtures/source-every-number.cjs"; // G1 (C5.4): a release needs every number sourced

const PORT = Number(process.argv[2] ?? 4431), DB = process.argv[3] ?? "xr_studio_runtime_s5";
const log: any[] = []; let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; log.push({ name, ok: !!c, detail }); console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 220)}` : ""}`); };
const call = async (method: string, path: string, body?: unknown, actor = "user-A") => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: any = null; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, body: j };
};
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const field = (r: { body: any }, f: string) => (r.body?.errors ?? []).find((e: any) => e.field === f)?.message as string | undefined;
const P = (extra: any[] = [], child = false) => [{ role: "principal", min: 1, max: 1, applies: true }, { role: "spouse_or_partner", min: 0, max: 1, applies: true, filingMode: "files_own" }, { role: "child", min: 0, max: 4, applies: child, filingMode: child ? "files_own" : "declared_only" }, { role: "representative", min: 0, max: 1, applies: false }, ...extra];

(async () => {
  const served = (await call("GET", "/session")).body?.workspace?.id;
  const inDb = (() => { try { return sql(`select id from workspace where id='${served}'`); } catch { return ""; } })();
  if (!served || !inDb) { console.error(`STOP  the database ${DB} is not the one the server on port ${PORT} uses. Pass the copy's database: tsx <check> ${PORT} xr_studio_<name>.`); process.exit(2); }
  if (!(await call("GET", "/demo/status")).body?.loaded) { const l = await call("POST", "/demo/load", {}); if (l.status >= 300) { console.error("STOP  the sample did not load", l.body); process.exit(2); } }

  // ---------------------------------------------------------------- pure rules
  ok("BR-1 pass: the six tabs in setup order; old addresses open the tab that holds their part", tabOf("sources") === "forms" && tabOf("configuration", "documents") === "documents" && tabOf("configuration", "questions") === "questionnaires" && tabOf("preview") === "preview");
  ok("BR-1 fail: an unknown tab is Overview", tabOf("pqr") === "overview" && tabOf(undefined) === "overview");
  const roles6 = [{ key: "principal", label: "Principal applicant", takesPartInCase: true, mayBeApplicant: true, retired: false }, { key: "sponsor", label: "Sponsor", takesPartInCase: true, mayBeApplicant: false, retired: false }, { key: "parent", label: "Parent", takesPartInCase: false, mayBeApplicant: false, retired: false }];
  ok("C11.12 pass (engine): a principal and a sponsor who is not an applicant pass", !checkPeople([{ role: "principal", min: 1, max: 1, applies: true }, { role: "sponsor", min: 0, max: 1, applies: false }], roles6).errors.length);
  const bad = checkPeople([{ role: "principal", min: 1, max: 1, applies: true }, { role: "sponsor", min: 0, max: 1, applies: true }, { role: "parent", min: 0, max: 1, applies: false }, { role: "nobody", min: 0, max: 1, applies: false }], roles6).errors.map((e) => e.field);
  ok("C11.12 fail (engine): sponsor as applicant, a forms-only role and an unknown role are each refused on their field", bad.includes("participants[1].applies") && bad.includes("participants[2].role") && bad.includes("participants[3].role"), bad);
  ok("M4 (engine): removing the spouse names the lines that name them; keeping them names none", linesNamingRemoved([{ role: "spouse_or_partner", max: 1 }], [], [{ form: "IMM 5409", who: "couple_once" }, { form: "IMM 1295", who: "each_applicant" }]).map((l) => l.form).join() === "IMM 5409" && !linesNamingRemoved([{ role: "spouse_or_partner", max: 1 }], [{ role: "spouse_or_partner", max: 1 }], [{ form: "IMM 5409", who: "couple_once" }]).length);

  // ---------------------------------------------------------------- M3 person roles
  const roles = (await call("GET", "/library/roles")).body as any[];
  const file = JSON.parse(readFileSync(join(import.meta.dirname, "..", "samples", "person-roles.json"), "utf8")).roles as any[];
  ok("C11.12 M3 pass: GET /library/roles lists the six built-in starting roles, each Sample", roles.length === 6 && roles.every((r) => r.builtIn && r.basis === "SAMPLE") && roles.map((r) => r.key).join() === "principal,spouse_or_partner,child,sponsor,representative,parent", roles.map((r) => r.key));
  ok("C11.12 M3: the import file and the database agree (the migration's rows equal samples/person-roles.json)", file.every((f) => { const r = roles.find((x) => x.key === f.key); return r && r.label === f.label && r.takesPartInCase === f.takesPartInCase && r.mayBeApplicant === f.mayBeApplicant; }));
  ok("C11.12 M3 fail: Parent is described on forms only (never on a case); Sponsor and Representative take part but are never applicants", roles.find((r) => r.key === "parent")!.takesPartInCase === false && ["sponsor", "representative"].every((k) => !roles.find((r) => r.key === k)!.mayBeApplicant));
  ok("M3: a role that is not on a case cannot be an applicant (database check)", (() => { try { sql(`insert into person_role (workspace_id, role_key, label, meaning, takes_part_in_case, may_be_applicant) values ('${served}', 'x_test', 'X', 'x', false, true)`); return false; } catch { return true; } })());

  // ---------------------------------------------------------------- C11.12 Who can be in this application
  const cat = (await call("GET", "/catalogue")).body;
  const leaves: any[] = []; const walk = (x: any) => { if (Array.isArray(x)) x.forEach(walk); else if (x && typeof x === "object") { if (x.combinationId && x.kind === "combination") leaves.push(x); Object.values(x).forEach(walk); } }; walk(cat);
  const wp = leaves.find((l) => l.status === "READY");
  if (!wp) { console.error("STOP  no released sample combination (the work-permit release)"); process.exit(2); }
  const C = wp.combinationId;
  const people = async () => (await call("GET", `/combinations/${C}/workspace?tab=questionnaires`)).body.people;
  const v0 = await people();
  ok("C11.12 read: the Smart questionnaire (SQR) tab answers who can be in the application with version, roles and answered by", v0.version === 1 && v0.lines.length === 4 && v0.roles.length === 6 && v0.lines.find((l: any) => l.role === "child").answeredBy === "Principal, under 18" && v0.canUndo === false, v0.lines.map((l: any) => l.role));
  let r = await call("PATCH", `/combinations/${C}/people`, { participants: P([{ role: "sponsor", min: 0, max: 1, applies: false }]), version: 1 }, "user-B");
  ok("C11.12 fail: only the author changes who can be in the application (403 for the approver)", r.status === 403, r.status);
  r = await call("PATCH", `/combinations/${C}/people`, { participants: P([{ role: "parent", min: 0, max: 2, applies: false }]), version: 1 });
  ok("C11.12 fail: Parent (forms only) is refused on its field, in plain words", r.status === 400 && /forms only/.test(field(r, "participants[4].role") ?? ""), field(r, "participants[4].role"));
  r = await call("PATCH", `/combinations/${C}/people`, { participants: P([{ role: "sponsor", min: 0, max: 1, applies: true }]), version: 1 });
  ok("C11.12 fail: a sponsor ticked as applicant is refused", r.status === 400 && /never an applicant/.test(field(r, "participants[4].applies") ?? ""), field(r, "participants[4].applies"));
  r = await call("PATCH", `/combinations/${C}/people`, { participants: [{ role: "spouse_or_partner", min: 0, max: 1, applies: true, filingMode: "files_own" }], version: 1 });
  ok("C11.12 fail: no principal applicant is refused", r.status === 400 && /principal applicant/.test(r.body.detail), r.body.detail);
  r = await call("PATCH", `/combinations/${C}/people`, { participants: P().map((p) => (p.role === "child" ? { ...p, min: 3, max: 1 } : p)), version: 1 });
  ok("C11.12 fail: the fewest above the most is refused on the line", r.status === 400 && !!field(r, "participants[2].max"), field(r, "participants[2].max"));
  r = await call("PATCH", `/combinations/${C}/people`, { participants: [...P(), { role: "child", min: 0, max: 1, applies: false }], version: 1 });
  ok("C11.12 fail: the same person twice is refused", r.status === 400 && /twice/.test(field(r, "participants[4].role") ?? ""));
  r = await call("PATCH", `/combinations/${C}/people`, { participants: P([{ role: "sponsor", min: 0, max: 1, applies: false }], true), version: 1 });
  ok("C11.12 pass: the author adds a Sponsor and marks children as applicants; the version moves to 2", r.status === 200 && r.body.version === 2 && r.body.participants.some((p: any) => p.role === "sponsor" && p.label === "Sponsor"), r.body);
  r = await call("PATCH", `/combinations/${C}/people`, { participants: P(), version: 1 });
  ok("M4 fail: a save at an old version is a 409 naming who saved, with their version", r.status === 409 && /Configuration author changed who can be/.test(r.body.detail) && r.body.current?.version === 2, r.body.detail);
  const v2 = await people();
  ok("M4: after a save, the tab says who saved and offers Undo", v2.version === 2 && v2.savedBy === "Configuration author" && v2.canUndo === true);
  r = await call("PATCH", `/combinations/${C}/people`, { participants: P([{ role: "sponsor", min: 0, max: 1, applies: false }], true).filter((p) => p.role !== "spouse_or_partner"), version: 2 });
  ok("M4 fail: removing the spouse that IMM 5409 names asks first (409 confirm, the form named)", r.status === 409 && r.body.confirm === true && /IMM 5409/.test(r.body.detail), r.body.detail);
  r = await call("POST", `/combinations/${C}/people/undo`, { version: 2 });
  ok("M4 pass: Undo restores the list before the last save (no sponsor) and moves the version on", r.status === 201 && r.body.version === 3 && !r.body.participants.some((p: any) => p.role === "sponsor"), r.body);
  r = await call("POST", `/combinations/${C}/people/undo`, { version: 3 });
  ok("M4 fail: an undo is not undone again (nothing to undo)", r.status === 409 && /nothing to undo/i.test(r.body.detail), r.body.detail);
  r = await call("PATCH", `/combinations/${C}/people`, { participants: P([{ role: "sponsor", min: 0, max: 1, applies: false }], true), version: 3 });
  ok("C11.12 pass: saved again (sponsor, children applicants) for the steps below", r.status === 200 && r.body.version === 4);
  const race = await Promise.all([1, 2].map(() => call("PATCH", `/combinations/${C}/people`, { participants: P([{ role: "sponsor", min: 0, max: 1, applies: false }], true), version: 4 })));
  ok("M4 concurrency: two saves at the same version at once: one is saved, the other is a 409", race.map((x) => x.status).sort().join() === "200,409" && (await people()).version === 5, race.map((x) => x.status));

  // ---------------------------------------------------------------- form lines (minimum age, signed by, only if)
  const forms = async () => (await call("GET", `/combinations/${C}/workspace?tab=forms`)).body;
  const preview = async (q = "") => (await call("GET", `/combinations/${C}/workspace?tab=preview&family=family2${q}`)).body.preview;
  let f0 = await forms();
  const line = (code: string) => f0.lines.find((l: any) => l.code === code);
  ok("C1.6 read: the Forms tab lists every line with who, only if, filed as, edition and a revision token", f0.lines.length >= 6 && f0.lines.every((l: any) => l.revision && l.channelWords && l.onlyIf?.kind) && /PDF/.test(f0.filing), f0.filing);
  let pv = await preview();
  const has = (p: any, person: string, form: string) => { const x = p.people.find((y: any) => y.subjectId === person); return x && (p.person === person ? p.forms.some((f: any) => f.form === form) : null); };
  const pvChild = await preview("&person=child-1");
  ok("C4.3 pass: Preview reads caseView with a Sample family; a child who is an applicant gets IMM 1295 while it has no minimum age", pvChild.person === "child-1" && pvChild.forms.some((f: any) => f.form === "IMM 1295") && pvChild.questionnaire.sections.length > 0, pvChild.forms.map((f: any) => f.form));
  r = await call("PATCH", `/combinations/${C}/forms/${encodeURIComponent("IMM 1295")}`, { minAge: 18, signedBy: "person", baseRevision: line("IMM 1295").revision });
  ok("C11.6 pass: minimum age 18 and 'signed by the person' are saved to the draft", r.status === 200 && r.body.minAge === 18 && r.body.signedBy === "person", r.status);
  pv = await preview("&person=child-1");
  const pvAdult = await preview("&person=principal");
  ok("C4.3 pass: with minimum age 18, child 1 (8) no longer gets IMM 1295; the principal (38) still does", !pv.forms.some((f: any) => f.form === "IMM 1295") && pvAdult.forms.some((f: any) => f.form === "IMM 1295" && /from age 18/.test(f.why)), pv.forms.map((f: any) => f.form));
  ok("C4.3: the person chips count each person's questions, documents and forms; a sponsor joins the family once", pv.people.some((p: any) => p.subjectId === "sponsor") && pv.people.every((p: any) => typeof p.questions === "number" && typeof p.forms === "number"), pv.people.map((p: any) => `${p.subjectId}:${p.forms}`));
  void has;
  r = await call("PATCH", `/combinations/${C}/forms/${encodeURIComponent("IMM 1295")}`, { minAge: 150 });
  ok("C11.6 fail: a minimum age of 150 is refused on its field", r.status === 400 && /1 to 99/.test(field(r, "minAge") ?? ""), field(r, "minAge"));
  r = await call("PATCH", `/combinations/${C}/forms/${encodeURIComponent("IMM 1295")}`, { signedBy: "the cat" });
  ok("C11.6 fail: a signer not on the list is refused on its field", r.status === 400 && !!field(r, "signedBy"), field(r, "signedBy"));
  r = await call("PATCH", `/combinations/${C}/forms/${encodeURIComponent("IMM 1295")}`, { minAge: 21, baseRevision: line("IMM 1295").revision });
  ok("C11.6 fail: a line saved from an old revision is a 409 naming who changed it", r.status === 409 && /Changed by/.test(r.body.detail ?? r.body.message), r.body.detail ?? r.body.message);
  // C11.11: the M1 checks use IMM 1295 (an always-filed form); the checklist IMM 5488 is no longer a form line.
  f0 = await forms();
  r = await call("PATCH", `/combinations/${C}/forms/${encodeURIComponent("IMM 1295")}`, { attachMode: "ANSWER_CONDITIONAL", conditionPlain: "Has a representative", baseRevision: line("IMM 1295").revision });
  f0 = await forms();
  ok("M1 pass: 'Only if' in words with no rule is saved and shown as words only", r.status === 200 && line("IMM 1295").onlyIf.kind === "words_only" && line("IMM 1295").onlyIf.words === "Has a representative", line("IMM 1295").onlyIf);
  const pvNoRule = await preview("&person=principal");
  const nr = pvNoRule.forms.find((f: any) => f.form === "IMM 1295");
  ok("M1: Preview says 'Cannot tell yet: no rule' for it, never that it applies", nr && nr.applies === "cannot_tell" && nr.noRule === true && /no rule/.test(nr.why), nr);
  let probs = (await call("GET", `/combinations/${C}`)).body.draft.problems as any[];
  ok("M1 fail: release is refused while the condition is words only (an error naming the fix)", probs.some((p) => p.level === "error" && p.item === "IMM 1295" && /Turn "Has a representative" into a rule/.test(p.message)), probs.filter((p) => p.item === "IMM 1295"));
  r = await call("POST", `/combinations/${C}/submit`, {});
  ok("M1 fail: submitting for review is refused with that error", r.status === 400 && /IMM 1295/.test(r.body.detail ?? r.body.message), (r.body.detail ?? r.body.message ?? "").slice(0, 120));
  r = await call("PATCH", `/combinations/${C}/forms/${encodeURIComponent("IMM 1295")}`, { attachMode: "ANSWER_CONDITIONAL", condition: { subjectKind: "PRINCIPAL", op: "eq", field: "person.marital_status", value: "married" }, conditionPlain: "Is married", baseRevision: line("IMM 1295").revision });
  f0 = await forms(); probs = (await call("GET", `/combinations/${C}`)).body.draft.problems as any[];
  ok("M1 pass: once a rule is built the line is a rule and the error is gone", r.status === 200 && line("IMM 1295").onlyIf.kind === "rule" && !probs.some((p) => p.item === "IMM 1295" && /Turn/.test(p.message)), line("IMM 1295").onlyIf);
  r = await call("PATCH", `/combinations/${C}/forms/${encodeURIComponent("IMM 1295")}`, { attachMode: "COMBINATION_MANDATORY", baseRevision: line("IMM 1295").revision });
  ok("M1: back to always", r.status === 200);

  // ---------------------------------------------------------------- D-2, D-1, QA-47, QA-40, runtime roles
  // QA-38 and QA-40 before release 2: a case on release 1, where IMM 1295 is still filed as a PDF.
  const pinOf = (k: string) => Number(sql(`select r.version from pack_work_pin p join config_release r on r.id=p.config_release_id where p.case_id='${k}'`));
  const listed = async () => newestReleases((await call("GET", "/releases", undefined, "user-O")).body as { combination_id: string; version: number }[]).find((x) => x.combination_id === C)?.version;
  const k1 = (await call("POST", "/runtime/cases", { combinationId: C, reference: "S5-QA38-R1", clientActor: "user-P", principal: { displayName: "Client B" }, idempotencyKey: `s5-r1-${Date.now()}` }, "user-O")).body?.id;
  ok("C6.1 QA-38 pass: with one release, the New case list and the opened case both name release 1", (await listed()) === 1 && pinOf(k1) === 1, { listed: await listed(), pinned: pinOf(k1) });
  r = await call("GET", `/runtime/cases/${k1}/forms`, undefined, "user-O");
  ok("C7.6 QA-40 fail: on a release that files IMM 1295 as a PDF it is a PDF copy row, never in the Online list", r.status === 200 && r.body.forms.some((f: any) => f.form === "IMM 1295") && !(r.body.online ?? []).some((f: any) => f.form === "IMM 1295"), r.body.online);
  f0 = await forms();
  r = await call("PATCH", `/combinations/${C}/forms/${encodeURIComponent("IMM 1295")}/channel`, { channel: "ONLINE", from: line("IMM 1295").channel });
  ok("setup: IMM 1295 filed Online (as a portal-only form would be, P-113)", r.status === 200, r.body?.detail ?? r.status);
  r = await call("POST", `/combinations/${C}/submit`, {}, "user-C");
  ok("D-2 fail: the content reviewer cannot submit (only the author submits)", r.status === 403, r.status);
  await sourceEveryNumber(PORT, C); // G1 (C5.4): the release's numbers need a source before it is submitted
  r = await call("POST", `/combinations/${C}/submit`, {});
  ok("D-2 pass: the author submits the draft for review", r.status === 201, r.body?.detail ?? r.status);
  r = await fetch(`http://localhost:${PORT}/api/combinations/${C}/signoff`, { method: "POST", headers: { "x-actor": "user-C" } }).then(async (x) => ({ status: x.status, body: await x.json().catch(() => null) }));
  ok("D-1 fail: a sign-off with no body is a 400 in plain words, never a 500", r.status === 400 && /Choose the changes/.test(r.body?.detail ?? ""), r.body?.detail);
  const review = (await call("GET", `/combinations/${C}/review`)).body;
  const changes = (review.submission?.changeSummary ?? []) as any[];
  r = await call("POST", `/combinations/${C}/signoff`, { items: changes.map((x) => `${x.kind}|${x.key}`) }, "user-C");
  ok("D-1 fail: a sign-off that does not say sign or return is a 400", r.status === 400 && /signing these changes or returning/.test(r.body?.detail ?? ""), r.body?.detail);
  const sme = changes.filter((x) => x.needs_sme).map((x) => `${x.kind}|${x.key}`);
  if (sme.length) await call("POST", `/combinations/${C}/signoff`, { items: sme, action: "signed" }, "user-C");
  r = await call("POST", `/combinations/${C}/approve`, {}, "user-B");
  ok("C5.1 pass: a different person approves; release 2 carries the sponsor and the Online line", r.status === 201 && r.body?.version === 2, r.body?.detail ?? r.body?.version);
  r = await call("POST", `/combinations/${C}/fill`, {});
  ok("QA-47 fail: filling with no form and no person is a 400 naming both fields (never a 404 about 'undefined')", r.status === 400 && !!field(r, "form") && !!field(r, "person") && !/undefined/.test(r.body.detail), r.body.detail);
  const kase = await call("POST", "/runtime/cases", { combinationId: C, reference: "S5-SLICE1", clientActor: "user-P", principal: { displayName: "Client A" }, idempotencyKey: `s5-${Date.now()}` }, "user-O");
  ok("setup: a case opens on release 2", kase.status === 201, kase.body?.detail ?? kase.status);
  const K = kase.body?.id;
  r = await call("POST", `/runtime/cases/${K}/people`, { role: "sponsor", displayName: "Sponsor S", applies: false }, "user-O");
  ok("C11.12 M3 pass: the runtime adds a Sponsor because the release lists one (it refused every role but spouse and child before)", r.status === 201 && r.body.role === "sponsor", r.body?.detail ?? r.body);
  r = await call("POST", `/runtime/cases/${K}/people`, { role: "sponsor", displayName: "Sponsor T", applies: false }, "user-O");
  ok("C11.12 fail: a second Sponsor is over the release's maximum (1)", r.status === 422 && /at most 1/.test(r.body.detail), r.body.detail);
  r = await call("POST", `/runtime/cases/${K}/people`, { role: "parent", displayName: "Parent P", applies: false }, "user-O");
  ok("C11.12 fail: a role the release does not list (Parent) is refused, in a whole sentence (review m1: \"does not list a parent\")", r.status === 422 && /does not list a parent in who can be/.test(r.body.detail), r.body.detail);
  r = await call("POST", `/runtime/cases/${K}/people`, { role: "case", displayName: "The application again" }, "user-O");
  const kNow = await call("GET", `/runtime/cases/${K}`, undefined, "user-O");
  ok("C6.2 QA-135 fail: the application itself as a person is refused in words, never the internal role name 'case', and nothing is added", r.status === 422 && /application itself is not a person/.test(r.body.detail) && /can add: .*sponsor/i.test(r.body.detail) && !/\ba case\b/.test(r.body.detail) && kNow.body.people.filter((p: { role: string }) => p.role === "case").length === 1, { detail: r.body.detail, people: kNow.body?.people?.length });
  ok("C6.2 QA-135 pass: a listed role still adds (the Sponsor above), so only the application is refused", kNow.body.people.some((p: { role: string }) => p.role === "sponsor"), kNow.body?.people);
  // B117 (P-373, C7.7): this release lists a Representative (P above), yet the representative of record comes from the case
  // team: one added as a person displaced the firm record's answers. The route refuses it; no allowed-roles list names it.
  const caseRefusal = (r.body?.detail ?? "") as string;
  const teamBefore = (await call("GET", `/runtime/cases/${K}/team`, undefined, "user-O")).body?.representative?.id;
  r = await call("POST", `/runtime/cases/${K}/people`, { role: "representative", displayName: "Representative R" }, "user-O");
  const kRep = await call("GET", `/runtime/cases/${K}`, undefined, "user-O");
  ok("C7.7 B117 fail: a representative added as a person is refused in words (422), names the case team, and nothing is added", r.status === 422 && /representative cannot be added as a person/.test(r.body?.detail ?? "") && /case team/.test(r.body?.detail ?? "") && !kRep.body.people.some((p: { role: string }) => p.role === "representative") && kRep.body.people.length === kNow.body.people.length, { status: r.status, detail: r.body?.detail, people: kRep.body?.people?.map((p: { role: string }) => p.role) });
  const lists = [caseRefusal, (r.body?.detail ?? "") as string].map((d) => (d.match(/can add: ([^.]*)\./)?.[1] ?? "").split(", "));
  ok("C7.7 B117 pass: both refusals list what this release really lets a person add (spouse or partner, child, sponsor) and never the representative", lists.every((l) => ["spouse or partner", "child", "sponsor"].every((x) => l.includes(x)) && !l.some((x) => /representative/.test(x))), lists);
  const teamAfter = (await call("GET", `/runtime/cases/${K}/team`, undefined, "user-O")).body?.representative?.id;
  ok("C7.7 B117 pass: the case keeps its representative of record from the case team, unchanged by the refused request", !!teamBefore && teamAfter === teamBefore, { teamBefore, teamAfter });
  r = await call("GET", `/runtime/cases/${K}/forms`, undefined, "user-O");
  // P-145 (forms slice 1, plan-slice1-channels.md §10): an Online form whose IRCC PDF is in the release keeps a PDF row,
  // but only as a "Copy, not for filing" (for_filing false); it is never offered as a copy to file.
  const rows1295 = r.body.forms.filter((f: any) => f.form === "IMM 1295");
  ok("C7.6 QA-40 pass: a form filed Online is listed on the case with its people, and any PDF row of it is a copy not for filing (P-145)", r.status === 200 && (r.body.online ?? []).some((f: any) => f.form === "IMM 1295" && f.people.length && f.pdf_copy === true) && rows1295.length > 0 && rows1295.every((f: any) => f.channel === "ONLINE" && f.for_filing === false), { online: r.body.online, rows: rows1295.map((f: any) => ({ channel: f.channel, for_filing: f.for_filing })) });
  // QA-38: the list the officer picks from and the release the server pins agree, whatever order the list comes in.
  ok("C6.1 QA-38 pass: after release 2 the New case list names release 2 and the new case is pinned to release 2; the earlier case keeps release 1", (await listed()) === 2 && pinOf(K) === 2 && pinOf(k1) === 1, { listed: await listed(), pinned: pinOf(K), earlier: pinOf(k1) });
  const rows = [{ combination_id: "x", version: 2 }, { combination_id: "x", version: 1 }, { combination_id: "y", version: 1 }];
  const lastWins = [...new Map(rows.map((x) => [x.combination_id, x])).values()].find((x) => x.combination_id === "x")?.version;
  ok("C6.1 QA-38 fail → fixed: the old rule (last entry per combination) named release 1 from a newest-first list; the shared rule names release 2 in either order", lastWins === 1 && newestReleases(rows).find((x) => x.combination_id === "x")?.version === 2 && newestReleases([...rows].reverse()).find((x) => x.combination_id === "x")?.version === 2 && newestReleases(rows).length === 2);

  // ---------------------------------------------------------------- Reset keeps the built-in roles (founder, P-108 note)
  r = await call("POST", "/demo/reset", { confirm: "RESET" });
  const after = (await call("GET", "/library/roles")).body as any[];
  ok("C11.7 pass: Reset empties the configuration and keeps the six built-in person roles", r.status < 300 && after.length === 6 && Number(sql(`select count(*) from combination where workspace_id='${served}'`)) === 0, { reset: r.status, roles: after.length });

  const out = join(import.meta.dirname, "..", "var", "suites"); mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "check_s5_slice1.json"), JSON.stringify({ at: new Date().toISOString(), pass, fail, log }, null, 1));
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FAIL  unexpected", e); process.exit(1); });
