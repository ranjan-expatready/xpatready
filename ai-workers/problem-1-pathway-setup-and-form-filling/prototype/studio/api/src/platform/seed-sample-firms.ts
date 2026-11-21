// PF-3 (P-559 (4), Lead 37 13 Nov): the Sample firms and their staff as platform rows, read from samples/firms.json only
// (the file the case side already reads, api/src/firms.ts). The firms keep their keys (`sample-firm`, `sample-solo`), so
// cases (runtime_case.firm_key) and the platform share one firm identity; the staff keep their actor ids (`user-R`,
// `user-O`, `user-T`, `user-S`), the bridge of the identity join.
// Roles from the file's duties (contracts §1.2, §7): firm_admin → OWNER; represent → CASE_MANAGER (a person with a
// licence and the case-manager keys is a representative of record); case work alone → CASE_OFFICER. A licence in the
// file → one platform_staff_credential. So user-R and user-S are Owner + Case Manager with a licence, user-T (the second
// representative, BR-20) Case Manager with a licence, user-O Case Officer.
// Idempotent: one transaction that only adds what is missing and never changes a row that is there, so a second run
// changes nothing and a person's later changes are kept. Every value is Sample.
// PF-5t (checklist row 100): a Sample person with no acceptance yet of the privacy notice accepts its current version, and
// the Sample Owner, for a firm with no acceptance yet of the terms of service or the data-processing terms, accepts their
// current versions (Sample acceptances, also for people a database kept from before PF-5 already holds: break M1). Only a
// first acceptance of each kind: a later new version stays pending for the person to accept (PF-5t). Unconfirmed: no
// counsel. Run: PLATFORM_ENVIRONMENT=local tsx api/src/platform/seed-sample-firms.ts
import type { PlatformRole, Prisma, PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { registeredSettings, syncSettingDefinitions } from "./settings.ts";
import { touchFirm } from "./firm-scope.ts";

type Office = { country?: string | null } & Record<string, unknown>;
type SampleUser = { id: string; name: string; family_name?: string; given_names?: string; email?: string; duties: string[]; licence: { body: string; category: string; number: string } | null };
type SampleFirm = { key: string; name: string; solo: boolean; office?: Office; users: SampleUser[] };

/** The studio folder (as core.ts's STUDIO; not imported, so plain tsx scripts and checks can load this file). */
const STUDIO = join(import.meta.dirname, "..", "..", "..");
export const SEED_ACTOR = "seed:PF-3";
/** AUD-5 part 1: the Sample firms' setting values (Sample; the demo reset returns them, not the registered default). */
export const SAMPLE_SETTING_VALUES: Record<string, unknown> = { "legal.closed_client_files_years": 6 };
const COUNTRY: Record<string, string> = { canada: "CA" };

export function readSampleFirms(file = join(STUDIO, "samples", "firms.json")): SampleFirm[] {
  return (JSON.parse(readFileSync(file, "utf8")) as { firms: SampleFirm[] }).firms;
}

/** The roles a Sample user's duties give (see the header). */
export function rolesOf(u: SampleUser): PlatformRole[] {
  const roles: PlatformRole[] = [];
  if (u.duties.includes("firm_admin")) roles.push("OWNER");
  if (u.duties.includes("represent")) roles.push("CASE_MANAGER");
  if (!roles.length && u.duties.includes("case")) roles.push("CASE_OFFICER");
  return roles;
}

/** A Sample user's e-mail; one the file does not give is made from the actor id and the firm key (example.com, Sample). */
const emailOf = (u: SampleUser, firmKey: string) => (u.email ?? `${u.id}@${firmKey}.example.com`).toLowerCase();

export type SeedResult = { firmsAdded: number; staffAdded: number; grantsAdded: number; credentialsAdded: number; subscriptionsAdded: number; settingKeys: number; unmatchedCaseFirmKeys: string[] };

/** `then` (DEMO-LINK): more Sample rows written in this same transaction after the firms, so a bypass use touches each
 *  firm once (the demo reset's front-office Sample consultation type, demo.ts). */
export async function seedSampleFirms(db: PrismaClient, firms: SampleFirm[] = readSampleFirms(), then?: (tx: Prisma.TransactionClient) => Promise<unknown>): Promise<SeedResult> {
  return db.$transaction(async (tx) => {
    const r: SeedResult = { firmsAdded: 0, staffAdded: 0, grantsAdded: 0, credentialsAdded: 0, subscriptionsAdded: 0, settingKeys: 0, unmatchedCaseFirmKeys: [] };
    r.settingKeys = await syncDefinitionsIfChanged(tx);
    // A database migrated only up to before PF-5 (some checks load part of the migrations) has no terms: none accepted.
    const [{ has }] = await tx.$queryRaw<{ has: boolean }[]>`select to_regclass('platform_terms_version') is not null as has`;
    const terms = !has ? [] : await tx.$queryRaw<{ id: string; kind: string }[]>`select distinct on (kind) id::text as id, kind::text as kind from platform_terms_version where published_at <= now() order by kind, published_at desc, version desc`;
    for (const f of firms) {
      const owner = f.users.find((u) => u.duties.includes("firm_admin")) ?? f.users[0];
      const country = COUNTRY[String(f.office?.country ?? "").toLowerCase()];
      if (!country) throw new Error(`seed-sample-firms: firm ${f.key} has no known country (${String(f.office?.country)})`);
      let firm = await tx.platformFirm.findUnique({ where: { key: f.key } });
      if (!firm) {
        firm = await tx.platformFirm.create({ data: {
          key: f.key, operatingName: f.name, countryCode: country, status: "ACTIVE",
          ownerName: owner.name, ownerEmail: emailOf(owner, f.key), billingEmail: emailOf(owner, f.key), contactEmail: emailOf(owner, f.key),
          businessAddress: (f.office ?? null) as Prisma.InputJsonValue,
        } });
        r.firmsAdded++;
        // The subscription comes with the firm, once: an ended one is a person's change and is kept (break B-3).
        const plan = await tx.platformPlan.findUnique({ where: { code: f.solo ? "solo" : "team" } });
        if (!plan) throw new Error("seed-sample-firms: the Sample plans are missing (the PF-3 migration adds them)");
        await tx.platformSubscription.create({ data: { firmId: firm.id, planId: plan.id, status: "ACTIVE" } });
        r.subscriptionsAdded++;
      }
      // PF-12b: on the demo's bypass use (demo.ts, "platform.demo.reset") this firm's platform.bypass line, in the seed's
      // transaction; outside a bypass use (start-up, suites) touchFirm writes nothing.
      await touchFirm(tx, firm.id);
      for (const u of f.users) {
        // There (by its actor id, or by its email in the firm when a person cleared the actor id): never changed by the seed.
        const there = await tx.platformStaff.findFirst({ where: { OR: [{ actorId: u.id }, { firmId: firm.id, email: emailOf(u, f.key) }] } });
        if (there) { if (there.firmId === firm.id) await firstAcceptances(tx, terms, firm.id, there.id, u === owner); continue; }
        const staff = await tx.platformStaff.create({ data: {
          firmId: firm.id, actorId: u.id, email: emailOf(u, f.key), displayName: u.name,
          familyName: u.family_name ?? null, givenNames: u.given_names ?? null, status: "ACTIVE",
        } });
        r.staffAdded++;
        await firstAcceptances(tx, terms, firm.id, staff.id, u === owner);
        for (const role of rolesOf(u)) { await tx.platformRoleGrant.create({ data: { firmId: firm.id, staffId: staff.id, role, grantedBy: SEED_ACTOR } }); r.grantsAdded++; }
        if (u.licence) {
          await tx.platformStaffCredential.create({ data: { firmId: firm.id, staffId: staff.id, representativeType: u.licence.category, licensingBody: u.licence.body, licenceNumber: u.licence.number, updatedBy: SEED_ACTOR } });
          r.credentialsAdded++;
        }
      }
    }
    if (then) await then(tx);
    r.unmatchedCaseFirmKeys = await unmatchedCaseFirmKeys(tx);
    return r;
  });
}

/** PF-5t: a Sample person's first acceptance of each kind they accept (see the header); never a second one. */
async function firstAcceptances(tx: Prisma.TransactionClient, terms: { id: string; kind: string }[], firmId: string, staffId: string, isOwner: boolean) {
  const data: { firmId: string; staffId: string; versionId: string; acceptedAt: Date }[] = [];
  for (const t of terms) {
    if (t.kind !== "PRIVACY_NOTICE" && !isOwner) continue;
    const who = t.kind === "PRIVACY_NOTICE" ? { firmId, staffId } : { firmId };
    if (await tx.platformTermsAcceptance.findFirst({ where: { ...who, version: { kind: t.kind as never } }, select: { id: true } })) continue;
    data.push({ firmId, staffId, versionId: t.id, acceptedAt: new Date() });
  }
  if (data.length) await tx.platformTermsAcceptance.createMany({ data, skipDuplicates: true });
}

/** The firm keys cases carry that no platform_firm has (empty after the seed on the demo data). */
export async function unmatchedCaseFirmKeys(db: PrismaClient | Prisma.TransactionClient): Promise<string[]> {
  const rows = await db.$queryRaw<{ firm_key: string }[]>`select distinct c.firm_key from runtime_case c where not exists (select 1 from platform_firm f where f.key = c.firm_key) order by 1`;
  return rows.map((x) => x.firm_key);
}

/** AUD-5: writes the Sample setting values a Sample firm does not have yet, through the settings write path (one audit
 *  line each); a value that is there is never changed. Run after seedSampleFirms by the start-up seed and the command
 *  line (seedSampleFirms itself stores no setting values, PF-3). */
export async function seedSampleSettings(db: PrismaClient, firms: SampleFirm[] = readSampleFirms()): Promise<number> {
  const { seedSampleSettingValues } = await import("./keep-period/service.ts");
  let n = 0;
  for (const f of firms) {
    const firm = await db.platformFirm.findUnique({ where: { key: f.key }, select: { id: true } });
    if (firm) n += await db.$transaction((tx) => seedSampleSettingValues(tx, firm.id, SAMPLE_SETTING_VALUES));
  }
  return n;
}

// The definitions are written only when a registered key is missing or differs, so a second run changes nothing.
async function syncDefinitionsIfChanged(tx: Prisma.TransactionClient): Promise<number> {
  const have = new Map((await tx.platformSettingDefinition.findMany()).map((d) => [d.key, d]));
  const stale = registeredSettings().some((def) => {
    const d = have.get(def.key);
    return !d || JSON.stringify(d.defaultValue) !== JSON.stringify(def.default) || d.changePermission !== def.changePermission || d.description !== def.description || d.ownerModule !== def.ownerModule;
  });
  return stale ? syncSettingDefinitions(tx) : registeredSettings().length;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const { PrismaClient } = await import("@prisma/client");
  const { platformConfig } = await import("./config/settings.ts");
  const url = platformConfig().databaseUrl.reveal();   // PF-24: the one loader (the demo database locally, as core.ts DATABASE_URL)
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url, options: "-c TimeZone=UTC" }) });
  try { console.log(JSON.stringify({ ...(await seedSampleFirms(db)), sampleSettingValues: await seedSampleSettings(db) })); } finally { await db.$disconnect(); }
}
