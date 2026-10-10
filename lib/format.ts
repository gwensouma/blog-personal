const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  // Post dates are calendar dates (YYYY-MM-DD); format in UTC so the day never shifts.
  timeZone: "UTC",
});

/** Formats an ISO date string (e.g. "2026-08-10") as "August 10, 2026". */
export function formatDate(isoDate: string): string {
  return dateFormatter.format(new Date(isoDate));
}

/** Formats a reading time in minutes as "5 min read". */
export function formatReadingTime(minutes: number): string {
  return `${minutes} min read`;
}

/** Returns the year of an ISO date string, e.g. "2026". */
export function yearOf(isoDate: string): string {
  return isoDate.slice(0, 4);
}
