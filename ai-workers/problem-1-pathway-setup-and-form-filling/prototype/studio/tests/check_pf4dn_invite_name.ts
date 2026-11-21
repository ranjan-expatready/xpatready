// PF-4dn (brief lead-b-briefs/PF-4dn.md; AG-1-10, AG-1-69): the invite carries the person's name. Against the real
// routes of an isolated copy on the local stand-in: DW1 a named invite → accept → the staff member has that name ·
// DW2 a 121-character name or one with a control character → 422 in plain words (PF-28 part 2a), nothing stored · DW3 no name → accept
// uses the part of the email before the @, as before (and a resend keeps the name) · DW4 the Team screen's Invite people
// shows a labelled Name field per row (axe clean) whose value reaches the request. Seeds the Sample firms. US$0.
//   zsh studio/tools/isolated.sh pf4dn 4573 start PLATFORM_IDENTITY=local && tsx studio/tests/check_pf4dn_invite_name.ts 4573 xr_studio_pf4dn
import "reflect-metadata";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { createHash, randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { chromium, type Browser, type Page } from "playwright";
import { seedSampleFirms } from "../api/src/platform/seed-sample-firms.ts";
import { client, recorder } from "./runtime/api.ts";
const { default: AxeBuilder } = createRequire(import.meta.url)("@axe-core/playwright") as typeof import("@axe-core/playwright");
const PORT = Number(process.argv[2] ?? 4573), DBNAME = process.argv[3] ?? "xr_studio_pf4dn";
const BASE = `http://localhost:${PORT}`, TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const { ok, summary } = recorder();
const { sql: rawSql } = client(PORT, DBNAME);
const sql = (q: string) => rawSql(q).split("\n")[0].trim();
const run = Date.now().toString(36);
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: `postgresql://xr_studio@127.0.0.1:54329/${DBNAME}`, options: "-c TimeZone=UTC" }) });
await seedSampleFirms(db);

const ownerEmail = sql(`select email from platform_staff where actor_id = 'user-R'`);   // Owner + Case Manager (Sample)
const signIn = async (email: string) => {
  const r = await fetch(`${BASE}/api/platform/session/local`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ firmKey: "sample-firm", email, secondStep: true }) });
  const b = await r.json() as { token?: string; detail?: string };
  if (!b.token) throw new Error(`STOP  local sign-in refused (start the copy with PLATFORM_IDENTITY=local): ${b.detail}`);
  return b.token;
};
const call = async (tok: string, method: string, path: string, body?: unknown) => {
  const r = await fetch(`${BASE}/api${path}`, { method, headers: { authorization: `Bearer ${tok}`, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text(); let b: any = text; try { b = JSON.parse(text); } catch { /* text */ }
  return { status: r.status, body: b };
};
/** Accepts the invitation with this id (its token set to one the test knows; the email is not read). */
const accept = async (invitationId: string) => {
  const known = randomBytes(32).toString("base64url");
  sql(`update platform_invitation set token_hash = '${createHash("sha256").update(known).digest("hex")}' where id = '${invitationId}'`);
  const r = await fetch(`${BASE}/api/public/invitations/${known}/accept`, { method: "POST" });
  return { status: r.status, body: await r.json() as { staffId?: string; detail?: string } };
};
const nameOfStaff = (email: string) => sql(`select display_name from platform_staff where email = '${email}'`);
const invitations = (email: string) => Number(sql(`select count(*) from platform_invitation where email = '${email}'`));

const plan = sql(`select p.id || '|' || p.seats_limit from platform_subscription s join platform_plan p on p.id = s.plan_id join platform_firm f on f.id = s.firm_id where f.key = 'sample-firm' and s.status <> 'ENDED' limit 1`).split("|");
sql(`update platform_plan set seats_limit = ${Number(plan[1]) + 50} where id = '${plan[0]}'`);   // lent for this run, given back below
let browser: Browser | null = null;
try {
  const tok = await signIn(ownerEmail);

  // ----------------------------------------------------------------------------------------------------- DW1
  const named = `pf4dn-named-${run}@example.com`;
  const inv1 = await call(tok, "POST", "/platform/staff/invitations", { email: named, roles: ["READ_ONLY"], displayName: "  Client A Staff  " });
  const acc1 = inv1.status === 201 ? await accept(inv1.body.id) : null;
  ok("PF-4dn DW1 pass: an invite with displayName \"Client A Staff\" (spaces around it trimmed) → accept → the staff member's name is \"Client A Staff\"",
    inv1.status === 201 && acc1?.status === 200 && nameOfStaff(named) === "Client A Staff" && sql(`select display_name from platform_invitation where id = '${inv1.body.id}'`) === "Client A Staff", { inv1: inv1.body, acc1 });
  const max = `pf4dn-max-${run}@example.com`, n120 = "N".repeat(120);
  const inv120 = await call(tok, "POST", "/platform/staff/invitations", { email: max, roles: ["READ_ONLY"], displayName: n120 });
  ok("PF-4dn DW1 pass: a 120-character name (the most) is kept whole", inv120.status === 201 && sql(`select char_length(display_name) from platform_invitation where id = '${inv120.body.id}'`) === "120", inv120.body);

  // ----------------------------------------------------------------------------------------------------- DW2
  const long = `pf4dn-long-${run}@example.com`, ctrl = `pf4dn-ctrl-${run}@example.com`, nl = `pf4dn-nl-${run}@example.com`;
  const tooLong = await call(tok, "POST", "/platform/staff/invitations", { email: long, roles: ["READ_ONLY"], displayName: "N".repeat(121) });
  ok("PF-4dn DW2 fail: a 121-character name → 422 DISPLAY_NAME_TOO_LONG in plain words, and no invitation stored",
    tooLong.status === 422 && tooLong.body.code === "DISPLAY_NAME_TOO_LONG" && tooLong.body.detail === "The name is at most 120 characters." && invitations(long) === 0, tooLong.body);
  const sep = `pf4dn-sep-${run}@example.com`;
  const sepOnly = await call(tok, "POST", "/platform/staff/invitations", { email: sep, roles: ["READ_ONLY"], displayName: "\u2028" });
  ok("PF-4dn DW2 fail: a name of only a line separator (U+2028) → 422 DISPLAY_NAME_INVALID, never taken as no name", sepOnly.status === 422 && sepOnly.body.code === "DISPLAY_NAME_INVALID" && invitations(sep) === 0, sepOnly.body);
  const bad = await Promise.all([[ctrl, "Client\u0007A"], [nl, "Client\nA"]].map(([email, displayName]) => call(tok, "POST", "/platform/staff/invitations", { email, roles: ["READ_ONLY"], displayName })));
  ok("PF-4dn DW2 fail: a name with a control character (bell) or a line break → 422 DISPLAY_NAME_INVALID, nothing stored",
    bad.every((b) => b.status === 422 && b.body.code === "DISPLAY_NAME_INVALID") && invitations(ctrl) === 0 && invitations(nl) === 0, bad.map((b) => b.body));
  const notText = await call(tok, "POST", "/platform/staff/invitations", { email: `pf4dn-num-${run}@example.com`, roles: ["READ_ONLY"], displayName: 42 });
  ok("PF-4dn DW2 fail: a name that is not text → 422 naming displayName (PF-28 part 2a: the one input rule)", notText.status === 422 && notText.body.fields?.displayName === "This must be text.", notText.body);
  let dbRefused = false;
  try { sql(`update platform_invitation set display_name = ' padded ' where id = '${inv1.body.id}'`); } catch { dbRefused = true; }
  ok("PF-4dn DW2 fail: the database itself refuses an untrimmed name (the check holds the same rule)", dbRefused);

  // ----------------------------------------------------------------------------------------------------- DW3
  const plain = `pf4dn.plain-${run}@example.com`, blank = `pf4dn-blank-${run}@example.com`;
  const inv3 = await call(tok, "POST", "/platform/staff/invitations", { email: plain, roles: ["READ_ONLY"] });
  const acc3 = inv3.status === 201 ? await accept(inv3.body.id) : null;
  ok("PF-4dn DW3 neither: an invite with no name → accept uses the part of the email before the @, exactly as today",
    inv3.status === 201 && acc3?.status === 200 && nameOfStaff(plain) === plain.split("@")[0] && sql(`select coalesce(display_name, 'NULL') from platform_invitation where id = '${inv3.body.id}'`) === "NULL", { inv3: inv3.body, acc3 });
  const inv3b = await call(tok, "POST", "/platform/staff/invitations", { email: blank, roles: ["READ_ONLY"], displayName: "   " });
  ok("PF-4dn DW3 neither: a name of spaces only is no name (stored empty, accept falls back to the email)", inv3b.status === 201 && sql(`select coalesce(display_name, 'NULL') from platform_invitation where id = '${inv3b.body.id}'`) === "NULL", inv3b.body);
  const resent = await call(tok, "POST", `/platform/staff/invitations/${inv120.body.id}/resend`, {});
  ok("PF-4dn pass: a resend keeps the name on the new link's invitation", resent.status === 200 && sql(`select char_length(display_name) from platform_invitation where id = '${resent.body.id}'`) === "120", resent.body);

  // ----------------------------------------------------------------------------------------------------- DW4
  browser = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  await ctx.addInitScript((t) => { if (!sessionStorage.getItem("xr-staff-session")) sessionStorage.setItem("xr-staff-session", JSON.stringify({ token: t, expiresAt: Date.now() + 3_600_000 })); }, tok);
  const p: Page = await ctx.newPage();
  const errors: string[] = []; p.on("pageerror", (e) => errors.push(String(e)));
  const bodies: unknown[] = [];
  p.on("request", (r) => { if (r.method() === "POST" && new URL(r.url()).pathname === "/api/platform/staff/invitations") bodies.push(r.postDataJSON()); });
  await p.goto(`${BASE}/platform/team`); await p.locator("[data-seat-line]").waitFor({ timeout: 30_000 });
  await p.locator("[data-invite-open]").click();
  await p.getByLabel("Email, person 1").waitFor({ timeout: 15_000 });
  await p.getByRole("button", { name: "+ Add another person" }).click();
  const nameFields = await p.locator("[data-invite-name]").count();
  ok("PF-4dn DW4 screen: each invite row shows a Name field, labelled for screen readers (\"Name, person 1 (optional)\", \"… person 2 …\")",
    nameFields === 2 && await p.getByLabel("Name, person 1 (optional)").isVisible() && await p.getByLabel("Name, person 2 (optional)").isVisible(), nameFields);
  const r = await new AxeBuilder({ page: p }).withTags(TAGS).analyze();
  const serious = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  ok("PF-4dn DW4 screen: Invite people with the Name fields: axe finds no serious or critical WCAG A/AA violation", serious.length === 0, serious.map((v) => `${v.id}: ${v.nodes[0]?.target?.join(" ")}`).join(" | ") || undefined);
  const s1 = `pf4dn-ui1-${run}@example.com`, s2 = `pf4dn-ui2-${run}@example.com`;
  await p.getByLabel("Name, person 1 (optional)").fill("Client B Staff");
  await p.getByLabel("Email, person 1").fill(s1);
  await p.getByLabel("Email, person 2").fill(s2);   // row 2 without a name
  await p.locator("[data-send-invites]").click();
  for (let i = 0; i < 100 && invitations(s2) === 0; i++) await p.waitForTimeout(100);
  const sent = bodies as { email: string; displayName?: string }[];
  ok("PF-4dn DW4 screen: the Name typed on a row reaches the request and is stored; a row without a name sends none",
    sent.find((b) => b.email === s1)?.displayName === "Client B Staff" && sent.find((b) => b.email === s2) !== undefined && !("displayName" in (sent.find((b) => b.email === s2) ?? {}))
    && sql(`select display_name from platform_invitation where email = '${s1}'`) === "Client B Staff" && sql(`select coalesce(display_name, 'NULL') from platform_invitation where email = '${s2}'`) === "NULL", sent);
  // Review m1: a name the server refuses (an invisible character) shows on the Name field, never under Email.
  const s3 = `pf4dn-ui3-${run}@example.com`;
  await p.locator("[data-invite-open]").click(); await p.getByLabel("Email, person 1").waitFor({ timeout: 15_000 });
  await p.getByLabel("Email, person 1").fill(s3); await p.getByLabel("Name, person 1 (optional)").fill("Client\u200bD");
  await p.locator("[data-send-invites]").click();
  const nameErr = p.locator('[data-invite-row="1"]').getByText("The name has a line break or an invisible character. Type it again on one line.");
  await nameErr.waitFor({ timeout: 15_000 });   // fails loudly when the feedback never shows (WAY-OF-WORKING, Devin)
  ok("PF-4dn review m1 fail: a refused name shows on the Name field (aria-invalid there, not on Email), nothing stored",
    await nameErr.isVisible() && await p.getByLabel("Name, person 1 (optional)").getAttribute("aria-invalid") === "true" && await p.getByLabel("Email, person 1").getAttribute("aria-invalid") !== "true" && invitations(s3) === 0,
    { nameInvalid: await p.getByLabel("Name, person 1 (optional)").getAttribute("aria-invalid"), emailInvalid: await p.getByLabel("Email, person 1").getAttribute("aria-invalid") });
  ok("PF-4dn DW4 screen: no page error", errors.length === 0, errors);
} finally {
  sql(`update platform_plan set seats_limit = ${plan[1]} where id = '${plan[0]}'`);
  await browser?.close().catch(() => {});
  await db.$disconnect();
}
process.exit(summary() ? 1 : 0);
