# Journey test (reviewer): M2 "edition in use" (P-32), commit 1a7d63ad8, 3 Nov

**Limits:**
* The change has no screen. The runtime ports 4430–4439 were in use and :4400 is never used for tests, so no visible-browser walk was possible.
* The journeys ran as scripted engine checks on the exact commit, in a scratch copy outside the repo: real `p5/fill.py` and IRCC's two IMM 5476 files, US$0.
* Scripts:
  * `tests/check_edition_in_use.ts`
  * `/tmp/claude-0/-home-user-xpatready/9be83169-3abc-5bee-9f64-714e887bafd9/scratchpad/probe/keyprobe.mts`

## Journeys
1. **Main.** The content publisher accepts IMM 5476 11-2025 through impact review and releases. The case officer generates a copy.
   * Expected: IRCC's 11-2025 file is filled.
   * **Held:** the request and the filler's report both name `imm5476e.pdf` (check 11).
   * Coverage names 11-2025 and holds only its boxes (check 7). The trial asked for is 11-2025's (check 9).
2. **Alternate (P-67).** A case pinned to the earlier release, which holds only 11-2021, generates a copy.
   * Expected: 11-2021.
   * **Held** (checks 8, 10, 12).
3. **Error: release with a signed 11-2021 key.** The combination's 11-2021 map had a correct answer key before 11-2025 was accepted. The release gate runs the keys.
   * Expected: the 11-2021 key passes on its own map.
   * **Broke:** the key FAILED with "Unnamed form field: expected nothing (not in the key), got '1990-01-01'", a box only 11-2025 has. On origin/main it PASSED.
   * The gate refuses the release (`engine/answer-key-gate.ts:57-59`).
4. **Recovery from 3.** The publisher follows the words "add it to the key or fix the field map".
   * **Broke:** the key refuses the box ("not on the IMM 5476 (11-2021) field map", `engine/answer-keys.ts:200`), and nothing in the map is wrong. No way forward.
5. **Wrong map hidden.** The 11-2021 map is wired wrongly (family name to given name).
   * **Broke:** the key's failure is about the 11-2025 box, not the wiring, so the 11-2021 map is not actually tested. It passes when the editions share their boxes (break report).
6. **Order and labels.** The newest edition is listed first, and "12-2021" is used against "11-2025".
   * **Held:** 11-2025 either way (checks 2, 3).
7. **Online map.**
   * **Held in code** (`engine/programs.ts:154`). The check does not prove it (review m1).
8. **The step across the boundary: Forms tab to case.**
   * **Held in code:** the Forms tab and the case's coverage pick the same edition (`api/src/workspace.ts:72`, `engine/render.ts:115`). Not seen on screen.

## Data underneath
* The fill request JSON names the 11-2025 file for a two-edition release and the 11-2021 file for a one-edition release.
* Nothing is written to the database. The change has no write path.

## Break-it
* Covered by the breaker's report in this folder, confirmed for B1 by my own probe.
* Not attacked: the browser, roles by URL, and two tabs. The change has no endpoint or form of its own.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | The fill reaches 11-2025 (J1), but the release is refused when 11-2021 had a key (J3) |
| Next step obvious | ½ | The trial words name 11-2025 (check 9); the key failure points to an impossible fix (J4) |
| Plain words | ½ | The trial words are plain; "Unnamed form field … not in the key" names a box the key's edition does not have |
| Feedback and state | 1 | Coverage, trial and Forms tab agree on one edition (J1, J8) |
| Correct data | ½ | The fill is correct (J1, J2); the 11-2021 key's result is wrong both ways (J3, J5) |
| Error recovery | 0 | The failing key cannot be repaired, and the release stays refused (J4) |
| Accessibility and screen sizes | ½ | No UI change; not walked |
| Speed | 1 | One pass over the maps; 12 checks including two real fills in 2.9 s |
| Visual quality | ½ | No UI change; not walked |
| Trust and sources | ½ | The edition shown is the one filled, but a signed pass can be recorded for a map never run (J5) |

**5.5/10: fail** (below 8, and error recovery is 0).
**To raise it:**
1. The answer-key runner reads the key's own edition (fixes J3–J5: error recovery, correct data, trust, task completed).
2. Then a browser walk of J1 on the runtime ports (accessibility, visual quality).

**Could not test:** a real screen reader, a browser walk, and an intended user's unaided walk (D17 and D20 stay with the founder).
