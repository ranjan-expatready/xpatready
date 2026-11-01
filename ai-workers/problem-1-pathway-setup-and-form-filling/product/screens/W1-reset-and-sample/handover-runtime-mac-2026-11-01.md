# Runtime builder (Mac copy reverent-mahavira-cef858) handover, 1 Nov

Context reached about 50%, so this records where things stand. US$0 throughout; no live switch was set by hand.

## Open PRs from this session (all reviewer-approved on their current head, labelled)
| PR | What | State |
|---|---|---|
| #113 | runtime omnibus | head 8595569c: main merged (aac8b34a, only conflict was review-queue.ts imports), explicit-any fix in demo.ts (429 vs base 432), review-pr113-r3.md folded in (0e9c4281), so no separate records PR is needed. Approved, labelled. The reviewer notes main has moved about 10 PRs on; merge-tree shows no conflict. If asked to update, re-run s7 and the documents/questionnaires browser suites. |
| #225 | QA-76 slice a: plain words on the case's Forms tab and copy routes (no decision codes, no "fill trial") | approved, queued. check_qa76_words 7/7 (2/7 on main's files). Browser suites re-run on a fresh build: pass. |
| #230 | #201 review m3: a section add or removal that changes nothing writes no history line | approved, labelled. check_c48 25/25 (22/25 before), 12 related suites pass |
| #223 | check_w115_slice1 says SKIP | merged |

Minors from #230's review, for later:
* The remove path could use deleteMany's count to close a rare double-line race.
* No check pins the guard order (a no-op as the Approver should get 403; a no-op on a retired combination should get 409).
* A no-op add returns the existing order, while a real add returns null.

## X9 triage (open on main, 1 Nov)
* **Free now:**
  * QA-112: `web/src/pages/workspace/sources.tsx` ~l.197–216. For a case fact, say one plain sentence, and show no fallback line when no document is a source.
  * QA-116: `check_w115_slice3_browser.cjs` l.111–116. Wait for the row to come back, and for `[data-removed-docs]` to go, after remove and Undo.
  * QA-78, partly: finder.tsx "No form find yet", configuration.tsx "Base or conditional", library.tsx "Imported release".
* **Wait for #113:**
  * QA-76 slice b: case.ts "No answer list yet (forms slice 2)" → "No list of choices yet: …". The lowercase "representative" label comes from `engine/render.ts` label() when no representative person exists. Both are engine changes, so an ALL run; bundle them with the validate.ts fixes.
  * QA-114: the API in fact-sources.ts must send the released value as well as the approved one.
  * QA-77 and QA-115: samples/programs.json (X1c too).
  * QA-108: engine/import.ts.
  * QA-91: people-ai.ts. Needs a run card; a design question.
  * QA-117: #113 may fix it (check_qa117_person_sections).
* **Engine fixes for after #113:** `engine/validate.ts:81` (a section's system name on Review), and the Review change line naming a section by its description.
* **After #197 merges:** its Minors 1–2 in check_c42_marking_browser.cjs.
* **Then the handover steps:** #116 prep, f7-x9, f6-pqr-picks, X1c, the questionnaires.tsx:357 toast words, C4.6.

## Lessons (tooling)
* **isolated.sh and run-suites.sh never rebuild web/dist.** Run `cd studio/web && ../node_modules/.bin/vite build` before any browser suite; a stale bundle gives false failures and false passes. The Lead will add a rebuild after #226.
* **To run picked suites:** copy run-suites.sh with `sed 's/^PICK=""$/PICK=" a b c "/'`. Never replace by line number: main's copy moved, a line-79 replacement broke `iname()`, and every copy started unnamed.
* **Commit before cleanup.** `git checkout -- . && git clean -fdq .` in ai-workers also reverts uncommitted edits.
* **Any `engine/`, `contracts/` or `tools/` change selects ALL suites.** Keep engine edits batched.
