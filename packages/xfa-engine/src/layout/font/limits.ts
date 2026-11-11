/**
 * Ceilings of the font layer. Each one carries its own FD-38 argument, because a file-level claim does not cover the
 * declarations beneath it. All of them bound work on font bytes that come from an uploaded, untrusted PDF; each leaves at
 * least ten times the headroom over the largest value measured on the two real government forms (six embedded programs,
 * the largest 828,746 bytes; 8 entries in the default resources; 6 cmap subtables at most; 20 directory tables at most),
 * and no firm or operator has a reason to vary any of them. The largest single program is `MAX_FONT_BYTES` in `../limits.ts`.
 */

/** FD-38 exemption (security invariant): most tables the sfnt directory may declare; real fonts declare 10 to 25, and the format allows 65,535 records to be claimed in a few bytes. */
export const MAX_SFNT_TABLES = 256;

/** FD-38 exemption (security invariant): most encoding records the `cmap` table may declare; real fonts declare 1 to 6. */
export const MAX_CMAP_SUBTABLES = 64;

/** FD-38 exemption (security invariant): most groups a `cmap` format 12 subtable may declare; glyph ids are 16-bit, so no useful font needs more, and the sortedness check visits each once. */
export const MAX_CMAP_GROUPS = 65_536;

/** FD-38 exemption (security invariant): total bytes of all embedded font programs read from one PDF; real forms embed under 4 MB. */
export const MAX_TOTAL_FONT_BYTES = 64 * 1024 * 1024;

/** FD-38 exemption (security invariant): most entries of the AcroForm default-resources font dictionary that are visited; real forms list 8. */
export const MAX_DR_FONT_ENTRIES = 256;

/** FD-38 exemption (security invariant): most entries of a font's `/Widths` array that are read; a simple font has at most 256 character codes. */
export const MAX_FONT_WIDTHS = 1_024;

/** FD-38 exemption (security invariant): longest font resource name, base font name or family name, in characters; PDF names are limited to 127 bytes and real ones are under 40. */
export const MAX_FONT_NAME_CHARS = 256;

/** FD-38 exemption (security invariant): smallest and largest `head.unitsPerEm` the reader accepts; the format allows 16 to 16,384 and real fonts use 1,000 or 2,048. */
export const MIN_UNITS_PER_EM = 16;

/** FD-38 exemption (security invariant): the largest `head.unitsPerEm` the reader accepts; a hostile value would only inflate every computed size. */
export const MAX_UNITS_PER_EM = 16_384;
