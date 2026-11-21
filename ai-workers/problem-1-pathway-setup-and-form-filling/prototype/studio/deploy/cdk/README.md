# The Canadian estate as code (PF-8a, PF-8rc, PF-8b; synth only)

AWS CDK v2 in TypeScript (tech gate entry 8, `design/tech-gate-platform-front-office-2026-11-14.md`). It has its own package and lockfile, outside the app: the studio's `package.json` is untouched. **Nothing here is deployed.** There is no AWS account yet (P-551). Synth and the tests need no account, key or network.

| Stack | Region | Database | Files |
|---|---|---|---|
| `xr-staging` | ca-central-1 (pinned in code) | RDS PostgreSQL 18.3, single zone | `documents`, `exports`, `imports` |
| `xr-production` | ca-central-1 (pinned in code) | RDS PostgreSQL 18.3, Multi-AZ | the same |
| `xr-staging-copy`, `xr-production-copy` | ca-west-1 (pinned in code) | none: only the backup copy vault and its KMS key (PF-8rc) | none |

**Both stacks:**
* **Network:** a VPC over two zones. Public subnets hold only the load balancer, which comes with PF-8b. App subnets have egress through NAT. Data subnets are isolated, with no internet route.
* **Database:** encrypted with the environment's own KMS key (rotation on), deletion-protected, automated backups kept **35 days** with point-in-time restore, `rds.force_ssl=1`, `log_error_verbosity=terse`. Its admin password is generated into Secrets Manager and is never in code or in the environment.
* **Buckets:** all public access blocked, versioned, KMS-encrypted, and a policy that refuses plain HTTP. Old versions expire after 35 days.
* **Backups (PF-8rc, `lib/backup.ts`):** an AWS Backup plan takes the database and the three buckets every day at 07:00 UTC (Sample time) into the home vault and keeps them 35 days. Each backup is copied to the stage's vault in ca-west-1 and kept 35 days there. Each vault has its own KMS key and a vault lock in **governance mode** with a 35-day minimum. Each vault's access policy denies, to every principal, removing the lock, deleting a recovery point, shortening its lifecycle and deleting the vault. Changing the lock is not denied there (a first deploy might set the policy before the lock), but no role in the code may do it. Limit: in governance mode an account administrator, the root user or a deploy can replace the policy and then lift the lock. Each vault key's policy denies its deletion and disabling. The home stack is deployed after its copy stack, and names the copy vault by its fixed name, so there is no cross-region reference.
* **Sizes:** instance sizes and storage are **Sample**, because no load has been measured.

## Run (in this folder)
```bash
npm ci --ignore-scripts
npm test                                                    # assertion tests: each check passes on the real stacks and fails on a broken one
npm run synth                                               # the app alone writes cdk.out/ (ignored); no CLI, so no STS lookup
```
Never run `npx cdk synth`: the CLI looks up the account through STS when it finds AWS credentials. Telemetry is off in three places: `CDK_DISABLE_CLI_TELEMETRY=true` for the CLI (if a deploy row ever uses it), and `versionReporting: false` plus `analyticsReporting: false` for template metadata.

## The checks (`lib/checks.ts`, `test/estate.test.ts`)
* **Region guard:** it is fed every stack of the app, nested ones included (`allStacks`). Every stack must be in ca-central-1, and nothing in a template (resources, parameters, outputs) may name another region. An S3 replication rule must target a bucket inside the scanned stacks, because a bucket ARN carries no region, and multi-region resource types are refused. The only exception is `REGION_ALLOW` (PF-8rc): the backup plan may name ca-west-1, and a ca-west-1 stack may hold only a KMS key, its alias and a backup vault.
* **Database subnets:** no route leaves them and they hand out no public addresses (`dataRouteFindings`).
* **Database:** private, encrypted, deletion-protected, 35-day backups, TLS forced, terse logs. It sits in isolated subnets only.
* **Buckets:** public access blocked, versioned, KMS-encrypted, plain HTTP refused.
* **Backups (PF-8rc, `test/backup.test.ts`):** the plan is daily, covers the database and every bucket, keeps 35 days and copies only to ca-west-1, into a vault one of the scanned stacks defines, kept 35 days (`backupFindings`). Every vault has its own key, a 35-day governance lock and the deny policy, and its key cannot be deleted (`vaultFindings`). Permissions are checked against **allow lists**, not a list of forbidden actions (`bypassFindings`, `resourcePolicyFindings`, `typeFindings`):
  * a role, user, group or policy may allow only the actions in `ROLE_ACTIONS` (today `kms:Decrypt`);
  * a role may be assumed only by a service in `TRUSTED_SERVICES` (today AWS Backup);
  * only AWS Backup's own managed policies may be attached, written plainly;
  * key and vault policies may allow only this account's root;
  * every resource type must be in `ESTATE_TYPES`;
  * an allowed action must name a resource this stack defines, and a policy attaches only to this stack's roles;
  * bucket policies may only deny;
  * a policy built from template functions (`Fn::If` around a value, a statement or the whole document, `Fn::Split`, a JSON string, `NotAction`) cannot be read, and is refused;
  * a resource may not refer to a template parameter, because a deploy can override its value.

  **Not checked** (known limits, PR review covers them): properties that send data or notices to another account, such as bucket inventory, vault notifications or a database's associated roles.

  Widening any list takes a reviewed PR. The copy target must be exactly this account's copy vault. Values whose region cannot be read from the template (Fn::Sub with variables, imports, SSM references) are refused, and a multi-region or replica key is refused.
* **Unconfirmed** (the AWS documentation site is unreachable from the build lane): the contents of AWS Backup's managed policies; that a vault access policy can deny each listed action, binds the root user, and leaves AWS Backup's own 35-day expiry working; and the S3 policy's path. The cloud drill proves these.
* **Availability:** production is Multi-AZ; staging is single-zone (cost, P-562).
* **CI job:** `.github/workflows/deploy-synth.yml` runs on pull requests that change this folder, and never in a merge-queue batch. It is report-only until measured green (P-717 (b), P-772 (a)).

## Logs and alarms (PF-23c, `lib/observability.ts`, `test/observability.test.ts`)
* **Log group:** `/xr/<stage>/app` in each stack (so in ca-central-1), kept **90 days** (NFR5-14), retained if the stack goes. PF-8b's task definition sends the service's output here (`stack.observability.appLogs`).
* **Metric filters, not embedded metric format:** CloudWatch reads PF-23's EMF lines only through an EMF-aware shipper; the plain `awslogs` driver is not one. A metric filter reads the same JSON line whatever ships it. The filters read PF-23's field names; a test fails if `metrics.ts`, `log.ts` or the alert port renames them.
* **Alarms (each says its rule and where to look):**
  * **5xx rate:** pages when 5xx errors exceed 1.44 % of requests for 10 minutes, with at least 20 requests. 1.44 % is NFR5-15's SLO "5xx<0.1%" times a fast-burn factor of 14.4, and that factor is Sample. A slow burn, just over 0.1 % for days, does not page: that is a gap for the founder.
  * **Job failures:** 3 failures in 15 minutes.
  * **Job age:** a job older than the app's `STUCK_JOB_MS`.
  * **Mail bounce rate:** over 5 % in an hour, with at least 20 sent.
  * **Alert lines:** the first alert line of each kind pages: audit-write failure, chain break, stuck job, privacy clock, breach clock.

  All levels except the 5xx SLO are Sample. No data counts as no incident.
* **Routing:** every alarm goes to the SNS topic `xr-<stage>-on-call`. Its one subscription is the email in the deploy parameter `OnCallEmail`. That parameter has no default: the founder names the address, and a deploy without it fails.
  * The rate and job alarms also send their recovery ("OK").
  * Alert-line alarms send none, because their metric stops a minute later while the incident is still open.
  * After the first deploy, the on-call person must click AWS's confirmation link before any email arrives.
* **The log group is retained and has a fixed name:** deleting the stack keeps the logs, and re-creating the stack needs that group imported or removed first.
* **Held:**
  * **A test alarm reaching the on-call person.** This is the AWS proof (P-782) and needs the founder's account.
  * **An alarm when the audit chain checker goes quiet.** AUD-1c's row expects one on the absence of `audit.chain_verify_ok`. AUD-1c's checker PR adds it here, with `alarmFindings`, once the metric exists. The chain-break alert alarm is already here.
  * **The bounce alarm stays silent** until PF-4b's mail adapter calls `mailLine`: it has no caller on main.

## The service (PF-8b, `lib/service.ts`, checks `lib/service-checks.ts`, tests `test/service.test.ts`)
* **Image:** an ECR repository per stage (immutable tags, scan on push, the stage's KMS key). The service runs PF-7's image **by digest only**: the template parameter `ImageDigest` (`sha256:` + 64 hex) that PF-8c's deploy fills.
* **Service:** ECS Fargate, **2 tasks** (Sample size 1 vCPU, 2 GB) in the app subnets of two zones, no public address, the deployment circuit breaker with rollback (PF-8c proves it). Health check `/api/health/live`.
* **Load balancer:** internet-facing, public subnets, **HTTPS only** with `ELBSecurityPolicy-TLS13-1-2-2021-06` (TLS 1.2 and 1.3). Port 80 answers with a 301 redirect to HTTPS and nothing else. The tasks accept traffic only from the load balancer.
* **Settings:** `PLATFORM_ENVIRONMENT` is set explicitly: `production` in production, `test` in staging, so staging refuses a live Stripe key (Lead 13 ruling 3). `PLATFORM_IDENTITY=cognito`; `PLATFORM_SAMPLE_SEED` is never set. The Cognito pool and client ids and `PLATFORM_SES_REGION` are plain settings. Every other value PF-24's loader requires is a Secrets Manager secret `xr/<stage>/<NAME>`, created with a random placeholder that the app refuses, and **supplied at deploy** (SA-8-1, `../RUNBOOK-secrets.md`). The test reads the loader's own list (`api/src/platform/config/settings.ts`), so a new required or secret setting fails here until the task supplies it (on the next change to this folder: the CI job does not watch `settings.ts`; proposed to the tech lead in #2748).
* **Who reads a secret:** only each task definition's execution role, and only the secrets its own task uses. The task role reads none (it may only send mail through SES).
* **Two database roles (PF-12, as the team's code has it):** the one-off migration task (`prisma migrate deploy`) holds `xr/<stage>/DATABASE_OWNER_URL`, the table owner's address, as `DATABASE_URL`. The service runs every request as the app role `xr_app` (owns no table) from `xr/<stage>/APP_DATABASE_URL`. Its `DATABASE_URL` is the owner's address too, because the job runner (pg-boss, `platform-jobs.ts`) connects with it and creates its own schema; a jobs role of its own is a question for the tech lead (`product/screens/PF-8b/challenge.md`).
* **Firm addresses (PF-25, P-607 (2)):** a hosted zone per stage (production `expatready.com`, staging `staging.expatready.com`; the context key `xr:domain` changes the base: `buildApp({ context: { "xr:domain": … } })`, or `-c` for PF-8c's deploy), `*.<domain>` pointing at the load balancer, and a DNS-validated wildcard certificate `*.<domain>` on the HTTPS listener. The output `NameServers` lists the NS records to add at the parent: at the registrar for production, in the production zone for staging. The service's task sets `PLATFORM_ADDRESS_SUFFIX` to the same domain (PF-8b F2b, `addressSuffixFindings`), so the app reads `<firm>.<domain>` as firm `<firm>`: a new staging domain needs only `-c xr:domain=<it>` (the zone, certificate and app setting all follow), plus the NS records at that domain's registrar.
* **Mail (PF-19b):** an SES identity for the stage's domain with DKIM (three CNAMEs published), MAIL FROM `mail.<domain>` with its SPF record (the apex SPF is left alone), and DMARC `p=none; adkim=s; aspf=r` (Sample: monitor first).
* **Sign-in (PF-4b, PF-4s, PF-4p):** three separate Cognito pools (`staff`, `own-staff`, `clients`), each with its own app client. Both staff pools require two-step sign-in (P-567). The clients' pool has it optional (not known: PF-4p decides). No self sign-up; deletion protection on. The password policy is Sample.
* **Checked beyond the row (break and review rounds):** nothing public but the load balancer on 80 and 443; no principal but an execution role reads a secret, in any grant form (inline, managed, resource policy, glob); the stack key decrypts for no one outside a service; no dynamic reference, literal secret value or environment file; pools are admin-create only, without OAuth, and the service signs staff in against the staff pool.
* **PF-8rc's guards, widened for PF-8b only (`lib/checks.ts`):** an ECS execution role may allow only `ECS_EXEC_ACTIONS` (image pull, its secrets) and a task role only `ECS_TASK_ACTIONS` (SES send); a Backup role keeps `kms:Decrypt`; every role a resource names is one this stack defines; no repository policy or Cognito trigger; `"*"` only for `ecr:GetAuthorizationToken`; a secret's `Ref` or an ARN joined from this stack's resources counts as its own resource; the one parameter allowed is a sha256-only digest; the key may let an ECS execution role decrypt through Secrets Manager only; PF-8b's resource types join `ESTATE_TYPES`.
* **Not here:** log groups and alarms (PF-23c), the deploy and smoke test (PF-8c), the task role's Cognito admin and bucket permissions (the adapter rows that use them).

### No-domain mode (PF-8b F3: staging while its domain is blocked)
For the R1.13 and R1.15 proofs while no staging domain can be registered. R1.24 (firm addresses) waits for the real domain. With a domain set (or no context at all), nothing changes: all four templates hashed identical to before this row (checked by hand), and a test holds that a domain stack has no imported certificate, a CDK-named load balancer and the same two parameters.
* **What `-c xr:domain=none` builds (staging only):**
  * **Left out:** no hosted zone, DNS record, DNS-validated certificate, SES identity or SES grant, so no mail is sent.
  * **HTTPS:** the HTTPS listener serves a **self-signed** certificate imported into ACM. Its ARN is given as `-c xr:certArn=<arn>`: context, not a template parameter (the region guard admits only the image digest and the on-call address).
  * **App host:** the app's `PLATFORM_ADDRESS_SUFFIX` is the load balancer's AWS name. Its fixed lower-case name is `xr-staging-app`, so the AWS name is lower case, as the loader requires.
  * **Output:** `LoadBalancerHost`.
  * **Production keeps its domain:** `none` never applies to it, and the service refuses it for production.
* **Task count (staging):** `-c xr:serviceTasks=0|2`, default 2; production always runs 2. Use 0 for the first deploy, before the secrets hold values: tasks started on the placeholder secrets crash, trip the circuit breaker, and the rollback leaves retained names. Fill the secrets, then redeploy with 2.
* **Order (the AWS session, in the founder's account):**
  1. `bash bin/self-signed-cert.sh` (openssl plus the AWS CLI; `--dry-run` imports nothing) prints the ARN. The key is made in a temporary folder that is then deleted, so it lives only in ACM.
  2. `cdk deploy xr-staging -c xr:domain=none -c xr:certArn=<arn> -c xr:serviceTasks=0`.
  3. Supply the secrets (`../RUNBOOK-secrets.md`).
  4. The same deploy with `-c xr:serviceTasks=2`.
  5. `curl -k https://<LoadBalancerHost>/api/health/live`.
* **Checks:** `noDomainFindings`; every estate guard runs on the no-domain app too (`test/service.test.ts`, "PF-8b F3").

## Feature flags (not set yet)
`cdk.json` sets four flags only. Two findings for the later row PF-8c-flags (Lead 13): synth reports the others as unset, and `npm run synth` and the tests build the App without reading `cdk.json`, so its flags reach only the CLI. Turning on the recommended set changes PF-8rc's template (the copy target's ARN form; a Lambda for the default security group), so that row reconciles PF-8rc's guards too.

## Next rows
* **PF-8c:** deploy from CI.
* **PF-8rc, held part:** the cloud drill (a restore to 15 minutes ago, recovery within 4 hours, evidence in `deploy/evidence/`), and the quarterly reminder. Both wait for the account (P-551).
