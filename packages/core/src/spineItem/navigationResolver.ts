import { SpineItem } from "./createSpineItem"
import { Context } from "../context/Context"
import { createSpineItemLocator } from "./locationResolver"
import { SafeSpineItemPosition, UnsafeSpineItemPosition } from "./types"
import { ReaderSettingsManager } from "../settings/ReaderSettingsManager"

export type SpineItemNavigationResolver = ReturnType<
  typeof createNavigationResolver
>

export const createNavigationResolver = ({
  context,
  settings,
}: {
  context: Context
  settings: ReaderSettingsManager
}) => {
  const spineItemLocator = createSpineItemLocator({ context, settings })

  const getNavigationForLastPage = (
    spineItem: SpineItem,
  ): SafeSpineItemPosition => {
    const numberOfPages = spineItemLocator.getSpineItemNumberOfPages({
      spineItem,
    })

    return getNavigationForPage(numberOfPages - 1, spineItem)
  }

  const getNavigationForPage = (
    pageIndex: number,
    spineItem: SpineItem,
  ): SafeSpineItemPosition => {
    const { x, y } = spineItemLocator.getSpineItemPositionFromPageIndex(
      pageIndex,
      spineItem,
    )

    return { x, y }
  }

  const getNavigationFromNode = (
    spineItem: SpineItem,
    node: Node,
    offset: number,
  ): SafeSpineItemPosition => {
    const position = spineItemLocator.getSpineItemPositionFromNode(
      node,
      offset,
      spineItem,
    )

    return position || { x: 0, y: 0 }
  }

  const getNavigationForPosition = (
    spineItem: SpineItem,
    position: UnsafeSpineItemPosition,
  ): SafeSpineItemPosition => {
    const potentiallyCorrectedPosition =
      spineItemLocator.getSpineItemClosestPositionFromUnsafePosition(
        position,
        spineItem,
      )

    return potentiallyCorrectedPosition
  }

  return {
    getNavigationForLastPage,
    getNavigationForPage,
    getNavigationForPosition,
    getNavigationFromNode,
  }
}
