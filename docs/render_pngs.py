import asyncio
from playwright.async_api import async_playwright
from pathlib import Path

async def main():
    slides_path = Path(__file__).parent / "devpost-slides.html"
    out_dir = Path(__file__).parent

    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={"width": 1280, "height": 854})
        await page.goto(f"file://{slides_path.resolve()}")
        await page.wait_for_timeout(3000)

        slides = await page.query_selector_all(".slide")
        for i, slide in enumerate(slides):
            path = out_dir / f"slide-{i:02d}.png"
            await slide.screenshot(path=str(path))
            print(f"  Saved: {path.name}")

        await browser.close()
        print(f"\nDone! {len(slides)} PNGs saved.")

asyncio.run(main())
