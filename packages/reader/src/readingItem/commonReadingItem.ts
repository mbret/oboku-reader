import { Context } from "../context"
import { createFrameManipulator, createReadingItemFrame, ReadingItemFrame } from "./readingItemFrame"
import { Manifest } from "../types"
import { Subject, Subscription } from "rxjs"
import { Report } from "../report"
import { __UNSAFE_REFERENCE_ORIGINAL_IFRAME_EVENT_KEY } from "../constants"
import { createFingerTracker, createSelectionTracker } from "./trackers"
import { isMouseEvent, isPointerEvent } from "../utils/dom"
import { attachOriginalFrameEventToDocumentEvent } from "../frames"

type Hook =
  {
    name: `onLoad`,
    fn: (manipulableFrame: ReturnType<typeof createFrameManipulator> & {
      container: HTMLElement,
      loadingElement: HTMLElement,
      item: Manifest['readingOrder'][number],
    }) => void
  }

const pointerEvents = [
  "pointercancel" as const,
  "pointerdown" as const,
  "pointerenter" as const,
  "pointerleave" as const,
  "pointermove" as const,
  "pointerout" as const,
  "pointerover" as const,
  "pointerup" as const
]

const mouseEvents = [
  'mousedown' as const,
  'mouseup' as const,
  'mouseenter' as const,
  'mouseleave' as const,
  'mousemove' as const,
  'mouseout' as const,
  'mouseover' as const,
]

const passthroughEvents = [...pointerEvents, ...mouseEvents]

export const createCommonReadingItem = ({ item, context, containerElement, iframeEventBridgeElement }: {
  item: Manifest['readingOrder'][number],
  containerElement: HTMLElement,
  iframeEventBridgeElement: HTMLElement,
  context: Context,
}) => {
  const isReflowable = false
  const subject = new Subject<{ event: 'selectionchange' | 'selectstart', data: Selection } | { event: 'layout', data: { isFirstLayout: boolean, isReady: boolean } }>()
  const element = createWrapperElement(containerElement, item)
  const loadingElement = createLoadingElement(containerElement, item, context)
  const readingItemFrame = createReadingItemFrame(element, item, context)
  const fingerTracker = createFingerTracker()
  const selectionTracker = createSelectionTracker()
  containerElement.appendChild(element)
  element.appendChild(loadingElement)
  let hooks: Hook[] = []
  let readingItemFrame$: Subscription | undefined
  // Do not memoize x,y,top,left as they change relatively to the viewport all the time
  let memoizedElementDimensions: { width: number, height: number } | undefined = undefined

  const getElementDimensions = () => {
    if (memoizedElementDimensions) {
      return memoizedElementDimensions
    }

    const rect = element.getBoundingClientRect()
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


  const injectStyle = (readingItemFrame: ReadingItemFrame, cssText: string) => {
    readingItemFrame.getManipulableFrame()?.removeStyle('oboku-reader-css')
    readingItemFrame.getManipulableFrame()?.addStyle('oboku-reader-css', cssText)
  }

  const adjustPositionOfElement = (edgeOffset: number | undefined) => {
    if (edgeOffset === undefined) return
    if (context.isRTL()) {
      // could also be negative left but I am not in the mood
      // will push items on the left
      element.style.right = `${edgeOffset}px`
    } else {
      // will push items on the right
      element.style.left = `${edgeOffset}px`
    }
  }

  const getViewPortInformation = () => {
    const { width: pageWidth, height: pageHeight } = context.getPageSize()
    const viewportDimensions = readingItemFrame.getViewportDimensions()
    const frameElement = readingItemFrame.getManipulableFrame()?.frame
    if (element && frameElement?.contentDocument && frameElement?.contentWindow && viewportDimensions) {
      const computedScale = Math.min(pageWidth / viewportDimensions.width, pageHeight / viewportDimensions.height)

      return { computedScale, viewportDimensions }
    }

    return { computedScale: 1, ...viewportDimensions }
  }

  const loadContent = () => {
    readingItemFrame.load().catch(Report.error)
  }

  const unloadContent = async () => {
    readingItemFrame.unload()

    if (loadingElement && loadingElement.style.visibility !== `visible`) {
      loadingElement.style.visibility = 'visible'
    }
  }

  const getBoundingRectOfElementFromSelector = (selector: string) => {
    const frame = readingItemFrame.getManipulableFrame()?.frame
    if (frame && selector) {
      if (selector.startsWith(`#`)) {
        return frame.contentDocument?.getElementById(selector.replace(`#`, ``))?.getBoundingClientRect()
      }
      return frame.contentDocument?.querySelector(selector)?.getBoundingClientRect()
    }
  }

  function registerHook(hook: Hook) {
    hooks.push(hook)
    if (hook.name === `onLoad`) {
      readingItemFrame.registerHook({
        name: `onLoad`,
        fn: (iframeData) => hook.fn({ ...iframeData, container: element, loadingElement, item })
      })
    }
  }

  const setLayoutDirty = () => {
    memoizedElementDimensions = undefined
  }

  const layout = ({ height, width }: { height: number, width: number }) => {
    element.style.width = `${width}px`
    element.style.height = `${height}px`

    loadingElement.style.setProperty(`max-width`, `${context.getVisibleAreaRect().width}px`)

    setLayoutDirty()
  }

  const translateFramePositionIntoPage = (position: { x: number, y: number }) => {
    // Here we use getBoundingClientRect meaning we will get relative value for left / top based on current
    // window (viewport). This is handy because we can easily get the translated x/y without any extra information
    // such as page index, etc. However this might be a bit less performance to request heavily getBoundingClientRect
    const { left = 0, top = 0 } = readingItemFrame.getFrameElement()?.getBoundingClientRect() || {}
    const { computedScale = 1 } = getViewPortInformation() || {}
    const adjustedX = position.x * computedScale + left
    const adjustedY = position.y * computedScale + top

    return {
      x: adjustedX,
      y: adjustedY,
    }
  }

  readingItemFrame.registerHook({
    name: `onLoad`,
    fn: ({ frame }) => {
      passthroughEvents.forEach(event => {
        frame.contentDocument?.addEventListener(event, (e) => {
          let convertedEvent = e

          if (isPointerEvent(e)) {
            convertedEvent = new PointerEvent(e.type, e)
          }

          if (isMouseEvent(e)) {
            convertedEvent = new MouseEvent(e.type, e);
          }

          if (convertedEvent !== e) {
            attachOriginalFrameEventToDocumentEvent(convertedEvent, e)
            iframeEventBridgeElement.dispatchEvent(convertedEvent)
          }
        })
      })
    }
  })

  readingItemFrame$ = readingItemFrame.$.subscribe((event) => {
    if (event.event === `domReady`) {
      fingerTracker.track(event.data)
      selectionTracker.track(event.data)
    }

    if (event.event === 'layout') {
      if (event.data.isFirstLayout && event.data.isReady) {
        loadingElement.style.visibility = 'hidden'
      }
    }
  })

  return {
    load: () => {
      setLayoutDirty()
    },
    layout,
    registerHook,
    adjustPositionOfElement,
    createWrapperElement,
    createLoadingElement,
    getElementDimensions,
    translateFramePositionIntoPage,
    setLayoutDirty,
    injectStyle,
    loadContent,
    unloadContent,
    readingItemFrame,
    element,
    loadingElement,
    isReflowable,
    getBoundingRectOfElementFromSelector,
    getViewPortInformation,
    destroy: () => {
      loadingElement.onload = () => { }
      loadingElement.remove()
      element.remove()
      readingItemFrame?.destroy()
      readingItemFrame$?.unsubscribe()
      fingerTracker.destroy()
      selectionTracker.destroy()
      hooks = []
    },
    isUsingVerticalWriting: () => readingItemFrame.getWritingMode()?.startsWith(`vertical`),
    getReadingDirection: () => {
      return readingItemFrame.getReadingDirection() || context.getReadingDirection()
    },
    isFrameReady: () => readingItemFrame.getIsReady(),
    manipulateReadingItem: (
      cb: (options: {
        container: HTMLElement,
        loadingElement: HTMLElement,
        item: Manifest['readingOrder'][number]
      } & (ReturnType<typeof createFrameManipulator> | { frame: undefined, removeStyle: (id: string) => void, addStyle: (id: string, style: string) => void })) => boolean
    ) => {
      const manipulableFrame = readingItemFrame.getManipulableFrame()

      if (manipulableFrame) return cb({ ...manipulableFrame, container: element, loadingElement, item })

      return cb({ container: element, loadingElement, item, frame: undefined, removeStyle: () => { }, addStyle: () => { } })
    },
    selectionTracker,
    fingerTracker,
    $: subject,
  }
}

const createWrapperElement = (containerElement: HTMLElement, item: Manifest['readingOrder'][number]) => {
  const element = containerElement.ownerDocument.createElement('div')
  element.classList.add('readingItem')
  element.classList.add(`readingItem-${item.renditionLayout}`)
  element.style.cssText = `
    position: absolute;
    overflow: hidden;
  `

  return element
}

/**
 * We use iframe for loading element mainly to be able to use share hooks / manipulation
 * with iframe. That way the loading element always match whatever style is applied to iframe.
 */
const createLoadingElement = (containerElement: HTMLElement, item: Manifest['readingOrder'][number], context: Context) => {
  const loadingElement = containerElement.ownerDocument.createElement('div')
  loadingElement.classList.add(`loading`)
  loadingElement.style.cssText = `
    height: 100%;
    width: 100%;
    max-width: ${context.getVisibleAreaRect().width}px;
    text-align: center;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    position: absolute;
    left: 0;
    top: 0;
    background-color: white;
  `

  const logoElement = containerElement.ownerDocument.createElement('div')
  logoElement.innerText = `oboku`
  logoElement.style.cssText = `
    font-size: 4em;
    color: #cacaca;
  `
  const detailsElement = containerElement.ownerDocument.createElement('div')
  detailsElement.innerText = `loading ${item.id}`
  detailsElement.style.cssText = `
    font-size: 1.2em;
    color: rgb(202, 202, 202);
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
    max-width: 300px;
    width: 80%;
  `
  loadingElement.appendChild(logoElement)
  loadingElement.appendChild(detailsElement)

  return loadingElement
}