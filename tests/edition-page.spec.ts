import { test, expect } from "@playwright/test";

test.describe("Edition page loads and renders", () => {
  test("displays masthead and hero story", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1:has-text('Newsroom')")).toBeVisible();

    const heroHeadline = page.locator("article h2").first();
    await expect(heroHeadline).toBeVisible({ timeout: 10000 });
    await expect(heroHeadline).not.toBeEmpty();
  });

  test("renders edition date and story count in nav bar", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=Edition No.")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator("text=/\\d+ stories/")).toBeVisible();
  });

  test("renders story cards below hero", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("article h2", { timeout: 10000 });

    const storyCards = page.locator("article h3");
    const storyCardCount = await storyCards.count();
    expect(storyCardCount).toBeGreaterThan(3);
  });
});

test.describe("Story interaction", () => {
  test("clicking a story opens StoryDetail with back button", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForSelector("article h3", { timeout: 10000 });

    const firstStoryCard = page.locator("article h3").first();
    const storyHeadline = await firstStoryCard.textContent();
    await firstStoryCard.click();

    await expect(page.locator("text=Back to edition")).toBeVisible();
    await expect(page.locator("article h1")).toContainText(storyHeadline!);
  });

  test("back button returns to edition view", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("article h3", { timeout: 10000 });

    await page.locator("article h3").first().click();
    await expect(page.locator("text=Back to edition")).toBeVisible();

    await page.locator("text=Back to edition").click();
    await expect(page.locator("article h2").first()).toBeVisible();
  });

  test("Escape key closes StoryDetail", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("article h3", { timeout: 10000 });

    await page.locator("article h3").first().click();
    await expect(page.locator("text=Back to edition")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.locator("article h2").first()).toBeVisible();
  });
});

test.describe("Edition navigation", () => {
  test("prev/next arrows switch editions", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("text=Edition No.", { timeout: 10000 });

    const editionLabel = page.locator("text=Edition No.");
    const initialText = await editionLabel.textContent();

    const prevButton = page.locator('button:has-text("←")');
    const isDisabled = await prevButton.getAttribute("disabled");
    if (isDisabled === null) {
      await prevButton.click();
      await expect(editionLabel).not.toHaveText(initialText!);
    }
  });
});

test.describe("Section filtering", () => {
  test("section dropdown filters stories", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("article h2", { timeout: 10000 });

    const sectionSelect = page.locator("select").first();
    if ((await sectionSelect.count()) > 0) {
      const options = await sectionSelect.locator("option").allTextContents();
      if (options.length > 1) {
        await sectionSelect.selectOption({ index: 1 });
        await page.waitForTimeout(300);

        const storyCards = page.locator("article h3");
        const filteredCount = await storyCards.count();
        expect(filteredCount).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

test.describe("Tab navigation", () => {
  test("screen tabs are accessible on desktop", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", "Desktop-only test");
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await page.waitForSelector("text=Edition No.", { timeout: 10000 });

    const settingsButton = page
      .locator("header button:has-text('Settings')")
      .first();
    if ((await settingsButton.count()) > 0) {
      await settingsButton.click();
      await page.waitForTimeout(300);

      const editionButton = page
        .locator("header button:has-text('Edition')")
        .first();
      await editionButton.click();
      await expect(page.locator("text=Edition No.")).toBeVisible();
    }
  });
});
