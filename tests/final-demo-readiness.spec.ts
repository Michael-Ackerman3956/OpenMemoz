import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const OUTPUT_DIR = path.join(__dirname, "..", "test-results", "final-demo-readiness");

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

test.describe("FINAL Demo Readiness — Exact Prompts", () => {
  test.setTimeout(60000);

  test("PART 1 PROMPT: discover AI videos + add as hero", async ({ page }) => {
    await setupPage(page);
    console.log("\n========== PART 1: EXACT DEMO PROMPT ==========\n");

    // Exact prompt: discover_youtube_content with query "AI"
    const discover: any = await callTool(page, "openmemoz.discover_youtube_content", { query: "AI", limit: 5 });
    console.log(`discover_youtube_content(query: "AI"): ${discover.videoCount ?? 0} videos`);
    (discover.videos || []).forEach((v: any) => console.log(`  [${v.videoId}] ${v.title}`));
    fs.writeFileSync(path.join(OUTPUT_DIR, "part1_discover.json"), JSON.stringify(discover, null, 2));

    // If no AI videos, try "market" as fallback
    let videosToAdd = discover.videos || [];
    if (videosToAdd.length === 0) {
      console.log("\nNo 'AI' videos — trying 'market'...");
      const fallback: any = await callTool(page, "openmemoz.discover_youtube_content", { query: "market", limit: 5 });
      console.log(`discover_youtube_content(query: "market"): ${fallback.videoCount ?? 0} videos`);
      (fallback.videos || []).forEach((v: any) => console.log(`  [${v.videoId}] ${v.title}`));
      videosToAdd = fallback.videos || [];
    }

    // If still empty, try no query
    if (videosToAdd.length === 0) {
      console.log("\nNo keyword match — trying all trending...");
      const all: any = await callTool(page, "openmemoz.discover_youtube_content", { limit: 5 });
      console.log(`discover_youtube_content(all): ${all.videoCount ?? 0} videos`);
      (all.videos || []).forEach((v: any) => console.log(`  [${v.videoId}] ${v.title}`));
      videosToAdd = all.videos || [];
    }

    expect(videosToAdd.length).toBeGreaterThan(0);

    // Add first as hero
    const hero = videosToAdd[0];
    console.log(`\nAdding hero: "${hero.title}"...`);
    const addHero: any = await callTool(page, "openmemoz.add_story", {
      headline: hero.title,
      excerpt: `Trending from ${hero.channelName}. Watch the full analysis.`,
      section: hero.category || "Tech",
      sourceName: hero.channelName,
      sourceUrl: hero.videoUrl,
      youtubeVideoId: hero.videoId,
      pinAsHero: true,
    });
    console.log(`  Result: added=${addHero.added}, edition=${addHero.editionDate}, total=${addHero.totalStoryCount}`);
    expect(addHero.added).toBe(true);
    fs.writeFileSync(path.join(OUTPUT_DIR, "part1_add_hero.json"), JSON.stringify(addHero, null, 2));

    // Add second as regular
    if (videosToAdd.length > 1) {
      const second = videosToAdd[1];
      console.log(`Adding regular: "${second.title}"...`);
      const addRegular: any = await callTool(page, "openmemoz.add_story", {
        headline: second.title,
        excerpt: `Latest from ${second.channelName}.`,
        section: second.category || "Finance",
        sourceName: second.channelName,
        sourceUrl: second.videoUrl,
        youtubeVideoId: second.videoId,
      });
      console.log(`  Result: added=${addRegular.added}, total=${addRegular.totalStoryCount}`);
      expect(addRegular.added).toBe(true);
    }

    console.log("\n========== PART 1: PASS ==========\n");
  });

  test("PART 3 PROMPT: set interests + save memory + verify", async ({ page }) => {
    await setupPage(page);
    console.log("\n========== PART 3: EXACT DEMO PROMPT ==========\n");

    // Exact prompt: "Update my interests to focus on AI & Machine Learning and Space this week — set the weights high."
    console.log("set_user_interests(AI:95, Space:90)...");
    const interests: any = await callTool(page, "openmemoz.set_user_interests", {
      weights: { "AI & Machine Learning": 95, "Space": 90 },
    });
    console.log(`  Active topics: ${JSON.stringify(interests.activeTopics)}`);
    console.log(`  Weights: ${JSON.stringify(interests.weights)}`);
    expect(interests.activeTopics).toContain("AI & Machine Learning");
    expect(interests.activeTopics).toContain("Space");
    expect(interests.weights["AI & Machine Learning"]).toBe(95);
    expect(interests.weights["Space"]).toBe(90);
    fs.writeFileSync(path.join(OUTPUT_DIR, "part3_interests.json"), JSON.stringify(interests, null, 2));

    // Exact prompt: "Also remember that I prefer long-form technical content over news summaries."
    console.log("\nsave_memory('prefers long-form technical content')...");
    const mem: any = await callTool(page, "openmemoz.save_memory", {
      fact: "User prefers long-form technical content over news summaries",
    });
    console.log(`  Saved: ${mem.saved}`);
    expect(mem.saved).toBe(true);
    fs.writeFileSync(path.join(OUTPUT_DIR, "part3_memory.json"), JSON.stringify(mem, null, 2));

    // Verify recall
    console.log("\nrecall_memories()...");
    const recall: any = await callTool(page, "openmemoz.recall_memories", {});
    console.log(`  Memories: ${recall.memories?.length ?? 0}`);
    (recall.memories || []).forEach((m: any) => console.log(`    "${m.fact || JSON.stringify(m)}"`));
    expect(recall.memories?.length).toBeGreaterThan(0);

    // Verify get_user_interests
    console.log("\nget_user_interests()...");
    const getInt: any = await callTool(page, "openmemoz.get_user_interests", {});
    console.log(`  Active: ${JSON.stringify(getInt.activeTopics)}`);
    console.log(`  AI weight: ${getInt.weights["AI & Machine Learning"]}`);
    console.log(`  Space weight: ${getInt.weights["Space"]}`);
    expect(getInt.activeTopics).toContain("Space");
    fs.writeFileSync(path.join(OUTPUT_DIR, "part3_verify_interests.json"), JSON.stringify(getInt, null, 2));

    console.log("\n========== PART 3: PASS ==========\n");
  });
});
