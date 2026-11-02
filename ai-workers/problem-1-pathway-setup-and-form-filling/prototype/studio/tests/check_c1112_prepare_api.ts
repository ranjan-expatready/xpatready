// C11.12 filing modes, PR 2 (P-233; concept r2 BR-4, BR-6, BR-10; challenge M1, M2): the stored prepare view on a
// released Visitor visa whose child is On the principal's application (saved with its warning, P-233 (3)). The child is
// an applicant on the principal's filing (no filing of their own), its forms sit on that filing, each applicant carries
// their own mode, the travelling switch moves the child between applying and declared only with the same filing id, and
// the database refuses a mode outside the widened checks. Each rule has a passing and a failing case. The check releases
// the Visitor visa itself (setup_visitor_visa.ts) when its copy has none. No model call (US$0).
//   zsh studio/tools/isolated.sh screens_c1112p 4441 start && tsx studio/tests/check_c1112_prepare_api.ts 4441 xr_studio_screens_c1112p
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { client, recorder } from "./runtime/api.ts";

const PORT = Number(process.argv[2] ?? 4441), DB = process.argv[3] ?? "xr_studio_screens_c1112p";
const { call, sql } = client(PORT, DB);
const { ok, summary } = recorder();
const OFFICER = "user-O", CLIENT = "user-P", AUTHOR = "user-A", REVIEWER = "user-C", APPROVER = "user-B";
const run = Date.now().toString(36);
type P = { derived: boolean; filings: { id: string; mode: string; owner?: { subject: string; role: string }; applicants: { subject: string; role: string; mode: string }[]; group: string }[]; groups: { id: string; filings: string[]; splittable: boolean }[];
  items: { filing: string; subject: string; kind: string }[]; fees: { filing: string; payer: string; line: string; amount: number; exempt: boolean }[]; fees_worked_out: boolean };

(async () => {
  const released = () => sql("select count(*) from config_release r join combination k on k.id = r.combination_id where k.combination_key='vv.single'") !== "0";
  if (!released()) {
    const studio = join(import.meta.dirname, "..");
    execFileSync(join(studio, "node_modules", ".bin", "tsx"), ["--tsconfig", join(studio, "api", "tsconfig.json"), join(studio, "tests", "runtime", "setup_visitor_visa.ts"), String(PORT), DB], { stdio: ["ignore", "ignore", "inherit"], timeout: 600_000 });
    ok("setup: the Visitor visa released on this copy by setup_visitor_visa.ts", released());
  }
  const vv = sql("select id from combination where combination_key='vv.single'");
  // The configuration: the child On the principal's application (a warning on the Visitor visa, never a refusal).
  const people = (await call("GET", `/combinations/${vv}/workspace?tab=questionnaires`, undefined, AUTHOR)).body?.people;
  const lines = (people?.lines ?? []).map((l: { role: string; label: string; min: number; max: number; applies: boolean; mayBeApplicant: boolean }) =>
    ({ role: l.role, label: l.label, min: l.min, max: l.max, applies: l.applies, ...(l.mayBeApplicant ? { filingMode: l.role === "child" ? "on_principal" : "files_own" } : {}) }));
  let r = await call("PATCH", `/combinations/${vv}/people`, { participants: lines, version: people?.version ?? 0, confirmRemove: true }, AUTHOR);
  ok("setup: the child is saved On the principal's application, with the Guide 5256 warning", r.status < 300 && (r.body?.warnings ?? []).some((w: string) => /Guide 5256/.test(w)), r.body?.detail ?? r.body?.warnings);
  let refs: string[] = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    for (const c of (await call("GET", "/library/changes?status=WAITING", undefined, REVIEWER)).body ?? []) await call("POST", `/library/changes/${c.id}/approve`, {}, REVIEWER);
    await call("POST", `/combinations/${vv}/submit`, { note: "C11.12: child on the principal's application (Sample)" }, AUTHOR);
    const sub = (await call("GET", `/combinations/${vv}/review`, undefined, REVIEWER)).body?.submission;
    refs = (sub?.changeSummary ?? []).map((x: { kind: string; key: string }) => `${x.kind}|${x.key}`);
    await call("POST", `/combinations/${vv}/signoff`, { items: refs, action: "signed" }, REVIEWER);
    r = await call("POST", `/combinations/${vv}/approve`, undefined, APPROVER);
    if (!/changed while it was being released/.test(r.body?.detail ?? "")) break;
  }
  const snapMode = sql(`select x->>'filingMode' from config_release r, jsonb_array_elements(r.snapshot->'combination'->'participants') x where r.combination_id='${vv}' and x->>'role'='child' order by r.version desc limit 1`);
  ok("setup: released with the child On the principal's application", r.status < 300 && snapMode === "on_principal", r.body?.detail ?? snapMode);

  const open = await call("POST", "/runtime/cases", { combinationId: vv, reference: `C1112-${run}`, clientActor: CLIENT, principal: { displayName: "Sample Client A" } }, OFFICER);
  const id: string = open.body?.id;
  const S = (await call("POST", `/runtime/cases/${id}/people`, { role: "spouse_or_partner", displayName: "Sample Spouse A" }, OFFICER)).body?.subject_id;
  const K = (await call("POST", `/runtime/cases/${id}/people`, { role: "child", displayName: "Sample Child A1" }, OFFICER)).body?.subject_id;
  const A = ((await call("GET", `/runtime/cases/${id}`, undefined, OFFICER)).body.people as { role: string; subject_id: string }[]).find((x) => x.role === "principal")!.subject_id;
  const prep = async () => (await call("GET", `/runtime/cases/${id}/prepare`, undefined, OFFICER)).body as P;
  let p = await prep();
  const main = () => p.filings.find((f) => f.owner?.subject === A)!;
  ok("C11.12 BR-6 pass: 3 people, 2 filings: the principal's (principal + child, both applying) and the spouse's own", p.derived && p.filings.length === 2 && main().applicants.length === 2 && main().applicants.every((a) => a.mode === "applying") && p.filings.some((f) => f.owner?.subject === S), p.filings);
  ok("C11.12 BR-6 fail: the child has no filing of their own (on_principal is never a filing mode)", !p.filings.some((f) => f.owner?.subject === K) && p.filings.every((f) => f.mode === "files_own"));
  ok("C11.12 M1 pass: the child's forms are on the principal's filing, never dropped", p.items.some((i) => i.subject === K && i.kind === "form" && i.filing === main().id), p.items.filter((i) => i.subject === K));
  ok("C11.12 M1 pass (data): filing_applicant holds the child on the principal's filing, applying", sql(`select fa.mode from filing_applicant fa join filing f on f.id=fa.filing_id where f.case_id='${id}' and f.subject_id='${A}' and fa.subject_id='${K}'`) === "applying");
  ok("C11.12 M2 pass: the visa fee counts the 3 people across the 2 filings, one line each", p.fees.filter((f) => f.line === "Visitor visa fee").length === 3 && p.fees_worked_out === true, p.fees.map((f) => `${f.line}:${f.payer.slice(0, 4)}:${f.amount}`));
  const id0 = main().id;

  r = await call("PATCH", `/runtime/cases/${id}/people/${K}`, { applies: false }, OFFICER);
  p = await prep();
  const child = () => main().applicants.find((a) => a.subject === K);
  ok("C11.12 BR-6 pass: not travelling → the child stays on the same filing, declared only", r.status < 300 && main().id === id0 && child()?.mode === "declared_only", p.filings);
  ok("C11.12 BR-10 pass: a declared-only child has no fee line", !p.fees.some((f) => f.payer === K) && p.fees.filter((f) => f.line === "Visitor visa fee").length === 2);
  ok("C11.12 M1 pass (data): the applicant row says declared_only (the widened check holds it)", sql(`select fa.mode from filing_applicant fa join filing f on f.id=fa.filing_id where f.case_id='${id}' and fa.subject_id='${K}'`) === "declared_only");
  ok("C11.12 (Not built, said): a declared-only child gets no forms yet", !p.items.some((i) => i.subject === K && i.kind === "form"));
  r = await call("PATCH", `/runtime/cases/${id}/people/${K}`, { applies: true }, OFFICER);
  p = await prep();
  ok("C11.12 BR-6 pass: travelling again → applying, same filing id", main().id === id0 && child()?.mode === "applying" && p.items.some((i) => i.subject === K && i.kind === "form" && i.filing === id0));

  // Release 2 of this check: a co-filing Sponsor (1 to 1) and the child Declared only (review M3: each server rule tested).
  const v2 = (await call("GET", `/combinations/${vv}/workspace?tab=questionnaires`, undefined, AUTHOR)).body?.people;
  const lines2 = [...(v2?.lines ?? []).filter((l: { role: string }) => l.role !== "sponsor").map((l: { role: string; label: string; min: number; max: number; applies: boolean; mayBeApplicant: boolean }) =>
    ({ role: l.role, label: l.label, min: l.min, max: l.max, applies: l.role === "child" ? false : l.applies, ...(l.mayBeApplicant ? { filingMode: l.role === "child" ? "declared_only" : "files_own" } : {}) })),
    { role: "sponsor", label: "Sponsor", min: 1, max: 1, applies: false, filingMode: "co_files" }];
  r = await call("PATCH", `/combinations/${vv}/people`, { participants: lines2, version: v2?.version ?? 0, confirmRemove: true }, AUTHOR);
  ok("setup 2: Sponsor co-files, child Declared only (saved, with the Guide 5256 warning)", r.status < 300, r.body?.detail);
  for (let attempt = 0; attempt < 2; attempt++) {
    for (const c of (await call("GET", "/library/changes?status=WAITING", undefined, REVIEWER)).body ?? []) await call("POST", `/library/changes/${c.id}/approve`, {}, REVIEWER);
    await call("POST", `/combinations/${vv}/submit`, { note: "C11.12: sponsor co-files (Sample)" }, AUTHOR);
    const sub = (await call("GET", `/combinations/${vv}/review`, undefined, REVIEWER)).body?.submission;
    await call("POST", `/combinations/${vv}/signoff`, { items: (sub?.changeSummary ?? []).map((x: { kind: string; key: string }) => `${x.kind}|${x.key}`), action: "signed" }, REVIEWER);
    r = await call("POST", `/combinations/${vv}/approve`, undefined, APPROVER);
    if (!/changed while it was being released/.test(r.body?.detail ?? "")) break;
  }
  ok("setup 2: released", r.status < 300, r.body?.detail);
  const id2: string = (await call("POST", "/runtime/cases", { combinationId: vv, reference: `C1112B-${run}`, clientActor: CLIENT, principal: { displayName: "Sample Client B" } }, OFFICER)).body?.id;
  const S2 = (await call("POST", `/runtime/cases/${id2}/people`, { role: "spouse_or_partner", displayName: "Sample Spouse B" }, OFFICER)).body?.subject_id;
  const kidAdd = (await call("POST", `/runtime/cases/${id2}/people`, { role: "child", displayName: "Sample Child B1" }, OFFICER)).body;
  const spAdd = (await call("POST", `/runtime/cases/${id2}/people`, { role: "sponsor", displayName: "Sample Sponsor B", applies: true }, OFFICER)).body;
  ok("C11.12 BR-6 pass: a child of a Declared only role, added without saying, starts as not travelling", kidAdd?.applies === false, kidAdd);
  ok("C11.12 BR-6 / break M2 pass: a co-filing sponsor is stored as not travelling even when the request says travelling", spAdd?.applies === false, spAdd);
  const p2 = (await call("GET", `/runtime/cases/${id2}/prepare`, undefined, OFFICER)).body as P;
  const A2 = ((await call("GET", `/runtime/cases/${id2}`, undefined, OFFICER)).body.people as { role: string; subject_id: string }[]).find((x) => x.role === "principal")!.subject_id;
  const main2 = p2.filings.find((f) => f.owner?.subject === A2)!, spons = p2.filings.find((f) => f.mode === "co_filed");
  ok("C11.12 BR-4 pass: the sponsorship is its own co_filed filing in the principal's group (still splittable: the spouse's own filing may leave, review n1)", !!spons && spons.owner?.subject === spAdd?.subject_id && spons.group === main2.group && p2.groups.find((g) => g.id === main2.group)?.splittable === true, p2.filings.map((f) => `${f.mode}:${f.owner?.role}:${f.group.slice(0, 6)}`));
  ok("C11.12 break M2 fail: the sponsor gets no applicant's biometrics step and no applicant's forms", !p2.items.some((i) => i.subject === spAdd?.subject_id && (i.kind === "step" || i.kind === "document")), p2.items.filter((i) => i.subject === spAdd?.subject_id));
  ok("C11.12 BR-6 pass: the declared-only child is on the principal's filing, declared only", main2.applicants.some((a) => a.subject === kidAdd?.subject_id && a.mode === "declared_only"));
  r = await call("PATCH", `/runtime/cases/${id2}/people/${spAdd?.subject_id}`, { applies: true }, OFFICER);
  ok("C11.12 BR-6 fail: the sponsor's travelling switch is refused (422, in words)", r.status === 422 && /always sent with the principal's/.test(r.body?.detail ?? ""), r.body);
  const ver = (await call("GET", `/runtime/cases/${id2}/prepare`, undefined, OFFICER)).body?.version;
  r = await call("POST", `/runtime/groups/${main2.group}/split`, { filing: spons!.id, reason: "test", version: ver }, OFFICER);
  ok("C11.12 BR-4 fail: splitting the sponsorship out is refused (409, in words)", r.status === 409 && /sent together and cannot be split/.test(r.body?.detail ?? ""), r.body);
  r = await call("POST", `/runtime/groups/${main2.group}/split`, { filing: main2.id, reason: "test", version: ver }, OFFICER);
  ok("C11.12 BR-4 fail: splitting the principal's filing away from the sponsorship is refused (409)", r.status === 409, r.body);
  const spouseFiling = p2.filings.find((f) => f.owner?.subject === S2)!;
  r = await call("POST", `/runtime/groups/${main2.group}/split`, { filing: spouseFiling.id, reason: "Travelling later (test)", version: ver }, OFFICER);
  ok("C11.12 break m5 pass: the spouse's own filing can still be split out of a group with a sponsorship", r.status === 200 && (r.body as P).filings.find((f) => f.id === spouseFiling.id)?.group !== main2.group, r.body?.detail ?? r.status);
  ok("C11.12 review n1 fail: once only the principal's filing and the sponsorship remain, the group is not splittable", (r.body as P).groups?.find((g) => g.id === main2.group)?.splittable === false, (r.body as P).groups);

  // Review M1 of PR 3 (n3): the setup checklist's people step shows a Fix item for a role with no filing mode, in the
  // running app (GET …/summary), and none once every applicant role has one.
  const peopleStep = async () => (await call("GET", `/combinations/${vv}/summary`, undefined, AUTHOR)).body?.setup?.steps?.find((x: { key: string }) => x.key === "people");
  ok("C11.12 n3 pass: with every applicant role's mode set, the people step has no Fix item", !(await peopleStep())?.open?.some((i: { kind: string }) => i.kind === "fix_problems"), (await peopleStep())?.open);
  const v3 = (await call("GET", `/combinations/${vv}/workspace?tab=questionnaires`, undefined, AUTHOR)).body?.people;
  r = await call("PATCH", `/combinations/${vv}/people`, { participants: v3.lines.map((l: { role: string; label: string; min: number; max: number; applies: boolean; filingMode: string | null }) => ({ role: l.role, label: l.label, min: l.min, max: l.max, applies: l.role === "child" ? true : l.applies, ...(l.filingMode && l.role !== "child" ? { filingMode: l.filingMode } : {}) })), version: v3.version, confirmRemove: true }, AUTHOR);
  const ps = await peopleStep();
  ok("C11.12 n3 fail: the child with no mode → the people step shows 'Fix 1 problem' (focus: the people card)", ps?.state !== "done" && ps?.open?.some((i: { kind: string; focus?: string }) => i.kind === "fix_problems" && i.focus === "people:card"), ps);

  // The widened checks (migration 20261102170000_c1112_filing_modes): the new values hold, anything else is refused.
  const refused = (q: string) => { try { sql(q); return false; } catch { return true; } };
  ok("C11.12 migration fail: an applicant mode outside applying/declared_only is refused by the database", refused(`update filing_applicant set mode='sometimes' where subject_id='${K}'`));
  ok("C11.12 migration fail: a filing mode outside files_own/on_principal/co_filed is refused by the database", refused(`update filing set mode='on_principal_applying' where case_id='${id}'`));
  ok("C11.12 migration pass: co_filed is a filing mode the database accepts", !refused(`begin; update filing set mode='co_filed' where id='${id0}'; rollback;`));
  process.exit(summary() ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
