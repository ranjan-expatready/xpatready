// G1 (C5.4) test scaffolding (P-33; concept §6 M4, challenge M4): before a suite submits a draft that holds published
// numbers, it answers each one through the API, as the author would on the Source panel: never SQL. Used by the suites
// that submit, approve or release (tests only, never the product). The words it writes say they are test data.
//   const { sourceEveryNumber } = require("./fixtures/source-every-number.cjs");
//   await sourceEveryNumber(4446, combinationId);                  // "None published – set by ExpatReady", with a reason
//   await sourceEveryNumber(4446, combinationId, { cite: true });  // an official-source shape (https, words, date read)
// `api`: the copy's port, its base URL ("http://localhost:4446"), or a function (method, path, body, actor) → { status,
// body } as the suites' own helpers are (paths start with "/", without "/api"). Returns { written, numbers, held_back }
// and throws with the server's words when a save is refused, so a suite never submits half-sourced by mistake.
const http = require("node:http");

function caller(api) {
  if (typeof api === "function") return api;
  const base = new URL(typeof api === "number" ? `http://127.0.0.1:${api}` : String(api));
  // node:http without keep-alive (runtime/api.ts: fetch reuses sockets a busy server has closed).
  return (method, path, body, actor = "user-A") => new Promise((resolve, reject) => {
    const data = body === undefined ? undefined : Buffer.from(JSON.stringify(body));
    const req = http.request({ host: base.hostname, port: base.port, path: `/api${path}`, method, agent: false, headers: { "content-type": "application/json", "x-actor": actor, ...(data ? { "content-length": data.length } : {}) } }, (res) => {
      const chunks = []; res.on("data", (c) => chunks.push(c));
      res.on("end", () => { const t = Buffer.concat(chunks).toString("utf8"); let j = t; try { j = JSON.parse(t); } catch { /* not JSON */ } resolve({ status: res.statusCode ?? 0, body: j }); });
    });
    req.on("error", reject); if (data) req.write(data); req.end();
  });
}

async function sourceEveryNumber(api, combinationId, mode = {}) {
  const call = caller(api), actor = mode.actor ?? "user-A";
  const list = await call("GET", `/combinations/${combinationId}/sources`, undefined, actor);
  if (list.status !== 200) throw new Error(`sourceEveryNumber: GET sources answered ${list.status}: ${JSON.stringify(list.body).slice(0, 300)}`);
  let written = 0;
  for (const n of list.body.numbers) {
    if (n.passes && n.state !== "sample") continue; // cited, None published, or cited by its own record already
    const answer = mode.cite
      ? { cited: { url: "https://www.canada.ca/en/immigration-refugees-citizenship.html", page: "Test data", quote: `Test data, not an official quote: ${n.words}`.slice(0, 300), date: new Date().toISOString().slice(0, 10) } }
      : { none_published: { reason: "Test data: set by a suite so its draft can be released (not a real source)." } };
    const r = await call("PUT", `/combinations/${combinationId}/sources/${encodeURIComponent(n.kind)}/${encodeURIComponent(n.key)}`, { address: n.address, value: n.value, version: n.entry?.version ?? 0, ...answer }, actor);
    if (r.status !== 200) throw new Error(`sourceEveryNumber: ${n.item_words}: ${n.words}: PUT answered ${r.status}: ${JSON.stringify(r.body).slice(0, 300)}`);
    written++;
  }
  const after = await call("GET", `/combinations/${combinationId}/sources`, undefined, actor);
  return { written, numbers: after.body.numbers.length, held_back: after.body.counts.held_back };
}

// P-322 (4 Nov): a release a later suite builds on comes through the product's own steps, never a row written directly:
// every number answered as above, the author submits, the content reviewer (SME duty) signs every change and the
// approver, a different person, approves. Throws with the server's words at the step that refuses. Returns the release.
//   const { releaseThroughSteps } = require("./fixtures/source-every-number.cjs");
//   await releaseThroughSteps(4446, combinationId);                // → { version, pack, sha256, published, library }
async function releaseThroughSteps(api, combinationId, who = { author: "user-A", sme: "user-C", approver: "user-B" }) {
  const call = caller(api);
  await sourceEveryNumber(call, combinationId, { actor: who.author });
  const step = async (what, method, path, body, actor) => {
    const r = await call(method, path, body, actor);
    if (r.status >= 300) throw new Error(`releaseThroughSteps: ${what} answered ${r.status}: ${JSON.stringify(r.body).slice(0, 400)}`);
    return r.body;
  };
  const sub = await step("submit", "POST", `/combinations/${combinationId}/submit`, { note: "Test data: submitted by a suite through the product's steps." }, who.author);
  const items = (sub.changeSummary ?? []).map((x) => `${x.kind}|${x.key}`);
  if (items.length) await step("sign-off", "POST", `/combinations/${combinationId}/signoff`, { items, action: "signed", note: "Test data: signed by a suite as the SME." }, who.sme);
  return step("approve", "POST", `/combinations/${combinationId}/approve`, {}, who.approver);
}

module.exports = { sourceEveryNumber, releaseThroughSteps };
