// qa check for QA-359 (C6.16; found by qa's fresh reader on main 1d07807c8, 9 Nov; qa/reports/2026-11-09-c616/). Fails
// today; passes once a staff re-address is what Client A's Resend keeps (the reader's recommendation; the founder rules).
// Flow, all through the product's API (no browser): Client A sends Partner's link to address A; Partner enters the right
// code (privacy on); the case officer sends Partner's link to a new address B; Client A presses Resend (no address).
// Expected: the live link stays at B (or Client A's Resend goes to B); nothing new reaches address A.
// Actual today (pack C6.16-8 "break m3" asserts it): Client A's Resend sends a new link to A and kills the staff's link at B.
// Needs Visitor visa released on the copy (the configured checkpoint, or tests/runtime/setup_visitor_visa.ts). US$0.
//   zsh studio/tools/isolated.sh qa_c616 4473 start --ttl 30 && node studio/tests/qa/check_qa359_resend_after_staff_readdress.cjs 4473
const PORT = process.argv[2] ?? "4473", BASE = `http://127.0.0.1:${PORT}`;
const results = [];
const ok = (name, pass, detail = "") => { results.push(pass); console.log(`${pass ? "PASS" : "FAIL"}  ${name}${pass || !detail ? "" : ` — ${String(detail).replace(/\s+/g, " ").slice(0, 400)}`}`); };
const call = async (method, path, body, actor = "user-O", bearer) => { const h = { "content-type": "application/json" }; if (actor) h["x-actor"] = actor; if (bearer) h.authorization = `Bearer ${bearer}`; const r = await fetch(`${BASE}/api${path}`, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) }); let j = null; try { j = await r.json(); } catch { /* not JSON */ } return { status: r.status, body: j }; };
const yearsAgo = (y) => { const d = new Date(); d.setUTCFullYear(d.getUTCFullYear() - y); return d.toISOString().slice(0, 10); };
const inbox = async (address) => (await call("GET", `/demo/inbox?address=${encodeURIComponent(address)}`, undefined, null)).body?.messages ?? [];
const tokenIn = (m) => /#t=([A-Za-z0-9_-]{43})/.exec(m.find((x) => x.kind === "link")?.link ?? "")?.[1] ?? "";
(async () => {
  const vv = ((await call("GET", "/runtime/openable")).body ?? []).find((r) => /Visitor visa/.test(r.combination) && r.startable);
  if (!vv) { console.error("STOP  Visitor visa is not released on this copy"); process.exit(2); }
  const run = Date.now().toString(36), A = `partner.${run}@example.com`, B = `partner.new.${run}@example.com`;
  const c = await call("POST", "/runtime/cases", { combinationId: vv.combination_id, reference: `QA359-${run}`, clientActor: "user-P", principal: { displayName: "Sample Client A" } });
  const id = c.body?.id, P = c.body?.people?.find((x) => x.role === "principal")?.subject_id;
  const S = (await call("POST", `/runtime/cases/${id}/people`, { role: "spouse_or_partner", displayName: "Sample Partner" })).body?.subject_id;
  for (const [s, d] of [[P, yearsAgo(40)], [S, yearsAgo(38)]]) await call("PUT", `/runtime/cases/${id}/answers/${s}/person.date_of_birth`, { value: d, expectedId: null });
  const sent = await call("POST", `/runtime/cases/${id}/people/${S}/link`, { address: A }, "user-P");
  const tA = tokenIn(await inbox(A));
  const codeSend = await call("POST", "/link/code/send", { token: tA }, null);
  const code = (/code is (\d{3}) (\d{3})/.exec((await inbox(A)).find((m) => m.kind === "code")?.body ?? "") ?? []).slice(1).join("");
  const enter = await call("POST", "/link/code", { token: tA, code }, null);
  const staff = await call("POST", `/runtime/cases/${id}/people/${S}/link`, { address: B });
  const tB = tokenIn(await inbox(B));
  const linksAtA = (await inbox(A)).filter((m) => m.kind === "link").length;
  ok("QA-359 setup: Client A sent to A, Partner entered the right code, the officer sent to a new address B", sent.status < 300 && codeSend.status < 300 && enter.status < 300 && staff.status < 300 && !!tB, [sent.status, codeSend.status, enter.status, staff.status, !!tB]);
  const resend = await call("POST", `/runtime/cases/${id}/people/${S}/link`, {}, "user-P");
  const liveB = (await call("POST", "/link/open", { token: tB }, null)).body?.state;
  const newAtA = (await inbox(A)).filter((m) => m.kind === "link").length - linksAtA;
  ok("QA-359 C6.16: after staff sent Partner's link to B, Client A's Resend sends nothing new to A and leaves B's link live", newAtA === 0 && liveB === "live", `resend ${resend.status}; new link messages at A: ${newAtA}; B's link: ${liveB}`);
  const passed = results.filter(Boolean).length;
  console.log(`\n${passed}/${results.length} passed`); process.exit(passed === results.length ? 0 : 1);
})().catch((e) => { console.error(`STOP  ${e.message}`); process.exit(2); });
