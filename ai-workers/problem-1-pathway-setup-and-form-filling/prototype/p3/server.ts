// P3 review workbench server (demonstration-only; plain Node, no framework). Serves the review screen and
// records decisions, the submission and the release as JSON files under p3/state and p3/releases.
//   node p3/server.ts [--config p2/config/c1-draft-1-live-r2.json] [--port 4317]
// Since the P2 response the default draft is the reviewed-repairs configuration (c1-draft-1-live-r2); the original
// c1-draft-1-live stays as evidence and can still be loaded with --config.
import { Ajv } from "ajv";
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { basename, join } from "node:path";
import { ASSETS, BRAND } from "../p4/generate.ts";
import { ACTORS, approve, AUTHOR, buildItems, configHash, current, PROTOTYPE, readiness, refuseDecision, releasedConfig, reusedDecisions, type Decision } from "./review.ts";

const arg = (n: string, d: string) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : d; };
const CONFIG = join(PROTOTYPE, arg("config", "p2/config/c1-draft-1-live-r2.json"));
const PORT = Number(arg("port", "4317"));
const NAME = basename(CONFIG, ".json");
const STATE = join(PROTOTYPE, "p3", "state", NAME);
const RELEASES = join(PROTOTYPE, "p3", "releases");
const LOG = join(STATE, "decisions.jsonl"), SUB = join(STATE, "submission.json");
const UI = join(PROTOTYPE, "p3", "ui");
mkdirSync(STATE, { recursive: true }); mkdirSync(RELEASES, { recursive: true });

const config = JSON.parse(readFileSync(CONFIG, "utf8"));
const items = buildItems(config);
const byId = new Map(items.map((i) => [i.id, i]));
// --previous p3/releases/c1-v1: unchanged items keep their approval and SME sign-off (5.1 a1, 4.4 r2).
const PREV = process.argv.includes("--previous") ? join(PROTOTYPE, arg("previous", "")) : null;
const previous = PREV ? { config: JSON.parse(readFileSync(join(PREV, "configuration.json"), "utf8")), hash: JSON.parse(readFileSync(join(PREV, "release.json"), "utf8")).configuration_sha256, label: basename(PREV) } : null;
const reused = reusedDecisions(items, previous);
const decisions = (): Decision[] => [...reused, ...(existsSync(LOG) ? readFileSync(LOG, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [])];
const submission = () => (existsSync(SUB) ? JSON.parse(readFileSync(SUB, "utf8")) : null);
const releases = () => readdirSync(RELEASES).filter((d) => d.startsWith("c1-v")).sort().map((d) => JSON.parse(readFileSync(join(RELEASES, d, "release.json"), "utf8")));

const ajv = new Ajv({ allErrors: true, strict: false });
const releaseContract = ajv.compile(JSON.parse(readFileSync(join(PROTOTYPE, "contracts", "release-record.v0.schema.json"), "utf8")));

function state() {
  const ds = decisions(), { review, sme } = current(ds);
  return {
    label: config.label, configuration: { name: NAME, version: config.configuration_version, status: config.status, sources: config.sources.length, drafting_runs: config.drafting_run_ids.length, structure: config.structure, previous: previous ? { release: previous.label, sha256: previous.hash, reused_items: reused.filter((d) => d.decision !== "sme_signed").length } : null },
    simulated_users: ACTORS, author: AUTHOR, submission: submission(), releases: releases(),
    readiness: readiness(items, ds),
    items: items.map((i) => ({ ...i, decision: review.get(i.id) ?? null, sme: sme.get(i.id) ?? null })),
  };
}

function body(req: any): Promise<any> {
  return new Promise((ok, bad) => { let s = ""; req.on("data", (c: Buffer) => (s += c)); req.on("end", () => { try { ok(s ? JSON.parse(s) : {}); } catch (e) { bad(e); } }); });
}
const send = (res: any, code: number, data: unknown, type = "application/json") => { res.writeHead(code, { "content-type": type, "cache-control": "no-store" }); res.end(type === "application/json" ? JSON.stringify(data) : data); };

createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) return send(res, 200, readFileSync(join(UI, "index.html")), "text/html; charset=utf-8");
    if (req.method === "GET" && url.pathname === "/app.js") return send(res, 200, readFileSync(join(UI, "app.js")), "text/javascript; charset=utf-8");
    if (req.method === "GET" && url.pathname === "/style.css") return send(res, 200, readFileSync(join(UI, "style.css")), "text/css; charset=utf-8");
    // The brand kit's fonts and logos (AIW-D265), the same files the P4 views use, served from the read-only capture.
    const asset = url.pathname.startsWith("/brand/") ? url.pathname.slice(7) : null;
    if (req.method === "GET" && asset && Object.hasOwn(ASSETS, asset)) return send(res, 200, readFileSync(join(BRAND, ASSETS[asset])), asset.endsWith(".svg") ? "image/svg+xml" : asset.endsWith(".woff2") ? "font/woff2" : asset.endsWith(".otf") ? "font/otf" : "text/plain; charset=utf-8");
    if (req.method === "GET" && url.pathname === "/api/state") return send(res, 200, state());
    if (req.method === "POST" && url.pathname === "/api/decide") {
      const b = await body(req);
      const ids: string[] = Array.isArray(b.item_ids) ? b.item_ids : [b.item_id];
      const results = ids.map((id) => {
        const d = { item_id: id, decision: b.decision, by: b.by, ...(b.reason ? { reason: String(b.reason) } : {}), ...(b.instruction ? { instruction: String(b.instruction) } : {}), ...(b.chosen !== undefined ? { chosen: Number(b.chosen) } : {}) };
        const why = refuseDecision(byId, d);
        if (why) return { item_id: id, ok: false, reason: why };
        appendFileSync(LOG, JSON.stringify({ ...d, at: new Date().toISOString() }) + "\n");
        return { item_id: id, ok: true };
      });
      // A decision after submission changes the configuration: the submission no longer matches (5.3 a2).
      return send(res, 200, { results, recorded: results.filter((r) => r.ok).length });
    }
    if (req.method === "POST" && url.pathname === "/api/submit") {
      const b = await body(req);
      const ds = decisions(), r = readiness(items, ds);
      if (!ACTORS.some((a) => a.user_id === b.by)) return send(res, 400, { ok: false, reason: "unknown user" });
      if (!r.ready) return send(res, 409, { ok: false, reason: `not ready: ${r.blockers.join("; ")}` });
      const version = releases().length + 1;
      const sub = { hash: configHash(releasedConfig(config, items, ds, version, previous?.config ?? null)), by: b.by, at: new Date().toISOString(), version, decisions_at_submit: ds.length };
      writeFileSync(SUB, JSON.stringify(sub, null, 1) + "\n");
      return send(res, 200, { ok: true, submission: sub });
    }
    if (req.method === "POST" && url.pathname === "/api/approve") {
      const b = await body(req);
      const version = releases().length + 1;
      const r = approve({ config, items, decisions: decisions(), submission: submission(), approver: b.by, version, sourceFiles: config.sources, previous });
      if (!r.ok) return send(res, 409, r);
      if (!releaseContract(r.record)) return send(res, 500, { ok: false, reason: "release record fails its contract", errors: releaseContract.errors });
      const dir = join(RELEASES, `c1-v${version}`);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "configuration.json"), JSON.stringify(r.released, null, 1) + "\n");
      const report = {
        configuration_sha256: r.hash, version, structure: config.structure, unresolved_from_drafting: config.unresolved.length,
        historical_comparison: Object.fromEntries(config.field_maps.map((m: any) => [m.form_edition, "Historical comparison unavailable"])), // 5.3 r4, 4.3 r11
        label: config.label,
      };
      writeFileSync(join(dir, "validation-report.json"), JSON.stringify(report, null, 1) + "\n");
      writeFileSync(join(dir, "release.json"), JSON.stringify(r.record, null, 1) + "\n"); // exactly the release-record contract
      writeFileSync(join(dir, "files.json"), JSON.stringify({ version, configuration_file: "configuration.json", configuration_file_sha256: (await import("node:crypto")).createHash("sha256").update(readFileSync(join(dir, "configuration.json"))).digest("hex"), configuration_sha256_is: "SHA-256 of the canonical JSON (sorted keys) of configuration.json" }, null, 1) + "\n");
      return send(res, 200, { ok: true, version, hash: r.hash });
    }
    return send(res, 404, { error: "not found" });
  } catch (e) { return send(res, 500, { error: (e as Error).message }); }
}).listen(PORT, "127.0.0.1", () => console.log(`P3 review workbench on http://localhost:${PORT} (${items.length} items from ${NAME})`));
