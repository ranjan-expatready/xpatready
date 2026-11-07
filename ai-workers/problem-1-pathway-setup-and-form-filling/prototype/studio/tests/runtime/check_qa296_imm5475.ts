// QA-296 (qa's C6.11 re-score, 7 Nov; C7.7, C6.11): IRCC's IMM 5475 releases information to a designated individual,
// "someone who will not act as your representative". On the configured checkpoint its map reads that person's names
// about "representative", the same keys IMM 5476 reads for the representative of record, so the firm record's names
// were written into IMM 5475's designated individual. The firm record fills only a form that names the representative
// of record (one that reads the library's representative.* facts about them: IMM 5476's licence part), by the map's own
// keys, never a form number (P-319). Read in a filled copy: the PDF's own values. Each rule with a passing and a failing
// case, on the configured checkpoint. Sample data, US$0, no model call.
//   zsh studio/tools/isolated.sh rt296 4442 start, then Demo › Reset and Demo › Load the configured checkpoint as the author
//   tsx studio/tests/runtime/check_qa296_imm5475.ts 4442 xr_studio_rt296
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as team from "../../engine/runtime/team.ts";
import { answer, call, CLIENT, copyBytes, firms, generateCopy, itemsOf, main, needVisitorVisa, ok, openCase, prepare, sql, yearsAgo } from "../../acceptance/lib/m3.ts";

const STUDIO = join(import.meta.dirname, "..", ".."), ROOT = join(STUDIO, "..", "..", "..", "..");
const PY = join(ROOT, ".tools", "solution-1-prototype", ".venv", "bin", "python");
/** Every value a filled PDF holds, by its form field's data path: the XFA data the filler wrote, read with the proven E5
 *  reader (p1/e5_roundtrip.py), as the read-back of a validated copy reads it. */
function pdfValues(pdf: Buffer): Record<string, string> {
  if (!pdf.length) return {};
  const dir = mkdtempSync(join(tmpdir(), "qa296-")), file = join(dir, "copy.pdf");
  try {
    writeFileSync(file, pdf);
    const code = "import sys, json; sys.path.insert(0, sys.argv[1]); import e5_roundtrip as E, xml.etree.ElementTree as ET\n"
      + "r = E.open_reader(open(sys.argv[2], 'rb').read()); d = E.data_root(ET.fromstring(E.xfa_streams(r)['datasets'].get_object().get_data()))\n"
      + "print(json.dumps({p: v for p, v in E.leaves(d) if v}))";
    return JSON.parse(execFileSync(PY, ["-I", "-c", code, join(STUDIO, "..", "p1"), file], { encoding: "utf8" }).trim().split("\n").pop()!);
  } catch { return {}; } finally { rmSync(dir, { recursive: true, force: true }); }
}
type Box = { box: string; fact: string | null; result: string };
const boxesOf = (copy: string | null): Box[] => JSON.parse(sql(`select coalesce(result_json->'boxes', '[]') from form_instance where id='${copy}'`) ?? "[]");
const NAMES = ["person.family_name", "person.given_names"];

await main("QA-296", "IMM 5475's designated individual is never the representative of record — checkpoint checks", async () => {
  // The rule, pure: read through the module, so the same check fails in words on code without this row's change.
  const names = (team as { namesRepresentative?: (e: { outcome?: string; fact?: string | null; person?: string | null }[]) => boolean }).namesRepresentative ?? (() => "(no namesRepresentative)" as unknown as boolean);
  ok("QA-296 pass: a form whose map reads a representative.* fact about the representative names them (IMM 5476's licence part)", names([{ outcome: "mapped", fact: "person.family_name", person: "representative" }, { outcome: "mapped", fact: "representative.membership_id", person: "representative" }]) === true);
  ok("QA-296 fail: a form that reads only a name and contact about \"representative\" does not (IMM 5475's designated individual)", names([{ outcome: "mapped", fact: "person.family_name", person: "representative" }, { outcome: "mapped", fact: "person.address_city", person: "representative" }]) === false);
  ok("QA-296 fail: a representative.* fact about someone else, or not mapped, names nobody", names([{ outcome: "mapped", fact: "representative.membership_id", person: "form_subject" }, { outcome: "unresolved", fact: "representative.membership_id", person: "representative" }]) === false);
  ok("QA-296 fail (review m3): an entry with no outcome, or one left to write by hand, names nobody either", names([{ fact: "representative.membership_id", person: "representative" }, { outcome: "by_hand", fact: "representative.membership_id", person: "representative" }]) === false);

  const vv = needVisitorVisa(), f = await firms();
  const rec = (JSON.parse(readFileSync(join(STUDIO, "samples", "firms.json"), "utf8")) as { firms: { users: { id: string; family_name?: string; given_names?: string }[] }[] }).firms.flatMap((x) => x.users).find((u) => u.id === f.rep);
  ok("QA-296 setup: the representative of record has a family name and given names in the firm record", !!rec?.family_name && !!rec?.given_names, rec);
  const c = await openCase(vv, [{ role: "principal", name: "Sample Client A", dob: yearsAgo(40) }], { representative: f.rep, caseOfficers: [f.officer!] });
  const P = c.subjects["Sample Client A"], officer = f.officer!;
  const p = (await prepare(c.id, officer)).p;
  ok("QA-296 setup: on the checkpoint the principal has IMM 5475 and IMM 5476", itemsOf(p, P, "IMM 5475").length === 1 && itemsOf(p, P, "IMM 5476").length === 1, itemsOf(p, P).map((i) => i.form));

  // The fault as qa read it, now in a filled copy: IMM 5475 for the principal.
  const c5475 = await generateCopy(c.id, "IMM 5475", P);
  const b5475 = boxesOf(c5475), v5475 = pdfValues(await copyBytes(c5475 ?? "", officer));
  // B107: the designated individual's part 5 is filled by hand (samples/form-field-gates.json), so the map reads the names
  // once, in the applicant's part; this check still holds on a release whose map reads them twice.
  ok("QA-296 setup: the copy of IMM 5475 is made, and its map reads the applicant's names", !!c5475 && NAMES.every((n) => b5475.filter((b) => b.fact === n).length >= 1) && Object.keys(v5475).length > 0, b5475.filter((b) => NAMES.includes(b.fact ?? "")).map((b) => `${b.box.split(".").slice(-2).join(".")}=${b.result}`));
  const repIn = Object.entries(v5475).filter(([, v]) => v === rec?.family_name || v === rec?.given_names);
  ok("QA-296 fail (the bug): the filled IMM 5475 holds neither the representative of record's family name nor their given names", !!c5475 && repIn.length === 0, repIn);
  ok("QA-296 fail: no name box of IMM 5475 is written from the case (the applicant's are not confirmed yet; the designated individual's is no fact of the case)", !!c5475 && b5475.filter((b) => NAMES.includes(b.fact ?? "")).every((b) => b.result !== "written"), b5475.filter((b) => NAMES.includes(b.fact ?? "") && b.result === "written").map((b) => b.box));

  // IMM 5476 still names the representative of record, from the firm record.
  const c5476 = await generateCopy(c.id, "IMM 5476", P);
  const v5476 = Object.values(pdfValues(await copyBytes(c5476 ?? "", officer)));
  ok("QA-296 pass: the filled IMM 5476 still holds the representative of record's family name and given names", v5476.includes(rec?.family_name ?? "?") && v5476.includes(rec?.given_names ?? "?"), v5476.slice(0, 12));
  ok("QA-296 pass: and its licence number", v5476.some((v) => /\d{3,}/.test(v) && JSON.stringify(f.firm?.users.find((u) => u.actor === f.rep)?.licence ?? "").includes(v)), v5476.slice(0, 12));

  // Review m3: the applicant's own confirmed names still reach IMM 5475 (its applicant part); only the designated
  // individual's stay blank. Client A answers their own names (P-78: a client's own answer counts as confirmed).
  const own = { family: "Applicantfamily", given: "Applicantgiven" };
  const typed = [await answer(c.id, P, "person.family_name", own.family, CLIENT), await answer(c.id, P, "person.given_names", own.given, CLIENT)];
  ok("QA-296 setup (review m3): Client A saves their own family name and given names", typed.every((x) => x.status < 300), typed.map((x) => [x.status, x.body?.detail]));
  const again = await generateCopy(c.id, "IMM 5475", P);
  const bAgain = boxesOf(again), vAgain = Object.values(pdfValues(await copyBytes(again ?? "", officer)));
  ok("QA-296 pass (review m3): a new IMM 5475 copy writes the applicant's own names, once each (the applicant's boxes)", !!again && vAgain.includes(own.family) && vAgain.includes(own.given) && NAMES.every((n) => bAgain.filter((b) => b.fact === n && b.result === "written").length === 1), NAMES.map((n) => bAgain.filter((b) => b.fact === n).map((b) => `${b.box.split(".").slice(-2).join(".")}=${b.result}`)));
  ok("QA-296 fail (review m3): and still neither of the representative's names", !!again && !vAgain.includes(rec?.family_name ?? "?") && !vAgain.includes(rec?.given_names ?? "?"), vAgain);

  // The representative's tab says truthfully which forms the names fill.
  const view = (await call("GET", `/runtime/cases/${c.id}/questionnaire?mode=agent`, undefined, officer)).body;
  const rep = (view?.sections ?? []).filter((x: { subjectId: string }) => x.subjectId === team.REPRESENTATIVE).flatMap((x: { questions: unknown[] }) => x.questions) as { fact: string; answer: { channel: string } | null; fills: { form: string }[] }[];
  const named = rep.filter((q) => NAMES.includes(q.fact));
  ok("QA-296 pass: the representative's family name and given names are from the firm record and fill IMM 5476", named.length === 2 && named.every((q) => q.answer?.channel === team.FIRM_RECORD && q.fills.some((x) => x.form === "IMM 5476")), named.map((q) => `${q.fact}: ${q.answer?.channel} → ${q.fills.map((x) => x.form).join(", ")}`));
  ok("QA-296 fail (the tab's words): neither says it fills IMM 5475", named.length === 2 && named.every((q) => !q.fills.some((x) => x.form === "IMM 5475")), named.map((q) => `${q.fact} → ${q.fills.map((x) => x.form).join(", ")}`));
  // The ruling on #1072 still holds: IMM 5475's address, e-mail and phone about the representative are no firm-record fact.
  // B107: its part 5 and 6 are filled by hand, so no question about the representative fills IMM 5475 at all.
  const contact = rep.filter((q) => q.fills.some((x) => x.form === "IMM 5475"));
  ok("QA-296 pass (ruling on #1072, B107): no question about the representative fills IMM 5475 (its designated individual is written by hand)", contact.length === 0, contact.map((q) => `${q.fact}=${q.answer?.channel ?? "—"}`));
});
