// Prints one local HTML file to PDF with Playwright (the Studio's own package; no new tool). Its bundled browser build
// is used when installed, else this computer's Google Chrome (channel "chrome").
// Used for the portal capture review document (P-66). JavaScript and network are off: the page is our own HTML.
//   node studio/tools/print_pdf.mjs <in.html> <out.pdf>
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const [input, output] = process.argv.slice(2);
const browser = await chromium.launch().catch(() => chromium.launch({ channel: "chrome" }));
try {
  const page = await browser.newPage({ javaScriptEnabled: false });
  await page.route("**/*", (r) => r.abort());
  await page.setContent(readFileSync(input, "utf8"), { waitUntil: "load" });
  await page.pdf({ path: output, format: "A4", landscape: true, printBackground: true, margin: { top: "12mm", bottom: "12mm", left: "10mm", right: "10mm" } });
} finally {
  await browser.close();
}
