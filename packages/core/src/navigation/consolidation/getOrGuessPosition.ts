import { SpineItemManager } from "../../spineItemManager"
import {
  InternalNavigationInput,
} from "../InternalNavigator"
import { NavigationResolver } from "../resolvers/NavigationResolver"

export const getOrGuessPosition = ({
  navigation,
  navigationResolver,
  spineItemManager,
}: {
  navigation: InternalNavigationInput
  navigationResolver: NavigationResolver
  spineItemManager: SpineItemManager
}) => {
  const spineItem = spineItemManager.get(navigation.spineItem)

  /**
   * We have been given position, we just make sure to prevent navigation
   * in outer edges.
   */
  if (navigation.position) {
    return navigationResolver.wrapPositionWithSafeEdge(navigation.position)
  }

  /**
   * We have been given a CFI.
   *
   * heavy lookup, should only happens if a user navigate
   * without position AND a cfi for the first time.
   */
  if (navigation.cfi) {
    const { position } = navigationResolver.getNavigationForCfi(navigation.cfi)

    return position
  }

  if (!spineItem) return { x: 0, y: 0 }

  /**
   * Fallback.
   *
   * We get the most appropriate navigation for spine item.
   */
  return navigationResolver.getNavigationForSpineIndexOrId(spineItem)
}
