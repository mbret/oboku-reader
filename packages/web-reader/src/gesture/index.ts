import * as Hammer from 'hammerjs'
import { Subject } from 'rxjs'
import { ReaderInstance } from '../types'

export const createGestureHandler = (container: HTMLElement, reader: ReaderInstance) => {
  const subject = new Subject<{ event: `tap` }>()
  const hammer = new Hammer(container || document.body)
  // let hammer: HammerManager | undefined

  hammer.get('pan').set({ direction: Hammer.DIRECTION_ALL })
  hammer.get('pinch').set({ enable: true })
  hammer.get('press').set({ time: 500 })

  hammer.on('tap', function (ev) {
    handleSingleTap(ev)
  })

  hammer?.on('panmove panstart panend', onPanMove)

  function onPanMove(ev: HammerInput) {
    if (ev.isFinal && !reader.isSelecting()) {
      const velocity = ev.velocityX
      if (velocity < -0.5) {
        reader.turnRight()
      }
      if (velocity > 0.5) {
        reader.turnLeft()
      }
    }
  }

  function handleSingleTap({ srcEvent, target }: HammerInput) {
    const width = window.innerWidth
    const height = window.innerHeight
    const pageTurnMargin = 0.15
    const { normalizedEventPointerPositions, iframeOriginalEvent } = reader.getEventInformation(srcEvent)

    console.log('handleSingleTap', srcEvent.target, srcEvent.type, iframeOriginalEvent?.type, srcEvent, normalizedEventPointerPositions)

    if (reader.getSelection()) return

    if (iframeOriginalEvent?.target) {
      const target = iframeOriginalEvent.target as HTMLElement

      // don't do anything if it was clicked on link
      if (target.nodeName === `a` || target.closest('a')) return
    }

    if (`x` in normalizedEventPointerPositions) {
      const { x = 0 } = normalizedEventPointerPositions

      if (reader.bookmarks.isClickEventInsideBookmarkArea(srcEvent)) {
        return
      }

      if (x < width * pageTurnMargin) {
        reader.turnLeft()
      } else if (x > width * (1 - pageTurnMargin)) {
        reader.turnRight()
      } else {
        subject.next({ event: 'tap' })
      }
    }
  }

  return {
    $: subject.asObservable(),
  }
}