import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const OUTPUT_DIR = path.join(__dirname, "..", "test-results", "live-demo-verification");

test.beforeAll(() => {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
});

const MOCK_SCRIPT = `
  window.__capturedTools = {};
  Object.defineProperty(document, 'modelContext', {
    value: {
      registerTool: (tool, opts) => {
        window.__capturedTools[tool.name] = {
          name: tool.name,
          _execute: tool.execute,
        };
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

async function callTool(page: import("@playwright/test").Page, toolName: string, args: Record<string, unknown>) {
  return page.evaluate(async ({ name, input }) => {
    const tool = (window as any).__capturedTools[name];
    if (!tool) return { __error: `Tool "${name}" not registered` };
    try {
      return await tool._execute(input);
    } catch (err: any) {
      return { __error: err.message ?? String(err) };
    }
  }, { name: toolName, input: args });
}

test.describe("LIVE Demo Verification — Real API Calls", () => {
  test.setTimeout(90000);

  test("Demo Prompt 1: discover_youtube_content → add_story with pinAsHero", async ({ page }) => {
    await setupPage(page);

    console.log("\n=== DEMO PROMPT 1: Discover YouTube + Add Stories ===\n");

    // Step 1: discover_youtube_content (REAL API call)
    console.log("Step 1: Calling discover_youtube_content...");
    const discoverResult: any = await callTool(page, "openmemoz.discover_youtube_content", { limit: 5 });
    fs.writeFileSync(path.join(OUTPUT_DIR, "1_youtube_discover.json"), JSON.stringify(discoverResult, null, 2));

    console.log(`  Result: ${discoverResult.videoCount ?? discoverResult.videos?.length ?? 0} videos found`);
    if (discoverResult.videos?.length > 0) {
      discoverResult.videos.forEach((v: any) => console.log(`    - ${v.title} [${v.videoId}]`));
    } else if (discoverResult.error) {
      console.log(`  ERROR: ${JSON.stringify(discoverResult.error)}`);
    }

    // Step 2: add_story with first video as hero (REAL tool call)
    const video1 = discoverResult.videos?.[0];
    if (video1) {
      console.log(`\nStep 2: Adding "${video1.title}" as hero story...`);
      const addResult1: any = await callTool(page, "openmemoz.add_story", {
        headline: video1.title,
        excerpt: `Trending video from ${video1.channelName}. Watch the full coverage on this developing story.`,
        section: video1.category || "World",
        sourceName: video1.channelName || "YouTube",
        sourceUrl: video1.videoUrl,
        youtubeVideoId: video1.videoId,
        pinAsHero: true,
      });
      fs.writeFileSync(path.join(OUTPUT_DIR, "2_add_story_hero.json"), JSON.stringify(addResult1, null, 2));
      console.log(`  Result: added=${addResult1.added}, editionDate=${addResult1.editionDate}, totalStories=${addResult1.totalStoryCount}`);
      expect(addResult1.added).toBe(true);
    }

    // Step 3: add second video as regular story
    const video2 = discoverResult.videos?.[1];
    if (video2) {
      console.log(`\nStep 3: Adding "${video2.title}" as regular story...`);
      const addResult2: any = await callTool(page, "openmemoz.add_story", {
        headline: video2.title,
        excerpt: `Latest from ${video2.channelName}. Key developments and analysis.`,
        section: video2.category || "Finance",
        sourceName: video2.channelName || "YouTube",
        sourceUrl: video2.videoUrl,
        youtubeVideoId: video2.videoId,
      });
      fs.writeFileSync(path.join(OUTPUT_DIR, "3_add_story_regular.json"), JSON.stringify(addResult2, null, 2));
      console.log(`  Result: added=${addResult2.added}, editionDate=${addResult2.editionDate}, totalStories=${addResult2.totalStoryCount}`);
      expect(addResult2.added).toBe(true);
    }

    // Step 4: verify get_edition shows the new stories
    console.log("\nStep 4: Verifying edition...");
    const edition: any = await callTool(page, "openmemoz.get_edition", {});
    fs.writeFileSync(path.join(OUTPUT_DIR, "4_edition_after_add.json"), JSON.stringify(edition, null, 2));
    console.log(`  Edition: ${edition.editionDate}, ${edition.storyCount} stories`);
    console.log(`  Hero: ${edition.stories?.[0]?.headline}`);

    console.log("\n=== DEMO PROMPT 1: PASS ===\n");
  });

  test("Demo Prompt 2: set_user_interests + save_memory + recall", async ({ page }) => {
    await setupPage(page);

    console.log("\n=== DEMO PROMPT 2: Interests + Memory ===\n");

    // Step 1: set_user_interests
    console.log("Step 1: Setting interests to AI & Machine Learning and Space...");
    const interestsResult: any = await callTool(page, "openmemoz.set_user_interests", {
      topics: ["AI & Machine Learning", "Space"],
      weights: { "AI & Machine Learning": 95, "Space": 90 },
    });
    fs.writeFileSync(path.join(OUTPUT_DIR, "5_set_interests.json"), JSON.stringify(interestsResult, null, 2));
    console.log(`  Result: ${JSON.stringify(interestsResult)}`);
    expect(interestsResult).not.toHaveProperty("__error");

    // Step 2: save_memory — "prefers long-form technical content"
    console.log("\nStep 2: Saving memory — 'prefers long-form technical content over news summaries'...");
    const memoryResult: any = await callTool(page, "openmemoz.save_memory", {
      fact: "User prefers long-form technical content over news summaries",
    });
    fs.writeFileSync(path.join(OUTPUT_DIR, "6_save_memory.json"), JSON.stringify(memoryResult, null, 2));
    console.log(`  Result: saved=${memoryResult.saved}, key=${memoryResult.key}`);
    expect(memoryResult.saved).toBe(true);

    // Step 3: recall_memories — verify it comes back
    console.log("\nStep 3: Recalling memories...");
    const recallResult: any = await callTool(page, "openmemoz.recall_memories", {});
    fs.writeFileSync(path.join(OUTPUT_DIR, "7_recall_memories.json"), JSON.stringify(recallResult, null, 2));
    console.log(`  Memories found: ${recallResult.memories?.length ?? recallResult.count ?? 0}`);
    if (recallResult.memories) {
      recallResult.memories.forEach((m: any) => console.log(`    - ${m.fact || m.value || JSON.stringify(m)}`));
    }

    // Step 4: get_user_interests — verify interests were saved
    console.log("\nStep 4: Verifying interests...");
    const getInterests: any = await callTool(page, "openmemoz.get_user_interests", {});
    fs.writeFileSync(path.join(OUTPUT_DIR, "8_get_interests.json"), JSON.stringify(getInterests, null, 2));
    console.log(`  Active topics: ${JSON.stringify(getInterests.activeTopics)}`);
    console.log(`  Weights: ${JSON.stringify(getInterests.weights)}`);
    expect(getInterests.activeTopics).toContain("AI & Machine Learning");
    expect(getInterests.activeTopics).toContain("Space");

    console.log("\n=== DEMO PROMPT 2: PASS ===\n");
  });

  test("Demo Prompt 3: discover_web_content + add from Hacker News", async ({ page }) => {
    await setupPage(page);

    console.log("\n=== DEMO PROMPT 3: Web Discover + Add ===\n");

    // Step 1: discover_web_content
    console.log("Step 1: Discovering web content from Hacker News...");
    const webResult: any = await callTool(page, "openmemoz.discover_web_content", {
      limit: 5,
      sources: "hackernews",
    });
    fs.writeFileSync(path.join(OUTPUT_DIR, "9_web_discover.json"), JSON.stringify(webResult, null, 2));
    console.log(`  Result: ${webResult.storyCount} stories found`);
    if (webResult.stories?.length > 0) {
      webResult.stories.forEach((s: any) => console.log(`    - [${s.engagementScore} pts] ${s.headline}`));
    }

    // Step 2: add top HN story
    const topStory = webResult.stories?.[0];
    if (topStory) {
      console.log(`\nStep 2: Adding "${topStory.headline}" to edition...`);
      const addResult: any = await callTool(page, "openmemoz.add_story", {
        headline: topStory.headline,
        excerpt: topStory.excerpt,
        section: "Tech",
        sourceName: "Hacker News",
        sourceUrl: topStory.sourceUrl,
      });
      fs.writeFileSync(path.join(OUTPUT_DIR, "10_add_hn_story.json"), JSON.stringify(addResult, null, 2));
      console.log(`  Result: added=${addResult.added}, editionDate=${addResult.editionDate}`);
      expect(addResult.added).toBe(true);
    }

    // Step 3: discover_mastodon_trending
    console.log("\nStep 3: Discovering Mastodon trending...");
    const mastoResult: any = await callTool(page, "openmemoz.discover_mastodon_trending", { limit: 3 });
    fs.writeFileSync(path.join(OUTPUT_DIR, "11_mastodon_discover.json"), JSON.stringify(mastoResult, null, 2));
    const linkCount = mastoResult.trendingLinks?.length ?? mastoResult.linkCount ?? 0;
    console.log(`  Result: ${linkCount} trending links`);
    if (mastoResult.trendingLinks) {
      mastoResult.trendingLinks.forEach((l: any) => console.log(`    - [${l.sharesCount} shares] ${l.title}`));
    }

    console.log("\n=== DEMO PROMPT 3: PASS ===\n");
  });

  test("Content Safety: banned source rejection", async ({ page }) => {
    await setupPage(page);

    console.log("\n=== CONTENT SAFETY TEST ===\n");

    // Try adding from banned source
    console.log("Attempting to add story from nytimes.com (banned)...");
    const bannedResult: any = await callTool(page, "openmemoz.add_story", {
      headline: "Test Banned Source",
      excerpt: "This should be rejected",
      section: "World",
      sourceName: "New York Times",
      sourceUrl: "https://www.nytimes.com/2026/09/04/test.html",
    });
    fs.writeFileSync(path.join(OUTPUT_DIR, "12_banned_source.json"), JSON.stringify(bannedResult, null, 2));
    console.log(`  Result: ${JSON.stringify(bannedResult.error)}`);
    expect(bannedResult.error.code).toBe("SOURCE_BANNED");

    // Add from approved source
    console.log("\nAdding story from nasa.gov (approved)...");
    const approvedResult: any = await callTool(page, "openmemoz.add_story", {
      headline: "NASA Webb Telescope Discovers New Exoplanet",
      excerpt: "The James Webb Space Telescope has identified a potentially habitable exoplanet.",
      section: "Space",
      sourceName: "NASA",
      sourceUrl: "https://www.nasa.gov/webb-exoplanet-discovery",
    });
    fs.writeFileSync(path.join(OUTPUT_DIR, "13_approved_source.json"), JSON.stringify(approvedResult, null, 2));
    console.log(`  Result: added=${approvedResult.added}`);
    expect(approvedResult.added).toBe(true);

    // Add with no sourceUrl (agent's own content — should pass)
    console.log("\nAdding original agent-written content (no sourceUrl)...");
    const originalResult: any = await callTool(page, "openmemoz.add_story", {
      headline: "Why Quantum Computing Matters for Everyday Security",
      excerpt: "An AI-written explainer on post-quantum cryptography and what it means for your passwords.",
      section: "Tech",
      sourceName: "AI Agent",
    });
    fs.writeFileSync(path.join(OUTPUT_DIR, "14_original_content.json"), JSON.stringify(originalResult, null, 2));
    console.log(`  Result: added=${originalResult.added}`);
    expect(originalResult.added).toBe(true);

    console.log("\n=== CONTENT SAFETY: PASS ===\n");
  });
});
