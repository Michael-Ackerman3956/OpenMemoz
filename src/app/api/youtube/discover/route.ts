import { NextRequest, NextResponse } from "next/server";

interface YouTubeChannelFeed {
  channelId: string;
  channelName: string;
  category: string;
}

const CURATED_YOUTUBE_CHANNELS: YouTubeChannelFeed[] = [
  // Tech & Science
  { channelId: "UCBcRF18a7Qf58cCRy5xuWwQ", channelName: "WIRED", category: "Tech" },
  { channelId: "UCVHFbqXqoYvEWM1Ddxl0QDg", channelName: "Android Authority", category: "Tech" },
  { channelId: "UCXGgrKt94gR6lmN4aN3mYTg", channelName: "Austin Evans", category: "Tech" },
  { channelId: "UCddiUEpeqJcYeBxX1IVBKvQ", channelName: "The Verge", category: "Tech" },
  { channelId: "UC9-y-6csu5WGm29I7JiwpnA", channelName: "Computerphile", category: "Tech" },
  { channelId: "UCYO_jab_esuFRV4b17AJtAw", channelName: "3Blue1Brown", category: "Science" },
  { channelId: "UCHnyfMqiRRG1u-2MsSQLbXA", channelName: "Veritasium", category: "Science" },
  { channelId: "UC6nSFpj9HTCZ5t-N3Rm3-HA", channelName: "Vsauce", category: "Science" },
  { channelId: "UCsXVk37bltHxD1rDPwtNM8Q", channelName: "Kurzgesagt", category: "Science" },

  // News & Analysis
  { channelId: "UCupvZG-5ko_eiXAupbDfxWw", channelName: "CNN", category: "World" },
  { channelId: "UCIRYBXDze5krPDzAEOxFGVA", channelName: "PBS NewsHour", category: "World" },
  { channelId: "UCeY0bbntWzzVIaj2z3QigXg", channelName: "NBC News", category: "World" },
  { channelId: "UC16niRr50-MSBwiO3YDb3RA", channelName: "Bloomberg", category: "Finance" },
  { channelId: "UCIALMKvObZNtJ6AmdCLP7Lg", channelName: "CNBC", category: "Finance" },
  { channelId: "UCCjyq_K1Xwfg8Lndy7lKMpA", channelName: "Reuters", category: "World" },

  // Space
  { channelId: "UCLA_DiR1FfKNvjuUpBHmylQ", channelName: "NASA", category: "Space" },
  { channelId: "UCw95GNJSyR4_RjBRGGxbhIA", channelName: "Everyday Astronaut", category: "Space" },
  { channelId: "UC6uKrU_WqJ1R2HMTY3LIx5Q", channelName: "Astrum", category: "Space" },

  // Sports
  { channelId: "UCqZQlzSHbVJrwrn5XvzrfoA", channelName: "Sky Sports Football", category: "Sports" },
  { channelId: "UCGYCw7PjAP6zHjJLkhJPNYg", channelName: "ESPN FC", category: "Sports" },

  // Health
  { channelId: "UCaR-e8ComPih10DqPi3sdWg", channelName: "Healthcare Triage", category: "Health" },
];

function parseAtomFeed(xmlText: string, channel: YouTubeChannelFeed) {
  const entries: Array<{
    videoId: string;
    title: string;
    channelName: string;
    category: string;
    publishedAt: string;
    videoUrl: string;
    thumbnailUrl: string;
  }> = [];

  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;
  while ((match = entryRegex.exec(xmlText)) !== null) {
    const entry = match[1];
    const videoIdMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
    const titleMatch = entry.match(/<title>([^<]+)<\/title>/);
    const publishedMatch = entry.match(/<published>([^<]+)<\/published>/);

    if (videoIdMatch && titleMatch) {
      const videoId = videoIdMatch[1];
      entries.push({
        videoId,
        title: titleMatch[1],
        channelName: channel.channelName,
        category: channel.category,
        publishedAt: publishedMatch?.[1] ?? "",
        videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      });
    }
  }

  return entries;
}

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get("category");
  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = Math.min(parseInt(limitParam || "10", 10), 50);

  const channelsToFetch = category
    ? CURATED_YOUTUBE_CHANNELS.filter(
        (ch) => ch.category.toLowerCase() === category.toLowerCase()
      )
    : CURATED_YOUTUBE_CHANNELS;

  if (channelsToFetch.length === 0) {
    return NextResponse.json({
      error: `No channels found for category "${category}". Available: ${[...new Set(CURATED_YOUTUBE_CHANNELS.map((ch) => ch.category))].join(", ")}`,
    }, { status: 400 });
  }

  const feedPromises = channelsToFetch.map(async (channel) => {
    try {
      const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channel.channelId}`;
      const response = await fetch(feedUrl, {
        headers: { "User-Agent": "OpenMemoz/1.0" },
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) return [];
      const xmlText = await response.text();
      return parseAtomFeed(xmlText, channel);
    } catch {
      return [];
    }
  });

  const allResults = (await Promise.all(feedPromises)).flat();

  allResults.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  const limitedResults = allResults.slice(0, limit);

  return NextResponse.json({
    videoCount: limitedResults.length,
    totalChannels: channelsToFetch.length,
    categories: [...new Set(CURATED_YOUTUBE_CHANNELS.map((ch) => ch.category))],
    videos: limitedResults,
  });
}
