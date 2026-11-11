# Journey test (reviewer): BK-3 PR 3, the client page

Commit ef1038a29d2a7298be179789de94b08e5b730e87 · copy screens_bk3r on :4444 (configured checkpoint plus the browser check's cases; stopped afterwards) · 11 Nov 2026 · Live AI off, US$0.
Walked with Playwright (headless; every decision point screenshotted and read by eye), then replayed by `tests/check_bk3_client_browser.cjs` (65/65) and my scratch scripts. Review: `review.md`.

## Journeys (written from concept.md before the walk)
| # | Persona · goal | Steps | Expected | Result |
|---|---|---|---|---|
| J1 main | Case officer · "From this case, get to the client and their other case" | Cases → BK3C-A1 → "Client: Client A" → BK3C-A2 → browser Back → Back | Client page with 3 cases and their people; round trip; Back → Cases | Held. Line "Cases › Client A", one read, page drawn 67 ms after the click, "3 cases shown at Sample immigration firm" |
| J2 alternate | Case officer · "Open a new case for Client B" (keyboard only) | Client B's page → Tab ×6 → Enter → fill → Open case (double click) → "Client: Client B" | Dialog with Client B chosen; one new case, listed on B's page | Held. Focus on the first field; one case from a double click; listed, count 3 → 4 |
| J3 empty | Solo representative · "Does Client B have cases with us?" | /cases/clients/user-Q as user-S | "Client B has no cases at Sample solo practice yet" and the button | Held |
| J4 error | Case officer · page read fails | the read answers 500 (route stub) | Danger notice, no wrong count | Held; no "Try again" (m4) |
| J5 wrong role | Client A · lands on a staff address | client page → case → "Open it as Client A" → browser Back ×2 | Refused, no case named, no Back to a case address | Held: "This page is for the firm's staff … Switch to the case officer"; line "Your application", no Back |
| J6 bad address | Case officer · typed address | user-Z, user-O, a symbol, `/cases/clients/user-P/nothing` | "No such client" / "Page not found", Back out | Held; deeper address Back → `/cases/clients/user-P` |
| J7 recovery | Case officer · reload, switch person | reload; Acting as → Solo rep → Client A | Same page; firm-scoped list; then refusal | Held, except loaded-more rows survive a switch (m3, needs >100 cases) |
| J8 boundary | Case officer · client page → case → Open it as Client A | the one link that switches the person | Only that link switches; others keep user-O | Held (actor read before/after each link) |
| J9 long text | Case officer · long reference, Vietnamese and Greek name | 49-character reference; long principal | Wraps, no sideways scroll at 375/1024 | Held |
| J10 more | Case officer · client with more cases than a page | `take` forced to 1; Load more; the after-page failing | Count grows; a failure says so | Count grows "1 → 2 cases shown"; failure silent (m2) |

## Automated replay
`check_bk3_client_browser.cjs`: 65/65 at 1440 and 375 (axe WCAG 2.2 A/AA, no sideways scroll, request count, actor unchanged). My scripts: axe 0 violations and no sideways scroll at 1024 and 720 px (200 % zoom); no page error except the injected Load-more failure. Run twice (my walk script twice): same results; the second run's 409 on a reused reference is the duplicate check working.

## Data underneath
API as the officer: `?client=user-P` rows are all `user-P`, Sample firm only; as the solo rep only BK3C-S1; Client A/B 403, configuration person 403, no actor 401. The case opened from Client B's page has `client: user-Q`, exists once after a double click. Rows carry only id, reference, combination, status, created_at, client, people `{label, role}`. Break-it: `?client=a&client=b` drops the filter (m5); a sponsor shows as "sponsor" (m1).

## Score (QUALITY.md, each 0, ½ or 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1, J2 end to end |
| Next step obvious | 1 | one filled button; reference links; header link at every width |
| Plain words | ½ | "sponsor" in internal form (m1); otherwise plain and labelled Simulated |
| Feedback and state | ½ | skeleton, empty, error, honest count; Load more failure silent (m2), stale rows after a switch (m3) |
| Correct data | 1 | firm scope and client filter on the server; one case per submit |
| Error recovery | ½ | refusal and unknown key lead out; error notice has no retry (m4) |
| Accessibility and screen sizes | 1 | axe 0 at 1440/1024/720/375; keyboard path; 24 px targets (focus after dialog close is pre-existing, shared Dialog) |
| Speed | 1 | one request; 67 ms to draw |
| Visual quality | 1 | quiet surfaces, one blue button, cards below 640 px |
| Trust and sources | 1 | "Simulated client login: the prototype has no client records yet" visible; no AI |
| **Total** | **8.5 / 10** | **Pass** (8 or more, no 0) |

To raise it: m2 and m3 (feedback), m4 (recovery), m1 (words).

## Could not test
A visible (headed) browser pane; a real screen reader; more than 100 real cases for one client; an intended user's unaided walk (D17, D20 stay with the founder).
