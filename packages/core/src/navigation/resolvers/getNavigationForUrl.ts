import { Context } from "../../context/Context"
import { ViewportPosition } from "../ViewportNavigator"
import { getClosestValidOffsetFromApproximateOffsetInPages } from "../../pagination/helpers"
import { SpineLocator } from "../../spine/locationResolver"
import { SpineItem } from "../../spineItem/createSpineItem"
import { SpineItemManager } from "../../spineItemManager"
import { getAdjustedPositionForSpread } from "./getAdjustedPositionForSpread"

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
  context,
  pageSizeWidth,
  visibleAreaRectWidth,
}: {
  anchor: string
  spineItem: SpineItem
  spineLocator: SpineLocator
  context: Context
  pageSizeWidth: number
  visibleAreaRectWidth: number
}) => {
  const position = getSpinePositionFromSpineItemAnchor({
    anchor,
    context,
    spineItem,
    spineLocator,
  })

  return getAdjustedPositionForSpread({
    position,
    pageSizeWidth,
    visibleAreaRectWidth,
  })
}

export const getNavigationForUrl = ({
  context,
  spineItemManager,
  spineLocator,
  url,
  pageSizeWidth,
  visibleAreaRectWidth,
}: {
  url: string | URL
  spineItemManager: SpineItemManager
  spineLocator: SpineLocator
  context: Context
  pageSizeWidth: number
  visibleAreaRectWidth: number
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
          spineLocator,
          pageSizeWidth,
          visibleAreaRectWidth,
        })

        return {
          position: getAdjustedPositionForSpread({
            position,
            pageSizeWidth,
            visibleAreaRectWidth,
          }),
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
