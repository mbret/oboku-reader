import { merge, Observable, Subject } from "rxjs"
import { Enhancer } from "@oboku/reader"
import { filter, takeUntil, tap } from "rxjs/operators"

type Highlight = {
  anchorCfi: string,
  focusCfi: string,
  id: number,
  text?: string,
  readingItemIndex?: number | undefined,
  anchorNode?: Node,
  anchorOffset?: number,
  focusNode?: Node,
  focusOffset?: number,
  element?: HTMLElement
}

type UserHighlight = Pick<Highlight, 'anchorCfi' | 'focusCfi'>

type SubjectType =
  | { type: `onHighlightClick`, data: Highlight }
  | { type: `onUpdate`, data: Highlight[] }

const SHOULD_NOT_LAYOUT = false
const HIGHLIGHT_ID_PREFIX = `oboku-reader-enhancer-highlights`

let uniqueId = 0

/**
 * @todo
 * Optimize refresh of elements
 */
export const createHighlightsEnhancer = ({ highlights: initialHighlights }: { highlights: UserHighlight[] }): Enhancer<{
  highlights: {
    add: (highlight: UserHighlight) => void,
    remove: (id: number) => void,
    isHighlightClicked: (event: MouseEvent | TouchEvent | PointerEvent) => boolean,
  },
  highlights$: Observable<SubjectType>
}> =>
  (next) => (options) => {
    const reader = next(options)
    const highlights$ = new Subject<SubjectType>()
    let highlights: Highlight[] = []

    const getRangeForHighlight = (overlayElement: HTMLElement, anchor: { node: Node, offset?: number }, focus: { node: Node, offset?: number }) => {
      const range = overlayElement.ownerDocument.createRange()
      range.setStart(anchor.node, anchor.offset || 0)
      range.setEnd(focus.node, focus.offset || 0)

      return range
    }

    const drawHighlight = (overlayElement: HTMLElement, highlight: Highlight) => {
      const { node: anchorNode, offset: anchorOffset } = reader.resolveCfi(highlight.anchorCfi) || {}
      const { node: focusNode, offset: focusOffset } = reader.resolveCfi(highlight.focusCfi) || {}

      if (anchorNode && focusNode) {

        // remove old previous highlight
        highlight.element?.remove()

        const range = getRangeForHighlight(overlayElement, { node: anchorNode, offset: anchorOffset }, { node: focusNode, offset: focusOffset })

        highlight.text = range.toString()

        const rectElements = Array.from(range.getClientRects()).map((domRect) => {
          const rectElt = overlayElement.ownerDocument.createElement('div')
          rectElt.style.cssText = `
            position: absolute;
            width: ${domRect.width}px;
            height: ${domRect.height}px;
            top: ${domRect.top}px;
            left: ${domRect.left}px;
            background-color: green;
            opacity: 50%;
          `
          rectElt.setAttribute(`data-${HIGHLIGHT_ID_PREFIX}`, ``)

          return rectElt
        })

        const containerElement = overlayElement.ownerDocument.createElement('div')
        containerElement.style.cssText = `
          pointer-events: auto;
        `

        highlight.element = containerElement

        rectElements.forEach(el => containerElement.appendChild(el))
        overlayElement.appendChild(containerElement)

        containerElement.addEventListener(`click`, () => {
          highlights$.next({ type: `onHighlightClick`, data: highlight })
        })
      }
    }

    const drawHighlightsForItem = (overlayElement: HTMLElement, itemIndex: number) => {
      highlights.forEach((highlight) => {
        if (highlight.readingItemIndex === itemIndex) {
          drawHighlight(overlayElement, highlight)
        }
      })
    }

    const _add = (highlight: UserHighlight) => {
      const cfiMetaInfo = reader.getCfiMetaInformation(highlight.anchorCfi)
      const newHighlight = { ...highlight, readingItemIndex: cfiMetaInfo?.readingItemIndex, id: uniqueId++ }

      highlights.push(newHighlight)

      if (newHighlight.readingItemIndex !== undefined) {
        reader.manipulateReadingItems(({ index, overlayElement }) => {
          console.log(index, newHighlight.readingItemIndex)
          if (index !== newHighlight.readingItemIndex) return SHOULD_NOT_LAYOUT

          drawHighlight(overlayElement, newHighlight)

          return SHOULD_NOT_LAYOUT
        })
      }

      return highlight
    }

    const add = (highlight: UserHighlight) => {
      _add(highlight)

      highlights$.next({ type: `onUpdate`, data: highlights })
    }

    const remove = (id: number) => {
      highlights = highlights.filter(highlight => {
        if (highlight.id === id) {
          highlight.element?.remove()
        }

        return highlight.id !== id
      })

      highlights$.next({ type: `onUpdate`, data: highlights })
    }

    const isHighlightClicked = (event: MouseEvent | TouchEvent | PointerEvent) => {
      if (event.target instanceof HTMLElement) {
        return event.target.hasAttribute(`data-${HIGHLIGHT_ID_PREFIX}`)
      }

      return false
    }

    reader.registerHook(`readingItem.onLayout`, ({ overlayElement, index }) => {
      drawHighlightsForItem(overlayElement, index)
    })

    const initialHighlights$ = reader.$
      .pipe(
        filter(event => event.type === `ready`),
        tap(() => {
          initialHighlights.forEach(_add)

          if (initialHighlights.length > 0) {
            highlights$.next({ type: `onUpdate`, data: highlights })
          }
        })
      )

    merge(initialHighlights$)
      .pipe(takeUntil(reader.destroy$))
      .subscribe()

    return {
      ...reader,
      highlights: {
        add,
        remove,
        isHighlightClicked,
      },
      highlights$: highlights$.asObservable(),
    }
  }