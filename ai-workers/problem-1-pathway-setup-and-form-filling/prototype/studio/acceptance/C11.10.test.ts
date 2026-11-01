// C11.10 acceptance (P-220 pack 2; P-115, P-157, P-161, P-180): Immigration programs shows each combination's card with
// "n of 5 steps" or "✓ Live", Needs you and one button (Start setup · Resume setup · Open; Open for anyone without the
// author duty); one derived setup checklist drives the bar, the button, "Next: …" and the combination's header (one page,
// one next step); the Cards / List choice is remembered per person.
// Open today: Cards / List is kept in the browser only, so this fails. QA-129 (should a Live combination show steps 1–2 as
// open?) is the founder's open question and is deliberately not tested. Product rules, not IRCC rules. Rules only (US$0).
// ROUTE (proposed; Question for the tech lead): PATCH /session/preferences {programsView: "cards" | "list"}; GET /session
// returns `preferences`.
//   zsh studio/tools/isolated.sh accept 4440 start && tsx studio/acceptance/C11.10.test.ts 4440 xr_studio_accept
import { AUTHOR, APPROVER, pack2, run } from "./lib/pack2.ts";

const T = pack2("C11.10");
const { call, ok, words } = T;

run(async () => {
  await T.ready();
  const cards = async (actor: string) => ((await call("GET", "/catalogue", undefined, actor)).body?.rows ?? []).filter((r: any) => r.kind === "combination" && r.combinationId);
  const A = await cards(AUTHOR), B = await cards(APPROVER);
  ok("setup: the catalogue lists the sample's combinations", A.length >= 5, A.length);
  ok("C11.10 pass: every card's bar is out of 5 steps, or says ✓ Live", A.every((c: any) => c.setup?.bar?.of === 5 && (c.setup.bar.text === "✓ Live" || /^\d of 5 steps$/.test(c.setup.bar.text))));
  ok("C11.10 pass: the author sees one button per card: Start setup, Resume setup or Open", A.every((c: any) => ["Start setup", "Resume setup", "Open"].includes(c.setup?.viewer?.button)));
  ok("C11.10 pass: the approver (no author duty) sees Open on every card", B.every((c: any) => c.setup?.viewer?.button === "Open"), [...new Set(B.map((c: any) => c.setup?.viewer?.button))]);
  // QA-129 (a Live combination shows steps 1–2 as open) is an open question for the founder (qa/BUGS.md): not tested here.
  // QA-119: one checklist drives the card and the combination's header (web/src/pages/combination.tsx reads summary.setup.next).
  const mismatch: string[] = [];
  for (const c of A.filter((x: any) => x.status !== "READY")) {
    const s = (await call("GET", `/combinations/${c.combinationId}/summary`, undefined, AUTHOR)).body;
    if (JSON.stringify(s?.setup?.next?.item ?? null) !== JSON.stringify(c.setup?.next?.item ?? null)) mismatch.push(`${c.label}: header ${s?.setup?.next?.item?.text} vs card ${c.setup?.next?.item?.text}`);
  }
  ok("C11.10 pass (QA-119): the header's next step and the card's next are the same checklist item on every combination in setup", mismatch.length === 0, mismatch.slice(0, 3));
  // Cards / List per person, on the server.
  let r = await call("PATCH", "/session/preferences", { programsView: "list" }, AUTHOR);
  ok("C11.10 pass: a person's Cards / List choice is saved for them", r.status < 300, r.status >= 300 ? words(r) : undefined);
  const mine = (await call("GET", "/session", undefined, AUTHOR)).body?.preferences?.programsView;
  const theirs = (await call("GET", "/session", undefined, APPROVER)).body?.preferences?.programsView ?? "cards";
  ok("C11.10 pass: it comes back for that person and not for another", mine === "list" && theirs === "cards", { mine, theirs });
  r = await call("PATCH", "/session/preferences", { programsView: "table" }, AUTHOR);
  ok("C11.10 fail: an unknown view is refused (400, in words)", r.status === 400, words(r));
  T.done();
});
