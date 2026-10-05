const LIMITS = { fullName: 80, phone: 30, extension: 20, about: 500 };
const PHONE_RE = /^[0-9+()\-.\s]{5,30}$/;

/** Validates + normalises the editable profile fields. Returns { value } or { error }. */
export function validateProfileInput(body) {
  const input = body && typeof body === 'object' ? body : {};
  const clean = {};

  for (const key of ['fullName', 'phone', 'extension', 'about']) {
    if (input[key] === undefined) continue;
    if (typeof input[key] !== 'string') return { error: `Invalid value for ${key}.` };
    clean[key] = input[key].trim();
    if (clean[key].length > LIMITS[key]) {
      return { error: `${labelFor(key)} must be at most ${LIMITS[key]} characters.` };
    }
  }

  if ('fullName' in clean && !clean.fullName) return { error: 'Full name is required.' };
  if (clean.phone && !PHONE_RE.test(clean.phone)) return { error: 'Enter a valid phone number.' };
  if (Object.keys(clean).length === 0) return { error: 'Nothing to update.' };

  return { value: clean };
}

function labelFor(key) {
  return { fullName: 'Full name', phone: 'Phone', extension: 'Desk extension', about: 'About' }[key];
}

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

/** Detects the real image type from magic bytes (the Content-Type header is not trusted). */
export function sniffImageType(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { contentType: 'image/jpeg', ext: 'jpg' };
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { contentType: 'image/png', ext: 'png' };
  }
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') {
    return { contentType: 'image/webp', ext: 'webp' };
  }
  return null;
}