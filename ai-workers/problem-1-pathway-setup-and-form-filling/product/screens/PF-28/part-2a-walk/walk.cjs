// PF-28 part 2a walk: a person's journey through the identity doors at 1440 px, on an isolated copy (argv: port, shots dir).
const { chromium } = require("playwright");
const [port, shots] = process.argv.slice(2), BASE = `http://localhost:${port}`;
const log = (ok, s) => { console.log(`${ok ? "PASS" : "FAIL"}  ${s}`); if (!ok) process.exitCode = 1; };
(async () => {
  const tok = (await (await fetch(`${BASE}/api/platform/session/local`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ firmKey: "sample-firm", actorId: "user-R", secondStep: true }) })).json()).token;
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript((t) => { if (!sessionStorage.getItem("xr-staff-session")) sessionStorage.setItem("xr-staff-session", JSON.stringify({ token: t, expiresAt: Date.now() + 3600000 })); }, tok);
  const p = await ctx.newPage(), bad = [];
  p.on("response", (r) => { const u = new URL(r.url()); if (u.pathname.startsWith("/api/platform") && r.status() >= 400 && r.status() !== 404) bad.push(`${r.request().method()} ${u.pathname} ${r.status()}`); });
  p.on("dialog", (d) => void d.accept());
  const shot = (n) => p.screenshot({ path: `${shots}/${n}.png`, fullPage: false });
  // 1. Team
  await p.goto(`${BASE}/platform/team`); await p.locator("[data-seat-line]").waitFor({ timeout: 30000 }); await shot("1-team");
  log(true, "Team opens with the seat line");
  // 2. Invite one person
  const email = `pf28.walk.${Date.now().toString(36)}@example.com`;
  await p.locator("[data-invite-open]").click(); await p.getByLabel("Email, person 1").fill(email); await shot("2-invite");
  const inv = p.waitForResponse((r) => r.url().endsWith("/api/platform/staff/invitations") && r.request().method() === "POST");
  await p.locator("[data-send-invites]").click(); const ir = await inv;
  log(ir.status() === 201, `Invite people → POST staff/invitations ${ir.status()}`);
  await p.locator('[data-chip="invited"]').click(); await p.locator(`[data-team-row="${email}"]`).waitFor({ timeout: 10000 }); await shot("3-invited");
  log(true, "the invitation shows under Invited");
  // 3. A person's roles: add Read only, save
  await p.goto(`${BASE}/platform/team`); await p.locator("[data-seat-line]").waitFor();
  const target = "second.representative@sample-firm.example.com";   // the Sample Case Manager (user-T)
  await p.locator(`[data-team-row="${target}"]`).getByRole("button").click(); await p.locator("[data-person-roles]").waitFor();
  const ro = p.locator('[data-person-roles] [data-role="READ_ONLY"]'); const had = await ro.isChecked(); await (had ? ro.uncheck() : ro.check());
  const rr = p.waitForResponse((r) => /\/roles$/.test(r.url())); await p.locator("[data-save-roles]").click(); const rres = await rr; await shot("4-roles");
  log(rres.status() === 200, `Save roles for ${target} → PATCH staff/:id/roles ${rres.status()}`);
  // 4. Deactivate with no reason (server words), then with a reason, then reactivate
  await p.locator("[data-deactivate]").click(); await p.locator("[data-act-confirm]").click(); await p.locator("[data-act-error]").waitFor({ timeout: 10000 });
  const words = await p.locator("[data-act-error]").innerText(); await shot("5-deactivate-no-reason");
  log(/Give a deactivation reason/.test(words), `Deactivate without a reason shows the server's words: "${words.slice(0, 80)}"`);
  await p.locator("[data-act-reason]").fill("PF-28 walk"); const dr = p.waitForResponse((r) => /deactivate$/.test(r.url())); await p.locator("[data-act-confirm]").click();
  log((await dr).status() === 200, "Deactivate with a reason → 200");
  await p.goto(`${BASE}/platform/team`); await p.locator("[data-seat-line]").waitFor(); await p.locator('[data-chip="inactive"]').click();
  await p.locator(`[data-team-row="${target}"]`).getByRole("button").click(); await p.locator("[data-reactivate]").click();
  if (await p.locator("[data-act-reason]").count()) await p.locator("[data-act-reason]").fill("PF-28 walk back");
  const ar = p.waitForResponse((r) => /reactivate$/.test(r.url())); await p.locator("[data-act-confirm]").click();
  log((await ar).status() === 200, "Reactivate → 200");
  // 5. My licence
  await p.goto(`${BASE}/account/licence`); await p.locator("[data-licence-form]").waitFor({ timeout: 20000 });
  await p.locator("[data-licence-type]").selectOption({ index: 1 }); await p.locator("[data-licence-body]").selectOption({ index: 1 }); await p.locator("[data-licence-number]").fill("R700001");
  const lr = p.waitForResponse((r) => r.url().endsWith("/api/platform/me/account") && r.request().method() === "PUT"); await p.locator("[data-licence-form] button[type=submit]").click(); const lres = await lr;
  await p.waitForTimeout(500); await shot("6-licence");
  log(lres.status() === 200, `Save my licence → PUT me/account ${lres.status()}`);
  log(bad.length === 1 && /deactivate 422/.test(bad[0]), `the only refused call is the reason-less deactivate (422, by design): ${JSON.stringify(bad)}`);
  await b.close();
})().catch((e) => { console.log(`FAIL  ${e.message.split("\n")[0]}`); process.exit(1); });
