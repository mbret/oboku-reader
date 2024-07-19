import { Context } from "../../context/Context"
import { NavigationResolver } from "./NavigationResolver"
import { ViewportPosition } from "../ViewportNavigator"
import { getClosestValidOffsetFromApproximateOffsetInPages } from "../../pagination/helpers"
import { SpineLocator } from "../../spine/locationResolver"
import { SpineItem } from "../../spineItem/createSpineItem"
import { SpineItemManager } from "../../spineItemManager"

const getSpineItemOffsetFromAnchor = ({
  anchor,
  spineItem,
  context,
}: {
  anchor: string
  spineItem: SpineItem
  context: Context
}) => {
  const itemWidth = spineItem.getElementDimensions()?.width || 0
  const pageWidth = context.getPageSize().width
  const anchorElementBoundingRect =
    spineItem.getBoundingRectOfElementFromSelector(anchor)

  const offsetOfAnchor = anchorElementBoundingRect?.x || 0

  return getClosestValidOffsetFromApproximateOffsetInPages(
    offsetOfAnchor,
    pageWidth,
    itemWidth,
  )
}

const getSpinePositionFromSpineItemAnchor = ({
  anchor,
  context,
  spineItem,
  spineLocator,
}: {
  anchor: string
  spineItem: SpineItem
  context: Context
  spineLocator: SpineLocator
}) => {
  const spineItemOffset = getSpineItemOffsetFromAnchor({
    anchor,
    spineItem,
    context,
  })

  const position = spineLocator.getSpinePositionFromSpineItemPosition(
    { x: spineItemOffset, y: 0 },
    spineItem,
  )

  return position
}

const getNavigationForAnchor = ({
  anchor,
  spineItem,
  spineLocator,
  navigationResolver,
  context,
}: {
  anchor: string
  spineItem: SpineItem
  spineLocator: SpineLocator
  navigationResolver: NavigationResolver
  context: Context
}) => {
  const position = getSpinePositionFromSpineItemAnchor({
    anchor,
    context,
    spineItem,
    spineLocator,
  })

  return navigationResolver.getAdjustedPositionForSpread(position)
}

export const getNavigationForUrl = ({
  context,
  navigationResolver,
  spineItemManager,
  spineLocator,
  url,
}: {
  url: string | URL
  spineItemManager: SpineItemManager
  spineLocator: SpineLocator
  context: Context
  navigationResolver: NavigationResolver
}): { position: ViewportPosition; spineItemId: string } | undefined => {
  try {
    const validUrl = url instanceof URL ? url : new URL(url)
    const urlWithoutAnchor = `${validUrl.origin}${validUrl.pathname}`
    const existingSpineItem = context.manifest?.spineItems.find(
      (item) => item.href === urlWithoutAnchor,
    )

    if (existingSpineItem) {
      const spineItem = spineItemManager.get(existingSpineItem.id)

      if (spineItem) {
        const position = getNavigationForAnchor({
          anchor: validUrl.hash,
          spineItem,
          context,
          navigationResolver,
          spineLocator,
        })

        return {
          position: navigationResolver.getAdjustedPositionForSpread(position),
          spineItemId: existingSpineItem.id,
        }
      }
    }

    return undefined
  } catch (e) {
    console.error(e)

    return undefined
  }
}
