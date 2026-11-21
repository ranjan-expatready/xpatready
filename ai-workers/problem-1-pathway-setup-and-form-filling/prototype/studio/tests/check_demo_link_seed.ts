// DEMO-LINK (review M2): the Sample consultation type seed (api/src/front-office/booking-seed.ts) on an isolated copy
// started with the Sample seed on (isolated.sh's default), so the start-up path is the one tested. A pass and a fail each:
// (0) start-up added it and the public booking page lists it; (i) a second seed adds nothing and leaves the hours as they
// are; (ii) a type a person deleted (soft) is never re-added; (iii) the Sample solo practice gets no type and keeps its
// hours; (iv) the host's hours are copied only when they have none, never over hours they have. A slug a person changed
// gets a fresh Sample type (matched by slug only). No browser, no model call (US$0).
//   zsh studio/tools/isolated.sh demolink_seed 4660 start && tsx studio/tests/check_demo_link_seed.ts 4660 xr_studio_demolink_seed
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { SAMPLE_TYPE, seedSampleConsultationType, windowsOf } from "../api/src/front-office/booking-seed.ts";
import { BUSINESS_HOURS, readSetting } from "../api/src/platform/settings.ts";

const PORT = Number(process.argv[2] ?? 4660), DB = process.argv[3] ?? "xr_studio_demolink_seed", BASE = `http://localhost:${PORT}`;
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: `postgresql://xr_studio@127.0.0.1:54329/${DB}`, options: "-c TimeZone=UTC" }) });
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 400)}` : ""}`); };
const one = async <T>(q: Promise<T[]>) => (await q)[0];
const n = async (q: TemplateStringsArray, ...v: unknown[]) => Number((await one(db.$queryRaw<{ c: bigint }[]>(q, ...v))).c);

try {
  const firm = await db.platformFirm.findUniqueOrThrow({ where: { key: "sample-firm" }, select: { id: true } });
  const solo = await db.platformFirm.findUniqueOrThrow({ where: { key: "sample-solo" }, select: { id: true } });
  const host = await db.platformStaff.findFirstOrThrow({ where: { firmId: firm.id, actorId: SAMPLE_TYPE.hostActorId }, select: { id: true } });
  const soloOwner = await db.platformStaff.findFirstOrThrow({ where: { firmId: solo.id, actorId: "user-S" }, select: { id: true } });
  const types = () => n`select count(*) as c from fo_consultation_type where firm_id = ${firm.id}::uuid and slug = ${SAMPLE_TYPE.slug}`;
  const hours = (staff: string) => n`select count(*) as c from fo_availability where staff_id = ${staff}::uuid`;
  const soloTypes = () => n`select count(*) as c from fo_consultation_type where firm_id = ${solo.id}::uuid`;
  const firmWindows = windowsOf(await readSetting(db, firm.id, BUSINESS_HOURS.key)).length;
  const soloHours0 = await hours(soloOwner.id);

  // (0) the start-up seed (PLATFORM_SAMPLE_SEED=on) added it, and the public page lists it.
  const list = await fetch(`${BASE}/api/public/firms/sample-firm/book`).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));
  ok("DEMO-LINK (0) pass: the start-up seed added one \"Free consultation (Sample)\" and the public booking page lists it (30 minutes)",
    await types() === 1 && list.status === 200 && list.body?.types?.some((t: { name: string; minutes: number }) => t.name === SAMPLE_TYPE.name && t.minutes === 30), list);
  ok("DEMO-LINK (0) fail: the type carries no fee or official value: a free consultation, words marked Sample",
    await n`select count(*) as c from fo_consultation_type where firm_id = ${firm.id}::uuid and slug = ${SAMPLE_TYPE.slug} and purpose = 'FREE_CONSULT' and name like '%(Sample)%' and description like '%Sample%'` === 1);

  // (i) seed twice.
  const hours1 = await hours(host.id);
  const again = await seedSampleConsultationType(db, "check");
  ok("DEMO-LINK (i) pass: seeding again keeps one type and the host's hours as they were", await types() === 1 && await hours(host.id) === hours1 && hours1 === firmWindows, { hours1, firmWindows });
  ok("DEMO-LINK (i) fail: the second seed adds nothing (answers false)", again === false);

  // (ii) a person deletes it (soft): never re-added.
  await db.$executeRaw`update fo_consultation_type set deleted_at = now() where firm_id = ${firm.id}::uuid and slug = ${SAMPLE_TYPE.slug}`;
  const afterDelete = await seedSampleConsultationType(db, "check");
  const listed = await fetch(`${BASE}/api/public/firms/sample-firm/book`).then((r) => r.json()).catch(() => null);
  ok("DEMO-LINK (ii) pass: the deleted type stays deleted (one row, deleted) and the public page no longer lists it",
    await types() === 1 && await n`select count(*) as c from fo_consultation_type where firm_id = ${firm.id}::uuid and slug = ${SAMPLE_TYPE.slug} and deleted_at is not null` === 1
      && !listed?.types?.some((t: { name: string }) => t.name === SAMPLE_TYPE.name), listed);
  ok("DEMO-LINK (ii) fail: seeding after the delete does not add it back (answers false)", afterDelete === false);

  // (iv) the host's hours are copied only when they have none. A person changes the deleted type's slug, so the seed adds
  // a fresh one (matched by slug only); the host has no hours first, then hours of their own.
  await db.$executeRaw`update fo_consultation_type set slug = 'renamed-by-a-person' where firm_id = ${firm.id}::uuid and slug = ${SAMPLE_TYPE.slug}`;
  await db.$executeRaw`delete from fo_availability where staff_id = ${host.id}::uuid`;
  await db.$executeRaw`delete from fo_availability_set where staff_id = ${host.id}::uuid`;
  const fresh = await seedSampleConsultationType(db, "check");
  ok("DEMO-LINK (iv) pass: a host with no hours gets the firm's hours with the fresh type (slug changed by a person)", fresh === true && await types() === 1 && await hours(host.id) === firmWindows, { fresh, hours: await hours(host.id), firmWindows });
  await db.$executeRaw`update fo_consultation_type set slug = 'renamed-again' where firm_id = ${firm.id}::uuid and slug = ${SAMPLE_TYPE.slug}`;
  await db.$executeRaw`delete from fo_availability where staff_id = ${host.id}::uuid and id not in (select id from fo_availability where staff_id = ${host.id}::uuid order by weekday, start_minute limit 1)`;
  const own = await seedSampleConsultationType(db, "check");
  ok("DEMO-LINK (iv) fail: a host who has hours of their own keeps them (one window stays one window)", own === true && await types() === 1 && await hours(host.id) === 1, { own, hours: await hours(host.id) });

  // (iii) the Sample solo practice is never touched.
  ok("DEMO-LINK (iii) pass: the Sample solo practice's owner keeps the hours they had", await hours(soloOwner.id) === soloHours0, { soloHours0, now: await hours(soloOwner.id) });
  ok("DEMO-LINK (iii) fail: the Sample solo practice gets no consultation type", await soloTypes() === 0);
} catch (e) {
  ok("DEMO-LINK: the suite ran to its end", false, String(e).slice(0, 400));
} finally { await db.$disconnect(); }
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
