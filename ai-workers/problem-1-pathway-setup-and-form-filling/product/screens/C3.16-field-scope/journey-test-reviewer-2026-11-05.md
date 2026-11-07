# C3.16 shared field scope: journey test (reviewer, 5 Nov 2026)

Commit **22aef7e01** (branch `claude/elegant-hawking-qc3qjh`). Isolated copies `rev316` on :4456 (a fresh copy of the six, with Visitor visa and the LMIA work permit set up through the people's steps in `acceptance/lib/pack2.ts`) and `rev316b` on :4459 (after `tests/runtime/setup_visitor_visa.ts`, then the C3.16 case part). Never :4400. Live AI off, US$0. Playwright Chromium, headless (no visible-browser pane in this cloud copy). Screenshots are in the reviewer's scratchpad only, not committed.

## Journeys (persona · goal · result)
1. **Author, main path:** "date of the union is one answer per couple". Library › Fields › Union start date › Asked about › Household › Save as draft. Panel loads in 1.5 s (route 10–20 ms). Radios move with the arrow keys, skipping the refused Filing. The saved-AI-results warning shows before saving ("…1 combination (6 saved runs)…"). After a reload the pill reads "once for the household". **Held.**
2. **Author, alternate:** Organisation on the LMIA work permit's employer name. The six part sets it and reads it back; Preview asks it once and fills the Worker's IMM 5710 only. **Held.**
3. **Author, refused:** organisation.name (a representative's box reads it). Household and Organisation each show "A representative's box reads this field, so it stays about each person." under the choice, and the radio is disabled. **Held.**
4. **Author, published field:** after Start With an LMIA, a 409 and the read-only notice in the concept's words (six part). **Held.**
5. **Wrong role:** the approver sees the group disabled with no Save button, and no sentence saying why (m5). By URL: officer GET → 403 "Not for case people"; client PUT → 403; nobody → 401. **Held on the server.**
6. **Conflict and double click:** two saves at once give one 200 and one 409 "Someone changed whom … is about after you looked… Reload, then choose again." (six part). The same scope again gives 200 and writes nothing. **Held.**
7. **Case officer, across the boundary (release → case):** The application tab: "Date of marriage… · For the household · Read for: Client A, Client B", one answer, confirmed once. Client B's part: "Answered once for everyone it concerns … Answered for the household by the case officer on Nov 5, 2026 · Change it in For the household". The link switches to The application, but focus falls to `<body>` (m4). The child's part has no line, and the child's box stays blank (data). **Held, with minors.**
8. **Client:** on the fixture this question is officer-entered (`collected_from: verified_document`), so the client never sees it. The client-side tag and read-only line could not be walked (m7).
9. **Error by API:** a save on the spouse's record gives 422 "This is asked once for the household, not for a person." (case part). **Held.**
10. **Break it:** an extra body key → 400. `..%2Fetc` → 404 in words. Widths 400, 1024 and 720 px at 2× (200 %) show no sideways scroll. axe WCAG 2.2 A/AA: 0 violations on the panel, the officer's application and spouse tabs, and the client page. No console or page errors.

## Data underneath
Stored as HOUSEHOLD on the draft, and the audit line names the change (six part). The case release placement carries `"scope":"household"` (SQL on `config_release.snapshot`). There is one answer, on the case's own record. Preview on the six with principal + spouse + child: IMM 5257 principal and spouse → `case`, child → null. IMM 5710 Worker and Spouse (`form_subject`) → `case`.
**Engine probe** (pure, `aboutOf` with a mark): an Organisation-marked fact on the principal's form returns `case` for **every** box person, including `representative`, `subject_spouse_or_partner` (also with no partner on the case), `subject_child` and parents. A Household-marked fact returns `case` for a `representative` box when a representative is on the case. See review M1.

## Score (QUALITY.md journey score)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1, J2, J7: the scope is set, and the case asks once |
| Next step obvious | ½ | after the change link, focus is lost (m4); the approver's read-only state is not explained (m5) |
| Plain words | ½ | "Use a case. fact." shows a key prefix; "someone on the case" for answers by a representative (m3, m6) |
| Feedback and state | 1 | the warning comes before the save; pill and panel update; stale save gets a 409 with words |
| Correct data | ½ | real cases right; the engine lets an employer value reach representative or relative boxes on the principal's forms (M1) |
| Error recovery | 1 | every refusal in words, reload advice on conflict |
| Accessibility and screen sizes | ½ | axe 0 and no sideways scroll at 400, 1024 and 200 %; focus is lost after "Change it in…" (m4) |
| Speed | 1 | route 10–20 ms; case view about 1.3 s with networkidle |
| Visual quality | 1 | team cards, radio cards, pill; the 1440 px screenshots are clean |
| Trust and sources | 1 | examples labelled Sample; "Read for" and "Answered … by … on …" |
| **Total** | **8 / 10** | **Pass (8, no 0)** |

Fixes that raise the low criteria, most valuable first: M1 (correct data), m4 (focus and next step), m3/m6 (words), m5.

## Not tested
A real screen reader. An intended user's unaided walk (D17 and D20 stay with the founder). The client-side household view on a client-collected household question (m7). The M2 packs against main.
