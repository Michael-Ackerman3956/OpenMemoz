/**
 * Reading behavior tracker — app-layer persistence, NOT WebMCP.
 *
 * Tracks which stories the user clicks and how long they spend reading.
 * Data is stored in localStorage and exposed to AI agents via WebMCP
 * tools (get_reading_history), creating a feedback loop:
 *
 *   user reads → tracker stores behavior → agent reads behavior via WebMCP
 *   → agent curates better content → user reads better stories → repeat
 */

const READING_HISTORY_STORAGE_KEY = "newsroom_reading_history";
const MAXIMUM_HISTORY_ENTRIES = 100;

export interface ReadingHistoryEntry {
  storyIdentifier: string;
  headline: string;
  section: string;
  readAtTimestamp: number;
  readDurationSeconds: number;
}

export interface ReadingBehaviorSummary {
  recentReads: ReadingHistoryEntry[];
  sectionPreferences: Record<string, number>;
  totalReadsCount: number;
  mostReadSection: string | null;
}

/**
 * Records that the user opened a story. Call this on story click.
 * Returns a stop function — call it when the user navigates away
 * to record how long they spent reading.
 */
export function trackStoryOpened(
  storyIdentifier: string,
  headline: string,
  section: string
): () => void {
  const openedAtTimestamp = Date.now();

  // Return a function that finalizes the reading duration
  return () => {
    const durationSeconds = Math.round(
      (Date.now() - openedAtTimestamp) / 1000
    );

    const history = loadReadingHistory();
    history.unshift({
      storyIdentifier,
      headline,
      section,
      readAtTimestamp: openedAtTimestamp,
      readDurationSeconds: durationSeconds,
    });

    // Keep only the most recent entries
    const trimmedHistory = history.slice(0, MAXIMUM_HISTORY_ENTRIES);

    try {
      localStorage.setItem(
        READING_HISTORY_STORAGE_KEY,
        JSON.stringify(trimmedHistory)
      );
    } catch {
      // localStorage full or unavailable
    }
  };
}

/**
 * Loads raw reading history from localStorage.
 * Used by the WebMCP get_reading_history tool.
 */
export function loadReadingHistory(): ReadingHistoryEntry[] {
  try {
    const stored = localStorage.getItem(READING_HISTORY_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as ReadingHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

/**
 * Builds a summary of reading behavior for agent consumption.
 * Aggregates section preferences and identifies the most-read section.
 */
export function buildReadingBehaviorSummary(): ReadingBehaviorSummary {
  const history = loadReadingHistory();

  // Count reads per section
  const sectionPreferences: Record<string, number> = {};
  for (const entry of history) {
    sectionPreferences[entry.section] =
      (sectionPreferences[entry.section] || 0) + 1;
  }

  // Find most-read section
  let mostReadSection: string | null = null;
  let highestCount = 0;
  for (const [section, count] of Object.entries(sectionPreferences)) {
    if (count > highestCount) {
      highestCount = count;
      mostReadSection = section;
    }
  }

  return {
    recentReads: history.slice(0, 20),
    sectionPreferences,
    totalReadsCount: history.length,
    mostReadSection,
  };
}
