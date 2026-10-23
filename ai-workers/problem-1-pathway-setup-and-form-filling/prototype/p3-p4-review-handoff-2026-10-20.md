# P3 + P4 review handoff: review and release, then views generated from the release

> **On hold — do not send yet.** The reviewer's P2 verdict (20 Oct 08:23Z, PASS WITH FIXES) asks for P3/P4 releases and views to be regenerated from the corrected P2 foundation, with D265 branding, before their combined review. This handoff and its manifest record the current revision (built on the uncorrected P2 draft; D265 applied to the generated pages, not yet to P3's screen). After the P2 response revision, the maker regenerates v1, v2 and the views, reruns both browser runs, and reissues this handoff with a new manifest. Effects already visible: P4 report, "Inherited from P2".

20 October 2026 · maker: Claude Code (the Lead) · for the assigned independent reviewer (Codex, D248); the founder relays it. **Scope: P3 (review workbench and versioned release v1) and P4 (generated views and a one-setting change released as v2), reviewed as one cycle: review → release → views.** Separate from, and not a substitute for, the pending P2 review (`p2-review-handoff-2026-10-20.md`), the P1 revision 4 recheck and the P0 review.

- **Manifest:** `prototype/p3-p4-review-manifest-2026-10-20.sha256` (count and SHA-256 in PROGRESS and NEXT). Same coverage rule as the P2 manifest: every file under `prototype/` and `official-sources/` (except `node_modules`, `__pycache__` and handoff files), `ai-workers/decisions.md` and the working-edition files.
- **The P2 revision is untouched:** `p2-review-manifest-2026-10-20.sha256` still verifies 823/823. Because `trace.csv` and `experiments.md` are in it, the P3/P4 trace rows and experiment entry are added only after your P2 verdict.
- **No live call is needed.** Nothing in P3 or P4 calls an AI. The decisions are the maker's demonstration with simulated users (labelled on screen), not a qualified person's judgement.
- **No new founder decision.** AIW-D260 (prototype-only AI-drafting label, shown on every screen and page), D254 (author or submitter never approves), D264 and D265 (Expat Ready screen patterns and brand kit) apply.
- **Brand source outside the manifest:** the generated pages copy fonts and logos from the read-only capture `code/ERv2-frontend@5ccd9fa-2026-10-20` (frontend `dev` `5ccd9faa6df699fcf8af87a8003bc89c3490f8eb`, archive SHA-256 `1364b2c8b4b63c143ccf5aa26d6bf89d0b8a417f8ec7a10fcbe5b3bd9416fb2f`, recorded in `code/README-copies.md`). The copied files under `p4/out/*/brand/` are in the manifest.

## 1. What to review

| Piece | Files | Maker's result |
|---|---|---|
| P3 review core and server | `p3/review.ts`, `p3/server.ts`, `p3/ui/` | 990 review items from the live draft, each beside its official source; decision rules, readiness, versioned release, D254 approval |
| P3 rule tests | `tests/check_p3_review.ts` | 29/29 |
| P3 browser run | `p3/check_p3_browser.cjs`, `p3/evidence/` | 19/19 (run 3; runs 1–2 kept); repeated after P4's changes in an isolated copy: 19/19, identical v1 |
| Release v1 | `p3/releases/c1-v1/` | `e3b67ebab237c0c99e09054a2a4c9b00d6a65a97edd81f3c89d01da366c0ab9f` |
| P3 report | `p3/p3-report-2026-10-20.md` | written before P4; its "views not built" line is superseded by P4 |
| P4 views | `p4/views.ts` (rules), `p4/generate.ts` (pages, Expat Ready kit) | PQR, SQR per answering person, staff working view; view code SHA-256 `e4422b1f1fd4427330448db59af21454886d4e96be050b0fcf58a5164860130f` |
| Released contract | `contracts/released-configuration.v0.schema.json`, `p4/make_release_contract.py` | derived mechanically from the draft contracts; v1 and v2 meet it |
| The change | `p4/make_change.ts`, `p4/drafts/c1-draft-2.json` (+ `.change.json`) | one setting: service language tier case → prospect |
| Release v2 | `p3/releases/c1-v2/`, decisions in `p3/state/c1-draft-2/` | `ab966f38b81d4e939a55f6769c3e03e8ac3d6d08f0b59af9a2a26d1dbaaf5275`, supersedes v1 |
| P4 change run | `p4/check_p4_change.cjs`, `p4/evidence/` (`change-run.json`, screenshots 01–10) | 34/34 (run 8; runs 1–7 kept); repeated in an isolated copy: 34/34, all 29 outputs identical |
| P4 view tests | `tests/check_p4_views.ts` | 59/59 |
| Generated views | `p4/out/c1-v1/`, `p4/out/c1-v2/` | v1: PQR 8, principal 80/8/36, partner 34/0/10; v2: PQR 9, principal 79/9/36, partner unchanged |
| P4 report | `p4/p4-report-2026-10-20.md` | the change end to end, requirement → evidence, seven defects found and fixed, brand kit, limits |

## 2. Results to check

- **Reuse:** draft 2 opens with 989 of 990 items reused with their v1 decision (937 accepted, 53 on the hand route) and 103/103 SME sign-offs; one item open.
- **Release v2** differs from v1 in exactly four values (version label, review count, the placement's tier and its item version 1 → 2); 1,337 other items stay at version 1. Hash identical across all eight runs and an isolated copy; recomputed in Python: match.
- **Views:** same view code for v1 and v2; the only view changes are the service language joining the PQR, turning "pre-filled" in the principal's SQR (asked 80 → 79, pre-filled 8 → 9) and reading "prospect" in the staff view. The partner's page is byte-identical apart from its release line.
- **Defects the maker found in P4 and fixed** (P4 report, "Found while building"): reuse relabelling the 53 hand-route boxes as accepted (`p3/review.ts`); answer lists read in the wrong shape in 43 questions; a part's limit or list applied to the whole fact (address "10 characters", phone "3"); the staff table unreadable at phone width; brand files copied read-only; one page depending on another (radio-group numbering). Please try to break the views with your own configuration changes.
- **Brand kit (AIW-D265)** on the generated pages: tokens, Inter and Proxima Nova, logo, client-portal fields, status chips and the table pattern (P4 report, "Brand kit", with what is not reproduced). **P3's review screen predates D265 and is not restyled yet**; it is an open maker item, so judge P3's screen on behaviour, and the generated pages on D265 as well.

## 3. Points for your judgement

1. **What counts as "unchanged" for reuse (5.1 r1, 4.4 r2).** Reuse compares each item's own content with the previous release. It does not re-open items that depend on a changed item (for example the checks that read a fact whose placement changed), nor an unchanged item whose cited official file changed. In this change neither applies (the tier change alters no mapping or check; the source files are the same). Is item-by-item comparison sufficient for the prototype, or should dependents and source changes re-open items now?
2. **Who approved v2.** The release record names approver B for the whole of v2; 989 of its decisions carry the reason "approved unchanged in c1-v1" and the v1 decision. Is that an adequate record, or should each reused decision also name its original approver and release?

## Reproduce (offline; no network, no key, no AI)

```bash
shasum -a 256 -c ai-workers/problem-1-pathway-setup-and-form-filling/prototype/p3-p4-review-manifest-2026-10-20.sha256
shasum -a 256 -c ai-workers/problem-1-pathway-setup-and-form-filling/prototype/p2-review-manifest-2026-10-20.sha256
export PATH=$PWD/.tools/node-v24.21.0/bin:$PATH
cd ai-workers/problem-1-pathway-setup-and-form-filling/prototype
node_modules/.bin/tsc -p tsconfig.json && node_modules/.bin/tsc -p p3/tsconfig.json && node_modules/.bin/tsc -p p4/tsconfig.json
node tests/check_p3_review.ts && node tests/check_p4_views.ts && node tests/check_contracts.ts
python3 -I p4/make_release_contract.py --check
```

The two browser runs publish releases, so run them in a copy, never in place (servers from a shell; the app's preview launcher can hang on a macOS folder-permission prompt). From the repository root:

```bash
W=$(mktemp -d) && mkdir -p "$W/ai-workers" "$W/code" && cp -R ai-workers/problem-1-pathway-setup-and-form-filling "$W/ai-workers/"
ln -s "$PWD/code/ERv2-frontend@5ccd9fa-2026-10-20" "$W/code/" && ln -sfn "$PWD/.tools/solution-1-prototype/node/node_modules" "$W/ai-workers/problem-1-pathway-setup-and-form-filling/prototype/node_modules"
cd "$W/ai-workers/problem-1-pathway-setup-and-form-filling/prototype" && rm -rf p3/releases/c1-v2 p3/state/c1-draft-2 p4/out/c1-v2
node p3/server.ts --config p4/drafts/c1-draft-2.json --previous p3/releases/c1-v1 --port 4318 & sleep 3
node p4/check_p4_change.cjs        # 34/34; then compare p3/releases/c1-v2/configuration.json and p4/out/ with the originals
kill %1 && rm -rf p3/state p3/releases p3/evidence p4/out/c1-v2
node p3/server.ts & sleep 3        # port 4317, the live draft
node p3/check_p3_browser.cjs       # 19/19; v1 configuration.json identical to the original
kill %1
```

Both browser scripts load Playwright from `/Users/ranjansingh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright` and drive Google Chrome (E7).

## Prompt for the reviewer

> Review P3 and P4 of the Solution 1 working prototype together, at the exact revision in `prototype/p3-p4-review-manifest-2026-10-20.sha256`, as listed in `prototype/p3-p4-review-handoff-2026-10-20.md`. Scope: the review workbench and release v1 (P3); the generated PQR, SQR and staff views, the released-configuration contract, and the one-setting change released as v2 with unchanged approvals reused (P4); the seven defects the maker found and fixed in P4; and the two points in §3. Separate from the P2 review, the P1 revision 4 recheck and the P0 review. Verify both manifests, rerun the offline commands, rerun the two browser runs in a copy, try your own configuration changes against `p4/views.ts`, and check the view rules against W1 3.7, 7.2 r5 and 8.1 r12, and the generated pages against AIW-D265 and the captured style guide. Report findings as Material or Minor, and a verdict of PASS, PASS WITH FIXES or FAIL. Write only your verdict line to PROGRESS.md; do not edit maker files.
