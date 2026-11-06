// B83 (QA-234, P-322): the steps around "Ask as its own question" on Visitor visa of the six, through the people's routes
// (acceptance/lib/pack2.ts), as C4.11's pack starts. `apply`: Reset to the six, its people and forms, the field maps
// accepted and applied. `finish`: the rest of the people's steps (a form field a person asked on the screen is skipped).
// `all`: both, the Yes/No form fields by the API step. The last two print the question list id (B74's pair reads it). US$0.
//   tsx studio/tests/b83_six_steps.ts <port> <db> <apply|finish|all>
import { AUTHOR, pack2, run } from "../acceptance/lib/pack2.ts";
const mode = process.argv[4] ?? "all"; process.argv[4] = ""; // pack2 reads a 4th argument as a combination key
const T = pack2("B83-steps");
run(async () => {
  const vv = async () => T.combo("vv.single");
  if (mode !== "finish") {
    const r = await T.call("POST", "/demo/reset-to-six", { confirm: "RESET" }, AUTHOR);
    if (r.status >= 300) { console.error("STOP  reset to the six", r.status, T.words(r)); process.exit(2); }
    await T.ready();
    await T.people(await vv());
    for (const f of ["IMM 5257", "IMM 5707"]) await T.call("POST", `/combinations/${await vv()}/forms`, { formKey: f }, AUTHOR);
  }
  if (mode === "apply") { console.log(`SETUP ${JSON.stringify(await T.questionsBySteps(await vv(), { applyOnly: true }))}`); process.exit(0); }
  console.log(`SETUP ${JSON.stringify(await T.questionsBySteps(await vv()))}`);
  const plan = await T.call("POST", `/combinations/${await vv()}/pqr-picks/plan`, { mode: "replay" }, AUTHOR);
  console.log(`QUESTION-LIST ${String(plan.body?.guide?.questions ?? "none").split("/").pop()}`);
  process.exit(0);
});
