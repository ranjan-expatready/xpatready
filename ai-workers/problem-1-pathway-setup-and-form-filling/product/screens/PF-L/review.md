# PF-L review: the gate-approved libraries in one PR (dependencies; P-423)

Independent reviewer (P-303), 14 Nov 2026. PR #1751, branch `claude/sleepy-brown-ds7v6t`, **commit reviewed 5039df8b1** (base `origin/main` 549b9cfbb; two commits, 3a250d5a4 and 5039df8b1). The brief is `design/lead-b-briefs/PF-L.md` on `lead-b-front-office`. Touch list: `package.json`, `package-lock.json` and the gate file. The diff touches only these three (`git diff --stat`: +673 / -1).

**Not a screen.** PF-L has no UI, no route and no journey, so these steps do not apply: screen-review steps 2–3, 6–7 (use, words, retrofit, BIC scorecard), the D1–D20 scores, the graph check and the journey test (no running app was needed). **Journey score: N/A (no screen to walk).** No journey-test report is written. I reviewed the diff against the brief, STANDARDS §1 and AGENTS.md, and I checked every claim independently with the commands below.

## What I checked (evidence)
* **Exact versions.** `package.json` adds nine dependencies, each pinned with no range. The versions match the gate exactly: stripe 23.1.0 (entry 1); docxtemplater 3.71.1 and pizzip 3.3.0 (entry 4); date-fns 4.4.0 and @date-fns/tz 1.5.0 (entry 6); pg-boss 12.38.0, libphonenumber-js 1.13.15, nodemailer 10.3.1 and @aws-sdk/client-sesv2 3.1161.0 (entries 10–13). aws-jwt-verify is left to PF-4, as the brief says.
* **Lockfile diff (compared entry by entry with node).**
  * 43 `packages` entries added, 0 removed. The only entry that changed is the root `""`, and only its `dependencies` gained the nine names.
  * The lockfile is still version 3.
  * For all 43 added entries, `integrity` and `resolved` match the npm registry. Their `dependencies` match the registry too (only the key order differs). pg's optional `pg-cloudflare` was already in the lockfile.
* **Age rule.** I checked the registry `time[version]` of all 43 added entries. All are on or before 31 Oct 2026. The newest are cron-parser 5.10.3 (31 Oct 18:15Z), @smithy/core 3.38.1 and @smithy/node-http-handler 4.14.1 (30 Oct 23:11Z).
* **Install and consistency.** I worked in a scratch copy under `/tmp/claude-0/pfl` with Node 24.22.1 and npm 11.19.1.
  * `npm ci --ignore-scripts` added 449 packages. The only warning was EBADENGINE, because engines pins 24.21.0; that warning existed before.
  * `npm ls --all` exits 0.
  * `npm install --package-lock-only` rewrites the lockfile byte for byte. The lockfile is stable, not hand-edited.
  * No added package has an install script. pg-boss adds a `pg-boss` bin.
* **npm audit.** Before (base lockfile) and after give the same result: 17 issues (8 moderate, 9 high, 0 critical), in the same 17 packages (vite, zod, prisma, multer, …). **No advisory hits any of the 43 added packages.** This matches the addendum's claim.
* **Type check (CI job "types").** I ran it in the scratch tree at 5039df8b1 using the new `node_modules`: `PASS no new type errors (15 known, 0 fixed)`.
  * Smoke test: each of the nine packages imports under Node 24.
  * libphonenumber-js turns `416.555.0101` (country CA) and `+1 (416) 555-0101` into `+14165550101`, as entry 11 says.
  * nodemailer `createTransport({SES:{sesClient: new SESv2Client(...), SendEmailCommand}})` builds an `SESTransport`. That confirms entry 12/13's pairing; no network call was made.
* **Gate facts checked against the registry and the tarballs.**
  * Release counts in the last 365 days: pg-boss 76, libphonenumber-js 33, nodemailer 56, client-sesv2 223, google-libphonenumber 5. All correct.
  * pg-boss: majors 11 (26 Sep 2025) and 12 (9 Nov 2025); engines `>=22.12.0`; deps `pg ^8.23.1`; required (not optional) peer `@opentelemetry/api ^1.9.0`. Its transitive chain is cron-parser→luxon, rrule-temporal→temporal-spec, serialize-error→non-error and type-fest→tagged-tag. The SKIP LOCKED quote is verbatim from its README (line 39). Its types accept a `db` executor, so "enqueue in the caller's transaction" is supported.
  * BullMQ 6.5.3: 31 Oct 2026, MIT, and the description is quoted exactly.
  * graphile-worker 0.18.0: 8 Sep 2026, MIT, Node `>=22.18.0`; it depends on yargs, cosmiconfig, json5 and `graphile-config ^0.0.1-beta.16`.
  * nodemailer has no dependencies and its own `types`. It contains `dist/esm/ses-transport/index.js`, expecting `{ sesClient, SendEmailCommand }`. The "Using legacy SES configuration, expecting @aws-sdk/client-sesv2" quote is verbatim (`dist/esm/nodemailer.js:54`). Majors: 8 (4 Feb), 9 (14 Jun), 10 (4 Sep); 10.4.0 (7 Nov) and 10.5.0 (10 Nov) are too new. All correct.
  * libphonenumber-js has no dependencies, ships `index.d.ts`, and 1.13.16 is dated 10 Nov.
  * google-libphonenumber 3.2.48 is dated 26 Oct, its licence is `(MIT AND Apache-2.0)` and it ships no types.
  * client-sesv2 and stripe both have engines `>=20`.
* **Licence URLs.** All six cited URLs open (HTTP 200), and the first lines match what the entries say. Each new entry carries "Unconfirmed: no counsel". The diff adds no personal names: copyright holders are written as "its author".

## Findings
**Blocker:** none. **Major:** none.

**Minor 1: the libphonenumber-js licence record is incomplete (entry 11, "Licence (read at source)").**
* The entry names only "(The MIT License)".
* The published 1.13.15 tarball also ships `LICENSE.Apache` (Apache License 2.0). That file is at `https://gitlab.com/catamphetamine/libphonenumber-js/-/raw/master/LICENSE.Apache` (HTTP 200).
* The README's "License" section says: "Google's `libphonenumber` is licensed under Apache 2 … Hence, this library is licensed under MIT". The library bundles Google's phone metadata.
* So the comparison with option (b), "npm field (MIT AND Apache-2.0)", suggests that (a) carries no Apache-2.0 material, which is not right.
* The pick does not change.
* **Fix:** add one clause, for example: "the package also ships Google's Apache-2.0 licence (`LICENSE.Apache`, URL above) for the bundled metadata derived from Google's libphonenumber; Unconfirmed: no counsel".

**Minor 2: the transitive count in entry 13 is wrong.**
* The entry says "(16 packages, none in the lockfile before)".
* The packages it lists, and the lockfile, come to 21 AWS/Smithy packages plus `bowser`, which makes **22**. In detail:
  * @aws-sdk: 14 (core, 8 credential providers, nested-clients, token-providers, signature-v4-multi-region, xml-builder, types)
  * @aws/lambda-invoke-store: 1
  * @smithy: 6
  * bowser: 1
* The overall total of 43 does reconcile: 9 direct + 10 (pg-boss) + 2 (docxtemplater/pizzip) + 22 = 43.
* **Fix:** change "16 packages" to "22 packages (21 from AWS, plus `bowser`)".

**Minor 3: the summary table and the approval line still say each library enters with the row that uses it.**
* The "Added by" cells of rows 1, 4 and 6 still read PF-5/FO-7, FO-5 and FO-3.
* The header's Approval line still says each library "enters `package.json` only in the row that uses it".
* Rows 10–13 say "PF-L (used by …)", and the addendum explains P-576 (4). A reader of the table alone gets the wrong row for 1, 4 and 6.
* **Fix:** make rows 1, 4 and 6 read "PF-L (used by …)", matching rows 10–13. Leave the Approval line as history; the addendum already qualifies it.

**Minor 4 (wording): entry 12 calls nodemailer's LICENSE "the MIT-0 text".**
* The file is the MIT text with the notice condition removed. It even keeps a dangling "subject to the following conditions:" with no conditions after it.
* npm's field is MIT-0, and the substance the entry states (no condition to keep the notice) is right.
* **Fix (optional):** "the MIT text with its notice condition removed (npm: MIT-0)".

## Open "Done when" items on the PR (not findings against this commit)
* The PR is a **draft**. CI jobs on 5039df8b1 are skipped; only `guard` ran.
* The PR body's "Checks" section is empty. Still to paste: the `npm audit` summary, the `npm ci` and suite results, and the rows-rev-16 pre-label run on `main` merged in.
* The label waits for green CI on the reviewed head (P-277, P-385).
* If PF-4 (#1744) merges first, the lockfile is regenerated with `npm install`. That is a new head, so its diff needs a re-review (P-277).
* I did not run the database-backed suites (they need PostgreSQL). Nothing imports the new packages and no existing lockfile entry moved, so they cannot change behaviour; CI is the check.

**Verdict: Approve** (commit 5039df8b1). There is no open Blocker or Major. Minors 1–2 are cheap factual corrections to the gate file, and I recommend making them before the label; any new head then needs a diff-only re-review.

## Round 2 (diff-only, P-277): `git diff 5039df8b1..165f2648e`
Two commits. 026ad8b23 adds this review.md, byte-identical to the round-1 text. 165f2648e edits only the gate file (+7 / -7 lines). `package.json` and `package-lock.json` are unchanged, so every round-1 lockfile, audit, `npm ci` and type-check result still holds.

* **Minor 1: closed.** In entry 11, the summary row now reads "MIT (its code) + Apache-2.0 (Google's bundled metadata)". The licence line now cites `LICENSE.Apache` at the GitLab URL (it opened with HTTP 200 in round 1), quotes the README ("Google's `libphonenumber` is licensed under Apache 2") and keeps "Unconfirmed: no counsel". The added "keep the notice files when we ship" sits before that marker, so it is correctly marked as unconfirmed.
* **Minor 2: closed.** Entry 13 now reads "22 packages: 21 from AWS plus `bowser`". That matches the lockfile: 14 @aws-sdk + 1 @aws + 6 @smithy + bowser.
* **Minor 3: closed.** The "Added by" cells of rows 1, 4 and 6 now read "PF-L (used by …)", like rows 10–13. Row 6 adds that the web app's use comes with the booking screens row, which agrees with the gate's "In the web app: 3" line. The Approval line is left as history; the addendum qualifies it, as round 1 suggested.
* **Minor 4: closed.** Entry 12 now reads "the MIT text with its notice condition removed … which npm labels MIT-0". That matches the LICENSE file.
* **Nothing else changed.** All seven changed lines are the four fixes above. No version, date, URL or other entry moved, and no personal names were added.

Still open on the PR, not on this commit: the draft status, green CI on the head, and the Checks section to paste (`npm audit` summary, suites, the pre-label run). If PF-4 merges first and the lockfile is regenerated, that new head needs another diff-only re-review.

**Verdict: Approve** (commit 165f2648e). No open Blocker, Major or Minor.
