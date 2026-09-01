import type { Story } from "./types";

export interface ScoredStory {
  story: Story;
  relevanceScore: number;
}

export interface UserInterestWeights {
  [section: string]: number;
}

const DEFAULT_INTEREST_WEIGHT = 0.5;

export function rankStoriesByInterest(
  stories: Story[],
  interestWeights: UserInterestWeights
): ScoredStory[] {
  return stories
    .map((story) => ({
      story,
      relevanceScore: interestWeights[story.section] ?? DEFAULT_INTEREST_WEIGHT,
    }))
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
}

export function getRelatedStories(
  targetStory: Story,
  allStories: Story[],
  maxResults = 3
): Story[] {
  const candidates = allStories.filter(
    (story) => story.storyIdentifier !== targetStory.storyIdentifier
  );

  const scored = candidates.map((story) => {
    let score = 0;
    if (story.section === targetStory.section) score += 2;
    if (story.provenanceTier === targetStory.provenanceTier) score += 0.5;
    if (story.sourceName === targetStory.sourceName) score += 1;

    const sharedWords = countSharedKeywords(
      targetStory.headline + " " + targetStory.excerpt,
      story.headline + " " + story.excerpt
    );
    score += Math.min(sharedWords * 0.3, 2);

    return { story, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map((entry) => entry.story);
}

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
  "has", "have", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "can", "this", "that", "these", "those",
  "it", "its", "as", "not", "no", "so", "if", "than", "into", "over",
  "also", "more", "most", "new", "first", "all", "any",
]);

function countSharedKeywords(textA: string, textB: string): number {
  const wordsA = extractKeywords(textA);
  const wordsB = extractKeywords(textB);
  let shared = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) shared++;
  }
  return shared;
}

function extractKeywords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
  );
}
