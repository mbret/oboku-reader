import { Context } from "../../context/Context"
import { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import {
  InternalNavigationEntry,
  InternalNavigationInput,
} from "../InternalNavigator"

/**
 * Since a consolidation happens synchronously after each navigation
 * we know we have at leat spine item everytime (independently from TS).
 *
 * For same spine item, we can only speculate
 */
export const getOrGuessDirection = ({
  navigation,
  previousNavigation,
  context,
  settings,
  // expectedSpineItem,
  // expectedPosition,
}: {
  previousNavigation: InternalNavigationEntry
  navigation: InternalNavigationInput
  context: Context
  settings: ReaderSettingsManager
  // expectedSpineItem: SpineItem
  // expectedPosition: ViewportPosition
}): InternalNavigationEntry["directionFromLastNavigation"] => {
  /**
   * When we come from a restoration we might already have the
   * value setup, we should keep it.
   */
  if (navigation.directionFromLastNavigation)
    return navigation.directionFromLastNavigation

  if (navigation.direction) {
    switch (navigation.direction) {
      case "bottom":
        return "forward"
      case "top":
        return "backward"
      case "left":
        return context.isRTL() ? "forward" : "backward"
      case "right":
        return context.isRTL() ? "backward" : "forward"
    }
  }

  if (navigation.url !== undefined) {
    return "anchor"
  }

  if (previousNavigation.spineItem === undefined) {
    return "forward"
  }

  /**
   * User navigate to specific spine item, we should
   * treat it as forward.
   *
   * Use case:
   * User navigate to back spine item & spine item is unloaded.
   * When spine item load and if we use backward, we will give the
   * idea the user want to be restored from the end of spine item whereas
   * he should be redirected to the begining of spine item.
   */
  if (navigation.spineItem) {
    return "forward"
  }

  if (!navigation.position) {
    return "forward"
  }

  // const prevSpineItem = this.spineItemManager.get(
  //   previousNavigation.spineItem,
  // )

  // const currSpineItem = this.spineItemManager.get(expectedSpineItem)

  // // should not happens either
  // if (!prevSpineItem || !currSpineItem) {
  //   return "forward"
  // }

  // const positionOfCurrentSpineItem = this.spineItemManager.comparePositionOf(
  //   currSpineItem,
  //   prevSpineItem,
  // )

  /**
   * Easy use case for when spine item are differents
   */
  // if (positionOfCurrentSpineItem === "after") {
  //   return "forward"
  // }

  // if (positionOfCurrentSpineItem === "before") {
  //   return "backward"
  // }

  /**
   * From this point forward, we can only make assumptions
   */
  if (settings.settings.computedPageTurnDirection === "vertical") {
    if (navigation.position.y > previousNavigation.position.y) {
      return "forward"
    } else {
      if (
        navigation.position.y === previousNavigation.position.y &&
        previousNavigation.directionFromLastNavigation !== "backward"
      ) {
        return "forward"
      }
      return "backward"
    }
  }

  if (navigation.position.x > previousNavigation.position.x) {
    return "forward"
  } else {
    if (
      navigation.position.x === previousNavigation.position.x &&
      previousNavigation.directionFromLastNavigation !== "backward"
    ) {
      return "forward"
    }

    return "backward"
  }
}
