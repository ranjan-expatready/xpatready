# Brief: PF-4t, module folders under the type check (cloud builder lane; row owner Lead B)

Start **as soon as PF-4 has merged**: it is the next start after PF-4 (release holder, 14 Nov). Module code has gone unchecked by CI's "types" job since PF-3. There is no schema change, so it may run beside any schema row. Paste into a new cloud session on the repository (default branch `main`):

---
You are a builder for the Expat Ready Pathway Configurator. Run `/next runtime PF-4t` and take **one row, PF-4t**, end to end on a fresh branch from `origin/main`, one PR.

**The row:** `ai-workers/problem-1-pathway-setup-and-form-filling/product/BACKLOG.md`, row **PF-4t** (rows rev 14.2; from PF-4 #1744 item 4). Read only these with it:
* `product/design/lead-b-rows-2026-11-14.md`, section "Rev 14.2";
* `.github/workflows/ci.yml`, job "types" (P-291), and `tools/typecheck.mjs`;
* on `main`: `prototype/studio/api/tsconfig.json`, and whatever files under `api/src/platform/`, `api/src/front-office/` and `api/src/client-money/` exist when you start.

**What to build:**
* **Step 0, no change yet:** run the "types" check locally with the three folders added. Record the error count per folder in the PR body, and check whether the runtime loader (`tsx` 4.23.15, as the app and the suites run it) runs `@` decorators in `src/platform/`.
  * If it does, PF-4's `decorate(...)` calls may become decorators in this PR, with no behaviour change and PF-4's suite unchanged.
  * If it does not, keep them and say why in one line.
* In `api/tsconfig.json` `include`, add `"src/platform/**/*.ts"`, `"src/front-office/**/*.ts"` and `"src/client-money/**/*.ts"`. Add each path even if its folder does not exist yet. That one line is OK'd by the release holder (Lead 43, 14 Nov) as a shared-file line; list it in the PR body.
* Fix every type error those folders show, **in those folders only**. Type fixes only: no logic, route, schema or behaviour change. Never cast to `any` or add `@ts-ignore` / `@ts-expect-error` to silence an error. If a real fix needs more than a type change, stop and ask.
* Proof: one commit adds a deliberate type error under `src/platform/`; show the "types" job failing on it with a link to the run; the next commit removes it.

**Touch list (nothing else):** `api/tsconfig.json` (the one `include` line) and existing `.ts` files under `api/src/platform/`, `api/src/front-office/` and `api/src/client-money/`, for type fixes and the decorator change only.

**Must still be true:** CI's "types" job passes with the new includes. Every existing suite (PF-3's and PF-4's included), the demo reset and the checkpoint load (C10.1) pass unchanged. The web type check is unchanged.

**Duplicate check (P-526):** BACKLOG, open PRs (`tsconfig`, `typecheck`), `git grep -n '"include"' -- '*tsconfig*.json'` and BUGS; one `Duplicate check:` line.

**Breaker: no (no door, no schema, no behaviour change; reviewer only).** The reviewer checks that every changed line outside `tsconfig.json` is a type-only change.

**Rules (standard, every PF/FO brief):** P-559: firm tables, real sign-in and billing are ours in the PF/FO modules (amends P-335/P-357). One row, one session, one PR; new files only outside the touch list. Opus reviewer (P-303); re-review reads only the diff (P-277); label `review: approved` only after `Reviewer: Approve <sha>` and green CI (P-277, P-385); merge `main` only on a conflict (P-270). Live AI off, US$0, never a priced button (P-175). No real keys anywhere. Push after every step (P-557). Questions as a PR comment headed "Question for the tech lead"; report to the current Lead (`tools/current-lead.sh`) for the merge queue and to **Lead B** (row owner, branch `lead-b-front-office`, hand-over `product/design/lead-b-state.md`) for the row. Cross-module port interfaces, their fakes and shared event payload types go in `prototype/studio/ports/` (`zod` only; case-side contract v0.1 §1 rule 3); adapters stay in the module's folder; never import `engine/` or case-side files (rows rev 14.1). Every token earns its outcome (P-556): read only the files named here and the code you change.
---
