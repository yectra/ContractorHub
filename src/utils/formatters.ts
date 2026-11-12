export function formatJobNumber(uuid?: string | null): string {
  if (!uuid || typeof uuid !== 'string' || uuid.trim() === '') {
    return 'J0000';
  }

  const clean = uuid.trim();

  // If already formatted as a job number (e.g., "J9014"), return normalized uppercase
  if (/^J\d{4}$/i.test(clean)) {
    return clean.toUpperCase();
  }

  // Consistent 32-bit integer string hash (djb2 variant)
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = (hash << 5) - hash + clean.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }

  // Map to positive integer in the range [1000, 9999]
  const positiveHash = Math.abs(hash);
  const code = 1000 + (positiveHash % 9000);

  return `J${code}`;
}

