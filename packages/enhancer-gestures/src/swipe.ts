import { HookManager, Reader } from "@prose-reader/core"
import { Subject, filter, mergeMap, tap } from "rxjs"
import { GestureEvent, GestureRecognizable, Hook } from "./types"
import { GesturesSettingsManager } from "./SettingsManager"

export const registerSwipe = ({
  reader,
  recognizable,
  settingsManager,
}: {
  recognizable: GestureRecognizable
  reader: Reader
  hookManager: HookManager<Hook>
  unhandledEvent$: Subject<GestureEvent>
  settingsManager: GesturesSettingsManager
}) => {
  const gestures$ = settingsManager.settings$.pipe(
    filter(({ panNavigation }) => panNavigation === "swipe"),
    mergeMap(() =>
      recognizable.events$.pipe(
        filter((event) => event.type === "swipe"),
        tap((event) => {
          const { computedPageTurnDirection } = reader.settings.settings

          if (computedPageTurnDirection === "vertical") {
            if (event.velocityY < -0.5) {
              reader?.navigation.turnRight()
            }
            if (event.velocityY > 0.5) {
              reader?.navigation.turnLeft()
            }
          } else {
            if (event.velocityX < -0.5) {
              reader?.navigation.turnRight()
            }
            if (event.velocityX > 0.5) {
              reader?.navigation.turnLeft()
            }
          }
        }),
      ),
    ),
  )

  return gestures$
}
