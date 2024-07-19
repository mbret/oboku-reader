// export function createSelectionFromPoint(startX: number, startY: number, endX: number, endY: number) {
//   var doc = document;
//   var start, end, range = null;
//   if (typeof doc.caretPositionFromPoint != "undefined") {
//     start = doc.caretPositionFromPoint(startX, startY);
//     end = doc.caretPositionFromPoint(endX, endY);
//     range = doc.createRange();
//     range.setStart(start.offsetNode, start.offset);
//     range.setEnd(end.offsetNode, end.offset);
//   } else if (typeof doc.caretRangeFromPoint != "undefined") {
//     start = doc.caretRangeFromPoint(startX, startY);
//     end = doc.caretRangeFromPoint(endX, endY);
//     range = doc.createRange();
//     range.setStart(start.startContainer, start.startOffset);
//     range.setEnd(end.startContainer, end.startOffset);
//   }
//   if (range !== null && typeof window.getSelection != "undefined") {
//     var sel = window.getSelection();
//     sel.removeAllRanges();
//     sel.addRange(range);
//   } else if (typeof doc.body.createTextRange != "undefined") {
//     range = doc.body.createTextRange();
//     range.moveToPoint(startX, startY);
//     var endRange = range.duplicate();
//     endRange.moveToPoint(endX, endY);
//     range.setEndPoint("EndToEnd", endRange);
//     range.select();
//   }
// }

import { Report } from "../report"

const pointerEvents: string[] = [
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

/**
 * Global env agnostic method to detect if an element is HtmlElement.
 *
 * @example
 * checking instance of element from iframe will not work because
 * `window.HtmlElement` is not the same as iframe.window.HtmlElement
 * element instanceof HtmlElement -> false
 *
 * isHtmlElement(element) -> true
 */
export const isHtmlElement = (
  element?: Element | Node | null | EventTarget,
): element is HTMLElement => {
  return (
    typeof element === `object` &&
    !!element &&
    `nodeType` in element &&
    element?.nodeType === Node.ELEMENT_NODE &&
    `innerText` in (element as HTMLElement)
  )
}

function createRangeOrCaretFromPoint(
  doc: Document,
  startX: number,
  startY: number,
) {
  // @see https://developer.mozilla.org/en-US/docs/Web/API/Document/caretPositionFromPoint
  if (`caretPositionFromPoint` in doc) {
    // @see https://developer.mozilla.org/en-US/docs/Web/API/CaretPosition
    // @ts-expect-error
    return doc.caretPositionFromPoint(startX, startY) as {
      offsetNode: Node
      offset: number
    }
  } else if (typeof doc.caretRangeFromPoint !== `undefined`) {
    return doc.caretRangeFromPoint(startX, startY)
  }
}

type ViewPort = { left: number; right: number; top: number; bottom: number }

/**
 * @todo optimize
 */
export const getFirstVisibleNodeForViewport = Report.measurePerformance(
  `getFirstVisibleNodeForViewport`,
  1,
  (documentOrElement: Document | Element, viewport: ViewPort) => {
    const element =
      `body` in documentOrElement
        ? getFirstVisibleElementForViewport(documentOrElement.body, viewport)
        : getFirstVisibleElementForViewport(documentOrElement, viewport)

    const ownerDocument =
      `createRange` in documentOrElement
        ? documentOrElement
        : documentOrElement.ownerDocument

    if (element) {
      let lastValidRange: Range | undefined
      let lastValidOffset = 0
      const range = ownerDocument.createRange()

      Array.from(element.childNodes).some((childNode) => {
        range.selectNodeContents(childNode)
        const rects = range.getClientRects()
        const visibleRect = getFirstVisibleDOMRect(rects, viewport)

        // At this point we know the range is valid and contains visible rect.
        // This means we have a valid Node. We still need to know the visible offset to be 100% accurate
        if (visibleRect) {
          lastValidRange = range.cloneRange()

          /**
           * Now we will try to refine the search to get the offset
           * this is an incredibly expensive operation so we will try to
           * use native functions to get something
           * @important
           * when using float value it looks like sometime when at the begin of the book the returned range will be the last offset of the page
           * it can be tested with moby-dick.txt by using different font size. Whenever using something different than default font size we might
           * have floating point for font and we start having issue. Using ceil "make sure" to be inside the point. Hopefully.
           */
          const rangeOrCaret = createRangeOrCaretFromPoint(
            ownerDocument,
            Math.ceil(visibleRect.left),
            Math.ceil(visibleRect.top),
          )

          // good news we found something with same node so we can assume the offset is already better than nothing
          if (
            rangeOrCaret &&
            `startContainer` in rangeOrCaret &&
            rangeOrCaret.startContainer === lastValidRange.startContainer
          ) {
            lastValidOffset = rangeOrCaret.startOffset
          }
          if (
            rangeOrCaret &&
            `offsetNode` in rangeOrCaret &&
            rangeOrCaret.offsetNode === lastValidRange.startContainer
          ) {
            lastValidOffset = rangeOrCaret.offset
          }
          return true
        }
        return false
      })

      if (lastValidRange) {
        return { node: lastValidRange.startContainer, offset: lastValidOffset }
      }

      return { node: element, offset: 0 }
    }

    return undefined
  },
)

const getFirstVisibleElementForViewport = (
  element: Element,
  viewport: ViewPort,
) => {
  let lastValidElement: Element | undefined
  const positionFromViewport = getElementOrNodePositionFromViewPort(
    element.getBoundingClientRect(),
    viewport,
  )

  if (positionFromViewport !== `before` && positionFromViewport !== `after`) {
    lastValidElement = element
  }

  Array.from(element.children).some((child) => {
    const childInViewPort = getFirstVisibleElementForViewport(child, viewport)
    if (childInViewPort) {
      lastValidElement = childInViewPort

      return true
    }

    return false
  })

  return lastValidElement
}

function getElementOrNodePositionFromViewPort(
  domRect: DOMRect,
  { left, right }: ViewPort,
) {
  // horizontal + ltr
  if (domRect.left <= left && domRect.right <= left) return `before`
  if (domRect.left <= left && domRect.right > left && domRect.right <= right)
    return `partially-before`
  if (domRect.left <= right && domRect.right > right) return `partially-after`
  if (domRect.left > right) return `after`
  return `within`

  // @todo rtl
  // @todo vertical-lrt
  // @todo vertical-rtl
}

function getFirstVisibleDOMRect(domRect: DOMRectList, viewport: ViewPort) {
  return Array.from(domRect).find((domRect) => {
    const position = getElementOrNodePositionFromViewPort(domRect, viewport)

    if (position !== `before` && position !== `after`) {
      return true
    }
    return false
  })
}

export const getRangeFromNode = (node: Node, offset: number) => {
  if (
    node.nodeType !== Node.CDATA_SECTION_NODE &&
    node.nodeType !== Node.DOCUMENT_TYPE_NODE
  ) {
    const range = node.ownerDocument?.createRange()
    range?.selectNodeContents(node)

    try {
      if (offset <= (range?.endOffset || 0)) {
        range?.setStart(node, offset || 0)
      }
    } catch (e) {
      Report.error(e)
    }

    return range
  }

  return undefined
}

export const isPointerEvent = (event: Event): event is PointerEvent => {
  if (
    (event as PointerEvent)?.target &&
    (event?.target as Element)?.ownerDocument?.defaultView
  ) {
    const eventView = (event?.target as Element)?.ownerDocument
      ?.defaultView as Window & typeof globalThis

    if (eventView.PointerEvent && event instanceof eventView.PointerEvent) {
      return true
    }
  }

  if ((event as PointerEvent)?.view && (event as PointerEvent)?.view?.window) {
    const eventView = (event as PointerEvent)?.view as Window &
      typeof globalThis

    if (eventView.PointerEvent && event instanceof eventView.PointerEvent) {
      return true
    }
  }

  if (pointerEvents.includes(event.type)) {
    return true
  }

  return false
}

export const isMouseEvent = (event: Event): event is MouseEvent => {
  if (isPointerEvent(event)) return false

  if (
    (event as MouseEvent)?.target &&
    (event?.target as Element)?.ownerDocument?.defaultView
  ) {
    const eventView = (event?.target as Element)?.ownerDocument
      ?.defaultView as Window & typeof globalThis

    if (eventView.MouseEvent) {
      return event instanceof eventView.MouseEvent
    }
  }

  if ((event as MouseEvent)?.view && (event as MouseEvent)?.view?.window) {
    const eventView = (event as MouseEvent)?.view as Window & typeof globalThis

    if (eventView.MouseEvent) {
      return event instanceof eventView.MouseEvent
    }
  }

  return false
}

export const isTouchEvent = (event: Event): event is TouchEvent => {
  if (
    (event as TouchEvent)?.target &&
    (event?.target as Element)?.ownerDocument?.defaultView
  ) {
    const eventView = (event?.target as Element)?.ownerDocument
      ?.defaultView as Window & typeof globalThis

    if (eventView.TouchEvent) {
      return event instanceof eventView.TouchEvent
    }
  }

  if ((event as TouchEvent)?.view && (event as TouchEvent)?.view?.window) {
    const eventView = (event as TouchEvent)?.view as Window & typeof globalThis

    if (eventView.TouchEvent) {
      return event instanceof eventView.TouchEvent
    }
  }

  return false
}

export const noopElement = () => document.createElement("div")
