import { SpineLocationResolver } from "../../spine/resolvers/SpineLocationResolver"
import { SpineItem } from "../../spineItem/createSpineItem"
import { SpineItemLocator } from "../../spineItem/locationResolver"
import { UnsafeSpineItemPosition } from "../../spineItem/types"

export const getNavigationFromSpineItemPosition = ({
  spineItem,
  spineItemPosition,
  spineLocator,
  spineItemLocator,
}: {
  spineItemPosition: UnsafeSpineItemPosition
  spineItem: SpineItem
  spineLocator: SpineLocationResolver
  spineItemLocator: SpineItemLocator
}) => {
  const navigationInSpineItem =
    spineItemLocator.getSpineItemClosestPositionFromUnsafePosition(
      spineItemPosition,
      spineItem,
    )

  const spinePosition = spineLocator.getSpinePositionFromSpineItemPosition(
    navigationInSpineItem,
    spineItem,
  )

  return spinePosition
}
