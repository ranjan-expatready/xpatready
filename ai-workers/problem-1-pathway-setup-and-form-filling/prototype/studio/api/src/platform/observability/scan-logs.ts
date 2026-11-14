// PF-23 (5), the CI check "no personal data in logs" (Doc-1 §8.4 release gate; SA-11 BR-16, SA-11-37): reads the
// server logs the suites just produced (every isolated copy's api.log, kept by isolated.sh as
// var/isolated-logs/<name>-api.log, and any copy still running) and fails on any line that holds
//  * a seeded personal value: the made-up people of the sample data (samples/*.json: their emails, passport numbers,
//    dates of birth and full names) and PF-23's own canaries (CANARIES below, which its test sends in a request, an
//    error and a job), or
//  * an email address, a bearer or basic credential, or a JWT, whoever's it is.
// The finding names the file, the line number and the rule, never the value. Exit 0 clean, 1 on a finding, 2 when it
// could not run. --self-test first proves a planted leaking line fails and a redacted one passes.
//   tsx studio/api/src/platform/observability/scan-logs.ts [--self-test] [file or folder …]
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const STUDIO = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

/** Made-up personal values PF-23's test sends through a request, an error and a job; none may reach a log. */
export const CANARIES = {
  email: "pf23.canary@example.org",
  phone: "+1 416 555 0199",
  name: "Canary Personname",
  bearer: "pf23CanaryBearerToken0123456789",
  document: "ZX9988776",
} as const;

const SEEDED_KEY = /(^|[._])(email|passport_number|given_names|family_name|client_name|visit_contact_name|date_of_birth|uci|phone_number|telephone_number)$/i;
/** The sample data's personal values worth finding: emails, document-like numbers, dates of birth and names of two or
 *  more words: a contact's name, or given and family names joined (a lone word such as "SAMPLE" is everywhere in honest text). */
export function seededValues(samplesDir = join(STUDIO, "samples")): string[] {
  const out = new Set<string>(Object.values(CANARIES));
  const keep = (k: string, v: string) => {
    const s = v.trim();
    if (/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(s) || /^[A-Z]{1,2}\d{6,9}$/.test(s) || (/date_of_birth$/i.test(k) && /^\d{4}-\d{2}-\d{2}$/.test(s))) out.add(s);
    // A contact's name as written; given names alone are not seeded ("Solo Sample" is also inside an employer's name):
    // they are joined with the family name below, as a full name.
    else if (/name/i.test(k) && !/given_names|family_name/i.test(k) && /^[A-Za-z'-]{2,}( [A-Za-z'-]{2,})+$/.test(s) && !/\bpermit$/i.test(s)) out.add(s); // not "Study permit" (a client_name that is a program)
  };
  const walk = (o: unknown, depth: number): void => {
    if (depth > 30 || o == null || typeof o !== "object") return;
    if (Array.isArray(o)) { for (const x of o) walk(x, depth + 1); return; }
    const rec = o as Record<string, unknown>;
    for (const [k, v] of Object.entries(rec)) { if (typeof v === "string" && SEEDED_KEY.test(k)) keep(k, v); walk(v, depth + 1); }
    // A person's full name, given and family names joined (review m13: stored apart, logged together).
    for (const p of ["", "person."]) {
      const g = rec[`${p}given_names`], f = rec[`${p}family_name`];
      if (typeof g === "string" && typeof f === "string" && g.trim() && f.trim()) out.add(`${g.trim()} ${f.trim()}`);
    }
  };
  for (const f of existsSync(samplesDir) ? readdirSync(samplesDir).filter((f) => f.endsWith(".json")).sort() : []) {
    try { walk(JSON.parse(readFileSync(join(samplesDir, f), "utf8")), 0); } catch { /* a file that is not JSON holds no seed */ }
  }
  return [...out];
}

const RULES: [string, RegExp][] = [
  ["an email address", /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/],
  ["a bearer or basic credential", /\b(?:Bearer|Basic)\s+(?!\[token\])[A-Za-z0-9._~+/=-]{8,}/i],
  ["a JWT", /\beyJ[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}\./],
];

export type Finding = { file: string; line: number; rule: string };

export function scanText(text: string, file: string, seeded: string[]): Finding[] {
  const out: Finding[] = [];
  text.split("\n").forEach((l, i) => {
    const s = seeded.findIndex((v) => l.includes(v));
    if (s >= 0) out.push({ file, line: i + 1, rule: `a seeded personal value (#${s + 1} of the seeded list)` });
    else for (const [rule, re] of RULES) if (re.test(l)) { out.push({ file, line: i + 1, rule }); break; }
  });
  return out;
}

/** The server logs under `targets` (files, or folders whose *api.log files are read). */
export function logFiles(targets: string[]): string[] {
  const files: string[] = [];
  for (const t of targets) {
    if (!existsSync(t)) continue;
    if (statSync(t).isFile()) { files.push(t); continue; }
    for (const f of readdirSync(t).sort()) {
      const p = join(t, f);
      if (/api\.log$/.test(f) && statSync(p).isFile()) files.push(p);
      else if (/^isolated-/.test(f) && statSync(p).isDirectory() && existsSync(join(p, "api.log"))) files.push(join(p, "api.log"));
    }
  }
  return files;
}

export function scan(targets: string[], seeded = seededValues()): { files: string[]; lines: number; findings: Finding[] } {
  const files = logFiles(targets);
  let lines = 0;
  const findings: Finding[] = [];
  for (const f of files) { const t = readFileSync(f, "utf8"); lines += t.split("\n").length; findings.push(...scanText(t, f, seeded)); }
  return { files, lines, findings };
}

function selfTest(): boolean {
  const dir = mkdtempSync(join(tmpdir(), "pf23-scan-"));
  try {
    const seeded = seededValues();
    writeFileSync(join(dir, "clean-api.log"), `${JSON.stringify({ time: "2026-11-14T00:00:00.000Z", level: "info", event: "request", route: "/api/x/:id", authorization: "[redacted]", note: "Bearer [token] [email] [number]" })}\n`);
    writeFileSync(join(dir, "leak-api.log"), `${JSON.stringify({ level: "error", event: "console", message: `could not send to ${CANARIES.email}` })}\n`);
    const clean = scan([join(dir, "clean-api.log")], seeded), leak = scan([join(dir, "leak-api.log")], seeded);
    const seedOk = seeded.includes("client.a@example.com") && seeded.includes("Z7000001") && !seeded.includes("SAMPLE") && !seeded.includes("Solo Sample");
    const ok = clean.findings.length === 0 && leak.findings.length === 1 && leak.findings[0].line === 1 && seedOk;
    console.log(`self-test: a redacted line ${clean.findings.length ? "FAILED (it should pass)" : "passes"}; a planted leaking line ${leak.findings.length === 1 ? "fails (as it must)" : "PASSED (it should fail)"}; seeded list ${seedOk ? `read (${seeded.length} values)` : "WRONG"}`);
    return ok;
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  if (args.includes("--self-test")) process.exit(selfTest() ? 0 : 1);
  // Every copy's kept log, the demo's, and a retried suite's first-try logs (var/suites/*.try1-api.log; review m13).
  const targets = args.length ? args : [join(STUDIO, "var", "isolated-logs"), join(STUDIO, "var"), join(STUDIO, "var", "suites")];
  try {
    const r = scan(targets);
    for (const f of r.findings.slice(0, 50)) console.log(`FAIL  ${relative(process.cwd(), f.file)}:${f.line}: ${f.rule} (value not shown)`);
    if (!r.files.length) { console.log("no personal data in logs: nothing scanned — no server log here (this part ran no server suite); ok"); process.exit(0); }
    console.log(`no personal data in logs: ${r.files.length} server log(s), ${r.lines} lines, ${r.findings.length} finding(s)${r.findings.length ? " — FAIL (SA-11 BR-16: a log holds record ids and rule names only)" : " — ok"}`);
    process.exit(r.findings.length ? 1 : 0);
  } catch (e) { console.log(`no personal data in logs: could not run (${(e as Error).message})`); process.exit(2); }
}
