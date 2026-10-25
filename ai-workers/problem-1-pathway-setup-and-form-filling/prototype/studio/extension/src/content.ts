// The extension's content script (F2d): on portal pages only (the manifest's hosts), in the isolated world. It answers
// the side panel, and only the side panel of this extension: "read" gives the open screen's structure (never an
// answer, reader.ts); "fill" writes the plan the server returned for this screen (filler.ts) and marks on the page any
// input the screen did not accept. It never calls the API (the panel does: M7), keeps nothing and runs nothing else.
import { fillScreen, type PlanInput } from "./filler.ts";
import { readScreen } from "./reader.ts";

type Msg = { kind: "ping" } | { kind: "read" } | { kind: "fill"; inputs: PlanInput[] };
const MARK = "xr-not-accepted";

chrome.runtime.onMessage.addListener((msg: Msg, sender, reply) => {
  if (sender.id !== chrome.runtime.id || sender.tab) return false; // only this extension's own pages
  if (msg.kind === "ping") reply({ ok: true });
  else if (msg.kind === "read") reply(readScreen(document));
  else if (msg.kind === "fill") {
    for (const el of Array.from(document.querySelectorAll(`[data-${MARK}]`))) { (el as HTMLElement).style.outline = ""; el.removeAttribute(`data-${MARK}`); }
    const out = fillScreen(document, msg.inputs);
    // "Not accepted by the screen" is shown on the page too, beside the panel's list (BR-11).
    for (const o of out.filter((x) => x.outcome === "not_accepted")) {
      const el = document.getElementById(o.id) ?? document.querySelector(`[name="${CSS.escape(o.id)}"]`);
      if (el instanceof HTMLElement) { el.style.outline = "3px solid #c0392b"; el.setAttribute(`data-${MARK}`, "1"); }
    }
    reply(out);
  } else return false;
  return false;
});
