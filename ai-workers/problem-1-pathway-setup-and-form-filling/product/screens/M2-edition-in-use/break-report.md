# Break report: M2, the edition in use (P-32), commit 1a7d63ad8

**What I checked:** the claim that a form's PDF edition in use is the newest mapped printed edition (`engine/programs.ts` `pdfMapInUse`), and that the fill (`api/src/fill.ts` `writeForm`), a case's copies and fill trial (`api/src/fill-case.ts`), a case's coverage (`engine/render.ts`) and the Forms tab (`api/src/workspace.ts`) all use it.
**How:** I ran crafted snapshots through the modules directly with `tsx --tsconfig api/tsconfig.json`. The scripts are `/tmp/claude-0/-home-user-xpatready/9be83169-3abc-5bee-9f64-714e887bafd9/scratchpad/s/keys.mts` and `.../s/edges.mts`. The fill ran for real: p5/fill.py on IRCC's `imm5476e.pdf` (11-2025) and `imm5476e-2021.pdf`, with their two inventories. For the "before" runs I used an `origin/main` copy of `engine/` and `contracts/` (git archive into the scratchpad). No server, no database, no model call: US$0. Nothing in the repository was changed.
**In short:** the five readers named in the claim agree with each other on every snapshot I built. One reader of a single map per form that the claim does not name, the answer-key runner, now mixes two editions. A key for the older edition is run against the in-use edition's coverage. That key can fail with no way to fix it, or pass on a wrong map.

## Breaks, ranked

### 1. Blocker: an answer key for the older edition runs on the in-use edition's boxes. It fails with no way to fix it, or passes on a wrong map.
**Where:** `engine/answer-keys.ts:310` picks the key's own edition `m` (11-2021). But `:320` `formCoverage` → `engine/runtime/forms.ts:20` → `render`, and render now always takes `pdfMapInUse` (11-2025, `engine/render.ts:115`). Then `:329` `formValues(s, m, inv, cov.boxes)` writes the 11-2025 map's boxes and facts, using the 11-2021 map only for option codes.
**Steps:** use a snapshot holding both IMM 5476 maps.
* The 11-2021 map maps `SectionA familyName[0]` and `givenName[0]`.
* The 11-2025 map maps the same two boxes plus `sectionD[0].familyName[0]`, a box that exists only on 11-2025.
* Family: Client A, family name "Doe", given name "Ana".
* The key for 11-2021 expects exactly the two boxes of its own map. The key for 11-2025 expects all three.

| `runFieldMap` | origin/main | this commit |
|---|---|---|
| key 11-2021 (correct for its map) | PASSED | **FAILED**: "Unnamed form field: expected nothing (not in the key), got 'Doe'" |
| key 11-2025 (correct for its map) | FAILED (missing sectionD) | PASSED |

* **It cannot be fixed.** If you add the sectionD box to the 11-2021 key, `checkExpected` refuses it with "This form field is not on the IMM 5476 (11-2021) field map: leave it out of the key." (`engine/answer-keys.ts:200`). Saving can't move the key to 11-2025 either: the Tests tab gives the 11-2021 item its own boxes (`web/src/components/answer-key-editors.tsx:273,306`). The words "written, not expected: add it to the key or fix the field map" send the person to a fix that does not exist.
* **What it blocks.** A failing key refuses every release, a Demo release too (`engine/answer-key-gate.ts:59`). An old edition released under the gate already has a signed key (it is "gated" because a key exists). So after 11-2025 is accepted, every release that still carries 11-2021 is refused. On origin/main the same thing happened in mirror image: the new edition's key could not pass. So this commit does not create the blocker. It moves it from the new key to the old one, and keys that passed yesterday now fail.
* **False pass.** Wire the 11-2021 map wrongly (`familyName[0]` → `person.given_name`), keep the 11-2025 map correct, and the 11-2021 key **PASSES with 0 failures**. The same wrong map on its own FAILS. The release evidence (`evidenceOf`) would then record a signed pass for the 11-2021 map, a map that was never really tested.
* **Same box name, different meaning.** The two editions share 37 data paths, and some mean different things. `SectionA[0].application[0]` is "Type of application" on 11-2021 but "Application number (if known)" on 11-2025. `sectionD[0].signatrureApplicant[0]` is the applicant's signature on 11-2021 but the representative's on 11-2025. So mixing editions is not harmless even where the box names match.

### 2. Minor: when the newest edition has no official file or field list, the case says the form can be filled, then refuses with words that name no edition.
**Steps:** use 11-2021 complete plus 11-2025 with `official_file: null` (or `inventory_file: null`).
* **Held:** `writeForm` refuses in words with a 400: "This form's official file or form field list is not recorded; it cannot be filled." It does not silently fall back to 11-2021.
* **The disagreement:** `pdfForms()` still lists IMM 5476 as fillable, because any map with a file counts (`engine/runtime/forms.ts:59`). And `fieldsOpen` returns `[]` with no message when the in-use edition's list is missing (`api/src/fill-case.ts:98`). So the case shows nothing open, then Generate fails.
* **The words:** the message does not say that 11-2025 is the edition missing its file.

### 3. Minor: the newest edition's official file is not on disk.
If `official_file` names a PDF that is not on disk (e.g. `imm5476e-2027.pdf`), the refusal is "The filler failed: Command failed: /home/user/xpatready/.tools/…/python -I …/p5/fill.py /tmp/…" (422). That is a technical path cut off at 300 characters (`api/src/fill.ts:61`). The wording predates this commit. What is new is the route to it: a newer edition can now reach it, where before the case filled 11-2021.

### 4. Minor: an edition label with no readable date sorts oldest, so a newer edition silently loses.
`editionMonth` (`engine/programs.ts:135`) returns -1 for these labels, and 11-2021 stays in use with no words:
* "IMM 5476 (2025-11)"
* "11/2025"
* "(13-2025)"
* "(00-2026)"
* "(11-20255)"
* a bare "IMM 5476"

**Held by the intake:** the reader always builds `CODE (MM-YYYY)` (`tools/read_form_identity.py:122-129`). A label that reads as no date is held "not newer" (`api/src/intake.ts:343`), so I found no built snapshot that reaches this. One side effect: "(13-2025)" passes the reader's `\d{2}-\d{4}`, so the intake calls a clearly newer file "Older edition: not used".
These labels work: "IMM 5476 E (11-2025)", "(1-2026)", and "(11-2025) replaces 12-2021" (the first date wins).

### 5. Minor: with the same printed date, or no edition named, the answer-key helpers still take the first map.
* With two maps for the same month, `pdfMapInUse` takes the later one. But `fieldListOf` (`api/src/answer-keys.ts:45`) and `pdfMap`/`keyBoxes`/`checkExpected` take the first when no edition is named (`engine/answer-keys.ts:152,187,284`).
* A key created with no edition is written for **11-2021**, not the edition in use. I confirmed this with `keyBoxes` and `checkExpected`.
* The web always sends the item's edition, so this shows only through the API.
* I found no route that builds two labels for the same month (labels are unique, and the intake builds one form).

### 6. Minor: the Channels view takes the last map in the list, not `pdfMapInUse`.
`channelsView` (`engine/channels.ts:161`) uses `versions.at(-1)`. On a list that is not in order ([11-2025, 11-2021]) it shows 11-2021, while the fill, coverage and trial show 11-2025. Built snapshots are always sorted by `compareEditions` (`engine/snapshot.ts:157`), and its order agrees with `pdfMapInUse`, so this is robustness only.

### 7. Minor, not from this commit: an Online line's coverage and the Forms tab show different editions.
On a line filed Online that has PDF maps and an online map, coverage shows the PDF edition in use, 11-2025 (`engine/render.ts:115`). The Forms tab shows "IMM 5476 online (2026-01)" (`api/src/workspace.ts:72`). On origin/main, coverage showed 11-2021 and the Forms tab the online version. The comment in render.ts, "else the line's online map", is never reached when a PDF map exists.

## What held
* **The scenario itself.** A release holding 11-2021 and 11-2025 fills IRCC's `imm5476e.pdf`: the request's `form_file` and the filler's own report agree. A release holding only 11-2021 still fills `imm5476e-2021.pdf`. The tests in `tests/check_edition_in_use.ts` pass 12/12.
* **Order of the list.** The order the snapshot lists maps in does not matter: the fill, the coverage and the trial all give 11-2025. The printed date beats text order ("12-2021" against "11-2025").
* **Other maps are ignored.** An online map with a newer label (12-2030) is never the PDF edition. Another form's newer maps are ignored. A form number in different case or spacing does not match. `channel: null` counts as PDF.
* **Missing pieces are refused in words, never by silent fallback.** This covers no official file, no field list, a field-list path that does not exist, and a "../" path; each gets a 400 in words. The trial is asked for 11-2025's edition even when 11-2025 cannot be filled.
* **A map with no entries.** A built snapshot drops such maps (`engine/snapshot.ts:165`), so an unmapped newer edition never becomes the edition in use.
* **The five claimed readers agree.** Fill, case copies, trial, coverage and the Forms tab (for a PDF line) picked the same edition on every snapshot I built. The Forms tab's old `.at(-1)` gives the same result as `pdfMapInUse` on built snapshots.

**Not attacked:** the browser, keyboard, zoom, roles and concurrent saves. The change has no screen, endpoint or write path of its own; only the readers above changed.
