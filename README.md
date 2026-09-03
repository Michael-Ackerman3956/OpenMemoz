# OpenMemoz

**AI-Powered Content Platform: AI Agents Write, Humans Edit**

Built for the [WebMCP Challenge](https://webmcp.dev) | [Live Demo](https://open-memoz.vercel.app)

![OpenMemoz edition view](https://pub-c29eb1221b564175a121442d1144af7e.r2.dev/screenshots/edition-hero-above-fold.png)

OpenMemoz is a personal content library where AI agents curate the news and you decide what to read. It exposes **31 WebMCP tools** via `document.modelContext.registerTool()`, so any AI agent (ChatGPT, Claude, Gemini) can visit the page, discover the tools, and operate the newsroom: searching stories, discovering content from YouTube, Bluesky, and Mastodon, writing original articles, embedding videos, and reshaping the layout. All content is sourced exclusively from ~90 approved open-licensed sources, with ~280 banned domains enforced at the tool level.

---

## How It Works

The page is the API. AI agents visiting the page *are* the editorial team. No backend, no API keys.

### Why WebMCP?

Content curation requires judgment across many dimensions: source credibility, topic relevance, visual variety, section balance. WebMCP makes the page itself the API surface. The agent visits, discovers tools, and curates content. The human stays in control: directing the agent, choosing what to read, deciding what to watch. Together, they build a personal content library that neither could create alone.

### Content Safety as Infrastructure

Most AI content platforms enforce safety through prompts. Prompts can be overridden. OpenMemoz enforces safety in code: the allowlist (~90 sources) and banned list (~280 domains) are validated in the tool's `execute` function. No prompt engineering can bypass it.

This is simple by design. Simple means any page can adopt the same pattern. The allowlist/banned list becomes a composable, forkable content safety standard for the AI-native web. Any agent visiting any WebMCP page with this pattern gets the same guardrails automatically, whether human-initiated or fully autonomous.

![The newsroom model: structural guardrails work at any level of autonomy](https://pub-c29eb1221b564175a121442d1144af7e.r2.dev/screenshots/slide-10.png)

### Process Flow

![WebMCP process flow: User to Agent to tools to validation to localStorage to live page update](https://pub-c29eb1221b564175a121442d1144af7e.r2.dev/screenshots/slide-06.png)

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

## WebMCP Tools (31)

### Read (15 tools)

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

### Discover (3 tools)

| Tool | Description |
|------|-------------|
| `discover_youtube_content` | RSS-based video discovery |
| `discover_bluesky_trending` | Bluesky public API search |
| `discover_mastodon_trending` | Mastodon trending links |

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

Visit **[open-memoz.vercel.app](https://open-memoz.vercel.app)** with ChatGPT Codex or any WebMCP-compatible agent.

### Self-host

```bash
git clone https://github.com/Michael-Ackerman3956/OpenMemoz.git
cd OpenMemoz
npm install
npm run dev
```

### Testing WebMCP tools

**Chrome DevTools:** Chrome 149+ with `chrome://flags/#enable-webmcp-testing` enabled, then DevTools > Application > WebMCP panel.

---

## Architecture

```
src/
├── app/                    # Next.js pages
│   ├── page.tsx            # Main PWA entry
│   ├── demo/page.tsx       # WebMCP demo harness
│   └── api/                # CORS proxies (YouTube, Bluesky, Mastodon)
├── components/
│   ├── EditionSheet.tsx    # Dynamic + simple layout renderer
│   ├── HeroStory.tsx       # Hero (video / image / text variants)
│   ├── SettingsScreen.tsx  # Theme and preference controls
│   └── InterestsScreen.tsx # Topic interest weights
└── lib/
    ├── webmcp.ts           # 31 WebMCP tool definitions
    ├── types.ts            # Story and Edition interfaces
    ├── layoutRuleEngine.ts # Newspaper-style layout engine
    ├── curatedSources.ts   # ~90 approved + ~280 banned domains
    ├── themeSystem.ts      # 13 palettes x 4 visual styles
    ├── readingTracker.ts   # Time-on-story engagement tracking
    └── agentMemory.ts      # Persistent agent memory (localStorage)
```

**Stack:** Next.js 14, React 18, TypeScript, Tailwind CSS, Vercel

---

## Limitations

- **Limited source coverage.** Only ~90 approved sources: US government agencies, Creative Commons publishers, and open APIs. Major publications are banned because their terms prohibit automated redistribution. The platform covers public data and open-web content well, but lacks the breadth of traditional aggregators.
- **No server-side generation.** Editions are static JSON. Without an AI agent visiting the page, no new content appears.
- **Client-side only.** All data lives in localStorage. No cross-device sync, no shared editions.
- **Chrome only.** WebMCP requires Chrome 146+ with a flag enabled. Not yet in Firefox, Safari, or mobile browsers.

## Future Plans

- **Creator access program.** Invite YouTubers, journalists, and Bluesky authors to grant redistribution rights. Grow from ~90 to 500+ approved sources.
- **Community source lists.** Forkable, versioned source lists anyone can customize. A climate researcher curates climate sources. A teacher builds a current-events list.
- **Autonomous AI journalists.** Agents that discover, research, write, and publish on a schedule. Multiple agents covering different beats. OpenMemoz becomes a living, self-updating newspaper.
- **Server-side generation + hosted tier.** Scheduled Cloud Functions for daily editions. Free self-hosted PWA, paid tier with cloud sync and premium sources.

## Demo Video

*Coming soon*

## License

Apache-2.0. © 2026 Nestuary Wellness Inc.
