// S4 slice 1, the canada.ca port and reading rules (challenge M2, M4, M5): which addresses are followed, how the forms
// index, a form's own page and a guide are read, and how the live and recorded adapters refuse what is not safe. A
// passing and a failing case per rule. No server, no database, no network (the live adapter runs on a fake fetch; the
// recorded copies come from official-sources/ircc/canada/index.json), NO model call (US$0).
//   C11.2 downloads only from canada.ca, link from the form's own page, no off-host redirect, PDF, ≤ 25 MB, checksum
//   C11.11 a guide's edition is its normalised text · C11.15 the finder's lookup: index rows, packages, guide links, form numbers
//   cd prototype/studio && npx tsx tests/check_forms_s4_canada.ts
// (by hand: tsx --tsconfig studio/api/tsconfig.json …, as run-suites.sh does)
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { guideLinks, mentionsOf, officialUrl, pageLinks, pageText, parseFormPage, parseFormsIndex, textFingerprint } from "../engine/canada.ts";
import { CanadaError, canadaSource, FixtureCanada, LiveCanada, MAX_BYTES, type CanadaCode } from "../api/src/canada.ts";
import { channelsFrom, filingWhy, recordedCopy, sampleFixtures } from "../api/src/filing.ts";

const STUDIO = join(import.meta.dirname, ".."), SOLUTION = join(STUDIO, "..", "..");
const OFFICIAL = join(SOLUTION, "official-sources", "ircc"), INVENTORY = join(STUDIO, "..", "p1", "inventory");
let pass = 0, fail = 0, last = "(before the first step)";
const ok = (name: string, c: unknown, detail?: unknown) => { last = name; c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 240)}` : ""}`); };
const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
const plainWords = (m: unknown) => typeof m === "string" && m.length > 20 && !/exception|traceback|undefined|null|\[object/i.test(m);
/** The refusal code of a promise that should fail (null when it succeeded), with its message. */
const refusal = async (p: Promise<unknown>): Promise<{ code: CanadaCode | "other" | null; message?: string }> => {
  try { await p; return { code: null }; } catch (e) { return e instanceof CanadaError ? { code: e.code, message: e.message } : { code: "other", message: String(e) }; }
};
const G = "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/application-forms-guides";
const INDEX_URL = `${G}.html`, GUIDE_5256 = `${G}/guide-5256-applying-visitor-visa-temporary-resident-visa.html`;
const PAGE_1295 = `${G}/imm1295.html`, PDF_1295 = "https://www.canada.ca/content/dam/ircc/documents/pdf/english/kits/forms/imm1295/01-09-2023/imm1295e.pdf";
const APPLY_VV = "https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/apply-visitor-visa.html";
const PNP_EE = "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/provincial-nominees/express-entry.html";

async function main() {
  // ── officialUrl (C11.2) ─────────────────────────────────────────────────────────────────────────────────────────
  const good = officialUrl(PDF_1295), rel = officialUrl("/content/dam/ircc/x/imm1295e.pdf"), ircc = officialUrl("https://ircc.canada.ca/english/pdf/kits/forms/IMM5905E.pdf");
  ok("C11.2: an https www.canada.ca address is admitted as is", good.ok && good.url === PDF_1295, good);
  ok("C11.2: a relative link resolves against https://www.canada.ca; ircc.canada.ca is admitted", rel.ok && rel.url === "https://www.canada.ca/content/dam/ircc/x/imm1295e.pdf" && ircc.ok, [rel, ircc]);
  const refusedUrls: [string, string][] = [["http://www.canada.ca/content/dam/ircc/x.pdf", "http"], ["https://www.example.com/imm1295e.pdf", "other host"], ["https://www.canada.ca.evil.com/imm1295e.pdf", "look-alike host"],
    ["https://205.193.117.157/imm1295e.pdf", "IP literal"], ["https://user:pw@www.canada.ca/imm1295e.pdf", "credentials"], ["https://www.canada.ca:8443/imm1295e.pdf", "non-default port"], ["javascript:alert(1)", "script link"], ["//evil.com/x.pdf", "scheme-relative other host"]];
  for (const [u, what] of refusedUrls) { const r = officialUrl(u); ok(`C11.2: refused with a plain reason — ${what}`, !r.ok && plainWords(r.why), r); }
  const lookalike = officialUrl("https://www.canada.ca.evil.com/x"), ip = officialUrl("https://[::1]/x");
  ok("C11.2: the reason names the host that was refused (look-alike, IPv6 literal)", !lookalike.ok && /www\.canada\.ca\.evil\.com/.test(lookalike.why) && !ip.ok, [lookalike, ip]);

  // ── recorded copies: FixtureCanada (C11.2) ──────────────────────────────────────────────────────────────────────
  const fx = new FixtureCanada();
  const pdf = await fx.get(PDF_1295, "pdf"), manifestRow = (JSON.parse(readFileSync(join(OFFICIAL, "manifest.json"), "utf8")).items as { url: string; sha256: string }[]).find((i) => i.url === PDF_1295);
  ok("C11.2: a recorded PDF returns its bytes with the checksum on the manifest", pdf.from === "fixture" && pdf.sha256 === sha(pdf.bytes) && pdf.sha256 === manifestRow?.sha256 && pdf.bytes.subarray(0, 5).toString() === "%PDF-", { sha: pdf.sha256.slice(0, 12), manifest: manifestRow?.sha256.slice(0, 12) });
  const unknown = await refusal(fx.get(`${G}/imm9999.html`, "html"));
  ok("C11.2: an address that was not recorded → not_in_fixtures, in plain words", unknown.code === "not_in_fixtures" && plainWords(unknown.message), unknown);
  const offHost = await refusal(fx.get("https://www.example.com/x.html", "html"));
  ok("C11.2: the recorded adapter also refuses a non-official address (host)", offHost.code === "host", offHost);
  const wrongKind = await refusal(fx.get(PAGE_1295, "pdf"));
  ok("C11.2: a recorded page asked for as a PDF is refused (type)", wrongKind.code === "type", wrongKind);
  // a copy of the official folder with one recorded file changed, and one entry pointing outside the folder
  const tmp = mkdtempSync(join(tmpdir(), "xr-canada-"));
  try {
    mkdirSync(join(tmp, "canada", "pages"), { recursive: true });
    const orig = readFileSync(join(OFFICIAL, "canada", "pages", "imm1295.html"));
    copyFileSync(join(OFFICIAL, "canada", "pages", "imm1295.html"), join(tmp, "canada", "pages", "imm1295.html"));
    writeFileSync(join(tmp, "canada", "index.json"), JSON.stringify({ note: "test copy", recorded_utc: "2026-10-27T00:00:00Z", items: [
      { url: PAGE_1295, path: "canada/pages/imm1295.html", sha256: sha(orig), content_type: "text/html;charset=utf-8", status: 200 },
      { url: `${G}/imm5257.html`, path: "../../etc/hosts", sha256: "0".repeat(64), content_type: "text/html", status: 200 }] }));
    const copy = new FixtureCanada({ root: tmp });
    const before = await copy.get(PAGE_1295, "html");
    ok("C11.2: the copy is read while its file still has the recorded checksum", before.sha256 === sha(orig), before.sha256.slice(0, 12));
    writeFileSync(join(tmp, "canada", "pages", "imm1295.html"), Buffer.concat([orig, Buffer.from("<!-- changed -->")]));
    const tampered = await refusal(new FixtureCanada({ root: tmp }).get(PAGE_1295, "html"));
    ok("C11.2: a recorded file changed after recording is refused, not used", tampered.code === "not_in_fixtures" && /changed/.test(tampered.message ?? ""), tampered);
    const escape = await refusal(copy.get(`${G}/imm5257.html`, "html"));
    ok("C11.2: an entry pointing outside the official folder is refused", escape.code === "not_in_fixtures" && /outside/.test(escape.message ?? ""), escape);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
  const savedEnv = process.env.STUDIO_CANADA;
  delete process.env.STUDIO_CANADA; const dflt = canadaSource();
  process.env.STUDIO_CANADA = "live"; const lv = canadaSource();
  process.env.STUDIO_CANADA = "yes"; const other = canadaSource();
  if (savedEnv === undefined) delete process.env.STUDIO_CANADA; else process.env.STUDIO_CANADA = savedEnv;
  ok("C11.2: the recorded copies are the default; live canada.ca only with STUDIO_CANADA=live", dflt instanceof FixtureCanada && lv instanceof LiveCanada && other instanceof FixtureCanada);

  // ── reading rules on the recorded pages (C11.15, C11.2, C11.11) ─────────────────────────────────────────────────
  const indexHtml = (await fx.get(INDEX_URL, "html")).bytes.toString("utf8");
  const idx = parseFormsIndex(indexHtml), r5257 = idx.rows.find((r) => r.code === "IMM 5257");
  ok("C11.15: the recorded forms index has ≥ 200 rows, IMM 5257 with its own page", idx.rows.length >= 200 && r5257?.pageUrl === `${G}/imm5257.html` && r5257.kind === "form", { rows: idx.rows.length, r5257 });
  const chk = idx.rows.find((r) => r.code === "IMM 5484"), sch = idx.rows.find((r) => r.code === "IMM 5257 SCH1"), dep = idx.rows.find((r) => r.code === "IMM 0008 DEP");
  ok("C11.15: a Document Checklist row is typed checklist; SCH and DEP numbers normalised", chk?.kind === "checklist" && /^Document Checklist/.test(chk.title) && !!sch && !!dep && idx.rows.some((r) => r.code === "CIT 0002"), { chk, sch: sch?.code, dep: dep?.code });
  ok("C11.15: every row's page is an official address; the date is the page's (YYYY-MM)", idx.rows.every((r) => officialUrl(r.pageUrl).ok && (r.dateModified === null || /^\d{4}-\d{2}/.test(r.dateModified))));
  ok("C11.15: the application packages include the visitor visa apply page", idx.packages.some((p) => p.url === APPLY_VV && /Visitor visa/.test(p.title)), idx.packages.length);
  const guideHtml = (await fx.get(GUIDE_5256, "html")).bytes.toString("utf8");
  const notIndex = parseFormsIndex(guideHtml);
  ok("C11.15: a page that is not the index gives no rows", notIndex.rows.length === 0, notIndex.rows.length);
  const fp = parseFormPage((await fx.get(PAGE_1295, "html")).bytes.toString("utf8"));
  ok("C11.2: a form's own page gives its edition and its English PDF link", fp.lastUpdated === "2023-09" && fp.pdfUrls.length === 1 && fp.pdfUrls[0] === PDF_1295 && /Work Permit/i.test(fp.title ?? ""), fp);
  const noPdf = parseFormPage((await fx.get(PNP_EE, "html")).bytes.toString("utf8"));
  ok("C11.2: a page with no PDF link gives no link and no edition", noPdf.pdfUrls.length === 0 && noPdf.lastUpdated === null, noPdf);
  const hostile = parseFormPage(`<h1>X</h1><p>Last updated: March 2024</p><a href="https://evil.example.com/content/dam/ircc/a/imm1295e.pdf">pdf</a><a href="/content/dam/ircc/documents/pdf/french/kits/forms/imm1295/x/imm1295f.pdf">fr</a><a href="/content/dam/ircc/documents/pdf/english/kits/forms/imm1295/x/imm1295e.pdf">en</a>`);
  ok("C11.2: off-host and French PDF links on a form page are ignored", hostile.pdfUrls.length === 1 && hostile.pdfUrls[0].endsWith("/english/kits/forms/imm1295/x/imm1295e.pdf") && hostile.lastUpdated === "2024-03", hostile);
  const g = guideLinks((await fx.get(APPLY_VV, "html")).bytes.toString("utf8"));
  ok("C11.15: the visitor visa apply page links guide 5256", g.some((l) => l.url === GUIDE_5256), g);
  const links = pageLinks(`<a href="/en/x.html">A</a><a href="https://travel.gc.ca/">B</a><a href="mailto:a@b.c">C</a>`);
  ok("C11.15: page links keep only official addresses", links.length === 1 && links[0].url === "https://www.canada.ca/en/x.html", links);
  ok("C11.15: a guide link is found by its path or by a \"Guide …\" text, not otherwise", guideLinks(`<a href="/en/a/guide-5289-x.html">Read</a><a href="/en/b.html">Guide 5553 - inside</a><a href="/en/c.html">Apply</a>`).length === 2);
  const text5256 = pageText(guideHtml), m = mentionsOf(text5256);
  const m5257 = m.find((x) => x.code === "IMM 5257"), m5707 = m.find((x) => x.code === "IMM 5707");
  ok("C11.15: guide 5256 names IMM 5257 and IMM 5707, each with its sentence", !!m5257 && !!m5707 && /IMM 5257/.test(m5257.sentence) && /IMM 5707/.test(m5707.sentence) && m.every((x) => x.sentence.length <= 300), m.map((x) => x.code));
  ok("C11.15: text without form numbers gives no mentions", mentionsOf("Fill out the application form and pay the fees. Give your biometrics.").length === 0);
  const odd = mentionsOf("Send IMM5257 now. Also the IMM 0008 Schedule 4 form. Not ABCIMM 1234 or IMM 12345.");
  ok("C11.15: \"IMM5257\" and \"Schedule 4\" are normalised; look-alikes are not numbers", JSON.stringify(odd.map((x) => x.code)) === JSON.stringify(["IMM 5257", "IMM 0008 SCH4"]), odd);
  const inv = JSON.parse(readFileSync(join(INVENTORY, "guide-5256.text.inventory.json"), "utf8")) as { text: string };
  ok("C11.11: page text equals p1/source_text.py's text of the same page (its P1 inventory)", text5256 === inv.text, { here: text5256.length, p1: inv.text.length });
  const withScript = guideHtml.replace("</head>", "<script>var token='abc123';</script></head>");
  ok("C11.11: a guide's edition ignores scripts and tokens (same text → same fingerprint)", textFingerprint(withScript) === textFingerprint(guideHtml) && sha(withScript) !== sha(guideHtml));
  ok("C11.11: a change in the guide's words is a new edition (different fingerprint)", textFingerprint(guideHtml.replace(/common-law union/g, "marriage")) !== textFingerprint(guideHtml) && /common-law union/.test(text5256));

  // ── LiveCanada on a fake fetch (C11.2): no network ──────────────────────────────────────────────────────────────
  const PDF = Buffer.from("%PDF-1.7\n1 0 obj << >> endobj\n%%EOF\n");
  type Fake = (url: string, init: RequestInit) => Promise<Response>;
  const fake = (f: Fake, timeoutMs = { html: 2000, pdf: 2000 }) => { const calls: string[] = []; const impl = (async (input: string | URL | Request, init?: RequestInit) => { const u = String(input); calls.push(u); return f(u, init ?? {}); }) as typeof fetch; return { live: new LiveCanada({ fetchImpl: impl, timeoutMs }), calls }; };
  const pdfResponse = () => new Response(new Uint8Array(PDF), { status: 200, headers: { "content-type": "application/pdf", "content-length": String(PDF.length), "last-modified": "Mon, 20 Jul 2026 19:31:15 GMT" } });
  const okCase = fake(async () => pdfResponse());
  const got = await okCase.live.get(PDF_1295, "pdf");
  ok("C11.2: live: a 200 PDF is returned with its checksum, address and server date", got.from === "live" && got.sha256 === sha(PDF) && got.finalUrl === PDF_1295 && got.lastModified === "Mon, 20 Jul 2026 19:31:15 GMT" && okCase.calls.length === 1, { sha: got.sha256.slice(0, 12), calls: okCase.calls.length });
  const http = fake(async () => pdfResponse());
  const httpR = await refusal(http.live.get("http://www.canada.ca/x.pdf", "pdf"));
  ok("C11.2: live: a non-official address is refused before any request (host)", httpR.code === "host" && http.calls.length === 0 && plainWords(httpR.message), httpR);
  const three = fake(async (u) => { const n = Number(/r(\d)$/.exec(u)?.[1] ?? 0); return n < 3 ? new Response(null, { status: 302, headers: { location: `/content/dam/ircc/r${n + 1}` } }) : pdfResponse(); });
  const threeR = await three.live.get("https://www.canada.ca/content/dam/ircc/r0", "pdf");
  ok("C11.2: live: 3 redirects on canada.ca are followed (the final address is recorded)", threeR.finalUrl === "https://www.canada.ca/content/dam/ircc/r3" && three.calls.length === 4, three.calls);
  const four = fake(async (u) => { const n = Number(/r(\d)$/.exec(u)?.[1] ?? 0); return new Response(null, { status: 301, headers: { location: `/content/dam/ircc/r${n + 1}` } }); });
  const fourR = await refusal(four.live.get("https://www.canada.ca/content/dam/ircc/r0", "pdf"));
  ok("C11.2: live: a chain of 4 redirects is refused (redirect)", fourR.code === "redirect" && four.calls.length === 4 && plainWords(fourR.message), { fourR, calls: four.calls.length });
  const away = fake(async () => new Response(null, { status: 302, headers: { location: "https://evil.example.com/imm1295e.pdf" } }));
  const awayR = await refusal(away.live.get(PDF_1295, "pdf"));
  ok("C11.2: live: a redirect to another host is refused and never followed (redirect)", awayR.code === "redirect" && away.calls.length === 1 && /evil\.example\.com/.test(awayR.message ?? ""), { awayR, calls: away.calls });
  const html = fake(async () => new Response("<html><body>Page not found</body></html>", { status: 200, headers: { "content-type": "text/html" } }));
  const htmlR = await refusal(html.live.get(PDF_1295, "pdf"));
  ok("C11.2: live: an HTML body when a PDF was asked for is refused (type)", htmlR.code === "type" && plainWords(htmlR.message), htmlR);
  const pdfForPage = fake(async () => pdfResponse());
  const pfpR = await refusal(pdfForPage.live.get(PAGE_1295, "html"));
  ok("C11.2: live: a PDF when a page was asked for is refused (type)", pfpR.code === "type", pfpR);
  const big = fake(async () => new Response(new Uint8Array(PDF), { status: 200, headers: { "content-type": "application/pdf", "content-length": String(30 * 1024 * 1024) } }));
  const bigR = await refusal(big.live.get(PDF_1295, "pdf"));
  ok("C11.2: live: a declared 30 MB file is refused (size)", bigR.code === "size" && /30\.0 MB/.test(bigR.message ?? ""), bigR);
  const stream = fake(async () => { let sent = 0; const chunk = new Uint8Array(1024 * 1024); chunk.set(PDF); return new Response(new ReadableStream({ pull(c) { if (sent > MAX_BYTES + chunk.length) c.close(); else { c.enqueue(chunk); sent += chunk.length; } } }), { status: 200, headers: { "content-type": "application/pdf" } }); });
  const streamR = await refusal(stream.live.get(PDF_1295, "pdf"));
  ok("C11.2: live: a body that passes 25 MB without saying its size is cut off (size)", streamR.code === "size", streamR);
  const notFound = fake(async () => new Response("gone", { status: 404, statusText: "Not Found", headers: { "content-type": "text/html" } }));
  const nfR = await refusal(notFound.live.get(PDF_1295, "pdf"));
  ok("C11.2: live: a non-200 answer is refused (status) and says what canada.ca answered", nfR.code === "status" && /404/.test(nfR.message ?? ""), nfR);
  const slow = fake((_u, init) => new Promise<Response>((_res, rej) => { init.signal?.addEventListener("abort", () => rej(Object.assign(new Error("aborted"), { name: "AbortError" }))); }), { html: 80, pdf: 80 });
  const t0 = Date.now(), slowR = await refusal(slow.live.get(PDF_1295, "pdf"));
  ok("C11.2: live: a server slower than the time limit is given up on (timeout)", slowR.code === "timeout" && Date.now() - t0 < 2000 && /did not answer within/.test(slowR.message ?? ""), { slowR, ms: Date.now() - t0 });
  const deaf = fake(() => new Promise<Response>(() => { /* ignores the signal: never answers */ }), { html: 80, pdf: 80 });
  const deafR = await refusal(deaf.live.get(PDF_1295, "pdf"));
  ok("C11.2: live: even a fetch that ignores the stop signal is given up on (timeout)", deafR.code === "timeout", deafR);
  const down = fake(async () => { throw new TypeError("fetch failed", { cause: new Error("getaddrinfo ENOTFOUND www.canada.ca") }); });
  const downR = await refusal(down.live.get(PDF_1295, "pdf"));
  ok("C11.2: live: no connection is reported in plain words with the next step (network)", downR.code === "network" && /upload it here/.test(downR.message ?? ""), downR);

  // --- Load sample's Sample fixtures (Lead note 28 Oct; review round 7 Major 1; break R5-3, R5-4, R5-6)
  ok("C11.11 pass: the filing rule reads a PDF upload from IRCC's upload line, with its heading too (IMM 5476), not Online", channelsFrom("Upload this form along with your online application") === "PDF" && channelsFrom("How to submit this form Online applications If you have not yet submitted your immigration or citizenship application: Upload this form along with your online application") === "PDF");
  ok("C11.11 pass: an online line is Online; a line with both is either", channelsFrom("You must apply online.") === "ONLINE" && channelsFrom("You can fill it out online in the portal, or upload the form.") === "PDF_OR_ONLINE");
  ok("Lead check 28 Oct fail: a paper line is paper filing, never a PDF upload, with or without its heading (IMM 5476)", channelsFrom("Send this form along with your application to the office listed in the guide of your application.") === null && channelsFrom("Paper applications If you have not yet submitted your immigration or citizenship application: Send this form along with your application to the office listed in the guide of your application.") === null && channelsFrom("Mail the completed form to the visa office.") === null && /paper filing/.test(filingWhy("Paper applications If you have not yet submitted your immigration or citizenship application: Send this form along with your application to the office listed in the guide of your application.") ?? ""));
  ok("Lead check 28 Oct (should): one rule, one outcome: filling the form in on a computer says nothing about how it is filed (IMM 5707, IMM 5409, IMM 1295 alike)", ["If you have filled out the form on a computer, click on the “Validate” button located at the top of the form.", "You should fill out your forms on a computer and validate them electronically to reduce mistakes and help you submit forms that are complete.", "Download and fill out the form on a computer."].every((l) => channelsFrom(l) === null && /how to fill the form in/.test(filingWhy(l) ?? "")));
  ok("review round 7 Major 1 fail: a download link's size label is not how the form is filed", channelsFrom("Download the form Schedule 1: Application for Temporary Residence [IMM 5257 SCH1] (PDF, 0.5 MB)") === null);
  // QA-61: the rule reads the sentence, not single words.
  ok("QA-61 pass (#73 review): within a negated sentence the affirmative clause still counts (\"Do not mail this form; upload it online\" is a PDF upload; also with \",\", \" but \" and \" instead\")", channelsFrom("Do not mail this form; upload it online") === "PDF" && channelsFrom("Do not mail this form, upload it with your online application.") === "PDF" && channelsFrom("Don't send it by mail but upload it.") === "PDF" && channelsFrom("Do not mail it. Upload it instead.") === "PDF", [channelsFrom("Do not mail this form; upload it online"), channelsFrom("Don't send it by mail but upload it.")]);
  ok("QA-61 fail (#73 review): a negated clause still says nothing, and a condition alone says nothing (\"Do not upload this form\"; \"You don't need to upload this form, if you apply online\")", channelsFrom("Do not upload this form") === null && channelsFrom("You don't need to upload this form, if you apply online.") === null && channelsFrom("Do not upload it; bring it to your interview.") === null, [channelsFrom("Do not upload this form"), channelsFrom("You don't need to upload this form, if you apply online.")]);
  ok("QA-61 fail: a negated upload line is not a PDF upload (\"Do not upload this form\", \"You don't need to upload this form if you apply online\")", channelsFrom("Do not upload this form. Bring it to your interview.") === null && channelsFrom("You don't need to upload this form if you apply online.") === null && /not to upload/.test(filingWhy("Do not upload this form. Bring it to your interview.") ?? ""));
  ok("QA-61 pass: \"If you apply online, upload it with your application\" is a PDF upload into the online application, not filing Online", channelsFrom("If you apply on paper, mail this form. If you apply online, upload it with your application.") === "PDF");
  ok("QA-61 pass: a sentence that says to upload, beside a negated one, still counts (each sentence is read on its own)", channelsFrom("Do not mail this form. Upload it with your online application.") === "PDF" && channelsFrom("Apply online through your IRCC secure account portal.") === "ONLINE");
  const shipped = sampleFixtures();
  ok("C11.11: every shipped Sample fixture passes its checks (a line that says its value, canada.ca addresses)", !shipped.problems.length && Object.keys(shipped.accepts).join() === "IMM 5475,IMM 5476" && Object.keys(shipped.guides).length === 6 && Object.keys(shipped.pages).length === 2, shipped.problems);
  ok("break R5-6, Lead check 28 Oct: forms whose pages never say how they are filed have no fixture (IMM 1295, 5257, 5257 SCH1, 5409, 5707)", ["IMM 1295", "IMM 5257", "IMM 5257 SCH1", "IMM 5409", "IMM 5707"].every((c) => !shipped.accepts[c]));
  const tmpFx = mkdtempSync(join(tmpdir(), "s4-fixtures-"));
  try {
    const at = (name: string, body: string) => { const f = join(tmpFx, name); writeFileSync(f, body); return f; };
    const broken = sampleFixtures(at("broken.json", "{ not json"));
    ok("break R5-3 fail: an unreadable fixture file loads nothing and says so (never a 500)", /could not be read/.test(broken.problems[0] ?? "") && !Object.keys(broken.accepts).length, broken.problems);
    const hostile = sampleFixtures(at("hostile.json", JSON.stringify({
      accepts: { "IMM 1": { channels: "FAX", quote: "Fax it to us." }, "IMM 2": { channels: "ONLINE", quote: "Download and fill out the form on a computer." }, "IMM 3": { channels: "PDF", quote: "Upload this form along with your online application." } },
      pages: { "IMM 4": { url: "javascript:alert(1)" }, "IMM 5": { url: "https://example.com/imm5.html" } },
      guides: { a: { url: "https://example.com/guide-1234-x.html" }, b: { url: `${G}/guide-5487-applying-work-permit-outside-canada.html`, recorded: "../../../etc/hosts" }, c: { url: `${G}/imm1295.html` } } })));
    ok("break R5-3, R5-4 fail: each bad entry is left out with its reason; the good one is kept", Object.keys(hostile.accepts).join() === "IMM 3" && !Object.keys(hostile.pages).length && !Object.keys(hostile.guides).length && hostile.problems.length === 7, hostile.problems);
    ok("review round 7 Major 1 fail: a fixture whose line does not say its value is left out", hostile.problems.some((m) => /IMM 2: its line does not say ONLINE/.test(m)));
    // recordedCopy: only the manifest's file for that address, inside the official sources, with the manifest's checksum
    const G5487 = `${G}/guide-5487-applying-work-permit-outside-canada.html`;
    const good = recordedCopy(G5487, "instructions/guide-5487.html");
    ok("C11.11: a recorded guide is read from the manifest's own copy for its address", good.length > 1000);
    ok("break R5-4 fail: another guide's file under this guide's address is refused (the manifest names a different file)", (await refusal((async () => recordedCopy(G5487, "instructions/guide-5553.html"))())).code === "not_in_fixtures");
    const base = join(tmpFx, "ircc"); mkdirSync(join(base, "instructions"), { recursive: true });
    const outside = at("outside.html", "<html>not official</html>");
    symlinkSync(outside, join(base, "instructions", "guide-5487.html"));
    writeFileSync(join(base, "manifest.json"), JSON.stringify({ items: [{ file: "guide-5487.html", url: G5487, sha256: sha(readFileSync(outside)) }] }));
    ok("break R5-4 fail: a link out of the official sources is never followed, even with a matching checksum", /missing/.test((await refusal((async () => recordedCopy(G5487, "instructions/guide-5487.html", base))())).message ?? ""));
    rmSync(join(base, "instructions", "guide-5487.html")); writeFileSync(join(base, "instructions", "guide-5487.html"), "<html>changed</html>");
    ok("break R5-4 fail: a recorded copy that no longer matches the manifest's checksum is refused", /checksum/.test((await refusal((async () => recordedCopy(G5487, "instructions/guide-5487.html", base))())).message ?? ""));
  } finally { rmSync(tmpFx, { recursive: true, force: true }); }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.log(`FAIL  stopped after "${last}": ${e instanceof Error ? e.stack : String(e)}`); process.exit(1); });
