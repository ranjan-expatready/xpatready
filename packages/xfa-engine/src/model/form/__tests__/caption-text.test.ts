import { describe, expect, it } from 'vitest';
import { resolveNode } from '../../som/index.js';
import { at, build, must, textField } from './helpers.js';
import { FormNode } from '../index.js';

/** The expression the forms' own caption helper runs: `field.caption.value.resolveNode("#text")`. */
const captionText = (dom: ReturnType<typeof build>['dom'], field: string): FormNode | null => {
  const value = must(must(at(dom, field).property('caption')).property('value'));
  const found = resolveNode(value, '#text');
  return found === null ? null : (found as FormNode);
};

describe('a caption the template leaves out still has an empty text (implicit value property)', () => {
  it('caption.value.resolveNode("#text") on a caption-less field is a text node holding the empty string, not null (a null crashed the forms\' caption helper on 103 fields)', () => {
    const { dom } = build(textField('F'));
    const text = must(captionText(dom, 'F'), 'the implicit text node');
    expect(text.className).toBe('text');
    expect(text.nodeValue).toBe('');
  });

  it('the lookup stays local: a form text variable with the same class does not answer for a caption-less field', () => {
    const { dom } = build(`<variables><text name="tv">from-the-variable</text></variables>${textField('F')}`);
    expect(must(captionText(dom, 'F')).nodeValue).toBe('');
  });

  it('writing the implicit text lists the caption path and does not touch the template or other fields', () => {
    const { dom } = build(`${textField('F')}${textField('G')}`);
    const text = must(captionText(dom, 'F'));
    text.nodeValue = 'Label';
    expect(must(captionText(dom, 'F')).nodeValue).toBe('Label');
    expect(must(captionText(dom, 'G')).nodeValue).toBe('');
    const caption = must(at(dom, 'F').property('caption'));
    expect(at(dom, 'F').children).toContain(caption);
  });

  it('a caption that writes its own text keeps it, and an explicit empty <value/> is left as written (only the implicit property gains a text)', () => {
    const { dom } = build(`${textField('F', '<caption><value><text>Name</text></value></caption>')}${textField('E', '<caption><value/></caption>')}`);
    expect(must(captionText(dom, 'F')).nodeValue).toBe('Name');
    expect(captionText(dom, 'E')).toBeNull();
  });
});
