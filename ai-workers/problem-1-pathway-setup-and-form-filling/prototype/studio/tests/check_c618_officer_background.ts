// C6.18 officer entry for background answers (row B140 = L-SA10; P-244 amends P-97 and C4.9). A pass and a fail per rule,
// on the engine (no server) and through the API on a Visitor visa case with the C4.4 Sample declaration:
//   R1 which answers are background ones comes from data: a fact the release maps into the form's own "BACKGROUND
//      INFORMATION" block by its reading (IRCC-F08), or a placement in a client-only section (P-97); never a declaration,
//      never a fact mapped outside the block; an unreadable reading adds nothing.
//   R2 a background answer staff recorded (Agent view) waits for the client: never confirmed, even after the officer's
//      "Confirm section" (VERIFIED from it); the client's re-confirmation or own answer ends it; a non-background officer
//      answer keeps the earlier rule.
//   R3 a form that reads it is not ready, and says the client re-confirms it (Forms tab, Ready to file's words).
//   R4 declarations refuse staff entry (403), nothing stored; the client makes them.
//   R5 only the client re-confirms (staff 403, unknown 404, nothing to re-confirm 409); no blank is ever saved (400).
// Rules only, no AI (US$0). Sample values. The pack on the configured checkpoint is acceptance/C6.18.test.ts.
//   zsh studio/tools/isolated.sh rt_c618 4435 start && tsx studio/tests/check_c618_officer_background.ts 4435 xr_studio_rt_c618
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { awaitsClient, backgroundBlock, backgroundFacts } from "../engine/runtime/background.ts";
import { confirmation, type Answer, type Participant } from "../engine/runtime/case.ts";
import { readiness } from "../engine/runtime/forms.ts";
import { missingLabel } from "../engine/runtime/readiness.ts";
import type { Snapshot } from "../engine/snapshot.ts";
import type { QuestionnaireView } from "../contracts/runtime.ts";
import { client, recorder } from "./runtime/api.ts";
const { prepareC44 } = createRequire(import.meta.url)("./runtime/prepare_c44.cjs") as { prepareC44: (port: number, db: string) => void };

const PORT = Number(process.argv[2] ?? 4435), DB = process.argv[3] ?? "xr_studio_rt_c618";
const { ok, summary } = recorder();
const OFFICER = "user-O", CLIENT = "user-P", CLIENT_B = "user-Q";

// ── R1 on the engine, from IMM 5257's own reading (the file the release names).
const SOLUTION = join(import.meta.dirname, "..", "..", "..");
const fields = (JSON.parse(readFileSync(join(SOLUTION, "prototype/p1/inventory/imm5257e.inventory.json"), "utf8")) as { fields: { data_path?: string | null; section?: string | null; heading?: string | null; ui?: string | null }[] }).fields;
const block = backgroundBlock(fields);
const CRIME = "form1[0].Page3[0].PageWrapper[0].BackgroundInfo3[0].Choice[0]", CRIME_DETAILS = "form1[0].Page3[0].PageWrapper[0].BackgroundInfo3[0].details[0]";
const consent = fields.find((f) => /Consent/.test(f.section ?? "") && f.data_path)?.data_path ?? "";
ok("C6.18-R1a pass: IMM 5257's Background information block holds its criminal-history question and its details box", block.has(CRIME) && block.has(CRIME_DETAILS), block.size);
ok("C6.18-R1b fail: the consent and declaration that follow it, and a box before it, are not in the block", !!consent && !block.has(consent) && !block.has(fields.find((f) => f.data_path)!.data_path!), consent);
ok("C6.18-R1c fail: a form with no Background information heading has no block", backgroundBlock(fields.filter((f) => (f.heading ?? "").trim().toUpperCase() !== "BACKGROUND INFORMATION")).size === 0);
const snap = (extra: Partial<Record<string, unknown>> = {}) => ({
  canonical_fields: [{ id: "person.crime" }, { id: "person.crime_details" }, { id: "person.name" }, { id: "person.declares", value_type: "declaration" }, { id: "person.medical" }],
  placements: [{ fact: "person.medical", client_only: true }, { fact: "person.declares", client_only: true }, { fact: "person.name" }],
  field_maps: [{ inventory_file: "imm5257e.inventory.json", entries: [{ fact: "person.crime", data_path: CRIME }, { fact: "person.crime_details", data_path: CRIME_DETAILS }, { fact: "person.name", data_path: fields.find((f) => f.data_path)!.data_path }, { fact: "person.declares", data_path: CRIME }] }],
  ...extra }) as unknown as Snapshot;
const bg = backgroundFacts(snap(), () => block);
ok("C6.18-R1d pass: facts mapped into the block and a client-only placement are background answers", bg.has("person.crime") && bg.has("person.crime_details") && bg.has("person.medical"), [...bg]);
ok("C6.18-R1e fail: a fact mapped outside the block, and a declaration (even client-only or mapped in the block), are not", !bg.has("person.name") && !bg.has("person.declares"), [...bg]);
ok("C6.18-R1f fail: a reading that cannot be read adds nothing (only the client-only section counts)", JSON.stringify([...backgroundFacts(snap(), () => null)]) === JSON.stringify(["person.medical"]));

// ── R2 on the engine.
const at = "2026-11-07T10:00:00.000Z";
const ans = (x: Partial<Answer>): Answer => ({ id: "a1", subjectId: "p1", field: "person.crime", rowKey: null, value: false, status: "DECLARED", channel: "agent_view", actor: OFFICER, at, origin: null, ...x });
ok("C6.18-R2a pass: an officer's background answer, and the officer's Confirm section of it, wait for the client", awaitsClient(ans({}), bg) && awaitsClient(ans({ status: "VERIFIED", channel: "confirm_section", origin: { channel: "agent_view", actor: OFFICER, at } }), bg));
ok("C6.18-R2b fail: the client's re-confirmation or own answer, or an officer's answer to a non-background fact, do not", !awaitsClient(ans({ channel: "client_reconfirm", actor: CLIENT }), bg) && !awaitsClient(ans({ channel: "questionnaire", actor: CLIENT }), bg) && !awaitsClient(ans({ field: "person.name" }), bg)
  && !awaitsClient(ans({ status: "VERIFIED", channel: "confirm_section", origin: { channel: "client_reconfirm", actor: CLIENT, at } }), bg));
const S = { canonical_fields: [], placements: [{ fact: "person.crime", collected_from: "client_questionnaire" }], field_maps: [] } as unknown as Snapshot;
const P: Participant = { subjectId: "p1", role: "principal", label: "Sample Client A", applies: true };
const waits = confirmation(S, ans({ status: "VERIFIED", channel: "confirm_section", awaitsClient: true }), P, null, new Date(at));
ok("C6.18-R2c fail: waiting for the client is never confirmed, even VERIFIED by the officer, and says why", !waits.confirmed && /re-confirm/.test(waits.why), waits);
const own = confirmation(S, ans({ channel: "client_reconfirm", actor: CLIENT }), P, null, new Date(at));
ok("C6.18-R2d pass: the principal's re-confirmation counts as the client's own answer", own.confirmed, own);

// ── R3 on the engine: the form's readiness names it.
const view = (a: Record<string, unknown>) => ({ sections: [{ subjectId: "p1", section: "bg", group: null, questions: [{ subjectId: "p1", fact: "person.crime", label: "Criminal offence", about_label: "Sample Client A", section: "bg", required: true, hidden: false, group: null, rows: [], fills: [{ form: "IMM 5257", subject: "p1" }], answer: { problems: [], ...a } }] }], checks: [] }) as unknown as QuestionnaireView;
const r3 = readiness(view({ confirmed: false, awaits_client: true }), "IMM 5257", "p1");
ok("C6.18-R3a pass: IMM 5257 is not ready while it waits, and says the client re-confirms it", !r3.ready && r3.missing[0]?.reason === "waits for the client to re-confirm", r3);
const r3b = readiness(view({ confirmed: false }), "IMM 5257", "p1");
ok("C6.18-R3b fail: any other unconfirmed answer keeps its own words", r3b.missing[0]?.reason === "not confirmed", r3b);
const words = missingLabel({ label: "Criminal offence", reason: "waits for the client to re-confirm" });
ok("C6.18-R3c pass: Ready to file's words name it as the client's to re-confirm", /recorded by staff, the client re-confirms it/.test(words), words);
ok("C6.18-R3d fail: any other missing fact keeps its label only", missingLabel({ label: "Criminal offence", reason: "not confirmed" }) === "Criminal offence");

// ── R4, R5 through the API.
(async () => {
  try { prepareC44(PORT, DB); } catch (e) { ok("setup: the copy is prepared (Visitor visa released, C4.4 Sample types added)", false, String(e)); summary(); process.exit(1); }
  const { call, sql } = client(PORT, DB);
  const vv = sql(`select id from combination where combination_key = 'vv.single'`);
  const c = await call("POST", "/runtime/cases", { combinationId: vv, reference: `C618-${Date.now().toString(36)}`, clientActor: CLIENT, principal: { displayName: "Sample Client A" } }, OFFICER);
  const id = c.body?.id as string, p = (c.body?.people ?? []).find((x: { role: string }) => x.role === "principal")?.subject_id as string;
  ok("setup: a Visitor visa case opens", c.status === 201 && !!p, c.body?.detail ?? c.status);
  type Q = { subjectId: string; fact: string; value_type: string; background?: boolean; hidden: boolean; group: string | null; answer: { id: string; awaits_client?: boolean; officer?: { by: string } | null } | null };
  const qs = async (actor: string, mode = "agent") => ((await call("GET", `/runtime/cases/${id}/questionnaire?mode=${mode}`, undefined, actor)).body?.sections ?? []).flatMap((s: { questions: Q[] }) => s.questions) as Q[];
  const decl = (await qs(OFFICER)).find((q) => q.subjectId === p && q.value_type === "declaration");
  let r = await call("PUT", `/runtime/cases/${id}/answers/${p}/${decl?.fact}`, { value: true, expectedId: null }, OFFICER);
  ok("C6.18-R4a fail: the officer cannot make the client's declaration (403, in words); nothing is stored", !!decl && r.status === 403 && /declaration/i.test(r.body?.detail ?? "") && sql(`select count(*) from client_canonical_answer where subject_id='${p}' and canonical_field_key='${decl?.fact}'`) === "0", r.body?.detail ?? r.status);
  r = await call("PUT", `/runtime/cases/${id}/answers/${p}/${decl?.fact}`, { value: true, expectedId: null }, CLIENT);
  ok("C6.18-R4b pass: the client makes it", r.status === 200, r.body?.detail ?? r.status);
  const b = (await qs(OFFICER)).find((q) => q.subjectId === p && q.background && !q.hidden && !q.group && q.value_type === "yes_no");
  ok("setup: the case has a background yes/no question (marked from the release's data)", !!b);
  if (!b) { summary(); process.exit(1); }
  const blanks = await Promise.all([null, ""].map(async (v) => (await call("PUT", `/runtime/cases/${id}/answers/${p}/${b.fact}`, { value: v, expectedId: null }, OFFICER)).status));
  ok("C6.18-R5a fail: no blank is saved for a background answer (400 for null and empty)", blanks.every((s) => s === 400), blanks);
  r = await call("PUT", `/runtime/cases/${id}/answers/${p}/${b.fact}`, { value: false, expectedId: null }, OFFICER);
  const a = (await qs(CLIENT, "sqr")).find((q) => q.subjectId === p && q.fact === b.fact)?.answer;
  ok("C6.18-R5b pass: the officer records it, marked Officer; the client's view shows it waiting for them", r.status === 200 && a?.officer?.by === OFFICER && a?.awaits_client === true, a);
  const tries = await Promise.all([[OFFICER, a?.id], [CLIENT_B, a?.id], [CLIENT, "00000000-0000-0000-0000-000000000000"]].map(async ([who, x]) => (await call("POST", `/runtime/cases/${id}/answers/${x}/reconfirm`, {}, who)).status));
  ok("C6.18-R5c fail: staff (403), another client (404) and an unknown answer (404) re-confirm nothing", JSON.stringify(tries) === "[403,404,404]", tries);
  r = await call("POST", `/runtime/cases/${id}/answers/${a?.id}/reconfirm`, {}, CLIENT);
  const after = (await qs(OFFICER)).find((q) => q.subjectId === p && q.fact === b.fact)?.answer;
  ok("C6.18-R5d pass: the client re-confirms it; it no longer waits and still shows who recorded it", r.status === 201 && after?.awaits_client === false && after?.officer?.by === OFFICER, { status: r.status, after });
  r = await call("POST", `/runtime/cases/${id}/answers/${after?.id}/reconfirm`, {}, CLIENT);
  ok("C6.18-R5e fail: nothing to re-confirm twice (409)", r.status === 409, r.status);
  summary();
  process.exit(process.exitCode ?? 0);
})();
