import { CFI, extractProseMetadataFromCfi } from "../cfi"
import { Context } from "../context/Context"
import { SpineItem } from "../spineItem/createSpineItem"
import { createSpineItemLocator } from "../spineItem/locationResolver"
import { SpineItemManager } from "../spineItemManager"
import { Report } from "../report"
import { Manifest } from "../types"

export const createCfiLocator = ({
  spineItemManager,
  spineItemLocator,
}: {
  spineItemManager: SpineItemManager
  context: Context
  spineItemLocator: ReturnType<typeof createSpineItemLocator>
}) => {
  const getItemAnchor = (spineItem: SpineItem) =>
    `|[prose~anchor~${encodeURIComponent(spineItem.item.id)}]`

  /**
   * Heavy cfi hookup. Use it to have a refined, precise cfi anchor. It requires the content to be loaded otherwise
   * it will return a root cfi.
   *
   * @todo optimize
   */
  const getCfi = Report.measurePerformance(
    `getCfi`,
    10,
    (pageIndex: number, spineItem: SpineItem) => {
      const nodeOrRange = spineItemLocator.getFirstNodeOrRangeAtPage(
        pageIndex,
        spineItem,
      )
      const doc =
        spineItem.spineItemFrame.getManipulableFrame()?.frame?.contentWindow
          ?.document

      const itemAnchor = getItemAnchor(spineItem)
      // because the current cfi library does not works well with offset we are just using custom
      // format and do it manually after resolving the node
      // @see https://github.com/fread-ink/epub-cfi-resolver/issues/8
      const offset = `|[prose~offset~${nodeOrRange?.offset || 0}]`

      if (nodeOrRange && doc) {
        const cfiString = CFI.generate(
          nodeOrRange.node,
          0,
          `${itemAnchor}${offset}`,
        )

        return cfiString
      }

      return getRootCfi(spineItem)
    },
  )

  /**
   * Very light cfi lookup. Use it when you need to anchor user to correct item
   * but do not want to have heavy dom lookup. This is useful as pre-cfi before the content
   * is loaded for example.
   */
  const getRootCfi = (spineItem: SpineItem) => {
    const itemAnchor = getItemAnchor(spineItem)

    return `epubcfi(/0${itemAnchor}) `
  }

  const isRootCfi = (cfi: string) => {
    return cfi?.startsWith(`epubcfi(/0`)
  }

  const getSpineItemFromCfi = (cfi: string) => {
    const { itemId } = extractProseMetadataFromCfi(cfi)

    if (itemId) {
      const { itemId } = extractProseMetadataFromCfi(cfi)
      const spineItem =
        (itemId ? spineItemManager.get(itemId) : undefined) ||
        spineItemManager.get(0)

      return spineItem
    }

    return undefined
  }

  const getCfiMetaInformation = (cfi: string) => {
    const spineItem = getSpineItemFromCfi(cfi)

    if (spineItem) {
      return {
        spineItemIndex: spineItemManager.getSpineItemIndex(spineItem),
      }
    }

    return undefined
  }

  /**
   * Returns the node and offset for the given cfi.
   */
  const resolveCfi = (cfiString: string) => {
    if (!cfiString) return undefined

    const spineItem = getSpineItemFromCfi(cfiString)
    const spineItemIndex = spineItemManager.getSpineItemIndex(spineItem) || 0

    if (!spineItem) return undefined

    const { cleanedCfi, offset } = extractProseMetadataFromCfi(cfiString)
    const cfi = new CFI(cleanedCfi, {})

    const doc =
      spineItem.spineItemFrame.getManipulableFrame()?.frame?.contentWindow
        ?.document

    if (doc) {
      try {
        const { node, offset: resolvedOffset } = cfi.resolve(doc, {})

        return { node, offset: offset ?? resolvedOffset, spineItemIndex }
      } catch (e) {
        Report.error(e)

        return {
          spineItemIndex,
        }
      }
    }

    return {
      spineItemIndex,
    }
  }

  // const resolveCfi = (cfi: string) => {
  //   const { spineItemIndex = -1 } = getCfiMetaInformation(cfi) || {}
  //   const spineItem = spineItemManager.get(spineItemIndex)

  //   if (spineItem) {
  //     let position: { x: number, y: number } | undefined = undefined
  //     const { node, offset = 0 } = spineItemLocator.resolveCfi(cfi, spineItem) || {}
  //     if (node) {
  //       position = spineItemLocator.getSpineItemPositionFromNode(node, offset, spineItem)
  //     }
  //     const pageIndex = position ? spineItemLocator.getSpineItemPageIndexFromPosition(position, spineItem) : undefined

  //     return {
  //       spineItemIndex,
  //       pageIndex,
  //       node,
  //       offset,
  //     }
  //   }

  //   return undefined
  // }

  /**
   * @todo the package does not support creating for range at the moment @see https://github.com/fread-ink/epub-cfi-resolver/issues/3
   * so we use two cfi for start and end.
   */
  const generateFromRange = (
    {
      startNode,
      start,
      end,
      endNode,
    }: { startNode: Node; start: number; endNode: Node; end: number },
    item: Manifest[`spineItems`][number],
  ) => {
    const startCFI = CFI.generate(
      startNode,
      start,
      `|[prose~anchor~${encodeURIComponent(item.id)}]`,
    )
    const endCFI = CFI.generate(
      endNode,
      end,
      `|[prose~anchor~${encodeURIComponent(item.id)}]`,
    )

    return { start: startCFI, end: endCFI }
  }

  return {
    getSpineItemFromCfi,
    getCfiMetaInformation,
    getCfi,
    getRootCfi,
    resolveCfi,
    generateFromRange,
    isRootCfi
  }
}
