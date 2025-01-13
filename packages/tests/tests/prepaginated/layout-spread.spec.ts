import { test, expect } from "@playwright/test"
import { waitForSpineItemReady } from "../utils"

test.describe("Given a prepaginated book with first page on spread right", () => {
  test.describe("and numberOfAdjacentSpineItemToPreLoad as 0", () => {
    test("should render first document on right page", async ({ page }) => {
      await page.setViewportSize({
        width: 400,
        height: 300,
      })

      await page.goto("http://localhost:3333/tests/prepaginated/index.html")

      await page.waitForSelector(".prose-spineItem-ready")

      expect(await page.screenshot()).toMatchSnapshot(`page-spread-right.png`, {
        maxDiffPixels: 10,
      })
    })

    /**
     * - Make sure layout is correct
     * - Make sure layout are not infinite and looping.
     */
    test("should have a stable layout after navigating right", async ({
      page,
    }) => {
      await page.setViewportSize({
        width: 400,
        height: 300,
      })

      await page.goto("http://localhost:3333/tests/prepaginated/index.html")

      await page.waitForSelector(".prose-spineItem-ready")

      await page.keyboard.press("ArrowRight")

      await waitForSpineItemReady(page, [1, 2])

      expect(await page.screenshot()).toMatchSnapshot(
        `right-navigation-layout.png`,
        { maxDiffPixels: 10 },
      )

      const numberOfLayout = await page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (window as any).layoutNumber as number
      })

      // that's a long timeout but layout are being debounced a bit.
      await page.waitForTimeout(1000)

      const numberOfLayoutAfterAWhile = await page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (window as any).layoutNumber as number
      })

      // make sure the value is correctly set on app side
      expect(numberOfLayout).toBeGreaterThan(1)

      // we make sure we don't have yolo renders
      expect(numberOfLayoutAfterAWhile).toBe(numberOfLayout)
    })
  })
})