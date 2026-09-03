# DailyPress — Infrastructure & Delivery Concept

Extracted from AutoCast EM-4 spec (2026-07-23) + WebMCP Strategy deck.

## Architecture Overview

```
Sources (RSS/API)  →  Build Step (AI)  →  edition.json  →  Static Site (Vercel)
                                                          ↓
                                                   R2 (assets/archive)
                                                          ↓
                                              Email Pipeline (CF Workers + D1)
                                                          ↓
                                              Subscribers (interest-filtered)
```

## Hosting & Storage

| Layer | Provider | Cost | Rationale |
|-------|----------|------|-----------|
| Static site | Vercel (Hobby) | $0 | Instant HTTPS, preview deploys, easy judge URL |
| Asset storage | Cloudflare R2 | $0 | Zero egress, S3-compatible, 10GB free |
| Email sending | CF Email Service | ~$5/mo | 3K emails included, auto SPF/DKIM/DMARC |
| Subscriber DB | Cloudflare D1 | $0 (free tier) | SQLite at edge, 5GB free |
| Automation | CF Workers | $0–$5/mo | Cron triggers, outbox queue |

Total: $0–$5/mo.

## Email / Newsletter Delivery (EM-4)

From AutoCast spec — shared infrastructure, separate subscriber list:

- **Daily 6 AM cron**: AI content pipeline generates newspaper HTML
- **Per-subscriber interest filtering** via custom fields
- **Outbox queue**: D1 table, Workers cron pops every 15 min
- **Template system**: React Email (TypeScript, MSO-conditional Outlook markup)
- **Subscriber management**: pfstr/newsletter-template (MIT, Workers+D1, double opt-in, RFC 8058)
- **Separate from product emails** via `list_id` column
- **Bounce handling**: hard-bounce suppress, soft-bounce retry 2x then 7-day suppress
- **Tracking**: CF Workers Analytics Engine (open/click), optional

## Content Pipeline (to be built)

- **Tier 1**: Fetch cleared RSS/API → display as-is with attribution
- **Tier 2**: AI reads multiple sources via search grounding → generates 2-3 sentence summary with visible citations
- Output: `edition.json` containing all stories for the day

## WebMCP Layer

Nine tools exposed via `document.modelContext`:
- Reading: get_edition, search_stories, get_story, get_reading_context, explain_connections
- Presentation: set_layout_mode
- Editing tomorrow: get_interests, adjust_interest, add_source

Tools dynamically registered per page view (Chrome guidance compliance).

## Key Decisions

- **Vercel Hobby** = non-commercial only. Needs Pro ($20/mo) if DailyPress ever charges.
- **R2 over S3**: $0 egress is essential for a free newspaper product.
- **No database for content**: edition.json is a static file. Tools read it client-side.
- **Snapshot committed**: Demo never depends on live fetch. `edition.json` checked into repo.
- **License**: AGPLv3 (matching MailPidge CE). CLA before accepting contributions.
