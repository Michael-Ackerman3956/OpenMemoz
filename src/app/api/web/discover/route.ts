import { NextRequest, NextResponse } from "next/server";

interface HackerNewsItem {
  id: number;
  title: string;
  url?: string;
  score: number;
  by: string;
  time: number;
  type: string;
}

interface FederalRegisterDocument {
  title: string;
  abstract: string;
  html_url: string;
  publication_date: string;
  type: string;
  agencies: Array<{ name: string }>;
}

interface DiscoveredWebStory {
  headline: string;
  excerpt: string;
  sourceUrl: string;
  sourceDomain: string;
  engagementScore: number;
  publishedAt: string;
  category: string;
}

async function fetchHackerNewsTopStories(storyLimit: number): Promise<DiscoveredWebStory[]> {
  const topStoryIdsResponse = await fetch(
    "https://hacker-news.firebaseio.com/v0/topstories.json",
    { signal: AbortSignal.timeout(8000) }
  );
  if (!topStoryIdsResponse.ok) return [];
  const allTopStoryIds = (await topStoryIdsResponse.json()) as number[];
  const selectedStoryIds = allTopStoryIds.slice(0, storyLimit);

  const storyItemResults = await Promise.allSettled(
    selectedStoryIds.map((storyId) =>
      fetch(`https://hacker-news.firebaseio.com/v0/item/${storyId}.json`, {
        signal: AbortSignal.timeout(5000),
      }).then((response) => response.json() as Promise<HackerNewsItem>)
    )
  );

  return storyItemResults
    .filter((result): result is PromiseFulfilledResult<HackerNewsItem> =>
      result.status === "fulfilled" && result.value?.url != null && result.value?.title != null
    )
    .map((result) => {
      const item = result.value;
      let sourceDomain = "news.ycombinator.com";
      try { sourceDomain = new URL(item.url!).hostname.replace(/^www\./, ""); } catch { /* keep default */ }
      return {
        headline: item.title,
        excerpt: `${item.score} points by ${item.by} on Hacker News`,
        sourceUrl: item.url!,
        sourceDomain,
        engagementScore: item.score,
        publishedAt: new Date(item.time * 1000).toISOString(),
        category: "hackernews",
      };
    });
}

async function fetchFederalRegisterRecentDocuments(documentLimit: number): Promise<DiscoveredWebStory[]> {
  const federalRegisterResponse = await fetch(
    `https://www.federalregister.gov/api/v1/documents.json?per_page=${documentLimit}&order=newest&fields[]=title&fields[]=abstract&fields[]=html_url&fields[]=publication_date&fields[]=type&fields[]=agencies`,
    { signal: AbortSignal.timeout(8000) }
  );
  if (!federalRegisterResponse.ok) return [];
  const data = (await federalRegisterResponse.json()) as { results: FederalRegisterDocument[] };

  return (data.results || [])
    .filter((document) => document.title && document.html_url)
    .map((document) => ({
      headline: document.title,
      excerpt: document.abstract || `${document.type} from ${document.agencies?.[0]?.name || "Federal Register"}`,
      sourceUrl: document.html_url,
      sourceDomain: "federalregister.gov",
      engagementScore: 10,
      publishedAt: document.publication_date ? new Date(document.publication_date).toISOString() : new Date().toISOString(),
      category: "government",
    }));
}

export async function GET(request: NextRequest) {
  const limitParam = request.nextUrl.searchParams.get("limit");
  const storiesPerSourceLimit = Math.min(parseInt(limitParam || "10", 10), 30);
  const sourcesParam = request.nextUrl.searchParams.get("sources") || "hackernews,federalregister";
  const enabledSourceNames = sourcesParam.split(",").map((sourceName) => sourceName.trim());

  const discoveredStories: DiscoveredWebStory[] = [];
  const sourceErrors: string[] = [];

  const sourceDiscoveryFunctions: Array<{ sourceName: string; discoverFunction: () => Promise<DiscoveredWebStory[]> }> = [
    { sourceName: "hackernews", discoverFunction: () => fetchHackerNewsTopStories(storiesPerSourceLimit) },
    { sourceName: "federalregister", discoverFunction: () => fetchFederalRegisterRecentDocuments(storiesPerSourceLimit) },
  ];

  const activeSources = sourceDiscoveryFunctions.filter(
    ({ sourceName }) => enabledSourceNames.includes(sourceName)
  );

  const discoveryResults = await Promise.allSettled(
    activeSources.map(({ discoverFunction }) => discoverFunction())
  );

  discoveryResults.forEach((result, resultIndex) => {
    if (result.status === "fulfilled") {
      discoveredStories.push(...result.value);
    } else {
      sourceErrors.push(`${activeSources[resultIndex].sourceName}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`);
    }
  });

  return NextResponse.json({
    storyCount: discoveredStories.length,
    sources: activeSources.map(({ sourceName }) => sourceName),
    stories: discoveredStories,
    ...(sourceErrors.length > 0 ? { errors: sourceErrors } : {}),
  });
}
