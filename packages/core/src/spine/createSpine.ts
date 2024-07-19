import { BehaviorSubject, Observable, Subject, Subscription } from "rxjs"
import { shareReplay, switchMap, takeUntil, tap } from "rxjs/operators"
import { Context } from "../context/Context"
import { Pagination } from "../pagination/Pagination"
import { createSpineItem } from "../spineItem/createSpineItem"
import { SpineItemManager } from "../spineItemManager"
import { SpineLocationResolver } from "./resolvers/SpineLocationResolver"
import { createSpineItemLocator as createSpineItemLocationResolver } from "../spineItem/locationResolver"
import { createCfiResolver } from "../cfi/cfiResolver"
import { createSelection } from "../selection"
import type { Spine } from "../types/Spine"
import { HTML_PREFIX } from "../constants"
import { Manifest } from ".."
import { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import { HookManager } from "../hooks/HookManager"
import { Navigation } from "../navigation/InternalNavigator"

const noopElement = document.createElement("div")

type SpineItem = ReturnType<typeof createSpineItem>
type RequireLayout = boolean
type ManipulableSpineItemCallback = Parameters<
  SpineItem[`manipulateSpineItem`]
>[0]
type ManipulableSpineItemCallbackPayload =
  Parameters<ManipulableSpineItemCallback>[0]

type Event = {
  type: `onSelectionChange`
  data: ReturnType<typeof createSelection> | null
}

export const createSpine = ({
  element$,
  context,
  spineItemManager,
  spineItemLocator,
  spineLocator,
  cfiLocator,
  viewportState$,
  settings,
  hookManager,
}: {
  element$: Observable<HTMLElement>
  context: Context
  pagination: Pagination
  spineItemManager: SpineItemManager
  spineItemLocator: ReturnType<typeof createSpineItemLocationResolver>
  spineLocator: SpineLocationResolver
  cfiLocator: ReturnType<typeof createCfiResolver>
  navigation$: Observable<Navigation>
  viewportState$: Observable<`free` | `busy`>
  settings: ReaderSettingsManager
  hookManager: HookManager
}): Spine => {
  const spineItems$ = new Subject<SpineItem[]>()
  const itemsBeforeDestroySubject$ = new Subject<void>()
  const subject = new Subject<Event>()
  const spineContainerElementSubject = new BehaviorSubject<HTMLElement>(
    noopElement,
  )
  let selectionSubscription: Subscription | undefined

  /**
   * @todo handle reload
   */
  const reload = (manifest: Manifest) => {
    itemsBeforeDestroySubject$.next()

    spineItemManager.destroyItems()

    manifest.spineItems.map((resource) => {
      const spineItem = createSpineItem({
        item: resource,
        containerElement: spineContainerElementSubject.getValue(),
        context,
        viewportState$,
        settings,
        hookManager,
      })
      spineItemManager.add(spineItem)
    })

    spineItems$.next(spineItemManager.getAll())
  }

  const manipulateSpineItems = (
    cb: (
      payload: ManipulableSpineItemCallbackPayload & { index: number },
    ) => RequireLayout,
  ) => {
    let shouldLayout = false
    spineItemManager.getAll().forEach((item, index) => {
      shouldLayout =
        item.manipulateSpineItem((opts) => cb({ index, ...opts })) ||
        shouldLayout
    })

    if (shouldLayout) {
      spineItemManager.layout()
    }
  }

  const manipulateSpineItem = (
    id: string,
    cb: Parameters<SpineItem[`manipulateSpineItem`]>[0],
  ) => {
    spineItemManager.get(id)?.manipulateSpineItem(cb)
  }

  context.manifest$.pipe(tap(reload), takeUntil(context.destroy$)).subscribe()

  const elementSub = element$.pipe().subscribe((element) => {
    const containerElement = createContainerElement(element.ownerDocument)

    spineContainerElementSubject.next(containerElement)
  })

  const scrollHeight$ = spineContainerElementSubject.pipe(
    switchMap(
      (element) =>
        new Observable<number>((subscriber) => {
          let scrollHeight = element.scrollHeight

          const mutationObserver = new MutationObserver((mutations) => {
            mutations.forEach(() => {
              if (element.scrollHeight !== scrollHeight) {
                scrollHeight = element.scrollHeight
                subscriber.next(scrollHeight)
              }
            })
          })

          mutationObserver.observe(element, {
            childList: true, // Observe direct children changes
          })

          subscriber.next(scrollHeight)

          return () => {
            mutationObserver.disconnect()
          }
        }),
    ),
    shareReplay(1),
  )

  return {
    element$: spineContainerElementSubject,
    getElement: () => spineContainerElementSubject.getValue(),
    locator: spineLocator,
    spineItemLocator,
    cfiLocator,
    scrollHeight$,
    manipulateSpineItems,
    manipulateSpineItem,
    layout: () => {
      spineItemManager.layout()
    },
    destroy: () => {
      elementSub.unsubscribe()
      spineItems$.complete()
      itemsBeforeDestroySubject$.next()
      itemsBeforeDestroySubject$.complete()
      subject.complete()
      spineItemManager.destroy()
      selectionSubscription?.unsubscribe()
      spineContainerElementSubject.getValue().remove()
      spineContainerElementSubject.complete()
    },
    isSelecting: () =>
      // spineItemManager.getFocusedSpineItem()?.selectionTracker.isSelecting(),
      false,
    getSelection: () =>
      // spineItemManager.getFocusedSpineItem()?.selectionTracker.getSelection(),
      undefined,
    $: {
      $: subject.asObservable(),
      layout$: spineItemManager.$.layout$,
      spineItems$: spineItems$.asObservable(),
      itemsBeforeDestroy$: itemsBeforeDestroySubject$.asObservable(),
    },
  }
}

const createContainerElement = (doc: Document) => {
  const element: HTMLElement = doc.createElement(`div`)
  element.style.cssText = `
    height: 100%;
    position: relative;
  `
  element.className = `${HTML_PREFIX}-spine`

  return element
}

export { Spine }
