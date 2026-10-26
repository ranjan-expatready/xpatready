// Builds the browser extension (F2d; P-90: the existing Vite, no plugin for the extension itself) into a folder that
// Chrome or Edge loads unpacked, or that the team packs for a managed install (M3).
//   tsx studio/extension/build.ts production [out]                       the production manifest (checked, XT-7)
//   tsx studio/extension/build.ts development <api origin> <portal host or origin> [out]   the local Studio and one portal:
//     the Sample screens (http://127.0.0.1:4459) or, for the founder's capture of the real blank APR screens (P-98, G3),
//     the APR host as the address bar shows it (some.host.example, https only). No code change for a new host.
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { build } from "vite";
import { devPortalOrigin, manifest, productionProblems } from "./manifest.ts";
import HOSTS from "./hosts.json" with { type: "json" };

const ROOT = import.meta.dirname;
/** The out folder is emptied first, so it must be one the build owns (break 26 Oct: any path given was deleted): inside
 *  the Studio's working folder, new or empty, or an earlier build of this extension. A relative path is from where the
 *  command runs, for every part of the build. */
/** The names an earlier build holds at its top (nothing else is ever emptied). */
const BUILD_FILES = new Set(["manifest.json", "panel.html", "background.js", "content.js", "assets", "brand", "fonts", ".DS_Store"]);
function outFolder(out: string) {
  const dir = resolve(out), work = resolve(ROOT, "..", "var");
  if (dir === work) throw new Error(`"${dir}" is the Studio's working folder itself: build into a folder inside it`);
  // Inside the working folder too, only an empty folder or an earlier build is emptied (review-4 Minor 5: `var/workspaces`
  // holds the demo's approval records). An earlier build holds this extension's manifest AND nothing but the build's own
  // files: an `assets` folder of someone's pictures with no manifest, or our manifest beside a `notes.txt`, is not one
  // (PR #34 and #35 reviews).
  const entries = existsSync(dir) ? readdirSync(dir) : [];
  if (!entries.filter((f) => f !== ".DS_Store").length) return dir;
  try { if (entries.every((f) => BUILD_FILES.has(f)) && /^ExpatReady portal assistant/.test(JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8")).name)) return dir; } catch { /* no manifest of ours: not a build */ }
  throw new Error(`"${dir}" already holds other files: build into an empty folder (nothing there was changed)`);
}

export async function buildExtension(mode: "production" | "development", out: string, local?: { api: string; portal: string }) {
  out = outFolder(out);
  // Production takes nothing from the command line: its hosts are hosts.json's only (a host given here is refused).
  if (mode === "production" && local) throw new Error("production manifest refused: the production build takes its hosts from hosts.json only, never from the command line");
  if (mode === "development") local = { api: devApiOrigin(local?.api), portal: devPortalOrigin(local?.portal) };
  const api = mode === "production" ? HOSTS.api_origin : local!.api;
  rmSync(out, { recursive: true, force: true }); mkdirSync(out, { recursive: true });
  const define = { __XR_API__: JSON.stringify(api), __XR_MODE__: JSON.stringify(mode) };
  await build({ configFile: false, root: ROOT, logLevel: "warn", define, plugins: [react(), tailwindcss()], base: "./",
    build: { outDir: out, emptyOutDir: false, sourcemap: false, rollupOptions: { input: { panel: join(ROOT, "panel.html"), background: join(ROOT, "src", "background.ts") }, output: { entryFileNames: (c) => (c.name === "background" ? "background.js" : "assets/[name]-[hash].js") } } } });
  // A content script is a classic script, one file.
  await build({ configFile: false, root: ROOT, logLevel: "warn", define, build: { outDir: out, emptyOutDir: false, sourcemap: false, lib: { entry: join(ROOT, "src", "content.ts"), formats: ["iife"], name: "XrContent", fileName: () => "content.js" } } });
  for (const d of ["brand", "fonts"]) cpSync(join(ROOT, "..", "web", "public", d), join(out, d), { recursive: true }); // the team's logo and Inter
  const m = manifest(mode, local);
  if (mode === "production") { const p = productionProblems(m); if (p.length) throw new Error(`production manifest refused: ${p.join("; ")}`); }
  writeFileSync(join(out, "manifest.json"), JSON.stringify(m, null, 2));
  return { out, manifest: m };
}

/** The development build's Studio: a local address only (the founder's Mac, :4400), so a typo can never send a
 *  session token to another server. */
export function devApiOrigin(api: string | undefined) {
  const u = (() => { try { return new URL(api ?? ""); } catch { return null; } })();
  if (!u || !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(u.hostname) || u.protocol !== "http:" || u.pathname !== "/" || u.search || u.hash || u.username)
    throw new Error(`The Studio address must be a local one such as http://localhost:4400, not "${api ?? ""}".`);
  return u.origin;
}

if (process.argv[1] && import.meta.filename === process.argv[1]) {
  const [mode, a, b, c] = process.argv.slice(2);
  try {
    if (mode !== "production" && mode !== "development") throw new Error("Say production or development.");
    // An out folder is a plain path: an address given to the wrong build (production takes no Studio or host) would
    // otherwise become a folder named "http:/localhost:4400".
    const out = mode === "production" ? a : c;
    if (mode === "production" && (b !== undefined || /:\/\/|^[a-z0-9.-]+\.[a-z]{2,}$/i.test(a ?? ""))) throw new Error("the production build takes its hosts from hosts.json only: give it no Studio address or portal host (for the APR host use extension:dev)");
    if (out !== undefined && /:\/\//.test(out)) throw new Error(`"${out}" is an address, not a folder to build into`);
    // Into the Studio's working folder (never tracked), so a build leaves the copy clean: var/extension, var/extension-dev.
    const r = mode === "production" ? await buildExtension("production", a ?? join(ROOT, "..", "var", "extension")) : await buildExtension("development", c ?? join(ROOT, "..", "var", "extension-dev"), { api: a, portal: b });
    console.log(`built ${r.manifest.name} into ${r.out} (load this folder unpacked)`);
    console.log(`runs on: ${r.manifest.content_scripts[0].matches.join(", ")} · Studio: ${mode === "production" ? HOSTS.api_origin : a}`);
  } catch (e) {
    console.error(`not built: ${(e as Error).message}`);
    console.error("usage: npm run extension:dev <Studio address, e.g. http://localhost:4400> <portal host, e.g. the APR host from the address bar>");
    process.exit(2);
  }
}
