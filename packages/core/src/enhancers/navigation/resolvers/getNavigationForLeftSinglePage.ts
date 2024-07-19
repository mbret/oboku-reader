import { Context } from "../../../context/Context"
import { NavigationResolver } from "../../../navigation/resolvers/NavigationResolver"
import { ViewportPosition } from "../../../navigation/ViewportNavigator"
import { SpineLocator } from "../../../spine/locationResolver"
import { SpineItemManager } from "../../../spineItemManager"
import { getSpineItemPositionForLeftPage } from "./getSpineItemPositionForLeftPage"

export const getNavigationForLeftSinglePage = ({
  position,
  navigationResolver,
  computedPageTurnDirection,
  spineItemManager,
  spineLocator,
  context,
}: {
  position: ViewportPosition
  navigationResolver: NavigationResolver
  computedPageTurnDirection: "horizontal" | "vertical"
  spineItemManager: SpineItemManager
  spineLocator: SpineLocator
  context: Context
}): ViewportPosition => {
  const pageTurnDirection = computedPageTurnDirection
  const spineItem =
    spineLocator.getSpineItemFromPosition(position) || spineItemManager.get(0)
  const defaultNavigation = position

  if (!spineItem) {
    return defaultNavigation
  }

  const spineItemPosition = spineLocator.getSpineItemPositionFromSpinePosition(
    position,
    spineItem,
  )

  const spineItemNavigation = getSpineItemPositionForLeftPage({
    position: spineItemPosition,
    spineItem,
    pageHeight: context.getPageSize().height,
    pageWidth: context.getPageSize().width,
    spineItemLocator: spineLocator.spineItemLocator,
  })

  const isNewNavigationInCurrentItem = navigationResolver.arePositionsDifferent(
    spineItemNavigation,
    spineItemPosition,
  )

  if (!isNewNavigationInCurrentItem) {
    return navigationResolver.wrapPositionWithSafeEdge(
      pageTurnDirection === `horizontal`
        ? { x: position.x - context.getPageSize().width, y: 0 }
        : { y: position.y - context.getPageSize().height, x: 0 },
    )
  } else {
    const readingOrderPosition =
      spineLocator.getSpinePositionFromSpineItemPosition(
        spineItemNavigation,
        spineItem,
      )

    return readingOrderPosition
  }
}
