// Copied unchanged from ERv2-frontend@5ccd9fa-2026-10-20 src/lib/utils.ts (D276 reuse).
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
