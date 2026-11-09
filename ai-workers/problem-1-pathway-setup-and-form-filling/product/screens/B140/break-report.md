# B140 — C6.18 officer entry for background answers: break report

PR 1246 at `69c33c235`, branch `claude/youthful-planck-mf99ql`. Isolated copy `brk140` on :4438 (`xr_studio_brk140`), reset, then `configured` loaded (99 s). Actors: user-O officer, user-P client, user-Q other client, user-A/B/C configuration, user-R/T same-firm staff, user-S solo firm. The pack `acceptance/C6.18.test.ts` ran on this copy: **20/20 pass** (C6.18-6 PENDING, as the author says). Scope is README §Decisions 1–8 (P-26). No AI, US$0. My scripts and screenshots are in the session scratchpad only, not in the repo.

## Findings

**M1 (Major): "This is right" re-confirms the officer's value even when the client has already picked a different one on screen. The client's change is dropped without a word, and the screen then disagrees with what was stored.**
Steps: the officer records `person.military_service` = No (and `person.criminal_history` = No). As user-P, open `/cases/:id/questionnaire` at 1440 px and click **Change** on that line. The part opens with the line "Your case officer recorded No … Is it right? If not, change it below and save." Select **Yes** in the radio under it, then press **This is right** instead of Save.
Expected: the button is refused, or it asks which value the client means, because the draft differs from the officer's value.
Actual: the server stores the officer's **No** as `client_reconfirm` and counts it as confirmed, so it fills IMM 5257. The toast says "Re-confirmed: it is your own answer now." The radio still shows **Yes**. Measured on screen: `{"v":false,"ch":"client_reconfirm","conf":true}`. I reproduced it twice (criminal history, military service). If the client leaves or reloads without pressing Save, the No they had just rejected stays on as "their own" answer.
Where: `web/src/runtime/questionnaire.tsx:507` (the line and the field are side by side, and the draft is never compared) and `:588` (`ReconfirmLine` posts the stored id whatever the draft holds). Screenshot (scratchpad): `shots/c3-after-right-with-draft-yes.png`.

**M2 (Major): staff can save a blank background answer, and the client can then re-confirm that blank as their own.**
Steps: the officer calls `PUT …/answers/:P/person.criminal_history_details` with each of `"   "`, `" "`, `"\t"`, `"　"`, `[]`, `{}` and `[""]`, and `PUT …/person.military_service` with `"   "`, `[]` and `0`.
Expected: refused with 400 ("no blank is ever saved"). Only `""` and `null` are refused today.
Actual: every one returns **200**. The blank is stored as an Officer answer with the problem "Enter an answer." / "Answer yes or no." The client's list "Check what your case officer recorded" then shows the details line with an empty value, and the part reads "Your case officer recorded  on 7 Nov, 10:52. Is it right?" (no value). **This is right** accepts it. `POST …/reconfirm` on the officer's `[]` for a yes/no returns 201 and stores `{"v":[],"conf":true,"problems":["Answer yes or no."]}`. Pressing Enter on that button by keyboard does the same for the officer's `"maybe"`: `client_reconfirm`, confirmed, with the problem.
Mitigation that held: an answer with a problem is never written on a form ("needs a fix"), so no blank reaches a PDF. The breach is in the stored data, the audit line ("Client A re-confirmed …") and the client's screen.
Where: `contracts/runtime.ts:76` (refuses only `undefined`, `null` and `""`) and `api/src/runtime.ts:401-424` (`reconfirm` never reads `problems`).

**M3 (Major, a question for the tech lead and the immigration expert, Unconfirmed: expert): the same question is protected on IMM 5257 and not protected on IMM 5257 Schedule 1.**
Decision 1 takes background facts only from a part headed "BACKGROUND INFORMATION" (`engine/runtime/background.ts:27`). Schedule 1's own reading (`p1/inventory/imm5257_1e.headings.json`) has the parts "Military service", "Membership or Association with Organizations" and "Government positions", but no such heading. So none of its facts are marked.
Steps: the officer records `person.has_military_or_security_service` = No and `person.has_held_government_position` = No, says "none apply" for the military, government and organisation groups, then presses Confirm section on each.
Result: every one is VERIFIED and confirmed, with `awaiting_client: 0`. A generated IMM 5257 SCH1 copy (`6f2c2325…`) holds `has_military_or_security_service=false` and `has_held_government_position=false`, and the client never saw either. In the same case, IMM 5257's `person.military_service` (the same subject) waits for the client. I am not asking for new scope; the README's known limit ("no checkpoint release has a repeating group in a Background block") is true only under this narrow reading.

**m1 (Minor): a waiting answer can be hidden on Ready to file.**
`missingLabel` adds "recorded by staff, the client re-confirms it", but the critical line lists only 3 labels and then "and N more". On a fresh case the criminal-history wait was inside "and 56 more" (`GET …/prepare`). The Forms tab names it correctly: `reason: "waits for the client to re-confirm"`.

**m2 (Minor): the walk does not cover the officer's side in the browser.**
I did not re-walk the Agent view in Playwright. With user-O, `/cases/:id` opens on a tab without the Background section. The `data-background-note` was not found on the first view, so I relied on the author's screenshots 01–05 and 10. This is not a defect, only a gap in my walk.

## What held (attempt → result)
* **Re-confirm by the wrong role:** user-A, user-B, user-C → 403 "works on configuration"; user-O, user-R, user-T, user-S → 403 "staff cannot do it for them"; user-Q → 404; no actor or an unknown one → 401. The answer still waits afterwards.
* **Wrong case or id:** user-P re-confirming, under case A's path, an answer id from user-P's own case B → 404 "No such answer on this case". A non-UUID id and an unknown case → 404.
* **Not a background answer:** re-confirming an answer the officer entered outside the background block (family name, date of birth) → 409 "Nothing to re-confirm". Re-confirming twice → 409.
* **Concurrency:** 3 re-confirms at once → `[201,409,409]`, leaving one `client_reconfirm` version and the officer's version superseded. Re-confirm against an officer change at the same moment, 15 rounds → 15/15 consistent (officer 200, re-confirm 409). No re-confirmed row ever held a value the client had not seen. A stale id → 409 naming the newer answer (pack C6.18-13).
* **Confirm section:** the officer's Confirm section confirms none of 12 officer-recorded background answers (`confirmed: 0, awaiting_client: 12`) and creates no VERIFIED version.
* **Officer saves after the client re-confirmed:** the answer waits again, even with the same value. An existing copy goes out of date ("changed: … criminal offence").
* **Generated IMM 5257** (`16518461…`) with 12 officer-recorded and section-confirmed background answers: none of them in the copy's facts. After the client re-confirms, a new copy (`8d0b2e8c…`) holds 12/12.
* **Undo (C9.2)** after Confirm section: the restored officer value still waits (`agent_view`, awaits_client true).
* **onBehalfOf and reason in the body:** ignored. The answer is stored as `agent_view`, waits, and is marked Officer.
* **Other firm:** user-S's `PUT` and Confirm section on another firm's case → 404. user-Q `PUT` → 404, user-A → 403.
* **Long and non-English text:** a Japanese and Arabic details answer saves (200); 20,000 characters → 400 "at most 4000 characters".
* **Client changes the value by answering:** it becomes their own answer and the Officer mark goes (pack C6.18-18). Re-saving the same value through the questionnaire also makes it their own.
* **Audit:** each step has a line in words: officer entry, re-confirm naming the officer, and officer change.
* **Keyboard:** Tab reaches "This is right: <question>" on the overview, and Enter works. Reload keeps `?part=21`.

## Not tested
* No declaration question on the checkpoint, as the pack says; it is proved only in `tests/check_c618_officer_background.ts`.
* Group "none apply" inside a Background block: no such group on the checkpoint (see M3).
* 200 % zoom and 1024 px.

Copy stopped: `zsh tools/isolated.sh brk140 4438 stop`.
