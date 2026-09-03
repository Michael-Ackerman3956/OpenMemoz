import { NextRequest, NextResponse } from "next/server";

const MASTODON_INSTANCES = [
  "mastodon.social",
  "hachyderm.io",
  "fosstodon.org",
];

export async function GET(request: NextRequest) {
  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = Math.min(parseInt(limitParam || "10", 10), 40);
  const instance = request.nextUrl.searchParams.get("instance") || "mastodon.social";

  try {
    const [linksResponse, tagsResponse] = await Promise.all([
      fetch(`https://${instance}/api/v1/trends/links?limit=${limit}`, {
        headers: { "User-Agent": "OpenMemoz/1.0" },
        signal: AbortSignal.timeout(8000),
      }),
      fetch(`https://${instance}/api/v1/trends/tags?limit=10`, {
        headers: { "User-Agent": "OpenMemoz/1.0" },
        signal: AbortSignal.timeout(8000),
      }),
    ]);

    if (!linksResponse.ok) {
      return NextResponse.json(
        { error: `Mastodon ${instance} returned ${linksResponse.status}` },
        { status: linksResponse.status }
      );
    }

    const linksData = await linksResponse.json();
    const tagsData = tagsResponse.ok ? await tagsResponse.json() : [];

    const trendingLinks = (linksData as Array<Record<string, unknown>>).map((link) => ({
      url: link.url,
      title: link.title,
      description: link.description,
      authorName: link.author_name || null,
      publisherName: link.provider_name || null,
      imageUrl: link.image || null,
      sharesCount: link.history
        ? (link.history as Array<Record<string, string>>).reduce(
            (sum, day) => sum + parseInt(day.uses || "0", 10), 0
          )
        : 0,
    }));

    const trendingTags = (tagsData as Array<Record<string, unknown>>).map((tag) => ({
      name: tag.name,
      url: tag.url,
      totalUses: tag.history
        ? (tag.history as Array<Record<string, string>>).reduce(
            (sum, day) => sum + parseInt(day.uses || "0", 10), 0
          )
        : 0,
    }));

    return NextResponse.json({
      instance,
      availableInstances: MASTODON_INSTANCES,
      source: "Mastodon ActivityPub (public API, no auth)",
      trendingLinkCount: trendingLinks.length,
      trendingLinks,
      trendingTagCount: trendingTags.length,
      trendingTags,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Mastodon fetch failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 502 }
    );
  }
}
