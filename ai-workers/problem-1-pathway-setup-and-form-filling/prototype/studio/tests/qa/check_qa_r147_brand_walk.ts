// qa gate A walk for R1.47 (map row 47, "Every email on both sides uses the one layout with the firm's branding, checked on
// every send path"), qa lane Q4, 21 Nov, after PF-13 part 1b (#2633). By screens where a screen exists, ending at the next
// capability's first step (R1.48: the lead page's Messages box reads the email's state):
//   B0 the firm's branding is set: colour and footer (PF-13 part 1a) and the logo (part 1b) by API as the Owner. The panel
//      is PF-13 part 2 (R1.23's row), so this setup is a stand-in for that screen, not part of R1.47;
//   B1 a visitor books on the firm's public booking page (browser): the confirmation carries the logo (stable link, width
//      and height), the colour rule, the footer and "Sent by", and the logo link serves the stored PNG;
//   B2 the Owner invites a staff member from the Team screen (browser): the invitation carries the same branded layout;
//   B3 firm B's invitation carries none of firm A's branding (walls);
//   B4 ends at R1.48's first step: the lead page's Messages box shows the visitor's email, from the firm's name.
// A firm email's HTML is shown on no screen (people read it in their mail client), so it is read from the demo inbox
// (GET /api/demo/platform-inbox), as J-48 does. Sample rows only; US$0, no model call. Run from prototype/:
//   zsh studio/tools/isolated.sh qa_r147 4471 start --ttl 30 PLATFORM_IDENTITY=local && trap 'zsh studio/tools/isolated.sh qa_r147 4471 stop' EXIT && tsx --tsconfig studio/api/tsconfig.json studio/tests/qa/check_qa_r147_brand_walk.ts qa_r147 4471
import "reflect-metadata";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { chromium, type Page } from "playwright";
import { copyFirmHoursTo } from "../../api/src/front-office/booking-seed.ts";
import { seedSampleFirmsFrontOffice } from "../../api/src/front-office/firm-seed.ts";
import { seedSampleFirms } from "../../api/src/platform/seed-sample-firms.ts";
import { client, recorder } from "../runtime/api.ts";
const { default: AxeBuilder } = createRequire(import.meta.url)("@axe-core/playwright") as typeof import("@axe-core/playwright");

const [NAME, PORT] = [process.argv[2] ?? "qa_r147", Number(process.argv[3] ?? 4471)];
const DBNAME = `xr_studio_${NAME}`, BASE = `http://localhost:${PORT}`, STUDIO = join(import.meta.dirname, "..", "..");
const SHOTS = join(STUDIO, "..", "..", "product", "qa", "reports", "2026-11-21-r147-q4", "screenshots"); mkdirSync(SHOTS, { recursive: true });
const HEADED = process.env.HEADED === "1";
const { ok, summary } = recorder();
const { sql: rawSql, until } = client(PORT, DBNAME);
const sql = (q: string) => rawSql(q).split("\n")[0].trim();
const run = Date.now().toString(36);
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: `postgresql://xr_studio@127.0.0.1:54329/${DBNAME}`, options: "-c TimeZone=UTC" }) });
type Ans = { status: number; body: any };   // eslint-disable-line @typescript-eslint/no-explicit-any -- API answers are read loosely, as in the other checks

// ------------------------------------------------------------------------------------------------ setup (Sample)
await seedSampleFirms(db);
const fo = await seedSampleFirmsFrontOffice(db);
const firm = (key: string) => { const [id, name, contact] = sql(`select id || '|' || operating_name || '|' || contact_email from platform_firm where key = '${key}'`).split("|"); return { id, name, contact }; };
const A = firm("sample-firm"), B = firm("sample-solo");
ok("R1.47 setup: both Sample firms and their front office are seeded", !!A.id && !!B.id && fo.failed.length === 0, fo.failed);
const staff = (actor: string) => { const [id, email] = sql(`select id || '|' || email from platform_staff where actor_id = '${actor}'`).split("|"); return { id, email }; };
const R = staff("user-R"), O = staff("user-O"), S = staff("user-S");
if (sql(`select count(*) from fo_consultation_type where firm_id = '${A.id}' and slug = 'free'`) === "0") {
  await copyFirmHoursTo(db, A.id, [O.id]);
  await db.foConsultationType.create({ data: { firmId: A.id, slug: "free", name: "Free consultation", modes: ["VIDEO"], hostStaffIds: [O.id], minutes: 30, windowDays: 60 } });
}
async function signIn(firmKey: string, email: string): Promise<string> {
  const r = await fetch(`${BASE}/api/platform/session/local`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ firmKey, email, secondStep: true }) });
  const b = await r.json() as { token?: string; detail?: string }; if (b.token) return b.token;
  console.error(`STOP  local sign-in refused for ${email} (start the copy with PLATFORM_IDENTITY=local): ${b.detail}`); process.exit(2);
}
const tok = { R: await signIn("sample-firm", R.email), S: await signIn("sample-solo", S.email) };
const api = async (t: string | null, method: string, path: string, body?: unknown): Promise<Ans> => {
  const r = await fetch(`${BASE}/api${path}`, { method, headers: { "content-type": "application/json", ...(t ? { authorization: `Bearer ${t}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await r.text(); let b: unknown = text; try { b = JSON.parse(text); } catch { /* text */ } return { status: r.status, body: b };
};
type Mail = { from: string; reply_to: string | null; subject: string; html: string };
const inbox = async (address: string, want = 1): Promise<Mail[]> => {
  let m: Mail[] = [];
  await until(async () => { m = (await api(null, "GET", `/demo/platform-inbox?address=${encodeURIComponent(address)}`)).body?.messages ?? []; return m.length >= want; }, 90_000);
  return m;
};

const browser = await chromium.launch({ headless: !HEADED, slowMo: HEADED ? 250 : 0, ...(process.platform === "darwin" ? { channel: "chrome" } : existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
const errors: string[] = [];
async function pageAs(t: string | null): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" }), p = await ctx.newPage();
  if (t) await ctx.addInitScript((x) => sessionStorage.setItem("xr-staff-session", JSON.stringify({ token: x, expiresAt: Date.now() + 3_600_000 })), t);
  p.on("pageerror", (e) => errors.push(String(e))); return p;
}
const shot = (p: Page, name: string) => p.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: true });
const axeOf = async (p: Page, name: string) => { const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze(); ok(`R1.47 ${name}: axe finds no WCAG A/AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id}: ${v.nodes.length}`)); };

const plans = [A, B].map((f) => sql(`select p.id || '|' || p.seats_limit from platform_plan p join platform_subscription s on p.id = s.plan_id where s.firm_id = '${f.id}' and s.status <> 'ENDED' limit 1`).split("|"));
for (const [id, seats] of plans) sql(`update platform_plan set seats_limit = ${Number(seats) + 10} where id = '${id}'`);
const invited: [string, string][] = [];
const COLOUR = "#0b5394", FOOTER = `Sample Firm Immigration · 1 Sample Street, Toronto · Licence R000000 (Sample) ${run}`;
try {
  // ---------------------------------------------------------------------------------------------- B0 branding set (stand-in for PF-13 part 2's panel)
  const put = await api(tok.R, "PUT", "/platform/branding", { colour: COLOUR, footer: FOOTER });
  const png = readFileSync(join(STUDIO, "tests", "fixtures", "file-types", "sample.png"));
  const fd = new FormData(); fd.append("file", new Blob([png], { type: "image/png" }), "logo.png");
  const up = await fetch(`${BASE}/api/platform/branding/logo`, { method: "PUT", headers: { authorization: `Bearer ${tok.R}` }, body: fd });
  const upBody = await up.json().catch(() => null);
  ok("R1.47 B0 setup (by API; the panel is PF-13 part 2, R1.23): the Owner sets the colour, footer and a PNG logo", put.status < 300 && up.status < 300, [put.status, put.body, up.status, upBody]);

  const branded = (m: Mail | undefined) => {
    const h = m?.html ?? "", img = /<img[^>]+src="([^"]+\/api\/public\/firms\/sample-firm\/branding\/logo\?v=[^"]+)"[^>]*>/.exec(h);
    return { logo: img?.[1]?.replace(/&amp;/g, "&") ?? null, sized: !!img && /width="\d+"/.test(img[0]) && /height="\d+"/.test(img[0]),
      colour: h.toLowerCase().includes(`3px solid ${COLOUR}`), footer: h.includes(run) && h.includes("Licence R000000"), sentBy: h.includes(`Sent by ${A.name}`) };
  };
  const allOf = (b: ReturnType<typeof branded>) => !!b.logo && b.sized && b.colour && b.footer && b.sentBy;

  // ---------------------------------------------------------------------------------------------- B1 a visitor books (screens)
  const visitor = `qa147.visitor.${run}@example.com`, v = await pageAs(null);
  await v.goto(`${BASE}/book/sample-firm`); await v.locator("[data-type-card]").first().waitFor({ timeout: 30_000 });
  await v.getByRole("link", { name: "Choose Free consultation" }).click(); await v.getByRole("heading", { name: "Choose a time" }).waitFor();
  const days = v.locator('[role="group"] button:not([disabled])');
  for (let i = 0; i < 3 && (await days.count()) === 0; i++) { await v.getByRole("button", { name: "Next month" }).click(); await v.waitForTimeout(800); }
  await days.first().click(); await v.locator("[data-day-times] li button").first().click();
  await v.getByRole("heading", { name: "Your details" }).waitFor();
  await v.getByLabel("Given names").fill("Visitor"); await v.getByLabel("Family name").fill(`Sample ${run}`); await v.getByLabel("Email").fill(visitor);
  await v.waitForTimeout(3500);
  await v.getByRole("button", { name: "Book this time" }).click();
  await v.locator('[data-public-state="booked"]').waitFor({ timeout: 20_000 });
  await shot(v, "B1-booked-1440");
  const vMail = await inbox(visitor), b1 = branded(vMail[0]);
  ok("R1.47 B1 pass: the booking confirmation (booked by screens) carries the firm's logo by its stable link with width and height, the brand colour rule, the footer and \"Sent by\"", allOf(b1), b1);
  const logo = b1.logo ? await fetch(b1.logo.startsWith("http") ? b1.logo : `${BASE}${b1.logo}`) : null;
  const bytes = logo ? Buffer.from(await logo.arrayBuffer()) : Buffer.alloc(0);
  ok("R1.47 B1 pass: the email's logo link serves the stored PNG (200, image/png, nosniff), with no sign-in", !!logo && logo.status === 200 && logo.headers.get("content-type") === "image/png" && logo.headers.get("x-content-type-options") === "nosniff" && bytes.subarray(1, 4).toString() === "PNG", [logo?.status, logo?.headers.get("content-type"), bytes.length]);

  // ---------------------------------------------------------------------------------------------- B2 the Owner invites (screens)
  const invitee = `qa147-invitee-${run}@sample-firm.example.com`, owner = await pageAs(tok.R);
  await owner.goto(`${BASE}/platform/team`); await owner.locator("[data-seat-line]").waitFor({ timeout: 30_000 });
  await owner.locator("[data-invite-open]").click(); await owner.getByLabel("Email, person 1").fill(invitee);
  await owner.locator("[data-send-invites]").click();
  const iMail = await inbox(invitee), b2 = branded(iMail[0]);
  const invId = sql(`select id from platform_invitation where firm_id = '${A.id}' and email = '${invitee}' order by created_at desc limit 1`); if (invId) invited.push([tok.R, invId]);
  ok("R1.47 B2 pass: the staff invitation (sent from the Team screen) carries the same branded layout and the same logo link as B1", allOf(b2) && b2.logo === b1.logo, b2);
  await owner.keyboard.press("Escape");

  // ---------------------------------------------------------------------------------------------- B3 walls
  const bInvitee = `qa147-invitee-${run}@sample-solo.example.com`, bInv = await api(tok.S, "POST", "/platform/staff/invitations", { email: bInvitee, roles: ["CASE_OFFICER"] });
  if (bInv.body?.id) invited.push([tok.S, bInv.body.id]);
  const bMail = await inbox(bInvitee), bh = bMail[0]?.html ?? "";
  ok("R1.47 B3 fail: firm B's invitation carries none of firm A's branding (no A logo link, colour, footer or name)", bMail.length === 1 && !bh.includes("/firms/sample-firm/") && !bh.toLowerCase().includes(COLOUR) && !bh.includes(run) && !bh.includes(`Sent by ${A.name}`) && bh.includes(`Sent by ${B.name}`), bh.slice(0, 300));

  // ---------------------------------------------------------------------------------------------- B4 ends at R1.48's first step
  await until(async () => sql(`select count(*) from fo_lead l join fo_person p on p.id = l.person_id where l.firm_id = '${A.id}' and lower(p.email) = '${visitor}'`) !== "0", 60_000);
  const leadId = sql(`select l.id from fo_lead l join fo_person p on p.id = l.person_id where l.firm_id = '${A.id}' and lower(p.email) = '${visitor}' order by l.created_at desc limit 1`);
  await owner.goto(`${BASE}/front-office/leads/${leadId}`);
  const box = owner.locator("[data-messages-panel]"); await box.locator("[data-message]").first().waitFor({ timeout: 30_000 });
  const boxText = await box.innerText(); await box.scrollIntoViewIfNeeded(); await shot(owner, "B4-lead-messages-1440");
  ok("R1.47 B4 (ends at R1.48's first step): the lead page's Messages box lists the visitor's branded email with its state in words, from the firm's name", !!leadId && (await box.locator("[data-state-word]").count()) >= 1 && boxText.includes(`from ${A.name}`), { leadId, boxText: boxText.slice(0, 300) });
  await axeOf(owner, "B4 the lead page with its Messages box");
  ok("R1.47 no page errors in the walk", errors.length === 0, errors);
} finally {
  for (const [t, id] of invited) await api(t, "POST", `/platform/staff/invitations/${id}/revoke`).catch(() => undefined);
  await api(tok.R, "DELETE", "/platform/branding/logo").catch(() => undefined);
  for (const [id, seats] of plans) sql(`update platform_plan set seats_limit = ${seats} where id = '${id}'`);
  await browser.close(); await db.$disconnect();
}
process.exit(summary() ? 1 : 0);
