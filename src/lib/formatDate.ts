export function formatEditionDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatShortDate(isoTimestamp: string): string {
  return new Date(isoTimestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Local-time YYYY-MM-DD, matching the editionDate keys used by index.json and localStorage.
export function getTodayAsEditionDateString(): string {
  const today = new Date();
  const monthTwoDigits = String(today.getMonth() + 1).padStart(2, "0");
  const dayOfMonthTwoDigits = String(today.getDate()).padStart(2, "0");
  return `${today.getFullYear()}-${monthTwoDigits}-${dayOfMonthTwoDigits}`;
}
