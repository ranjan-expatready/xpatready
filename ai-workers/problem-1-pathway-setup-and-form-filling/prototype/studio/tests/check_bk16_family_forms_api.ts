// BK-16 PR 2 (P-490, P-491; QA-416, QA-418), end to end on the configured checkpoint: on the Study permit (outside
// Canada) each family member's forms follow their own application, and the child's "6 months or more" is the client's
// question. A family of four (student, spouse, a child who will study 6 months or more, a child who will not) is opened
// by the case officer through the product's routes; the client answers the children's question on their own list.
// All from data: samples/form-setup.json sp.outside (IMM 1294 for the student and each child who studies, PR 1's who;
// IMM 1295 for a spouse or partner; IMM 5257 for a child who does not study), samples/conditional-filings.json (who
// answers, and its "Why we ask"), samples/wave1.json (IMM 1295 among the Study permit's sources, marked "later"). Visitor visa unchanged, and the other
// four combinations' whole releases identical to main's but for the status of named shared items, and their
// fingerprints identical (fixtures/bk16/other-combinations-main.json, P-496 (1), (A3)).
// Loads the configured checkpoint itself (about 2.5 minutes; saved AI answers only, US$0, live AI off). Sample.
//   zsh studio/tools/isolated.sh bk16 4454 start && tsx studio/tests/check_bk16_family_forms_api.ts 4454 xr_studio_bk16
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { snapshotHash } from "../engine/snapshot.ts";
import { releaseSha, withStatusIgnored } from "./lib/release-snapshot-compare.ts";

const PORT = Number(process.argv[2]), DB = process.argv[3];
if (!PORT || PORT === 4400 || !/^xr_studio_(?!demo)/.test(DB ?? "")) { console.error("usage: <port of an isolated copy, never 4400> <its database>"); process.exit(2); }
const BREW = "/opt/homebrew/opt/postgresql@18/bin/psql", PSQL = process.env.PSQL || (existsSync(BREW) ? BREW : "psql");
const sql = (q: string) => execFileSync(PSQL, [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const OFFICER = "user-O", AUTHOR = "user-A", CLIENT = "user-Q";
const STUDIES = "person.studies_six_months_or_more";
const call = async (method: string, path: string, body?: unknown, actor = OFFICER) => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json().catch(() => null) };
};
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 600)}` : ""}`); };
type Form = { form: string; subject_id: string; applies: boolean | "cannot_tell" };
type Prep = { fees_worked_out: boolean; fees_why: string | null; filings: { id: string; label: string; owner?: { subject: string } }[]; groups: { total_cents: number | null }[];
  readiness: { filing: string; ready: boolean; warns: { code: string; words: string }[] }[] };
type Q = { subjectId: string; fact: string; label: string; collected_from: string; required: boolean };

// A copy that already holds the configured checkpoint (a re-run) is used as it is; a blank copy loads it.
const has = sql(`select count(*) from config_release r join combination c on c.id=r.combination_id where c.combination_key='sp.outside'`) !== "0";
const loaded = has ? { status: 200, body: null } : await call("POST", "/demo/load", { sample: "configured" }, AUTHOR);
if (loaded.status >= 300) { console.log("FAIL  the configured checkpoint did not load", loaded.status, JSON.stringify(loaded.body).slice(0, 300)); process.exit(1); }
const snap = (key: string, part: string) => JSON.parse(sql(`select r.snapshot->'${part}' from config_release r join combination c on c.id=r.combination_id where c.combination_key='${key}' order by r.version desc limit 1`) || "[]");
const combo = (key: string) => sql(`select id from combination where combination_key='${key}'`);

// P-496 (1), option (A), and (A3) (tech lead on #1632): IMM 1295 joins the shared library only for the Study permit
// spouse's rule, so it is decided, sectioned and placed after every combination's own forms (samples/wave1.json "later").
// Byte check: each of the other four combinations' WHOLE latest release snapshot is main's (fixtures/bk16, captured from
// main), where only the status of the shared items named in the fixture may differ (the Study permit's release now
// carries them first); and each release's fingerprint (its stored sha256, which status does not enter) is main's, so no
// case pinned to these releases reads them as changed.
const MAIN = JSON.parse(readFileSync(join(import.meta.dirname, "fixtures", "bk16", "other-combinations-main.json"), "utf8")) as Record<string, unknown>;
type Fixture = { release_fingerprint: string; snapshot_sha256: string; status_may_differ: string[]; placements: string[]; sections: string[]; forms: string[] };
type Placement = { section_id: string; fact: string; collected_from: string; repeats: string; question_text?: string | null; rule_only?: boolean };
const latest = (key: string) => JSON.parse(execFileSync(PSQL, [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", `select json_build_object('sha256', r.sha256, 'snapshot', r.snapshot) from config_release r join combination c on c.id=r.combination_id where c.combination_key='${key}' order by r.version desc limit 1`], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 }).trim() || "null") as { sha256: string; snapshot: Record<string, unknown> } | null;
const readable = (s: Record<string, unknown>) => ({
  placements: ((s.placements ?? []) as Placement[]).map((x) => [x.section_id, x.fact, x.collected_from, x.repeats, x.question_text ?? "", x.rule_only ? "rule_only" : ""].join(" | ")).sort(),
  sections: ((s.sections ?? []) as { id: string; title: string }[]).map((x) => `${x.id} | ${x.title}`),
  forms: ((s.forms ?? []) as { form_number: string; who: string; status: string }[]).map((x) => `${x.form_number} | ${x.who} | ${x.status}`).sort(),
});
let probe: Record<string, unknown> | null = null;
for (const key of ["vv.single", "wp.lmia_inside", "pnp.express_entry", "fs.spouse"]) {
  const main = MAIN[key] as Fixture, rel = latest(key);
  const head = rel ? readable(rel.snapshot) : { placements: [], sections: [], forms: [] };
  const gone = (k: keyof typeof head) => main[k].filter((x) => !head[k].includes(x)), added = (k: keyof typeof head) => head[k].filter((x) => !main[k].includes(x));
  const found = rel ? withStatusIgnored(rel.snapshot, main.status_may_differ).missing : ["no release"];
  ok(`BK-16 (P-496 (1), A3): ${key}'s whole release snapshot is main's, only the status of ${main.status_may_differ.length} named shared items may differ (${main.placements.length} placements)`,
    !!rel && found.length === 0 && releaseSha(rel.snapshot, main.status_may_differ) === main.snapshot_sha256,
    { namedItemsNotFound: found, placementsGone: gone("placements"), placementsAdded: added("placements"), sectionsGone: gone("sections"), sectionsAdded: added("sections"), formsGone: gone("forms"), formsAdded: added("forms") });
  ok(`BK-16 (P-496 (1), A3): ${key}'s release fingerprint is main's (status does not enter it), so no case reads its release as changed`,
    !!rel && rel.sha256 === main.release_fingerprint && snapshotHash(rel.snapshot as never) === rel.sha256, { head: rel?.sha256, main: main.release_fingerprint });
  if (key === "wp.lmia_inside" && rel) probe = rel.snapshot;
}
// Fail side of the comparison (pure, on With an LMIA's own release): a changed wording on a named item, or a status
// flip on an item the fixture does not name, is a difference; the named items' status alone is not.
{
  const main = MAIN["wp.lmia_inside"] as Fixture, s = probe ?? {};
  const named = main.status_may_differ.find((n) => n.startsWith("placement:"))?.slice("placement:".length);
  const edit = (f: (x: Record<string, unknown>) => void) => { const c = JSON.parse(JSON.stringify(s)) as Record<string, unknown>; f(c); return releaseSha(c, main.status_may_differ); };
  const placements = (c: Record<string, unknown>) => (c.placements ?? []) as Record<string, unknown>[];
  const flipNamed = edit((c) => { for (const p of placements(c)) if (p.lineage === named) p.status = p.status === "DRAFT" ? "PUBLISHED" : "DRAFT"; });
  const reword = edit((c) => { for (const p of placements(c)) if (p.lineage === named) p.question_text = "Changed wording"; });
  const unnamed = placements(s).find((p) => !main.status_may_differ.includes(`placement:${String(p.lineage)}`))?.lineage;
  const flipOther = edit((c) => { for (const p of placements(c)) if (p.lineage === unnamed) p.status = p.status === "DRAFT" ? "PUBLISHED" : "DRAFT"; });
  ok("BK-16 (A3) fail side: a named item's status alone moves nothing; its changed wording, or another item's status, fails the check",
    !!named && !!unnamed && flipNamed === main.snapshot_sha256 && reword !== main.snapshot_sha256 && flipOther !== main.snapshot_sha256, { named, unnamed });
}

// The release, as the checkpoint set it from data.
const lines = snap("sp.outside", "forms") as { form_number: string; who: string; status: string; condition?: { subjectKind?: string; field?: string; value?: unknown } | null }[];
const line = (f: string) => lines.find((l) => l.form_number === f);
ok("BK-16 setup (QA-416): the Study permit's release has IMM 1294 for the student and each child who will study 6 months or more",
  line("IMM 1294")?.who === "principal_and_children_when" && line("IMM 1294")?.condition?.field === STUDIES && line("IMM 1294")?.condition?.value === true, line("IMM 1294"));
ok("BK-16 setup (QA-416): IMM 1295 for a spouse or partner, always; IMM 5257 for each child who will not study",
  line("IMM 1295")?.who === "spouse_or_partner" && line("IMM 1295")?.status === "always" && line("IMM 5257")?.who === "each_dependent_child" && line("IMM 5257")?.condition?.field === STUDIES && line("IMM 5257")?.condition?.value === false,
  [line("IMM 1295"), line("IMM 5257")]);
ok("BK-16 setup: IMM 1295 and IMM 5257 each have a published field map on the release, so they fill from the case",
  (snap("sp.outside", "field_maps") as { form_number: string; entries: { outcome: string }[] }[]).filter((m) => ["IMM 1295", "IMM 5257"].includes(m.form_number) && m.entries.some((e) => e.outcome === "mapped")).length >= 2);
const place = (snap("sp.outside", "placements") as { fact: string; collected_from: string; question_text: string | null; help_text: string | null }[]).find((p) => p.fact === STUDIES);
ok("BK-16 setup (QA-418): the child's \"6 months or more\" is the client's question, in plain second person, with a \"Why we ask\"",
  place?.collected_from === "client_questionnaire" && /^Will your child /.test(place?.question_text ?? "") && /^Why we ask: /.test(place?.help_text ?? ""), place);

// The family, opened by the case officer through the routes a person uses.
const family = async (key: string, ref: string) => {
  const open = await call("POST", "/runtime/cases", { combinationId: combo(key), reference: `${ref}-${Date.now()}`, clientActor: CLIENT, principal: { displayName: "Sample Applicant A" } });
  const id: string = open.body?.id;
  const add = async (role: string, name: string) => (await call("POST", `/runtime/cases/${id}/people`, { role, displayName: name })).body?.subject_id as string;
  const S = await add("spouse_or_partner", "Sample Spouse A"), K1 = await add("child", "Sample Child S"), K2 = await add("child", "Sample Child V");
  const A = ((await call("GET", `/runtime/cases/${id}`)).body.people as { role: string; subject_id: string }[]).find((x) => x.role === "principal")!.subject_id;
  // Ages on the application date: 30, 31, 15, 9.
  for (const [s, dob] of [[A, "1996-03-01"], [S, "1995-05-01"], [K1, "2011-02-01"], [K2, "2017-02-01"]]) await call("PUT", `/runtime/cases/${id}/answers/${s}/person.date_of_birth`, { value: dob, expectedId: null });
  const forms = async () => ((await call("GET", `/runtime/cases/${id}/forms`)).body?.forms ?? []) as Form[];
  return { id, A, S, K1, K2, status: open.status, forms, prep: async () => (await call("GET", `/runtime/cases/${id}/prepare`)).body as Prep };
};
const f = await family("sp.outside", "BK16");
const applying = (fs: Form[], s: string) => fs.filter((x) => x.subject_id === s && x.applies === true).map((x) => x.form).sort();
let fs = await f.forms();
ok("BK-16 setup: a Study permit family of four is opened (student 30, spouse 31, child 15, child 9)", f.status === 201 && !!f.K2);
ok("BK-16 pass (QA-416): the student files IMM 1294", applying(fs, f.A).includes("IMM 1294"), applying(fs, f.A));
ok("BK-16 fail (QA-416): the spouse files IMM 1295 (a work permit, as they are charged), never IMM 1294",
  applying(fs, f.S).includes("IMM 1295") && !fs.some((x) => x.subject_id === f.S && x.form === "IMM 1294"), fs.filter((x) => x.subject_id === f.S));
ok("BK-16: before the children's answer, neither child has IMM 1294 or IMM 5257 to fill (which application they make is not known)",
  [f.K1, f.K2].every((k) => !applying(fs, k).some((x) => x === "IMM 1294" || x === "IMM 5257")), [applying(fs, f.K1), applying(fs, f.K2)]);
let p = await f.prep();
// m1 (P-491) as it stands: an unanswered child keeps their filing from Ready to file. Their IMM 5257 cannot start until
// the answer is in (a CRITICAL line, Break B3); PR 1's who gives them no IMM 1294 to wait on, never an error.
const childLine = (pp: Prep, k: string, name: string) => { const fid = pp.filings.find((x) => x.owner?.subject === k)?.id; const r = pp.readiness.find((x) => x.filing === fid);
  return { ready: r?.ready, waits: (r?.warns ?? []).some((w) => w.code === "missing_facts" && /whether IMM 5257 applies/.test(w.words) && w.words.includes(name)) }; };
ok("BK-16 fail (m1): unanswered, each child's filing is not Ready to file: its IMM 5257 waits for the answer (CRITICAL)",
  [[f.K1, "Sample Child S"], [f.K2, "Sample Child V"]].every(([k, n]) => childLine(p, k, n).ready === false && childLine(p, k, n).waits), [childLine(p, f.K1, "Sample Child S"), childLine(p, f.K2, "Sample Child V")]);
ok("BK-16 (QA-418): unanswered, the fees wait for each child's answer", !p.fees_worked_out && /Waits for Sample Child S's answer/.test(p.fees_why ?? "") && /Sample Child V's answer/.test(p.fees_why ?? ""), p.fees_why);

// QA-418: the client sees the question for each child on their own list, and answers it.
const list = (await call("GET", `/runtime/cases/${f.id}/questionnaire`, undefined, CLIENT));
const qs = ((list.body?.sections ?? []) as { questions: Q[] }[]).flatMap((s) => s.questions).filter((q) => q.fact === STUDIES);
ok("BK-16 pass (QA-418): the client's own list asks \"Will your child study in Canada for 6 months or more?\" for each child, as theirs to answer",
  list.status === 200 && [f.K1, f.K2].every((k) => qs.some((q) => q.subjectId === k && q.collected_from === "client_questionnaire" && /^Will your child study in Canada for 6 months or more\?$/.test(q.label) && q.required)), qs);
ok("BK-16 fail (QA-418): the question is never asked of the student or the spouse", !qs.some((q) => q.subjectId === f.A || q.subjectId === f.S), qs.map((q) => q.subjectId));
const yes = await call("PUT", `/runtime/cases/${f.id}/answers/${f.K1}/${STUDIES}`, { value: true, expectedId: null }, CLIENT);
const no = await call("PUT", `/runtime/cases/${f.id}/answers/${f.K2}/${STUDIES}`, { value: false, expectedId: null }, CLIENT);
ok("BK-16 (QA-418): Client A answers both on their own list (Child S Yes, Child V No)", yes.status === 200 && no.status === 200, [yes.status, no.status, yes.body]);

fs = await f.forms();
ok("BK-16 pass (QA-416): the child who studies files IMM 1294, never IMM 5257", applying(fs, f.K1).includes("IMM 1294") && !applying(fs, f.K1).includes("IMM 5257"), applying(fs, f.K1));
ok("BK-16 pass (QA-416): the child who does not study files IMM 5257, never IMM 1294", applying(fs, f.K2).includes("IMM 5257") && !applying(fs, f.K2).includes("IMM 1294"), applying(fs, f.K2));
ok("BK-16 fail (QA-416): IMM 1294 is filed by the student and the child who studies only; IMM 1295 by the spouse only; IMM 5257 by the other child only",
  JSON.stringify(fs.filter((x) => x.form === "IMM 1294" && x.applies === true).map((x) => x.subject_id).sort()) === JSON.stringify([f.A, f.K1].sort())
  && JSON.stringify(fs.filter((x) => x.form === "IMM 1295" && x.applies === true).map((x) => x.subject_id)) === JSON.stringify([f.S])
  && JSON.stringify(fs.filter((x) => x.form === "IMM 5257" && x.applies === true).map((x) => x.subject_id)) === JSON.stringify([f.K2]),
  fs.filter((x) => ["IMM 1294", "IMM 1295", "IMM 5257"].includes(x.form)).map((x) => [x.form, x.subject_id, x.applies]));
p = await f.prep();
const label = (s: string) => p.filings.find((x) => x.owner?.subject === s)?.label;
ok("BK-16 pass (QA-418): once Client A answers, the fees no longer wait: one total for the family (CAD 825)", p.fees_worked_out && p.groups.length === 1 && p.groups[0].total_cents === 825_00, { why: p.fees_why, totals: p.groups.map((g) => g.total_cents) });
ok("BK-16 pass (m1): once answered, no child's filing waits on IMM 5257's answer any more",
  [[f.K1, "Sample Child S"], [f.K2, "Sample Child V"]].every(([k, n]) => !childLine(p, k, n).waits), [childLine(p, f.K1, "Sample Child S"), childLine(p, f.K2, "Sample Child V")]);
ok("BK-16: each filing is named by the document its forms are for", label(f.S) === "Work permit: Sample Spouse A" && label(f.K1) === "Study permit: Sample Child S" && label(f.K2) === "Visitor visa: Sample Child V", p.filings.map((x) => x.label));

// The child stops studying (No): their forms follow, IMM 5257, never IMM 1294.
const prev = ((await call("GET", `/runtime/cases/${f.id}/questionnaire`, undefined, CLIENT)).body?.sections as { questions: (Q & { answer?: { id: string } })[] }[]).flatMap((s) => s.questions).find((q) => q.fact === STUDIES && q.subjectId === f.K1)?.answer?.id ?? null;
await call("PUT", `/runtime/cases/${f.id}/answers/${f.K1}/${STUDIES}`, { value: false, expectedId: prev }, CLIENT);
fs = await f.forms();
ok("BK-16 fail: answered No, Child S's forms follow: IMM 5257, never IMM 1294", applying(fs, f.K1).includes("IMM 5257") && !applying(fs, f.K1).includes("IMM 1294"), applying(fs, f.K1));

// Visitor visa unchanged: every member files IMM 5257, nobody IMM 1294 or IMM 1295.
const v = await family("vv.single", "BK16VV");
const vfs = await v.forms();
ok("BK-16 pass: Visitor visa is unchanged: each of the four files IMM 5257; nobody files IMM 1294 or IMM 1295",
  [v.A, v.S, v.K1, v.K2].every((s) => applying(vfs, s).includes("IMM 5257")) && !vfs.some((x) => x.form === "IMM 1294" || x.form === "IMM 1295"), [v.A, v.S, v.K1, v.K2].map((s) => applying(vfs, s)));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
