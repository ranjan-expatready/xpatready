// B121 (P-376 (7)): the schema's fast check, without a server or a browser (US$0). select-suites.mjs runs it with every
// change to prisma/ (which still runs every suite: the schema shapes every copy's database).
//   V  prisma validate: the schema is valid; a schema with a relation to a model that does not exist is refused.
//   M  the migrations, replayed on a scratch database, give exactly the schema (prisma migrate diff --exit-code): a model
//      added to the schema without its migration is caught. Drift already on main when this check came (6 Nov) is listed
//      in KNOWN with its finding; anything else fails. Take a line out of KNOWN in the PR that fixes it.
// A scratch shadow database (xr_studio_b121_<pid>) is made and dropped; nothing else is touched.
//   tsx studio/tests/check_prisma_schema.ts
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const STUDIO = join(dirname(fileURLToPath(import.meta.url)), "..");
const PRISMA = join(STUDIO, "node_modules", ".bin", "prisma"), SCHEMA = join(STUDIO, "prisma", "schema.prisma"), MIGRATIONS = join(STUDIO, "prisma", "migrations");
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
function diff(schema: string): { code: number; lines: string[]; out: string } {
  // Prisma 7 reads the shadow database from a config file; the paths on the command line are absolute.
  const cfg = join(WORK, "prisma.config.ts");
  writeFileSync(cfg, `import { defineConfig } from "prisma/config";\nexport default defineConfig({ schema: ${JSON.stringify(schema)}, migrations: { path: ${JSON.stringify(MIGRATIONS)} }, datasource: { url: ${JSON.stringify(url.href)}, shadowDatabaseUrl: ${JSON.stringify(new URL(`/${SHADOW}`, url).href)} } });\n`);
  const r = prisma(["migrate", "diff", "--config", cfg, "--from-migrations", MIGRATIONS, "--to-schema", schema, "--exit-code"]);
  return { code: r.code, lines: driftLines(r.out), out: r.out };
}

mkdirSync(WORK, { recursive: true });
try {
  execFileSync("createdb", [...pg, SHADOW], { stdio: "pipe" });
  const real = readFileSync(SCHEMA, "utf8");
  // V
  const v = prisma(["validate", "--schema", SCHEMA]);
  ok("V pass: prisma validate accepts the schema", v.code === 0, v.out);
  const broken = join(WORK, "broken.prisma");
  writeFileSync(broken, `${real}\nmodel B121Broken {\n  id    String @id\n  other B121Missing @relation(fields: [id], references: [id])\n}\n`);
  const vb = prisma(["validate", "--schema", broken]);
  ok("V fail: a relation to a model that does not exist is refused", vb.code !== 0, vb.out);
  // M
  const d = diff(SCHEMA);
  const unknown = d.lines.filter((l) => !KNOWN.has(l)), gone = [...KNOWN].filter((l) => !d.lines.includes(l));
  ok(`M pass: the migrations give the schema, apart from the ${KNOWN.size} known differences (diff exit ${d.code}, ${d.lines.length} difference(s))`, d.code !== 1 && unknown.length === 0, unknown.join(" · ") || d.out);
  ok("M: every known difference is still there (a fixed one leaves KNOWN in the same PR)", gone.length === 0, gone.join(" · "));
  const extra = join(WORK, "extra.prisma");
  writeFileSync(extra, `${real}\nmodel B121SelfTest {\n  id Int @id\n  @@map("b121_self_test")\n}\n`);
  const de = diff(extra);
  ok("M fail: a model added to the schema without its migration is caught", de.code === 2 && de.lines.includes("added table b121_self_test"), de.lines.join(" · ") || de.out);
} catch (e) {
  ok("the schema check ran", false, (e as Error).message);
} finally {
  spawnSync("dropdb", [...pg, "--if-exists", SHADOW], { stdio: "ignore" });
  rmSync(WORK, { recursive: true, force: true });
}
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
