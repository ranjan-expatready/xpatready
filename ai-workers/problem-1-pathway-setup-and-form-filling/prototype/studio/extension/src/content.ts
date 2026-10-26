// The extension's content script (F2d): on portal pages only (the manifest's hosts), in the isolated world. It answers
// the side panel, and only the side panel of this extension: "read" gives the open screen's structure (never an
// answer, reader.ts); "fill" writes the plan the server returned for this screen (filler.ts), outlines what it wrote and
// marks on the page any input the screen did not accept; "undo" clears what that fill wrote and nobody changed (F3 X10).
// It never calls the API (the panel does: M7), keeps only the last fill's inputs in this page's memory, runs nothing else.
import { filledElements, fillScreen, sameScreen, undoFill, type PlanInput, type Written } from "./filler.ts";
import { readScreen, type ReadScreen } from "./reader.ts";

type Msg = { kind: "ping" } | { kind: "read" } | { kind: "fill"; inputs: PlanInput[]; expect: ReadScreen } | { kind: "undo"; expect: ReadScreen };
const MARK = "xr-not-accepted", FILLED = "xr-filled";
/** F3 X10: what the last fill wrote on this page, in this page's memory only (a new page starts with nothing to undo). */
let written: Written[] = [];
// The page's own outline is kept and put back (break m5).
const unmark = () => { for (const el of Array.from(document.querySelectorAll(`[data-${FILLED}]`))) { (el as HTMLElement).style.outline = el.getAttribute(`data-${FILLED}`) === "-" ? "" : el.getAttribute(`data-${FILLED}`)!; el.removeAttribute(`data-${FILLED}`); } };

chrome.runtime.onMessage.addListener((msg: Msg, sender, reply) => {
  if (sender.id !== chrome.runtime.id || sender.tab) return false; // only this extension's own pages
  if (msg.kind === "ping") reply({ ok: true });
  else if (msg.kind === "read") reply(readScreen(document));
  else if (msg.kind === "fill") {
    // Break B2: the plan was made for the screen read before the request; if the person moved on (Next, Back, another
    // screen loaded in place) the page now is another screen, and nothing is filled.
    if (!sameScreen(document, msg.expect)) { reply({ moved: true }); return false; }
    for (const el of Array.from(document.querySelectorAll(`[data-${MARK}]`))) { (el as HTMLElement).style.outline = ""; el.removeAttribute(`data-${MARK}`); }
    const out = fillScreen(document, msg.inputs);
    // F3 X10: each value written is outlined on the page (no ExpatReady text in the page) and remembered for Undo.
    unmark();
    written = out.filter((o) => o.outcome === "filled").map((o) => { const p = msg.inputs.find((x) => x.id === o.id)!; return { id: p.id, type: p.type, value: p.value! }; });
    for (const el of filledElements(document, written)) { el.setAttribute(`data-${FILLED}`, el.style.outline || "-"); el.style.outline = "2px solid #1f6feb"; }
    // "Not accepted by the screen" is shown on the page too, beside the panel's list (BR-11).
    for (const o of out.filter((x) => x.outcome === "not_accepted")) {
      const el = document.getElementById(o.id) ?? document.querySelector(`[name="${CSS.escape(o.id)}"]`);
      if (el instanceof HTMLElement) { el.style.outline = "3px solid #c0392b"; el.setAttribute(`data-${MARK}`, "1"); }
    }
    reply(out);
  } else if (msg.kind === "undo") {
    // Break M1: a screen swapped in place (same ids, no new page) is another screen: nothing is cleared.
    if (!written.length || !sameScreen(document, msg.expect)) { reply({ moved: true }); return false; }
    const r = undoFill(document, written);
    unmark(); written = [];
    reply(r);
  } else return false;
  return false;
});
