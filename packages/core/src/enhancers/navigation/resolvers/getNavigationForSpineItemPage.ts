import { Context } from "../../../context/Context"
import { NavigationResolver } from "../../../navigation/resolvers/NavigationResolver"
import { ViewportPosition } from "../../../navigation/ViewportNavigator"
import { SpineLocator } from "../../../spine/locationResolver"
import { SpineItem } from "../../../spineItem/createSpineItem"
import { SpineItemNavigationResolver } from "../../../spineItem/navigationResolver"
import { SpineItemManager } from "../../../spineItemManager"

export const getNavigationForSpineItemPage = ({
  pageIndex,
  spineItemManager,
  spineItemId,
  context,
  spineItemNavigationResolver,
  spineLocator,
  navigationResolver,
}: {
  pageIndex: number
  spineItemId?: SpineItem | number | string
  spineItemManager: SpineItemManager
  spineItemNavigationResolver: SpineItemNavigationResolver
  spineLocator: SpineLocator
  context: Context
  navigationResolver: NavigationResolver
}): ViewportPosition => {
  const spineItem = spineItemManager.get(spineItemId)

  // lookup for entire book
  // This is reliable for pre-paginated, do not use it for reflowable book
  if (!spineItem) {
    const xPositionForPageIndex = pageIndex * context.getPageSize().width
    return navigationResolver.getNavigationForPosition({
      x: xPositionForPageIndex,
      y: 0,
    })
  }

  const spineItemNavigation = spineItemNavigationResolver.getNavigationForPage(
    pageIndex,
    spineItem,
  )
  const readingOffset = spineLocator.getSpinePositionFromSpineItemPosition(
    spineItemNavigation,
    spineItem,
  )

  return navigationResolver.getAdjustedPositionForSpread(readingOffset)
}
