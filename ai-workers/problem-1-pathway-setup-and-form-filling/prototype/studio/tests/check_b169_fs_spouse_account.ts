// B169 (#1507's finding; Lead 12): spousal sponsorship's IRCC account on the six and the configured checkpoint. The six
// and the checkpoint key it fs.spouse (samples/wave1.json), the demo story fs.outside (samples/programs.json), and the
// form library sample's accounts and guides named only fs.outside, so the PR Portal was never set where the checkpoint
// runs. Data only (P-449, P-452): fs.spouse's entry beside fs.outside, cited from the recorded canada.ca page with page,
// quote and date (P-170; Sample, Unconfirmed: expert).
// Part 1 is pure (files only). Part 2, with a port, reads an isolated copy: Demo › Reset to the six and Demo › Load the
// configured checkpoint each leave fs.spouse on the PR Portal. Live AI off, US$0.
//   zsh studio/tools/isolated.sh b169_acct 4455 start && tsx studio/tests/check_b169_fs_spouse_account.ts 4455 xr_studio_b169_acct
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const PORT = process.argv[2] ? Number(process.argv[2]) : null, DB = process.argv[3] ?? "xr_studio_b169_acct";
const STUDIO = join(import.meta.dirname, ".."), SOLUTION = join(STUDIO, "..", "..");
let pass = 0, fail = 0;
const ok = (n: string, c: unknown, d?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  B169: ${n}${!c && d !== undefined ? ` — ${JSON.stringify(d).slice(0, 300)}` : ""}`); };
type Account = { account: string; url: string; quote: string; read: string; page_modified?: string; recorded?: string; why?: string };
/** Lead 16 on #1523: the one entry that may stand as a paraphrase until its page is recorded (B172), and its label. */
const PARAPHRASE_OK = "lm.high_wage", PARAPHRASE_LABEL = "Sample: page not yet recorded (paraphrase)";
type Library = { guides: Record<string, { url?: string | null }>; accounts: { combinations: Record<string, Account> } };
const LIB = JSON.parse(readFileSync(join(STUDIO, "samples", "form-library-sample.json"), "utf8")) as Library;

/** The six's combinations and their canada.ca pages, as samples/wave1.json sets them up. */
function sixPages(): Map<string, string | null> {
  const out = new Map<string, string | null>();
  const walk = (x: unknown): void => {
    if (Array.isArray(x)) { x.forEach(walk); return; }
    if (!x || typeof x !== "object") return;
    const s = (x as { setup?: { key?: string; page?: string | null } }).setup;
    if (s?.key) out.set(s.key, s.page ?? null);
    Object.values(x).forEach(walk);
  };
  walk(JSON.parse(readFileSync(join(STUDIO, "samples", "wave1.json"), "utf8")));
  return out;
}
/** The rule this row adds: a combination the six holds whose canada.ca page has a recorded IRCC account (under any key,
 *  such as the demo story's) carries that account under its own key, so the six and the checkpoint set it too. Returns
 *  the combinations that do not. */
export const missingAccounts = (lib: Library, six: Map<string, string | null>): string[] =>
  [...six].filter(([key, page]) => page && Object.values(lib.accounts.combinations).some((a) => a.url === page) && !lib.accounts.combinations[key]).map(([key]) => key);
/** The recorded page's own date, its dcterms.modified meta (review m2 on 9540d3057: any content="<date>" matched, so
 *  dcterms.issued passed too). */
export const pageModified = (html: string) => html.match(/<meta\s+name="dcterms\.modified"[^>]*\scontent="([^"]+)"/)?.[1] ?? null;
/** A recorded page's words as a person reads them: tags and scripts out, entities read, white space collapsed. */
const pageWords = (html: string) => html.replace(/<(script|style)[\s\S]*?<\/\1>/g, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&rsquo;|&#8217;/g, "’").replace(/&amp;/g, "&").replace(/\s+/g, " ");

(async () => {
  // Part 1 (pure): the entry, its citation, and the rule.
  const six = sixPages(), fs = LIB.accounts.combinations["fs.spouse"];
  ok("the six and the checkpoint key spousal sponsorship fs.spouse, on the canada.ca page the demo story's fs.outside account cites", six.get("fs.spouse") === LIB.accounts.combinations["fs.outside"]?.url, { six: six.get("fs.spouse") });
  ok("pass: fs.spouse has its IRCC account in the data, the PR Portal, on the same page", fs?.account === "PR_PORTAL" && fs.url === six.get("fs.spouse"), fs);
  const recorded = fs?.recorded ? join(SOLUTION, fs.recorded) : "";
  const html = recorded && existsSync(recorded) ? readFileSync(recorded, "utf8") : "";
  ok("P-170: its quote is the recorded page's own sentence, word for word as a person reads it", !!html && !!fs.quote && pageWords(html).includes(fs.quote), { quote: fs?.quote, recorded: fs?.recorded });
  ok("P-170: its page date is the recorded page's own (dcterms.modified), and the date it was read is given", !!fs?.page_modified && pageModified(html) === fs.page_modified && /^\d{4}-\d{2}-\d{2}$/.test(fs.read ?? ""), { page_modified: fs?.page_modified, read: fs?.read });
  ok("fs.spouse's guide is linked as fs.outside's is (Guide 5289)", !!LIB.guides["fs.spouse"]?.url && LIB.guides["fs.spouse"].url === LIB.guides["fs.outside"]?.url);
  ok("pass: every combination the six holds whose page has a recorded account carries it under its own key", missingAccounts(LIB, six).length === 0, missingAccounts(LIB, six));
  ok("fail: a page_modified set to the page's issued date (2023-08-04, its dcterms.issued) is refused, though the page holds it", !!html && html.includes(`content="2023-08-04"`) && pageModified(html) !== "2023-08-04");
  // Lead 16 on #1523 (P-170): every account entry quotes a recorded page word for word, with the page's own date.
  // fs.outside's quote was a paraphrase of the same sentence fs.spouse quotes. One entry only, lm.high_wage, whose ESDC
  // page is not recorded yet (follow-up row B172), may stand as a paraphrase, and only under its Sample label.
  const unquoted = (lib: Library) => Object.entries(lib.accounts.combinations).filter(([key, a]) => {
    if (!a.recorded) return !(key === PARAPHRASE_OK && (a.why ?? "").startsWith(PARAPHRASE_LABEL));
    const file = join(SOLUTION, a.recorded), page = existsSync(file) ? readFileSync(file, "utf8") : "";
    return !(page && pageWords(page).includes(a.quote) && pageModified(page) === a.page_modified);
  }).map(([key]) => key);
  ok("P-170: every account entry quotes its recorded page (fs.outside, fs.spouse), lm.high_wage alone stands as a labelled paraphrase", !!LIB.accounts.combinations["fs.outside"]?.recorded && unquoted(LIB).length === 0, unquoted(LIB));
  const paraphrased = structuredClone(LIB); paraphrased.accounts.combinations["fs.outside"].quote = "Online in the PR Portal: the principal applicant submits the sponsorship and PR applications together";
  ok("fail: fs.outside's earlier paraphrase is refused (not on the recorded page)", JSON.stringify(unquoted(paraphrased)) === JSON.stringify(["fs.outside"]), unquoted(paraphrased));
  const unlabelled = structuredClone(LIB); delete unlabelled.accounts.combinations["lm.high_wage"].why;
  ok("fail: lm.high_wage's paraphrase without its Sample label is refused", JSON.stringify(unquoted(unlabelled)) === JSON.stringify(["lm.high_wage"]), unquoted(unlabelled));
  const borrowed = structuredClone(LIB), fo = borrowed.accounts.combinations["fs.outside"];
  delete fo.recorded; fo.why = `${PARAPHRASE_LABEL}.`; fo.quote = "Online in the PR Portal: the principal applicant submits the sponsorship and PR applications together";
  ok("fail: the Sample label is accepted for lm.high_wage only (on fs.outside it is refused)", JSON.stringify(unquoted(borrowed)) === JSON.stringify(["fs.outside"]), unquoted(borrowed));
  const without = structuredClone(LIB); delete without.accounts.combinations["fs.spouse"];
  ok("fail: with fs.spouse's entry missing, the rule refuses and names fs.spouse (as on main before this row)", JSON.stringify(missingAccounts(without, six)) === JSON.stringify(["fs.spouse"]), missingAccounts(without, six));

  // Part 2 (an isolated copy): the account is set where the six and the checkpoint run.
  if (PORT) {
    const call = async (path: string, body: unknown) => { const r = await fetch(`http://localhost:${PORT}/api${path}`, { method: "POST", headers: { "x-actor": "user-A", "content-type": "application/json" }, body: JSON.stringify(body) }); return { status: r.status, body: await r.json().catch(() => null) as any }; };
    const portal = () => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", "select coalesce(portal_key, '(none)') from combination where combination_key = 'fs.spouse'"], { encoding: "utf8" }).trim();
    let r = await call("/demo/reset-to-six", { confirm: "RESET" });
    ok("the six: Demo › Reset to the six leaves fs.spouse on the PR Portal", r.status < 300 && portal() === "PR_PORTAL", { status: r.status, portal: portal() });
    await call("/demo/reset", { confirm: "RESET" });
    r = await call("/demo/load", { sample: "configured" });
    ok("the checkpoint: Demo › Load the configured checkpoint leaves fs.spouse on the PR Portal, at US$0", r.status < 300 && r.body?.cost_usd === 0 && portal() === "PR_PORTAL", { status: r.status, cost: r.body?.cost_usd, portal: portal() });
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); console.log(`\n${pass} passed, ${fail + 1} failed`); process.exit(1); });
