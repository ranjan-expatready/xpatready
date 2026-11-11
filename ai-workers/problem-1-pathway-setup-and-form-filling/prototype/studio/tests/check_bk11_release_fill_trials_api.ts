// BK-11 (Bake M3.5 Track 2 row 25, P-448, P-460) at API level, on an isolated copy with the suites' fixture: a release
// row carries each of its forms' fill-trial status as data (summary.fill_trials), frozen at release, and the combination's
// review lists it with its released versions. The imported reviewed release (Release 1, api/src/demo.ts) and a release
// made by a second person (Release 2, api/src/studio.ts publishRow) both carry it; a release row without it (made before
// BK-11) reads null. The release fingerprint does not change. Rules only, no AI (US$0).
//   zsh studio/tools/isolated.sh forms_bk11 4451 start && tsx studio/tests/check_bk11_release_fill_trials_api.ts 4451 xr_studio_forms_bk11
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { client, recorder } from "./runtime/api.ts";
import { sourceEveryNumber } from "./fixtures/source-every-number.cjs"; // G1 (C5.4): a release needs every number sourced
import { releaseFillTrials, readTrials } from "../api/src/fill-trials.ts";
import { snapshotHash, type Snapshot } from "../engine/snapshot.ts";
import { isFormLine } from "../engine/programs.ts";

const PORT = Number(process.argv[2] ?? 4451), DB = process.argv[3] ?? "xr_studio_forms_bk11";
const { call } = client(PORT, DB);
const { ok, summary } = recorder();
const PSQL = existsSync("/opt/homebrew/opt/postgresql@18/bin/psql") ? "/opt/homebrew/opt/postgresql@18/bin/psql" : "psql";
const sql = (q: string) => execFileSync(PSQL, [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
type Trial = { form: string; status: string; recorded_on: string | null; evidence: string | null; why: string | null };
type Rel = { version: number; fill_trials: Trial[] | null; summary: { fill_trials?: Trial[] } };
const releasesOf = async (id: string) => ((await call("GET", `/combinations/${id}/review`)).body.releases ?? []) as Rel[];
const stored = (id: string, version: number) => JSON.parse(sql(`select json_build_object('snapshot', snapshot, 'sha256', sha256) from config_release where combination_id='${id}' and version=${version}`)) as { snapshot: Snapshot; sha256: string };
const formsWithTrial = new Set(readTrials().map((t) => t.form));
/** The same list whatever order the database kept each entry's keys in (jsonb sorts them). */
const same = (a: unknown, b: unknown) => JSON.stringify(a, (_k, v) => (v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort()) : v)) === JSON.stringify(b, (_k, v) => (v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort()) : v));

try {
  sql(`update workspace set key='demo' where key<>'demo'`); // a run that stopped half-way left it renamed
  await call("POST", "/demo/reset", { confirm: "RESET" });
  const l = await call("POST", "/demo/load", {});
  ok("setup: Reset, then the suites' fixture loaded (one combination imported as Release 1)", l.status < 300, l.status < 300 ? undefined : l.body);
  const wp = sql(`select combination_id from config_release where version=1 order by released_at limit 1`);

  // ─────────────── Release 1: the imported reviewed release carries each form's trial
  let rel = await releasesOf(wp);
  const r1 = rel.find((x) => x.version === 1)!, s1 = stored(wp, 1);
  const forms1 = (s1.snapshot.forms as { form_number: string; form_kind?: string; title?: string; channel?: string }[]).filter(isFormLine).map((f) => f.form_number); // review M1: the engine's form lines
  ok("BK-11 pass: Release 1 lists every form line it fills, each with its fill-trial status", Array.isArray(r1?.fill_trials) && r1.fill_trials!.map((t) => t.form).join(",") === forms1.join(",") && r1.fill_trials!.every((t) => t.status === "passed" || t.status === "not_yet"), r1?.fill_trials);
  ok("BK-11 pass: what the release carries is what the trial register and the evidence say for its own forms (frozen at release)", same(r1.fill_trials, releaseFillTrials(s1.snapshot)));
  const passed = r1.fill_trials!.filter((t) => t.status === "passed"), notYet = r1.fill_trials!.filter((t) => t.status === "not_yet");
  ok("BK-11 pass: a form with a recorded, passing trial reads \"passed\" with its date and evidence record", passed.length > 0 && passed.every((t) => /^\d{4}-\d{2}-\d{2}$/.test(t.recorded_on ?? "") && /STATUS\.md$/.test(t.evidence ?? "")), passed);
  ok("BK-11 fail: a form with no passed trial reads \"not yet\", with no date or evidence, and says why", notYet.length > 0 && notYet.every((t) => t.recorded_on === null && t.evidence === null && !!t.why) && notYet.some((t) => !formsWithTrial.has(t.form)), notYet.map((t) => t.form));
  ok("BK-11 pass: the release fingerprint is unchanged by the trials (they are not in the snapshot)", snapshotHash(s1.snapshot) === s1.sha256 && !JSON.stringify(s1.snapshot.forms).includes("fill_trial"));

  // ─────────────── Release 2: made by a second person, through publishRow
  await sourceEveryNumber(PORT, wp);
  const sub = await call("POST", `/combinations/${wp}/submit`, { note: "BK-11 check" });
  const sme = ((sub.body?.changeSummary ?? []) as { kind: string; key: string; needs_sme?: boolean }[]).map((x) => `${x.kind}|${x.key}`);
  if (sme.length) await call("POST", `/combinations/${wp}/signoff`, { items: sme, action: "signed", note: "BK-11 check" }, "user-C");
  const ap = await call("POST", `/combinations/${wp}/approve`, {}, "user-B");
  rel = await releasesOf(wp);
  const r2 = rel.find((x) => x.version === 2);
  ok("BK-11 pass: Release 2, approved by a second person, carries each form's fill-trial status in its summary", sub.status < 300 && ap.status < 300 && Array.isArray(r2?.summary?.fill_trials) && same(r2!.fill_trials, releaseFillTrials(stored(wp, 2).snapshot)), { sub: sub.status, ap: ap.status, body: ap.status < 300 ? undefined : ap.body });

  // ─────────────── a release made before BK-11 reads null, never "not yet"
  sql(`update config_release set summary = summary - 'fill_trials' where combination_id='${wp}' and version=1`);
  rel = await releasesOf(wp);
  ok("BK-11 fail: a release row without fill_trials (made before BK-11) reads null, not a list of \"not yet\"", rel.find((x) => x.version === 1)?.fill_trials === null && Array.isArray(rel.find((x) => x.version === 2)?.fill_trials));
} catch (e) { ok("ran to the end", false, (e as Error).message); }
try { sql(`update workspace set key='demo' where key<>'demo'`); } catch { /* the copy may be gone */ }
process.exit(summary() ? 1 : 0);
