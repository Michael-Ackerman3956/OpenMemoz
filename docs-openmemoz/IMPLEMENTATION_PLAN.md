# DailyPress — Implementation Plan (Detailed)

Working document. Last updated 2026-08-27.

## Architecture

```
Sources (RSS/API/Firehose)
    │
    ├── Tier 1: Direct Pull (as-is, attributed)
    │   └── feedparser + API calls → headline + excerpt + link
    │
    └── Tier 2: AI-Synthesized (generated, cited, disclosed)
        └── Gemini Search Grounding → 2-3 sentence summary + citations
    │
    ▼
Content Store (edition.json)
    │ tagged by tier, source, licence, timestamp
    ▼
AI Editor Agent
    │ select, rank, arrange — never rewrites Tier 1
    ▼
Layout Engine (3 CSS modes)
    │ Dynamic | Traditional | Simple
    ▼
Delivery
    ├── Static site (Vercel) + WebMCP tools
    ├── Email newsletter (CF Workers + D1)
    └── RSS output feed
```

## Two-Tier Content Model

### Tier 1 — Direct Pull
- Source's own text displayed verbatim
- Headline + excerpt + link-out
- Never rewritten, never AI-touched
- Badge: solid source link (e.g. "Federal Reserve Board ↗")
- Legal basis: explicit API/RSS ToS, CC license, or public domain

### Tier 2 — AI-Synthesized
- AI reads multiple sources via search grounding
- Generates 2-3 sentence ORIGINAL summary
- Never uses verbatim text from any single source
- Visible citations (source names + links)
- Badge: dashed border "✦ AI Summary · synthesized from X, Y, Z"
- Legal position: contested (News Corp v. Perplexity precedent)
- Rule: never claim verification, never present as a quote

## Phased Rollout

### Phase 1 — Static Generator (2 weeks)
- Hardcode Tier 1 sources (6-10 cleared feeds)
- Optionally add Tier 2 for world/positive/local (skip if tight)
- Claude API: select top 8-12 stories, arrange
- Ship all 3 layout modes (CSS only, same content)
- Cron: generate once daily at 6 AM
- Host on Vercel (free), assets on R2
- Deliverable: one newspaper page per day, same for all users

### Phase 2 — Personalization (3-4 weeks)
- User onboarding: pick interest tags
- Embedding-based ranking (all-MiniLM or Voyage AI)
- Cosine similarity: score articles against user interest vector
- Per-user edition generation
- Email delivery (morning edition via CF Workers)

### Phase 3 — Smart Layout & Analytics (3-4 weeks)
- AI auto-mode: picks layout based on content mix
- Per-mode engagement tracking (open rate, scroll depth, clicks)
- Per-user layout learning
- A/B testing framework

### Phase 4 — Conversational Customization (2-3 weeks)
- "Show me more X" → adjusts interest weights
- "I don't care about Y" → hard filter
- "Add my company blog" → custom RSS injection
- WebMCP replaces chat UI — agent calls typed tools directly

## Tech Stack

**Client: PWA (Progressive Web App)**
- Astro (zero-JS by default, React islands for WebMCP interactivity)
- Service worker: offline cache of edition.json + assets
- Push notifications (iOS 16.4+, Android, desktop)
- "Add to Home Screen" — no app store needed
- CSS view transitions for native-feel page navigation
- Why not native/Flutter: WebMCP requires a real browser tab; app store review too slow; editorial typography is better in CSS than any cross-platform framework

**Page-Flip Effect (core UX feature)**
- Library: StPageFlip (MIT, pure JS, no deps, ~1.5K stars) — most realistic web page-turn available
- Full corner-peel with shadow gradients, paper thickness illusion
- Touch-follow: finger drags the page in real-time (pointer events + rAF)
- CSS 3D transforms: `rotateY()` + `perspective()` + `backface-visibility`
- GPU-composited (`will-change: transform`) for 60fps
- Swipe left/right = next/prev story, swipe up = scroll within story
- Applied to ALL layout modes (not just Traditional)
- Settings toggle: "Reduce motion" disables flip, falls back to instant cut
- Target: indistinguishable from native UIPageViewController on 2022+ devices

| Component | Tool | Cost/mo |
|-----------|------|---------|
| Frontend framework | Astro + React islands | $0 |
| Tier 1 fetch | Python + feedparser + API calls | $0 |
| Tier 2 synthesis | Gemini API (Search Grounding) | ~$5-20 |
| AI Editor | Claude API (selection + headlines) | ~$5-15 |
| Embeddings | Voyage AI or local all-MiniLM | $0-5 |
| Hosting | Vercel (Hobby) | $0 |
| Storage | Cloudflare R2 | $0 |
| Email | CF Workers + D1 + CF Email Service | ~$5 |
| Subscriber DB | Cloudflare D1 | $0 |
| **Total (1K users)** | | **~$10-45/mo** |

## WebMCP Tools (9 total)

### Reading (5)
| Tool | Kind | Does |
|------|------|------|
| `get_edition` | read | Today's paper: sections, story count, date |
| `search_stories` | read | Find stories by query, returns tier + source |
| `get_story` | read | One story in full with licence and citations |
| `get_reading_context` | read | What the reader is looking at right now |
| `explain_connections` | read | Why today's stories relate |

### Presentation (1)
| Tool | Kind | Does |
|------|------|------|
| `set_layout_mode` | write | Switch Dynamic/Traditional/Simple |

### Editing Tomorrow (3)
| Tool | Kind | Does |
|------|------|------|
| `get_interests` | read | Current interest graph |
| `adjust_interest` | write | Boost or mute a topic (reversible) |
| `add_source` | write | Add a feed (staged, not live) |

### Deliberately NOT exposed
- `publish_edition` — a person decides when an edition exists
- `delete_source` — destructive, silent; muting is reversible
- `rewrite_story` — Tier 1 text is never rewritten
- `promote_to_tier_1` — only a licence audit moves tiers

### Dynamic registration
- Front page: `get_edition`, `search_stories`
- Story open: + `get_reading_context`, `explain_connections`
- Settings: + `adjust_interest`, `add_source`

## Provenance Model

Every story carries:
```json
{
  "headline": "Fed Holds Rates Steady",
  "tier": 1,
  "source": "Federal Reserve Board",
  "licence": "public domain · 17 U.S.C. §105",
  "url": "https://...",
  "fetched_at": "2026-08-27T06:00:00Z"
}
```

Agent knows what it can trust. Tier 1 = quotable. Tier 2 = generated, cite with caveat.

## Interest Graph (v1: embedding-based)

- User picks 5-10 interest tags at onboarding
- Tags → embeddings via all-MiniLM-L6-v2 (local, free)
- Articles → embeddings (title + excerpt)
- Rank by cosine similarity against user vector
- No cold-start problem (tags work with zero history)
- Phase 3+: collaborative filtering (LensKit, Implicit)

## Monetization

### Free ($0)
- 1 daily edition (mass-produced)
- 10 pre-built interest profiles
- Traditional + Simple modes only
- Web-only, no email
- "Powered by DailyPress" watermark

### Personal Edition ($4.99/mo)
- Custom interest graph (unlimited tags, custom sources)
- All 3 layout modes + AI auto-mode
- Morning email delivery + web archive
- "Talk to your editor" (WebMCP)
- No watermark, shareable

## Competitive Landscape

- **Artifact** (dead Jan 2024) — great personalization, poor monetization
- **Flipboard** — magazine feel, not AI-personalized layout
- **Apple News** — human editors, $12.99/mo, not personal
- **Morning Brew** — newsletter, not visual newspaper
- **The Browser / Refind** — link lists, not newspaper layout
- **Gap**: nobody does AI-generated editorial DESIGN — layout itself as personalized output

## Key Legal Positions

1. **Tier 1 safe**: explicit API/RSS terms, CC, or public domain
2. **Tier 2 contested**: AP v. Meltwater (2013) sank verbatim redisplay; News Corp v. Perplexity contests synthesis
3. **Mitigation**: visible citations, never claim verification, disclose AI generation
4. **Not usable**: Reddit, X, Instagram, Medium, AP, Reuters, BBC, Al Jazeera

## 8-Day WebMCP Challenge Schedule

| Day | Deliverable |
|-----|-------------|
| 1 | Repo, licence, Vercel deploy, register one dummy tool |
| 2 | Tier 1 fetch → edition.json, real content on screen |
| 3 | Three layout modes + provenance badges |
| 4 | Five reading tools |
| 5 | Layout + interest tools, dynamic registration |
| 6 | Test with real agent, fix descriptions |
| 7 | Video, README, source-and-licence table |
| 8 | Buffer, submit early |

## Submission Requirements

- Public repo with visible licence file (AGPLv3)
- Video showing agent calling a tool
- Working URL (Vercel link, no credentials)
- Declare concept pre-dates Aug 25; code does not
- Freeze: Sep 3, 1:00pm PDT
