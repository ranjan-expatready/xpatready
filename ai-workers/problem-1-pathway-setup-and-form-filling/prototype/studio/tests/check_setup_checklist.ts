// W1 setup checklist, slice A (P-157, P-161, P-176, P-180; concept v4 §4–§8): the engine (five steps, precedence, Not
// ready first, the `where` and kind tables, one counts object, the duty and tier overlay) with a passing and a failing
// case per rule, then the API on an isolated copy (GET /catalogue and GET /combinations/:id/summary carry `setup`,
// parity with today's next step, the counts the row already shows) and the 150-combination timing. No AI (US$0).
//   zsh studio/tools/isolated.sh screens_sa 4441 start && tsx studio/tests/check_setup_checklist.ts 4441 xr_studio_screens_sa
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { forViewer, KIND_STEP, mayAct, setupChecklistOf, WHERE_STEP, type SetupInput } from "../engine/setup-checklist.ts";
import { SetupChecklist, ViewerChecklist } from "../contracts/setup-checklist.ts";
import { PROPOSAL_KINDS } from "../contracts/proposal-item.ts";

let pass = 0, fail = 0;
const step = (name: string, ok: boolean, detail?: unknown) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail === undefined ? "" : ` — ${String(typeof detail === "string" ? detail : JSON.stringify(detail)).slice(0, 220)}`}`); };
const AUTHOR = { id: "user-A", duties: ["author", "review"] }, SME = { id: "user-C", duties: ["review", "sme"] }, APPROVER = { id: "user-B", duties: ["review", "approve"] };

/** A combination with everything set up and released (Live), which each case below changes in one place. */
const live = (over: Partial<SetupInput> = {}): SetupInput => ({
  combinationId: "c-1", retired: false, release: { number: 3, problems: [] }, pages: { state: "confirmed", by: "user-A", as: "author" },
  people: { roles: 3, applicants: 2, saved: true, confirmed: { by: "user-A", as: "author" }, tier: "author" },
  forms: { lines: 2, fromLibrary: 0, draftable: 0, unmapped: 0, sources: 0 }, proposals: {}, problems: [], documents: { lines: 4, rolesWithout: 0 }, questions: 30, held: 0,
  running: null, changes: 0, review: { stage: "submit", submittedBy: null, authors: [] }, ...over,
});
const draft = (over: Partial<SetupInput> = {}) => live({ release: null, changes: 5, ...over });
const err = (where: string) => ({ level: "error" as const, where, item: "x", message: "m" });

// ------------------------------------------------------------------ engine rules
{
  const c = setupChecklistOf(live());
  step("C11.10: all five steps done → bar \"✓ Live\", 5 of 5, no next item, chip Live", c.bar.done === 5 && c.bar.text === "✓ Live" && c.next === null && c.chip.status === "LIVE", c.bar);
  step("C11.10: the contract parses the engine's answer (five steps)", SetupChecklist.safeParse(c).success);
  step("C11.10 (fail case): a checklist with four steps is refused by the contract", !SetupChecklist.safeParse({ ...c, steps: c.steps.slice(0, 4) }).success);
}
{
  const ns = setupChecklistOf({ ...draft(), combinationId: null });
  step("C11.16: Not started → \"0 of 5 steps\", Start setup for the author", ns.bar.text === "0 of 5 steps" && ns.chip.status === "NOT_STARTED" && forViewer(ns, AUTHOR).button === "Start setup", ns.bar);
  const started = setupChecklistOf(draft());
  step("C11.16 (fail case): a combination that exists never offers Start setup", forViewer(started, AUTHOR).button === "Resume setup", forViewer(started, AUTHOR).button);
}
{
  // CHECK 30 Oct (review M1, break M1): right after Start setup nothing is done, so no step may count as done.
  const fresh = setupChecklistOf(draft({ pages: { state: "no_record" }, people: { roles: 0, applicants: 0, saved: false, confirmed: null, tier: "expert" }, forms: { lines: 0, fromLibrary: 0, draftable: 0, unmapped: 0, sources: 0 }, documents: { lines: 0, rolesWithout: 0 }, questions: 0 }));
  step("C11.16 / concept §4a: just started (no forms, no documents) → \"0 of 5 steps\", step 4 open", fresh.bar.text === "0 of 5 steps" && fresh.steps[3].state !== "done", { bar: fresh.bar.text, step4: fresh.steps[3].state });
  const docsNoForms = setupChecklistOf(draft({ forms: { lines: 0, fromLibrary: 0, draftable: 0, unmapped: 0, sources: 0 }, documents: { lines: 0, rolesWithout: 0 } }));
  step("C11.16 (fail case): no document lines is never done, with or without forms", docsNoForms.steps[3].state !== "done" && docsNoForms.steps[3].open.some((i) => i.text === "Draft questions and documents"), docsNoForms.steps[3].open.map((i) => i.text));
  // CHECK 30 Oct (review M2): no screen offers "Confirm who can apply" yet (P-176 Q1), so it is open but never Needs you.
  const unconfirmed = setupChecklistOf(live({ people: { roles: 3, applicants: 2, saved: false, confirmed: null, tier: "expert" } }));
  step("C11.10: an unconfirmed people list stays open on step 2 and in the Next line", unconfirmed.steps[1].open.some((i) => i.kind === "confirm_people"), unconfirmed.steps[1].open.map((i) => i.kind));
  // Slice C1 (P-161 (2)): the people step opens Forms, where Before forms holds the people card (the 30 Oct interim reverted).
  const peopleNext = setupChecklistOf(draft({ people: { roles: 3, applicants: 2, saved: false, confirmed: null, tier: "author" } }));
  step("C11.10: the people step opens Forms (Before forms, P-161 (2))", unconfirmed.steps[1].tab === "forms" && (peopleNext.next?.step !== "people" || peopleNext.next.href.includes("/forms?focus=people%3Acard")), { tab: unconfirmed.steps[1].tab, href: peopleNext.next?.href });
  step("C11.10 (fail case): Resume on the people step never lands on Smart questionnaire (SQR)", !(peopleNext.next?.step === "people" && peopleNext.next.href.includes("/questionnaires")), peopleNext.next?.href);
  step("C11.10 (fail case): it is not Needs you for the expert while no screen offers the confirmation", !forViewer(unconfirmed, SME).needsYou, forViewer(unconfirmed, SME).needsYou);
}
{
  const found = setupChecklistOf(draft({ forms: { lines: 0, fromLibrary: 3, draftable: 0, unmapped: 0, sources: 3 } }));
  const forms = found.steps[2];
  step("C1.4: 3 library forms found for its sources → \"Add 3 forms found\", never \"Find forms\"", forms.open[0]?.text === "Add 3 forms found" && !forms.open.some((i) => i.kind === "find_forms"), forms.open.map((i) => i.text));
  const none = setupChecklistOf(draft({ forms: { lines: 0, fromLibrary: 0, draftable: 0, unmapped: 0, sources: 0 } }));
  step("C1.4 (fail case): nothing attached and no lines → \"Find forms\"", none.steps[2].open[0]?.kind === "find_forms");
}
{
  const both = setupChecklistOf(draft({ running: { batchId: "b1", step: "forms" }, proposals: { person_role: 1 } }));
  step("C1.4: precedence — a people proposal on step 2 wins over a run on step 3", both.next?.step === "people" && both.next.item.text === "Review 1 people proposal" && both.steps[2].state === "ai", both.next?.line);
  const run = setupChecklistOf(draft({ running: { batchId: "b1", step: "forms" } }));
  step("C1.4 (fail case): with no proposal the run's own step is next, and its button is View AI progress", run.next?.item.kind === "view_ai" && run.steps[2].state === "ai", run.next?.item);
}
{
  const nr = setupChecklistOf(live({ release: { number: 2, problems: [err("Documents")] }, changes: 1, review: { stage: "submit", submittedBy: null, authors: [] }, proposals: { person_role: 1 } }));
  step("C11.10: Not ready — the release's problem is the first item (before a draft proposal), chip Not ready, step 5 reopens", nr.next?.item.fromRelease === true && nr.next.step === "questions_documents" && nr.chip.status === "NOT_READY" && nr.steps[4].state !== "done", nr.next);
  const v = forViewer(nr, AUTHOR);
  step("C11.10: Not ready → Resume setup and Needs you for the author", v.button === "Resume setup" && !!v.needsYou, v);
  // X1 (review M1): step 4's release problems land on the tab of their part, and the step opens that tab.
  const nrQ = setupChecklistOf(live({ release: { number: 2, problems: [err("Rules")] } }));
  const q4 = nrQ.steps.find((x) => x.key === "questions_documents")!;
  step("C11.10 X1 pass: a Not ready rule problem is a questionnaires:problems item and step 4 opens Smart questionnaire (SQR)", q4.open[0]?.focus === "questionnaires:problems" && q4.open[0].fromRelease === true && q4.tab === "questionnaires" && (nrQ.next?.href ?? "").includes("/questionnaires?focus=questionnaires%3Aproblems"), { focus: q4.open[0]?.focus, tab: q4.tab, href: nrQ.next?.href });
  const nrD = setupChecklistOf(live({ release: { number: 2, problems: [err("Documents")] } }));
  const d4 = nrD.steps.find((x) => x.key === "questions_documents")!;
  step("C11.10 X1 fail: a Not ready documents problem never lands on Smart questionnaire (SQR) (documents:problems, Documents tab)", d4.open[0]?.focus === "documents:problems" && d4.tab === "documents", { focus: d4.open[0]?.focus, tab: d4.tab });
  const nrB = setupChecklistOf(live({ release: { number: 2, problems: [err("Documents"), err("Rules"), err("Checks")] } }));
  const b4 = nrB.steps.find((x) => x.key === "questions_documents")!;
  step("C11.10 X1: problems in both parts are two items with their own counts (1 documents, 2 questions)", b4.open.filter((i) => i.fromRelease).map((i) => `${i.focus}:${i.count}`).join() === "documents:problems:1,questionnaires:problems:2", b4.open.map((i) => `${i.focus}:${i.count}`));
  const ok = setupChecklistOf(live({ release: { number: 2, problems: [] } }));
  step("C11.10 (fail case): a release with no problems is Live and has no release item", ok.chip.status === "LIVE" && !ok.steps.some((s) => s.open.some((i) => i.fromRelease)));
}
{
  const lp = setupChecklistOf(live({ pages: { state: "proposed", matches: 1 } }));
  step("C11.10: Live with back-filled pages → chip Live, step 1 open, the card's button stays Open", lp.chip.status === "LIVE" && lp.steps[0].state !== "done" && forViewer(lp, AUTHOR).button === "Open" && lp.bar.text === "✓ Live");
  const nr = setupChecklistOf(live({ pages: { state: "no_record" } }));
  step("C11.10: no official-pages record yet → step 1 open with no item (forms lane's record not landed)", nr.steps[0].state !== "done" && nr.steps[0].open.length === 0 && nr.bar.done === 4, nr.steps[0]);
  step("C11.10 (fail case): a confirmed record closes step 1", setupChecklistOf(live()).steps[0].state === "done");
}
{
  // Duties and tiers (§5, P-176): the overlay and the server's 403 read the same table (mayAct).
  const one = setupChecklistOf(draft({ pages: { state: "proposed", matches: 1 } }));
  const i1 = one.steps[0].open[0];
  step("C11.10: pages, one match (sure) → the author's filled confirm; the expert may confirm too", i1.kind === "confirm_pages" && forViewer(one, AUTHOR).filled && mayAct(i1, SME), i1);
  const three = setupChecklistOf(draft({ pages: { state: "proposed", matches: 3 } }));
  const i3 = three.steps[0].open[0];
  step("C11.10 (fail case): pages, three matches (not sure) → the author may not confirm (the server answers 403); the expert's filled", i3.kind === "choose_pages" && !mayAct(i3, AUTHOR) && forViewer(three, SME).filled && !forViewer(three, AUTHOR).filled, i3);
  step("C11.10: the author's Next line names who it waits for", /^Waiting for the immigration expert: Choose the checklist page \(3 pages match\)$/.test(forViewer(three, AUTHOR).nextLine ?? ""), forViewer(three, AUTHOR).nextLine);
  const sign = setupChecklistOf(draft({ review: { stage: "sign", submittedBy: "user-C", authors: [] }, pages: { state: "confirmed", by: "user-C", as: "expert" } }));
  const si = sign.steps[4].open[0];
  step("C11.10 (fail case): the submitter may not sign (second person)", si.kind === "sign" && !mayAct(si, SME) && !mayAct(si, AUTHOR), si);
  const signOk = setupChecklistOf(draft({ review: { stage: "sign", submittedBy: "user-A", authors: [] } }));
  step("C11.10: the expert signs what someone else submitted (filled for the expert, Needs you)", forViewer(signOk, SME).filled && !!forViewer(signOk, SME).needsYou, forViewer(signOk, SME));
  const rel = setupChecklistOf(draft({ review: { stage: "release", submittedBy: "user-A", authors: ["user-A"] } }));
  step("C11.10: Release is the approver's, never the author's", forViewer(rel, APPROVER).filled && !mayAct(rel.steps[4].open[0], AUTHOR) && !!forViewer(rel, APPROVER).needsYou);
  const relSelf = setupChecklistOf(draft({ review: { stage: "release", submittedBy: "user-B", authors: [] } }));
  step("C11.10 (fail case): the approver who submitted may not release", !mayAct(relSelf.steps[4].open[0], APPROVER) && !forViewer(relSelf, APPROVER).needsYou);
}
{
  // P-180 Q1: Open for anyone without the author duty, in every state.
  const states = [setupChecklistOf({ ...draft(), combinationId: null }), setupChecklistOf(draft()), setupChecklistOf(live()), setupChecklistOf(live({ release: { number: 1, problems: [err("Forms")] } })), setupChecklistOf(live({ retired: true }))];
  step("C11.10: the expert and the approver see Open on every state", states.every((c) => forViewer(c, SME).button === "Open" && forViewer(c, APPROVER).button === "Open"), states.map((c) => forViewer(c, SME).button));
  step("C11.10 (fail case): the author sees Start setup or Resume setup before Live", forViewer(states[0], AUTHOR).button === "Start setup" && forViewer(states[1], AUTHOR).button === "Resume setup" && forViewer(states[3], AUTHOR).button === "Resume setup");
  step("C11.10: Retired → \"Retired at Release n\", no Needs you", states[4].bar.text === "Retired at Release 3" && states[4].chip.status === "RETIRED" && !forViewer(states[4], AUTHOR).needsYou);
}
{
  // Needs you (founder 30 Oct: "a review or a confirmation"), never a building step.
  const building = setupChecklistOf(draft({ forms: { lines: 0, fromLibrary: 0, draftable: 2, unmapped: 0, sources: 2 } }));
  step("C11.10 (fail case): building work (Map forms, Find forms, a draft's own problem) is not Needs you", !forViewer(building, AUTHOR).needsYou && !forViewer(setupChecklistOf(draft({ problems: [err("Forms")] })), AUTHOR).needsYou);
  const review = setupChecklistOf(draft({ proposals: { field: 2, requirement_line: 1 } }));
  step("C11.10: waiting proposals are Needs you for the author (3), not for the expert", forViewer(review, AUTHOR).needsYou?.count === 3 && !forViewer(review, SME).needsYou, forViewer(review, AUTHOR).needsYou);
  step("C11.10: an overlay keeps the contract (ViewerChecklist parses)", ViewerChecklist.safeParse({ ...review, viewer: forViewer(review, AUTHOR) }).success);
}
{
  // Step 4 (P-130, P-174): 4a documents, then 4b questions; an answer asked of nobody keeps 4b open.
  // PR #108 minor (b): Submit for review only once Forms and Questions and documents have nothing open.
  const ready = setupChecklistOf(live({ changes: 1 }));
  step("C11.10: Submit for review is offered when Forms and Questions and documents are done", ready.steps[4].open.some((i) => i.kind === "submit") && ready.next?.item.kind === "submit", ready.steps[4].open.map((i) => i.kind));
  const formsOpen = setupChecklistOf(live({ changes: 1, forms: { lines: 0, fromLibrary: 0, draftable: 0, unmapped: 0, sources: 0 } }));
  const docsOpen = setupChecklistOf(live({ changes: 1, problems: [err("Documents")] }));
  step("C11.10 (fail case): no Submit for review while Forms or Documents are still open (the endpoint would refuse it)", [formsOpen, docsOpen].every((c) => !c.steps.some((st) => st.open.some((i) => i.kind === "submit")) && c.next?.step !== "release"), [formsOpen.next?.line, docsOpen.next?.line]);
  // #111 review m1: holding Submit back must not make step 5 look done on a Live combination with draft changes.
  step("C11.10 (fail case): with draft changes and Forms or Documents open, step 5 is not done", [formsOpen, docsOpen].every((c) => c.steps[4].state !== "done"), [formsOpen.steps[4].state, docsOpen.steps[4].state]);
  step("C11.10: a Live combination with no draft changes has step 5 done", setupChecklistOf(live()).steps[4].state === "done", setupChecklistOf(live()).steps[4].state);
  const gap = setupChecklistOf(live({ problems: [err("Questionnaires"), err("Questionnaires")], changes: 1, review: { stage: "submit", submittedBy: null, authors: [] } }));
  const s4 = gap.steps[3];
  step("C11.10: an answer a form reads and nobody is asked → step 4 open, \"2 answers asked of nobody\", 4b not done, 4a done", s4.state !== "done" && s4.open.some((i) => i.text === "2 answers asked of nobody") && s4.parts?.[1].done === false && s4.parts?.[0].done === true, s4.open);
  step("C11.10 (fail case): with no gap step 4 is done", setupChecklistOf(live()).steps[3].state === "done");
  const noDocs = setupChecklistOf(draft({ documents: { lines: 0, rolesWithout: 0 } }));
  step("C11.10: forms but no document lines → \"Draft questions and documents\" on Documents", noDocs.steps[3].open[0]?.text === "Draft questions and documents" && noDocs.steps[3].tab === "documents");
}
{
  // The two tables (§6): every `where` literal in engine/ and every proposal kind has a step; a new value fails.
  const dir = join(import.meta.dirname, "..", "engine");
  const wheres = new Set<string>();
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".ts"))) for (const m of readFileSync(join(dir, f), "utf8").matchAll(/where: "([^"]+)"/g)) wheres.add(m[1]);
  const missing = [...wheres].filter((w) => !WHERE_STEP[w]);
  step(`C11.10: every validator \`where\` in engine/ (${wheres.size}) has a step`, wheres.size >= 8 && missing.length === 0, missing.length ? missing : [...wheres].join(", "));
  step("C11.10: every proposal kind (11) has a step", PROPOSAL_KINDS.length === 11 && PROPOSAL_KINDS.every((k) => KIND_STEP[k]));
  step("C11.10 (fail case): a new `where` value without a row is caught (and falls back to step 5)", !WHERE_STEP["Official pages"] && setupChecklistOf(draft({ problems: [err("Official pages")] })).counts.problems.release === 1);
}
{
  // One counts object; the items say the same numbers.
  const c = setupChecklistOf(draft({ proposals: { person_role: 2, field: 1, section: 4 }, problems: [err("Forms"), err("Documents"), err("Rules")] }));
  step("C11.10: one counts object — proposals and problems by step", JSON.stringify(c.counts.proposals) === JSON.stringify({ pages: 0, people: 2, forms: 1, questions_documents: 4, release: 0 }) && JSON.stringify(c.counts.problems) === JSON.stringify({ pages: 0, people: 0, forms: 1, questions_documents: 2, release: 0 }), c.counts);
  step("C11.10: the bar never says \"Step n of 5\"", ![c, setupChecklistOf(live())].some((x) => /Step \d of 5/.test(x.bar.text)));
  step("C11.10: \"Review n proposals\" opens the proposals page for the combination and the step (PR #108 minor (c))", c.next?.href === "/review/proposals?c=c-1&step=2", c.next?.href);
}

// ------------------------------------------------------------------ the API (isolated copy)
const PORT = Number(process.argv[2] ?? 0);
const DB = process.argv[3] ?? "xr_studio_screens_sa";
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
if (!PORT) { console.log(`${pass}/${pass + fail} passed (engine only; pass a port for the API part)`); process.exit(fail ? 1 : 0); }
const api = async (path: string, actor: string | null = "user-A", method = "GET", body?: unknown) => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { ...(actor ? { "x-actor": actor } : {}), "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, body: await r.json().catch(() => null) as any };
};
type Leaf = { combinationId: string | null; nodeKey: string; label: string; nextAction: { kind: string } | null; counts: { documents: number; questions: number } | null; forms: { drafted: boolean; document: boolean }[]; live: boolean; retired: boolean; needsYou?: boolean; setup?: any };
await api("/demo/reset", "user-A", "POST", { confirm: "RESET" });
const loaded = await api("/demo/load", "user-A", "POST");
step("setup: sample inputs loaded on the isolated copy", loaded.status < 300, loaded.status);
const leaves = async (actor: string) => {
  const out: Leaf[] = [];
  for (const pw of ["INDIVIDUAL", "CORPORATE"]) out.push(...((await api(`/catalogue?pathway=${pw}&filter=all`, actor)).body.rows as Leaf[]));
  return out;
};
const rows = await leaves("user-A");
const started = rows.filter((r) => r.combinationId);
step("C11.10: GET /catalogue gives every card its setup (chip, bar, steps without items, the viewer's button)", rows.length > 0 && rows.every((r) => r.setup?.bar && r.setup.steps.length === 5 && !("open" in r.setup.steps[0]) && r.setup.viewer?.button), `${rows.length} cards, ${started.length} started`);
step("C11.16: Not started cards say \"0 of 5 steps\" and Start setup for the author", rows.filter((r) => !r.combinationId).every((r) => r.setup.bar.text === "0 of 5 steps" && r.setup.viewer.button === "Start setup"));
const smeRows = await leaves("user-C");
step("C11.10: the immigration expert sees Open on every card (P-180 Q1)", smeRows.every((r) => r.setup.viewer.button === "Open"), [...new Set(smeRows.map((r) => r.setup.viewer.button))]);
// Break-report m2: the API's "needs" count and filter are the person's own Needs you, the card's rule.
const needsFor = async (actor: string) => {
  const all = (await api("/catalogue?pathway=INDIVIDUAL&filter=all", actor)).body, only = (await api("/catalogue?pathway=INDIVIDUAL&filter=needs", actor)).body;
  return { count: all.counts.needs as number, mine: (all.rows as Leaf[]).filter((r) => r.needsYou).length, shown: only.fellBack ? 0 : only.rows.length, onlyMine: only.fellBack || (only.rows as Leaf[]).every((r) => r.needsYou) };
};
const needA = await needsFor("user-A"), needC = await needsFor("user-C");
step("C11.10: counts.needs and ?filter=needs are the person's Needs you (author and expert)", [needA, needC].every((n) => n.count === n.mine && n.shown === n.mine && n.onlyMine), { author: needA, expert: needC });
step("C11.10 (fail case): the count is not the same old number for every person", needA.count !== needC.count || needA.mine === needC.mine, { author: needA.count, expert: needC.count });
const noActor = await fetch(`http://localhost:${PORT}/api/catalogue?pathway=INDIVIDUAL`);
step("C11.10 (fail case): the catalogue without a person is refused (401, deny by default)", noActor.status === 401, noActor.status);
// Parity with today's next step (plan.md slice A (3)): the setup actions the old engine names are the new step-3 items.
const SAME: Record<string, string[]> = { start: [], add_forms: ["find_forms"], add_from_library: ["add_forms_found"], draft_ai: ["map_forms"], view_progress: ["view_ai"], review_proposals: ["review_proposals"] };
let compared = 0; const differ: string[] = [];
for (const r of started) {
  const s = (await api(`/combinations/${r.combinationId}/summary`, "user-A")).body;
  const parsed = ViewerChecklist.safeParse(s.setup);
  if (!parsed.success) { differ.push(`${r.label}: contract ${parsed.error.issues[0]?.path.join(".")}`); continue; }
  const k = r.nextAction?.kind;
  if (k && SAME[k]?.length) { compared++; const kinds = s.setup.steps.flatMap((x: any) => x.open.map((i: any) => i.kind)); if (!SAME[k].some((x) => kinds.includes(x))) differ.push(`${r.label}: old ${k}, new ${kinds.join("/")}`); }
  if (r.counts && (s.setup.counts.documents !== r.counts.documents || s.setup.counts.questions !== r.counts.questions)) differ.push(`${r.label}: counts ${s.setup.counts.documents}/${s.setup.counts.questions} vs row ${r.counts.documents}/${r.counts.questions}`);
  if (JSON.stringify(s.setup.bar) !== JSON.stringify(r.setup.bar)) differ.push(`${r.label}: bar differs between catalogue and summary`);
  if (r.live !== (s.setup.chip.status === "LIVE")) differ.push(`${r.label}: Live ${r.live} vs chip ${s.setup.chip.status}`);
}
step(`C1.4: parity on every started sample combination (${started.length}; ${compared} with a setup step today): the same next setup action, the same counts, one bar on both answers, Live the same`, started.length > 0 && !differ.length, differ.length ? differ : "same");
const plain = await api(`/combinations/${started[0]?.combinationId}/summary`, null);
step("C11.10 (fail case): the summary without a person is refused (401), so every checklist answer carries a viewer", plain.status === 401, plain.status);
const smeSummary = (await api(`/combinations/${started[0]?.combinationId}/summary`, "user-C")).body;
step("C11.10: the expert's summary carries the same checklist with the expert's overlay (Open)", smeSummary.setup?.viewer?.button === "Open" && JSON.stringify(smeSummary.setup.steps) === JSON.stringify((await api(`/combinations/${started[0]?.combinationId}/summary`)).body.setup.steps));

// 150 combinations: cold (after a write) under 1.5 s, warm under 200 ms (concept §8).
// PR #108 minor (c): "Review n proposals" opens that combination's group for that step on the proposals page. The sample
// has no waiting proposal, so one person-role proposal (rules, no AI) is written for a started combination.
const reviewCombo = started[0]!.combinationId!;
sql(`insert into proposal_item (id, workspace_id, kind, step, combination_id, lands_on, reuse, payload, rounds, agreement, confidence, origin, identity, identity_key) select gen_random_uuid(), workspace_id, 'person_role', 'person_roles', id, 'combination', '{"match":"new","existingKey":null}', '{"kind":"person_role","label":"Test accompanying person"}', '{"draft":null,"check":null}', 'rules_only', 'check', 'rules', '{"key":"test_role","near":[],"nearReason":null}', 'test_role' from combination where id='${reviewCombo}'`);
const reviewLink = ((await api(`/combinations/${reviewCombo}/summary`, "user-A")).body.setup?.steps?.[1]?.open ?? []).some((i: { kind: string }) => i.kind === "review_proposals") ? `/review/proposals?c=${reviewCombo}&step=2` : null;
const opened = reviewLink ? (await api(`/review/proposals?${reviewLink.split("?")[1]}`, "user-A")).body : null;
step("C11.10: a setup checklist's Review link opens a group holding that combination's proposals", !!opened?.group && opened.group.total > 0 && opened.group.id === `combination:${reviewCombo}`, { reviewLink, group: opened?.group?.id });
const [nobody, badStep] = await Promise.all([api("/review/proposals?c=00000000-0000-4000-8000-000000000000&step=2", "user-A"), api(`/review/proposals?c=${reviewCombo}&step=9`, "user-A")]);
step("C11.10 (fail case): a combination with nothing waiting opens no group (200), and a step outside 1–5 is refused (400)", nobody.status === 200 && nobody.body.group === null && badStep.status === 400, [nobody.status, nobody.body?.group, badStep.status]);
const sections = (await api("/catalogue?pathway=INDIVIDUAL&filter=all")).body.sections as { pathwayKey: string }[];
const all = () => leaves("user-A");
let have = (await all()).filter((r) => !r.retired).length;
const prog = await api("/program-nodes", "user-A", "POST", { kind: "PROGRAM", parentKey: sections[0].pathwayKey, label: "Scale check program (synthetic)" });
let made = 0;
for (let i = 0; have + made < 150 && i < 200; i++) {
  const cat = await api("/program-nodes", "user-A", "POST", { kind: "STREAM", parentKey: prog.body.key ?? prog.body.programNodeKey, label: `Synthetic category ${i + 1}` });
  const key = cat.body?.key ?? cat.body?.programNodeKey;
  if (key && (await api("/combinations", "user-A", "POST", { nodeKey: key })).status < 300) made++;
}
// A write first, so the next read works every combination out again (cold).
await api("/program-nodes", "user-A", "POST", { kind: "PROGRAM", parentKey: sections[0].pathwayKey, label: "Scale timing write (synthetic)" });
const t0 = performance.now(); await api("/catalogue?pathway=INDIVIDUAL&filter=all"); const cold = performance.now() - t0;
const t1 = performance.now(); await api("/catalogue?pathway=INDIVIDUAL&filter=all"); const warm = performance.now() - t1;
const cards = (await all()).filter((r) => !r.retired).length;
step(`C11.10: ${cards} combinations (≥ 150) — catalogue with setup cold ${Math.round(cold)} ms < 1500, warm ${Math.round(warm)} ms < 200`, cards >= 150 && cold < 1500 && warm < 200, { made, cold: Math.round(cold), warm: Math.round(warm) });
console.log(`${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
