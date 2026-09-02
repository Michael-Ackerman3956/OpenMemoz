import { NextRequest, NextResponse } from "next/server";
import { YoutubeTranscript } from "youtube-transcript";
import { GoogleGenAI } from "@google/genai";

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

function buildBaseVideoResponse(
  videoId: string,
  oembed: OEmbedResponse | null,
  transcriptSegments: Array<{ text: string; offsetSeconds: number; durationSeconds: number }> | null,
  transcriptError: string | null
) {
  const transcriptFullText = transcriptSegments
    ? transcriptSegments.map((segment) => segment.text).join(" ")
    : null;

  return {
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
    transcriptError,
  };
}

async function fetchOembedAndTranscript(videoId: string, videoUrl: string) {
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

  return {
    oembed: oembedResult.status === "fulfilled" ? oembedResult.value : null,
    transcriptSegments:
      transcriptResult.status === "fulfilled" ? transcriptResult.value : null,
    transcriptError:
      transcriptResult.status === "rejected"
        ? "Transcript unavailable (captions may be disabled or blocked)"
        : null,
  };
}

// GET: transcript + metadata only (no API key needed)
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

  const { oembed, transcriptSegments, transcriptError } =
    await fetchOembedAndTranscript(videoId, videoUrl);

  return NextResponse.json({
    ...buildBaseVideoResponse(videoId, oembed, transcriptSegments, transcriptError),
    videoAnalysis: null,
  });
}

// POST: transcript + metadata + Gemini video analysis (agent provides key)
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { videoUrl, geminiApiKey, analysisPrompt } = body as {
    videoUrl: string;
    geminiApiKey?: string;
    analysisPrompt?: string;
  };

  if (!videoUrl) {
    return NextResponse.json(
      { error: "Missing 'videoUrl' in request body" },
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

  const { oembed, transcriptSegments, transcriptError } =
    await fetchOembedAndTranscript(videoId, videoUrl);

  const baseResponse = buildBaseVideoResponse(
    videoId, oembed, transcriptSegments, transcriptError
  );

  // Without a key, return transcript-only (same as GET)
  if (!geminiApiKey) {
    return NextResponse.json({ ...baseResponse, videoAnalysis: null });
  }

  // With a key, also run Gemini video analysis
  const defaultPrompt = `Analyze this YouTube video. Return a JSON object:
- "summary": 2-3 sentence overview of the video content
- "keyInsights": array of 3-7 key points or takeaways
- "topics": array of topic tags
- "sentiment": overall tone (informative/entertaining/persuasive/educational/controversial)
- "quotableLines": array of notable quotes or statements from the video (max 5)
Write factually. Attribute claims to the speaker.`;

  try {
    const googleGenAiClient = new GoogleGenAI({ apiKey: geminiApiKey });

    const geminiResponse = await googleGenAiClient.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          role: "user",
          parts: [
            { fileData: { fileUri: videoUrl, mimeType: "video/*" } },
            { text: analysisPrompt || defaultPrompt },
          ],
        },
      ],
    });

    const rawResponseText = geminiResponse.text ?? "";

    let parsedAnalysis: Record<string, unknown> | null = null;
    const jsonBlockMatch = rawResponseText.match(/```json\s*([\s\S]*?)```/);
    if (jsonBlockMatch) {
      try { parsedAnalysis = JSON.parse(jsonBlockMatch[1]); } catch { /* */ }
    }
    if (!parsedAnalysis) {
      try { parsedAnalysis = JSON.parse(rawResponseText); } catch { /* */ }
    }

    return NextResponse.json({
      ...baseResponse,
      videoAnalysis: {
        provider: "gemini",
        model: "gemini-2.0-flash",
        analyzedAt: new Date().toISOString(),
        result: parsedAnalysis,
        rawText: parsedAnalysis ? undefined : rawResponseText,
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({
      ...baseResponse,
      videoAnalysis: {
        provider: "gemini",
        error: `Analysis failed: ${errorMessage}`,
      },
    });
  }
}
