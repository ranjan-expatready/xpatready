// M2 Critical (tech lead, Opus re-review, 3 Nov; P-32 "the newest printed edition is the one in use"): after a new
// edition is released, a case filled the OLDEST one. A snapshot carries every mapped PDF edition of a form, oldest first
// (engine/snapshot.ts), and the fill (api/src/fill.ts writeForm), the case's copies and trials (api/src/fill-case.ts)
// and the case's coverage (engine/render.ts) took the first. Now one rule, engine/programs.ts pdfMapInUse, used by those
// and the Forms tab (api/src/workspace.ts). Scenario: IMM 5476 11-2025 accepted through impact review while 11-2021
// stays published; the release carries both maps; a case fills 11-2025. Each rule has a passing and a failing case.
// The fill runs the real filler (p5/fill.py) on IRCC's own two IMM 5476 files (official-sources/ircc: forms/imm5476e.pdf
// 11-2025, previous-editions/imm5476e-2021.pdf). No database, no server, no model call (US$0).
//   tsx studio/tests/check_edition_in_use.ts
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pdfMapInUse } from "../engine/programs.ts";
import { render, type Person } from "../engine/render.ts";
import type { Snapshot } from "../engine/snapshot.ts";
import { writeForm } from "../api/src/fill.ts";
import { fieldsOpen, trialOf } from "../api/src/fill-case.ts";
import { channelsView } from "../engine/channels.ts";
import { runFieldMap } from "../engine/answer-keys.ts";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();
const OLD = { form_number: "IMM 5476", form_edition: "IMM 5476 (11-2021)", official_file: "imm5476e-2021.pdf", form_sha256: "sample-sha-11-2021", inventory_file: "prototype/p1/inventory/imm5476e-2021.inventory.json" };
const NEW = { form_number: "IMM 5476", form_edition: "IMM 5476 (11-2025)", official_file: "imm5476e.pdf", form_sha256: "sample-sha-11-2025", inventory_file: "prototype/p1/inventory/imm5476e.inventory.json" };
const entry = (path: string) => ({ data_path: path, caption: path, outcome: "mapped", fact: "person.family_name", person: "self", row: null, transform: null });
const map = (e: typeof OLD, path: string, extra: Record<string, unknown> = {}) => ({ ...e, entries: [entry(path)], ...extra });

// ── The rule (P-32): the newest by the printed month and year, never the snapshot's first.
const sorted = [map(OLD, "old.box"), map(NEW, "new.box")]; // as engine/snapshot.ts lists them: oldest first
ok("P-32 pass: of two mapped PDF editions the edition in use is the newest printed one (11-2025), not the first the snapshot lists", pdfMapInUse(sorted, "IMM 5476")?.form_edition === NEW.form_edition);
ok("P-32 pass: the order the snapshot lists them in does not matter (newest listed first still gives 11-2025)", pdfMapInUse([...sorted].reverse(), "IMM 5476")?.form_edition === NEW.form_edition);
ok("P-32 pass: the printed date decides, not text order (\"12-2021\" sorts after \"11-2025\" as text, but is older)", pdfMapInUse([map({ ...NEW }, "n"), map({ ...OLD, form_edition: "IMM 5476 (12-2021)" }, "o")], "IMM 5476")?.form_edition === NEW.form_edition);
ok("P-32 fail: a release holding only the older edition (a case pinned to it) keeps that edition: the rule never picks one the snapshot does not hold", pdfMapInUse([map(OLD, "old.box")], "IMM 5476")?.form_edition === OLD.form_edition);
ok("P-32 fail: an online map is never the PDF edition in use, and another form's maps are never used", pdfMapInUse([map(OLD, "o"), map({ ...NEW, form_edition: "IMM 5476 online (01-2027)" } as typeof NEW, "x", { channel: "ONLINE" })], "IMM 5476")?.form_edition === OLD.form_edition && pdfMapInUse(sorted, "IMM 5707") === undefined);
ok("P-32 fail: with the same printed date the later in the snapshot's order wins (it breaks that tie by the file's date)", pdfMapInUse([map(NEW, "a"), map({ ...NEW, official_file: "imm5476e-resaved.pdf" }, "b")], "IMM 5476")?.official_file === "imm5476e-resaved.pdf");

// ── The case's coverage (engine/render.ts) reads the edition in use.
const snap = (maps: unknown[]) => ({ combination: { key: "vv.single" }, canonical_fields: [{ id: "person.family_name", value_type: "text" }], derived_fields: [], placements: [], checks: [], document_requirements: [], document_types: [], rules: [], sections: [],
  forms: [{ form_number: "IMM 5476", who: "each_applicant", status: "always", channel: "PDF_UPLOAD" }], field_maps: maps }) as unknown as Snapshot;
const people: Person[] = [{ id: "A", role: "principal", label: "Client A", applies: true }];
const cov = (maps: unknown[]) => render(snap(maps), people, new Map(), { today: new Date("2026-11-03T12:00:00Z") }).coverage.find((c) => c.form === "IMM 5476");
ok("P-32 pass: a case's coverage of IMM 5476 is the 11-2025 map's boxes when the release holds both", cov(sorted)?.edition === NEW.form_edition && (cov(sorted)?.boxes ?? []).some((b) => b.box === "new.box") && !(cov(sorted)?.boxes ?? []).some((b) => b.box === "old.box"), cov(sorted));
ok("P-32 fail: on a release with only 11-2021 the coverage stays 11-2021", cov([map(OLD, "old.box")])?.edition === OLD.form_edition);

// ── The case's fill trial (api/src/fill-case.ts trialOf) is the trial of the edition in use.
const trial = (maps: unknown[]) => trialOf(snap(maps) as never, "IMM 5476");
ok("P-32 pass: the fill trial asked for is the 11-2025 edition's (a trial of 11-2021 never makes an 11-2025 copy fileable)", /11-2025/.test(trial(sorted).why ?? "") && !/11-2021/.test(trial(sorted).why ?? ""), trial(sorted));
ok("P-32 fail: on a release with only 11-2021 the trial asked for stays 11-2021's", /11-2021/.test(trial([map(OLD, "old.box")]).why ?? ""), trial([map(OLD, "old.box")]));

// ── Review M1: the mandatory fields a copy would leave empty (fill-case.ts fieldsOpen) are the edition in use's. The IMM 5476
// field lists mark none required, so two small Sample lists (inside the solution folder, as the reader allows) stand in.
{
  const rel = "prototype/studio/var/test-edition-in-use", abs = join(import.meta.dirname, "..", "var", "test-edition-in-use");
  mkdirSync(abs, { recursive: true });
  const list = (path: string) => ({ fields: [{ data_path: path, caption: path, kind: "field", ui: "textEdit", required: true }] });
  writeFileSync(join(abs, "old.inventory.json"), JSON.stringify(list("old.req"))); writeFileSync(join(abs, "new.inventory.json"), JSON.stringify(list("new.req")));
  const o = map({ ...OLD, inventory_file: `${rel}/old.inventory.json` }, "old.req"), n = map({ ...NEW, inventory_file: `${rel}/new.inventory.json` }, "new.req");
  const open = (maps: unknown[]) => fieldsOpen(snap(maps) as never, "IMM 5476", []).map((x) => JSON.stringify(x)).join(" ");
  try {
    ok("M1 pass: the mandatory fields a copy would leave empty are 11-2025's when the release holds both editions", /new\.req/.test(open([o, n])) && !/old\.req/.test(open([o, n])), open([o, n]));
    ok("M1 fail: on a release with only 11-2021 they stay 11-2021's", /old\.req/.test(open([o])) && !/new\.req/.test(open([o])), open([o]));
  } finally { rmSync(abs, { recursive: true, force: true }); }
}
// ── Review m3: the Channels view names the edition in use.
ok("m3 pass: the Channels view names 11-2025 when the release holds both, whatever their order", channelsView(snap([...sorted].reverse())).lines[0]?.version === NEW.form_edition && channelsView(snap(sorted)).lines[0]?.version === NEW.form_edition);
ok("m3 fail: with only 11-2021 the Channels view names 11-2021", channelsView(snap([map(OLD, "o")])).lines[0]?.version === OLD.form_edition);

// ── Break B1 (the breaker on 1a7d63ad8): an answer key runs on its own edition's boxes, never on the edition cases fill.
// A key for 11-2021 on a release that also holds 11-2025 must judge the 11-2021 map; a box only 11-2025 has is never
// written into its run, and a wrongly wired 11-2021 map is never passed because 11-2025 is right.
{
  const A = "IMM_5476[0].Page1[0].SectionA[0].", D = "IMM_5476[0].Page1[0].sectionD[0].familyName[0]";
  const e = (path: string, fact: string) => ({ data_path: path, caption: path, outcome: "mapped", fact, person: "form_subject", row: null, transform: null });
  const inv = (f: string) => JSON.parse(readFileSync(join(import.meta.dirname, "..", "..", "p1", "inventory", f), "utf8"));
  const inv21 = inv("imm5476e-2021.inventory.json"), inv25 = inv("imm5476e.inventory.json");
  const m21 = (entries: unknown[]) => ({ ...OLD, entries }), m25 = { ...NEW, entries: [e(`${A}familyName[0]`, "person.family_name"), e(`${A}givenName[0]`, "person.given_name"), e(D, "person.family_name")] };
  const right21 = m21([e(`${A}familyName[0]`, "person.family_name"), e(`${A}givenName[0]`, "person.given_name")]);
  const wrong21 = m21([e(`${A}familyName[0]`, "person.given_name"), e(`${A}givenName[0]`, "person.given_name")]);
  const ks = (maps: unknown[]) => ({ ...snap(maps), combination: { key: "vv.single", label: "VV" }, canonical_fields: [{ id: "person.family_name", value_type: "text" }, { id: "person.given_name", value_type: "text" }] }) as unknown as Snapshot;
  const family = { key: "f", label: "Client A family", reference_date: "2026-11-03", people: [{ id: "a", role: "principal", label: "Client A", applies: true }], facts: [{ about: "a", fact: "person.family_name", value: "Doe" }, { about: "a", fact: "person.given_name", value: "Ana" }], none_apply: [] };
  const key21 = { edition: OLD.form_edition, people: { a: { [`${A}familyName[0]`]: "Doe", [`${A}givenName[0]`]: "Ana" } } };
  const key25 = { edition: NEW.form_edition, people: { a: { [`${A}familyName[0]`]: "Doe", [`${A}givenName[0]`]: "Ana", [D]: "Doe" } } };
  const run = (maps: unknown[], i: unknown, k: unknown) => runFieldMap(ks(maps), family as never, "IMM 5476", i as never, k as never) as { result?: string; lines: { pass: boolean; target: string }[] };
  const r21 = run([right21, m25], inv21, key21), r25 = run([right21, m25], inv25, key25);
  ok("B1 pass: on a release holding both editions, a correct 11-2021 key passes on the 11-2021 map (its own boxes only), and a correct 11-2025 key passes on 11-2025",
    r21.lines.every((l) => l.pass) && !r21.lines.some((l) => l.target === D) && r25.lines.every((l) => l.pass) && r25.lines.some((l) => l.target === D), { r21: r21.lines.filter((l) => !l.pass), r25: r25.lines.filter((l) => !l.pass) });
  const plain25 = { ...NEW, entries: [e(`${A}familyName[0]`, "person.family_name"), e(`${A}givenName[0]`, "person.given_name")] };
  const bad = run([wrong21, plain25], inv21, key21);
  ok("B1 fail: a wrongly wired 11-2021 map fails its key even when the 11-2025 map is right (never a false pass from the edition in use)", bad.lines.some((l) => !l.pass), bad.lines);
}

// ── The fill itself (api/src/fill.ts writeForm, the one filler for the preview and a case): IRCC's 11-2025 file.
const dir = mkdtempSync(join(tmpdir(), "edition-in-use-"));
try {
  const both = await writeForm(snap([map(OLD, "old.box"), map(NEW, "new.box")]), { boxes: [] }, "IMM 5476", dir, "both");
  const req = JSON.parse(readFileSync(join(dir, "both.request.json"), "utf8"));
  ok("P-32 pass (the scenario): a release holding 11-2021 and 11-2025 fills IRCC's 11-2025 file (imm5476e.pdf)", req.form_file === NEW.official_file && both.report?.form_file === NEW.official_file, { request: req.form_file, report: both.report?.form_file });
  const old = await writeForm(snap([map(OLD, "old.box")]), { boxes: [] }, "IMM 5476", dir, "old");
  ok("P-32 fail: a case pinned to a release with only 11-2021 still fills 11-2021 (P-67: open cases stay on their release)", JSON.parse(readFileSync(join(dir, "old.request.json"), "utf8")).form_file === OLD.official_file && old.report?.form_file === OLD.official_file, old.report?.form_file);
  // Breaker m2: a newer edition with no field list recorded is refused in words naming that edition, never filled from the older one.
  const words = await writeForm(snap([map(OLD, "old.box"), map({ ...NEW, inventory_file: "" } as typeof NEW, "new.box")]), { boxes: [] }, "IMM 5476", dir, "nolist").then(() => "", (x: Error & { response?: { detail?: string } }) => String(x.response?.detail ?? x.message));
  ok("P-32 fail (breaker m2): the edition in use with no form field list is refused, naming 11-2025, never filled from 11-2021", /11-2025/.test(words) && /not recorded/.test(words), words);
  ok("P-32 pass: a newer edition with its files fills even when the older one has none recorded", (await writeForm(snap([map({ ...OLD, inventory_file: "" } as typeof OLD, "old.box"), map(NEW, "new.box")]), { boxes: [] }, "IMM 5476", dir, "nolist-old")).report?.form_file === NEW.official_file);
} catch (e) {
  ok("P-32: the filler ran on IRCC's two IMM 5476 files", false, (e as Error).message);
} finally { rmSync(dir, { recursive: true, force: true }); }

process.exitCode = summary() ? 1 : 0;
