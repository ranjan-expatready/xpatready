// Outsider audit API probes on the isolated copy :4495 (US$0, no model call). Prints one line per probe.
const B = "http://localhost:4495/api";
const call = async (method, p, actor, body, raw) => {
  const h = {}; if (actor) h["x-actor"] = actor; if (body !== undefined) h["content-type"] = "application/json";
  const r = await fetch(B + p, { method, headers: h, body: body === undefined ? undefined : raw ? body : JSON.stringify(body) });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t.slice(0, 120); }
  return { s: r.status, j, ct: r.headers.get("content-type") };
};
const log = (name, r, expect) => console.log(`${expect && !expect.includes(r.s) ? "FINDING" : "ok     "} ${name} → ${r.s} ${typeof r.j === "string" ? r.j.slice(0, 90) : (r.j?.detail ?? r.j?.message ?? JSON.stringify(r.j).slice(0, 140))}`.slice(0, 330));

const cat = (await call("GET", "/catalogue?pathwayType=Individual", "user-A")).j;
const s = JSON.stringify(cat);
const id = (name) => cat.rows.find((r) => r.label === name && r.combinationId)?.combinationId;
const lmia = id("With an LMIA"), visitor = id("Visitor visa");
console.log("ids", lmia, visitor);

// 1 identity and deny by default
log("GET catalogue, nobody", await call("GET", "/catalogue"), [401]);
log("GET combinations/:id, nobody", await call("GET", `/combinations/${lmia}`), [401]);
log("GET combinations/:id, client user-P", await call("GET", `/combinations/${lmia}`, "user-P"), [403]);
log("GET ledger, client", await call("GET", "/ledger", "user-P"), [403]);
log("GET activity, client", await call("GET", "/activity", "user-P"), [403]);
log("GET library/forms/list, client", await call("GET", "/library/forms/list", "user-P"), [403]);
log("GET review-queue, client", await call("GET", "/review-queue", "user-P"), [403]);
log("GET runs, client", await call("GET", "/runs", "user-P"), [403]);
log("GET demo/status, nobody", await call("GET", "/demo/status"), [401]);
log("GET ai/batches, client", await call("GET", "/ai/batches", "user-P"), [403]);
log("GET intake/held, client", await call("GET", "/intake/held", "user-P"), [403]);
log("GET library/changes, client", await call("GET", "/library/changes", "user-P"), [403]);
log("x-actor spoof: unknown name", await call("GET", "/catalogue", "admin"), [401]);
const att = (await call("GET", `/combinations/${lmia}/attachments`, "user-A")).j;
const attId = (JSON.stringify(att).match(/"id":"([0-9a-f-]{36})"/) || [])[1];
log("GET attachments/:id/file, nobody (official PDF)", await call("GET", `/attachments/${attId}/file`), [401, 403]);
// 2 writes by the wrong person
log("PATCH combination as client", await call("PATCH", `/combinations/${lmia}`, "user-P", { name: "x" }), [403]);
log("PATCH combination as officer", await call("PATCH", `/combinations/${lmia}`, "user-O", { name: "x" }), [403]);
log("POST structure/nodes as client", await call("POST", "/structure/nodes", "user-P", { pathwayType: "INDIVIDUAL", level: "pathway", parentKey: null, label: "Audit probe" }), [403]);
log("POST structure/nodes nobody", await call("POST", "/structure/nodes", undefined, { pathwayType: "INDIVIDUAL", level: "pathway", parentKey: null, label: "Audit probe" }), [401]);
log("POST fill as client (P-62: staff only)", await call("POST", `/combinations/${lmia}/fill`, "user-P", { form: "IMM 5710", person: "principal" }), [403]);
log("POST fill as SME reviewer", await call("POST", `/combinations/${lmia}/fill`, "user-C", { form: "IMM 5710", person: "principal" }), [403, 200, 201, 404, 422]);
log("POST demo/load as client", await call("POST", "/demo/load", "user-P"), [403]);
log("POST demo/forms-story as client", await call("POST", "/demo/forms-story", "user-P", { combinationId: lmia }), [403]);
log("POST cases as client", await call("POST", "/runtime/cases", "user-P", {}), [403]);
log("POST approve own (author)", await call("POST", `/combinations/${lmia}/approve`, "user-A"), [403, 409]);
log("POST signoff as author", await call("POST", `/combinations/${lmia}/signoff`, "user-A", {}), [403]);
// 3 bad bodies
log("POST structure/nodes body is an array", await call("POST", "/structure/nodes", "user-A", [1, 2]), [400]);
log("POST structure/nodes not JSON", await call("POST", "/structure/nodes", "user-A", "{bad", true), [400]);
log("POST structure/nodes 5,000-char label", await call("POST", "/structure/nodes", "user-A", { pathwayType: "INDIVIDUAL", level: "pathway", parentKey: null, label: "x".repeat(5000) }), [400]);
log("POST structure/nodes label is <script>", await call("POST", "/structure/nodes", "user-A", { pathwayType: "INDIVIDUAL", level: "pathway", parentKey: null, label: "<img src=x onerror=alert(1)>" }), [400, 201, 200]);
log("POST structure/nodes label only spaces", await call("POST", "/structure/nodes", "user-A", { pathwayType: "INDIVIDUAL", level: "pathway", parentKey: null, label: "   " }), [400]);
log("PATCH combination name number", await call("PATCH", `/combinations/${lmia}`, "user-A", { name: 123 }), [400]);
log("PATCH combination unknown field", await call("PATCH", `/combinations/${lmia}`, "user-A", { hacked: true }), [400]);
log("POST requirements empty body", await call("POST", `/combinations/${visitor}/requirements`, "user-A", {}), [400]);
log("POST rules empty body", await call("POST", `/combinations/${visitor}/rules`, "user-A", {}), [400]);
log("POST library/fields empty", await call("POST", "/library/fields", "user-A", {}), [400]);
log("POST library/sections empty", await call("POST", "/library/sections", "user-A", {}), [400]);
log("POST conditions/check junk", await call("POST", "/conditions/check", "user-A", { expr: { op: "nonsense" } }), [400]);
log("GET preview malformed query", await call("GET", `/combinations/${lmia}/preview?profile[a]=1&mode[]=x`, "user-A"), [400, 200]);
log("GET preview unknown profile", await call("GET", `/combinations/${lmia}/preview?profile=nope`, "user-A"), [400, 404]);
log("GET combinations/not-a-uuid", await call("GET", "/combinations/not-a-uuid", "user-A"), [404, 400]);
log("GET combinations/<random uuid>", await call("GET", "/combinations/00000000-0000-0000-0000-000000000000", "user-A"), [404]);
log("GET jobs/<random uuid>", await call("GET", "/jobs/00000000-0000-0000-0000-000000000000", "user-A"), [404]);
log("GET runtime/cases/<random>", await call("GET", "/runtime/cases/00000000-0000-0000-0000-000000000000", "user-O"), [404]);
log("POST runtime/cases bad body", await call("POST", "/runtime/cases", "user-O", { combinationId: 7 }), [400]);
log("POST fill no body", await call("POST", `/combinations/${lmia}/fill`, "user-A"), [400]);
log("GET unknown api route", await call("GET", "/nope", "user-A"), [404]);
log("GET /api/catalogue?pathwayType=BOGUS", await call("GET", "/catalogue?pathway=BOGUS", "user-A"), [400]);
// 4 idempotency and races
const label = "Audit race2  " + Date.now();
const rs = await Promise.all(Array.from({ length: 8 }, () => call("POST", "/structure/nodes", "user-A", { pathwayType: "INDIVIDUAL", level: "pathway", parentKey: null, label })));
console.log("race: 8 parallel creates of one Pathway name →", rs.map((r) => r.s).join(","));
const st = (await call("GET", "/structure?pathwayType=INDIVIDUAL", "user-A")).j;
console.log("race: copies of the name in structure:", (JSON.stringify(st).match(new RegExp(label, "g")) || []).length);
const ps = await Promise.all(Array.from({ length: 4 }, () => call("POST", "/demo/load", "user-A")));
console.log("double Load sample in parallel →", ps.map((r) => r.s).join(","));
// 5 response hygiene
const e = await call("GET", "/combinations/00000000-0000-0000-0000-000000000000", "user-A");
console.log("problem+json content-type on errors:", e.ct);
const h = await fetch(B + "/catalogue", { headers: { "x-actor": "user-A" } });
console.log("security headers:", ["x-powered-by", "content-security-policy", "x-content-type-options", "x-frame-options", "strict-transport-security"].map((k) => `${k}=${h.headers.get(k)}`).join(" "));
const t0 = Date.now(); await call("GET", "/catalogue?pathwayType=Individual", "user-A"); console.log("catalogue ms", Date.now() - t0);
const t1 = Date.now(); await call("GET", `/combinations/${lmia}/preview`, "user-A"); console.log("lmia preview ms", Date.now() - t1);
