import { Report } from "../../report"
import { Context } from "../../context/Context"
import { SpineItemManager } from "../../spineItemManager"
import { SpineItem } from "../../spineItem/createSpineItem"
import { createNavigationResolver as createSpineItemNavigator } from "../../spineItem/navigationResolver"
import { createSpineLocationResolver } from "../../spine/locationResolver"
import { createCfiLocator } from "../../spine/cfiLocator"
import { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import { ViewportPosition } from "../ViewportNavigator"
import {
  SafeSpineItemPosition,
  UnsafeSpineItemPosition,
} from "../../spineItem/types"
import { getAdjustedPositionForSpread } from "./getAdjustedPositionForSpread"
import { wrapPositionWithSafeEdge } from "./wrapPositionWithSafeEdge"
import { getNavigationForUrl } from "./getNavigationForUrl"
import { getNavigationFromSpineItemPosition } from "./getNavigationFromSpineItemPosition"

export const NAMESPACE = `spineNavigator`

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
        position: getAdjustedPositionForSpread({
          position: readingPosition,
          pageSizeWidth: context.getPageSize().width,
          visibleAreaRectWidth: context.state.visibleAreaRect.width,
        }),
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

    return getAdjustedPositionForSpread({
      position,
      pageSizeWidth: context.getPageSize().width,
      visibleAreaRectWidth: context.state.visibleAreaRect.width,
    })
  }

  const getNavigationForSpineIndexOrId = (
    indexOrId: number | string | SpineItem,
  ): ViewportPosition => {
    const spineItem = spineItemManager.get(indexOrId)

    if (spineItem) {
      const position = locator.getSpinePositionFromSpineItem(spineItem)

      return getAdjustedPositionForSpread({
        position,
        pageSizeWidth: context.getPageSize().width,
        visibleAreaRectWidth: context.state.visibleAreaRect.width,
      })
    }

    return { x: 0, y: 0 }
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

      return getAdjustedPositionForSpread({
        position: viewportNavigation,
        pageSizeWidth: context.getPageSize().width,
        visibleAreaRectWidth: context.state.visibleAreaRect.width,
      })
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
      position: {
        x: triggerXPosition,
        y: triggerYPosition,
      },
      isRTL: context.isRTL(),
      pageSizeHeight: context.getPageSize().height,
      pageSizeWidth: context.getPageSize().width,
      spineItemManager,
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
    getNavigationForUrl: (url: string | URL) =>
      getNavigationForUrl({
        context,
        spineItemManager,
        spineLocator: locator,
        url,
        pageSizeWidth: context.getPageSize().width,
        visibleAreaRectWidth: context.state.visibleAreaRect.width,
      }),
    getNavigationFromSpineItemPosition: (params: {
      spineItemPosition: UnsafeSpineItemPosition
      spineItem: SpineItem
    }) =>
      getNavigationFromSpineItemPosition({
        ...params,
        spineItemLocator: locator.spineItemLocator,
        spineLocator: locator,
      }),
    getNavigationForCfi,
    getNavigationForLastPage,
    getNavigationForSpineIndexOrId,
    getNavigationForPosition,
    getMostPredominantNavigationForPosition,
    wrapPositionWithSafeEdge: (position: ViewportPosition) =>
      wrapPositionWithSafeEdge({
        position,
        isRTL: context.isRTL(),
        pageSizeHeight: context.getPageSize().height,
        pageSizeWidth: context.getPageSize().width,
        spineItemManager,
      }),
    isNavigationGoingForwardFrom,
    areNavigationDifferent,
    arePositionsDifferent,
    getAdjustedPositionForSpread: (position: ViewportPosition) =>
      getAdjustedPositionForSpread({
        position,
        pageSizeWidth: context.getPageSize().width,
        visibleAreaRectWidth: context.state.visibleAreaRect.width,
      }),
    spineItemNavigator,
    cfiLocator,
  }
}
