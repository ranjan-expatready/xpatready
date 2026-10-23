// P4 view rules on the released configurations (W1 3.7 r2–r4 and its acceptance, 7.2 r5, 8.1 r12; the released
// contract). No AI call, no server, no browser: buildViews is a pure function of a released configuration.
//   node tests/check_p4_views.ts
import { Ajv } from "ajv";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { buildViews, type Question } from "../p4/views.ts";

const P = join(import.meta.dirname, "..");
const read = (rel: string) => JSON.parse(readFileSync(join(P, rel), "utf8"));
const results: [string, boolean, string?][] = [];
const t = (name: string, pass: boolean, detail?: string) => results.push([name, pass, detail]);

const releases = ["c1-v1", "c1-v2", "c1-v3"].filter((r) => existsSync(join(P, "p3", "releases", r, "configuration.json")));
const v1 = read("p3/releases/c1-v1/configuration.json");
const NEVER = new Set(["staff_working_view", "profile_record", "existing_record"]);
const CLIENT = new Set(["client_questionnaire", "verified_document"]);
const pqrQs = (v: any): Question[] => v.pqr.blocks.flatMap((b: any) => b.questions);
const sqrQs = (v: any, a: string): Question[] => v.sqr[a].people.flatMap((p: any) => p.blocks.flatMap((b: any) => b.questions));
const clientQs = (v: any) => [...pqrQs(v), ...Object.keys(v.sqr).flatMap((a) => sqrQs(v, a))];

// The released contract: derived mechanically from the draft contracts, and every release meets it.
const ajv = new Ajv({ allErrors: true, strict: false });
for (const f of readdirSync(join(P, "contracts")).filter((x) => x.endsWith(".schema.json") && !x.startsWith("released-"))) ajv.addSchema(read(`contracts/${f}`));
const released = ajv.compile(read("contracts/released-configuration.v0.schema.json"));
let derivation = "";
try { derivation = execFileSync("python3", ["-I", join(P, "p4", "make_release_contract.py"), "--check"], { encoding: "utf8" }).trim(); } catch (e: any) { derivation = String(e.stdout ?? e.message); }
t("the released-configuration contract equals its derivation from the draft contracts (make_release_contract.py --check)", derivation.startsWith("PASS"), derivation);
for (const r of releases) { const ok = released(read(`p3/releases/${r}/configuration.json`)); t(`release ${r} meets the released-configuration contract`, ok === true, JSON.stringify(released.errors?.slice(0, 3))); }
const draft2 = read("p4/drafts/c1-draft-2.json");
t("a draft is not a release: c1-draft-2 fails the released contract (status)", released(draft2) === false && (released.errors ?? []).some((e) => e.instancePath === "/status"));

for (const r of releases) {
  const config = read(`p3/releases/${r}/configuration.json`);
  const v = buildViews(config);
  const place = new Map<string, any>(config.placements.map((p: any) => [p.fact, p]));
  const tag = `[${r}]`;

  // 3.7 r3, 7.2 r5, 8.1 r12: facts collected from staff or a profile record are never asked of a client.
  const leaked = clientQs(v).filter((q) => NEVER.has(place.get(q.fact)?.collected_from));
  t(`${tag} no staff, profile-record or existing-record fact appears in the PQR or any SQR (3.7 r3, 7.2 r5, 8.1 r12)`, leaked.length === 0, leaked.map((q) => q.fact).join(", "));
  const rep = clientQs(v).filter((q) => q.fact.startsWith("representative.") || q.about === "Representative");
  t(`${tag} no representative fact (the licence number included) appears in a client questionnaire (3.7 acceptance)`, rep.length === 0, rep.map((q) => q.fact).join(", "));
  const staffFacts = v.staff.flatMap((s: any) => s.facts);
  const neverRows = staffFacts.filter((f: any) => NEVER.has(f.collected_from));
  t(`${tag} the staff working view lists every staff and profile fact, marked never asked of a client (${neverRows.length}) (8.1 r12)`, neverRows.length === config.placements.filter((p: any) => NEVER.has(p.collected_from)).length && neverRows.every((f: any) => f.never_asked_of_client));
  t(`${tag} the staff working view holds the full set: every placement, every tier (${staffFacts.length})`, staffFacts.length === config.placements.length && new Set(staffFacts.map((f: any) => f.tier)).size === new Set(config.placements.map((p: any) => p.tier)).size);

  // 3.7 r2: the SQR asks the fewest questions.
  for (const a of Object.keys(v.sqr)) {
    const qs = sqrQs(v, a), c = v.sqr[a].counts;
    t(`${tag} ${a}: every SQR question is a client fact some released form reads, with its reason (3.7 r2, ready)`, qs.every((q) => CLIENT.has(place.get(q.fact)?.collected_from) && q.used_by.length > 0 && q.asked_because.length > 0));
    t(`${tag} ${a}: facts a verified document supplies are not asked, only asked if the document is missing (${c.from_documents}) (3.7 r2)`, qs.filter((q) => place.get(q.fact)?.collected_from === "verified_document").every((q) => q.status.startsWith("from an uploaded document")) && c.from_documents === qs.filter((q) => q.status.startsWith("from an uploaded")).length);
    t(`${tag} ${a}: counts add up (asked ${c.asked} + pre-filled ${c.prefilled} + documents ${c.from_documents} = ${qs.length})`, c.asked + c.prefilled + c.from_documents === qs.length);
  }

  // 3.7 r4: nothing is asked twice across the PQR and the SQR (the lead form is not built in the prototype).
  const pq = pqrQs(v);
  const pqrKeys = new Set(pq.map((q) => `${q.about}|${q.fact}`));
  t(`${tag} the PQR asks each fact once (${pq.length})`, pqrKeys.size === pq.length);
  for (const a of Object.keys(v.sqr)) {
    const qs = sqrQs(v, a), keys = qs.map((q) => `${q.about}|${q.fact}`);
    t(`${tag} ${a}: the SQR lists each fact about each person once`, new Set(keys).size === keys.length);
    const twice = qs.filter((q) => pqrKeys.has(`${q.about}|${q.fact}`) && q.status === "asked");
    t(`${tag} ${a}: nothing the PQR asked is asked again; it is pre-filled (3.7 r4)`, twice.length === 0 && qs.filter((q) => q.status === "pre-filled from the PQR").every((q) => pqrKeys.has(`${q.about}|${q.fact}`)), twice.map((q) => q.fact).join(", "));
  }
  t(`${tag} the PQR asks only prospect- and lead-tier client facts about the prospect or the application (6.1, 3.7 r1)`, pq.every((q) => ["prospect", "lead"].includes(q.tier) && place.get(q.fact)?.collected_from === "client_questionnaire" && ["Principal applicant", "The application (once per case)"].includes(q.about)));

  // 3.7 acceptance: marital status asked once in the PQR, pre-filled in the SQR, shown in the staff working view.
  const ms = "person.marital_status";
  t(`${tag} marital status: asked in the PQR, pre-filled in the principal's SQR, in the staff working view (3.7 acceptance)`,
    pq.some((q) => q.fact === ms && q.status === "asked") && sqrQs(v, "principal").some((q) => q.fact === ms && q.about === "Principal applicant" && q.status === "pre-filled from the PQR") && staffFacts.some((f: any) => f.fact === ms));

  // 3.7 action: each field's allowed values and the shortest character limit, from the forms' own boxes.
  const all = clientQs(v);
  const raw = all.filter((q) => q.allowed_values.some((x) => /^\*/.test(x) || /^(Y|N|0|1|2|true|false)$/.test(x)));
  t(`${tag} answer lists show what a person chooses, never box codes ("N", "1", "true") or the form's required-star`, raw.length === 0, raw.map((q) => `${q.fact}: ${q.allowed_values.slice(0, 4).join("|")}`).join("; "));
  const yesNo = all.filter((q) => q.used_by.length && q.allowed_values.length === 2 && q.allowed_values.every((x) => /^(yes|no)$/i.test(x)));
  t(`${tag} yes/no questions offer Yes and No (${yesNo.length})`, yesNo.length > 10);
  const sl = all.find((q) => q.fact === "case.service_language");
  t(`${tag} a looked-up list resolves to its labels: the service language offers English and French`, !!sl && sl.allowed_values.join("|") === "English|French", sl?.allowed_values.join("|"));
  // The reviewed merge (P2-M2) folded person.place_of_birth_country into person.country_of_birth.
  const countries = all.find((q) => q.fact === "person.country_of_birth" && q.allowed_values.length);
  t(`${tag} a country question offers the form's country list (${countries?.allowed_values.length})`, (countries?.allowed_values.length ?? 0) > 150);
  // Facts read only through part boxes (a fact also read whole elsewhere may carry that box's list and limit).
  const mapped = config.field_maps.flatMap((m: any) => m.entries).filter((e: any) => e.outcome === "mapped");
  const isPart = (e: any) => /_part:|\bderive/.test(String(e.transform ?? ""));
  const parts = new Set(mapped.filter((e: any) => /_part:/.test(String(e.transform ?? ""))).map((e: any) => e.fact).filter((f: string) => mapped.filter((e: any) => e.fact === f).every(isPart)));
  const partQs = all.filter((q) => parts.has(q.fact) && (q.allowed_values.length || q.shortest_limit));
  t(`${tag} a box that holds one part of a fact (an address's country or postal code, a phone's area code) lends the whole fact neither its answer list nor its limit (${parts.size} facts)`, parts.size > 0 && partQs.length === 0, partQs.map((q) => `${q.fact}: ${q.allowed_values.length} answers, limit ${q.shortest_limit?.chars}`).join("; "));
  const lim = all.filter((q) => q.shortest_limit);
  t(`${tag} a character limit, where shown, is the shortest of the boxes that read the fact (${lim.length} questions)`, lim.length > 0 && lim.every((q) => q.shortest_limit!.chars > 0));

  // Hand route and placement completeness.
  const unresolved = config.field_maps.flatMap((m: any) => m.entries).filter((e: any) => e.outcome === "unresolved").length;
  t(`${tag} every box no fact fills is on the hand route (${v.hand_route.length} of ${unresolved})`, v.hand_route.length === unresolved);
  t(`${tag} every fact a form reads is placed`, v.unplaced_facts.length === 0, v.unplaced_facts.join(", "));
}

// Regeneration from the reviewed-repairs configuration (P2 response): D20 and one question per meaning.
const latest = read(`p3/releases/${releases[releases.length - 1]}/configuration.json`);
const lv = buildViews(latest);
const detect = buildViews(read("p2/config/c1-draft-1-live-r2-detect.json"));
t("D20: IMM 1295 is completed for the partner too, so it is among the forms the partner's SQR serves (detection-only model output: principal only)",
  lv.sqr.partner.forms.some((f: any) => f.form.startsWith("IMM 1295")) && lv.sqr.principal.forms.some((f: any) => f.form.startsWith("IMM 1295")) && !detect.sqr.partner.forms.some((f: any) => f.form.startsWith("IMM 1295")));
const cobQs = (v: any) => sqrQs(v, "principal").filter((q) => q.about === "Principal applicant" && /^person\.(country_of_birth|place_of_birth_country)$/.test(q.fact));
const cob = cobQs(lv);
t("one country-of-birth question for the principal feeds both IMM 1295 and IMM 5707 (P2-M2)",
  cob.length === 1 && cob[0].fact === "person.country_of_birth" && ["IMM 1295", "IMM 5707"].every((f) => cob[0].used_by.some((u: any) => u.form.startsWith(f))));
t("the same-meaning duplicate is asked twice on the detection-only configuration, once after the reviewed merge", cobQs(detect).length === 2 && cob.length === 1, cobQs(detect).map((q) => q.fact).join(", "));

// Found on the regeneration (20 Oct): with IMM 1295 for each applicant (D20) the partner's form reads case- and
// relationship-scoped facts placed once per case. They are asked once, of the principal, about the application; the
// partner's IMM 1295 boxes are listed as readers of that one value. Whether each such fact really is one value per
// case (the intended job on the partner's own form, for example) is a field-review decision before P5 (D30).
const onceKeys = (v: any) => { const by = new Map<string, Set<string>>(); for (const a of Object.keys(v.sqr)) for (const q of sqrQs(v, a)) if (q.repeats === "once_per_case") by.set(q.fact, (by.get(q.fact) ?? new Set()).add(`${a}|${q.about}`)); return by; };
const ok = onceKeys(lv), twice = [...ok].filter(([, s]) => s.size > 1).map(([f]) => f);
const partnerReads = [...ok.keys()].filter((f) => sqrQs(lv, "principal").find((q) => q.fact === f)?.used_by.some((u: any) => u.form.startsWith("IMM 1295")) && latest.forms.find((x: any) => x.form_number === "IMM 1295")?.who === "each_applicant");
t(`every fact placed once per case is asked once, of the principal, about the application (${ok.size} facts), though both applicants' IMM 1295 read ${partnerReads.length} of them (3.7 r4, D20)`,
  twice.length === 0 && [...ok.values()].every((s) => [...s].every((k) => k === `principal|The application (once per case)`)) && partnerReads.length > 0, twice.join(", "));
const partnerOnce = sqrQs(lv, "partner").filter((q) => q.repeats === "once_per_case");
t("the partner's SQR asks no once-per-case fact again", partnerOnce.length === 0, partnerOnce.map((q) => q.fact).join(", "));

// D30 (P3P4-R1-M1): from release c1-v3 the job offer, permit type and intended work are each applicant's own. The
// principal and the partner each answer (or a document supplies) their own value; neither reads the other's.
if (releases.includes("c1-v3")) {
  const v3 = buildViews(read("p3/releases/c1-v3/configuration.json"));
  const own = (a: string, about: string) => sqrQs(v3, a).filter((q) => q.fact === "person.intended_job_title" && q.about === about);
  const p1 = own("principal", "Principal applicant"), p2 = own("partner", "Spouse or partner (also applying)");
  t("D30 [c1-v3]: the principal's and the partner's job titles are separate questions, each about its own applicant and read by that applicant's IMM 1295",
    p1.length === 1 && p2.length === 1 && [p1[0], p2[0]].every((q) => q.used_by.some((u: any) => u.form.startsWith("IMM 1295"))) && !sqrQs(v3, "principal").some((q) => q.fact === "person.intended_job_title" && q.about !== "Principal applicant"));
  const caseWide = sqrQs(v3, "partner").filter((q) => ["case.service_language", "case.country_where_applying", "relationship.start_date"].includes(q.fact));
  t("D30 [c1-v3]: service language, country where applying and the marriage date stay once per case (not asked of the partner)", caseWide.length === 0);
}

// 3.7 r5: rules, not AI. The view code calls no AI and names no form, fact or section; the same input gives the
// same views; a configuration change alone changes them.
const code = ["views.ts", "generate.ts"].map((f) => readFileSync(join(P, "p4", f), "utf8")).join("\n");
const bare = code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
t("the view code imports no AI SDK and makes no network call (3.7 r5)", !/anthropic|openai|fetch\(|https?:\/\/(?!www\.w3)/i.test(bare));
const named = bare.match(/IMM ?\d{4}|\b(?:person|case|relationship|representative)\.[a-z_]{3,}/g) ?? [];
t("the view code names no form and no fact: every form, fact and section comes from the configuration", named.length === 0, named.join(", "));
t("the same configuration gives the same views", JSON.stringify(buildViews(v1)) === JSON.stringify(buildViews(structuredClone(v1))));
const moved = structuredClone(v1);
const pm = moved.placements.find((p: any) => p.fact === "person.marital_status"); pm.collected_from = "staff_working_view";
const mv = buildViews(moved);
t("a configuration change alone: marital status set to 'collected from staff' leaves the PQR and both SQRs and stays in the staff view, never asked",
  !clientQs(mv).some((q) => q.fact === "person.marital_status") && mv.staff.flatMap((s: any) => s.facts).some((f: any) => f.fact === "person.marital_status" && f.never_asked_of_client));
const sl2 = structuredClone(v1); sl2.placements.find((p: any) => p.fact === "case.service_language").tier = "prospect";
const v2v = buildViews(sl2);
t("a configuration change alone: the service language at tier 'prospect' joins the PQR and is pre-filled in the SQR (the P4 change, in memory)",
  pqrQs(v2v).some((q) => q.fact === "case.service_language") && sqrQs(v2v, "principal").some((q) => q.fact === "case.service_language" && q.status === "pre-filled from the PQR"));

for (const [n, p, d] of results) console.log(`${p ? "PASS" : "FAIL"}  ${n}${!p && d ? ` — ${d.slice(0, 300)}` : ""}`);
const failed = results.filter(([, p]) => !p).length;
console.log(`${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
