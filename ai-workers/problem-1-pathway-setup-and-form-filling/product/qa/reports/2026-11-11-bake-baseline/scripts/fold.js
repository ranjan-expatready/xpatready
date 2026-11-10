const r = await page.evaluate(() => [...document.querySelectorAll("summary")].map((s) => {
  const cs = getComputedStyle(s), mk = getComputedStyle(s, "::marker");
  const icon = !!s.querySelector("svg");
  const vis = s.getBoundingClientRect().width > 0;
  const marker = cs.display === "list-item" && cs.listStyleType !== "none" && mk.content !== "none" && mk.content !== '""';
  return { text: s.innerText.replace(/\s+/g, " ").slice(0, 60), display: cs.display, listStyle: cs.listStyleType, markerContent: mk.content, icon, vis, arrow: marker || icon };
}));
console.log("FOLD:" + JSON.stringify(r));
