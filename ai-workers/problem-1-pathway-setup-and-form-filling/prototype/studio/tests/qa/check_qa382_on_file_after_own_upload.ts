// qa (10 Nov, C6.17 re-score on main 66e74115e; QA-382, UX · Minor; #1477's review minor m2, unlogged until now): on the
// work permit stage the passport line says "On file from Study permit, uploaded …: check it for this application". After
// the officer uploads this application's own copy the line is Received with that file, and still says "On file from Study
// permit … check it". Fails today; passes when the "On file" words go once the line has its own current file.
// Runs on the configured checkpoint (loaded first); one study-permit case opened, uploaded to and moved on by the API
// (setup, C6.4's multipart upload as the pack sends it). US$0, no AI.
//   zsh studio/tools/isolated.sh qa_382 4473 start && <load the configured checkpoint as user-A> \
//     && tsx studio/tests/qa/check_qa382_on_file_after_own_upload.ts 4473 xr_studio_qa_382
import { CLIENT, OFFICER, PORT, call, main, ok, prepare, run, sql } from "../../acceptance/lib/m3.ts";

type Openable = { combination_id: string; startable: boolean; stage?: { route: string; earlier: unknown[] } };
type Line = { id: string; document_type?: string; state?: string; on_file?: { words: string } | null };
const upload = async (lineId: string, name: string) => {
  const fd = new FormData(); fd.append("file", new Blob([new TextEncoder().encode(`%PDF-1.4\n% Sample synthetic document ${name}\n`)]), name);
  const res = await fetch(`http://127.0.0.1:${PORT}/api/runtime/checklist-lines/${lineId}/documents`, { method: "POST", headers: { "x-actor": OFFICER }, body: fd }).catch(() => null);
  return res?.status ?? 0;
};
const lines = async (id: string) => { const out: Line[] = []; const walk = (x: unknown) => { if (Array.isArray(x)) x.forEach(walk); else if (x && typeof x === "object") { const o = x as Record<string, unknown>; if (typeof o.id === "string" && "document_type" in o && "state" in o) out.push(o as Line); Object.values(o).forEach(walk); } }; walk((await call("GET", `/runtime/cases/${id}/checklist`)).body); return out; };

await main("QA-382", "the 'On file' words go once the new stage's line has its own file", async () => {
  const rows = ((await call("GET", "/runtime/openable")).body ?? []) as Openable[];
  const later = rows.find((r) => r.startable && r.stage && r.stage.earlier.length > 0);
  const firstKey = later?.stage ? sql(`select (stages->0->>'combination_key') from route where key='${later.stage.route}'`) : null;
  const first = rows.find((r) => r.startable && !r.stage && sql(`select combination_key from combination where id='${r.combination_id}'`) === firstKey);
  const made = first ? await call("POST", "/runtime/cases", { combinationId: first.combination_id, reference: `QA382-${run}`, clientActor: CLIENT, principal: { displayName: "Sample Client H" } }) : null;
  const id = made?.body?.id as string | undefined;
  if (id) await prepare(id);
  const s1 = id ? (await lines(id)).find((l) => /passport/i.test(String(l.document_type))) : undefined;
  const up1 = s1 ? await upload(s1.id, "sample-passport-stage1.pdf") : 0;
  const st = id ? (await call("GET", `/runtime/cases/${id}/stages`)).body as { current: string; stages: { id: string; version: number }[] } : null;
  const cur = st?.stages.find((s) => s.id === st.current);
  const go = id && cur ? await call("POST", `/runtime/cases/${id}/stages/next`, { from_stage: cur.id, stage_version: cur.version, reason: "qa check QA-382 (Sample)" }) : null;
  const s2 = id && go?.status === 201 ? (await lines(id)).find((l) => l.on_file) : undefined;
  ok("setup: stage 1's passport uploaded (C6.4), the next stage started, its passport line says 'On file …'", made?.status === 201 && up1 === 201 && go?.status === 201 && !!s2, { made: made?.status, up1, go: go?.status, s2: s2?.on_file?.words });
  if (!id || !s2) return;
  const up2 = await upload(s2.id, "sample-passport-stage2.pdf");
  const after = (await lines(id)).find((l) => l.id === s2.id);
  ok(`QA-382 fail: after this application's own copy is uploaded (${up2}), the line is ${after?.state} and no longer says "On file … check it" (says: ${JSON.stringify(after?.on_file?.words ?? null)})`,
    up2 === 201 && after?.state === "received" && !after?.on_file, { after });
});
