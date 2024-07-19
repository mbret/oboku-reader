import * as Hammer from "hammerjs"
import { useEffect, useState } from "react"
import { useRecoilCallback, useSetRecoilState } from "recoil"
import { useReaderSettings } from "../common/useReaderSettings"
import { hasCurrentHighlightState, isMenuOpenState } from "../state"
import { useReader } from "../reader/useReader"
import { useGestureHandler } from "../reader/useGestureHandler"

export const useClassicGestureHandler = (container: HTMLElement | undefined) => {
  const { reader } = useReader()
  const setMenuOpenState = useSetRecoilState(isMenuOpenState)
  const [hammerManager, setHammerManager] = useState<HammerManager | undefined>(undefined)
  const { computedPageTurnDirection } = useReaderSettings() ?? {}

  useZoomGestureHandler(hammerManager)

  useGestureHandler()

  const onSingleTap = useRecoilCallback(
    ({ snapshot }) =>
      async ({ srcEvent, target, center }: HammerInput) => {
        /**
         * @important
         * On touch device `selectionchange` is being triggered after the onclick event, meaning
         * we can detect that there is still a current highlight and therefore hide the menu or not open it.
         * However on desktop (mouse) `selectionchange` is being triggered before the click, meaning we detect
         * no highlight too soon and therefore can show the menu right after a click of the use to deselect text.
         *
         * @todo
         * Investigate a proper way to not show the menu right after a deselect for mouse devices.
         */
        const hasCurrentHighlight = await snapshot.getPromise(hasCurrentHighlightState)

        if (!reader) return

        const width = window.innerWidth
        const height = window.innerHeight
        const pageTurnMargin = 0.15

        const normalizedEvent = reader?.events.normalizeEventForViewport(srcEvent)
        // console.log('hammer.handleSingleTap', srcEvent.target, srcEvent.type, center, normalizedEvent)

        // if (reader?.getSelection()) return

        if (normalizedEvent?.target) {
          // don't do anything if it was clicked on link
          if (reader.utils.isOrIsWithinValidLink(normalizedEvent.target)) {
            return
          }
        }

        if (`x` in normalizedEvent) {
          const { x = 0 } = normalizedEvent

          // console.log(srcEvent)

          if (
            reader.bookmarks.isClickEventInsideBookmarkArea(normalizedEvent) ||
            reader.highlights.isHighlightClicked(srcEvent)
          ) {
            return
          }
        }
      },
    [setMenuOpenState, reader]
  )

  useEffect(() => {
    if (container) {
      const newHammerManager = new Hammer.Manager(container || document.body, {
        recognizers: [
          [Hammer.Pan, { direction: Hammer.DIRECTION_ALL }],
          [Hammer.Pinch, { enable: true }]
        ]
      })

      newHammerManager.add(
        new Hammer.Tap({
          event: "doubletap",
          taps: 2
        })
      )
      newHammerManager.add(
        new Hammer.Tap({
          event: "singletap"
          // interval: 100
        })
      )

      hammerManager?.get("singletap").requireFailure("doubletap")

      // hammerManager.get('press').set({ time: 500 })

      // we want to recognize this simultaneous, so a quadrupletap will be detected even while a tap has been recognized.
      newHammerManager.get("doubletap").recognizeWith("singletap")
      // we only want to trigger a tap, when we don't have detected a doubletap
      newHammerManager.get("singletap").requireFailure("doubletap")

      setHammerManager(newHammerManager)

      return () => {
        newHammerManager.destroy()
        setHammerManager(undefined)
      }
    }
  }, [container, setHammerManager])

  useEffect(() => {
    hammerManager?.on("singletap", onSingleTap)
    hammerManager?.on("panmove panstart panend", onPanMove)

    const movingStarted = false
    const movingStartOffset = 0
    let hasHadPanStart = false

    /**
     * @important
     * For some reason, when rapidly clicking on the edges and the navigation happens we also have this
     * event being dispatched. This is a false positive since we are not actually swiping. My guess is that
     * somehow hammer has some problem dealing with iframe changing around right after clicking.
     * Luckily the velocity is usually below 1. Happens a lot on firefox, on chrome just a few panend popup
     * from nowhere
     *
     * @todo
     * Understand the above behavior, try to fix it or come up with solid workaround.
     */
    function onPanMove(ev: HammerInput) {
      // used to ensure we ignore false positive on firefox
      if (ev.type === `panstart`) {
        hasHadPanStart = true

        if (reader?.zoom.isZooming()) {
          // reader.zoom.move(ev.center, { isFirst: true, isLast: false })
        }
      }

      if (hasHadPanStart && reader?.zoom.isZooming()) {
        // reader.zoom.move({ x: ev.deltaX, y: ev.deltaY }, { isFirst: false, isLast: false })
      }

      // if (!movingStarted && ev.isFinal && !reader?.isSelecting()) {
      if (hasHadPanStart && ev.isFinal && !reader?.spine.isSelecting() && !reader?.zoom.isZooming()) {
        const velocity = computedPageTurnDirection === `horizontal` ? ev.velocityX : ev.velocityY
        // console.log(`hammer.onPanMove.velocity`, velocity)
        if (velocity < -0.5) {
          reader?.navigation.turnRight()
        }
        if (velocity > 0.5) {
          reader?.navigation.turnLeft()
        }
      }

      // used to ensure we ignore false positive on firefox
      if (ev.type === `panend`) {
        hasHadPanStart = false

        if (reader?.zoom.isZooming()) {
          // reader.zoom.move(undefined, { isFirst: false, isLast: true })
        }
      }
    }

    return () => {
      // hammerManager?.off(`doubletap`, onDoubleTap)
      hammerManager?.off(`singletap`, onSingleTap)
      hammerManager?.off(`tap`, onSingleTap)
      hammerManager?.off("panmove panstart panend", onPanMove)
    }
  }, [reader, setMenuOpenState, onSingleTap, hammerManager, computedPageTurnDirection])

  useEffect(() => {
    // hammerManager && reader?.hammerGesture.setManagerInstance(hammerManager)
  }, [reader, hammerManager])
}

const useZoomGestureHandler = (hammerManager?: HammerManager) => {
  const { reader } = useReader()
  const setMenuOpenState = useSetRecoilState(isMenuOpenState)
  const { computedPageTurnDirection } = useReaderSettings() ?? {}

  useEffect(() => {
    /**
     * doubletap will either start or exit the zoom.
     * It will enter the zoom if user double tap on an img element
     */
    const onDoubleTap: HammerListener = ({ srcEvent }) => {
      const normalizedEvent = reader?.events.normalizeEventForViewport(srcEvent)
      const target = normalizedEvent?.target as null | undefined | HTMLElement

      if (reader?.zoom.isZooming()) {
        reader?.zoom.exit()
      } else {
        if (target?.nodeName.toLowerCase() === `img`) {
          reader?.zoom.enter(target as HTMLImageElement)
        }
      }
    }

    const onPinch: HammerListener = (ev) => {
      if (reader?.zoom.isZooming()) {
        reader?.zoom.scale(ev.scale)
      }
    }

    const onPinchEnd = (ev: HammerInput) => {
      if (reader?.zoom.isZooming()) {
        reader?.zoom.setCurrentScaleAsBase()
      }
    }

    let hasHadPanStart = false

    const onPanMove = (ev: HammerInput) => {
      // used to ensure we ignore false positive on firefox
      if (ev.type === `panstart`) {
        hasHadPanStart = true

        if (reader?.zoom.isZooming()) {
          reader.zoom.move(ev.center, { isFirst: true, isLast: false })
        }
      }

      if (hasHadPanStart && reader?.zoom.isZooming()) {
        reader.zoom.move({ x: ev.deltaX, y: ev.deltaY }, { isFirst: false, isLast: false })
      }

      // used to ensure we ignore false positive on firefox
      if (ev.type === `panend`) {
        hasHadPanStart = false

        if (reader?.zoom.isZooming()) {
          reader.zoom.move(undefined, { isFirst: false, isLast: true })
        }
      }
    }

    hammerManager?.on(`doubletap`, onDoubleTap)
    hammerManager?.on(`pinch`, onPinch)
    hammerManager?.on(`pinchend`, onPinchEnd)
    hammerManager?.on("panmove panstart panend", onPanMove)

    return () => {
      hammerManager?.off(`doubletap`, onDoubleTap)
      hammerManager?.off(`pinch`, onPinch)
      hammerManager?.off(`pinchend`, onPinchEnd)
      hammerManager?.off("panmove panstart panend", onPanMove)
    }
  }, [reader, setMenuOpenState, hammerManager, computedPageTurnDirection])
}
