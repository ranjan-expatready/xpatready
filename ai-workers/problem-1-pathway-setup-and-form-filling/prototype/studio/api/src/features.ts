// Each feature registers its own controllers and providers in a file of its own, api/src/features/<feature>.ts, so two
// pull requests that each add a controller no longer edit the same line of main.ts (P-214: the shared @Module list
// conflicted 4 times on 1 Nov). A feature file is one default export:
//   import { Thing, ThingController } from "../thing.ts";
//   export default { controllers: [ThingController], providers: [Thing] } satisfies Feature;
// At start-up, main.ts adds every feature, in file-name order, after the classes its own @Module list already names.
// A file that does not have that shape stops the start-up with its name (a missing feature must never pass silently).
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { MODULE_METADATA } from "@nestjs/common/constants.js";

export type Feature = { controllers?: unknown[]; providers?: unknown[] };
export const FEATURES_DIR = join(dirname(fileURLToPath(import.meta.url)), "features");

/** Reads every feature file in `dir` and adds its classes to `module`'s controllers and providers (each class once). */
export async function registerFeatures(module: object, dir = FEATURES_DIR): Promise<string[]> {
  const files = readdirSync(dir).filter((f) => /\.ts$/.test(f) && !/\.d\.ts$/.test(f)).sort();
  for (const f of files) {
    const feature = (await import(pathToFileURL(join(dir, f)).href)).default as Feature | undefined;
    const lists = feature && typeof feature === "object" ? [feature.controllers ?? [], feature.providers ?? []] : null;
    if (!lists || !lists.every(Array.isArray) || lists.flat().some((c) => c == null) || !lists.flat().length)
      throw new Error(`api/src/features/${f}: export default { controllers: [...], providers: [...] } with at least one class (no undefined: check the import names).`);
    for (const [key, add] of [[MODULE_METADATA.CONTROLLERS, lists[0]], [MODULE_METADATA.PROVIDERS, lists[1]]] as const) {
      const have: unknown[] = Reflect.getMetadata(key, module) ?? [];
      Reflect.defineMetadata(key, [...have, ...add.filter((c) => !have.includes(c))], module);
    }
  }
  return files;
}
