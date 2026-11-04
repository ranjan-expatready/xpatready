// C4.5 browser check's setup (screens lane): Visitor visa of the six gets its questions and its document lines through
// the people's own steps (acceptance/lib/pack2.ts questionsBySteps, documentsBySteps; P-322), and nothing more: the
// facts the passport supplies are then set through the panel by tests/check_c45_supplies_browser.cjs. Prints the
// combination id. US$0.
//   zsh studio/tools/isolated.sh screens_c45b 4447 start && tsx studio/tests/setup_c45_walk.ts 4447 xr_studio_screens_c45b
import { pack2, run } from "../acceptance/lib/pack2.ts";

const T = pack2("C4.5-walk-setup");
run(async () => {
  await T.ready();
  const vv = T.combo("vv.single");
  await T.people(vv);
  await T.needQuestions(vv);
  const d = await T.documentsBySteps(vv);
  if (d.refused.length || !d.accepted) { console.error("STOP  the document lines did not land", d); process.exit(2); }
  console.log(`COMBINATION ${vv}`);
  process.exit(0);
});
