import { buildBmp, toBase64 } from '../../layout/image/__tests__/build-images.js';
import type { HostIdentity } from '../../runtime/options.js';
import type { PackFormDescriptor } from '../../runtime/pack.js';
import { buildXfaPdf, packet } from './build-xfa-pdf.js';

/**
 * The synthetic, content-neutral XFA form (plan decision D6, W02-T12): a small, fictitious form that exercises every
 * construct the render tree carries, so the frontend can be built against fixtures that name no real form, country or
 * regulator. Every word of it is invented. It embeds no font program (Courier only: the layout's fixed-pitch fallback) and
 * one 2 x 2 pixel BMP. Three pages: a cover page area used once, and a continuation page area for the other two, whose master
 * pages draw `PAGE n OF m` through `xfa:embed` of hidden fields that the form's own `ready:$layout` scripts fill.
 *
 * Page 1 is a `tb` introduction with plain and rich text and a positioned panel; page 2 holds one field of each widget kind
 * and a radio group with a caption; page 3 holds a table, the buttons (Validate, a choice message box), a Validate flag, and
 * a barcode field that is hidden until Validate passes. `SYNTHETIC_PACK` names the nodes of the Validate flow.
 */
const NS = 'http://www.xfa.org/schema/xfa-template/2.8/';
const XFA_DATA_NS = 'http://www.xfa.org/schema/xfa-data/1.0/';
const BODY_OPEN = `<body xmlns="http://www.w3.org/1999/xhtml" xmlns:xfa="${XFA_DATA_NS}">`;

/** A fixed identity that names no product (a form that branches on the host sees nothing real). */
export const SYNTHETIC_HOST: HostIdentity = { name: 'SampleHost', appType: 'SampleApp', version: '1.0', variation: 'Sample', platform: 'SampleOS', language: 'XX' };

/** 2026-06-15T12:00:00Z. */
export const SYNTHETIC_NOW = Date.UTC(2026, 5, 15, 12, 0, 0);

/** The nodes of the form's Validate flow, as the Pack descriptor the engine takes (SOMs from the root subform). */
export const SYNTHETIC_PACK: PackFormDescriptor = {
  validateButton: 'Summary.ValidateBtn',
  validatedFlag: 'Summary.Flag',
  validatedValue: 'Yes',
  firstMissingField: 'firstVar',
  barcodes: 'Summary.Barcodes',
};

const esc = (text: string): string => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const script = (activity: string, body: string, attrs = ''): string => `<event activity="${activity}"${attrs}><script contentType="application/x-javascript">${esc(body)}</script></event>`;

// ---- master pages ------------------------------------------------------------------------------------------------

const counter = (name: string, id: string, expression: string): string =>
  `<field name="${name}" id="${id}" presence="hidden"><ui><numericEdit/></ui>${script('ready', `this.rawValue = ${expression};`, ' ref="$layout"')}</field>`;
const embedOf = (id: string): string => `<span xfa:embedType="uri" xfa:embedMode="raw" xfa:embed="#${id}"></span>`;
const SPACE = '<span style="xfa-spacerun:yes"> </span>';

function pageArea(name: string, suffix: string, occur: string): string {
  const pages = `<draw name="Pages" x="10pt" y="410pt" w="300pt" h="14pt"><value><exData contentType="text/html">${BODY_OPEN}<p>PAGE${SPACE}${embedOf(`cur${suffix}`)} OF${SPACE}${embedOf(`tot${suffix}`)}</p></body></exData></value></draw>`;
  const header = `<draw name="Header" x="10pt" y="10pt" w="300pt" h="20pt"><value><text>SAMPLE FORM - FICTITIOUS</text></value><border><edge thickness="0.5pt"/></border></draw>`;
  return `<pageArea name="${name}" id="p${suffix}"><contentArea x="10pt" y="40pt" w="300pt" h="360pt"/><medium short="320pt" long="440pt"/>${occur}${counter(`Cur${suffix}`, `cur${suffix}`, 'xfa.layout.page(this)')}${counter(`Tot${suffix}`, `tot${suffix}`, 'xfa.layout.pageCount()')}${header}${pages}</pageArea>`;
}

// ---- body ----------------------------------------------------------------------------------------------------------

/** A 2 x 2 pixel 24-bit BMP (rows padded to four bytes): red, green / blue, white. */
const LOGO = toBase64(buildBmp({ width: 2, height: 2, bitsPerPixel: 24, rows: [[255, 0, 0, 255, 255, 255, 0, 0], [0, 0, 255, 0, 255, 0, 0, 0]] }));

const NEW_PAGE = '<breakBefore targetType="pageArea" startNew="1"/>';
const caption = (text: string, placement = 'left', reserve = '90pt'): string => `<caption placement="${placement}" reserve="${reserve}"><value><text>${text}</text></value></caption>`;
const edge = '<border><edge thickness="0.5pt"/></border>';
const field = (name: string, ui: string, extra = '', size = 'w="260pt" h="18pt"'): string => `<field name="${name}" ${size}><ui>${ui}</ui>${extra}</field>`;

const intro = `<subform name="Intro" layout="tb" w="300pt">
<draw name="Title" w="300pt" h="22pt"><font typeface="Courier" size="14pt" weight="bold"/><value><text>Sample Services Form</text></value></draw>
<draw name="Blurb" w="300pt"><value><exData contentType="text/html">${BODY_OPEN}<p>This fictitious form has <span style="font-weight:bold">bold words</span>, some <span style="font-style:italic">italic ones</span> and enough text to wrap over more than one line in its box.</p></body></exData></value></draw>
<subform name="Panel" layout="position" w="300pt" h="110pt">
<draw name="Note" x="5pt" y="5pt" w="140pt" h="30pt"><value><text>A positioned note</text></value>${edge}</draw>
<draw name="Rule" x="5pt" y="45pt" w="200pt" h="20pt"><value><line slope="/"><edge stroke="dashed" thickness="1pt"/></line></value></draw>
<subform name="Block" x="160pt" y="5pt" w="60pt" h="30pt"><border><edge stroke="lowered" thickness="2pt"/><fill><color value="200,220,240"/></fill></border></subform>
<draw name="Logo" x="230pt" y="5pt" w="40pt" h="40pt"><value><image aspect="fit" contentType="image/bmp">${LOGO}</image></value></draw>
</subform>
</subform>`;

const widgets = `<subform name="Details" layout="tb" w="300pt">${NEW_PAGE}
${field('Name', `<textEdit>${edge}</textEdit>`, `${caption('Name')}<value><text maxChars="40"/></value><assist><speak>Full name of the person</speak></assist>`)}
${field('Notes', '<textEdit multiLine="1"/>', `${caption('Notes', 'top', '12pt')}<assist><toolTip>Free notes</toolTip></assist>`, 'w="260pt" h="50pt"')}
${field('Age', `<numericEdit>${edge}</numericEdit>`, `${caption('Age')}<value><integer/></value>`)}
${field('Secret', `<passwordEdit>${edge}</passwordEdit>`, caption('Secret'))}
${field('Shade', `<choiceList>${edge}</choiceList>`, `${caption('Shade')}<items/><items presence="hidden" save="1"/><bindItems ref="xfa.datasets.LOV.Shade[*]" labelRef="$" valueRef="code"/>`)}
${field('When', `<dateTimeEdit>${edge}</dateTimeEdit>`, `${caption('Date')}<value><date/></value><format><picture>date{DD/MM/YYYY}</picture></format>`)}
${field('Agree', '<checkButton shape="square" mark="check"/>', `${caption('Agree')}<items><integer>1</integer><integer>0</integer></items><value><integer/></value>`, 'w="260pt" h="16pt"')}
<exclGroup name="Pick" w="260pt" h="40pt">${caption('Pick one', 'top', '14pt')}
<field name="Yes" x="90pt" y="16pt" w="14pt" h="14pt"><ui><checkButton shape="round" mark="circle"/></ui><items><text>Y</text></items></field>
<field name="No" x="140pt" y="16pt" w="14pt" h="14pt"><ui><checkButton shape="round" mark="circle"/></ui><items><text>N</text></items></field>
</exclGroup>
${field('Plain', '', caption('Default ui'))}
</subform>`;

const VALIDATE = `firstVar.value = "";
if (Details.Name.isNull) { firstVar.value = Details.Name.somExpression; xfa.host.setFocus(Details.Name); xfa.host.messageBox("Name is required", "Check", 0, 0); }
Summary.Flag.rawValue = firstVar.value == "" ? "Yes" : "No";
Summary.Barcodes.presence = firstVar.value == "" ? "visible" : "hidden";
firstVar.value = "";`;

const cell = (name: string, text: string, width = '100pt'): string => `<draw name="${name}" w="${width}" h="16pt"><value><text>${text}</text></value>${edge}</draw>`;
const row = (name: string, cells: string): string => `<subform name="${name}" layout="row">${cells}</subform>`;

const summary = `<subform name="Summary" layout="tb" w="300pt">${NEW_PAGE}
<subform name="Grid" layout="table" columnWidths="100pt 100pt" w="200pt">
${row('Head', cell('c1', 'Item') + cell('c2', 'Count'))}
${row('Line1', cell('c1', 'First item') + field('Count1', `<numericEdit>${edge}</numericEdit>`, '<value><integer/></value>', 'w="100pt" h="16pt"'))}
</subform>
${field('ValidateBtn', '<button highlight="outline"/>', `${caption('Validate', 'left', '0pt')}${script('click', VALIDATE)}`, 'w="80pt" h="20pt"')}
${field('AskBtn', '<button/>', `${caption('Ask', 'left', '0pt')}${script('click', 'xfa.host.messageBox("Continue?", "Confirm", 2, 1);')}`, 'w="80pt" h="20pt"')}
${field('Sign', '<signature/>', '', 'w="120pt" h="30pt"')}
${field('Photo', '<imageEdit/>', '', 'w="60pt" h="40pt"')}
${field('Flag', '<textEdit/>', caption('Flag'), 'w="120pt" h="16pt"')}
<subform name="Barcodes" presence="hidden" layout="tb" w="280pt">
${field('bc1', '<barcode type="pdf417" dataColumnCount="3"/>', '', 'w="270pt" h="60pt"')}
</subform>
</subform>`;

/** The template packet. */
export function syntheticTemplate(): string {
  const pageSet = `<pageSet>${pageArea('Cover', 'A', '<occur min="1" max="1"/>')}${pageArea('Body', 'B', '')}</pageSet>`;
  const variables = '<variables><text name="firstVar"/></variables>';
  const preSave = script('preSave', 'if (Summary.Flag.rawValue == "Yes") { Summary.Barcodes.bc1.rawValue = "SAMPLE|" + Details.Name.rawValue; }');
  return `<?xml version="1.0" encoding="UTF-8"?><template xmlns="${NS}"><subform name="form1" layout="tb">${pageSet}${variables}${preSave}${intro}${widgets}${summary}</subform></template>`;
}

/** The datasets packet: a list of values (the shades) and a few values already entered. */
export function syntheticDatasets(): string {
  const lov = '<LOV><Shade code="r">Red</Shade><Shade code="g">Green</Shade><Shade code="b">Blue</Shade></LOV>';
  const data = '<form1><Details><Shade>g</Shade><When>2026-06-15</When><Agree>1</Agree><Pick>N</Pick><Notes>Two short\nlines of notes</Notes></Details></form1>';
  return `<?xml version="1.0" encoding="UTF-8"?><xfa:datasets xmlns:xfa="${XFA_DATA_NS}">${lov}<xfa:data>${data}</xfa:data></xfa:datasets>`;
}

/** The whole PDF. Built the same way every time (the builder writes no timestamp or random id), so the committed fixture compares byte for byte. */
export function buildSyntheticPdf(): Uint8Array {
  return buildXfaPdf({ packets: [packet('template', syntheticTemplate()), packet('datasets', syntheticDatasets())] });
}
