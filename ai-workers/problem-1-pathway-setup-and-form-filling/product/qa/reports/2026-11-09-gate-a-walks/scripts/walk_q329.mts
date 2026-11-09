// qa probe: on the case where a child was added, does any filing change apply? And the participant order, as read two ways. No model call.
const L = await import(process.env.LIB!);
const { call, sql, main } = L;
await main("QA-329 probe", "filing change after Add child", async () => {
  const id = "cd6534bf-2598-49fe-ac3d-9b34866910c9";
  console.log("db order:", sql(`select string_agg(subject_id::text || ':' || role, ' ') from case_participant where case_id='${id}'`));
  console.log("by created:", sql(`select string_agg(subject_id::text, ' ' order by created_at) from case_participant where case_id='${id}'`));
  const P = (await call("GET", `/runtime/cases/${id}/prepare`, undefined, "user-O")).body?.filings ?? [];
  for (const f of P) {
    const s = f.owner?.subject; const kinds = [["remove_filing", s], ...(f.owner?.role === "spouse_or_partner" ? [["make_principal", s]] : [])];
    for (const [kind, subject] of kinds) {
      const p = await call("POST", `/runtime/cases/${id}/filing-changes`, { kind, subject, preview: true }, "user-O");
      const a = p.status === 200 ? await call("POST", `/runtime/cases/${id}/filing-changes`, { kind, subject, basis: p.body?.basis, reason: "probe on a test copy (Sample)" }, "user-O") : { status: 0, body: p.body };
      console.log(`${f.owner?.label} ${kind}: preview ${p.status}, apply ${a.status} ${String(a.body?.title ?? a.body?.words ?? "").slice(0, 60)}`);
      if (a.status === 200) { console.log("  applied; stopping here"); return; }
    }
  }
});
