// QA-180 (Critical; BR-8, P-297 (3), V3 B1): Review and release and Open a case read one rule for "a form with no field
// map" (engine/programs.ts formsWithoutFieldMap), so a combination that releases is one a firm can open a case on. A pass
// and a fail case per hole: (1) no field map, (2) a field map with 0 entries, (3) only an Online map, (4) the edition in
// use: the newest PDF edition (P-32, the one a case fills) has no form fields while an older one does; before this, both
// gates accepted any mapped PDF edition, so a case filled an empty map. Plus: both gates refuse the same forms in every
// variant, a document form never needs a map, and the release line names the form in words. Pure engine, US$0.
//   tsx --tsconfig studio/api/tsconfig.json studio/tests/check_qa180_one_rule.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as programs from "../engine/programs.ts";
import { problemWords } from "../contracts/programs.ts";
import { validate, type Problem } from "../engine/validate.ts";
import type { Snapshot } from "../engine/snapshot.ts";

let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 260)}` : ""}`); };

const full = JSON.parse(readFileSync(join(import.meta.dirname, "fixtures", "screen01-work-permit-release.json"), "utf8")) as Snapshot;
const people = [{ role: "principal", label: "Principal applicant", min: 1, max: 1 }, { role: "spouse_or_partner", label: "Spouse or partner", min: 0, max: 1 }];
type Map = { form_number: string; form_edition: string; channel?: string; entries: unknown[] };
const maps = full.field_maps as Map[];
const FORM = "IMM 1295";
const withMaps = (m: Map[]) => ({ ...full, field_maps: m }) as Snapshot;
/** The forms Open a case refuses (the startable check's form_without_edition line). */
const { missingItems, pdfMapInUse } = programs;
/** The shared rule; before QA-180 there was none (each gate had its own copy), so the "one rule" checks fail there. */
const formsWithoutFieldMap = (s: Snapshot) => ((programs as { formsWithoutFieldMap?: (s: Snapshot) => { form_number: string }[] }).formsWithoutFieldMap?.(s) ?? [{ form_number: "(no shared rule)" }]);
/** The forms Open a case refuses: the startable check's line "No form fields mapped yet for A, B." */
const caseRefuses = (s: Snapshot) => (missingItems(s, people as never, []).find((m) => m.code === "form_without_edition")?.text.match(/No form fields mapped yet for (.*?)\.( |$)/)?.[1].split(", ") ?? []).sort();
const releaseLines = (s: Snapshot) => validate(s, [], []).filter((p) => p.level === "error" && p.where === "Forms" && p.code === "no_field_map");
const releaseRefuses = (s: Snapshot) => releaseLines(s).map((p) => p.item).sort();
const lineFor = (s: Snapshot, form: string): Problem | undefined => releaseLines(s).find((p) => p.item === form);

// Pass: every data form mapped.
ok("pass: every data form mapped, neither gate refuses a form", !releaseRefuses(full).length && !caseRefuses(full).length, { release: releaseRefuses(full), case: caseRefuses(full) });

// Hole 1: no field map.
const noMap = withMaps(maps.filter((m) => m.form_number !== FORM));
ok("hole 1 fail: no field map, release refuses IMM 1295", releaseRefuses(noMap).includes(FORM), releaseRefuses(noMap));
ok("hole 1 fail: no field map, Open a case refuses IMM 1295", caseRefuses(noMap).includes(FORM), caseRefuses(noMap));

// Hole 2: a map with 0 entries.
const empty = withMaps(maps.map((m) => (m.form_number === FORM ? { ...m, entries: [] } : m)));
ok("hole 2 fail: 0 entries, release refuses IMM 1295", releaseRefuses(empty).includes(FORM), releaseRefuses(empty));
ok("hole 2 fail: 0 entries, Open a case refuses IMM 1295", caseRefuses(empty).includes(FORM));

// Hole 3: only an Online map (P-102: every form is read from its PDF).
const online = withMaps(maps.map((m) => (m.form_number === FORM ? { ...m, channel: "ONLINE" } : m)));
ok("hole 3 fail: only an Online map, release refuses IMM 1295", releaseRefuses(online).includes(FORM));
ok("hole 3 fail: only an Online map, Open a case refuses IMM 1295", caseRefuses(online).includes(FORM));

// Hole 4: the edition in use. The fixture's IMM 1295 (09-2023) is mapped; a newer edition 06-2025 arrives with no form
// fields. A case fills the newest (pdfMapInUse, P-32), so the release must be refused, and the case too.
const old = maps.find((m) => m.form_number === FORM)!;
const newerEmpty = withMaps([...maps, { ...old, form_edition: "IMM 1295 (06-2025)", entries: [] }]);
ok("setup: the edition a case fills is the newer, empty one", pdfMapInUse(newerEmpty.field_maps as Map[], FORM)?.form_edition === "IMM 1295 (06-2025)" && !pdfMapInUse(newerEmpty.field_maps as Map[], FORM)!.entries.length);
ok("hole 4 fail: edition in use unmapped (older one mapped), release refuses IMM 1295", releaseRefuses(newerEmpty).includes(FORM), releaseRefuses(newerEmpty));
ok("hole 4 fail: edition in use unmapped, Open a case refuses IMM 1295", caseRefuses(newerEmpty).includes(FORM), caseRefuses(newerEmpty));
const w4 = lineFor(newerEmpty, FORM);
ok("hole 4: the release line names the edition in use, the one a case fills", !!w4 && w4.message.includes("IMM 1295 (06-2025)") && /the one a case fills/.test(w4.message), w4?.message);
// Pass side of hole 4: the newer edition mapped and an older empty one listed: nothing refused.
const olderEmpty = withMaps([...maps.map((m) => (m.form_number === FORM ? { ...m, form_edition: "IMM 1295 (06-2025)" } : m)), { ...old, form_edition: "IMM 1295 (09-2023)", entries: [] }]);
ok("hole 4 pass: the newest edition mapped (an older one empty), neither gate refuses", !releaseRefuses(olderEmpty).includes(FORM) && !caseRefuses(olderEmpty).includes(FORM), { release: releaseRefuses(olderEmpty), case: caseRefuses(olderEmpty) });

// One rule: in every variant both gates refuse exactly the forms the shared rule lists.
const variants = { full, noMap, empty, online, newerEmpty, olderEmpty, none: withMaps([]) };
for (const [name, s] of Object.entries(variants)) {
  const rule = formsWithoutFieldMap(s).map((f) => f.form_number).sort();
  ok(`one rule (${name}): release and Open a case refuse the same forms as formsWithoutFieldMap`, JSON.stringify(rule) === JSON.stringify(releaseRefuses(s)) && JSON.stringify(rule) === JSON.stringify(caseRefuses(s)), { rule, release: releaseRefuses(s), case: caseRefuses(s) });
}
// A document form (a checklist, not filled) never needs a field map.
ok("pass: document forms (IMM 5488, IMM 5905) are never refused for a field map", !formsWithoutFieldMap(withMaps([])).some((f) => ["IMM 5488", "IMM 5905"].includes(f.form_number)));

// The release screen's line (web/src/pages/review.tsx problemLine → problemWords) names the form by number, once, and by
// its title in the words (review m3: one way per list, no nested brackets).
const said = problemWords(lineFor(noMap, FORM)!);
ok("words: Review and release names the form in plain words", said.startsWith(`${FORM}: No form fields mapped yet: a case could not fill the form "Application for Work Permit made Outside of Canada"`) && /or remove the form\.$/.test(said), said);
ok("words: no field key or code in the line", !/no_field_map|form_without_edition|\b[a-z]+\.[a-z_]+\b/.test(said), said);
// Review m1: the only family information form (C3.8 requires one when the package lists it) is never offered "remove".
const no5707 = withMaps(maps.filter((m) => m.form_number !== "IMM 5707"));
const w5707 = lineFor(no5707, "IMM 5707")?.message ?? "";
ok("words (m1): IMM 5707, the family information form, is offered mapping, not removal", /Map its form fields/.test(w5707) && !/or remove the form/.test(w5707) && /family information form/.test(w5707), w5707);
ok("words (m1, pass side): another form is still offered removal", /or remove the form\./.test(lineFor(noMap, FORM)?.message ?? ""));
// Review m2: "an older edition's map is not used" only when an older edition is mapped.
const onlyEmpty = withMaps(maps.map((m) => (m.form_number === FORM ? { ...m, form_edition: "IMM 1295 (06-2025)", entries: [] } : m)));
ok("words (m2): the older-edition note shows when an older edition is mapped", /an older edition's map is not used/.test(w4?.message ?? ""));
ok("words (m2): and not when the edition in use is the only one", !!lineFor(onlyEmpty, FORM) && !/older edition/.test(lineFor(onlyEmpty, FORM)!.message), lineFor(onlyEmpty, FORM)?.message);

console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
