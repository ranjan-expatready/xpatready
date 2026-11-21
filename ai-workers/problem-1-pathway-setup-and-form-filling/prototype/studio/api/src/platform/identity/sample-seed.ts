// PF-4 (P-571 (2)): PF-3's Sample seed (seed-sample-firms.ts) at start-up, after migrations (start.sh and isolated.sh
// migrate before the API starts), behind an explicit Sample/demo setting that defaults off:
//   PLATFORM_SAMPLE_SEED=on   seed the Sample firms and staff (idempotent: adds only what is missing)
//   unset or off              never seeds
// A production configuration (PLATFORM_ENVIRONMENT=production) never runs it, even with the setting on: it says so and
// carries on. Any other value stops the start-up with its name. The one line that calls this is in main.ts.
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { seedSampleFirms, seedSampleSettings, type SeedResult } from "../seed-sample-firms.ts";
import { seedSampleConsultationType } from "../../front-office/booking-seed.ts";
import { loadPlatformConfig, platformConfig, type PlatformConfig } from "../config/settings.ts";
import { logPort } from "../observability/log.ts";

export type SeedDecision = { run: boolean; why: string };

/** This process's configuration (read once at start) or, given another `env`, that one's: PF-24's loader reads and checks
 *  the settings (PF-24w), so an unknown PLATFORM_SAMPLE_SEED stops the start-up with its name. */
const configOf = (env: NodeJS.ProcessEnv): PlatformConfig => (env === process.env ? platformConfig() : loadPlatformConfig(env));

/** Whether this configuration seeds the Sample firms at start-up. `forceOn` (the demo reset, demo.ts) asks as if
 *  PLATFORM_SAMPLE_SEED were on, from this process's loaded configuration: never a copy of process.env, which the loader
 *  has scrubbed of secrets by then (break M1, #2635: a copy re-ran the loader and refused the reset with a 500). */
export function sampleSeedDecision(env: NodeJS.ProcessEnv = process.env, opts: { forceOn?: boolean } = {}): SeedDecision {
  const { environment, sampleSeed } = configOf(env);
  if (!sampleSeed && !opts.forceOn) return { run: false, why: "PLATFORM_SAMPLE_SEED is off (the default)" };
  if (environment === "production") return { run: false, why: "refused: PLATFORM_ENVIRONMENT=production never seeds Sample firms" };
  return { run: true, why: `PLATFORM_SAMPLE_SEED=on (${environment})` };
}

/** PF-3's seed, then AUD-5's Sample setting values (6 years for closed client files, Sample), then DEMO-LINK's Sample
 *  consultation type (a failure there is said in the log and never stops the start-up). */
const seedFirmsAndValues = async (db: PrismaClient): Promise<SeedResult> => {
  const r = await seedSampleFirms(db); await seedSampleSettings(db);
  await seedSampleConsultationType(db, "platform").catch((e) => logPort.error("demo_link_sample_type_failed", e, { at: "platform" }));
  return r;
};

/** Runs the Sample seed when the configuration asks for it; returns what it did (null when it did not run). */
export async function seedSampleOnStart(env: NodeJS.ProcessEnv = process.env, seed: (db: PrismaClient) => Promise<SeedResult> = seedFirmsAndValues): Promise<SeedResult | null> {
  const d = sampleSeedDecision(env);
  if (!d.run) { if (d.why.startsWith("refused")) console.warn(`platform: Sample seed ${d.why}`); return null; }
  const url = configOf(env).databaseUrl.reveal();   // the demo database locally, as core.ts DATABASE_URL
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url, options: "-c TimeZone=UTC" }) });
  try { return await seed(db); } finally { await db.$disconnect(); }
}
