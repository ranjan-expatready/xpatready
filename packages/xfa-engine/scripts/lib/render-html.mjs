// Pure HTML writer for the static render dump (W02-T13): a validated render tree in, strings out. No file, network or clock
// access, so a unit test can run it. The caller passes `dashArrayOf` (the engine's public stroke rule) so this module has
// no dependency on the built package.
//
// Units: the page is `widthPt` x `heightPt` CSS points (1 CSS pt = 4/3 CSS px), so a browser at 100 % zoom shows the page at the
// size Acrobat shows it at 100 % on a 96 dpi screen; every tree length is written as a number of points.
// Layers: consecutive drawing items (box, text, line, image, placeholder) share one inline SVG in the page's point coordinates;
// a field item is an absolutely positioned HTML outline between them, so the paint order is the array order of the tree.
// Safety: all text and attribute content is escaped; the page carries a Content-Security-Policy that allows only inline style
// and data: images/fonts, and holds no script and no external reference.
import { deflateSync, crc32 } from 'node:zlib';

const CSP = "default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:";
const FONT_MIME = { opentype: 'font/otf', truetype: 'font/ttf' };
const FONT_FORMAT = { opentype: 'opentype', truetype: 'truetype' };

/** Escapes text and attribute values; control characters HTML cannot carry are replaced. */
export function esc(value) {
  return String(value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '�')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const num = (n) => (Number.isFinite(n) ? String(Math.round(n * 1000) / 1000) : '0');
const rgb = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;
const cssWord = (s) => String(s).replace(/[^\p{L}\p{N} _.-]/gu, '');

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const out = Buffer.alloc(body.length + 8);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), body.length + 4);
  return out;
}

/** A decoded RGBA picture (row-major from the top, 4 bytes per pixel) as PNG bytes. */
export function pngOfRgba(widthPx, heightPx, rgba) {
  const stride = widthPx * 4;
  const raw = Buffer.alloc((stride + 1) * heightPx);
  for (let y = 0; y < heightPx; y += 1) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(widthPx, 0);
  header.writeUInt32BE(heightPx, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

/** An image resource as a data URL a browser shows (rgba -> PNG, jpeg as it is). */
export function imageDataUrl(image) {
  return image.format === 'jpeg'
    ? `data:image/jpeg;base64,${Buffer.from(image.bytes).toString('base64')}`
    : `data:image/png;base64,${pngOfRgba(image.widthPx, image.heightPx, image.bytes).toString('base64')}`;
}

/** The CSS font stack of a font resource: its @font-face family, or (no bytes) its generic family then the fixed-pitch default. */
function fontTable(tree) {
  const table = new Map();
  tree.resources.fonts.forEach((font, i) => {
    const embedded = font.bytes.length > 0;
    table.set(font.id, {
      font,
      embedded,
      css: embedded ? `xfa-font-${i}` : null,
      stack: embedded ? `xfa-font-${i}` : `${cssWord(font.family)}, monospace`,
    });
  });
  return table;
}

function fontFaces(usedIds, table) {
  const faces = [];
  for (const id of usedIds) {
    const entry = table.get(id);
    if (entry === undefined || !entry.embedded) continue;
    const { font } = entry;
    const url = `data:${FONT_MIME[font.format]};base64,${Buffer.from(font.bytes).toString('base64')}`;
    faces.push(`@font-face{font-family:${entry.css};src:url(${url}) format("${FONT_FORMAT[font.format]}");font-weight:${font.weight === 'bold' ? 700 : 400};font-style:${font.posture};}`);
  }
  return faces.join('\n');
}

function boxPath(rect, corners) {
  const radius = { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 };
  const inverted = { topLeft: false, topRight: false, bottomRight: false, bottomLeft: false };
  for (const c of corners ?? []) {
    radius[c.corner] = c.join === 'round' ? c.radiusPt : 0;
    inverted[c.corner] = c.inverted;
  }
  const { xPt: x, yPt: y, widthPt: w, heightPt: h } = rect;
  const sweep = (corner) => (inverted[corner] ? 0 : 1);
  const r = radius;
  return [
    `M${num(x + r.topLeft)} ${num(y)}`,
    `H${num(x + w - r.topRight)}`,
    r.topRight > 0 ? `A${num(r.topRight)} ${num(r.topRight)} 0 0 ${sweep('topRight')} ${num(x + w)} ${num(y + r.topRight)}` : '',
    `V${num(y + h - r.bottomRight)}`,
    r.bottomRight > 0 ? `A${num(r.bottomRight)} ${num(r.bottomRight)} 0 0 ${sweep('bottomRight')} ${num(x + w - r.bottomRight)} ${num(y + h)}` : '',
    `H${num(x + r.bottomLeft)}`,
    r.bottomLeft > 0 ? `A${num(r.bottomLeft)} ${num(r.bottomLeft)} 0 0 ${sweep('bottomLeft')} ${num(x)} ${num(y + h - r.bottomLeft)}` : '',
    `V${num(y + r.topLeft)}`,
    r.topLeft > 0 ? `A${num(r.topLeft)} ${num(r.topLeft)} 0 0 ${sweep('topLeft')} ${num(x + r.topLeft)} ${num(y)}` : '',
    'Z',
  ]
    .filter((part) => part !== '')
    .join('');
}

const strokeAttrs = (colour, thicknessPt, dash) =>
  `stroke="${rgb(colour)}" stroke-width="${num(thicknessPt)}"${dash.length > 0 ? ` stroke-dasharray="${dash.map(num).join(' ')}"` : ''}`;

function boxSvg(item, dashArrayOf) {
  const { rect } = item;
  const path = boxPath(rect, item.corners);
  const fill = item.fill === undefined ? 'none' : rgb(item.fill);
  const parts = [`<path class="b" d="${path}" fill="${fill}"/>`];
  const edges = item.edges ?? [];
  const same = edges.length === 4 && edges.every((e) => e.thicknessPt === edges[0].thicknessPt && e.stroke === edges[0].stroke && e.colour.join() === edges[0].colour.join());
  if (same) {
    parts.push(`<path d="${path}" fill="none" ${strokeAttrs(edges[0].colour, edges[0].thicknessPt, dashArrayOf(edges[0].stroke, edges[0].thicknessPt))}/>`);
  } else {
    const radiusOf = (corner) => (item.corners ?? []).find((c) => c.corner === corner);
    const reach = (corner) => (radiusOf(corner)?.join === 'round' ? radiusOf(corner).radiusPt : 0);
    const { xPt: x, yPt: y, widthPt: w, heightPt: h } = rect;
    const sides = {
      top: [x + reach('topLeft'), y, x + w - reach('topRight'), y],
      right: [x + w, y + reach('topRight'), x + w, y + h - reach('bottomRight')],
      bottom: [x + reach('bottomLeft'), y + h, x + w - reach('bottomRight'), y + h],
      left: [x, y + reach('topLeft'), x, y + h - reach('bottomLeft')],
    };
    for (const edge of edges) {
      const [x1, y1, x2, y2] = sides[edge.side];
      parts.push(`<line x1="${num(x1)}" y1="${num(y1)}" x2="${num(x2)}" y2="${num(y2)}" ${strokeAttrs(edge.colour, edge.thicknessPt, dashArrayOf(edge.stroke, edge.thicknessPt))}/>`);
    }
  }
  return `<g class="bx">${parts.join('')}</g>`;
}

/** The text item with its clip path defined and named in `--c`; the page's `#clip` toggle (default off) decides whether the clip applies. */
function textSvg(item, fonts, clipId) {
  const lines = item.lines.map((line) => {
    const runs = line.runs
      .map((run) => {
        const entry = fonts.get(run.fontId);
        const font = entry.font;
        const spacing = run.letterSpacingPt === undefined || run.letterSpacingPt === 0 ? '' : ` letter-spacing="${num(run.letterSpacingPt)}"`;
        return `<tspan font-family="${esc(entry.stack)}" font-size="${num(run.sizePt)}" font-weight="${font.weight === 'bold' ? 700 : 400}" font-style="${font.posture}" fill="${rgb(run.colour)}"${spacing}>${esc(run.text)}</tspan>`;
      })
      .join('');
    return `<text xml:space="preserve" x="${num(line.xPt)}" y="${num(line.yBaselinePt)}">${runs}</text>`;
  });
  const r = item.rect;
  return `<clipPath id="${clipId}"><rect x="${num(r.xPt)}" y="${num(r.yPt)}" width="${num(r.widthPt)}" height="${num(r.heightPt)}"/></clipPath><g class="t" style="--c:url(#${clipId})">${lines.join('')}</g>`;
}

function drawingSvg(item, ctx) {
  switch (item.kind) {
    case 'box':
      return boxSvg(item, ctx.dashArrayOf);
    case 'text':
      return textSvg(item, ctx.fonts, `clip-${(ctx.clips.n += 1)}`);
    case 'line':
      return `<line class="ln" x1="${num(item.x1Pt)}" y1="${num(item.y1Pt)}" x2="${num(item.x2Pt)}" y2="${num(item.y2Pt)}" ${strokeAttrs(item.colour, item.thicknessPt, ctx.dashArrayOf(item.stroke, item.thicknessPt))}/>`;
    case 'image': {
      const url = ctx.imageUrl(item.imageId);
      const r = item.rect;
      return `<image class="im" href="${url}" x="${num(r.xPt)}" y="${num(r.yPt)}" width="${num(r.widthPt)}" height="${num(r.heightPt)}" preserveAspectRatio="none"/>`;
    }
    default: {
      const r = item.rect;
      return `<g class="ph"><rect x="${num(r.xPt)}" y="${num(r.yPt)}" width="${num(r.widthPt)}" height="${num(r.heightPt)}" fill="rgb(235,235,235)" stroke="rgb(120,120,120)" stroke-width="0.5" stroke-dasharray="3 2"/><text xml:space="preserve" x="${num(r.xPt + 3)}" y="${num(r.yPt + 9)}" font-family="Courier, monospace" font-size="7" fill="rgb(90,90,90)">${esc(item.reason)}</text></g>`;
    }
  }
}

function fieldHtml(item) {
  const r = item.rect;
  const title = `${item.widget} | ${item.som} | access ${item.access} | ${item.presence}`;
  const checked = item.checked === undefined ? '' : ` data-checked="${item.checked}"`;
  return `<div class="f" data-widget="${esc(item.widget)}" data-som="${esc(item.som)}"${checked} title="${esc(title)}" style="left:${num(r.xPt)}pt;top:${num(r.yPt)}pt;width:${num(r.widthPt)}pt;height:${num(r.heightPt)}pt"><span class="g">${esc(item.widget)}</span></div>`;
}

const pageName = (index) => `page-${String(index + 1).padStart(2, '0')}.html`;

const PAGE_CSS = `html{background:#7a7a7a}body{margin:0;padding:12px 0 40px;font:13px system-ui,sans-serif}
nav{width:max-content;margin:0 auto 10px;padding:4px 10px;background:#fff;border-radius:4px}nav a{margin:0 6px}
.page{position:relative;margin:0 auto 12px;background:#fff;box-shadow:0 0 6px rgba(0,0,0,.6);overflow:hidden}
.page>svg{position:absolute;left:0;top:0;pointer-events:none;overflow:visible}
.page>svg text{white-space:pre}
.f{position:absolute;box-sizing:border-box;outline:.5pt dashed rgba(0,102,255,.55);outline-offset:0}
.f .g{display:none;position:absolute;left:0;bottom:100%;padding:0 2pt;font:7pt system-ui,sans-serif;color:#fff;background:#0066ff;white-space:nowrap}
.f:hover{background:rgba(0,102,255,.12)}.f:hover .g{display:block}
#clip:checked~.page .t{clip-path:var(--c)}
#outlines:not(:checked)~.page .f{outline:none}#outlines:not(:checked)~.page .f:hover{background:none}
label.o{margin-left:10px;color:#555;cursor:pointer}`;

/**
 * One page of the tree as a complete, self-contained HTML document.
 * `tree` is a validated render tree; `ctx.dashArrayOf` the engine's public stroke rule; `ctx.pageCount` the number of pages.
 */
export function renderPageHtml(tree, pageIndex, ctx) {
  const page = tree.pages[pageIndex];
  const fonts = fontTable(tree);
  const images = new Map(tree.resources.images.map((image) => [image.id, image]));
  const dataUrls = new Map();
  const imageUrl = (id) => {
    if (!dataUrls.has(id)) dataUrls.set(id, imageDataUrl(images.get(id)));
    return dataUrls.get(id);
  };
  const drawCtx = { dashArrayOf: ctx.dashArrayOf, fonts, imageUrl, clips: { n: 0 } };
  const used = new Set();
  const layers = [];
  let svg = [];
  const flush = () => {
    if (svg.length === 0) return;
    layers.push(`<svg viewBox="0 0 ${num(page.widthPt)} ${num(page.heightPt)}" style="width:${num(page.widthPt)}pt;height:${num(page.heightPt)}pt">${svg.join('')}</svg>`);
    svg = [];
  };
  for (const item of page.items) {
    if (item.kind === 'field') {
      flush();
      layers.push(fieldHtml(item));
      continue;
    }
    if (item.kind === 'text') for (const line of item.lines) for (const run of line.runs) used.add(run.fontId);
    svg.push(drawingSvg(item, drawCtx));
  }
  flush();
  const count = tree.pages.length;
  const links = [
    pageIndex > 0 ? `<a href="${pageName(pageIndex - 1)}">previous</a>` : '',
    '<a href="index.html">index</a>',
    pageIndex + 1 < count ? `<a href="${pageName(pageIndex + 1)}">next</a>` : '',
  ].join('');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="${esc(CSP)}">
<title>Page ${pageIndex + 1} of ${count}</title>
<style>${PAGE_CSS}
${fontFaces(used, fonts)}</style></head><body>
<input type="checkbox" id="outlines" checked hidden>
<input type="checkbox" id="clip" hidden>
<nav>Page ${pageIndex + 1} of ${count} ${links} <label class="o" for="outlines">[click: hide or show the dashed blue field outlines; hover a field for kind and SOM]</label> <label class="o" for="clip">[click: Clip text to its box (off by default)]</label></nav>
<div class="page" data-page="${pageIndex + 1}" style="width:${num(page.widthPt)}pt;height:${num(page.heightPt)}pt">
${layers.join('\n')}
</div></body></html>
`;
}

/** Text items with a line that starts or sits outside the item's rect. The render tree carries no line width, so a line that starts inside and runs past the right edge is not counted. */
function textOutsideCount(items) {
  const eps = 0.01;
  return items.filter((item) => {
    if (item.kind !== 'text') return false;
    const { xPt, yPt, widthPt, heightPt } = item.rect;
    return item.lines.some((line) => line.xPt < xPt - eps || line.xPt > xPt + widthPt + eps || line.yBaselinePt > yPt + heightPt + eps || line.yBaselinePt < yPt - eps);
  }).length;
}

const countKinds = (items) => items.reduce((acc, item) => ({ ...acc, [item.kind]: (acc[item.kind] ?? 0) + 1 }), {});

function firstTextOf(items) {
  for (const item of items) {
    if (item.kind !== 'text') continue;
    const text = item.lines.map((line) => line.runs.map((run) => run.text).join('')).join(' ').trim();
    if (text !== '') return text.length > 70 ? `${text.slice(0, 70)}...` : text;
  }
  return '';
}

/** The index page: page list with counts, the issues list and the arguments the tool ran with (`args`: label -> text). */
export function renderIndexHtml(tree, args) {
  const rows = tree.pages.map((page, i) => {
    const kinds = countKinds(page.items);
    const firstField = page.items.find((item) => item.kind === 'field');
    return `<tr><td><a href="${pageName(i)}">${pageName(i)}</a></td><td>${num(page.widthPt)} x ${num(page.heightPt)} pt</td><td>${page.items.length}</td><td>${kinds.text ?? 0}</td><td>${kinds.line ?? 0}</td><td>${kinds.box ?? 0}</td><td>${kinds.image ?? 0}</td><td>${kinds.field ?? 0}</td><td>${kinds.placeholder ?? 0}</td><td>${textOutsideCount(page.items)}</td><td>${firstField === undefined ? '(none)' : esc(firstField.som)}</td><td>${esc(firstTextOf(page.items))}</td></tr>`;
  });
  const issues = tree.issues.map((issue) => `<tr><td>${esc(issue.feature)}</td><td>${esc(issue.som === '' ? '(layout)' : issue.som)}</td></tr>`);
  const argRows = Object.entries(args).map(([key, value]) => `<tr><th>${esc(key)}</th><td>${esc(value)}</td></tr>`);
  const total = tree.pages.reduce((sum, page) => sum + page.items.length, 0);
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="${esc(CSP)}">
<title>Render dump</title>
<style>body{font:14px system-ui,sans-serif;margin:20px;color:#222}table{border-collapse:collapse;margin:8px 0 18px}td,th{border:1px solid #bbb;padding:3px 8px;text-align:left;vertical-align:top}th{background:#eee}</style></head><body>
<h1>Render dump</h1>
<p><strong>${tree.pages.length}</strong> page(s), ${total} drawn item(s), render tree version ${tree.version}. Open a page next to the Acrobat copy and compare at 200 %.</p>
<p>Each page has a switch at the top, <strong>Clip text to its box</strong>. It is OFF by default: text is drawn in full, as the engine laid it out. Turn it on to see the text cut at its box. It is not yet confirmed whether Acrobat cuts text there.</p>
<h2>Pages</h2>
<table><tr><th>File</th><th>Size</th><th>Items</th><th>Text</th><th>Lines</th><th>Boxes</th><th>Images</th><th>Fields</th><th>Placeholders</th><th>Text outside its box</th><th>First field</th><th>First text</th></tr>
${rows.join('\n')}</table>
<h2>Layout issues (${tree.issues.length})</h2>
${issues.length === 0 ? '<p>None.</p>' : `<table><tr><th>Feature</th><th>Where</th></tr>\n${issues.join('\n')}</table>`}
<h2>Arguments</h2>
<table>${argRows.join('\n')}</table>
</body></html>
`;
}

/** The whole dump: `[{ file, html }]`, `page-NN.html` for every page and `index.html`. */
export function renderDump(tree, options) {
  const files = tree.pages.map((_, i) => ({ file: pageName(i), html: renderPageHtml(tree, i, options) }));
  files.push({ file: 'index.html', html: renderIndexHtml(tree, options.args) });
  return files;
}

/** Whether a file name is one a dump writes (`page-NN.html`, `index.html`): the only files a re-run may replace. */
export const isDumpFile = (name) => /^page-\d+\.html$/.test(name) || name === 'index.html';

/**
 * Whether `outDir` may receive a dump: it must lie outside the repository, or under `<repoRoot>/.superpowers/xfa-render/`
 * (git-ignored). Both are absolute, symlink-resolved paths; `repoRoot` is null when there is no repository.
 */
export function outDirAllowed(outDir, repoRoot, separator = '/') {
  if (repoRoot === null) return true;
  const within = (parent, child) => child === parent || child.startsWith(parent.endsWith(separator) ? parent : parent + separator);
  if (!within(repoRoot, outDir)) return true;
  const allowed = `${repoRoot}${separator}.superpowers${separator}xfa-render`;
  return outDir !== allowed && within(allowed, outDir);
}
