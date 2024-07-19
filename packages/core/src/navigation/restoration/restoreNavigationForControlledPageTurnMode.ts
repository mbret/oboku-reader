import { SpineLocationResolver } from "../../spine/resolvers/SpineLocationResolver"
import { SpineItemManager } from "../../spineItemManager"
import { InternalNavigationEntry } from "../InternalNavigator"
import { NavigationResolver } from "../resolvers/NavigationResolver"

export const restoreNavigationForControlledPageTurnMode = ({
  spineLocator,
  navigation,
  navigationResolver,
  spineItemManager,
}: {
  navigation: InternalNavigationEntry
  spineLocator: SpineLocationResolver
  navigationResolver: NavigationResolver
  spineItemManager: SpineItemManager
}) => {
  const spineItem = spineItemManager.get(navigation.spineItem)

  if (!spineItem) {
    return { x: 0, y: 0 }
  }

  const spineItemAbsolutePosition =
    spineItemManager.getAbsolutePositionOf(spineItem)

  const isPositionWithinSpineItem = spineLocator.isPositionWithinSpineItem(
    navigation.position,
    spineItem,
  )

  const hasSpineItemShiftedPosition =
    spineItemAbsolutePosition.left !== navigation.spineItemLeft ||
    spineItemAbsolutePosition.top !== navigation.spineItemTop

  const spineItemWidthDifference =
    spineItemAbsolutePosition.width - (navigation.spineItemWidth ?? 0)
  const spineItemHeighDifference =
    spineItemAbsolutePosition.height - (navigation.spineItemHeight ?? 0)

  const hasSpineItemGrewOrShrink =
    spineItemWidthDifference !== 0 || spineItemHeighDifference !== 0

  /**
   * Url navigation has higher priority together with CFI, we should
   * restore from it first.
   */
  if (navigation.url !== undefined) {
    const urlResult = navigationResolver.getNavigationForUrl(navigation.url)

    if (urlResult) {
      return urlResult.position
    }
  }

  if (isPositionWithinSpineItem) {
    if (hasSpineItemShiftedPosition) {
      const spineItemPosition = navigation.positionInSpineItem ?? {
        x: 0,
        y: 0,
      }

      return navigationResolver.getNavigationFromSpineItemPosition({
        spineItem,
        spineItemPosition,
      })
    }

    if (
      hasSpineItemGrewOrShrink &&
      navigation.directionFromLastNavigation === "backward"
    ) {
      const positionInSpineItemWithDifference = {
        x: (navigation.positionInSpineItem?.x ?? 0) + spineItemWidthDifference,
        y: (navigation.positionInSpineItem?.y ?? 0) + spineItemHeighDifference,
      }

      return navigationResolver.getNavigationFromSpineItemPosition({
        spineItem,
        spineItemPosition: positionInSpineItemWithDifference,
      })
    }

    return navigationResolver.getNavigationForPosition(navigation.position)
  }

  /**
   * Fallback.
   *
   * We find the most appropriate navigation for spine item.
   */
  const fallbackPosition =
    navigationResolver.getNavigationForSpineIndexOrId(spineItem)

  return {
    x: fallbackPosition.x,
    y: fallbackPosition.y,
  }
}
