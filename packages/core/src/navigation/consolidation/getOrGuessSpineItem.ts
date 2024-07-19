import { Context } from "../../context/Context"
import { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import { SpineLocationResolver } from "../../spine/resolvers/SpineLocationResolver"
import { SpineItemManager } from "../../spineItemManager"
import {
  InternalNavigationEntry,
  InternalNavigationInput,
} from "../InternalNavigator"
import { NavigationResolver } from "../resolvers/NavigationResolver"

/**
 * Will return the given spine item if correct.
 * Otherwise will return the spine item relative to given position
 * Otherwise will return spine item 0
 *
 * If position is set on a different spine item than the given one, we ignore
 * position and return spine item.
 */
export const getOrGuessSpineItem = ({
  navigation,
  direction,
  context,
  spineItemManager,
  settings,
  navigationResolver,
  spineLocator,
}: {
  navigation: InternalNavigationInput
  direction: InternalNavigationEntry["directionFromLastNavigation"]
  context: Context
  spineItemManager: SpineItemManager
  settings: ReaderSettingsManager
  navigationResolver: NavigationResolver
  spineLocator: SpineLocationResolver
}) => {
  const { position, spineItem, cfi } = navigation
  const { navigationSnapThreshold, computedPageTurnMode } = settings.settings

  if (spineItem !== undefined) {
    const existingSpineItem = spineItemManager.get(spineItem)

    if (existingSpineItem) return existingSpineItem

    if (
      typeof spineItem === "number" &&
      spineItem > spineItemManager.getLength() - 1
    ) {
      return spineItemManager.get(spineItemManager.getLength() - 1)
    }

    return spineItemManager.get(0)
  }

  // light lookup
  if (cfi) {
    const existingSpineItem =
      navigationResolver.cfiLocator.getSpineItemFromCfi(cfi)

    if (existingSpineItem) return existingSpineItem
  }

  /**
   * On controlled mod, we try to get the most logical spine item.
   * Not necessarily the one at the exact position. This is because
   * we can have a midway navigation (pan)
   */
  if (position && computedPageTurnMode === "controlled") {
    const { beginIndex, endIndex } =
      spineLocator.getVisibleSpineItemsFromPosition({
        position,
        threshold: navigationSnapThreshold,
        restrictToScreen: true,
      }) ?? {}

    if (
      (direction === "forward" || direction === "anchor") &&
      endIndex !== undefined
    )
      return spineItemManager.get(endIndex)
    if (direction === "backward" && beginIndex !== undefined)
      return spineItemManager.get(beginIndex)
  }

  /**
   * On scrollable content, we just get the spine item at the position
   */
  if (position) {
    return spineLocator.getSpineItemFromPosition(position)
  }

  return spineItemManager.get(0)
}
