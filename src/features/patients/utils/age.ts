/**
 * Completed years between a date of birth ("yyyy-MM-dd") and `today`.
 * Returns undefined for an empty, invalid or future date.
 */
export function ageFromDob(dob: string | undefined, today: Date = new Date()): number | undefined {
  if (!dob) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dob);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const birth = new Date(year, month, day);
  if (Number.isNaN(birth.getTime()) || birth > today) return undefined;

  let age = today.getFullYear() - year;
  const hadBirthdayThisYear =
    today.getMonth() > month || (today.getMonth() === month && today.getDate() >= day);
  if (!hadBirthdayThisYear) age -= 1;
  return age;
}

/** Today as "yyyy-MM-dd" in local time, for the date input's max. */
export function todayIso(today: Date = new Date()): string {
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  return `${today.getFullYear()}-${m}-${d}`;
}
