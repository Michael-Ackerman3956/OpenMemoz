# OpenMemoz

**User-Agent Generated Content Platform (UAGC): Users Direct, Agents Curate**

[https://openmemoz.vercel.app](https://openmemoz.vercel.app)

[![OpenMemoz Demo](https://img.youtube.com/vi/1V0_9_1XRGU/maxresdefault.jpg)](https://youtu.be/1V0_9_1XRGU)

### The Problem

Content discovery is fragmented. The same story surfaces across multiple apps, each optimizing for engagement rather than what the reader actually wants. Long-form content like YouTube videos has incredible depth, but finding the right one takes longer than watching it. And none of these platforms let an AI agent do the searching while the reader does the reading.

### The Solution

OpenMemoz is a consolidated personal content library where AI agents curate open sources and the reader decides what to read. It exposes **35 WebMCP tools** via `document.modelContext.registerTool()`, so any AI agent (ChatGPT, Claude, Gemini) can visit the page, discover the tools, and operate the newsroom: searching stories, discovering content from YouTube/Bluesky/Mastodon, writing original articles, embedding videos, and reshaping the layout. All content is sourced exclusively from ~90 approved open-licensed sources, with ~280 banned domains enforced at the tool level.

---

## How It Works

The page is the interface. AI agents visiting the page *are* the editorial team. No backend, no API keys.

![OpenMemoz edition view](https://pub-c29eb1221b564175a121442d1144af7e.r2.dev/screenshots/edition-hero-above-fold.png)

### Why WebMCP?

Content curation requires judgment across many dimensions: source credibility, topic relevance, visual variety, section balance. WebMCP makes the page itself the tool surface. The agent visits, discovers tools, and curates content. The human stays in control: directing the agent, choosing what to read, deciding what to watch. Together, they build a consolidated personal content library that neither could create alone.

### Content Safety as Infrastructure

Most AI content platforms enforce safety through prompts. Prompts can be overridden. OpenMemoz enforces safety in code: the allowlist (~90 sources) and banned list (~280 domains) are validated in the tool's `execute` function. No prompt engineering can bypass it.

This is simple by design. Simple means any page can adopt the same pattern. The allowlist/banned list becomes a composable, forkable content safety standard for the AI-native web. Any agent visiting any WebMCP page with this pattern gets the same guardrails automatically, whether human-initiated or fully autonomous.

![Only open-licensed sources: ~90 allowlisted domains, every source vetted](https://pub-c29eb1221b564175a121442d1144af7e.r2.dev/screenshots/slide-09.png?v=2)

### What's Novel

| Innovation | Why It Matters |
|-----------|---------------|
| **35 WebMCP tools under one namespace** | One of the most comprehensive WebMCP implementations built. The agent gets a full editorial toolkit — search, discover, write, personalize, restyle — through the browser's native protocol |
| **Content safety enforced in code, not prompts** | Allowlist (~90 sources) and banned list (~280 domains) validated in the tool's `execute` function. No prompt injection can bypass it. Any WebMCP page can fork this pattern |
| **Provenance tiers in the data schema** | Every story carries `provenanceTier`: Tier 1 (source text, quotable) vs Tier 2 (AI-synthesized, citations required). The agent knows the difference at the data level, not from a UI label |
| **Zero backend for content curation** | The AI agents visiting the page *are* the backend. Server-side routes exist only as thin CORS proxies. All editorial logic runs client-side through WebMCP tools |
| **User-Agent Generated Content (UAGC)** | A new content model: users direct, agents curate. Neither works alone — the human sets the intent, the agent discovers and organizes, the allowlist enforces the boundaries |
| **52 visual combinations, agent-controllable** | 13 color palettes × 4 visual styles, all switchable by the agent through WebMCP or by the user through Settings. The agent can restyle the entire newspaper in one tool call |
| **Newspaper layout engine** | Rule-based layout that assigns stories like a newspaper editor: hero scoring by visual impact, uniform mid-rows (no mixed heights), greedy shortest-column masonry, and automatic reflow when the agent adds or removes content. No empty cells, no dead space |
| **Composable, forkable safety standard** | The allowlist/banned list is designed to be adopted by any WebMCP page. Simple pattern, Apache 2.0 licensed, so content safety scales across the AI-native web without centralized enforcement |

### Process Flow

![WebMCP process flow: User to Agent to tools to validation to localStorage to live page update](https://pub-c29eb1221b564175a121442d1144af7e.r2.dev/screenshots/slide-06.png?v=2)

---

## Screenshots

<table>
<tr>
<td width="50%">

**Hero + Sidebar (Above the Fold)**
![Edition with hero video, sidebar stories, and section bar](https://pub-c29eb1221b564175a121442d1144af7e.r2.dev/screenshots/edition-hero-above-fold.png)

</td>
<td width="50%">

**Video Feature + Below-Fold Masonry**
![Video feature row and 3-column masonry grid](https://pub-c29eb1221b564175a121442d1144af7e.r2.dev/screenshots/edition-video-feature-below-fold.png)

</td>
</tr>
<tr>
<td width="50%">

**Story Detail with YouTube Embed**
![Full article with embedded YouTube player and related stories](https://pub-c29eb1221b564175a121442d1144af7e.r2.dev/screenshots/story-detail-youtube-embed.png)

</td>
<td width="50%">

**Your Interests (Topic Weights)**
![Interests screen with topic selection and weight sliders](https://pub-c29eb1221b564175a121442d1144af7e.r2.dev/screenshots/interests-screen.png)

</td>
</tr>
<tr>
<td width="50%">

**Settings: 13 Palettes x 4 Styles**
![Color palette and visual style selection](https://pub-c29eb1221b564175a121442d1144af7e.r2.dev/screenshots/settings-themes-palettes.png)

</td>
<td width="50%">

**Different Edition (Kurzgesagt Hero)**
![Past edition with a different hero story](https://pub-c29eb1221b564175a121442d1144af7e.r2.dev/screenshots/edition-different-date.png)

</td>
</tr>
</table>

---

## WebMCP Tools (34)

### Read (16 tools)

| Tool | Description |
|------|-------------|
| `get_edition` | Edition overview with provenance tiers |
| `list_editions` | Available edition dates |
| `search_stories` | Keyword search; suggests discover tools when empty |
| `get_story` | Full story detail |
| `get_reading_context` | What the reader is currently viewing |
| `explain_connections` | Thematic relationships between stories |
| `get_youtube_video` | YouTube transcript + optional Gemini analysis |
| `get_user_interests` | Topic preferences and weights |
| `get_reading_history` | Reading behavior and engagement |
| `recall_memories` | Agent-stored facts about the reader |
| `get_favourites` | Bookmarked stories |
| `get_theme` | Current palette and style |
| `get_approved_sources` | ~90 approved sources |
| `get_banned_domains` | ~280 banned domains |
| `export_data` | Full JSON export |
| `format_for_delivery` | Package stories as briefing, social, newsletter, or data for delivery outside OpenMemoz |

### Write (13 tools)

| Tool | Description |
|------|-------------|
| `add_story` | Add with source validation, positioning, hero pin |
| `remove_story` | Remove by identifier |
| `update_story` | Edit headline, excerpt, section, media |
| `set_hero_story` | Promote to hero position |
| `batch_add_stories` | Atomic multi-add |
| `batch_remove_stories` | Batch removal |
| `reorder_story` | Change position |
| `toggle_favourite` | Bookmark / unbookmark |
| `save_memory` | Store a fact the agent learned |
| `set_section_filter` | Filter to one section |
| `set_color_palette` | Switch between 13 palettes |
| `set_visual_style` | flat / glass / neumorphic / paper |
| `clear_user_data` | Clear localStorage |

### Discover (4 tools)

| Tool | Description |
|------|-------------|
| `discover_youtube_content` | RSS-based video discovery |
| `discover_bluesky_trending` | Bluesky public API search |
| `discover_mastodon_trending` | Mastodon trending links |
| `discover_web_content` | Hacker News + Federal Register discovery |

### Agent (2 tools)

| Tool | Description |
|------|-------------|
| `set_user_interests` | Set topic preferences and weights via AI conversation |
| `configure_auto_curation` | Schedule automatic content delivery (enable/disable/configure/run_now) |

All tools use the `openmemoz.*` namespace. Write tools update the page instantly and persist to localStorage.

---

## Key Code

### Tool registration

```typescript
// src/lib/webmcp.ts
const modelContext = document.modelContext
  ?? (navigator as any).modelContext;  // Chrome 146-149 compat

modelContext.registerTool({
  name: "openmemoz.add_story",
  description: "Add a new story. Page updates IMMEDIATELY.",
  inputSchema: {
    type: "object",
    properties: {
      headline:       { type: "string" },
      excerpt:        { type: "string" },
      section:        { type: "string" },
      sourceName:     { type: "string" },
      youtubeVideoId: { type: "string" },
      pinAsHero:      { type: "boolean" },
    },
    required: ["headline", "excerpt", "section", "sourceName"],
  },
  execute: (args) => { /* validate source, create story, update edition */ },
}, { signal: abortSignal });
```

### Source validation

```typescript
// src/lib/curatedSources.ts
export const APPROVED_SOURCES = [
  { domain: "nasa.gov",    licenceBasis: "public-domain-usgov" },
  { domain: "youtube.com", licenceBasis: "youtube-embed-tos" },
  // ~90 total across government, CC, open API, video, social
];
export const BANNED_DOMAINS = ["nytimes.com", "wsj.com", /* ~280 total */];
```

### Layout engine

```typescript
// src/lib/layoutRuleEngine.ts
function scoreHeroCandidate(story: Story, index: number): number {
  if (story.isHeroPinned) return 100;
  let score = 0;
  if (story.youtubeVideoId) score += 5;
  if (story.imageUrl)       score += 3;
  if (story.provenanceTier === 1) score += 2;
  return score;
}
// Hero+Sidebar > Mid-row (uniform) > Brief strip > Video feature > 3-col masonry
```

---

## Content Model

| Source Type | Examples | Legal Basis |
|-------------|----------|-------------|
| Government | SEC, Federal Reserve, NASA, NOAA, BLS, NIH, CDC | Public domain (17 USC 105) |
| Creative Commons | The Conversation, Global Voices, Wikipedia, VOA | CC licence terms |
| Open APIs | Hacker News, Lobsters | Permissive API terms |
| Video | YouTube | Embed ToS (iframe) |
| Social | Bluesky, Mastodon | Public API (AT Protocol / ActivityPub) |

Every story carries a `provenanceTier` (1 = source text, quotable; 2 = AI-synthesized) and a `licenceBasis`.

---

## Getting Started

### Try it live

Visit **[openmemoz.vercel.app](https://openmemoz.vercel.app)** with ChatGPT Codex or any WebMCP-compatible agent.

### Self-host

```bash
git clone https://github.com/Michael-Ackerman3956/OpenMemoz.git
cd OpenMemoz
npm install
npm run dev
```

### Testing WebMCP tools

**With ChatGPT or any WebMCP agent:** Visit [openmemoz.vercel.app](https://openmemoz.vercel.app) and paste this prompt:

> This page has built-in tools. Use them to find 2 trending YouTube videos about Real Madrid and add them to stories, one of them as new hero section.

The agent will call `search_stories` → `discover_youtube_content` → `add_story` with `pinAsHero: true`. The page updates live.

**Chrome DevTools:** Chrome 149+ with `chrome://flags/#enable-webmcp-testing` enabled, then DevTools > Application > WebMCP panel.

**Playwright test suite:** 100+ tests across 7 spec files covering all 35 tool functions, agent simulation chains, and delivery format generation.

```bash
npx playwright test
```

---

## Architecture

```
src/
├── app/
│   ├── page.tsx                # Main PWA entry
│   ├── demo/page.tsx           # WebMCP demo harness
│   └── api/                    # CORS proxies (YouTube, Bluesky, Mastodon)
├── components/
│   ├── EditionSheet.tsx        # Dynamic + simple layout renderer
│   ├── HeroStory.tsx           # Hero (video / image / text variants)
│   ├── StoryDetail.tsx         # Full article view with YouTube embed
│   ├── SettingsScreen.tsx      # Theme and preference controls
│   ├── InterestsScreen.tsx     # Topic interest weights
│   ├── StoryOverflowMenu.tsx   # Favourite, share, copy, download
│   └── EditionFlipStack.tsx    # Swipe-based edition navigation
├── lib/
│   ├── webmcp.ts               # 35 WebMCP tool definitions
│   ├── types.ts                # Story and Edition interfaces (Schema.org aligned)
│   ├── layoutRuleEngine.ts     # Newspaper-style layout with hero scoring
│   ├── curatedSources.ts       # ~90 approved + ~280 banned domains
│   ├── themeSystem.ts          # 13 palettes × 4 visual styles
│   ├── readingTracker.ts       # Time-on-story engagement tracking
│   └── agentMemory.ts          # Persistent agent memory (localStorage)
└── tests/
    ├── webmcp-tool-functions.spec.ts   # 43 tool execute tests
    ├── webmcp-agent-simulation.spec.ts # 5 agent chain simulations
    └── interest-curation-chain.spec.ts # Interest update chain test
```

**Stack:** Next.js 14, React 18, TypeScript, Tailwind CSS, Playwright, Vercel

---

## Limitations

- **Limited source coverage.** Only ~90 approved sources: US government agencies, Creative Commons publishers, and open APIs. Major publications are banned because their terms prohibit automated redistribution. The platform covers public data and open-web content well, but lacks the breadth of traditional aggregators.
- **No server-side generation.** Editions are static JSON. Without an AI agent visiting the page, no new content appears.
- **Client-side only.** All data lives in localStorage. No cross-device sync, no shared editions.
- **Chrome only.** WebMCP requires Chrome 146+ with a flag enabled. Not yet in Firefox, Safari, or mobile browsers.

## Future Plans

- **Creator access program.** Invite YouTubers, journalists, and Bluesky authors to grant redistribution rights. Grow from ~90 to 500+ approved sources.
- **Community source lists.** Forkable, versioned source lists anyone can customize. A climate researcher curates climate sources. A teacher builds a current-events list.
- **Server-side AI curation.** Cloud-hosted agents that do real AI curation on a schedule — searching the web, writing original summaries, making editorial choices. Fully autonomous operation without requiring the user to keep a browser tab open.
- **Server-side generation + hosted tier.** Scheduled Cloud Functions for daily editions. Free self-hosted PWA, paid tier with cloud sync and premium sources.

## License

Apache-2.0. © 2026 Nestuary Wellness Inc.
