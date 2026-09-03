# Competitive Research: AI News Agents (Aug 2026)

## Key Finding
None of these projects use WebMCP. All push content to users. DailyPress exposes content for agents to pull — that's the differentiator.

---

## Projects Analyzed

### 1. NewsAgent-Pro (Eatosin) — MOST RELEVANT
- **What:** Autonomous AI newsroom — research, write, self-correct, design in ~60s
- **Stack:** Python, LangGraph, Groq (Llama 3.3), Gemini 2.5, Tavily API, Flux.1-Schnell (images), Streamlit
- **Pipeline:** Planner → Researcher → Writer → Critic → Designer
- **Key pattern:** Self-correction loop (grades 1-10, rewrites until threshold met)
- **Source:** Tavily API (last 48h, structured, prevents hallucination)

### 2. riksdagsmonitor (Hack23) — CLOSEST ARCHITECTURE
- **What:** Swedish political AI newsroom from official open data
- **Stack:** TypeScript, GitHub Actions, static HTML output
- **Key pattern:** Static site generated entirely from Actions — no server. Multi-language (14 langs).
- **Basically our architecture:** Actions → build → deploy

### 3. AI-Brief (Rohit8y) — SIMPLEST USEFUL
- **What:** Daily AI digest → Telegram
- **Stack:** Python, Groq/Anthropic, GitHub Actions cron, Reddit JSON + HN + RSS
- **Key patterns:** Signal-strength scoring, config-driven source list (YAML), Actions as scheduler

### 4. newsroom-agentuity (Agentuity)
- **What:** Multi-agent swarm — collect, filter, edit, publish + podcast
- **Stack:** TypeScript, Bun, Agentuity SDK, Firecrawl
- **Key patterns:** EditorInChief orchestrator, filter agent with dedup, podcast TTS derivative

### 5. Journalist's Toolbox AI Agents (curated list)
- **Perigon MCP** — pre-clustered stories from 100k+ publications, verified bylines, metadata. Perfect source.
- **Brave Search MCP** — real-time semantic search for freshness verification
- **coJournalist V2** — "scouts" that monitor pages/civic sources, stores in vector DB

### 6. News_Agent (dhruvldrp9)
- **What:** Flask chat + voice assistant for news
- **Stack:** Python, Flask, SerpAPI, GPT-3.5, ElevenLabs TTS, Supabase, deployed on Vercel
- **Key pattern:** Vercel Python serverless deployment works. Regional filtering.

---

## Patterns to Steal

| Pattern | Source | Priority |
|---------|--------|----------|
| Critic loop (grade → rewrite until quality) | NewsAgent-Pro | HIGH |
| GitHub Actions as full build orchestrator | riksdagsmonitor, AI-Brief | HIGH |
| Signal scoring for layout placement | AI-Brief | HIGH |
| Perigon MCP as pre-clustered source | Journalist's Toolbox | HIGH |
| Tavily API for real-time news (48h) | NewsAgent-Pro | MEDIUM |
| Config-driven YAML source list | AI-Brief | MEDIUM |
| Filter/dedup before writing | newsroom-agentuity | MEDIUM |
| AI image gen for hero art (Flux.1) | NewsAgent-Pro | LOW |
| Multi-language generation | riksdagsmonitor | LOW |
| Podcast/TTS derivative | newsroom-agentuity | LOW |

---

## DailyPress Differentiator

```
Them:  AI → generates content → pushes to user (Telegram, Streamlit, email)
Us:    AI → generates edition.json → static page → agent discovers WebMCP tools → structured interaction
```

Same content pipeline, different delivery. The newspaper is for humans. The tools are for agents. Same page, two audiences.

---

## Relevant Links
- https://github.com/Eatosin/NewsAgent-Pro
- https://github.com/Hack23/riksdagsmonitor
- https://github.com/Rohit8y/AI-Brief
- https://github.com/agentuity/newsroom-agentuity
- https://journaliststoolbox.ai/ai-agents/
- https://github.com/dhruvldrp9/News_Agent
- https://github.com/topics/ai-news-agent
