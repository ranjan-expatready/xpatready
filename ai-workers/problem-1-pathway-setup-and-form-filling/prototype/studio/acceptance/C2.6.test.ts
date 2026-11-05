// C2.6 acceptance (P-220 pack 2; P-156, P-121, P-149): a combination's official document checklist is read into
// document-requirement proposals in the one review queue, each resting on the checklist's own words, and an accepted one
// becomes a draft document line of the combination. Visitor visa (vv.single) with IMM 5484 (05-2026) first.
// Today the checklist path is a stub that proposes nothing (api/src/checklist.ts) and the queue has no lander for a
// requirement_line (api/src/proposals.ts LANDERS), so this fails.
// US$0: "replay" (the saved real run, recorded once in a founder-approved live trial and committed with the build) or
// "rules"; never live. Which document is required, conditional or office-specific is IMM 5484's (trace IRCC-P2-10..17, P2-26, P2-27);
// who gives it, the condition sentences and the document type names are Sample until the immigration expert confirms.
// Needs first: the saved run of the checklist draft for IMM 5484 on Visitor visa, recorded once in the founder-approved
// live trial of Visitor visa (P-131; its cost stated before it is spent) and committed with the build. Until it exists
// the replay is refused and this stays red.
//   zsh studio/tools/isolated.sh accept 4440 start && tsx studio/acceptance/C2.6.test.ts 4440 xr_studio_accept
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { APPROVER, AUTHOR, pack2, run, VV_CHECKLIST } from "./lib/pack2.ts";

const T = pack2("C2.6");
const { call, sql, ok, words } = T;
const OFFICIAL = join(import.meta.dirname, "..", "..", "..", "official-sources", "ircc", "checklists", VV_CHECKLIST);
/** IMM 5484's page-1 document list, matched on the quote only (the words a proposal must rest on). required: the checklist
 *  asks it of everyone; conditional: the checklist itself says when; office: "Refer to the responsible visa office for your
 *  region" — the checklist does not settle it, so a person decides (band Decide), never Ready. Page 2 is the Super visa's. */
const EXPECT: { quote: RegExp; kind: "required" | "conditional" | "office" }[] = [
  { quote: /information page of your valid passport/i, kind: "required" },
  { quote: /Proof of Financial Support/i, kind: "required" },
  { quote: /Proof of payment/i, kind: "required" },
  { quote: /Two photos/i, kind: "conditional" }, // not needed when biometrics are given (the checklist's note)
  { quote: /current immigration status/i, kind: "conditional" },
  { quote: /US nonimmigrant visa/i, kind: "conditional" },
  { quote: /Minors travelling alone/i, kind: "office" }, // conditional on a minor, and "Refer to the responsible visa office"
  { quote: /Marriage License|Marriage Certificate/i, kind: "office" },
  { quote: /Purpose of Travel/i, kind: "office" },
];
/** IMM 5484 page 2 ("PARENTS AND GRANDPARENTS SUPER VISA"): never a Visitor visa document line. */
const SUPER_VISA_ONLY = /Letter of invitation|Low Income Cut-Off|LICO|private medical insurance|Notice of Assessment/i;

run(async () => {
  await T.ready();
  const vv = T.combo("vv.single");
  const att = T.attachment(vv, VV_CHECKLIST);
  ok("setup: Visitor visa carries the official IMM 5484 checklist", !!att);
  const pr = await T.people(vv);
  ok("setup: Visitor visa's Who can be is set (principal, spouse or partner, child, representative)", pr.status < 300, pr.status >= 300 ? words(pr) : undefined);
  const before = T.spent();

  // ---------------------------------------------------------------- drafting, US$0
  // Live is never asked here (a copy with a live switch on would spend): the refusal is tests/check_ai_live_switch.ts's.
  let r: Awaited<ReturnType<typeof call>>;
  r = await call("POST", `/attachments/${att}/draft-checklist`, { mode: "replay" }, AUTHOR);
  ok("C2.6 pass: the checklist is drafted from the saved run (replay accepted)", r.status < 300, r.status >= 300 ? words(r) : r.body?.mode);
  const job = r.body?.id;
  ok("C2.6 pass: the draft cost US$0", !!job && T.spent() === before);
  r = await call("POST", `/attachments/${att}/draft-checklist`, { mode: "replay" }, AUTHOR);
  ok("C2.6 pass: drafting again returns the same open draft (one per checklist), not a second set", !!job && r.body?.id === job);
  r = await call("POST", `/attachments/${att}/draft-checklist`, { mode: "replay" }, "user-B");
  ok("C2.6 fail: only an author drafts (approver 403)", r.status === 403, r.status);
  const form = T.attachment(vv, "imm5257e.pdf");
  r = await call("POST", `/attachments/${form}/draft-checklist`, { mode: "replay" }, AUTHOR);
  ok("C2.6 fail: a form is refused as a checklist (400, in words)", !!form && r.status === 400 && /checklist/i.test(words(r)), words(r));

  // ---------------------------------------------------------------- what waits in the one review queue
  const items = (await T.queued(vv)).filter((x: any) => x.kind === "requirement_line");
  ok("C2.6 pass: the draft's document lines wait in the review queue under Visitor visa (one door, P-149)", items.length >= EXPECT.length, items.length);
  ok("C2.6 pass: every item rests on IMM 5484: file named, IRCC's quote found in the file", items.length > 0 && items.every((x: any) => /imm5484/i.test(x.source?.file ?? "") && x.source?.quote_found === true), items.filter((x: any) => !x.source?.quote_found).map((x: any) => x.title));
  const text = (() => { try { return execFileSync("pdftotext", ["-layout", OFFICIAL, "-"], { encoding: "utf8" }).replace(/\s+/g, " "); } catch { return null; } })();
  if (text) ok("C2.6 pass: each quote is IMM 5484's own words (checked here against the official file too)", items.length > 0 && items.every((x: any) => text.includes(String(x.source?.quote ?? "").replace(/\s+/g, " ").trim())), items.map((x: any) => x.source?.quote).slice(0, 3));
  const payloadOf = (x: any) => x?.readings?.draft?.payload ?? {};
  for (const e of EXPECT) {
    const hit = items.find((x: any) => e.quote.test(x.source?.quote ?? ""));
    const p = payloadOf(hit);
    const good = !!hit && (e.kind === "required" ? p.always === true && p.condition == null
      : e.kind === "conditional" ? p.always === false && String(p.condition?.sentence ?? "").length >= 3
      : hit.band === "decide" && p.always !== true);
    ok(`C2.6 pass: IMM 5484 line ${e.quote.source} is proposed as ${e.kind === "office" ? "for a person to decide (visa office)" : e.kind}`, good, hit ? { band: hit.band, always: p.always, condition: p.condition?.sentence } : "missing");
  }
  ok("C2.6 fail: no IRCC form of the checklist's Forms list is proposed as a document (forms are form lines, not documents)", items.length > 0 && !items.some((x: any) => /^IMM ?\d{4}/i.test(String(payloadOf(x).documentType ?? x.title)) || /Statutory Declaration of Common-law Union|Use of a Representative|Authority to Release/i.test(x.source?.quote ?? "")), items.map((x: any) => x.title));
  ok("C2.6 fail: nothing from page 2 (the Super visa's documents) is proposed for Visitor visa", items.length > 0 && !items.some((x: any) => SUPER_VISA_ONLY.test(`${x.source?.quote ?? ""} ${x.title}`)), items.filter((x: any) => SUPER_VISA_ONLY.test(`${x.source?.quote ?? ""} ${x.title}`)).map((x: any) => x.title));
  const extra = items.filter((x: any) => /additional documents required/i.test(x.source?.quote ?? ""));
  ok("C2.6 pass: 'Any additional documents required by the responsible visa office' is never a Ready document line (it names no document)", items.length > 0 && extra.every((x: any) => x.band === "decide"), extra.map((x: any) => x.band));
  // A document type the library lacks is proposed to the library (P-149 (2): identity = name + what it proves; P-158: a
  // document type comes from a checklist); an identity document is never read by AI vision (P-134).
  const all = await call("GET", "/review/proposals");
  const groups = (all.body?.groups ?? []) as any[];
  const libItems: any[] = [];
  for (const g of groups) { const v = (await call("GET", `/review/proposals?group=${encodeURIComponent(g.id)}`)).body?.group?.bands ?? {}; libItems.push(...[...(v.ready ?? []), ...(v.check ?? []), ...(v.decide ?? [])]); }
  const types = libItems.filter((x) => x.kind === "document_type" && /imm5484/i.test(x.source?.file ?? ""));
  const passport = types.find((x) => /passport|travel document/i.test(x.title));
  ok("C2.6 pass: the checklist's document types the library lacks are proposed to the library, each saying what it proves", types.length > 0 && types.every((x) => x.lands_on === "library" && String(x.meaning ?? "").length >= 3), types.map((x) => x.title));
  ok("C2.6 pass: the passport is an identity document read by its coded lines, never AI vision (P-134)", !!passport && passport.readings?.draft?.payload?.identityDocument === true && passport.readings?.draft?.payload?.readerKind === "coded_lines", passport?.readings?.draft?.payload);
  ok("C2.6 data: every item is Sample until the immigration expert confirms", items.length > 0 && items.every((x: any) => x.basis === "SAMPLE"));
  ok("C2.6 data: items name the people they apply to (roles of Who can be)", items.length > 0 && items.every((x: any) => (x.readings?.draft?.payload?.roles ?? []).length >= 1));

  // ---------------------------------------------------------------- accept → a draft document line with its source
  const pick = items.find((x: any) => /information page of your valid passport/i.test(x.source?.quote ?? "")) ?? items[0];
  r = await call("POST", "/review/proposals/decide", { ids: pick ? [pick.id] : ["00000000-0000-4000-8000-000000000000"], action: "accept" }, AUTHOR);
  ok("C2.6 pass: accepting a requirement line works through the queue's one door (a lander exists)", r.status < 300, r.status >= 300 ? words(r) : undefined);
  const row = sql(`select attach_mode||'|'||coalesce(source_file,'')||'|'||coalesce(source_quote,'')||'|'||status from document_requirement where combination_id='${vv}' order by updated_at desc limit 1`);
  ok("C2.6 pass: it lands as a DRAFT document line of Visitor visa, carrying IMM 5484 and its quote", /\|imm5484e\.pdf\|.+\|DRAFT$/i.test(row), row);
  r = await call("POST", "/review/proposals/decide", { ids: pick ? [pick.id] : ["00000000-0000-4000-8000-000000000000"], action: "accept" }, AUTHOR);
  ok("C2.6 fail: the same item cannot be accepted twice (409 in words)", r.status === 409, words(r));
  const rej = items.find((x: any) => x.id !== pick?.id);
  r = await call("POST", "/review/proposals/decide", { ids: rej ? [rej.id] : ["00000000-0000-4000-8000-000000000000"], action: "reject" }, AUTHOR);
  ok("C2.6 fail: rejecting needs a reason (400 in words)", !!rej && r.status === 400, words(r));
  // P-149 one door: the old way in (apply a checklist job straight to the draft) is closed; it writes nothing.
  const before2 = sql(`select count(*) from document_requirement where combination_id='${vv}'`);
  r = await call("POST", `/jobs/${job ?? "00000000-0000-4000-8000-000000000000"}/apply-checklist`, {}, AUTHOR);
  ok("C2.6 fail: the old apply-checklist door is closed (410 or 409, saying to use the review queue) and adds no line", !!job && [409, 410].includes(r.status) && /review/i.test(words(r)) && sql(`select count(*) from document_requirement where combination_id='${vv}'`) === before2, { status: r.status, words: words(r) });
  // ---------------------------------------------------------------- B82 (QA-233; tech lead's ruling on #1022): a line's condition
  // reads only facts the library has or facts proposed with it, through the library-add step, so release's refusal is
  // never a dead end. Facts are Sample; a second person approves each.
  const treeFacts = (t: unknown): string[] => [...JSON.stringify(t ?? null).matchAll(/"field":"([^"]+)"/g)].map((m) => m[1]);
  const inLibrary = (f: string) => sql(`select (select count(*) from canonical_field where canonical_field_key='${f}' and status <> 'RETIRED') + (select count(*) from derived_field where derived_key='${f}')`) !== "0";
  const after = await call("GET", "/review/proposals");
  const lib2: any[] = [];
  for (const g of (after.body?.groups ?? []) as any[]) { const v = (await call("GET", `/review/proposals?group=${encodeURIComponent(g.id)}`)).body?.group?.bands ?? {}; lib2.push(...[...(v.ready ?? []), ...(v.check ?? []), ...(v.decide ?? [])]); }
  // A fact a form field reads waits on that form's own draft (its proposed key); the rest wait as the checklist's.
  const factOf = (f: string) => sql(`select id from proposal_item where kind='field' and status='waiting' and '${f}' in (work->>'ruleFact', work->>'proposedKey') limit 1`);
  const read = [...new Set(items.flatMap((x: any) => treeFacts(payloadOf(x).condition?.tree)))];
  const unheld = read.filter((f) => !inLibrary(f) && !factOf(f));
  ok("C2.6 pass (B82): every line's condition reads a fact in the library or proposed with it (none left with no way to release)", read.length >= 3 && unheld.length === 0, { read, unheld });
  const facts = lib2.filter((x) => x.kind === "field" && /imm5484/i.test(x.source?.file ?? ""));
  ok("C2.6 pass (B82): each proposed fact waits as a library item resting on IMM 5484's own words, Sample, with a meaning a person can read", facts.length > 0 && facts.every((x) => x.lands_on === "library" && x.source?.quote_found === true && text ? text!.includes(String(x.source?.quote ?? "").replace(/\s+/g, " ").trim()) : true) && facts.every((x) => x.basis === "SAMPLE" && String(x.readings?.draft?.payload?.meaning ?? "").length >= 10), facts.map((x) => x.title));
  ok("C2.6 pass (B82): a fact only visa-office lines read waits as Decide, never Check", facts.filter((x) => x.band === "decide").every((x) => items.filter((l: any) => treeFacts(payloadOf(l).condition?.tree).includes(sql(`select work->>'ruleFact' from proposal_item where id='${x.id}'`))).every((l: any) => l.band === "decide")), facts.map((x) => `${x.title}: ${x.band}`));
  // The three the visa's lines read on the six, as IMM 5484's page 1 conditions them.
  const named = [{ line: /US nonimmigrant visa/i }, { line: /Two photos/i }, { line: /current immigration status/i }].map((e) => { const l = items.find((x: any) => e.line.test(x.source?.quote ?? "")); return { line: l, facts: treeFacts(payloadOf(l).condition?.tree) }; });
  const lineFact = named.find((n) => n.line && n.facts.some((f) => !inLibrary(f)));
  const key1 = lineFact?.facts.find((f) => !inLibrary(f)) ?? "";
  const p1 = key1 ? factOf(key1) : "";
  const problem = async () => ((await call("GET", `/combinations/${vv}`)).body?.draft?.problems ?? []).map((x: any) => String(x.message ?? x));
  if (lineFact) {
    r = await call("POST", "/review/proposals/decide", { ids: [lineFact.line.id], action: "accept", reason: "Accepted by a test (C2.6 B82)." }, AUTHOR);
    ok("C2.6 setup: a conditional line is accepted", r.status < 300, words(r));
    ok("C2.6 fail (B82): before its fact is in the library the draft says so, in the release's own words", (await problem()).some((m: string) => m.includes(`reads ${key1}, which is not in the library`)), await problem());
    r = await call("POST", "/review/proposals/decide", { ids: [p1], action: "accept", reason: "Accepted by a test (C2.6 B82)." }, AUTHOR);
    ok("C2.6 pass (B82): accepting the fact lands it through the library-add step, under the key the condition reads", r.status < 300 && inLibrary(key1), r.status >= 300 ? words(r) : key1);
    const waiting = sql(`select id from library_change where status='WAITING' and key='${key1}'`);
    ok("C2.6 pass (B82): a second person approves it, as any new library item", !!waiting, waiting);
    r = await call("POST", `/library/changes/${waiting}/approve`, { note: "Approved by a test as the second person (C2.6 B82)." }, AUTHOR);
    ok("C2.6 fail (B82): the author cannot approve their own fact", r.status >= 400, r.status);
    r = await call("POST", `/library/changes/${waiting}/approve`, { note: "Approved by a test as the second person (C2.6 B82)." }, APPROVER);
    ok("C2.6 pass (B82): the second person approves the fact", r.status < 300, words(r));
    ok("C2.6 pass (B82): the release's refusal for that fact is gone", !(await problem()).some((m: string) => m.includes(`reads ${key1},`)), await problem());
  } else ok("C2.6 pass (B82): a conditional line reads a fact the library lacks here (else this copy's library is already set up)", false, read);
  // The paid pairs replay on the people's-steps question list: a fact only a document condition reads is not a form field,
  // so the list a form-read question sits on never moves with it.
  ok("C2.6 fail (B82): a fact only a condition reads is not asked by adding it (no question appears)", !key1 || sql(`select count(*) from section_question where canonical_field_key='${key1}' and status <> 'RETIRED'`) === "0");
  ok("C2.6 pass: the whole test spent US$0", items.length > 0 && T.spent() === before);
  T.done();
});
