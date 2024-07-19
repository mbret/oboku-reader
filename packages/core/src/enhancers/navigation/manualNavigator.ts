import { Reader } from "../../reader"
import { Report } from "../../report"
import { ViewportPosition } from "../../navigation/ViewportNavigator"
import { getNavigationForSpineItemPage } from "./resolvers/getNavigationForSpineItemPage"
import { getNavigationForRightPage } from "./resolvers/getNavigationForRightPage"
import { getNavigationForLeftPage } from "./resolvers/getNavigationForLeftPage"

export class ManualNavigator {
  movingLastDelta = { x: 0, y: 0 }
  movingLastPosition: ViewportPosition = { x: 0, y: 0 }
  unlock: ReturnType<Reader["navigation"]["lock"]> | undefined = undefined

  constructor(protected reader: Reader) {}

  turnRight() {
    const navigation = this.reader.navigation.getNavigation()
    const spineItem = this.reader.spineItemManager.get(navigation.spineItem)

    if (!spineItem) return

    const position = getNavigationForRightPage({
      context: this.reader.context,
      navigationResolver: this.reader.navigation.navigationResolver,
      position: navigation.position,
      computedPageTurnDirection:
        this.reader.settings.settings.computedPageTurnDirection,
      spineItem,
      spineItemManager: this.reader.spineItemManager,
      spineLocator: this.reader.spine.locator,
    })

    return this.reader.navigation.navigate({
      position,
    })
  }

  turnLeft() {
    const navigation = this.reader.navigation.getNavigation()
    const spineItem = this.reader.spineItemManager.get(navigation.spineItem)

    if (!spineItem) return

    const position = getNavigationForLeftPage({
      context: this.reader.context,
      navigationResolver: this.reader.navigation.navigationResolver,
      position: navigation.position,
      computedPageTurnDirection:
        this.reader.settings.settings.computedPageTurnDirection,
      spineItem,
      spineItemManager: this.reader.spineItemManager,
      spineLocator: this.reader.spine.locator,
    })

    return this.reader.navigation.navigate({
      position,
    })
  }

  goToCfi(cfi: string, options: { animate: boolean } = { animate: true }) {
    return this.reader.navigation.navigate({
      animation: options.animate ? "turn" : false,
      cfi,
    })
  }

  goToSpineItem(indexOrId: number | string) {
    const spineItem = this.reader.spineItemManager.get(indexOrId)

    if (spineItem === undefined) {
      Report.warn(
        `goToSpineItem`,
        `Ignore navigation to ${indexOrId} since the item does not exist`,
      )

      return
    }

    this.reader.navigation.navigate({
      spineItem: indexOrId,
    })
  }

  goToNextSpineItem() {
    const { endIndex = 0 } =
      this.reader.spine.locator.getVisibleSpineItemsFromPosition({
        position: this.reader.navigation.getNavigation().position,
        threshold: 0.5,
      }) || {}

    this.goToSpineItem(endIndex + 1)
  }

  goToPreviousSpineItem() {
    const { beginIndex = 0 } =
      this.reader.spine.locator.getVisibleSpineItemsFromPosition({
        position: this.reader.navigation.getNavigation().position,
        threshold: 0.5,
      }) ?? {}

    this.goToSpineItem(beginIndex - 1)
  }

  goToUrl(url: string | URL) {
    this.reader.navigation.navigate({
      url,
    })
  }

  goToRightSpineItem() {
    if (
      this.reader.settings.settings.computedPageTurnDirection === "vertical"
    ) {
      Report.warn(
        `You cannot call this navigation method on vertical direction`,
      )

      return
    }

    if (this.reader.context.isRTL()) {
      return this.goToPreviousSpineItem()
    }

    return this.goToNextSpineItem()
  }

  goToLeftSpineItem() {
    if (
      this.reader.settings.settings.computedPageTurnDirection === "vertical"
    ) {
      Report.warn(
        `You cannot call this navigation method on vertical direction`,
      )

      return
    }

    if (this.reader.context.isRTL()) {
      return this.goToNextSpineItem()
    }

    return this.goToPreviousSpineItem()
  }

  goToTopSpineItem() {
    if (
      this.reader.settings.settings.computedPageTurnDirection === "horizontal"
    ) {
      Report.warn(
        `You cannot call this navigation method on horizontal direction`,
      )

      return
    }

    return this.goToPreviousSpineItem()
  }

  goToBottomSpineItem() {
    if (
      this.reader.settings.settings.computedPageTurnDirection === "horizontal"
    ) {
      Report.warn(
        `You cannot call this navigation method on horizontal direction`,
      )

      return
    }

    return this.goToNextSpineItem()
  }

  goToPageOfCurrentChapter(pageIndex: number) {
    const spineItemId = this.reader.navigation.getNavigation().spineItem

    const position = getNavigationForSpineItemPage({
      pageIndex,
      context: this.reader.context,
      navigationResolver: this.reader.navigation.navigationResolver,
      spineItemManager: this.reader.spineItemManager,
      spineItemNavigationResolver:
        this.reader.navigation.navigationResolver.spineItemNavigator,
      spineLocator: this.reader.spine.locator,
      spineItemId,
    })

    this.reader.navigation.navigate({
      position,
    })
  }
}
