# PF-28 challenge: which status a field error answers (R1.10) — question for the tech lead

Raised 21 Nov by the PF-28 builder lane (row owner Lead B) before building, as the lane brief asks: "if brief and Done when disagree, post a Question for the tech lead with the evidence before building".

## The four texts disagree (facts, read at origin/main 0dece71e0 and origin/lead-b-front-office)
| Source | Field error (wrong type, missing, unknown, too long) answers |
|---|---|
| R1.10 Done when (`product/qa/CAPABILITIES.md`, row R1.10) | **400** Problem Details naming the field, on every PF/FO route |
| PF-28 brief on `main` (`design/lead-b-briefs/PF-28.md`, 16 Nov) | **400** ("400 problem with field messages"; sweep expects 400, 404 or 413) |
| BACKLOG PF-28, "Amended 18 Nov (Lead B rev 17.21, 46ae783cd)" | **422** with `fields` (RFC 9110); 400 only for an unparseable body or a bad webhook signature; the sweep PR moves existing 400 field errors to 422 |
| Lead B's ruling note (`lead-b-briefs/PF-28.md` on `lead-b-front-office`, 46ae783cd) | **422**, "binding for PF-28, the sweep, and every PF/FO row from now on" |

Code today:
* PF/FO: 22 `problem(422 …)` sites (front-office sales `common.ts`, `public.ts`; the `expectedOwnerStaffId` refusal qa saw in `sales/leads.ts:185`) and 59 `problem(400 …)` / `BadRequestException` sites under `api/src/platform` and `api/src/front-office`.
* Case side (the other half of R1.10): CS-V1 parts 1–3 are merged and answer **400** naming the field (`tests/check_csv1_inputs.ts` DW4, "answers 400 naming <field>, nothing stored"; 99/99).
* FO-13i2's BACKLOG row already expects **422** `fields.documentExpiry` "(PF-28)".

So under the ruling R1.10 ends with two shapes (case side 400, PF/FO 422), and its Done when names neither split.

## Question for the tech lead
Which status does R1.10's Done when hold PF/FO field errors to?

1. **(Recommended) 422 for PF/FO, as Lead B's binding ruling; reword R1.10's Done when** to: "a field error answers Problem Details naming the field in plain words: **422** on PF/FO routes (Lead B rev 17.21), **400** on case-side routes (CS-V1); a body that cannot be parsed is 400 everywhere; a non-uuid id 404; too large 413". Why: the screens already read `fields` from 422; FO-13i2 expects it; CS-V1 is merged and green, so moving the case side to 422 is churn with no user gain.
2. 400 everywhere, as R1.10's text: PF-28 moves the 22 PF/FO 422 sites to 400 and the screens' field-error reading is re-checked; Lead B's ruling and FO-13i2 are reversed.
3. 422 everywhere: CS-V1's routes and suite move to 422 too (a case-side row; outside PF-28's touch list).

**What the lane does meanwhile:** builds part 1 (the rule, the sweep, the allow-list) on option 1. The status is one constant in `platform/http/input.ts` and one expected set in the sweep, so option 2 costs a one-line change in part 1. The fix parts that move existing 400 field errors wait for the answer.

## Two smaller points the lane settles itself (say if not)
* R1.10's Done when names **missing** fields and the **query**; the brief's four probes do not. The sweep adds a fifth probe (a required field left out) and runs the probes on query strings too.
* R1.10 is not finished by PF-28 part 1: the brief's fix parts (platform; front-office sales; booking; retainers) remove the allow-list entries. Part 1's PR carries no "Completes:" line; the last fix part carries "Completes: R1.10" if CS-V1 is then finished.
