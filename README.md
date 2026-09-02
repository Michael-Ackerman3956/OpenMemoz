# DailyPress — newsroom-agent

An agent-readable, dark-mode newspaper. Built for the [WebMCP Challenge](https://webmcp.dev).

DailyPress renders a daily edition from legally-cleared sources and exposes **10 WebMCP tools** via `document.modelContext`, so a browser AI agent can read, search, filter, create, and edit stories alongside the human reader — with explicit provenance on every story.

## Live URL

**https://newsroom-agent-mcp.vercel.app**

## WebMCP Tools

### Read Tools

| Tool | Description |
|------|-------------|
| `newsroom.get_edition` | Edition overview: date, sections, headlines with provenance tiers |
| `newsroom.search_stories` | Keyword search across headlines and excerpts, optional section filter |
| `newsroom.get_story` | Full story detail: licence basis, attribution, citations |
| `newsroom.get_reading_context` | What the reader is currently viewing (active filter, visible stories) |
| `newsroom.set_section_filter` | Filter the page to one section, or `ALL` — the UI updates live |
| `newsroom.explain_connections` | Thematic relationships between today's stories |
| `newsroom.get_youtube_video` | Fetch YouTube transcript + optional Gemini video analysis |

### Write Tools

| Tool | Description |
|------|-------------|
| `newsroom.add_story` | Add a new story — appears as the hero (top of edition) |
| `newsroom.remove_story` | Remove a story by identifier |
| `newsroom.update_story` | Edit headline, excerpt, or section of an existing story |

Write tools update the page instantly and persist to localStorage.

## Testing WebMCP Tools

### Option 1: Chrome DevTools (quickest)

1. Use Chrome 149+ (`chrome://version` to check)
2. Go to `chrome://flags/#enable-webmcp-testing` → **Enabled** → **Relaunch**
3. Open the live URL
4. DevTools (`Cmd+Option+I`) → **Application** tab → **WebMCP** panel
5. Execute each tool and inspect the JSON response

### Option 2: Inspector Extension (best for visual demo)

1. Install [Model Context Tool Inspector](https://chromewebstore.google.com/detail/webmcp-inspector) from Chrome Web Store
2. Enable the Chrome flag (same as above)
3. Visit the live URL → click the extension icon
4. Browse and execute all 10 tools from the side panel

### Option 3: Demo Harness (built-in)

Visit **https://newsroom-agent-mcp.vercel.app/demo** — a split-screen view with the newspaper on the right and a tool control panel on the left. Execute any tool and watch the page update live.

### Option 4: ChatGPT Desktop App (requires paid plan)

1. Open the ChatGPT desktop app (macOS/Windows)
2. Navigate to the live URL in its built-in browser
3. Ask naturally: "What stories are in today's edition?" or "Add a story about AI breakthroughs"

## Provenance Tiers

- **Tier 1** (teal badge) — the source's own text; may be quoted directly.
- **Tier 2** (amber badge) — AI-synthesized from public records; carries a `citations` array and must not be presented as a direct quote.

Tool descriptions carry these rules so agents handle each story correctly.

## Self-Hosting

```bash
git clone https://github.com/NestuaryWellnessInc/Newsroom-agent.git
cd Newsroom-agent
npm install
npm run dev
```

Open http://localhost:3000 in Chrome with the WebMCP flag enabled.

### Environment Variables (optional)

| Variable | Purpose | Where to get it |
|----------|---------|-----------------|
| `GEMINI_API_KEY` | Enables Gemini video analysis in the YouTube tool | Free at [ai.google.dev](https://ai.google.dev) |

**For Vercel deployment:**
1. Vercel Dashboard → your project → **Settings** → **Environment Variables**
2. Add `GEMINI_API_KEY` with your key
3. Deploy

Without the key, the YouTube tool still returns transcript + metadata — Gemini analysis is simply skipped.

## Architecture (MVVM)

- **Model** — `src/lib/types.ts`, `public/editions/`
- **ViewModel** — `src/lib/viewmodels/useEditionViewModel.ts` (edition state, section filtering, story selection, WebMCP tool registration, localStorage persistence)
- **View** — `src/app/` pages and `src/components/` (pure presentation)
- **WebMCP** — `src/lib/webmcp.ts` (all 10 tool definitions and registration)

## Stack

Next.js 14 · React 18 · TypeScript · Tailwind CSS

## Sources

Hacker News · Federal Reserve · NOAA · EurekAlert · ScienceDaily · NVD · TechCrunch · NASA · SEC EDGAR

## License

Apache-2.0 — © 2026 Nestuary Wellness Inc.
