import { Reader, isShallowEqual } from "@prose-reader/core"
import { NEVER, Observable, distinctUntilChanged, map, switchMap } from "rxjs"

export const createPanMoveListener = (reader: Reader, hammerManager: HammerManager) => {
  return reader.context.state$.pipe(
    map(({ manifest }) => ({ manifest })),
    distinctUntilChanged(isShallowEqual),
    switchMap(({ manifest }) => {
      if (manifest?.renditionLayout !== "pre-paginated") return NEVER

      return new Observable<{ type: "tap" }>(() => {
        let movingStartOffsets = { x: 0, y: 0 }
        let movingHasStarted = false
        const isUsingFreeMode = false

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
          if (isUsingFreeMode) {
            return
          }

          const normalizedEvent = reader?.events.normalizeEventForViewport(ev.srcEvent)

          // because of iframe moving we have to calculate the delta ourselves with normalized value
          const deltaX = normalizedEvent && `x` in normalizedEvent ? normalizedEvent?.x - movingStartOffsets.x : ev.deltaX
          const deltaY = normalizedEvent && `y` in normalizedEvent ? normalizedEvent?.y - movingStartOffsets.y : ev.deltaY

          // used to ensure we ignore false positive on firefox
          if (ev.type === `panstart`) {
            movingHasStarted = true

            if (reader?.zoom.isZooming()) {
              reader.zoom.move(ev.center, { isFirst: true, isLast: false })
            } else {
              if (normalizedEvent && `x` in normalizedEvent) {
                movingStartOffsets = { x: normalizedEvent.x, y: normalizedEvent.y }
                reader?.navigation.moveTo({ x: 0, y: 0 }, { start: true })
              }
            }
          }

          if (ev.type === `panmove` && movingHasStarted) {
            if (reader?.zoom.isZooming()) {
              reader.zoom.move({ x: ev.deltaX, y: ev.deltaY }, { isFirst: false, isLast: false })
            } else {
              reader?.navigation.moveTo({ x: deltaX, y: deltaY })
            }
          }

          // used to ensure we ignore false positive on firefox
          if (ev.type === `panend`) {
            if (reader?.zoom.isZooming()) {
              reader.zoom.move(undefined, { isFirst: false, isLast: true })
            } else {
              if (movingHasStarted) {
                reader?.navigation.moveTo({ x: deltaX, y: deltaY }, { final: true })
              }
            }

            movingHasStarted = false
          }
        }

        hammerManager.on("panmove panstart panend", onPanMove)

        return () => {
          hammerManager.off("panmove panstart panend", onPanMove)
        }
      })
    }),
  )
}
