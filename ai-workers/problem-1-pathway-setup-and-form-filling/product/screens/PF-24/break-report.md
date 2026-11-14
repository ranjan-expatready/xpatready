# PF-24 break report: secrets loader and SecretBoxPort

PR #1756, branch `claude/upbeat-keller-m4ibqu` at 0b46983f8. Focus: permissions and security (secrets). No screen in this row.
Scope: the row's "what gets built" text (`product/qa/built/PF-24.md`): the loader, `Secret`, SecretBoxPort/AES-GCM, the re-encrypt job and the runbook.
Method: throwaway tsx scripts in `/tmp/claude-0/pf24-break/` (t1 loader, t2 crypto, t3 re-encrypt, t4 env), keys made with node:crypto/openssl only.
One isolated copy (`runtime_pf24bk` :18525, production with one setting blank), stopped afterwards. :4400 was never touched. No fixes made.
Paths below are under `prototype/studio/`.

## Breaks

**M1 (Major): every secret stays in `process.env` and goes to every child process.**
Input: the production settings plus `PLATFORM_SECRET_BOX_KEYS=1:<generated>`; run `platformConfig()`; then `execFileSync("python3", ["-I", ...])`.
Observed: after the load, `process.env.PLATFORM_SECRET_BOX_KEYS` still holds the key. The `python -I` child printed the key's first bytes and the `sk_test_…` key.
The app's children inherit the whole environment:
* `api/src/intake.ts:319` and `api/src/finder.ts:687` run `read_form_identity.py` on uploaded or fetched PDFs, with no `env` option, so they get the full environment.
* `api/src/fill-case.ts:518` does the same.
* `api/src/sources.ts:524` spawns the AI launcher with `env: { ...process.env }`. `p2/launch.ts:101` then scrubs the environment for the drafting process only.
So a parser exploit in a hostile PDF can read the database password, the Stripe/BoldSign/Zoom keys and the secret-box master keys.
Expected (the row's claim, `config/secret.ts:1-3`): "Only `reveal()` gives the value". Either remove the settings from `process.env` after `loadPlatformConfig` (`api/src/platform/config/settings.ts:78-83`), or give child processes an allow-listed environment.
Also: `api/src/core.ts:17` still reads `process.env.DATABASE_URL` directly, without the trim. The loader checks `DATABASE_URL.trim()` while Prisma connects with the untrimmed string, so "the one loader" checks a different value from the one in use.

**m1 (Minor): the refusal echoes a value.**
Input: `PLATFORM_ENVIRONMENT=sk_live_ABCDEFGHIJKLMNOPQRS`.
Observed message: `The app cannot start (PLATFORM_ENVIRONMENT=sk_live_ABCDEFGHIJKL)`, i.e. the first 20 characters of the input. The cause is `settings.ts:73` (`rawEnv.slice(0, 20)…`).
Expected: "a refusal names the setting … never its value". A secret pasted into the wrong variable is half printed in the task log.

**m2 (Minor): the same key can be listed under two versions.**
Input: `2:<k>,1:<k'>`, where `k'` is `k` with the last base64 character changed in its 2 unused low bits (decodes to the same 32 bytes).
Observed: the config loads with ring {2,1}. The check at `settings.ts:102` compares strings, not decoded bytes. An all-zero key (`AAAA…A=`) also loads (`settings.ts:20`).
Expected: "each version with its own key" is refused. Effect: a rotation that changes nothing, which the runbook would report as done.

**m3 (Minor): a changed sealed string still opens.**
Inputs:
* add one character to the iv part (17 base64url characters still decode to 12 bytes);
* flip an unused bit in the tag's last character.
Observed: both open to the original plaintext. Cause: lenient base64url decoding with only length checks (`api/src/platform/secret-box/aes-gcm.ts:51-54`).
Confidentiality and integrity of the plaintext held. But the port's promise "a tampered value … is refused" (`ports/secret-box.ts:11`) is not literally true, and one value has many stored spellings.
Expected: refuse any part whose decoded bytes do not re-encode to the same text.

**m4 (Minor): a long `firmId` throws `RangeError`, not `SecretRefused`.**
Input: `seal` or `open` with `firmId` of 5000 characters. Observed: `RangeError ERR_OUT_OF_RANGE` from `hkdfSync`, whose info is at most 1024 bytes (`aes-gcm.ts:29`); `SecretOwner.firmId` has no maximum (`ports/secret-box.ts:18`).
The message holds no value. But a caller catching `SecretRefused` gets an unhandled error, and `runReencrypt` rethrows non-`SecretRefused` errors (`reencrypt.ts`), which would abort a firm's job part-way. Not reachable from the job today, because its payload requires a uuid.
Related: `seal` accepts a lone surrogate (`"ab\ud800cd"`) and returns `"ab�cd"` on open, silently changing the credential (`aes-gcm.ts:45`).

**m5 (Minor): a value changed during the job is left on the old key with no way to re-run.**
Input: between `page` and `swap`, the firm writes a new value still sealed with v1 (for example a task on the old deployment).
Observed result: `{moved:1, changedMeanwhile:1, refused:[]}`. The job finishes as success, and `versionCounts` shows `v1:1`.
The job key `…:<firm>:v2` is now used for good: PF-0p's JobPort says "a key never queues twice, even after its job ran", so `enqueueReencrypt` again queues nothing.
The runbook (`deploy/RUNBOOK-secrets.md:53-54`) gives no step for this. The comment at `reencrypt.ts:5-6` says "left for the next run", but no next run can happen. Step 4's `versionCounts` check prevents data loss, but the rotation is stuck unless someone calls `runReencrypt` by hand.
The same applies after step 4's "investigate those rows": a fixed row cannot be re-run either.

**m6 (Minor): the key ring can be changed after the freeze.**
`Object.freeze` at `settings.ts:105` is shallow: `config.secretBox.keys.set(9, …)` succeeded (ring size 3).
Any code in the process can add or remove a key before `PlatformConfigService.secretBox()` first builds the box (built lazily, `config/service.ts:18`).

**m7 (Minor, design note): a missing `PLATFORM_ENVIRONMENT` falls back to local.**
Unset or blank `PLATFORM_ENVIRONMENT` means `local` (`settings.ts:72`). A task definition that leaves it out starts with every setting optional, and Stripe/Zoom/secret-box are switched off without any message. The runbook relies on the cloud always setting it. Nothing guards this (for example by refusing `local` when `DATABASE_URL` is not the demo address).

**m8 (Minor): `pageSize: 0` crashes the job.**
`runReencrypt` and `versionCounts` with `pageSize: 0` throw `TypeError: Cannot read properties of undefined (reading 'id')` (`reencrypt.ts:56,72,88`). This is an internal parameter only.

## Held
* **Printing a `Secret`.** No seeded value appeared in any of: `util.inspect` (showHidden; `customInspect:false`), `JSON.stringify`, `format("%o %O %s %j")`, spread, `Object.entries`, `getOwnPropertyDescriptors`, `structuredClone` (config and Map), template strings, `String()`, `[...keys]` of the Map, or `Error` `cause`. The value lives in a module WeakMap.
* **Settings that are missing or blank.** In production, each of the 12 settings set to `""`, spaces, NBSP, BOM or tab/newline, or left unset, is refused, each by name.
* **Server start.** The isolated copy in production with `PLATFORM_ZOOM_CLIENT_SECRET="   "` never listened (`/api/health` gave 000), and its log names only `PLATFORM_ZOOM_CLIENT_SECRET`. No generated value appeared in the log.
* **Invalid key-ring entries are refused.** Refused: a trailing comma; a duplicate version; one key text under two versions; version 0; a leading zero (`02`, including in `KEY_VERSION`); a version above 999999; keys of 16 or 48 bytes; a space inside an entry; full-width or Arabic-Indic digits; a version not in the ring; half a ring (keys only, or version only), even locally.
* **Other loader checks.** A `DATABASE_URL` containing a newline is refused. A Stripe live key is refused in test and local, including with leading spaces.
* **Refusal messages.** Neither `ConfigRefused` nor `SecretRefused` echoes a secret, a key or a ciphertext. `maskedView` with a plaintext hint fails, and its ZodError does not echo the input.
* **Owner binding.** These were all refused: firm A's value opened as firm B, as a person, as another purpose, with the firm id in upper case, or with a trailing space. `personId` null and absent count as the same owner, which is intended.
* **Version labels.** Changing the label from v1 to v2 is refused, even when v1 and v2 hold the same key bytes (the AAD holds the version). Changing it to v3 gives `KEY_RETIRED`.
* **Tampering.** Refused: a truncated tag (12 bytes, 4 bytes, empty), so GCM short tags are not accepted (`authTagLength` 16 and a length check); a flipped bit in the iv, tag or ciphertext; a truncated ciphertext; the iv, tag or ciphertext swapped in from another sealed value; the `fake1` scheme; 6 parts; a non-string.
* **Retired keys and reseal.** A retired key gives `KEY_RETIRED`. `reseal` of a tampered value is refused before any re-seal.
* **Job payload.** `ReencryptPayload` refuses `toVersion` NaN, Infinity, -1, 0, 1.5, 1e20, `"2"` and 2^53+2, and refuses extra keys.
* **Job isolation.** These were refused or skipped, never moved: a job whose firm is not its payload's firm, or that has no firm; a row holding firm B's value under firm A's owner (TAMPERED, skipped); a store whose page returns another firm's rows (`OTHER_FIRM_IN_PAGE`).
* **Compare-and-set.** A concurrent write was never overwritten. Job errors name store, id and code only.

## Re-check at 4f24a8473

I read only `git diff c52912741 4f24a8473` (studio code) and re-ran my scripts in `/tmp/claude-0/pf24-break/` (t5 loader and box, t6 environment, t7 re-encrypt) with generated keys. I needed no isolated copy and did not test any new area.

**M1: partly fixed; the threat in M1 is still open (Major).**
Input: start the process with `PLATFORM_SECRET_BOX_KEYS=1:<openssl rand>` and `PLATFORM_STRIPE_SECRET_KEY=sk_test_GEN…` in its starting environment (as ECS injects them). Call `platformConfig()`, then start `python3 -I`.
Fixed: `process.env` no longer holds them, and the child's `os.environ` has neither (`settings.ts:148-152`). `DATABASE_URL` stays, which is deliberate and documented.
Not fixed: the child reads `/proc/<ppid>/environ`, the app's starting environment block. `delete process.env.X` does not erase that block. The child found the key ring and the Stripe key there. Under `tsx` (how `start.sh` and `isolated.sh` start the app) the grandparent `tsx` CLI process holds them as well. `/proc/self/environ` of the app also still holds them.
M1's threat was a parser exploit in a child working on a hostile PDF, and that exploit still gets every secret by reading the parent's environment block. The fix stops accidental inheritance only.
Ways out, for the team to choose: run the children as another user or with an empty environment that cannot read the parent's `/proc`; make the app non-dumpable; or read the secrets from Secrets Manager at start instead of from the environment.

**m1: fixed.** `PLATFORM_ENVIRONMENT=sk_live_ABCDEFGHIJKLMNOPQRS` is refused as "PLATFORM_ENVIRONMENT=not recognised", without echoing the input.

**m2: fixed.**
* Refused: a non-canonical alias of a key (under two versions, or alone); an all-zero key.
* Accepted: two distinct random keys.
* (A 32-byte key made by repeating ASCII text still passes the more-than-8-distinct-bytes test. Not a finding: the check is a guard against slips, not an entropy test.)

**m3: fixed.** One extra character on the iv, or a non-canonical last character on the tag or the ciphertext, now gives `NOT_SEALED`. The untouched value opens.

**m4: fixed.**
* A `firmId` of 5000 characters (seal and open), and a `personId` of 101 or 5000 characters, give `SecretRefused` instead of `RangeError`.
* A lone high surrogate, a lone low surrogate or a trailing high surrogate is refused. A valid emoji pair round-trips.
* An upper-case firm id now opens a value sealed with the lower-case id (intended: one firm, one key). Another firm is still refused.

**m5: fixed.** A store that rewrites `a2` with a v1 value inside each `page` call gave these results:

| Rewrites | Passes | Result |
|---|---|---|
| 1 | 2 | all v2 |
| 2 | 3 | all v2 |
| 3 or 99 | 3 | `changedMeanwhile 1`, counts `v1:1` |

* When `changedMeanwhile` is 1, the job fails with "…still on an old version: enqueue round 2". Enqueuing round 1 twice queues one job.
* `enqueueReencrypt(…, {round: 2})` queues `…:v2:r2` with payload `round:2`. That job failed again (the writer was still racing) naming "round 3".
* Round 1 keeps the old key form.
* New Minor: `round` values 0, -1 and NaN are not refused. They fall back to the round-1 key, which is already used, so nothing is queued, yet `enqueueReencrypt` still returns the firm list (`reencrypt.ts`, `round > 1 ?` in both the payload and the key). The engineer could believe round 2 was queued after a typo.
* `round` values 1.5, 101 and Infinity are refused by zod.

**m6: partly fixed (Minor).**
* `keys.set` and `keys.delete` now throw "The secret-box key ring is fixed at start-up."
* `Map.prototype.set.call(ring.keys, 9, …)` and `Map.prototype.delete.call(ring.keys, 1)` still change the ring: size went 1 to 2 to 1. `frozenMap` (`settings.ts:71-74`) only shadows the methods; the internal map is untouched.
* Only code inside the process can do this, so it stays Minor.

**m7: fixed.**
* Refused with "Missing required setting: PLATFORM_ENVIRONMENT": `ECS_CONTAINER_METADATA_URI_V4` set with `PLATFORM_ENVIRONMENT` unset, and `AWS_EXECUTION_ENV` set with it blank.
* `local` set explicitly on ECS still loads, as does an unset value with no AWS marker. That matches the stated rule.

**m8: fixed.** `pageSize` values 0, -1, 1.5, NaN, Infinity and 10001 give `RangeError` "a whole number from 1 to 10000" in both `runReencrypt` and `versionCounts`. 1 and 10000 run.

**New Blocker or Major while re-checking:** none, apart from the residual M1 above.
