import type { Story } from "./types";

export type LayoutMode = "dynamic" | "simple";

// Dynamic: editorial bento grid (hero + 3-col + section bar + briefs)
export interface DynamicLayout {
  mode: "dynamic";
  heroStory: Story | null;
  leftColumnStories: Story[];
  middleColumnStories: Story[];
  rightColumnStories: Story[];
  briefStripStories: Story[];
}

// Simple: vertical feed (hero card + story list)
export interface SimpleLayout {
  mode: "simple";
  heroStory: Story | null;
  feedStories: Story[];
}

export type EditionLayout = DynamicLayout | SimpleLayout;

export function computeLayout(
  stories: Story[],
  layoutMode: LayoutMode
): EditionLayout {
  if (layoutMode === "simple") return computeSimpleLayout(stories);
  return computeDynamicLayout(stories);
}

function computeDynamicLayout(stories: Story[]): DynamicLayout {
  const empty: DynamicLayout = {
    mode: "dynamic",
    heroStory: null,
    leftColumnStories: [],
    middleColumnStories: [],
    rightColumnStories: [],
    briefStripStories: [],
  };

  if (stories.length === 0) return empty;

  const [heroStory, ...rest] = stories;

  if (rest.length <= 2) {
    return { ...empty, heroStory, middleColumnStories: rest };
  }

  const hasBriefStrip = rest.length >= 7;
  const briefCount = hasBriefStrip ? Math.min(4, rest.length - 6) : 0;
  const columnStories = rest.slice(0, rest.length - briefCount);
  const briefStripStories = rest.slice(rest.length - briefCount);

  const leftColumnStories: Story[] = [];
  const middleColumnStories: Story[] = [];
  const rightColumnStories: Story[] = [];

  columnStories.forEach((story, index) => {
    const column = index % 3;
    if (column === 0) leftColumnStories.push(story);
    else if (column === 1) middleColumnStories.push(story);
    else rightColumnStories.push(story);
  });

  return {
    mode: "dynamic",
    heroStory,
    leftColumnStories,
    middleColumnStories,
    rightColumnStories,
    briefStripStories,
  };
}

function computeSimpleLayout(stories: Story[]): SimpleLayout {
  if (stories.length === 0) {
    return { mode: "simple", heroStory: null, feedStories: [] };
  }

  const [heroStory, ...feedStories] = stories;
  return { mode: "simple", heroStory, feedStories };
}
