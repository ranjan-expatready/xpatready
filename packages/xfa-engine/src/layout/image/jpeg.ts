import { dpiFromPerCm, saneDpi } from './dpi.js';
import { DEFAULT_IMAGE_DPI, MAX_JPEG_MARKERS } from './limits.js';
import { imageView, malformed, overLimit, unsupported } from './errors.js';
import type { ByteView } from '../font/bytes.js';
import type { PixelBudget, PassedThrough } from './types.js';

const SOI = 0xd8;
/** Frame headers of the coding processes browsers decode: baseline, extended sequential and progressive Huffman. */
const SUPPORTED_FRAMES: ReadonlySet<number> = new Set([0xc0, 0xc1, 0xc2]);
/** The other frame headers (lossless, hierarchical, arithmetic coding): recognised only to be refused by name. */
const OTHER_FRAMES: ReadonlySet<number> = new Set([0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
const JFIF = [0x4a, 0x46, 0x49, 0x46, 0x00];

/** The JFIF density, in pixels per inch (units 1) or per centimetre (units 2); the default when the file states none. */
function densityOf(r: ByteView, at: number, length: number): { readonly dpiX: number; readonly dpiY: number } {
  const none = { dpiX: DEFAULT_IMAGE_DPI, dpiY: DEFAULT_IMAGE_DPI };
  if (length < 14 || !JFIF.every((byte, i) => r.u8(at + i) === byte)) return none;
  const units = r.u8(at + 7);
  const x = r.u16(at + 8);
  const y = r.u16(at + 10);
  if (units === 1) return { dpiX: saneDpi(x), dpiY: saneDpi(y) };
  if (units === 2) return { dpiX: dpiFromPerCm(x), dpiY: dpiFromPerCm(y) };
  return none;
}

/**
 * Reads only the frame header of a JPEG and passes the file through unchanged, so the browser decodes it. The pixels are
 * never decoded here, but the size ceilings still apply, because the browser would expand the picture to
 * `width x height x 4` bytes: a header claiming a huge picture is refused before any copy is made. Only 8-bit, one- or
 * three-component, Huffman-coded files are passed (the browser's own set); anything else is `unsupported`. A file that ends
 * before a frame header is `malformed`. A file cut short after its frame header is not detected (that would take a decode);
 * the browser draws what is there.
 */
export function inspectJpeg(bytes: Uint8Array, budget: PixelBudget): PassedThrough {
  const r = imageView(bytes, false);
  if (r.length < 4 || r.u8(0) !== 0xff || r.u8(1) !== SOI) throw malformed('jpeg does not start with a start-of-image marker');
  let density = { dpiX: DEFAULT_IMAGE_DPI, dpiY: DEFAULT_IMAGE_DPI };
  let at = 2;
  for (let markers = 0; markers < MAX_JPEG_MARKERS; markers += 1) {
    while (r.u8(at) === 0xff && r.u8(at + 1) === 0xff) at += 1; // fill bytes before a marker
    if (r.u8(at) !== 0xff) throw malformed(`jpeg has no marker at byte ${at}`);
    const marker = r.u8(at + 1);
    if (marker === 0xd9 || marker === 0xda) throw malformed('jpeg has no frame header before its data');
    if (marker === 0x00 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
      at += 2; // stand-alone markers carry no length
      continue;
    }
    const length = r.u16(at + 2);
    if (length < 2) throw malformed('jpeg segment is shorter than its length field');
    r.need(at + 2, length, 'segment');
    if (marker === 0xe0 && markers === 0) density = densityOf(r, at + 4, length - 2);
    if (SUPPORTED_FRAMES.has(marker)) return frameOf(r, at + 4, length - 2, density, budget);
    if (OTHER_FRAMES.has(marker)) throw unsupported(`jpeg frame type 0x${marker.toString(16)}`);
    at += 2 + length;
  }
  throw overLimit(`jpeg has no frame header in its first ${MAX_JPEG_MARKERS} markers`);
}

function frameOf(r: ByteView, at: number, length: number, density: { readonly dpiX: number; readonly dpiY: number }, budget: PixelBudget): PassedThrough {
  if (length < 6) throw malformed('jpeg frame header is too short');
  const precision = r.u8(at);
  const heightPx = r.u16(at + 1);
  const widthPx = r.u16(at + 3);
  const components = r.u8(at + 5);
  if (precision !== 8) throw unsupported(`jpeg with ${precision} bits per sample`);
  if (widthPx < 1 || heightPx < 1) throw unsupported('jpeg with a zero dimension (a height defined after the scan, or no width)');
  if (components !== 1 && components !== 3) throw unsupported(`jpeg with ${components} components`);
  if (widthPx > budget.maxSidePx || heightPx > budget.maxSidePx) throw overLimit(`jpeg is ${widthPx} x ${heightPx} pixels, over the ${budget.maxSidePx} pixel side ceiling`);
  if (widthPx * heightPx > budget.maxPixels) throw overLimit(`jpeg has ${widthPx * heightPx} pixels, over the ${budget.maxPixels} pixel ceiling`);
  return { format: 'jpeg', widthPx, heightPx, dpiX: density.dpiX, dpiY: density.dpiY, bytes: r.bytes.slice() };
}
