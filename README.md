# DailyPress

AI-curated newspaper with WebMCP tools — built for the [WebMCP Challenge](https://webmcp.dev).

**Live:** (deploying)

## What it does

A static newspaper PWA that aggregates news from legally-cleared sources and exposes 9 WebMCP tools so browser AI agents can read, search, and summarize the edition alongside you.

## WebMCP Tools

| Tool | Description |
|------|-------------|
| `get_edition` | Today's full edition (sections, stories, metadata) |
| `get_reading_context` | What the user is currently reading |
| `search_stories` | Full-text search across the edition |
| `get_story` | Single story by ID with full content |
| `summarize` | AI-generated summary of a story or section |
| `get_section` | All stories in a section |
| `get_sources` | Source attribution and licensing info |
| `get_trending` | Top stories by engagement signals |
| `bookmark` | Save a story for later (write tool) |

## Stack

- Pure static HTML/CSS/JS on Vercel
- `edition.json` generated daily at 6 AM UTC via GitHub Actions
- Sources: Hacker News, Federal Reserve, NOAA, EurekAlert, NVD, Polymarket

## License

MIT
