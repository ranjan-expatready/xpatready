// Browser helpers for the acceptance packs that walk screens (C3.10, C11.1, C11.17; written 3 Nov, F6). One Chromium,
// one context per person (the simulated person is chosen as the app does: localStorage "xr-actor"), page errors
// collected. A page is read only once it has settled: the network is idle and no "Loading" text is left; a page that
// does not settle in time throws (a wait a test relies on fails loudly, WAY-OF-WORKING). US$0: no model call.
import { existsSync } from "node:fs";
import { chromium, type Browser, type Page } from "playwright";

export type Walker = { browser: Browser; errors: string[]; open: (actor: string, width?: number) => Promise<Page>; settle: (p: Page, what: string) => Promise<void>; text: (p: Page) => Promise<string>; close: () => Promise<void> };

export async function walker(base: string): Promise<Walker> {
  // The channel "chrome" as the suites use it (cloud-setup.sh links the image's Chromium there on Linux); else Chromium.
  const browser = await chromium.launch(existsSync("/opt/google/chrome/chrome") || process.platform === "darwin" ? { channel: "chrome", headless: !process.env.QA_HEADED } : { headless: !process.env.QA_HEADED });
  const errors: string[] = [];
  const open = async (actor: string, width = 1440) => {
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, baseURL: base });
    await ctx.addInitScript((a) => { try { localStorage.setItem("xr-actor", a); } catch { /* private window */ } }, actor);
    const p = await ctx.newPage();
    p.on("pageerror", (e) => errors.push(`${p.url()}: ${String(e).slice(0, 200)}`));
    return p;
  };
  /** Waits until the page has settled; throws with the page's address when it has not within 30 s. */
  const settle = async (p: Page, what: string) => {
    await p.waitForLoadState("networkidle", { timeout: 30_000 }).catch((e) => { throw new Error(`${what}: the page did not settle in 30 s (${p.url()}): ${String(e).slice(0, 120)}`); });
    const start = Date.now();
    while (/\bLoading\b/.test(await p.locator("body").innerText())) {
      if (Date.now() - start > 30_000) throw new Error(`${what}: still "Loading" after 30 s (${p.url()})`);
      await p.waitForTimeout(250);
    }
  };
  /** Everything a person reads on the page: the visible text plus button names, tooltips and placeholders. */
  const text = (p: Page) => p.evaluate(() => {
    const attrs = [...document.querySelectorAll("[title],[aria-label],[placeholder]")].flatMap((e) => ["title", "aria-label", "placeholder"].map((a) => e.getAttribute(a) ?? "")).filter(Boolean);
    return `${document.body.innerText}\n${attrs.join("\n")}`.replace(/[ \t]+/g, " ");
  });
  return { browser, errors, open, settle, text, close: () => browser.close() };
}
