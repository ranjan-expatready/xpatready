// qa's own probe for QA-153 (8 Nov, the fresh reader's ask): real brothers and sisters on the family case, read back from each
// copy's own PDF. Angles the builder's check does not take: the officer takes "none apply" back after everything is filled;
// three entries with their columns kept apart; a middle entry removed; two adults' lists kept apart; two children with
// DIFFERENT addresses in Section B. US$0, no model call. Args: <port> <db>
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const L = await import(process.env.LIB!);
const { call, ok, main, OFFICER } = L;
const ST = process.env.LIB!.replace(/\/acceptance\/lib\/m3\.ts$/, ""), PY = process.env.PYBIN!;
function pdf(b: Buffer): Record<string, string> {
  const f = join(mkdtempSync(join(tmpdir(), "qa153-")), "c.pdf"); writeFileSync(f, b);
  const code = "import sys, json; sys.path.insert(0, sys.argv[1]); import e5_roundtrip as E, xml.etree.ElementTree as ET\nr = E.open_reader(open(sys.argv[2], 'rb').read()); d = E.data_root(ET.fromstring(E.xfa_streams(r)['datasets'].get_object().get_data()))\nprint(json.dumps({p: v for p, v in E.leaves(d) if v}))";
  return JSON.parse(execFileSync(PY, ["-I", "-c", code, join(ST, "..", "p1"), f], { encoding: "utf8" }).trim().split("\n").pop()!);
}
const cell = (v: Record<string, string>, sec: string, row: number, col: string) => Object.entries(v).find(([k]) => k.includes(`Section${sec}[0].Child[${row}].${col}`))?.[1] ?? null;
await main("QA-153 entries probe", "real brothers and sisters and two children, read back from the PDFs", async () => {
  const c = await L.openCase(L.needVisitorVisa(), L.FAMILY);
  const officer = c.officer || OFFICER;
  const P = c.subjects["Sample Client A"], S = c.subjects["Sample Spouse A"], K1 = c.subjects["Sample Child A1"], K2 = c.subjects["Sample Child A2"];
  ok("setup: everything answered and confirmed", !!(await L.fillEverything(c.id)));
  const kid = async (id: string, street: string, city: string) => { const r = await L.answer(c.id, id, "person.present_address", { street_name: street, city, country: "Canada" }); await L.confirmAll(c.id, id); return r.status; };
  console.log("KIDS " + JSON.stringify([await kid(K1, "First Child Road", "Alpha City"), await kid(K2, "Second Child Road", "Beta City")]));
  const sec = async (o: string) => ((await L.agent(c.id)).sections as any[]).find((s) => s.subjectId === `${o}/sibling`);
  const values = (s: any) => Object.fromEntries(s.questions.map((q: any) => [q.fact, q]));
  const sample = (fact: string, i: number, who: string) => fact === "person.full_name" ? `${who} Sibling ${i}` : fact === "person.date_of_birth" ? `19${80 + i}-0${i}-1${i}` : fact === "person.present_address" ? { street_name: `${who} Road ${i}`, city: `${who} City ${i}`, country: "Canada" } : fact === "person.present_occupation" ? `${who} Job ${i}` : null;
  const fill = async (o: string, who: string, n: number) => {
    const s0 = await sec(o);
    const back = await call("PUT", `/runtime/cases/${c.id}/groups/${o}/sibling/sibling/none-apply`, { noneApply: false, expectedId: s0.group.none_apply.id }, officer);
    const rows: string[] = []; const st: number[] = [back.status];
    for (let i = 1; i <= n; i++) { const r = await call("POST", `/runtime/cases/${c.id}/groups/${o}/sibling/rows`, { group: "sibling" }, officer); rows.push(r.body.row); st.push(r.status); }
    const qs = (await sec(o)).questions as any[];
    for (const [ix, row] of rows.entries()) for (const q of qs) {
      if (!q.rows[ix]?.fits) continue;
      const own = sample(q.fact, ix + 1, who);
      const v = own ?? (q.options?.length ? q.options[0].key : q.countries?.length ? (q.countries.includes("India") ? "India" : q.countries[0]) : q.value_type === "yes_no" ? false : "Sample");
      const r = await call("PUT", `/runtime/cases/${c.id}/answers/${o}/sibling/${q.fact}`, { value: v, expectedId: null, row }, officer); st.push(r.status);
      if (r.status >= 300) console.log("PUT-REFUSED " + JSON.stringify({ fact: q.fact, v, status: r.status, body: r.body }).slice(0, 400));
    }
    await L.confirmAll(c.id, `${o}/sibling`);
    return { rows, st };
  };
  const A = await fill(P, "Alpha", 3), B = await fill(S, "Bravo", 1);
  ok("every step to take none-apply back, add entries and answer them is accepted", [...A.st, ...B.st].every((x) => x < 300), [...A.st, ...B.st]);
  const line = async (o: string) => (((await call("GET", `/runtime/cases/${c.id}/forms`, undefined, officer)).body.forms as any[]).find((f) => f.form === "IMM 5645" && f.subject_id === o).readiness.missing as any[]).map((m) => `${m.fact}:${m.reason}`);
  const lP = await line(P); console.log("READINESS-P " + JSON.stringify(lP));
  ok("with its entries answered and confirmed, IMM 5645 has no brothers-and-sisters line left", !lP.some((x) => /sibling|brother/i.test(x)) && lP.length === 0, lP);
  const copy = async (o: string) => pdf(await L.copyBytes(await L.generateCopy(c.id, "IMM 5645", o), officer));
  let p = await copy(P); const s = await copy(S);
  const grid = (v: Record<string, string>, sect: string, n: number) => Array.from({ length: n }, (_, r) => ({ name: cell(v, sect, r, "ChildName"), dob: cell(v, sect, r, "ChildDOB"), address: cell(v, sect, r, "ChildAddress"), occ: cell(v, sect, r, "ChildOccupation") }));
  console.log("PRINCIPAL-C " + JSON.stringify(grid(p, "C", 4))); console.log("SPOUSE-C " + JSON.stringify(grid(s, "C", 2))); console.log("SECTION-B " + JSON.stringify(grid(p, "B", 3)));
  const g = grid(p, "C", 4);
  ok("Section C holds the three entries in order", g.map((x) => x.name).join("|") === "Alpha Sibling 1|Alpha Sibling 2|Alpha Sibling 3|null".replace("|null", "") + "|null" || (g[0].name === "Alpha Sibling 1" && g[1].name === "Alpha Sibling 2" && g[2].name === "Alpha Sibling 3" && !g[3].name), g.map((x) => x.name));
  ok("each row's columns belong to that entry (date of birth, address, occupation)", [1, 2, 3].every((i) => (g[i - 1].dob ?? "").includes(`19${80 + i}`) && (g[i - 1].address ?? "").includes(`Alpha Road ${i}`) && (g[i - 1].occ ?? "").includes(`Alpha Job ${i}`)), g);
  ok("the spouse's copy holds only the spouse's entry", cell(s, "C", 0, "ChildName") === "Bravo Sibling 1" && !cell(s, "C", 1, "ChildName") && !JSON.stringify(s).includes("Alpha Sibling"));
  ok("the principal's copy holds none of the spouse's entries", !JSON.stringify(p).includes("Bravo Sibling"));
  const b = grid(p, "B", 3);
  ok("Section B: each child's row holds that child's own address", (b[0].address ?? "").includes("First Child Road") && (b[1].address ?? "").includes("Second Child Road"), b);
  const rm = await call("DELETE", `/runtime/cases/${c.id}/groups/${P}/sibling/rows/${A.rows[1]}`, undefined, officer);
  p = await copy(P); const g2 = grid(p, "C", 3);
  console.log("AFTER-REMOVE " + JSON.stringify({ rm: rm.status, g2 }));
  ok("the middle entry removed: the others close up, with their own columns, and the removed one is gone", rm.status < 300 && g2[0].name === "Alpha Sibling 1" && g2[1].name === "Alpha Sibling 3" && (g2[1].address ?? "").includes("Alpha Road 3") && !g2[2].name && !JSON.stringify(p).includes("Alpha Sibling 2"), g2);
});
