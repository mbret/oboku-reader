import { Context } from "../context/Context"
import { SpineItem } from "./createSpineItem"
import { getFirstVisibleNodeForViewport, getRangeFromNode } from "../utils/dom"
import { SafeSpineItemPosition, UnsafeSpineItemPosition } from "./types"
import { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import {
  calculateNumberOfPagesForItem,
  getItemOffsetFromPageIndex,
  getClosestValidOffsetFromApproximateOffsetInPages,
} from "../pagination/helpers"

export type SpineItemLocator = ReturnType<typeof createSpineItemLocator>

export const createSpineItemLocator = ({
  context,
  settings,
}: {
  context: Context
  settings: ReaderSettingsManager
}) => {
  const getSafePosition = (
    unsafeSpineItemPosition: UnsafeSpineItemPosition,
    spineItem: SpineItem,
  ): SafeSpineItemPosition => ({
    x: Math.min(
      spineItem.getElementDimensions().width,
      Math.max(0, unsafeSpineItemPosition.x),
    ),
    y: Math.min(
      spineItem.getElementDimensions().height,
      Math.max(0, unsafeSpineItemPosition.y),
    ),
  })

  const getSpineItemNumberOfPages = ({
    spineItem,
  }: {
    spineItem: SpineItem
  }) => {
    // pre-paginated always are only one page
    // if (!spineItem.isReflowable) return 1

    const isUsingVerticalWriting = spineItem.isUsingVerticalWriting()
    const { width, height } = spineItem.getElementDimensions()
    const { pageTurnDirection, pageTurnMode } = settings.settings

    if (pageTurnDirection === `vertical` && pageTurnMode === `scrollable`) {
      return 1
    }

    if (isUsingVerticalWriting || pageTurnDirection === `vertical`) {
      return calculateNumberOfPagesForItem(height, context.getPageSize().height)
    }

    return calculateNumberOfPagesForItem(width, context.getPageSize().width)
  }

  const getSpineItemPositionFromPageIndex = (
    pageIndex: number,
    spineItem: SpineItem,
  ): SafeSpineItemPosition => {
    const { width: itemWidth, height: itemHeight } =
      spineItem.getElementDimensions()

    if (spineItem.isUsingVerticalWriting()) {
      const ltrRelativeOffset = getItemOffsetFromPageIndex(
        context.getPageSize().height,
        pageIndex,
        itemHeight,
      )

      return {
        x: 0,
        y: ltrRelativeOffset,
      }
    }

    const ltrRelativeOffset = getItemOffsetFromPageIndex(
      context.getPageSize().width,
      pageIndex,
      itemWidth,
    )

    if (context.isRTL()) {
      return {
        x: itemWidth - ltrRelativeOffset - context.getPageSize().width,
        y: 0,
      }
    }

    return {
      x: ltrRelativeOffset,
      y: 0,
    }
  }

  /**
   * @important
   * This calculation takes blank page into account, the iframe could be only one page but with a blank page
   * positioned before. Resulting on two page index possible values (0 & 1).
   */
  const getSpineItemPageIndexFromPosition = (
    position: UnsafeSpineItemPosition,
    spineItem: SpineItem,
  ) => {
    const { width: itemWidth } = spineItem.getElementDimensions()

    const pageWidth = context.getPageSize().width
    const pageHeight = context.getPageSize().height

    const safePosition = getSafePosition(position, spineItem)

    const offset = context.isRTL()
      ? itemWidth - safePosition.x - context.getPageSize().width
      : safePosition.x

    const numberOfPages = getSpineItemNumberOfPages({ spineItem })

    if (spineItem.isUsingVerticalWriting()) {
      return getPageFromOffset(position.y, pageHeight, numberOfPages)
    } else {
      const pageIndex = getPageFromOffset(offset, pageWidth, numberOfPages)

      return pageIndex
    }
  }

  const getSpineItemPositionFromNode = (
    node: Node,
    offset: number,
    spineItem: SpineItem,
  ) => {
    let offsetOfNodeInSpineItem: number | undefined

    // for some reason `img` does not work with range (x always = 0)
    if (
      node?.nodeName === `img` ||
      (node?.textContent === `` && node.nodeType === Node.ELEMENT_NODE)
    ) {
      offsetOfNodeInSpineItem = (node as HTMLElement).getBoundingClientRect().x
    } else if (node) {
      const range = node ? getRangeFromNode(node, offset) : undefined
      offsetOfNodeInSpineItem =
        range?.getBoundingClientRect().x || offsetOfNodeInSpineItem
    }

    const spineItemWidth = spineItem.getElementDimensions()?.width || 0
    const pageWidth = context.getPageSize().width

    if (offsetOfNodeInSpineItem) {
      const val = getClosestValidOffsetFromApproximateOffsetInPages(
        offsetOfNodeInSpineItem,
        pageWidth,
        spineItemWidth,
      )

      // @todo vertical
      return { x: val, y: 0 }
    }

    return undefined
  }

  /**
   * @todo handle vertical
   */
  const getFirstNodeOrRangeAtPage = (
    pageIndex: number,
    spineItem: SpineItem,
  ) => {
    const pageSize = context.getPageSize()
    const frame = spineItem.spineItemFrame?.getManipulableFrame()?.frame

    if (
      frame?.contentWindow?.document &&
      // very important because it is being used by next functions
      frame.contentWindow.document.body !== null
    ) {
      // @todo handle vertical jp
      // top seems ok but left is not, it should probably not be 0 or something
      const { x: left, y: top } = getSpineItemPositionFromPageIndex(
        pageIndex,
        spineItem,
      )
      const viewport = {
        left,
        right: left + pageSize.width,
        top,
        bottom: top + pageSize.height,
      }

      const res = getFirstVisibleNodeForViewport(
        frame.contentWindow.document,
        viewport,
      )

      return res
    }

    return undefined
  }

  const getSpineItemClosestPositionFromUnsafePosition = (
    unsafePosition: UnsafeSpineItemPosition,
    spineItem: SpineItem,
  ) => {
    const { width, height } = spineItem.getElementDimensions()

    const adjustedPosition = {
      x: getClosestValidOffsetFromApproximateOffsetInPages(
        unsafePosition.x,
        context.getPageSize().width,
        width,
      ),
      y: getClosestValidOffsetFromApproximateOffsetInPages(
        unsafePosition.y,
        context.getPageSize().height,
        height,
      ),
    }

    return adjustedPosition
  }

  const getSpineItemPageIndexFromNode = (
    node: Node,
    offset: number,
    spineItem: SpineItem,
  ) => {
    const position = getSpineItemPositionFromNode(node, offset, spineItem)

    return position
      ? getSpineItemPageIndexFromPosition(position, spineItem)
      : undefined
  }

  const getPageFromOffset = (
    offset: number,
    pageWidth: number,
    numberOfPages: number,
  ) => {
    const offsetValues = [...Array(numberOfPages)].map((_, i) => i * pageWidth)

    if (offset <= 0) return 0

    if (offset >= numberOfPages * pageWidth) return numberOfPages - 1

    return Math.max(
      0,
      offsetValues.findIndex((offsetRange) => offset < offsetRange + pageWidth),
    )
  }

  const isPageVisibleForSpineItemPosition = ({
    pageSpineItemPosition,
    threshold,
    spineItemPosition,
  }: {
    pageSpineItemPosition: SafeSpineItemPosition
    spineItemPosition: UnsafeSpineItemPosition
    threshold: number
  }) => {
    const { x: left, y: top } = pageSpineItemPosition
    const right = left + (context.getPageSize().width - 1)
    const bottom = top + (context.getPageSize().height - 1)
    const pageWidth = context.getPageSize().width
    const pageHeight = context.getPageSize().height

    const viewportLeft = spineItemPosition.x
    const viewportRight =
      spineItemPosition.x + (context.state.visibleAreaRect.width - 1)
    const viewportTop = spineItemPosition.y
    const viewportBottom =
      spineItemPosition.y + (context.state.visibleAreaRect.height - 1)

    const visibleWidth =
      Math.min(right, viewportRight) - Math.max(left, viewportLeft)
    const horizontalVisiblePercentage = visibleWidth / pageWidth

    const visibleHeight =
      Math.min(bottom, viewportBottom) - Math.max(top, viewportTop)
    const verticalVisiblePercentage = visibleHeight / pageHeight

    return (
      horizontalVisiblePercentage >= threshold &&
      verticalVisiblePercentage >= threshold
    )
  }

  return {
    getSpineItemPositionFromNode,
    getSpineItemPositionFromPageIndex,
    getSpineItemPageIndexFromPosition,
    getSpineItemPageIndexFromNode,
    getSpineItemClosestPositionFromUnsafePosition,
    getFirstNodeOrRangeAtPage,
    getSpineItemNumberOfPages,
    isPageVisibleForSpineItemPosition,
  }
}
