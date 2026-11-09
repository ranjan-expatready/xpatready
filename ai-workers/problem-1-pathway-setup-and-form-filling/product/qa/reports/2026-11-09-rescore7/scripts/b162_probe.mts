// qa's own probe for B162 (#1344; C7.6, 9 Nov): Ready to file is refused while a PDF-upload or Paper line has no current copy
// made for filing. Angles: only the named line clears when one copy is made; a changed fact makes the copy old and the line
// comes back in its other words; a "copy, not for filing" made while the line was Online never counts; a barcode form is
// not asked twice; a pass needs a reason, is staff's, and is stored as critical. US$0, no model call. Args: <port> <db>
const L = await import(process.env.LIB!);
const { call, ok, main, OFFICER, sql, CLIENT, yearsAgo } = L;
await main("B162 probe", "no current copy made for filing", async () => {
  const c = await L.openCase(L.needVisitorVisa(), [{ role: "principal", name: "Sample Client A", dob: yearsAgo(40) }]);
  const P = c.subjects["Sample Client A"], officer = c.officer || OFFICER;
  ok("setup: everything answered and confirmed", !!(await L.fillEverything(c.id)));
  const view = async () => { const p = (await L.prepare(c.id, officer)).p; const fid = L.filingOf(p, P).id; const rd = L.readinessOf(p, fid) as any; const items = (L.itemsOf(p, P) as any[]).filter((i) => i.form); const nc = (rd.warns as any[]).filter((w) => w.code === "no_copy").map((w) => ({ ...w, form: items.find((i) => i.id === w.item)?.form, channel: items.find((i) => i.id === w.item)?.channel })); return { p, fid, rd, items, nc }; };
  let v = await view();
  console.log("ITEMS " + JSON.stringify(v.items.map((i) => `${i.form}:${i.channel}`))); console.log("NO-COPY " + JSON.stringify(v.nc.map((w) => [w.form, w.channel, w.words])));
  ok("every no_copy line is on a PDF upload or Paper line; no Online line has one", v.nc.length >= 2 && v.nc.every((w) => /PDF_UPLOAD|PAPER/.test(w.channel)), v.nc.map((w) => [w.form, w.channel]));
  ok("every PDF-upload or Paper line with no copy and no barcode Validate has a no_copy line", v.items.filter((i) => /PDF_UPLOAD|PAPER/.test(i.channel) && i.form !== "IMM 5257").every((i) => v.nc.some((w) => w.form === i.form)), v.items.map((i) => i.form));
  let r = await call("POST", `/runtime/filings/${v.fid}/ready`, {}, officer);
  console.log("READY " + JSON.stringify({ s: r.status, warns: (r.body?.warns ?? []).map((w: any) => w.code ?? w) }).slice(0, 500));
  ok("Ready to file is refused (409) and names the no_copy lines", r.status === 409 && (r.body?.warns ?? []).some((w: any) => (w.code ?? w) === "no_copy"), r.status);
  const X = "IMM 5645", Y = v.items.find((i) => i.form !== X && i.channel === "PDF_UPLOAD" && (i.accepts ?? []).includes("ONLINE") && v.nc.some((w) => w.form === i.form))?.form;
  ok("setup: two no_copy forms to tell apart", v.nc.some((w) => w.form === X) && !!Y, [X, Y]);
  const first = await L.generateCopy(c.id, X, P); v = await view();
  ok("one copy made clears that line only", !!first && !v.nc.some((w) => w.form === X) && v.nc.some((w) => w.form === Y), v.nc.map((w) => w.form));
  const ch = await L.answer(c.id, P, "person.present_address", { street_name: "Changed Road", city: "New City", country: "Canada" }); await L.confirmAll(c.id, P); v = await view();
  const back = v.nc.find((w) => w.form === X); console.log("AFTER-CHANGE " + JSON.stringify({ ch: ch.status, line: back?.words }));
  ok("a fact the copy reads changed: the line comes back, saying the copy is older than today's facts", ch.status === 200 && /older than today's facts/.test(back?.words ?? ""), back);
  await L.generateCopy(c.id, X, P); v = await view();
  ok("a new copy clears it again", !v.nc.some((w) => w.form === X), v.nc.map((w) => w.form));
  const flip = async (form: string, channel: string) => { const it = v.items.find((i) => i.form === form); const r = await call("PATCH", `/runtime/items/${it.id}/channel`, { channel, reason: "qa probe (Sample)", version: v.p.version ?? it.version }, officer); console.log("FLIP " + JSON.stringify({ form, channel, s: r.status, d: r.body?.detail }).slice(0, 300)); v = await view(); return r.status; };
  const f1 = await flip(Y, "ONLINE");
  ok("the same form moved to Online has no no_copy line", f1 < 300 && !v.nc.some((w) => w.form === Y), v.nc.map((w) => w.form));
  const nf = await L.generateCopy(c.id, Y, P);
  const f2 = await flip(Y, "PDF_UPLOAD"); const yl = v.nc.find((w) => w.form === Y); console.log("NOT-FOR-FILING " + JSON.stringify({ nf, f2, line: yl?.words }));
  ok("a copy made while the line was Online (not for filing) does not count: back on PDF upload, the line stands", !!nf && f2 < 300 && /no copy made for filing/.test(yl?.words ?? ""), yl);
  const f3 = await flip("IMM 5257", "PDF_UPLOAD");
  console.log("BARCODE " + JSON.stringify({ blocks: v.rd.blocks.map((b: any) => b.code), nc: v.nc.map((w) => w.form) }));
  ok("a barcode form on PDF upload keeps its own Validate block, no second no_copy line", f3 < 300 && !v.nc.some((w) => w.form === "IMM 5257") && v.rd.blocks.length > 0, v.rd.blocks.map((b: any) => b.code));
  await flip("IMM 5257", "ONLINE");
  const noR = await call("POST", `/runtime/filings/${v.fid}/warnings/no_copy/pass`, {}, officer), cl = await call("POST", `/runtime/filings/${v.fid}/warnings/no_copy/pass`, { reason: "x" }, CLIENT);
  ok("a pass with no reason is refused (400); a client cannot pass it (403)", noR.status === 400 && cl.status === 403, [noR.status, cl.status]);
  const yes = await call("POST", `/runtime/filings/${v.fid}/warnings/no_copy/pass`, { reason: "PDF made outside the product (Sample)" }, officer);
  const row = sql(`select code || '|' || severity from readiness_pass where filing_id='${v.fid}' and code='no_copy'`);
  console.log("PASS-ROW " + JSON.stringify({ s: yes.status, row, body: JSON.stringify(yes.body).slice(0, 300) }));
  ok("a staff pass with a reason is accepted and stored as critical", yes.status === 200 && /no_copy\|CRITICAL/i.test(row ?? ""), row);
});
