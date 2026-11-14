# Technology gate (STANDARDS §1) — Atomic CRM for the front-office screens (Lead B, 14 Nov 2026)

Asked by Lead 39 (14 Nov, from stream 4's comparison, which itself says "how much of Atomic CRM's code fits our screens: read from its own page, not tried"). Read by Lead B from the project's own repository on 14 Nov 2026: `github.com/marmelab/atomic-crm` (licence file, `package.json`, `src/components/atomic-crm/`). Licences: **Unconfirmed: no counsel**.

## Facts (read at the source)
* **Licence:** MIT (GitHub's licence field and the `LICENSE.md` file). Active: last push 13 Nov 2026; about 1.4k stars; 24 open issues.
* **Stack:** React 19, Tailwind 4, shadcn-style components on `@base-ui/react`; data and screens through **`ra-core`** (react-admin's headless core: resources, data provider, list/edit controllers) with a **Supabase** data provider (`ra-supabase-core`, `@supabase/supabase-js`); board drag through `@hello-pangea/dnd`; 51 runtime dependencies.
* **Screens and model:** contacts, companies, deals (a stage board), tasks, notes, activity, tags, a dashboard, a CSV import, sales people. A deal ≈ our prospect; a contact ≈ our person; a company ≈ our company. **No neutral lead, no Unassigned leads with Take it, no call log with first response, no Engage, no two pipelines with AG-02's guards** (AG-02's core for month one).
* **Ours:** React 19, Tailwind 4.3.1, Radix components, TanStack Query and zod contracts against our NestJS API (no Supabase; no `ra-core`); FO-4 has no drag library in month one ("Move to…" menu, after the FO-4 challenge).

## Options
1. **Adopt Atomic CRM's screens with `ra-core`**: a second data layer and framework in the web app beside TanStack Query, a data provider for our API, its model reshaped to AG-02. Against STANDARDS §1 ("prefer what the team already has, then a small library over a framework") and our one-way contracts; savings eaten by the rewrite.
2. **Lift presentational pieces only (recommended):** copy, under MIT with its notice, the markup and styling of pieces that fit our concept r2 — the board's column and card layout, the person/company record layout (three columns), the notes list and composer, the tasks list (for later), the CSV import's column-matching steps (for PF-10) — rewritten onto our Radix components, our `contract.ts` shapes and our TanStack Query hooks; no `ra-core`, no Supabase, no new dependency.
3. **Take nothing.**

**Ruled by Lead 39 (14 Nov): design reference only — no code copied, no licence notice, AGENTS rule 5 untouched; copying word for word needs the release holder (and the founder for a rule-5 exception).**

## Pick and cost
**Option 2.** Realistic saving on FO-4: **about 5-8 changes** (layout and styling work), not stream 4's 20-25, because the data layer, the AG-02 model and its guards are ours either way; more later on PF-10's import screen (about 3-5). Upkeep: none (copied code is ours; no dependency to track). Data: nothing leaves our system.

## What it changes in the rows
* **FO-4 / FO-4c:** may lift Atomic CRM presentational pieces as above; each lifted file keeps a header line naming its source file and the MIT licence; the licence text kept once in `web/src/modules/front-office/THIRD_PARTY_LICENSES.md`. No new dependency.
* **FO-2, FO-2b:** no change (Atomic CRM has no server we can use; its server is Supabase).
* **PF-10 (shaped next):** consider its CSV import steps through this gate again when shaped.
* **One question for the release holder:** the MIT licence requires keeping the copyright notice, which names its holder (a company and an individual). AGENTS rule 5 bars personal names in project files; a licence notice kept word for word is a legal requirement, not our writing. Rule needed: allow licence notices word for word in `THIRD_PARTY_LICENSES.md` files.

**Reconsider when:** our staff console (internal support tooling) is built: `ra-core` or Refine fits an internal admin console better than a firm-facing product.
