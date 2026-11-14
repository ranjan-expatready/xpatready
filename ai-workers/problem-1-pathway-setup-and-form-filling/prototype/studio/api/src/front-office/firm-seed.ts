// FO-1a (rows rev 3.1; contracts §2.1, §7 §2.1): a firm's front office, seeded once. On `firm.created` (the platform's
// event in module_event, contracts §1.1) and once for the two Sample firms, it writes the firm's fo_sales_setup row and
// then, in the same transaction and only if the firm was never seeded: the two pipelines with AG-02's eight stages each
// (AG-2-52), the two reason lists with AG-02's own labels (AG-2-80 rule 2, AG-2-44 rule 2), one web form, turned off, and
// the "Interested in" list from the names of released, not retired combinations (AG-16-76). Idempotent: the setup row's
// seeded_at marks the firm seeded, read under the row's lock, so a second run (or two at once) changes nothing and a
// person's later changes (a renamed stage, a service turned off) are kept.
// The combinations are read with one SQL query (the configurator's tables; front office imports no case-side file, rows
// rev 14.1). The ReleasePort of the case-side contract v0.1 §3.6 replaces it when it exists.
//   Run: tsx api/src/front-office/firm-seed.ts   (the Sample firms, then every firm.created not yet seeded)
import type { FoPipeline, FoReasonKind, FoStageKind, Prisma, PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { pathToFileURL } from "node:url";
import { EVENT } from "../../../ports/events.ts";
import { firmScope } from "../platform/firm-scope.ts";

export const SEED_ACTOR = "seed:FO-1a";
/** The Sample firms' keys (PF-3's seed-sample-firms.ts writes them, P-559 (4)). */
export const SAMPLE_FIRM_KEYS = ["sample-firm", "sample-solo"] as const;

/** AG-2-52 rule 3: the same eight stages for both pipelines, in order. Keys as AG-02's guards name them (AG-2-28a):
 *  `PROPOSAL` is labelled "Fees discussed" (Page 1 change), `RETAINER_SIGNED` "Won – client". */
export const STAGES: ReadonlyArray<{ key: string; label: string; kind: FoStageKind }> = [
  { key: "ENGAGED", label: "Engaged", kind: "ACTIVE" },
  { key: "QUALIFIED", label: "Qualified", kind: "ACTIVE" },
  { key: "CONSULT", label: "Consult", kind: "ACTIVE" },
  { key: "PROPOSAL", label: "Fees discussed", kind: "ACTIVE" },
  { key: "RETAINER_SENT", label: "Retainer sent", kind: "ACTIVE" },
  { key: "RETAINER_SIGNED", label: "Won – client", kind: "WON" },
  { key: "LOST", label: "Lost", kind: "LOST" },
  { key: "NURTURE", label: "Nurture", kind: "NURTURE" },
];
export const PIPELINES: readonly FoPipeline[] = ["INDIVIDUAL", "CORPORATE"];

/** AG-2-80 rule 2 (closing a lead; "Added to a prospect" and "Combined into another lead" are set only by the system),
 *  AG-2-44 rules 2-3 (losing a prospect; "Duplicate of another prospect" is a system reason) and AG-2-98 rule 5 ("Combined
 *  into another prospect", set only by Combine). Labels are AG-02's; keys are AG-02's where it names one, else fixed when
 *  made. A system reason can be renamed, never removed or turned off (fo_reason_fixed). */
export const REASONS: ReadonlyArray<{ kind: FoReasonKind; key: string; label: string; isSystem?: boolean }> = [
  { kind: "LEAD_CLOSE", key: "NOT_INTERESTED", label: "Not interested" },
  { kind: "LEAD_CLOSE", key: "JUNK_OR_SPAM", label: "Junk or spam" },
  { kind: "LEAD_CLOSE", key: "ADDED_TO_PROSPECT", label: "Added to a prospect", isSystem: true },
  { kind: "LEAD_CLOSE", key: "CANNOT_REACH", label: "Cannot reach" },
  { kind: "LEAD_CLOSE", key: "OUTSIDE_WHAT_WE_DO", label: "Outside what we do" },
  { kind: "LEAD_CLOSE", key: "COMBINED_LEAD", label: "Combined into another lead", isSystem: true },
  { kind: "PROSPECT_LOST", key: "NOT_ELIGIBLE", label: "Not eligible" },
  { kind: "PROSPECT_LOST", key: "PRICE", label: "Price" },
  { kind: "PROSPECT_LOST", key: "WENT_WITH_COMPETITOR", label: "Went with competitor" },
  { kind: "PROSPECT_LOST", key: "UNRESPONSIVE", label: "Unresponsive" },
  { kind: "PROSPECT_LOST", key: "NOT_READY", label: "Not ready or timing" },
  { kind: "PROSPECT_LOST", key: "DUPLICATE_PROSPECT", label: "Duplicate of another prospect", isSystem: true },
  { kind: "PROSPECT_LOST", key: "OTHER", label: "Other" },
  { kind: "PROSPECT_LOST", key: "COMBINED_PROSPECT", label: "Combined into another prospect", isSystem: true },
];

/** The web form every firm starts with: off, no consent wording yet (it cannot be turned on without one), no allowed
 *  site. Its words are Sample until the firm edits them. */
export const WEB_FORM = { name: "Website enquiry form", thankYouText: "Thank you. We have your enquiry and will be in touch soon." } as const;

export type FirmSeedResult = { firmId: string; seeded: boolean; stages: number; reasons: number; webForms: number; services: number };

/** The released, not retired combinations, each named by its place: its program chain from the top down, joined with
 *  " › ", and its own name when that differs from the last step ("Work permit › With an LMIA › Inside Canada", not
 *  "Inside Canada" alone: review m6; the same parts the app's trail shows, without the pathway type). A combination
 *  without a readable name (fo_sales_has_word, the migration's test in any script) is left out (break B6); a loop in the program
 *  chain is cut (break R2-8), so one bad row never stops a firm's seed. This is
 *  the firm's "Interested in" list in month one (AG-16-76). */
export async function releasedCombinations(db: PrismaClient | Prisma.TransactionClient): Promise<{ id: string; label: string }[]> {
  const rows = await db.$queryRaw<{ id: string; label: string; chain: string[] | null }[]>`
    with recursive up as (
      select c.id as cid, p.parent_node_key as parent, p.workspace_id as ws, p.label, 0 as depth, array[p.program_node_key] as seen
        from combination c join program_def p on p.id = c.program_def_id
      union all
      select up.cid, p.parent_node_key, up.ws, p.label, up.depth + 1, up.seen || p.program_node_key
        from up join program_def p on p.workspace_id = up.ws and p.program_node_key = up.parent
       where up.depth < 12 and not p.program_node_key = any(up.seen))
    select c.id::text as id, btrim(c.label) as label,
           (select array_agg(btrim(u.label) order by u.depth desc) from up u where u.cid = c.id and fo_sales_has_word(u.label)) as chain
      from combination c
     where c.retired_at is null and fo_sales_has_word(c.label)
       and exists (select 1 from config_release r where r.combination_id = c.id and r.status = 'RELEASED')`;
  return rows
    .map((r) => { const chain = r.chain ?? []; return { id: r.id, label: (chain.at(-1) === r.label ? chain : [...chain, r.label]).join(" › ") }; })
    .sort((a, b) => a.label.localeCompare(b.label) || a.id.localeCompare(b.id));
}

/** Firm states that get no front office (contracts §7 §1.1): a firm that left, or never finished setting up. */
const NOT_SEEDED = new Set(["DELETED", "ABANDONED"]);

/** Seeds one firm's front office inside the caller's transaction, once (see the header). A firm id that is no platform
 *  firm is refused. */
export async function seedFirmFrontOffice(tx: Prisma.TransactionClient, firmId: string, actor = SEED_ACTOR): Promise<FirmSeedResult> {
  const id = firmScope(firmId).firmId;
  const none: FirmSeedResult = { firmId: id, seeded: false, stages: 0, reasons: 0, webForms: 0, services: 0 };
  // Named here in words (the database refuses it too, fo_sales_setup_firm_exists, but Prisma reports only "foreign key").
  const firm = await tx.platformFirm.findUnique({ where: { id }, select: { status: true } });
  if (!firm) throw new Error(`firm-seed: ${id} is no platform firm`);
  if (NOT_SEEDED.has(firm.status)) return none;
  await tx.foSalesSetup.createMany({ data: [{ firmId: id }], skipDuplicates: true });
  // The row's lock is held to commit: a second seed of the same firm waits here and then sees seeded_at.
  const [setup] = await tx.$queryRaw<{ seeded_at: Date | null }[]>`select seeded_at from fo_sales_setup where firm_id = ${id}::uuid for update`;
  if (setup?.seeded_at) return none;

  const stages = await tx.foStage.createMany({
    data: PIPELINES.flatMap((pipeline) => STAGES.map((s, i) => ({ firmId: id, pipeline, key: s.key, label: s.label, kind: s.kind, sortOrder: i + 1 }))),
    skipDuplicates: true,
  });
  const reasons = await tx.foReason.createMany({
    data: REASONS.map((r, i) => ({ firmId: id, kind: r.kind, key: r.key, label: r.label, isSystem: r.isSystem ?? false, sortOrder: i + 1 })),
    skipDuplicates: true,
  });
  let webForms = 0;
  if ((await tx.foWebForm.count({ where: firmScope(id) })) === 0) {
    await tx.foWebForm.create({ data: { firmId: id, name: WEB_FORM.name, thankYouText: WEB_FORM.thankYouText, publicToken: randomBytes(24).toString("base64url"), enabled: false, updatedBy: actor } });
    webForms = 1;
  }
  const services = await tx.foService.createMany({
    data: (await releasedCombinations(tx)).map((c, i) => ({ firmId: id, label: c.label, combinationId: c.id, sortOrder: i + 1, createdBy: actor })),
    skipDuplicates: true,
  });
  await tx.foSalesSetup.update({ where: { firmId: id }, data: { seededAt: new Date(), seededBy: actor } });
  return { firmId: id, seeded: true, stages: stages.count, reasons: reasons.count, webForms, services: services.count };
}

/** The subscriber: a `firm.created` event (module_event's envelope; its firm_id is the new firm) seeds that firm's front
 *  office. Any other event type is ignored. At least once is safe: a repeat changes nothing. */
export async function onFirmCreated(db: PrismaClient, event: { type: string; firmId: string }): Promise<FirmSeedResult | null> {
  if (event.type !== EVENT.FIRM_CREATED) return null;   // the shared events contract (ports/events.ts) names it
  return db.$transaction((tx) => seedFirmFrontOffice(tx, event.firmId));
}

/** Catch-up over the outbox: every firm with a `firm.created` event and no seeded front office (so a missed or failed
 *  delivery is made good by the next run). One firm that fails is named in `failed` and the others still run (break B6). */
export async function seedCreatedFirms(db: PrismaClient): Promise<FirmSeedResult[] & { failed?: { firmId: string; error: string }[] }> {
  const firms = await db.$queryRaw<{ firm_id: string }[]>`select distinct e.firm_id::text as firm_id from module_event e
    join platform_firm f on f.id = e.firm_id
    where e.type = ${EVENT.FIRM_CREATED} and f.status not in ('DELETED', 'ABANDONED')
      and not exists (select 1 from fo_sales_setup s where s.firm_id = e.firm_id and s.seeded_at is not null)
    order by 1`;
  const out: FirmSeedResult[] & { failed?: { firmId: string; error: string }[] } = [];
  const failed: { firmId: string; error: string }[] = [];
  for (const f of firms) {
    try { out.push((await onFirmCreated(db, { type: EVENT.FIRM_CREATED, firmId: f.firm_id }))!); } catch (e) { failed.push({ firmId: f.firm_id, error: String(e).slice(0, 300) }); }
  }
  if (failed.length) out.failed = failed;
  return out;
}

/** Once for the two Sample firms (they are written by PF-3's seed, which raises no event). A Sample firm that is not
 *  there yet is named in `missing`, not an error: run PF-3's seed first. A firm whose seed fails is named in `failed`
 *  and the other still runs (one firm never stops the seed; #1742, Lead B). */
export async function seedSampleFirmsFrontOffice(db: PrismaClient): Promise<{ results: FirmSeedResult[]; missing: string[]; failed: { firmId: string; error: string }[] }> {
  const firms = await db.platformFirm.findMany({ where: { key: { in: [...SAMPLE_FIRM_KEYS] } }, select: { id: true, key: true }, orderBy: { key: "asc" } });
  const results: FirmSeedResult[] = [], failed: { firmId: string; error: string }[] = [];
  for (const f of firms) {
    try { results.push(await db.$transaction((tx) => seedFirmFrontOffice(tx, f.id))); } catch (e) { failed.push({ firmId: f.id, error: String(e).slice(0, 300) }); }
  }
  return { results, missing: SAMPLE_FIRM_KEYS.filter((k) => !firms.some((f) => f.key === k)), failed };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const { PrismaClient } = await import("@prisma/client");
  const url = process.env.DATABASE_URL ?? "postgresql://xr_studio@127.0.0.1:54329/xr_studio_demo";   // as core.ts DATABASE_URL
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url, options: "-c TimeZone=UTC" }) });
  try {
    const sample = await seedSampleFirmsFrontOffice(db), created = await seedCreatedFirms(db);
    // The failures are printed by name (an array's extra property is dropped by JSON.stringify; Devin review on #1742),
    // and any failure ends the command with exit code 1.
    const failed = [...sample.failed, ...(created.failed ?? [])];
    console.log(JSON.stringify({ sample, created: [...created], failed }));
    if (failed.length) process.exitCode = 1;
  } catch (e) {
    // Never an unhandled rejection (#1742, Lead B): the error is printed as JSON on stdout, exit code 1.
    console.log(JSON.stringify({ error: String(e).slice(0, 1000) }));
    process.exitCode = 1;
  } finally { await db.$disconnect(); }
}
