import { Subject, Subscription } from "rxjs"
import { Report } from "./report"
import { Context } from "./context"
import { createReadingItem, ReadingItem } from "./readingItem"

export type ReadingItemManager = ReturnType<typeof createReadingItemManager>

const NAMESPACE = `readingItemManager`

export const createReadingItemManager = ({ context }: { context: Context }) => {
  const subject = new Subject<{ event: 'focus', data: ReadingItem } | { event: 'layout' }>()
  let orderedReadingItems: ReturnType<typeof createReadingItem>[] = []
  let activeReadingItemIndex: number | undefined = undefined
  let readingItemSubscriptions: Subscription[] = []

  const layout = () => {
    orderedReadingItems.reduce((edgeOffset, item) => {
      const { width } = item.layout()
      item.adjustPositionOfElement(edgeOffset)

      return width + edgeOffset
    }, 0)

    subject.next({ event: 'layout' })
  }

  const adjustPositionOfItems = () => {
    orderedReadingItems.reduce((edgeOffset, item) => {
      const itemWidth = item.getElementDimensions().width
      item.adjustPositionOfElement(edgeOffset)

      return itemWidth + edgeOffset
    }, 0)

    subject.next({ event: 'layout' })
  }

  const focus = (indexOrReadingItem: number | ReadingItem) => {
    const readingItemToFocus = typeof indexOrReadingItem === `number` ? get(indexOrReadingItem) : indexOrReadingItem

    if (!readingItemToFocus) return

    const newActiveReadingItemIndex = orderedReadingItems.indexOf(readingItemToFocus)
    activeReadingItemIndex = newActiveReadingItemIndex

    Report.log(NAMESPACE, `focus item ${activeReadingItemIndex}`, readingItemToFocus)
    subject.next({ event: 'focus', data: readingItemToFocus })
  }

  const loadContents = Report.measurePerformance(`loadContents`, 10, () => {
    const numberOfAdjacentSpineItemToPreLoad = context.getLoadOptions()?.numberOfAdjacentSpineItemToPreLoad || 0
    orderedReadingItems.forEach((orderedReadingItem, index) => {
      if (activeReadingItemIndex !== undefined) {
        if (index < (activeReadingItemIndex - numberOfAdjacentSpineItemToPreLoad) || index > (activeReadingItemIndex + numberOfAdjacentSpineItemToPreLoad)) {
          orderedReadingItem.unloadContent()
        } else {
          if (!orderedReadingItem.isFrameReady()) {
            orderedReadingItem.loadContent()
          }
        }
      }
    })
  })

  const get = (indexOrId: number | string) => {
    if (typeof indexOrId === `number`) return orderedReadingItems[indexOrId]

    return orderedReadingItems.find(({ item }) => item.id === indexOrId)
  }

  const getPositionOf = Report.measurePerformance(`getPositionOf`, 10, (readingItemOrIndex: ReadingItem | number) => {
    const indexOfItem = typeof readingItemOrIndex === 'number' ? readingItemOrIndex : orderedReadingItems.indexOf(readingItemOrIndex)

    const distance = orderedReadingItems.slice(0, indexOfItem + 1).reduce((acc, readingItem) => {
      return {
        start: acc.end,
        end: acc.end + (readingItem.getElementDimensions()?.width || 0)
      }
    }, { start: 0, end: 0 })

    if (typeof readingItemOrIndex === 'number') {
      return {
        ...get(readingItemOrIndex)?.getElementDimensions(),
        ...distance
      }
    }

    return {
      ...readingItemOrIndex.getElementDimensions(),
      ...distance
    }
  }, { disable: true })

  const getFocusedReadingItem = () => activeReadingItemIndex !== undefined ? orderedReadingItems[activeReadingItemIndex] : undefined

  const comparePositionOf = (toCompare: ReadingItem, withItem: ReadingItem) => {
    const isAfter = orderedReadingItems.indexOf(toCompare) > orderedReadingItems.indexOf(withItem)

    if (isAfter) {
      return 'after'
    }

    return 'before'
  }

  const destroy = () => {
    orderedReadingItems.forEach(item => item.destroy())
    readingItemSubscriptions.forEach(subscription => subscription.unsubscribe())
    readingItemSubscriptions = []
  }

  const getReadingItemIndex = (readingItem: ReadingItem) => {
    return orderedReadingItems.indexOf(readingItem)
  }

  const add = (readingItem: ReadingItem) => {
    orderedReadingItems.push(readingItem)

    const readingItemSubscription = readingItem.$.subscribe((event) => {
      if (event.event === 'layout') {
        // @todo at this point the inner item has an upstream layout so we only need to adjust
        // left/right position of it. We don't need to layout, maybe a `adjustPositionOfItems()` is enough
        adjustPositionOfItems()
      }
    })

    readingItemSubscriptions.push(readingItemSubscription)

    readingItem.load()
  }

  const getAll = () => orderedReadingItems

  const getLength = () => {
    return orderedReadingItems.length
  }

  const getFocusedReadingItemIndex = () => {
    const item = getFocusedReadingItem()
    return item && getReadingItemIndex(item)
  }

  const getReadingItemAtOffset = Report.measurePerformance(`getReadingItemAtOffset`, 10, (offset: number) => {
    const detectedItem = orderedReadingItems.find(item => {
      const { start, end } = getPositionOf(item)
      return offset >= start && offset < end
    })

    if (offset === 0 && !detectedItem) return orderedReadingItems[0]

    if (!detectedItem) {
      return getFocusedReadingItem()
    }

    return detectedItem || getFocusedReadingItem()
  })

  return {
    add,
    get,
    getAll,
    getLength,
    layout,
    focus,
    loadContents,
    comparePositionOf,
    getPositionOf,
    getReadingItemAtOffset,
    getFocusedReadingItem,
    getFocusedReadingItemIndex,
    getReadingItemIndex,
    destroy,
    $: subject.asObservable()
  }
}

