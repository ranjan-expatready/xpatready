// J-A6a (B102, challenge m4): the configuration author's walk by screens, Questionnaires › "Facts a rule needs" ›
// "Work it out instead", on a copy with the configured checkpoint loaded. Scaffolding, named: two rules that read facts
// the library lacks are inserted by SQL (on the checkpoint every rule's fact is already held), and one date row that no
// questionnaire asks. Everything a person does after that is done and read on the screen. Not a regression suite.
//   tsx studio/tests/walk_b102_author.ts <port> <db> <width> <shots dir>
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { main, needVisitorVisa, ok, sql } from "../acceptance/lib/m3.ts";
import { walker } from "../acceptance/lib/browser.ts";

const { default: AxeBuilder } = createRequire(import.meta.url)("@axe-core/playwright") as typeof import("@axe-core/playwright");
const PORT = process.argv[2] ?? "4461", WIDTH = Number(process.argv[4] ?? 1440), SHOTS = process.argv[5] ?? "/tmp/a6-walk";
mkdirSync(SHOTS, { recursive: true });

await main("C6.4", `J-A6a the author works a fact out instead of asking it, by screens (${WIDTH} px)`, async () => {
  const vv = needVisitorVisa(), tag = `w${WIDTH}`;
  const ws = `(select workspace_id from combination where id='${vv}')`;
  const rule = (key: string, fact: string) => sql(`insert into predicate (id, workspace_id, combination_id, predicate_key, predicate_json, when_plain, then_plain, for_whom, version, status, origin, updated_by) values (gen_random_uuid(), ${ws}, '${vv}', '${key}', '{"field":"${fact}","op":"lt","value":16}', 'the person is under 16 on the application date', 'ask for the school letter (walk scaffolding)', 'principal', 1, 'DRAFT', 'HUMAN', 'user-A')`);
  rule(`r_a6_${tag}_a`, `person.a6_${tag}_years`); rule(`r_a6_${tag}_b`, `person.a6_${tag}_other`);
  sql(`insert into predicate (id, workspace_id, combination_id, predicate_key, predicate_json, when_plain, then_plain, for_whom, version, status, origin, updated_by) values (gen_random_uuid(), ${ws}, '${vv}', 'r_a6_${tag}_c', '{"field":"person.a6_${tag}_words","op":"eq","value":"alone"}', 'the person travels alone', 'walk scaffolding', 'principal', 1, 'DRAFT', 'HUMAN', 'user-A')`);
  sql(`insert into canonical_field (id, workspace_id, canonical_field_key, version, status, meaning, value_type, data_type, scope, subject_kind, origin, updated_by, label) select gen_random_uuid(), workspace_id, 'person.a6_${tag}_unasked', 1, status, 'A date no questionnaire asks (walk scaffolding).', value_type, data_type, scope, subject_kind, origin, updated_by, 'Walk ${tag} unasked date' from canonical_field where workspace_id=${ws} and canonical_field_key='person.date_of_birth' order by version desc limit 1`);
  const w = await walker(`http://127.0.0.1:${PORT}`);
  try {
    const page = await w.open("user-A", WIDTH);
    let n = 0;
    const shot = async (name: string) => { n++; await page.screenshot({ path: join(SHOTS, `author-${WIDTH}-${String(n).padStart(2, "0")}-${name}.png`) }); };
    await page.goto(`/c/${vv}/questionnaires`); await w.settle(page, "Questionnaires");
    const panel = page.locator("[data-rule-facts]"); await panel.waitFor({ timeout: 20_000 });
    const row = panel.locator(`[data-rule-fact="person.a6_${tag}_years"]`); await row.scrollIntoViewIfNeeded();
    await row.getByRole("button", { name: "Work it out instead" }).click();
    const form = page.locator(`[data-work-out-form="person.a6_${tag}_years"]`); await form.waitFor({ timeout: 10_000 });
    await w.settle(page, "the work-out form");
    const reads = (await form.locator("[data-work-out-words]").innerText()).trim();
    ok("J-A6a 1: the form offers Age in whole years, from Date of birth, on Application date, and says how it will read before saving", /^It will read: Age in whole years from Date of birth, on Application date\.$/i.test(reads), reads);
    const axe = await new AxeBuilder({ page }).include(`[data-work-out-form="person.a6_${tag}_years"]`).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    ok("J-A6a 1: the form has no accessibility violation (axe, WCAG 2.2 AA)", axe.violations.length === 0, axe.violations.map((v: { id: string }) => v.id));
    await shot("work-out-form");
    await form.getByRole("button", { name: /Work it out/ }).click();
    await row.waitFor({ state: "detached", timeout: 15_000 });
    ok("J-A6a 2: Work it out: the fact leaves the list (it is worked out, not asked)", (await panel.locator(`[data-rule-fact="person.a6_${tag}_years"]`).count()) === 0);
    const status = panel.locator("[data-work-out-done]"); await status.waitFor({ timeout: 10_000 });
    const focusDone = await page.evaluate(() => document.activeElement?.hasAttribute("data-work-out-done") ?? false);
    ok("J-A6a 2 (review m1): a status line says what was worked out, with both dates, and takes the focus", /^Worked out: person\.a6_\w+_years is now "Age in whole years from Date Of Birth, on Application date\." It reaches cases with the next approved release\.$/i.test((await status.innerText()).trim()) && focusDone, await status.innerText());
    await shot("row-gone");

    // A date no questionnaire asks is refused in the server's words, under the form, with focus on them.
    const row2 = panel.locator(`[data-rule-fact="person.a6_${tag}_other"]`); await row2.scrollIntoViewIfNeeded();
    await row2.getByRole("button", { name: "Work it out instead" }).click();
    const form2 = page.locator(`[data-work-out-form="person.a6_${tag}_other"]`); await form2.waitFor({ timeout: 10_000 }); await w.settle(page, "the second form");
    await form2.getByLabel("From").selectOption(`person.a6_${tag}_unasked`);
    await form2.getByRole("button", { name: /Work it out/ }).click();
    const err = form2.locator("[role=alert]"); await err.waitFor({ timeout: 10_000 });
    const said = await err.innerText(), focused = await page.evaluate(() => document.activeElement?.getAttribute("role"));
    ok("J-A6a 3 (BR-3, challenge M1): a date no questionnaire asks is refused under the form in words, focus on the message", /no questionnaire asks it: place it first/.test(said) && focused === "alert", { said, focused });
    await shot("refused-unasked-date");
    // Review M1: a fact a rule compares with words is not offered as a worked-out age.
    const row3 = panel.locator(`[data-rule-fact="person.a6_${tag}_words"]`); await row3.scrollIntoViewIfNeeded();
    await row3.getByRole("button", { name: "Work it out instead" }).click();
    const not = page.locator("[data-work-out-not-offered]"); await not.waitFor({ timeout: 10_000 });
    ok("J-A6a 4 (review M1): a fact a rule compares with words reads \"Not offered\" with the reason, and no save button", /^Not offered: a rule here compares person\.a6_\w+_words with words/.test(await not.innerText()) && (await row3.getByRole("button", { name: /Work it out ·/ }).count()) === 0, await not.innerText());
    await shot("not-offered-words");
    ok("J-A6a: no page error on the way", w.errors.length === 0, w.errors);
  } finally { await w.close(); }
});
