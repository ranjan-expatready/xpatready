// PF-3 (P-559 (4), Lead 37 13 Nov): the Sample firms and their staff as platform rows, read from samples/firms.json only
// (the file the case side already reads, api/src/firms.ts). The firms keep their keys (`sample-firm`, `sample-solo`), so
// cases (runtime_case.firm_key) and the platform share one firm identity; the staff keep their actor ids (`user-R`,
// `user-O`, `user-T`, `user-S`), the bridge of the identity join.
// Roles from the file's duties (contracts §1.2, §7): firm_admin → OWNER; represent → CASE_MANAGER (a person with a
// licence and the case-manager keys is a representative of record); case work alone → CASE_OFFICER. A licence in the
// file → one platform_staff_credential. So user-R and user-S are Owner + Case Manager with a licence, user-T (the second
// representative, BR-20) Case Manager with a licence, user-O Case Officer.
// Idempotent: one transaction that only adds what is missing and never changes a row that is there, so a second run
// changes nothing and a person's later changes are kept. Every value is Sample. Run: tsx api/src/platform/seed-sample-firms.ts
import type { PlatformRole, Prisma, PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { STUDIO } from "../core.ts";
import { registeredSettings, syncSettingDefinitions } from "./settings.ts";

type Office = { country?: string | null } & Record<string, unknown>;
type SampleUser = { id: string; name: string; family_name?: string; given_names?: string; email?: string; duties: string[]; licence: { body: string; category: string; number: string } | null };
type SampleFirm = { key: string; name: string; solo: boolean; office?: Office; users: SampleUser[] };

export const SEED_ACTOR = "seed:PF-3";
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

export async function seedSampleFirms(db: PrismaClient, firms: SampleFirm[] = readSampleFirms()): Promise<SeedResult> {
  return db.$transaction(async (tx) => {
    const r: SeedResult = { firmsAdded: 0, staffAdded: 0, grantsAdded: 0, credentialsAdded: 0, subscriptionsAdded: 0, settingKeys: 0, unmatchedCaseFirmKeys: [] };
    r.settingKeys = await syncDefinitionsIfChanged(tx);
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
      }
      if (!(await tx.platformSubscription.findFirst({ where: { firmId: firm.id, status: { not: "ENDED" } } }))) {
        const plan = await tx.platformPlan.findUnique({ where: { code: f.solo ? "solo" : "team" } });
        if (!plan) throw new Error("seed-sample-firms: the Sample plans are missing (the PF-3 migration adds them)");
        await tx.platformSubscription.create({ data: { firmId: firm.id, planId: plan.id, status: "ACTIVE" } });
        r.subscriptionsAdded++;
      }
      for (const u of f.users) {
        if (await tx.platformStaff.findUnique({ where: { actorId: u.id } })) continue; // there: never changed by the seed
        const staff = await tx.platformStaff.create({ data: {
          firmId: firm.id, actorId: u.id, email: emailOf(u, f.key), displayName: u.name,
          familyName: u.family_name ?? null, givenNames: u.given_names ?? null, status: "ACTIVE",
        } });
        r.staffAdded++;
        for (const role of rolesOf(u)) { await tx.platformRoleGrant.create({ data: { firmId: firm.id, staffId: staff.id, role, grantedBy: SEED_ACTOR } }); r.grantsAdded++; }
        if (u.licence) {
          await tx.platformStaffCredential.create({ data: { firmId: firm.id, staffId: staff.id, representativeType: u.licence.category, licensingBody: u.licence.body, licenceNumber: u.licence.number, updatedBy: SEED_ACTOR } });
          r.credentialsAdded++;
        }
      }
    }
    r.unmatchedCaseFirmKeys = await unmatchedCaseFirmKeys(tx);
    return r;
  });
}

/** The firm keys cases carry that no platform_firm has (empty after the seed on the demo data). */
export async function unmatchedCaseFirmKeys(db: PrismaClient | Prisma.TransactionClient): Promise<string[]> {
  const rows = await db.$queryRaw<{ firm_key: string }[]>`select distinct c.firm_key from runtime_case c where not exists (select 1 from platform_firm f where f.key = c.firm_key) order by 1`;
  return rows.map((x) => x.firm_key);
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
  const { Db } = await import("../core.ts");
  const db = new Db();
  try { console.log(JSON.stringify(await seedSampleFirms(db))); } finally { await db.$disconnect(); }
}
