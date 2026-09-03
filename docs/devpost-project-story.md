## Inspiration

I always wanted a personal content library curated by AI — a place where agents search the web, find what interests me, and organize it into something readable.

YouTube was the catalyst. There's incredible depth in long-form video, but I rarely have 30 minutes to commit upfront. AI agents can summarize videos and surface key insights before I watch in full. That idea expanded into a full newspaper: YouTube embeds, Bluesky discussions, government data — all curated live by AI from open sources.

WebMCP made it possible. Chrome 150 shipped `document.modelContext.registerTool()`, letting any web page expose tools to AI agents. No extensions, no API keys. My browser became a newsroom where AI agents write and I edit.

## What it does

OpenMemoz exposes **31 WebMCP tools** to any visiting AI agent. The agent reads editions, searches stories, discovers content from YouTube/Bluesky/Mastodon, writes original articles, embeds videos, and reshapes the layout — all through the browser's native tool-calling protocol.

![Edition view — hero with YouTube video, sidebar, mid-row, and masonry below-fold](https://raw.githubusercontent.com/Michael-Ackerman3956/OpenMemoz/main/docs-openmemoz/Screenshots/edition-hero-above-fold.png)

A typical interaction:

1. User tells ChatGPT: *"Find trending Real Madrid videos and add them as stories"*
2. Agent calls `search_stories("Real Madrid")` → 0 results
3. Tool suggests `discover_youtube_content`
4. Agent discovers videos → calls `add_story` with `pinAsHero: true`
5. Layout recalculates instantly — new hero, sidebar adjusts, masonry reflows

![Video feature row and below-fold masonry after agent added content](https://raw.githubusercontent.com/Michael-Ackerman3956/OpenMemoz/main/docs-openmemoz/Screenshots/edition-video-feature-below-fold.png)

## How we built it

Client-side Next.js PWA. No backend for content curation — AI agents visiting the page *are* the backend. API routes exist only as CORS proxies for YouTube, Bluesky, and Mastodon.

### WebMCP tool registration

```typescript
// src/lib/webmcp.ts — 31 tools via browser-native API

export function registerAllWebMCPTools(
  edition: Edition,
  allEditions: Edition[],
  onEditionMutated: (edition: Edition, index: number) => void,
  abortSignal: AbortSignal
): void {
  const modelContext = document.modelContext;
  if (typeof modelContext?.registerTool !== "function") return;

  void Promise.all([
    modelContext.registerTool({
      name: "openmemoz.add_story",
      description: "Add a new story. Page updates IMMEDIATELY.",
      inputSchema: {
        type: "object",
        properties: {
          headline: { type: "string" },
          excerpt: { type: "string" },
          section: { type: "string" },
          sourceName: { type: "string" },
          youtubeVideoId: { type: "string" },
          pinAsHero: { type: "boolean" },
        },
        required: ["headline", "excerpt", "section", "sourceName"],
      },
      execute: (args) => { /* validates source → creates story → updates edition */ },
    }, { signal: abortSignal }),
    // ... 30 more tools
  ]);
}
```

### Data schema

```typescript
// src/lib/types.ts

export interface Story {
  storyIdentifier: string;
  headline: string;
  excerpt: string;
  section: string;
  provenanceTier: 1 | 2;   // 1 = source text (quotable), 2 = AI-synthesized
  sourceName: string;
  sourceUrl: string;
  licenceBasis: string;     // legal basis for redistribution
  youtubeVideoId?: string;
  imageUrl?: string;
  isHeroPinned?: boolean;
}
```

### Curated sources

| Layer | Sources | Legal basis |
|-------|---------|-------------|
| Government | SEC, Fed, NASA, NOAA, BLS, NIH, CDC | Public domain (17 USC §105) |
| Creative Commons | The Conversation, Global Voices, VOA, Wikipedia | CC licence terms |
| Open APIs | Hacker News, YouTube, Bluesky, Mastodon | Permissive API / embed ToS |

```typescript
// src/lib/curatedSources.ts — enforced at tool level
export const APPROVED_SOURCES: ApprovedSource[] = [
  { domain: "nasa.gov", category: "government", licenceBasis: "public-domain-usgov" },
  { domain: "youtube.com", category: "video", licenceBasis: "youtube-embed-tos" },
  // ~90 total
];
export const BANNED_DOMAINS = ["nytimes.com", "wsj.com", "washingtonpost.com", /* ~280 */];
```

When `add_story` is called, the source URL is validated against both lists before the story is accepted.

### Layout rule engine

```typescript
// src/lib/layoutRuleEngine.ts — newspaper-style editorial layout
function scoreHeroCandidate(story: Story, index: number): number {
  if (story.isHeroPinned) return 100;
  let score = 0;
  if (story.youtubeVideoId) score += 5;
  if (story.imageUrl) score += 3;
  if (story.provenanceTier === 1) score += 2;
  if (story.excerpt.length >= 160) score += 1;
  return score;
}
// Layout: Hero+Sidebar → Mid-row (uniform) → Brief strip → Video feature → 3-col masonry
```

![Story detail with embedded YouTube video](https://raw.githubusercontent.com/Michael-Ackerman3956/OpenMemoz/main/docs-openmemoz/Screenshots/story-detail-youtube-embed.png)

## Challenges we ran into

**WebMCP is brand new.** Chrome 150 shipped `document.modelContext.registerTool()` with minimal documentation. We discovered edge cases through trial — silent failures on long descriptions, Chrome 146–149 using `navigator.modelContext` instead. Our code handles both.

**AI agents are unpredictable editors.** First test: ChatGPT added 47 stories from banned domains. We built guardrails: source validation (~90 approved + ~280 banned), duplicate detection, rate guidance in tool descriptions.

**Newspaper layout is harder than it looks.** Our first layout was a Pinterest-style masonry grid. Real newspapers have hierarchy: dominant hero, uniform mid-rows, no dead space. The rule engine enforces these constraints.

**YouTube video verification.** Matching video IDs to story topics is fragile — a Federal Reserve story was showing a Linkin Park music video. Fix: oembed API verification.

## Accomplishments that we're proud of

- **31 WebMCP tools** — one of the most comprehensive WebMCP implementations
- **Zero backend** — AI agents *are* the editorial team
- **Copyright-safe** — ~90 approved sources, ~280 banned domains, provenance tiers in the schema
- **52 visual combinations** — 13 palettes × 4 styles, all agent-controllable
- **Works with any AI agent** — tested with ChatGPT Codex, no vendor lock-in

![Settings — 13 color palettes and 4 visual styles](https://raw.githubusercontent.com/Michael-Ackerman3956/OpenMemoz/main/docs-openmemoz/Screenshots/settings-themes-palettes.png)

## What we learned

**Tool descriptions are prompt engineering.** The biggest leverage wasn't the execute functions — it was the description strings. `search_stories` guides the agent to discover tools when empty. `add_story` describes source validation so the agent checks first. Descriptions need the same care as system prompts.

**Source validation is table stakes.** Within minutes, ChatGPT tried to add stories from NYT, WSJ, and Bloomberg. Building validation into the data model — not as an afterthought — was the most important decision.

**Layout is editorial judgment.** A masonry grid is not a newspaper. The rule engine encodes hard constraints (no empty cells, uniform rows); the AI provides soft judgment by curating content.

## What's next for OpenMemoz

**Creator access program.** Partner with YouTubers, journalists, and Bluesky authors to explicitly grant redistribution rights. Grow from ~90 to 500+ approved sources.

**Community source lists.** Forkable, versioned source lists anyone can customize — a climate researcher curates climate sources, a teacher builds a current events list.

**Autonomous AI journalists.** Agents that discover, research, write, and publish on a schedule. Multiple agents covering different beats. OpenMemoz becomes a living, self-updating newspaper.

**Server-side generation + hosted tier.** Scheduled Cloud Functions for daily editions. Free self-hosted PWA, paid tier with cloud sync and premium sources.
