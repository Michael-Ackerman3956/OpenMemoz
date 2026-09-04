import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const OUTPUT_DIR = path.join(__dirname, "..", "test-results", "date-aware-outputs");

test.beforeAll(() => {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
});

function saveTestOutput(testName: string, output: unknown) {
  const filename = testName.replace(/[^a-z0-9]+/gi, "_") + ".json";
  fs.writeFileSync(path.join(OUTPUT_DIR, filename), JSON.stringify(output, null, 2));
}

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

function getTodayAsEditionDateString(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

async function setupPageWithMockModelContext(page: import("@playwright/test").Page) {
  await page.addInitScript(MOCK_SCRIPT);
  await page.goto("/");
  await page.waitForSelector("text=Edition No.", { timeout: 15000 });
  await page.waitForTimeout(1500);
}

async function callToolByName(page: import("@playwright/test").Page, toolName: string, args: Record<string, unknown>) {
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

test.describe("Date-aware edition CRUD", () => {
  test.setTimeout(60000);

  test("add_story without editionDate defaults to today and auto-creates edition", async ({ page }) => {
    await setupPageWithMockModelContext(page);
    const todayDateString = getTodayAsEditionDateString();

    const addStoryResult: any = await callToolByName(page, "openmemoz.add_story", {
      headline: "Test Story Defaults To Today",
      excerpt: "This story should land in today's edition automatically",
      section: "Tech",
      sourceName: "Hacker News",
      sourceUrl: "https://news.ycombinator.com/item?id=12345",
    });

    saveTestOutput("add_story_defaults_to_today", addStoryResult);
    expect(addStoryResult).not.toHaveProperty("__error");
    expect(addStoryResult).not.toHaveProperty("error");
    expect(addStoryResult).toHaveProperty("added", true);
    expect(addStoryResult.editionDate).toBe(todayDateString);
  });

  test("add_story with explicit future editionDate creates new edition", async ({ page }) => {
    await setupPageWithMockModelContext(page);
    const futureDate = "2026-09-10";

    const addStoryResult: any = await callToolByName(page, "openmemoz.add_story", {
      headline: "Future Edition Story",
      excerpt: "Testing explicit date targeting",
      section: "Science",
      sourceName: "NASA",
      sourceUrl: "https://www.nasa.gov/test-article",
      editionDate: futureDate,
    });

    saveTestOutput("add_story_future_date", addStoryResult);
    expect(addStoryResult).not.toHaveProperty("error");
    expect(addStoryResult).toHaveProperty("added", true);
    expect(addStoryResult.editionDate).toBe(futureDate);
  });

  test("add_story with invalid date format returns INVALID_DATE error", async ({ page }) => {
    await setupPageWithMockModelContext(page);

    const invalidDateResult: any = await callToolByName(page, "openmemoz.add_story", {
      headline: "Bad Date Story",
      excerpt: "This should fail with invalid date",
      section: "Tech",
      sourceName: "Hacker News",
      sourceUrl: "https://news.ycombinator.com/item?id=99999",
      editionDate: "not-a-date",
    });

    saveTestOutput("add_story_invalid_date", invalidDateResult);
    expect(invalidDateResult).toHaveProperty("error");
    expect(invalidDateResult.error.code).toBe("INVALID_DATE");
  });

  test("two stories added to same new date reuse the edition", async ({ page }) => {
    await setupPageWithMockModelContext(page);
    const targetDate = "2026-09-15";

    const firstStoryResult: any = await callToolByName(page, "openmemoz.add_story", {
      headline: "First Story Sep 15",
      excerpt: "First story in new edition",
      section: "Tech",
      sourceName: "Hacker News",
      sourceUrl: "https://news.ycombinator.com/item?id=11111",
      editionDate: targetDate,
    });

    saveTestOutput("batch_same_date_first", firstStoryResult);
    expect(firstStoryResult).toHaveProperty("added", true);
    expect(firstStoryResult.totalStoryCount).toBe(1);

    const secondStoryResult: any = await callToolByName(page, "openmemoz.add_story", {
      headline: "Second Story Sep 15",
      excerpt: "Second story reuses same edition",
      section: "Science",
      sourceName: "NASA",
      sourceUrl: "https://www.nasa.gov/test-second",
      editionDate: targetDate,
    });

    saveTestOutput("batch_same_date_second", secondStoryResult);
    expect(secondStoryResult).toHaveProperty("added", true);
    expect(secondStoryResult.totalStoryCount).toBe(2);
    expect(secondStoryResult.editionDate).toBe(targetDate);
  });

  test("discover_web_content tool is registered and callable", async ({ page }) => {
    await setupPageWithMockModelContext(page);

    const discoverResult: any = await callToolByName(page, "openmemoz.discover_web_content", {
      limit: 3,
      sources: "hackernews",
    });

    saveTestOutput("discover_web_content", discoverResult);

    if (discoverResult?.error?.code === "NETWORK_ERROR" || discoverResult?.error?.code === "FETCH_FAILED") {
      console.log("Skipping web discover assertions — network unavailable");
      return;
    }

    expect(discoverResult).toHaveProperty("storyCount");
    expect(discoverResult.storyCount).toBeGreaterThan(0);
    expect(discoverResult.stories[0]).toHaveProperty("headline");
    expect(discoverResult.stories[0]).toHaveProperty("sourceUrl");
  });
});
