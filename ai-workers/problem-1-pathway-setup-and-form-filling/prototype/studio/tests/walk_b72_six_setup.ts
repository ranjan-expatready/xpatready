// B72 walk setup: Demo › Reset to the six, then Visitor visa's people's steps and the Sample rule (acceptance/lib/pack2.ts
// needQuestions, ruleBySteps), as C3.6's pack does. US$0.
//   tsx studio/tests/walk_b72_six_setup.ts <port> <db>
import { pack2, run } from "../acceptance/lib/pack2.ts";
const T = pack2("B72-walk");
run(async () => {
  await T.call("POST", "/demo/reset-to-six", { confirm: "RESET" }, "user-A");
  await T.ready();
  const vv = T.combo("vv.single");
  await T.needQuestions(vv);
  console.log(`rules added: ${await T.ruleBySteps(vv)}`);
  process.exit(0);
});
