import { chromium } from "playwright";
export async function start(port, out, actor = "user-O", width = 1440) {
  const b = await chromium.launch({ channel: "chrome" });
  const ctx = await b.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 2, baseURL: `http://127.0.0.1:${port}`, acceptDownloads: true });
  await ctx.addInitScript((a) => localStorage.setItem("xr-actor", a), actor);
  const p = await ctx.newPage();
  const errors = []; p.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
  p.on("response", (r) => { if (r.status() >= 500) errors.push(`${r.status()} ${r.url()}`); });
  const shot = async (name, loc, full) => { const f = `${out}/${name}.png`; if (loc) { await loc.scrollIntoViewIfNeeded(); await loc.screenshot({ path: f }); } else await p.screenshot({ path: f, fullPage: !!full }); console.log(`[shot] ${name}.png`); };
  const say = (k, v) => console.log(`[${k}] ${String(v).replace(/\s+/g, " ").slice(0, 1500)}`);
  return { b, ctx, p, errors, shot, say };
}
