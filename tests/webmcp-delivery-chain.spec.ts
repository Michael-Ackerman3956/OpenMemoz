import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const OUTPUT_DIR = path.join(__dirname, "..", "test-results", "delivery-outputs");

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
          title: tool.title,
          _execute: tool.execute,
        };
        return Promise.resolve();
      }
    },
    writable: false,
    configurable: true,
  });
`;

async function setupAndCallTool(
  page: import("@playwright/test").Page,
  toolName: string,
  args: Record<string, unknown>
) {
  return page.evaluate(async ({ name, input }) => {
    const tool = (window as any).__capturedTools[name];
    if (!tool) return { __error: `Tool "${name}" not registered` };
    try { return await tool._execute(input); }
    catch (err: any) { return { __error: err.message }; }
  }, { name: toolName, input: args });
}

test.describe("format_for_delivery — Full Chain Test", () => {
  test.setTimeout(60000);

  test("all 4 formats produce valid output", async ({ page }) => {
    await page.addInitScript(MOCK_SCRIPT);
    await page.goto("/");
    await page.waitForSelector("text=Edition No.", { timeout: 15000 });
    await page.waitForTimeout(1500);

    // Verify tool registered
    const toolCount = await page.evaluate(() => Object.keys((window as any).__capturedTools).length);
    expect(toolCount).toBe(32);

    // Test BRIEFING format
    const briefing: any = await setupAndCallTool(page, "openmemoz.format_for_delivery", {
      format: "briefing",
      maxStories: 5,
    });
    expect(briefing.format).toBe("briefing");
    expect(briefing.storyCount).toBe(5);
    expect(briefing.content).toContain("# OpenMemoz Briefing");
    expect(briefing.content).toContain("##");
    fs.writeFileSync(path.join(OUTPUT_DIR, "briefing.md"), briefing.content);

    // Test SOCIAL format
    const social: any = await setupAndCallTool(page, "openmemoz.format_for_delivery", {
      format: "social",
      maxStories: 3,
    });
    expect(social.format).toBe("social");
    expect(social.storyCount).toBe(3);
    expect(social.posts.length).toBe(3);
    expect(social.posts[0]).toHaveProperty("text");
    expect(social.posts[0]).toHaveProperty("source");
    fs.writeFileSync(path.join(OUTPUT_DIR, "social.json"), JSON.stringify(social, null, 2));

    // Test NEWSLETTER format
    const newsletter: any = await setupAndCallTool(page, "openmemoz.format_for_delivery", {
      format: "newsletter",
    });
    expect(newsletter.format).toBe("newsletter");
    expect(newsletter.storyCount).toBeGreaterThan(5);
    expect(newsletter.content).toContain("# OpenMemoz — Edition");
    expect(newsletter.content).toContain("Curated by AI agents");
    fs.writeFileSync(path.join(OUTPUT_DIR, "newsletter.md"), newsletter.content);

    // Test DATA format
    const data: any = await setupAndCallTool(page, "openmemoz.format_for_delivery", {
      format: "data",
      maxStories: 3,
    });
    expect(data.format).toBe("data");
    expect(data.stories.length).toBe(3);
    expect(data.stories[0]).toHaveProperty("storyIdentifier");
    expect(data.stories[0]).toHaveProperty("headline");
    expect(data.stories[0]).toHaveProperty("provenanceTier");
    expect(data.stories[0]).toHaveProperty("licenceBasis");
    fs.writeFileSync(path.join(OUTPUT_DIR, "data.json"), JSON.stringify(data, null, 2));

    // Test with specific storyIdentifiers
    const edition: any = await setupAndCallTool(page, "openmemoz.get_edition", {});
    const firstTwoIds = edition.stories.slice(0, 2).map((s: any) => s.storyIdentifier);
    const filtered: any = await setupAndCallTool(page, "openmemoz.format_for_delivery", {
      format: "briefing",
      storyIdentifiers: firstTwoIds,
    });
    expect(filtered.storyCount).toBe(2);
    fs.writeFileSync(path.join(OUTPUT_DIR, "briefing-filtered.md"), filtered.content);

    // Test invalid format
    const invalid: any = await setupAndCallTool(page, "openmemoz.format_for_delivery", {
      format: "invalid_format",
    });
    expect(invalid.error).toBeTruthy();
    expect(invalid.error.code).toBe("INVALID_FORMAT");

    // Generate HTML preview of the newsletter
    const htmlPreview = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>OpenMemoz Newsletter Preview</title>
<style>
  body { font-family: Georgia, serif; max-width: 680px; margin: 40px auto; padding: 0 20px; background: #fafaf8; color: #1a1a1a; line-height: 1.7; }
  h1 { font-size: 28px; border-bottom: 2px solid #d4a843; padding-bottom: 8px; }
  h2 { font-size: 20px; color: #d4a843; margin-top: 32px; border-bottom: 1px solid #e0d8c8; padding-bottom: 4px; }
  h3 { font-size: 17px; margin-top: 16px; }
  hr { border: none; border-top: 1px solid #e0d8c8; margin: 24px 0; }
  em { color: #666; }
  a { color: #d4a843; }
  .footer { text-align: center; font-size: 13px; color: #999; margin-top: 40px; padding-top: 16px; border-top: 1px solid #e0d8c8; }
</style></head><body>
${newsletter.content
  .replace(/^# (.+)$/gm, '<h1>$1</h1>')
  .replace(/^\*(.+)\*$/gm, '<p><em>$1</em></p>')
  .replace(/^## (.+)$/gm, '<h2>$1</h2>')
  .replace(/^### (.+)$/gm, '<h3>$1</h3>')
  .replace(/^---$/gm, '<hr>')
  .replace(/^\*Source: \[(.+?)\]\((.+?)\)\*$/gm, '<p><em>Source: <a href="$2">$1</a></em></p>')
  .replace(/^\*Watch: \[(.+?)\]\((.+?)\)\*$/gm, '<p><em>Watch: <a href="$2">$1</a></em></p>')
  .replace(/^\*(.+?)\*$/gm, '<p><em>$1</em></p>')
  .replace(/^(?!<[hp]|<h[123]|<hr|<em)([\w].+)$/gm, '<p>$1</p>')}
<div class="footer">Generated by format_for_delivery tool &middot; OpenMemoz WebMCP</div>
</body></html>`;

    const htmlPath = path.join(OUTPUT_DIR, "newsletter-preview.html");
    fs.writeFileSync(htmlPath, htmlPreview);
  });
});
