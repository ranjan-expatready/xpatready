// C11.1 acceptance (qa/CAPABILITIES.md C11.1; P-102 wave 1, W1-02): "no extension, capture, pairing, online-fill or
// 'Add an online form' anywhere in the app; every PDF path still works." Written 3 Nov (F6, P-290) from the row: until
// then C11.1 was proven only by qa's walk script (tests/qa/check_qa_am_1027.cjs part B).
// 1. Gone: no API route and no web page for capture, pairing, the extension, screen maps or online forms (read from
//    the source), and the old addresses answer 404 (API) or "Page not found" with a way back (web), never 5xx.
// 2. Nowhere on screen: the menu, every studio page and Visitor visa's tabs never offer the extension, capture, pairing,
//    online fill or "Add an online form"; the only mention allowed is the decided "later wave" note.
// 3. An Online line: its Forms tab line says it needs the browser extension (later wave); Preview names it as later wave
//    with no Fill PDF; the Studio fill refuses it (409) in the later-wave words.
// 4. The PDF path still works: Visitor visa is released through it (intake, replayed field maps, release: its setup),
//    and the Studio fills IMM 5257 from the release, read back equal and intact.
// No model call (US$0). Needs first: Visitor visa's release 1 (tests/runtime/setup_visitor_visa.ts), else exit 2.
//   zsh studio/tools/isolated.sh accept 4475 start
//   tsx studio/tests/runtime/setup_visitor_visa.ts 4475 xr_studio_accept
//   tsx studio/acceptance/C11.1.test.ts 4475 xr_studio_accept
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { TABS } from "../contracts/workspace.ts";
import { planted, tsFiles } from "../tests/lib/ts-files.ts";
import { AUTHOR, pack2, run } from "./lib/pack2.ts";
import { walker } from "./lib/browser.ts";

const T = pack2("C11.1");
const { call, sql, ok, words } = T;
const GONE = /capture|pairing|\bpair\b|extension|screen-?maps?|online-forms?|online-versions?|online-fill/i;
/** Words that offer the later wave's features; allowed only inside the decided "later wave" note. "Extension" alone is
 *  also an immigration word ("Study permit extension"): only the browser extension, the extension as a menu item or an
 *  install step count; "pair" only with a device (not "compare each pair"). */
const OFFER = /\bbrowser extension\b|\b(install|pair|open|connect)(ing)? the extension\b|^\s*extensions?\s*$|\bcaptur(e|ed|ing)\b|\bpairing\b|\bpair(ed)? (with |a |the |this |your )?(device|browser|extension|phone|computer)\b|add an online form|\bfill online\b|\bonline fill\b/i;

run(async () => {
  await T.ready();
  const vv = T.combo(T.key("vv.single"));
  if (!vv || Number(sql(`select count(*) from config_release where combination_id='${vv}'`)) < 1) {
    console.error(`STOP  setup missing: Visitor visa has no release 1 yet. Run first: tsx studio/tests/runtime/setup_visitor_visa.ts ${T.PORT} ${T.DB}`);
    process.exit(2);
  }
  const STUDIO = join(import.meta.dirname, "..");

  // ---------------------------------------------------------------- 1. gone from the API and the web app
  // B120: api/src's subfolders too.
  const routesIn = (dir: string) => tsFiles(dir).flatMap((f) => [...readFileSync(join(dir, f), "utf8").matchAll(/@(?:Get|Post|Put|Patch|Delete|Controller)\("([^"]*)"\)/g)].map((m) => `${f}: ${m[1]}`));
  const api = routesIn(join(STUDIO, "api", "src"));
  ok("C11.1 fail (B120): a capture route planted in a subfolder is caught", routesIn(planted({ "features/x/planted.ts": '@Post("captures")' })).some((r) => GONE.test(r.split(": ")[1])));
  ok("C11.1 pass: no API route serves capture, pairing, the extension, screen maps or online forms (read from the controllers)", api.length > 50 && !api.some((r) => GONE.test(r.split(": ")[1])), api.filter((r) => GONE.test(r.split(": ")[1])));
  const routes = [...readFileSync(join(STUDIO, "web", "src", "App.tsx"), "utf8").matchAll(/path="([^"]+)"/g)].map((m) => m[1]);
  ok("C11.1 pass: no web page serves them (App.tsx routes)", routes.length > 10 && !routes.some((r) => GONE.test(r)), routes.filter((r) => GONE.test(r)));
  const gone: [string, string][] = [["POST", "/captures"], ["GET", "/captures"], ["GET", "/extension/sessions"], ["POST", "/extension/pair"], ["GET", "/portals"], ["GET", `/combinations/${vv}/online-forms`], ["POST", "/online-versions/x/screen-map/draft"]];
  const res: string[] = [];
  for (const [m, u] of gone) res.push(`${m} ${u} ${(await call(m, u, m === "GET" ? undefined : {}, AUTHOR)).status}`);
  ok("C11.1 fail: the old capture, pairing, portal and screen-map addresses answer 404, never 5xx", res.every((x) => x.endsWith(" 404")), res);

  const W = await walker(`http://localhost:${T.PORT}`);
  const p = await W.open(AUTHOR);
  for (const u of ["/extension", "/review/capture/x", "/review/screen-map/x"]) {
    await p.goto(u); await W.settle(p, u);
    const back = await p.getByRole("main").getByRole("link", { name: /^Back to / }).count(); // the page's own way back, not the menu
    ok(`C11.1 fail: ${u} shows "Page not found" with a way back`, (await p.getByText("Page not found").count()) >= 1 && back > 0, { notFound: await p.getByText("Page not found").count(), links: back });
  }

  // ---------------------------------------------------------------- 2. nowhere on screen (only the later-wave note)
  const pages = ["/", "/structure", "/review", "/review/proposals", "/library/forms", "/library/fields", "/library/sections", "/library/checks", "/library/documents", "/library/rules", "/release", "/releases", "/ai", "/activity", ...TABS.map((t) => `/c/${vv}/${t.key}`)];
  const offers: string[] = [];
  for (const u of pages) {
    await p.goto(u); await W.settle(p, u);
    for (const line of (await W.text(p)).split(/\n+/)) if (OFFER.test(line) && !/later wave/i.test(line)) offers.push(`${u}: ${line.trim().slice(0, 120)}`);
  }
  ok(`C11.1 pass: ${pages.length} pages (the menu, every studio page, Visitor visa's ${TABS.length} tabs) offer no extension, capture, pairing, online fill or "Add an online form"`, offers.length === 0, offers.slice(0, 6));
  const buttons = await p.getByRole("button", { name: /add an online form|pair|capture|extension/i }).count();
  ok("C11.1 pass: no button offers them on the combination page either", buttons === 0, buttons);

  // ---------------------------------------------------------------- 3. an Online line (set through the API: the channel choice is C1.6's)
  let r = await call("PATCH", `/combinations/${vv}/forms/IMM%205707/channel`, { channel: "ONLINE" }, AUTHOR);
  ok("setup: IMM 5707 is filed Online on Visitor visa's draft", r.status < 300, words(r));
  await p.goto(`/c/${vv}/forms`); await W.settle(p, "Forms tab");
  const forms = await W.text(p);
  ok("C11.1 pass: the Online line says it needs the browser extension (later wave), on the Forms tab", /needs the browser extension \(later wave\)/i.test(forms), forms.match(/.{0,60}later wave.{0,60}/i)?.[0] ?? "no later-wave words");
  await p.goto(`/c/${vv}/preview`); await W.settle(p, "Preview tab");
  const item = p.locator('[data-preview-form="IMM 5707"]').first();
  const prev = (await item.count()) ? await item.innerText() : "";
  ok("C11.1 pass: Preview names the Online line as later wave and offers no Fill PDF on it", /later wave/i.test(prev) && !/Fill PDF/i.test(prev), prev.replace(/\s+/g, " ").slice(0, 200) || "IMM 5707 is not on Preview");
  r = await call("POST", `/combinations/${vv}/fill`, { form: "IMM 5707", person: "principal", mode: "draft" }, AUTHOR);
  ok("C11.1 fail: the Studio fill of an Online line is refused (409) in the later-wave words", r.status === 409 && /later wave/i.test(words(r)), `${r.status} ${words(r)}`);
  r = await call("PATCH", `/combinations/${vv}/forms/IMM%205707/channel`, { channel: "PDF_UPLOAD" }, AUTHOR);
  ok("setup: IMM 5707 back to PDF upload", r.status < 300, words(r));

  // ---------------------------------------------------------------- 4. the PDF path still works
  const published = sql(`select jsonb_array_length(coalesce(snapshot->'forms','[]'::jsonb)) from config_release where combination_id='${vv}' order by version desc limit 1`);
  ok("C11.1 pass: Visitor visa is released through the PDF path (its release publishes its forms)", Number(published) > 0, { forms: published });
  r = await call("POST", `/combinations/${vv}/fill`, { form: "IMM 5257", person: "principal", mode: "release" }, AUTHOR);
  const rep = r.body?.report;
  ok("C11.1 pass: the Studio fills IMM 5257 from the release, read back equal and intact", r.status < 300 && rep?.intact === true && rep?.read_back_equal === rep?.written && Number(rep?.written) > 0, `${r.status} ${JSON.stringify(rep ?? words(r)).slice(0, 200)}`);
  ok("C11.1 data: no page error while walking", W.errors.length === 0, W.errors.slice(0, 3));
  await W.close();
  T.done();
});
