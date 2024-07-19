import { Reader } from "@prose-reader/core"
import { Observable, switchMap } from "rxjs"

export const createTapListener = (reader: Reader, hammerManager: HammerManager) => {
  return reader.context.containerElement$.pipe(
    switchMap(() => {
      return new Observable<{ type: "tap" }>((observer) => {
        const onSingleTap = ({ srcEvent }: HammerInput) => {
          if (!reader) return

          const width = window.innerWidth
          const pageTurnMargin = 0.15

          const normalizedEvent = reader.events.normalizeEventForViewport(srcEvent) || {}

          if (`x` in normalizedEvent) {
            const { x = 0 } = normalizedEvent

            //   if (reader.bookmarks.isClickEventInsideBookmarkArea(normalizedEvent)) {
            //     return
            //   }

            if (x < width * pageTurnMargin) {
              reader.navigation.turnLeft()
            } else if (x > width * (1 - pageTurnMargin)) {
              reader.navigation.turnRight()
            } else {
              observer.next({ type: "tap" })
            }
          }
        }

        hammerManager.on(`tap`, onSingleTap)

        return () => {
          hammerManager.off(`tap`, onSingleTap)
        }
      })
    }),
  )
}
