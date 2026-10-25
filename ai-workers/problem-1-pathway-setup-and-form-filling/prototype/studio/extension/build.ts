// Builds the browser extension (F2d; P-90: the existing Vite, no plugin for the extension itself) into a folder that
// Chrome or Edge loads unpacked, or that the team packs for a managed install (M3).
//   tsx studio/extension/build.ts production [out]                       the production manifest (checked, XT-7)
//   tsx studio/extension/build.ts development <api origin> <portal origin> [out]   adds the local Studio and Sample screens
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { build } from "vite";
import { manifest, productionProblems } from "./manifest.ts";
import HOSTS from "./hosts.json" with { type: "json" };

const ROOT = import.meta.dirname;
export async function buildExtension(mode: "production" | "development", out: string, local?: { api: string; portal: string }) {
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

if (process.argv[1] && import.meta.filename === process.argv[1]) {
  const [mode, a, b, c] = process.argv.slice(2);
  const r = mode === "production" ? await buildExtension("production", a ?? join(ROOT, "dist")) : await buildExtension("development", c ?? join(ROOT, "dist-dev"), { api: a, portal: b });
  console.log(`built ${r.manifest.name} into ${r.out}`);
}
