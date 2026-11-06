// Each feature registers its own controllers and providers in a file of its own, api/src/features/<feature>.ts, so two
// pull requests that each add a controller no longer edit the same line of main.ts (P-214: the shared @Module list
// conflicted 4 times on 1 Nov). A feature file is one default export:
//   import { Thing, ThingController } from "../thing.ts";
//   export default { controllers: [ThingController], providers: [Thing] } satisfies Feature;
// At start-up, main.ts adds every feature, in file-name order, after the classes its own @Module list already names.
// A file that does not have that shape stops the start-up with its name (a missing feature must never pass silently).
import { readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
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

// B120 (P-376 (3)): the same index for steps. A run that grows a step per feature (the configured checkpoint, the
// placement passes) reads its steps from a folder under features/, one file each, so two pull requests that each add a
// step add two files and edit no shared line. A step file is named NNN-<feature>.ts, the number giving its place in the
// run; it is one default export with a run function:
//   export default { async run(ctx) { … } } satisfies CheckpointStep;
// A file named _<name>.ts is a helper, not a step. Anything else, a step without run, or two steps with one number stops
// the start-up with the file names: a step out of order or quietly skipped would change the data the run writes.
const API_SRC = dirname(fileURLToPath(import.meta.url));
export type Step = { run: (...a: never[]) => unknown; init?: () => unknown };
const STEP_NAME = /^(\d+)-[a-z0-9]+(?:-[a-z0-9]+)*\.ts$/;

/** The steps in `dir`, in their file-name number order, each one's init (if any) awaited in that order. */
export async function featureSteps<S extends Step>(dir: string): Promise<(S & { file: string })[]> {
  const where = (f: string) => { const r = relative(API_SRC, join(dir, f)); return r.startsWith("..") ? join(dir, f) : `api/src/${r}`; };
  const files = readdirSync(dir).filter((f) => /\.ts$/.test(f) && !/\.d\.ts$/.test(f) && !f.startsWith("_")).sort();
  const bad = files.filter((f) => !STEP_NAME.test(f));
  if (bad.length) throw new Error(`${bad.map(where).join(", ")}: not a step; name a step NNN-<feature>.ts (NNN its place in the run) and a helper _<name>.ts.`);
  const byNumber = new Map<number, string[]>();
  for (const f of files) { const n = Number(STEP_NAME.exec(f)![1]); byNumber.set(n, [...(byNumber.get(n) ?? []), f]); }
  const tied = [...byNumber.values()].filter((x) => x.length > 1);
  if (tied.length) throw new Error(`${tied.map((x) => x.map(where).join(" and ")).join("; ")}: two steps with one number; give each its own, in the order they must run.`);
  const steps: (S & { file: string })[] = [];
  for (const f of [...files].sort((a, b) => Number(STEP_NAME.exec(a)![1]) - Number(STEP_NAME.exec(b)![1]))) {
    const step = (await import(pathToFileURL(join(dir, f)).href)).default as S | undefined;
    if (!step || typeof step !== "object" || typeof step.run !== "function") throw new Error(`${where(f)}: export default { run(ctx) { … } } (a step needs a run function; check the export).`);
    steps.push({ ...step, file: f });
  }
  for (const s of steps) await s.init?.();
  return steps;
}

/** State one step makes and later steps read, for one run: `export const sections = stateOf(() => ({ made: [] }))`, read
 *  as `sections(ctx)`. Keyed by the run's context object, so each run starts from `init()` and nothing outlives it. */
export function stateOf<T>(init: () => T): (ctx: object) => T {
  const of = new WeakMap<object, T>();
  return (ctx) => { if (!of.has(ctx)) of.set(ctx, init()); return of.get(ctx)!; };
}
