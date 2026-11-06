// P-214 (merge flow): each feature registers its controllers and providers in api/src/features/<feature>.ts, and main.ts
// adds them at start-up, so pull requests that each add a controller stop editing one shared line. No server, no
// database, no model call (US$0).
//   tsx studio/tests/check_features_registry.ts
import "reflect-metadata";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MODULE_METADATA } from "@nestjs/common/constants.js";
import { FEATURES_DIR, featureSteps, registerFeatures, stateOf, type Step } from "../api/src/features.ts";

let pass = 0, fail = 0;
const ok = (name: string, cond: boolean, detail?: unknown) => { cond ? pass++ : fail++; console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail)}` : ""}`); };
const names = (m: object, k: string) => ((Reflect.getMetadata(k, m) ?? []) as { name: string }[]).map((c) => c.name);

(async () => {
  const dir = mkdtempSync(join(tmpdir(), "features-"));
  try {
    writeFileSync(join(dir, "b-second.ts"), `export class BController {}\nexport class BService {}\nexport default { controllers: [BController], providers: [BService] };\n`);
    writeFileSync(join(dir, "a-first.ts"), `export class AController {}\nexport default { controllers: [AController] };\n`);
    writeFileSync(join(dir, "notes.md"), "not a feature");
    class Shared {}
    class AppModule {}
    Reflect.defineMetadata(MODULE_METADATA.CONTROLLERS, [Shared], AppModule);
    Reflect.defineMetadata(MODULE_METADATA.PROVIDERS, [Shared], AppModule);
    const files = await registerFeatures(AppModule, dir);
    ok("P-214 pass: every feature file is read, in file-name order; other files are skipped", JSON.stringify(files) === JSON.stringify(["a-first.ts", "b-second.ts"]), files);
    ok("P-214 pass: feature controllers come after the module's own, in file-name order", JSON.stringify(names(AppModule, MODULE_METADATA.CONTROLLERS)) === JSON.stringify(["Shared", "AController", "BController"]), names(AppModule, MODULE_METADATA.CONTROLLERS));
    ok("P-214 pass: feature providers are added and the module's own stay", JSON.stringify(names(AppModule, MODULE_METADATA.PROVIDERS)) === JSON.stringify(["Shared", "BService"]), names(AppModule, MODULE_METADATA.PROVIDERS));
    await registerFeatures(AppModule, dir);
    ok("P-214 pass: a class already registered is never added twice", names(AppModule, MODULE_METADATA.CONTROLLERS).length === 3, names(AppModule, MODULE_METADATA.CONTROLLERS));

    for (const [file, body, why] of [
      ["c-empty.ts", "export default {};\n", "no class"],
      ["c-none.ts", "export const x = 1;\n", "no default export"],
      ["c-undef.ts", "const Missing = undefined;\nexport default { controllers: [Missing] };\n", "an import name that does not exist (undefined)"],
    ]) {
      const bad = mkdtempSync(join(tmpdir(), "features-bad-"));
      writeFileSync(join(bad, file), body);
      let err = "";
      try { await registerFeatures(class M {}, bad); } catch (e) { err = (e as Error).message; }
      ok(`P-214 fail: a feature file with ${why} stops the start-up, naming the file`, err.includes(`api/src/features/${file}`), err);
      rmSync(bad, { recursive: true, force: true });
    }

    // B120 (P-376 (3)): the same index for steps (features/checkpoint/, its combination/ and features/placement/).
    mkdirSync(join(dir, "steps"));
    ok("B120 pass: a step folder inside features/ is not a feature (registerFeatures reads only .ts files)", JSON.stringify(await registerFeatures(class M {}, dir)) === JSON.stringify(["a-first.ts", "b-second.ts"]));
    const steps = mkdtempSync(join(tmpdir(), "steps-"));
    const order: string[] = [];
    (globalThis as { b120Order?: string[] }).b120Order = order;
    const step = (name: string) => `export default { init() { globalThis.b120Order.push("init ${name}"); }, async run(ctx) { globalThis.b120Order.push("run ${name}"); } };\n`;
    writeFileSync(join(steps, "100-later.ts"), step("100"));
    writeFileSync(join(steps, "20-sooner.ts"), step("20"));
    writeFileSync(join(steps, "_helper.ts"), "export const helper = 1;\n");
    writeFileSync(join(steps, "notes.md"), "not a step");
    const got = await featureSteps<Step & { run: () => Promise<void> }>(steps);
    ok("B120 pass: steps run in their file-name number order (20 before 100), helpers (_*.ts) and other files skipped", JSON.stringify(got.map((x) => x.file)) === JSON.stringify(["20-sooner.ts", "100-later.ts"]), got.map((x) => x.file));
    for (const g of got) await g.run();
    const cls = mkdtempSync(join(tmpdir(), "steps-class-"));
    writeFileSync(join(cls, "010-class.ts"), `export default new (class { async run() { globalThis.b120Order.push("run class"); } })();\n`);
    const fromClass = await featureSteps<Step & { run: () => Promise<void> }>(cls);
    order.length = 0; await fromClass[0].run();
    ok("B120 pass (break F1): a step whose run is defined on a class is kept and runs", JSON.stringify(order) === JSON.stringify(["run class"]) && fromClass[0].file === "010-class.ts", order);
    rmSync(cls, { recursive: true, force: true });
    order.length = 0; for (const g of got) await g.run(); order.unshift("init 20", "init 100");
    ok("B120 pass: each step's init runs once at load, in order, before any run", JSON.stringify(order) === JSON.stringify(["init 20", "init 100", "run 20", "run 100"]), order);
    rmSync(steps, { recursive: true, force: true });
    for (const [files, why, names] of [
      [{ "010-a.ts": step("a"), "10-b.ts": step("b") }, "two steps with one number (010 and 10)", ["010-a.ts", "10-b.ts"]],
      [{ "030-no-run.ts": "export default { prepare() {} };\n" }, "a step without run", ["030-no-run.ts"]],
      [{ "040-none.ts": "export const run = () => 1;\n" }, "a step with no default export", ["040-none.ts"]],
      [{ "form-boxes.ts": step("x") }, "a file that is neither NNN-<feature>.ts nor _<name>.ts", ["form-boxes.ts"]],
      [{ "050-Form_Boxes.ts": step("x") }, "a step name not in lower-case words", ["050-Form_Boxes.ts"]],
      [{ "010-a.ts": step("a"), "005-js-first.js": step("js") }, "a step file in JavaScript (.js), which would never run (break F2)", ["005-js-first.js"]],
      [{ "_helper.mts": "export const x = 1;\n" }, "a helper of another module kind (.mts) (break F2)", ["_helper.mts"]],
    ] as [Record<string, string>, string, string[]][]) {
      const bad = mkdtempSync(join(tmpdir(), "steps-bad-"));
      for (const [f, body] of Object.entries(files)) writeFileSync(join(bad, f), body);
      let err = "";
      try { await featureSteps(bad); } catch (e) { err = (e as Error).message; }
      ok(`B120 fail: ${why} stops the start-up, naming the file${names.length > 1 ? "s" : ""}`, !!err && names.every((n) => err.includes(n)), err);
      rmSync(bad, { recursive: true, force: true });
    }
    const counter = stateOf(() => ({ n: 0 }));
    const runA = {}, runB = {};
    counter(runA).n++; counter(runA).n++; counter(runB).n++;
    ok("B120 pass: state a step makes is per run (one context, one state; a new run starts from init)", counter(runA).n === 2 && counter(runB).n === 1 && counter({}).n === 0);
    // The real folders load, in the order the configured checkpoint and placeFromFormParts ran before the split.
    const real = async (sub: string) => (await featureSteps(join(FEATURES_DIR, sub))).map((x) => x.file.replace(/\.ts$/, ""));
    const checkpoint = await real("checkpoint"), combination = await real(join("checkpoint", "combination")), placement = await real("placement");
    ok("B120 pass: the configured checkpoint's steps load, in their order", JSON.stringify(checkpoint) === JSON.stringify(["010-held-file", "020-online-capture", "030-irm0002", "040-field-map-review", "050-named-document-types", "060-sections-from-forms", "070-library-approvals", "075-reset", "080-form-setup", "090-row-seven", "095-questionnaire", "100-form-roles", "110-release-one", "120-family-case", "130-release-two", "140-family-case-rows", "150-filled-copies", "170-new-edition"]), checkpoint);
    ok("B120 pass: each combination's form-setup steps load, in their order", JSON.stringify(combination) === JSON.stringify(["100-form-lines", "110-marital-list", "120-family-form", "130-rule-facts", "140-own-yes-no", "150-approve-library", "200-place-from-parts", "210-rule-facts-beside", "220-placement-results", "300-reviewed-release-documents", "310-checklist-documents", "320-cited-documents", "330-approve-document-types", "400-edition-form-fields"]), combination);
    ok("B120 pass: the placement passes load, in their order", JSON.stringify(placement) === JSON.stringify(["10-form-boxes", "20-condition-facts"]), placement);
    const demo = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "api", "src", "demo.ts"), "utf8");
    ok("B120 pass: Demo reads the checkpoint's steps at start-up (onModuleInit), so a bad step file stops the start-up", /async onModuleInit\(\) \{\s*this\.steps = await featureSteps<CheckpointStep>\(join\(FEATURES_DIR, "checkpoint"\)\);/.test(demo));
    ok("B120 fail (review m7): no step file stops the start-up, and a load with no steps stops in words, never loading the six alone", /if \(!this\.steps\.length\) throw new Error\("api\/src\/features\/checkpoint: no step file/.test(demo) && /loadConfigured\([^)]*\) \{\s*if \(!this\.steps\.length\) throw/.test(demo));

    // The real wiring: main.ts calls registerFeatures before the app is created, and the folder exists with its guide.
    const main = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "api", "src", "main.ts"), "utf8");
    ok("P-214 pass: main.ts registers the features before NestFactory.create", /await registerFeatures\(AppModule\);[\s\S]*NestFactory\.create/.test(main));
    ok("P-214 pass: the features folder exists with its guide", readFileSync(join(FEATURES_DIR, "README.md"), "utf8").includes("export default"));
  } finally { rmSync(dir, { recursive: true, force: true }); }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
