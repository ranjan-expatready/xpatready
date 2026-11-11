/**
 * Ceilings of the rich text layer. Each carries its FD-38 argument. All are security invariants (a hostile exData block
 * must not make the layout, or a render tree handed to a browser, grow without bound) or correctness constants.
 */

/**
 * FD-38 exemption (security invariant): longest exData markup, in characters, the layer will parse. The longest block in
 * the two real forms is 3,907 characters (2.5k of text); this leaves a thousand times that, and no firm or operator has a
 * reason to vary it. Text past `MAX_TEXT_CHARS` and lines past `MAX_LINES_PER_TEXT` are cut and reported as in plain text.
 */
export const MAX_RICH_MARKUP_CHARS = 4 * 1024 * 1024;

/** FD-38 exemption (security invariant): most declarations read from one `style` attribute; real ones hold at most 6. */
export const MAX_STYLE_DECLARATIONS = 64;

/** FD-38 exemption (security invariant): most tab characters one `xfa-tab-count` may ask for; real values are 1. */
export const MAX_TAB_COUNT = 256;

/** FD-38 exemption (security invariant): longest `style` attribute, in characters, the layer will read; the longest real one is 130. */
export const MAX_STYLE_CHARS = 4096;

/**
 * FD-38 exemption (correctness constant): the tab interval, in points, used when the paragraph writes no `tabDefault`.
 * It is a fact of the format Acrobat lays out, not a setting: the one renderCache record that exercises a tab (a hanging
 * indent of 54 pt on both government forms) shows a tab 36 pt wide (half an inch).
 */
export const DEFAULT_TAB_INTERVAL_PT = 36;

/**
 * FD-38 exemption (correctness constant): the colour Acrobat draws the text of an `a` element in, `[0, 0, 255]`. Read from
 * the renderCache `textRun` records of the link text of IMM5257 (three links, each a run of its own in 0 0 255); the specification page is not cited.
 */
export const LINK_COLOUR: readonly [number, number, number] = [0, 0, 255];

/**
 * FD-38 exemption (security invariant): most distinct features one rich block may report before the rest are summarised in
 * one entry; the reader remembers each reported feature to report it once, and a hostile block must not grow that memory
 * without bound. Real blocks report at most a handful.
 */
export const MAX_RICH_ISSUES = 100;
