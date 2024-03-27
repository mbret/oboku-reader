/* eslint-disable @typescript-eslint/no-unused-vars */
import { Context } from "../context/context"
import { createFrameItem } from "./frameItem/frameItem"
import { Manifest } from "../types"
import { BehaviorSubject, Observable, Subject } from "rxjs"
import { createFingerTracker, createSelectionTracker } from "./trackers"
import { isMouseEvent, isPointerEvent } from "../utils/dom"
import { attachOriginalFrameEventToDocumentEvent } from "../frames"
import { Hook } from "../types/Hook"
import { map, withLatestFrom } from "rxjs/operators"
import { createFrameManipulator } from "./frameItem/createFrameManipulator"
import { Settings } from "../settings/settings"

const pointerEvents = [
  `pointercancel` as const,
  `pointerdown` as const,
  `pointerenter` as const,
  `pointerleave` as const,
  `pointermove` as const,
  `pointerout` as const,
  `pointerover` as const,
  `pointerup` as const,
  `touchstart` as const,
  `touchend` as const,
]

const mouseEvents = [
  `click` as const,
  `mousedown` as const,
  `mouseup` as const,
  `mouseenter` as const,
  `mouseleave` as const,
  `mousemove` as const,
  `mouseout` as const,
  `mouseover` as const,
]

const passthroughEvents = [...pointerEvents, ...mouseEvents]

export const createCommonSpineItem = ({
  item,
  context,
  parentElement,
  iframeEventBridgeElement$,
  hooks$,
  viewportState$,
  settings
}: {
  item: Manifest[`spineItems`][number]
  parentElement: HTMLElement
  iframeEventBridgeElement$: BehaviorSubject<HTMLElement | undefined>
  context: Context
  hooks$: BehaviorSubject<Hook[]>
  viewportState$: Observable<`free` | `busy`>
  settings: Settings
}) => {
  const destroySubject$ = new Subject<void>()
  const containerElement = createContainerElement(parentElement, item, hooks$)
  const overlayElement = createOverlayElement(parentElement, item)
  const fingerTracker = createFingerTracker()
  const selectionTracker = createSelectionTracker()
  const frameHooks = createFrameHooks(iframeEventBridgeElement$, fingerTracker, selectionTracker)
  const spineItemFrame = createFrameItem({
    parent: containerElement,
    item,
    context,
    fetchResource: context.getState()?.fetchResource,
    hooks$: hooks$.asObservable().pipe(map((hooks) => [...hooks, ...frameHooks])),
    viewportState$,
    settings
  })
  // let layoutInformation: { blankPagePosition: `before` | `after` | `none`, minimumWidth: number } = { blankPagePosition: `none`, minimumWidth: context.getPageSize().width }

  containerElement.appendChild(overlayElement)
  parentElement.appendChild(containerElement)

  // Do not memoize x,y,top,left as they change relatively to the viewport all the time
  let memoizedElementDimensions: { width: number; height: number } | undefined

  // @todo use spine item manager global layout reference if possible
  // @todo getAbsolutePositionOf (for width and height)
  const getElementDimensions = () => {
    if (memoizedElementDimensions) {
      return memoizedElementDimensions
    }

    // Keep in mind that getBoundingClientRect takes scale transform into consideration
    // It's better to not use this is the viewport / spine is being scaled
    const rect = containerElement.getBoundingClientRect()
    const normalizedValues = {
      ...rect,
      // we want to round to first decimal because it's possible to have half pixel
      // however browser engine can also gives back x.yyyy based on their precision
      width: Math.round(rect.width * 10) / 10,
      height: Math.round(rect.height * 10) / 10,
    }

    memoizedElementDimensions = normalizedValues

    return memoizedElementDimensions
  }

  /**
   * Detect the type of resource (independently of rendition flow).
   * If an image is detected for reflowable for example we may want to display
   * things accordingly.
   */
  const isImageType = () => !!item.mediaType?.startsWith(`image/`)

  const injectStyle = (cssText: string) => {
    spineItemFrame.getManipulableFrame()?.removeStyle(`prose-reader-css`)
    spineItemFrame.getManipulableFrame()?.addStyle(`prose-reader-css`, cssText)
  }

  const adjustPositionOfElement = ({ right, left, top }: { right?: number; left?: number; top?: number }) => {
    if (right !== undefined) {
      containerElement.style.right = `${right}px`
    } else {
      containerElement.style.removeProperty(`right`)
    }
    if (left !== undefined) {
      containerElement.style.left = `${left}px`
    } else {
      containerElement.style.removeProperty(`left`)
    }
    if (top !== undefined) {
      containerElement.style.top = `${top}px`
    } else {
      containerElement.style.removeProperty(`top`)
    }
  }

  const getViewPortInformation = () => {
    const { width: pageWidth, height: pageHeight } = context.getPageSize()
    const viewportDimensions = spineItemFrame.getViewportDimensions()
    const frameElement = spineItemFrame.getManipulableFrame()?.frame

    if (containerElement && frameElement?.contentDocument && frameElement?.contentWindow && viewportDimensions) {
      const computedWidthScale = pageWidth / viewportDimensions.width
      const computedScale = Math.min(computedWidthScale, pageHeight / viewportDimensions.height)

      return { computedScale, computedWidthScale, viewportDimensions }
    }
  }

  const loadContent = () => spineItemFrame.load()

  const unloadContent = () => spineItemFrame.unload()

  const getBoundingRectOfElementFromSelector = (selector: string) => {
    const frame = spineItemFrame.getManipulableFrame()?.frame
    if (frame && selector) {
      if (selector.startsWith(`#`)) {
        return frame.contentDocument?.getElementById(selector.replace(`#`, ``))?.getBoundingClientRect()
      }
      return frame.contentDocument?.querySelector(selector)?.getBoundingClientRect()
    }
  }

  const setLayoutDirty = () => {
    memoizedElementDimensions = undefined
  }

  const getDimensionsForPaginatedContent = () => {
    const pageSize = context.getPageSize()
    const pageWidth = pageSize.width
    const columnHeight = pageSize.height
    const columnWidth = pageWidth

    return { columnHeight, columnWidth }
  }

  const getDimensionsForReflowableContent = (isUsingVerticalWriting: boolean, minimumWidth: number) => {
    const pageSize = context.getPageSize()
    const horizontalMargin = 0
    const verticalMargin = 0
    let columnWidth = pageSize.width - horizontalMargin * 2
    const columnHeight = pageSize.height - verticalMargin * 2
    let width = pageSize.width - horizontalMargin * 2

    if (isUsingVerticalWriting) {
      width = minimumWidth - horizontalMargin * 2
      columnWidth = columnHeight
    }

    return {
      columnHeight,
      columnWidth,
      // horizontalMargin,
      // verticalMargin,
      width,
    }
  }

  const layout = ({
    height,
    width,
    blankPagePosition,
    minimumWidth,
  }: {
    height: number
    width: number
    blankPagePosition: `before` | `after` | `none`
    minimumWidth: number
  }) => {
    containerElement.style.width = `${width}px`
    containerElement.style.height = `${height}px`

    hooks$.getValue().forEach((hook) => {
      if (hook.name === `item.onAfterLayout`) {
        hook.fn({ blankPagePosition, item, minimumWidth })
      }
    })

    setLayoutDirty()
  }

  const translateFramePositionIntoPage = (position: { clientX: number; clientY: number }) => {
    // Here we use getBoundingClientRect meaning we will get relative value for left / top based on current
    // window (viewport). This is handy because we can easily get the translated x/y without any extra information
    // such as page index, etc. However this might be a bit less performance to request heavily getBoundingClientRect
    const { left = 0, top = 0 } = spineItemFrame.getFrameElement()?.getBoundingClientRect() || {}
    const computedScale = getViewPortInformation()?.computedScale ?? 1
    const adjustedX = position.clientX * computedScale + left
    const adjustedY = position.clientY * computedScale + top

    return {
      clientX: adjustedX,
      clientY: adjustedY,
    }
  }

  const getResource = async () => {
    const fetchResource = context.getState().fetchResource
    const lastFetch = (_: Manifest[`spineItems`][number]) => {
      if (fetchResource) {
        return fetchResource(item)
      }

      return fetch(item.href)
    }

    const finalFetch = hooks$.getValue().reduce((acc, hook) => {
      if (hook.name === `item.onGetResource`) {
        return hook.fn(acc)
      }

      return acc
    }, lastFetch)

    return await finalFetch(item)
  }

  const manipulateSpineItem = (
    cb: (
      options: {
        container: HTMLElement
        item: Manifest[`spineItems`][number]
        overlayElement: HTMLDivElement
      } & (
        | ReturnType<typeof createFrameManipulator>
        | { frame: undefined; removeStyle: (id: string) => void; addStyle: (id: string, style: string) => void }
      ),
    ) => boolean,
  ) => {
    const manipulableFrame = spineItemFrame.getManipulableFrame()

    if (manipulableFrame) {
      return cb({
        ...manipulableFrame,
        container: containerElement,
        item,
        overlayElement,
      })
    }

    return cb({
      container: containerElement,
      item,
      frame: undefined,
      removeStyle: () => {},
      addStyle: () => {},
      overlayElement,
    })
  }

  const executeOnLayoutBeforeMeasurementHook = (options: { minimumWidth: number }) =>
    hooks$.getValue().forEach((hook) => {
      if (hook.name === `item.onLayoutBeforeMeasurement`) {
        hook.fn({
          frame: spineItemFrame,
          container: containerElement,
          item,
          isImageType,
          ...options,
        })
      }
    })

  const contentLayout$ = spineItemFrame.$.contentLayoutChange$.pipe(
    withLatestFrom(spineItemFrame.$.isReady$),
    map(([data, isReady]) => ({
      isFirstLayout: data.isFirstLayout,
      isReady,
    })),
  )

  return {
    item,
    load: () => {
      setLayoutDirty()
    },
    layout,
    adjustPositionOfElement,
    getElementDimensions,
    getHtmlFromResource: spineItemFrame.getHtmlFromResource,
    getResource,
    translateFramePositionIntoPage,
    setLayoutDirty,
    injectStyle,
    loadContent,
    unloadContent,
    spineItemFrame,
    element: containerElement,
    getBoundingRectOfElementFromSelector,
    getViewPortInformation,
    isImageType,
    isReady: spineItemFrame.getIsReady,
    destroy: () => {
      destroySubject$.next()
      containerElement.remove()
      spineItemFrame?.destroy()
      fingerTracker.destroy()
      selectionTracker.destroy()
      destroySubject$.complete()
    },
    isUsingVerticalWriting: () => spineItemFrame.getWritingMode()?.startsWith(`vertical`),
    /**
     * @important
     * Do not use this value for layout and navigation. It will be in possible conflict
     * with the global reading direction. A book should not mix them anyway. A page can have
     * a different reading direction for style reason but it should be in theory pre-paginated.
     * For example an english page in a japanese manga. That's expected and will
     * be confined to a single page.
     */
    getReadingDirection: () => {
      return spineItemFrame.getReadingDirection() || context.getReadingDirection()
    },
    manipulateSpineItem,
    executeOnLayoutBeforeMeasurementHook: executeOnLayoutBeforeMeasurementHook,
    selectionTracker,
    fingerTracker,
    getDimensionsForReflowableContent,
    getDimensionsForPaginatedContent,
    $: {
      contentLayout$,
      loaded$: spineItemFrame.$.loaded$,
      isReady$: spineItemFrame.$.isReady$,
    },
  }
}

const createContainerElement = (
  containerElement: HTMLElement,
  item: Manifest[`spineItems`][number],
  hooks$: BehaviorSubject<Hook[]>,
) => {
  const element: HTMLElement = containerElement.ownerDocument.createElement(`div`)
  element.classList.add(`spineItem`)
  element.classList.add(`spineItem-${item.renditionLayout}`)
  element.style.cssText = `
    position: absolute;
    overflow: hidden;
  `

  return hooks$.getValue().reduce((element, hook) => {
    if (hook.name === `item.onBeforeContainerCreated`) {
      return hook.fn(element)
    }

    return element
  }, element)
}

const createOverlayElement = (containerElement: HTMLElement, item: Manifest[`spineItems`][number]) => {
  const element = containerElement.ownerDocument.createElement(`div`)
  element.classList.add(`spineItemOverlay`)
  element.classList.add(`spineItemOverlay-${item.renditionLayout}`)
  element.style.cssText = `
    position: absolute;
    width: 100%;
    height: 100%;
    pointer-events: none;
    background-color: transparent;
  `

  return element
}

const createFrameHooks = (
  iframeEventBridgeElement$: BehaviorSubject<HTMLElement | undefined>,
  fingerTracker: ReturnType<typeof createFingerTracker>,
  selectionTracker: ReturnType<typeof createSelectionTracker>,
): Hook[] => {
  return [
    {
      name: `item.onLoad`,
      fn: ({ frame }) => {
        /**
         * Register event listener for all mouse/pointer event in order to
         * passthrough events to main document
         */
        const unregister = passthroughEvents.map((event) => {
          const listener = (e: MouseEvent | PointerEvent | TouchEvent) => {
            let convertedEvent = e

            if (isPointerEvent(e)) {
              convertedEvent = new PointerEvent(e.type, e)
            }

            if (isMouseEvent(e)) {
              convertedEvent = new MouseEvent(e.type, e)
            }

            if (convertedEvent !== e) {
              attachOriginalFrameEventToDocumentEvent(convertedEvent, e)
              iframeEventBridgeElement$.getValue()?.dispatchEvent(convertedEvent)
            }
          }

          frame.contentDocument?.addEventListener(event, listener)

          return () => {
            frame.contentDocument?.removeEventListener(event, listener)
          }
        })

        selectionTracker.track(frame)
        fingerTracker.track(frame)

        return () => {
          unregister.forEach((cb) => cb())
        }
      },
    },
  ]
}