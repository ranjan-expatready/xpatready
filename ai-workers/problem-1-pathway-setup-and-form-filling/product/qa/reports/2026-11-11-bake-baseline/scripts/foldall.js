const B = "http://localhost:4471", C = "/c/61e2b76c-22cc-41ad-b147-60819bc4bf39", CASE = "/cases/0cb510ab-d21f-45d4-81d3-c0b9633a0419";
const measure = async () => page.evaluate(() => [...document.querySelectorAll("summary")].filter((s) => s.getBoundingClientRect().width > 0 || s.closest("details")).map((s) => {
  const cs = getComputedStyle(s); const icon = !!s.querySelector("svg");
  return { t: s.innerText.replace(/\s+/g, " ").slice(0, 50), arrow: (cs.display === "list-item" && cs.listStyleType !== "none") || icon, d: cs.display };
}));
const out = {};
const go = async (name, url, actor) => {
  if (actor) await page.evaluate((a) => { localStorage.setItem("xr-actor", a); }, actor).catch(() => {});
  await page.goto(B + url); await page.waitForTimeout(2500);
  const m = await measure(); const uniq = {}; for (const x of m) { const k = x.t.replace(/\d+/g, "n"); uniq[k] = uniq[k] || { ...x, n: 0 }; uniq[k].n++; }
  out[name] = { total: m.length, noArrow: m.filter((x) => !x.arrow).length, kinds: Object.values(uniq).map((x) => `${x.arrow ? "arrow" : "NO-ARROW"} ×${x.n} ${x.t} [${x.d}]`) };
};
await page.goto(B + "/"); await page.evaluate(() => localStorage.setItem("xr-actor", "user-A"));
for (const [n, u] of [["programs", "/"], ["combination overview", C], ["combination Forms", C + "/forms"], ["combination SQR", C + "/questionnaires"], ["combination Preview", C + "/preview"], ["combination Tests", C + "/tests"], ["combination Review and release", C + "/review"], ["To review", "/review"], ["Review and release (shared)", "/release"], ["Cases list", "/cases"]]) await go(n, u);
console.log("FOLDALL:" + JSON.stringify(out, null, 1));
