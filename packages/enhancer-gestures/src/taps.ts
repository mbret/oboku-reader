import { HookManager, Reader } from "@prose-reader/core"
import { Subject, tap } from "rxjs"
import { GestureEvent, GestureRecognizable, Hook } from "./types"
import { GesturesSettingsManager } from "./SettingsManager"

export const registerTaps = ({
  reader,
  recognizable,
  unhandledEvent$,
  hookManager,
}: {
  recognizable: GestureRecognizable
  reader: Reader
  hookManager: HookManager<Hook>
  unhandledEvent$: Subject<GestureEvent>
  settingsManager: GesturesSettingsManager
}) => {
  const gestures$ = recognizable.events$.pipe(
    tap((event) => {
      const normalizedEvent = event.event

      if (event.type === "tap") {
        const width = window.innerWidth
        const pageTurnMargin = 0.15

        if (`x` in normalizedEvent) {
          const { x = 0 } = normalizedEvent

          const beforeTapResults = hookManager.execute("beforeTap", undefined, { event })

          if (beforeTapResults.some((result) => result === false)) {
            return
          }

          if (x < width * pageTurnMargin) {
            reader.navigation.turnLeft()
          } else if (x > width * (1 - pageTurnMargin)) {
            reader.navigation.turnRight()
          } else {
            unhandledEvent$.next(event)
          }
        }
      }
    }),
  )

  return gestures$
}
