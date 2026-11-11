// C6.12 /prepare API checks (M3-B2, runtime lane; r5c BR-1, BR-16, BR-18, contract §6): GET /api/runtime/cases/:id/prepare
// on a released Visitor visa. The filings, the family submission group and the form items are derived from the case and
// stored the first time, so each keeps its id across reads, people who stop applying and forms that stop applying; fee
// lines add up to what is paid; who may read it; 409 and "not derived". Each rule has a passing and a failing case. The
// check releases the Visitor visa itself (setup_visitor_visa.ts) when its copy has none. No model call (US$0).
//   zsh studio/tools/isolated.sh runtime_vps 4432 start && tsx studio/tests/check_vv_prepare_store_api.ts 4432 xr_studio_runtime_vps
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { snapshotHash } from "../engine/snapshot.ts";
import { client, recorder } from "./runtime/api.ts";

const PORT = Number(process.argv[2] ?? 4432), DB = process.argv[3] ?? "xr_studio_runtime_vps";
const { call, sql } = client(PORT, DB);
const { ok, summary } = recorder();
const OFFICER = "user-O", CLIENT = "user-P", AUTHOR = "user-A";
const run = Date.now().toString(36);
type Item = { id: string; kind: string; form: string; filing: string; subject: string; channel: string; accepts: string[]; signature: string; state: string; reason: string; version: number };
type Fee = { filing: string; subject: string; payer: string; line: string; amount: number; exempt: boolean; reason: string; source: string };
type P = { derived: boolean; version: string; portal: string | null; filings: { id: string; applicants: { subject: string; role: string; mode: string }[]; group: string }[]; groups: { id: string; kind: string; filings: string[]; splittable: boolean }[]; items: Item[]; fees: Fee[]; not_filing: { subject: string }[] };

(async () => {
  const released = () => sql("select count(*) from config_release r join combination k on k.id = r.combination_id where k.combination_key='vv.single'") !== "0";
  if (!released()) {
    const studio = join(import.meta.dirname, "..");
    execFileSync(join(studio, "node_modules", ".bin", "tsx"), ["--tsconfig", join(studio, "api", "tsconfig.json"), join(studio, "tests", "runtime", "setup_visitor_visa.ts"), String(PORT), DB], { stdio: ["ignore", "ignore", "inherit"], timeout: 600_000 });
    ok("setup: the Visitor visa released on this copy by setup_visitor_visa.ts", released());
  }
  const vv = sql("select id from combination where combination_key='vv.single'");
  const open = async (ref: string, people: { role: string; name: string }[]) => {
    const r = await call("POST", "/runtime/cases", { combinationId: vv, reference: `${ref}-${run}`, clientActor: CLIENT, principal: { displayName: "Sample Client A" } }, OFFICER);
    const id: string = r.body?.id; const subjects: Record<string, string> = {};
    for (const p of people) subjects[p.name] = (await call("POST", `/runtime/cases/${id}/people`, { role: p.role, displayName: p.name }, OFFICER)).body?.subject_id;
    subjects["Sample Client A"] = ((await call("GET", `/runtime/cases/${id}`, undefined, OFFICER)).body.people as { role: string; subject_id: string }[]).find((x) => x.role === "principal")!.subject_id;
    return { id, subjects };
  };
  const prep = async (id: string, who = OFFICER) => { const r = await call("GET", `/runtime/cases/${id}/prepare`, undefined, who); return { r, p: r.status === 200 ? r.body as P : null }; };
  const filingOf = (p: P | null, s: string) => p?.filings.find((f) => f.applicants[0].subject === s);
  // A line that waits for a date of birth (G15, VV-R15, #356) is not counted until it is answered.
  const sum = (p: P | null, re: RegExp) => (p?.fees ?? []).filter((f) => re.test(f.line) && !(f as { waiting?: unknown }).waiting).reduce((t, f) => t + (f.exempt ? 0 : f.amount), 0);

  const c = await open("VP", [{ role: "spouse_or_partner", name: "Sample Spouse A" }, { role: "child", name: "Sample Child A1" }]);
  const A = c.subjects["Sample Client A"], S = c.subjects["Sample Spouse A"], K = c.subjects["Sample Child A1"];
  let { r, p } = await prep(c.id);
  ok("C6.12 pass: the case officer reads /prepare (200), derived for the Visitor visa", r.status === 200 && p?.derived === true, r.body);
  ok("C6.12 fail: a client cannot read it (403)", (await prep(c.id, CLIENT)).r.status === 403);
  ok("C6.12 fail: a configuration person cannot (403)", (await prep(c.id, AUTHOR)).r.status === 403);
  ok("C6.12 fail: an unknown case is not found (404)", (await prep("00000000-0000-4000-8000-000000000000")).r.status === 404);
  ok("C6.12 BR-1 pass: three people, three filings, one applicant each, files_own (C11.12: the applicant's own mode is applying)", p?.filings.length === 3 && p.filings.every((f) => f.applicants.length === 1 && (f as { mode?: string }).mode === "files_own" && f.applicants[0].mode === "applying") && [A, S, K].every((s) => !!filingOf(p, s)), p?.filings);
  ok("C6.12 BR-16 pass: one family submission group with all three, splittable", p?.groups.length === 1 && p.groups[0].kind === "family" && p.groups[0].filings.length === 3 && p.groups[0].splittable === true, p?.groups);
  ok("C6.12 pass (data): filing, filing_applicant and submission_group rows match the view", sql(`select count(*) from filing where case_id='${c.id}' and active`) === "3" && sql(`select count(*) from filing_applicant fa join filing f on f.id=fa.filing_id where f.case_id='${c.id}'`) === "3" && sql(`select count(*) from submission_group where case_id='${c.id}'`) === "1");
  ok("C6.12 fail: nobody creates a filing by hand (POST …/filings is no route: 404 or 405)", [404, 405].includes((await call("POST", `/runtime/cases/${c.id}/filings`, { subject: A }, OFFICER)).status));

  // Ids and version are stable over reads.
  const first = p!;
  ({ p } = await prep(c.id));
  ok("C6.12 pass: a second read keeps every filing, group and item id and the version", JSON.stringify(p?.filings.map((f) => f.id)) === JSON.stringify(first.filings.map((f) => f.id)) && p?.groups[0].id === first.groups[0].id && JSON.stringify(p?.items.map((i) => i.id)) === JSON.stringify(first.items.map((i) => i.id)) && p?.version === first.version);
  const xmins = () => sql(`select string_agg(x, ',' order by x) from (select xmin::text || id::text x from filing where case_id='${c.id}' union all select i.xmin::text || i.id::text from filing_item i join filing f on f.id=i.filing_id where f.case_id='${c.id}') t`);
  const before = xmins(); await prep(c.id);
  ok("C6.12 review M1: a read with nothing new writes nothing (no row rewritten: xmin unchanged)", !!before && xmins() === before);
  ok("C6.12 fail (data): the second read stored nothing twice", sql(`select count(*) from filing where case_id='${c.id}'`) === "3" && sql(`select count(*) from filing_item i join filing f on f.id=i.filing_id where f.case_id='${c.id}'`) === String(first.items.length));

  // Items: each filing's forms, the combination line's channel, what IRCC accepts, the signature, the reason.
  const its = (s: string) => (p?.items ?? []).filter((i) => i.subject === s);
  ok("C6.12 items pass: each person files their own IMM 5257 on their own filing", [A, S, K].every((s) => its(s).some((i) => i.form === "IMM 5257" && i.filing === filingOf(p, s)?.id)), p?.items.map((i) => `${i.form}:${i.subject.slice(0, 4)}`));
  // The unified view (#356) also lists document and step items (C6.4 checklist, VV-R15 biometrics): these checks are the forms'.
  ok("C6.12 items: each item starts on its combination line's channel, lists the channels IRCC accepts and its signature, and says why it is there", (p?.items ?? []).filter((i) => (i as { kind?: string }).kind === "form").every((i) => i.channel === sql(`select coalesce(x->>'channel','PDF_UPLOAD') from pack_work_pin w join config_release r on r.id=w.config_release_id, jsonb_array_elements(r.snapshot->'forms') x where w.case_id='${c.id}' and x->>'form_number'='${i.form}'`) && i.accepts.length >= 1 && i.accepts.includes(i.channel) && !!i.signature && i.reason.length > 10));
  const inRelease = new Set(sql(`select string_agg(x->>'form_number', ',') from pack_work_pin w join config_release r on r.id=w.config_release_id, jsonb_array_elements(r.snapshot->'forms') x where w.case_id='${c.id}' and w.revision = (select max(z.revision) from pack_work_pin z where z.case_id = w.case_id)`).split(","));
  ok("C6.12 items (fail): no item names a form outside the case's release, or a person without a filing", (p?.items ?? []).every((i) => ((i as { kind?: string }).kind !== "form" || inRelease.has(i.form)) && p!.filings.some((f) => f.id === i.filing && f.applicants[0].subject === i.subject)));

  // Someone stops applying: no filing, fee or item; back again: the same filing and items.
  const fileK = filingOf(p, K)!.id, itemsK = its(K).map((i) => i.id).sort();
  await call("PATCH", `/runtime/cases/${c.id}/people/${K}`, { applies: false }, OFFICER);
  ({ p } = await prep(c.id));
  ok("C6.12 fail: a child not travelling has no filing, item or fee, and is listed with the reason", p?.filings.length === 2 && !filingOf(p, K) && !its(K).length && !(p?.fees ?? []).some((f) => f.subject === K) && (p?.not_filing ?? []).some((n) => n.subject === K && /not travelling/i.test((n as { why?: string }).why ?? "")));
  ok("C6.12 pass (data): the filing is kept inactive, not deleted", sql(`select active from filing where id='${fileK}'`) === "f");
  await call("PATCH", `/runtime/cases/${c.id}/people/${K}`, { applies: true }, OFFICER);
  ({ p } = await prep(c.id));
  ok("C6.12 pass: travelling again, the child gets the same filing and the same items back", filingOf(p, K)?.id === fileK && JSON.stringify(its(K).map((i) => i.id).sort()) === JSON.stringify(itemsK));
  ok("C6.12 pass: the other filings kept their ids throughout", [A, S].every((s) => filingOf(p, s)?.id === first.filings.find((f) => f.applicants[0].subject === s)?.id));

  // Review m1: a form that stops applying keeps its item (inactive) and gets it back with the same id and channel.
  const relC = sql(`select r.id from config_release r join pack_work_pin w on w.config_release_id = r.id where w.case_id = '${c.id}' and w.revision = (select max(z.revision) from pack_work_pin z where z.case_id = w.case_id)`);
  const snap = sql(`select snapshot->'forms' from config_release where id='${relC}'`);
  const item5707 = its(A).find((i) => i.form === "IMM 5707")?.id;
  // As a release without IMM 5707 would be: the snapshot and its fingerprint change together (break B2 refuses one alone).
  const refit = () => { const h = snapshotHash(JSON.parse(sql(`select snapshot::text from config_release where id='${relC}'`))); sql(`update config_release set sha256='${h}' where id='${relC}'`); pinHash(h); };
  // Test scaffolding only, on this isolated copy: the pin is frozen by a trigger (runtime_pin_frozen), so the check lifts
  // it for the one statement that stands in for "this case's release has no IMM 5707", and puts it back at once.
  const pinHash = (h: string) => sql(`alter table pack_work_pin disable trigger trg_pack_work_pin_frozen; update pack_work_pin set content_hash='${h}' where config_release_id='${relC}'; alter table pack_work_pin enable trigger trg_pack_work_pin_frozen`);
  const oldHash = sql(`select sha256 from config_release where id='${relC}'`);
  sql(`update config_release set snapshot = jsonb_set(snapshot, '{forms}', (select jsonb_agg(x) from jsonb_array_elements(snapshot->'forms') x where x->>'form_number' <> 'IMM 5707')) where id='${relC}'`);
  refit();
  try {
    ({ r, p } = await prep(c.id));
    ok("C6.12 review m1 (fail): a form that no longer applies is not listed; its item is kept inactive, not deleted", !!item5707 && !(p?.items ?? []).some((i) => i.form === "IMM 5707") && sql(`select active from filing_item where id='${item5707}'`) === "f", { r: r.status, body: r.status === 200 ? p?.items?.map((i) => i.form) : r.body });
  } finally { sql(`update config_release set snapshot = jsonb_set(snapshot, '{forms}', '${snap.replace(/'/g, "''")}'::jsonb), sha256='${oldHash}' where id='${relC}'`); pinHash(oldHash); }
  // Break B2: a snapshot edited without its fingerprint is refused (409) and nothing is stored from it.
  const itemsBefore = sql(`select count(*) from filing_item i join filing f on f.id=i.filing_id where f.case_id='${c.id}'`);
  sql(`update config_release set snapshot = jsonb_set(snapshot, '{forms,0,form_number}', '"IMM 5257 renamed"') where id='${relC}'`);
  try {
    r = (await prep(c.id)).r;
    ok("C6.12 break B2 (fail): a release snapshot edited after release is refused (409) and nothing is stored from it", r.status === 409 && /fingerprint/.test(r.body?.detail ?? "") && sql(`select count(*) from filing_item i join filing f on f.id=i.filing_id where f.case_id='${c.id}'`) === itemsBefore, r.body);
  } finally { sql(`update config_release set snapshot = jsonb_set(snapshot, '{forms}', '${snap.replace(/'/g, "''")}'::jsonb) where id='${relC}'`); }
  ok("C6.12 break B4 (fail): HEAD is refused (405), never answered by storing rows", (await fetch(`http://127.0.0.1:${PORT}/api/runtime/cases/${c.id}/prepare`, { method: "HEAD", headers: { "x-actor": OFFICER } })).status === 405);
  ({ p } = await prep(c.id));
  ok("C6.12 review m1 pass: when it applies again the same item comes back", its(A).find((i) => i.form === "IMM 5707")?.id === item5707);

  // Fees: what the lines add up to is what is paid; six people reach the family maximum, on the principal's filing.
  // #356 (G15, VV-R15): with no dates of birth yet, each biometrics line waits and is not counted (pack 4's C6.12 checks
  // the CAD 170 family maximum with dates of birth).
  ok("C6.12 BR-18 pass: three people: visitor visa CAD 300; biometrics waits for the dates of birth (not counted); each line cites IRCC's fee page", sum(p, /visitor visa/i) === 300 && sum(p, /biometrics/i) === 0 && (p?.fees ?? []).filter((f) => /biometrics/i.test(f.line)).every((f) => !!(f as { waiting?: unknown }).waiting) && (p?.fees ?? []).every((f) => /canada\.ca/.test(f.source) && !!f.reason));
  const six = await open("VP6", [{ role: "spouse_or_partner", name: "Sample Spouse B" }, ...[1, 2, 3, 4].map((n) => ({ role: "child", name: `Sample Child B${n}` }))]);
  const q = (await prep(six.id)).p;
  const lead = filingOf(q, six.subjects["Sample Client A"])?.id;
  ok("C6.12 BR-18 pass: six people pay the CAD 500 maximum once, on the principal's filing; the other five are exempt with the reason", sum(q, /visitor visa/i) === 500 && (q?.fees ?? []).filter((f) => /visitor visa/i.test(f.line) && !f.exempt).every((f) => f.filing === lead) && (q?.fees ?? []).filter((f) => /visitor visa/i.test(f.line) && f.exempt).length === 5, q?.fees);
  ok("C6.12 BR-18 (fail): no fee line names a filing that is not in the view", (q?.fees ?? []).every((f) => q!.filings.some((x) => x.id === f.filing)));

  // Two first reads at once make one group and one filing per person.
  const twin = await open("VPT", [{ role: "spouse_or_partner", name: "Sample Spouse C" }]);
  const both = await Promise.all([prep(twin.id), prep(twin.id), prep(twin.id)]);
  ok("C6.12 pass (concurrency): three first reads at once store one group and two filings, and agree", both.every((x) => x.r.status === 200) && sql(`select count(*) from submission_group where case_id='${twin.id}'`) === "1" && sql(`select count(*) from filing where case_id='${twin.id}'`) === "2" && new Set(both.map((x) => x.p?.version)).size === 1, both.map((x) => x.r.status));

  // Break B1: many reads at once on one case all answer, and other routes stay quick.
  const burst = await Promise.all(Array.from({ length: 120 }, () => call("GET", `/runtime/cases/${twin.id}/prepare`, undefined, OFFICER)));
  ok("C6.12 break B1: 120 reads at once on one case all answer 200 (no transaction for a read with nothing new)", burst.every((x) => x.status === 200), [...new Set(burst.map((x) => x.status))]);

  // Review round 2 M1: reads that each have something to store, arriving together, never use up the connections.
  const fresh = await open("VPF", [{ role: "spouse_or_partner", name: "Sample Spouse F" }]);
  const firsts = await Promise.all(Array.from({ length: 24 }, () => prep(fresh.id)));
  ok("C6.12 review R2-M1: 24 first reads at once on one new case all answer 200, one group and two filings stored", firsts.every((x) => x.r.status === 200) && sql(`select count(*) from submission_group where case_id='${fresh.id}'`) === "1" && sql(`select count(*) from filing where case_id='${fresh.id}'`) === "2", [...new Set(firsts.map((x) => x.r.status))]);
  const many = await Promise.all(Array.from({ length: 12 }, (_, i) => open(`VPM${i}`, [])));
  const t0 = Date.now();
  const reads = await Promise.all(many.map((m) => prep(m.id)));
  ok("C6.12 review R2-M1: 12 new cases read at once all answer 200 within seconds, one group each", reads.every((x) => x.r.status === 200) && Date.now() - t0 < 8000 && many.every((m) => sql(`select count(*) from submission_group where case_id='${m.id}'`) === "1"), { statuses: [...new Set(reads.map((x) => x.r.status))], ms: Date.now() - t0 });
  const order = (await prep(six.id)).p?.filings.map((f) => f.applicants[0].subject);
  ok("C6.12 review R2-m1: filings follow the order of the people on the case", JSON.stringify(order) === JSON.stringify(["Sample Client A", "Sample Spouse B", "Sample Child B1", "Sample Child B2", "Sample Child B3", "Sample Child B4"].map((n) => six.subjects[n])), order);

  // 409 when the release no longer names the case's combination; another combination: its filings from its release.
  const rel = sql(`select r.id from config_release r join pack_work_pin w on w.config_release_id = r.id where w.case_id = '${c.id}' and w.revision = (select max(z.revision) from pack_work_pin z where z.case_id = w.case_id)`);
  sql(`update config_release set snapshot = jsonb_set(snapshot, '{combination,key}', '"wp.family"') where id = '${rel}'`);
  try {
    r = (await prep(c.id)).r;
    ok("C6.12 fail: a release that no longer names the case's combination is refused (409), nothing prepared", r.status === 409 && /does not describe the case's own combination/.test(r.body?.detail ?? ""), r.body);
  } finally { sql(`update config_release set snapshot = jsonb_set(snapshot, '{combination,key}', '"vv.single"') where id = '${rel}'`); }
  ok("C6.12 pass: it reads again once the release is as released", (await prep(c.id)).r.status === 200);
  const wp = sql("select c.id from combination c where c.combination_key='wp.family' and exists (select 1 from config_release r where r.combination_id=c.id)");
  if (wp) {
    const other = (await call("POST", "/runtime/cases", { combinationId: wp, reference: `VP-WP-${run}`, clientActor: CLIENT, principal: { displayName: "Sample Client W" } }, OFFICER)).body?.id as string;
    const o = await prep(other);
    // C11.12 (P-233, BR-10, challenge M3): a release with filing modes but no fee rule gets its filings, with words that
    // say no fee line is set (M3-S1) and no fee line, never CAD 0. A release with no modes and no fee row is not derived ("no filing or fee is worked out")
    // (tests/runtime/check_vv_filings.ts).
    ok("C11.12 BR-10 pass (M3-S1 words): another combination with filing modes (wp.family, Sample) gets its filing, no fee line, and words that say no fee line is set", o.r.status === 200 && o.r.body.derived === true && o.r.body.filings?.length === 1 && (o.r.body.fees ?? []).length === 0 && o.r.body.fees_worked_out === false && /No fee lines in the fee table for .* yet, so no fee is charged/.test(o.r.body.fees_why ?? ""), o.r.body);
    ok("C11.12 BR-10 fail: nothing on it reads as an amount (no CAD 0 anywhere)", !/CAD 0\b/.test(JSON.stringify(o.r.body)));
  } else ok("C11.12 BR-10: another combination with filing modes (no other released combination on this copy)", false, "release wp.family first");
  process.exitCode = summary() ? 1 : 0;
})().catch((e) => { console.error(e); process.exit(1); });
