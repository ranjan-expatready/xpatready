// PF-4 (P-571 (2)): PF-3's Sample seed (seed-sample-firms.ts) at start-up, after migrations (start.sh and isolated.sh
// migrate before the API starts), behind an explicit Sample/demo setting that defaults off:
//   PLATFORM_SAMPLE_SEED=on   seed the Sample firms and staff (idempotent: adds only what is missing)
//   unset or off              never seeds
// A production configuration (PLATFORM_ENVIRONMENT=production) never runs it, even with the setting on: it says so and
// carries on. Any other value stops the start-up with its name. The one line that calls this is in main.ts.
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { seedSampleFirms, type SeedResult } from "../seed-sample-firms.ts";
import { identityConfig } from "./port.ts";

export type SeedDecision = { run: boolean; why: string };

/** Whether this configuration seeds the Sample firms at start-up. */
export function sampleSeedDecision(env: NodeJS.ProcessEnv = process.env): SeedDecision {
  const v = (env.PLATFORM_SAMPLE_SEED ?? "").trim() || "off";
  if (!["on", "off"].includes(v)) throw new Error(`PLATFORM_SAMPLE_SEED "${v}": use on or off`);
  const { environment } = identityConfig({ ...env, PLATFORM_IDENTITY: "" });
  if (v === "off") return { run: false, why: "PLATFORM_SAMPLE_SEED is off (the default)" };
  if (environment === "production") return { run: false, why: "refused: PLATFORM_ENVIRONMENT=production never seeds Sample firms" };
  return { run: true, why: `PLATFORM_SAMPLE_SEED=on (${environment})` };
}

/** Runs the Sample seed when the configuration asks for it; returns what it did (null when it did not run). */
export async function seedSampleOnStart(env: NodeJS.ProcessEnv = process.env, seed: (db: PrismaClient) => Promise<SeedResult> = seedSampleFirms): Promise<SeedResult | null> {
  const d = sampleSeedDecision(env);
  if (!d.run) { if (d.why.startsWith("refused")) console.warn(`platform: Sample seed ${d.why}`); return null; }
  const url = env.DATABASE_URL ?? "postgresql://xr_studio@127.0.0.1:54329/xr_studio_demo";   // as core.ts DATABASE_URL
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url, options: "-c TimeZone=UTC" }) });
  try { return await seed(db); } finally { await db.$disconnect(); }
}
