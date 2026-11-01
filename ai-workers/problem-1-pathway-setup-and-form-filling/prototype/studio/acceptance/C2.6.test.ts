// C2.6 acceptance (P-220 pack 2; P-156, P-121, P-149): a combination's official document checklist is read into
// document-requirement proposals in the one review queue, each resting on the checklist's own words, and an accepted one
// becomes a draft document line of the combination. Visitor visa (vv.single) with IMM 5484 (05-2026) first.
// Today the checklist path is a stub that proposes nothing (api/src/checklist.ts) and the queue has no lander for a
// requirement_line (api/src/proposals.ts LANDERS), so this fails.
// US$0: "replay" (the saved real run, recorded once in a founder-approved live trial and committed with the build) or
// "rules"; never live. Which document is required, conditional or office-specific is IMM 5484's (trace IRCC-P2-10..15);
// who gives it, the condition sentences and the document type names are Sample until the immigration expert confirms.
//   zsh studio/tools/isolated.sh accept 4440 start && tsx studio/acceptance/C2.6.test.ts 4440 xr_studio_accept
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { AUTHOR, pack2, run, VV_CHECKLIST } from "./lib/pack2.ts";

const T = pack2("C2.6");
const { call, sql, ok, words } = T;
const OFFICIAL = join(import.meta.dirname, "..", "..", "..", "official-sources", "ircc", "checklists", VV_CHECKLIST);
/** IMM 5484's document list, by the words a proposal must rest on (p.1). required: the checklist asks it of everyone;
 *  conditional: the checklist itself says when ("if applicable", "if your country of residence differs", minors). */
const EXPECT: { what: RegExp; quote: RegExp; kind: "required" | "conditional" }[] = [
  { what: /passport|travel document/i, quote: /information page of your valid passport/i, kind: "required" },
  { what: /financial support/i, quote: /Proof of Financial Support/i, kind: "required" },
  { what: /payment|fee/i, quote: /Proof of payment/i, kind: "required" },
  { what: /photo/i, quote: /Two photos/i, kind: "conditional" }, // not needed when biometrics are given (the checklist's note)
  { what: /immigration status|legal status/i, quote: /current immigration status/i, kind: "conditional" },
  { what: /custody|authori[sz]ation/i, quote: /Minors travelling alone/i, kind: "conditional" },
  { what: /US nonimmigrant visa|U\.?S\.? visa/i, quote: /US nonimmigrant visa/i, kind: "conditional" },
];

run(async () => {
  await T.ready();
  const vv = T.combo("vv.single");
  const att = T.attachment(vv, VV_CHECKLIST);
  ok("setup: Visitor visa carries the official IMM 5484 checklist", !!att);
  const pr = await T.people(vv);
  ok("setup: Visitor visa's Who can be is set (principal, spouse or partner, child, representative)", pr.status < 300, pr.status >= 300 ? words(pr) : undefined);
  const before = T.spent();

  // ---------------------------------------------------------------- drafting, US$0
  let r = await call("POST", `/attachments/${att}/draft-checklist`, { mode: "live" }, AUTHOR);
  ok("C2.6 fail: a live draft is refused without the founder's Go (no call, no cost)", r.status === 409 && T.spent() === before, words(r));
  r = await call("POST", `/attachments/${att}/draft-checklist`, { mode: "replay" }, AUTHOR);
  ok("C2.6 pass: the checklist is drafted from the saved run (replay accepted)", r.status < 300, r.status >= 300 ? words(r) : r.body?.mode);
  const job = r.body?.id;
  ok("C2.6 pass: the draft cost US$0", T.spent() === before);
  r = await call("POST", `/attachments/${att}/draft-checklist`, { mode: "replay" }, AUTHOR);
  ok("C2.6 pass: drafting again returns the same open draft (one per checklist), not a second set", !!job && r.body?.id === job);
  r = await call("POST", `/attachments/${att}/draft-checklist`, { mode: "replay" }, "user-B");
  ok("C2.6 fail: only an author drafts (approver 403)", r.status === 403, r.status);

  // ---------------------------------------------------------------- what waits in the one review queue
  const items = (await T.queued(vv)).filter((x: any) => x.kind === "requirement_line");
  ok("C2.6 pass: the draft's document lines wait in the review queue under Visitor visa (one door, P-149)", items.length >= EXPECT.length, items.length);
  ok("C2.6 pass: every item rests on IMM 5484: file named, IRCC's quote found in the file", items.length > 0 && items.every((x: any) => /imm5484/i.test(x.source?.file ?? "") && x.source?.quote_found === true), items.filter((x: any) => !x.source?.quote_found).map((x: any) => x.title));
  const text = (() => { try { return execFileSync("pdftotext", ["-layout", OFFICIAL, "-"], { encoding: "utf8" }).replace(/\s+/g, " "); } catch { return null; } })();
  if (text) ok("C2.6 pass: each quote is IMM 5484's own words (checked here against the official file too)", items.length > 0 && items.every((x: any) => text.includes(String(x.source?.quote ?? "").replace(/\s+/g, " ").trim())), items.map((x: any) => x.source?.quote).slice(0, 3));
  for (const e of EXPECT) {
    const hit = items.find((x: any) => e.quote.test(x.source?.quote ?? "") || e.what.test(`${x.title} ${x.meaning ?? ""}`));
    ok(`C2.6 pass: IMM 5484 line ${e.quote.source} is proposed as ${e.kind}`, !!hit && (e.kind === "required" ? hit.readings?.draft?.payload?.always === true || /always|required/i.test(hit.title) : !!hit.readings?.draft?.payload?.condition?.sentence), hit ? { title: hit.title, always: hit.readings?.draft?.payload?.always } : "missing");
  }
  ok("C2.6 fail: no IRCC form of the checklist's Forms list is proposed as a document (forms are form lines, not documents)", items.length > 0 && !items.some((x: any) => /^IMM ?\d{4}/i.test(String(x.readings?.draft?.payload?.documentType ?? x.title))), items.map((x: any) => x.title));
  ok("C2.6 pass: 'Any additional documents required by the responsible visa office' is never a document line (it names no document)", !items.some((x: any) => /additional documents required/i.test(x.source?.quote ?? "")) || items.filter((x: any) => /additional documents required/i.test(x.source?.quote ?? "")).every((x: any) => x.band === "decide"));
  ok("C2.6 data: every item is Sample until the immigration expert confirms", items.length > 0 && items.every((x: any) => x.basis === "SAMPLE"));
  ok("C2.6 data: items name the people they apply to (roles of Who can be)", items.length > 0 && items.every((x: any) => (x.readings?.draft?.payload?.roles ?? []).length >= 1));

  // ---------------------------------------------------------------- accept → a draft document line with its source
  const pick = items.find((x: any) => /passport|travel document/i.test(x.title)) ?? items[0];
  r = await call("POST", "/review/proposals/decide", { ids: pick ? [pick.id] : ["00000000-0000-4000-8000-000000000000"], action: "accept" }, AUTHOR);
  ok("C2.6 pass: accepting a requirement line works through the queue's one door (a lander exists)", r.status < 300, r.status >= 300 ? words(r) : undefined);
  const row = sql(`select attach_mode||'|'||coalesce(source_file,'')||'|'||coalesce(source_quote,'')||'|'||status from document_requirement where combination_id='${vv}' order by updated_at desc limit 1`);
  ok("C2.6 pass: it lands as a DRAFT document line of Visitor visa, carrying IMM 5484 and its quote", /\|imm5484e\.pdf\|.+\|DRAFT$/i.test(row), row);
  r = await call("POST", "/review/proposals/decide", { ids: pick ? [pick.id] : ["00000000-0000-4000-8000-000000000000"], action: "accept" }, AUTHOR);
  ok("C2.6 fail: the same item cannot be accepted twice (409 in words)", r.status === 409, words(r));
  const rej = items.find((x: any) => x.id !== pick?.id);
  r = await call("POST", "/review/proposals/decide", { ids: rej ? [rej.id] : ["00000000-0000-4000-8000-000000000000"], action: "reject" }, AUTHOR);
  ok("C2.6 fail: rejecting needs a reason (400 in words)", r.status === 400, words(r));
  ok("C2.6 pass: nothing is released by accepting (the combination's own review and release follows)", items.length > 0 && sql(`select count(*) from config_release where combination_id='${vv}'`) === "0");
  ok("C2.6 pass: the whole test spent US$0", T.spent() === before);
  T.done();
});
