import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = Math.min(parseInt(limitParam || "10", 10), 50);

  try {
    const response = await fetch(
      "https://public.api.bsky.app/xrpc/app.bsky.unspecced.getPopularFeedGenerators",
      {
        headers: { "User-Agent": "OpenMemoz/1.0" },
        signal: AbortSignal.timeout(8000),
      }
    );

    const trendingResponse = await fetch(
      `https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=news&sort=top&limit=${limit}`,
      {
        headers: { "User-Agent": "OpenMemoz/1.0" },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!trendingResponse.ok) {
      return NextResponse.json(
        { error: `Bluesky API returned ${trendingResponse.status}` },
        { status: trendingResponse.status }
      );
    }

    const data = await trendingResponse.json();
    const posts = (data.posts || []).slice(0, limit).map((post: Record<string, unknown>) => {
      const record = post.record as Record<string, unknown> | undefined;
      const author = post.author as Record<string, unknown> | undefined;
      const embed = record?.embed as Record<string, unknown> | undefined;
      const external = embed?.external as Record<string, unknown> | undefined;

      return {
        text: record?.text ?? "",
        authorHandle: author?.handle ?? "",
        authorDisplayName: author?.displayName ?? "",
        createdAt: record?.createdAt ?? "",
        likeCount: post.likeCount ?? 0,
        repostCount: post.repostCount ?? 0,
        replyCount: post.replyCount ?? 0,
        uri: post.uri,
        ...(external ? {
          externalLink: {
            uri: external.uri,
            title: external.title,
            description: external.description,
          },
        } : {}),
      };
    });

    const feedGenerators = response.ok ? await response.json() : null;

    return NextResponse.json({
      postCount: posts.length,
      source: "Bluesky AT Protocol (public API, no auth)",
      posts,
      ...(feedGenerators ? { popularFeedCount: feedGenerators.feeds?.length ?? 0 } : {}),
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Bluesky fetch failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 502 }
    );
  }
}
