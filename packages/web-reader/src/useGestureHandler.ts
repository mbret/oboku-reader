import * as Hammer from 'hammerjs'
import { useEffect } from 'react'
import { useSetRecoilState } from 'recoil'
import { useReader } from './ReaderProvider'
import { isMenuOpenState } from './state'

export const useGestureHandler = (container: HTMLElement | undefined) => {
  const reader = useReader()
  const setMenuOpenState = useSetRecoilState(isMenuOpenState)

  useEffect(() => {
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
      if (ev.isFinal && !reader?.isSelecting()) {
        const velocity = ev.velocityX
        if (velocity < -0.5) {
          reader?.turnRight()
        }
        if (velocity > 0.5) {
          reader?.turnLeft()
        }
      }
    }

    function handleSingleTap({ srcEvent, target, center }: HammerInput) {
      if (!reader) return

      const width = window.innerWidth
      const height = window.innerHeight
      const pageTurnMargin = 0.15

      const normalizedEvent = reader.normalizeEvent(srcEvent)
      console.log('handleSingleTap', srcEvent.target, srcEvent.type, center)

      if (reader?.getSelection()) return

      if (normalizedEvent?.target) {
        const target = normalizedEvent.target as HTMLElement

        // don't do anything if it was clicked on link
        if (target.nodeName === `a` || target.closest('a')) return
      }

      if (`x` in normalizedEvent) {
        const { x = 0 } = normalizedEvent

        if (reader.bookmarks.isClickEventInsideBookmarkArea(normalizedEvent)) {
          return
        }

        if (x < width * pageTurnMargin) {
          reader.turnLeft()
        } else if (x > width * (1 - pageTurnMargin)) {
          reader.turnRight()
        } else {
          setMenuOpenState(val => !val)
        }
      }
    }

    return () => {
      hammer.destroy()
    }
  }, [reader, container, setMenuOpenState])
}