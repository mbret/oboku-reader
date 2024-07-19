import { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import { ViewportPosition } from "./ViewportNavigator"
import { Pagination } from "../pagination/Pagination"
import { createNavigationResolver } from "./resolvers/NavigationResolver"
import { SpineItemManager } from "../spineItemManager"
import { createSpineLocationResolver } from "../spine/locationResolver"
import { isShallowEqual } from "../utils/objects"
import { UnsafeSpineItemPosition } from "../spineItem/types"
import { SpineItem } from "../spineItem/createSpineItem"
import { InternalNavigationEntry } from "./InternalNavigator"
import { Report } from "../report"
import { Context } from "../context/Context"

const NAMESPACE = `navigation/NavigatorConsolider`

const report = Report.namespace(NAMESPACE)

export type NavigationConsolidation = {
  spineItem?: string | number
  cfi?: string
  spineItemHeight?: number
  spineItemWidth?: number
  spineItemTop?: number
  spineItemLeft?: number
  /**
   * Useful for restoration to anchor back at an accurate
   * position in the item. If the item changed its content
   * we cannot assume it's accurate and will need more info.
   */
  positionInSpineItem?: UnsafeSpineItemPosition
  /**
   * Useful in restoration to anchor back to spine item position.
   * Whether we should anchor from bottom or top of the item.
   * Works with `positionInSpineItem`
   *
   * @forward : Used when the user navigate to position only. We will
   * try to restore position starting from begining of item.
   *
   * @backward : Used when the user navigate to position only. We will
   * try to restore position starting from end of item.
   *
   * @anchor : similar to forward but more specific on the intent
   */
  directionFromLastNavigation?: "forward" | "backward" | "anchor"
}

export class NavigatorConsolider {
  constructor(
    protected settings: ReaderSettingsManager,
    protected context: Context,
    protected pagination: Pagination,
    protected navigationResolver: ReturnType<typeof createNavigationResolver>,
    protected spineItemManager: SpineItemManager,
    protected spineLocator: ReturnType<typeof createSpineLocationResolver>,
  ) {}

  // @todo update spine item position from position
  // in case of restoration, we are now correctly positioned
  // but the spine item may have changed
  protected consolidatePositionInSpineItem({
    position,
    spineItem,
    navigation,
  }: {
    navigation: InternalNavigationEntry
    position: ViewportPosition
    spineItem: SpineItem
  }): UnsafeSpineItemPosition {
    const { height, width } =
      this.spineItemManager.getAbsolutePositionOf(spineItem)

    if (navigation.positionInSpineItem) {
      return navigation.positionInSpineItem
    }

    /**
     * We did not know the dimensions of spine item before so we will
     * return the current position in it, that is the best we have.
     * - if the user navigated to the begining, it will be 0,0.
     * - if the user navigated randomly into loaded item, we have valid
     * position
     * - if the user navigated randomly into unloaded item, we have
     * potentially wrong position but that's the best we have. For scroll
     * content, it can still be good enough to keep the anchor.
     */
    if (!navigation.spineItemHeight || !navigation.spineItemWidth) {
      return this.spineLocator.getSpineItemPositionFromSpinePosition(
        position,
        spineItem,
      )
    }

    if (
      isShallowEqual(
        { height, width },
        {
          height: navigation.spineItemHeight,
          width: navigation.spineItemWidth,
        },
      )
    ) {
      return this.spineLocator.getSpineItemPositionFromSpinePosition(
        position,
        spineItem,
      )
    }

    /**
     * Dimensions of spine items are different than before. We cannot
     * safely assume the position inside the item. We fallback to default
     * position
     */
    return { x: 0, y: 0 }
  }

  /**
   * We try to improve the knowledge of current navigation as much as possible.
   * We will try to detect which spine item, pages, etc. The point is to have
   * more information so that when adjustment happens, they are as much accurate
   * as possible.
   */
  public consolidateNavigation({
    direction,
    navigation,
    previousNavigation,
    trackDirection,
  }: {
    previousNavigation: InternalNavigationEntry
    navigation: InternalNavigationEntry
    direction?: InternalNavigationEntry["directionFromLastNavigation"]
    trackDirection: boolean
  }): InternalNavigationEntry {
    const position = navigation.position
    const spineItem = this.spineItemManager.get(navigation.spineItem)

    if (spineItem === undefined) {
      return { ...navigation, spineItem: undefined, position }
    }

    const positionInSpineItem = this.consolidatePositionInSpineItem({
      position,
      spineItem,
      navigation: { ...navigation, position },
    })

    const consolidatedNavigation: InternalNavigationEntry = {
      ...navigation,
      animation: navigation.animation ?? "turn",
      positionInSpineItem,
      spineItem: this.spineItemManager.getSpineItemIndex(spineItem),
      position: position,
      directionFromLastNavigation: trackDirection
        ? direction
        : navigation.directionFromLastNavigation,
    }

    report.info("consolidateNavigation", {
      after: consolidatedNavigation,
      before: previousNavigation,
    })

    return consolidatedNavigation
  }
}
