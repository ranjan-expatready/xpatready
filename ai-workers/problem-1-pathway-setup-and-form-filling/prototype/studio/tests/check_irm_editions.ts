// IRM editions (runtime, paid runner's finding on #798; tech lead 4 Nov): IRCC numbers most forms IMM and some IRM: Guide
// 5256 asks for IRM 0002 (conditional). A printed edition "IRM 0002 (03-2021)" was refused everywhere a form edition is
// checked: the field-map entry contract (a saved map stored as contract-invalid), the released configuration contract,
// the launcher's known fact (p2/launch.ts knownOk) and the studio's edition rule (engine/rounds.ts PRINTED_EDITION,
// used by sources.ts, field-drafts.ts, form-masters.ts and impact-ai.ts). Each now takes IMM or IRM and still refuses
// any other prefix or shape. The money guard's approval rule (p2/guard.ts) is proved in check_forms_p80_guard.ts.
// No server, no database, NO model call (US$0).
//   cd prototype/studio && npx tsx --tsconfig api/tsconfig.json tests/check_irm_editions.ts
import { Ajv } from "ajv";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const PROTOTYPE = join(import.meta.dirname, "..", "..");
let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };

const GOOD = ["IMM 5257 (09-2023)", "IMM 5257 SCH1 (09-2023)", "IMM 0008 DEP (10-2024)", "IRM 0002 (03-2021)"];
const BAD = ["XYZ 1 (01-2020)", "IRM0002 (03-2021)", "irm 0002 (03-2021)", "IRM 0002", "IRM 0002 (3-2021)", "IMR 0002 (03-2021)", "IRMX 0002 (03-2021)", " IRM 0002 (03-2021)"];
const verdicts = (test: (s: string) => boolean) => ({ good: GOOD.filter((s) => !test(s)), bad: BAD.filter((s) => test(s)) });
const clean = (v: { good: string[]; bad: string[] }) => !v.good.length && !v.bad.length;

// ── the two contracts: their form_edition pattern, compiled as the converter and the release writer use them
const ajv = new Ajv({ strict: false });
const editionSchema = (file: string): object | null => {
  let found: object | null = null;
  const walk = (x: unknown) => { if (!x || typeof x !== "object" || found) return; const o = x as Record<string, unknown>; const fe = (o.properties as Record<string, unknown> | undefined)?.form_edition; if (fe && typeof fe === "object" && "pattern" in fe) { found = fe; return; } Object.values(o).forEach(walk); };
  walk(JSON.parse(readFileSync(join(PROTOTYPE, "contracts", file), "utf8")));
  return found;
};
for (const file of ["field-map-entry.v0.schema.json", "released-configuration.v0.schema.json"]) {
  const s = editionSchema(file);
  const v = s ? verdicts((x) => ajv.validate(s, x) as boolean) : { good: GOOD, bad: [] };
  ok(`IRM pass/fail: ${file}'s form_edition takes IMM and IRM editions ("IRM 0002 (03-2021)") and still refuses every other prefix or shape ("XYZ 1 (01-2020)")`, !!s && clean(v), v);
}

// ── the launcher's known fact
const { knownOk } = await import("../../p2/launch.ts");
const lv = verdicts((x) => knownOk({ form_edition: x }));
ok("IRM pass/fail: the launcher admits an IRM edition as a field-map job's known fact, and still refuses \"XYZ 1 (01-2020)\" and the other bad shapes", clean(lv), lv);
ok("IRM fail (breaker m2): a known edition that is not text (a list holding the words) is refused", !knownOk({ form_edition: ["IRM 0002 (03-2021)"] }) && !knownOk({ form_edition: [["IMM 5257 (09-2023)"]] }));

// ── the studio's one edition rule, and its parts (the edition's context key a saved answer belongs to)
const rounds = (await import("../engine/rounds.ts")) as { PRINTED_EDITION?: RegExp; printedEditionParts?: (p: string) => { code: string; edition: string } | null; editionContextKey: (c: string, e: string) => string };
const rv = rounds.PRINTED_EDITION ? verdicts((x) => rounds.PRINTED_EDITION!.test(x)) : { good: GOOD, bad: [] };
ok("IRM pass/fail: the studio's printed-edition rule takes IMM and IRM, and refuses the rest", !!rounds.PRINTED_EDITION && clean(rv), rv);
const parts = rounds.printedEditionParts?.("IRM 0002 (03-2021)") ?? null;
ok("IRM pass: IRM 0002 (03-2021) reads as form IRM 0002, edition 03-2021, and its saved answers belong to edition:IRM 0002:03-2021", parts?.code === "IRM 0002" && parts.edition === "03-2021" && rounds.editionContextKey(parts.code, parts.edition) === "edition:IRM 0002:03-2021", parts);
ok("IRM fail: \"XYZ 1 (01-2020)\" is not a printed edition (no parts)", !!rounds.printedEditionParts && rounds.printedEditionParts("XYZ 1 (01-2020)") === null);

// The impact step's context key (api/src/impact-ai.ts) for an IRM edition is the edition's own key, not the fallback.
process.env.DATABASE_URL ??= "postgresql://xr_studio@127.0.0.1:54329/unused"; // the module is pure here; nothing connects
const { impactContext } = await import("../api/src/impact-ai.ts");
const part = { file: "x.part.json", rel: "prototype/p2/parts/x.part.json", sha256: "0".repeat(64) } as Parameters<typeof impactContext>[1];
ok("IRM pass: the impact step files an IRM edition's saved answer under edition:IRM 0002:03-2021 (before: edition:IRM 0002 (03-2021))", impactContext("IRM 0002 (03-2021)", part).contextKey === "edition:IRM 0002:03-2021", impactContext("IRM 0002 (03-2021)", part).contextKey);
ok("IRM fail: a bad prefix still falls back to its own words, never an edition key", impactContext("XYZ 1 (01-2020)", part).contextKey === "edition:XYZ 1 (01-2020)");

// ── one rule: no studio API file keeps its own IMM-only edition pattern (they use engine/rounds.ts); and (breaker m5) no
// pattern in the studio's api, engine or the drafting path reads IMM without IRM. The one kept: finder.ts's guide numbers
// (IRCC's guides are numbered IMM only).
const API = join(import.meta.dirname, "..", "api", "src");
const own = readdirSync(API).filter((f) => f.endsWith(".ts")).filter((f) => /\/\^\(?(?:\?:)?IMM \[0-9A-Z \]/.test(readFileSync(join(API, f), "utf8")));
ok("IRM fail (drift): no studio API file holds its own IMM-only edition pattern", own.length === 0, own);
const dirs = [API, join(import.meta.dirname, "..", "engine"), join(PROTOTYPE, "p2")];
const imOnly = dirs.flatMap((d) => readdirSync(d).filter((f) => f.endsWith(".ts")).flatMap((f) => readFileSync(join(d, f), "utf8").split("\n").map((line, i) => ({ at: `${f}:${i + 1}`, line }))))
  .filter(({ at, line }) => !/^\s*(\/\/|\/?\*)/.test(line) && /\/[^/\n]*IMM[^/\n]*\/[gimsuy]*[.;,) ]/.test(line) && !/IRM/.test(line) && !/^finder\.ts:/.test(at)).map((x) => x.at);
ok("IRM fail (breaker m5): no pattern in the studio's api or engine, or in p2, reads IMM without IRM (finder.ts's guide numbers aside)", imOnly.length === 0, imOnly);

console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
