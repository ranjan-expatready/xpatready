# Runbook: secrets — supplying them at deploy and rotating them without downtime

PF-24 · SA-8-1, SA-8-3, SA-8-4, BR-4, SA8-D1 (SA-08 §3.1) · code: `api/src/platform/config/settings.ts`, `api/src/platform/secret-box/` · test: `tests/check_pf24_secrets.ts`

For the engineer only. Nobody enters, views or changes a key in the console (SA8-D1). No real value is ever written into git, a ticket, a chat, a log or this file: every value below is a placeholder.

## 1. What the app reads, and where it comes from

The app reads every setting once, at start, from its environment. In the cloud, the ECS task definition (PF-8) injects each one from **AWS Secrets Manager** (ca-central-1) with a `secrets` entry (`valueFrom` = the secret's ARN), never as a plain `environment` value and never in the image (the Dockerfile and `docker history` hold none, PF-7).

| Setting | Secret? | What it is |
|---|---|---|
| `PLATFORM_ENVIRONMENT` | no | `test` or `production` in the cloud (`local` on the Mac and in lane copies, the default) |
| `DATABASE_URL` | yes | the PostgreSQL address with its password |
| `PLATFORM_COGNITO_USER_POOL_ID`, `PLATFORM_COGNITO_CLIENT_ID` | no | the staff user pool and its app client (PF-4) |
| `PLATFORM_STRIPE_SECRET_KEY` | yes | `sk_…`/`rk_…`; a live key is refused unless `PLATFORM_ENVIRONMENT=production` |
| `PLATFORM_STRIPE_WEBHOOK_SECRET` | yes | `whsec_…` |
| `PLATFORM_SES_REGION` | no | SES signs with the task's IAM role: there is no SES key |
| `PLATFORM_BOLDSIGN_API_KEY` | yes | the e-signature provider's key |
| `PLATFORM_ZOOM_CLIENT_ID` | no | the Zoom app |
| `PLATFORM_ZOOM_CLIENT_SECRET`, `PLATFORM_ZOOM_WEBHOOK_SECRET_TOKEN` | yes | the Zoom app's secret and webhook token |
| `PLATFORM_SECRET_BOX_KEYS` | yes | the key ring for firms' own connection credentials: `version:key` pairs, comma-separated, each key 32 random bytes in base64 |
| `PLATFORM_SECRET_BOX_KEY_VERSION` | no | the version new values are sealed with; must be in the ring |

With `PLATFORM_ENVIRONMENT` `test` or `production`, **every** setting is required: one missing or malformed and the app does not start. The task's log then says, for example, `The app cannot start (PLATFORM_ENVIRONMENT=production). Missing required setting: PLATFORM_ZOOM_CLIENT_SECRET.` It names settings, never values. The fix is always in Secrets Manager or the task definition, never in code.

Secret values never reach a screen, a response, a log line or an audit record (SA-8-3): the app holds each as a `Secret` that prints as `[secret NAME]`; only the adapter that calls the provider reads the value. PF-23's log redaction drops these names (`SECRET_SETTING_NAMES`).

## 2. Making a secret-box key

A key is 32 random bytes in base64, made on the engineer's machine and pasted straight into Secrets Manager:

```bash
openssl rand -base64 32
```

The ring's value is `<version>:<key>`, newest first by convention, e.g. `2:<new key>,1:<old key>`. Versions are whole numbers that only go up; a version number is never reused for another key.

## 3. Rotating a provider key (Stripe, BoldSign, Zoom, database password) without downtime (SA-8-4, BR-4)

1. Create the new key at the provider while the old one still works (Stripe: roll the key with an expiry on the old one; Stripe webhooks: add the new endpoint secret, the old stays valid for the overlap; Zoom and BoldSign: add a second credential; database: create the new password on a second role or `ALTER ROLE … PASSWORD` only after step 3).
2. Put the new value in its Secrets Manager secret (a new version of the same secret; the task definition points at the secret, so it does not change).
3. Start a new deployment (ECS rolling update, minimum healthy 100%): new tasks start with the new value and pass `/api/health` before the old tasks stop. A task that fails to start leaves the old ones serving; the deployment's log names the bad setting.
4. When every task runs the new deployment, revoke the old key at the provider.
5. Record the rotation (date, which setting, who) in the engineering log. Never the value.

## 4. Rotating the secret-box key (firms' own credentials: Zoom tokens, calendar tokens, mailbox passwords)

Each stored credential names the key version that sealed it (`sb1.v<version>.…`), so old and new keys can be held side by side while values move.

1. **Add** the new key to the ring, keep the current version: `PLATFORM_SECRET_BOX_KEYS=2:<new>,1:<old>`, `PLATFORM_SECRET_BOX_KEY_VERSION=1`. Deploy (§3 step 3). Every task can now read both; nothing changes yet. (This step matters: if one task sealed with version 2 while another still lacked key 2, that task could not read the value.)
2. **Switch**: `PLATFORM_SECRET_BOX_KEY_VERSION=2`. Deploy. New values are sealed with version 2; old ones still open with key 1.
3. **Re-encrypt**: enqueue the re-encrypt job (`enqueueReencrypt` in `api/src/platform/secret-box/reencrypt.ts`; one job per firm on JobPort, keyed by firm and version, so enqueuing twice queues nothing new). Each job re-seals that firm's values on the old version, compare-and-set, so a credential the firm changes meanwhile is never overwritten.
4. **Check**: every re-encrypt job has finished without failure, and `versionCounts` reports no value on version 1 in any store. A job that met a value it could not open (tampered, or sealed for another owner) fails and lists the store, row id and reason: investigate those rows before going on (the firm reconnects that service; the row is never silently dropped).
5. **Retire**: remove the old key: `PLATFORM_SECRET_BOX_KEYS=2:<new>`. Deploy. From now on the old key reads nothing; a value still on version 1 would be refused (`KEY_RETIRED`), which step 4 rules out.
6. Destroy the old key's Secrets Manager version once the retention you keep for rollbacks has passed. Record the rotation.

**Rollback:** before step 5, set `PLATFORM_SECRET_BOX_KEY_VERSION` back to the old version and deploy; values already moved stay readable while both keys are in the ring.

**Not yet:** per-firm and per-person KMS keys (NFR5-05) come with X-27, before any Restricted field is stored. Until then this versioned key ring covers connection credentials only.

## 5. If a secret leaks

Rotate it at once by §3 (provider key) or §4 (secret-box key), revoking the old value at step 4 or 5 without waiting for the usual overlap; open a security incident (PF-21c's breach register once built). Check the logs for the value only on the engineer's machine, never by pasting it into a shared tool.

## 6. On the Mac and in lane copies

`PLATFORM_ENVIRONMENT` is unset (local): every setting is optional, and a service whose setting is unset is simply off on that server. A local secret-box key, if a row needs one, is made by §2 and set in the shell that starts the copy; it never goes into a file in the repository. Tests generate their own keys each run (`tests/check_pf24_secrets.ts`).
