import {
  newQuickJSWASMModuleFromVariant,
  newVariant,
  type CustomizeVariantOptions,
  type QuickJSSyncVariant,
  type QuickJSWASMModule,
} from 'quickjs-emscripten-core';
import { XfaScriptError } from './errors.js';

function isSyncVariant(value: unknown): value is QuickJSSyncVariant {
  return (
    typeof value === 'object' &&
    value !== null &&
    Reflect.get(value, 'type') === 'sync' &&
    typeof Reflect.get(value, 'importFFI') === 'function' &&
    typeof Reflect.get(value, 'importModuleLoader') === 'function'
  );
}

/**
 * The package's typings describe CommonJS (`default.default`) while Node and bundlers load its ESM build (`default`);
 * accept either, and fail typed if neither is a sync variant (e.g. a future major changes the shape).
 */
async function importVariant(): Promise<QuickJSSyncVariant> {
  const mod: { readonly default: unknown } = await import('@jitl/quickjs-wasmfile-release-sync');
  const first = mod.default;
  const nested: unknown = typeof first === 'object' && first !== null ? Reflect.get(first, 'default') : undefined;
  const candidate = isSyncVariant(first) ? first : nested;
  if (!isSyncVariant(candidate)) throw new XfaScriptError('HOST_ERROR', 'QuickJS release-sync variant has an unexpected module shape');
  return candidate;
}

/**
 * Instantiates a PRIVATE QuickJS WebAssembly module (release build, synchronous variant, MIT) for one sandbox.
 *
 * One module per form run, deliberately: a module's linear memory never shrinks and its shadow-stack pointer is
 * not restored when a trap unwinds through it (QuickJS native recursion such as `String(deeplyNestedArray)` can
 * overflow the V8 stack and throw a `RangeError` out of the WASM). With a module per sandbox, a memory bomb's
 * pages and a corrupted instance die with the sandbox's garbage collection instead of leaking into the next form
 * run. Cost: ~1.5 ms warm (see the A5 evidence), against ~5 ms for the very first load in a process.
 *
 * WASM loading outside Node: the variant's `emscripten-module` entry has `browser` / `workerd` export conditions,
 * so a bundler resolves the right loader and emits the `.wasm` asset itself. When the host application must control
 * where the bytes come from (CSP, CDN, service worker), pass `customize` - e.g. `{ wasmBinary: () => fetch(url).then(r => r.arrayBuffer()) }`,
 * `{ wasmLocation }`, or a pre-compiled `{ wasmModule }` shared across sandboxes to skip recompilation - which goes
 * through the library's `newVariant`.
 */
let firstInitMs: number | undefined;

export async function createQuickJsModule(customize?: CustomizeVariantOptions): Promise<QuickJSWASMModule> {
  const started = performance.now();
  const base = await importVariant();
  const module = await newQuickJSWASMModuleFromVariant(customize === undefined ? base : newVariant(base, customize));
  firstInitMs ??= performance.now() - started;
  return module;
}

/** Milliseconds the first module instantiation in this process took (variant import + WASM compile + instantiate), once it has happened. */
export function quickJsColdInitMs(): number | undefined {
  return firstInitMs;
}
