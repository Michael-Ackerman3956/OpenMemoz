import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const OUTPUT_DIR = path.join(__dirname, "..", "test-results", "live-real-madrid-chain");

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

test.describe("LIVE Real Madrid + Interests Full Chain", () => {
  test.setTimeout(90000);

  test("Full demo chain: discover → add → interests → memory → verify", async ({ page }) => {
    await setupPage(page);
    const log: string[] = [];

    // 1. Discover YouTube with query "Real Madrid"
    log.push("\n=== Step 1: discover_youtube_content(query: 'Real Madrid') ===");
    const ytRealMadrid: any = await callTool(page, "openmemoz.discover_youtube_content", { query: "Real Madrid", limit: 5 });
    log.push(`YouTube 'Real Madrid': ${ytRealMadrid.videoCount ?? 0} videos`);
    (ytRealMadrid.videos || []).forEach((v: any) => log.push(`  - ${v.title} [${v.videoId}]`));

    // 2. Discover YouTube with no query (trending)
    log.push("\n=== Step 2: discover_youtube_content(no query, all trending) ===");
    const ytAll: any = await callTool(page, "openmemoz.discover_youtube_content", { limit: 5 });
    log.push(`YouTube all: ${ytAll.videoCount ?? 0} videos`);
    (ytAll.videos || []).forEach((v: any) => log.push(`  - ${v.title} [${v.category}]`));

    // 3. Discover web content (Hacker News)
    log.push("\n=== Step 3: discover_web_content(hackernews) ===");
    const webHN: any = await callTool(page, "openmemoz.discover_web_content", { limit: 3, sources: "hackernews" });
    log.push(`Hacker News: ${webHN.storyCount ?? 0} stories`);
    (webHN.stories || []).forEach((s: any) => log.push(`  - [${s.engagementScore}pts] ${s.headline}`));

    // 4. Discover Mastodon
    log.push("\n=== Step 4: discover_mastodon_trending ===");
    const masto: any = await callTool(page, "openmemoz.discover_mastodon_trending", { limit: 3 });
    const mastoLinks = masto.trendingLinks || [];
    log.push(`Mastodon: ${mastoLinks.length} links`);
    mastoLinks.forEach((l: any) => log.push(`  - [${l.sharesCount} shares] ${l.title}`));

    // 5. Add best stories — pick non-political ones
    log.push("\n=== Step 5: Add stories to edition ===");
    const storiesToAdd = [];

    // Add from YouTube if available
    if (ytAll.videos?.length > 0) {
      const video = ytAll.videos[0];
      storiesToAdd.push({
        headline: video.title,
        excerpt: `Trending video from ${video.channelName}.`,
        section: video.category || "World",
        sourceName: video.channelName,
        sourceUrl: video.videoUrl,
        youtubeVideoId: video.videoId,
        pinAsHero: true,
      });
    }

    // Add from Hacker News
    if (webHN.stories?.length > 0) {
      const story = webHN.stories[0];
      storiesToAdd.push({
        headline: story.headline,
        excerpt: story.excerpt,
        section: "Tech",
        sourceName: "Hacker News",
        sourceUrl: story.sourceUrl,
      });
    }

    for (const story of storiesToAdd) {
      const result: any = await callTool(page, "openmemoz.add_story", story);
      log.push(`  Added "${story.headline}": ${result.added ? 'OK' : 'FAIL'} (edition: ${result.editionDate}, total: ${result.totalStoryCount})`);
      expect(result.added).toBe(true);
    }

    // 6. Set interests
    log.push("\n=== Step 6: set_user_interests ===");
    const interests: any = await callTool(page, "openmemoz.set_user_interests", {
      topics: ["AI & Machine Learning", "Space"],
      weights: { "AI & Machine Learning": 95, "Space": 90 },
    });
    log.push(`Active topics: ${JSON.stringify(interests.activeTopics)}`);
    log.push(`Weights: ${JSON.stringify(interests.weights)}`);
    expect(interests.activeTopics).toContain("AI & Machine Learning");
    expect(interests.activeTopics).toContain("Space");

    // 7. Save memory
    log.push("\n=== Step 7: save_memory ===");
    const mem: any = await callTool(page, "openmemoz.save_memory", {
      fact: "User prefers long-form technical content over news summaries",
    });
    log.push(`Memory saved: ${mem.saved}`);
    expect(mem.saved).toBe(true);

    // 8. Recall memories
    log.push("\n=== Step 8: recall_memories ===");
    const recall: any = await callTool(page, "openmemoz.recall_memories", {});
    log.push(`Memories: ${recall.memories?.length ?? 0}`);
    (recall.memories || []).forEach((m: any) => log.push(`  - ${m.fact || JSON.stringify(m)}`));

    // 9. Get final edition
    log.push("\n=== Step 9: get_edition (final state) ===");
    const edition: any = await callTool(page, "openmemoz.get_edition", {});
    log.push(`Edition: ${edition.editionDate}, ${edition.storyCount} stories`);
    log.push(`Hero: ${edition.stories?.[0]?.headline}`);

    // 10. Content safety test
    log.push("\n=== Step 10: Content safety (banned source) ===");
    const banned: any = await callTool(page, "openmemoz.add_story", {
      headline: "Test", excerpt: "Test", section: "World",
      sourceName: "NYT", sourceUrl: "https://www.nytimes.com/test",
    });
    log.push(`nytimes.com: ${banned.error?.code} ✓`);
    expect(banned.error.code).toBe("SOURCE_BANNED");

    // Save full log
    const fullLog = log.join("\n");
    console.log(fullLog);
    fs.writeFileSync(path.join(OUTPUT_DIR, "full-chain-log.txt"), fullLog);
    fs.writeFileSync(path.join(OUTPUT_DIR, "final-edition.json"), JSON.stringify(edition, null, 2));
  });
});
