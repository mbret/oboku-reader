import { Context } from "../../context/Context"
import { SpineItem } from "../../spineItem/createSpineItem"
import { createSpineItemLocator as createSpineItemLocator } from "../../spineItem/locationResolver"
import { SpineItemManager } from "../../spineItemManager"
import { Report } from "../../report"
import {
  SafeSpineItemPosition,
  UnsafeSpineItemPosition,
} from "../../spineItem/types"
import { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import { ViewportPosition } from "../../navigation/ViewportNavigator"

export type SpineLocationResolver = ReturnType<typeof createSpineLocationResolver>

export const createSpineLocationResolver = ({
  spineItemManager,
  context,
  spineItemLocator,
  settings,
}: {
  spineItemManager: SpineItemManager
  context: Context
  spineItemLocator: ReturnType<typeof createSpineItemLocator>
  settings: ReaderSettingsManager
}) => {
  const getSpineItemPositionFromSpinePosition = Report.measurePerformance(
    `getSpineItemPositionFromSpinePosition`,
    10,
    (
      position: ViewportPosition,
      spineItem: SpineItem,
    ): UnsafeSpineItemPosition => {
      const { left, top } = spineItemManager.getAbsolutePositionOf(spineItem)

      /**
       * For this case the global offset move from right to left but this specific item
       * reads from left to right. This means that when the offset is at the start of the item
       * it is in fact at his end. This behavior can be observed in `haruko` about chapter.
       * @example
       * <---------------------------------------------------- global offset
       * item offset ------------------>
       * [item2 (page0 - page1 - page2)] [item1 (page1 - page0)] [item0 (page0)]
       */
      // if (context.isRTL() && itemReadingDirection === 'ltr') {
      //   return (end - readingOrderViewOffset) - context.getPageSize().width
      // }

      return {
        /**
         * when using spread the item could be on the right and therefore will be negative
         * @example
         * 400 (position = viewport), page of 200
         * 400 - 600 = -200.
         * However we can assume we are at 0, because we in fact can see the beginning of the item
         */
        x: Math.max(position.x - left, 0),
        y: Math.max(position.y - top, 0),
      }
    },
    { disable: true },
  )

  /**
   * Be careful when using with spread with RTL, this will return the position for one page size. This is in order to prevent wrong position when
   * an item is not taking the entire spread. That way we always have a valid position for the given item. However you need to adjust it
   * when on spread mode to be sure to position the viewport on the edge.
   *
   * @example
   * [    item-a   |   item-a   ]
   * 400          200           0
   * will return 200, which probably needs to be adjusted as 0
   */
  const getSpinePositionFromSpineItemPosition = (
    spineItemPosition: SafeSpineItemPosition,
    spineItem: SpineItem,
  ): ViewportPosition => {
    const { left, top } = spineItemManager.getAbsolutePositionOf(spineItem)

    /**
     * For this case the global offset move from right to left but this specific item
     * reads from left to right. This means that when the offset is at the start of the item
     * it is in fact at his end. This behavior can be observed in `haruko` about chapter.
     * @example
     * <---------------------------------------------------- global offset
     * item offset ------------------>
     * [item2 (page0 - page1 - page2)] [item1 (page1 - page0)] [item0 (page0)]
     */
    // if (context.isRTL() && itemReadingDirection === 'ltr') {
    //   return (end - spineItemOffset) - context.getPageSize().width
    // }

    return {
      x: left + spineItemPosition.x,
      y: top + spineItemPosition.y,
    }
  }

  /**
   * This will retrieve the closest item to the x / y position edge relative to the reading direction.
   */
  const getSpineItemFromPosition = Report.measurePerformance(
    `getSpineItemFromOffset`,
    10,
    (position: ViewportPosition) => {
      const spineItem = spineItemManager.getAll().find((item) => {
        const { left, right, bottom, top } =
          spineItemManager.getAbsolutePositionOf(item)

        const isWithinXAxis = position.x >= left && position.x < right

        if (settings.settings.computedPageTurnDirection === `horizontal`) {
          return isWithinXAxis
        } else {
          return isWithinXAxis && position.y >= top && position.y < bottom
        }
      })

      if (position.x === 0 && !spineItem) {
        return spineItemManager.getAll()[0]
      }

      return spineItem
    },
    { disable: true },
  )

  const getSpinePositionFromSpineItem = (spineItem: SpineItem) => {
    return getSpinePositionFromSpineItemPosition({ x: 0, y: 0 }, spineItem)
  }

  const isSpineItemVisibleByThresholdForPosition = ({
    spineItemHeight,
    spineItemWidth,
    visibleWidthOfSpineItem,
    visibleHeightOfSpineItem,
    threshold,
  }: {
    spineItemWidth: number
    visibleWidthOfSpineItem: number
    visibleHeightOfSpineItem: number
    spineItemHeight: number
    threshold: number
  }) => {
    const visibleWidthRatioOfSpineItem =
      visibleWidthOfSpineItem / spineItemWidth

    const visibleHeightRatioOfSpineItem =
      visibleHeightOfSpineItem / spineItemHeight

    const isSpineItemVisibleEnough =
      visibleWidthRatioOfSpineItem >= threshold &&
      visibleHeightRatioOfSpineItem >= threshold

    return isSpineItemVisibleEnough
  }

  const isSpineItemVisibleOnScreenByThresholdForPosition = ({
    visibleWidthOfSpineItem,
    visibleHeightOfSpineItem,
    threshold,
  }: {
    visibleWidthOfSpineItem: number
    visibleHeightOfSpineItem: number
    threshold: number
  }) => {
    const widthRatioOfSpaceTakenInScreen =
      visibleWidthOfSpineItem / context.state.visibleAreaRect.width

    const heightRatioOfSpaceTakenInScreen =
      visibleHeightOfSpineItem / context.state.visibleAreaRect.height

    const isSpineItemVisibleEnoughOnScreen =
      heightRatioOfSpaceTakenInScreen >= threshold &&
      widthRatioOfSpaceTakenInScreen >= threshold

    return isSpineItemVisibleEnoughOnScreen
  }

  /**
   * Will check whether a spine item is visible on screen
   * by either:
   *
   * - reach the threshold of visibility on screen
   * - reach the threshold of visibility relative to itself
   *
   * This cover the items that are completely visible on screen
   * but too small to reach the threshold of visibility on screen.
   * (we see them entirely but they are maybe too small on screen).
   *
   * Then will cover items that are cut on screen but we see them enough
   * on the screen to consider them.
   */
  const isSpineItemVisibleForPosition = ({
    spineItem,
    threshold,
    viewportPosition,
    restrictToScreen,
  }: {
    spineItem: SpineItem | number
    viewportPosition: ViewportPosition
    threshold: number
    restrictToScreen?: boolean
  }) => {
    const {
      right,
      left,
      width: spineItemWidth,
      height: spineItemHeight,
      top,
      bottom,
    } = spineItemManager.getAbsolutePositionOf(spineItem)

    const viewportLeft = viewportPosition.x
    const viewportRight =
      viewportPosition.x + (context.state.visibleAreaRect.width - 1)
    const viewportTop = viewportPosition.y
    const viewportBottom =
      viewportPosition.y + (context.state.visibleAreaRect.height - 1)

    const visibleWidthOfSpineItem =
      Math.min(right, viewportRight) - Math.max(left, viewportLeft)

    const visibleHeightOfSpineItem =
      Math.min(bottom, viewportBottom) - Math.max(top, viewportTop)

    const spineItemIsOnTheOuterEdge =
      visibleWidthOfSpineItem <= 0 || visibleHeightOfSpineItem <= 0

    if (spineItemIsOnTheOuterEdge) return false

    const isSpineItemVisibleEnoughOnScreen =
      isSpineItemVisibleOnScreenByThresholdForPosition({
        threshold,
        visibleHeightOfSpineItem,
        visibleWidthOfSpineItem,
      })

    if (restrictToScreen) {
      return isSpineItemVisibleEnoughOnScreen
    }

    const isSpineItemVisibleEnough = isSpineItemVisibleByThresholdForPosition({
      spineItemHeight,
      spineItemWidth,
      threshold,
      visibleHeightOfSpineItem,
      visibleWidthOfSpineItem,
    })

    return isSpineItemVisibleEnough || isSpineItemVisibleEnoughOnScreen
  }

  const getVisibleSpineItemsFromPosition = ({
    position,
    threshold,
    restrictToScreen,
  }: {
    position: ViewportPosition
    threshold: number
    restrictToScreen?: boolean
  }):
    | {
        beginIndex: number
        // beginPosition: ViewportPosition
        endIndex: number
        // endPosition: ViewportPosition
      }
    | undefined => {
    const fallbackSpineItem =
      getSpineItemFromPosition(position) || spineItemManager.get(0)

    const spineItemsVisible = spineItemManager
      .getAll()
      .reduce<SpineItem[]>((acc, spineItem) => {
        if (
          isSpineItemVisibleForPosition({
            spineItem,
            threshold,
            viewportPosition: position,
            restrictToScreen,
          })
        ) {
          return [...acc, spineItem]
        }

        return acc
      }, [])

    const beginItem = spineItemsVisible[0] ?? fallbackSpineItem
    const endItem = spineItemsVisible[spineItemsVisible.length - 1] ?? beginItem

    if (!beginItem || !endItem) return undefined

    const beginItemIndex = spineItemManager.getSpineItemIndex(beginItem)
    const endItemIndex = spineItemManager.getSpineItemIndex(endItem)

    return {
      beginIndex: beginItemIndex ?? 0,
      // beginPosition: position,
      endIndex: endItemIndex ?? 0,
      // endPosition: position,
    }
  }

  const getSpineItemFromIframe = (iframe: Element) => {
    return spineItemManager
      .getAll()
      .find((item) => item.spineItemFrame.getFrameElement() === iframe)
  }

  const getSpineItemPageIndexFromNode = (
    node: Node,
    offset: number | undefined,
    spineItemOrIndex: SpineItem | number,
  ) => {
    if (typeof spineItemOrIndex === `number`) {
      const spineItem = spineItemManager.get(spineItemOrIndex)
      return spineItem
        ? spineItemLocator.getSpineItemPageIndexFromNode(
            node,
            offset || 0,
            spineItem,
          )
        : undefined
    }

    return spineItemLocator.getSpineItemPageIndexFromNode(
      node,
      offset || 0,
      spineItemOrIndex,
    )
  }

  const getVisiblePagesFromViewportPosition = ({
    position,
    threshold,
    spineItem,
  }: {
    position: ViewportPosition
    threshold: number
    spineItem: SpineItem
  }):
    | {
        beginPageIndex: number
        endPageIndex: number
      }
    | undefined => {
    const numberOfPages = spineItemLocator.getSpineItemNumberOfPages({
      spineItem,
    })

    const pages = Array.from(Array(numberOfPages)).map((_, index) => ({
      index,
      pageSpineItemPosition: spineItemLocator.getSpineItemPositionFromPageIndex(
        index,
        spineItem,
      ),
    }))

    const spineItemPosition = getSpineItemPositionFromSpinePosition(
      position,
      spineItem,
    )

    const pagesVisible = pages.reduce<number[]>(
      (acc, { pageSpineItemPosition, index }) => {
        if (
          spineItemLocator.isPageVisibleForSpineItemPosition({
            pageSpineItemPosition,
            threshold,
            spineItemPosition,
          })
        ) {
          return [...acc, index]
        }

        return acc
      },
      [],
    )

    const beginPageIndex = pagesVisible[0]
    const endPageIndex = pagesVisible[pagesVisible.length - 1] ?? beginPageIndex

    if (beginPageIndex === undefined || endPageIndex === undefined)
      return undefined

    return {
      beginPageIndex,
      endPageIndex,
    }
  }

  const isPositionWithinSpineItem = (
    position: ViewportPosition,
    spineItem: SpineItem,
  ) => {
    const { bottom, left, right, top } =
      spineItemManager.getAbsolutePositionOf(spineItem)

    return (
      position.x >= left &&
      position.x <= right &&
      position.y <= bottom &&
      position.y >= top
    )
  }

  // @todo move into spine item locator
  const getSafeSpineItemPositionFromUnsafeSpineItemPosition = (
    unsafePosition: UnsafeSpineItemPosition,
    spineItem: SpineItem,
  ): SafeSpineItemPosition => {
    const { height, width } = spineItemManager.getAbsolutePositionOf(spineItem)

    return {
      x: Math.min(Math.max(0, unsafePosition.x), width),
      y: Math.min(Math.max(0, unsafePosition.y), height),
    }
  }

  return {
    getSpinePositionFromSpineItemPosition,
    getSpinePositionFromSpineItem,
    getSpineItemPositionFromSpinePosition,
    getSpineItemFromPosition,
    getSpineItemFromIframe,
    getSpineItemPageIndexFromNode,
    getVisibleSpineItemsFromPosition,
    getVisiblePagesFromViewportPosition,
    isPositionWithinSpineItem,
    spineItemLocator,
    getSafeSpineItemPositionFromUnsafeSpineItemPosition,
  }
}
