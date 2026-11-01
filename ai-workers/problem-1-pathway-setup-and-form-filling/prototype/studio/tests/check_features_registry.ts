// P-214 (merge flow): each feature registers its controllers and providers in api/src/features/<feature>.ts, and main.ts
// adds them at start-up, so pull requests that each add a controller stop editing one shared line. No server, no
// database, no model call (US$0).
//   tsx studio/tests/check_features_registry.ts
import "reflect-metadata";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MODULE_METADATA } from "@nestjs/common/constants.js";
import { FEATURES_DIR, registerFeatures } from "../api/src/features.ts";

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

    // The real wiring: main.ts calls registerFeatures before the app is created, and the folder exists with its guide.
    const main = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "api", "src", "main.ts"), "utf8");
    ok("P-214 pass: main.ts registers the features before NestFactory.create", /await registerFeatures\(AppModule\);[\s\S]*NestFactory\.create/.test(main));
    ok("P-214 pass: the features folder exists with its guide", readFileSync(join(FEATURES_DIR, "README.md"), "utf8").includes("export default"));
  } finally { rmSync(dir, { recursive: true, force: true }); }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
