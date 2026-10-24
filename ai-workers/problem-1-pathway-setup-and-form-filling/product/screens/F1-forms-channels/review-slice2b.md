# F1 forms channels, slice 2b · independent review (CHECK, backend, no new page) · 24 Oct

Reviewer agent (did not build it). Code at `130cea5` (branch `claude/forms-f1-check-f6e7f2`), slice diff `521945f~1..130cea5`. Isolated copy `forms_rv` on :4454 (fresh database), stopped at the end. AI spend US$0: stub passes and one hand-written answer only. Paths: proto = `prototype/`, studio = `prototype/studio/`.
Journey test: `journey-test-reviewer-slice2b-2026-10-24.md`, **7.5/10, fail (below 8, no criterion at 0)**.

## Verdict: Ship after fixes (two Majors, no Must)
I checked the four items in scope against the code, not the build notes. `check_forms_slice2b.ts` passes **28/28** on my copy (13.5 s). I also walked each item myself:

* **QA-15 holds.** Seven spellings each give one form: `imm 5257`, `Imm-5257`, `imm_5257`, `imm5257` and `  imm  5257 ` all become the library's `IMM 5257` (`forms.ts:52-53,104`). `IMM 5257!` and `5257` are refused on the field.
* **D3 holds.** A LIVE start while proposals wait returns the finished job (`reused: true`, 17 ms). It makes no new job and costs nothing, and the history gets a "reused … US$0" line. The reviewer role gets 403 (`need` before the reuse, `forms.ts:471`). Accepting 1 of 3 still reuses, now with "2 proposals waiting". Accepting the rest makes the next start ask for the worst case again (US$0.38). A stub job with no proposals is never reused (`:513`).
* **F5 main path holds.** On IMM 5409, 18/18 values go into the data and 18/18 page fields. UR3 verifies and poppler reports 0 errors. pdftoppm and pdftotext show the names, place, years, dates and radio marks in the form's own Courier 8 (screenshots in the journey report). The AcroForm dictionary is not redefined: the Root object is not in the appended update, so there is no NeedAppearances. 37 appended objects are encrypted.
* **F6 holds.** The 10 oath boxes are excluded from writing, and so is a mapped one (`fill.ts:48`).

The two problems are in what the person is told: what the page really shows (F5), and which steps they must take (signing).

## Must
None.

## Major
1. **F5 says "shown outside Adobe" without checking what is drawn.**
   * **What happens:** the read-back compares only `/V` and checks that an `/AP /N` exists (`proto/p5/page_fields.py:131-133`). `shown_outside_adobe` is built from that (`proto/p5/fill.py:45-48`). Two probes on IMM 5409 FirstName, both reported `read_back_equal 1`, `shown_outside_adobe: true`, `intact: true`:
     * `ŁUKASZ ŻÓŁĆ` is drawn as **`?UKASZ ?Ó??`**, and a Devanagari name as `??? ?????`. The form's CourierNewPSMT/WinAnsi cannot encode these letters, and pypdf writes `?` (`page_fields.py:88`).
     * A 70-character name is centred and clipped at both ends, so the first and last letters are lost.
   * **Why it matters:** the history line then says "page fields 1/1 shown outside Adobe" (`studio/api/src/fill.ts:77`). On a statutory declaration this is a false claim to the person sharing the file (STANDARDS: no silent wrong value; D18).
   * **Fix:**
     * Before setting a value, check that it encodes in the field's font. If it does not, mark it `not_set` with a plain reason, e.g. "a letter this form's font cannot show outside Adobe; open and save in Adobe".
     * Check that the text fits the field's width, or report it as "clipped".
     * Add fail tests for a non-Latin-1 name and an over-long value.
2. **A person filling a static form is never told to sign.**
   * **What happens:** F2 lists only signature boxes that are `required` (`studio/engine/form-steps.ts:74`), and IMM 5409 and IMM 5476 mark **0** fields required.
     * IMM 5409 (three signature boxes): `personSteps` returns only F6. Neither declarant gets a "sign" step.
     * IMM 5476 (five signature boxes): the fill API on wp.family returns `person_steps: []`.
   * **Why it matters:** the Lead's note asks for F6 as "a person step like signatures (F2): never filled, **listed for the person**". On the forms this slice targets, signatures are not listed at all. The rule dates from slice 2, but slice 2b's static-form path is what exposes it.
   * **Fix:** when a form marks no field required (static forms), list its signature boxes anyway. On IMM 5409, say the declarants sign at the oath. Test on IMM 5409 and IMM 5476.

## Minor
3. **The D3 re-check under the lock has no test.** Neither `forms.ts:489` nor the follow-up at `:497` is reached by any test. The "two at once" check (`tests/check_forms_slice2b.ts:133-134`) starts after the draft has finished, so both starts reuse at `:479`. Removing `:489` would fail no test. Add a test where the job finishes while a start waits on the lock (slice 2 has a test-only pause).
4. **F5 through the API is never asserted on a static form.** The build notes say the API path is "proven on IMM 1295 (dynamic)" because nothing maps IMM 5409. But wp.family's principal fills **IMM 5476 (static)** through `POST /combinations/:id/fill`: 16/16 page fields shown, 0.54 s. The audit line, the artifact detail and the download (200, application/pdf) all work. Add that assertion at `tests/check_forms_slice2b.ts:147-150`.
5. **F6 through the API has only a negative test** (IMM 1295). Removing `fill.ts:48` fails no test, because `oathBoxes` is only unit-tested. A fixture that maps one IMM 5409 oath box to a fact would cover it.
6. **The form's kind is inferred from name matches** (`p5/fill.py:44`). On a static form whose inventory SOM names miss every page field, the report says `dynamic` and `without_page_field: 0`, which hides the failure. Decide static or dynamic from the file (AcroForm widgets for the boxes, or the XFA template), not from matches.
7. **The QA-15 field message is inaccurate.** It says "A form code: letters, then numbers, for example … EE PROFILE" (`studio/contracts/forms.ts:39`), but the rule accepts letters only, and the example has no numbers. Say "starts with a letter; letters, numbers, spaces or dashes".

Note, not counted (pre-existing, not slice 2b): stub starts on an isolated copy append to the shared `proto/p2/ledger/spend.jsonl`, `p2/screening/canary-digest.json`, `p2/ledger/used-launch-tickets/` and `p2/runs/`. I restored them after my runs.

## D1–D20 (API and files; script and probe evidence)
* **D1 4:** all four items built as asked; the signing step is missing on static forms (2).
* **D2 4:** one form per code (seven spellings); reuse decided again under the version lock; no duplicate job.
* **D3 4:** the code goes to the library's one form; a waiting draft is reused rather than paid twice.
* **D4 4:** oath and signature boxes are never written, whatever is mapped.
* **D5 4:** repeat and parallel starts reuse; recovery after accepting works; the under-lock path is untested (3).
* **D6 4:** history lines for "reused … US$0" and for "filled … page fields n/n"; the job records `sent_inputs`.
* **D7 4:** the reused AI draft is returned unchanged with its job id; nothing is auto-accepted; US$0 is said.
* **D8, D9, D12, D13, D14:** n/a (no page).
* **D10 3:** mostly plain; the QA-15 message is wrong (7); the F6 step lists 10 captions in one long sentence.
* **D11 4:** `reused` and `reused_message`; `page_fields` in the report and the artifact.
* **D15 5:** filler 0.4 s, fill API 0.54 s (signature check included), reuse 17 ms, capture 6–12 ms.
* **D16 3:** 28/28 with a pass and a fail per rule; gaps 3–5; no test for non-Latin-1 or over-long values.
* **D17, D20:** simulated only (no intended user).
* **D18 3:** "shown outside Adobe" can be false (1).
* **D19 3:** a static fill works end to end through the API, including the download; the Adobe re-check is outstanding.

## Graph (P-86)
`graph.mjs`: G1 0, G2 0. Every slice 2b route is reached by a test (`POST /captures`, `POST /online-versions/:id/screen-map/ai`, `POST /combinations/:id/fill`). `GET /artifacts/:id/file` (download of the filled PDF) is in G3 with no test. I checked it by hand: 200.

## What I could not check
* Adobe: whether Reader's extended features and the values survive our page-field update (UR3 verifies under openssl only). The evidence lane has been asked.
* How the IRCC upload portal reads these files.
* A real screen reader.
* An intended user's unaided walk (D17, D20).
* A LIVE screen-map draft (no paid call): D3 was walked on a stub job carrying a hand-written answer.
