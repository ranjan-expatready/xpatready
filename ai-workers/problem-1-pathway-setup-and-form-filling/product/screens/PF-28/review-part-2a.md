# PF-28 part 2a: independent review (PR #2787, head edc27006ec7e7e4144640c445c16cdda037f5790)

Reviewer: Opus 5.5, 21 Nov. Scope: only `git diff origin/claude/dazzling-bardeen-ihtzy6..edc27006e`, which is 16 files (the identity, session and staff-read routes, `service.ts` 400→422, four suites and the allow-list), stacked on #2619. I changed no code. Live AI was off; cost US$0. This is an API change with no new screen, so D1–D20 and the BIC table are N/A. The UI screens that call these doors were walked; see the journey report `journey-test-reviewer-2026-11-21-part-2a.md`.

## Checks run (isolated copy `rv2a` on :4437, runtime ports; never :4400)
- `check_pf28_inputs.ts 4437 xr_studio_rv2a`: **26/26** on two separate runs. 187 routes and 467 probes; 207 probes and 71 code entries are on the allow-list (both at their ceilings). Nothing is NOT TESTED by keys; DW6 is NOT TESTED, as in part 1.
- I dumped every identity probe answer (`PF28_DUMP`). Each passes for the right reason: `unknown` gives 422 with `pf28Unknown` named by the schema. `wrong-type` (`[1]`) gives 422 `body`. `missing` gives 422 naming the required field before any lookup; the batch door's `missing` is 422 from PF-4c's `ROWS_COUNT`, which the rule accepts. `id:id` on staff routes gives 404 from `staffId()`; without it, the `{}` body would give 422 `reason`, so removing the helper fails the sweep. `resend missing` stays listed (it gets a random-id 404), which is honest.
- `check_pf4_identity.ts 4437` (part B on the copy): **120/120**. `check_pf5t_terms` **42/42** (it sends `PUT me/account {}` while terms are pending; still 428). `check_pf6b_permission_rules` **33/33**. `check_pf6r_roles_read` **17/17**. The last three were not in the builder's list.
- Callers: every body in `web/src`, `tests`, `tests/journeys`, `tests/qa`, `tools/skeleton-smoke.sh` and `product/tools` that is sent to these 9 doors uses only the keys the schemas allow: `session/local` {firmKey,email,actorId,secondStep}; invite {email,roles,displayName,reason}; roles {roles,reason}; deactivate/reactivate {reason}; resend `{}`/{reason}; credential and `me/account` {licence:{3 strings}}; callback {code}. The web licence form always sends `licenceNumber` as a string (`licence-form.tsx:50`), so the non-null schema accepts it.
- `emailOf`/`rolesOf` importers: `firms/signup.ts:123` catches every error and answers with its own fields. `batch-invite.ts:17` `flagOf` reads only `code`/`detail`. Neither reads the status, so 400→422 changes nothing there. No web screen tests for 400 on these doors (the `terms-gate.tsx:74` check of `status === 400` is for the terms route, which this diff does not touch). `invite-panel.tsx:37` keys on the `DISPLAY_NAME_` codes, which are kept.
- No remaining test expects 400 on identity codes. The `REASON_REQUIRED` 400s in csc1, csdl3 and r177 come from the runtime's own rules, not from identity's `reasonOf`.

## Security and the order of checks
- The guard still runs first. A Case Officer's `PATCH staff/:id/roles` gets 403, whether the body is bad or the id is bad.
- No leak across firms. The `sample-solo` staff id and a random uuid with the same bad body give byte-identical 422 answers (md5 equal); with a valid body, both give 404 "No such staff member." on deactivate and credential. `staffId()` is a syntax check only, so it cannot be used as an oracle.
- A `__proto__` key gives 422 before the schema runs. An upper-case uuid is accepted and lower-cased in the service.
- `resend` does not use `staffId()`. That is correct: its id is an invitation id, checked in `openInvitation` (service.ts:424). It also means resend gets no id check before the body (see m3).

## Done-when proof
- A misspelt `emial` gives 422 naming it, "Nothing was saved", and the invitation count is unchanged (check_pf28:207-208). A malformed staff id gives 404 before the body, and a sign-in with no `firmKey` gives 422 naming it (:209-211). The DW2 fail case moved to `POST offices`, which is still loose and still listed.
- The ceilings are lowered to 71/207. 41 entries were removed, and each one is now seen to pass, because `judge` would fail an entry that is fixed but still listed.
- Caveat on proof (not a finding): the service rules now answer 422 too, so `wrong-type` and `missing` would pass on these doors even without a schema. Only `unknown` and the code half (a) tell whether a schema is there. Both are in place.

## Findings
### Blocker
None.
### Major
None.
### Minor (Should)
- **m1. Batch rows are not strict: a misspelt optional row field is silently dropped.** `routes.ts:24` uses `rows: z.unknown()`, and `batch-invite.ts:48` reads only name/email/roles. I sent `{"rows":[{"email":"nmae.typo@example.com","roles":["READ_ONLY"],"nmae":"Client B"}]}` and got 201; the invitation is stored with `display_name` null. This is the error R1.10 exists to catch, and `batch unknown` has left the allow-list. No web screen calls the batch door. Fix, keeping PF-4c's per-row flags: in `batchRowsOf`, flag any row key other than name/email/roles as a row flag (for example `UNKNOWN_FIELD`, "This field is not allowed here: nmae"), and add the fail case.
- **m2. A POST with no body at all is now 422 on all-optional `resend`.** It used to be `b ?? {}`. Express 5 leaves `req.body` undefined when there is no Content-Length, so `curl -X POST …/resend` now answers 422 "body: This is required." (verified). In-repo callers are unaffected: the web sends `{}`, and Node fetch sends Content-Length 0, which parses as `{}`. Fix: `parseInput(IdentityInput.resend, b ?? {})`.
- **m3. The invitation id is not checked before the body.** `POST invitations/not-a-uuid/resend` with `{"x":1}` answers 422 while the staff routes answer 404. That breaks part 1's rule ("a malformed id is simply not found, never a field error"). Also, `staffId()` duplicates `idParam` in `http/input.ts`. Fix: use `idParam(id, "staff member")` and `idParam(id, "invitation")` (resend, and revoke for symmetry).
- **m4. The callback's generic words reach a person.** A link with a code over 2000 characters shows "One field needs a change: code: This is too long: at most 2000 characters. Nothing was saved." on the sign-in page (journey step J8). An ordinary bad code shows "This sign-in link has been used or has expired." The new 422 words appear only for tampered links, but they are not plain words for that page. Fix: if the schema refuses the body, answer the existing 401 `SIGN_IN_CODE_REFUSED`, or let `callback-page.tsx` show its "used" words on any 4xx.
- **m5 (nit).** `session/local` parses the body before the "door off" check (service.ts:156). On a server without the local stand-in, a malformed body gets a 422 listing the fields instead of 403 `LOCAL_SIGN_IN_OFF`. Nothing secret is exposed. `displayName` allows 2000 characters, but the invite panel's Name field has no `maxLength`, so a name of more than 2000 characters shows the generic error at the top of the panel, not on the field. Optional.

## Graph (P-86)
`graph.mjs` lists all 12 changed doors under G3 ("no test reaches"). The tool does not follow `staffApi`/`staffChange`/`call(base, …)`; pf4, pf4b, pf6 and the sweep do reach these doors. This is a tool gap, not a finding.

## Not checked
The Cognito path (no pool), a real screen reader, and an intended user's own walk (D17/D20 stay with the founder). I did not re-run pf4c, pf4dn, pf6m/m2, aud1b/aud4, pf12_walls, csv1, pf19r or the browser suites; the builder reports them green, and nothing in this diff changes their bodies beyond what the sweep covers.

## Journey score (reviewer, the one score for this check)
**9/10, pass.** Details are in `journey-test-reviewer-2026-11-21-part-2a.md`: plain words ½ (m4), correct data ½ (m1).

**Verdict: Approve** (no open Blocker or Major) for edc27006ec7e7e4144640c445c16cdda037f5790. m1–m4 should be fixed in this PR or in part 2b; m1 first.
