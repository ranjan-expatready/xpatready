// QA-180 (V3 B1, Critical): the release gate and the "can a case open" gate must agree on a form with no field map.
// Today the release gate (engine/validate.ts) only WARNS "No field map yet: the form cannot be filled" and releases,
// while opening a case (engine/programs.ts missingItems via api/src/programs.ts startableMissing) BLOCKS on the same
// form ("form_without_edition"): a released combination no firm can open. A field map with 0 entries is a second hole:
// validate sees a map and says nothing, the startable check blocks. Third: a map whose channel is ONLINE counts for
// release but not for the startable check. A fix may refuse per form or once naming the forms; both pass here. Fails today; passes when one rule decides both
// (P-297 (3): release refuses a combination with a form that has no field map, naming the forms).
// Pure engine, no database, no server, US$0.
//   tsx --tsconfig studio/api/tsconfig.json studio/tests/qa/check_qa180_two_gates.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { missingItems } from "../../engine/programs.ts";
import { validate } from "../../engine/validate.ts";
import type { Snapshot } from "../../engine/snapshot.ts";

let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 220)}` : ""}`); };

// The same real released snapshot check_screen01_rules.ts uses (reviewed work-permit release).
const c1 = JSON.parse(readFileSync(join(import.meta.dirname, "..", "fixtures", "screen01-work-permit-release.json"), "utf8"));
const people = [{ role: "principal", label: "Principal applicant", min: 1, max: 1 }, { role: "spouse_or_partner", label: "Spouse or partner", min: 0, max: 1 }, { role: "child", label: "Child", min: 0, max: 4, applies: false }, { role: "representative", label: "Representative", min: 0, max: 1 }];
const full = { ...c1 } as Snapshot;
const FORM = "IMM 1295";
const blocksCase = (s: Snapshot) => missingItems(s, people as never, []).some((m) => m.code === "form_without_edition" && m.text.includes(FORM));
// A correct fix may refuse per form (item = the form) or once for the combination naming the forms: both count.
const aboutForm = (p: { item?: string; message: string }) => p.item === FORM || p.message.includes(FORM);
const blocksRelease = (s: Snapshot) => validate(s, [], []).some((p) => p.level === "error" && aboutForm(p) && /field map|mapped|cannot be filled/i.test(p.message));
const releaseWords = (s: Snapshot) => validate(s, [], []).filter(aboutForm).map((p) => `${p.level}: ${p.message}`);

ok("setup: the fixture has a field map for IMM 1295", (full.field_maps as { form_number: string }[]).some((m) => m.form_number === FORM));
ok("pass: with its field map, neither gate stops IMM 1295", !blocksCase(full) && !blocksRelease(full));

const noMap = { ...full, field_maps: (full.field_maps as { form_number: string }[]).filter((m) => m.form_number !== FORM) } as Snapshot;
ok("fail (setup): with no field map, opening a case is blocked (form_without_edition)", blocksCase(noMap));
ok("QA-180 fail: with no field map, release is refused too (today it is only a warning, so it releases)", blocksRelease(noMap), releaseWords(noMap));

const emptyMap = { ...full, field_maps: (full.field_maps as { form_number: string; entries: unknown[] }[]).map((m) => (m.form_number === FORM ? { ...m, entries: [] } : m)) } as Snapshot;
ok("fail (setup): with a field map of 0 entries, opening a case is blocked", blocksCase(emptyMap));
ok("QA-180 fail: with a field map of 0 entries, release is refused too (today validate says nothing)", blocksRelease(emptyMap), releaseWords(emptyMap));

const onlineOnly = { ...full, field_maps: (full.field_maps as { form_number: string }[]).map((m) => (m.form_number === FORM ? { ...m, channel: "ONLINE" } : m)) } as Snapshot;
ok("fail (setup): with only an ONLINE field map, opening a case is blocked", blocksCase(onlineOnly));
ok("QA-180 fail: with only an ONLINE field map, release is refused too (today validate accepts any map)", blocksRelease(onlineOnly), releaseWords(onlineOnly));

console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
