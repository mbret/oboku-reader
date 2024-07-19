import {
  BehaviorSubject,
  combineLatest,
  merge,
  Observable,
  Subject,
} from "rxjs"
import { tap, takeUntil, switchMap, map } from "rxjs/operators"
import { Report } from "./report"
import { Context } from "./context/Context"
import { SpineItem } from "./spineItem/createSpineItem"
import { isShallowEqual } from "./utils/objects"
import { ReaderSettingsManager } from "./settings/ReaderSettingsManager"

const NAMESPACE = `spineItemManager`

export const createSpineItemManager = ({
  context,
  settings,
}: {
  context: Context
  settings: ReaderSettingsManager
}) => {
  // const focus$ = new Subject<{ data: SpineItem }>()
  const layout$ = new Subject<boolean>()
  /**
   * This contains every item dimension / position on the viewport.
   * This is only used to avoid intensively request bounding of each items later.
   * This is always in sync with every layout since it is being updated for every layout
   * done with the manager.
   */
  let itemLayoutInformation: {
    left: number
    right: number
    top: number
    bottom: number
    width: number
    height: number
  }[] = []
  const orderedSpineItemsSubject = new BehaviorSubject<SpineItem[]>([])
  /**
   * @todo
   * move this logic to the spine
   *
   * @todo
   * make sure to check how many times it is being called and try to reduce number of layouts
   * it is called eery time an item is being unload (which can adds up quickly for big books)
   */
  const layout = () => {
    const manifest = context.manifest
    const newItemLayoutInformation: typeof itemLayoutInformation = []
    const isGloballyPrePaginated = manifest?.renditionLayout === `pre-paginated`

    orderedSpineItemsSubject.value.reduce(
      ({ horizontalOffset, verticalOffset }, item, index) => {
        let minimumWidth = context.getPageSize().width
        let blankPagePosition: `none` | `before` | `after` = `none`
        const itemStartOnNewScreen =
          horizontalOffset % context.state.visibleAreaRect.width === 0
        const isLastItem = index === orderedSpineItemsSubject.value.length - 1

        if (context.state.isUsingSpreadMode) {
          /**
           * for now every reflowable content that has reflow siblings takes the entire screen by default
           * this simplify many things and I am not sure the specs allow one reflow
           * to end and an other one to start on the same screen anyway
           *
           * @important
           * For now this is impossible to have reflow not taking all screen. This is because
           * when an element is unloaded, the next element will move back its x axis, then an adjustment
           * will occurs and the previous element will become visible again, meaning it will be loaded,
           * therefore pushing the focused element, meaning adjustment again, then unload of previous one,
           * ... infinite loop. Due to the nature of reflow it's pretty much impossible to not load the entire
           * book with spread on to make it work.
           *
           * @important
           * When the book is globally pre-paginated we will not apply any of this even if each item is
           * reflowable. This is mostly a publisher mistake but does not comply with spec. Therefore
           * we ignore it
           */
          if (
            !isGloballyPrePaginated &&
            item.item.renditionLayout === `reflowable` &&
            !isLastItem
          ) {
            minimumWidth = context.getPageSize().width * 2
          }

          // mainly to make loading screen looks good
          if (
            !isGloballyPrePaginated &&
            item.item.renditionLayout === `reflowable` &&
            isLastItem &&
            itemStartOnNewScreen
          ) {
            minimumWidth = context.getPageSize().width * 2
          }

          const lastItemStartOnNewScreenInAPrepaginatedBook =
            itemStartOnNewScreen && isLastItem && isGloballyPrePaginated

          if (
            item.item.pageSpreadRight &&
            itemStartOnNewScreen &&
            !context.isRTL()
          ) {
            blankPagePosition = `before`
            minimumWidth = context.getPageSize().width * 2
          } else if (
            item.item.pageSpreadLeft &&
            itemStartOnNewScreen &&
            context.isRTL()
          ) {
            blankPagePosition = `before`
            minimumWidth = context.getPageSize().width * 2
          } else if (lastItemStartOnNewScreenInAPrepaginatedBook) {
            if (context.isRTL()) {
              blankPagePosition = `before`
            } else {
              blankPagePosition = `after`
            }
            minimumWidth = context.getPageSize().width * 2
          }
        }

        // we trigger an item layout which will update the visual and return
        // us with the item new eventual layout information.
        // This step is not yet about moving item or adjusting position.
        const { width, height } = item.layout({
          minimumWidth,
          blankPagePosition,
          spreadPosition: context.state.isUsingSpreadMode
            ? itemStartOnNewScreen
              ? context.isRTL()
                ? `right`
                : `left`
              : context.isRTL()
                ? `left`
                : `right`
            : `none`,
        })

        if (settings.settings.computedPageTurnDirection === `vertical`) {
          const currentValidEdgeYForVerticalPositioning = itemStartOnNewScreen
            ? verticalOffset
            : verticalOffset - context.state.visibleAreaRect.height
          const currentValidEdgeXForVerticalPositioning = itemStartOnNewScreen
            ? 0
            : horizontalOffset

          if (context.isRTL()) {
            item.adjustPositionOfElement({
              top: currentValidEdgeYForVerticalPositioning,
              left: currentValidEdgeXForVerticalPositioning,
            })
          } else {
            item.adjustPositionOfElement({
              top: currentValidEdgeYForVerticalPositioning,
              left: currentValidEdgeXForVerticalPositioning,
            })
          }

          const newEdgeX = width + currentValidEdgeXForVerticalPositioning
          const newEdgeY = height + currentValidEdgeYForVerticalPositioning

          newItemLayoutInformation.push({
            left: currentValidEdgeXForVerticalPositioning,
            right: newEdgeX,
            top: currentValidEdgeYForVerticalPositioning,
            bottom: newEdgeY,
            height,
            width,
          })

          return {
            horizontalOffset: newEdgeX,
            verticalOffset: newEdgeY,
          }
        }

        // We can now adjust the position of the item if needed based on its new layout.
        // For simplification we use an edge offset, which means for LTR it will be x from left and for RTL
        // it will be x from right
        item.adjustPositionOfElement(
          context.isRTL()
            ? { right: horizontalOffset, top: 0 }
            : { left: horizontalOffset, top: 0 },
        )

        newItemLayoutInformation.push({
          ...(context.isRTL()
            ? {
                left:
                  context.state.visibleAreaRect.width -
                  horizontalOffset -
                  width,
                right: context.state.visibleAreaRect.width - horizontalOffset,
              }
            : {
                left: horizontalOffset,
                right: horizontalOffset + width,
              }),
          top: verticalOffset,
          bottom: height,
          height,
          width,
        })

        return {
          horizontalOffset: horizontalOffset + width,
          verticalOffset: 0,
        }
      },
      { horizontalOffset: 0, verticalOffset: 0 },
    )

    const hasLayoutChanges =
      itemLayoutInformation.length !== newItemLayoutInformation.length ||
      itemLayoutInformation.some(
        (old, index) => !isShallowEqual(old, newItemLayoutInformation[index]),
      )

    itemLayoutInformation = newItemLayoutInformation

    Report.log(NAMESPACE, `layout`, { hasLayoutChanges, itemLayoutInformation })

    layout$.next(hasLayoutChanges)
  }

  /**
   * @todo
   * optimize useless calls to it, such as when the layout has not changed and the focus is still the same
   * @todo
   * analyze poor performances
   */
  const loadContents = Report.measurePerformance(
    `loadContents`,
    10,
    (rangeOfIndex: [number, number]) => {
      const [leftIndex, rightIndex] = rangeOfIndex
      const numberOfAdjacentSpineItemToPreLoad =
        settings.settings.numberOfAdjacentSpineItemToPreLoad
      const isPrePaginated =
        context.manifest?.renditionLayout === `pre-paginated`
      const isUsingFreeScroll =
        settings.settings.computedPageTurnMode === `scrollable`

      orderedSpineItemsSubject.value.forEach((orderedSpineItem, index) => {
        const isBeforeFocusedWithPreload =
          // we never want to preload anything before on free scroll on flow because it could offset the cursor
          index < leftIndex && !isPrePaginated && isUsingFreeScroll
            ? // ? true
              index < leftIndex - numberOfAdjacentSpineItemToPreLoad
            : index < leftIndex - numberOfAdjacentSpineItemToPreLoad
        const isAfterTailWithPreload =
          index > rightIndex + numberOfAdjacentSpineItemToPreLoad

        if (!isBeforeFocusedWithPreload && !isAfterTailWithPreload) {
          orderedSpineItem.loadContent()
        } else {
          orderedSpineItem.unloadContent()
        }
      })
    },
  )

  const get = (indexOrId: number | string | SpineItem | undefined) => {
    if (typeof indexOrId === `number`) {
      return orderedSpineItemsSubject.value[indexOrId]
    }

    if (typeof indexOrId === `string`) {
      return orderedSpineItemsSubject.value.find(
        ({ item }) => item.id === indexOrId,
      )
    }

    return indexOrId
  }

  /**
   * It's important to not use x,y since we need the absolute position of each element. Otherwise x,y would be relative to
   * current window (viewport).
   */
  const getAbsolutePositionOf = (
    spineItemOrIndex: SpineItem | number | string | undefined,
  ) => {
    const fallback = {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      width: 0,
      height: 0,
    }

    const spineItem = get(spineItemOrIndex)

    const indexOfItem = spineItem
      ? orderedSpineItemsSubject.value.indexOf(spineItem)
      : -1

    const layoutInformation = itemLayoutInformation[indexOfItem]

    return layoutInformation || fallback
  }

  const comparePositionOf = (toCompare: SpineItem, withItem: SpineItem) => {
    const toCompareIndex = getSpineItemIndex(toCompare) ?? 0
    const withIndex = getSpineItemIndex(withItem) ?? 0

    return toCompareIndex > withIndex
      ? `after`
      : toCompareIndex === withIndex
        ? `same`
        : `before`
  }

  const getSpineItemIndex = (spineItem: SpineItem | undefined) => {
    if (!spineItem) return undefined
    const index = orderedSpineItemsSubject.value.indexOf(spineItem)

    return index < 0 ? undefined : index
  }

  const add = (spineItem: SpineItem) => {
    orderedSpineItemsSubject.next([
      ...orderedSpineItemsSubject.getValue(),
      spineItem,
    ])

    spineItem.$.contentLayout$
      .pipe(takeUntil(context.destroy$))
      .subscribe(() => {
        // upstream change, meaning we need to layout again to both resize correctly each item but also to
        // adjust positions, etc
        layout()
      })

    spineItem.$.loaded$
      .pipe(
        tap(() => {
          if (spineItem.isUsingVerticalWriting()) {
            context.update({
              hasVerticalWriting: true,
            })
          } else {
            context.update({
              hasVerticalWriting: false,
            })
          }
        }),
        takeUntil(context.destroy$),
      )
      .subscribe()

    spineItem.load()
  }

  const getAll = () => orderedSpineItemsSubject.value

  const getLength = () => {
    return orderedSpineItemsSubject.value.length
  }

  /**
   * @todo handle reload, remove subscription to each items etc. See add()
   */
  const destroyItems = () => {
    orderedSpineItemsSubject.value.forEach((item) => item.destroy())
  }

  const destroy = () => {
    destroyItems()
    // focus$.complete()
    layout$.complete()
  }

  return {
    destroyItems,
    add,
    get,
    getAll,
    getLength,
    layout,
    loadContents,
    comparePositionOf,
    getAbsolutePositionOf,
    getSpineItemIndex,
    destroy,
    itemResize$: orderedSpineItemsSubject.pipe(
      switchMap((items) => {
        const resize$ = items.map(
          (item) =>
            new Observable((subscriber) => {
              const ro = new ResizeObserver((entries) => {
                subscriber.next(entries)
              })

              ro.observe(item.element)

              return function unsubscribe() {
                ro.unobserve(item.element)
              }
            }),
        )

        return combineLatest(resize$)
      }),
    ),
    $: {
      layout$: layout$.asObservable(),
      itemIsReady$: orderedSpineItemsSubject.asObservable().pipe(
        switchMap((items) => {
          const itemsIsReady$ = items.map((item) =>
            item.$.isReady$.pipe(
              map((isReady) => ({ item: item.item, isReady })),
            ),
          )

          return merge(...itemsIsReady$)
        }),
      ),
    },
  }
}

export type SpineItemManager = ReturnType<typeof createSpineItemManager>
