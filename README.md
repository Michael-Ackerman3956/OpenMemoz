# DailyPress — newsroom-agent

An agent-readable, dark-mode newspaper. Built for the [WebMCP Challenge](https://webmcp.dev).

DailyPress renders a daily edition from legally-cleared sources and exposes six WebMCP tools via `document.modelContext`, so a browser AI agent can read, search, filter, and cross-reference the edition alongside the human reader — with explicit provenance on every story.

## WebMCP Tools

| Tool | Description |
|------|-------------|
| `newsroom.get_edition` | Edition overview: date, sections, headlines with provenance tiers |
| `newsroom.search_stories` | Keyword search across headlines and excerpts, optional section filter |
| `newsroom.get_story` | Full story detail: licence basis, attribution, citations |
| `newsroom.get_reading_context` | What the reader is currently viewing (active filter, visible stories) |
| `newsroom.set_section_filter` | Filter the page to one section, or `ALL` — the UI updates live |
| `newsroom.explain_connections` | Thematic relationships between today's stories |

## Provenance tiers

- **Tier 1** (teal badge) — the source's own text; may be quoted directly.
- **Tier 2** (amber badge) — AI-synthesized from public records; carries a `citations` array and must not be presented as a direct quote.

Tool descriptions carry these rules so agents handle each story correctly.

## Architecture (MVVM)

- **Model** — `src/lib/types.ts`, `public/edition.json`
- **ViewModel** — `src/lib/viewmodels/useEditionViewModel.ts` (edition state, section filtering, story selection, WebMCP tool registration)
- **View** — `src/app/` pages and `src/components/` (pure presentation)

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000 in a WebMCP-capable browser. Tools register automatically when `document.modelContext` is present; the page works as a normal newspaper without it.

## Stack

Next.js 14 · React 18 · TypeScript · Tailwind CSS

## Sources

Hacker News · Federal Reserve · NOAA · EurekAlert · ScienceDaily · NVD · TechCrunch · NASA · SEC EDGAR

## License

Apache-2.0 — © 2026 Nestuary Wellness Inc.
