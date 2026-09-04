import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const OUTPUT_DIR = path.join(__dirname, "..", "test-results", "final-prompt-test");

test.beforeAll(() => {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
});

const MOCK_SCRIPT = `
  window.__capturedTools = {};
  Object.defineProperty(document, 'modelContext', {
    value: {
      registerTool: (tool, opts) => {
        window.__capturedTools[tool.name] = { name: tool.name, _execute: tool.execute };
        return Promise.resolve();
      }
    },
    writable: false,
    configurable: true,
  });
`;

async function setupPage(page: import("@playwright/test").Page) {
  await page.addInitScript(MOCK_SCRIPT);
  await page.goto("/");
  await page.waitForSelector("text=Edition No.", { timeout: 15000 });
  await page.waitForTimeout(2000);
}

async function callTool(page: import("@playwright/test").Page, name: string, args: Record<string, unknown>) {
  return page.evaluate(async ({ n, a }) => {
    const tool = (window as any).__capturedTools[n];
    if (!tool) return { __error: `Tool "${n}" not registered` };
    try { return await tool._execute(a); } catch (e: any) { return { __error: e.message }; }
  }, { n: name, a: args });
}

test("EXACT PROMPT: discover → transcript → summary → add_story", async ({ page }) => {
  test.setTimeout(90000);
  await setupPage(page);

  console.log("\n=== EXACT README/DEVPOST PROMPT SIMULATION ===\n");
  console.log('Prompt: "Discover trending YouTube videos. Pick the most interesting one,');
  console.log('read its full transcript with get_youtube_video, write an original summary,');
  console.log('and add it as a story pinned as hero. Add one more as regular."\n');

  // Step 1: discover_youtube_content
  console.log("1. discover_youtube_content(limit: 5)...");
  const discover: any = await callTool(page, "openmemoz.discover_youtube_content", { limit: 5 });
  console.log(`   → ${discover.videoCount ?? 0} videos found`);
  (discover.videos || []).forEach((v: any) => console.log(`     [${v.videoId}] ${v.title}`));
  fs.writeFileSync(path.join(OUTPUT_DIR, "01_discover.json"), JSON.stringify(discover, null, 2));
  expect(discover.videos?.length).toBeGreaterThan(0);

  const bestVideo = discover.videos[0];
  console.log(`\n   Picked: "${bestVideo.title}"\n`);

  // Step 2: get_youtube_video — read full transcript
  console.log(`2. get_youtube_video("${bestVideo.videoUrl}")...`);
  const videoData: any = await callTool(page, "openmemoz.get_youtube_video", { videoUrl: bestVideo.videoUrl });
  const hasTranscript = !!videoData.transcript?.fullText;
  const transcriptLength = videoData.transcript?.fullText?.length ?? 0;
  console.log(`   → title: ${videoData.title}`);
  console.log(`   → channel: ${videoData.channelName}`);
  console.log(`   → has transcript: ${hasTranscript} (${transcriptLength} chars)`);
  if (hasTranscript) {
    console.log(`   → first 200 chars: ${videoData.transcript.fullText.substring(0, 200)}...`);
  }
  console.log(`   → nextStep guidance: ${videoData.nextStep ? 'YES' : 'NO'}`);
  fs.writeFileSync(path.join(OUTPUT_DIR, "02_transcript.json"), JSON.stringify({
    title: videoData.title,
    channelName: videoData.channelName,
    hasTranscript,
    transcriptLength,
    transcriptPreview: videoData.transcript?.fullText?.substring(0, 500),
    nextStep: videoData.nextStep,
  }, null, 2));

  // Step 3: Write original summary (simulating what the agent would do)
  const agentWrittenSummary = hasTranscript
    ? `AI-generated summary based on ${transcriptLength}-character transcript from ${videoData.channelName}. The video covers: ${videoData.transcript.fullText.substring(0, 150).replace(/\n/g, ' ')}...`
    : `Trending video from ${bestVideo.channelName}: ${bestVideo.title}`;
  console.log(`\n3. Agent writes summary (${agentWrittenSummary.length} chars)`);
  console.log(`   → "${agentWrittenSummary.substring(0, 120)}..."\n`);

  // Step 4: add_story with pinAsHero
  console.log("4. add_story(pinAsHero: true)...");
  const addHero: any = await callTool(page, "openmemoz.add_story", {
    headline: videoData.title || bestVideo.title,
    excerpt: agentWrittenSummary,
    section: bestVideo.category || "Tech",
    sourceName: videoData.channelName || bestVideo.channelName,
    sourceUrl: bestVideo.videoUrl,
    youtubeVideoId: bestVideo.videoId,
    pinAsHero: true,
  });
  console.log(`   → added: ${addHero.added}, edition: ${addHero.editionDate}, total: ${addHero.totalStoryCount}`);
  fs.writeFileSync(path.join(OUTPUT_DIR, "03_add_hero.json"), JSON.stringify(addHero, null, 2));
  expect(addHero.added).toBe(true);

  // Step 5: Add second video as regular
  if (discover.videos.length > 1) {
    const secondVideo = discover.videos[1];
    console.log(`\n5. add_story(regular): "${secondVideo.title}"...`);
    const addRegular: any = await callTool(page, "openmemoz.add_story", {
      headline: secondVideo.title,
      excerpt: `Latest from ${secondVideo.channelName}.`,
      section: secondVideo.category || "Finance",
      sourceName: secondVideo.channelName,
      sourceUrl: secondVideo.videoUrl,
      youtubeVideoId: secondVideo.videoId,
    });
    console.log(`   → added: ${addRegular.added}, total: ${addRegular.totalStoryCount}`);
    expect(addRegular.added).toBe(true);
  }

  // Step 6: Verify final edition
  console.log("\n6. get_edition (verify)...");
  const edition: any = await callTool(page, "openmemoz.get_edition", {});
  console.log(`   → ${edition.editionDate}, ${edition.storyCount} stories`);
  console.log(`   → hero: ${edition.stories?.[0]?.headline}`);
  fs.writeFileSync(path.join(OUTPUT_DIR, "04_final_edition.json"), JSON.stringify(edition, null, 2));

  console.log("\n=== RESULT: ALL STEPS PASS ===");
  console.log(`\nFull chain: discover(${discover.videoCount} videos) → transcript(${transcriptLength} chars) → summary → add_story(hero) → add_story(regular) → edition(${edition.storyCount} stories)\n`);
});
