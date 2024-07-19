import { Report } from "../../report"
import { Context } from "../../context/Context"
import { SpineItemManager } from "../../spineItemManager"
import { SpineItem } from "../../spineItem/createSpineItem"
import { createNavigationResolver as createSpineItemNavigator } from "../../spineItem/navigationResolver"
import { createSpineLocationResolver } from "../../spine/locationResolver"
import { createCfiLocator } from "../../spine/cfiLocator"
import { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import { ViewportPosition } from "../ViewportNavigator"
import { SafeSpineItemPosition } from "../../spineItem/types"

const NAMESPACE = `spineNavigator`

export type NavigationResolver = ReturnType<typeof createNavigationResolver>

export const createNavigationResolver = ({
  context,
  spineItemManager,
  cfiLocator,
  locator,
  settings,
}: {
  context: Context
  spineItemManager: SpineItemManager
  cfiLocator: ReturnType<typeof createCfiLocator>
  locator: ReturnType<typeof createSpineLocationResolver>
  settings: ReaderSettingsManager
}) => {
  const spineItemNavigator = createSpineItemNavigator({ context, settings })

  const arePositionsDifferent = (
    a: { x: number; y: number },
    b: { x: number; y: number },
  ) => a.x !== b.x || a.y !== b.y

  const areNavigationDifferent = (a: ViewportPosition, b: ViewportPosition) =>
    arePositionsDifferent(a, b) ||
    (!!a.spineItem && !!b.spineItem && a.spineItem !== b.spineItem)

  const wrapPositionWithSafeEdge = Report.measurePerformance(
    `${NAMESPACE} wrapPositionWithSafeEdge`,
    1,
    (position: ViewportPosition) => {
      // @todo use container width instead to increase performances
      const lastSpineItem = spineItemManager.get(
        spineItemManager.getLength() - 1,
      )
      const distanceOfLastSpineItem = spineItemManager.getAbsolutePositionOf(
        lastSpineItem || 0,
      )

      const maximumYOffset =
        distanceOfLastSpineItem.bottom - context.getPageSize().height
      const y = Math.min(Math.max(0, position.y), maximumYOffset)

      /**
       * For RTL books we move from right to left so negative x.
       * [-x, 0]
       */
      if (context.isRTL()) {
        return {
          x: Math.max(Math.min(0, position.x), distanceOfLastSpineItem.left),
          y,
        }
      }

      const maximumXOffset =
        distanceOfLastSpineItem.right - context.getPageSize().width

      return {
        x: Math.min(Math.max(0, position.x), maximumXOffset),
        y,
      }
    },
    { disable: true },
  )

  const getAdjustedPositionForSpread = ({
    x,
    y,
  }: ViewportPosition): ViewportPosition => {
    const isOffsetNotAtEdge = x % context.state.visibleAreaRect.width !== 0
    const correctedX = isOffsetNotAtEdge ? x - context.getPageSize().width : x

    return { x: correctedX, y }
  }

  const getNavigationForCfi = (
    cfi: string,
  ): { position: ViewportPosition; spineItem?: SpineItem } => {
    const spineItem = cfiLocator.getSpineItemFromCfi(cfi)
    const { node, offset = 0 } = cfiLocator.resolveCfi(cfi) || {}

    if (!spineItem) {
      Report.warn(NAMESPACE, `unable to detect item id from cfi ${cfi}`)
    } else {
      const spineItemNavigation = node
        ? spineItemNavigator.getNavigationFromNode(spineItem, node, offset)
        : ({ x: 0, y: 0 } as SafeSpineItemPosition)
      const readingPosition = locator.getSpinePositionFromSpineItemPosition(
        spineItemNavigation,
        spineItem,
      )

      return {
        spineItem,
        position: getAdjustedPositionForSpread(readingPosition),
      }
    }

    return { spineItem, position: { x: 0, y: 0 } }
  }

  const getNavigationForLastPage = (spineItem: SpineItem): ViewportPosition => {
    const spineItemNavigation =
      spineItemNavigator.getNavigationForLastPage(spineItem)
    const position = locator.getSpinePositionFromSpineItemPosition(
      spineItemNavigation,
      spineItem,
    )

    return getAdjustedPositionForSpread(position)
  }

  const getNavigationForSpineIndexOrId = (
    indexOrId: number | string | SpineItem,
  ): ViewportPosition => {
    const spineItem = spineItemManager.get(indexOrId)

    if (spineItem) {
      const position = locator.getSpinePositionFromSpineItem(spineItem)

      return getAdjustedPositionForSpread(position)
    }

    return { x: 0, y: 0 }
  }

  const getNavigationForRightSinglePage = (
    position: ViewportPosition,
  ): ViewportPosition => {
    const pageTurnDirection = settings.settings.computedPageTurnDirection
    const spineItem =
      locator.getSpineItemFromPosition(position) || spineItemManager.get(0)
    const defaultNavigation = position

    if (!spineItem) {
      return defaultNavigation
    }

    // translate viewport position into reading item local position
    const spineItemPosition = locator.getSpineItemPositionFromSpinePosition(
      position,
      spineItem,
    )
    // get reading item local position for right page
    const spineItemNavigationForRightPage =
      spineItemNavigator.getNavigationForRightPage(spineItemPosition, spineItem)

    // check both position to see if we moved out of it
    const isNewNavigationInCurrentItem = arePositionsDifferent(
      spineItemNavigationForRightPage,
      spineItemPosition,
    )

    if (!isNewNavigationInCurrentItem) {
      return wrapPositionWithSafeEdge(
        pageTurnDirection === `horizontal`
          ? { x: position.x + context.getPageSize().width, y: 0 }
          : { y: position.y + context.getPageSize().height, x: 0 },
      )
    } else {
      const readingOrderPosition =
        locator.getSpinePositionFromSpineItemPosition(
          spineItemNavigationForRightPage,
          spineItem,
        )

      return readingOrderPosition
    }
  }

  const getNavigationForLeftSinglePage = (
    position: ViewportPosition,
  ): ViewportPosition => {
    const pageTurnDirection = settings.settings.computedPageTurnDirection
    const spineItem =
      locator.getSpineItemFromPosition(position) || spineItemManager.get(0)
    const defaultNavigation = position

    if (!spineItem) {
      return defaultNavigation
    }

    const spineItemPosition = locator.getSpineItemPositionFromSpinePosition(
      position,
      spineItem,
    )
    const spineItemNavigation = spineItemNavigator.getNavigationForLeftPage(
      spineItemPosition,
      spineItem,
    )
    const isNewNavigationInCurrentItem = arePositionsDifferent(
      spineItemNavigation,
      spineItemPosition,
    )

    if (!isNewNavigationInCurrentItem) {
      return wrapPositionWithSafeEdge(
        pageTurnDirection === `horizontal`
          ? { x: position.x - context.getPageSize().width, y: 0 }
          : { y: position.y - context.getPageSize().height, x: 0 },
      )
    } else {
      const readingOrderPosition =
        locator.getSpinePositionFromSpineItemPosition(
          spineItemNavigation,
          spineItem,
        )

      return readingOrderPosition
    }
  }

  /**
   * Very naive approach for spread. It could be optimized but by using this approach
   * we do not add complexity to the code and use the current logic to handle it correctly.
   *
   * @important
   * Special case for vertical content, read content
   */
  const getNavigationForRightPage = (
    position: ViewportPosition,
  ): ViewportPosition => {
    const spineItemOnPosition =
      locator.getSpineItemFromPosition(position) || spineItemManager.get(0)

    const navigation = getNavigationForRightSinglePage(position)

    // when we move withing vertical content, because only y moves, we don't need two navigation
    if (
      spineItemOnPosition?.isUsingVerticalWriting() &&
      position.x === navigation.x
    ) {
      return getAdjustedPositionForSpread(navigation)
    }

    if (context.state.isUsingSpreadMode) {
      // in case of spread the entire screen is taken as one real page for vertical content
      // in order to move out from it we add an extra page width.
      // using `getNavigationForLeftSinglePage` again would keep x as it is and wrongly move y
      // for the next item in case it's also a vertical content
      if (
        spineItemOnPosition?.isUsingVerticalWriting() &&
        position.x !== navigation.x
      ) {
        return getAdjustedPositionForSpread(
          wrapPositionWithSafeEdge(
            context.isRTL()
              ? {
                  ...navigation,
                  x: navigation.x - context.getPageSize().width,
                }
              : {
                  ...navigation,
                  x: navigation.x + context.getPageSize().width,
                },
          ),
        )
      }

      /**
       * In vase we move vertically and the y is already different, we don't need a second navigation
       * since we already jumped to a new screen
       */
      if (
        settings.settings.computedPageTurnDirection === `vertical` &&
        position.y !== navigation.y
      ) {
        return getAdjustedPositionForSpread(navigation)
      }

      const doubleNavigation = getNavigationForRightSinglePage(navigation)

      return getAdjustedPositionForSpread(doubleNavigation)
    }

    return getAdjustedPositionForSpread(navigation)
  }

  /**
   * Very naive approach for spread. It could be optimized but by using this approach
   * we do not add complexity to the code and use the current logic to handle it correctly.
   *
   * @important
   * Special case for vertical content, read content
   */
  const getNavigationForLeftPage = (
    position: ViewportPosition,
  ): ViewportPosition => {
    const spineItemOnPosition =
      locator.getSpineItemFromPosition(position) || spineItemManager.get(0)

    const navigation = getNavigationForLeftSinglePage(position)

    // when we move withing vertical content, because only y moves, we don't need two navigation
    if (
      spineItemOnPosition?.isUsingVerticalWriting() &&
      position.x === navigation.x
    ) {
      return getAdjustedPositionForSpread(navigation)
    }

    if (context.state.isUsingSpreadMode) {
      // in case of spread the entire screen is taken as one real page for vertical content
      // in order to move out from it we add an extra page width.
      // using `getNavigationForLeftSinglePage` again would keep x as it is and wrongly move y
      // for the next item in case it's also a vertical content
      if (
        spineItemOnPosition?.isUsingVerticalWriting() &&
        position.x !== navigation.x
      ) {
        return getAdjustedPositionForSpread(
          wrapPositionWithSafeEdge(
            context.isRTL()
              ? { ...navigation, x: navigation.x + context.getPageSize().width }
              : {
                  ...navigation,
                  x: navigation.x - context.getPageSize().width,
                },
          ),
        )
      }

      /**
       * In vase we move vertically and the y is already different, we don't need a second navigation
       * since we already jumped to a new screen
       */
      if (
        settings.settings.computedPageTurnDirection === `vertical` &&
        position.y !== navigation.y
      ) {
        return getAdjustedPositionForSpread(navigation)
      }

      const doubleNavigation = getNavigationForLeftSinglePage(navigation)

      return getAdjustedPositionForSpread(doubleNavigation)
    }

    return getAdjustedPositionForSpread(navigation)
  }

  const getNavigationForPosition = (viewportPosition: ViewportPosition) => {
    const spineItem = locator.getSpineItemFromPosition(viewportPosition)

    if (spineItem) {
      const spineItemPosition = locator.getSpineItemPositionFromSpinePosition(
        viewportPosition,
        spineItem,
      )

      const spineItemValidPosition =
        spineItemNavigator.getNavigationForPosition(
          spineItem,
          spineItemPosition,
        )

      const viewportNavigation = locator.getSpinePositionFromSpineItemPosition(
        spineItemValidPosition,
        spineItem,
      )

      return getAdjustedPositionForSpread(viewportNavigation)
    }

    return { x: 0, y: 0 }
  }

  /**
   * Useful when you want to get a navigation from a scroll position. It uses trigger points so it will
   * try to get the most visible / relevant element as navigation reference
   */
  const getMostPredominantNavigationForPosition = (
    viewportPosition: ViewportPosition,
  ): ViewportPosition => {
    const pageTurnDirection = settings.settings.computedPageTurnDirection
    // @todo movingForward does not work same with free-scroll, try to find a reliable way to detect
    // const movingForward = navigator.isNavigationGoingForwardFrom(navigation, currentNavigationPosition)
    // const triggerPercentage = movingForward ? 0.7 : 0.3
    const triggerPercentage = 0.5
    const triggerXPosition =
      pageTurnDirection === `horizontal`
        ? viewportPosition.x +
          context.state.visibleAreaRect.width * triggerPercentage
        : 0
    const triggerYPosition =
      pageTurnDirection === `horizontal`
        ? 0
        : viewportPosition.y +
          context.state.visibleAreaRect.height * triggerPercentage
    const midScreenPositionSafePosition = wrapPositionWithSafeEdge({
      x: triggerXPosition,
      y: triggerYPosition,
    })

    return getNavigationForPosition(midScreenPositionSafePosition)
  }

  const isNavigationGoingForwardFrom = (
    to: ViewportPosition,
    from: ViewportPosition,
  ) => {
    const pageTurnDirection = settings.settings.computedPageTurnDirection

    if (pageTurnDirection === `vertical`) {
      return to.y > from.y
    }

    return to.x > from.x
  }

  return {
    getNavigationForCfi,
    getNavigationForLastPage,
    getNavigationForSpineIndexOrId,
    getNavigationForRightPage,
    getNavigationForLeftPage,
    getNavigationForPosition,
    getMostPredominantNavigationForPosition,
    wrapPositionWithSafeEdge,
    isNavigationGoingForwardFrom,
    areNavigationDifferent,
    arePositionsDifferent,
    getAdjustedPositionForSpread,
    spineItemNavigator,
    cfiLocator,
  }
}
