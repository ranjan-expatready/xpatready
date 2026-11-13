/// <reference types="vite/client" />
// PF-1 (P-558, P-559): the web seam. Each module adds its own pages in web/src/modules/<module>/routes.tsx; this file
// gathers them (Vite import.meta.glob, eager) into one block of routes that App.tsx renders ahead of its catch-all, so
// a new module never edits App.tsx. How to add one: web/src/modules/README.md. Test: tests/check_pf1_module_routes.ts.
import type { ReactNode } from "react";
import { Route } from "react-router-dom";

/** One page of a module: an absolute path (React Router syntax: "/front-office/leads", "/front-office/leads/:id",
 *  "/front-office/*") and what it shows. */
export type ModuleRoute = { path: string; element: ReactNode };

/** Every <Route path> App.tsx has, its top level and the configuration shell's (under its catch-all), word for word.
 *  A module path equal to one of these, or under one ending in "/*" (as /cases/*), would take that page away, so it
 *  stops the app. The test reads App.tsx and fails when this list and App.tsx differ. */
export const APP_ROUTES = [
  "/sign-in", "/cases/*", "/link", "/inbox",
  "/", "/start", "/review", "/structure", "/review/change/:id", "/review/proposals", "/review/batch/:id", "/review/merge/:id",
  "/review/held/:id", "/review/edition/:id", "/review/form-fields/:id", "/c/:id", "/c/:id/:tab", "/c/:id/jobs/:jobId",
  "/library/fields", "/library/fields/:key", "/library/sections", "/library/documents", "/library/forms", "/library/checks",
  "/library/rules", "/release", "/ai", "/ai/:batchId", "/releases", "/activity",
] as const;

// Folders starting with "_" are fixtures (web/src/modules/_example/): left out of every build unless it is made with
// VITE_MODULE_FIXTURES=1 (the test's builds). Vite reads both patterns at build time; the one not taken ships nothing.
// `import: "routes"`: a routes.tsx without `export const routes` stops `vite build` with the file's name.
const found: Record<string, ModuleRoute[]> = import.meta.env.VITE_MODULE_FIXTURES === "1"
  ? import.meta.glob<ModuleRoute[]>("./modules/*/routes.tsx", { eager: true, import: "routes" })
  : import.meta.glob<ModuleRoute[]>(["./modules/*/routes.tsx", "!./modules/_*/routes.tsx"], { eager: true, import: "routes" });

/** A path's segments, lower case (React Router matches without case), with every ":param" read as one ":" (":id" and
 *  ":key" match the same addresses). A path with optional segments (":id?", "edit?") gives one list per form. */
function forms(path: string): string[][] {
  let out: string[][] = [[]];
  for (const raw of path.split("/").filter(Boolean)) {
    const s = raw.toLowerCase(), optional = s.endsWith("?"), word = (optional ? s.slice(0, -1) : s);
    const seg = word.startsWith(":") ? ":" : word;
    out = optional ? [...out, ...out.map((f) => [...f, seg])] : out.map((f) => [...f, seg]);
  }
  return out;
}

/** True when a and b can answer one address the same way: equal, or one ends in "/*" and the other is that path or
 *  below it; a ":param" segment matches any segment; optional segments are tried both ways. ("/cases/*" and
 *  "/cases/new" overlap, "/c/:id" and "/c/new" too, "/Sign-In" and "/sign-in" too; "/review" and "/review/x" do not.) */
export function overlaps(a: string, b: string): boolean {
  const sa = a.endsWith("/*"), sb = b.endsWith("/*");
  // A ":param" answers any one segment, so "/c/new" would take an address from "/c/:id".
  const prefix = (p: string[], q: string[]) => p.length <= q.length && p.every((s, i) => s === q[i] || s === ":" || q[i] === ":");
  return forms(sa ? a.slice(0, -2) : a).some((pa) => forms(sb ? b.slice(0, -2) : b).some((pb) =>
    (pa.length === pb.length && prefix(pa, pb)) || (sa && prefix(pa, pb)) || (sb && prefix(pb, pa))));
}

/** The same address written twice: equal once params are read as ":" (React Router ranks a module's own static,
 *  ":param" and "/*" routes itself, so "/fo/leads/new" beside "/fo/leads/:id" in one module is fine). */
const same = (a: string, b: string) => forms(a).some((pa) => forms(b).some((pb) => pa.join("/") === pb.join("/")));

/** Every refusal for these modules' routes, each naming both sides; empty when they fit. `modules` maps a module's
 *  name (its folder) to its routes. */
export function routeProblems(modules: Record<string, unknown>, appRoutes: readonly string[] = APP_ROUTES): string[] {
  const out: string[] = [], seen: { module: string; path: string }[] = [];
  for (const [name, routes] of Object.entries(modules)) {
    if (!Array.isArray(routes) || routes.length === 0) { out.push(`module "${name}": routes.tsx must export a non-empty array \`routes\``); continue; }
    for (const r of routes as ModuleRoute[]) {
      const path = r?.path;
      if (typeof path !== "string" || !path.startsWith("/")) { out.push(`module "${name}": every route needs a path starting with "/" (got ${JSON.stringify(path)})`); continue; }
      if (forms(path.replace(/\/?\*$/, "")).some((f) => f.length === 0)) { out.push(`module "${name}" claims ${path}: a module never takes "/" or the catch-all`); continue; }
      for (const app of appRoutes) if (overlaps(path, app)) out.push(`module "${name}" claims ${path}, which App.tsx already routes (${app})`);
      // Two modules: any overlap (one would take the other's addresses). One module: only the same address twice.
      for (const s of seen) {
        if (s.module === name ? same(path, s.path) : overlaps(path, s.path)) out.push(s.module === name ? `module "${name}" claims ${path} twice (${s.path})` : `modules "${s.module}" and "${name}" both claim ${path === s.path ? path : `${s.path} and ${path}`}`);
      }
      seen.push({ module: name, path });
    }
  }
  return out;
}

/** "./modules/front-office/routes.tsx" → "front-office". */
const nameOf = (file: string) => file.split("/")[2];
const modules = Object.fromEntries(Object.entries(found).map(([file, routes]) => [nameOf(file), routes]));
const problems = routeProblems(modules);
// Like the API's seam (api/src/features/README.md): a clash stops the app with both names, never a page lost quietly.
// The message shows on the page too (a blank page would say nothing) and in the browser's console (a runtime error: Vite's overlay shows only the dev server's own errors).
if (problems.length) {
  const message = `PF-1 module routes refused:\n${problems.join("\n")}`;
  if (typeof document !== "undefined") { const pre = document.createElement("pre"); pre.setAttribute("role", "alert"); pre.style.cssText = "margin:2rem;white-space:pre-wrap;font:14px/1.5 monospace"; pre.textContent = `${message}\n\nFix web/src/modules/*/routes.tsx (web/src/modules/README.md).`; document.body.replaceChildren(pre); }
  throw new Error(message);
}

/** Every module's routes, for App.tsx's <Routes> (a fragment of <Route> elements, as React Router reads them). */
export const moduleRoutes = <>{Object.entries(modules).flatMap(([name, routes]) => routes.map((r) => <Route key={`${name} ${r.path}`} path={r.path} element={r.element} />))}</>;
