# PF-24 review: secrets loader and SecretBoxPort (PR #1756)

Reviewer (Opus, P-303). Reviewed commit **0b46983f8** (code). HEAD is now c52912741: `git diff 0b46983f8 c52912741 --name-only` lists only `product/qa/built/PF-24.md`, so it is records-only and the same code.
Read: brief `lead-b-briefs/PF-24.md`, row PF-24 (lead31 BACKLOG), SA-08 §3.1, SA-8-1..-4, BR-4, `git diff origin/main...0b46983f8`, and PF-0p's `ports/jobs.ts` (#1752).
No screen, so journey test: n/a (code, tests and runbook only). US$0, no model call, :4400 not touched.

## What I ran
* `tsx studio/tests/check_pf24_secrets.ts 18524 runtime_pf24rv`: **53 passed, 0 failed** (9.5 s; isolated copy started and stopped).
* "Must still be true", on my own isolated copy `runtime_pf24rv2` :18526 (started, then stopped): `check_s7_reset` **4/4** (includes C10.1), `check_d1_reset_to_six` **25/25**.
* CI's type gate `node product/tools/typecheck.mjs`: **FAIL, 1 new type error** (see M1). The PR's CI runs at 0b46983f8 are all `skipped`, so CI has not caught it yet.
* Structural fit: in a scratch project, `const a: ReencryptJobs = (x as JobPort)` and `= fakeJobs(clock)` with PF-0p's `ports/jobs.ts`, `audit.ts` and `clock.ts`. tsc reports no error on the fit file. Job name `platform.secret_box.reencrypt` matches `JobName`. The key `platform.secret_box.reencrypt:<uuid>:v<n>` is at most 200 characters. firmId is a uuid, as `FirmId` requires. The handler compares firm ids in lower case, which matches fakeJobs lower-casing them.

## Crypto: sound
`aes-gcm.ts`:
* AES-256-GCM through `node:crypto`. The iv is 12 random bytes on every seal; the test shows two seals of one value differ.
* `authTagLength: 16` is set on both cipher and decipher, and `open` refuses a tag that is not 16 bytes before decrypting (`aes-gcm.ts:54`). A truncated-tag forgery is therefore closed.
* The AAD is a JSON array `[scheme, version, firmId, personId|null, purpose]`. That encoding is unambiguous and binds both owner and version. Relabelling v1 as v2 is refused, and so are another firm, another purpose and another person.
* The per-firm key comes from HKDF-SHA256 (fixed salt, info `firm:<id>`) over a 32-byte master. The loader checks that masters have the right length and are distinct, and that the current version is in the ring.
* Every error is a fixed message with no value, key or ciphertext.

## Leak paths: none found
* `Secret` keeps its value in a module WeakMap. `toString`, `toJSON`, `inspect.custom` and `toPrimitive` all give `[secret NAME]`, and the object is frozen; spread and `structuredClone` copy only `name`.
* zod results are used only as `.success`, so no issue text that could carry a value is ever built.
* `ConfigRefused` holds names and rules only. For a bad `PLATFORM_ENVIRONMENT` it echoes at most 20 sanitised characters, and that setting is not a secret.
* The re-encrypt job's failure message and `ReencryptResult` carry ids and codes only.
* The real-server leak test (the refusal output, 144 GET routes with and without an actor, and the captured log) finds nothing.

## Start-up stops before listening: yes
`features/platform-config.ts` calls `platformConfig()` at import. `registerFeatures` imports it in `main.ts:231`, before `NestFactory.create` and `app.listen` (`:243`). The rejection in `void main()` is unhandled, so the process exits non-zero.
The test spawns the real `main.ts` and asserts four things: a non-zero exit, the setting's name in the output, no "Product Studio on http" line, and no value.
Locally nothing changes: `PLATFORM_ENVIRONMENT` is unset, and no `PLATFORM_*` name exists on `main` (`git grep`). `isolated.sh`, `new-machine.sh` and `xfa-writer-trial-mac.sh` all give a `postgresql://` URL, which the `DATABASE_URL` rule accepts.
PF-4 (#1744, not on main) uses the same `PLATFORM_ENVIRONMENT` and `PLATFORM_COGNITO_*` names. Its compose file and its suite never start a server with `test` or `production`, so merging both does not trip this refusal.

## Done when: each line has a pass and a fail
| Done-when line | Pass | Fail | Real? |
|---|---|---|---|
| A missing required secret stops start, naming it, with no value | test and production load with every setting; the isolated server starts in `test` | each of the 12 settings removed in production, named exactly; the real server exits naming `PLATFORM_ZOOM_CLIENT_SECRET`; invalid `DATABASE_URL` | yes |
| A seeded secret never appears in logs or any route (sweep) | the sweep reaches 144 routes; config logged 5 ways | no hit in any body, header or captured log; the finder is shown not to be blind | yes, with caveats (m3) |
| A token round-trips; a tampered one is refused | round trip, version named, random iv | ciphertext, tag, iv, cut, short tag, relabel, not sealed | yes |
| Key change: the job moves every value; the old key then reads nothing | 8/8 moved (paged 2 at a time); new key opens all; counts are v2 only; second run is idempotent | before the job, only the old key reads all; after it, the old key reads 0; stale, tampered and cross-firm cases; CAS race | yes |
| Firm A's credentials never decrypt for firm B | opens for A | B, another purpose, another person; B's token copied into an A row and refused in the job | yes |

None of these is a tautology. Each fail case would turn red if its rule were removed.

## Findings

**M1 (Major): the CI type gate is red.** `tests/check_pf24_secrets.ts:55`
```
const without = { ...env, PLATFORM_ENVIRONMENT: "production" }; delete without[x.name];
```
`typecheck.mjs` reports `TS7053: Element implicitly has an 'any' type ... '{ PLATFORM_ENVIRONMENT: string; }'`. This error is not in `typecheck-known.txt`, so the `types` job fails as soon as CI runs and the PR cannot merge on green.
Fix: type it, e.g. `const without: Record<string, string> = { ...env, PLATFORM_ENVIRONMENT: "production" };`. Then re-run `typecheck.mjs`.

**M2 (Major): the database-password rotation in the runbook is not downtime-free (SA-8-4, BR-4).** `deploy/RUNBOOK-secrets.md:41` says to "create the new password on a second role or `ALTER ROLE … PASSWORD` only after step 3". The `ALTER ROLE` branch cannot work without errors:
* After step 3, the new tasks already hold a password the database does not accept. They fail `/api/health` and the deployment stalls.
* Running `ALTER ROLE` while the deployment stalls lets the new tasks start, but then the old tasks' new pool connections fail (the pool closes idle connections after 10 s). Requests error until those tasks drain.
* Running it before step 3 breaks the old tasks in the same way.

A PostgreSQL role has one password, so the no-downtime path is two roles taking turns:
1. Set the password of the role that is not in use.
2. Point the secret at that role.
3. Deploy.
4. Then change or disable the old role's password.

RDS also offers this as Secrets Manager's "alternating users" rotation. Fix: drop the `ALTER ROLE` alternative and write the two-role sequence.

**m1 (Minor): a re-encrypt job cannot be re-run for the same version.** `reencrypt.ts:226,232`; runbook `:53-58`. The key is `…:<firm>:v<n>`, and PF-0p's rule is that a key never queues twice, even after its job ran. Two cases leave values that the job can never move:
* The documented rollback: v2, then back to v1 (new values are sealed v1), then forward to v2 again.
* A value that a still-draining old task re-sealed on v1, which the job counted as `changedMeanwhile` and reported as done.

In both cases step 4 shows v1 values left and the runbook gives no way forward. Nothing is lost, because v1 stays in the ring, but the rotation cannot finish. Fix: add a run stamp to the key (e.g. `…:v2:<enqueuedAt>`) or give the engineer a direct `runReencrypt` path, and say in step 4 what to do when counts are not zero.

**m2 (Minor): the runbook names a function nobody can call.** Step 3 says "enqueue … (`enqueueReencrypt`)", but there is no CLI, route or start-up hook that does this, and no `SealedValueStore` exists yet (FO-3v adds the first). Fix: say so in step 3 ("wired by the first row that stores sealed values; until then there is nothing to move"), so an engineer does not look for a command.

**m3 (Minor): the sweep has gaps.**
* `tests/check_pf24_secrets.ts:232` deletes `DATABASE_URL` from the seeded values, so the most sensitive secret is never looked for in responses or the log. Local PostgreSQL trusts the connection, so the test could pass `DATABASE_URL=postgresql://xr_studio:<generated>@127.0.0.1:54329/xr_studio_<name>`. `isolated.sh:83` puts `"$@"` after its own `DATABASE_URL`, so the generated one wins.
* The sweep covers GET only (`:243`). The row says "any route's response". POST, PATCH and DELETE error bodies are where a stray config object would most likely show up. At least a POST with an empty body to each declared route would cover them.

**m4 (Minor): owner ids are looser than the job's.** `ports/secret-box.ts:18`: `SecretOwner.firmId` is any non-empty string. `ReencryptPayload` (`:91`) and PF-0p's `JobOptions.firmId` require a uuid. A value sealed under a non-uuid firm id gets refused by the job: PF-0p's `enqueue` throws in `JobOptions.parse`, which stops `enqueueReencrypt` partway (`reencrypt.ts:232`) and skips every later firm.
Ids are also not lower-cased before HKDF and AAD, so the same firm in two cases cannot open its own values.
Fix: use the uuid rule in `SecretOwner.firmId` and lower-case it.

**m5 (Minor, brief): the PR body lacks the list of other `process.env` reads.** The brief says to "list any others for a later row". The PR body does not yet name the two `DATABASE_URL` reads outside `api/src/platform`: `api/src/core.ts:17` and `api/src/front-office/booking-seed.ts:66`.
Also for that later row (PF-23):
* The loader leaves secrets in `process.env`, so every child process inherits them (e.g. `sources.ts:524` spreads `process.env` into the AI launcher).
* When PF-4 lands, its `PLATFORM_LOCAL_SECRET`, `PLATFORM_IDENTITY` and `PLATFORM_POOL_MFA_REQUIRED` reads should join `SETTINGS`. `PLATFORM_LOCAL_SECRET` should also join `SECRET_SETTING_NAMES`.

## Touch list
Every file is on the brief's list. `ports/secret-box.ts` is named in the brief's "What to build". The one-line change in `api/src/platform/seed-sample-firms.ts:105-106` is the brief's "existing `process.env` reads inside `api/src/platform` move to the loader": the import is dynamic and inside the CLI block only, so `booking-seed.ts` and the tests that import the module are unaffected.
`ports/secret-box.ts` imports only zod. Its fake uses the Node global `Buffer`, which is fine for the api and tests; web never imports this port.

## To fix before Approve
1. M1: type `without` in `check_pf24_secrets.ts:55`, then confirm `typecheck.mjs` is clean.
2. M2: replace the `ALTER ROLE` alternative in `RUNBOOK-secrets.md:41` with two-role (alternating-user) rotation.

m1 to m5 are recommended. They can be fixed in this PR or listed for FO-3v and PF-23.

Re-review reads only the diff (P-277).

Verdict: Changes needed
