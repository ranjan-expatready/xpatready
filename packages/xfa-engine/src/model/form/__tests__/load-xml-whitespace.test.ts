import { describe, expect, it } from 'vitest';
import { build, dataText, textField } from './helpers.js';

/** A list of values as a form's script object holds it: pretty-printed, with tabs and line breaks between the elements. */
const INDENTED = '<?xml version="1.0" encoding="UTF-8"?>\n<LOV generated="x">\n\t<L>\n\t\t<I lic="a">A</I>\n\t\t<I lic=" ">  </I>\n\t</L>\n</LOV>\n';

describe('loadXML drops the formatting whitespace between elements (as the viewer does), never a value', () => {
  it('imports an indented list of values without the whitespace-only text between its elements', () => {
    const { dom, datasets } = build(textField('F'));
    const file = dom.createDataNode('dataGroup', 'LOVFile');
    dom.datasets.nodes.append(file);
    dom.call(file, 'loadXML', [INDENTED, 0, 1]);
    expect(dataText(datasets)).toContain('<LOVFile xfa:dataNode="dataGroup"><LOV generated="x"><L><I lic="a">A</I><I lic=" ">  </I></L></LOV></LOVFile>');
  });

  it('keeps whitespace that is the whole value of an element (a data value of spaces is data)', () => {
    const { dom } = build(textField('F'));
    const file = dom.createDataNode('dataGroup', 'LOVFile');
    dom.datasets.nodes.append(file);
    dom.call(file, 'loadXML', ['<LOV>\n  <V>   </V>\n</LOV>', 0, 1]);
    expect(file.child('LOV')?.child('V')?.value).toBe('   ');
  });
});
