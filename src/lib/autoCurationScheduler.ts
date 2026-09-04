import { validateSourceUrl } from "@/lib/curatedSources";
import { getTodayAsEditionDateString } from "@/lib/formatDate";
import type { Edition, Story } from "@/lib/types";

export interface AutoCurationConfig {
  isEnabled: boolean;
  intervalHours: number;
  maxStoriesPerRun: number;
  sources: { youtube: boolean; bluesky: boolean; mastodon: boolean; web: boolean };
  preferredSections: string[];
}

export interface AutoCurationLogEntry {
  ranAtTimestamp: number;
  editionDate: string | null;
  storiesAddedCount: number;
  addedStoryIdentifiers: string[];
  sourceErrors: string[];
}

export interface AutoCurationStatus {
  isRunning: boolean;
  nextRunAt: string | null;
  lastRunAt: string | null;
  storiesAddedTotal: number;
}

type SourcePlatform = keyof AutoCurationConfig["sources"];
interface RankedStory { platform: SourcePlatform; engagementScore: number; story: Story }
type DiscoveredStoryFields = Pick<Story, "headline" | "excerpt" | "sourceUrl" | "section"> &
  Partial<Pick<Story, "publishedAt" | "imageUrl" | "youtubeVideoId">>;

export const AUTO_CURATION_RUN_EVENT_NAME = "openmemoz:auto-curation-run";
const CONFIG_STORAGE_KEY = "openmemoz_auto_curation_config";
const LOG_STORAGE_KEY = "openmemoz_auto_curation_log";
const EDITION_STORAGE_KEY_PREFIX = "openmemoz_edition_";
const MAXIMUM_LOG_ENTRIES = 50;
const CANDIDATES_PER_SOURCE = 20;
const FALLBACK_SECTION = "World";

const DEFAULT_AUTO_CURATION_CONFIG: AutoCurationConfig = {
  isEnabled: false, intervalHours: 24, maxStoriesPerRun: 5,
  sources: { youtube: true, bluesky: true, mastodon: true, web: true }, preferredSections: [],
};

const PLATFORM_INFO: Record<SourcePlatform, { displayName: string; identifierPrefix: string; discover: () => Promise<RankedStory[]> }> = {
  youtube: { displayName: "YouTube", identifierPrefix: "yt", discover: discoverYouTubeStories },
  bluesky: { displayName: "Bluesky", identifierPrefix: "bsky", discover: discoverBlueskyStories },
  mastodon: { displayName: "Mastodon", identifierPrefix: "masto", discover: discoverMastodonStories },
  web: { displayName: "Web", identifierPrefix: "web", discover: discoverWebStories },
};
const ALL_PLATFORMS = Object.keys(PLATFORM_INFO) as SourcePlatform[];

const SECTION_KEYWORD_RULES: Array<[section: string, pattern: RegExp]> = [
  ["AI", /\b(ai|llm|openai|anthropic|gpt|machine learning)\b/i],
  ["Cybersecurity", /\b(cyber|hack|breach|malware|ransomware|vulnerabilit)/i],
  ["Space", /\b(nasa|spacex|rocket|orbit|mars|astronaut|satellite|telescope)\b/i],
  ["Climate", /\b(climate|carbon|emission|wildfire|hurricane|heatwave|drought)/i],
  ["Health", /\b(health|vaccine|fda|cancer|medical|hospital|disease)\b/i],
  ["Finance", /\b(stock|market|fed|inflation|bank|crypto|bitcoin|economy)\b/i],
  ["Science", /\b(science|research|study|physics|biology|chemistry)\b/i],
  ["Tech", /\b(tech|software|app|chip|apple|google|microsoft|startup)\b/i],
];

let intervalHandle: ReturnType<typeof setInterval> | null = null;
let nextRunAtTimestamp: number | null = null;
let isRunInProgress = false;

function readJsonFromLocalStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch { return fallback; }
}
function writeJsonToLocalStorage(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* localStorage full or unavailable */ }
}
async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.json() as Promise<T>;
}
const describeError = (error: unknown): string => (error instanceof Error ? error.message : String(error));
const loadAutoCurationLog = (): AutoCurationLogEntry[] => readJsonFromLocalStorage<AutoCurationLogEntry[]>(LOG_STORAGE_KEY, []);
const inferSectionFromText = (text: string): string =>
  SECTION_KEYWORD_RULES.find(([, pattern]) => pattern.test(text))?.[0] ?? FALLBACK_SECTION;
const slugifyHeadline = (headline: string): string =>
  headline.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

export function loadAutoCurationConfig(): AutoCurationConfig {
  const stored = readJsonFromLocalStorage<Partial<AutoCurationConfig>>(CONFIG_STORAGE_KEY, {});
  return { ...DEFAULT_AUTO_CURATION_CONFIG, ...stored, sources: { ...DEFAULT_AUTO_CURATION_CONFIG.sources, ...stored.sources } };
}
export function saveAutoCurationConfig(config: AutoCurationConfig): void {
  writeJsonToLocalStorage(CONFIG_STORAGE_KEY, config);
}

function buildRankedStoryIfSourcePermitted(platform: SourcePlatform, engagementScore: number, fields: DiscoveredStoryFields): RankedStory | null {
  const headline = fields.headline.trim();
  const validation = validateSourceUrl(fields.sourceUrl);
  if (!headline || validation.status === "banned") return null;
  const nowIsoTimestamp = new Date().toISOString();
  const story: Story = {
    ...fields, headline, excerpt: fields.excerpt.trim() || headline,
    storyIdentifier: `${PLATFORM_INFO[platform].identifierPrefix}-${slugifyHeadline(headline)}`,
    provenanceTier: 2, sourceName: PLATFORM_INFO[platform].displayName,
    licenceBasis: validation.status === "approved" ? validation.source.licenceBasis : "auto-curated",
    publishedAt: fields.publishedAt || nowIsoTimestamp, fetchedAt: nowIsoTimestamp,
  };
  return { platform, engagementScore, story };
}

async function discoverYouTubeStories(): Promise<RankedStory[]> {
  type YouTubeVideo = { videoId: string; title: string; channelName: string; category: string; publishedAt: string; videoUrl: string; thumbnailUrl: string };
  const data = await fetchJson<{ videos: YouTubeVideo[] }>(`/api/youtube/discover?limit=${CANDIDATES_PER_SOURCE}`);
  return data.videos.flatMap((video) =>
    buildRankedStoryIfSourcePermitted("youtube", new Date(video.publishedAt).getTime() || 0, {
      headline: video.title, excerpt: `New video from ${video.channelName}.`, sourceUrl: video.videoUrl,
      section: video.category, publishedAt: video.publishedAt, imageUrl: video.thumbnailUrl, youtubeVideoId: video.videoId,
    }) ?? []
  );
}
async function discoverBlueskyStories(): Promise<RankedStory[]> {
  type BlueskyPost = { text: string; authorHandle: string; createdAt: string; likeCount: number; repostCount: number; replyCount: number; uri: string; externalLink?: { uri: string; title?: string; description?: string } };
  const data = await fetchJson<{ posts: BlueskyPost[] }>(`/api/social/bluesky?limit=${CANDIDATES_PER_SOURCE}`);
  return data.posts.filter((post) => post.text).flatMap((post) => {
    const headline = post.externalLink?.title || post.text.slice(0, 100);
    const postPageUrl = `https://bsky.app/profile/${post.authorHandle}/post/${post.uri.split("/").pop()}`;
    return buildRankedStoryIfSourcePermitted("bluesky", post.likeCount + 2 * post.repostCount + post.replyCount, {
      headline, excerpt: post.text, sourceUrl: post.externalLink?.uri ?? postPageUrl,
      section: inferSectionFromText(`${headline} ${post.text}`), publishedAt: post.createdAt,
    }) ?? [];
  });
}
async function discoverMastodonStories(): Promise<RankedStory[]> {
  type MastodonLink = { url: string; title: string; description: string; imageUrl: string | null; sharesCount: number };
  const data = await fetchJson<{ trendingLinks: MastodonLink[] }>(`/api/social/mastodon?limit=${CANDIDATES_PER_SOURCE}`);
  return data.trendingLinks.flatMap((link) =>
    buildRankedStoryIfSourcePermitted("mastodon", link.sharesCount, {
      headline: link.title, excerpt: link.description, sourceUrl: link.url,
      section: inferSectionFromText(`${link.title} ${link.description}`), imageUrl: link.imageUrl ?? undefined,
    }) ?? []
  );
}

async function discoverWebStories(): Promise<RankedStory[]> {
  type WebDiscoverStory = { headline: string; excerpt: string; sourceUrl: string; sourceDomain: string; engagementScore: number; publishedAt: string; category: string };
  const data = await fetchJson<{ stories: WebDiscoverStory[] }>(`/api/web/discover?limit=${CANDIDATES_PER_SOURCE}`);
  return data.stories.flatMap((webStory) =>
    buildRankedStoryIfSourcePermitted("web", webStory.engagementScore, {
      headline: webStory.headline, excerpt: webStory.excerpt, sourceUrl: webStory.sourceUrl,
      section: inferSectionFromText(`${webStory.headline} ${webStory.excerpt}`), publishedAt: webStory.publishedAt,
    }) ?? []
  );
}

async function discoverRankedStoriesFromEnabledSources(config: AutoCurationConfig, sourceErrors: string[]): Promise<RankedStory[]> {
  const enabledPlatforms = ALL_PLATFORMS.filter((platform) => config.sources[platform]);
  const results = await Promise.allSettled(enabledPlatforms.map((platform) => PLATFORM_INFO[platform].discover()));
  return results.flatMap((result, index) => {
    if (result.status === "fulfilled") return result.value;
    sourceErrors.push(`${enabledPlatforms[index]}: ${describeError(result.reason)}`);
    return [];
  });
}

export function buildEmptyEditionForDateWithEditionNumber(editionDate: string, editionNumber: number): Edition {
  return { editionDate, editionNumber, generatedAt: new Date().toISOString(), storyCount: 0, sections: [], stories: [] };
}

// A freshly built edition is only persisted by runAutoCurationOnce when stories were
// actually added, so a run that finds nothing never leaves an empty edition behind.
async function loadOrBuildEditionForToday(): Promise<Edition> {
  const todayDateString = getTodayAsEditionDateString();
  const localEditionForToday = readJsonFromLocalStorage<Edition | null>(EDITION_STORAGE_KEY_PREFIX + todayDateString, null);
  if (localEditionForToday) return localEditionForToday;
  const index = await fetchJson<{ editions: Array<{ date: string; editionNumber: number; file: string }> }>("/editions/index.json");
  const staticEntryForToday = index.editions.find((entry) => entry.date === todayDateString);
  if (staticEntryForToday) return fetchJson<Edition>(`/editions/${staticEntryForToday.file}`);
  const maximumStaticEditionNumber = index.editions.reduce((maximum, entry) => Math.max(maximum, entry.editionNumber), 0);
  return buildEmptyEditionForDateWithEditionNumber(todayDateString, maximumStaticEditionNumber + 1);
}

function selectTopStoriesRoundRobinAcrossPlatforms(rankedStories: RankedStory[], maximumCount: number): Story[] {
  const queuesByPlatform = ALL_PLATFORMS.map((platform) => rankedStories.filter((ranked) => ranked.platform === platform));
  const selected: Story[] = [];
  while (selected.length < maximumCount && queuesByPlatform.some((queue) => queue.length > 0)) {
    for (const queue of queuesByPlatform) {
      const next = queue.shift();
      if (next && selected.length < maximumCount) selected.push(next.story);
    }
  }
  return selected;
}

export async function runAutoCurationOnce(): Promise<AutoCurationLogEntry | null> {
  if (isRunInProgress) return null;
  isRunInProgress = true;
  const config = loadAutoCurationConfig();
  const logEntry: AutoCurationLogEntry = { ranAtTimestamp: Date.now(), editionDate: null, storiesAddedCount: 0, addedStoryIdentifiers: [], sourceErrors: [] };
  try {
    const edition = await loadOrBuildEditionForToday();
    const rankedStories = await discoverRankedStoriesFromEnabledSources(config, logEntry.sourceErrors);
    const seenKeys = new Set(edition.stories.flatMap((story) => [story.storyIdentifier, story.sourceUrl]));
    const eligibleStories = rankedStories.sort((a, b) => b.engagementScore - a.engagementScore).filter(({ story }) => {
      const isAlreadyPresent = seenKeys.has(story.storyIdentifier) || seenKeys.has(story.sourceUrl);
      const isSectionWanted = config.preferredSections.length === 0 || config.preferredSections.includes(story.section);
      if (isAlreadyPresent || !isSectionWanted) return false;
      seenKeys.add(story.storyIdentifier).add(story.sourceUrl);
      return true;
    });
    const selectedStories = selectTopStoriesRoundRobinAcrossPlatforms(eligibleStories, config.maxStoriesPerRun);
    if (selectedStories.length > 0) {
      const updatedStories = [...selectedStories, ...edition.stories];
      writeJsonToLocalStorage(EDITION_STORAGE_KEY_PREFIX + edition.editionDate, {
        ...edition, stories: updatedStories, storyCount: updatedStories.length,
        sections: [...new Set([...edition.sections, ...selectedStories.map((story) => story.section)])],
      } satisfies Edition);
    }
    logEntry.editionDate = edition.editionDate;
    logEntry.storiesAddedCount = selectedStories.length;
    logEntry.addedStoryIdentifiers = selectedStories.map((story) => story.storyIdentifier);
  } catch (error) {
    logEntry.sourceErrors.push(`run: ${describeError(error)}`);
  }
  isRunInProgress = false;
  writeJsonToLocalStorage(LOG_STORAGE_KEY, [logEntry, ...loadAutoCurationLog()].slice(0, MAXIMUM_LOG_ENTRIES));
  window.dispatchEvent(new CustomEvent(AUTO_CURATION_RUN_EVENT_NAME, { detail: logEntry }));
  return logEntry;
}

export function startAutoCurationScheduler(): void {
  stopAutoCurationScheduler();
  if (typeof window === "undefined") return;
  const config = loadAutoCurationConfig();
  if (!config.isEnabled) return;
  const intervalMilliseconds = (config.intervalHours > 0 ? config.intervalHours : 24) * 60 * 60 * 1000;
  intervalHandle = setInterval(() => { nextRunAtTimestamp = Date.now() + intervalMilliseconds; void runAutoCurationOnce(); }, intervalMilliseconds);
  nextRunAtTimestamp = Date.now() + intervalMilliseconds;
  const lastRunAtTimestamp = loadAutoCurationLog()[0]?.ranAtTimestamp ?? 0;
  if (Date.now() - lastRunAtTimestamp >= intervalMilliseconds) void runAutoCurationOnce();
}

export function stopAutoCurationScheduler(): void {
  if (intervalHandle !== null) clearInterval(intervalHandle);
  intervalHandle = null;
  nextRunAtTimestamp = null;
}

export function getAutoCurationStatus(): AutoCurationStatus {
  const log = loadAutoCurationLog();
  return {
    isRunning: intervalHandle !== null,
    nextRunAt: nextRunAtTimestamp ? new Date(nextRunAtTimestamp).toISOString() : null,
    lastRunAt: log[0] ? new Date(log[0].ranAtTimestamp).toISOString() : null,
    storiesAddedTotal: log.reduce((sum, entry) => sum + entry.storiesAddedCount, 0),
  };
}
