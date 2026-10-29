// S5 Combination workspace, Lead check FIX (28 Oct, sixth Lead chat; screens/W1-combination-workspace/lead-check.md
// L1–L11): a passing and a failing case for each finding, on an isolated copy with the sample loaded. US$0: the form
// finder replays its committed answers; "AI now" is refused before any call. Browser parts: check_s5_leadcheck_browser.cjs.
//   zsh studio/tools/isolated.sh runtime_fix 4434 start && tsx studio/tests/check_s5_leadcheck.ts 4434 xr_studio_runtime_fix
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { acceptedChannels } from "../engine/channels.ts";
import { ourWords, irccWords } from "../contracts/workspace.ts";
import { checkPeople } from "../engine/people.ts";

const PORT = Number(process.argv[2] ?? 4434), DB = process.argv[3] ?? "xr_studio_runtime_fix";
const log: any[] = []; let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; log.push({ name, ok: !!c, detail }); console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 220)}` : ""}`); };
const call = async (method: string, path: string, body?: unknown, actor = "user-A") => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: any = null; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, body: j };
};
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const words = (r: { body: any }) => String(r.body?.detail ?? r.body?.message ?? "");
const settle = async (id: string) => { let r = { status: 0, body: null as any }; for (let i = 0; i < 240; i++) { r = await call("GET", `/runs/${id}`); if (!["queued", "running", "stopping"].includes(r.body?.status)) return r; await new Promise((x) => setTimeout(x, 250)); } return r; };
const P = (extra: any[] = []) => [{ role: "principal", min: 1, max: 1, applies: true }, { role: "spouse_or_partner", min: 0, max: 1, applies: true }, { role: "child", min: 0, max: 4, applies: true }, { role: "representative", min: 0, max: 1, applies: false }, ...extra];

(async () => {
  let served = (await call("GET", "/session")).body?.workspace?.id;
  const inDb = (() => { try { return sql(`select id from workspace where id='${served}'`); } catch { return ""; } })();
  if (!served || !inDb) { console.error(`STOP  the database ${DB} is not the one the server on port ${PORT} uses. Pass the copy's database: tsx <check> ${PORT} xr_studio_<name>.`); process.exit(2); }

  // ---------------------------------------------------------------- L9 reset clears person roles (first: it resets)
  sql(`insert into person_role (workspace_id, role_key, label, meaning, takes_part_in_case, may_be_applicant) values (gen_random_uuid(), 'orphan_test', 'Orphan', 'left by an older reset', true, false)`);
  await call("POST", "/demo/reset", { confirm: "RESET" });
  const l = await call("POST", "/demo/load", {});
  if (l.status >= 300) { console.error("STOP  the sample did not load", l.body); process.exit(2); }
  served = (await call("GET", "/session")).body?.workspace?.id; // the reset made a new workspace
  ok("C11.12 L9 pass: after a reset only the new workspace's six person roles remain", sql(`select count(*) || '/' || count(distinct workspace_id) from person_role`) === "6/1" && sql(`select count(*) from person_role r join workspace w on w.id=r.workspace_id`) === "6", sql(`select count(*) || '/' || count(distinct workspace_id) from person_role`));
  ok("C11.12 L9 fail: a person role of a workspace that no longer exists (left by a reset before the fix) is removed by the next reset", sql(`select count(*) from person_role where role_key='orphan_test'`) === "0");

  const wp = sql(`select id from combination where combination_key='wp.family'`), vv = sql(`select id from combination where combination_key='vv.single'`), sv = sql(`select id from combination where combination_key='sv.super_visa'`);
  const forms = async (c: string) => (await call("GET", `/combinations/${c}/workspace?tab=forms`)).body;
  const people = async (c: string) => (await call("GET", `/combinations/${c}/workspace?tab=questionnaires`)).body.people;
  const problems = async (c: string) => (await call("GET", `/combinations/${c}`)).body.draft.problems as any[];
  const undoForms = (c: string, changeId?: string) => call("POST", `/combinations/${c}/forms/undo`, changeId ? { changeId } : {});
  const lineOf = async (c: string, code: string) => (await forms(c)).lines.find((x: any) => x.code === code);
  const rowOf = (c: string, code: string) => sql(`select coalesce(min_age::text,'-') || '|' || coalesce(signed_by,'-') || '|' || attach_mode || '|' || coalesce(condition_plain,'-') || '|' || status || '|v' || version from combination_form where combination_id='${c}' and lineage_key='${code}' order by version desc limit 1`);

  // ---------------------------------------------------------------- L1 Undo puts back every line setting
  const F = "IMM 1295";
  const r0 = rowOf(wp, F);
  let line = await lineOf(wp, F);
  let r = await call("PATCH", `/combinations/${wp}/forms/${encodeURIComponent(F)}`, { minAge: 18, signedBy: "person", baseRevision: line.revision });
  ok("setup: minimum age 18 and signed by the person saved on IMM 1295 (a draft line over the release)", r.status === 200, words(r));
  const r1 = rowOf(wp, F);
  line = await lineOf(wp, F);
  r = await call("PATCH", `/combinations/${wp}/forms/${encodeURIComponent(F)}`, { minAge: 21, signedBy: "principal_for_family", attachMode: "ANSWER_CONDITIONAL", condition: { subjectKind: "PRINCIPAL", op: "eq", field: "person.marital_status", value: "married" }, conditionPlain: "Is married", baseRevision: line.revision });
  ok("setup: the same draft line changed again in place: age 21, signed by the principal for the family, only if married", r.status === 200 && /^21\|principal_for_family\|ANSWER_CONDITIONAL\|Is married\|DRAFT/.test(rowOf(wp, F)), { row: rowOf(wp, F), detail: words(r) });
  r = await undoForms(wp);
  ok("C11.6 L1 pass: Undo puts back age 18, the person as signer and Always (the edit before it), not just the status", r.status === 201 && rowOf(wp, F) === r1, { now: rowOf(wp, F), before: r1, status: r.status });
  r = await undoForms(wp);
  ok("C11.6 L1 pass: a second Undo goes back to the released line (no age, no signer)", r.status === 201 && rowOf(wp, F) === r0, { now: rowOf(wp, F), before: r0 });
  line = await lineOf(wp, F);
  await call("PATCH", `/combinations/${wp}/forms/${encodeURIComponent(F)}`, { minAge: 18, baseRevision: line.revision });
  line = await lineOf(wp, F);
  r = await call("PATCH", `/combinations/${wp}/forms/${encodeURIComponent(F)}/channel`, { channel: "SIGNED_PDF_UPLOAD", from: line.channel });
  ok("setup: the line's filing changed after the age edit, on the channel picker (not an Undo step)", r.status === 200, words(r));
  r = await undoForms(wp);
  ok("C11.6 L1 fail: Undo of the age edit is refused once the line was changed since (its filing is now part of what is compared)", r.status === 409 && /changed after that step/.test(words(r)), words(r));
  line = await lineOf(wp, F);
  await call("PATCH", `/combinations/${wp}/forms/${encodeURIComponent(F)}/channel`, { channel: "PDF_UPLOAD", from: line.channel });
  line = await lineOf(wp, F);
  await call("PATCH", `/combinations/${wp}/forms/${encodeURIComponent(F)}`, { minAge: null, baseRevision: line.revision });

  // ---------------------------------------------------------------- L4 Filed as from what IRCC accepts
  ok("C1.6 L4 (rule): PDF accepts PDF and signed PDF uploads, Online only Online, both all three; nothing recorded is null (Sample)", JSON.stringify(acceptedChannels("PDF")) === '["PDF_UPLOAD","SIGNED_PDF_UPLOAD"]' && JSON.stringify(acceptedChannels("ONLINE")) === '["ONLINE"]' && acceptedChannels("PDF_OR_ONLINE")!.length === 3 && acceptedChannels(null) === null && acceptedChannels("READ_BY_AI") === null);
  // The library's record on every PDF edition of the form (the newest one is what counts).
  const eds = `select e.id from form_edition e join gov_form_def d on d.id=e.gov_form_def_id where d.form_key='${F}' and e.workspace_id='${served}' and e.channel <> 'ONLINE'`;
  line = await lineOf(wp, F);
  ok("C1.6 L4 fail-guard: with nothing recorded for IMM 1295, every way is offered and said to be Sample", line.accepted.length === 3 && /^Sample/.test(line.acceptedBasis), { accepted: line.accepted, basis: line.acceptedBasis });
  sql(`update form_edition set accepted_channels='PDF', accepted_basis='PERSON_SAMPLE' where id in (${eds})`);
  line = await lineOf(wp, F);
  ok("C1.6 L4 pass: once the Form library records PDF for the edition, Filed as offers only PDF upload and signed PDF upload, from the library", JSON.stringify(line.accepted) === '["PDF_UPLOAD","SIGNED_PDF_UPLOAD"]' && /Form library/.test(line.acceptedBasis), { accepted: line.accepted, basis: line.acceptedBasis });
  r = await call("PATCH", `/combinations/${wp}/forms/${encodeURIComponent(F)}/channel`, { channel: "ONLINE", from: line.channel });
  ok("C1.6 L4 fail: choosing Online is refused on save in words (IRCC accepts it only as a PDF upload)", r.status === 400 && /accepts it only as a PDF upload/.test(words(r)) && (await lineOf(wp, F)).channel === "PDF_UPLOAD", words(r));
  r = await call("PATCH", `/combinations/${wp}/forms/${encodeURIComponent(F)}/channel`, { channel: "SIGNED_PDF_UPLOAD", from: line.channel });
  ok("C1.6 L4 pass: a signed PDF upload, which IRCC accepts, is saved", r.status === 200 && (await lineOf(wp, F)).channel === "SIGNED_PDF_UPLOAD", words(r));
  sql(`update combination_form set channel='ONLINE' where combination_id='${wp}' and lineage_key='${F}' and status='DRAFT'`);
  let probs = await problems(wp);
  ok("C1.6 L4 fail: a line already filed Online (saved before the library recorded PDF) blocks release with the same words", probs.some((p) => p.level === "error" && p.item === F && /accepts it only as a PDF upload/.test(p.message)), probs.filter((p) => p.item === F).map((p) => p.message));
  r = await call("POST", `/combinations/${wp}/submit`, {});
  ok("C1.6 L4 fail: submitting for review is refused while it is so", r.status === 400 && /IMM 1295/.test(words(r)), words(r).slice(0, 140));
  sql(`update combination_form set channel='PDF_UPLOAD' where combination_id='${wp}' and lineage_key='${F}' and status='DRAFT'`);
  probs = await problems(wp);
  ok("C1.6 L4 pass: filed as a PDF upload again, the error is gone", !probs.some((p) => p.item === F && /accepts it only/.test(p.message)));
  sql(`update form_edition set accepted_channels=null, accepted_basis=null where id in (${eds})`);

  // ---------------------------------------------------------------- forms from the finder on Visitor visa (for L5, L11)
  const plan = (await call("POST", `/combinations/${vv}/forms/find/plan`, { mode: "replay" })).body;
  const run = await call("POST", `/combinations/${vv}/forms/find`, { mode: "replay", planSha256: plan.plan_sha256, idempotencyKey: `lc-${Date.now()}` });
  if (run.body?.id) await settle(run.body.id);
  let fv = await forms(vv);
  ok("setup: the form finder (saved answers, US$0) attached Visitor visa's forms", fv.lines.some((x: any) => x.origin === "AI_FOUND"), fv.lines.map((x: any) => x.code));

  // ---------------------------------------------------------------- L5 a minimum age needs a date of birth question
  const vl = fv.lines.find((x: any) => x.code === "IMM 5257") ?? fv.lines[0];
  r = await call("PATCH", `/combinations/${vv}/forms/${encodeURIComponent(vl.code)}`, { minAge: 18, baseRevision: vl.revision });
  probs = await problems(vv);
  // Visitor visa selects no questionnaire section: the minimum age brings the library's date of birth question with it.
  ok("C11.6 L5 pass: a minimum age on Visitor visa (no section selected) brings the date of birth question along, so no error", r.status === 200 && !probs.some((p) => p.level === "error" && /date of birth/.test(p.message)), probs.filter((p) => p.item === vl.code).map((p) => p.message));
  const vvf = ((await call("GET", `/combinations/${vv}/workspace?tab=preview`)).body.preview?.forms ?? []).find((f: any) => f.form === vl.code);
  ok(`C11.6 L5 pass: Preview decides ${vl.code} for the Sample principal from their date of birth (from age 18)`, vvf?.applies === true && /from age 18/.test(vvf.why ?? ""), vvf);
  const { validate } = await import("../engine/validate.ts");
  const { render: render2 } = await import("../engine/render.ts");
  const withDob: any = { forms: [{ form_number: "IMM X", title: "X", who: "each_applicant", status: "always", condition: null, min_age: 18 }], field_maps: [], canonical_fields: [{ id: "person.date_of_birth", meaning: "Date of birth", value_type: "date" }], placements: [{ fact: "person.date_of_birth", section_id: "personal_details", collected_from: "client_questionnaire", question_text: "Date of birth" }], sections: [], document_types: [], document_requirements: [], rules: [], checks: [], derived_fields: [], combination: { participants: [{ role: "principal", max: 1 }] } };
  let asked: any = null; try { const rr: any = render2(withDob, [{ id: "principal", role: "principal", label: "Principal", applies: true } as any], new Map()); asked = JSON.stringify(rr).includes("decides whether IMM X applies") ? "decides" : JSON.stringify(rr).slice(0, 300); } catch (e) { asked = String(e); }
  ok("C11.6 L5 pass (engine): on a new case, with the date of birth not yet known, it is asked as the question that decides the form", asked === "decides", asked);
  const bare: any = { forms: [{ form_number: "IMM X", title: "X", form_kind: "document", who: "each_applicant", status: "always", condition: null, min_age: 18 }], field_maps: [], canonical_fields: [], placements: [], sections: [], document_types: [], document_requirements: [], rules: [], checks: [], derived_fields: [], combination: { participants: [{ role: "principal", max: 1 }] } };
  let vprobs: any[] = []; try { vprobs = validate(bare, [{ key: "person.date_of_birth", valueType: "date" }], []); } catch (e) { vprobs = [{ message: String(e) }]; }
  ok("C11.6 L5 fail: with nobody asked for a date of birth (no placement, no document), release is refused naming the fix", vprobs.some((p) => p.level === "error" && p.item === "IMM X" && /Add the date of birth question/.test(p.message)), vprobs.map((p) => p.message));
  bare.placements = [{ fact: "person.date_of_birth", section_id: "personal_details" }]; bare.sections = [{ id: "personal_details", title: "Personal details" }];
  try { vprobs = validate(bare, [{ key: "person.date_of_birth", valueType: "date" }], []); } catch (e) { vprobs = [{ message: String(e) }]; }
  ok("C11.6 L5 pass (engine): the same form with a date of birth question has no such error", !vprobs.some((p) => /date of birth/.test(p.message ?? "")), vprobs.map((p) => p.message));
  line = await lineOf(wp, F);
  await call("PATCH", `/combinations/${wp}/forms/${encodeURIComponent(F)}`, { minAge: 18, baseRevision: line.revision });
  probs = await problems(wp);
  ok("C11.6 L5 pass: With an LMIA asks the date of birth (Personal details), so its age-gated IMM 1295 has no such error", !probs.some((p) => /date of birth/.test(p.message)), probs.filter((p) => p.level === "error").map((p) => p.message));
  const pv = (await call("GET", `/combinations/${wp}/workspace?tab=preview&family=family2&person=child-1`)).body.preview;
  ok("C11.6 L5 pass: and a case decides it from that answer (the child, 8, does not get IMM 1295; the principal does)", !pv.forms.some((f: any) => f.form === F) && (await call("GET", `/combinations/${wp}/workspace?tab=preview&family=family2&person=principal`)).body.preview.forms.some((f: any) => f.form === F), pv.forms.map((f: any) => f.form));
  const { render } = await import("../engine/render.ts");
  const snap: any = { forms: [{ form_number: "IMM X", title: "X", who: "each_applicant", status: "always", condition: null, min_age: 18 }], field_maps: [], canonical_fields: [], placements: [], sections: [], document_types: [], document_requirements: [], rules: [], checks: [], derived_fields: [], combination: { participants: [{ role: "principal", max: 1 }] } };
  let rendered: any = null; try { rendered = render(snap, [{ id: "principal", role: "principal", label: "Principal", applies: true } as any], new Map()); } catch (e) { rendered = { error: String(e) }; }
  const fx = rendered?.forms?.find((f: any) => f.form === "IMM X");
  ok("C11.6 L5 (engine): with no date of birth known, the form is 'cannot tell' and the date of birth is what decides it", fx?.applies === "cannot_tell" && fx.missing.includes("person.date_of_birth"), rendered?.error ?? fx);
  line = await lineOf(wp, F);
  await call("PATCH", `/combinations/${wp}/forms/${encodeURIComponent(F)}`, { minAge: null, baseRevision: line.revision });
  fv = await forms(vv);
  const vl2 = fv.lines.find((x: any) => x.code === vl.code);
  await call("PATCH", `/combinations/${vv}/forms/${encodeURIComponent(vl.code)}`, { minAge: null, baseRevision: vl2.revision });
  ok("C11.6 L5 pass: clearing the minimum age clears the error", !(await problems(vv)).some((p) => /date of birth/.test(p.message)));

  // ---------------------------------------------------------------- L11 a line added from the library
  ok("C11.10 L11 (rule): the product's own words are never IRCC's; a real quote stays one", irccWords("IMM 5409 (05-2024): added from the library") === null && ourWords("IMM 5409: added from the library") === "Added from the library by a person" && ourWords("IMM 1344: uploaded for this combination") === "Uploaded for this combination by a person" && irccWords("Complete this form if you have a spouse.") === "Complete this form if you have a spouse." && ourWords("Complete this form.") === null);
  const libForm = sql(`select d.form_key from gov_form_def d where d.workspace_id='${served}' and d.form_kind='data_form' and d.retired_at is null and exists (select 1 from form_edition e where e.gov_form_def_id=d.id and e.channel <> 'ONLINE') and d.form_key not in (select lineage_key from combination_form where combination_id='${vv}') order by d.form_key limit 1`);
  r = await call("POST", `/combinations/${vv}/forms`, { formKey: libForm });
  fv = await forms(vv);
  const added = fv.lines.find((x: any) => x.code === libForm);
  ok(`C11.10 L11 pass: ${libForm} added from the library shows no IRCC quote and says how it was added`, r.status < 300 && !!added && added.quote === null && added.added === "Added from the library by a person", { status: r.status, detail: words(r), quote: added?.quote, added: added?.added });
  const found = fv.lines.find((x: any) => x.origin === "AI_FOUND");
  ok("C11.10 L11 fail-guard: a line the finder picked keeps IRCC's words and says nothing about being added", !!found?.quote && !found.added, { quote: found?.quote?.slice(0, 60), added: found?.added });

  // ---------------------------------------------------------------- L2 AI now is not offered
  r = await call("POST", `/combinations/${sv}/people/propose/plan`, { mode: "live" });
  ok("C11.12 L2 fail: the plan for AI now is refused (409) with the reason: it waits for the founder's Go for a live trial", r.status === 409 && /founder's Go for a live trial/.test(words(r)), words(r));
  r = await call("POST", `/combinations/${sv}/people/propose`, { mode: "live", planSha256: "0".repeat(64) });
  ok("C11.12 L2 fail: running AI now is refused before any AI call (US$0)", r.status === 409 && /founder's Go/.test(words(r)), words(r));
  const rp = await call("POST", `/combinations/${sv}/people/propose/plan`, { mode: "rules" });
  ok("C11.12 L2 pass: rules only still plans, at US$0", rp.status === 201 && rp.body.totals.worst_usd === 0, rp.body?.totals ?? words(rp));

  // ---------------------------------------------------------------- L3 rules-only lines are the rules', not AI
  const prop = await call("POST", `/combinations/${sv}/people/propose`, { mode: "rules", planSha256: rp.body.plan_sha256 });
  ok("setup: rules only proposes lines from Guide 5256 with its sentences", prop.status === 201 && prop.body.people.length > 0 && prop.body.mode === "rules", prop.body?.people?.map((p: any) => p.role) ?? words(prop));
  let pe = await people(sv);
  const fromRules = prop.body.people.filter((p: any) => p.role !== "principal").slice(0, 1).map((p: any) => ({ role: p.role, min: p.min, max: p.max, applies: p.applies, quote: p.quote, origin: "CODE_MATCH" }));
  const keep = pe.lines.filter((x: any) => !fromRules.some((y: any) => y.role === x.role)).map((x: any) => ({ role: x.role, min: x.min, max: x.max, applies: x.applies, ...(x.quote ? { quote: x.quote } : {}), ...(x.origin ? { origin: x.origin } : {}) }));
  r = await call("PATCH", `/combinations/${sv}/people`, { participants: [...keep, ...fromRules], version: pe.version, confirmRemove: true });
  pe = await people(sv);
  ok("C11.12 L3 pass: a line from rules only is saved and read back as found by rules (CODE_MATCH), never as AI", r.status === 200 && fromRules.length === 1 && pe.lines.some((x: any) => x.role === fromRules[0].role && x.origin === "CODE_MATCH"), { status: r.status, detail: words(r), lines: pe.lines.map((x: any) => `${x.role}:${x.origin}`) });
  r = await call("PATCH", `/combinations/${sv}/people`, { participants: [...keep, { ...fromRules[0], origin: "RULES_AI" }], version: pe.version });
  ok("C11.12 L3 fail: an origin that is not one of the product's (HUMAN, AI_PROPOSAL, CODE_MATCH, SAMPLE) is refused", r.status === 400, r.status);

  // ---------------------------------------------------------------- L7 a typed label is kept
  ok("C11.12 L7 (engine): a typed label is kept; with none, the library's label is used", checkPeople([{ role: "principal", min: 1, max: 1, applies: true, label: "Main applicant" } as any], [{ key: "principal", label: "Principal applicant", takesPartInCase: true, mayBeApplicant: true, retired: false }] as any).lines[0].label === "Main applicant" && checkPeople([{ role: "principal", min: 1, max: 1, applies: true } as any], [{ key: "principal", label: "Principal applicant", takesPartInCase: true, mayBeApplicant: true, retired: false }] as any).lines[0].label === "Principal applicant");
  let pw = await people(wp);
  r = await call("PATCH", `/combinations/${wp}/people`, { participants: P().map((p) => (p.role === "spouse_or_partner" ? { ...p, label: "Common-law partner" } : p)), version: pw.version });
  pw = await people(wp);
  ok("C11.12 L7 pass: 'Common-law partner' typed for the spouse line is saved as typed", r.status === 200 && pw.lines.find((x: any) => x.role === "spouse_or_partner")?.label === "Common-law partner", { status: r.status, detail: words(r), label: pw.lines.find((x: any) => x.role === "spouse_or_partner")?.label });
  r = await call("PATCH", `/combinations/${wp}/people`, { participants: P(), version: pw.version });
  pw = await people(wp);
  ok("C11.12 L7 fail-guard: a line sent with no label takes the library's label", r.status === 200 && pw.lines.find((x: any) => x.role === "spouse_or_partner")?.label === "Spouse or partner", pw.lines.find((x: any) => x.role === "spouse_or_partner")?.label);

  // ---------------------------------------------------------------- L10 a retired combination's people are read-only
  pe = await people(vv);
  sql(`update combination set retired_at=now() where id='${vv}'`);
  r = await call("PATCH", `/combinations/${vv}/people`, { participants: [{ role: "principal", min: 1, max: 1, applies: true }], version: pe.version });
  ok("C11.12 L10 fail: who can be in a retired combination is not saved (409, says restore it first)", r.status === 409 && /is retired/.test(words(r)) && /Restore it/.test(words(r)), words(r));
  r = await call("POST", `/combinations/${vv}/people/undo`, { version: pe.version });
  ok("C11.12 L10 fail: nor undone", r.status === 409 && /is retired/.test(words(r)), words(r));
  ok("C11.12 L10: the tab offers no Undo on a retired combination", (await people(vv)).canUndo === false);
  sql(`update combination set retired_at=null where id='${vv}'`);
  r = await call("PATCH", `/combinations/${vv}/people`, { participants: [{ role: "principal", min: 1, max: 1, applies: true }, { role: "spouse_or_partner", min: 0, max: 1, applies: true }], version: pe.version });
  ok("C11.12 L10 pass: once restored, the same save goes through", r.status === 200, words(r));

  // ---------------------------------------------------------------- L6 people Undo after a release
  pw = await people(wp);
  r = await call("PATCH", `/combinations/${wp}/people`, { participants: P([{ role: "sponsor", min: 0, max: 1, applies: false }]), version: pw.version });
  pw = await people(wp);
  ok("C11.12 L6 pass (before a release): a save offers Undo", r.status === 200 && pw.canUndo === true, { status: r.status, canUndo: pw.canUndo });
  ok("C11.6 QA-69 pass (before a release): the Forms tab offers Undo of the last change on its forms", !!(await forms(wp)).lastChange, (await forms(wp)).lastChange);
  r = await call("POST", `/combinations/${wp}/submit`, {});
  const submitted = r.status === 201;
  const review = (await call("GET", `/combinations/${wp}/review`)).body;
  const changes = (review.submission?.changeSummary ?? []) as any[];
  const sme = changes.filter((x) => x.needs_sme).map((x) => `${x.kind}|${x.key}`);
  if (sme.length) await call("POST", `/combinations/${wp}/signoff`, { items: sme, action: "signed" }, "user-C");
  r = await call("POST", `/combinations/${wp}/approve`, {}, "user-B");
  ok("setup: the change is released (submitted, signed off, approved by a different person)", submitted && r.status === 201 && r.body?.version >= 2, words(r) || r.body?.version);
  pw = await people(wp);
  ok("C11.12 L6: after the release the tab offers no Undo", pw.canUndo === false, pw.canUndo);
  r = await call("POST", `/combinations/${wp}/people/undo`, { version: pw.version });
  ok("C11.12 L6 fail: Undo of a save that was released since is refused (409, a release is never undone)", r.status === 409 && /Released since/.test(words(r)) && (await people(wp)).lines.some((x: any) => x.role === "sponsor"), words(r));

  ok("C11.6 QA-69: after the release the Forms tab offers no Undo", (await forms(wp)).lastChange === null, (await forms(wp)).lastChange);
  r = await undoForms(wp);
  ok("C11.6 QA-69 fail: Undo of a forms change made before the release is refused (409 Released since)", r.status === 409 && /Released since|released meanwhile/.test(`${r.body?.title} ${words(r)}`), `${r.status} ${words(r)}`);

  // ---------------------------------------------------------------- the record
  const out = join(import.meta.dirname, "..", "..", "..", "product", "screens", "W1-combination-workspace", "tests");
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "check_s5_leadcheck.json"), JSON.stringify({ at: new Date().toISOString(), port: PORT, pass, fail, log }, null, 2));
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
