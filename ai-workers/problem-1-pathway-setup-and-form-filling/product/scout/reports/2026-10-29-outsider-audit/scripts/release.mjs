// Release path on the isolated copy: change → submit (A) → double sign (C) → 3 parallel approvals (B) → releases count.
const B = "http://localhost:4495/api", C = "bbefdb94-7cf9-4502-9bca-b30594a51df9";
const call = async (m, p, a, body) => { const r = await fetch(B + p, { method: m, headers: { "x-actor": a, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined }); const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; } return { s: r.status, j }; };
const say = (n, r) => console.log(n, r.s, JSON.stringify(r.j?.detail ?? r.j).slice(0, 220));
say("remove IMM 5475", await call("DELETE", `/combinations/${C}/forms/IMM%205475`, "user-A", {}));
const subs = await Promise.all([1, 2, 3].map(() => call("POST", `/combinations/${C}/submit`, "user-A", { note: "audit" })));
console.log("3 parallel submits →", subs.map((r) => r.s).join(","));
const rv = (await call("GET", `/combinations/${C}/review`, "user-A")).j;
console.log("open submissions in review:", JSON.stringify(rv.submission)?.slice(0, 300));
const items = (rv.submission?.changeSummary ?? rv.submission?.changes ?? rv.draft.changes).map((x) => `${x.kind}|${x.key}`);
console.log("items", items);
say("sign as C", await call("POST", `/combinations/${C}/signoff`, "user-C", { items, action: "signed" }));
say("sign again as C (duplicate)", await call("POST", `/combinations/${C}/signoff`, "user-C", { items, action: "signed" }));
const ap = await Promise.all([1, 2, 3].map(() => call("POST", `/combinations/${C}/approve`, "user-B")));
console.log("3 parallel approvals →", ap.map((r) => `${r.s} ${JSON.stringify(r.j?.detail ?? r.j?.version ?? "").slice(0, 80)}`).join(" | "));
const rel = (await call("GET", `/releases?combination=${C}`, "user-A")).j;
console.log("releases:", JSON.stringify(rel).match(/"version":\d+/g));
