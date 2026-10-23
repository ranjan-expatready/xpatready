// Renders the three P4 views of one released configuration as static pages (rules, no AI, no per-form code).
//   node p4/generate.ts p3/releases/c1-v1      writes p4/out/c1-v1/{index,pqr,sqr-principal,sqr-partner,staff}.html and views.json
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { buildViews, type Question } from "./views.ts";

const PROTOTYPE = join(import.meta.dirname, "..");
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const sha = (b: string | Buffer) => createHash("sha256").update(b).digest("hex");

/** SHA-256 of the view code itself: the change test shows it is the same before and after a configuration change. */
export const viewCodeSha = () => sha(["views.ts", "generate.ts"].map((f) => readFileSync(join(PROTOTYPE, "p4", f), "utf8")).join("\n"));

// Screen patterns and brand kit (AIW-D265): Expat Ready's frontend, read-only capture of dev 5ccd9fa. Semantic tokens
// (light and dark) from src/styles/tokens.css; Inter for UI text and Proxima Nova for headings (style guide, typography);
// the dark-tone logo on light surfaces and the white one on dark (BrandLogo); the client-portal field pattern; tables per
// docs/style-guide/patterns/tables.md. The fonts and logos are copied beside the pages.
export const BRAND_COMMIT = "5ccd9fa";
export const BRAND = join(PROTOTYPE, "..", "..", "..", "code", `ERv2-frontend@${BRAND_COMMIT}-2026-10-20`);
export const ASSETS: Record<string, string> = {
  "logo-dark.svg": "public/brand/expat-ready-notagline-dark.svg", "logo-light.svg": "public/brand/expat-ready-notagline.svg",
  "inter-latin.woff2": "public/fonts/inter/inter-latin-wght-normal.woff2", "inter-latin-ext.woff2": "public/fonts/inter/inter-latin-ext-wght-normal.woff2",
  "inter-OFL.txt": "public/fonts/inter/OFL.txt", "proxima-400.otf": "public/fonts/regular.otf", "proxima-600.otf": "public/fonts/semibold.otf", "proxima-700.otf": "public/fonts/bold.otf",
};
const CSS = `@font-face{font-family:"Proxima";src:url(brand/proxima-400.otf) format("opentype");font-weight:400;font-display:swap}
@font-face{font-family:"Proxima";src:url(brand/proxima-600.otf) format("opentype");font-weight:600;font-display:swap}
@font-face{font-family:"Proxima";src:url(brand/proxima-700.otf) format("opentype");font-weight:700;font-display:swap}
@font-face{font-family:"Inter Variable";src:url(brand/inter-latin.woff2) format("woff2-variations");font-weight:100 900;font-display:swap;unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:"Inter Variable";src:url(brand/inter-latin-ext.woff2) format("woff2-variations");font-weight:100 900;font-display:swap;unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF}
:root{color-scheme:light;--surface:#f7f7f7;--raised:#ffffff;--sunken:#f7f7f7;--text:#2d2d2d;--muted:#737373;--link:#054e9c;--primary:#0862c5;--primary-contrast:#ffffff;--warn:#ff8500;--text-warn:#663200;--ok:#16a34a;--text-ok:#0f5c2e;--border:#d9d9d9;--border-strong:#bfbfbf;--ring:#0862c5}
@media (prefers-color-scheme:dark){:root{color-scheme:dark;--surface:#14202c;--raised:#182634;--sunken:#15202d;--text:#eeeeee;--muted:#a9b7c4;--link:#2aa1ff;--primary:#0694ff;--primary-contrast:#062038;--text-warn:#ffb454;--text-ok:#4ade80;--border:#2c3a48;--border-strong:#46586c;--ring:#2aa1ff}}
*{box-sizing:border-box}body{margin:0;background:var(--surface);color:var(--text);font:400 14px/1.5 "Inter Variable","Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
h1,h2,h3{font-family:"Proxima","Inter Variable",-apple-system,sans-serif;line-height:1.25;letter-spacing:-0.01em}h1{font-size:24px;font-weight:700;margin:0 0 4px}h2{font-size:18px;font-weight:600;margin:28px 0 10px}h3{font-size:16px;font-weight:600;margin:0 0 4px}
a{color:var(--link)}:focus-visible{outline:2px solid var(--ring);outline-offset:2px}
.appbar{background:var(--raised);border-bottom:1px solid var(--border);padding:10px 16px}.appbar div{max-width:960px;margin:0 auto;display:flex;align-items:center;gap:12px;flex-wrap:wrap}.appbar img{display:block;width:160px;height:auto}.appbar span{font-size:12px;color:var(--muted)}
main{max-width:960px;margin:0 auto;padding:24px 16px 48px}.sub,.meta{color:var(--muted);font-size:12px;overflow-wrap:anywhere}p.lead{font-size:14px;color:var(--muted);margin:4px 0 0}
.notice{display:flex;gap:8px;align-items:flex-start;border:1px solid color-mix(in srgb,var(--warn) 40%,transparent);background:color-mix(in srgb,var(--warn) 10%,transparent);color:var(--text-warn);border-radius:8px;padding:8px 12px;font-size:12px;margin:12px 0}.notice b{white-space:nowrap}
nav{display:flex;flex-wrap:wrap;gap:4px 18px;border-bottom:1px solid var(--border);margin:16px 0 4px}nav a{color:var(--muted);text-decoration:none;font-weight:500;padding:8px 0;border-bottom:2px solid transparent;margin-bottom:-1px}nav a:hover{color:var(--text)}nav a[aria-current=page]{color:var(--text);border-bottom-color:var(--primary)}
.block{background:var(--raised);border:1px solid var(--border);border-radius:12px;box-shadow:0 1px 2px rgb(0 0 0 / .05);padding:20px 24px;margin:12px 0}.block>.meta{margin:0 0 4px}
.q{padding:14px 0;border-top:1px solid var(--border)}.block h3+.q,.block .meta+.q{border-top:none}.q .label{font-size:14px;font-weight:500;overflow-wrap:anywhere}.q .meta{margin-top:2px}
.chip{display:inline-flex;align-items:center;gap:6px;border-radius:6px;padding:1px 8px;font-size:12px;font-weight:500;margin-left:8px;border:1px solid;vertical-align:1px}.chip i{width:6px;height:6px;border-radius:50%;display:inline-block}
.pre{color:var(--link);background:color-mix(in srgb,var(--primary) 10%,transparent);border-color:color-mix(in srgb,var(--primary) 40%,transparent)}.pre i{background:var(--primary)}
.doc{color:var(--text-ok);background:color-mix(in srgb,var(--ok) 10%,transparent);border-color:color-mix(in srgb,var(--ok) 40%,transparent)}.doc i{background:var(--ok)}
input,select{font:inherit;font-size:14px;height:36px;padding:4px 12px;border:1px solid var(--border-strong);border-radius:6px;background:var(--raised);color:var(--text);width:100%;max-width:420px;margin-top:8px;box-shadow:0 1px 2px rgb(0 0 0 / .05)}
.yesno{display:flex;gap:20px;margin-top:8px}.yesno label{display:inline-flex;align-items:center;gap:8px;font-size:14px}.yesno input{width:16px;height:16px;margin:0;box-shadow:none;accent-color:var(--primary)}
details{margin-top:6px}summary{cursor:pointer;font-size:12px;color:var(--muted)}details ul{margin:6px 0 0;padding-left:18px}
.tablewrap{overflow-x:auto;margin:8px 0}.tablewrap table{min-width:720px}table{border-collapse:collapse;width:100%;font-size:14px}caption{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
thead{background:var(--sunken)}th{height:40px;padding:0 8px;text-align:left;font-weight:500;color:var(--muted);border-bottom:1px solid var(--border)}td{padding:8px;vertical-align:top;border-bottom:1px solid var(--border);overflow-wrap:anywhere}
tbody tr:nth-child(even){background:color-mix(in srgb,var(--text) 2%,transparent)}tbody tr:hover{background:color-mix(in srgb,var(--text) 3%,transparent)}td b{font-weight:500}td.nw,th.nw{white-space:nowrap;overflow-wrap:normal}
footer{max-width:960px;margin:0 auto;padding:0 16px 32px;color:var(--muted);font-size:12px}
@media (max-width:640px){.block{padding:16px}h1{font-size:20px}}`;

const PAGES: [string, string][] = [["index.html", "Overview"], ["pqr.html", "PQR view"], ["sqr-principal.html", "SQR: principal"], ["sqr-partner.html", "SQR: partner"], ["staff.html", "Staff working view"]];
function page(file: string, title: string, body: string, from: string) {
  const nav = `<nav aria-label="Generated views">${PAGES.map(([f, t]) => `<a href="${f}"${f === file ? ' aria-current="page"' : ""}>${esc(t)}</a>`).join("")}</nav>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)} · Expat Ready prototype</title><style>${CSS}</style></head>
<body><header class="appbar"><div><picture><source srcset="brand/logo-light.svg" media="(prefers-color-scheme: dark)"><img src="brand/logo-dark.svg" alt="Expat Ready" width="160" height="32"></picture><span>Solution 1 working prototype · generated views</span></div></header>
<main><h1>${esc(title)}</h1><p class="sub">${esc(from)}</p><div class="notice" role="note"><b>Prototype</b><span>Generated by rules from the released configuration; no AI at render time. The configuration was AI-drafted under a prototype-only exception to the AI-processing rule and released by a second person (simulated users).</span></div>${nav}${body}</main>
<footer>Styled with Expat Ready's screen patterns and brand kit: ERv2-frontend dev ${BRAND_COMMIT} (tokens, typography, brand, forms and tables patterns), as static pages for the prototype.</footer></body></html>\n`;
}

// A radio group is named by its person and fact, so a page depends only on its own questions (run 7: a counter
// across pages renamed the partner's groups when the PQR gained a question).
const isYesNo = (vals: string[]) => vals.length === 2 && vals.every((x) => /^(yes|no)$/i.test(x));
const question = (q: Question) => {
  const limit = q.shortest_limit ? ` maxlength="${q.shortest_limit.chars}"` : "";
  const control = isYesNo(q.allowed_values)
    ? `<div class="yesno" role="radiogroup" aria-label="${esc(q.label)}">${q.allowed_values.map((v) => `<label><input type="radio" name="${esc(`${q.about}|${q.fact}`)}" value="${esc(v)}">${esc(v[0].toUpperCase() + v.slice(1).toLowerCase())}</label>`).join("")}</div>`
    : q.allowed_values.length ? `<select aria-label="${esc(q.label)}"><option value="">Choose…</option>${q.allowed_values.map((v) => `<option>${esc(v)}</option>`).join("")}</select>` : `<input aria-label="${esc(q.label)}"${limit}>`;
  const tag = q.status === "pre-filled from the PQR" ? `<span class="chip pre"><i aria-hidden="true"></i>pre-filled from the PQR</span>` : q.status.startsWith("from an uploaded") ? `<span class="chip doc"><i aria-hidden="true"></i>from an uploaded document; asked only if missing</span>` : "";
  const cond = [...new Set(q.used_by.map((u) => u.condition).filter(Boolean))];
  return `<div class="q"><span class="label">${esc(q.label)}</span>${tag}<div class="meta">${esc(q.fact)} · ${esc(q.repeats.replace(/_/g, " "))}${q.shortest_limit ? ` · at most ${q.shortest_limit.chars} characters (${esc(q.shortest_limit.form)})` : ""}</div>
${q.status === "asked" ? control : ""}<details><summary>Why this is asked: ${esc(q.asked_because)}</summary><ul class="meta">${q.used_by.map((u) => `<li>${esc(u.form)}: ${esc(u.caption || u.box)}</li>`).join("")}</ul>${cond.length ? `<p class="meta">Shown when: ${cond.map(esc).join("; ")}</p>` : ""}</details></div>`;
};
const block = (b: { block: string; questions: Question[] }) => `<section class="block"><h3>${esc(b.block)}</h3>${b.questions.map(question).join("")}</section>`;
const table = (caption: string, head: string[], rows: string[]) => `<div class="tablewrap"><table><caption>${esc(caption)}</caption><thead><tr>${head.map((h) => `<th scope="col"${/^(Tier|Client sees it|Checks)$/.test(h) ? ' class="nw"' : ""}>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`;

export function generate(releaseDir: string) {
  const config = JSON.parse(readFileSync(join(releaseDir, "configuration.json"), "utf8"));
  const release = JSON.parse(readFileSync(join(releaseDir, "release.json"), "utf8"));
  const name = basename(releaseDir);
  const v = buildViews(config);
  const from = `Release ${name} · configuration SHA-256 ${release.configuration_sha256.slice(0, 16)}… · approved by ${release.approver.user_id} · view code SHA-256 ${viewCodeSha().slice(0, 16)}…`;
  const out = join(PROTOTYPE, "p4", "out", name);
  mkdirSync(join(out, "brand"), { recursive: true });
  // Bytes only: the capture is read-only and a copy would keep that mode, so the next run could not rewrite it (run 6).
  for (const [to, from] of Object.entries(ASSETS)) writeFileSync(join(out, "brand", to), readFileSync(join(BRAND, from)));
  const pqr = `<h2>Prospect questions, in blocks</h2><p class="meta">${v.pqr.count} questions. Eligibility gates: ${esc(typeof v.pqr.gates === "string" ? v.pqr.gates : `${v.pqr.gates.length} gates`)}.</p>${v.pqr.blocks.map(block).join("")}`;
  const sqr = (a: "principal" | "partner") => {
    const s = v.sqr[a];
    return `<h2>${esc(s.answerer)}</h2><p class="meta">${s.counts.asked} questions asked · ${s.counts.prefilled} pre-filled from the PQR · ${s.counts.from_documents} supplied by uploaded documents. Forms: ${s.forms.map((f: any) => `${esc(f.form)}${f.status === "conditional" ? " (conditional)" : ""}`).join(", ")}.</p>
${s.people.map((p: any) => `<h2>About: ${esc(p.about)}</h2>${p.blocks.map(block).join("")}`).join("")}`;
  };
  const staff = `<p class="meta">Every fact the configuration places, every tier, by library section. Facts collected from staff or a profile record are entered here and never sent to a client.</p>${v.staff.map((s: any) => `<h2>${esc(s.section)}</h2>${table(`${s.section}: facts`, ["Fact", "About", "Tier", "Collected from", "Client sees it", "Read by forms", "Checks"], s.facts.map((f: any) => `<tr><td><b>${esc(f.label)}</b><div class="meta">${esc(f.fact)}</div></td><td>${esc(f.about.join("; "))}</td><td class="nw">${esc(f.tier)}</td><td>${esc(f.collected_from.replace(/_/g, " "))}${f.never_asked_of_client ? " (never asked of a client)" : ""}</td><td class="nw">${f.client_visible ? "yes" : "no"}</td><td>${esc(f.read_by_forms.join(", "))}</td><td class="nw">${f.checks}</td></tr>`))}`).join("")}
<h2>Completed by hand (hand route)</h2><p class="meta">${v.hand_route.length} boxes no fact fills; staff complete them on the form.</p>${table("Boxes completed by hand", ["Form", "Box", "Reason"], v.hand_route.map((h) => `<tr><td>${esc(h.form)}</td><td>${esc(h.caption || h.box)}</td><td>${esc(h.reason)}</td></tr>`))}`;
  const index = `<h2>Three views of one set of definitions</h2><section class="block"><ul><li><a href="pqr.html">PQR view</a>: ${v.pqr.count} prospect questions in ${v.pqr.blocks.length} blocks</li><li><a href="sqr-principal.html">SQR, principal applicant</a>: ${v.sqr.principal.counts.asked} asked, ${v.sqr.principal.counts.prefilled} pre-filled, ${v.sqr.principal.counts.from_documents} from documents</li><li><a href="sqr-partner.html">SQR, spouse or partner</a>: ${v.sqr.partner.counts.asked} asked, ${v.sqr.partner.counts.from_documents} from documents</li><li><a href="staff.html">Staff working view</a>: ${v.staff.reduce((n: number, s: any) => n + s.facts.length, 0)} facts in ${v.staff.length} sections; ${v.hand_route.length} boxes completed by hand</li></ul></section>`;
  const files: Record<string, string> = {
    "index.html": page("index.html", "Generated views", index, from), "pqr.html": page("pqr.html", "PQR view", pqr, from),
    "sqr-principal.html": page("sqr-principal.html", "SQR: principal applicant", sqr("principal"), from), "sqr-partner.html": page("sqr-partner.html", "SQR: spouse or partner", sqr("partner"), from),
    "staff.html": page("staff.html", "Staff working view", staff, from),
  };
  for (const [f, html] of Object.entries(files)) writeFileSync(join(out, f), html);
  writeFileSync(join(out, "views.json"), JSON.stringify({ release: name, configuration_sha256: release.configuration_sha256, view_code_sha256: viewCodeSha(), views: v }, null, 1) + "\n");
  return { out, views: v };
}

if (import.meta.main) {
  const dir = process.argv[2];
  if (!dir) { console.log("usage: generate.ts <release dir>"); process.exit(2); }
  const r = generate(join(PROTOTYPE, dir));
  console.log(JSON.stringify({ out: r.out, pqr: r.views.pqr.count, principal: r.views.sqr.principal.counts, partner: r.views.sqr.partner.counts, view_code_sha256: viewCodeSha() }));
}
