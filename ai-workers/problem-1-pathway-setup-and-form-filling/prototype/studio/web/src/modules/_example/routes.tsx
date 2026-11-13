// PF-1 fixture (not shipped: folders starting with "_" are built only with VITE_MODULE_FIXTURES=1, see ../../modules.tsx).
// The smallest module: one page at its own path, added without an App.tsx edit. tests/check_pf1_module_routes.ts opens it.
import { Link } from "react-router-dom";
import type { ModuleRoute } from "@/modules";

function ExamplePage() {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-semibold text-text">Example module</h1>
      <p className="mt-2 text-text-muted">This page comes from web/src/modules/_example/routes.tsx, not from App.tsx (PF-1 fixture).</p>
      <Link className="mt-4 inline-block text-text-link underline" to="/sign-in">Sign in</Link>
    </main>
  );
}

export const routes: ModuleRoute[] = [{ path: "/_example/pf-1", element: <ExamplePage /> }];
