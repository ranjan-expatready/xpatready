// PF-8a (map row 1, R1.14's base): the Canadian estate as code, synth only. One stack per environment, pinned to
// ca-central-1 (P-559). Network over two zones with the database in isolated subnets (no route to the internet), one
// KMS key per environment, RDS PostgreSQL (the version deploy/compose.test.yml runs) with 35-day automated backups and
// point-in-time restore (SA-2-21, SA-11-32), and three private buckets. Nothing here is deployed: there is no AWS
// account (P-551); `cdk synth` and the assertion tests in ../test prove the template. PF-8b adds the service and its
// secrets, PF-8c the deploy; PF-8rc's backup plan and ca-west-1 copy are in backup.ts.
// Instance sizes are Sample (no load measured yet); ASSUMPTIONS-style values are marked Sample where they appear.
import { Duration, RemovalPolicy, Stack, Tags, type StackProps, aws_backup as backup, aws_ec2 as ec2, aws_kms as kms, aws_rds as rds, aws_s3 as s3 } from "aws-cdk-lib";
import type { Construct } from "constructs";
import { backupPlan } from "./backup.ts";
import { Observability } from "./observability.ts";

import { AppService, NO_DOMAIN } from "./service.ts"; // PF-8b
export const HOME_REGION = "ca-central-1";
export const BACKUP_DAYS = 35; // the RDS maximum; SA-2-21's and SA-11-32's "backups 35 days"
export type Stage = "staging" | "production";
export const BUCKETS = ["documents", "exports", "imports"] as const;

export interface EstateProps extends StackProps { stage: Stage }

export class EstateStack extends Stack {
  readonly key: kms.Key;
  readonly vpc: ec2.Vpc;
  readonly database: rds.DatabaseInstance;
  readonly service: AppService;
  readonly buckets: Record<(typeof BUCKETS)[number], s3.Bucket>;
  readonly observability: Observability; // PF-23c: the app's log group (PF-8b's task logs here), filters and alarms

  constructor(scope: Construct, id: string, props: EstateProps) {
    // The region is fixed here, never taken from the caller's environment: a stray AWS_REGION cannot move the estate.
    super(scope, id, { ...props, env: { account: props.env?.account, region: HOME_REGION } });
    const production = props.stage === "production";
    Tags.of(this).add("xr:stage", props.stage);

    this.key = new kms.Key(this, "DataKey", {
      alias: `alias/xr-${props.stage}-data`,
      description: `Expat Ready ${props.stage}: database, files and backups`,
      enableKeyRotation: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    this.vpc = new ec2.Vpc(this, "Network", {
      maxAzs: 2,
      natGateways: production ? 2 : 1, // Sample: one per zone in production, one in staging (cost, P-562)
      subnetConfiguration: [
        { name: "public", subnetType: ec2.SubnetType.PUBLIC, cidrMask: 24 }, // the load balancer only (PF-8b)
        { name: "app", subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS, cidrMask: 22 }, // the service's tasks (PF-8b)
        { name: "data", subnetType: ec2.SubnetType.PRIVATE_ISOLATED, cidrMask: 24 }, // the database: no internet route
      ],
    });

    const parameters = new rds.ParameterGroup(this, "DbParameters", {
      engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_18_3 }),
      parameters: { "rds.force_ssl": "1", log_error_verbosity: "terse" }, // TLS only; rev 16.2 break 11 (no row values in logs)
    });

    this.database = new rds.DatabaseInstance(this, "Database", {
      engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_18_3 }),
      instanceType: production ? ec2.InstanceType.of(ec2.InstanceClass.M7G, ec2.InstanceSize.LARGE) : ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MEDIUM), // Sample
      vpc: this.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      publiclyAccessible: false,
      multiAz: production, // production over two zones; staging single-zone (cost, P-562)
      storageEncrypted: true,
      storageEncryptionKey: this.key,
      allocatedStorage: 50, // Sample
      maxAllocatedStorage: 500, // Sample
      backupRetention: Duration.days(BACKUP_DAYS), // automated backups with point-in-time restore
      deletionProtection: true,
      removalPolicy: RemovalPolicy.SNAPSHOT,
      parameterGroup: parameters,
      credentials: rds.Credentials.fromGeneratedSecret("xr_admin", { encryptionKey: this.key }), // never in code or env
      copyTagsToSnapshot: true,
      autoMinorVersionUpgrade: true,
    });
    // PF-23c: log group kept 90 days, metric filters and alarms to the on-call address (lib/observability.ts). Built
    // before the app service, whose containers log to its group (PF-8b F1).
    this.observability = new Observability(this, "Observability", { stage: props.stage });

    // PF-8b: the app service, its secrets, mail, firm addresses and sign-in pools (lib/service.ts). PF-8b F3: `-c
    // xr:domain=none` means staging has no domain while production keeps its default (the app synthesizes both stacks).
    // xr:certArn names the imported certificate (no-domain staging only); xr:serviceTasks=0|2 (default 2) sets staging's task
    // count (production always runs 2: a 0 there would be an outage, break 2).
    const domain = this.node.tryGetContext("xr:domain") as string | undefined, noDomainHere = domain === NO_DOMAIN && props.stage !== "production";
    this.service = new AppService(this, "App", {
      stage: props.stage, vpc: this.vpc, key: this.key, database: this.database, appLogs: this.observability.appLogs,
      domain: domain === NO_DOMAIN && !noDomainHere ? undefined : domain,
      certArn: domain === NO_DOMAIN && !noDomainHere ? undefined : this.node.tryGetContext("xr:certArn"),
      serviceTasks: props.stage === "production" ? undefined : this.node.tryGetContext("xr:serviceTasks"),
    });

    const bucket = (name: (typeof BUCKETS)[number]) => new s3.Bucket(this, `${name[0].toUpperCase()}${name.slice(1)}Bucket`, {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: this.key,
      bucketKeyEnabled: true,
      enforceSSL: true, // a bucket policy refusing any request without TLS
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
      removalPolicy: RemovalPolicy.RETAIN,
      // PF-8rc: an overwritten or deleted file's old version is kept 35 days, then expires (the backups keep their own)
      lifecycleRules: [{ id: "old-versions", noncurrentVersionExpiration: Duration.days(BACKUP_DAYS) }],
    });
    this.buckets = { documents: bucket("documents"), exports: bucket("exports"), imports: bucket("imports") };
    // PF-8rc: the daily AWS Backup plan over the database and every bucket, copied to ca-west-1 (lib/backup.ts)
    backupPlan(this, props.stage, [backup.BackupResource.fromRdsDatabaseInstance(this.database), ...Object.values(this.buckets).map((b) => backup.BackupResource.fromArn(b.bucketArn))], this.key);
  }
}
