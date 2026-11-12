// BK-10 (P-448, P-452; Bake plan row 24): which forms a filing needs, and their rules, come from data, not code. The
// three combinations api/src/form-setup.ts used to hold as code (the Visitor visa, With an LMIA inside Canada and the
// Study permit outside Canada) are read from samples/form-setup.json like the two after them, so a combination's form
// rules change by a data edit alone; a bad data entry fails the read with words, never a line without its rule's words.
// Pure: reads files and changed copies in a temporary folder; no server, no database.
//   tsx studio/tests/check_bk10_form_rules_data.ts
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FAMILY_FORM_BY_CHANNEL, FORM_SETUP, FORM_SETUP_FILE, formSetupFrom, type SetupData } from "../api/src/form-setup.ts";

let pass = 0, fail = 0;
const ok = (n: string, c: boolean, d?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  BK-10: ${n}${!c && d !== undefined ? ` — ${JSON.stringify(d).slice(0, 400)}` : ""}`); };
const DATA = JSON.parse(readFileSync(FORM_SETUP_FILE, "utf8")) as SetupData;
const DIR = mkdtempSync(join(tmpdir(), "bk10-"));
let n = 0;
/** The table read from a changed copy of the data (the real file is never touched). */
const readChanged = (change: (d: SetupData) => void) => { const d = structuredClone(DATA); change(d); const f = join(DIR, `form-setup-${++n}.json`); writeFileSync(f, JSON.stringify(d)); return formSetupFrom(f); };
const refusal = (change: (d: SetupData) => void) => { try { readChanged(change); return null; } catch (e) { return String((e as Error).message); } };
const forms = (key: string, t = FORM_SETUP) => (t[key]?.rules ?? []).map((r) => r.form);

try {
  // The data holds every combination the table has, the three BK-10 moved first, in the order the checkpoint sets them up.
  const KEYS = Object.keys(DATA.combinations);
  ok("the table holds exactly the data's combinations, the three moved from code first", JSON.stringify(Object.keys(FORM_SETUP)) === JSON.stringify(KEYS) && KEYS.slice(0, 3).join() === "vv.single,wp.lmia_inside,sp.outside", KEYS);
  ok("each moved combination keeps its application form, its rules, its rule facts and where its documents come from",
    FORM_SETUP["vv.single"].application === "IMM 5257" && forms("vv.single").join() === "IMM 5257 SCH1,IMM 5409,IMM 5476,IMM 5475,IRM 0002" && FORM_SETUP["vv.single"].documentsFromChecklist === "IMM 5484"
    && FORM_SETUP["wp.lmia_inside"].application === "IMM 5710" && forms("wp.lmia_inside").join() === "IMM 5409,IMM 5476,IMM 5475" && FORM_SETUP["wp.lmia_inside"].documentsFromReviewedRelease === true
    && FORM_SETUP["sp.outside"].application === "IMM 1294" && forms("sp.outside").join() === "IMM 5646,IMM 5409,IMM 5476,IMM 5475,IMM 1294,IMM 1295,IMM 5257" /* BK-16 PR 2 (P-490, QA-416): each family member's form follows their own application: IMM 1294 for the student and each child who studies, IMM 1295 for the spouse, IMM 5257 for a child who does not */ && FORM_SETUP["sp.outside"].documentsCited?.length === 5 /* BK-13 step 1 added IMM 5483 items 5 and 7 */
    && FORM_SETUP["sp.outside"].ruleFacts?.map((f) => f.fact).join() === "person.minor_studying_without_parent,case.uses_representative,case.authorizes_release_to_designated_individual"
    && !!FORM_SETUP["vv.single"].family && !!FORM_SETUP["sp.outside"].family && !FORM_SETUP["fs.spouse"].family,
    Object.fromEntries(KEYS.map((k) => [k, forms(k)])));
  ok("the family information form by channel is data: IMM 5707 on paper, IMM 5645 online, each with the other one and its words",
    FAMILY_FORM_BY_CHANNEL.paper.form === "IMM 5707" && FAMILY_FORM_BY_CHANNEL.paper.other === "IMM 5645" && FAMILY_FORM_BY_CHANNEL.online.form === "IMM 5645" && FAMILY_FORM_BY_CHANNEL.online.other === "IMM 5707" && FAMILY_FORM_BY_CHANNEL.online.cite.includes("18 years of age or older"));
  const lmia = FORM_SETUP["wp.lmia_inside"].documentSources;
  ok("With an LMIA's documents: a line not on IMM 5556 is labelled Sample with its source in words, read from the data",
    !!lmia && lmia.checklist.startsWith("IMM 5556") && Object.keys(lmia.cited).length === 3 && lmia.sample("q", "p1/inventory/imm5488e.text.inventory.json").includes("IMM 5488, the checklist for workers outside Canada")
    && lmia.sample("q", null).includes("a source it does not name") && lmia.sample("q", "x/other.text.inventory.json").includes("from other,"));

  // Every rule keeps its words (P-170): each rule's cite is IRCC's, in the data, and the code file names none of them.
  const code = readFileSync(join(import.meta.dirname, "..", "api", "src", "form-setup.ts"), "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
  const named = [...KEYS, ...new Set(Object.values(DATA.combinations).flatMap((c) => [c.application, ...c.rules.map((r) => r.form)]))].filter((s) => code.includes(`"${s}"`) || code.includes(`'${s}'`) || code.includes(`\`${s}\``));
  ok("api/src/form-setup.ts names no combination and no form outside its comments (only the data does)", named.length === 0, named);
  ok("every rule of every combination has a form and IRCC's words (P-170), in the data", Object.values(FORM_SETUP).every((s) => s.rules.every((r) => r.form && r.cite.length > 20)));

  // Pass: a combination's form rules change by data alone. The Study permit's custodianship rule moves to a minimum age
  // instead of its fact, and a new cited rule is added; nothing else in the table moves.
  const changed = readChanged((d) => {
    const sp = d.combinations["sp.outside"];
    sp.rules = [...sp.rules.filter((r) => r.form !== "IMM 5646"), { form: "IMM 5645", minAge: 18, cite: "Sample (BK-10 test): a rule added by a data edit alone" }];
    sp.ruleFacts = (sp.ruleFacts ?? []).filter((k) => k !== "person.minor_studying_without_parent");
  });
  ok("pass: a data edit alone changes the Study permit's form rules and rule facts, and only those",
    forms("sp.outside", changed.setup).join() === "IMM 5409,IMM 5476,IMM 5475,IMM 1294,IMM 1295,IMM 5257,IMM 5645" /* BK-16 PR 2: the family members' rules stay */ && changed.setup["sp.outside"].rules.at(-1)?.minAge === 18
    && !changed.setup["sp.outside"].ruleFacts?.some((f) => f.fact === "person.minor_studying_without_parent")
    && KEYS.filter((k) => k !== "sp.outside").every((k) => JSON.stringify(forms(k, changed.setup)) === JSON.stringify(forms(k))) && forms("sp.outside").includes("IMM 5646"),
    forms("sp.outside", changed.setup));
  const added = readChanged((d) => { d.combinations["sp.inside_test"] = { ...structuredClone(d.combinations["sp.outside"]), application: "IMM 5709" }; });
  ok("pass: a new combination is a data entry alone: it is in the table with its own rules and rule facts",
    added.setup["sp.inside_test"]?.application === "IMM 5709" && forms("sp.inside_test", added.setup).join() === forms("sp.outside") .join() && added.setup["sp.inside_test"].ruleFacts?.length === 3);

  // Fail: a bad data entry fails the read with words, never a rule without its words or a fact without its rule.
  const noCite = refusal((d) => { (d.combinations["vv.single"].rules[0] as { cite?: string }).cite = undefined; });
  ok("fail: a rule without IRCC's words is refused at the read, naming the combination", !!noCite?.includes("vv.single") && noCite.includes("a cite"), noCite);
  const orphan = refusal((d) => { const sp = d.combinations["sp.outside"]; sp.rules = sp.rules.filter((r) => r.form !== "IMM 5646"); });
  ok("fail: a rule fact whose form is no longer one of the combination's rules is refused (the fact never outlives its rule)", !!orphan?.includes("sp.outside") && orphan.includes("person.minor_studying_without_parent"), orphan);
  const unknown = refusal((d) => { d.combinations["wp.lmia_inside"].ruleFacts = ["case.not_a_fact"]; });
  ok("fail: a rule fact key the data does not hold is refused", !!unknown?.includes("wp.lmia_inside") && unknown.includes("case.not_a_fact"), unknown);
  const twoSources = refusal((d) => { d.combinations["vv.single"].documentsCited = structuredClone(d.combinations["sp.outside"].documentsCited); });
  ok("fail: a combination with two places its documents come from is refused", !!twoSources?.includes("vv.single") && twoSources.includes("at most one"), twoSources);
  const noOnline = refusal((d) => { (d.familyFormByChannel as { online?: unknown }).online = undefined; });
  ok("fail: a family form table without its online form is refused", !!noOnline?.includes("familyFormByChannel"), noOnline);
  const noApp = refusal((d) => { (d.combinations["wp.lmia_inside"] as { application?: string }).application = ""; });
  ok("fail: a combination without its application form is refused", !!noApp?.includes("wp.lmia_inside"), noApp);
  // Review m1: a misspelt name or a value of the wrong kind fails the read, never a condition or a family form dropped silently.
  const misspeltCondition = refusal((d) => { const r = d.combinations["sp.outside"].rules.find((x) => x.form === "IMM 5646") as Record<string, unknown>; r.conditon = r.condition; delete r.condition; });
  ok("fail: a rule whose condition is misspelt (\"conditon\") is refused, never read as a line every student files", !!misspeltCondition?.includes("sp.outside") && misspeltCondition.includes('rule "conditon"'), misspeltCondition);
  const misspeltFamily = refusal((d) => { const c = d.combinations["vv.single"] as Record<string, unknown>; c.familybyChannel = c.familyByChannel; delete c.familyByChannel; });
  ok("fail: a misspelt family form name (\"familybyChannel\") is refused, never a family form dropped without a word", !!misspeltFamily?.includes("vv.single") && misspeltFamily.includes('combination "familybyChannel"'), misspeltFamily);
  const textAge = refusal((d) => { (d.combinations["vv.single"].rules[0] as Record<string, unknown>).minAge = "18"; });
  ok("fail: a minimum age written as text is refused", !!textAge?.includes("IMM 5257 SCH1's minAge is not a whole number"), textAge);
  const badChannel = refusal((d) => { (d.combinations["fs.spouse"].rules.find((x) => x.channel) as Record<string, unknown>).channel = "online"; });
  ok("fail: a channel other than ONLINE is refused", !!badChannel?.includes("fs.spouse") && badChannel.includes("channel is not ONLINE"), badChannel);
  const unknownTop = refusal((d) => { (d as Record<string, unknown>).combination = {}; });
  ok("fail: an unknown name at the top of the file is refused", !!unknownTop?.includes('file "combination"'), unknownTop);
  const unknownFact = refusal((d) => { (d.ruleFacts[0] as Record<string, unknown>).lable = "x"; });
  ok("fail: an unknown name in a shared rule fact is refused", !!unknownFact?.includes('ruleFact "lable"'), unknownFact);
} finally { rmSync(DIR, { recursive: true, force: true }); }
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
