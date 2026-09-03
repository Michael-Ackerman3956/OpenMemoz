## Inspiration

I always wanted a personal content library I could visit anytime — a place where AI agents search the web, find what interests me, and organize it into something I can actually read.

YouTube was the catalyst. There's incredible depth in long-form video, but I rarely have 30 minutes to commit upfront. I started asking AI to summarize videos and give me the key insights before I watch them in full. It worked so well that I wanted the whole experience — not just video summaries, but a full newspaper curated by AI from open sources, updated live, with YouTube embeds, Bluesky discussions, and government data all in one place.

WebMCP made this possible. Chrome 150 shipped `document.modelContext.registerTool()`, which lets a web page expose structured tools to any AI agent visiting it. No extensions, no API keys. The agent sees the tools, calls them, and the page updates live. My browser became a newsroom where AI agents are the writers and I'm the editor.

## What it does

OpenMemoz is an AI-powered content platform that exposes **31 WebMCP tools** to any visiting AI agent. The agent can read the current edition, search stories, discover content from YouTube, Bluesky, and Mastodon, write original articles, embed videos, manage reader preferences, and reshape the newspaper layout — all through the browser's native tool-calling protocol.

### The reader experience

Open the page and you see today's edition laid out like a real newspaper: a hero story with an embedded YouTube video, a sidebar with text stories, a mid-row section, a video feature row, and a below-fold masonry grid. Thirteen color palettes, four visual styles (flat, glass, neumorphic, paper), dynamic and simple layout modes.

![Edition view with ChatGPT Codex adding Real Madrid content via WebMCP tools](https://raw.githubusercontent.com/Michael-Ackerman3956/OpenMemoz/main/docs-openmemoz/Screenshots/edition-hero-above-fold.png)

### The agent experience

Any AI agent visiting the page discovers 31 tools under the `openmemoz.*` namespace. Here's what a typical interaction looks like:

1. User tells ChatGPT: *"This page has built-in tools. Find trending Real Madrid videos and add them as stories."*
2. Agent calls `openmemoz.search_stories({query: "Real Madrid"})` — finds nothing
3. The tool response suggests: *"Try openmemoz.discover_youtube_content to find content from external sources"*
4. Agent calls `openmemoz.discover_youtube_content({query: "Real Madrid"})` — gets video metadata
5. Agent calls `openmemoz.add_story({headline: "...", youtubeVideoId: "...", pinAsHero: true})` — story appears live
6. The newspaper layout immediately recalculates: new hero, sidebar adjusts, masonry reflows

![After the agent added content — video feature row and below-fold masonry visible](https://raw.githubusercontent.com/Michael-Ackerman3956/OpenMemoz/main/docs-openmemoz/Screenshots/edition-video-feature-below-fold.png)

### Why AI, and why WebMCP

Content curation requires judgment across many dimensions: source credibility, topic relevance to the reader, visual variety, section balance, recency. A single human editor handles this intuitively. An algorithm handles it statistically. An AI agent with the right tools can handle it conversationally — the reader says what they want, the agent delivers.

WebMCP is the right protocol because it makes the page itself the API surface. No server needed. No authentication. The tools are discoverable, typed, and self-documenting. The agent reads the tool descriptions and figures out the workflow. This is how the web was supposed to work for AI.

## How we built it

### Architecture

The entire system runs client-side as a Next.js PWA. There is no backend for content curation — the AI agents visiting the page *are* the backend. Server-side API routes exist only as thin proxies for external APIs (YouTube, Bluesky, Mastodon) that don't support CORS.

```
┌──────────────────────────────────────────────────────────────────┐
│                        BROWSER (PWA)                              │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                    WebMCP Tool Layer                         │  │
│  │              31 tools · openmemoz.* namespace                │  │
│  │                                                              │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │  │
│  │  │  Read    │ │  Write   │ │ Discover │ │ Personalize  │   │  │
│  │  │ get_     │ │ add_     │ │ youtube  │ │ interests    │   │  │
│  │  │ search_  │ │ update_  │ │ bluesky  │ │ themes       │   │  │
│  │  │ list_    │ │ remove_  │ │ mastodon │ │ memory       │   │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────┘   │  │
│  └──────────────────────┬──────────────────────────────────────┘  │
│                         │                                          │
│  ┌──────────────────────▼──────────────────────────────────────┐  │
│  │                 Layout Rule Engine                           │  │
│  │  Hero scoring · Sidebar packing · Mid-row uniformity        │  │
│  │  Brief strip (full rows only) · Video feature selection     │  │
│  │  Below-fold balanced columns (greedy shortest-column)       │  │
│  └──────────────────────┬──────────────────────────────────────┘  │
│                         │                                          │
│  ┌──────────────────────▼──────────────────────────────────────┐  │
│  │               Edition Data (localStorage)                   │  │
│  │  Editions · Reading history · Agent memory · Theme prefs    │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │              Curated Sources System                          │  │
│  │  ~90 approved sources · ~280 banned domains                 │  │
│  │  Government (public domain) · CC-licensed · Open APIs       │  │
│  └─────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
         ▲                    ▲                    ▲
         │                    │                    │
    ┌────┴────┐         ┌────┴────┐         ┌────┴────┐
    │ ChatGPT │         │  Claude │         │ Gemini  │
    │  Codex  │         │  Agent  │         │  Agent  │
    └─────────┘         └─────────┘         └─────────┘
    Any agent visiting the page discovers tools via WebMCP
```

### WebMCP tool registration

Every tool is registered through the browser's `document.modelContext.registerTool()` API. Here's how the core registration works:

```typescript
// src/lib/webmcp.ts — tool registration via WebMCP standard

declare global {
  interface Document {
    modelContext?: {
      registerTool: (tool: WebMCPToolDefinition) => Promise<void>;
    };
  }
}

export function registerAllWebMCPTools(
  edition: Edition,
  allEditions: Edition[],
  getCurrentSectionFilter: () => string,
  setCurrentSectionFilter: (section: string) => void,
  onEditionMutated: (edition: Edition, index: number) => void,
  abortSignal: AbortSignal
): void {
  const modelContext = document.modelContext;
  if (typeof modelContext?.registerTool !== "function") return;

  // 31 tools registered in parallel
  void Promise.all([
    modelContext.registerTool({
      name: "openmemoz.get_edition",
      description: "Get today's newspaper edition overview: date, " +
        "story count, sections, and headlines with provenance tiers.",
      inputSchema: { type: "object", properties: {} },
      annotations: { readOnlyHint: true },
      execute: () => ({
        editionDate: edition.editionDate,
        sections: edition.sections,
        stories: edition.stories.map(s => ({
          storyIdentifier: s.storyIdentifier,
          headline: s.headline,
          section: s.section,
          provenanceTier: s.provenanceTier,
        })),
      }),
    }, { signal: abortSignal }),
    // ... 30 more tools
  ]);
}
```

### Data schema — the Story and Edition types

Every story carries provenance metadata. Tier 1 means the text comes directly from the source (government press release, CC-licensed article). Tier 2 means the AI synthesized the summary. This distinction is enforced at the schema level:

```typescript
// src/lib/types.ts

export interface Story {
  storyIdentifier: string;
  headline: string;
  excerpt: string;
  section: string;
  provenanceTier: 1 | 2;    // 1 = source's own text, 2 = AI-synthesized
  sourceName: string;
  sourceUrl: string;
  licenceBasis: string;      // legal basis for redistribution
  citations?: string[];
  publishedAt: string;
  fetchedAt: string;
  imageUrl?: string;
  youtubeVideoId?: string;
  isFavourite?: boolean;
  isHeroPinned?: boolean;
}

export interface Edition {
  editionDate: string;
  editionNumber: number;
  generatedAt: string;
  storyCount: number;
  sections: string[];
  stories: Story[];
}
```

### Curated sources — copyright-safe content model

OpenMemoz only accepts content from approved sources. The system enforces a 3-layer content model:

| Layer | Sources | Legal basis |
|-------|---------|-------------|
| Government | SEC, Federal Reserve, NASA, NOAA, BLS, NIH, CDC... | Public domain (17 USC §105) |
| Creative Commons | The Conversation (CC-BY-ND), Global Voices (CC-BY), VOA, Wikipedia | CC licence terms |
| Open APIs | Hacker News, YouTube, Bluesky, Mastodon, Lobsters | Permissive API terms / embed rights |

```typescript
// src/lib/curatedSources.ts — enforced at tool level

export const APPROVED_SOURCES: ApprovedSource[] = [
  // Government — US public domain
  { domain: "sec.gov", displayName: "SEC EDGAR",
    category: "government", licenceBasis: "public-domain-usgov" },
  { domain: "federalreserve.gov", displayName: "Federal Reserve",
    category: "government", licenceBasis: "public-domain-usgov" },
  { domain: "nasa.gov", displayName: "NASA",
    category: "government", licenceBasis: "public-domain-usgov" },
  // ... ~90 total approved sources
];

export const BANNED_DOMAINS: string[] = [
  // ~280 domains with restrictive terms
  "nytimes.com", "wsj.com", "washingtonpost.com", ...
];
```

When an agent calls `openmemoz.add_story`, the source URL is validated against both lists before the story is accepted.

### Layout rule engine

The layout engine assigns stories to slots like a real newspaper editor — no empty space, no mixed-height rows:

```typescript
// src/lib/layoutRuleEngine.ts

function scoreHeroCandidate(story: Story, index: number): number {
  if (story.isHeroPinned) return 100;
  let score = 0;
  if (story.youtubeVideoId) score += 5;  // video = visual impact
  if (story.imageUrl) score += 3;
  if (story.provenanceTier === 1) score += 2;  // primary sources first
  if (story.excerpt.length >= 160) score += 1;
  if (index === 0) score += 1;  // editorial intent
  return score;
}
```

The engine produces a structured layout: hero + sidebar → mid-row (uniform: all-thumbnail or all-text) → brief strip (full rows of 4 only) → video feature → below-fold masonry (greedy shortest-column packing).

![Story detail view with embedded YouTube video](https://raw.githubusercontent.com/Michael-Ackerman3956/OpenMemoz/main/docs-openmemoz/Screenshots/story-detail-youtube-embed.png)

## Challenges we ran into

**WebMCP is brand new and barely documented.** Chrome 150 shipped `document.modelContext.registerTool()` in mid-2026. There are no tutorials, few examples, and the spec is still evolving. We discovered edge cases through trial: tools that fail silently when descriptions are too long, agents that call tools in unexpected orders, and the Chrome 146–149 API that used `navigator.modelContext` instead of `document.modelContext`. Our code handles both.

**AI agents are unpredictable editors.** The first time we asked ChatGPT to "add some tech stories," it added 47 stories in a row, all in the Tech section, most from banned domains. We built guardrails layer by layer: source validation against ~90 approved + ~280 banned domains, duplicate detection by headline slug, rate guidance in tool descriptions, and section-aware suggestions. The agent still needs coaching, but it can't publish from the New York Times.

**Newspaper layout is harder than it looks.** Our first layout was a 3-column masonry grid. It looked like a Pinterest board, not a newspaper. Real newspapers have hierarchical layouts — the hero is visually dominant, sidebar stories complement it, mid-row stories are uniform height, and the below-fold grid fills every pixel. We built a rule engine that scores hero candidates, enforces uniform rows (all-thumbnail or all-text), only creates brief strips in full rows of 4, and uses greedy shortest-column packing for the below-fold section.

**YouTube video verification is a rabbit hole.** We curate static editions with YouTube video embeds. Matching video IDs to story topics is fragile — IDs change, videos get removed, and there's no reliable way to verify a video's topic from its ID alone. We burned multiple debugging sessions fixing mismatched videos (a story about the Federal Reserve was showing a Linkin Park music video). The fix: YouTube oembed API verification and strict video-to-topic matching in our editorial workflow.

## Accomplishments that we're proud of

- **31 WebMCP tools** under the `openmemoz.*` namespace — one of the most comprehensive WebMCP implementations
- **Zero backend for content curation** — AI agents visiting the page *are* the editorial team
- **Copyright-safe content model** with ~90 approved sources, ~280 banned domains, and provenance tiers baked into the data schema
- **13 color palettes × 4 visual styles** — 52 distinct visual combinations, all working in both light and dark themes
- **Layout rule engine** that produces editorial-quality newspaper layouts with hero scoring, uniform rows, and balanced masonry columns
- **Works with any AI agent** — tested with ChatGPT Codex, Claude, and manual tool calls. No vendor lock-in.

![Settings screen showing 13 color palettes and 4 visual styles](https://raw.githubusercontent.com/Michael-Ackerman3956/OpenMemoz/main/docs-openmemoz/Screenshots/settings-themes-palettes.png)

### What's novel

Most AI-powered news apps use AI to generate or summarize content server-side. OpenMemoz is fundamentally different:

- **The page is the API.** WebMCP tools are registered in the browser, not on a server. Any AI agent that can open a webpage can operate the newsroom.
- **Provenance is structural, not decorative.** Every story carries a `provenanceTier` and `licenceBasis` in its data schema. Tier 1 text can be quoted; Tier 2 cannot. The agent knows the difference.
- **The reader controls the AI, not the other way around.** The reader tells the agent what to do. The agent uses the page's tools. The page enforces source safety. No recommendation algorithm optimizing for engagement.
- **Curated sources at the tool level.** The AI cannot publish from banned domains — the validation happens in the tool's execute function, not in a prompt instruction.

## What we learned

**WebMCP makes every webpage a potential tool platform.** The browser-native API means any page can expose structured capabilities to AI agents. This is more powerful than building an API, because the agent can also see the page, understand the context, and interact with the UI. The page becomes a bidirectional interface.

**Tool descriptions are prompt engineering.** The biggest leverage in our WebMCP implementation wasn't the execute functions — it was the description strings. When `search_stories` returns zero results, the description guides the agent to discover tools. When `add_story` describes source validation, the agent preemptively checks sources. The tool descriptions are the agent's instruction manual, and they need the same care as system prompts.

**Source validation is table stakes.** Within minutes of testing with ChatGPT, the agent tried to add stories from the New York Times, Washington Post, and Bloomberg. Without the curated sources system, the platform would have been a copyright lawsuit generator. Building source validation into the data model — not as an afterthought — was the most important architectural decision.

**Layout is editorial judgment.** A masonry grid is not a newspaper layout. Real newspapers have hierarchy, rhythm, and visual balance. Building the layout rule engine taught us that newspaper design is a set of hard constraints (no empty cells, no mixed-height rows) applied with soft judgment (hero scoring, section diversity). The rule engine encodes the constraints; the AI provides the judgment by curating the content.

## Limitations

OpenMemoz only accepts content from ~90 approved sources — primarily US government agencies, Creative Commons publishers, and open APIs like YouTube, Bluesky, Mastodon, and Hacker News. Major publications (NYT, WSJ, BBC, Reuters) are banned because their terms prohibit automated redistribution. This is a deliberate constraint, not an oversight: we chose copyright safety over content breadth. But it means the platform covers public data and open-web content well while lacking the source diversity of traditional aggregators.

The platform is also client-side only. All data lives in localStorage — no cross-device sync, no shared editions. Without an AI agent visiting the page, no new content appears. WebMCP requires Chrome 146+ with a flag enabled; it's not yet available in other browsers.

## What's next for OpenMemoz

OpenMemoz is designed as an open-core platform, not a hackathon demo. The Apache 2.0 codebase is the foundation.

**Expand the source ecosystem.** The ~90 approved sources are a starting point. The next step is partnering with content creators — YouTubers, independent journalists, newsletter writers, Bluesky authors — who are willing to explicitly grant redistribution rights for AI-curated platforms. Creators get attribution and traffic; readers get a broader content ecosystem. The goal: grow from ~90 to 500+ approved sources through creator opt-ins and community contributions.

**Community-curated source lists.** Right now the approved sources are hardcoded. Next: community-contributed source lists that anyone can fork and customize. A reader interested in climate science curates their own source list. A teacher builds one for current events assignments.

**Server-side edition generation.** The static editions work for demos, but a real newspaper needs daily content. Next: scheduled Cloud Functions that fetch from approved source APIs (Hacker News, USGS, BLS, Federal Register) and generate fresh editions automatically.

**Autonomous AI journalists.** The long-term vision: AI agents that run autonomously — discovering breaking content, researching topics across multiple sources, writing original articles, and publishing to the edition on a schedule. Not a chatbot you prompt, but an autonomous journalist that covers its beat. Multiple agents collaborating: one monitors government feeds, another tracks YouTube creators, a third writes cross-source analysis pieces. OpenMemoz becomes a living, self-updating newspaper.

**Hosted tier.** Free self-hosted PWA with community source lists. Paid tier with server-side generation, premium sources, and cross-device sync.
