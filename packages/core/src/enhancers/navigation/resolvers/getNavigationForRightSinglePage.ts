import { Context } from "../../../context/Context"
import { NavigationResolver } from "../../../navigation/resolvers/NavigationResolver"
import { ViewportPosition } from "../../../navigation/ViewportNavigator"
import { SpineLocationResolver } from "../../../spine/resolvers/SpineLocationResolver"
import { SpineItemManager } from "../../../spineItemManager"
import { getSpineItemPositionForRightPage } from "./getSpineItemPositionForRightPage"

export const getNavigationForRightSinglePage = ({
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
  spineLocator: SpineLocationResolver
  context: Context
}): ViewportPosition => {
  const pageTurnDirection = computedPageTurnDirection
  const spineItem =
    spineLocator.getSpineItemFromPosition(position) || spineItemManager.get(0)
  const defaultNavigation = position

  if (!spineItem) {
    return defaultNavigation
  }

  // translate viewport position into reading item local position
  const spineItemPosition = spineLocator.getSpineItemPositionFromSpinePosition(
    position,
    spineItem,
  )
  // get reading item local position for right page
  const spineItemNavigationForRightPage = getSpineItemPositionForRightPage({
    position: spineItemPosition,
    spineItem,
    pageHeight: context.getPageSize().height,
    pageWidth: context.getPageSize().width,
    spineItemLocator: spineLocator.spineItemLocator,
  })

  // check both position to see if we moved out of it
  const isNewNavigationInCurrentItem = navigationResolver.arePositionsDifferent(
    spineItemNavigationForRightPage,
    spineItemPosition,
  )

  if (!isNewNavigationInCurrentItem) {
    return navigationResolver.wrapPositionWithSafeEdge(
      pageTurnDirection === `horizontal`
        ? { x: position.x + context.getPageSize().width, y: 0 }
        : { y: position.y + context.getPageSize().height, x: 0 },
    )
  } else {
    const readingOrderPosition =
      spineLocator.getSpinePositionFromSpineItemPosition(
        spineItemNavigationForRightPage,
        spineItem,
      )

    return readingOrderPosition
  }
}
