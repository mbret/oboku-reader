import { HookManager, Reader } from "@prose-reader/core"
import { Subject, filter, mergeMap, tap } from "rxjs"
import { GestureEvent, GestureRecognizable, Hook } from "./types"
import { GesturesSettingsManager } from "./SettingsManager"

const DELAY_IGNORE_PAN = 400

export const registerPan = ({
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
  // let initialTargetBodyUserSelectValue: string | undefined = undefined

  const gestures$ = settingsManager.settings$.pipe(
    filter(({ panNavigation }) => panNavigation === "pan"),
    mergeMap(() =>
      recognizable.events$.pipe(
        tap((event) => {
          const target = event?.event.target as null | undefined | HTMLElement
          const targetDocument: Document | null | undefined = target?.ownerDocument
          const targetBody = targetDocument?.body
          // const { computedPageTurnDirection } = reader.settings.settings

          if (event.type === `panStart`) {
            if (reader?.zoom.isZooming()) {
              reader.zoom.move({ x: event.deltaX, y: event.deltaY }, { isFirst: true, isLast: false })
            } else {
              /**
               * We let the user select
               */
              if (event.delay > DELAY_IGNORE_PAN) return

              reader?.navigation.moveTo({ x: 0, y: 0 }, { start: true })

              if (targetBody) {
                // initialTargetBodyUserSelectValue = targetBody.style.userSelect
                // targetBody.style.userSelect = `none`
              }
            }
          }

          if (event.type === `panMove`) {
            if (reader?.zoom.isZooming()) {
              reader.zoom.move({ x: event.deltaX, y: event.deltaY }, { isFirst: false, isLast: false })
            } else {
              reader?.navigation.moveTo({ x: event.deltaX, y: event.deltaY })
            }
          }

          // used to ensure we ignore false positive on firefox
          if (event.type === `panEnd`) {
            if (reader?.zoom.isZooming()) {
              reader.zoom.move(undefined, { isFirst: false, isLast: true })
            } else {
              reader?.navigation.moveTo({ x: event.deltaX, y: event.deltaY }, { final: true })

              if (targetBody) {
                // targetBody.style.userSelect = initialTargetBodyUserSelectValue ?? ``
              }
            }
          }
        }),
      ),
    ),
  )

  return gestures$
}
