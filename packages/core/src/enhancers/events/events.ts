import { BehaviorSubject, takeUntil, tap } from "rxjs"
import { isMouseEvent, isPointerEvent } from "../../utils/dom"
import { EnhancerOutput, RootEnhancer } from "../types/enhancer"
import { createNormalizeEventForViewport } from "./normalizeEventForViewport"
import { createIframeEventBridgeElement } from "./createIframeEventBridgeElement"
import { attachOriginalFrameEventToDocumentEvent } from "./frames"

const pointerEvents = [
  `pointercancel` as const,
  `pointerdown` as const,
  `pointerenter` as const,
  `pointerleave` as const,
  `pointermove` as const,
  `pointerout` as const,
  `pointerover` as const,
  `pointerup` as const,
  // `touchstart` as const,
  // `touchend` as const,
]

const mouseEvents = [
  // `click` as const,
  // `mousedown` as const,
  // `mouseup` as const,
  // `mouseenter` as const,
  // `mouseleave` as const,
  // `mousemove` as const,
  // `mouseout` as const,
  // `mouseover` as const,
]

const passthroughEvents = [...pointerEvents /*, ...mouseEvents*/]

export const eventsEnhancer =
  <InheritOptions, InheritOutput extends EnhancerOutput<RootEnhancer>>(
    next: (options: InheritOptions) => InheritOutput,
  ) =>
  (
    options: InheritOptions,
  ): InheritOutput & {
    events: {
      normalizeEventForViewport: ReturnType<
        typeof createNormalizeEventForViewport
      >
    }
  } => {
    const iframeEventBridgeElement$ = new BehaviorSubject<
      HTMLElement | undefined
    >(undefined)

    const reader = next(options)

    const normalizeEventForViewport = createNormalizeEventForViewport({
      iframeEventBridgeElement$: iframeEventBridgeElement$,
      locator: reader.spine.locator,
    })

    reader.hookManager.register(`item.onLoad`, ({ destroy, frame, itemId }) => {
      const item = reader.spineItemManager.get(itemId)

      if (!item) return

      /**
       * Register event listener for all mouse/pointer event in order to
       * passthrough events to main document
       */
      const unregister = passthroughEvents.map((event) => {
        const listener = (e: MouseEvent | PointerEvent | TouchEvent) => {
          let convertedEvent = e

          /**
           * We have to create a new fake event since the original one is already dispatched
           * on original frame.
           *
           * @see Failed to execute 'dispatchEvent' on 'EventTarget': The event is already being dispatched.
           */
          if (isPointerEvent(e)) {
            convertedEvent = new PointerEvent(e.type, e)
          }

          // if (isMouseEvent(e)) {
          //   convertedEvent = new MouseEvent(e.type, e)
          // }

          if (convertedEvent !== e) {
            attachOriginalFrameEventToDocumentEvent(convertedEvent, e)

            const normalizedEvent = normalizeEventForViewport(convertedEvent)

            // @ts-ignore
            // console.log(normalizedEvent.x, normalizedEvent.type)
            reader.context.state.containerElement?.dispatchEvent(
              normalizedEvent,
            )
            // reader.context.state.containerElement?.dispatchEvent(e)
            // iframeEventBridgeElement$.getValue()?.dispatchEvent(convertedEvent)
          }
        }

        frame.contentDocument?.addEventListener(event, listener)

        return () => {
          frame.contentDocument?.removeEventListener(event, listener)
        }
      })

      item.selectionTracker.track(frame)
      item.fingerTracker.track(frame)

      destroy(() => {
        unregister.forEach((cb) => cb())
      })
    })

    // reader.element$
    //   .pipe(
    //     tap((wrapper) => {
    //       const iframeEventBridgeElement = createIframeEventBridgeElement(wrapper)

    //       wrapper.appendChild(iframeEventBridgeElement)

    //       iframeEventBridgeElement$.getValue()?.remove()
    //       iframeEventBridgeElement$.next(iframeEventBridgeElement)
    //     }),
    //     takeUntil(reader.$.destroy$),
    //   )
    //   .subscribe()

    return {
      ...reader,
      events: {
        normalizeEventForViewport: createNormalizeEventForViewport({
          iframeEventBridgeElement$: iframeEventBridgeElement$,
          locator: reader.spine.locator,
        }),
      },
    }
  }
