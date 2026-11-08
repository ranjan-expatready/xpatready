// C6.5 part 2c (P-243, row L-SA9): staff corrections of document values counted per review mode, readable by staff
// (rows.md C6.5: "new C6.5-21 to -23 … corrections counted per mode; the count readable through the new
// GET /runtime/cases/:id/document-reviews/counts; a client refused"). Kept in a file of its own, beside the screen pack,
// so 2b and 2c never edit one file. The rule (api/src/document-review-counts.ts): a staff answer saved after the read that
// differs from it, or a check resolved by keeping the answer. Engine steps (C6.5-21e…): the rule on plain rows, no server.
// Synthetic Sample documents only (P-133). US$0.
//   tsx studio/acceptance/C6.5-counts.test.ts --engine
//   zsh studio/tools/isolated.sh c65c 4440 start && tsx studio/acceptance/C6.5-counts.test.ts 4440 xr_studio_c65c
import { CLIENT, FAMILY, FIXED, OFFICER, PORT, agent, answer, call, main, needVisitorVisa, ok, openCase } from "./lib/m3.ts";
import { passportPdf, upload } from "./lib/fixtures.ts";
import { countCorrections } from "../api/src/document-review-counts.ts";

type Prop = { id: string; fact: string; value: unknown; review: string; needs_look: boolean; source: { document: string } };
type Counts = { by_mode: Record<"collapsed" | "expanded", { read: number; corrected: number; rate: number | null }>; corrections: { fact: string; review: string; how: string; by: string }[] };

await main("C6.5", "Staff corrections of document values, counted per review mode (P-243; US$0)", async () => {
  const t0 = new Date("2026-11-08T10:00:00Z"), later = new Date("2026-11-08T11:00:00Z"), earlier = new Date("2026-11-08T09:00:00Z");
  const v = (id: string, fact: string, review: string, value: string) => ({ id, subjectId: "A", fact, review, valueJson: value, documentId: "D", readAt: t0 });
  const rows = [v("1", "person.passport_number", "collapsed", "SAMPLEP12"), v("2", "person.given_names", "expanded", "CLIENT A"), v("3", "person.family_name", "expanded", "SAMPLED")];
  const e1 = countCorrections(rows, [{ subjectId: "A", fact: "person.given_names", valueJson: "CLIENT AB", channel: "agent_view", actor: "user-O", at: later }], []);
  ok("C6.5-21e pass: a staff answer after the read that differs is one expanded correction; values read are counted per mode", e1.by_mode.expanded.corrected === 1 && e1.by_mode.expanded.read === 2 && e1.by_mode.collapsed.read === 1 && e1.by_mode.collapsed.corrected === 0 && e1.by_mode.expanded.rate === 0.5, e1);
  const e2 = countCorrections(rows, [
    { subjectId: "A", fact: "person.given_names", valueJson: "CLIENT AB", channel: "questionnaire", actor: "user-P", at: later },
    { subjectId: "A", fact: "person.passport_number", valueJson: "SAMPLEP12", channel: "agent_view", actor: "user-O", at: later },
    { subjectId: "A", fact: "person.family_name", valueJson: "SAMPLEDE", channel: "agent_view", actor: "user-O", at: earlier }], []);
  ok("C6.5-21e fail: a client's change, an answer equal to the document, and a staff answer typed before the read are not corrections", e2.corrections.length === 0, e2);
  const e3 = countCorrections(rows, [], [{ readValueId: "3", by: "user-O", at: later }]);
  ok("C6.5-22e pass: a check resolved by keeping the answer counts the document's value as corrected, once", e3.by_mode.expanded.corrected === 1 && e3.corrections[0]?.how === "kept_answer", e3);
  if (process.argv.includes("--engine")) return;

  const vv = needVisitorVisa();
  const c = await openCase(vv, FAMILY);
  const P = c.subjects["Sample Client A"];
  const secs = ((await agent(c.id))?.sections ?? []) as { section: string; subjectId: string; questions: { fact: string }[] }[];
  const passSec = secs.find((s) => s.subjectId === P && s.questions.some((q) => q.fact === "person.passport_number"))!.section;
  const line = (((await call("GET", `/runtime/cases/${c.id}/checklist`, undefined, OFFICER)).body?.people ?? []).find((x: { subject: string }) => x.subject === P)?.lines ?? []).find((x: { label: string }) => /passport/i.test(x.label) && !/absent|parent/i.test(x.label))?.id;
  const doc = (await upload(PORT, `/runtime/checklist-lines/${line}/documents`, passportPdf({ surname: "SAMPLED", given: "CLIENT A", number: "SAMPLEP12", nationality: "IND", dob: FAMILY[0].dob!, sex: "F", expiry: FIXED.expiry }), "sample-passport.pdf", OFFICER)).body?.document?.id as string;
  await call("POST", `/runtime/cases/${c.id}/sections/${passSec}/fill-from-documents`, { subjectId: P }, OFFICER);
  const counts = async (actor = OFFICER) => call("GET", `/runtime/cases/${c.id}/document-reviews/counts`, undefined, actor);
  const props = ((await call("GET", `/runtime/cases/${c.id}/proposals?subject=${P}`, undefined, OFFICER)).body?.proposals ?? []) as Prop[];
  const read = (await counts()).body as Counts;
  ok("C6.5-21 pass (P-243): before any correction the counts name the values read per mode (3 collapsed on passed check digits) and no correction", read?.by_mode?.collapsed?.read === 3 && read.by_mode.expanded.read === props.filter((p) => p.review === "expanded").length && read.by_mode.collapsed.corrected + read.by_mode.expanded.corrected === 0, read);
  // A correction before Confirm & use: the officer saves another given name in place (the drawer's "Correct it").
  await answer(c.id, P, "person.given_names", "CLIENT AB", OFFICER);
  await call("POST", `/runtime/cases/${c.id}/documents/${doc}/confirm-and-use`, { subjectId: P, checked: ((await call("GET", `/runtime/cases/${c.id}/proposals?subject=${P}`, undefined, OFFICER)).body?.proposals ?? []).filter((p: Prop) => p.source.document === doc && p.needs_look).map((p: Prop) => p.id) }, OFFICER);
  // A later staff change to a collapsed value that came from the document.
  await answer(c.id, P, "person.passport_number", "SAMPLEP13", OFFICER);
  const after = (await counts()).body as Counts;
  ok("C6.5-22 pass (P-243): a correction before Confirm & use counts as expanded, a later staff change to a collapsed value as collapsed, each once, with who and how", after?.by_mode?.expanded?.corrected === 1 && after.by_mode.collapsed.corrected === 1 && after.corrections.every((x) => x.by === OFFICER && x.how === "staff_answer") && after.by_mode.collapsed.rate === Math.round((1 / 3) * 1000) / 1000, after);
  // Re-typing what the document reads is not a correction.
  await answer(c.id, P, "person.passport_expiry_date", FIXED.expiry, OFFICER);
  const same = (await counts()).body as Counts;
  ok("C6.5-22 fail: an answer saved equal to what the document reads is not a correction", same?.by_mode?.collapsed?.corrected === 1, same?.corrections);
  const [client, other] = [await counts(CLIENT), await counts("user-S")];
  ok("C6.5-23 fail: the counts are staff only: the client is refused (403) and another firm finds no such case (404)", client.status === 403 && other.status === 404, [client.status, other.status]);
});
