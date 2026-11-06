#!/usr/bin/env node
// B120 (P-376 (3)): a canonical dump of a Studio copy's data, so "behaviour unchanged" is compared byte for byte, not
// asserted. Two copies loaded the same way by the same code must give the same file; then a refactor's copy must give
// the same file as main's. Reads only (US$0, no model call, no write to the database or the files).
//   node studio/tools/demo-dump.mjs <database url> <var dir> <out file>
//   e.g. node studio/tools/demo-dump.mjs postgresql://xr_studio@127.0.0.1:54329/xr_studio_b120a studio/var/isolated-b120a a.dump
// What it writes, one line each, sorted:
//   T <table> <row as canonical JSON> [<its token>]   every row of every table but _prisma_migrations;
//   F <path> <sha256>                    every working file under <var dir>/workspaces.
// What it masks, because two runs of the same code differ there by design (measured on main, 6 Nov; B120 notes):
//   * every UUID: replaced by a token made from its table and a hash of the row it identifies, refined over the rows it
//     points at, so which row points at which is compared and the random ids are not; its first 8 hex digits (a case
//     reference, a copy's file name) read as that token with "/8". A UUID no row owns reads <uuid?>;
//   * timestamps (timestamp and date columns, ISO strings in text and JSON): <t>;
//   * measured durations ("… in 20.6 s"; the values of keys seconds, timings, duration_ms): <s>;
//   * the copy's folder name in stored paths (var/isolated-<copy>/) and a merged run's time-and-random id (<run>);
//   * hashes computed over ids (plan_sha256, run_key, idempotency_fingerprint): <h>;
//   * a generated PDF's bytes: IRCC's forms are AES-encrypted, so each write has a fresh random IV. A PDF line has its
//     size, and any hash equal to a generated PDF's reads <pdf>. The fill's input, its request.json, is compared in full;
//   * the order of three lists main builds in no fixed order (UNORDERED below): sorted.
// A JSON working file is compared by its content masked the same way; any other file by its bytes. Anything else that
// differs between two runs of the same code is a finding: it is named, never masked quietly. DEMO_DUMP_FULL=1 writes a
// JSON working file's masked content instead of its hash, to see what differs.
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { createRequire } from "node:module";

const [url, varDir, out] = process.argv.slice(2);
if (!url || !varDir || !out) { console.error("usage: node studio/tools/demo-dump.mjs <database url> <var dir> <out file>"); process.exit(2); }
const pg = createRequire(import.meta.url)("pg");

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const SHORT = /\b[0-9a-f]{8}\b/g;
const HEX64 = /\b[0-9a-f]{64}\b/g;
const ISO = /\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}(?::?\d{2})?)?/g;
const SECONDS = /\b(in|after|took) \d+(?:\.\d+)? s\b/g;
const RUN_ID = /\d{8}t\d{9}z-[0-9a-f]{6}/g; // api/src/sources.ts: studio-fieldmap-<form>-merged-<time>-<6 hex>
const COPY = /\bvar\/isolated-[a-z0-9_]+\//g;
const TIMED_KEYS = new Set(["seconds", "timings", "duration_ms"]);
const ID_HASH_KEYS = new Set(["plan_sha256", "run_key", "idempotency_fingerprint"]);
// Lists main fills in no fixed order (measured: two serial runs of main differ only in their order). Each is sorted by
// its masked content. table → dotted paths, "*" for any key.
const UNORDERED = {
  answer_snapshot: ["facts_json.groups"],          // a case's answer groups, one per person, in the order of their random ids
  proposal_item: ["work.affected.*.people"],        // the people a proposed field affects
  form_line_action: ["detail.after"],               // the form lines a line action left, read with no order
};
const sha = (s) => createHash("sha256").update(s).digest("hex");

// Working files first: a generated PDF's hash is masked wherever it is quoted.
const walk = (d) => (existsSync(d) ? readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; }) : []);
const ws = join(varDir, "workspaces");
const files = walk(ws).map((f) => ({ f, bytes: readFileSync(f) }));
const pdfHashes = new Set(files.filter((x) => /\.pdf$/i.test(x.f) && x.bytes.includes("/Encrypt")).map((x) => sha(x.bytes)));

let short = new Map(); // first 8 hex digits → the UUID, for every UUID in the data
const text = (s, id) => s.replace(UUID, (u) => id(u.toLowerCase())).replace(SHORT, (h) => (short.has(h) ? `${id(short.get(h))}/8` : h))
  .replace(HEX64, (h) => (pdfHashes.has(h) ? "<pdf>" : h)).replace(ISO, "<t>").replace(RUN_ID, "<run>").replace(COPY, "var/isolated-<copy>/").replace(SECONDS, "$1 <s> s");
/** A value with the masks above applied and each UUID passed to `id` (a function of the UUID). */
function mask(v, id, key = "") {
  if (TIMED_KEYS.has(key) && v != null) return "<s>";
  if (ID_HASH_KEYS.has(key) && v != null) return "<h>";
  if (typeof v === "string") return text(v, id);
  if (Array.isArray(v)) return v.map((x) => mask(x, id));
  if (v && typeof v === "object") return Object.fromEntries(Object.keys(v).sort().map((k) => [k, mask(v[k], id, k)]));
  return v;
}
/** Sorts the lists at `path` (dotted, "*" for any key) inside `v`, by their masked content. */
function sortAt(v, path) {
  if (v == null || typeof v !== "object") return;
  const [head, ...rest] = path;
  for (const k of head === "*" ? Object.keys(v) : [head]) {
    if (!(k in v)) continue;
    if (rest.length) sortAt(v[k], rest);
    else if (Array.isArray(v[k])) v[k] = [...v[k]].sort((a, b) => { const x = JSON.stringify(a), y = JSON.stringify(b); return x < y ? -1 : x > y ? 1 : 0; });
  }
}
const canon = (table, row, id) => { const m = mask(row, id); for (const p of UNORDERED[table] ?? []) sortAt(m, p.split(".")); return JSON.stringify(m); };

const db = new pg.Client({ connectionString: url });
await db.connect();
const tables = (await db.query(`SELECT table_name AS t FROM information_schema.tables WHERE table_schema = current_schema() AND table_type = 'BASE TABLE' AND table_name <> '_prisma_migrations' ORDER BY 1`)).rows.map((r) => r.t);
const timeCols = new Map();
for (const r of (await db.query(`SELECT table_name AS t, column_name AS c FROM information_schema.columns WHERE table_schema = current_schema() AND (data_type LIKE 'timestamp%' OR data_type = 'date')`)).rows) {
  if (!timeCols.has(r.t)) timeCols.set(r.t, new Set());
  timeCols.get(r.t).add(r.c);
}
const rows = []; // { table, row, own: the UUID of its id column, or null }
for (const t of tables) {
  for (const { j } of (await db.query(`SELECT row_to_json(x)::text AS j FROM "${t.replace(/"/g, "")}" x`)).rows) {
    const row = JSON.parse(j);
    for (const c of timeCols.get(t) ?? []) if (row[c] != null) row[c] = "<t>";
    const own = typeof row.id === "string" && new RegExp(`^${UUID.source}$`, "i").test(row.id) ? row.id.toLowerCase() : null;
    rows.push({ table: t, row, own });
  }
}
await db.end();
for (const r of rows) for (const u of JSON.stringify(r.row).match(UUID) ?? []) short.set(u.slice(0, 8).toLowerCase(), u.toLowerCase());

// A row's own id inside its own content (a form copy's path names its own id) reads <self>: otherwise twins, numbered
// in whatever order the database returns them, would name themselves differently from run to run.
const self = (r, name) => (u) => (u === r.own ? "<self>" : name(u));
// Tokens: round 0 names each row by its table and its content with every UUID unnamed; each further round names it by
// its content with the UUIDs it points at named by the round before, so rows alike in content are told apart by what
// they point at. Rows still alike after the last round are numbered in sorted order (~2, ~3, …).
let token = new Map();
for (let round = 0; round < 4; round++) {
  const name = (u) => (round === 0 ? "<id>" : token.get(u) ?? "<uuid?>");
  const next = new Map(), seen = new Map();
  const named = rows.filter((r) => r.own).map((r) => ({ r, h: `${r.table}:${sha(canon(r.table, { ...r.row, id: null }, self(r, name))).slice(0, 12)}` }));
  named.sort((a, b) => (a.h < b.h ? -1 : a.h > b.h ? 1 : 0));
  for (const { r, h } of named) { const n = (seen.get(h) ?? 0) + 1; seen.set(h, n); next.set(r.own, n === 1 ? h : `${h}~${n}`); }
  token = next;
}
const named = (u) => token.get(u) ?? "<uuid?>";
const lines = rows.map((r) => `T ${r.table} ${canon(r.table, { ...r.row, id: null }, self(r, named))}${r.own ? ` ${named(r.own)}` : ""}`);
for (const { f, bytes } of files) {
  const path = text(relative(ws, f), named);
  if (pdfHashes.has(sha(bytes))) { lines.push(`F ${path} <pdf, encrypted: ${bytes.length} bytes>`); continue; }
  let content = bytes;
  if (/\.json$/.test(f)) { try { content = JSON.stringify(mask(JSON.parse(bytes.toString("utf8")), named)); } catch { /* not JSON after all: its bytes */ } }
  lines.push(`F ${path} ${process.env.DEMO_DUMP_FULL === "1" && /\.json$/.test(f) ? String(content) : sha(content)}`); // DEMO_DUMP_FULL=1: a JSON file's masked content, to explain a difference
}

lines.sort();
writeFileSync(out, lines.join("\n") + "\n");
const count = (p) => lines.filter((l) => l.startsWith(p)).length;
console.log(`demo-dump: ${count("T ")} rows in ${tables.length} tables, ${count("F ")} working files (${pdfHashes.size} encrypted PDFs by size) → ${out} (sha256 ${sha(lines.join("\n") + "\n").slice(0, 16)})`);
