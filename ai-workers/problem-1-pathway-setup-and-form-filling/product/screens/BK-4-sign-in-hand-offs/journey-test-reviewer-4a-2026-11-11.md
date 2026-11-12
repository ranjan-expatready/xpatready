# Journey test, reviewer role: BK-4a sign in by role, one person picker

Skill journey-test, reviewer at CHECK (the one score for this check), 11 Nov 2026. Commit `6de01ae8452af81561c1d492e61ba31e33a34e40`, isolated copy :4442 (configured checkpoint), never :4400. Chromium (Playwright, headless) driven like a person: click, type, keys; data read through the API afterwards. Live AI off, US$0. My scripts and screenshots are in the reviewer's scratchpad (`walk.cjs`, `kb.cjs`, `shots/`), not in the repo. The review is `review-4a.md`.

## Journeys (from concept §1, §4, §5, §7; P-484)
| # | Persona · goal | Steps | Expected | Result |
|---|---|---|---|---|
| J1 main | Walker: "start as the author, then hand over" | `/sign-in` → Configuration author → picker Approver → "Cases (as Case officer) →" → open the case → release pill → Back → reload | Lands on programs; each change says "Now: <name> (simulated)"; Back changes nobody | Held: `/` as user-A; the notice for Approver, Case officer and author; Back and reload show BR-8's notice with user-A unchanged. **But** signing in as the author shows no notice (the id did not change), and the pill reads "Release 1 →" with no person on screen |
| J2 alternate | Case officer: "see it as the client" | On `/cases/:id`, pick Client A, then Representative | The client meets a way to their page; staff see the case | Held: "This page is for the case officer · open your Client questionnaire" (link); the Representative sees the case |
| J3 alternate | Client A via More people | `/sign-in` → More people → Client A; then type `/` | `/cases` with the clients' notice, no "switch to"; Studio refused | Held: "Cases are for the case officer … the case list is the firm's"; `/` → "This page is for the configuration people" |
| J4 error | A browser that remembers `user-Z`; server down | Open any address; abort `/api/**` and sign in | Sign-in with a reason; frame notice when the server is down | Held: `/sign-in?unknown=1` "Choose who you are … not in this workspace"; `/link` untouched; with the API down the sign-in page still works and the Studio says "The studio server is not answering" |
| J5 keyboard | Keyboard-only walker | Tab through sign-in, Enter and Space on a card, Tab to the picker, arrow keys | A full path with visible focus | Held: Tab order is 4 cards → More people; ring visible (`kb-focus-card-1024.png`); Enter and Space sign in; the picker is 3 Tabs in. **Arrow keys on the closed select change the person at once and cross areas** (Approver ↓ → `/cases` as Case officer) |
| J6 sizes | Any | Sign-in, BR-8 notice, Studio header at 1024, 200 % (640 css px), 375 | No sideways scroll; axe clean | 0 px sideways at all three widths; axe clean (sign-in 1440 and 1024, BR-8 1024). The picker at 375 shows "Appr…" |
| J7 wrong role | Approver types a case address | `/cases/<id>` | BR-8 notice, one named button, nobody switched | Held; "Continue as Case officer →" switches with the notice |
| J8 break it | Double-click; two tabs; reload | Double-click a card; sign in as the author in tab 2 while tab 1 is the Case officer | One notice; no corruption | Held: one notice. Tab 1 keeps acting as the Case officer until reload, then shows BR-8 (one `xr-actor` per browser; concept BR-7; not 4a scope) |
| Boundary | Studio → Cases → Studio | Frame links both ways; Ctrl-click | The link names the person; a new tab changes nobody | Held (also `check_bk4a_browser.cjs` 37/37 re-run) |

## Data underneath
* `localStorage xr-actor` matched every choice exactly. Nothing else is written; there is no API or schema change.
* Server rights (BR-5): Client A and the Case officer get 403 on `/api/library/fields`; the author gets 403 on `/api/runtime/cases`; `user-Z` gets 401. No audit line is expected: a person change is browser-only scaffolding (concept §9).
* Console: only the expected 403s for Client A at `/cases`; no page errors.

## Break it (15 min)
* Arrow-key on-input on the picker. Minor: WCAG 3.2.2 / F37, keyboard path exists.
* A red regression suite (`check_bk3_links_browser.cjs` 54/56: the old pill name). **Major**, in `review-4a.md`.
* Unknown person by URL, double-click, reload mid-flow and API down all held.
* Long or non-English text: N/A (no input on these screens).

## Score (each 0, ½, 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1–J8 all reach their goal |
| Next step obvious | 1 | 4 cards; BR-8 has one named button; frame links name the person |
| Plain words | 1 | §7 copy as written; one stale tip ("no sign-in", `App.tsx:81`) |
| Feedback and state | ½ | No notice when signing in as the default person; the pill's person is not on screen before the click |
| Correct data | 1 | Stored person exact; the server refuses as before |
| Error recovery | 1 | Unknown → sign-in with reason; API down → frame notice; Back → BR-8 |
| Accessibility and screen sizes | ½ | axe clean, 0 px sideways at 1024, 200 % and 375; arrow keys change the person and navigate; picker "Clie…/Appr…" at 375 |
| Speed | 1 | Sign-in 232 ms; card → programs 64 ms |
| Visual quality | 1 | Team cards and tokens; no filled button; screenshots at 1440 and 1024 |
| Trust and sources | 1 | "Simulated" on every card and the picker; prototype badge |
| **Total** | **8.5 / 10** | **Pass** (8 or more, no 0) |

Raising the ½ scores, most valuable first: (1) show "(as Configuration author)" on the pill; (2) say "Now: …" when signing in, even as the same person; (3) warn before the picker moves areas, or move only on a committed choice; (4) name only in the picker below 640 px.

## Not tested
A real screen reader (is the notice announced when the frame remounts?); Safari and macOS select behaviour; an intended user's unaided walk (D17, D20 stay with the founder).
