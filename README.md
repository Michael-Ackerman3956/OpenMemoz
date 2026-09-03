# OpenMemoz

An AI-powered content platform. Built for the [WebMCP Challenge](https://webmcp.dev).

OpenMemoz is an open-core CMS where AI agents are writers and humans are editors. It exposes **32 WebMCP tools** via `document.modelContext`, so a browser AI agent can read, search, create, edit, and curate content alongside the human — using only legally-cleared sources.

## Live URL

**https://newsroom-agent-mcp.vercel.app**

## WebMCP Tools (32)

### Read Tools

| Tool | Description |
|------|-------------|
| `openmemoz.get_edition` | Edition overview: date, sections, headlines |
| `openmemoz.list_editions` | List all available editions |
| `openmemoz.search_stories` | Keyword search across headlines and excerpts |
| `openmemoz.get_story` | Full story detail |
| `openmemoz.get_reading_context` | What the reader is currently viewing |
| `openmemoz.explain_connections` | Thematic relationships between stories |
| `openmemoz.get_youtube_video` | Fetch YouTube transcript + optional Gemini analysis |
| `openmemoz.get_user_interests` | Read user topic preferences and weights |
| `openmemoz.get_reading_history` | Reading behavior and engagement data |
| `openmemoz.recall_memories` | Retrieve agent-stored facts |
| `openmemoz.get_favourites` | List bookmarked stories |
| `openmemoz.get_theme` | Current color palette and visual style |
| `openmemoz.get_approved_sources` | Curated list of approved open-licensed sources |
| `openmemoz.get_banned_domains` | Banned domains list |
| `openmemoz.export_data` | Export all data as JSON |

### Write Tools

| Tool | Description |
|------|-------------|
| `openmemoz.add_story` | Add a new story with source validation |
| `openmemoz.remove_story` | Remove a story by identifier |
| `openmemoz.update_story` | Edit headline, excerpt, or section |
| `openmemoz.set_hero_story` | Promote a story to hero position |
| `openmemoz.batch_add_stories` | Add multiple stories at once |
| `openmemoz.batch_remove_stories` | Remove multiple stories at once |
| `openmemoz.reorder_story` | Change story position in edition |
| `openmemoz.toggle_favourite` | Bookmark/unbookmark a story |
| `openmemoz.save_memory` | Store a fact for later recall |
| `openmemoz.set_section_filter` | Filter to one section |
| `openmemoz.set_color_palette` | Change the color theme |
| `openmemoz.set_visual_style` | Switch visual style (flat/glass/neu/paper) |
| `openmemoz.clear_user_data` | Clear localStorage data |

### Discovery Tools

| Tool | Description |
|------|-------------|
| `openmemoz.discover_youtube_content` | RSS-based video discovery from curated channels |
| `openmemoz.discover_bluesky_trending` | Search Bluesky public API |
| `openmemoz.discover_mastodon_trending` | Mastodon trending links and tags |

Write tools update the page instantly and persist to localStorage.

## Content Model

AI agents generate original content from curated, legally-cleared sources:
- **Government open data** (16 countries)
- **Creative Commons** licensed content
- **YouTube** (RSS discovery, transcript extraction)
- **Bluesky** (decentralized, public API)
- **Mastodon** (ActivityPub, public API)

Sources are enforced via `APPROVED_SOURCES` and `BANNED_DOMAINS` lists in `src/lib/curatedSources.ts`.

## Testing WebMCP Tools

### Chrome DevTools

1. Chrome 149+ with `chrome://flags/#enable-webmcp-testing` → **Enabled**
2. Open the live URL
3. DevTools → **Application** tab → **WebMCP** panel

### Demo Harness (built-in)

Visit the live URL + `/demo` — split-screen with tool controls on the left.

## Self-Hosting

```bash
git clone https://github.com/NestuaryWellnessInc/Newsroom-agent.git
cd Newsroom-agent
npm install
npm run dev
```

### Environment Variables (optional)

| Variable | Purpose |
|----------|---------|
| `GEMINI_API_KEY` | Enables Gemini video analysis in YouTube tool |

## Architecture (MVVM)

- **Model** — `src/lib/types.ts`, `public/editions/`
- **ViewModel** — `src/lib/viewmodels/useEditionViewModel.ts`
- **View** — `src/app/` pages and `src/components/`
- **WebMCP** — `src/lib/webmcp.ts` (32 tool definitions)
- **Curated Sources** — `src/lib/curatedSources.ts` (approved + banned lists)

## Stack

Next.js 14 · React 18 · TypeScript · Tailwind CSS

## License

Apache-2.0 — © 2026 Nestuary Wellness Inc.
