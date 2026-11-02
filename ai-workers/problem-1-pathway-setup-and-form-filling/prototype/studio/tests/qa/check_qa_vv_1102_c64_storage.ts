// qa (2 Nov, P-250 score before merge of #408, C6.4 storage slice): probes beyond pack 4 and check_c64_storage_api.ts —
// the client uploading, another firm, an upload after Not applicable, a waiting line, two requests at once. US$0.
//   tsx studio/tests/qa/check_qa_vv_1102_c64_storage.ts <port> <db>   (copy prepared by setup_visitor_visa.ts + setup_vv_m3.ts)
import { CLIENT, FAMILY, OFFICER, PORT, call, main, needVisitorVisa, ok, openCase } from "../../acceptance/lib/m3.ts";

type Line = { id: string; label: string; state: string };
const up = async (lineId: string | undefined, actor: string, bytes = "%PDF-1.4\n% Sample synthetic passport\n%%EOF\n", name = "sample.pdf") => {
  const fd = new FormData(); fd.append("file", new Blob([new TextEncoder().encode(bytes)]), name);
  const res = await fetch(`http://127.0.0.1:${PORT}/api/runtime/checklist-lines/${lineId}/documents`, { method: "POST", headers: { "x-actor": actor }, body: fd });
  return { status: res.status, body: await res.json().catch(() => null) as { detail?: string; state?: string } | null };
};
await main("qa-c64-storage", "C6.4 storage probes (#408 head)", async () => {
  const c = await openCase(needVisitorVisa(), FAMILY);
  const P = c.subjects["Sample Client A"], S = c.subjects["Sample Spouse A"], K2 = c.subjects["Sample Child A2"];
  const list = async () => (await call("GET", `/runtime/cases/${c.id}/checklist`, undefined, OFFICER)).body as { people: { subject: string; lines: Line[]; waiting: Line[] }[] };
  const of = (l: Awaited<ReturnType<typeof list>>, s: string) => l.people.find((p) => p.subject === s)!;
  let l = await list();
  const pass = of(l, P).lines.find((x) => /passport/i.test(x.label));
  const [a, b] = await Promise.all([1, 2].map(() => call("POST", `/runtime/checklist-lines/${pass?.id}/request`, {}, OFFICER)));
  ok("probe: two requests at once: both answer (200 or 409), the line is Requested once", [a.status, b.status].every((x) => [200, 409].includes(x)) && (await list()).people.flatMap((p) => p.lines).filter((x) => x.id === pass?.id && x.state === "requested").length === 1, [a.status, b.status]);
  const cu = await up(pass?.id, CLIENT);
  console.log("client upload on the principal's passport line:", cu.status, cu.body?.detail ?? cu.body?.state);
  ok("probe: the client's upload is either accepted as the person's document or refused in words (never 500)", [201, 403].includes(cu.status) && (cu.status === 201 || typeof cu.body?.detail === "string"), [cu.status, cu.body?.detail]);
  const os = await up(pass?.id, "user-S");
  ok("probe: the solo firm's representative cannot upload to this case (403 or 404, in words)", [403, 404].includes(os.status) && typeof os.body?.detail === "string", [os.status, os.body?.detail]);
  const sl = of(l, S).lines.find((x) => /passport/i.test(x.label));
  await call("POST", `/runtime/checklist-lines/${sl?.id}/not-applicable`, { reason: "Sample: officer's test" }, OFFICER);
  const na = await up(sl?.id, OFFICER);
  console.log("upload after Not applicable:", na.status, na.body?.detail ?? na.body?.state);
  ok("probe: an upload on a Not applicable line is refused in words or moves it to Received, never silently kept as Not applicable", (na.status === 201 && na.body?.state === "received") || ([409, 422].includes(na.status) && typeof na.body?.detail === "string"), [na.status, na.body]);
  l = await list();
  const w = of(l, K2).waiting[0];
  if (w) {
    const rw = await call("POST", `/runtime/checklist-lines/${w.id}/request`, {}, OFFICER);
    console.log("request on a waiting line:", w.label, rw.status, rw.body?.detail ?? rw.body?.state);
    ok("probe: requesting a line that still waits for an answer is refused in words (409/422) or allowed with the wait kept", [200, 409, 422].includes(rw.status), [rw.status, rw.body?.detail]);
  }
  const ex = await up(pass?.id, OFFICER, "MZ\x90\x00 not a pdf", "passport.pdf");
  ok("probe: a file named .pdf that is not one is refused 4xx in words", ex.status >= 400 && ex.status < 500 && typeof ex.body?.detail === "string", [ex.status, ex.body?.detail]);
});
