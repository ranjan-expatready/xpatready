# W1-16, forms lane's share: edition attributes, country variants, field length, signature, online-only forms (plan for the Lead; 29 Oct; no code)

**Decisions:** P-150 (N1, N2, N4, N5 of the gap analysis), P-152 (online-only forms), with P-143 (channels and signature), P-149 (one door), P-151 (filing-time blockers: W4, not here). Research: `screens/W1-shared-library/research-end-to-end-masters.md`. Decisions and research are on `lead/2026-10-29-devin`.
**Code read:** this branch at `9049a49d` (main f7cb40d9 plus slice 0 and contract v2). `app/` means `prototype/studio/`.
**Sample:** which forms, variants, limits, dates and signers apply is Sample until the immigration expert confirms it. Terms of automated filling: Unconfirmed: no counsel.
**Not in this share:** shared code lists and the shared condition record (screens, S6); the P-151 filing-time blocker and fees (W4); portal screen order and the extension (W6).

## 1. Fresh re-check: what exists, what is new
| P-150 / P-152 item | Exists today (file) | New |
|---|---|---|
| **N1 edition attributes:** accepted until, effective date, fill-trial result, barcode form, technology | `FormEdition` has `canadaUpdated` (the page's "Last updated"), `checkedAt`, `recheckBy`, `newerFileSha256`, the channel record (`schema.prisma` FormEdition). The evidence lane holds fill trials per form (`evidence-lane/E1/<form>/STATUS.md`, `runs/`) and barcode tools (`E1/tools/barcode_compare.py`, `barcode-rules.json`); `E1/tools/inventory.py` reads a PDF's structure | five values on the edition, each with its basis (rules · AI with quote · person · expert) and source |
| **N2 country variant** (e.g. IMM 5645 or IMM 5707) | The finder's rounds already answer `applies: "alternative"` and attach both (`finder.ts ATTACHABLE`); lines have only "Only if" text (`CombinationForm.conditionPlain`, `predicateJson`) | a variant group on the line: one of its forms is filed, chosen by a rule on the person's country |
| **N4 length and continuation** | `p5/page_fields.py` reads each PDF field's `/MaxLen` and the writer refuses a longer value; list rows have a purpose and overflow (`FormFieldMap.listPurpose`) | `maxLength` per form field (rules, US$0) and a continuation rule for a text that does not fit |
| **N5 signature value and roles** | `CombinationForm.signedBy` with `SIGNED_BY` = the person · a parent, for a minor · the principal applicant, for the family · the person and the representative · none (`contracts/workspace.ts`) | the signature value per line (P-143: typed name · signed by hand, scanned · signed in pen · none) is slice 1's (`plan-slice1-channels.md` C-2); "the representative" alone as a signer |
| **P-152 online-only forms** | `EditionChannel` PDF · ONLINE exists (F1; portal capture parked, W6). The finder lists a form it cannot download as "not found" | "Online only · no official PDF" at intake; two ways in (AI from help pages, or a person's print-to-PDF screen copy); a unique code; the answer sheet follows the drafted form |

## 2. Rules (each with a pass test and a fail test)
* **N1-1 Technology and barcodes by rules (US$0).** On intake or Replace, the rules read the file: XFA (dynamic or static), AcroForm, or no form fields; and the number of barcode fields. *Fail:* a file the rules cannot read says "Not read", never a guess.
* **N1-2 Fill-trial result from the evidence lane.** Passed, failed (with the step) or not tried, with the run it comes from (`E1/<form>/STATUS.md`). *Fail:* a trial of another edition never counts for this one.
* **N1-3 Accepted until and effective date are proposed, never set.** The finder's rounds read them from IRCC's form page or notice with the quoted line (P-140 pattern); `canadaUpdated` is never taken as either. They land as a second-person change of the new kind `form_edition_facts` (like `form_accepts`). *Fail:* a date with no quote found on the page is dropped and listed.
* **N2-1 One form of a variant group is filed.** A group (e.g. "Family information": IMM 5645 · IMM 5707) has a rule on the person's country of residence or citizenship and a default. *Fail:* a case whose person matches no member files the default and warns; two members never both fill.
* **N2-2 The finder's "alternative" answers become a variant group proposal** (Check, for the expert), not two attached lines. *Fail:* a group with one member is refused.
* **N4-1 Every PDF form field records its `maxLength`** from `/MaxLen` (rules). *Fail:* a field without `/MaxLen` stays "no limit"; never invented.
* **N4-2 A value longer than the field follows the field's continuation rule:** refuse (the default, as today), or continue on an addendum sheet with a reference in the field ("See addendum, item 3"). *Fail:* a cut-off value is never written silently.
* **N5-1 Signer and signature fit the line** (slice 1 C-2), and "the representative" may sign only where the edition allows it (IMM 5476 and the forms whose record says so). *Fail:* a representative signing a form whose record says the person signs is refused at save and release.
* **P152-1 Online only is flagged at intake.** A form whose IRCC or ESDC page offers no PDF, or says it is filled in the portal, is marked "Online only · no official PDF" (channel ONLINE, no file). *Fail:* a form with a public PDF is never marked online only.
* **P152-2 Two ways in, one result.** (a) AI drafts the questions from the recorded help pages, each with its quoted line; (b) a person uploads the portal screens saved as PDF, and AI reads them. Either way it becomes a library form with its questions, a second person approves, and P-144's barcode blocker does not apply. *Fail:* a question with no quote (way a) or not on the uploaded screens (way b) is dropped and listed.
* **P152-3 A unique code:** the agency's own code if the page shows one; else `ONLINE-<AGENCY>-<PROGRAM>-<NAME>` in capitals (e.g. `ONLINE-IRCC-EE-PROFILE`), refused if already used. *Fail:* a typed code never overrides the rule.
* **P152-4 The answer sheet follows the drafted form**, grouped by section (P-152 (3)); the extension's live matching is W6.

## 3. Slices (each committed with its checks; US$0 unless said)
| Slice | What | Needs | Label |
|---|---|---|---|
| a | **Technology, barcodes, `maxLength`** by rules, on intake and Replace, and back-filled for the library's editions (N1-1, N4-1); the library panel shows them | nothing | Capability |
| b | **Fill-trial result** from the evidence lane (N1-2), shown on the edition | a | Capability |
| c | **Continuation rule** per form field (N4-2) in the field map editor, honoured by `fill.ts` → `p5/fill.py` (reuse, never rebuild) | a | Capability |
| d | **Signature value and the representative signer** (N5): folded into slice 1's migration (one change to the line) | slice 1 | Capability |
| e | **Accepted until and effective date** (N1-3): the finder's rounds read them with the quote; `form_edition_facts` changes; the expert confirms | slice 1 (prompt v2 already changes the finder) | Capability |
| f | **Country variant groups** (N2): the line model, the rule, the finder's "alternative" → a group proposal | S6 shared conditions for the rule's record (until then the rule sits on the group) | Capability |
| g | **Online-only forms** (P-152): flag at intake; way (b) first (a person's screen copy, read by AI on the runner); way (a) once the help pages are recorded; the unique code; the answer sheet from the drafted form | slice 0 runner; contract v2 (the questions arrive as `field` items) | Capability |
| h | **Live trial** of e and g on the 6 combinations' forms (Express Entry profile and PR application, LMIA Online): once live, then saved (P-139) | a–g | Scaffolding (the comparison); about US$3–5, Sample |

## 4. Questions for the Lead (recommendation first)
1. **Where edition facts are approved (N1-3).** *Recommend:* a new `LibraryChange` kind `form_edition_facts`, second person, like `form_accepts` (P-140). *Else:* a queue item kind in the contract (changes the approved contract).
2. **Signature (N5).** *Recommend:* folded into slice 1's migration, so the line changes once. *Else:* a second migration in W1-16.
3. **Country variants (N2).** *Recommend:* a variant group on the combination with one rule and a default, members as lines. *Else:* two lines, each with its own "Only if" (the expert must keep them exclusive by hand).
4. **Recording the help pages (P-152 way a).** The guard lets AI read only recorded official pages. *Recommend:* the forms lane records the IRCC/ESDC help pages for the three online-only forms with the existing recorder (`official-sources/fetch_official_sources.py`, Mac, US$0) before slice g's way (a). *Else:* way (b) only in Wave 1.

## 5. P-153: one shared rules file in every AI step (slice r, before e and g)
**Decision:** code is the guard (every rule that must hold is enforced on the server, on every proposal, whoever made it). One shared rules file is put into every AI step's prompt by the step runner. Its hash joins the prompt's fingerprint, so a replay stays exact.

**Today** (`p2/launch.ts`): the job names one template; the launcher screens it, fingerprints it (`template_sha256`), and passes the fingerprint to the drafting process (`draft.ts`), which checks it again. The saved-answer key compares `template_sha256` (`engine/rounds.ts isSameSavedRun`).

**Plan (slice r):**
* **The file:** `p2/prompts/shared-rules.v1.md`, plain words, one rule per line, each naming its server guard test. It covers: the identity rule per kind; one meaning, one field; "about whom" sets the subject, never the field; no typed technical names; quote the source line; values are Sample; P-149's meaning-change question and example cases; P-152's online-only intake.
* **Injection:** `AiStep` names its rules file; the runner writes it on the job (`rules`). The launcher reads it, screens it like the template, and puts it at the head of the prompt. It records `rules_sha256` and the joined fingerprint `prompt_sha256 = sha(rules ‖ template)` in the run's launch evidence. `draft.ts` checks both hashes, as it does the template's.
* **Replay:** the saved-answer key compares the joined fingerprint. A new rules version marks saved answers Out of date (`plan.md` R-1).
  * The 27 Oct finder answers were made without the file. A step may name the earlier prompt versions it still replays, as in `plan-slice1-channels.md` §4, so Load sample keeps working until slice h re-records them live.
* **Guard tests:** the rules file names each rule's server test. The Lead's checker reads those names.

**Tests:**

| | Test |
|---|---|
| Pass | A job with the rules file runs. The prompt the drafting process builds starts with the file's text. The run records `rules_sha256` and the joined fingerprint. A replay with the same file and template is found. |
| Fail | The launcher refuses a job without the rules file, or with a rules file whose hash does not match the one the launcher passed ("a prompt without the rules file is refused"). |
| Fail | A replay whose rules version differs is not used. |
| Fail | A rule named in the file with no guard test fails the check. |

The tests run on the fake launcher and the launcher's own pure checks (US$0).

**Order:** slice r comes right after slice 0 is on main and before any new AI step (W1-16 e and g, W1-10 slices 1–5). The finder moves onto it first. `people-ai.ts` (runtime lane) follows when it moves to the runner.

**Question for the Lead:** `p2/launch.ts` and `draft.ts` are the guarded AI route (AIW-D261). *Recommend:* the forms lane changes them in slice r, with the Lead's check of that diff. *Else:* the Lead changes the route and the forms lane only wires the runner.
