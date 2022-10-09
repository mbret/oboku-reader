import { Context } from "../context"
import { getOriginalFrameEventFromDocumentEvent } from "../frames"
import { SpineItemManager } from "../spineItemManager"
import { isMouseEvent, isPointerEvent, isTouchEvent } from "../utils/dom"
import { createLocationResolver } from "./locationResolver"

export const createEventsHelper = ({
  iframeEventBridgeElement,
  locator
}: {
  iframeEventBridgeElement: HTMLElement
  spineItemManager: SpineItemManager
  context: Context
  locator: ReturnType<typeof createLocationResolver>
}) => {
  const normalizeEventForViewport = <E extends MouseEvent | TouchEvent | PointerEvent>(event: E) => {
    const eventIsComingFromBridge = event.target === iframeEventBridgeElement
    const iframeOriginalEvent = getOriginalFrameEventFromDocumentEvent(event)
    const originalFrame = iframeOriginalEvent?.view?.frameElement

    if (!eventIsComingFromBridge || !iframeOriginalEvent || !originalFrame) return event

    const spineItem = locator.getSpineItemFromIframe(originalFrame)

    if (!spineItem) return event

    if (isPointerEvent(event)) {
      const { clientX, clientY } = spineItem.translateFramePositionIntoPage(event)

      const newEvent = new PointerEvent(event.type, {
        ...event,
        clientX,
        clientY
      }) as E

      Object.defineProperty(newEvent, `target`, { value: iframeOriginalEvent.target, enumerable: true })

      return newEvent
    }

    if (isMouseEvent(event)) {
      const { clientX, clientY } = spineItem.translateFramePositionIntoPage(event)

      const newEvent = new MouseEvent(event.type, {
        ...event,
        clientX,
        clientY
      }) as E

      Object.defineProperty(newEvent, `target`, { value: iframeOriginalEvent.target, enumerable: true })

      return newEvent
    }

    if (isTouchEvent(event)) {
      const touches = Array.from(event.touches).map((touch) => {
        const { clientX, clientY } = spineItem.translateFramePositionIntoPage(touch)

        return new Touch({
          identifier: touch.identifier,
          target: touch.target,
          clientX,
          clientY
        })
      })

      const newEvent = new TouchEvent(event.type, {
        touches,
        changedTouches: touches,
        targetTouches: touches
      }) as E

      Object.defineProperty(newEvent, `target`, { value: iframeOriginalEvent.target, enumerable: true })

      return newEvent
    }

    return event
  }

  return {
    normalizeEventForViewport
  }
}
