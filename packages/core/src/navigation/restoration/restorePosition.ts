import { Context } from "../../context/Context"
import { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import { SpineLocator } from "../../spine/locationResolver"
import { SpineItemLocator } from "../../spineItem/locationResolver"
import { SpineItemManager } from "../../spineItemManager"
import { InternalNavigationEntry } from "../InternalNavigator"
import { NavigationResolver } from "../resolvers/NavigationResolver"
import { ViewportPosition } from "../ViewportNavigator"
import { restoreNavigationForControlledPageTurnMode } from "./restoreNavigationForControlledPageTurnMode"

const restoreNavigationForScrollingPageTurnMode = ({
  navigation,
  spineLocator,
  spineItemManager,
  settings,
  navigationResolver,
}: {
  spineItemManager: SpineItemManager
  spineLocator: SpineLocator
  settings: ReaderSettingsManager
  navigationResolver: NavigationResolver
  navigation: InternalNavigationEntry
}): InternalNavigationEntry["position"] => {
  const { spineItem } = navigation
  const foundSpineItem = spineItemManager.get(spineItem)

  if (!foundSpineItem) return { x: 0, y: 0 }

  const { height, top } = spineItemManager.getAbsolutePositionOf(foundSpineItem)

  const isPositionWithinSpineItem = spineLocator.isPositionWithinSpineItem(
    navigation.position,
    foundSpineItem,
  )

  const positionInSpineItem = navigation.positionInSpineItem ?? {
    y: 0,
    x: 0,
  }

  /**
   * - vertical scroll
   */
  if (settings.settings.computedPageTurnDirection === "vertical") {
    /**
     * - item did not shift
     * - item same height
     * - we are still within the item
     */
    if (
      top === navigation.spineItemTop &&
      height === navigation.spineItemHeight &&
      isPositionWithinSpineItem
    ) {
      /**
       * -> nothing
       */
      return navigation.position
    }

    /**
     * vertical scroll
     * - item did not shift
     * - item same height
     * - not within item
     */
    if (
      top === navigation.spineItemTop &&
      height === navigation.spineItemHeight &&
      !isPositionWithinSpineItem
    ) {
      /**
       * -> fallback to begining of item
       */
      return navigationResolver.getNavigationForSpineIndexOrId(foundSpineItem)
    }

    /**
     * - item shifted
     */
    if (top !== navigation.spineItemTop) {
      /**
       * -> fallback to position we were in spine item
       */
      const positionInSpineItem =
        spineLocator.getSafeSpineItemPositionFromUnsafeSpineItemPosition(
          navigation.positionInSpineItem ?? {
            x: 0,
            y: 0,
          },
          foundSpineItem,
        )

      return spineLocator.getSpinePositionFromSpineItemPosition(
        positionInSpineItem,
        foundSpineItem,
      )
    }

    /**
     * - item did not shift
     * - height changed
     */
    if (
      top === navigation.spineItemTop &&
      height !== navigation.spineItemHeight
    ) {
      const positionYfromBottomPreviousNavigation =
        (navigation.spineItemHeight ?? positionInSpineItem.y) -
        positionInSpineItem.y

      const positionInspineItem = {
        y:
          navigation.directionFromLastNavigation === "backward"
            ? height - positionYfromBottomPreviousNavigation
            : positionInSpineItem.y,
        x: navigation.position.x,
      }

      /**
       * - position within item
       *
       * @problems
       * - position may be wrong since the item changed its content
       *
       * @restoration
       * We try to get as much as info as possible from previous navigation
       * so we can find the best accurate spot the user was
       */
      if (isPositionWithinSpineItem) {
        /**
         * - we navigate to the closest valid position
         */
        const positionInSpineItem =
          spineLocator.getSafeSpineItemPositionFromUnsafeSpineItemPosition(
            positionInspineItem,
            foundSpineItem,
          )

        return spineLocator.getSpinePositionFromSpineItemPosition(
          positionInSpineItem,
          foundSpineItem,
        )
      }

      /**
       * - position not within item anymore
       * - we are too far down
       */
      if (!isPositionWithinSpineItem) {
        if (navigation.directionFromLastNavigation === "backward") {
          const positionInItem = {
            y: height - positionYfromBottomPreviousNavigation,
            x: navigation.position.x,
          }

          return spineLocator.getSpinePositionFromSpineItemPosition(
            spineLocator.getSafeSpineItemPositionFromUnsafeSpineItemPosition(
              positionInItem,
              foundSpineItem,
            ),
            foundSpineItem,
          )
        }

        if (
          navigation.directionFromLastNavigation === "forward" ||
          navigation.directionFromLastNavigation === "anchor"
        ) {
          const positionInItem = {
            y: height - positionYfromBottomPreviousNavigation,
            x: navigation.position.x,
          }

          return spineLocator.getSpinePositionFromSpineItemPosition(
            spineLocator.getSafeSpineItemPositionFromUnsafeSpineItemPosition(
              positionInItem,
              foundSpineItem,
            ),
            foundSpineItem,
          )
        }

        /**
         * - we anchor back to begining of item
         */
        return navigationResolver.getNavigationForSpineIndexOrId(foundSpineItem)
      }
    }
  }

  return navigation.position
}

export const restorePosition = ({
  navigation,
  spineItemManager,
  settings,
  spineLocator,
  navigationResolver,
}: {
  spineLocator: SpineLocator
  settings: ReaderSettingsManager
  navigationResolver: NavigationResolver
  navigation: InternalNavigationEntry
  spineItemManager: SpineItemManager
  spineItemLocator: SpineItemLocator
  context: Context
}): ViewportPosition => {
  if (settings.settings.computedPageTurnMode === "scrollable") {
    return restoreNavigationForScrollingPageTurnMode({
      navigation,
      spineLocator,
      navigationResolver,
      settings,
      spineItemManager,
    })
  }

  return restoreNavigationForControlledPageTurnMode({
    navigation,
    spineLocator,
    navigationResolver,
    spineItemManager,
  })
}
