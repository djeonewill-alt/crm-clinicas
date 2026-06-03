export function normalizePhoneDigits(value?: string | null) {
  return (value ?? "").replace(/\D/g, "");
}

export function lastPhoneDigits(value?: string | null, n = 4) {
  return normalizePhoneDigits(value).slice(-n);
}

export function phoneMatchesSearch(phone: string | null | undefined, query: string) {
  const phoneDigits = normalizePhoneDigits(phone);
  const queryDigits = normalizePhoneDigits(query);

  if (!queryDigits) return false;

  return (
    phoneDigits.includes(queryDigits) ||
    phoneDigits.endsWith(queryDigits) ||
    lastPhoneDigits(phoneDigits, Math.min(queryDigits.length, 4)) ===
      lastPhoneDigits(queryDigits, Math.min(queryDigits.length, 4))
  );
}
