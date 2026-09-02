import { NextRequest, NextResponse } from "next/server";
import { YoutubeTranscript } from "youtube-transcript";

const YOUTUBE_URL_PATTERN =
  /^https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/;

function extractVideoIdentifier(rawUrl: string): string | null {
  const match = rawUrl.match(YOUTUBE_URL_PATTERN);
  return match ? match[1] : null;
}

interface OEmbedResponse {
  title: string;
  author_name: string;
  author_url: string;
  thumbnail_url: string;
  thumbnail_width: number;
  thumbnail_height: number;
}

interface TranscriptSegment {
  text: string;
  offset: number;
  duration: number;
}

export async function GET(request: NextRequest) {
  const videoUrl = request.nextUrl.searchParams.get("url");
  if (!videoUrl) {
    return NextResponse.json(
      { error: "Missing 'url' query parameter" },
      { status: 400 }
    );
  }

  const videoId = extractVideoIdentifier(videoUrl);
  if (!videoId) {
    return NextResponse.json(
      { error: "Invalid YouTube URL" },
      { status: 400 }
    );
  }

  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`;

  const [oembedResult, transcriptResult] = await Promise.allSettled([
    fetch(oembedUrl).then((response) => {
      if (!response.ok) throw new Error(`oEmbed ${response.status}`);
      return response.json() as Promise<OEmbedResponse>;
    }),
    YoutubeTranscript.fetchTranscript(videoId).then(
      (segments: TranscriptSegment[]) =>
        segments.map((segment) => ({
          text: segment.text,
          offsetSeconds: Math.round(segment.offset / 1000),
          durationSeconds: Math.round(segment.duration / 1000),
        }))
    ),
  ]);

  const oembed =
    oembedResult.status === "fulfilled" ? oembedResult.value : null;
  const transcriptSegments =
    transcriptResult.status === "fulfilled" ? transcriptResult.value : null;
  const transcriptFullText = transcriptSegments
    ? transcriptSegments.map((segment) => segment.text).join(" ")
    : null;

  return NextResponse.json({
    videoId,
    videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
    embedUrl: `https://www.youtube.com/embed/${videoId}`,
    thumbnails: {
      default: `https://img.youtube.com/vi/${videoId}/default.jpg`,
      high: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      max: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    },
    title: oembed?.title ?? null,
    channelName: oembed?.author_name ?? null,
    channelUrl: oembed?.author_url ?? null,
    transcript: transcriptFullText
      ? {
          fullText: transcriptFullText,
          segments: transcriptSegments,
          wordCount: transcriptFullText.split(/\s+/).length,
        }
      : null,
    transcriptError:
      transcriptResult.status === "rejected"
        ? "Transcript unavailable (captions may be disabled or blocked)"
        : null,
  });
}
