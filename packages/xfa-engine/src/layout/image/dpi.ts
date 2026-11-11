import { DEFAULT_IMAGE_DPI, MAX_IMAGE_DPI, MIN_IMAGE_DPI } from './limits.js';

const INCH_PER_METRE = 0.0254;
const CM_PER_INCH = 2.54;

/** A resolution in range, else the default: no file can make a natural size zero, infinite or absurd. */
export const saneDpi = (dpi: number): number => (Number.isFinite(dpi) && dpi >= MIN_IMAGE_DPI && dpi <= MAX_IMAGE_DPI ? dpi : DEFAULT_IMAGE_DPI);

/** Pixels per metre (a BMP header) to pixels per inch. */
export const dpiFromPerMetre = (perMetre: number): number => saneDpi(perMetre * INCH_PER_METRE);

/** Pixels per centimetre (a TIFF resolution in centimetres, a JFIF density in dots per cm) to pixels per inch. */
export const dpiFromPerCm = (perCm: number): number => saneDpi(perCm * CM_PER_INCH);
