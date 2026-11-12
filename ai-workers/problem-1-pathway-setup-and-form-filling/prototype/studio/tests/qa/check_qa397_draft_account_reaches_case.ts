// qa (11 Nov, capability re-score of C11.6 and C8.2 after B171 on main 68a7b59d1): QA-397. The IRCC account an author
// picks on a combination's Forms tab is a draft change: Review and release lists it ("Changes in the draft compared with
// released version 2: … portal … changed") and the released version still holds the old account
// (config_release.snapshot.combination.portal). Yet every open case on that combination reads the draft's account at once,
// and recording the submission writes it into the filing record for good (filing_record.portal). A case follows its
// release (SA-01B v2.1 "Pin: the pack version a filing follows"; a change reaches open filings only when published).
// Expected: until the change is released, the case page, its answer sheets, the "Record the submission" dialog and a new
// filing record keep the released account. Fails today; passes when fixed. Puts the account back after. US$0, live AI off.
//   zsh tools/isolated.sh qa_397 4472 start && tsx tests/qa/check_qa397_draft_account_reaches_case.ts 4472 xr_studio_qa_397
//   (loads the configured checkpoint itself when the copy has no released Visitor visa; never :4400)
import { AUTHOR, FIXED, call, main, needVisitorVisa, ok, openCase, prepare, sql } from "../../acceptance/lib/m3.ts";

await main("QA-397", "an unreleased IRCC account change does not reach open cases (C11.6, C8.2)", async () => {
  if (!sql(`select r.id from config_release r join combination c on c.id=r.combination_id where c.combination_key='vv.single' and r.status='RELEASED'`)) {
    await call("POST", "/demo/reset", { confirm: "RESET" }, AUTHOR);
    const l = await call("POST", "/demo/load", { sample: "configured" }, AUTHOR);
    ok("setup: Demo › Load the configured checkpoint", l.status === 201 || l.status === 200, l.status);
  }
  const vv = needVisitorVisa();
  const released = sql(`select r.snapshot->'combination'->>'portal' from config_release r where r.combination_id='${vv}' and r.status='RELEASED' order by r.version desc limit 1`);
  const before = sql(`select coalesce(portal_key,'') from combination where id='${vv}'`) ?? "";
  ok("setup: the Visitor visa's released version names the APR Portal, as its draft does", released === "APR_PORTAL" && before === "APR_PORTAL", { released, before });
  const c = await openCase(vv, [{ role: "principal", name: "Sample Client QA-397", dob: FIXED.dob }]);
  try {
    // The Forms tab's IRCC account picker (web/src/components/channels.tsx AccountPicker) calls this route.
    const r = await call("PATCH", `/combinations/${vv}/account`, { account: "PR_PORTAL", from: "APR_PORTAL" }, AUTHOR);
    ok("setup: the author picks the PR Portal on the Forms tab (a draft change)", r.status < 300, { status: r.status, body: r.body?.detail });
    const still = sql(`select r.snapshot->'combination'->>'portal' from config_release r where r.combination_id='${vv}' and r.status='RELEASED' order by r.version desc limit 1`);
    ok("setup: nothing was released; the released version still names the APR Portal", still === "APR_PORTAL", still);
    const p = (await prepare(c.id)).p;
    ok("QA-397-1 fail today: the open case keeps the released account until the change is released (today: PR Portal at once)", p?.portal === "APR_PORTAL" && (p as { portal_words?: string } | null)?.portal_words?.startsWith("Filed through APR Portal") === true, { portal: p?.portal, words: (p as { portal_words?: string } | null)?.portal_words });
  } finally {
    const back = await call("PATCH", `/combinations/${vv}/account`, { account: before || null, from: "PR_PORTAL" }, AUTHOR);
    ok("cleanup: the account is put back", back.status < 300 && sql(`select coalesce(portal_key,'') from combination where id='${vv}'`) === before, back.status);
  }
});
