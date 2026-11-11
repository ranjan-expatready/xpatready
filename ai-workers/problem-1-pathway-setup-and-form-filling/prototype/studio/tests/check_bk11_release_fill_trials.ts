// BK-11 (Bake M3.5 Track 2 row 25, P-448, P-460): a released pathway says which of its forms have a passed fill trial.
// Unit checks of api/src/fill-trials.ts releaseFillTrials and contracts/release-fill-trials.ts on small synthetic
// releases and a synthetic trial register (test words, not immigration values), plus the real register for one recorded
// edition. A passing and a failing case per rule. No server, no database, no model call (US$0). The API and the release
// row are proved by tests/check_bk11_release_fill_trials_api.ts on an isolated copy.
//   tsx studio/tests/check_bk11_release_fill_trials.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fillTrialsOf, mapVersion, readTrials, releaseFillTrials, trialFor, type MapEntry, type TrialRecord } from "../api/src/fill-trials.ts";
import { FILL_TRIAL_WORDS, fillTrialCount } from "../contracts/release-fill-trials.ts";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();
const STUDIO = join(import.meta.dirname, "..");
const SHA = { a: "a".repeat(64), b: "b".repeat(64), c: "c".repeat(64), d: "d".repeat(64), e: "e".repeat(64) };
const entries: MapEntry[] = [{ data_path: "form1[0].Name[0]", fact: "person.family_name", outcome: "mapped", person: "form_subject", row: null, transform: "as_is" }];
const changed: MapEntry[] = [...entries, { data_path: "form1[0].Born[0]", fact: "person.date_of_birth", outcome: "mapped", person: "form_subject", row: null, transform: "date_ymd" }];
const PASS = "## Verdict\n\n**Passes in Adobe Acrobat: test words.**\n", FAILS = "## Verdict\n\n**Fails: test words.**\n";
const status: Record<string, string> = { "e/a/STATUS.md": PASS, "e/c/STATUS.md": PASS, "e/d/STATUS.md": FAILS };
const read = (f: string) => { if (!(f in status)) throw new Error("no record"); return status[f]; };
const register: TrialRecord[] = [
  { form: "FORM A", edition: "FORM A (01-2026)", form_sha256: SHA.a, map_version: null, status_file: "e/a/STATUS.md", recorded_on: "2026-10-23" },
  { form: "FORM C", edition: "FORM C (01-2026)", form_sha256: SHA.c, map_version: mapVersion(entries), status_file: "e/c/STATUS.md", recorded_on: "2026-10-24" },
  { form: "FORM D", edition: "FORM D (01-2026)", form_sha256: SHA.d, map_version: null, status_file: "e/d/STATUS.md", recorded_on: "2026-10-25" },
  { form: "FORM E", edition: "FORM E (01-2026)", form_sha256: SHA.e.replace(/^e/, "f"), map_version: null, status_file: "e/e/STATUS.md", recorded_on: "2026-10-26" },
];
const line = (form: string, extra: Record<string, unknown> = {}) => ({ form_number: form, title: `${form} title`, form_kind: "data_form", ...extra });
const map = (form: string, sha: string | null, e = entries, extra: Record<string, unknown> = {}) => ({ form_number: form, form_edition: `${form} (01-2026)`, form_sha256: sha, entries: e, ...extra });
const release = {
  forms: [line("FORM A"), line("FORM B"), line("FORM C"), line("FORM D"), line("FORM E"), line("FORM N"), line("CHECKLIST", { form_kind: "document" })],
  field_maps: [map("FORM A", SHA.a), map("FORM B", SHA.b), map("FORM C", SHA.c, changed), map("FORM D", SHA.d), map("FORM E", SHA.e), map("CHECKLIST", null)],
};
const out = releaseFillTrials(release, register, read);
const of = (form: string) => out.find((t) => t.form === form);

// ─────────────── BR-1: a form with a recorded, passing trial of its edition in use reads "passed", with date and evidence
ok("BK-11 BR-1 pass: a form whose recorded trial of this edition passed reads \"passed\", with the day it was recorded and its evidence record",
  of("FORM A")?.status === "passed" && of("FORM A")?.recorded_on === "2026-10-23" && of("FORM A")?.evidence === "e/a/STATUS.md" && of("FORM A")?.edition === "FORM A (01-2026)" && of("FORM A")?.why === null, of("FORM A"));
ok("BK-11 BR-1 fail: a form with no recorded trial reads \"not yet\", with no date and no evidence, and says why",
  of("FORM B")?.status === "not_yet" && of("FORM B")?.recorded_on === null && of("FORM B")?.evidence === null && of("FORM B")?.reason === "none" && of("FORM B")?.why === FILL_TRIAL_WORDS.reason.none("FORM B (01-2026)"), of("FORM B"));

// ─────────────── BR-2: "passed" only for the same file, the same map and a passing verdict (S2, P-65 (a))
ok("BK-11 BR-2 fail: a trial run on an earlier version of the field map reads \"not yet\" (other_map)", of("FORM C")?.status === "not_yet" && of("FORM C")?.reason === "other_map", of("FORM C"));
ok("BK-11 BR-2 pass: the same form on the map its trial ran on reads \"passed\"", releaseFillTrials({ forms: [line("FORM C")], field_maps: [map("FORM C", SHA.c)] }, register, read)[0]?.status === "passed");
ok("BK-11 BR-2 fail: a recorded trial whose verdict does not pass reads \"not yet\" (not_passed)", of("FORM D")?.status === "not_yet" && of("FORM D")?.reason === "not_passed", of("FORM D"));
ok("BK-11 BR-2 fail: the same printed edition with another file reads \"not yet\" (other_file)", of("FORM E")?.status === "not_yet" && of("FORM E")?.reason === "other_file", of("FORM E"));
ok("BK-11 BR-2 fail: a form line with no PDF edition in the release reads \"not yet\" (no_edition)", of("FORM N")?.status === "not_yet" && of("FORM N")?.reason === "no_edition" && of("FORM N")?.edition === null, of("FORM N"));

// ─────────────── BR-3: the release's trial is the one a case's copy is judged by: the PDF edition in use (P-32)
const twoEditions = { forms: [line("FORM A")], field_maps: [map("FORM A", SHA.b, entries, { form_edition: "FORM A (01-2025)" }), map("FORM A", SHA.a), map("FORM A", SHA.b, entries, { form_edition: "FORM A (06-2026)", channel: "ONLINE" })] };
ok("BK-11 BR-3 pass: with an older PDF edition and an online version beside it, the newest PDF edition's trial counts (passed)", releaseFillTrials(twoEditions, register, read)[0]?.status === "passed" && releaseFillTrials(twoEditions, register, read)[0]?.edition === "FORM A (01-2026)");
const olderInUse = { forms: [line("FORM A")], field_maps: [map("FORM A", SHA.a, entries, { form_edition: "FORM A (01-2025)" }), map("FORM A", SHA.b, entries, { form_edition: "FORM A (06-2026)" })] };
ok("BK-11 BR-3 fail: a newer PDF edition with no trial is the one in use, so the older edition's passed trial does not count", releaseFillTrials(olderInUse, register, read)[0]?.status === "not_yet");

// ─────────────── BR-4: one entry per form line a case files (engine/programs.ts isFormLine, review M1), in the release's order
ok("BK-11 BR-4 pass: one entry per form line, in the release's order", out.map((t) => t.form).join(",") === "FORM A,FORM B,FORM C,FORM D,FORM E,FORM N");
ok("BK-11 BR-4 fail: a checklist line (an old \"document\" row not titled as a form) is not filed, so it carries no fill trial", !of("CHECKLIST"));
const kinds = releaseFillTrials({ forms: [line("OLD ROW", { form_kind: "document", title: "Offer of employment form (test words)" }), line("SKIPPED", { channel: "NOT_NEEDED" }), line("PORTAL", { channel: "ONLINE" })], field_maps: [map("OLD ROW", SHA.b), map("SKIPPED", SHA.a), map("PORTAL", SHA.a)] }, register, read);
ok("BK-11 BR-4 pass (review M1): an old \"document\" row titled as a form is filed, so the release lists it with its trial", kinds.some((t) => t.form === "OLD ROW" && t.status === "not_yet" && t.reason === "none"), kinds);
ok("BK-11 BR-4 fail (review M1): a line marked Not needed files nothing, so the release neither lists nor counts it", !kinds.some((t) => t.form === "SKIPPED"), kinds.map((t) => t.form));
ok("BK-11 BR-4 pass (review m3): a line filed Online fills no PDF: it says so (filed_online), even with a PDF edition beside it", kinds.find((t) => t.form === "PORTAL")?.reason === "filed_online" && kinds.find((t) => t.form === "PORTAL")?.status === "not_yet" && kinds.find((t) => t.form === "PORTAL")?.why === FILL_TRIAL_WORDS.reason.filed_online(null));

// ─────────────── BR-5: a stored release's summary: carried, or null for a release made before BK-11 (never "not yet")
ok("BK-11 BR-5 pass: a release summary with fill_trials gives them back as stored", fillTrialsOf({ counts: {}, fill_trials: out })?.length === out.length);
ok("BK-11 BR-5 fail: a release made before BK-11 (no fill_trials) reads null, and the screen words say not recorded, never \"Not yet\"",
  fillTrialsOf({ counts: {} }) === null && fillTrialsOf(null) === null && fillTrialCount(null) === FILL_TRIAL_WORDS.not_recorded && !/Not yet/.test(fillTrialCount(undefined)));
ok("BK-11 BR-5 pass (review m2): the count says it is as at release and how many of the release's forms have a passed trial", fillTrialCount(out) === "At release: 1 of 6 forms with a passed fill trial" && fillTrialCount(out.slice(0, 1)) === "At release: 1 of 1 form with a passed fill trial", fillTrialCount(out));

// ─────────────── the real register: one recorded E1 edition reads "passed" through the same function
const real = readTrials();
const passing = real.find((t) => trialFor({ form_number: t.form, form_edition: t.edition, form_sha256: t.form_sha256, entries }, real).passed);
const r = passing ? releaseFillTrials({ forms: [line(passing.form)], field_maps: [map(passing.form, passing.form_sha256, entries, { form_edition: passing.edition })] })[0] : undefined;
ok("BK-11 pass (real register): a recorded E1 edition whose evidence says it passes reads \"passed\" with its date and evidence record", !!r && r.status === "passed" && r.recorded_on === passing!.recorded_on && r.evidence === passing!.status_file, r);
ok("BK-11 fail (real register): the same form on a file no trial ran on reads \"not yet\"", !!passing && releaseFillTrials({ forms: [line(passing.form)], field_maps: [map(passing.form, "0".repeat(64), entries, { form_edition: passing.edition })] })[0]?.status === "not_yet");

// ─────────────── P-319, P-452: the new code names no pathway and no form
const code = ["contracts/release-fill-trials.ts", "web/src/components/release-fill-trials.tsx"].map((f) => readFileSync(join(STUDIO, f), "utf8")).join("\n")
  + readFileSync(join(STUDIO, "api/src/fill-trials.ts"), "utf8").split("export function releaseFillTrials")[1];
ok("BK-11 P-319 pass: the release fill-trial code names no form number and no combination key", !/\b(IMM|IRM)\s?\d|\b(vv|wp|sp|pnp|fs)\.[a-z_]+/.test(code), code.match(/\b(IMM|IRM)\s?\d+|\b(vv|wp|sp|pnp|fs)\.[a-z_]+/)?.[0]);

process.exit(summary() ? 1 : 0);
