// QA-22 (UX, Minor; C1.1, EXPERIENCE feedback and state): while the page's "who am I" request (/api/session) is still on
// its way, the Programs page treats the configuration author as someone who cannot author (web/src/pages/programs.tsx:47
// canAuthor = duties of a session not loaded yet → false): on an empty catalogue the author reads "A configuration author
// adds combinations here." and New combination is disabled, until the session arrives. Seen in 2 of 4 runs of J1 on a
// freshly started copy (after-merge 24 Oct, db468e3). This check makes it deterministic by holding /api/session for 1.5 s,
// as a slow network or a busy server does. PASSES when, while the session loads, the page shows neither the non-author
// message nor a disabled New combination to the author (a neutral loading state, or the author's own message).
// Fresh isolated copy, nothing loaded (an empty catalogue). No model call.
//   zsh studio/tools/isolated.sh qa_j5 4477 start && node studio/tests/qa/check_qa22_author_flash.cjs http://localhost:4477
const { chromium } = require("../../node_modules/playwright");
const BASE = process.argv[2] ?? "http://localhost:4477";
(async () => {
  const b = await chromium.launch({ channel: "chrome" });
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await p.route("**/api/session**", async (r) => { await new Promise((res) => setTimeout(res, 1500)); await r.continue(); });
  await p.goto(`${BASE}/`);
  await p.getByText(/No combinations in Individual yet/).waitFor({ timeout: 15000 });
  const during = (await p.innerText("main")).replace(/\s+/g, " ");
  const disabled = await p.getByRole("button", { name: "New combination" }).first().isDisabled().catch(() => null);
  await p.waitForTimeout(2000);
  const after = (await p.innerText("main")).replace(/\s+/g, " ");
  const wrong = /A configuration author adds combinations here/.test(during) || disabled === true;
  console.log(`${wrong ? "FAIL" : "PASS"}  QA-22: while the session loads, the author is not told they cannot author — during: "${(during.match(/(Create the first one[^.]*|A configuration author adds[^.]*)/) ?? ["(neither)"])[0]}", New combination disabled: ${disabled}`);
  const settled = /Create the first one with New combination/.test(after);
  console.log(`${settled ? "PASS" : "FAIL"}  control: once the session arrives the author's own message shows`);
  await b.close(); process.exit(wrong || !settled ? 1 : 0);
})();
