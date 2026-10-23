// Renders the made-up synthetic documents for the P5 reader (AIW-D270: explicitly identified, made-up synthetic
// documents only). Every page carries a visible "SYNTHETIC SPECIMEN" marking. Values come from the Lead's key
// (expected/reader-c1.json); the readers never read that key. Writes p5/reader/docs/ and its manifest, the reader's
// input allowlist: file, SHA-256, declared kind, synthetic marking. The manifest names no value.
//   node p5/reader/make_docs.ts
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { makeTd3 } from "./mrz.ts";

const require = createRequire(import.meta.url);
const { chromium } = require("/Users/ranjansingh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const HERE = import.meta.dirname, PROTOTYPE = join(HERE, "..", "..");
const OUT = join(HERE, "docs");
const key = JSON.parse(readFileSync(join(PROTOTYPE, "expected", "reader-c1.json"), "utf8"));
const doc = (id: string) => key.documents.find((d: any) => d.id === id);
const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");
const MON = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const vizDate = (iso: string) => `${iso.slice(8, 10)} ${MON[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
const longDate = (iso: string) => new Date(iso + "T00:00:00Z").toLocaleDateString("en-CA", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

const MARK = `<div class="mark">SYNTHETIC SPECIMEN · MADE-UP TEST DOCUMENT · NOT VALID</div>`;
const BASE = `<style>
  *{box-sizing:border-box} body{margin:0;background:#fff;font-family:"Helvetica Neue",Arial,sans-serif;color:#1d1d1f}
  .mark{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;transform:rotate(-24deg);font:700 46px Arial;color:rgba(200,30,30,.13);pointer-events:none;letter-spacing:2px;white-space:nowrap}
</style>`;

function passportHtml(f: Record<string, string>, opts: { mrzDob?: string; place: string } ) {
  const [l1, l2] = makeTd3({ state: "IND", surname: f["person.family_name"], given: f["person.given_names"], number: f["person.passport_number"], nationality: "IND", dob: opts.mrzDob ?? f["person.date_of_birth"], sex: f["person.sex"], expiry: f["person.passport_expiry_date"] });
  const row = (label: string, value: string) => `<div class="f"><div class="l">${label}</div><div class="v">${value}</div></div>`;
  return `<!doctype html><html><head>${BASE}<style>
    .page{position:relative;width:1500px;height:1060px;padding:46px 56px;background:linear-gradient(135deg,#eef3f8,#f7f2ea 60%,#eef3f8);border:2px solid #9aa9b8;border-radius:28px;overflow:hidden}
    .head{display:flex;justify-content:space-between;align-items:baseline;border-bottom:2px solid #6c7c8c;padding-bottom:10px}
    .head b{font-size:34px;letter-spacing:3px} .head span{font-size:20px;color:#55606b}
    .banner{margin-top:8px;font:700 18px Arial;color:#b3261e}
    .grid{display:grid;grid-template-columns:300px 1fr;gap:40px;margin-top:22px}
    .photo{height:380px;border:2px dashed #7d8a96;border-radius:8px;display:flex;align-items:center;justify-content:center;text-align:center;color:#6b7782;font-size:20px;padding:20px}
    .fields{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px 26px}
    .f .l{font-size:16px;color:#55606b;text-transform:uppercase;letter-spacing:.5px} .f .v{font-size:30px;font-weight:600;letter-spacing:1px}
    .wide{grid-column:span 2}
    .mrz{position:absolute;left:56px;right:56px;bottom:40px;font:600 41px "Courier New",Courier,monospace;letter-spacing:2.6px;line-height:1.35;white-space:pre;color:#111}
  </style></head><body><div class="page">${MARK}
    <div class="head"><b>PASSPORT</b><span>Republic of India · specimen layout</span></div>
    <div class="banner">SYNTHETIC SPECIMEN for software testing — made-up person, not a real document</div>
    <div class="grid"><div class="photo">No photograph<br>(synthetic test document)</div><div class="fields">
      ${row("Type", "P")}${row("Country code", "IND")}${row("Passport No.", f["person.passport_number"])}
      <div class="f wide"><div class="l">Surname</div><div class="v">${f["person.family_name"]}</div></div>${row("Sex", f["person.sex"])}
      <div class="f wide"><div class="l">Given name(s)</div><div class="v">${f["person.given_names"]}</div></div>${row("Nationality", "INDIAN")}
      ${row("Date of birth", vizDate(f["person.date_of_birth"]))}${row("Place of birth", opts.place)}${row("Place of issue", "NEW DELHI")}
      ${row("Date of issue", vizDate(f["person.passport_issue_date"]))}${row("Date of expiry", vizDate(f["person.passport_expiry_date"]))}${row("File No.", "SYN000000000")}
    </div></div>
    <div class="mrz">${l1.replace(/</g, "&lt;")}\n${l2.replace(/</g, "&lt;")}</div>
  </div></body></html>`;
}

function letterHtml(f: Record<string, string>, o: { letterhead: string; addr: string; date: string; signer: string; signerTitle: string; city: string; numberLabel: string; extra: string }) {
  return `<!doctype html><html><head>${BASE}<style>
    .page{position:relative;width:794px;min-height:1123px;padding:60px 72px;font-size:15px;line-height:1.55;overflow:hidden}
    .lh{display:flex;justify-content:space-between;border-bottom:3px solid #1f4e79;padding-bottom:12px} .lh b{font-size:24px;color:#1f4e79} .lh small{color:#555;text-align:right}
    .banner{margin:10px 0 18px;font:700 13px Arial;color:#b3261e} table{border-collapse:collapse;margin:14px 0;width:100%} td{border:1px solid #bbb;padding:6px 10px;vertical-align:top} td:first-child{width:34%;color:#333;font-weight:600}
    .mark{font-size:36px}
  </style></head><body><div class="page">${MARK}
    <div class="lh"><b>${o.letterhead}</b><small>${o.addr}</small></div>
    <div class="banner">SYNTHETIC SPECIMEN for software testing — made-up people and organisation</div>
    <p>${o.date}</p>
    <p>${f["person.full_name"]}<br>New Delhi, India</p>
    <p><b>Re: Offer of employment</b></p>
    <p>Dear ${f["person.full_name"].split(" ")[0].charAt(0) + f["person.full_name"].split(" ")[0].slice(1).toLowerCase()},</p>
    <p>We are pleased to offer you a temporary, full-time position with ${f["organisation.name"]}, subject to your obtaining a Canadian work permit. ${o.extra}</p>
    <table>
      <tr><td>Position</td><td>${f["person.intended_job_title"]}</td></tr>
      <tr><td>Main duties</td><td>${f["person.intended_job_duties"]}</td></tr>
      <tr><td>Work location</td><td>${f["person.intended_work_location"]}</td></tr>
      <tr><td>Start date</td><td>${longDate(f["person.intended_employment_start_date"])}</td></tr>
      <tr><td>End date</td><td>${longDate(f["person.intended_employment_end_date"])}</td></tr>
      <tr><td>${o.numberLabel}</td><td>${f["person.lmia_or_offer_number"]}</td></tr>
      <tr><td>Hours</td><td>40 hours per week</td></tr>
    </table>
    <p>Please sign and return a copy of this letter to confirm your acceptance. We look forward to welcoming you to ${o.city}.</p>
    <p>Yours sincerely,</p><p style="margin-top:36px"><b>${o.signer}</b><br>${o.signerTitle}<br>${f["organisation.name"]}</p>
  </div></body></html>`;
}

function birthHtml(f: Record<string, string>) {
  const row = (l: string, v: string) => `<tr><td>${l}</td><td>${v}</td></tr>`;
  return `<!doctype html><html><head>${BASE}<style>
    .page{position:relative;width:1240px;height:1650px;padding:80px;border:14px double #7a5c2e;background:#fffdf6;overflow:hidden}
    h1{text-align:center;font:700 40px Georgia,serif;margin:0 0 6px} h2{text-align:center;font:400 22px Georgia,serif;margin:0 0 6px;color:#555}
    .banner{text-align:center;font:700 18px Arial;color:#b3261e;margin:10px 0 30px}
    table{width:100%;border-collapse:collapse;font-size:24px} td{border-bottom:1px solid #c9b98f;padding:14px 8px} td:first-child{width:42%;color:#5a4a2a}
    .foot{margin-top:50px;font-size:20px;color:#444}
  </style></head><body><div class="page">${MARK}
    <h1>CERTIFICATE OF BIRTH</h1><h2>Registrar of Births and Deaths · specimen layout</h2>
    <div class="banner">SYNTHETIC SPECIMEN for software testing — made-up family, not a real record</div>
    <table>
      ${row("Name of child", `${f["person.given_names"]} ${f["person.family_name"]}`)}
      ${row("Sex", f["person.sex"] === "F" ? "Female" : "Male")}
      ${row("Date of birth", longDate(f["person.date_of_birth"]))}
      ${row("Place of birth", `City Hospital, ${f["person.place_of_birth_city"]}, ${f["person.country_of_birth"]}`)}
      ${row("Name of mother", f["mother.full_name"])}
      ${row("Mother's date of birth", longDate("1990-04-12"))}
      ${row("Name of father", f["father.full_name"])}
      ${row("Father's date of birth", longDate("1991-09-03"))}
      ${row("Registration number", "SYN-2017-000123")}
      ${row("Date of registration", longDate("2017-02-02"))}
    </table>
    <div class="foot">Issued under the authority of the Registrar (specimen). This synthetic document has no legal effect.</div>
  </div></body></html>`;
}

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const manifest: any[] = [];
async function shot(name: string, html: string, o: { w: number; h: number; jpeg?: number; wrap?: string; scale?: number; pdf?: boolean }) {
  const ctx = await browser.newContext({ viewport: { width: o.w, height: o.h }, deviceScaleFactor: o.scale ?? 1 });
  const p = await ctx.newPage();
  const body = o.wrap ? html.replace("<body>", `<body><div style="${o.wrap}">`).replace("</body>", "</div></body>") : html;
  await p.setContent(body, { waitUntil: "load" });
  const file = join(OUT, name);
  if (o.pdf) await p.pdf({ path: file, width: "794px", height: "1123px", printBackground: true });
  else await p.screenshot({ path: file, type: o.jpeg ? "jpeg" : "png", ...(o.jpeg ? { quality: o.jpeg } : {}), fullPage: false });
  await ctx.close();
}
const f1 = doc("D1").fields, f2 = doc("D2").fields;
await shot(doc("D1").file, passportHtml(f1, { place: "NEW DELHI" }), { w: 1500, h: 1060 });
// Phone photo: table-top background, rotation, uneven light, soft focus, JPEG.
const PHOTO = "position:relative;width:1700px;height:1260px;background:radial-gradient(circle at 30% 20%,#6d6152,#3f372e);display:flex;align-items:center;justify-content:center";
await shot(doc("D2").file, passportHtml(f2, { place: "MUMBAI" }).replace('<div class="page">', '<div style="' + PHOTO + '"><div class="page" style="transform:rotate(3deg) scale(.93);filter:blur(1.1px) brightness(.93) contrast(.9);box-shadow:0 18px 40px rgba(0,0,0,.5)"><div style="position:absolute;inset:0;background:linear-gradient(110deg,rgba(255,255,255,.28),rgba(0,0,0,.18));pointer-events:none;z-index:2"></div>').replace("</body>", "</div></body>"), { w: 1700, h: 1260, jpeg: 72 });
const d3 = doc("D3").fields;
await shot(doc("D3").file, letterHtml(d3, { letterhead: "Example Employer Ltd", addr: "100 Example Street<br>Toronto, ON M5V 1A1, Canada", date: longDate("2026-10-01"), signer: "Jordan Sample", signerTitle: "Director of Engineering", city: "Toronto", numberLabel: "LMIA number", extra: "You will report to the Engineering Manager, Platform team." }), { w: 794, h: 1123, pdf: true });
const d4 = doc("D4").fields;
await shot(doc("D4").file, letterHtml(d4, { letterhead: "Example Learning Centre Inc.", addr: "25 Sample Avenue<br>Vancouver, BC V6B 1A1, Canada", date: longDate("2026-10-05"), signer: "Riley Example", signerTitle: "Centre Director", city: "Vancouver", numberLabel: "Offer of employment number", extra: "This offer is exempt from the Labour Market Impact Assessment." }), { w: 794, h: 1123, scale: 1.6, jpeg: 70, wrap: "filter:grayscale(1) contrast(1.15) brightness(1.02);transform:rotate(-1.2deg);transform-origin:50% 0" });
const d8 = doc("D8").fields;
await shot(doc("D8").file, letterHtml(d8, { letterhead: "Example Learning Centre Inc.", addr: "25 Sample Avenue<br>Vancouver, BC V6B 1A1, Canada", date: longDate("2026-10-19"), signer: "Riley Example", signerTitle: "Centre Director", city: "Vancouver", numberLabel: "Offer of employment number", extra: "This revised offer replaces our letter of October 5, 2026: the start date moves from February 1, 2027 to the date below. This offer is exempt from the Labour Market Impact Assessment." }).replace("Re: Offer of employment", "Re: Revised offer of employment"), { w: 794, h: 1123, pdf: true });
await shot(doc("D5").file, birthHtml(doc("D5").fields), { w: 1240, h: 1650 });
// Unreadable: the same page at about a sixth of the resolution (240 px wide), strongly blurred, heavily compressed.
await shot(doc("D6").file, passportHtml(f1, { place: "NEW DELHI" }).replace('<div class="page">', '<div class="page" style="transform:scale(.16);transform-origin:0 0;filter:blur(9px)">'), { w: 240, h: 170, jpeg: 30 });
await shot(doc("D7").file, passportHtml(f1, { place: "NEW DELHI", mrzDob: "1990-04-21" }), { w: 1500, h: 1060 });
await browser.close();

for (const d of key.documents) {
  const bytes = readFileSync(join(OUT, d.file));
  manifest.push({ file: d.file, sha256: sha(bytes), bytes: bytes.length, media_type: d.file.endsWith(".pdf") ? "application/pdf" : d.file.endsWith(".jpg") ? "image/jpeg" : "image/png", synthetic: true, marking: "SYNTHETIC SPECIMEN · MADE-UP TEST DOCUMENT · NOT VALID" });
}
writeFileSync(join(OUT, "manifest.json"), JSON.stringify({ label: "Made-up synthetic documents for the P5 reader (AIW-D270). Each page is visibly marked as a synthetic specimen. No real person or real document.", generated_by: "p5/reader/make_docs.ts", items: manifest }, null, 1) + "\n");
console.log(manifest.map((m) => `${m.file} ${m.bytes} ${m.sha256.slice(0, 12)}`).join("\n"));
