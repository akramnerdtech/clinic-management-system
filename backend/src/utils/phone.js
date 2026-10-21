const E164 = /^\+[1-9]\d{7,14}$/;

/**
 * Turns whatever was typed into the Add Doctor form into E.164 (+<country><number>),
 * or returns null if it cannot be a valid mobile number.
 *
 *   "+1 (555) 349-8821"  -> +15553498821
 *   "98765 43210"        -> +919876543210   (10 digits get the default country code)
 *   "098765 43210"       -> +919876543210   (national trunk "0" is dropped)
 *   "91 98765 43210"     -> +919876543210   (11-15 digits without "+" are taken as-is)
 *   "0044 7700 900123"   -> +447700900123   ("00" international prefix)
 */
export function normalizeMobile(raw, defaultCountryCode = '91') {
  const input = String(raw ?? '').trim();
  if (!input) return null;

  const hasPlus = input.startsWith('+');
  const hasIntlPrefix = !hasPlus && input.replace(/[^\d+]/g, '').startsWith('00');
  let digits = input.replace(/\D/g, '');
  if (hasIntlPrefix) digits = digits.slice(2);

  const cc = String(defaultCountryCode || '91').replace(/\D/g, '') || '91';
  let candidate;
  if (hasPlus || hasIntlPrefix) candidate = `+${digits}`;
  else if (digits.length === 10) candidate = `+${cc}${digits}`;
  else if (digits.length === 11 && digits.startsWith('0')) candidate = `+${cc}${digits.slice(1)}`;
  else if (digits.length >= 11 && digits.length <= 15) candidate = `+${digits}`;
  else return null;

  return E164.test(candidate) ? candidate : null;
}
