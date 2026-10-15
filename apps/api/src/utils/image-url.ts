import { BadRequestException } from '@nestjs/common';

/** Normalize pasted/uploaded image URL: trim, empty → null, http(s) or /uploads/… */
export function normalizeImageUrl(value?: string | null): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('/uploads/')) return trimmed;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new BadRequestException('Image URL must start with http:// or https://');
    }
    return trimmed;
  } catch (err) {
    if (err instanceof BadRequestException) throw err;
    throw new BadRequestException('Invalid image URL');
  }
}
