import { Context } from "../context"
import { getOriginalFrameEventFromDocumentEvent } from "../frames"
import { ReadingItemManager } from "../readingItemManager"
import { isMouseEvent, isPointerEvent, isTouchEvent } from "../utils/dom"
import { createLocator } from "./locator"

export const createEventsHelper = ({ iframeEventBridgeElement, context, readingItemManager }: {
  iframeEventBridgeElement: HTMLElement,
  readingItemManager: ReadingItemManager,
  context: Context,
}) => {
  const locator = createLocator({ readingItemManager, context })

  const normalizeEventForViewport = <E extends (MouseEvent | TouchEvent | PointerEvent)>(event: E) => {
    const eventIsComingFromBridge = event.target === iframeEventBridgeElement
    const iframeOriginalEvent = getOriginalFrameEventFromDocumentEvent(event)
    const originalFrame = iframeOriginalEvent?.view?.frameElement

    if (!eventIsComingFromBridge || !iframeOriginalEvent || !originalFrame) return event

    const readingItem = locator.getReadingItemFromIframe(originalFrame)

    if (!readingItem) return event

    if (isPointerEvent(event)) {
      const { clientX, clientY } = readingItem.translateFramePositionIntoPage(event)

      const newEvent = new PointerEvent(event.type, {
        ...event,
        clientX,
        clientY,
      }) as E;

      Object.defineProperty(newEvent, `target`, { value: iframeOriginalEvent.target, enumerable: true });

      return newEvent
    }

    if (isMouseEvent(event)) {
      const { clientX, clientY } = readingItem.translateFramePositionIntoPage(event)

      const newEvent = new MouseEvent(event.type, {
        ...event,
        clientX,
        clientY,
      }) as E;

      Object.defineProperty(newEvent, `target`, { value: iframeOriginalEvent.target, enumerable: true });

      return newEvent
    }

    if (isTouchEvent(event)) {
      const touches = Array.from(event.touches).map(
        (touch) => {
          const { clientX, clientY } = readingItem.translateFramePositionIntoPage(touch)

          return new Touch({
            identifier: touch.identifier,
            target: touch.target,
            clientX,
            clientY,
          })
        },
      )

      const newEvent = new TouchEvent(event.type, {
        touches,
        changedTouches: touches,
        targetTouches: touches,
      }) as E

      Object.defineProperty(newEvent, `target`, { value: iframeOriginalEvent.target, enumerable: true });

      return newEvent
    }

    return event
  }

  return {
    normalizeEventForViewport
  }
}