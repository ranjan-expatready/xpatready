import { describe, expect, it } from 'vitest';
import { splitCaption, type CaptionReserveHook } from '../caption.js';
import { IssueSink } from '../issues.js';
import { expectRect, field, nodeOf, rect } from './helpers.js';

const content = rect(10, 20, 100, 40);
const caption = (attrs: string, extra = ''): string => `<caption ${attrs}>${extra}</caption>`;
const at = (children: string): ReturnType<typeof nodeOf> => nodeOf(field('w="100pt" h="40pt"', children), 'field', 'f');
const split = (children: string, hook?: CaptionReserveHook, sink = new IssueSink()): ReturnType<typeof splitCaption> => splitCaption(at(children), content, sink, hook);

describe('splitCaption with an explicit reserve', () => {
  it('top: the strip is the top reserve of the content, the widget the rest', () => {
    const s = split(caption('placement="top" reserve="12pt"'));
    expectRect(s?.captionRect, rect(10, 20, 100, 12));
    expectRect(s?.widgetRect, rect(10, 32, 100, 28));
    expect(s?.layout).toMatchObject({ placement: 'top', reservePt: 12, auto: false, clamped: false, presence: 'visible' });
  });

  it('bottom: the strip is the bottom reserve', () => {
    const s = split(caption('placement="bottom" reserve="12pt"'));
    expectRect(s?.captionRect, rect(10, 48, 100, 12));
    expectRect(s?.widgetRect, rect(10, 20, 100, 28));
  });

  it('left (the default placement): the strip is the left reserve across the full height', () => {
    const s = split(caption('reserve="30pt"'));
    expectRect(s?.captionRect, rect(10, 20, 30, 40));
    expectRect(s?.widgetRect, rect(40, 20, 70, 40));
    expect(s?.layout.placement).toBe('left');
  });

  it('right: the strip is the right reserve', () => {
    const s = split(caption('placement="right" reserve="30pt"'));
    expectRect(s?.captionRect, rect(80, 20, 30, 40));
    expectRect(s?.widgetRect, rect(10, 20, 70, 40));
  });

  it('reads the reserve in mm', () => {
    const s = split(caption('placement="top" reserve="25.4mm"'));
    expect(s?.captionRect?.heightPt).toBeCloseTo(40, 6);
    expect(s?.layout.clamped).toBe(true);
  });

  it('a reserve larger than the content is cut to the content, leaving the widget nothing, and says so', () => {
    const sink = new IssueSink();
    const s = split(caption('placement="left" reserve="150pt"'), undefined, sink);
    expectRect(s?.captionRect, rect(10, 20, 100, 40));
    expectRect(s?.widgetRect, rect(110, 20, 0, 40));
    expect(s?.layout).toMatchObject({ reservePt: 100, clamped: true });
    expect(sink.issues.map((i) => i.feature)).toEqual([expect.stringContaining('caption reserve')]);
  });
});

describe('splitCaption presence and absence', () => {
  it('no caption element: no strip, the widget is the whole content (an XFA default caption is NOT created)', () => {
    const s = split('');
    expect(s).toBeUndefined();
  });

  it('a hidden caption takes no space but is recorded', () => {
    const s = split(caption('placement="top" reserve="12pt" presence="hidden"'));
    expect(s?.captionRect).toBeUndefined();
    expectRect(s?.widgetRect, content);
    expect(s?.layout.presence).toBe('hidden');
  });

  it('an invisible caption keeps its space', () => {
    const s = split(caption('placement="top" reserve="12pt" presence="invisible"'));
    expectRect(s?.captionRect, rect(10, 20, 100, 12));
    expect(s?.layout.presence).toBe('invisible');
  });

  it('inline placement is not modelled: the whole content stays the widget and an issue says so', () => {
    const sink = new IssueSink();
    const s = split(caption('placement="inline" reserve="12pt"'), undefined, sink);
    expect(s, 'nothing is carved off the content').toBeUndefined();
    expect(sink.issues[0]?.feature).toContain('inline');
  });

  it('an unknown placement is not read as the default: it is reported and the caption takes no space', () => {
    const sink = new IssueSink();
    const s = split(caption('placement="diagonal" reserve="12pt"'), undefined, sink);
    expect(s, 'nothing is carved off the content').toBeUndefined();
    expect(sink.issues[0]?.feature).toContain('placement');
  });
});

describe('splitCaption automatic reserve (T05 hook)', () => {
  it('an absent, negative or zero reserve (pdf.js: reserve <= 0) asks the hook; the default hook answers auto, so the strip is empty and flagged', () => {
    for (const reserve of ['', 'reserve="-1"', 'reserve="-5pt"', 'reserve="0pt"']) {
      const s = split(caption(`placement="top" ${reserve}`));
      expect(s?.layout).toMatchObject({ auto: true, reservePt: 0 });
      expectRect(s?.captionRect, rect(10, 20, 100, 0));
      expectRect(s?.widgetRect, content);
    }
  });

  it('records one issue per unresolved automatic caption', () => {
    const sink = new IssueSink();
    split(caption('placement="top"'), undefined, sink);
    expect(sink.issues).toHaveLength(1);
    expect(sink.issues[0]?.feature).toContain('automatic');
  });

  it('uses the number the hook supplies, and passes it the field, the placement and the content region', () => {
    const seen: unknown[] = [];
    const hook: CaptionReserveHook = (node, placement, region) => {
      seen.push(node.name, placement, region);
      return 9;
    };
    const sink = new IssueSink();
    const s = split(caption('placement="bottom"'), hook, sink);
    expect(seen).toEqual(['f', 'bottom', content]);
    expect(s?.layout).toMatchObject({ auto: false, reservePt: 9 });
    expectRect(s?.captionRect, rect(10, 51, 100, 9));
    expect(sink.issues).toEqual([]);
  });

  it('an explicit reserve never calls the hook', () => {
    let calls = 0;
    split(caption('placement="top" reserve="5pt"'), () => (calls += 1), new IssueSink());
    expect(calls).toBe(0);
  });
});
