import { Context } from "../context"
import { Manifest } from "../types"
import { createPrePaginatedReadingItem } from "./prePaginatedReadingItem"
import { createReflowableReadingItem } from "./reflowableReadingItem"

export type ReadingItem = ReturnType<typeof createReadingItem>

export const createReadingItem = ({ item, context, containerElement, iframeEventBridgeElement }: { 
  item: Manifest['readingOrder'][number], 
  containerElement: HTMLElement,
  iframeEventBridgeElement: HTMLElement,
  context: Context,
 }) => {
  let readingItem: ReturnType<typeof createPrePaginatedReadingItem> | ReturnType<typeof createReflowableReadingItem> 

  if (item.renditionLayout === 'pre-paginated') {
    readingItem = createPrePaginatedReadingItem({ item, context, containerElement, iframeEventBridgeElement })
  } else {
    readingItem = createReflowableReadingItem({ item, context, containerElement, iframeEventBridgeElement })
  }

  return {
    item,
    ...readingItem,
  }
}