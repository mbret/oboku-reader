import type { SpineItemLocator } from "../../../spineItem/locationResolver"
import type { SpineItem } from "../../../spineItem/SpineItem"
import type {
  SafeSpineItemPosition,
  UnsafeSpineItemPosition,
} from "../../../spineItem/types"

export const getSpineItemPositionForRightPage = ({
  position,
  spineItem,
  pageHeight,
  pageWidth,
  spineItemLocator,
}: {
  position: UnsafeSpineItemPosition
  spineItem: SpineItem
  pageWidth: number
  pageHeight: number
  spineItemLocator: SpineItemLocator
}): SafeSpineItemPosition => {
  let nextPotentialPosition = {
    x: position.x + pageWidth,
    y: position.y,
  }

  if (spineItem.isUsingVerticalWriting()) {
    nextPotentialPosition = {
      x: position.x,
      y: position.y - pageHeight,
    }
  }

  const navigationPosition =
    spineItemLocator.getSpineItemClosestPositionFromUnsafePosition(
      nextPotentialPosition,
      spineItem,
    )

  return navigationPosition
}
