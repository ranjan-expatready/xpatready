# Module pages (PF-1, P-559)

A module adds its own pages here, one folder per module, never in `App.tsx` (the web side of the API's `api/src/features/` seam):

```tsx
// web/src/modules/front-office/routes.tsx
import type { ModuleRoute } from "@/modules";
import { LeadsBoard } from "./leads-board";
import { LeadPage } from "./lead-page";

export const routes: ModuleRoute[] = [
  { path: "/front-office/leads", element: <LeadsBoard /> },
  { path: "/front-office/leads/:id", element: <LeadPage /> },
];
```

`web/src/modules.tsx` gathers every `modules/*/routes.tsx` at build time (Vite `import.meta.glob`, eager) into one block of `<Route>`s; `App.tsx` renders it ahead of its catch-all, its one line for this seam. Nothing else to register.

* **Paths are absolute** and start with the module's own word (`/front-office/…`, `/platform/…`), in React Router's syntax (`:id`, a trailing `/*`).
* **A clash stops the app** with both names, before any page shows (the message is on the page, in the console and in Vite's overlay; the suite fails CI on it): two modules claiming one address (any overlap), or a module claiming an address `App.tsx` already routes (`/sign-in`, anything under `/cases/*`, `/link`, `/inbox`, the configuration shell's pages such as `/start` or `/c/:id`), or `/` or the catch-all. `:id` matches any one word, so `/c/new` clashes with `/c/:id`; case is ignored and optional segments (`:id?`) are tried both ways, as React Router matches. Within one module only the same address twice is refused: React Router ranks a module's own `/front-office/leads/new`, `/front-office/leads/:id` and `/front-office/*` itself. The list of `App.tsx`'s routes is `APP_ROUTES` in `modules.tsx`; the test fails when it and `App.tsx` differ.
* **A `routes.tsx` without `export const routes` stops `vite build`** with its file name.
* **The page decides its own frame and access:** wrap it in `Frame` (`@/components/frame`) for the app's header, and check who is signed in inside the page; the seam adds nothing around it.
* **A folder starting with `_` is a fixture** (`_example/`): routed only in a build made with `VITE_MODULE_FIXTURES=1` (the test's builds). A default `vite build` leaves it out of the bundle; the dev server may load its file but never routes it.
* **Test:** `tests/check_pf1_module_routes.ts` (its usage line). A module's own browser test opens its pages from the normal build.
