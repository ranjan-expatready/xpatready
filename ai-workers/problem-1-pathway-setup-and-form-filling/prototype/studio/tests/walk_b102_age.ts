// J-A6 (B102, C6.4; product/screens/A6-age-on-application-date/concept.md): the case officer's walk by screens on the
// configured checkpoint, at the width given (1440 and 1024). It starts where J-B1 ends (the family case's Documents)
// and shows a child's minor lines change when the date of birth crosses 18 on the application date, then ends at
// C6.5's first step. Answers are saved by the case's own answer route, as C6.4-screen does; everything a person reads
// is read on the screen and photographed. Not a regression suite (no check_ prefix). No model call (US$0).
//   zsh studio/tools/isolated.sh a6walk 4461 start && (Demo › Load the configured checkpoint) && tsx studio/tests/walk_b102_age.ts 4461 xr_studio_a6walk 1440 <shots dir>
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { FAMILY, answer, main, needVisitorVisa, ok, openCase, yearsAgo } from "../acceptance/lib/m3.ts";
import { walker } from "../acceptance/lib/browser.ts";

const PORT = process.argv[2] ?? "4461", WIDTH = Number(process.argv[4] ?? 1440), SHOTS = process.argv[5] ?? "/tmp/a6-walk";
mkdirSync(SHOTS, { recursive: true });
const today = new Date().toISOString().slice(0, 10);

await main("C6.4", `J-A6 a child's age on the application date, by screens (${WIDTH} px)`, async () => {
  const vv = needVisitorVisa();
  const c = await openCase(vv, FAMILY);
  const K1 = c.subjects["Sample Child A1"], officer = c.officer;
  const w = await walker(`http://127.0.0.1:${PORT}`);
  try {
    const page = await w.open(officer, WIDTH);
    let n = 0;
    const shot = async (name: string) => { n++; await page.screenshot({ path: join(SHOTS, `${WIDTH}-${String(n).padStart(2, "0")}-${name}.png`), fullPage: false }); };
    const docs = async () => {
      await page.goto(`/cases/${c.id}`); await w.settle(page, "the case page");
      const panel = page.locator("[data-documents-panel]"); await panel.waitFor({ timeout: 20_000 }); await panel.scrollIntoViewIfNeeded();
      const child = page.locator(`[data-documents-person="${K1}"]`);
      await child.scrollIntoViewIfNeeded();
      return { age: (await child.locator("[data-age]").textContent()) ?? "", text: (await child.innerText()) };
    };
    const MINOR = /Letter of authorization for a minor|Copy of the minor's birth certificate/;

    // 1. J-B1's end: Documents with no application date yet: the child's age asks for it first.
    let d = await docs();
    ok("J-A6 1 (BR-8): before the application date is answered, the child's age line asks for it first (no age guessed from today)", /^Age: answer .* first\.$/.test(d.age), d.age);
    await shot("age-asks-application-date");

    // 2. The officer answers the application date (asked once per case) and the child travels alone.
    let r = await answer(c.id, c.caseSubject, "case.application_date", today, officer);
    ok("J-A6 2: the application date is asked once per case and saved", r.status < 300, r.body?.detail ?? r.status);
    r = await answer(c.id, K1, "person.travels_with", "alone", officer);
    ok("J-A6 2: the child's \"who the child travels with\" is asked and saved (Alone)", r.status < 300, r.body?.detail ?? r.status);
    d = await docs();
    ok("J-A6 3 (BR-8): the child reads \"Age 10 on <date> (the application date)\" and gets the letter of authorization and the birth certificate", d.age === `Age 10 on ${today} (the application date)` && MINOR.test(d.text), { age: d.age });
    await shot("child-10-minor-lines");

    // 3. The date of birth crosses 18 on the application date: the lines leave.
    r = await answer(c.id, K1, "person.date_of_birth", yearsAgo(18), officer);
    d = await docs();
    ok("J-A6 4 (BR-7, BR-8): born 18 years before the application date to the day, the child is 18 and the minor lines leave", r.status < 300 && d.age === `Age 18 on ${today} (the application date)` && !/Letter of authorization for a minor/.test(d.text.split("Not needed")[0] ?? d.text), { age: d.age });
    await shot("child-18-lines-gone");

    // 4. One day short of 18: 17, the lines return.
    r = await answer(c.id, K1, "person.date_of_birth", yearsAgo(18, -1), officer);
    d = await docs();
    ok("J-A6 5 (BR-7, BR-8): one day short of 18 on the application date, the child is 17 and the minor lines are back", r.status < 300 && d.age === `Age 17 on ${today} (the application date)` && MINOR.test(d.text), { age: d.age });
    await shot("child-17-lines-back");

    // 5. Where the date is asked: the Agent view's tab for the application, once per case.
    await page.goto(`/cases/${c.id}#agent-view`); await w.settle(page, "the Agent view");
    let found = false;
    for (const tab of await page.getByRole("tab").all()) {
      await tab.click(); await w.settle(page, "a tab of the Agent view");
      if (await page.getByText("Date the application is submitted").count()) { found = true; break; }
    }
    if (found) await page.getByText("Date the application is submitted").first().scrollIntoViewIfNeeded();
    ok("J-A6 6: the Agent view asks \"Date the application is submitted\" on the application's own tab, answered", found && (await page.getByText(today).count()) > 0);
    await shot("application-date-question");

    // 6. The end (P-348 (3)): C6.5's "Fill this from documents" is not on main's screens (Documents says "Opening a file
    // comes with Fill from documents"), so the walk ends at its input: the child's passport line offers "Upload a file".
    d = await docs();
    const passport = page.locator(`[data-documents-person="${K1}"] [data-line]`).filter({ hasText: "Passport information page copy" }).first();
    await passport.scrollIntoViewIfNeeded(); await passport.locator("[data-line-menu]").click();
    const actions = await page.locator("[data-action]").evaluateAll((e) => e.map((x) => x.getAttribute("data-action")));
    await shot("end-passport-upload-for-c65");
    ok("J-A6 7 (end): the child's passport line offers its upload, the document C6.5 fills from", actions.some((a) => /upload/i.test(a ?? "")), actions);
    await page.keyboard.press("Escape");
    ok("J-A6: no page error on the way", w.errors.length === 0, w.errors);
  } finally { await w.close(); }
});
