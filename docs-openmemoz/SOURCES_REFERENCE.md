# DailyPress — Source & Feed Reference

Compiled 2026-08-27. All sources verified for legal redistribution.

## Already Cleared (from Concept Doc audit — Tier 1)

| Source | Access | Legal Basis | Content |
|--------|--------|-------------|---------|
| SEC EDGAR | Public API | Public domain (17 USC §105) | Filings |
| Federal Reserve Board | Feed | Public domain | Statements, rates |
| BLS / BEA | Public API | Public domain | Economic data releases |
| Hacker News | Firebase API | Official API, permissive | Stories + comments |
| TechCrunch | RSS | Dedicated RSS ToS | Headlines + excerpts |
| MLX / Apple ML | GitHub Releases API | MIT | Release notes |
| ScienceDaily | RSS | Explicit commercial grant | Science news |
| Frontiers in Sports | Feed | CC-BY 4.0 | Research articles |
| PubMed | E-utilities API | Public domain | Biomedical abstracts |
| MercoPress | Feed | Reuse + link-back grant | Latin America news |

## New Sources — Open News (redistributable)

| Source | Access | License | Freshness | Content Type |
|--------|--------|---------|-----------|--------------|
| **Open Newswire** | RSS (feed.opennewswire.org) | CC (varies per article) | Continuous | Aggregated CC news from multiple outlets |
| **RFE/RL** | RSS/web | Explicit redistribution grant (text) | Real-time | Hard news (E. Europe, Central Asia, Iran) |
| **Global Voices** | RSS | CC-BY 3.0 | Every 1-3 days | Citizen journalism, human rights, 50+ langs |
| **The Conversation** | RSS + republish API | CC-BY-ND | Daily | Expert analysis (cannot modify text) |
| **VOA Learning English** | RSS | Public domain | Daily | Simplified world news |

## New Sources — Decentralized / Social

| Source | Access | Auth | Freshness | Use Case |
|--------|--------|------|-----------|----------|
| **Bluesky Jetstream** | WebSocket (wss://jetstream2.us-east.bsky.network) | None | Real-time | Trending topic extraction |
| **Mastodon /trends/links** | REST (any instance) | None | ~5 min | Pre-curated trending news URLs |
| **Mastodon /trends/tags** | REST | None | ~5 min | Trending hashtags |
| **Lobste.rs** | JSON (lobste.rs/hottest.json) | None | ~15 min | Curated tech news |
| **Lemmy** | REST (/api/v3/post/list) | None | ~10 min | Community news discussion |

## New Sources — Government / Institutional

| Source | Endpoint | License | Update Freq | Narrative? |
|--------|----------|---------|-------------|------------|
| **NOAA Alerts** | api.weather.gov/alerts | Public domain | Real-time | YES — full descriptions |
| **USGS Earthquakes** | earthquake.usgs.gov/feed/v1.0/ | Public domain | Every minute | Minimal — structured data |
| **NASA APOD** | api.nasa.gov/planetary/apod | Public domain | Daily | YES — astronomer explanations |
| **Federal Register** | federalregister.gov/api/v1/documents | Public domain | Daily | YES — full regulation text |
| **Congress.gov** | api.congress.gov/v3/ | Public domain | Near real-time | Partial — CRS summaries |
| **FEMA Declarations** | fema.gov/api/open/v2/ | Public domain | As declared | Limited |
| **UN ReliefWeb** | api.reliefweb.int/v1/reports | Open | Multiple/day | YES — humanitarian narratives |
| **WHO Disease Outbreaks** | who.int/api/news/dons | CC BY-NC-SA | As events | YES — epidemiological narrative |
| **ECB Press Releases** | ecb.europa.eu/rss/press.html | Open reuse | As released | YES — monetary policy |
| **UK Hansard** | hansard-api.parliament.uk | Open Parliament Licence | Same-day | YES — debate transcripts |
| **GDELT** | api.gdeltproject.org/api/v2/doc/doc | Free | Every 15 min | Metadata + URLs (discovery) |
| **Polymarket** | gamma-api.polymarket.com/markets | Public API | Real-time | Prediction probabilities |
| **Metaculus** | metaculus.com/api2/questions/ | Public API | Continuous | Forecasts + reasoning |

## New Sources — Science / Academic

| Source | Endpoint | License | Newsworthy? |
|--------|----------|---------|-------------|
| **EurekAlert** | eurekalert.org/rss/ | Media redistribution | YES — press releases for general readers |
| **Phys.org** | phys.org/rss-feed/ | Free personal+commercial | YES — ~98 stories/day |
| **arXiv** | export.arxiv.org/api/ | CC0 (metadata) | Only with signal detection (citation velocity) |
| **OpenAlex** | api.openalex.org/works | CC0 | Signal detection layer (citation counts) |
| **Semantic Scholar** | api.semanticscholar.org/ | Free research use | Signal detection (influential citations) |
| **NVD/CVE** | services.nvd.nist.gov/rest/json/cves/2.0 | Public domain | YES — critical vulnerabilities (CVSS ≥9.0) |
| **CISA Advisories** | cisa.gov/news-events/cybersecurity-advisories.xml | Public domain | YES — security advisories |
| **Global Forest Watch** | data-api.globalforestwatch.org/ | CC-BY 4.0 | Deforestation events |

## NOT Usable (confirmed)

- Reddit, X/Twitter, Instagram, Medium — all copyrighted, no redistribution
- AP, Reuters — commercial wire services, paid only
- BBC, Al Jazeera, France24, NHK — all rights reserved
- Wikinews — closed May 2026
- Swissinfo — private use only

## Signal Detection Strategy (for making academic content "newsworthy")

1. EurekAlert + Phys.org → already curated for general readers
2. arXiv paper → Semantic Scholar citation velocity (20+ in first week = news)
3. NVD CVE → CVSS ≥ 9.0 or CISA KEV inclusion = always newsworthy
4. GitHub → repos gaining 500+ stars in 24h
5. Polymarket odds shift > 20% in 24h = story hook

## Recommended Day-1 Stack (6 sources for WebMCP challenge)

1. Hacker News (Firebase API)
2. Federal Reserve (RSS)
3. NOAA Alerts (api.weather.gov)
4. EurekAlert (RSS)
5. NVD/CVE (REST, CVSS ≥9.0 filter)
6. Polymarket (REST, top movers)

Covers: tech, economy, weather, science, security, predictions — six sections, zero legal risk, all public domain or explicitly open.
