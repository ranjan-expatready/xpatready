// K11 (C11.15 Minors, forms): the words rules behind QA-78, QA-105 and QA-107, each with a passing and a failing case.
// No database, no server, no model call (US$0). The page parts are in check_forms_k11_minors_browser.cjs.
//   tsx studio/tests/check_forms_k11_words.ts
import { endSentence, FIND_DESCRIPTION, irccWords, ONLINE_OPTION } from "../contracts/workspace.ts";

let pass = 0, fail = 0;
const ok = (name: string, cond: boolean, detail?: unknown) => { cond ? pass++ : fail++; console.log(`${cond ? "PASS" : "FAIL"}  ${name}${!cond && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };

// QA-107: IRCC's words never keep a link's screen-reader text, nor the space it left before a full stop or comma.
const a = irccWords("Declaration (IMM 5646) (opens in a new tab) . Pages 1 to 3 must be completed.");
ok("C11.15 QA-107 pass: '(opens in a new tab)' and the space it left are dropped; IRCC's sentence stays", a === "Declaration (IMM 5646). Pages 1 to 3 must be completed.", a);
const b = irccWords("Statutory Declaration of Common-law Union (IMM 5409) (Opens in a new window), if applicable");
ok("C11.15 QA-107 pass: any case, tab or window; the comma follows the form number", b === "Statutory Declaration of Common-law Union (IMM 5409), if applicable", b);
const c = irccWords("Complete this form if you have a spouse.");
ok("C11.15 QA-107 fail: a sentence with no link text is shown unchanged", c === "Complete this form if you have a spouse.", c);
ok("C11.15 QA-107 fail: the product's own words are still never IRCC's (L11)", irccWords("IMM 5409 (05-2024): added from the library") === null);
const e = irccWords("Use version 1 .5 of the form (opens in a new tab), if applicable");
ok("C11.15 QA-107 fail (review m3): a space before a full stop away from the link text is kept as read", e === "Use version 1 .5 of the form, if applicable", e);
const d = irccWords("Use this form, if applicableNote: Complete this form only once.");
ok("C11.15 QA-107 fail: the note split of drift check 6 still applies", d === "Use this form, if applicable. Note: Complete this form only once.", d);

// QA-107: "Last find today at 11:15 p.m." ends a sentence once.
ok("C11.15 QA-107 pass: a time ending 'p.m.' gets no second full stop", endSentence("Last find today at 11:15 p.m.") === "Last find today at 11:15 p.m.");
ok("C11.15 QA-107 fail: words with no full stop still end with one", endSentence("Last find today at 11:15 p.m. · rules only, US$0") === "Last find today at 11:15 p.m. · rules only, US$0.");

// QA-105: the Find dialog's description says what each way does.
ok("C11.15 QA-105 pass: Rules only says no AI and nothing is attached", /No AI, nothing is attached, US\$0/.test(FIND_DESCRIPTION.rules) && !/AI reads|both rounds agree/.test(FIND_DESCRIPTION.rules), FIND_DESCRIPTION.rules);
ok("C11.15 QA-105 pass: Saved says it replays earlier answers at US$0", /replayed at US\$0/.test(FIND_DESCRIPTION.replay), FIND_DESCRIPTION.replay);
ok("C11.15 QA-105 fail: only Live says AI reads the pages now", /^AI reads/.test(FIND_DESCRIPTION.live) && !/^AI reads/.test(FIND_DESCRIPTION.replay) && !/^AI reads/.test(FIND_DESCRIPTION.rules));

// QA-78: the channel choice never says the plan word "later wave".
ok("C11.15 QA-78 pass: Online's choice says it is typed in by hand for now", ONLINE_OPTION === " (typed in by hand for now)", ONLINE_OPTION);
ok("C11.15 QA-78 fail: no 'later wave' in the choice", !/later wave/i.test(ONLINE_OPTION));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
