// PF-8b (map row 1; the cloud halves of rows 15 and 24): the app service on Fargate with its secrets, mail and firm
// addresses, added to each environment's stack. Synth only: nothing is deployed, no AWS account (P-551). What each part
// does and why (ECR by digest, 2 tasks over two zones, HTTPS-only ALB, secrets supplied at deploy, the migration task,
// SES, the wildcard zone and certificate, three Cognito pools): ../README.md "The service". Log groups and alarms are
// PF-23c's; deploy, rollback and smoke test PF-8c's. Sizes, timings, DMARC and password policy are Sample.
import { CfnOutput, CfnParameter, Duration, Fn, RemovalPolicy, Stack, aws_certificatemanager as acm, aws_cognito as cognito, aws_ec2 as ec2, aws_ecr as ecr, aws_ecs as ecs, aws_elasticloadbalancingv2 as elbv2, aws_kms as kms, aws_logs as logs, aws_rds as rds, aws_route53 as route53, aws_route53_targets as targets, aws_secretsmanager as sm, aws_ses as ses } from "aws-cdk-lib";
import { Construct } from "constructs";

export type Stage = "staging" | "production";
/** P-607 (2): firms at `<firm>.expatready.com` on Route 53 in the founder's account, with a `staging.` sub-zone. */
export const DEFAULT_DOMAIN = "expatready.com";
export const CONTAINER_PORT = 8080; // deploy/container-entry.mjs (PF-7)
export const MIN_TASKS = 2;
/** PF-8b F3: `-c xr:domain=none` builds staging with no domain (the staging domain is blocked, Lead 15, 21 Nov): no hosted
 *  zone, no DNS-validated certificate, no SES domain identity; HTTPS on a self-signed certificate the deploy imports into
 *  ACM (bin/self-signed-cert.sh) and names with `-c xr:certArn=<arn>` (context, not a template parameter: the region
 *  guard admits only the image digest and the on-call address); the app's host is the load balancer's AWS name. Never
 *  production (a synth error). */
export const NO_DOMAIN = "none";
/** An ACM certificate ARN in ca-central-1, nothing else (xr:certArn). */
export const CERT_ARN_PATTERN = /^arn:aws:acm:ca-central-1:[0-9]{12}:certificate\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
/** PF-8b F3: the service's task count, `-c xr:serviceTasks=0|2` (default 2). 0 for a first deploy, before the secrets hold
 *  values: tasks started on placeholder secrets crash, trip the circuit breaker, and the rollback leaves retained names. */
export const SERVICE_TASK_CHOICES = [0, MIN_TASKS] as const;
/** A domain (`xr:domain`): lower-case DNS labels, two or more, a letters-only last one; or exactly NO_DOMAIN. A near miss
 *  (`None`, `none.`) is refused rather than built as a zone that can never validate (break 3). */
export const DOMAIN_PATTERN = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;


/** The values PF-24's loader requires in production that are unknown at synth: each one a Secrets Manager secret named
 *  `xr/<stage>/<NAME>`, supplied at deploy (deploy/RUNBOOK-secrets.md). The Cognito ids and the SES region are known
 *  here, so they are plain settings. PF-12 as the team's code has it: every request's query runs as the app role xr_app
 *  (APP_DATABASE_URL, firm-scope.ts appDatabaseUrl); the job runner (pg-boss, platform-jobs.ts) connects with DATABASE_URL
 *  and creates its own schema, so the service's DATABASE_URL is the owner's address, as the migration task's (review M2;
 *  a separate jobs role is a question for the tech lead, PF-8b/challenge.md). */
export const SERVICE_SECRETS = [
  "APP_DATABASE_URL", "PLATFORM_STRIPE_SECRET_KEY", "PLATFORM_STRIPE_WEBHOOK_SECRET", "PLATFORM_BOLDSIGN_API_KEY",
  "PLATFORM_ZOOM_CLIENT_ID", "PLATFORM_ZOOM_CLIENT_SECRET", "PLATFORM_ZOOM_WEBHOOK_SECRET_TOKEN", "PLATFORM_SECRET_BOX_KEYS", "PLATFORM_SECRET_BOX_KEY_VERSION",
] as const;
export const POOLS = ["staff", "own-staff", "clients"] as const;

export interface AppServiceProps {
  stage: Stage;
  vpc: ec2.IVpc;
  key: kms.IKey;
  database: rds.DatabaseInstance;
  /** Overrides the domain (default `expatready.com`; staging uses `staging.<domain>`); `none` (staging only): no domain. */
  domain?: string;
  /** No-domain mode: the imported certificate's ARN (xr:certArn), required there and refused otherwise. */
  certArn?: string;
  /** The service's task count (xr:serviceTasks): 0 or 2, default 2. */
  serviceTasks?: string | number;
  /** PF-23c's app log group (`/xr/<stage>/app`): both containers send stdout and stderr here (PF-8b F1). Required, so a
   *  service can never be built that logs nowhere. */
  appLogs: logs.ILogGroup;
}

export class AppService extends Construct {
  readonly service: ecs.FargateService;
  readonly task: ecs.FargateTaskDefinition;
  readonly migration: ecs.FargateTaskDefinition;

  constructor(scope: Construct, id: string, props: AppServiceProps) {
    super(scope, id);
    const { stage, vpc, key } = props;
    const region = Stack.of(this).region;
    const noDomain = props.domain === NO_DOMAIN;
    if (props.domain !== undefined && !noDomain && !(typeof props.domain === "string" && DOMAIN_PATTERN.test(props.domain))) throw new Error(`xr:domain must be a lower-case domain such as example.com, or ${NO_DOMAIN}`);
    if (noDomain && stage === "production") throw new Error("xr:domain=none is for staging only: production needs its domain (a self-signed certificate never serves real clients)");
    if (noDomain ? !(typeof props.certArn === "string" && CERT_ARN_PATTERN.test(props.certArn)) : props.certArn !== undefined)
      throw new Error(noDomain ? "xr:domain=none needs -c xr:certArn=<the imported certificate's ACM ARN in ca-central-1> (bin/self-signed-cert.sh prints it)" : "xr:certArn is for xr:domain=none only (a domain stack issues its own certificate)");
    const rawTasks = props.serviceTasks ?? MIN_TASKS, tasks = Number(rawTasks);
    if (!(typeof rawTasks === "number" || (typeof rawTasks === "string" && /^[0-9]$/.test(rawTasks))) || !(SERVICE_TASK_CHOICES as readonly number[]).includes(tasks)) throw new Error(`xr:serviceTasks must be ${SERVICE_TASK_CHOICES.join(" or ")} (default ${MIN_TASKS})`);
    if (tasks === 0 && stage === "production") throw new Error("xr:serviceTasks=0 is for staging only: production always runs two tasks");
    const base = props.domain ?? DEFAULT_DOMAIN;
    const domain = stage === "production" ? base : `staging.${base}`;
    // Lead 13 ruling (3): staging runs as `test`, which PF-24's loader holds to test-mode Stripe keys (a live key refused)
    const platformEnv = stage === "production" ? "production" : "test";

    // --- the image: ECR, run by digest only
    const repository = new ecr.Repository(this, "Images", {
      repositoryName: `xr-${stage}-studio`,
      imageTagMutability: ecr.TagMutability.IMMUTABLE,
      imageScanOnPush: true,
      encryption: ecr.RepositoryEncryption.KMS,
      encryptionKey: key,
      removalPolicy: RemovalPolicy.RETAIN,
    });
    const digest = new CfnParameter(this, "ImageDigest", {
      type: "String",
      allowedPattern: "^sha256:[a-f0-9]{64}$",
      description: "The studio image's digest in this stack's repository (PF-8c's deploy fills it; never a tag)",
    });
    const image = ecs.ContainerImage.fromRegistry(repository.repositoryUriForDigest(digest.valueAsString));

    // --- secrets: names only here, values supplied at deploy (SA-8-1)
    const secret = (name: string) => new sm.Secret(this, `Secret${name}`, {
      secretName: `xr/${stage}/${name}`,
      description: `Expat Ready ${stage}: ${name} (supplied at deploy; deploy/RUNBOOK-secrets.md). Created holding a JSON placeholder, which every loader rule refuses.`,
      generateSecretString: { secretStringTemplate: JSON.stringify({ placeholder: "supplied at deploy" }), generateStringKey: "random", passwordLength: 16 }, // review m2
      encryptionKey: key,
      removalPolicy: RemovalPolicy.RETAIN,
    });
    const ownerUrl = secret("DATABASE_OWNER_URL"); // the table owner's address: migrations and the job runner
    const appSecrets: Record<string, sm.Secret> = { DATABASE_URL: ownerUrl, ...Object.fromEntries(SERVICE_SECRETS.map((n) => [n, secret(n)])) };

    // --- Cognito: three separate pools (PF-4b staff, PF-4s our own staff, PF-4p clients)
    const pool = (name: (typeof POOLS)[number], staff: boolean) => {
      const p = new cognito.UserPool(this, `Pool-${name}`, {
        userPoolName: `xr-${stage}-${name}`,
        selfSignUpEnabled: false, // staff are invited (PF-4b); our own staff added by us (PF-4s); clients invited by a firm (PF-4p)
        signInAliases: { email: true },
        signInCaseSensitive: false,
        mfa: staff ? cognito.Mfa.REQUIRED : cognito.Mfa.OPTIONAL, // P-567: two-step for every staff member; clients: not known (PF-4p)
        mfaSecondFactor: { otp: true, sms: false }, // Sample: an authenticator app only, no SMS
        passwordPolicy: { minLength: 12, requireDigits: true, requireLowercase: true, requireUppercase: true, requireSymbols: false }, // Sample
        accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
        deletionProtection: true,
        removalPolicy: RemovalPolicy.RETAIN,
      });
      p.addClient("App", { generateSecret: false, preventUserExistenceErrors: true, authFlows: { userSrp: true }, disableOAuth: true }); // no hosted UI yet: no OAuth flows or placeholder callbacks
      return p;
    };
    const pools = { staff: pool("staff", true), "own-staff": pool("own-staff", true), clients: pool("clients", false) };
    const staffClient = pools.staff.node.findChild("App") as cognito.UserPoolClient;

    // --- the service's task: settings explicit, secrets by reference
    this.task = new ecs.FargateTaskDefinition(this, "Task", { cpu: 1024, memoryLimitMiB: 2048, runtimePlatform: { cpuArchitecture: ecs.CpuArchitecture.X86_64, operatingSystemFamily: ecs.OperatingSystemFamily.LINUX } }); // Sample sizes
    this.task.addContainer("studio", {
      image,
      portMappings: [{ containerPort: CONTAINER_PORT }],
      environment: {
        PLATFORM_ENVIRONMENT: platformEnv, // rev 16.5: explicit, never defaulted
        PLATFORM_IDENTITY: "cognito",
        PLATFORM_COGNITO_USER_POOL_ID: pools.staff.userPoolId,
        PLATFORM_COGNITO_CLIENT_ID: staffClient.userPoolClientId,
        PLATFORM_SES_REGION: region,
        ...(noDomain ? {} : { PLATFORM_ADDRESS_SUFFIX: domain }), // PF-8b F2b: firm addresses under this stack's zone (F3: no-domain mode sets the load balancer's name below)
      },
      secrets: Object.fromEntries(Object.entries(appSecrets).map(([n, s]) => [n, ecs.Secret.fromSecretsManager(s)])),
      readonlyRootFilesystem: false, // the image writes var/ (PF-7)
      logging: ecs.LogDrivers.awsLogs({ logGroup: props.appLogs, streamPrefix: "studio" }), // PF-8b F1: to PF-23c's group
    });
    repository.grantPull(this.task.obtainExecutionRole());

    // --- the migration task: the owner's address only, the same image, `prisma migrate deploy`
    this.migration = new ecs.FargateTaskDefinition(this, "Migrate", { cpu: 512, memoryLimitMiB: 1024 }); // Sample sizes
    this.migration.addContainer("migrate", {
      image,
      command: ["./node_modules/.bin/prisma", "migrate", "deploy"],
      environment: { PLATFORM_ENVIRONMENT: platformEnv },
      secrets: { DATABASE_URL: ecs.Secret.fromSecretsManager(ownerUrl) },
      logging: ecs.LogDrivers.awsLogs({ logGroup: props.appLogs, streamPrefix: "migrate" }), // PF-8b F1
    });
    repository.grantPull(this.migration.obtainExecutionRole());

    // --- mail: SES with DKIM, SPF on a MAIL FROM subdomain, DMARC (Sample policy). No-domain mode: none (no mail sent)
    const zone = noDomain ? undefined : new route53.PublicHostedZone(this, "Zone", { zoneName: domain, comment: `Expat Ready ${stage}: firm addresses <firm>.${domain} (PF-25)` });
    if (zone) {
      const identity = new ses.EmailIdentity(this, "Mail", {
        identity: ses.Identity.publicHostedZone(zone),
        dkimSigning: true,
        mailFromDomain: `mail.${domain}`,
      });
      new route53.TxtRecord(this, "Dmarc", { zone: zone, recordName: `_dmarc.${domain}`, values: ["v=DMARC1; p=none; adkim=s; aspf=r"] }); // Sample: monitor first; SPF relaxed (MAIL FROM is mail.<domain>), DKIM strict
      identity.grantSendEmail(this.task.taskRole);
    }

    // --- network: load balancer in the public subnets, tasks in the app subnets, the database reachable from both tasks
    const albSg = new ec2.SecurityGroup(this, "LbSg", { vpc, allowAllOutbound: false, description: "load balancer: 443 and 80 (redirect) in" });
    albSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), "HTTPS");
    albSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), "HTTP, answered with a redirect only");
    const svcSg = new ec2.SecurityGroup(this, "ServiceSg", { vpc, description: "studio tasks: the load balancer only" });
    svcSg.addIngressRule(albSg, ec2.Port.tcp(CONTAINER_PORT), "from the load balancer");
    albSg.addEgressRule(svcSg, ec2.Port.tcp(CONTAINER_PORT), "to the tasks");
    const migrateSg = new ec2.SecurityGroup(this, "MigrateSg", { vpc, description: "migration task: no inbound" });
    props.database.connections.allowDefaultPortFrom(svcSg, "studio tasks");
    props.database.connections.allowDefaultPortFrom(migrateSg, "migration task");
    new CfnOutput(this, "MigrateSecurityGroup", { value: migrateSg.securityGroupId });
    new CfnOutput(this, "AppSubnets", { value: vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }).subnetIds.join(",") });

    this.service = new ecs.FargateService(this, "Service", {
      cluster: new ecs.Cluster(this, "Cluster", { vpc, containerInsightsV2: ecs.ContainerInsights.ENABLED }),
      taskDefinition: this.task,
      desiredCount: tasks, // F3: 0 for a first deploy before the secrets hold values, else 2
      minHealthyPercent: 100, // Sample: never below two serving tasks during a deploy
      maxHealthyPercent: 200,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [svcSg],
      assignPublicIp: false,
      circuitBreaker: { enable: true, rollback: true }, // PF-8c proves the rollback in the account
    });

    // PF-8b F3: no domain → the self-signed certificate the deploy imported (xr:certArn, checked above)
    const certificate = zone
      ? new acm.Certificate(this, "Wildcard", { domainName: `*.${domain}`, validation: acm.CertificateValidation.fromDns(zone) })
      : acm.Certificate.fromCertificateArn(this, "Imported", props.certArn!);
    const loadBalancer = new elbv2.ApplicationLoadBalancer(this, "Lb", {
      vpc, internetFacing: true, securityGroup: albSg, vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC }, dropInvalidHeaderFields: true,
      // F3: a fixed lower-case name, so the AWS host name is lower case, as PLATFORM_ADDRESS_SUFFIX requires (the loader refuses capitals)
      ...(noDomain ? { loadBalancerName: `xr-${stage}-app` } : {}),
    });
    const https = loadBalancer.addListener("Https", { port: 443, protocol: elbv2.ApplicationProtocol.HTTPS, certificates: [certificate], sslPolicy: elbv2.SslPolicy.RECOMMENDED_TLS, open: false });
    https.addTargets("Studio", {
      port: CONTAINER_PORT, protocol: elbv2.ApplicationProtocol.HTTP, targets: [this.service],
      healthCheck: { path: "/api/health/live", healthyHttpCodes: "200", interval: Duration.seconds(15) }, // Sample timings
      deregistrationDelay: Duration.seconds(30),
    });
    loadBalancer.addListener("Http", { port: 80, open: false, defaultAction: elbv2.ListenerAction.redirect({ protocol: "HTTPS", port: "443", permanent: true }) });

    if (!zone) {
      // F3: the app's host is the load balancer's AWS name (one setting, as F2b); firm addresses wait for the real domain (R1.24)
      this.task.defaultContainer!.addEnvironment("PLATFORM_ADDRESS_SUFFIX", loadBalancer.loadBalancerDnsName);
      new CfnOutput(this, "LoadBalancerHost", { value: loadBalancer.loadBalancerDnsName, description: "No-domain mode: the app at https://<this> (self-signed certificate)" });
      return;
    }
    new route53.ARecord(this, "Firms", { zone: zone, recordName: `*.${domain}`, target: route53.RecordTarget.fromAlias(new targets.LoadBalancerTarget(loadBalancer)) });
    // Delegation: these name servers go at the parent (the registrar for production, `base`'s zone for staging; README).
    new CfnOutput(this, "NameServers", { value: Fn.join(",", zone.hostedZoneNameServers!), description: `NS records for ${domain} at its parent` });
  }
}
