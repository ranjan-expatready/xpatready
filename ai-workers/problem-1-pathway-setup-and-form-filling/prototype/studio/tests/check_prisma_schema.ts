// B121 (P-376 (7)): the schema's fast check, without a server or a browser (US$0). select-suites.mjs runs it with every
// change to prisma/ (which still runs every suite: the schema shapes every copy's database).
//   V  prisma validate: the schema is valid; a schema with a relation to a model that does not exist is refused.
//   F  DB-SPLIT: the schema is a folder, prisma/schema/<area>.prisma; each file opens with its one-line rule
//      ("// <file> — what belongs here … Owner: …") and only base.prisma holds the generator and the datasource.
//   M  the migrations, replayed on a scratch database, give exactly the schema (prisma migrate diff --exit-code): a model
//      added to the schema without its migration is caught. Drift already on main when this check came (6 Nov) is listed
//      in KNOWN with its finding; anything else fails. Take a line out of KNOWN in the PR that fixes it.
// A scratch shadow database (xr_studio_b121_<pid>) is made and dropped, with a killed run's leftovers; nothing else.
//   tsx studio/tests/check_prisma_schema.ts
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const STUDIO = join(dirname(fileURLToPath(import.meta.url)), "..");
const PRISMA = join(STUDIO, "node_modules", ".bin", "prisma"), SCHEMA = join(STUDIO, "prisma", "schema"), MIGRATIONS = join(STUDIO, "prisma", "migrations");
const url = new URL(process.env.DATABASE_URL ?? "postgresql://xr_studio@127.0.0.1:54329/xr_studio_demo");
const pg = ["-h", url.hostname, "-p", url.port || "5432", "-U", decodeURIComponent(url.username)];
const SHADOW = `xr_studio_b121_${process.pid}`, WORK = join(STUDIO, "var", `schema-check-${process.pid}`);
// Drift on main at 4e26fb229 (6 Nov), one line per difference "table: change" as prisma migrate diff names them.
// Finding for the tech lead (B121's PR): the migrations still create canonical_field_name, which the schema no longer
// has; four tables get their id default from the database in the migrations and from Prisma in the schema.
const KNOWN = new Set([
  "removed table canonical_field_name",
  "fact_source: id default changed from database gen_random_uuid() to none",
  "form_edition_accept: id default changed from database gen_random_uuid() to none",
  "person_role: id default changed from database gen_random_uuid() to none",
  "validated_copy: id default changed from database gen_random_uuid() to none",
]);

let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${String(detail).slice(0, 400)}` : ""}`); };
const prisma = (args: string[]) => { const r = spawnSync(PRISMA, args, { cwd: STUDIO, encoding: "utf8" }); return { code: r.status ?? 1, out: `${r.stdout}${r.stderr}` }; };

// prisma migrate diff's summary as "table: change" lines (the words it prints, with the default's value kept short).
function driftLines(out: string): string[] {
  const lines: string[] = []; let table = "", section = "";
  for (const l of out.split("\n")) {
    let m: RegExpMatchArray | null;
    if ((m = l.match(/^\[([+*-])\] (Removed|Added) tables/))) { section = m[2].toLowerCase(); table = ""; continue; }
    if ((m = l.match(/^\[\*\] Changed the `([^`]+)` table/))) { section = ""; table = m[1]; continue; }
    if ((m = l.match(/^\[[+*-]\] (.+)$/))) { section = ""; table = ""; lines.push(m[1].trim()); continue; }
    if (section && (m = l.match(/^\s+- (\S+)/))) { lines.push(`${section} table ${m[1]}`); continue; }
    if (table && (m = l.match(/^\s+\[[+*-]\] (.+)$/))) {
      const c = m[1].replace(/^Altered column `([^`]+)` \(default changed from `Some\(DbGenerated\(Some\("([^"]+)"\)\)\)` to `None`\)$/, "$1 default changed from database $2 to none");
      lines.push(`${table}: ${c}`);
    }
  }
  return lines;
}
// A copy of the schema folder with one more file in it (the folder is the schema since DB-SPLIT).
function withFile(name: string, file: string, content: string): string {
  const dir = join(WORK, name); cpSync(SCHEMA, dir, { recursive: true }); writeFileSync(join(dir, file), content); return dir;
}
// F: the files of a schema folder that break the one-file-per-area rule, in words.
function areaFaults(dir: string): string[] {
  const faults: string[] = [];
  for (const f of readdirSync(dir).filter((n) => n.endsWith(".prisma")).sort()) {
    const text = readFileSync(join(dir, f), "utf8");
    if (!new RegExp(`^// ${f.replace(".", "\\.")} — .+ Owner: .+\\.\n`).test(text)) faults.push(`${f}: no one-line rule ("// ${f} — … Owner: ….") on its first line`);
    if (f !== "base.prisma" && /^(generator|datasource) /m.test(text)) faults.push(`${f}: a generator or datasource outside base.prisma`);
  }
  return faults;
}
function diff(schema: string): { code: number; lines: string[]; out: string } {
  // Prisma 7 reads the shadow database from a config file; the paths on the command line are absolute.
  const cfg = join(WORK, "prisma.config.ts");
  // migrate diff writes to no database; the datasource names the server's own "postgres" database, never the demo's.
  writeFileSync(cfg, `import { defineConfig } from "prisma/config";\nexport default defineConfig({ schema: ${JSON.stringify(schema)}, migrations: { path: ${JSON.stringify(MIGRATIONS)} }, datasource: { url: ${JSON.stringify(new URL("/postgres", url).href)}, shadowDatabaseUrl: ${JSON.stringify(new URL(`/${SHADOW}`, url).href)} } });\n`);
  const r = prisma(["migrate", "diff", "--config", cfg, "--from-migrations", MIGRATIONS, "--to-schema", schema, "--exit-code"]);
  return { code: r.code, lines: driftLines(r.out), out: r.out };
}

// Leftovers of an earlier run that was killed while prisma ran (a signal cannot be handled during spawnSync): its
// scratch database and folder go first, when its process is gone.
const alive = (pid: number) => { try { process.kill(pid, 0); return true; } catch { return false; } };
const left = spawnSync("psql", [...pg, "-d", "postgres", "-Atc", "select datname from pg_database where datname like 'xr\\_studio\\_b121\\_%'"], { encoding: "utf8" }).stdout ?? "";
for (const db of left.split("\n").filter(Boolean)) if (!alive(Number(db.split("_").pop()))) spawnSync("dropdb", [...pg, "--if-exists", "--force", db], { stdio: "ignore" });
for (const d of readdirSync(join(STUDIO, "var"), { withFileTypes: true })) { const m = d.name.match(/^schema-check-(\d+)$/); if (d.isDirectory() && m && !alive(Number(m[1]))) rmSync(join(STUDIO, "var", d.name), { recursive: true, force: true }); }
// Cleaned up on every end, also when run-suites.sh's timeout stops it (SIGTERM) or a person does (SIGINT) between steps.
const cleanup = () => { spawnSync("dropdb", [...pg, "--if-exists", "--force", SHADOW], { stdio: "ignore" }); rmSync(WORK, { recursive: true, force: true }); };
for (const sig of ["SIGTERM", "SIGINT"] as const) process.on(sig, () => { cleanup(); process.exit(1); });
mkdirSync(WORK, { recursive: true });
try {
  execFileSync("createdb", [...pg, SHADOW], { stdio: "pipe" });
  // V
  const v = prisma(["validate", "--schema", SCHEMA]);
  ok("V pass: prisma validate accepts the schema", v.code === 0, v.out);
  const broken = withFile("broken", "broken.prisma", `model B121Broken {\n  id    String @id\n  other B121Missing @relation(fields: [id], references: [id])\n}\n`);
  const vb = prisma(["validate", "--schema", broken]);
  ok("V fail: a relation to a model that does not exist is refused", vb.code !== 0, vb.out);
  // F
  const files = readdirSync(SCHEMA).filter((n) => n.endsWith(".prisma"));
  ok(`F pass: the schema is a folder of area files (${files.length}), each with its rule line; generator and datasource only in base.prisma`, files.includes("base.prisma") && files.length > 1 && areaFaults(SCHEMA).length === 0, areaFaults(SCHEMA).join(" · "));
  const ruleless = withFile("ruleless", "notes.prisma", `model B121NoRule {\n  id Int @id\n}\n`);
  ok("F fail: an area file without its rule line is named", areaFaults(ruleless).some((l) => l.startsWith("notes.prisma: no one-line rule")), areaFaults(ruleless).join(" · "));
  const second = withFile("second", "cases.prisma", `${readFileSync(join(SCHEMA, "cases.prisma"), "utf8")}\ngenerator other {\n  provider = "prisma-client-js"\n}\n`);
  ok("F fail: a generator outside base.prisma is named", areaFaults(second).includes("cases.prisma: a generator or datasource outside base.prisma"), areaFaults(second).join(" · "));
  // M
  const d = diff(SCHEMA);
  const unknown = d.lines.filter((l) => !KNOWN.has(l)), gone = [...KNOWN].filter((l) => !d.lines.includes(l));
  ok(`M pass: the migrations give the schema, apart from the ${KNOWN.size} known differences (diff exit ${d.code}, ${d.lines.length} difference(s))`, d.code !== 1 && unknown.length === 0, unknown.join(" · ") || d.out);
  ok("M: every known difference is still there (a fixed one leaves KNOWN in the same PR)", gone.length === 0, gone.join(" · "));
  const extra = withFile("extra", "extra.prisma", `// extra.prisma — B121's self-test model. Owner: this check.\nmodel B121SelfTest {\n  id Int @id\n  @@map("b121_self_test")\n}\n`);
  const de = diff(extra);
  ok("M fail: a model added to the schema without its migration is caught", de.code === 2 && de.lines.includes("added table b121_self_test"), de.lines.join(" · ") || de.out);
} catch (e) {
  ok("the schema check ran", false, (e as Error).message);
} finally {
  cleanup();
}
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
